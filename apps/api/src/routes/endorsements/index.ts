import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { endossosDocs } from '../../docs/endossos/schemas.js';
import { ok } from '../../docs/index.js';
import { z } from 'zod';
import { db, NotificacaoService } from '@ecotech/shared/database';
import { generateEndorsementAdjustmentEntry } from '../../utils/comissao-lancamentos.js';
import {
  endossos,
  documentosVenda,
  historicoDocumentoVenda,
  clientes,
  produtos,
  usuarios,
} from '@ecotech/shared/database';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { authorize, authorizeAny } from '@ecotech/plugins/authorization';
import {
  NotFoundError,
  UnprocessableEntityError,
  ForbiddenError,
  OwnershipError,
} from '@ecotech/shared/utils';
import {
  getPaginationParams,
  createPaginatedResult,
  generateNumeroEndosso,
  generateNumeroDocumentoVenda,
} from '@ecotech/shared/utils';

const createEndossoSchema = z.object({
  documentoVendaId: z.string().uuid(),
  tipoEndosso: z.enum([
    'INCLUSAO_COBERTURA',
    'EXCLUSAO_COBERTURA',
    'ALTERACAO_VALOR',
    'INCLUSAO_ITEM',
    'EXCLUSAO_ITEM',
    'ALTERACAO_DADOS',
    'ALTERACAO_VIGENCIA',
    'TRANSFERENCIA_SEGURADO',
    'SUBSTITUICAO_VEICULO',
    'CANCELAMENTO',
    'OUTROS',
  ]),
  descricao: z.string().max(2000),
  motivoEndosso: z.string().max(1000).optional(),
  premioNovo: z.coerce.number().min(0).optional(),
  percentualComissaoNovo: z.coerce.number().min(0).max(100).optional(),
  alteracoes: z.record(z.string(), z.unknown()).optional(),
  dataVigenciaEndosso: z.string(),
  observacoes: z.string().max(2000).optional(),
});

const listEndossosQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).optional(),
  documentoVendaId: z.string().uuid().optional(),
  vendedorId: z.string().uuid().optional(),
  tipoEndosso: z
    .enum([
      'INCLUSAO_COBERTURA',
      'EXCLUSAO_COBERTURA',
      'ALTERACAO_VALOR',
      'INCLUSAO_ITEM',
      'EXCLUSAO_ITEM',
      'ALTERACAO_DADOS',
      'ALTERACAO_VIGENCIA',
      'TRANSFERENCIA_SEGURADO',
      'SUBSTITUICAO_VEICULO',
      'CANCELAMENTO',
      'OUTROS',
    ])
    .optional(),
  status: z
    .enum([
      'SOLICITADO',
      'EM_VALIDACAO',
      'APROVADO',
      'RECUSADO',
      'EMITIDO',
      'CANCELADO',
    ])
    .optional(),
});

const recusarEndossoSchema = z.object({
  motivoRecusa: z.string().max(1000),
});

const emitirEndossoSchema = z.object({
  numeroEndossoExterno: z.string().max(100).optional(),
});

const tipoEndossoValues = [
  'INCLUSAO_COBERTURA',
  'EXCLUSAO_COBERTURA',
  'ALTERACAO_VALOR',
  'INCLUSAO_ITEM',
  'EXCLUSAO_ITEM',
  'ALTERACAO_DADOS',
  'ALTERACAO_VIGENCIA',
  'TRANSFERENCIA_SEGURADO',
  'SUBSTITUICAO_VEICULO',
  'CANCELAMENTO',
  'OUTROS',
] as const;

const createEndossoExternoSchema = z.object({
  // Dados do documento de venda
  clienteId: z.string().uuid(),
  vendedorId: z.string().uuid().optional(), // vendedor principal; se omitido, usa o vendedor do cliente
  produtoId: z.string().uuid(),
  seguradoraParceiraId: z.string().uuid().optional(),
  numeroPropostaExterna: z.string().min(1).max(100),
  vigenciaInicio: z.string(),
  vigenciaFim: z.string(),
  premioLiquido: z.coerce.number().min(0),
  percentualComissao: z.coerce.number().min(0).max(100).optional(),
  observacoesDocumento: z.string().max(2000).optional(),
  // Dados do endosso
  tipoEndosso: z.enum(tipoEndossoValues),
  descricao: z.string().max(2000),
  motivoEndosso: z.string().max(1000).optional(),
  premioNovo: z.coerce.number().min(0).optional(),
  percentualComissaoNovo: z.coerce.number().min(0).max(100).optional(),
  dataVigenciaEndosso: z.string(),
  observacoesEndosso: z.string().max(2000).optional(),
});

const endossosRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // Register external endorsement (creates policy + endorsement atomically)
  fastify.post(
    '/external',
    {
      schema: {
        tags: ['Endossos'],
        summary: 'Registrar endosso externo',
        description:
          'Cria uma apólice externa já ativa e registra imediatamente o endosso recebido da seguradora. Operação atômica: se o endosso falhar, o documento não é persistido.',
        ...endossosDocs.criarExterno,
      },
      preHandler: [authorize(['vendas:criar_endosso'])],
    },
    async (request, reply) => {
      const data = createEndossoExternoSchema.parse(request.body);

      // Validate client
      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, data.clienteId),
          eq(clientes.corretoraId, request.corretoraId),
          isNull(clientes.deletedAt),
        ),
      });
      if (!cliente) throw new NotFoundError('Cliente');

      // Validate product
      const produto = await db.query.produtos.findFirst({
        where: and(
          eq(produtos.id, data.produtoId),
          eq(produtos.corretoraId, request.corretoraId),
          eq(produtos.ativo, true),
          isNull(produtos.deletedAt),
        ),
      });
      if (!produto) throw new NotFoundError('Produto');

      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lockKey = `endosso-externo-seq:${request.corretoraId}:${yearMonth}`;

      // Calculate commission
      const premioLiquido = data.premioLiquido;
      const percentualComissao =
        data.percentualComissao ??
        (produto.percentualComissaoPadrao
          ? parseFloat(produto.percentualComissaoPadrao)
          : 0);
      const valorComissao = (premioLiquido * percentualComissao) / 100;

      // Calculate endorsement values
      const premioNovo = data.premioNovo ?? premioLiquido;
      const percentualComissaoNovo =
        data.percentualComissaoNovo ?? percentualComissao;
      const diferencaPremio = premioNovo - premioLiquido;
      const comissaoAnterior = valorComissao;
      const comissaoNova = (premioNovo * percentualComissaoNovo) / 100;
      const diferencaComissao = comissaoNova - comissaoAnterior;

      // Vendedor principal: usa o informado no body, senão o vendedor já atribuído ao cliente
      // Quem registra o endosso externo é o atuante (não necessariamente o dono da venda)
      const vendedorPrincipalId =
        data.vendedorId ?? cliente.vendedorId ?? request.user.sub;

      // Buscar gestorId antes da transação para incluir na notificação atomicamente
      const vendedorRow = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, vendedorPrincipalId),
        columns: { gestorId: true },
      });

      // Atomic transaction: create document + endorsement + notification.
      // Lock exclusivo por (corretora, mês) serializa a geração de números
      // sequenciais, evitando violação do unique constraint em concorrência.
      const result = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`,
        );

        const docCountResult = await tx
          .select({ count: sql<number>`count(*)` })
          .from(documentosVenda)
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              sql`EXTRACT(YEAR FROM ${documentosVenda.createdAt}) = ${now.getFullYear()}`,
              sql`EXTRACT(MONTH FROM ${documentosVenda.createdAt}) = ${now.getMonth() + 1}`,
            ),
          );
        const numeroDocumento = generateNumeroDocumentoVenda(
          'VENDA_EXPRESSA',
          Number(docCountResult[0]?.count ?? 0) + 1,
        );

        const endossoCountResult = await tx
          .select({ count: sql<number>`count(*)` })
          .from(endossos)
          .where(
            and(
              eq(endossos.corretoraId, request.corretoraId),
              sql`EXTRACT(YEAR FROM ${endossos.createdAt}) = ${now.getFullYear()}`,
              sql`EXTRACT(MONTH FROM ${endossos.createdAt}) = ${now.getMonth() + 1}`,
            ),
          );
        const numeroEndosso = generateNumeroEndosso(
          Number(endossoCountResult[0]?.count ?? 0) + 1,
        );

        const [documento] = await tx
          .insert(documentosVenda)
          .values({
            corretoraId: request.corretoraId,
            clienteId: data.clienteId,
            vendedorId: vendedorPrincipalId,
            atuanteId: request.user.sub,
            produtoId: data.produtoId,
            seguradoraParceiraId: data.seguradoraParceiraId,
            numeroDocumento,
            tipoDocumento: 'VENDA_EXPRESSA',
            status: 'ATIVO',
            numeroPropostaExterna: data.numeroPropostaExterna,
            vigenciaInicio: data.vigenciaInicio,
            vigenciaFim: data.vigenciaFim,
            moeda: 'BRL',
            premioLiquido: premioLiquido.toString(),
            percentualComissao: percentualComissao.toString(),
            valorComissao: valorComissao.toString(),
            observacoes: data.observacoesDocumento,
            negocioCorretora: true,
          })
          .returning();

        await tx.insert(historicoDocumentoVenda).values({
          documentoVendaId: documento.id,
          tipoEvento: 'CRIACAO',
          usuarioId: request.user.sub,
          usuarioNome: request.user.nome,
          descricao: 'Apólice externa registrada via Endosso Externo',
          statusNovo: 'ATIVO',
        });

        const [endosso] = await tx
          .insert(endossos)
          .values({
            corretoraId: request.corretoraId,
            documentoVendaId: documento.id,
            vendedorId: vendedorPrincipalId,
            tipoEndosso: data.tipoEndosso,
            numeroEndosso,
            status: 'SOLICITADO',
            descricao: data.descricao,
            motivoEndosso: data.motivoEndosso,
            premioAnterior: premioLiquido.toString(),
            premioNovo: premioNovo.toString(),
            diferencaPremio: diferencaPremio.toString(),
            percentualComissaoAnterior: percentualComissao.toString(),
            percentualComissaoNovo: percentualComissaoNovo.toString(),
            diferencaComissao: diferencaComissao.toString(),
            dataVigenciaEndosso: data.dataVigenciaEndosso,
            dataSolicitacao: new Date(),
            observacoes: data.observacoesEndosso,
          })
          .returning();

        await tx.insert(historicoDocumentoVenda).values({
          documentoVendaId: documento.id,
          tipoEvento: 'ENDOSSO_CRIADO',
          usuarioId: request.user.sub,
          usuarioNome: request.user.nome,
          descricao: `Endosso externo ${numeroEndosso} registrado por ${request.user.nome}: ${data.tipoEndosso}`,
          dadosAlterados: { endossoId: endosso.id },
        });

        // Notificação dentro da transação: garante que se o endosso for commitado,
        // o vendedor/gestor são notificados atomicamente
        await NotificacaoService.notificarEndossoSolicitado(
          {
            corretoraId: request.corretoraId,
            endossoId: endosso.id,
            documentoId: documento.id,
            clienteNome: cliente.nome || cliente.razaoSocial || 'Cliente',
            tipoEndosso: data.tipoEndosso,
            solicitanteNome: request.user.nome,
            vendedorId: vendedorPrincipalId,
            gestorId: vendedorRow?.gestorId,
          },
          tx,
        );

        return { documento, endosso };
      });

      return reply.status(201).send(ok(result));
    },
  );

  // Create endorsement
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Endossos'],
        summary: 'Criar novo endosso',
        description:
          'Cria um novo endosso para um documento de venda ativo, alterando coberturas, valores ou outros detalhes da apólice.',
        ...endossosDocs.criar,
      },
      preHandler: [authorize(['vendas:criar_endosso'])],
    },
    async (request, reply) => {
      const data = createEndossoSchema.parse(request.body);

      // Validate document exists and is active
      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, data.documentoVendaId),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });

      if (!documento) {
        throw new NotFoundError('Documento de venda');
      }

      if (documento.status !== 'ATIVO') {
        throw new UnprocessableEntityError(
          'Só é possível criar endossos para documentos ativos',
        );
      }

      // Verificar se já existe endosso SOLICITADO para este documento
      const endossoPendente = await db.query.endossos.findFirst({
        where: and(
          eq(endossos.documentoVendaId, data.documentoVendaId),
          eq(endossos.corretoraId, request.corretoraId),
          eq(endossos.status, 'SOLICITADO'),
          isNull(endossos.deletedAt),
        ),
      });

      if (endossoPendente) {
        throw new UnprocessableEntityError(
          `Já existe um endosso pendente para este documento (${endossoPendente.numeroEndosso}). Aguarde a aprovação ou recusa antes de solicitar um novo.`,
        );
      }

      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lockKey = `endosso-seq:${request.corretoraId}:${yearMonth}`;

      // Calculate differences
      const premioAnterior = parseFloat(documento.premioLiquido || '0');
      const premioNovo = data.premioNovo ?? premioAnterior;
      const diferencaPremio = premioNovo - premioAnterior;

      const percentualComissaoAnterior = parseFloat(
        documento.percentualComissao || '0',
      );
      const percentualComissaoNovo =
        data.percentualComissaoNovo ?? percentualComissaoAnterior;
      const comissaoAnterior =
        (premioAnterior * percentualComissaoAnterior) / 100;
      const comissaoNova = (premioNovo * percentualComissaoNovo) / 100;
      const diferencaComissao = comissaoNova - comissaoAnterior;

      // Buscar gestorId e nome do cliente antes da transação para notificar atomicamente
      const [vendedorDonoRow, clienteEndossoRow] = await Promise.all([
        db.query.usuarios.findFirst({
          where: eq(usuarios.id, documento.vendedorId),
          columns: { gestorId: true },
        }),
        db.query.clientes.findFirst({
          where: eq(clientes.id, documento.clienteId),
          columns: { nome: true },
        }),
      ]);

      // Transação com lock para serializar geração de numeroEndosso.
      const endosso = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`,
        );

        const countResult = await tx
          .select({ count: sql<number>`count(*)` })
          .from(endossos)
          .where(
            and(
              eq(endossos.corretoraId, request.corretoraId),
              sql`EXTRACT(YEAR FROM ${endossos.createdAt}) = ${now.getFullYear()}`,
              sql`EXTRACT(MONTH FROM ${endossos.createdAt}) = ${now.getMonth() + 1}`,
            ),
          );
        const numeroEndosso = generateNumeroEndosso(
          Number(countResult[0]?.count ?? 0) + 1,
        );

        const [created] = await tx
          .insert(endossos)
          .values({
            corretoraId: request.corretoraId,
            documentoVendaId: data.documentoVendaId,
            vendedorId: request.user.sub,
            tipoEndosso: data.tipoEndosso,
            numeroEndosso,
            status: 'SOLICITADO',
            descricao: data.descricao,
            motivoEndosso: data.motivoEndosso,
            premioAnterior: premioAnterior.toString(),
            premioNovo: premioNovo.toString(),
            diferencaPremio: diferencaPremio.toString(),
            percentualComissaoAnterior: percentualComissaoAnterior.toString(),
            percentualComissaoNovo: percentualComissaoNovo.toString(),
            diferencaComissao: diferencaComissao.toString(),
            alteracoes: data.alteracoes,
            dataVigenciaEndosso: data.dataVigenciaEndosso,
            dataSolicitacao: new Date(),
            observacoes: data.observacoes,
          })
          .returning();

        await tx.insert(historicoDocumentoVenda).values({
          documentoVendaId: data.documentoVendaId,
          tipoEvento: 'ENDOSSO_CRIADO',
          usuarioId: request.user.sub,
          usuarioNome: request.user.nome,
          descricao: `Endosso ${numeroEndosso} criado: ${data.tipoEndosso}`,
          dadosAlterados: { endossoId: endosso.id },
        });

        // Notificação dentro da transação: garante que se o endosso for commitado,
        // o vendedor/gestor são notificados atomicamente
        await NotificacaoService.notificarEndossoSolicitado(
          {
            corretoraId: request.corretoraId,
            endossoId: created.id,
            documentoId: data.documentoVendaId,
            clienteNome: clienteEndossoRow?.nome || 'Cliente',
            tipoEndosso: data.tipoEndosso,
            solicitanteNome: request.user.nome,
            vendedorId: documento.vendedorId,
            gestorId: vendedorDonoRow?.gestorId,
          },
          tx,
        );

        return created;
      });

      return reply.status(201).send(ok(endosso));
    },
  );

  // List endorsements
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Endossos'],
        summary: 'Listar endossos',
        description:
          'Lista todos os endossos com suporte a paginação e filtros por documento, tipo, status e vendedor.',
        ...endossosDocs.listar,
      },
      preHandler: [
        authorizeAny(['vendas:criar_endosso', 'vendas:aprovar_endosso', 'cadastro:aprovar_endosso']),
      ],
    },
    async (request) => {
      const query = listEndossosQuerySchema.parse(request.query);
      const { offset, limit, page } = getPaginationParams(query);

      const conditions = [
        eq(endossos.corretoraId, request.corretoraId),
        isNull(endossos.deletedAt),
      ];

      const isPrivileged =
        request.user.isAdmin ||
        request.user.isGestor ||
        request.user.permissoes.includes('vendas:aprovar_endosso') ||
        request.user.permissoes.includes('cadastro:aprovar_endosso');

      if (!isPrivileged) {
        // Usuário comum vê endossos onde é vendedor do endosso OU atuante/
        // vendedor do documento pai (ex.: quem registrou endosso externo).
        conditions.push(
          sql`(
            ${endossos.vendedorId} = ${request.user.sub}
            OR EXISTS (
              SELECT 1 FROM ${documentosVenda} dv
              WHERE dv.id = ${endossos.documentoVendaId}
                AND (dv.atuante_id = ${request.user.sub} OR dv.vendedor_id = ${request.user.sub})
            )
          )`,
        );
      } else if (query.vendedorId) {
        conditions.push(eq(endossos.vendedorId, query.vendedorId));
      }

      if (query.documentoVendaId) {
        conditions.push(eq(endossos.documentoVendaId, query.documentoVendaId));
      }

      if (query.tipoEndosso) {
        conditions.push(eq(endossos.tipoEndosso, query.tipoEndosso));
      }

      if (query.status) {
        conditions.push(eq(endossos.status, query.status as any));
      }

      const [endossosResult, countResult] = await Promise.all([
        db.query.endossos.findMany({
          where: and(...conditions),
          with: {
            documentoVenda: {
              columns: {
                id: true,
                numeroDocumento: true,
                numeroApoliceExterna: true,
              },
              with: {
                cliente: {
                  columns: {
                    id: true,
                    nome: true,
                    razaoSocial: true,
                  },
                },
              },
            },
            vendedor: {
              columns: {
                id: true,
                nome: true,
              },
            },
          } as any,
          limit,
          offset,
          orderBy: (endossos, { desc }) => [desc(endossos.createdAt)],
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(endossos)
          .where(and(...conditions)),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      const pagedEndossos = createPaginatedResult(endossosResult, total, page, limit);
      return { success: true as const, data: pagedEndossos.data as any, meta: pagedEndossos.meta };
    },
  );

  // Get endorsement by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Endossos'],
        summary: 'Obter detalhes do endosso',
        description:
          'Obtém os detalhes completos de um endosso específico, incluindo documento de venda e alterações propostas.',
        ...endossosDocs.buscar,
      },
      preHandler: [
        authorizeAny(['vendas:criar_endosso', 'vendas:aprovar_endosso', 'cadastro:aprovar_endosso']),
      ],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const endosso = await db.query.endossos.findFirst({
        where: and(
          eq(endossos.id, id),
          eq(endossos.corretoraId, request.corretoraId),
          isNull(endossos.deletedAt),
        ),
        with: {
          documentoVenda: {
            with: {
              cliente: true,
              produto: true,
            },
          },
          vendedor: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
          validadoPor: {
            columns: { id: true, nome: true },
          },
          aprovadoPor: {
            columns: { id: true, nome: true },
          },
          emitidoPor: {
            columns: { id: true, nome: true },
          },
        } as any,
      });

      if (!endosso) {
        throw new NotFoundError('Endosso');
      }

      const isPrivileged =
        request.user.isAdmin ||
        request.user.isGestor ||
        request.user.permissoes.includes('vendas:aprovar_endosso') ||
        request.user.permissoes.includes('cadastro:aprovar_endosso');

      const doc = (endosso as unknown as {
        documentoVenda?: { atuanteId?: string | null; vendedorId?: string | null };
      }).documentoVenda;

      const isRelated =
        endosso.vendedorId === request.user.sub ||
        doc?.atuanteId === request.user.sub ||
        doc?.vendedorId === request.user.sub;

      if (!isPrivileged && !isRelated) {
        throw new OwnershipError('Você não tem acesso a este endosso');
      }

      return ok(endosso as any);
    },
  );

  // Approve endorsement
  fastify.post(
    '/:id/approve',
    {
      schema: {
        tags: ['Endossos'],
        summary: 'Aprovar endosso',
        description:
          'Aprova um endosso solicitado e aplica as alterações imediatamente no documento de venda.',
        ...endossosDocs.aprovar,
      },
      preHandler: [authorize(['cadastro:aprovar_endosso'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const endosso = await db.query.endossos.findFirst({
        where: and(
          eq(endossos.id, id),
          eq(endossos.corretoraId, request.corretoraId),
          isNull(endossos.deletedAt),
        ),
      });

      if (!endosso) {
        throw new NotFoundError('Endosso');
      }

      if (endosso.status !== 'SOLICITADO') {
        throw new UnprocessableEntityError(
          'Só é possível aprovar endossos solicitados',
        );
      }

      const body = (request.body as { numeroEndossoExterno?: string }) || {};

      // Atualiza endosso + documento + histórico + ajuste de comissão em uma
      // única transação para evitar estado inconsistente se algum passo falhar.
      const updated = await db.transaction(async (tx) => {
        const [updatedEndosso] = await tx
          .update(endossos)
          .set({
            status: 'APROVADO',
            dataAprovacao: new Date(),
            aprovadoPorId: request.user.sub,
            numeroEndossoExterno: body.numeroEndossoExterno,
            updatedAt: new Date(),
          })
          .where(eq(endossos.id, id))
          .returning();

        const documento = await tx.query.documentosVenda.findFirst({
          where: and(
            eq(documentosVenda.id, endosso.documentoVendaId),
            isNull(documentosVenda.deletedAt),
          ),
        });

        if (!documento) {
          throw new UnprocessableEntityError(
            'Documento vinculado ao endosso foi removido',
          );
        }

        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (endosso.premioNovo) {
          updateData.premioLiquido = endosso.premioNovo;
        }

        if (endosso.percentualComissaoNovo) {
          updateData.percentualComissao = endosso.percentualComissaoNovo;

          const premio = parseFloat(
            endosso.premioNovo || endosso.premioAnterior || '0',
          );
          const percentual = parseFloat(endosso.percentualComissaoNovo || '0');
          updateData.valorComissao = ((premio * percentual) / 100).toString();
        }

        await tx
          .update(documentosVenda)
          .set(updateData)
          .where(eq(documentosVenda.id, endosso.documentoVendaId));

        await tx.insert(historicoDocumentoVenda).values({
          documentoVendaId: endosso.documentoVendaId,
          tipoEvento: 'ENDOSSO_APROVADO',
          usuarioId: request.user.sub,
          usuarioNome: request.user.nome,
          descricao: `Endosso ${endosso.numeroEndosso} aprovado e aplicado`,
          dadosAlterados: {
            endossoId: id,
            premioAnterior: endosso.premioAnterior,
            premioNovo: endosso.premioNovo,
            percentualComissaoAnterior: endosso.percentualComissaoAnterior,
            percentualComissaoNovo: endosso.percentualComissaoNovo,
            diferencaPremio: endosso.diferencaPremio,
            diferencaComissao: endosso.diferencaComissao,
          },
        });

        if (
          endosso.diferencaComissao &&
          parseFloat(endosso.diferencaComissao) !== 0
        ) {
          const diferencaComissao = parseFloat(endosso.diferencaComissao);

          let diferencaVendedor: number | null = null;
          let diferencaCorretora: number | null = null;
          if (documento.negocioCorretora && documento.percentualCorretora) {
            const pctCorretora = parseFloat(documento.percentualCorretora);
            diferencaCorretora = (diferencaComissao * pctCorretora) / 100;
            diferencaVendedor = diferencaComissao - diferencaCorretora;
          }

          await generateEndorsementAdjustmentEntry(
            {
              documentoVendaId: endosso.documentoVendaId,
              corretoraId: request.corretoraId,
              endossoId: id,
              diferencaComissao,
              diferencaComissaoVendedor: diferencaVendedor,
              diferencaComissaoCorretora: diferencaCorretora,
              dataVigenciaEndosso: endosso.dataVigenciaEndosso,
              descricao: `Ajuste endosso ${endosso.numeroEndosso}: ${diferencaComissao > 0 ? '+' : ''}R$ ${diferencaComissao.toFixed(2)}`,
            },
            tx,
          );
        }

        return updatedEndosso;
      });

      return { ...ok(updated), message: 'Endosso aprovado e alterações aplicadas no documento' };
    },
  );

  // Refuse endorsement
  fastify.post(
    '/:id/reject',
    {
      schema: {
        tags: ['Endossos'],
        summary: 'Recusar endosso',
        description: 'Recusa um endosso solicitado com motivo.',
        ...endossosDocs.recusar,
      },
      preHandler: [authorize(['cadastro:aprovar_endosso'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { motivoRecusa } = recusarEndossoSchema.parse(request.body);

      const endosso = await db.query.endossos.findFirst({
        where: and(
          eq(endossos.id, id),
          eq(endossos.corretoraId, request.corretoraId),
          isNull(endossos.deletedAt),
        ),
      });

      if (!endosso) {
        throw new NotFoundError('Endosso');
      }

      if (endosso.status !== 'SOLICITADO') {
        throw new UnprocessableEntityError(
          'Só é possível recusar endossos solicitados',
        );
      }

      // Buscar dados necessários para histórico e notificação
      const [vendedorDonoRow, clienteEndossoRow] = await Promise.all([
        db.query.usuarios.findFirst({
          where: eq(usuarios.id, endosso.vendedorId),
          columns: { gestorId: true },
        }),
        db.query.documentosVenda.findFirst({
          where: eq(documentosVenda.id, endosso.documentoVendaId),
          columns: { clienteId: true },
        }),
      ]);

      const clienteRow = clienteEndossoRow?.clienteId
        ? await db.query.clientes.findFirst({
            where: eq(clientes.id, clienteEndossoRow.clienteId),
            columns: { nome: true },
          })
        : null;

      const updated = await db.transaction(async (tx) => {
        const [updatedEndosso] = await tx
          .update(endossos)
          .set({
            status: 'RECUSADO',
            dataRecusa: new Date(),
            motivoRecusa,
            updatedAt: new Date(),
          })
          .where(eq(endossos.id, id))
          .returning();

        await tx.insert(historicoDocumentoVenda).values({
          documentoVendaId: endosso.documentoVendaId,
          tipoEvento: 'ENDOSSO_RECUSADO',
          usuarioId: request.user.sub,
          usuarioNome: request.user.nome,
          descricao: `Endosso ${endosso.numeroEndosso} recusado: ${motivoRecusa}`,
          dadosAlterados: { endossoId: id },
        });

        await NotificacaoService.notificarEndossoRecusado(
          {
            corretoraId: request.corretoraId,
            endossoId: id,
            documentoId: endosso.documentoVendaId,
            numeroEndosso: endosso.numeroEndosso,
            clienteNome: clienteRow?.nome || 'Cliente',
            tipoEndosso: endosso.tipoEndosso,
            motivoRecusa,
            recusadoPorNome: request.user.nome,
            vendedorId: endosso.vendedorId,
            gestorId: vendedorDonoRow?.gestorId,
          },
          tx,
        );

        return updatedEndosso;
      });

      return { ...ok(updated), message: 'Endosso recusado' };
    },
  );

  // Editar endosso recusado (descricao, premioNovo, percentualComissaoNovo, observacoes)
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Endossos'],
        summary: 'Editar endosso',
        description: 'Edita campos de um endosso recusado antes de reenviar.',
        ...endossosDocs.atualizar,
      },
      preHandler: [authorize(['vendas:criar_endosso'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const patchSchema = z.object({
        descricao: z.string().min(1).optional(),
        observacoes: z.string().optional().nullable(),
        premioNovo: z.number().min(0).optional().nullable(),
        percentualComissaoNovo: z.number().min(0).max(100).optional().nullable(),
      });

      const body = patchSchema.parse(request.body);

      const [row] = await db
        .select({ endosso: endossos, docVendedorId: documentosVenda.vendedorId, docAtuanteId: documentosVenda.atuanteId })
        .from(endossos)
        .innerJoin(documentosVenda, eq(documentosVenda.id, endossos.documentoVendaId))
        .where(and(eq(endossos.id, id), eq(endossos.corretoraId, request.corretoraId), isNull(endossos.deletedAt)))
        .limit(1);

      if (!row) throw new NotFoundError('Endosso');

      if (row.endosso.status !== 'RECUSADO') {
        throw new UnprocessableEntityError('Só é possível editar endossos recusados');
      }

      const isOwner =
        row.endosso.vendedorId === request.user.sub ||
        row.docVendedorId === request.user.sub ||
        row.docAtuanteId === request.user.sub;

      if (!isOwner) throw new OwnershipError();

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.descricao !== undefined) updates.descricao = body.descricao;
      if (body.observacoes !== undefined) updates.observacoes = body.observacoes;
      if (body.premioNovo !== undefined) {
        updates.premioNovo = body.premioNovo;
        const anterior = Number(row.endosso.premioAnterior ?? 0);
        updates.diferencaPremio = body.premioNovo != null ? body.premioNovo - anterior : null;
      }
      if (body.percentualComissaoNovo !== undefined) updates.percentualComissaoNovo = body.percentualComissaoNovo;

      const [updated] = await db.update(endossos).set(updates).where(eq(endossos.id, id)).returning();

      return ok(updated);
    },
  );

  // Reenviar endosso recusado para validação de cadastro
  fastify.post(
    '/:id/resend',
    {
      schema: {
        tags: ['Endossos'],
        summary: 'Reenviar endosso recusado',
        description: 'Reenvia um endosso recusado para nova validação de cadastro.',
        ...endossosDocs.reenviar,
      },
      preHandler: [authorize(['vendas:criar_endosso'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const [row] = await db
        .select({
          endosso: endossos,
          docVendedorId: documentosVenda.vendedorId,
          docAtuanteId: documentosVenda.atuanteId,
        })
        .from(endossos)
        .innerJoin(documentosVenda, eq(documentosVenda.id, endossos.documentoVendaId))
        .where(
          and(
            eq(endossos.id, id),
            eq(endossos.corretoraId, request.corretoraId),
            isNull(endossos.deletedAt),
          ),
        )
        .limit(1);

      if (!row) {
        throw new NotFoundError('Endosso');
      }

      const endosso = row.endosso;

      if (endosso.status !== 'RECUSADO') {
        throw new UnprocessableEntityError('Só é possível reenviar endossos recusados');
      }

      const isOwner =
        endosso.vendedorId === request.user.sub ||
        row.docVendedorId === request.user.sub ||
        row.docAtuanteId === request.user.sub;

      if (!isOwner) {
        throw new OwnershipError();
      }

      const [updated] = await db
        .update(endossos)
        .set({
          status: 'SOLICITADO',
          dataRecusa: null,
          motivoRecusa: null,
          updatedAt: new Date(),
        })
        .where(eq(endossos.id, id))
        .returning();

      await db.insert(historicoDocumentoVenda).values({
        documentoVendaId: endosso.documentoVendaId,
        tipoEvento: 'SOLICITACAO_CADASTRO',
        usuarioId: request.user.sub,
        usuarioNome: request.user.nome,
        descricao: `Endosso ${endosso.numeroEndosso} reenviado para validação de cadastro`,
      });

      return { ...ok(updated), message: 'Endosso reenviado para validação' };
    },
  );

  // Cancel endorsement
  fastify.post(
    '/:id/cancel',
    {
      schema: {
        tags: ['Endossos'],
        summary: 'Cancelar endosso',
        description:
          'Cancela um endosso solicitado. Apenas o vendedor ou cadastro podem cancelar.',
        ...endossosDocs.cancelar,
      },
      preHandler: [authorize(['vendas:criar_endosso'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const [row] = await db
        .select({
          endosso: endossos,
          docAtuanteId: documentosVenda.atuanteId,
          docVendedorId: documentosVenda.vendedorId,
        })
        .from(endossos)
        .innerJoin(
          documentosVenda,
          eq(documentosVenda.id, endossos.documentoVendaId),
        )
        .where(
          and(
            eq(endossos.id, id),
            eq(endossos.corretoraId, request.corretoraId),
            isNull(endossos.deletedAt),
          ),
        )
        .limit(1);

      if (!row) {
        throw new NotFoundError('Endosso');
      }

      const { endosso, docAtuanteId, docVendedorId } = row;

      if (endosso.status !== 'SOLICITADO') {
        throw new UnprocessableEntityError(
          'Só é possível cancelar endossos solicitados',
        );
      }

      // Admin/gestor e quem tem cadastro:aprovar_endosso passam direto.
      // Caso contrário, exige vínculo com o endosso ou com o documento pai
      // (atuante ou vendedor), para que quem registrou endosso externo consiga
      // cancelá-lo mesmo sem ser o vendedor original do cliente.
      const isPrivileged =
        request.user.isAdmin ||
        request.user.isGestor ||
        request.user.permissoes.includes('cadastro:aprovar_endosso');

      const isRelated =
        endosso.vendedorId === request.user.sub ||
        docAtuanteId === request.user.sub ||
        docVendedorId === request.user.sub;

      if (!isPrivileged && !isRelated) {
        throw new OwnershipError(
          'Você não tem permissão para cancelar este endosso',
        );
      }

      const [updated] = await db
        .update(endossos)
        .set({
          status: 'CANCELADO',
          updatedAt: new Date(),
        })
        .where(eq(endossos.id, id))
        .returning();

      return { ...ok(updated), message: 'Endosso cancelado' };
    },
  );
};

export default endossosRoutes;
