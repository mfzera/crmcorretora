import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, isNull, sql, inArray, lte, gte, or, notInArray, desc, ilike } from 'drizzle-orm';
import {
  authorize,
  authorizeAny,
  requireOwnership,
  requireStatus,
} from '@ecotech/plugins/authorization';
import {
  createDocumentoVendaSchema,
  updateDocumentoVendaSchema,
  listDocumentosVendaQuerySchema,
  registrarApoliceSchema,
  rejeitarCadastroSchema,
  cancelarVendaSchema,
  registrarPerdaSchema,
  adicionarAnotacaoSchema,
  solicitarExclusaoVendaSchema,
  recusarExclusaoVendaSchema,
  registrarApoliceAvulsaSchema,
  solicitarTrocaVendedorSchema,
  recusarTrocaVendedorSchema,
} from '@ecotech/features/documentos-venda';
import { uuidParamSchema } from '../shared/schemas.js';
import { documentosVendaDocs } from '../../docs/documentos-venda/schemas.js';
import { ok } from '../../docs/index.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  OwnershipError,
} from '@ecotech/shared/utils';
import {
  getPaginationParams,
  createPaginatedResult,
  generateNumeroDocumentoVenda,
} from '@ecotech/shared/utils';
import { calculateCommissions } from '../../utils/comissao-automation.js';
import { cancelDocumentEntries } from '../../utils/comissao-lancamentos.js';
import { withCache, invalidateDocumentosVendaCache, getAvatarUrl } from '../../utils/cache.js';
import { sanitizeUser } from '../../utils/sanitize-user.js';
import { resolveVendedorPrincipal } from '../../utils/resolve-vendedor.js';
import { rankingSSE } from '../../services/ranking-sse.js';
import documentosVendaAnexosRoutes from './anexos.js';

