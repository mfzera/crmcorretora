import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '@ecotech/shared/database';
import {
  propostasComerciais,
  clientes,
  cotacoes,
  produtos,
  usuarios,
  equipes,
} from '@ecotech/shared/database';
import { eq, and, isNull, sql, or, inArray } from 'drizzle-orm';
import {
  authorize,
  authorizeAny,
  requireOwnership,
  requireStatus,
} from '@ecotech/plugins/authorization';
import {
  createPropostaSchema,
  updatePropostaSchema,
  listPropostasQuerySchema,
  recusarPropostaSchema,
} from '@ecotech/features/propostas';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  OwnershipError,
  UnprocessableEntityError,
} from '@ecotech/shared/utils';
import {
  getPaginationParams,
  createPaginatedResult,
  generateNumeroProposta,
} from '@ecotech/shared/utils';
import {
  updateOpportunityStatus,
  findRelatedOpportunity,
} from '../../utils/oportunidade-automation.js';
import { resolveVendedorPrincipal } from '../../utils/resolve-vendedor.js';
import { propostasDocs } from '../../docs/propostas/schemas.js';
import { ok } from '../../docs/index.js';

const propostasRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // Create proposal
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Propostas'],
        summary: 'Criar nova proposta',
        description:
          'Cria uma nova proposta comercial de seguro. Requer permissão de criação de propostas.',
        ...propostasDocs.criar,
      },
      preHandler: [authorize(['vendas:criar_proposta'])],
    },
    async (request, reply) => {
      const data = createPropostaSchema.parse(request.body);

      // Validate client
      const cliente = await db.query.clientes.findFirst({
        where: and(
          eq(clientes.id, data.clienteId),
          eq(clientes.corretoraId, request.corretoraId),
          isNull(clientes.deletedAt),
        ),
      });

      if (!cliente) {
        throw new NotFoundError('Cliente');
      }

      // Validate product
      const produto = await db.query.produtos.findFirst({
        where: and(
          eq(produtos.id, data.produtoId),
          eq(produtos.corretoraId, request.corretoraId),
          eq(produtos.ativo, true),
          isNull(produtos.deletedAt),
        ),
      });

      if (!produto) {
        throw new NotFoundError('Produto');
      }

      // Generate proposal number
      const now = new Date();
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(propostasComerciais)
        .where(
          and(
            eq(propostasComerciais.corretoraId, request.corretoraId),
            sql`EXTRACT(YEAR FROM ${propostasComerciais.createdAt}) = ${now.getFullYear()}`,
            sql`EXTRACT(MONTH FROM ${propostasComerciais.createdAt}) = ${now.getMonth() + 1}`,
          ),
        );

      const sequencial = Number(countResult[0]?.count ?? 0) + 1;
      const numeroPropostaInterno = generateNumeroProposta(sequencial);

      // Buscar cotação para herdar vendedorId se não vier no body
      const cotacao = data.cotacaoId
        ? await db.query.cotacoes.findFirst({
            where: and(
              eq(cotacoes.id, data.cotacaoId),
              eq(cotacoes.corretoraId, request.corretoraId),
            ),
            columns: { vendedorId: true },
          })
        : null;

      const { vendedorId: vendedorPrincipalId } = resolveVendedorPrincipal(
        data.vendedorId,
        cotacao?.vendedorId ?? cliente.vendedorId,
        request.user.sub,
      );

      // Calculate commission
      const premioLiquido = data.premioLiquido ?? 0;
      const percentualComissao =
        data.percentualComissao ??
        (produto.percentualComissaoPadrao
          ? parseFloat(produto.percentualComissaoPadrao)
          : 0);
      const valorComissao = (premioLiquido * percentualComissao) / 100;

      const [proposta] = await db
        .insert(propostasComerciais)
        .values({
          corretoraId: request.corretoraId,
          cotacaoId: data.cotacaoId,
          clienteId: data.clienteId,
          vendedorId: vendedorPrincipalId,
          produtoId: data.produtoId,
          numeroPropostaInterno,
          numeroPropostaExterno: data.numeroPropostaExterno,
          status: 'AGUARDANDO_ENVIO',
          vigenciaInicio: data.vigenciaInicio,
          vigenciaFim: data.vigenciaFim,
          premioLiquido: premioLiquido.toString(),
          percentualComissao: percentualComissao.toString(),
          valorComissao: valorComissao.toString(),
          coberturas: data.coberturas,
          observacoes: data.observacoes,
          anexos: data.anexos,
        })
        .returning();

      return reply.status(201).send(ok(proposta));
    },
  );

  // List proposals
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Propostas'],
        summary: 'Listar propostas',
        description:
          'Retorna a lista de propostas da seguradora com paginação. Vendedores veem apenas suas propostas, gerentes veem todas.',
        ...propostasDocs.listar,
      },
      preHandler: [
        authorizeAny([
          'vendas:visualizar_proposta',
          'vendas:visualizar_todos_documentos',
        ]),
      ],
    },
    async (request) => {
      const query = listPropostasQuerySchema.parse(request.query);
      const { offset, limit, page } = getPaginationParams(query);

      const conditions = [
        eq(propostasComerciais.corretoraId, request.corretoraId),
        isNull(propostasComerciais.deletedAt),
      ];

      // Filtrar por vendedor: gestor vê propostas da equipe
      if (request.user.isGestor) {
        const equipeLiderada = await db.query.equipes.findFirst({
          where: and(
            eq(equipes.corretoraId, request.corretoraId),
            eq(equipes.gestorId, request.user.sub),
            isNull(equipes.deletedAt),
          ),
          columns: { id: true },
        });
        if (equipeLiderada) {
          const membros = await db.query.usuarios.findMany({
            where: and(
              eq(usuarios.equipeId, equipeLiderada.id),
              isNull(usuarios.deletedAt),
              eq(usuarios.ativo, true),
            ),
            columns: { id: true },
          });
          const vendedorIds = [...new Set([request.user.sub, ...membros.map((m) => m.id)])];
          conditions.push(
            vendedorIds.length > 1
              ? inArray(propostasComerciais.vendedorId, vendedorIds)
              : eq(propostasComerciais.vendedorId, request.user.sub),
          );
        } else {
          conditions.push(eq(propostasComerciais.vendedorId, request.user.sub));
        }
      } else {
        conditions.push(eq(propostasComerciais.vendedorId, request.user.sub));
      }

      if (query.clienteId) {
        conditions.push(eq(propostasComerciais.clienteId, query.clienteId));
      }

      if (query.produtoId) {
        conditions.push(eq(propostasComerciais.produtoId, query.produtoId));
      }

      if (query.status) {
        conditions.push(eq(propostasComerciais.status, query.status));
      }

      const [propostasResult, countResult] = await Promise.all([
        db.query.propostasComerciais.findMany({
          where: and(...conditions),
          with: {
            cliente: {
              columns: {
                id: true,
                nome: true,
                razaoSocial: true,
                tipoPessoa: true,
              },
            },
            vendedor: {
              columns: {
                id: true,
                nome: true,
              },
            },
            produto: {
              columns: {
                id: true,
                nomeProduto: true,
                tipoSeguro: true,
              },
            },
          },
          limit,
          offset,
          orderBy: (propostasComerciais, { desc }) => [
            desc(propostasComerciais.createdAt),
          ],
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(propostasComerciais)
          .where(and(...conditions)),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      const pagedPropostas = createPaginatedResult(
        propostasResult.map((p) => ({
          id: p.id,
          numeroPropostaInterno: p.numeroPropostaInterno,
          numeroPropostaExterno: p.numeroPropostaExterno,
          status: p.status,
          vigenciaInicio: p.vigenciaInicio,
          vigenciaFim: p.vigenciaFim,
          premioLiquido: p.premioLiquido,
          valorComissao: p.valorComissao,
          cliente: p.cliente,
          vendedor: p.vendedor,
          produto: p.produto,
          createdAt: p.createdAt,
        })),
        total,
        page,
        limit,
      );
      return { success: true as const, data: pagedPropostas.data as any, meta: pagedPropostas.meta };
    },
  );

  // Get proposal by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Propostas'],
        summary: 'Obter detalhes da proposta',
        description: 'Retorna os detalhes completos de uma proposta.',
        ...propostasDocs.buscar,
      },
      preHandler: [
        authorizeAny([
          'vendas:visualizar_proposta',
          'vendas:visualizar_todos_documentos',
        ]),
      ],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const proposta = await db.query.propostasComerciais.findFirst({
        where: and(
          eq(propostasComerciais.id, id),
          eq(propostasComerciais.corretoraId, request.corretoraId),
          isNull(propostasComerciais.deletedAt),
        ),
        with: {
          cliente: true,
          vendedor: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
          produto: true,
          cotacao: true,
        },
      });

      if (!proposta) {
        throw new NotFoundError('Proposta');
      }

      if (
        !request.user.isAdmin &&
        !request.user.permissoes.includes(
          'vendas:visualizar_todos_documentos',
        ) &&
        proposta.vendedorId !== request.user.sub
      ) {
        throw new OwnershipError('Você não tem acesso a esta proposta');
      }

      return ok(proposta);
    },
  );

  // Update proposal
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Propostas'],
        summary: 'Atualizar proposta',
        description:
          'Atualiza as informações de uma proposta. Requer permissão de edição de propostas.',
        ...propostasDocs.atualizar,
      },
      preHandler: [
        authorize(['vendas:editar_proposta']),
        requireOwnership('proposta'),
        requireStatus('proposta', [
          'AGUARDANDO_ENVIO',
          'ENVIADA',
          'EM_ANALISE',
          'PENDENTE_DOCUMENTACAO',
        ]),
      ],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = updatePropostaSchema.parse(request.body);

      // Ownership e status já validados pelos middlewares
      const proposta = await db.query.propostasComerciais.findFirst({
        where: and(
          eq(propostasComerciais.id, id),
          eq(propostasComerciais.corretoraId, request.corretoraId),
          isNull(propostasComerciais.deletedAt),
        ),
      });

      if (!proposta) {
        throw new NotFoundError('Proposta');
      }

      // Recalculate commission
      let valorComissao = proposta.valorComissao;
      if (
        data.premioLiquido !== undefined ||
        data.percentualComissao !== undefined
      ) {
        const premio =
          data.premioLiquido ?? parseFloat(proposta.premioLiquido || '0');
        const percentual =
          data.percentualComissao ??
          parseFloat(proposta.percentualComissao || '0');
        valorComissao = ((premio * percentual) / 100).toString();
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
        valorComissao,
      };

      if (data.numeroPropostaExterno !== undefined)
        updateData.numeroPropostaExterno = data.numeroPropostaExterno;
      if (data.vigenciaInicio !== undefined)
        updateData.vigenciaInicio = data.vigenciaInicio;
      if (data.vigenciaFim !== undefined)
        updateData.vigenciaFim = data.vigenciaFim;
      if (data.premioLiquido !== undefined)
        updateData.premioLiquido = data.premioLiquido?.toString() ?? null;
      if (data.percentualComissao !== undefined)
        updateData.percentualComissao =
          data.percentualComissao?.toString() ?? null;
      if (data.coberturas !== undefined)
        updateData.coberturas = data.coberturas;
      if (data.observacoes !== undefined)
        updateData.observacoes = data.observacoes;
      if (data.anexos !== undefined) updateData.anexos = data.anexos;

      const [updated] = await db
        .update(propostasComerciais)
        .set(updateData)
        .where(eq(propostasComerciais.id, id))
        .returning();

      return ok(updated);
    },
  );

  // Send proposal
  fastify.post(
    '/:id/send',
    {
      schema: {
        tags: ['Propostas'],
        summary: 'Enviar proposta',
        description:
          'Envia uma proposta ao cliente. Requer permissão de edição de propostas.',
        ...propostasDocs.enviar,
      },
      preHandler: [authorize(['vendas:editar_proposta'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const proposta = await db.query.propostasComerciais.findFirst({
        where: and(
          eq(propostasComerciais.id, id),
          eq(propostasComerciais.corretoraId, request.corretoraId),
          isNull(propostasComerciais.deletedAt),
        ),
      });

      if (!proposta) {
        throw new NotFoundError('Proposta');
      }

      if (proposta.status !== 'AGUARDANDO_ENVIO') {
        throw new UnprocessableEntityError('Esta proposta já foi enviada');
      }

      const [updated] = await db
        .update(propostasComerciais)
        .set({
          status: 'ENVIADA',
          dataEnvio: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(propostasComerciais.id, id))
        .returning();

      return { ...ok(updated), message: 'Proposta enviada' };
    },
  );

  // Approve proposal
  fastify.post(
    '/:id/approve',
    {
      schema: {
        tags: ['Propostas'],
        summary: 'Aprovar proposta',
        description:
          'Aprova uma proposta comercial, mudando seu status para APROVADA e registrando data de aprovação. Pode atualizar automaticamente oportunidade relacionada para status "ganha".',
        ...propostasDocs.aprovar,
      },
      preHandler: [authorize(['vendas:editar_proposta'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const proposta = await db.query.propostasComerciais.findFirst({
        where: and(
          eq(propostasComerciais.id, id),
          eq(propostasComerciais.corretoraId, request.corretoraId),
          isNull(propostasComerciais.deletedAt),
        ),
      });

      if (!proposta) {
        throw new NotFoundError('Proposta');
      }

      if (
        !['ENVIADA', 'EM_ANALISE', 'PENDENTE_DOCUMENTACAO'].includes(
          proposta.status,
        )
      ) {
        throw new UnprocessableEntityError(
          'Não é possível aprovar uma proposta neste status',
        );
      }

      const [updated] = await db
        .update(propostasComerciais)
        .set({
          status: 'APROVADA',
          dataAprovacao: new Date(),
          dataResposta: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(propostasComerciais.id, id))
        .returning();

      // AUTOMAÇÃO: Mover oportunidade relacionada para "ganha"
      const oportunidade = await findRelatedOpportunity(
        proposta.clienteId,
        proposta.produtoId,
        request.corretoraId,
      );

      if (oportunidade && oportunidade.status !== 'ganha') {
        await updateOpportunityStatus(
          oportunidade.id,
          'ganha',
          request.corretoraId,
        );
      }

      return { ...ok(updated), message: 'Proposta aprovada' };
    },
  );

  // Refuse proposal
  fastify.post(
    '/:id/reject',
    {
      schema: {
        tags: ['Propostas'],
        summary: 'Recusar proposta',
        description:
          'Recusa uma proposta comercial, registrando motivo da recusa. Pode atualizar automaticamente oportunidade relacionada para status "perdida".',
        ...propostasDocs.recusar,
      },
      preHandler: [authorize(['vendas:editar_proposta'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = recusarPropostaSchema.parse(request.body);

      const proposta = await db.query.propostasComerciais.findFirst({
        where: and(
          eq(propostasComerciais.id, id),
          eq(propostasComerciais.corretoraId, request.corretoraId),
          isNull(propostasComerciais.deletedAt),
        ),
      });

      if (!proposta) {
        throw new NotFoundError('Proposta');
      }

      if (
        !['ENVIADA', 'EM_ANALISE', 'PENDENTE_DOCUMENTACAO'].includes(
          proposta.status,
        )
      ) {
        throw new UnprocessableEntityError(
          'Não é possível recusar uma proposta neste status',
        );
      }

      const [updated] = await db
        .update(propostasComerciais)
        .set({
          status: 'RECUSADA',
          dataRecusa: new Date(),
          dataResposta: new Date(),
          motivoRecusa: data.motivoRecusa,
          detalhesRecusa: data.detalhesRecusa,
          updatedAt: new Date(),
        })
        .where(eq(propostasComerciais.id, id))
        .returning();

      // AUTOMAÇÃO: Mover oportunidade relacionada para "perdida"
      const oportunidade = await findRelatedOpportunity(
        proposta.clienteId,
        proposta.produtoId,
        request.corretoraId,
      );

      if (oportunidade && oportunidade.status !== 'perdida') {
        await updateOpportunityStatus(
          oportunidade.id,
          'perdida',
          request.corretoraId,
          data.motivoRecusa || 'Proposta recusada',
        );
      }

      return { ...ok(updated), message: 'Proposta recusada' };
    },
  );

  // Confirm sale (creates sale document)
  fastify.post(
    '/:id/confirm-sale',
    {
      schema: {
        tags: ['Propostas'],
        summary: 'Confirmar venda da proposta',
        description:
          'Marca proposta como VENDA_CONFIRMADA após aprovação. Retorna dados necessários para criar documento de venda. Disponível apenas para propostas aprovadas ou aprovadas condicionalmente.',
        ...propostasDocs.confirmarVenda,
      },
      preHandler: [authorize(['vendas:criar_documento_venda'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const proposta = await db.query.propostasComerciais.findFirst({
        where: and(
          eq(propostasComerciais.id, id),
          eq(propostasComerciais.corretoraId, request.corretoraId),
          isNull(propostasComerciais.deletedAt),
        ),
      });

      if (!proposta) {
        throw new NotFoundError('Proposta');
      }

      if (!['APROVADA', 'APROVADA_CONDICIONAL'].includes(proposta.status)) {
        throw new UnprocessableEntityError(
          'Só é possível confirmar venda de propostas aprovadas',
        );
      }

      // Mark proposal as sale confirmed
      await db
        .update(propostasComerciais)
        .set({
          status: 'VENDA_CONFIRMADA',
          updatedAt: new Date(),
        })
        .where(eq(propostasComerciais.id, id));

      return {
        ...ok({
          propostaId: id,
          clienteId: proposta.clienteId,
          produtoId: proposta.produtoId,
          vendedorId: proposta.vendedorId,
          vigenciaInicio: proposta.vigenciaInicio,
          vigenciaFim: proposta.vigenciaFim,
          premioLiquido: proposta.premioLiquido,
          percentualComissao: proposta.percentualComissao,
          coberturas: proposta.coberturas,
        }),
        message: 'Proposta marcada como venda confirmada. Crie o documento de venda.',
      };
    },
  );
};

export default propostasRoutes;
