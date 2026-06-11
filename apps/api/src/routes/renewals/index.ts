import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { RenovacaoService } from '@ecotech/shared/domain';
import { eq, and, sql, gte, lte, or, ilike, inArray, isNull, ne } from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';
import {
  NotFoundError,
  ValidationError,
  UnprocessableEntityError,
  OwnershipError,
  getPaginationParams,
  createPaginatedResult,
  parseVigencia,
  findProdutoId,
  cleanDocument,
  parsePercentualPlanilha,
  parsePremioLiquido,
} from '@ecotech/shared/utils';
import { ok } from '../../docs/index.js';
import * as XLSX from 'xlsx';
import limparRenovacoesBugadasRoute from './limpar-bugadas.js';
import fixPendingRenewalsRoute from './fix-pending-renewals.js';
import {
  listRenovacoesQuerySchema,
  atualizarStatusSchema,
  atualizarValoresSchema,
  finalizarRenovacaoSchema,
  perderRenovacaoSchema,
  cancelarRenovacaoSchema,
  criarRenovacaoManualSchema,
  renovacaoResponseSchema,
  renovacaoComVendedorResponseSchema,
  iniciarRenovacaoResponseSchema,
  importacaoResultadoSchema,
} from './schemas.js';
import {
  standardErrorResponses,
  createPaginatedResponseSchema,
  createDataResponseSchema,
  uuidParamSchema,
} from '../shared/schemas.js';
import { invalidateMetricasCache, getAvatarUrl } from '../../utils/cache.js';
import { renovacoesDocs } from '../../docs/renovacoes/schemas.js';

// --- ROUTES ---

const renovacoesRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const {
    db,
    RenovacaoRepository,
    CotacaoRepository,
    DocumentoVendaRepository,
    renovacoesComerciais,
    documentosVenda,
    cotacoes,
    cotacaoVendedores,
    comentarios,
  } = await import('@ecotech/shared/database');

  fastify.addHook('preHandler', fastify.authenticate);

  const renovacaoRepo = new RenovacaoRepository(db);
  const cotacaoRepo = new CotacaoRepository(db);
  const documentoVendaRepo = new DocumentoVendaRepository(db);

  const renovacaoService = new RenovacaoService(
    renovacaoRepo,
    documentoVendaRepo,
    cotacaoRepo,
  );

  // Registrar rotas de correção/limpeza de renovações
  await fastify.register(limparRenovacoesBugadasRoute);
  await fastify.register(fixPendingRenewalsRoute);

  // 1. Listar Pendentes
  fastify.get(
    '/pending',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Listar renovações pendentes',
        description:
          'Lista renovações pendentes do vendedor logado dentro da janela de 45 dias antes do vencimento. Útil para dashboard e alertas de renovação.',
        ...renovacoesDocs.listarPendentes,
      },
      preHandler: [authorize(['vendas:visualizar_documento_venda'])],
    },
    async (request) => {
      const { solicitacoesExclusaoRenovacao } = await import('@ecotech/shared/database');

      const vendedorId = request.user.isAdmin ? undefined : request.user.sub;

      // Buscar renovações na janela de 45 dias (padrão do sistema)
      const renovacoes = await renovacaoService.getRenovacoesPendentes(
        request.corretoraId,
        45,
        vendedorId,
      );

      if (renovacoes.length === 0) return ok(renovacoes as any);

      // Buscar a solicitação de exclusão mais recente para cada renovação
      const renovacaoIds = renovacoes.map((r) => r.id);
      const solicitacoes = await db.query.solicitacoesExclusaoRenovacao.findMany({
        where: and(
          eq(solicitacoesExclusaoRenovacao.corretoraId, request.corretoraId),
          inArray(solicitacoesExclusaoRenovacao.renovacaoId, renovacaoIds),
        ),
        orderBy: (s, { desc }) => [desc(s.criadoEm)],
        columns: {
          id: true,
          renovacaoId: true,
          status: true,
          motivoRecusa: true,
          criadoEm: true,
        },
      });

      // Mapear a solicitação mais recente por renovacaoId
      const solicitacaoMap = new Map<string, typeof solicitacoes[number]>();
      for (const s of solicitacoes) {
        if (!solicitacaoMap.has(s.renovacaoId)) {
          solicitacaoMap.set(s.renovacaoId, s);
        }
      }

      return ok(
        renovacoes.map((r) => ({
          ...r,
          solicitacaoExclusao: solicitacaoMap.get(r.id) ?? null,
        })) as any,
      );
    },
  );

  // 2. Listar Vencidas
  fastify.get(
    '/overdue',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Listar renovações vencidas',
        description:
          'Lista renovações com data de vencimento já passada que ainda não foram finalizadas.',
        ...renovacoesDocs.listarVencidas,
      },
      preHandler: [authorize(['vendas:visualizar_documento_venda'])],
    },
    async (request) => {
      const { solicitacoesExclusaoRenovacao } = await import('@ecotech/shared/database');

      const vendedorId = request.user.isAdmin ? undefined : request.user.sub;
      const renovacoes = await renovacaoService.getRenovacoesVencidas(
        request.corretoraId,
        vendedorId,
      );

      if (renovacoes.length === 0) return ok(renovacoes as any);

      const renovacaoIds = renovacoes.map((r) => r.id);
      const solicitacoes = await db.query.solicitacoesExclusaoRenovacao.findMany({
        where: and(
          eq(solicitacoesExclusaoRenovacao.corretoraId, request.corretoraId),
          inArray(solicitacoesExclusaoRenovacao.renovacaoId, renovacaoIds),
        ),
        orderBy: (s, { desc }) => [desc(s.criadoEm)],
        columns: {
          id: true,
          renovacaoId: true,
          status: true,
          motivoRecusa: true,
          criadoEm: true,
        },
      });

      const solicitacaoMap = new Map<string, typeof solicitacoes[number]>();
      for (const s of solicitacoes) {
        if (!solicitacaoMap.has(s.renovacaoId)) {
          solicitacaoMap.set(s.renovacaoId, s);
        }
      }

      return ok(
        renovacoes.map((r) => ({
          ...r,
          solicitacaoExclusao: solicitacaoMap.get(r.id) ?? null,
        })) as any,
      );
    },
  );

  // 3. Listar com Filtros e Paginação
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Listar renovações com filtros',
        description:
          'Lista renovações do vendedor logado com suporte a paginação e filtros por status, período de vencimento. Permite acompanhar o pipeline de renovações.',
        ...renovacoesDocs.listar,
      },
      preHandler: [authorize(['vendas:visualizar_documento_venda'])],
    },
    async (request) => {
      const query = listRenovacoesQuerySchema.parse(request.query);
      const { offset, limit, page } = getPaginationParams(query);

      const conditions = [
        eq(renovacoesComerciais.corretoraId, request.corretoraId),
      ];

      // Gestores com metricas:acessar podem ver todos da corretora
      const podeVerTodos =
        request.user.isAdmin || request.user.permissoes?.includes('metricas:acessar');
      const vendedorIdsArray = query.vendedorIds
        ? query.vendedorIds.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      if (vendedorIdsArray.length > 0) {
        conditions.push(inArray(renovacoesComerciais.vendedorId, vendedorIdsArray));
      } else if (query.vendedorId) {
        conditions.push(eq(renovacoesComerciais.vendedorId, query.vendedorId));
      } else if (!podeVerTodos) {
        conditions.push(eq(renovacoesComerciais.vendedorId, request.user.sub));
      }

      if (query.status)
        conditions.push(eq(renovacoesComerciais.status, query.status));
      if (query.dataVencimentoInicio)
        conditions.push(
          gte(renovacoesComerciais.dataVencimento, query.dataVencimentoInicio),
        );
      if (query.dataVencimentoFim)
        conditions.push(
          lte(renovacoesComerciais.dataVencimento, query.dataVencimentoFim),
        );
      if (query.search)
        conditions.push(
          ilike(renovacoesComerciais.itemDescricao, `%${query.search}%`),
        );

      const [renovacoesResult, countResult] = await Promise.all([
        db.query.renovacoesComerciais.findMany({
          where: and(...conditions),
          with: {
            vendedor: { columns: { id: true, nome: true } },
            cliente: { columns: { id: true, nome: true, razaoSocial: true, tipoPessoa: true } },
            documentoVendaAnterior: {
              columns: { id: true, clienteId: true },
              with: {
                cliente: { columns: { id: true, nome: true, razaoSocial: true, tipoPessoa: true } },
              },
            },
          } as any,
          limit,
          offset,
          orderBy: (r, { asc }) => [asc(r.dataVencimento)],
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(renovacoesComerciais)
          .where(and(...conditions)),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      return {
        success: true as const,
        ...createPaginatedResult(renovacoesResult, total, page, limit),
      } as any;
    },
  );

  // 3. Obter por ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Obter detalhes de uma renovação',
        description:
          'Retorna informações detalhadas de uma renovação específica do vendedor logado, incluindo histórico de status e valores negociados.',
        ...renovacoesDocs.buscar,
      },
      preHandler: [authorize(['vendas:visualizar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      // Sempre filtrar por vendedor do usuário logado
      const renovacao = await renovacaoService.getRenovacaoById(
        id,
        request.corretoraId,
        request.user.sub,
        false, // canViewAll sempre false
      );
      return ok(renovacao as any);
    },
  );

  // 3b. Reatribuir cliente de uma renovação (cliente stub importado -> cliente existente)
  fastify.post(
    '/:id/reassign-client',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Reatribuir cliente da renovação a um cliente existente',
        description:
          'Aponta a renovação para outro cliente já cadastrado (ex: stub importado de planilha que na verdade é um cliente da base). Só permitido em renovações NAO_TRABALHADO. Se o cliente antigo ficar sem vínculos, é soft-deletado.',
        ...renovacoesDocs.reatribuirCliente,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({ novoClienteId: z.string().uuid() })
        .parse(request.body);

      const { clientes: clientesTable } = await import(
        '@ecotech/shared/database'
      );

      return await db.transaction(async (tx) => {
        const renovacao: any = await tx.query.renovacoesComerciais.findFirst({
          where: and(
            eq(renovacoesComerciais.id, id),
            eq(renovacoesComerciais.corretoraId, request.corretoraId),
          ),
        });
        if (!renovacao) throw new NotFoundError('Renovação');
        if (renovacao.status !== 'NAO_TRABALHADO') {
          throw new UnprocessableEntityError(
            'Só é possível reatribuir cliente antes de iniciar a renovação.',
          );
        }

        const canViewAll =
          request.user.isAdmin ||
          request.user.permissoes.includes('clientes:visualizar_todos');

        // Vendedor só reatribui se a renovação for dele
        if (!canViewAll && renovacao.vendedorId !== request.user.sub) {
          throw new OwnershipError('Esta renovação não pertence a você.');
        }

        if (renovacao.clienteId === body.novoClienteId) {
          throw new ValidationError(
            'O cliente selecionado já é o cliente atual desta renovação.',
          );
        }

        const [clienteAtual, clienteNovo] = await Promise.all([
          renovacao.clienteId
            ? tx.query.clientes.findFirst({
                where: and(
                  eq(clientesTable.id, renovacao.clienteId),
                  eq(clientesTable.corretoraId, request.corretoraId),
                ),
              })
            : Promise.resolve(null as any),
          tx.query.clientes.findFirst({
            where: and(
              eq(clientesTable.id, body.novoClienteId),
              eq(clientesTable.corretoraId, request.corretoraId),
              isNull(clientesTable.deletedAt),
            ),
          }),
        ]);

        if (!clienteNovo) {
          throw new NotFoundError('Cliente alvo');
        }

        // Vendedor só pode reatribuir para cliente que ele possui
        if (!canViewAll && clienteNovo.vendedorId !== request.user.sub) {
          throw new OwnershipError(
            'O cliente selecionado pertence a outro vendedor.',
          );
        }

        // tipoPessoa precisa bater (PF->PF, PJ->PJ) quando o cliente atual é
        // real (tem documento), senão quebra a cotação depois. Mas se o cliente
        // atual é só um stub importado sem CPF/CNPJ (ex.: empresa importada como
        // PF), permitimos apontar para o cliente correto de outro tipo — é
        // exatamente o caso de reconciliar o stub com o cadastro PJ que já tem
        // o CNPJ. O stub órfão é removido logo abaixo quando não tem histórico.
        if (
          clienteAtual &&
          clienteAtual.tipoPessoa !== clienteNovo.tipoPessoa
        ) {
          const cpfAtual = cleanDocument(clienteAtual.cpf || '');
          const cnpjAtual = cleanDocument(clienteAtual.cnpj || '');
          const docAtualCompleto =
            (clienteAtual.tipoPessoa === 'PF' && cpfAtual.length === 11) ||
            (clienteAtual.tipoPessoa === 'PJ' && cnpjAtual.length === 14);
          if (docAtualCompleto) {
            throw new ValidationError(
              `A renovação é de ${clienteAtual.tipoPessoa} e o cliente selecionado é ${clienteNovo.tipoPessoa}. Selecione um cliente do mesmo tipo.`,
            );
          }
        }

        // Atualiza apenas clienteId na renovação — documentoVendaAnteriorId NÃO é
        // alterado intencionalmente: o documento anterior é dado histórico da venda
        // original e não deve ser modificado. O frontend deve usar renovacao.cliente
        // (via clienteId) como fonte canônica, não documentoVendaAnterior.cliente.
        await tx
          .update(renovacoesComerciais)
          .set({
            clienteId: clienteNovo.id,
            updatedAt: new Date(),
          })
          .where(eq(renovacoesComerciais.id, renovacao.id));

        // Se o cliente antigo era um stub órfão (sem CPF/CNPJ completo, sem outras
        // renovações ativas, sem documentos de venda), soft-delete para não poluir
        // a base. Caso contrário mantém — pode ser um cliente legítimo.
        if (clienteAtual) {
          const cpfAtual = cleanDocument(clienteAtual.cpf || '');
          const cnpjAtual = cleanDocument(clienteAtual.cnpj || '');
          const docCompleto =
            (clienteAtual.tipoPessoa === 'PF' && cpfAtual.length === 11) ||
            (clienteAtual.tipoPessoa === 'PJ' && cnpjAtual.length === 14);

          if (!docCompleto && !clienteAtual.deletedAt) {
            const [outrasRenovacoes, documentos] = await Promise.all([
              tx.query.renovacoesComerciais.findFirst({
                where: and(
                  eq(renovacoesComerciais.clienteId, clienteAtual.id),
                  ne(renovacoesComerciais.id, renovacao.id),
                ),
              }),
              tx.query.documentosVenda.findFirst({
                where: eq(documentosVenda.clienteId, clienteAtual.id),
              }),
            ]);

            if (!outrasRenovacoes && !documentos) {
              await tx
                .update(clientesTable)
                .set({
                  deletedAt: new Date(),
                  ativo: false,
                  updatedAt: new Date(),
                })
                .where(eq(clientesTable.id, clienteAtual.id));
            }
          }
        }

        return ok({
          id: renovacao.id,
          clienteId: clienteNovo.id,
          clienteAnteriorRemovido:
            !!clienteAtual && clienteAtual.id !== clienteNovo.id,
        });
      });
    },
  );

  // 4. Iniciar Renovação (Com Transação)
  fastify.post(
    '/:id/start',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Iniciar processo de renovação',
        description:
          'Inicia o processo de renovação criando automaticamente uma cotação vinculada. Transição do status NAO_TRABALHADO para EM_PROSPECCAO. Cria cotação com dados do documento anterior.',
        ...renovacoesDocs.iniciar,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { produtoId: produtoIdManual } = z
        .object({ produtoId: z.string().uuid().optional() })
        .parse(request.body ?? {});

      return await db.transaction(async (tx) => {
        // Lock the row before reading to prevent concurrent initiations from
        // both passing the status check and creating duplicate cotações.
        const [lockedRow] = await tx
          .select({ id: renovacoesComerciais.id, status: renovacoesComerciais.status })
          .from(renovacoesComerciais)
          .where(and(
            eq(renovacoesComerciais.id, id),
            eq(renovacoesComerciais.corretoraId, request.corretoraId),
          ))
          .for('update');

        if (!lockedRow) throw new NotFoundError('Renovação');
        if (lockedRow.status !== 'NAO_TRABALHADO')
          throw new UnprocessableEntityError('Renovação já iniciada ou finalizada');

        // Fetch full data with relations (row is locked, safe to read).
        const renovacao: any = await tx.query.renovacoesComerciais.findFirst({
          where: eq(renovacoesComerciais.id, id),
          with: {
            documentoVendaAnterior: true,
            cliente: true,
          } as any,
        });

        const docAnt = renovacao.documentoVendaAnterior;

        // Para renovações importadas sem documento anterior, precisamos usar os dados da própria renovação
        const clienteId = renovacao.clienteId || docAnt?.clienteId;
        if (!clienteId) {
          throw new ValidationError(
            'Renovação sem cliente vinculado. Verifique o cadastro.',
          );
        }

        // Exigir ao menos um contato (e-mail, telefone, celular ou WhatsApp) antes de iniciar
        const { clientes: clientesTable } = await import(
          '@ecotech/shared/database'
        );
        const clienteCompleto: any = await tx.query.clientes.findFirst({
          where: eq(clientesTable.id, clienteId),
          with: { contatos: true } as any,
        });
        if (!clienteCompleto) {
          throw new ValidationError('Cliente vinculado não encontrado.');
        }
        const temContatoDireto = !!(
          clienteCompleto.email?.trim() ||
          clienteCompleto.telefone?.trim() ||
          clienteCompleto.celular?.trim()
        );
        const temContatoExtra = (clienteCompleto.contatos || []).some(
          (c: any) => c?.valor?.trim(),
        );
        if (!temContatoDireto && !temContatoExtra) {
          const nomeCliente =
            clienteCompleto.nome ||
            clienteCompleto.razaoSocial ||
            clienteCompleto.nomeFantasia ||
            'cliente';
          throw new UnprocessableEntityError(
            `O cliente ${nomeCliente} não possui contato cadastrado (e-mail, telefone, celular ou WhatsApp). Cadastre ao menos um contato antes de iniciar a renovação.`,
          );
        }

        // Exigir CPF (PF) ou CNPJ (PJ) com formato completo antes de iniciar.
        // Aceita qualquer valor com len correto — validação de dígito verificador
        // ocorre no PATCH /clientes/:id quando o campo é preenchido.
        if (
          clienteCompleto.tipoPessoa === 'PF' &&
          cleanDocument(clienteCompleto.cpf || '').length !== 11
        ) {
          throw new UnprocessableEntityError(
            `O cliente ${clienteCompleto.nome || 'cliente'} não possui CPF cadastrado. Informe o CPF antes de iniciar a renovação.`,
          );
        }
        if (
          clienteCompleto.tipoPessoa === 'PJ' &&
          cleanDocument(clienteCompleto.cnpj || '').length !== 14
        ) {
          throw new UnprocessableEntityError(
            `O cliente ${clienteCompleto.razaoSocial || clienteCompleto.nomeFantasia || 'cliente'} não possui CNPJ cadastrado. Informe o CNPJ antes de iniciar a renovação.`,
          );
        }

        // Buscar produtoId - manual > documento anterior > correspondência de nome
        const { produtos: produtosTable } = await import(
          '@ecotech/shared/database'
        );
        let produtoId = produtoIdManual || docAnt?.produtoId;
        if (!produtoId) {
          // Lista de termos candidatos para busca (do mais específico ao mais genérico)
          const termosCanditados = [
            renovacao.produtoDescricao,
            renovacao.itemDescricao,
          ].filter(Boolean) as string[];

          if (termosCanditados.length > 0) {
            // Única query com OR cobrindo ambas as direções de match para todos os termos
            const p = await tx
              .select({ id: produtosTable.id })
              .from(produtosTable)
              .where(
                and(
                  eq(produtosTable.corretoraId, request.corretoraId),
                  or(
                    ...termosCanditados.map((t) => ilike(produtosTable.nomeProduto, `%${t}%`)),
                    ...termosCanditados.map((t) =>
                      sql`${t} ILIKE '%' || ${produtosTable.nomeProduto} || '%'`,
                    ),
                  ),
                ),
              )
              .limit(1);
            if (p.length > 0) produtoId = p[0].id;
          }
        }

        if (!produtoId) {
          throw new ValidationError(
            `Produto não encontrado. Cadastre um produto com nome "${renovacao.produtoDescricao || renovacao.itemDescricao || 'correspondente'}" ou vincule manualmente.`,
          );
        }

        // Lógica de número de cotação (lock advisory impede race condition entre
        // inicializações concorrentes que causariam violação de unique em numeroCotacao)
        const ano = new Date().getFullYear();
        const prefix = `COT-${ano}-`;
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${request.corretoraId + ':cot'}))`);
        const maxResult = await tx
          .select({
            maxNum: sql<string>`MAX(${cotacoes.numeroCotacao})`,
          })
          .from(cotacoes)
          .where(
            and(
              eq(cotacoes.corretoraId, request.corretoraId),
              sql`${cotacoes.numeroCotacao} LIKE ${prefix + '%'}`,
            ),
          );
        const ultimoNum = maxResult[0]?.maxNum
          ? parseInt(maxResult[0].maxNum.split('-').pop() || '0')
          : 0;
        const numeroCotacao = `${prefix}${String(ultimoNum + 1).padStart(3, '0')}`;

        // Datas - usar dataVencimento da renovação como base se não houver documento anterior
        const dataBaseVigencia =
          docAnt?.vigenciaFim || renovacao.dataVencimento;
        if (!dataBaseVigencia) {
          throw new ValidationError(
            'Renovação sem data de vencimento. Verifique os dados importados.',
          );
        }
        const vigenciaInicio = new Date(dataBaseVigencia);
        const vigenciaFim = new Date(vigenciaInicio);
        vigenciaFim.setFullYear(vigenciaFim.getFullYear() + 1);

        const observacoes = docAnt
          ? `Renovação do documento ${docAnt.numeroDocumento}`
          : `Renovação importada - ${renovacao.itemDescricao || renovacao.produtoDescricao || 'Item não especificado'}`;

        // Preparar detalhes do risco
        const detalhesRisco: Record<string, any> = {
          renovacaoId: id,
        };
        if (docAnt) {
          detalhesRisco.documentoVendaAnteriorId = docAnt.id;
          detalhesRisco.numeroDocumentoAnterior = docAnt.numeroDocumento;
        } else {
          // Dados da importação
          detalhesRisco.importadoDePlanilha = true;
          if (renovacao.itemDescricao)
            detalhesRisco.itemDescricao = renovacao.itemDescricao;
          if (renovacao.seguradoraAnterior)
            detalhesRisco.seguradoraAnterior = renovacao.seguradoraAnterior;
        }

        // Renovações importadas de planilha podem não ter vendedorId; usa quem iniciou.
        const vendedorIdEfetivo = renovacao.vendedorId ?? request.user.sub;

        const [cotacao] = await tx
          .insert(cotacoes)
          .values({
            corretoraId: request.corretoraId,
            clienteId,
            vendedorId: vendedorIdEfetivo,
            // Atuante = quem clicou "iniciar" (quem vai operar a venda).
            // Vendedor principal continua sendo o da renovação (comissão).
            atuanteId: request.user.sub,
            produtoId,
            numeroCotacao,
            status: 'EM_ELABORACAO',
            situacao: 'RENOVACAO',
            origem: 'RENOVACAO_PENDENTE',
            vigenciaInicio: vigenciaInicio.toISOString().split('T')[0],
            vigenciaFim: vigenciaFim.toISOString().split('T')[0],
            premioLiquido: renovacao.premioAnterior || docAnt?.premioLiquido,
            percentualComissao:
              renovacao.percentualComissaoAnterior ||
              docAnt?.percentualComissao,
            coberturas: docAnt?.coberturas,
            itemDescricao: renovacao.itemDescricao ?? docAnt?.itemDescricao ?? null,
            detalhesRisco,
            negocioCorretora: true,
          })
          .returning();

        // Criar comentário com observação da renovação
        await tx.insert(comentarios).values({
          corretoraId: request.corretoraId,
          entidadeTipo: 'cotacao',
          entidadeId: cotacao.id,
          autorId: request.user.sub,
          texto: observacoes,
        });

        // Copiar comentários existentes da renovação para a cotação,
        // preservando autor, texto e timestamp original.
        const revComentarios = await tx.select().from(comentarios)
          .where(and(
            eq(comentarios.entidadeId, id),
            eq(comentarios.entidadeTipo, 'renovacao'),
            eq(comentarios.corretoraId, request.corretoraId),
          ));

        if (revComentarios.length > 0) {
          const roots   = revComentarios.filter(c => !c.parentId);
          const replies = revComentarios.filter(c =>  c.parentId);

          const idMap = new Map<string, string>();
          if (roots.length > 0) {
            const newRoots = await tx.insert(comentarios)
              .values(roots.map(c => ({
                corretoraId: c.corretoraId,
                entidadeTipo: 'cotacao' as const,
                entidadeId: cotacao.id,
                autorId: c.autorId,
                parentId: null,
                texto: c.texto,
                createdAt: c.createdAt,
              })))
              .returning({ id: comentarios.id });
            roots.forEach((c, i) => idMap.set(c.id, newRoots[i].id));
          }

          const replyValues = replies
            .filter(r => r.parentId && idMap.has(r.parentId))
            .map(r => ({
              corretoraId: r.corretoraId,
              entidadeTipo: 'cotacao' as const,
              entidadeId: cotacao.id,
              autorId: r.autorId,
              parentId: idMap.get(r.parentId!)!,
              texto: r.texto,
              createdAt: r.createdAt,
            }));
          if (replyValues.length > 0) {
            await tx.insert(comentarios).values(replyValues);
          }
        }

        // Create vendor record for ownership tracking
        await tx.insert(cotacaoVendedores).values({
          cotacaoId: cotacao.id,
          vendedorId: vendedorIdEfetivo,
          atribuidoPor: request.user.sub,
          ativo: true,
        });

        const [updated] = await tx
          .update(renovacoesComerciais)
          .set({ status: 'EM_PROSPECCAO', produtoId, updatedAt: new Date() })
          .where(eq(renovacoesComerciais.id, id))
          .returning();

        // Fetch full cotação with relations so the frontend can open the
        // CotacaoDialog directly without a second GET request.
        const cotacaoCompleta = await tx.query.cotacoes.findFirst({
          where: eq(cotacoes.id, cotacao.id),
          with: {
            cliente: {
              columns: { id: true, nome: true, razaoSocial: true, nomeFantasia: true, tipoPessoa: true },
            },
            produto: {
              columns: { id: true, nomeProduto: true, tipoSeguro: true },
            },
            vendedor: {
              columns: { id: true, nome: true, email: true },
            },
            atuante: {
              columns: { id: true, nome: true, email: true },
            },
            seguradoraParceira: {
              columns: { id: true, razaoSocial: true, nomeFantasia: true },
            },
          } as any,
        });

        return { success: true, data: { renovacao: updated, cotacao: cotacaoCompleta ?? cotacao } };
      });
    },
  );

  // 5. Desfazer Início de Renovação
  fastify.post(
    '/:id/undo-start',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Desfazer início de renovação',
        description:
          'Reverte o início de uma renovação em prospecção, deletando a cotação gerada automaticamente e voltando o status para NAO_TRABALHADO. Só é possível enquanto a cotação vinculada ainda estiver em EM_ELABORACAO.',
        ...renovacoesDocs.desfazerInicio,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      return await db.transaction(async (tx) => {
        const renovacao = await tx.query.renovacoesComerciais.findFirst({
          where: and(
            eq(renovacoesComerciais.id, id),
            eq(renovacoesComerciais.corretoraId, request.corretoraId),
          ),
        });

        if (!renovacao) throw new NotFoundError('Renovação');
        if (renovacao.status !== 'EM_PROSPECCAO')
          throw new UnprocessableEntityError(
            'Apenas renovações em prospecção podem ter o início desfeito',
          );

        // Buscar a cotação criada pelo "iniciar" via detalhesRisco.renovacaoId.
        // Busca sem filtro de status para detectar cotações em estado inválido
        // (converted, lost) que não podem ser deletadas — evita estado órfão.
        const cotacaoVinculada = await tx.query.cotacoes.findFirst({
          where: and(
            eq(cotacoes.corretoraId, request.corretoraId),
            eq(cotacoes.situacao, 'RENOVACAO'),
            isNull(cotacoes.deletedAt),
            sql`${cotacoes.detalhesRisco}->>'renovacaoId' = ${id}`,
          ),
        });

        if (cotacaoVinculada) {
          if (cotacaoVinculada.status !== 'EM_ELABORACAO') {
            throw new UnprocessableEntityError(
              `Não é possível desfazer: a cotação ${cotacaoVinculada.numeroCotacao} já está em status "${cotacaoVinculada.status}" e não pode ser excluída.`,
            );
          }
          await tx.delete(cotacoes).where(eq(cotacoes.id, cotacaoVinculada.id));
        }

        // Reverter status da renovação
        const [updated] = await tx
          .update(renovacoesComerciais)
          .set({ status: 'NAO_TRABALHADO', updatedAt: new Date() })
          .where(eq(renovacoesComerciais.id, id))
          .returning();

        return ok({ renovacao: updated as any });
      });
    },
  );

  // 6. Atualizar Status
  fastify.patch(
    '/:id/update-status',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Atualizar status da renovação',
        description:
          'Atualiza o status de andamento da renovação (NAO_TRABALHADO, EM_PROSPECCAO, EM_NEGOCIACAO, AGUARDANDO_CLIENTE). Não permite atualizar para status finais (RENOVADO, PERDIDO, CANCELADO).',
        ...renovacoesDocs.atualizarStatus,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { status } = atualizarStatusSchema.parse(request.body);

      const renovacao = await db.query.renovacoesComerciais.findFirst({
        where: and(
          eq(renovacoesComerciais.id, id),
          eq(renovacoesComerciais.corretoraId, request.corretoraId),
        ),
      });

      if (!renovacao) throw new NotFoundError('Renovação');

      // Transições válidas — EM_PROSPECCAO só via /iniciar (cria cotação obrigatória)
      const VALID_TRANSITIONS: Record<string, string[]> = {
        NAO_TRABALHADO:     ['EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE'],
        EM_PROSPECCAO:      ['EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE'],
        EM_NEGOCIACAO:      ['AGUARDANDO_CLIENTE'],
        AGUARDANDO_CLIENTE: ['EM_NEGOCIACAO'],
        RENOVADO:           [],
        PERDIDO:            [],
        CANCELADO:          [],
      };
      const allowed = VALID_TRANSITIONS[renovacao.status] ?? [];
      if (!allowed.includes(status)) {
        throw new UnprocessableEntityError(
          `Transição inválida: ${renovacao.status} → ${status}. ` +
          (status === 'EM_PROSPECCAO'
            ? 'Use o endpoint de iniciar renovação para mover para EM_PROSPECCAO.'
            : renovacao.status === 'RENOVADO' || renovacao.status === 'PERDIDO' || renovacao.status === 'CANCELADO'
              ? 'Renovação já finalizada e não pode ser alterada.'
              : 'Operação não permitida.'),
        );
      }

      const [updated] = await db
        .update(renovacoesComerciais)
        .set({ status, updatedAt: new Date() })
        .where(eq(renovacoesComerciais.id, id))
        .returning();
      invalidateMetricasCache(request.corretoraId).catch((err) => {
        fastify.log.warn({ err }, 'invalidate-metricas-cache falhou');
      });
      return ok(updated as any);
    },
  );

  // 6. Atualizar Valores
  fastify.patch(
    '/:id/update-values',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Atualizar valores da renovação',
        description:
          'Atualiza valores negociados da renovação: prêmio, percentual de comissão, vigências e observações. Calcula automaticamente o valor da comissão quando o percentual é alterado.',
        ...renovacoesDocs.atualizarValores,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = atualizarValoresSchema.parse(request.body);

      const renovacao = await db.query.renovacoesComerciais.findFirst({
        where: and(
          eq(renovacoesComerciais.id, id),
          eq(renovacoesComerciais.corretoraId, request.corretoraId),
        ),
      });

      if (!renovacao) throw new NotFoundError('Renovação');
      if (['RENOVADO', 'PERDIDO', 'CANCELADO'].includes(renovacao.status))
        throw new ValidationError(
          'Não é possível alterar valores de renovação finalizada.',
        );

      if (data.novaVigenciaInicio && data.novaVigenciaFim) {
        if (data.novaVigenciaFim <= data.novaVigenciaInicio)
          throw new ValidationError(
            'Vigência fim deve ser posterior ao início.',
          );
      }

      const updateData: any = { updatedAt: new Date() };
      if (data.premioNovo !== undefined)
        updateData.premioNovo = data.premioNovo.toString();
      if (data.percentualComissaoNovo !== undefined) {
        updateData.percentualComissaoNovo =
          data.percentualComissaoNovo.toString();
        const premio =
          data.premioNovo ?? parseFloat(renovacao.premioNovo || '0');
        updateData.valorComissaoNovo = (
          (premio * data.percentualComissaoNovo) /
          100
        ).toFixed(2);
      }
      if (data.novaVigenciaInicio)
        updateData.novaVigenciaInicio = data.novaVigenciaInicio;
      if (data.novaVigenciaFim)
        updateData.novaVigenciaFim = data.novaVigenciaFim;
      if (data.observacoes) updateData.observacoes = data.observacoes;

      const [updated] = await db
        .update(renovacoesComerciais)
        .set(updateData)
        .where(eq(renovacoesComerciais.id, id))
        .returning();
      return ok(updated as any);
    },
  );

  // 7. Finalizar (Sucesso)
  fastify.post(
    '/:id/finalize',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Finalizar renovação com sucesso',
        description:
          'Marca a renovação como RENOVADO vinculando ao novo documento de venda. Atualiza automaticamente os valores finais da renovação com base no documento criado.',
        ...renovacoesDocs.finalizar,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { documentoVendaNovoId } = finalizarRenovacaoSchema.parse(
        request.body,
      );

      const renovacao = await db.query.renovacoesComerciais.findFirst({
        where: and(
          eq(renovacoesComerciais.id, id),
          eq(renovacoesComerciais.corretoraId, request.corretoraId),
        ),
      });

      if (!renovacao) throw new NotFoundError('Renovação');
      if (['RENOVADO', 'PERDIDO', 'CANCELADO'].includes(renovacao.status))
        throw new UnprocessableEntityError('Renovação já finalizada e não pode ser alterada');

      const novoDoc = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, documentoVendaNovoId),
          eq(documentosVenda.corretoraId, request.corretoraId),
        ),
      });

      if (!novoDoc) throw new NotFoundError('Novo documento');
      if (novoDoc.status !== 'ATIVO') {
        throw new UnprocessableEntityError(
          `Não é possível finalizar: o documento está em status "${novoDoc.status}". Aguarde a aprovação no cadastro.`,
        );
      }

      const [updated] = await db
        .update(renovacoesComerciais)
        .set({
          status: 'RENOVADO',
          documentoVendaNovoId,
          premioNovo: novoDoc.premioLiquido,
          percentualComissaoNovo: novoDoc.percentualComissao,
          valorComissaoNovo: novoDoc.valorComissao,
          novaVigenciaInicio: novoDoc.vigenciaInicio,
          novaVigenciaFim: novoDoc.vigenciaFim,
          dataFinalizacao: new Date(),
          finalizadoPorId: request.user.sub,
          updatedAt: new Date(),
        })
        .where(eq(renovacoesComerciais.id, id))
        .returning();

      // Verificar metas/missões/reconhecimento do vendedor após renovação finalizada
      import('../../utils/progresso-metrica.js').then(({ checkPendingGoals, checkPendingMissions }) => {
        Promise.all([
          checkPendingGoals(request.corretoraId, renovacao.vendedorId),
          checkPendingMissions(request.corretoraId, renovacao.vendedorId),
        ]).catch((err) => {
          console.error('Erro ao verificar metas/missões após renovação:', err);
        });
      });
      import('../../utils/reconhecimento.js').then(({ checkAllRecognitions }) => {
        checkAllRecognitions(request.corretoraId, renovacao.vendedorId).catch((err) => {
          console.error('Erro ao verificar reconhecimentos após renovação:', err);
        });
      });
      invalidateMetricasCache(request.corretoraId).catch((err) => {
        fastify.log.warn({ err }, 'invalidate-metricas-cache falhou');
      });

      return ok(updated as any);
    },
  );

  // 8. Perder/Cancelar (Endpoints similares de update simples)
  fastify.post(
    '/:id/mark-as-lost',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Marcar renovação como perdida',
        description:
          'Marca a renovação como PERDIDO registrando motivo da perda, concorrente vencedor e detalhes. Útil para análise de competitividade e melhoria de processos.',
        ...renovacoesDocs.perder,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = perderRenovacaoSchema.parse(request.body);

      const renovacao = await db.query.renovacoesComerciais.findFirst({
        where: and(
          eq(renovacoesComerciais.id, id),
          eq(renovacoesComerciais.corretoraId, request.corretoraId),
        ),
      });

      if (!renovacao) throw new NotFoundError('Renovação');
      if (['RENOVADO', 'PERDIDO', 'CANCELADO'].includes(renovacao.status))
        throw new UnprocessableEntityError('Renovação já finalizada e não pode ser alterada');

      const podeEditarTodos =
        request.user.isAdmin ||
        request.user.permissoes.includes('vendas:editar_todos_documentos');
      if (!podeEditarTodos && renovacao.vendedorId !== request.user.sub)
        throw new OwnershipError('Esta renovação não pertence a você.');

      // Se há documento vinculado em estado não-final, marcar como PERDIDO também
      if (renovacao.documentoVendaNovoId) {
        const docVinculado = await db.query.documentosVenda.findFirst({
          where: eq(documentosVenda.id, renovacao.documentoVendaNovoId),
          columns: { id: true, status: true },
        });
        const statusFinaisDoc = ['ATIVO', 'CANCELADO', 'PERDIDO', 'ARQUIVADO'];
        if (docVinculado && !statusFinaisDoc.includes(docVinculado.status)) {
          await db
            .update(documentosVenda)
            .set({
              status: 'PERDIDO',
              dataPerda: new Date(),
              motivoPerda: data.motivoPerda,
              updatedAt: new Date(),
            })
            .where(eq(documentosVenda.id, renovacao.documentoVendaNovoId));
        }
      }

      const [updated] = await db
        .update(renovacoesComerciais)
        .set({
          status: 'PERDIDO',
          statusAntesPerda: renovacao.status,
          dataPerda: new Date(),
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(renovacoesComerciais.id, id))
        .returning();
      invalidateMetricasCache(request.corretoraId).catch((err) => {
        fastify.log.warn({ err }, 'invalidate-metricas-cache falhou');
      });
      return ok(updated as any);
    },
  );

  // 9. Desfazer perda de renovação
  fastify.post(
    '/:id/undo-loss',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Desfazer marcação de renovação como perdida',
        description:
          'Reverte a renovação de PERDIDO para o status anterior. Requer permissão de edição de todos os documentos.',
        ...renovacoesDocs.desfazerPerda,
      },
      preHandler: [authorize(['vendas:editar_todos_documentos'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const renovacao = await db.query.renovacoesComerciais.findFirst({
        where: and(
          eq(renovacoesComerciais.id, id),
          eq(renovacoesComerciais.corretoraId, request.corretoraId),
        ),
      });

      if (!renovacao) throw new NotFoundError('Renovação');
      if (renovacao.status !== 'PERDIDO')
        throw new UnprocessableEntityError('Apenas renovações com status PERDIDO podem ser revertidas');

      const statusAnterior = renovacao.statusAntesPerda ?? 'NAO_TRABALHADO';

      const [updated] = await db
        .update(renovacoesComerciais)
        .set({
          status: statusAnterior,
          statusAntesPerda: null,
          dataPerda: null,
          motivoPerda: null,
          concorrenteGanhou: null,
          detalhesPerda: null,
          updatedAt: new Date(),
        })
        .where(eq(renovacoesComerciais.id, id))
        .returning();

      invalidateMetricasCache(request.corretoraId).catch((err) => {
        fastify.log.warn({ err }, 'invalidate-metricas-cache falhou');
      });
      return ok(updated as any);
    },
  );

  // 10. Cancelar renovação
  fastify.post(
    '/:id/mark-as-cancelled',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Cancelar renovação',
        description: 'Marca a renovação como CANCELADO registrando o motivo.',
        ...renovacoesDocs.cancelar,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { auditLogs, usuarios } = await import('@ecotech/shared/database');
      const data = cancelarRenovacaoSchema.parse(request.body);

      const renovacao = await db.query.renovacoesComerciais.findFirst({
        where: and(
          eq(renovacoesComerciais.id, id),
          eq(renovacoesComerciais.corretoraId, request.corretoraId),
        ),
      });

      if (!renovacao) throw new NotFoundError('Renovação');
      if (['RENOVADO', 'PERDIDO', 'CANCELADO'].includes(renovacao.status))
        throw new UnprocessableEntityError('Renovação já finalizada e não pode ser alterada');

      const podeEditarTodos =
        request.user.isAdmin ||
        request.user.permissoes.includes('vendas:editar_todos_documentos');
      if (!podeEditarTodos && renovacao.vendedorId !== request.user.sub)
        throw new OwnershipError('Esta renovação não pertence a você.');

      const [updated] = await db
        .update(renovacoesComerciais)
        .set({
          status: 'CANCELADO',
          statusAntesCancelamento: renovacao.status as any,
          dataCancelamento: new Date(),
          motivoCancelamento: data.motivoCancelamento,
          updatedAt: new Date(),
        })
        .where(eq(renovacoesComerciais.id, id))
        .returning();

      const usuario = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { nome: true, email: true },
      });
      await db.insert(auditLogs).values({
        corretoraId: request.corretoraId,
        usuarioId: request.user.sub,
        usuarioNome: usuario?.nome ?? null,
        usuarioEmail: usuario?.email ?? null,
        acao: 'CANCELAMENTO_RENOVACAO',
        entidade: 'renovacao',
        entidadeId: id,
        dadosAnteriores: { status: renovacao.status },
        dadosNovos: { status: 'CANCELADO', motivoCancelamento: data.motivoCancelamento },
        ipAddress: request.ip ?? null,
      });

      invalidateMetricasCache(request.corretoraId).catch((err) => {
        fastify.log.warn({ err }, 'invalidate-metricas-cache falhou');
      });
      return ok(updated as any);
    },
  );

  // 11. Reativar renovação cancelada
  fastify.post(
    '/:id/reactivate',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Reativar renovação cancelada',
        description:
          'Reverte a renovação de CANCELADO para o status anterior. Requer permissão de aceitar exclusão.',
        ...renovacoesDocs.reativar,
      },
      preHandler: [authorize(['aceitar_exclusao:renovacao'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { auditLogs, usuarios } = await import('@ecotech/shared/database');

      const renovacao = await db.query.renovacoesComerciais.findFirst({
        where: and(
          eq(renovacoesComerciais.id, id),
          eq(renovacoesComerciais.corretoraId, request.corretoraId),
        ),
      });

      if (!renovacao) throw new NotFoundError('Renovação');
      if (renovacao.status !== 'CANCELADO')
        throw new UnprocessableEntityError('Apenas renovações com status CANCELADO podem ser reativadas');

      const statusAnterior = renovacao.statusAntesCancelamento ?? 'NAO_TRABALHADO';

      const [updated] = await db
        .update(renovacoesComerciais)
        .set({
          status: statusAnterior,
          statusAntesCancelamento: null,
          dataCancelamento: null,
          motivoCancelamento: null,
          updatedAt: new Date(),
        })
        .where(eq(renovacoesComerciais.id, id))
        .returning();

      const admin = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { nome: true, email: true },
      });
      await db.insert(auditLogs).values({
        corretoraId: request.corretoraId,
        usuarioId: request.user.sub,
        usuarioNome: admin?.nome ?? null,
        usuarioEmail: admin?.email ?? null,
        acao: 'REATIVACAO_RENOVACAO',
        entidade: 'renovacao',
        entidadeId: id,
        dadosAnteriores: { status: 'CANCELADO' },
        dadosNovos: { status: statusAnterior },
        ipAddress: request.ip ?? null,
      });

      invalidateMetricasCache(request.corretoraId).catch((err) => {
        fastify.log.warn({ err }, 'invalidate-metricas-cache falhou');
      });
      return ok(updated as any);
    },
  );

  // 11. Processar Renovações Pendentes (após cadastro de cliente)
  fastify.post(
    '/process-pending',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Processar renovações de clientes recém-cadastrados',
        description:
          'Processa novamente as linhas pendentes de importação após o cadastro de novos clientes.',
        ...renovacoesDocs.processarPendentes,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request, reply) => {
      const { clientes: clientesTable, produtos: produtosTablePend } = await import(
        '@ecotech/shared/database'
      );

      const body = z
        .object({
          vendedorId: z.string().uuid(),
          linhasPendentes: z
            .array(
              z.object({
                linha: z.number().int(),
                documento: z.string(),
                itemDescricao: z.string().optional(),
                produtoDescricao: z.string().optional(),
                seguradoraAnterior: z.string().optional(),
                premioLiquido: z.string().optional(),
                comissao: z.string().optional(),
                vigenciaFinal: z.string(),
                statusPlanilha: z.string().optional(),
              }),
            )
            .max(1000),
        })
        .parse(request.body);

      const { vendedorId, linhasPendentes } = body;

      const results = {
        total: linhasPendentes.length,
        sucesso: 0,
        erros: 0,
        detalhes: [] as Array<{
          linha: number;
          status: 'sucesso' | 'erro';
          mensagem: string;
        }>,
      };

      // Pré-carregar todos os clientes relevantes em uma única query
      const documentosLimpos = linhasPendentes.map((p) =>
        p.documento.toString().replace(/[.\-/]/g, ''),
      );

      const todosClientesBatch = await db.query.clientes.findMany({
        where: and(
          eq(clientesTable.corretoraId, request.corretoraId),
          or(
            inArray(clientesTable.cpf, documentosLimpos),
            inArray(clientesTable.cnpj, documentosLimpos),
          ),
        ),
        columns: { id: true, cpf: true, cnpj: true },
      });

      const clienteMapBatch = new Map<string, (typeof todosClientesBatch)[0]>([
        ...todosClientesBatch
          .filter((c) => c.cpf)
          .map((c) => [c.cpf!.replace(/[.\-/]/g, ''), c] as const),
        ...todosClientesBatch
          .filter((c) => c.cnpj)
          .map((c) => [c.cnpj!.replace(/[.\-/]/g, ''), c] as const),
      ]);

      const clienteIds = [...new Set(todosClientesBatch.map((c) => c.id))];

      // Pré-carregar documentos de venda ativos para os clientes encontrados
      const documentosVendaAtivos =
        clienteIds.length > 0
          ? await db.query.documentosVenda.findMany({
              where: and(
                eq(documentosVenda.corretoraId, request.corretoraId),
                inArray(documentosVenda.clienteId, clienteIds),
                eq(documentosVenda.status, 'ATIVO'),
              ),
              columns: {
                id: true,
                clienteId: true,
                produtoId: true,
                premioLiquido: true,
                percentualComissao: true,
                valorComissao: true,
              },
            })
          : [];
      const documentoVendaMap = new Map(
        documentosVendaAtivos.map((d) => [`${d.clienteId}|${d.produtoId ?? ''}`, d]),
      );

      // Pré-carregar renovações existentes para detectar duplicatas
      const renovacoesExistentes =
        clienteIds.length > 0
          ? await db.query.renovacoesComerciais.findMany({
              where: and(
                eq(renovacoesComerciais.corretoraId, request.corretoraId),
                inArray(renovacoesComerciais.clienteId, clienteIds),
              ),
              columns: {
                clienteId: true,
                dataVencimento: true,
                itemDescricao: true,
              },
            })
          : [];
      const renovacaoKey = (
        clienteId: string,
        dataVenc: string,
        item: string | null,
      ) => `${clienteId}|${dataVenc}|${item ?? ''}`;
      const renovacoesSet = new Set(
        renovacoesExistentes.map((r) =>
          renovacaoKey(r.clienteId!, r.dataVencimento, r.itemDescricao),
        ),
      );

      // Dedup de documentos ativos existentes
      const docsAtivosExistPend =
        clienteIds.length > 0
          ? await db.query.documentosVenda.findMany({
              where: and(
                eq(documentosVenda.corretoraId, request.corretoraId),
                inArray(documentosVenda.clienteId, clienteIds),
                eq(documentosVenda.status, 'ATIVO'),
              ),
              columns: { clienteId: true, vigenciaFim: true, produtoId: true },
            })
          : [];
      const docsAtivosSetPend = new Set(
        docsAtivosExistPend.map((d) => `${d.clienteId}|${d.vigenciaFim}|${d.produtoId ?? ''}`),
      );

      // Produtos para matching por nome
      const todosProdutosPend = await db.query.produtos.findMany({
        where: eq(produtosTablePend.corretoraId, request.corretoraId),
        columns: { id: true, nomeProduto: true },
      });
      const findProdutoPend = (nome: string): string | null => {
        if (!nome) return null;
        const n = nome.toLowerCase();
        return (
          todosProdutosPend.find((p) => p.nomeProduto.toLowerCase().includes(n))?.id ??
          todosProdutosPend.find((p) => n.includes(p.nomeProduto.toLowerCase()))?.id ??
          null
        );
      };

      // Sequencial IMP para documentos importados
      const nowPend = new Date();
      const anoMesPend = `${nowPend.getFullYear()}${String(nowPend.getMonth() + 1).padStart(2, '0')}`;
      const prefixoImpPend = `IMP-${anoMesPend}`;
      const maxImpPend = await db
        .select({ max: sql<string>`MAX(numero_documento)` })
        .from(documentosVenda)
        .where(
          and(
            eq(documentosVenda.corretoraId, request.corretoraId),
            sql`numero_documento LIKE ${`${prefixoImpPend}-%`}`,
          ),
        );
      let nextImpSeqPend =
        (maxImpPend[0]?.max
          ? parseInt(maxImpPend[0].max.split('-').pop() ?? '0', 10)
          : 0) + 1;

      const getMaxImpSeqPend = async (): Promise<number> => {
        const [row] = await db
          .select({ max: sql<string>`MAX(numero_documento)` })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              sql`numero_documento LIKE ${`${prefixoImpPend}-%`}`,
            ),
          );
        return row?.max ? parseInt(row.max.split('-').pop() ?? '0', 10) : 0;
      };

      const hojePend = new Date();
      hojePend.setHours(0, 0, 0, 0);
      const limiteRenovacaoPend = new Date(hojePend);
      limiteRenovacaoPend.setDate(limiteRenovacaoPend.getDate() + 60);

      // Processar pendentes usando os dados pré-carregados
      const insertsRenovacoes: any[] = [];
      const insertsDocumentosPend: any[] = [];

      for (const pendente of linhasPendentes) {
        const documentoLimpo = pendente.documento
          .toString()
          .replace(/[.\-/]/g, '');

        const cliente = clienteMapBatch.get(documentoLimpo);

        if (!cliente) {
          results.detalhes.push({
            linha: pendente.linha,
            status: 'erro',
            mensagem: 'Cliente ainda não cadastrado',
          });
          results.erros++;
          continue;
        }

        // Determinar produtoId cedo — necessário para a chave de dedup de docs ativos
        const nomeProd = (pendente.produtoDescricao || pendente.itemDescricao || '').trim();
        const produtoId = findProdutoPend(nomeProd);

        const key = renovacaoKey(
          cliente.id,
          pendente.vigenciaFinal,
          pendente.itemDescricao ?? null,
        );
        const docKeyPend = `${cliente.id}|${pendente.vigenciaFinal}|${produtoId ?? ''}`;
        if (renovacoesSet.has(key) || docsAtivosSetPend.has(docKeyPend)) {
          results.detalhes.push({
            linha: pendente.linha,
            status: 'erro',
            mensagem: `Duplicata ignorada — já existe registro para este cliente com vigência ${pendente.vigenciaFinal}${pendente.itemDescricao ? ` / item: ${pendente.itemDescricao}` : ''}`,
          });
          results.erros++;
          continue;
        }

        const documentoVenda = documentoVendaMap.get(`${cliente.id}|${produtoId ?? ''}`);

        let premioAnterior: string | null = null;
        let percentualComissaoAnterior: string | null = null;

        if (pendente.premioLiquido) {
          const premioStr = pendente.premioLiquido
            .toString()
            .replace(/[^\d.,]/g, '')
            .replace(',', '.');
          premioAnterior = premioStr || null;
        } else if (documentoVenda?.premioLiquido) {
          premioAnterior = documentoVenda.premioLiquido;
        }

        if (pendente.comissao) {
          percentualComissaoAnterior = parsePercentualPlanilha(pendente.comissao);
        } else if (documentoVenda?.percentualComissao) {
          percentualComissaoAnterior = documentoVenda.percentualComissao;
        }

        // Decisão: vigência > 60 dias → documento ativo; ≤ 60 dias → renovação
        const vencPend = new Date(pendente.vigenciaFinal + 'T00:00:00');
        if (vencPend > limiteRenovacaoPend) {
          if (produtoId) {
            const [anoV, mesV, diaV] = pendente.vigenciaFinal.split('-').map(Number);
            const vigenciaInicio = `${anoV - 1}-${String(mesV).padStart(2, '0')}-${String(diaV).padStart(2, '0')}`;
            const numeroDocumento = `${prefixoImpPend}-${String(nextImpSeqPend++).padStart(5, '0')}`;
            docsAtivosSetPend.add(docKeyPend);
            insertsDocumentosPend.push({
              _linha: pendente.linha,
              _aviso: null,
              corretoraId: request.corretoraId,
              clienteId: cliente.id,
              vendedorId,
              produtoId,
              numeroDocumento,
              tipoDocumento: 'VENDA_EXPRESSA' as const,
              status: 'ATIVO' as const,
              vigenciaInicio,
              vigenciaFim: pendente.vigenciaFinal,
              premioLiquido: premioAnterior,
              percentualComissao: percentualComissaoAnterior,
              observacoes: `Importado da planilha - Status original: ${pendente.statusPlanilha || 'N/A'}`,
            });
            continue;
          }
          // Fallback: produto não encontrado → renovação com aviso
          renovacoesSet.add(key);
          insertsRenovacoes.push({
            _linha: pendente.linha,
            _aviso: `Produto "${nomeProd || 'não informado'}" não encontrado no sistema — criado como renovação. Vincule o produto manualmente.`,
            corretoraId: request.corretoraId,
            clienteId: cliente.id,
            documentoVendaAnteriorId: documentoVenda?.id || null,
            vendedorId,
            premioAnterior,
            percentualComissaoAnterior,
            valorComissaoAnterior: documentoVenda?.valorComissao || null,
            dataVencimento: pendente.vigenciaFinal,
            status: 'NAO_TRABALHADO',
            itemDescricao: pendente.itemDescricao || null,
            produtoDescricao: pendente.produtoDescricao || null,
            seguradoraAnterior: pendente.seguradoraAnterior || null,
            observacoes: `Importado da planilha - Status original: ${pendente.statusPlanilha || 'N/A'}`,
          } as any);
          continue;
        }

        // Marcar como já inserida para evitar duplicatas dentro do mesmo batch
        renovacoesSet.add(key);

        insertsRenovacoes.push({
          _linha: pendente.linha,
          _aviso: null,
          corretoraId: request.corretoraId,
          clienteId: cliente.id,
          documentoVendaAnteriorId: documentoVenda?.id || null,
          vendedorId,
          premioAnterior,
          percentualComissaoAnterior,
          valorComissaoAnterior: documentoVenda?.valorComissao || null,
          dataVencimento: pendente.vigenciaFinal,
          status: 'NAO_TRABALHADO',
          itemDescricao: pendente.itemDescricao || null,
          produtoDescricao: pendente.produtoDescricao || null,
          seguradoraAnterior: pendente.seguradoraAnterior || null,
          observacoes: `Importado da planilha - Status original: ${pendente.statusPlanilha || 'N/A'}`,
        } as any);
      }

      // Inserção em batch de documentos ativos
      if (insertsDocumentosPend.length > 0) {
        try {
          const docsLimpos = insertsDocumentosPend.map(({ _linha, ...rest }: any) => rest);
          await db.insert(documentosVenda).values(docsLimpos);
          for (const ins of insertsDocumentosPend) {
            results.sucesso++;
            results.detalhes.push({
              linha: ins._linha,
              status: 'sucesso',
              mensagem: 'Documento ativo criado (vigência > 60 dias)',
            });
          }
        } catch {
          for (const ins of insertsDocumentosPend) {
            const { _linha, ...insertData } = ins as any;
            try {
              // Retry on IMP sequence collision
              for (let attempt = 0; attempt < 10; attempt++) {
                try {
                  await db.insert(documentosVenda).values(insertData);
                  break;
                } catch (err: any) {
                  if (err?.code === '23505' && attempt < 9) {
                    const newSeq = (await getMaxImpSeqPend()) + 1;
                    insertData.numeroDocumento = `${prefixoImpPend}-${String(newSeq).padStart(5, '0')}`;
                    continue;
                  }
                  throw err;
                }
              }
              results.sucesso++;
              results.detalhes.push({ linha: _linha, status: 'sucesso', mensagem: 'Documento ativo criado (vigência > 60 dias)' });
            } catch (err: any) {
              results.erros++;
              results.detalhes.push({ linha: _linha, status: 'erro', mensagem: err.message || 'Erro ao criar documento ativo' });
            }
          }
        }
      }

      // Inserção em batch de todas as renovações válidas
      if (insertsRenovacoes.length > 0) {
        try {
          const insertsLimpos = insertsRenovacoes.map(({ _linha, _aviso, ...rest }: any) => rest);
          await db.insert(renovacoesComerciais).values(insertsLimpos).onConflictDoNothing();

          for (const insert of insertsRenovacoes) {
            results.sucesso++;
            results.detalhes.push({
              linha: (insert as any)._linha,
              status: 'sucesso',
              mensagem: (insert as any)._aviso || 'Renovação criada (vencimento ≤ 60 dias)',
            });
          }
        } catch (error: any) {
          // Fallback: inserir um a um se o batch falhar
          for (const insert of insertsRenovacoes) {
            const { _linha, _aviso, ...insertData } = insert as any;
            try {
              await db.insert(renovacoesComerciais).values(insertData).onConflictDoNothing();
              results.sucesso++;
              results.detalhes.push({
                linha: _linha,
                status: 'sucesso',
                mensagem: _aviso || 'Renovação criada (vencimento ≤ 60 dias)',
              });
            } catch (err: any) {
              results.erros++;
              results.detalhes.push({
                linha: _linha,
                status: 'erro',
                mensagem: `Falha ao salvar no banco: ${err.message || 'Erro desconhecido'}`,
              });
            }
          }
        }
      }

      return reply.status(200).send({
        success: true,
        data: results,
      });
    },
  );

  // 10. Criar Manual
  fastify.post(
    '/create-manual',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Criar renovação manualmente',
        description:
          'Cria uma nova renovação manualmente a partir de um documento de venda ativo. Útil para adicionar renovações que não foram detectadas automaticamente pelo sistema.',
        ...renovacoesDocs.criarManual,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request, reply) => {
      const { documentoVendaAnteriorId } = criarRenovacaoManualSchema.parse(
        request.body,
      );
      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, documentoVendaAnteriorId),
          eq(documentosVenda.corretoraId, request.corretoraId),
        ),
      });

      if (!documento || documento.status !== 'ATIVO')
        throw new UnprocessableEntityError('Documento inválido ou inativo');

      const [renovacao] = await db
        .insert(renovacoesComerciais)
        .values({
          corretoraId: request.corretoraId,
          documentoVendaAnteriorId,
          vendedorId: documento.vendedorId,
          premioAnterior: documento.premioLiquido,
          percentualComissaoAnterior: documento.percentualComissao,
          valorComissaoAnterior: documento.valorComissao,
          dataVencimento: documento.vigenciaFim,
          status: 'NAO_TRABALHADO',
        })
        .returning();

      return reply.status(201).send({ success: true, data: renovacao });
    },
  );

  // 10. Importar Renovações de Planilha
  fastify.post(
    '/import',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Importar renovações de planilha Excel',
        description:
          'Importa múltiplas renovações a partir de uma planilha Excel (.xlsx). Aceita arquivo multipart/form-data e vendedorId. Resultados persistidos no banco para consulta posterior.',
        consumes: ['multipart/form-data'],
        ...renovacoesDocs.importar,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request, reply) => {
      const {
        clientes: clientesTable,
        usuarios: usuariosTable,
        produtos: produtosTable,
        importacaoRenovacoes,
        importacaoRenovacaoItens,
      } = await import('@ecotech/shared/database');

      // Obter arquivo e campos da requisição multipart
      const data = await (request as any).file();
      if (!data) {
        throw new ValidationError('Arquivo não fornecido');
      }

      // Obter vendedorId do FormData
      const vendedorIdField = data.fields.vendedorId;
      const vendedorIdSelecionado = vendedorIdField?.value || null;

      if (!vendedorIdSelecionado) {
        throw new ValidationError('Vendedor responsável não informado');
      }

      // Verificar se vendedor existe, pertence à corretora e está ativo
      const vendedorSelecionado = await db.query.usuarios.findFirst({
        where: and(
          eq(usuariosTable.id, vendedorIdSelecionado),
          eq(usuariosTable.corretoraId, request.corretoraId),
          eq(usuariosTable.ativo, true),
        ),
      });

      if (!vendedorSelecionado) {
        throw new ValidationError(
          'Vendedor não encontrado, inativo ou não pertence à sua corretora',
        );
      }

      const buffer = await data.toBuffer();
      const nomeArquivo = data.filename || 'planilha.xlsx';
      const tamanhoArquivo = buffer.length;
      const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
      if (tamanhoArquivo > MAX_UPLOAD_BYTES) {
        throw new ValidationError('Arquivo excede o limite de 20 MB.');
      }

      // Parse do arquivo Excel
      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(buffer, { type: 'buffer' });
      } catch (error) {
        throw new ValidationError('Arquivo Excel inválido');
      }

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new ValidationError('Planilha vazia');
      }

      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

      if (rows.length === 0) {
        throw new ValidationError('Nenhum dado encontrado na planilha');
      }

      // Validar cabeçalhos obrigatórios — evita gerar N erros idênticos quando o template está errado
      const cabecalhos = Object.keys(rows[0] as Record<string, unknown>);
      const cabecalhosSet = new Set(cabecalhos);
      const colunasObrigatorias: { aceitas: string[]; rotulo: string }[] = [
        { aceitas: ['CLIENTE'], rotulo: 'CLIENTE' },
        { aceitas: ['VIGÊNCIA FINAL', 'VIGENCIA FINAL'], rotulo: 'VIGÊNCIA FINAL' },
      ];
      const ausentes = colunasObrigatorias
        .filter((c) => !c.aceitas.some((nome) => cabecalhosSet.has(nome)))
        .map((c) => c.rotulo);
      if (ausentes.length > 0) {
        // Filtra colunas anônimas (__EMPTY_N) — são colunas vazias do range do Excel, viram lixo visual
        const cabecalhosNomeados = cabecalhos.filter((c) => !/^__EMPTY/.test(c));

        const partes: string[] = [
          `A planilha não pôde ser importada porque ${ausentes.length === 1 ? 'falta a coluna obrigatória' : 'faltam as colunas obrigatórias'} ${ausentes.map((c) => `"${c}"`).join(' e ')}.`,
        ];

        if (cabecalhosNomeados.length === 0) {
          // Nenhum cabeçalho válido — provavelmente título no topo ou cabeçalho em linha errada
          partes.push(
            `\n\nNão encontramos nenhum nome de coluna na primeira linha. Verifique se há um título ou linha em branco antes do cabeçalho — ele precisa estar na linha 1.`,
          );
        } else {
          partes.push(
            `\n\nColunas encontradas no arquivo: ${cabecalhosNomeados.join(', ')}.`,
            `\n\nO que fazer: adicione ${ausentes.length === 1 ? 'a coluna' : 'as colunas'} ${ausentes.map((c) => `"${c}"`).join(' e ')} ${ausentes.length === 1 ? 'à' : 'às'} planilha, ou baixe o modelo na tela de importação para garantir o formato correto.`,
          );
        }

        throw new ValidationError(partes.join(''));
      }

      // Criar registro de importação no banco
      const [importacao] = await db
        .insert(importacaoRenovacoes)
        .values({
          corretoraId: request.corretoraId,
          usuarioId: request.user.sub,
          vendedorId: vendedorIdSelecionado,
          nomeArquivo,
          tamanhoArquivo,
          status: 'PROCESSANDO',
          totalLinhas: rows.length,
        })
        .returning();

      // Função para processar múltiplos valores separados por |
      const parseMultipleValues = (
        value: string | null | undefined,
      ): string[] => {
        if (!value) return [];
        return value
          .toString()
          .split('|')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
      };

      const results = {
        total: rows.length,
        sucesso: 0,
        erros: 0,
        pendentes: 0,
        pulados: 0,
        detalhes: [] as Array<{
          linha: number;
          status: 'sucesso' | 'erro' | 'pulado' | 'pendente';
          mensagem: string;
          cliente?: string;
          produto?: string;
        }>,
        clientesPendentes: [] as Array<{
          linha: number;
          tipoPessoa: 'PF' | 'PJ';
          nome: string;
          documento: string;
          emails: string[];
          telefones: string[];
          produto: string;
          premioLiquido: string | null;
          comissao: string | null;
          vigenciaFinal: string;
          seguradora: string | null;
        }>,
      };

      // Itens para inserção em batch na tabela de itens
      const itensParaSalvar: Array<{
        linhaNumero: number;
        status: 'SUCESSO' | 'ERRO' | 'PULADO' | 'PENDENTE';
        mensagem: string;
        nomeCliente: string | null;
        documentoCliente: string | null;
        produto: string | null;
        dadosLinha: any;
        renovacaoId?: string | null;
        documentoVendaId?: string | null;
        erroDetalhes?: string | null;
      }> = [];

      // excelSerialToDate, parseVigencia e findProdutoId importados de @ecotech/shared/utils

      // Pré-carregar todos os clientes da corretora para evitar N+1 queries
      const todosClientes = await db.query.clientes.findMany({
        where: and(
          eq(clientesTable.corretoraId, request.corretoraId),
          isNull(clientesTable.deletedAt),
        ),
        columns: {
          id: true,
          nome: true,
          razaoSocial: true,
          cpf: true,
          cnpj: true,
          vendedorId: true,
        },
      });
      const clientesPorCpf = new Map(
        todosClientes
          .filter((c) => c.cpf)
          .map((c) => [c.cpf!.replace(/[.\-/]/g, ''), c]),
      );
      const clientesPorCnpj = new Map(
        todosClientes
          .filter((c) => c.cnpj)
          .map((c) => [c.cnpj!.replace(/[.\-/]/g, ''), c]),
      );
      // Stubs sem documento indexados por nome+vendedor — evita criar duplicatas em
      // reimports da mesma planilha sem misturar stubs de vendedores diferentes
      const clientesPorNomeSemDoc = new Map(
        todosClientes
          .filter((c) => !c.cpf && !c.cnpj)
          .map((c) => [`${(c.nome || c.razaoSocial || '').toLowerCase().trim()}|${c.vendedorId}`, c]),
      );

      // Determinar quais clientes aparecem na planilha para pré-carregar dados relacionados
      const clienteIdsNaPlanilha = new Set<string>();
      for (const row of rows) {
        const docCliente = row['DOCUMENTO DO CLIENTE'];
        if (!docCliente) continue;
        const docLimpo = docCliente.toString().replace(/[.\-/]/g, '');
        const c = clientesPorCpf.get(docLimpo) || clientesPorCnpj.get(docLimpo);
        if (c) clienteIdsNaPlanilha.add(c.id);
      }
      const clienteIdsBatch = [...clienteIdsNaPlanilha];

      // Pré-carregar documentos de venda ativos para os clientes encontrados
      const documentosVendaAtivosBatch =
        clienteIdsBatch.length > 0
          ? await db.query.documentosVenda.findMany({
              where: and(
                eq(documentosVenda.corretoraId, request.corretoraId),
                inArray(documentosVenda.clienteId, clienteIdsBatch),
                eq(documentosVenda.status, 'ATIVO'),
              ),
              columns: {
                id: true,
                clienteId: true,
                vigenciaFim: true,
                produtoId: true,
                premioLiquido: true,
                percentualComissao: true,
                valorComissao: true,
              },
            })
          : [];
      // Chave clienteId|produtoId garante que a renovação linka ao documento do mesmo produto
      const documentoVendaMapImport = new Map(
        documentosVendaAtivosBatch.map((d) => [`${d.clienteId}|${d.produtoId ?? ''}`, d]),
      );

      // Pré-carregar renovações existentes para detectar duplicatas sem queries no loop
      const renovacoesExistentesBatch =
        clienteIdsBatch.length > 0
          ? await db.query.renovacoesComerciais.findMany({
              where: and(
                eq(renovacoesComerciais.corretoraId, request.corretoraId),
                inArray(renovacoesComerciais.clienteId, clienteIdsBatch),
              ),
              columns: {
                id: true,
                clienteId: true,
                dataVencimento: true,
                itemDescricao: true,
              },
            })
          : [];
      // Map: chave → renovacaoId (para linkar o original no item pulado)
      const renovacoesExistentesMap = new Map(
        renovacoesExistentesBatch.map((r) => [
          `${r.clienteId}|${r.dataVencimento}|${(r.itemDescricao ?? '').toLowerCase().trim()}`,
          r.id,
        ]),
      );

      // Pré-carregar documentos de venda ativos para deduplicação
      // Chave inclui produtoId para permitir dois produtos diferentes com mesma vigência
      const documentosAtivosMap = new Map(
        documentosVendaAtivosBatch.map((d) => [
          `${d.clienteId}|${d.vigenciaFim ?? ''}|${d.produtoId ?? ''}`,
          d.id,
        ]),
      );

      // Pré-carregar todos os produtos da corretora para matching por nome
      const todosProdutos = await db.query.produtos.findMany({
        where: eq(produtosTable.corretoraId, request.corretoraId),
        columns: { id: true, nomeProduto: true },
      });

      // Pré-carregar todos os usuários ativos da corretora para resolver TODOS VENDEDORES
      const todosUsuariosAtivos = await db.query.usuarios.findMany({
        where: and(
          eq(usuariosTable.corretoraId, request.corretoraId),
          eq(usuariosTable.ativo, true),
        ),
        columns: { id: true, nome: true },
      });
      const usuariosPorNome = new Map(
        todosUsuariosAtivos.map((u) => [u.nome.toLowerCase().trim(), u.id]),
      );

      // Calcular próximo sequencial para documentos importados (prefixo IMP)
      const now = new Date();
      const anoMesImp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prefixoImp = `IMP-${anoMesImp}`;
      const maxImpResult = await db
        .select({ max: sql<string>`MAX(numero_documento)` })
        .from(documentosVenda)
        .where(
          and(
            eq(documentosVenda.corretoraId, request.corretoraId),
            sql`numero_documento LIKE ${`${prefixoImp}-%`}`,
          ),
        );
      let nextImpSeq =
        (maxImpResult[0]?.max
          ? parseInt(maxImpResult[0].max.split('-').pop() ?? '0', 10)
          : 0) + 1;

      // Helper para re-ler o MAX sequencial — usado nos fallbacks per-row para evitar race condition
      const getMaxImpSeq = async (executor: any = db): Promise<number> => {
        const [row] = await executor
          .select({ max: sql<string>`MAX(numero_documento)` })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              sql`numero_documento LIKE ${`${prefixoImp}-%`}`,
            ),
          );
        return row?.max ? parseInt(row.max.split('-').pop() ?? '0', 10) : 0;
      };

      // Limite de dias para considerar renovação imediata
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const limiteRenovacao = new Date(hoje);
      limiteRenovacao.setDate(limiteRenovacao.getDate() + 60);

      // Resolve o vendedor primário e secundário a partir do campo TODOS VENDEDORES da planilha.
      // Opção A: primeiro nome encontrado nos usuários ativos → primário; vendedor do formulário → secundário.
      // Se nenhum nome da planilha corresponder a um usuário real, usa o vendedor do formulário como primário.
      const resolveVendedores = (todosVendedores: string | undefined | null): {
        vendedorIdEfetivo: string;
        vendedorSecundarioIdEfetivo: string | null;
      } => {
        if (!todosVendedores) {
          return { vendedorIdEfetivo: vendedorIdSelecionado, vendedorSecundarioIdEfetivo: null };
        }
        const nomes = todosVendedores.toString().split(';').map((n) => n.trim()).filter(Boolean);
        const primeiroId = nomes.map((n) => usuariosPorNome.get(n.toLowerCase())).find(Boolean);
        if (!primeiroId) {
          return { vendedorIdEfetivo: vendedorIdSelecionado, vendedorSecundarioIdEfetivo: null };
        }
        // Só adiciona Alexandre como secundário se ele for diferente do primário já resolvido
        const secundario = primeiroId !== vendedorIdSelecionado ? vendedorIdSelecionado : null;
        return { vendedorIdEfetivo: primeiroId, vendedorSecundarioIdEfetivo: secundario };
      };

      // Coleções para writes em batch após o loop
      const insertsRenovacoesImport: any[] = [];
      const insertsDocumentosAtivos: any[] = [];
      // Documentos criados como "anterior" para renovações ≤60 dias sem apólice prévia no sistema
      const insertsDocumentosAnteriores: any[] = [];

      // Processar cada linha
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const linhaNum = i + 2; // +2 porque: +1 para índice baseado em 1, +1 para cabeçalho

        try {
          // Extrair dados da planilha
          const vigenciaFinal = row['VIGÊNCIA FINAL'] || row['VIGENCIA FINAL'];
          const tipoPessoa = row['TIPO DE PESSOA'];
          const email = row['E-MAIL'];
          const telefone = row['TELEFONE'];
          const nomeCliente = row['CLIENTE'];
          const documentoCliente = row['DOCUMENTO DO CLIENTE'];
          const item = row['ITEM'];
          const produto = row['PRODUTO'];
          const seguradora = row['SEGURADORA'];
          const todosVendedores = row['TODOS VENDEDORES'];
          const { vendedorIdEfetivo, vendedorSecundarioIdEfetivo } = resolveVendedores(todosVendedores);
          const premioLiquido = row['PRÊMIO LÍQUIDO'] || row['PREMIO LIQUIDO'];
          const comissao = row['COMISSÃO'] || row['COMISSAO'];
          const statusPlanilha = row['STATUS'];

          // --- Validação de campos obrigatórios ---
          // DOCUMENTO DO CLIENTE virou opcional: linhas sem doc (ou com doc inválido)
          // criam um cliente-stub que o vendedor completa no dialog de iniciar renovação.
          const camposAusentes: string[] = [];
          const nomeClienteTrim = (nomeCliente?.toString() || '').trim();
          if (!nomeClienteTrim) camposAusentes.push('CLIENTE');
          if (!vigenciaFinal || vigenciaFinal.toString().trim() === '')
            camposAusentes.push('VIGÊNCIA FINAL');

          if (camposAusentes.length > 0) {
            const msg = `Campo(s) obrigatório(s) ausente(s): ${camposAusentes.join(', ')}`;
            results.detalhes.push({
              linha: linhaNum,
              status: 'erro',
              mensagem: msg,
              cliente: nomeCliente || '(sem nome)',
              produto: item || produto || null,
            });
            itensParaSalvar.push({
              linhaNumero: linhaNum,
              status: 'ERRO',
              mensagem: msg,
              nomeCliente: nomeCliente || null,
              documentoCliente: documentoCliente?.toString() || null,
              produto: item || produto || null,
              dadosLinha: row,
            });
            results.erros++;
            continue;
          }

          // --- Documento opcional: se presente e com 11/14 dígitos, usa para match.
          // Se tiver tamanho inválido ou vier vazio, o cliente será criado como stub
          // sem CPF/CNPJ. Documento errado não bloqueia o import.
          const documentoLimpo = documentoCliente
            ? documentoCliente.toString().replace(/[.\-/\s]/g, '')
            : '';
          const docValido =
            documentoLimpo.length === 11 || documentoLimpo.length === 14;

          // --- Converter e validar data de vigência ---
          let dataVencimento: string;
          try {
            dataVencimento = parseVigencia(vigenciaFinal.toString());
          } catch (e: any) {
            const msg = `Vigência final inválida: ${e.message}`;
            results.detalhes.push({
              linha: linhaNum,
              status: 'erro',
              mensagem: msg,
              cliente: nomeCliente || '(sem nome)',
              produto: item || produto || null,
            });
            itensParaSalvar.push({
              linhaNumero: linhaNum,
              status: 'ERRO',
              mensagem: msg,
              nomeCliente: nomeCliente || null,
              documentoCliente: documentoCliente?.toString() || null,
              produto: item || produto || null,
              dadosLinha: row,
            });
            results.erros++;
            continue;
          }

          // Buscar cliente no cache pré-carregado (só tenta match se documento é válido)
          let cliente: { id: string; nome?: string | null; cpf?: string | null; cnpj?: string | null; vendedorId?: string } | null = docValido
            ? clientesPorCpf.get(documentoLimpo) ||
              clientesPorCnpj.get(documentoLimpo) ||
              null
            : null;

          // Sem documento válido: tenta reusar stub existente pelo nome+vendedor
          // para não criar duplicatas em reimports da mesma planilha
          if (!cliente && !docValido) {
            cliente = clientesPorNomeSemDoc.get(`${nomeClienteTrim.toLowerCase()}|${vendedorIdSelecionado}`) || null;
          }

          if (!cliente) {
            // Cliente não encontrado — cria stub inline. O vendedor completa CPF/contato
            // no dialog de iniciar renovação (ou atribui a outro cliente existente).
            const isPJ =
              tipoPessoa?.toString().toUpperCase().includes('JUR') ||
              (docValido && documentoLimpo.length === 14);
            const tipoPessoaFinal: 'PF' | 'PJ' = isPJ ? 'PJ' : 'PF';
            const emails = parseMultipleValues(email);
            const telefones = parseMultipleValues(telefone);
            const stubCpf =
              tipoPessoaFinal === 'PF' && docValido && documentoLimpo.length === 11
                ? documentoLimpo
                : null;
            const stubCnpj =
              tipoPessoaFinal === 'PJ' && docValido && documentoLimpo.length === 14
                ? documentoLimpo
                : null;

            try {
              const [novoCliente] = await db
                .insert(clientesTable)
                .values({
                  corretoraId: request.corretoraId,
                  tipoPessoa: tipoPessoaFinal,
                  nome: tipoPessoaFinal === 'PF' ? nomeClienteTrim : null,
                  razaoSocial: tipoPessoaFinal === 'PJ' ? nomeClienteTrim : null,
                  cpf: stubCpf,
                  cnpj: stubCnpj,
                  email: emails[0] ?? null,
                  telefone: telefones[0] ?? null,
                  vendedorId: vendedorIdSelecionado,
                  ativo: true,
                })
                .returning({
                  id: clientesTable.id,
                  nome: clientesTable.nome,
                  cpf: clientesTable.cpf,
                  cnpj: clientesTable.cnpj,
                  vendedorId: clientesTable.vendedorId,
                });
              cliente = novoCliente;
            } catch (err: any) {
              // Unique constraint race: outro import criou mesmo CPF/CNPJ entre findMany
              // e insert. Re-consulta e reaproveita.
              if (err?.code === '23505' && docValido) {
                const existing = await db.query.clientes.findFirst({
                  where: and(
                    eq(clientesTable.corretoraId, request.corretoraId),
                    tipoPessoaFinal === 'PF'
                      ? eq(clientesTable.cpf, documentoLimpo)
                      : eq(clientesTable.cnpj, documentoLimpo),
                  ),
                });
                if (existing) {
                  cliente = existing as any;
                } else {
                  throw err;
                }
              } else {
                throw err;
              }
            }

            // Atualiza maps para dedup intra-batch
            if (cliente) {
              if (stubCpf) clientesPorCpf.set(stubCpf, cliente as any);
              if (stubCnpj) clientesPorCnpj.set(stubCnpj, cliente as any);
              if (!stubCpf && !stubCnpj) {
                const nomeStub = (cliente.nome || '').toLowerCase().trim();
                if (nomeStub) clientesPorNomeSemDoc.set(`${nomeStub}|${vendedorIdSelecionado}`, cliente as any);
              }
            }
          }

          // Invariante: cliente sempre definido aqui (match existente ou stub recém-criado)
          if (!cliente) {
            throw new Error('Falha inesperada: cliente não resolvido');
          }

          // Normalizar item para comparação de duplicatas
          const itemNormalizado = (item || '').toString().trim().toLowerCase();

          // Verificar duplicata usando os Maps pré-carregados (sem query)
          const duplicataKey = `${cliente.id}|${dataVencimento}|${itemNormalizado}`;
          const produtoIdCheck = findProdutoId((produto || item || '').toString().trim(), todosProdutos) ?? '';
          // Quando produto não é reconhecido (produtoIdCheck=''), usar o nome bruto como discriminador
          // para evitar que dois produtos desconhecidos diferentes colidam na mesma chave clienteId|data|
          const produtoDiscriminator = produtoIdCheck || (item || produto || '').toString().trim().toLowerCase();
          const duplicataDocKey = `${cliente.id}|${dataVencimento}|${produtoDiscriminator}`;
          if (renovacoesExistentesMap.has(duplicataKey) || documentosAtivosMap.has(duplicataDocKey)) {
            // IDs do registro original (null para duplicatas intra-batch, onde o ID ainda não existe)
            const renovacaoOriginalId = renovacoesExistentesMap.get(duplicataKey) || null;
            const docOriginalId = documentosAtivosMap.get(duplicataDocKey) || null;
            const msg = `Duplicata ignorada — já existe registro para "${nomeCliente || documentoCliente}" com vigência ${dataVencimento}${itemNormalizado ? ` / item: ${item}` : ''}`;
            results.detalhes.push({
              linha: linhaNum,
              status: 'pulado',
              mensagem: msg,
              cliente: nomeCliente || '(sem nome)',
              produto: item || produto || null,
            });
            itensParaSalvar.push({
              linhaNumero: linhaNum,
              status: 'PULADO',
              mensagem: msg,
              nomeCliente: nomeCliente || null,
              documentoCliente: documentoCliente?.toString() || null,
              produto: item || produto || null,
              dadosLinha: row,
              renovacaoId: renovacaoOriginalId,
              documentoVendaId: docOriginalId,
            });
            results.pulados++;
            continue;
          }

          // Usar documento de venda do mesmo produto (produtoIdCheck já calculado acima)
          const documentoVenda = documentoVendaMapImport.get(`${cliente.id}|${produtoIdCheck}`) ?? null;

          // Preparar valores de prêmio e comissão
          let premioAnterior: string | null = null;
          let percentualComissaoAnterior: string | null = null;
          let valorComissaoAnterior: string | null = null;

          if (premioLiquido) {
            premioAnterior = parsePremioLiquido(premioLiquido);
          } else if (documentoVenda?.premioLiquido) {
            premioAnterior = documentoVenda.premioLiquido;
          }

          if (comissao) {
            percentualComissaoAnterior = parsePercentualPlanilha(comissao);
          } else if (documentoVenda?.percentualComissao) {
            percentualComissaoAnterior = documentoVenda.percentualComissao;
          }

          if (documentoVenda?.valorComissao) {
            valorComissaoAnterior = documentoVenda.valorComissao;
          }

          // Decidir: vigência > 60 dias → documento ativo; ≤ 60 dias → renovação imediata
          const vencimento = new Date(dataVencimento + 'T00:00:00');
          const precisaRenovacaoAgora = vencimento <= limiteRenovacao;

          if (!precisaRenovacaoAgora) {
            // Tentar criar como documento ativo
            const nomeProduto = (produto || item || '').toString().trim();
            const produtoId = findProdutoId(nomeProduto, todosProdutos);

            if (produtoId) {
              // Calcular vigenciaInicio = vigenciaFim - 1 ano
              const [anoV, mesV, diaV] = dataVencimento.split('-').map(Number);
              const vigenciaInicio = `${anoV - 1}-${String(mesV).padStart(2, '0')}-${String(diaV).padStart(2, '0')}`;
              const numeroDocumento = `${prefixoImp}-${String(nextImpSeq++).padStart(5, '0')}`;

              // Marcar para dedup dentro do batch (chave inclui produtoId)
              documentosAtivosMap.set(`${cliente.id}|${dataVencimento}|${produtoId}`, '');

              insertsDocumentosAtivos.push({
                _linha: linhaNum,
                _nomeCliente: nomeCliente,
                _produto: nomeProduto || 'N/A',
                _documentoCliente: documentoCliente?.toString() || null,
                _dadosLinha: row,
                corretoraId: request.corretoraId,
                clienteId: cliente.id,
                vendedorId: vendedorIdEfetivo,
                vendedorSecundarioId: vendedorSecundarioIdEfetivo,
                produtoId,
                numeroDocumento,
                tipoDocumento: 'VENDA_EXPRESSA' as const,
                status: 'ATIVO' as const,
                vigenciaInicio,
                vigenciaFim: dataVencimento,
                premioLiquido: premioAnterior,
                percentualComissao: percentualComissaoAnterior,
                observacoes: `Importado da planilha - Status original: ${statusPlanilha || 'N/A'}`,
                importacaoId: importacao.id,
              });
              continue;
            }
            // Produto não encontrado e vencimento fora da janela de 60 dias → pulado
            // Não criar renovação com data futura distante; reimportar quando próximo do vencimento
            const msgPulado = `Produto "${(produto || item || '').trim()}" não encontrado e vencimento ${dataVencimento} fora da janela de 60 dias — item ignorado. Cadastre o produto e reimporte quando o vencimento estiver próximo.`;
            results.detalhes.push({
              linha: linhaNum,
              status: 'pulado',
              mensagem: msgPulado,
              cliente: nomeCliente || '(sem nome)',
              produto: item || produto || null,
            });
            itensParaSalvar.push({
              linhaNumero: linhaNum,
              status: 'PULADO',
              mensagem: msgPulado,
              nomeCliente: nomeCliente || null,
              documentoCliente: documentoCliente?.toString() || null,
              produto: item || produto || null,
              dadosLinha: row,
            });
            results.pulados++;
            renovacoesExistentesMap.set(duplicataKey, '');
            continue;
          }

          // Marcar como já agendada para evitar duplicata dentro do mesmo batch
          renovacoesExistentesMap.set(duplicataKey, '');

          // Se não há documento anterior mas o produto foi identificado, criar um documento
          // ATIVO a partir dos dados da planilha para servir de base para a renovação
          let documentoVendaAnteriorIdFinal = documentoVenda?.id ?? null;
          if (!documentoVenda && produtoIdCheck) {
            const anteriorId = crypto.randomUUID();
            const [anoV, mesV, diaV] = dataVencimento.split('-').map(Number);
            const vigenciaInicioAnterior = `${anoV - 1}-${String(mesV).padStart(2, '0')}-${String(diaV).padStart(2, '0')}`;
            const numeroDocumento = `${prefixoImp}-${String(nextImpSeq++).padStart(5, '0')}`;
            documentosAtivosMap.set(`${cliente.id}|${dataVencimento}|${produtoIdCheck}`, anteriorId);
            insertsDocumentosAnteriores.push({
              id: anteriorId,
              corretoraId: request.corretoraId,
              clienteId: cliente.id,
              vendedorId: vendedorIdEfetivo,
              vendedorSecundarioId: vendedorSecundarioIdEfetivo,
              produtoId: produtoIdCheck,
              numeroDocumento,
              tipoDocumento: 'VENDA_EXPRESSA' as const,
              status: 'ATIVO' as const,
              vigenciaInicio: vigenciaInicioAnterior,
              vigenciaFim: dataVencimento,
              premioLiquido: premioAnterior,
              percentualComissao: percentualComissaoAnterior,
              observacoes: `Importado da planilha - Status original: ${statusPlanilha || 'N/A'}`,
              importacaoId: importacao.id,
            });
            documentoVendaAnteriorIdFinal = anteriorId;
          }

          // Coletar para inserção em batch como renovação
          insertsRenovacoesImport.push({
            _linha: linhaNum,
            _temDocumento: !!documentoVendaAnteriorIdFinal,
            _nomeCliente: nomeCliente,
            _produto: item || produto || 'N/A',
            _documentoCliente: documentoCliente?.toString() || null,
            _dadosLinha: row,
            _aviso: null,
            corretoraId: request.corretoraId,
            clienteId: cliente.id,
            documentoVendaAnteriorId: documentoVendaAnteriorIdFinal,
            vendedorId: vendedorIdEfetivo,
            vendedorSecundarioAnteriorId: vendedorSecundarioIdEfetivo,
            premioAnterior,
            percentualComissaoAnterior,
            valorComissaoAnterior,
            dataVencimento,
            status: 'NAO_TRABALHADO',
            itemDescricao: item || null,
            produtoDescricao: produto || item || null,
            seguradoraAnterior: seguradora || null,
            observacoes: `Importado da planilha - Status original: ${statusPlanilha || 'N/A'}`,
            importacaoId: importacao.id,
          });
        } catch (error: any) {
          const msg = `Erro inesperado ao processar linha: ${error.message || 'Erro desconhecido'}`;
          results.erros++;
          results.detalhes.push({
            linha: linhaNum,
            status: 'erro',
            mensagem: msg,
            cliente: row['CLIENTE'] || '(sem nome)',
            produto: row['ITEM'] || null,
          });
          itensParaSalvar.push({
            linhaNumero: linhaNum,
            status: 'ERRO',
            mensagem: msg,
            nomeCliente: row['CLIENTE'] || null,
            documentoCliente: row['DOCUMENTO DO CLIENTE']?.toString() || null,
            produto: row['ITEM'] || null,
            dadosLinha: row,
            erroDetalhes: error.stack || null,
          });
        }
      }

      // Persistir tudo em transação: documentos, renovações, itens e update do registro
      try {
        await db.transaction(async (tx) => {
          // Batch: inserir documentos anteriores criados automaticamente (renovações ≤60 dias sem apólice prévia)
          if (insertsDocumentosAnteriores.length > 0) {
            // Sempre insere um a um — cada documento carrega um número IMP pré-alocado que pode
            // colidir em imports concorrentes; o retry por linha re-lê o MAX e tenta novo número
            for (const ins of insertsDocumentosAnteriores) {
              let insertedAnterior = false;
              for (let attempt = 0; attempt < 10; attempt++) {
                try {
                  await tx.insert(documentosVenda).values(ins);
                  insertedAnterior = true;
                  break;
                } catch (err: any) {
                  if (err?.code === '23505') {
                    const newSeq = (await getMaxImpSeq(tx)) + 1;
                    ins.numeroDocumento = `${prefixoImp}-${String(newSeq).padStart(5, '0')}`;
                    continue;
                  }
                  // Erro não-colisão: zerar o vínculo na renovação correspondente para evitar FK inválida
                  const renovacao = insertsRenovacoesImport.find((r) => r.documentoVendaAnteriorId === ins.id);
                  if (renovacao) {
                    renovacao.documentoVendaAnteriorId = null;
                    renovacao._temDocumento = false;
                    renovacao._aviso = `Documento anterior não pôde ser criado: ${err.message || 'erro desconhecido'}`;
                  }
                  break;
                }
              }
              if (!insertedAnterior) {
                // Esgotou tentativas de colisão — zerar o vínculo para não criar FK inválida
                const renovacao = insertsRenovacoesImport.find((r) => r.documentoVendaAnteriorId === ins.id);
                if (renovacao) {
                  renovacao.documentoVendaAnteriorId = null;
                  renovacao._temDocumento = false;
                  renovacao._aviso = 'Documento anterior não pôde ser criado: número IMP indisponível após 10 tentativas';
                }
              }
            }
          }

          // Batch: inserir documentos ativos (vigência > 60 dias)
          if (insertsDocumentosAtivos.length > 0) {
            const docsLimpos = insertsDocumentosAtivos.map(
              ({ _linha, _nomeCliente, _produto, _documentoCliente, _dadosLinha, ...rest }) => rest,
            );
            try {
              const insertedDocs = await tx.insert(documentosVenda).values(docsLimpos).returning({ id: documentosVenda.id });
              for (let idx = 0; idx < insertsDocumentosAtivos.length; idx++) {
                const ins = insertsDocumentosAtivos[idx];
                results.sucesso++;
                results.detalhes.push({
                  linha: ins._linha,
                  status: 'sucesso',
                  mensagem: 'Documento ativo criado (vigência > 60 dias)',
                  cliente: ins._nomeCliente,
                  produto: ins._produto,
                });
                itensParaSalvar.push({
                  linhaNumero: ins._linha,
                  status: 'SUCESSO',
                  mensagem: 'Documento ativo criado (vigência > 60 dias)',
                  nomeCliente: ins._nomeCliente,
                  documentoCliente: ins._documentoCliente,
                  produto: ins._produto,
                  dadosLinha: ins._dadosLinha,
                  documentoVendaId: insertedDocs[idx]?.id || null,
                });
              }
            } catch {
              // Fallback: inserir um a um; retry em caso de colisão no número IMP (race condition)
              for (const ins of insertsDocumentosAtivos) {
                const { _linha, _nomeCliente, _produto, _documentoCliente, _dadosLinha, ...insertData } = ins;
                let inserted: { id: string } | undefined;
                let insertErr: any;
                for (let attempt = 0; attempt < 10; attempt++) {
                  try {
                    const [res] = await tx.insert(documentosVenda).values(insertData).returning({ id: documentosVenda.id });
                    inserted = res;
                    insertErr = undefined;
                    break;
                  } catch (err: any) {
                    if (err?.code === '23505') {
                      // Colisão no número IMP — re-ler MAX e tentar próximo
                      const newSeq = (await getMaxImpSeq(tx)) + 1;
                      insertData.numeroDocumento = `${prefixoImp}-${String(newSeq).padStart(5, '0')}`;
                      continue;
                    }
                    insertErr = err;
                    break;
                  }
                }
                if (inserted) {
                  results.sucesso++;
                  results.detalhes.push({
                    linha: _linha,
                    status: 'sucesso',
                    mensagem: 'Documento ativo criado (vigência > 60 dias)',
                    cliente: _nomeCliente,
                    produto: _produto,
                  });
                  itensParaSalvar.push({
                    linhaNumero: _linha,
                    status: 'SUCESSO',
                    mensagem: 'Documento ativo criado (vigência > 60 dias)',
                    nomeCliente: _nomeCliente,
                    documentoCliente: _documentoCliente,
                    produto: _produto,
                    dadosLinha: _dadosLinha,
                    documentoVendaId: inserted.id,
                  });
                } else {
                  results.erros++;
                  results.detalhes.push({
                    linha: _linha,
                    status: 'erro',
                    mensagem: insertErr?.message || 'Erro ao criar documento ativo',
                    cliente: _nomeCliente,
                    produto: _produto,
                  });
                  itensParaSalvar.push({
                    linhaNumero: _linha,
                    status: 'ERRO',
                    mensagem: insertErr?.message || 'Erro ao criar documento ativo',
                    nomeCliente: _nomeCliente,
                    documentoCliente: _documentoCliente,
                    produto: _produto,
                    dadosLinha: _dadosLinha,
                    erroDetalhes: insertErr?.stack || null,
                  });
                }
              }
            }
          }

          // Batch: inserir todas as renovações coletadas
          if (insertsRenovacoesImport.length > 0) {
            const insertsLimpos = insertsRenovacoesImport.map(
              ({ _linha, _temDocumento, _nomeCliente, _produto, _documentoCliente, _dadosLinha, _aviso, ...rest }) => rest,
            );
            try {
              const insertedRenovacoes = await tx.insert(renovacoesComerciais).values(insertsLimpos).returning({ id: renovacoesComerciais.id });
              for (let idx = 0; idx < insertsRenovacoesImport.length; idx++) {
                const ins = insertsRenovacoesImport[idx];
                results.sucesso++;
                const msg = ins._aviso
                  ? ins._aviso
                  : ins._temDocumento
                    ? 'Renovação criada (vencimento ≤ 60 dias, vinculada ao documento anterior)'
                    : 'Renovação criada (vencimento ≤ 60 dias)';
                results.detalhes.push({
                  linha: ins._linha,
                  status: 'sucesso',
                  mensagem: msg,
                  cliente: ins._nomeCliente,
                  produto: ins._produto,
                });
                itensParaSalvar.push({
                  linhaNumero: ins._linha,
                  status: 'SUCESSO',
                  mensagem: msg,
                  nomeCliente: ins._nomeCliente,
                  documentoCliente: ins._documentoCliente,
                  produto: ins._produto,
                  dadosLinha: ins._dadosLinha,
                  renovacaoId: insertedRenovacoes[idx]?.id || null,
                });
              }
            } catch {
              // Fallback: inserir uma a uma para identificar qual falhou
              for (const ins of insertsRenovacoesImport) {
                const { _linha, _temDocumento, _nomeCliente, _produto, _documentoCliente, _dadosLinha, _aviso, ...insertData } = ins;
                try {
                  const [inserted] = await tx.insert(renovacoesComerciais).values(insertData).returning({ id: renovacoesComerciais.id });
                  results.sucesso++;
                  const msg = _aviso
                    ? _aviso
                    : _temDocumento
                      ? 'Renovação criada (vencimento ≤ 60 dias, vinculada ao documento anterior)'
                      : 'Renovação criada (vencimento ≤ 60 dias)';
                  results.detalhes.push({
                    linha: _linha,
                    status: 'sucesso',
                    mensagem: msg,
                    cliente: _nomeCliente,
                    produto: _produto,
                  });
                  itensParaSalvar.push({
                    linhaNumero: _linha,
                    status: 'SUCESSO',
                    mensagem: msg,
                    nomeCliente: _nomeCliente,
                    documentoCliente: _documentoCliente,
                    produto: _produto,
                    dadosLinha: _dadosLinha,
                    renovacaoId: inserted?.id || null,
                  });
                } catch (err: any) {
                  results.erros++;
                  const msg = `Falha ao salvar no banco: ${err.message || 'Erro desconhecido'}`;
                  results.detalhes.push({
                    linha: _linha,
                    status: 'erro',
                    mensagem: msg,
                    cliente: _nomeCliente,
                    produto: _produto,
                  });
                  itensParaSalvar.push({
                    linhaNumero: _linha,
                    status: 'ERRO',
                    mensagem: msg,
                    nomeCliente: _nomeCliente,
                    documentoCliente: _documentoCliente,
                    produto: _produto,
                    dadosLinha: _dadosLinha,
                    erroDetalhes: err.stack || null,
                  });
                }
              }
            }
          }

          // Persistir todos os itens na tabela de importação
          if (itensParaSalvar.length > 0) {
            const itensValues = itensParaSalvar.map((item) => ({
              importacaoId: importacao.id,
              linhaNumero: item.linhaNumero,
              status: item.status as any,
              mensagem: item.mensagem,
              nomeCliente: item.nomeCliente,
              documentoCliente: item.documentoCliente,
              produto: item.produto,
              dadosLinha: item.dadosLinha,
              renovacaoId: item.renovacaoId || null,
              documentoVendaId: item.documentoVendaId || null,
              erroDetalhes: item.erroDetalhes || null,
            }));
            await tx.insert(importacaoRenovacaoItens).values(itensValues);
          }

          // Atualizar registro da importação com totais finais
          const statusFinal =
            results.erros > 0 ? 'CONCLUIDO_COM_ERROS' : 'CONCLUIDO';
          await tx
            .update(importacaoRenovacoes)
            .set({
              status: statusFinal as any,
              totalSucesso: results.sucesso,
              totalErros: results.erros,
              totalPulados: results.pulados,
              totalPendentes: results.pendentes,
              concluidoEm: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(importacaoRenovacoes.id, importacao.id));
        });
      } catch (txError: any) {
        // Marcar importação como FALHA para que o usuário saiba que precisa re-importar
        await db
          .update(importacaoRenovacoes)
          .set({ status: 'FALHA', updatedAt: new Date() })
          .where(eq(importacaoRenovacoes.id, importacao.id));
        throw txError;
      }

      return reply.status(200).send({
        success: true,
        data: {
          importacaoId: importacao.id,
          ...results,
        },
      });
    },
  );

  // 11. Solicitar Transferência de Renovações (com confirmação)
  const transferirRenovacoesSchema = z.object({
    renovacaoIds: z
      .array(z.string().uuid())
      .min(1, 'Selecione ao menos uma renovação'),
    novoVendedorId: z.string().uuid('ID do vendedor inválido'),
    observacoes: z.string().optional(),
  });

  fastify.post(
    '/transfer',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Solicitar transferência de renovações',
        description:
          'Cria uma solicitação de transferência de renovações que precisa ser aceita pelo destinatário.',
        ...renovacoesDocs.transferir,
      },
      preHandler: [authorize(['vendas:visualizar_documento_venda'])],
    },
    async (request, reply) => {
      const { renovacaoIds, novoVendedorId, observacoes } =
        transferirRenovacoesSchema.parse(request.body);
      const vendedorAtualId = request.user.sub;

      // Gestores com metricas:acessar (ou admin) podem transferir renovações de
      // qualquer vendedor da corretora — mesmo predicado da listagem (GET /).
      const podeVerTodos =
        request.user.isAdmin ||
        request.user.permissoes?.includes('metricas:acessar');

      // Validação 1: Não pode transferir para si mesmo
      if (novoVendedorId === vendedorAtualId) {
        throw new ValidationError('Não é possível transferir para si mesmo');
      }

      // Validação 2: Novo vendedor existe e pertence à mesma corretora
      const {
        usuarioCorretora,
        transferenciaRenovacoes,
        transferenciaRenovacaoItens,
      } = await import('@ecotech/shared/database');

      const vinculo = await db.query.usuarioCorretora.findFirst({
        where: and(
          eq(usuarioCorretora.usuarioId, novoVendedorId),
          eq(usuarioCorretora.corretoraId, request.corretoraId),
          eq(usuarioCorretora.ativo, true),
        ),
      });

      if (!vinculo) {
        throw new NotFoundError(
          'Vendedor destinatário não encontrado nesta corretora',
        );
      }

      const { usuarios: usuariosTable } = await import(
        '@ecotech/shared/database'
      );
      const novoVendedor = await db.query.usuarios.findFirst({
        where: eq(usuariosTable.id, novoVendedorId),
      });

      if (!novoVendedor) {
        throw new NotFoundError('Vendedor destinatário não encontrado');
      }

      // Validação 3: Buscar renovações a transferir.
      // Vendedor comum: só as próprias. Gestor/admin: qualquer uma da corretora.
      const renovacoes = await db.query.renovacoesComerciais.findMany({
        where: and(
          inArray(renovacoesComerciais.id, renovacaoIds),
          eq(renovacoesComerciais.corretoraId, request.corretoraId),
          ...(podeVerTodos
            ? []
            : [eq(renovacoesComerciais.vendedorId, vendedorAtualId)]),
        ),
        with: {
          cliente: { columns: { nome: true } },
        } as any,
      });

      if (renovacoes.length === 0) {
        throw new NotFoundError('Nenhuma renovação encontrada para transferir');
      }

      if (renovacoes.length !== renovacaoIds.length) {
        throw new ValidationError(
          podeVerTodos
            ? 'Algumas renovações não foram encontradas nesta corretora'
            : 'Algumas renovações não pertencem a você',
        );
      }

      // Não permitir transferência no-op (renovação que já pertence ao destinatário)
      if (renovacoes.some((r) => r.vendedorId === novoVendedorId)) {
        throw new ValidationError(
          'Uma ou mais renovações já pertencem ao vendedor destinatário',
        );
      }

      // Validação 4: Verificar status (não permitir finalizadas)
      const statusBloqueados = ['RENOVADO', 'PERDIDO', 'CANCELADO'];
      const renovacoesFinalizadas = renovacoes.filter((r) =>
        statusBloqueados.includes(r.status),
      );

      if (renovacoesFinalizadas.length > 0) {
        throw new ValidationError(
          `Não é possível transferir renovações finalizadas (${renovacoesFinalizadas.length} encontradas)`,
        );
      }

      // Criar solicitação de transferência
      const transferencia = await db.transaction(async (tx) => {
        const [novaTransferencia] = await tx
          .insert(transferenciaRenovacoes)
          .values({
            corretoraId: request.corretoraId,
            solicitanteId: vendedorAtualId,
            destinatarioId: novoVendedorId,
            status: 'PENDENTE',
            observacoes,
          })
          .returning();

        // Inserir itens da transferência
        await tx.insert(transferenciaRenovacaoItens).values(
          renovacaoIds.map((renovacaoId) => ({
            transferenciaId: novaTransferencia.id,
            renovacaoId,
          })),
        );

        return novaTransferencia;
      });

      return ok({
        message: `Solicitação de transferência criada. Aguardando confirmação de ${novoVendedor.nome}`,
        transferenciaId: transferencia.id,
        renovacoes: renovacoes.length,
      });
    },
  );

  // 12. Listar Transferências Pendentes
  fastify.get(
    '/transfers/pending',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Listar transferências pendentes',
        description: 'Lista todas as solicitações de transferência pendentes',
        ...renovacoesDocs.listarTransferenciasPendentes,
      },
      preHandler: [authorize(['vendas:visualizar_documento_venda'])],
    },
    async (request) => {
      const { transferenciaRenovacoes } = await import(
        '@ecotech/shared/database'
      );

      const { transferenciaRenovacaoItens, clientes } = await import(
        '@ecotech/shared/database'
      );

      const transferenciasBase =
        await db.query.transferenciaRenovacoes.findMany({
          where: and(
            eq(transferenciaRenovacoes.corretoraId, request.corretoraId),
            eq(transferenciaRenovacoes.destinatarioId, request.user.sub),
            eq(transferenciaRenovacoes.status, 'PENDENTE'),
          ),
          with: {
            solicitante: { columns: { id: true, nome: true, email: true } },
            itens: true,
          } as any,
          orderBy: (t: any, { desc }: any) => [desc(t.criadoEm)],
        });

      // Buscar renovações com cliente para todos os itens
      const allRenovacaoIds = (transferenciasBase as any[]).flatMap(
        (t: any) => t.itens?.map((i: any) => i.renovacaoId) || [],
      );

      const renovacoesComCliente =
        allRenovacaoIds.length > 0
          ? await db.query.renovacoesComerciais.findMany({
              where: inArray(renovacoesComerciais.id, allRenovacaoIds),
              with: {
                cliente: {
                  columns: {
                    nome: true,
                    razaoSocial: true,
                    nomeFantasia: true,
                  },
                },
              } as any,
            })
          : [];

      const renovacoesMap = new Map(
        (renovacoesComCliente as any[]).map((r: any) => [r.id, r]),
      );

      // Montar resposta com dados completos
      const transferencias = (transferenciasBase as any[]).map((t: any) => ({
        ...t,
        itens: (t.itens || []).map((item: any) => ({
          ...item,
          renovacao: renovacoesMap.get(item.renovacaoId) || null,
        })),
      }));

      return ok(transferencias as any);
    },
  );

  // 13. Aceitar Transferência
  fastify.post(
    '/transfers/:id/accept',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Aceitar transferência de renovações',
        description:
          'Aceita uma solicitação de transferência e efetiva a mudança de vendedor',
        ...renovacoesDocs.aceitarTransferencia,
      },
      preHandler: [authorize(['vendas:visualizar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const {
        transferenciaRenovacoes,
        transferenciaRenovacaoItens,
        usuarios: usuariosTable,
      } = await import('@ecotech/shared/database');

      const transferencia = await db.query.transferenciaRenovacoes.findFirst({
        where: and(
          eq(transferenciaRenovacoes.id, id),
          eq(transferenciaRenovacoes.corretoraId, request.corretoraId),
          eq(transferenciaRenovacoes.destinatarioId, request.user.sub),
        ),
        with: {
          solicitante: { columns: { id: true, nome: true } },
          itens: true,
        } as any,
      });

      if (!transferencia) {
        throw new NotFoundError('Transferência não encontrada');
      }

      if (transferencia.status !== 'PENDENTE') {
        throw new ValidationError(
          `Transferência já foi ${transferencia.status.toLowerCase()}`,
        );
      }

      const renovacaoIds = (transferencia as any).itens.map(
        (item: any) => item.renovacaoId,
      );

      // Buscar o dono atual de cada renovação ANTES de atualizar — esse é o
      // dono original verdadeiro. Pode diferir do solicitante quando a
      // transferência foi iniciada por um gestor em nome de outro vendedor.
      const renovacoesAtuais = await db.query.renovacoesComerciais.findMany({
        where: and(
          inArray(renovacoesComerciais.id, renovacaoIds),
          eq(renovacoesComerciais.corretoraId, request.corretoraId),
        ),
        columns: { id: true, vendedorId: true },
      });

      // Agrupar renovações por dono original
      const idsPorDonoOriginal = new Map<string, string[]>();
      for (const r of renovacoesAtuais) {
        const arr = idsPorDonoOriginal.get(r.vendedorId) ?? [];
        arr.push(r.id);
        idsPorDonoOriginal.set(r.vendedorId, arr);
      }

      // Efetivar transferência
      await db.transaction(async (tx) => {
        // Atualizar status da transferência
        await tx
          .update(transferenciaRenovacoes)
          .set({
            status: 'ACEITA',
            respondidoEm: new Date(),
            respondidoPorId: request.user.sub,
            updatedAt: new Date(),
          })
          .where(eq(transferenciaRenovacoes.id, id));

        for (const [donoOriginalId, ids] of idsPorDonoOriginal) {
          // Transferir renovações deste dono original
          await tx
            .update(renovacoesComerciais)
            .set({
              vendedorId: request.user.sub,
              vendedorOriginalId: donoOriginalId,
              transferidaPorId: transferencia.solicitanteId,
              transferidaEm: new Date(),
              updatedAt: new Date(),
            })
            .where(inArray(renovacoesComerciais.id, ids));

          // Sincronizar cotações EM_ELABORACAO do dono original vinculadas a
          // estas renovações. Cotações de outro vendedor (split comercial) são
          // preservadas. atuanteId NUNCA é sobrescrito: quem opera continua operando.
          await tx
            .update(cotacoes)
            .set({
              vendedorId: request.user.sub,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(cotacoes.corretoraId, request.corretoraId),
                eq(cotacoes.status, 'EM_ELABORACAO'),
                eq(cotacoes.vendedorId, donoOriginalId),
                sql`${cotacoes.detalhesRisco}->>'renovacaoId' IN (${sql.join(ids.map((rid: string) => sql`${rid}`), sql`, `)})`,
              ),
            );
        }
      });

      return ok({
        message: `${renovacaoIds.length} renovação(ões) transferida(s) com sucesso`,
      });
    },
  );

  // 14. Recusar Transferência
  fastify.post(
    '/transfers/:id/reject',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Recusar transferência de renovações',
        description: 'Recusa uma solicitação de transferência',
        ...renovacoesDocs.recusarTransferencia,
      },
      preHandler: [authorize(['vendas:visualizar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = z.object({ motivo: z.string().max(500).optional() }).parse(request.body ?? {});
      const { transferenciaRenovacoes } = await import(
        '@ecotech/shared/database'
      );

      const transferencia = await db.query.transferenciaRenovacoes.findFirst({
        where: and(
          eq(transferenciaRenovacoes.id, id),
          eq(transferenciaRenovacoes.corretoraId, request.corretoraId),
          eq(transferenciaRenovacoes.destinatarioId, request.user.sub),
        ),
        with: {
          solicitante: { columns: { id: true, nome: true } },
          itens: true,
        } as any,
      });

      if (!transferencia) {
        throw new NotFoundError('Transferência não encontrada');
      }

      if (transferencia.status !== 'PENDENTE') {
        throw new ValidationError(
          `Transferência já foi ${transferencia.status.toLowerCase()}`,
        );
      }

      const itens = (transferencia as any).itens as any[];

      await db
        .update(transferenciaRenovacoes)
        .set({
          status: 'RECUSADA',
          motivoRecusa: body.motivo,
          respondidoEm: new Date(),
          respondidoPorId: request.user.sub,
          updatedAt: new Date(),
        })
        .where(eq(transferenciaRenovacoes.id, id));

      return ok({
        message: 'Transferência recusada',
      });
    },
  );

  // =====================================================
  // SOLICITAÇÕES DE EXCLUSÃO DE RENOVAÇÃO
  // =====================================================

  const solicitarExclusaoSchema = z.object({
    motivo: z.string().min(1, 'Informe o motivo da exclusão').max(500),
  });

  const recusarExclusaoSchema = z.object({
    motivoRecusa: z.string().min(1, 'Informe o motivo da recusa').max(500),
  });

  // Solicitar exclusão de renovação
  fastify.post(
    '/:id/request-deletion',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Solicitar exclusão de renovação',
        description:
          'Solicita a exclusão de uma renovação. Um administrador com permissão aceitar_exclusao:renovacao deve aprovar.',
        ...renovacoesDocs.solicitarExclusao,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request, reply) => {
      const { solicitacoesExclusaoRenovacao } = await import(
        '@ecotech/shared/database'
      );

      const { id } = uuidParamSchema.parse(request.params);
      const { motivo } = solicitarExclusaoSchema.parse(request.body);

      const renovacao = await db.query.renovacoesComerciais.findFirst({
        where: and(
          eq(renovacoesComerciais.id, id),
          eq(renovacoesComerciais.corretoraId, request.corretoraId),
        ),
      });

      if (!renovacao) throw new NotFoundError('Renovação não encontrada');

      if (renovacao.status === 'RENOVADO' || renovacao.status === 'CANCELADO') {
        throw new UnprocessableEntityError(
          'Não é possível solicitar exclusão de renovações finalizadas',
        );
      }

      // Verificar se já existe solicitação pendente
      const solicitacaoExistente =
        await db.query.solicitacoesExclusaoRenovacao.findFirst({
          where: and(
            eq(solicitacoesExclusaoRenovacao.renovacaoId, id),
            eq(solicitacoesExclusaoRenovacao.status, 'PENDENTE'),
          ),
        });

      if (solicitacaoExistente) {
        throw new UnprocessableEntityError(
          'Já existe uma solicitação de exclusão pendente para esta renovação',
        );
      }

      const [solicitacao] = await db
        .insert(solicitacoesExclusaoRenovacao)
        .values({
          corretoraId: request.corretoraId,
          renovacaoId: id,
          solicitanteId: request.user.sub,
          motivo,
          status: 'PENDENTE',
        })
        .returning();

      return reply.status(201).send({ success: true, data: solicitacao as any });
    },
  );

  // Listar solicitações de exclusão pendentes (para admins)
  fastify.get(
    '/deletion-requests/pending',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Listar solicitações de exclusão pendentes',
        description:
          'Lista todas as solicitações de exclusão aguardando aprovação. Requer permissão aceitar_exclusao:renovacao.',
        ...renovacoesDocs.listarExclusoesPendentes,
      },
      preHandler: [authorize(['aceitar_exclusao:renovacao'])],
    },
    async (request, reply) => {
      const { solicitacoesExclusaoRenovacao } = await import(
        '@ecotech/shared/database'
      );

      const solicitacoes =
        await db.query.solicitacoesExclusaoRenovacao.findMany({
          where: and(
            eq(
              solicitacoesExclusaoRenovacao.corretoraId,
              request.corretoraId,
            ),
            eq(solicitacoesExclusaoRenovacao.status, 'PENDENTE'),
          ),
          with: {
            renovacao: {
              with: {
                cliente: {
                  columns: { id: true, nome: true },
                },
              },
            },
            solicitante: {
              columns: { id: true, nome: true, email: true },
            },
          },
          orderBy: (t, { asc }) => asc(t.criadoEm),
        });

      return reply.send({ success: true, data: solicitacoes as any });
    },
  );

  // Listar histórico completo de solicitações de exclusão (para admins)
  fastify.get(
    '/deletion-requests',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Histórico de solicitações de exclusão',
        description:
          'Lista todas as solicitações de exclusão (PENDENTE, ACEITA, RECUSADA). Requer permissão aceitar_exclusao:renovacao.',
        ...renovacoesDocs.historicoExclusoes,
      },
      preHandler: [authorize(['aceitar_exclusao:renovacao'])],
    },
    async (request, reply) => {
      const { solicitacoesExclusaoRenovacao } = await import(
        '@ecotech/shared/database'
      );

      const solicitacoes =
        await db.query.solicitacoesExclusaoRenovacao.findMany({
          where: eq(
            solicitacoesExclusaoRenovacao.corretoraId,
            request.corretoraId,
          ),
          with: {
            renovacao: {
              with: {
                cliente: {
                  columns: { id: true, nome: true },
                },
              },
            },
            solicitante: {
              columns: { id: true, nome: true, email: true },
            },
            respondidoPor: {
              columns: { id: true, nome: true, email: true },
            },
          },
          orderBy: (t, { desc }) => desc(t.criadoEm),
          limit: 100,
        });

      return reply.send({ success: true, data: solicitacoes as any });
    },
  );

  // Aceitar exclusão de renovação
  fastify.post(
    '/deletion-requests/:id/accept',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Aceitar solicitação de exclusão de renovação',
        description:
          'Aceita a exclusão de uma renovação. Requer permissão aceitar_exclusao:renovacao.',
        ...renovacoesDocs.aceitarExclusao,
      },
      preHandler: [authorize(['aceitar_exclusao:renovacao'])],
    },
    async (request, reply) => {
      const { solicitacoesExclusaoRenovacao } = await import(
        '@ecotech/shared/database'
      );

      const { id } = uuidParamSchema.parse(request.params);

      const solicitacao =
        await db.query.solicitacoesExclusaoRenovacao.findFirst({
          where: and(
            eq(solicitacoesExclusaoRenovacao.id, id),
            eq(
              solicitacoesExclusaoRenovacao.corretoraId,
              request.corretoraId,
            ),
          ),
        });

      if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');

      if (solicitacao.status !== 'PENDENTE') {
        throw new UnprocessableEntityError(
          'Esta solicitação já foi respondida',
        );
      }

      const renovacaoAntes = await db.query.renovacoesComerciais.findFirst({
        where: eq(renovacoesComerciais.id, solicitacao.renovacaoId),
        columns: { status: true },
      });

      // Atualizar status da solicitação
      await db
        .update(solicitacoesExclusaoRenovacao)
        .set({
          status: 'ACEITA',
          respondidoPorId: request.user.sub,
          respondidoEm: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(solicitacoesExclusaoRenovacao.id, id));

      // Excluir a renovação (soft-delete via status CANCELADO)
      await db
        .update(renovacoesComerciais)
        .set({
          status: 'CANCELADO',
          statusAntesCancelamento: renovacaoAntes?.status,
          dataCancelamento: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(renovacoesComerciais.id, solicitacao.renovacaoId));

      const { auditLogs, usuarios } = await import('@ecotech/shared/database');
      const admin = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { nome: true, email: true },
      });
      await db.insert(auditLogs).values({
        corretoraId: request.corretoraId,
        usuarioId: request.user.sub,
        usuarioNome: admin?.nome ?? null,
        usuarioEmail: admin?.email ?? null,
        acao: 'EXCLUSAO_RENOVACAO_ACEITA',
        entidade: 'renovacao',
        entidadeId: solicitacao.renovacaoId,
        dadosAnteriores: {
          status: renovacaoAntes?.status,
          solicitanteId: solicitacao.solicitanteId,
          motivo: solicitacao.motivo,
        },
        dadosNovos: { status: 'CANCELADO', solicitacaoId: id },
        ipAddress: request.ip ?? null,
      });

      return reply.send({ success: true, data: { message: 'Renovação excluída com sucesso' } });
    },
  );

  // Recusar exclusão de renovação
  fastify.post(
    '/deletion-requests/:id/reject',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Recusar solicitação de exclusão de renovação',
        description:
          'Recusa a exclusão de uma renovação. Requer permissão aceitar_exclusao:renovacao.',
        ...renovacoesDocs.recusarExclusao,
      },
      preHandler: [authorize(['aceitar_exclusao:renovacao'])],
    },
    async (request, reply) => {
      const { solicitacoesExclusaoRenovacao } = await import(
        '@ecotech/shared/database'
      );

      const { id } = uuidParamSchema.parse(request.params);
      const { motivoRecusa } = recusarExclusaoSchema.parse(request.body);

      const solicitacao =
        await db.query.solicitacoesExclusaoRenovacao.findFirst({
          where: and(
            eq(solicitacoesExclusaoRenovacao.id, id),
            eq(
              solicitacoesExclusaoRenovacao.corretoraId,
              request.corretoraId,
            ),
          ),
        });

      if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');

      if (solicitacao.status !== 'PENDENTE') {
        throw new UnprocessableEntityError(
          'Esta solicitação já foi respondida',
        );
      }

      await db
        .update(solicitacoesExclusaoRenovacao)
        .set({
          status: 'RECUSADA',
          motivoRecusa,
          respondidoPorId: request.user.sub,
          respondidoEm: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(solicitacoesExclusaoRenovacao.id, id));

      const { auditLogs, usuarios } = await import('@ecotech/shared/database');
      const admin = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { nome: true, email: true },
      });
      await db.insert(auditLogs).values({
        corretoraId: request.corretoraId,
        usuarioId: request.user.sub,
        usuarioNome: admin?.nome ?? null,
        usuarioEmail: admin?.email ?? null,
        acao: 'EXCLUSAO_RENOVACAO_RECUSADA',
        entidade: 'renovacao',
        entidadeId: solicitacao.renovacaoId,
        dadosAnteriores: {
          solicitanteId: solicitacao.solicitanteId,
          motivo: solicitacao.motivo,
        },
        dadosNovos: { motivoRecusa },
        ipAddress: request.ip ?? null,
      });

      return reply.send({ success: true, data: { message: 'Solicitação de exclusão recusada' } });
    },
  );

  // Archive renovation (soft delete visível na planilha)
  fastify.patch(
    '/:id/archive',
    {
      schema: { tags: ['Renovações'], summary: 'Arquivar renovação (soft delete)' },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const renovacao = await db.query.renovacoesComerciais.findFirst({
        where: and(eq(renovacoesComerciais.id, id), eq(renovacoesComerciais.corretoraId, request.corretoraId)),
      });

      if (!renovacao) throw new NotFoundError('Renovação');
      if (renovacao.status === 'RENOVADO')
        throw new UnprocessableEntityError('Renovações concluídas não podem ser arquivadas');

      await db.update(renovacoesComerciais).set({
        status: 'CANCELADO',
        statusAntesCancelamento: renovacao.status as any,
        dataCancelamento: new Date(),
        motivoCancelamento: `__EXCLUIDO__|${request.user.sub}|${request.user.nome}`,
        updatedAt: new Date(),
      }).where(eq(renovacoesComerciais.id, id));

      invalidateMetricasCache(request.corretoraId).catch(() => {});
      return ok({ message: 'Renovação arquivada com sucesso' } as any);
    },
  );

  // Restore archived renovation
  fastify.post(
    '/:id/restore',
    {
      schema: { tags: ['Renovações'], summary: 'Restaurar renovação arquivada' },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const renovacao = await db.query.renovacoesComerciais.findFirst({
        where: and(eq(renovacoesComerciais.id, id), eq(renovacoesComerciais.corretoraId, request.corretoraId)),
      });

      if (!renovacao) throw new NotFoundError('Renovação');
      if (!renovacao.motivoCancelamento?.startsWith('__EXCLUIDO__|'))
        throw new UnprocessableEntityError('Esta renovação não está arquivada');

      const statusAnterior = renovacao.statusAntesCancelamento ?? 'NAO_TRABALHADO';

      await db.update(renovacoesComerciais).set({
        status: statusAnterior,
        statusAntesCancelamento: null,
        dataCancelamento: null,
        motivoCancelamento: null,
        updatedAt: new Date(),
      }).where(eq(renovacoesComerciais.id, id));

      invalidateMetricasCache(request.corretoraId).catch(() => {});
      return ok({ message: 'Renovação restaurada com sucesso' } as any);
    },
  );

  // --- COMENTÁRIOS ---

  // Listar comentários de uma renovação (threaded)
  fastify.get(
    '/:id/comments',
    {
      schema: { tags: ['Renovações'], summary: 'Listar comentários de uma renovação', ...renovacoesDocs.listarComentarios },
      preHandler: [authorize(['vendas:visualizar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { comentarios: comentariosTable, usuarios } = await import('@ecotech/shared/database');

      const renovacao = await db.query.renovacoesComerciais.findFirst({
        where: and(eq(renovacoesComerciais.id, id), eq(renovacoesComerciais.corretoraId, request.corretoraId)),
      });
      if (!renovacao) throw new NotFoundError('Renovação não encontrada');

      const rows = await db
        .select({
          id: comentariosTable.id,
          parentId: comentariosTable.parentId,
          texto: comentariosTable.texto,
          createdAt: comentariosTable.createdAt,
          autor: { id: usuarios.id, nome: usuarios.nome, avatarR2Key: usuarios.avatarR2Key },
        })
        .from(comentariosTable)
        .innerJoin(usuarios, eq(comentariosTable.autorId, usuarios.id))
        .where(and(eq(comentariosTable.entidadeId, id), eq(comentariosTable.entidadeTipo, 'renovacao'), eq(comentariosTable.corretoraId, request.corretoraId)))
        .orderBy(comentariosTable.createdAt);

      // P2-B: deduplica por autor — se o mesmo usuário aparece em N comentários,
      // busca o avatar uma única vez em vez de N round-trips ao Redis
      const uniqueKeys = [
        ...new Set(rows.map((r) => r.autor.avatarR2Key).filter((k): k is string => !!k)),
      ];
      const avatarByKey = new Map(
        await Promise.all(uniqueKeys.map(async (k) => [k, await getAvatarUrl(k)] as const)),
      );
      const withAvatars = rows.map((c) => ({
        ...c,
        autor: {
          id: c.autor.id,
          nome: c.autor.nome,
          avatarUrl: avatarByKey.get(c.autor.avatarR2Key ?? '') ?? null,
        },
      }));

      const map = new Map(withAvatars.map((c) => [c.id, { ...c, replies: [] as typeof withAvatars }]));
      const tree: typeof withAvatars = [];
      for (const c of map.values()) {
        if (c.parentId && map.has(c.parentId)) {
          map.get(c.parentId)!.replies.push(c);
        } else {
          tree.push(c as any);
        }
      }

      return ok(tree as any);
    },
  );

  // Adicionar comentário (ou resposta) a uma renovação
  fastify.post(
    '/:id/comments',
    {
      schema: {
        tags: ['Renovações'],
        summary: 'Adicionar comentário a uma renovação',
        ...renovacoesDocs.adicionarComentario,
      },
      preHandler: [authorize(['vendas:visualizar_documento_venda'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { texto, parentId } = request.body as { texto: string; parentId?: string | null };
      const { comentarios: comentariosTable, usuarios } = await import('@ecotech/shared/database');

      const renovacao = await db.query.renovacoesComerciais.findFirst({
        where: and(eq(renovacoesComerciais.id, id), eq(renovacoesComerciais.corretoraId, request.corretoraId)),
      });
      if (!renovacao) throw new NotFoundError('Renovação não encontrada');

      const [inserted] = await db
        .insert(comentariosTable)
        .values({ corretoraId: request.corretoraId, entidadeTipo: 'renovacao', entidadeId: id, autorId: request.user.sub, parentId: parentId ?? null, texto: texto.trim() })
        .returning();

      const autor = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { id: true, nome: true, avatarR2Key: true },
      });

      return reply.status(201).send({
        success: true,
        data: { ...inserted, replies: [], autor: { id: autor?.id, nome: autor?.nome, avatarUrl: await getAvatarUrl(autor?.avatarR2Key) } },
      });
    },
  );
};

export default renovacoesRoutes;