const documentosVendaRoutes: FastifyPluginAsyncZod = async function (fastify) {
  // Registrar sub-rotas de anexos
  await fastify.register(documentosVendaAnexosRoutes);

  const {
    db,
    documentosVenda,
    historicoDocumentoVenda,
    clientes,
    produtos,
    renovacoesComerciais,
    propostasComerciais,
    cotacoes,
    usuarios,
    sinistros,
    comentarios,
  } = await import('@ecotech/shared/database');

  fastify.addHook('preHandler', fastify.authenticate);

  // Invalida o cache de listagem após qualquer operação de escrita.
  // onResponse dispara APÓS a resposta ser enviada — não adiciona latência ao cliente.
  fastify.addHook('onResponse', async (request) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      await invalidateDocumentosVendaCache(request.corretoraId);
    }
  });

  // Helper to add history entry
  async function addHistorico(
    documentoVendaId: string,
    tipoEvento:
      | 'CRIACAO'
      | 'ALTERACAO_STATUS'
      | 'ALTERACAO_DADOS'
      | 'SOLICITACAO_CADASTRO'
      | 'APROVACAO_CADASTRO'
      | 'REJEICAO_CADASTRO'
      | 'CONFIRMACAO_VENDA'
      | 'CANCELAMENTO'
      | 'PERDA'
      | 'CONFIRMACAO_PERDA'
      | 'REJEICAO_PERDA'
      | 'ENDOSSO_CRIADO'
      | 'ANOTACAO'
      | 'SOLICITACAO_EXCLUSAO'
      | 'EXCLUSAO_ACEITA'
      | 'EXCLUSAO_RECUSADA'
      | 'SOLICITACAO_TROCA_VENDEDOR'
      | 'TROCA_VENDEDOR_APROVADA'
      | 'TROCA_VENDEDOR_RECUSADA',
    descricao: string,
    usuarioId: string,
    usuarioNome: string,
    statusAnterior?: string,
    statusNovo?: string,
    dadosAlterados?: Record<string, unknown>,
  ) {
    await db.insert(historicoDocumentoVenda).values({
      documentoVendaId,
      tipoEvento,
      usuarioId,
      usuarioNome,
      statusAnterior:
        statusAnterior as typeof historicoDocumentoVenda.$inferInsert.statusAnterior,
      statusNovo:
        statusNovo as typeof historicoDocumentoVenda.$inferInsert.statusNovo,
      descricao,
      dadosAlterados,
    });
  }

  // Create sale document
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Criar novo documento de venda',
        description:
          'Cria um novo documento de venda vinculado a um cliente e produto. Requer permissão de criação de documentos.',
        ...documentosVendaDocs.criar,
      },
      preHandler: [authorize(['vendas:criar_documento_venda'])],
    },
    async (request, reply) => {
      const data = createDocumentoVendaSchema.parse(request.body);

      // Validate client and product in parallel
      const [cliente, produto] = await Promise.all([
        db.query.clientes.findFirst({
          where: and(
            eq(clientes.id, data.clienteId),
            eq(clientes.corretoraId, request.corretoraId),
            isNull(clientes.deletedAt),
          ),
        }),
        db.query.produtos.findFirst({
          where: and(
            eq(produtos.id, data.produtoId),
            eq(produtos.corretoraId, request.corretoraId),
            eq(produtos.ativo, true),
            isNull(produtos.deletedAt),
          ),
        }),
      ]);

      if (!cliente) {
        throw new NotFoundError('Cliente');
      }

      if (!produto) {
        throw new NotFoundError('Produto');
      }

      // Validate quota
      await fastify.validateQuota(request.corretoraId, 'venda');

      // Generate document number
      const now = new Date();
      const prefixMap: Record<string, string> = {
        COTACAO_DIRETA: 'VD-COT',
        PROPOSTA_FORMAL: 'VD-PROP',
        VENDA_EXPRESSA: 'VD-EXP',
        COTACAO_PERDIDA: 'VD-PERD',
      };
      const prefix = prefixMap[data.tipoDocumento];
      const anoMes = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const maxResult = await db
        .select({ max: sql<string>`MAX(numero_documento)` })
        .from(documentosVenda)
        .where(
          and(
            eq(documentosVenda.corretoraId, request.corretoraId),
            sql`numero_documento LIKE ${`${prefix}-${anoMes}-%`}`,
          ),
        );
      const lastNum = maxResult[0]?.max
        ? parseInt(maxResult[0].max.split('-').pop() ?? '0', 10)
        : 0;
      const sequencial = lastNum + 1;
      const numeroDocumento = generateNumeroDocumentoVenda(
        data.tipoDocumento,
        sequencial,
      );

      // Calculate commission
      const premioLiquido = data.premioLiquido ?? 0;
      const percentualComissao =
        data.percentualComissao ??
        (produto.percentualComissaoPadrao
          ? parseFloat(produto.percentualComissaoPadrao)
          : 0);
      const valorComissao = (premioLiquido * percentualComissao) / 100;

      const { vendedorId: vendedorPrincipalId, atuanteId } = resolveVendedorPrincipal(
        data.vendedorId,
        cliente.vendedorId,
        request.user.sub,
      );

      const [documento] = await db
        .insert(documentosVenda)
        .values({
          corretoraId: request.corretoraId,
          clienteId: data.clienteId,
          vendedorId: vendedorPrincipalId,
          atuanteId,
          produtoId: data.produtoId,
          numeroDocumento,
          tipoDocumento: data.tipoDocumento,
          status: 'EM_NEGOCIACAO',
          numeroPropostaExterna: data.numeroPropostaExterna,
          numeroApoliceExterna: data.numeroApoliceExterna,
          numeroSistemaLegado: data.numeroSistemaLegado,
          vigenciaInicio: data.vigenciaInicio,
          vigenciaFim: data.vigenciaFim,
          moeda: data.moeda,
          premioLiquido: premioLiquido.toString(),
          percentualComissao: percentualComissao.toString(),
          valorComissao: valorComissao.toString(),
          coberturas: data.coberturas,
          franquia: data.franquia?.toString(),
          valorSegurado: data.valorSegurado?.toString(),
          observacoes: data.observacoes,
          metadata: data.metadata,
          // Negócio Corretora
          negocioCorretora: data.negocioCorretora ?? false,
          percentualCorretora: data.percentualCorretora?.toString(),
          valorComissaoCorretora: data.valorComissaoCorretora?.toString(),
        })
        .returning();


      // Add history entry
      await addHistorico(
        documento.id,
        'CRIACAO',
        'Documento de venda criado',
        request.user.sub,
        request.user.nome,
        undefined,
        'EM_NEGOCIACAO',
        { vendedorId: request.user.sub, vendedorNome: request.user.nome },
      );

      // Increment quota
      await fastify.incrementQuota(request.corretoraId, 'venda');

      rankingSSE.emit(request.corretoraId, 'ranking-updated');

      return reply.status(201).send({
        success: true,
        data: documento,
      });
    },
  );

  // Registrar apólice avulsa diretamente como ATIVO
  fastify.post(
    '/register-standalone-policy',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Registrar apólice avulsa como ativa',
        description:
          'Cria um documento de venda diretamente com status ATIVO. Usado para registrar apólices já existentes na seguradora que ainda não estão no sistema.',
        ...documentosVendaDocs.registrarApoliceAvulsa,
      },
      preHandler: [authorize(['vendas:criar_documento_venda'])],
    },
    async (request, reply) => {
      const data = registrarApoliceAvulsaSchema.parse(request.body);

      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, data.clienteId),
          eq(clientes.corretoraId, request.corretoraId),
          isNull(clientes.deletedAt),
        ),
      });
      if (!cliente) throw new NotFoundError('Cliente');

      const produto = await db.query.produtos.findFirst({
        where: and(
          eq(produtos.id, data.produtoId),
          eq(produtos.corretoraId, request.corretoraId),
          eq(produtos.ativo, true),
          isNull(produtos.deletedAt),
        ),
      });
      if (!produto) throw new NotFoundError('Produto');

      await fastify.validateQuota(request.corretoraId, 'venda');

      const now = new Date();
      const prefix = 'VD-APO';
      const anoMes = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const maxResult = await db
        .select({ max: sql<string>`MAX(numero_documento)` })
        .from(documentosVenda)
        .where(
          and(
            eq(documentosVenda.corretoraId, request.corretoraId),
            sql`numero_documento LIKE ${`${prefix}-${anoMes}-%`}`,
          ),
        );
      const lastNum = maxResult[0]?.max
        ? parseInt(maxResult[0].max.split('-').pop() ?? '0', 10)
        : 0;
      const numeroDocumento = `${prefix}-${anoMes}-${String(lastNum + 1).padStart(3, '0')}`;

      const premioLiquido = data.premioLiquido ?? 0;
      const percentualComissao =
        data.percentualComissao ??
        (produto.percentualComissaoPadrao
          ? parseFloat(produto.percentualComissaoPadrao)
          : 0);
      const valorComissao = (premioLiquido * percentualComissao) / 100;

      const { vendedorId: vendedorPrincipalId, atuanteId } = resolveVendedorPrincipal(
        undefined,
        cliente.vendedorId,
        request.user.sub,
      );

      const [documento] = await db
        .insert(documentosVenda)
        .values({
          corretoraId: request.corretoraId,
          clienteId: data.clienteId,
          vendedorId: vendedorPrincipalId,
          atuanteId,
          produtoId: data.produtoId,
          seguradoraParceiraId: data.seguradoraParceiraId,
          numeroDocumento,
          tipoDocumento: 'VENDA_EXPRESSA',
          status: 'ATIVO',
          numeroApoliceExterna: data.numeroApoliceExterna,
          vigenciaInicio: data.vigenciaInicio,
          vigenciaFim: data.vigenciaFim,
          premioLiquido: premioLiquido.toString(),
          percentualComissao: percentualComissao.toString(),
          valorComissao: valorComissao.toString(),
          valorSegurado: data.valorSegurado?.toString(),
          franquia: data.franquia?.toString(),
          itemDescricao: data.itemDescricao,
          observacoes: data.observacoes,
        })
        .returning();

      await addHistorico(
        documento.id,
        'CRIACAO',
        `Apólice ${data.numeroApoliceExterna} registrada diretamente como ativa`,
        request.user.sub,
        request.user.nome,
        undefined,
        'ATIVO',
      );

      await fastify.incrementQuota(request.corretoraId, 'venda');

      return reply.status(201).send({ success: true, data: documento });
    },
  );

  // Cadastro logs — recent APROVACAO/REJEICAO events across all documents
  fastify.get(
    '/registration-logs',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Logs de cadastro',
        description: 'Retorna os eventos recentes de aprovação e rejeição de cadastro.',
        ...documentosVendaDocs.cadastroLogs,
      },
      preHandler: [authorizeAny(['cadastro:acessar', 'cadastro:aprovar_venda', 'cadastro:rejeitar_venda', 'vendas:visualizar_todos_documentos'])],
    },
    async (request) => {
      const { page = 1, limit = 20, search } = request.query as { page?: number; limit?: number; search?: string };
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(Math.max(1, Number(limit)), 100);
      const offset = (pageNum - 1) * limitNum;
      const searchTerm = search?.trim() ? `%${search.trim()}%` : null;

      const whereCondition = and(
        eq(documentosVenda.corretoraId, request.corretoraId),
        inArray(historicoDocumentoVenda.tipoEvento, ['APROVACAO_CADASTRO', 'REJEICAO_CADASTRO'] as any),
        isNull(documentosVenda.deletedAt),
        searchTerm
          ? or(
              ilike(clientes.nome, searchTerm),
              ilike(clientes.razaoSocial, searchTerm),
              ilike(clientes.nomeFantasia, searchTerm),
              ilike(documentosVenda.numeroDocumento, searchTerm),
              ilike(produtos.nomeProduto, searchTerm),
            )
          : undefined,
      );

      const [eventos, countResult] = await Promise.all([
        db
          .select({
            id: historicoDocumentoVenda.id,
            tipoEvento: historicoDocumentoVenda.tipoEvento,
            usuarioNome: historicoDocumentoVenda.usuarioNome,
            descricao: historicoDocumentoVenda.descricao,
            dadosAlterados: historicoDocumentoVenda.dadosAlterados,
            createdAt: historicoDocumentoVenda.createdAt,
            documentoVendaId: historicoDocumentoVenda.documentoVendaId,
            documentoNumero: documentosVenda.numeroDocumento,
            clienteNome: clientes.nome,
            clienteRazaoSocial: clientes.razaoSocial,
            clienteNomeFantasia: clientes.nomeFantasia,
            clienteTipoPessoa: clientes.tipoPessoa,
            produtoNome: produtos.nomeProduto,
          })
          .from(historicoDocumentoVenda)
          .innerJoin(documentosVenda, eq(historicoDocumentoVenda.documentoVendaId, documentosVenda.id))
          .innerJoin(clientes, eq(documentosVenda.clienteId, clientes.id))
          .innerJoin(produtos, eq(documentosVenda.produtoId, produtos.id))
          .where(whereCondition)
          .orderBy(sql`${historicoDocumentoVenda.createdAt} DESC`)
          .limit(limitNum)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(historicoDocumentoVenda)
          .innerJoin(documentosVenda, eq(historicoDocumentoVenda.documentoVendaId, documentosVenda.id))
          .innerJoin(clientes, eq(documentosVenda.clienteId, clientes.id))
          .innerJoin(produtos, eq(documentosVenda.produtoId, produtos.id))
          .where(whereCondition),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      const totalPages = Math.ceil(total / limitNum);

      return ok({
        data: eventos.map((e) => ({
          id: e.id,
          tipoEvento: e.tipoEvento,
          usuarioNome: e.usuarioNome,
          descricao: e.descricao,
          dadosAlterados: e.dadosAlterados,
          createdAt: e.createdAt,
          documentoVendaId: e.documentoVendaId,
          documentoNumero: e.documentoNumero,
          clienteNome: e.clienteTipoPessoa === 'PF'
            ? e.clienteNome
            : e.clienteNomeFantasia || e.clienteRazaoSocial || e.clienteNome,
          produtoNome: e.produtoNome,
          motivoRejeicao: e.tipoEvento === 'REJEICAO_CADASTRO' && e.descricao
            ? e.descricao.replace(/^Cadastro rejeitado:\s*/i, '') || null
            : null,
        })),
        total,
        page: pageNum,
        totalPages,
      });
    },
  );

  // List sale documents
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Listar documentos de venda',
        description:
          'Lista todos os documentos de venda com suporte a paginação e filtros por cliente, produto, status e vendedor.',
        ...documentosVendaDocs.listar,
      },
      preHandler: [
        authorizeAny([
          'vendas:visualizar_documento_venda',
          'vendas:visualizar_todos_documentos',
        ]),
      ],
    },
    async (request) => {
      const query = listDocumentosVendaQuerySchema.parse(request.query);

      // canViewAllDocuments afeta o filtro de vendedor e precisa estar fora do cache
      const canViewAllDocuments =
        request.user.isAdmin ||
        request.user.permissoes.includes('cadastro:aprovar_venda') ||
        request.user.permissoes.includes('cadastro:aprovar_endosso') ||
        request.user.permissoes.includes('vendas:visualizar_todos_documentos') ||
        request.user.permissoes.includes('relatorios:vendas');

      return withCache(
        request.corretoraId,
        {
          ...query,
          // Isola o cache por usuário quando ele só pode ver os próprios documentos
          _uid: canViewAllDocuments ? undefined : request.user.sub,
        },
        async () => {
      const { offset, limit, page } = getPaginationParams(query);

      const conditions = [
        eq(documentosVenda.corretoraId, request.corretoraId),
        isNull(documentosVenda.deletedAt),
      ];

      if (!canViewAllDocuments) {
        conditions.push(
          or(
            eq(documentosVenda.vendedorId, request.user.sub),
            eq(documentosVenda.atuanteId, request.user.sub),
            eq(documentosVenda.vendedorSecundarioId, request.user.sub),
          )!,
        );
      } else if (query.vendedorId) {
        // Se pode ver tudo mas filtrou por vendedor, filtra por vendedor OU atuante OU secundário
        conditions.push(
          or(
            eq(documentosVenda.vendedorId, query.vendedorId),
            eq(documentosVenda.atuanteId, query.vendedorId),
            eq(documentosVenda.vendedorSecundarioId, query.vendedorId),
          )!,
        );
      }

      if (query.clienteId) {
        conditions.push(eq(documentosVenda.clienteId, query.clienteId));
      }

      if (query.produtoId) {
        conditions.push(eq(documentosVenda.produtoId, query.produtoId));
      }

      if (query.status) {
        // Suporta múltiplos status separados por vírgula
        const statusList = query.status.split(',').map((s) => s.trim());
        if (statusList.length === 1) {
          conditions.push(eq(documentosVenda.status, statusList[0] as any));
        } else {
          // Para múltiplos status, usa inArray do Drizzle
          conditions.push(inArray(documentosVenda.status, statusList as any));
        }
      }

      if (query.tipoDocumento) {
        conditions.push(eq(documentosVenda.tipoDocumento, query.tipoDocumento));
      }

      if (query.seguradoraParceiraId) {
        conditions.push(eq(documentosVenda.seguradoraParceiraId, query.seguradoraParceiraId));
      }

      if (query.vigenciaFimAte) {
        conditions.push(lte(documentosVenda.vigenciaFim, query.vigenciaFimAte));
      }

      if (query.vigenciaFimDe) {
        conditions.push(gte(documentosVenda.vigenciaFim, query.vigenciaFimDe));
      }

      if (query.vigenciaInicioAte) {
        conditions.push(
          lte(documentosVenda.vigenciaInicio, query.vigenciaInicioAte),
        );
      }

      if (query.vigenciaInicioDe) {
        conditions.push(
          gte(documentosVenda.vigenciaInicio, query.vigenciaInicioDe),
        );
      }

      if (query.criadoApos) {
        conditions.push(
          gte(documentosVenda.createdAt, new Date(query.criadoApos)),
        );
      }

      if (query.criadoAntes) {
        conditions.push(
          lte(documentosVenda.createdAt, new Date(query.criadoAntes)),
        );
      }

      if (query.dataAprovacaoDe) {
        conditions.push(
          gte(
            documentosVenda.dataAprovacaoCadastro,
            new Date(query.dataAprovacaoDe + 'T00:00:00-03:00'),
          ),
        );
      }

      if (query.dataAprovacaoAte) {
        // Inclui o dia inteiro do limite superior, em horário de São Paulo (UTC-3)
        conditions.push(
          lte(
            documentosVenda.dataAprovacaoCadastro,
            new Date(query.dataAprovacaoAte + 'T23:59:59.999-03:00'),
          ),
        );
      }

      // Busca por nome/razão social do cliente, número do documento ou produto
      if (query.search) {
        const searchTerm = `%${query.search.toLowerCase()}%`;
        conditions.push(
          sql`(
            LOWER(${documentosVenda.numeroDocumento}) LIKE ${searchTerm} OR
            LOWER(${documentosVenda.numeroApoliceExterna}) LIKE ${searchTerm} OR
            ${documentosVenda.clienteId} IN (
              SELECT cliente.id FROM cliente
              WHERE (
                LOWER(cliente.nome) LIKE ${searchTerm} OR
                LOWER(cliente.razao_social) LIKE ${searchTerm} OR
                LOWER(cliente.nome_fantasia) LIKE ${searchTerm}
              )
            ) OR
            ${documentosVenda.produtoId} IN (
              SELECT produto.id FROM produto
              WHERE LOWER(produto.nome_produto) LIKE ${searchTerm}
            )
          )`,
        );
      }

      const [documentosResult, countResult] = await Promise.all([
        db.query.documentosVenda.findMany({
          where: and(...conditions),
          with: {
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
                tipoPessoa: true,
                cpf: true,
                cnpj: true,
                email: true,
                telefone: true,
                celular: true,
              },
            },
            vendedor: {
              columns: {
                id: true,
                nome: true,
              },
            },
            vendedorSecundario: {
              columns: { id: true, nome: true },
            },
            vendedorTerceiro: {
              columns: { id: true, nome: true },
            },
            atuante: {
              columns: { id: true, nome: true },
            },
            produto: {
              columns: {
                id: true,
                nomeProduto: true,
                tipoSeguro: true,
              },
            },
            seguradoraParceira: {
              columns: {
                id: true,
                razaoSocial: true,
                nomeFantasia: true,
              },
            },
            aprovadoPor: {
              columns: {
                id: true,
                nome: true,
              },
            },
            rejeitadoPor: {
              columns: {
                id: true,
                nome: true,
              },
            },
          } as any,
          limit,
          offset,
          orderBy: (documentosVenda, { desc }) => [
            desc(documentosVenda.createdAt),
          ],
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(documentosVenda)
          .where(and(...conditions)),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      // Busca situacaoCotacao em paralelo com o mapeamento dos resultados
      const cotacaoIds = (documentosResult as any[])
        .map((d) => (d.metadata as any)?.cotacaoId)
        .filter(Boolean) as string[];

      const cotacoesResultPromise = cotacaoIds.length > 0
        ? db.query.cotacoes.findMany({
            where: inArray(cotacoes.id, cotacaoIds),
            columns: { id: true, situacao: true, origem: true },
          })
        : Promise.resolve([]);

      const cotacoesResult = await cotacoesResultPromise;
      const situacaoCotacaoMap = new Map<string, string>();
      const origemCotacaoMap = new Map<string, string>();
      for (const c of cotacoesResult) {
        situacaoCotacaoMap.set(c.id, c.situacao);
        if (c.origem) origemCotacaoMap.set(c.id, c.origem);
      }

      // Mesmo comportamento do GET /:id/comments: busca por docId e cotacaoId
      const entidadeToDocMap = new Map<string, string>();
      const allEntidadeIds: string[] = [];
      for (const d of documentosResult as any[]) {
        entidadeToDocMap.set(d.id, d.id);
        allEntidadeIds.push(d.id);
        const cotacaoId = (d.metadata as any)?.cotacaoId;
        if (cotacaoId) {
          entidadeToDocMap.set(cotacaoId, d.id);
          allEntidadeIds.push(cotacaoId);
        }
      }

      const ultimosComentariosResult = allEntidadeIds.length > 0
        ? await db
            .select({
              id: comentarios.id,
              entidadeId: comentarios.entidadeId,
              texto: comentarios.texto,
              createdAt: comentarios.createdAt,
              autorId: usuarios.id,
              autorNome: usuarios.nome,
            })
            .from(comentarios)
            .innerJoin(usuarios, eq(comentarios.autorId, usuarios.id))
            .where(and(
              eq(comentarios.corretoraId, request.corretoraId),
              inArray(comentarios.entidadeId, allEntidadeIds),
              isNull(comentarios.parentId),
            ))
            .orderBy(desc(comentarios.createdAt))
        : [];

      const ultimoComentarioMap = new Map<string, { id: string; texto: string; createdAt: string; autor: { id: string; nome: string } }>();
      for (const c of ultimosComentariosResult) {
        const docId = entidadeToDocMap.get(c.entidadeId);
        if (docId && !ultimoComentarioMap.has(docId)) {
          ultimoComentarioMap.set(docId, {
            id: c.id,
            texto: c.texto,
            createdAt: c.createdAt.toISOString(),
            autor: { id: c.autorId, nome: c.autorNome },
          });
        }
      }

      return {
        success: true as const,
        ...createPaginatedResult(
          (documentosResult as any[]).map((d) => ({
            id: d.id,
            numero: d.numeroDocumento,
            tipo: d.tipoDocumento,
            status: d.status,
            numeroApoliceExterna: d.numeroApoliceExterna,
            vigenciaInicio: d.vigenciaInicio,
            vigenciaFim: d.vigenciaFim,
            premioLiquido: d.premioLiquido ? parseFloat(d.premioLiquido) : null,
            percentualComissao: d.percentualComissao
              ? parseFloat(d.percentualComissao)
              : null,
            valorComissao: d.valorComissao ? parseFloat(d.valorComissao) : null,
            negocioCorretora: d.negocioCorretora || false,
            percentualCorretora: d.percentualCorretora
              ? parseFloat(d.percentualCorretora)
              : null,
            valorComissaoCorretora: d.valorComissaoCorretora
              ? parseFloat(d.valorComissaoCorretora)
              : null,
            clienteId: d.clienteId,
            cliente: d.cliente,
            vendedorId: d.vendedorId,
            vendedor: d.vendedor,
            vendedorSecundario: d.vendedorSecundario ?? null,
            vendedorTerceiro: d.vendedorTerceiro ?? null,
            atuante: d.atuante ?? null,
            produtoId: d.produtoId,
            produto: {
              id: d.produto.id,
              nomeProduto: d.produto.nomeProduto,
              tipoSeguro: d.produto.tipoSeguro,
            },
            seguradoraParceiraId: d.seguradoraParceiraId,
            seguradoraParceira: d.seguradoraParceira ?? null,
            aprovadoPorId: d.aprovadoPorId,
            aprovadoPor: d.aprovadoPor,
            dataAprovacaoCadastro: d.dataAprovacaoCadastro,
            motivoRejeicao: d.motivoRejeicao,
            dataRejeicaoCadastro: d.dataRejeicaoCadastro,
            rejeitadoPorId: d.rejeitadoPorId,
            rejeitadoPor: d.rejeitadoPor,
            observacoes: d.observacoes,
            motivoPerda: d.motivoPerda,
            concorrenteGanhou: d.concorrenteGanhou,
            detalhesPerda: d.detalhesPerda,
            metadata: d.metadata,
            situacaoCotacao: situacaoCotacaoMap.get((d.metadata as any)?.cotacaoId) ?? null,
            origemCotacao: origemCotacaoMap.get((d.metadata as any)?.cotacaoId) ?? null,
            ultimoComentario: ultimoComentarioMap.get(d.id) ?? null,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          })),
          total,
          page,
          limit,
        ),
      };
        }, // fecha async () => { do withCache
      ); // fecha withCache(
    },
  );

  // Get sale document by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Obter detalhes do documento de venda',
        description:
          'Obtém os detalhes completos de um documento de venda específico, incluindo cliente, produto e histórico.',
        ...documentosVendaDocs.buscar,
      },
      preHandler: [
        authorizeAny([
          'vendas:visualizar_documento_venda',
          'vendas:visualizar_todos_documentos',
        ]),
      ],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
        with: {
          cliente: true,
          vendedor: {
            columns: {
              id: true,
              nome: true,
              email: true,
              avatarR2Key: true,
            },
          },
          vendedorSecundario: {
            columns: { id: true, nome: true, email: true, avatarR2Key: true },
          },
          vendedorTerceiro: {
            columns: { id: true, nome: true, email: true, avatarR2Key: true },
          },
          atuante: {
            columns: { id: true, nome: true, email: true, avatarR2Key: true },
          },
          produto: true,
          seguradoraParceira: {
            columns: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
            },
          },
          aprovadoPor: {
            columns: { id: true, nome: true },
          },
          rejeitadoPor: {
            columns: { id: true, nome: true },
          },
          canceladoPor: {
            columns: { id: true, nome: true },
          },
        } as any,
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (
        !request.user.isAdmin &&
        !request.user.permissoes.includes(
          'vendas:visualizar_todos_documentos',
        ) &&
        documento.vendedorId !== request.user.sub &&
        documento.atuanteId !== request.user.sub
      ) {
        throw new OwnershipError('Você não tem acesso a este documento');
      }

      // Buscar situacao da cotação (NOVO vs RENOVACAO) via metadata.cotacaoId
      const cotacaoId = (documento.metadata as any)?.cotacaoId;
      const situacaoCotacao = cotacaoId
        ? await db.query.cotacoes
            .findFirst({
              where: eq(cotacoes.id, cotacaoId),
              columns: { situacao: true },
            })
            .then((c) => c?.situacao ?? null)
        : null;

      // Gerar URLs assinadas e remover campos internos de todos os vendedores
      const sellers = [
        (documento as any).vendedor,
        (documento as any).vendedorSecundario,
        (documento as any).vendedorTerceiro,
        (documento as any).atuante,
      ].filter(Boolean);

      await Promise.all(
        sellers.map(async (seller: any) => {
          seller.avatarUrl = await getAvatarUrl(seller.avatarR2Key);
          delete seller.avatarR2Key;
        }),
      );

      return ok({ ...documento, situacaoCotacao } as any);
    },
  );

  // Update sale document
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Atualizar documento de venda',
        description:
          'Atualiza os dados de um documento de venda. Não permite edição de documentos cancelados ou perdidos.',
        ...documentosVendaDocs.atualizar,
      },
      preHandler: [
        authorize(['vendas:editar_documento_venda']),
        requireOwnership('documento'),
      ],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);
      const data = updateDocumentoVendaSchema.parse(request.body);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      // Validar status manualmente (não usar requireStatus pois tem lógica complexa)
      if (['CANCELADO', 'PERDIDO'].includes(documento.status)) {
        throw new ValidationError(
          'Não é possível editar um documento cancelado ou perdido',
        );
      }

      if (
        documento.status === 'ATIVO' &&
        (data.vendedorId !== undefined ||
          data.vendedorSecundarioId !== undefined ||
          data.vendedorTerceiroId !== undefined)
      ) {
        throw new ValidationError(
          'Para trocar o vendedor de um documento ativo, use o fluxo de solicitação de troca de vendedor.',
        );
      }

      // Recalculate commission
      let valorComissao = documento.valorComissao;
      if (
        data.premioLiquido !== undefined ||
        data.percentualComissao !== undefined
      ) {
        const premio =
          data.premioLiquido ?? parseFloat(documento.premioLiquido || '0');
        const percentual =
          data.percentualComissao ??
          parseFloat(documento.percentualComissao || '0');
        valorComissao = ((premio * percentual) / 100).toString();
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
        valorComissao,
      };

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          if (
            [
              'premioLiquido',
              'percentualComissao',
              'franquia',
              'valorSegurado',
            ].includes(key)
          ) {
            updateData[key] = value?.toString() ?? null;
          } else {
            updateData[key] = value;
          }
        }
      });

      const [updated] = await db
        .update(documentosVenda)
        .set(updateData)
        .where(eq(documentosVenda.id, id))
        .returning();

      // Add history
      await addHistorico(
        id,
        'ALTERACAO_DADOS',
        'Dados do documento alterados',
        request.user.sub,
        request.user.nome,
        undefined,
        undefined,
        data as Record<string, unknown>,
      );

      return ok(updated);
    },
  );

  // Register external policy number
  fastify.post(
    '/:id/register-external-policy',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Registrar número de apólice externa',
        description:
          'Registra o número de apólice externa fornecido pela seguradora para um documento de venda.',
        ...documentosVendaDocs.registrarApoliceExterna,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);
      const { numeroApoliceExterna } = registrarApoliceSchema.parse(
        request.body,
      );

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      const [updated] = await db
        .update(documentosVenda)
        .set({
          numeroApoliceExterna,
          updatedAt: new Date(),
        })
        .where(eq(documentosVenda.id, id))
        .returning();

      await addHistorico(
        id,
        'ALTERACAO_DADOS',
        `Número de apólice externa registrado: ${numeroApoliceExterna}`,
        request.user.sub,
        request.user.nome,
      );

      return { ...ok(updated), message: 'Número de apólice registrado' };
    },
  );

  // Request registration validation
  fastify.post(
    '/:id/request-registration-validation',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Solicitar validação de cadastro',
        description:
          'Solicita validação de cadastro para uma venda confirmada, alterando seu status para AGUARDANDO_CADASTRO.',
        ...documentosVendaDocs.solicitarValidacaoCadastro,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (documento.status !== 'VENDA_CONFIRMADA') {
        throw new ValidationError(
          'Só é possível solicitar validação de vendas confirmadas',
        );
      }

      const statusAnterior = documento.status;

      const [updated] = await db
        .update(documentosVenda)
        .set({
          status: 'AGUARDANDO_CADASTRO',
          dataSolicitacaoCadastro: new Date(),
          dataRejeicaoCadastro: null,
          rejeitadoPorId: null,
          motivoRejeicao: null,
          updatedAt: new Date(),
        })
        .where(eq(documentosVenda.id, id))
        .returning();

      await addHistorico(
        id,
        'SOLICITACAO_CADASTRO',
        'Validação de cadastro solicitada',
        request.user.sub,
        request.user.nome,
        statusAnterior,
        'AGUARDANDO_CADASTRO',
        {
          solicitadoPorId: request.user.sub,
          solicitadoPorNome: request.user.nome,
          vendedorId: documento.vendedorId,
          vendedorSecundarioId: documento.vendedorSecundarioId,
          vendedorTerceiroId: documento.vendedorTerceiroId,
          atuanteId: documento.atuanteId,
        },
      );

      // Notificar equipe de cadastro sobre aprovação pendente
      const { NotificacaoService } = await import('@ecotech/shared/database');

      const clienteSolicitacao = await db.query.clientes.findFirst({
        where: eq(clientes.id, documento.clienteId),
        columns: { nome: true },
      });

      NotificacaoService.notificarAprovacaoPendente({
        corretoraId: request.corretoraId,
        documentoId: id,
        numeroDocumento: updated.numeroDocumento,
        clienteNome: clienteSolicitacao?.nome || 'Cliente',
        vendedorNome: request.user.nome,
      }).catch((err) => {
        console.error('Erro ao criar notificação de aprovação pendente:', err);
      });

      return { ...ok(updated), message: 'Validação de cadastro solicitada' };
    },
  );

  // Approve registration
  fastify.post(
    '/:id/approve-registration',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Aprovar cadastro',
        description:
          'Aprova o cadastro de uma venda que estava aguardando validação, alterando seu status para ATIVO.',
        ...documentosVendaDocs.aprovarCadastro,
      },
      preHandler: [authorize(['cadastro:aprovar_venda'])],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (documento.status !== 'AGUARDANDO_CADASTRO') {
        throw new ValidationError(
          'Este documento não está aguardando aprovação de cadastro',
        );
      }

      // Validar se já foi aprovado (double-click protection)
      if (documento.dataAprovacaoCadastro || documento.aprovadoPorId) {
        throw new ValidationError(
          'Este documento já foi aprovado anteriormente',
        );
      }

      const statusAnterior = documento.status;

      // Usar transação para garantir atomicidade
      const [updated] = await db
        .update(documentosVenda)
        .set({
          status: 'ATIVO',
          dataAprovacaoCadastro: new Date(),
          aprovadoPorId: request.user.sub,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(documentosVenda.id, id),
            eq(documentosVenda.status, 'AGUARDANDO_CADASTRO'),
            isNull(documentosVenda.dataAprovacaoCadastro),
          ),
        )
        .returning();

      if (!updated) {
        throw new ValidationError(
          'Este documento já foi processado por outra requisição',
        );
      }

      // AUTOMAÇÃO: Calcular comissões automaticamente
      await calculateCommissions(id, request.corretoraId);

      // AUTOMAÇÃO: Finalizar renovação original se este documento for uma renovação
      try {
        let renovacaoId: string | undefined;
        const metadata = updated.metadata as any;
        const cotacaoId = metadata?.cotacaoId;

        // Buscar cotação direta e proposta em paralelo (uma query cada)
        const [cotacaoDireta, proposta] = await Promise.all([
          cotacaoId
            ? db.query.cotacoes.findFirst({
                where: eq(cotacoes.id, cotacaoId),
                columns: { id: true, detalhesRisco: true },
              })
            : null,
          db.query.propostasComerciais.findFirst({
            where: eq(propostasComerciais.documentoVendaId, id),
            with: {
              cotacao: { columns: { id: true, detalhesRisco: true } },
            } as any,
          }),
        ]);

        // Prioridade: cotação direta (mais comum), depois proposta
        if (cotacaoDireta?.detalhesRisco) {
          renovacaoId = (cotacaoDireta.detalhesRisco as any).renovacaoId;
        } else if ((proposta as any)?.cotacao?.detalhesRisco) {
          renovacaoId = ((proposta as any).cotacao.detalhesRisco as any)
            .renovacaoId;
        }

        if (renovacaoId) {
          // Atualizar renovação para RENOVADO apenas se está em status pendente
          const [renovacaoAtualizada] = await db
            .update(renovacoesComerciais)
            .set({
              status: 'RENOVADO',
              documentoVendaNovoId: id,
              premioNovo: updated.premioLiquido,
              percentualComissaoNovo: updated.percentualComissao,
              valorComissaoNovo: updated.valorComissao,
              novaVigenciaInicio: updated.vigenciaInicio,
              novaVigenciaFim: updated.vigenciaFim,
              dataFinalizacao: new Date(),
              finalizadoPorId: request.user.sub,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(renovacoesComerciais.id, renovacaoId),
                eq(renovacoesComerciais.corretoraId, request.corretoraId),
                sql`${renovacoesComerciais.status} IN ('NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE')`,
              ),
            )
            .returning();

          if (renovacaoAtualizada) {
            console.log(
              `Renovação ${renovacaoId} finalizada automaticamente - vinculada ao documento ${updated.numeroDocumento}`,
            );
          }
        }
      } catch (error) {
        console.error('Erro ao finalizar renovação original:', error);
        // Não falhar a aprovação se a atualização da renovação falhar
      }

      // AUTOMAÇÃO: Criar nova renovação futura quando cadastro é aprovado
      const vigenciaFim = new Date(updated.vigenciaFim);
      const hoje = new Date();
      const diasParaVencimento = Math.ceil(
        (vigenciaFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Calcular data de início da janela de renovação (45 dias antes)
      const dataInicioJanela = new Date(vigenciaFim);
      dataInicioJanela.setDate(dataInicioJanela.getDate() - 45);

      let renovacaoCriada = null;

      // Buscar renovação existente deste documento
      try {
        const renovacaoExistente =
          await db.query.renovacoesComerciais.findFirst({
            where: and(
              eq(renovacoesComerciais.documentoVendaAnteriorId, id),
              eq(renovacoesComerciais.corretoraId, request.corretoraId),
            ),
          });

        if (renovacaoExistente) {
          // Renovação já existe - não fazer nada (ela já está em processo)
          renovacaoCriada = renovacaoExistente;
          console.log(
            `✅ Renovação ${renovacaoExistente.id} já existe para documento ${updated.numeroDocumento}`,
          );
        } else if (diasParaVencimento <= 45) {
          // Documento está na janela de renovação (45 dias) - criar renovação automaticamente
          const [novaRenovacao] = await db
            .insert(renovacoesComerciais)
            .values({
              corretoraId: request.corretoraId,
              documentoVendaAnteriorId: id,
              clienteId: updated.clienteId,
              vendedorId: updated.vendedorId,
              premioAnterior: updated.premioLiquido,
              percentualComissaoAnterior: updated.percentualComissao,
              valorComissaoAnterior: updated.valorComissao,
              dataVencimento: updated.vigenciaFim,
              status: 'NAO_TRABALHADO',
            })
            .returning();

          renovacaoCriada = novaRenovacao;

          console.log(
            `✅ Renovação ${novaRenovacao.id} criada automaticamente para documento ${updated.numeroDocumento} (vence em ${diasParaVencimento} dias)`,
          );
        } else {
          console.log(
            `⚠️ Documento ${updated.numeroDocumento} ainda não está na janela de renovação (vence em ${diasParaVencimento} dias, janela abre em ${diasParaVencimento - 45} dias)`,
          );
        }
      } catch (error) {
        console.error('❌ Erro ao criar/atualizar renovação:', error);
        // Não falhar a aprovação se renovação falhar
      }

      await addHistorico(
        id,
        'APROVACAO_CADASTRO',
        'Cadastro aprovado - documento ativo',
        request.user.sub,
        request.user.nome,
        statusAnterior,
        'ATIVO',
      );

      // Notificar vendedor sobre aprovação
      const { NotificacaoService } = await import('@ecotech/shared/database');

      const cliente = await db.query.clientes.findFirst({
        where: eq(clientes.id, updated.clienteId),
        columns: { nome: true },
      });

      const vendedor = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, updated.vendedorId),
        columns: { gestorId: true },
      });

      NotificacaoService.notificarVendaAprovada({
        corretoraId: request.corretoraId,
        documentoId: id,
        numeroDocumento: updated.numeroDocumento,
        clienteNome: cliente?.nome || 'Cliente',
        aprovadoPorNome: request.user.nome,
        vendedorId: updated.vendedorId,
        gestorId: vendedor?.gestorId,
      }).catch((err) => {
        console.error('Erro ao criar notificação de venda aprovada:', err);
      });

      if (updated.valorComissao) {
        NotificacaoService.notificarComissaoDisponivel({
          corretoraId: request.corretoraId,
          documentoId: id,
          numeroDocumento: updated.numeroDocumento,
          clienteNome: cliente?.nome || 'Cliente',
          valorComissao: updated.valorComissao,
          vendedorId: updated.vendedorId,
          gestorId: vendedor?.gestorId,
        }).catch((err) => {
          console.error('Erro ao criar notificação de comissão:', err);
        });
      }

      // Verificar metas/missões/reconhecimento do vendedor após venda aprovada
      import('../../utils/progresso-metrica.js').then(({ checkPendingGoals, checkPendingMissions }) => {
        Promise.all([
          checkPendingGoals(request.corretoraId, updated.vendedorId),
          checkPendingMissions(request.corretoraId, updated.vendedorId),
        ]).catch((err) => {
          console.error('Erro ao verificar metas/missões após aprovação:', err);
        });
      });
      import('../../utils/reconhecimento.js').then(({ checkAllRecognitions }) => {
        checkAllRecognitions(request.corretoraId, updated.vendedorId).catch((err) => {
          console.error('Erro ao verificar reconhecimentos após aprovação:', err);
        });
      });

      rankingSSE.emit(request.corretoraId, 'ranking-updated');

      return {
        ...ok(updated),
        renovacao: renovacaoCriada
          ? {
              id: renovacaoCriada.id,
              numeroDocumento: updated.numeroDocumento,
              vigenciaInicio: updated.vigenciaInicio,
              vigenciaFim: updated.vigenciaFim,
              dataInicioJanela: dataInicioJanela.toISOString(),
            }
          : null,
        message: 'Cadastro aprovado - documento ativo',
      };
    },
  );

  // Create renewal automatically
  fastify.post(
    '/:id/create-renewal',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Criar renovação automática',
        description:
          'Cria automaticamente um documento de renovação para uma venda ativa, com vigência iniciando após o término da venda original.',
        ...documentosVendaDocs.criarRenovacao,
      },
      preHandler: [authorize(['cadastro:aprovar_venda'])],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (documento.status !== 'ATIVO') {
        throw new ValidationError(
          'Só é possível criar renovação para documentos ativos',
        );
      }

      // Verificar se já existe renovação para este documento
      const renovacaoExistente = await db.query.documentosVenda.findFirst({
        where: and(
          sql`${documentosVenda.metadata}->>'documentoOrigemId' = ${id}`,
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (renovacaoExistente) {
        throw new ValidationError(
          `Já existe uma renovação (${renovacaoExistente.numeroDocumento}) criada para este documento`,
        );
      }

      // Calcular datas da renovação
      const vigenciaFimOriginal = new Date(documento.vigenciaFim);
      const novaVigenciaInicio = vigenciaFimOriginal;
      const novaVigenciaFim = new Date(vigenciaFimOriginal);
      novaVigenciaFim.setFullYear(novaVigenciaFim.getFullYear() + 1); // +1 ano

      // Calcular data de início da janela de renovação (45 dias antes)
      const dataInicioJanela = new Date(vigenciaFimOriginal);
      dataInicioJanela.setDate(dataInicioJanela.getDate() - 45);

      // Gerar número do documento de renovação
      const numeroBase = documento.numeroDocumento.split('-R')[0]; // Remove sufixo de renovação se existir
      const countRenovacoes = await db
        .select({ count: sql<number>`count(*)` })
        .from(documentosVenda)
        .where(
          and(
            sql`${documentosVenda.metadata}->>'documentoOrigemId' = ${id}`,
            eq(documentosVenda.corretoraId, request.corretoraId),
          ),
        );

      const numeroRenovacao = Number(countRenovacoes[0]?.count ?? 0) + 1;
      const numeroDocumento = `${numeroBase}-R${numeroRenovacao}`;

      // Criar documento de renovação
      const [renovacao] = await db
        .insert(documentosVenda)
        .values({
          corretoraId: request.corretoraId,
          clienteId: documento.clienteId,
          vendedorId: documento.vendedorId,
          produtoId: documento.produtoId,
          numeroDocumento,
          tipoDocumento: documento.tipoDocumento,
          status: 'ATIVO',
          vigenciaInicio: novaVigenciaInicio.toISOString().split('T')[0],
          vigenciaFim: novaVigenciaFim.toISOString().split('T')[0],
          moeda: documento.moeda,
          premioLiquido: documento.premioLiquido,
          percentualComissao: documento.percentualComissao,
          valorComissao: documento.valorComissao,
          coberturas: documento.coberturas,
          franquia: documento.franquia,
          valorSegurado: documento.valorSegurado,
          observacoes: `Renovação automática de ${documento.numeroDocumento}`,
          metadata: documento.metadata
            ? {
                ...(typeof documento.metadata === 'object'
                  ? documento.metadata
                  : {}),
                documentoOrigemId: id,
                numeroDocumentoOrigem: documento.numeroDocumento,
                dataInicioJanelaRenovacao: dataInicioJanela.toISOString(),
              }
            : {
                documentoOrigemId: id,
                numeroDocumentoOrigem: documento.numeroDocumento,
                dataInicioJanelaRenovacao: dataInicioJanela.toISOString(),
              },
        })
        .returning();

      // Adicionar histórico na renovação
      await addHistorico(
        renovacao.id,
        'CRIACAO',
        `Renovação criada automaticamente a partir de ${documento.numeroDocumento}`,
        request.user.sub,
        request.user.nome,
        undefined,
        'ATIVO',
        {
          criadoPorId: request.user.sub,
          criadoPorNome: request.user.nome,
          vendedorId: renovacao.vendedorId,
          vendedorSecundarioId: renovacao.vendedorSecundarioId,
          vendedorTerceiroId: renovacao.vendedorTerceiroId,
          atuanteId: renovacao.atuanteId,
          documentoOrigemId: id,
          numeroDocumentoOrigem: documento.numeroDocumento,
        },
      );

      // Adicionar histórico no documento original
      await addHistorico(
        id,
        'ALTERACAO_DADOS',
        `Renovação ${numeroDocumento} criada automaticamente`,
        request.user.sub,
        request.user.nome,
      );

      // Criar registro comercial de renovação
      // Como a renovação já foi criada automaticamente e está ATIVA,
      // marcamos o status como RENOVADO para não aparecer como pendente
      const [renovacaoComercial] = await db
        .insert(renovacoesComerciais)
        .values({
          corretoraId: request.corretoraId,
          documentoVendaAnteriorId: id,
          documentoVendaNovoId: renovacao.id,
          vendedorId: documento.vendedorId,
          premioAnterior: documento.premioLiquido,
          percentualComissaoAnterior: documento.percentualComissao,
          valorComissaoAnterior: documento.valorComissao,
          premioNovo: documento.premioLiquido,
          percentualComissaoNovo: documento.percentualComissao,
          valorComissaoNovo: documento.valorComissao,
          dataVencimento: vigenciaFimOriginal.toISOString().split('T')[0],
          novaVigenciaInicio: novaVigenciaInicio.toISOString().split('T')[0],
          novaVigenciaFim: novaVigenciaFim.toISOString().split('T')[0],
          status: 'RENOVADO',
          dataFinalizacao: new Date(),
          finalizadoPorId: request.user.sub,
        })
        .returning();

      return {
        ...ok({
          renovacao,
          renovacaoComercial,
          dataInicioJanela: dataInicioJanela.toISOString(),
        }),
        message: `Renovação ${numeroDocumento} criada com sucesso`,
      };
    },
  );

  // Reject registration
  fastify.post(
    '/:id/reject-registration',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Rejeitar cadastro',
        description:
          'Rejeita o cadastro de uma venda, retornando seu status para VENDA_CONFIRMADA para correções.',
        ...documentosVendaDocs.rejeitarCadastro,
      },
      preHandler: [authorize(['cadastro:rejeitar_venda'])],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);
      const { motivoRejeicao } = rejeitarCadastroSchema.parse(request.body);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (documento.status !== 'AGUARDANDO_CADASTRO') {
        throw new ValidationError(
          'Este documento não está aguardando aprovação de cadastro',
        );
      }

      const statusAnterior = documento.status;

      const [updated] = await db
        .update(documentosVenda)
        .set({
          status: 'VENDA_CONFIRMADA', // Returns to previous status for correction
          dataRejeicaoCadastro: new Date(),
          rejeitadoPorId: request.user.sub,
          motivoRejeicao,
          updatedAt: new Date(),
        })
        .where(eq(documentosVenda.id, id))
        .returning();

      // Reset cotação vinculada para EM_ELABORACAO e sincroniza atuante para aparecer na lista do atuante da venda
      const cotacoesVinculadas = await db.query.cotacoes.findMany({
        where: eq(cotacoes.documentoVendaId, id),
        columns: { id: true, detalhesRisco: true },
      });

      await db
        .update(cotacoes)
        .set({ status: 'EM_ELABORACAO', atuanteId: documento.atuanteId, updatedAt: new Date() })
        .where(eq(cotacoes.documentoVendaId, id));

      // Resetar renovação vinculada para EM_PROSPECCAO (o documento foi rejeitado, ainda precisa corrigir)
      const renovacaoIdsViaDetalhes = cotacoesVinculadas
        .map((cot) => (cot.detalhesRisco as any)?.renovacaoId as string | undefined)
        .filter(Boolean) as string[];

      if (renovacaoIdsViaDetalhes.length > 0) {
        try {
          await db
            .update(renovacoesComerciais)
            .set({ status: 'EM_PROSPECCAO', updatedAt: new Date() })
            .where(
              and(
                inArray(renovacoesComerciais.id, renovacaoIdsViaDetalhes),
                eq(renovacoesComerciais.corretoraId, request.corretoraId),
                notInArray(renovacoesComerciais.status, ['NAO_TRABALHADO', 'EM_PROSPECCAO', 'RENOVADO', 'PERDIDO', 'CANCELADO']),
              ),
            );
        } catch (error) {
          console.error('Erro ao resetar renovações via detalhesRisco:', error);
        }
      } else if (documento.clienteId) {
        // Fallback para cotações antigas sem renovacaoId em detalhes_risco
        try {
          await db
            .update(renovacoesComerciais)
            .set({ status: 'EM_PROSPECCAO', updatedAt: new Date() })
            .where(
              and(
                eq(renovacoesComerciais.corretoraId, request.corretoraId),
                eq(renovacoesComerciais.clienteId, documento.clienteId),
                notInArray(renovacoesComerciais.status, ['NAO_TRABALHADO', 'EM_PROSPECCAO', 'RENOVADO', 'PERDIDO', 'CANCELADO']),
              ),
            );
        } catch (error) {
          console.error('Erro ao resetar renovações via clienteId (fallback):', error);
        }
      }

      await addHistorico(
        id,
        'REJEICAO_CADASTRO',
        `Cadastro rejeitado: ${motivoRejeicao}`,
        request.user.sub,
        request.user.nome,
        statusAnterior,
        'VENDA_CONFIRMADA',
      );

      // Notificar vendedor sobre rejeição
      const { NotificacaoService, usuarios } = await import(
        '@ecotech/shared/database'
      );

      const cliente = await db.query.clientes.findFirst({
        where: eq(clientes.id, documento.clienteId),
        columns: { nome: true },
      });

      const vendedor = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, documento.vendedorId),
        columns: { gestorId: true },
      });

      NotificacaoService.notificarVendaRecusada({
        corretoraId: request.corretoraId,
        documentoId: id,
        numeroDocumento: documento.numeroDocumento,
        clienteNome: cliente?.nome || 'Cliente',
        motivoRejeicao,
        rejeitadoPorNome: request.user.nome,
        vendedorId: documento.vendedorId,
        gestorId: vendedor?.gestorId,
      }).catch((err) => {
        console.error('Erro ao criar notificação de venda recusada:', err);
      });

      return { ...ok(updated), message: 'Cadastro rejeitado' };
    },
  );

  // Cancel sale
  fastify.post(
    '/:id/cancel',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Cancelar venda',
        description:
          'Cancela uma venda em qualquer estágio, exceto se já foi cancelada ou perdida. Requer motivo de cancelamento.',
        ...documentosVendaDocs.cancelar,
      },
      preHandler: [authorize(['vendas:cancelar_venda'])],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);
      const { motivoCancelamento } = cancelarVendaSchema.parse(request.body);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (['CANCELADO', 'PERDIDO'].includes(documento.status)) {
        throw new ValidationError('Este documento já foi cancelado ou perdido');
      }

      const statusAnterior = documento.status;

      const [updated] = await db
        .update(documentosVenda)
        .set({
          status: 'CANCELADO',
          dataCancelamento: new Date(),
          motivoCancelamento,
          canceladoPorId: request.user.sub,
          updatedAt: new Date(),
        })
        .where(eq(documentosVenda.id, id))
        .returning();

      await addHistorico(
        id,
        'CANCELAMENTO',
        `Venda cancelada: ${motivoCancelamento}`,
        request.user.sub,
        request.user.nome,
        statusAnterior,
        'CANCELADO',
      );

      // Cancelar lançamentos de comissão pendentes
      const { lancamentosJaRecebidos } = await cancelDocumentEntries(id);

      return {
        ...ok(updated),
        message: 'Venda cancelada',
        avisoComissao:
          lancamentosJaRecebidos > 0
            ? `${lancamentosJaRecebidos} parcela(s) de comissão já recebida(s) da seguradora precisam de estorno manual.`
            : null,
      };
    },
  );

  // Register loss
  fastify.post(
    '/:id/mark-as-lost',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Registrar perda de venda',
        description:
          'Registra que uma venda foi perdida para a concorrência, com motivo e detalhes opcionais.',
        ...documentosVendaDocs.perder,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);
      const data = registrarPerdaSchema.parse(request.body);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (
        ![
          'EM_NEGOCIACAO',
          'AGUARDANDO_CLIENTE',
          'AGUARDANDO_APROVACAO',
          'AGUARDANDO_CADASTRO',
        ].includes(documento.status)
      ) {
        throw new ValidationError(
          'Só é possível registrar perda em documentos em negociação ou aguardando cadastro',
        );
      }

      const statusAnterior = documento.status;

      const [updated] = await db
        .update(documentosVenda)
        .set({
          status: 'PERDIDO',
          dataPerda: new Date(),
          motivoPerda: data.motivoPerda,
          concorrenteGanhou: data.concorrenteGanhou,
          detalhesPerda: data.detalhesPerda,
          updatedAt: new Date(),
        })
        .where(eq(documentosVenda.id, id))
        .returning();

      await addHistorico(
        id,
        'PERDA',
        `Venda perdida: ${data.motivoPerda}${data.concorrenteGanhou ? ` - Concorrente: ${data.concorrenteGanhou}` : ''}`,
        request.user.sub,
        request.user.nome,
        statusAnterior,
        'PERDIDO',
      );

      return { ...ok(updated), message: 'Perda registrada' };
    },
  );

  // Confirm loss (cadastro approves the loss marked by seller)
  fastify.post(
    '/:id/confirm-loss',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Confirmar perda de venda',
        description:
          'Confirma que a venda marcada como perdida pelo vendedor realmente foi perdida. Finaliza o documento como PERDIDO.',
        ...documentosVendaDocs.confirmarPerda,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (documento.status !== 'PERDIDO') {
        throw new ValidationError(
          'Só é possível confirmar perda de documentos com status PERDIDO',
        );
      }

      const metadataAtualizada = {
        ...((documento.metadata as any) || {}),
        aguardandoAprovacaoPerda: false,
        perdaConfirmadaPor: request.user.sub,
        perdaConfirmadaEm: new Date().toISOString(),
      };

      fastify.log.info(
        {
          documentoId: id,
          metadataAnterior: documento.metadata,
          metadataAtualizada,
        },
        '🔵 Confirmando perda:',
      );

      const now = new Date();
      const [updated] = await db
        .update(documentosVenda)
        .set({
          metadata: metadataAtualizada,
          updatedAt: now,
        })
        .where(eq(documentosVenda.id, id))
        .returning();

      fastify.log.info(
        {
          documentoId: id,
          metadataRetornada: updated.metadata,
        },
        '✅ Perda confirmada:',
      );

      await addHistorico(
        id,
        'CONFIRMACAO_PERDA',
        'Perda confirmada pelo cadastro',
        request.user.sub,
        request.user.nome,
        'PERDIDO',
        'PERDIDO',
      );

      return { ...ok(updated), message: 'Perda confirmada' };
    },
  );

  // Reject loss (cadastro rejects the loss, seller was wrong)
  fastify.post(
    '/:id/reject-loss',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Rejeitar perda de venda',
        description:
          'Rejeita a perda marcada pelo vendedor. O documento volta para AGUARDANDO_CADASTRO para processamento normal.',
        ...documentosVendaDocs.rejeitarPerda,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (documento.status !== 'PERDIDO') {
        throw new ValidationError(
          'Só é possível rejeitar perda de documentos com status PERDIDO',
        );
      }

      const statusAnterior = documento.status;

      // Volta para AGUARDANDO_CADASTRO e limpa dados de perda e aprovação anterior
      const [updated] = await db
        .update(documentosVenda)
        .set({
          status: 'AGUARDANDO_CADASTRO',
          dataPerda: null,
          motivoPerda: null,
          concorrenteGanhou: null,
          detalhesPerda: null,
          dataAprovacaoCadastro: null,
          aprovadoPorId: null,
          metadata: {
            ...((documento.metadata as any) || {}),
            aguardandoAprovacaoPerda: false,
            perdaRejeitadaPor: request.user.sub,
            perdaRejeitadaEm: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(documentosVenda.id, id))
        .returning();

      await addHistorico(
        id,
        'REJEICAO_PERDA',
        'Perda rejeitada pelo cadastro - documento retorna para processamento',
        request.user.sub,
        request.user.nome,
        statusAnterior,
        'AGUARDANDO_CADASTRO',
      );

      return { ...ok(updated), message: 'Perda rejeitada - documento retorna para cadastro' };
    },
  );

  // Get document history
  fastify.get(
    '/:id/history',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Obter histórico do documento',
        description:
          'Obtém o histórico completo de eventos e alterações de um documento de venda, ordenado por data decrescente.',
        ...documentosVendaDocs.historico,
      },
      preHandler: [
        authorizeAny([
          'vendas:visualizar_documento_venda',
          'vendas:visualizar_todos_documentos',
        ]),
      ],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (
        !request.user.isAdmin &&
        !request.user.permissoes.includes(
          'vendas:visualizar_todos_documentos',
        ) &&
        documento.vendedorId !== request.user.sub &&
        documento.atuanteId !== request.user.sub
      ) {
        throw new OwnershipError('Você não tem acesso a este documento');
      }

      const historico = await db.query.historicoDocumentoVenda.findMany({
        where: eq(historicoDocumentoVenda.documentoVendaId, id),
        orderBy: (h, { desc }) => [desc(h.createdAt)],
      });

      return ok(historico);
    },
  );

  // Add annotation
  fastify.post(
    '/:id/add-note',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Adicionar anotação',
        description:
          'Adiciona uma anotação ao histórico de um documento de venda para rastreamento de comunicações e observações.',
        ...documentosVendaDocs.adicionarAnotacao,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);
      const { descricao } = adicionarAnotacaoSchema.parse(request.body);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      await addHistorico(
        id,
        'ANOTACAO',
        descricao,
        request.user.sub,
        request.user.nome,
      );

      return { success: true as const, message: 'Anotação adicionada' };
    },
  );

  // Archive document
  fastify.post(
    '/:id/archive',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Arquivar documento',
        description:
          'Arquiva um documento ativo, marcando-o como arquivado para organização. O documento não aparecerá mais em listagens padrão.',
        ...documentosVendaDocs.arquivar,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (documento.status !== 'ATIVO') {
        throw new ValidationError('Só é possível arquivar documentos ativos');
      }

      const statusAnterior = documento.status;

      const [updated] = await db
        .update(documentosVenda)
        .set({
          status: 'ARQUIVADO',
          updatedAt: new Date(),
        })
        .where(eq(documentosVenda.id, id))
        .returning();

      await addHistorico(
        id,
        'ALTERACAO_STATUS',
        'Documento arquivado',
        request.user.sub,
        request.user.nome,
        statusAnterior,
        'ARQUIVADO',
      );

      return { ...ok(updated), message: 'Documento arquivado com sucesso' };
    },
  );

  // Lock document for editing
  fastify.post(
    '/:id/lock',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Bloquear documento para edição',
        description:
          'Bloqueia um documento para edição exclusiva do usuário atual. O bloqueio expira automaticamente após 15 minutos de inatividade.',
        ...documentosVendaDocs.lock,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request, reply) => {
      const { id } = uuidParamSchema.parse(request.params);
      const { usuarios } = await import('@ecotech/shared/database');

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
        with: {
          lockedBy: {
            columns: {
              id: true,
              nome: true,
            },
          },
        } as any,
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      const now = new Date();

      // Verificar se já está bloqueado
      if (documento.lockedById && documento.lockExpiresAt) {
        const lockExpiresAt = new Date(documento.lockExpiresAt);

        // Se o bloqueio ainda não expirou
        if (lockExpiresAt > now) {
          // Se é o mesmo usuário, renovar o lock
          if (documento.lockedById === request.user.sub) {
            const newExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // +15 minutos

            const [updated] = await db
              .update(documentosVenda)
              .set({
                lockedAt: now,
                lockExpiresAt: newExpiresAt,
                updatedAt: now,
              })
              .where(eq(documentosVenda.id, id))
              .returning();

            return reply.status(200).send({
              ...ok({
                ...updated,
                lockedById: (documento as any).lockedBy?.id ?? updated.lockedById,
              }),
              message: 'Bloqueio renovado',
            });
          }

          // Outro usuário tem o lock
          return reply.status(423).send({
            success: false,
            error: { code: 'DOCUMENT_LOCKED', message: `Este documento está sendo editado por ${(documento as any).lockedBy?.nome || 'outro usuário'}` },
          });
        }
      }

      // Criar novo bloqueio
      const lockExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // +15 minutos

      const [updated] = await db
        .update(documentosVenda)
        .set({
          lockedById: request.user.sub,
          lockedAt: now,
          lockExpiresAt,
          updatedAt: now,
        })
        .where(eq(documentosVenda.id, id))
        .returning();

      const usuario = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: {
          id: true,
          nome: true,
        },
      });

      return reply.status(200).send({
        ...ok({
          ...updated,
          lockedById: usuario?.id ?? updated.lockedById,
        }),
        message: 'Documento bloqueado para edição',
      });
    },
  );

  // Unlock document
  fastify.post(
    '/:id/unlock',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Desbloquear documento',
        description:
          'Desbloqueia um documento, permitindo que outros usuários possam editá-lo. Apenas quem bloqueou ou admins podem desbloquear.',
        ...documentosVendaDocs.unlock,
      },
      preHandler: [authorize(['vendas:editar_documento_venda'])],
    },
    async (request, reply) => {
      const { id } = uuidParamSchema.parse(request.params);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      // Verificar se o documento está bloqueado
      if (!documento.lockedById) {
        return reply.status(200).send({
          success: true as const,
          message: 'Documento já está desbloqueado',
        });
      }

      // Verificar se é o próprio usuário ou um admin
      const canManageLocks =
        request.user.isAdmin || request.user.permissoes.includes('vendas:gerenciar_locks');
      const isOwner = documento.lockedById === request.user.sub;

      if (!isOwner && !canManageLocks) {
        throw new OwnershipError(
          'Você não tem permissão para desbloquear este documento',
        );
      }

      const [updated] = await db
        .update(documentosVenda)
        .set({
          lockedById: null,
          lockedAt: null,
          lockExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(documentosVenda.id, id))
        .returning();

      return reply.status(200).send({
        ...ok(updated),
        message: 'Documento desbloqueado',
      });
    },
  );

  // Check lock status
  fastify.get(
    '/:id/lock-status',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Verificar status de bloqueio',
        description:
          'Verifica se um documento está bloqueado e por quem, incluindo informações de expiração.',
        ...documentosVendaDocs.lockStatus,
      },
      preHandler: [
        authorizeAny([
          'vendas:visualizar_documento_venda',
          'vendas:visualizar_todos_documentos',
        ]),
      ],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
        with: {
          lockedBy: {
            columns: {
              id: true,
              nome: true,
            },
          },
        } as any,
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      const now = new Date();
      let isLocked = false;
      let isLockedByCurrentUser = false;

      if (documento.lockedById && documento.lockExpiresAt) {
        const lockExpiresAt = new Date(documento.lockExpiresAt);
        isLocked = lockExpiresAt > now;
        isLockedByCurrentUser =
          isLocked && documento.lockedById === request.user.sub;
      }

      return ok({
        isLocked,
        isLockedByCurrentUser,
        lockedBy: isLocked ? (documento as any).lockedBy : null,
        lockedAt: isLocked ? documento.lockedAt : null,
        lockExpiresAt: isLocked ? documento.lockExpiresAt : null,
      });
    },
  );

  // Solicitar inclusão de item em documento ativo
  fastify.post(
    '/:id/request-inclusion',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Solicitar inclusão de item',
        description:
          'Solicita a inclusão de um novo item em um documento ativo, reencaminhando-o para AGUARDANDO_CADASTRO.',
        ...documentosVendaDocs.solicitarInclusao,
      },
      preHandler: [authorize(['vendas:criar_cotacao'])],
    },
    async (request) => {
      const { id } = uuidParamSchema.parse(request.params);
      const body = request.body as {
        produtoId?: string;
        seguradoraParceiraId?: string;
        vigenciaInicio?: string;
        vigenciaFim?: string;
        premioLiquido?: number;
        itemDescricao?: string;
        observacoes: string;
        novoVendedorId?: string;
      };

      if (!body.observacoes || body.observacoes.trim().length < 10) {
        throw new ValidationError(
          'Observação é obrigatória e deve ter no mínimo 10 caracteres',
        );
      }

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (documento.status !== 'ATIVO') {
        throw new ValidationError(
          'Só é possível solicitar inclusão em documentos ativos',
        );
      }

      const inclusaoData = {
        solicitadoEm: new Date().toISOString(),
        solicitadoPorId: request.user.sub,
        solicitadoPorNome: request.user.nome,
        produtoId: body.produtoId ?? null,
        seguradoraParceiraId: body.seguradoraParceiraId ?? null,
        vigenciaInicio: body.vigenciaInicio ?? null,
        vigenciaFim: body.vigenciaFim ?? null,
        premioLiquido: body.premioLiquido ?? null,
        itemDescricao: body.itemDescricao ?? null,
        observacoes: body.observacoes,
        novoVendedorId: body.novoVendedorId ?? null,
      };

      const metadataAtual = (documento.metadata as Record<string, unknown>) ?? {};
      const inclusoesAnteriores = (metadataAtual.inclusoes as unknown[]) ?? [];

      const [updated] = await db
        .update(documentosVenda)
        .set({
          status: 'AGUARDANDO_CADASTRO',
          dataSolicitacaoCadastro: new Date(),
          dataAprovacaoCadastro: null,
          aprovadoPorId: null,
          dataRejeicaoCadastro: null,
          rejeitadoPorId: null,
          motivoRejeicao: null,
          ...(body.novoVendedorId ? { vendedorId: body.novoVendedorId } : {}),
          metadata: {
            ...metadataAtual,
            inclusoes: [...inclusoesAnteriores, inclusaoData],
          },
          updatedAt: new Date(),
        })
        .where(eq(documentosVenda.id, id))
        .returning();

      await addHistorico(
        id,
        'ALTERACAO_STATUS',
        `Inclusão de item solicitada: ${body.observacoes}`,
        request.user.sub,
        request.user.nome,
        'ATIVO',
        'AGUARDANDO_CADASTRO',
        { inclusao: inclusaoData },
      );

      return { ...ok(updated), message: 'Inclusão solicitada com sucesso' };
    },
  );

  // --- COMENTÁRIOS ---

  fastify.get(
    '/:id/comments',
    {
      schema: { tags: ['Documentos de Venda'], summary: 'Listar comentários de um documento de venda', ...documentosVendaDocs.listarComentarios },
      preHandler: [authorizeAny(['vendas:visualizar_documento_venda', 'vendas:visualizar_todos_documentos'])],
    },
    async (request) => {
      const { comentarios } = await import('@ecotech/shared/database');
      const { id } = uuidParamSchema.parse(request.params);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(eq(documentosVenda.id, id), eq(documentosVenda.corretoraId, request.corretoraId), isNull(documentosVenda.deletedAt)),
      });
      if (!documento) throw new NotFoundError('Documento de venda');

      // Busca comentários diretos do documento + comentários das cotações vinculadas
      const cotacoesVinculadas = await db.query.cotacoes.findMany({
        where: eq(cotacoes.documentoVendaId, id),
        columns: { id: true },
      });
      const cotacaoIds = cotacoesVinculadas.map((c) => c.id);

      const entidadeIds = [id, ...cotacaoIds];
      const rows = await db
        .select({
          id: comentarios.id,
          parentId: comentarios.parentId,
          texto: comentarios.texto,
          createdAt: comentarios.createdAt,
          autor: { id: usuarios.id, nome: usuarios.nome, avatarR2Key: usuarios.avatarR2Key },
        })
        .from(comentarios)
        .innerJoin(usuarios, eq(comentarios.autorId, usuarios.id))
        .where(and(eq(comentarios.corretoraId, request.corretoraId), inArray(comentarios.entidadeId, entidadeIds)))
        .orderBy(comentarios.createdAt);

      // getAvatarUrl já deduplica via Redis — mesmo r2Key nunca chama S3 duas vezes
      const withAvatars = await Promise.all(
        rows.map(async (c) => ({
          ...c,
          autor: {
            id: c.autor.id,
            nome: c.autor.nome,
            avatarUrl: await getAvatarUrl(c.autor.avatarR2Key),
          },
        })),
      );

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

  fastify.post(
    '/:id/comments',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Adicionar comentário a um documento de venda',
        ...documentosVendaDocs.adicionarComentario,
      },
      preHandler: [authorizeAny(['vendas:visualizar_documento_venda', 'vendas:visualizar_todos_documentos'])],
    },
    async (request, reply) => {
      const { comentarios } = await import('@ecotech/shared/database');
      const { id } = uuidParamSchema.parse(request.params);
      const { texto, parentId } = request.body as { texto: string; parentId?: string | null };

      const documento = await db.query.documentosVenda.findFirst({
        where: and(eq(documentosVenda.id, id), eq(documentosVenda.corretoraId, request.corretoraId), isNull(documentosVenda.deletedAt)),
      });
      if (!documento) throw new NotFoundError('Documento de venda');

      const [inserted] = await db
        .insert(comentarios)
        .values({
          corretoraId: request.corretoraId,
          entidadeTipo: 'documento_venda',
          entidadeId: id,
          autorId: request.user.sub,
          parentId: parentId ?? null,
          texto: texto.trim(),
        })
        .returning();

      const autor = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { id: true, nome: true, avatarR2Key: true },
      });

      const avatarUrl = await getAvatarUrl(autor?.avatarR2Key ?? null);

      return reply.status(201).send(ok({
        ...inserted,
        replies: [],
        autor: { id: autor?.id ?? request.user.sub, nome: autor?.nome ?? request.user.nome, avatarUrl },
      }));
    },
  );

  // Solicitar exclusão de venda confirmada (cadastro)
  fastify.post(
    '/:id/request-deletion',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Solicitar exclusão de venda',
        description:
          'Solicita a exclusão de uma venda em AGUARDANDO_CADASTRO. Um administrador com permissão aceitar_exclusao:venda deve aprovar.',
        ...documentosVendaDocs.solicitarExclusao,
      },
      preHandler: [authorize(['cadastro:acessar'])],
    },
    async (request, reply) => {
      const { solicitacoesExclusaoVenda } = await import(
        '@ecotech/shared/database'
      );

      const { id } = uuidParamSchema.parse(request.params);
      const { motivo } = solicitarExclusaoVendaSchema.parse(request.body);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) throw new NotFoundError('Documento de venda');

      if (documento.status !== 'AGUARDANDO_CADASTRO') {
        throw new ValidationError(
          'Só é possível solicitar exclusão de vendas em status AGUARDANDO_CADASTRO',
        );
      }

      // Verificar se já existe solicitação pendente
      const solicitacaoExistente = await db.query.solicitacoesExclusaoVenda.findFirst({
        where: and(
          eq(solicitacoesExclusaoVenda.documentoVendaId, id),
          eq(solicitacoesExclusaoVenda.status, 'PENDENTE'),
        ),
      });

      if (solicitacaoExistente) {
        throw new ValidationError(
          'Já existe uma solicitação de exclusão pendente para esta venda',
        );
      }

      const [solicitacao] = await db
        .insert(solicitacoesExclusaoVenda)
        .values({
          corretoraId: request.corretoraId,
          documentoVendaId: id,
          solicitanteId: request.user.sub,
          motivo,
          status: 'PENDENTE',
        })
        .returning();

      await addHistorico(
        id,
        'SOLICITACAO_EXCLUSAO',
        `Exclusão solicitada${motivo ? `: ${motivo}` : ''}`,
        request.user.sub,
        request.user.nome,
      );

      return reply.status(201).send({ success: true, data: solicitacao });
    },
  );

  // Listar solicitações de exclusão de vendas pendentes (para admins)
  fastify.get(
    '/deletion-requests/pending',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Listar solicitações de exclusão de vendas pendentes',
        description:
          'Lista todas as solicitações de exclusão de vendas aguardando aprovação. Requer permissão aceitar_exclusao:venda.',
        ...documentosVendaDocs.listarSolicitacoesExclusaoPendentes,
      },
      preHandler: [authorize(['aceitar_exclusao:venda'])],
    },
    async (request, reply) => {
      const { solicitacoesExclusaoVenda } = await import(
        '@ecotech/shared/database'
      );

      const solicitacoes = await db.query.solicitacoesExclusaoVenda.findMany({
        where: and(
          eq(solicitacoesExclusaoVenda.corretoraId, request.corretoraId),
          eq(solicitacoesExclusaoVenda.status, 'PENDENTE'),
        ),
        with: {
          documentoVenda: {
            with: {
              cliente: {
                columns: { id: true, nome: true, razaoSocial: true, tipoPessoa: true },
              },
              produto: {
                columns: { id: true, nomeProduto: true },
              },
              vendedor: {
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

      return reply.send({ success: true, data: solicitacoes });
    },
  );

  // Aceitar exclusão de venda
  fastify.post(
    '/deletion-requests/:id/accept',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Aceitar solicitação de exclusão de venda',
        description:
          'Aceita a exclusão de uma venda, cancelando-a e mantendo histórico. Requer permissão aceitar_exclusao:venda.',
        ...documentosVendaDocs.aceitarExclusao,
      },
      preHandler: [authorize(['aceitar_exclusao:venda'])],
    },
    async (request, reply) => {
      const { solicitacoesExclusaoVenda } = await import(
        '@ecotech/shared/database'
      );

      const { id } = uuidParamSchema.parse(request.params);

      const solicitacao = await db.query.solicitacoesExclusaoVenda.findFirst({
        where: and(
          eq(solicitacoesExclusaoVenda.id, id),
          eq(solicitacoesExclusaoVenda.corretoraId, request.corretoraId),
        ),
      });

      if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');

      if (solicitacao.status !== 'PENDENTE') {
        throw new ValidationError('Esta solicitação já foi respondida');
      }

      // Atualizar status da solicitação
      await db
        .update(solicitacoesExclusaoVenda)
        .set({
          status: 'ACEITA',
          respondidoPorId: request.user.sub,
          respondidoEm: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(solicitacoesExclusaoVenda.id, id));

      const statusAnterior = 'AGUARDANDO_CADASTRO';

      // Cancelar a venda (soft-delete via status CANCELADO)
      await db
        .update(documentosVenda)
        .set({
          status: 'CANCELADO',
          dataCancelamento: new Date(),
          motivoCancelamento: solicitacao.motivo || 'Exclusão aprovada pelo gestor',
          canceladoPorId: request.user.sub,
          updatedAt: new Date(),
        })
        .where(eq(documentosVenda.id, solicitacao.documentoVendaId));

      await addHistorico(
        solicitacao.documentoVendaId,
        'EXCLUSAO_ACEITA',
        `Exclusão aprovada por ${request.user.nome}`,
        request.user.sub,
        request.user.nome,
        statusAnterior,
        'CANCELADO',
      );

      await invalidateDocumentosVendaCache(request.corretoraId);

      return reply.send({ success: true, data: { message: 'Venda excluída com sucesso' } });
    },
  );

  // Recusar exclusão de venda
  fastify.post(
    '/deletion-requests/:id/reject',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Recusar solicitação de exclusão de venda',
        description:
          'Recusa a exclusão de uma venda. Requer permissão aceitar_exclusao:venda.',
        ...documentosVendaDocs.recusarExclusao,
      },
      preHandler: [authorize(['aceitar_exclusao:venda'])],
    },
    async (request, reply) => {
      const { solicitacoesExclusaoVenda } = await import(
        '@ecotech/shared/database'
      );

      const { id } = uuidParamSchema.parse(request.params);
      const { motivoRecusa } = recusarExclusaoVendaSchema.parse(request.body);

      const solicitacao = await db.query.solicitacoesExclusaoVenda.findFirst({
        where: and(
          eq(solicitacoesExclusaoVenda.id, id),
          eq(solicitacoesExclusaoVenda.corretoraId, request.corretoraId),
        ),
      });

      if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');

      if (solicitacao.status !== 'PENDENTE') {
        throw new ValidationError('Esta solicitação já foi respondida');
      }

      await db
        .update(solicitacoesExclusaoVenda)
        .set({
          status: 'RECUSADA',
          motivoRecusa,
          respondidoPorId: request.user.sub,
          respondidoEm: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(solicitacoesExclusaoVenda.id, id));

      await addHistorico(
        solicitacao.documentoVendaId,
        'EXCLUSAO_RECUSADA',
        `Exclusão recusada por ${request.user.nome}: ${motivoRecusa}`,
        request.user.sub,
        request.user.nome,
      );

      return reply.send({ success: true, data: { message: 'Solicitação de exclusão recusada' } });
    },
  );

  // POST /:id/vendor-change-requests — Solicitar troca de vendedor
  fastify.post(
    '/:id/vendor-change-requests',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Solicitar troca de vendedor',
        description:
          'Cria uma solicitação de troca de vendedor num documento ATIVO. Aguarda aprovação de um gestor ou admin.',
      },
      preHandler: [authorize(['vendas:solicitar_troca_vendedor'])],
    },
    async (request, reply) => {
      const { solicitacoesTrocaVendedor } = await import('@ecotech/shared/database');
      const { NotificacaoService } = await import('@ecotech/shared/database');

      const { id } = uuidParamSchema.parse(request.params);
      const { tipoVendedor, novoVendedorId, motivo } =
        solicitarTrocaVendedorSchema.parse(request.body);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
        with: {
          cliente: { columns: { id: true, nome: true, razaoSocial: true, tipoPessoa: true } },
        },
      });

      if (!documento) throw new NotFoundError('Documento de venda não encontrado');

      if (documento.status !== 'ATIVO') {
        throw new ValidationError(
          'Só é possível solicitar troca de vendedor em documentos com status ATIVO',
        );
      }

      // Determinar vendedor atual para o tipo solicitado
      const vendedorAtualId =
        tipoVendedor === 'principal'
          ? documento.vendedorId
          : tipoVendedor === 'secundario'
            ? documento.vendedorSecundarioId
            : documento.vendedorTerceiroId;

      if (!vendedorAtualId && tipoVendedor !== 'principal') {
        throw new ValidationError(
          `Este documento não possui vendedor ${tipoVendedor} cadastrado`,
        );
      }

      // Não pode trocar pelo mesmo vendedor
      if (vendedorAtualId === novoVendedorId) {
        throw new ValidationError('O novo vendedor deve ser diferente do vendedor atual');
      }

      // Verificar se o novo vendedor existe na corretora
      const novoVendedor = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, novoVendedorId),
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
        columns: { id: true, nome: true },
      });

      if (!novoVendedor) throw new NotFoundError('Novo vendedor não encontrado');

      // Bloquear se já existe solicitação pendente para o mesmo tipo
      const solicitacaoPendente = await db.query.solicitacoesTrocaVendedor.findFirst({
        where: and(
          eq(solicitacoesTrocaVendedor.documentoVendaId, id),
          eq(solicitacoesTrocaVendedor.tipoVendedor, tipoVendedor),
          eq(solicitacoesTrocaVendedor.status, 'PENDENTE'),
        ),
      });

      if (solicitacaoPendente) {
        throw new ValidationError(
          `Já existe uma solicitação de troca de vendedor ${tipoVendedor} pendente para este documento`,
        );
      }

      const [solicitacao] = await db
        .insert(solicitacoesTrocaVendedor)
        .values({
          corretoraId: request.corretoraId,
          documentoVendaId: id,
          solicitanteId: request.user.sub,
          vendedorAtualId: vendedorAtualId ?? documento.vendedorId,
          novoVendedorId,
          tipoVendedor,
          motivo,
          status: 'PENDENTE',
        })
        .returning();

      const clienteNome =
        documento.cliente.tipoPessoa === 'PJ'
          ? documento.cliente.razaoSocial
          : documento.cliente.nome;

      await addHistorico(
        id,
        'SOLICITACAO_TROCA_VENDEDOR',
        `Troca de vendedor ${tipoVendedor} solicitada por ${request.user.nome}: ${motivo}`,
        request.user.sub,
        request.user.nome,
        undefined,
        undefined,
        { tipoVendedor, novoVendedorId, novoVendedorNome: novoVendedor.nome },
      );

      await NotificacaoService.notificarSolicitacaoTrocaVendedor({
        corretoraId: request.corretoraId,
        documentoId: id,
        numeroDocumento: documento.numeroDocumento,
        clienteNome: clienteNome ?? '',
        solicitanteNome: request.user.nome,
        tipoVendedor,
        novoVendedorNome: novoVendedor.nome,
      }).catch(() => {});

      return reply.status(201).send({ success: true, data: solicitacao });
    },
  );

  // GET /:id/vendor-change-requests — Listar solicitações de troca de vendedor
  fastify.get(
    '/:id/vendor-change-requests',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Listar solicitações de troca de vendedor',
      },
      preHandler: [
        authorizeAny(['vendas:solicitar_troca_vendedor', 'vendas:aprovar_troca_vendedor']),
      ],
    },
    async (request, reply) => {
      const { solicitacoesTrocaVendedor } = await import('@ecotech/shared/database');

      const { id } = uuidParamSchema.parse(request.params);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
        columns: { id: true },
      });

      if (!documento) throw new NotFoundError('Documento de venda não encontrado');

      const solicitacoes = await db.query.solicitacoesTrocaVendedor.findMany({
        where: and(
          eq(solicitacoesTrocaVendedor.documentoVendaId, id),
          eq(solicitacoesTrocaVendedor.corretoraId, request.corretoraId),
        ),
        with: {
          solicitante: { columns: { id: true, nome: true, email: true } },
          vendedorAtual: { columns: { id: true, nome: true, email: true } },
          novoVendedor: { columns: { id: true, nome: true, email: true } },
          aprovadoPor: { columns: { id: true, nome: true } },
        },
        orderBy: (t, { desc }) => desc(t.createdAt),
      });

      return reply.send({ success: true, data: solicitacoes });
    },
  );

  // POST /:id/vendor-change-requests/:requestId/approve — Aprovar troca de vendedor
  fastify.post(
    '/:id/vendor-change-requests/:requestId/approve',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Aprovar solicitação de troca de vendedor',
      },
      preHandler: [authorize(['vendas:aprovar_troca_vendedor'])],
    },
    async (request, reply) => {
      const { solicitacoesTrocaVendedor } = await import('@ecotech/shared/database');
      const { NotificacaoService } = await import('@ecotech/shared/database');

      const { id, requestId } = request.params as { id: string; requestId: string };

      const solicitacao = await db.query.solicitacoesTrocaVendedor.findFirst({
        where: and(
          eq(solicitacoesTrocaVendedor.id, requestId),
          eq(solicitacoesTrocaVendedor.documentoVendaId, id),
          eq(solicitacoesTrocaVendedor.corretoraId, request.corretoraId),
        ),
        with: {
          novoVendedor: { columns: { id: true, nome: true } },
          solicitante: { columns: { id: true, nome: true } },
        },
      });

      if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');

      if (solicitacao.status !== 'PENDENTE') {
        throw new ValidationError('Esta solicitação já foi respondida');
      }

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
        with: {
          cliente: { columns: { id: true, nome: true, razaoSocial: true, tipoPessoa: true } },
        },
      });

      if (!documento) throw new NotFoundError('Documento de venda não encontrado');

      // Atualizar a solicitação (WHERE status = 'PENDENTE' para proteção de double-click)
      const [updated] = await db
        .update(solicitacoesTrocaVendedor)
        .set({
          status: 'APROVADA',
          aprovadoPorId: request.user.sub,
          dataAprovacao: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(solicitacoesTrocaVendedor.id, requestId),
            eq(solicitacoesTrocaVendedor.status, 'PENDENTE'),
          ),
        )
        .returning();

      if (!updated) {
        throw new ValidationError('Esta solicitação já foi processada por outra requisição');
      }

      // Atualizar o campo correto no documento
      const campoVendedor =
        solicitacao.tipoVendedor === 'principal'
          ? { vendedorId: solicitacao.novoVendedorId }
          : solicitacao.tipoVendedor === 'secundario'
            ? { vendedorSecundarioId: solicitacao.novoVendedorId }
            : { vendedorTerceiroId: solicitacao.novoVendedorId };

      await db
        .update(documentosVenda)
        .set({ ...campoVendedor, updatedAt: new Date() })
        .where(eq(documentosVenda.id, id));

      // Recalcular comissões
      await calculateCommissions(id, request.corretoraId).catch(() => {});

      const clienteNome =
        documento.cliente.tipoPessoa === 'PJ'
          ? documento.cliente.razaoSocial
          : documento.cliente.nome;

      await addHistorico(
        id,
        'TROCA_VENDEDOR_APROVADA',
        `Troca de vendedor ${solicitacao.tipoVendedor} aprovada por ${request.user.nome}: novo vendedor ${solicitacao.novoVendedor.nome}`,
        request.user.sub,
        request.user.nome,
        undefined,
        undefined,
        {
          tipoVendedor: solicitacao.tipoVendedor,
          novoVendedorId: solicitacao.novoVendedorId,
          novoVendedorNome: solicitacao.novoVendedor.nome,
        },
      );

      await NotificacaoService.notificarTrocaVendedorAprovada({
        corretoraId: request.corretoraId,
        documentoId: id,
        numeroDocumento: documento.numeroDocumento,
        clienteNome: clienteNome ?? '',
        aprovadoPorNome: request.user.nome,
        tipoVendedor: solicitacao.tipoVendedor,
        novoVendedorNome: solicitacao.novoVendedor.nome,
        solicitanteId: solicitacao.solicitanteId,
      }).catch(() => {});

      await invalidateDocumentosVendaCache(request.corretoraId);

      return reply.send({ success: true, data: { message: 'Troca de vendedor aprovada com sucesso' } });
    },
  );

  // POST /:id/vendor-change-requests/:requestId/reject — Recusar troca de vendedor
  fastify.post(
    '/:id/vendor-change-requests/:requestId/reject',
    {
      schema: {
        tags: ['Documentos de Venda'],
        summary: 'Recusar solicitação de troca de vendedor',
      },
      preHandler: [authorize(['vendas:aprovar_troca_vendedor'])],
    },
    async (request, reply) => {
      const { solicitacoesTrocaVendedor } = await import('@ecotech/shared/database');
      const { NotificacaoService } = await import('@ecotech/shared/database');

      const { id, requestId } = request.params as { id: string; requestId: string };
      const { motivoRecusa } = recusarTrocaVendedorSchema.parse(request.body);

      const solicitacao = await db.query.solicitacoesTrocaVendedor.findFirst({
        where: and(
          eq(solicitacoesTrocaVendedor.id, requestId),
          eq(solicitacoesTrocaVendedor.documentoVendaId, id),
          eq(solicitacoesTrocaVendedor.corretoraId, request.corretoraId),
        ),
        with: {
          novoVendedor: { columns: { id: true, nome: true } },
        },
      });

      if (!solicitacao) throw new NotFoundError('Solicitação não encontrada');

      if (solicitacao.status !== 'PENDENTE') {
        throw new ValidationError('Esta solicitação já foi respondida');
      }

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
        with: {
          cliente: { columns: { id: true, nome: true, razaoSocial: true, tipoPessoa: true } },
        },
      });

      if (!documento) throw new NotFoundError('Documento de venda não encontrado');

      await db
        .update(solicitacoesTrocaVendedor)
        .set({
          status: 'RECUSADA',
          motivoRecusa,
          aprovadoPorId: request.user.sub,
          dataRecusa: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(solicitacoesTrocaVendedor.id, requestId),
            eq(solicitacoesTrocaVendedor.status, 'PENDENTE'),
          ),
        );

      const clienteNome =
        documento.cliente.tipoPessoa === 'PJ'
          ? documento.cliente.razaoSocial
          : documento.cliente.nome;

      await addHistorico(
        id,
        'TROCA_VENDEDOR_RECUSADA',
        `Troca de vendedor ${solicitacao.tipoVendedor} recusada por ${request.user.nome}: ${motivoRecusa}`,
        request.user.sub,
        request.user.nome,
      );

      await NotificacaoService.notificarTrocaVendedorRecusada({
        corretoraId: request.corretoraId,
        documentoId: id,
        numeroDocumento: documento.numeroDocumento,
        clienteNome: clienteNome ?? '',
        recusadoPorNome: request.user.nome,
        tipoVendedor: solicitacao.tipoVendedor,
        novoVendedorNome: solicitacao.novoVendedor.nome,
        motivoRecusa,
        solicitanteId: solicitacao.solicitanteId,
      }).catch(() => {});

      return reply.send({ success: true, data: { message: 'Solicitação de troca de vendedor recusada' } });
    },
  );

  // GET /documentos-venda/:id/sinistros — Sinistros de um documento
  // Acessível a qualquer usuário que possa ver o documento (cadastro, sinistros, etc.)
  // sem exigir as permissões do módulo de sinistros.
  fastify.get(
    '/:id/sinistros',
    {
      schema: { tags: ['Documentos de Venda'], summary: 'Listar sinistros de um documento' },
      preHandler: [authorizeAny(['vendas:visualizar_documento_venda', 'vendas:visualizar_todos_documentos', 'cadastro:acessar', 'sinistros:visualizar', 'sinistros:criar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const doc = await db.query.documentosVenda.findFirst({
        where: and(eq(documentosVenda.id, id), eq(documentosVenda.corretoraId, request.corretoraId)),
        columns: { id: true },
      });
      if (!doc) throw new NotFoundError('Documento não encontrado');

      const rows = await db.query.sinistros.findMany({
        where: and(
          eq(sinistros.documentoVendaId, id),
          eq(sinistros.corretoraId, request.corretoraId),
          isNull(sinistros.deletedAt),
        ),
        orderBy: [desc(sinistros.createdAt)],
        with: {
          solicitante: { columns: { id: true, nome: true, email: true } },
        },
      });

      return reply.send({ success: true, data: rows });
    },
  );
};

export default documentosVendaRoutes;
