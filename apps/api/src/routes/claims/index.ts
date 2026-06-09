import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db, comentarios } from '@ecotech/shared/database';
import {
  sinistros,
  historicoSinistro,
  documentosVenda,
  usuarios,
} from '@ecotech/shared/database';
import { eq, and, isNull, sql, desc, gte, lte } from 'drizzle-orm';
import { authorize, authorizeAny, requireModule } from '@ecotech/plugins/authorization';
import {
  NotFoundError,
  UnprocessableEntityError,
  OwnershipError,
} from '@ecotech/shared/utils';
import {
  getPaginationParams,
  createPaginatedResult,
  generateNumeroSinistro,
} from '@ecotech/shared/utils';
import { getAvatarUrl } from '../../utils/cache.js';
import { ok } from '../../docs/index.js';
import { sinistrosDocs } from '../../docs/sinistros/schemas.js';

const PERM_VER_TODOS = 'sinistros:visualizar_todos';

type StatusSinistro = (typeof statusSinistroValues)[number];

const TRANSICOES_VALIDAS: Record<StatusSinistro, StatusSinistro[]> = {
  ABERTO:                ['EM_ANALISE', 'AGUARDANDO_DOCUMENTOS', 'APROVADO', 'RECUSADO', 'CANCELADO'],
  EM_ANALISE:            ['ABERTO', 'AGUARDANDO_DOCUMENTOS', 'APROVADO', 'RECUSADO', 'CANCELADO'],
  AGUARDANDO_DOCUMENTOS: ['ABERTO', 'EM_ANALISE', 'APROVADO', 'RECUSADO', 'CANCELADO'],
  APROVADO:              ['PAGO', 'CANCELADO'],
  RECUSADO:              [],
  PAGO:                  [],
  CANCELADO:             [],
};

function isSinistroPrivileged(user: { isAdmin?: boolean; isGestor?: boolean; permissoes?: string[] }) {
  return user.isAdmin || user.isGestor || user.permissoes?.includes(PERM_VER_TODOS);
}

async function getSinistroOrThrow(
  id: string,
  corretoraId: string,
  user: { sub: string; isAdmin?: boolean; isGestor?: boolean; permissoes?: string[] },
  opts: { skipOwnershipCheck?: boolean } = {},
) {
  const sinistro = await db.query.sinistros.findFirst({
    where: and(eq(sinistros.id, id), eq(sinistros.corretoraId, corretoraId), isNull(sinistros.deletedAt)),
  });
  if (!sinistro) throw new NotFoundError('Sinistro');
  if (!opts.skipOwnershipCheck && !isSinistroPrivileged(user) && sinistro.solicitanteId !== user.sub) {
    throw new OwnershipError();
  }
  return sinistro;
}

const tipoSinistroValues = [
  'COLISAO',
  'ROUBO_FURTO',
  'INCENDIO',
  'DANOS_NATURAIS',
  'DANOS_TERCEIROS',
  'INVALIDEZ',
  'MORTE',
  'HOSPITALIZACAO',
  'OUTROS',
] as const;

const statusSinistroValues = [
  'ABERTO',
  'EM_ANALISE',
  'AGUARDANDO_DOCUMENTOS',
  'APROVADO',
  'RECUSADO',
  'PAGO',
  'CANCELADO',
] as const;

const createSinistroSchema = z.object({
  documentoVendaId: z.string().uuid(),
  tipoSinistro: z.enum(tipoSinistroValues),
  descricao: z.string().min(1).max(3000),
  dataOcorrencia: z.string().refine((v) => new Date(v) <= new Date(), {
    message: 'Data de ocorrência não pode ser futura',
  }),
  valorReclamado: z.coerce.number().min(0).optional(),
  numeroSinistroExterno: z.string().max(100).optional(),
  observacoes: z.string().max(2000).optional(),
});

const updateSinistroSchema = z.object({
  tipoSinistro: z.enum(tipoSinistroValues).optional(),
  descricao: z.string().min(1).max(3000).optional(),
  dataOcorrencia: z.string().refine((v) => new Date(v) <= new Date(), {
    message: 'Data de ocorrência não pode ser futura',
  }).optional(),
  valorReclamado: z.coerce.number().min(0).optional(),
  numeroSinistroExterno: z.string().max(100).optional(),
  observacoes: z.string().max(2000).optional(),
});

const moverSinistroSchema = z.object({
  novoStatus: z.enum(statusSinistroValues),
  observacao: z.string().max(1000).optional(),
});

const recusarSinistroSchema = z.object({
  motivoRecusa: z.string().min(1).max(1000),
});

const aprovarSinistroSchema = z.object({
  valorAprovado: z.coerce.number().min(0).optional(),
  observacao: z.string().max(1000).optional(),
});

const pagarSinistroSchema = z.object({
  observacao: z.string().max(1000).optional(),
});

const listSinistrosQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).optional(),
  documentoVendaId: z.string().uuid().optional(),
  solicitanteId: z.string().uuid().optional(),
  tipoSinistro: z.enum(tipoSinistroValues).optional(),
  status: z.enum(statusSinistroValues).optional(),
  dataAberturaInicio: z.string().optional(),
  dataAberturaFim: z.string().optional(),
});

const indicarSinistroSchema = z.object({
  documentoVendaId: z.string().uuid(),
  tipoSinistro: z.enum(tipoSinistroValues),
  descricao: z.string().min(1).max(3000),
  dataOcorrencia: z.string().refine((v) => new Date(v) <= new Date(), {
    message: 'Data de ocorrência não pode ser futura',
  }),
  observacoes: z.string().max(2000).optional(),
});

const sinistrosRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', requireModule('sinistros'));

  // POST /claims/indicar — Indicar sinistro (permissão reduzida: sinistros:indicar)
  fastify.post(
    '/indicar',
    {
      schema: { tags: ['Sinistros'], summary: 'Indicar ocorrência de sinistro' },
      preHandler: [authorize(['sinistros:indicar'])],
    },
    async (request, reply) => {
      const data = indicarSinistroSchema.parse(request.body);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, data.documentoVendaId),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });
      if (!documento) throw new NotFoundError('Documento de venda');
      if (documento.status !== 'ATIVO') {
        throw new UnprocessableEntityError(
          'Só é possível indicar sinistro em apólices com status ATIVO',
        );
      }

      // Vendedores só podem indicar em apólices que gerenciam
      const isPrivileged = request.user.isAdmin || request.user.isGestor;
      if (!isPrivileged) {
        const vendedorIds = [
          documento.vendedorId,
          documento.vendedorSecundarioId,
          documento.vendedorTerceiroId,
          documento.atuanteId,
        ].filter(Boolean);
        if (!vendedorIds.includes(request.user.sub)) {
          throw new OwnershipError();
        }
      }

      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lockKey = `sinistro-seq:${request.corretoraId}:${yearMonth}`;

      const sinistro = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`,
        );

        const countResult = await tx
          .select({ count: sql<number>`count(*)` })
          .from(sinistros)
          .where(
            and(
              eq(sinistros.corretoraId, request.corretoraId),
              sql`EXTRACT(YEAR FROM ${sinistros.createdAt}) = ${now.getFullYear()}`,
              sql`EXTRACT(MONTH FROM ${sinistros.createdAt}) = ${now.getMonth() + 1}`,
            ),
          );

        const numeroSinistro = generateNumeroSinistro(
          Number(countResult[0]?.count ?? 0) + 1,
        );

        const [created] = await tx
          .insert(sinistros)
          .values({
            corretoraId: request.corretoraId,
            documentoVendaId: data.documentoVendaId,
            solicitanteId: request.user.sub,
            tipoSinistro: data.tipoSinistro,
            numeroSinistro,
            status: 'ABERTO',
            origem: 'INDICACAO',
            descricao: data.descricao,
            dataOcorrencia: data.dataOcorrencia,
            observacoes: data.observacoes,
          })
          .returning();

        await tx.insert(historicoSinistro).values({
          sinistroId: created.id,
          usuarioId: request.user.sub,
          tipo: 'ABERTURA',
          statusNovo: 'ABERTO',
          descricao: `[Indicação] ${data.descricao.slice(0, 200)}`,
        });

        return created;
      });

      return reply.status(201).send(ok(sinistro));
    },
  );

  // POST /sinistros — Abrir sinistro em documento de venda ativo
  fastify.post(
    '/',
    {
      schema: { tags: ['Sinistros'], summary: 'Abrir sinistro', ...sinistrosDocs.criar },
      preHandler: [authorize(['sinistros:criar'])],
    },
    async (request, reply) => {
      const data = createSinistroSchema.parse(request.body);

      const documento = await db.query.documentosVenda.findFirst({
        where: and(
          eq(documentosVenda.id, data.documentoVendaId),
          eq(documentosVenda.corretoraId, request.corretoraId),
          isNull(documentosVenda.deletedAt),
        ),
      });
      if (!documento) throw new NotFoundError('Documento de venda');
      if (documento.status !== 'ATIVO') {
        throw new UnprocessableEntityError(
          'Só é possível abrir sinistro em apólices com status ATIVO',
        );
      }

      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lockKey = `sinistro-seq:${request.corretoraId}:${yearMonth}`;

      const sinistro = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`,
        );

        const countResult = await tx
          .select({ count: sql<number>`count(*)` })
          .from(sinistros)
          .where(
            and(
              eq(sinistros.corretoraId, request.corretoraId),
              sql`EXTRACT(YEAR FROM ${sinistros.createdAt}) = ${now.getFullYear()}`,
              sql`EXTRACT(MONTH FROM ${sinistros.createdAt}) = ${now.getMonth() + 1}`,
            ),
          );

        const numeroSinistro = generateNumeroSinistro(
          Number(countResult[0]?.count ?? 0) + 1,
        );

        const [created] = await tx
          .insert(sinistros)
          .values({
            corretoraId: request.corretoraId,
            documentoVendaId: data.documentoVendaId,
            solicitanteId: request.user.sub,
            tipoSinistro: data.tipoSinistro,
            numeroSinistro,
            numeroSinistroExterno: data.numeroSinistroExterno,
            status: 'ABERTO',
            descricao: data.descricao,
            dataOcorrencia: data.dataOcorrencia,
            valorReclamado: data.valorReclamado?.toString(),
            observacoes: data.observacoes,
          })
          .returning();

        await tx.insert(historicoSinistro).values({
          sinistroId: created.id,
          usuarioId: request.user.sub,
          tipo: 'ABERTURA',
          statusNovo: 'ABERTO',
          descricao: `Sinistro aberto: ${data.descricao.slice(0, 200)}`,
        });

        return created;
      });

      // Verificar reconhecimentos pós-venda após abrir sinistro
      import('../../utils/reconhecimento.js').then(({ checkAllRecognitions }) => {
        checkAllRecognitions(request.corretoraId, request.user.sub).catch((err) => {
          console.error('Erro ao verificar reconhecimentos após sinistro:', err);
        });
      });

      return reply.status(201).send(ok(sinistro));
    },
  );

  // GET /sinistros — Listar sinistros
  fastify.get(
    '/',
    {
      schema: { tags: ['Sinistros'], summary: 'Listar sinistros', ...sinistrosDocs.listar },
      preHandler: [authorizeAny(['sinistros:visualizar', 'sinistros:criar'])],
    },
    async (request, reply) => {
      const query = listSinistrosQuerySchema.parse(request.query);
      const { offset, limit } = getPaginationParams({ page: query.page, limit: query.limit });

      const isPrivileged =
        request.user.isAdmin || request.user.permissoes?.includes('sinistros:visualizar_todos');

      const conditions = [
        eq(sinistros.corretoraId, request.corretoraId),
        isNull(sinistros.deletedAt),
      ];

      if (!isPrivileged) {
        conditions.push(eq(sinistros.solicitanteId, request.user.sub));
      }
      if (query.documentoVendaId) {
        conditions.push(eq(sinistros.documentoVendaId, query.documentoVendaId));
      }
      if (query.solicitanteId) {
        conditions.push(eq(sinistros.solicitanteId, query.solicitanteId));
      }
      if (query.tipoSinistro) {
        conditions.push(eq(sinistros.tipoSinistro, query.tipoSinistro));
      }
      if (query.status) {
        conditions.push(eq(sinistros.status, query.status));
      }
      if (query.dataAberturaInicio) {
        conditions.push(gte(sinistros.dataAbertura, new Date(query.dataAberturaInicio)));
      }
      if (query.dataAberturaFim) {
        conditions.push(lte(sinistros.dataAbertura, new Date(query.dataAberturaFim + 'T23:59:59')));
      }

      const where = and(...conditions);

      const [rows, countResult] = await Promise.all([
        db.query.sinistros.findMany({
          where,
          limit,
          offset,
          orderBy: [desc(sinistros.createdAt)],
          with: {
            documentoVenda: {
              with: { cliente: true, produto: true },
            },
            solicitante: { columns: { id: true, nome: true, email: true } },
          },
        }),
        db.select({ count: sql<number>`count(*)` }).from(sinistros).where(where),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      const paged = createPaginatedResult(rows, total, query.page, limit);
      return { success: true as const, data: paged.data, meta: paged.meta };
    },
  );

  // GET /sinistros/:id — Detalhes
  fastify.get(
    '/:id',
    {
      schema: { tags: ['Sinistros'], summary: 'Buscar sinistro', ...sinistrosDocs.buscar },
      preHandler: [authorizeAny(['sinistros:visualizar', 'sinistros:criar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      await getSinistroOrThrow(id, request.corretoraId, request.user);

      const sinistro = await db.query.sinistros.findFirst({
        where: and(
          eq(sinistros.id, id),
          eq(sinistros.corretoraId, request.corretoraId),
          isNull(sinistros.deletedAt),
        ),
        with: {
          documentoVenda: { with: { cliente: true, produto: true } },
          solicitante: { columns: { id: true, nome: true, email: true } },
          analistaPor: { columns: { id: true, nome: true, email: true } },
          aprovadoPor: { columns: { id: true, nome: true, email: true } },
        },
      });

      if (!sinistro) throw new NotFoundError('Sinistro');
      return reply.send(ok(sinistro));
    },
  );

  // PATCH /sinistros/:id — Editar (apenas ABERTO)
  fastify.patch(
    '/:id',
    {
      schema: { tags: ['Sinistros'], summary: 'Editar sinistro', ...sinistrosDocs.atualizar },
      preHandler: [authorize(['sinistros:criar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = updateSinistroSchema.parse(request.body);

      const sinistro = await getSinistroOrThrow(id, request.corretoraId, request.user);
      if (sinistro.status !== 'ABERTO') {
        throw new UnprocessableEntityError('Só é possível editar sinistros com status ABERTO');
      }

      const [updated] = await db
        .update(sinistros)
        .set({ ...data, valorReclamado: data.valorReclamado?.toString(), updatedAt: new Date() })
        .where(and(eq(sinistros.id, id), eq(sinistros.corretoraId, request.corretoraId)))
        .returning();

      return reply.send({ success: true, data: updated });
    },
  );

  // POST /sinistros/:id/mover — Mover status (kanban drag)
  fastify.post(
    '/:id/move',
    {
      schema: { tags: ['Sinistros'], summary: 'Mover status do sinistro', ...sinistrosDocs.mover },
      preHandler: [authorize(['sinistros:analisar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = moverSinistroSchema.parse(request.body);

      const sinistro = await getSinistroOrThrow(id, request.corretoraId, request.user, { skipOwnershipCheck: true });

      const transicoesPermitidas = TRANSICOES_VALIDAS[sinistro.status as StatusSinistro] ?? [];
      if (!transicoesPermitidas.includes(data.novoStatus)) {
        throw new UnprocessableEntityError(
          `Transição de ${sinistro.status} para ${data.novoStatus} não é permitida`,
        );
      }

      const agora = new Date();
      const timestamps: Record<string, Date | undefined> = {};
      if (data.novoStatus === 'EM_ANALISE') timestamps.dataAnalise = agora;
      if (data.novoStatus === 'APROVADO') timestamps.dataAprovacao = agora;
      if (data.novoStatus === 'PAGO') timestamps.dataPagamento = agora;

      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx
          .update(sinistros)
          .set({ status: data.novoStatus, ...timestamps, updatedAt: agora })
          .where(and(eq(sinistros.id, id), eq(sinistros.corretoraId, request.corretoraId)))
          .returning();

        await tx.insert(historicoSinistro).values({
          sinistroId: id,
          usuarioId: request.user.sub,
          tipo: 'MUDANCA_STATUS',
          statusAnterior: sinistro.status,
          statusNovo: data.novoStatus,
          descricao: data.observacao ?? null,
        });

        return rows;
      });

      return reply.send({ success: true, data: updated });
    },
  );

  // POST /sinistros/:id/aprovar
  fastify.post(
    '/:id/approve',
    {
      schema: { tags: ['Sinistros'], summary: 'Aprovar sinistro', ...sinistrosDocs.aprovar },
      preHandler: [authorize(['sinistros:aprovar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = aprovarSinistroSchema.parse(request.body);

      const sinistro = await getSinistroOrThrow(id, request.corretoraId, request.user, { skipOwnershipCheck: true });

      if (!TRANSICOES_VALIDAS[sinistro.status as StatusSinistro]?.includes('APROVADO')) {
        throw new UnprocessableEntityError(
          `Sinistro com status ${sinistro.status} não pode ser aprovado`,
        );
      }

      const agora = new Date();
      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx
          .update(sinistros)
          .set({
            status: 'APROVADO',
            aprovadoPorId: request.user.sub,
            dataAprovacao: agora,
            valorAprovado: data.valorAprovado?.toString(),
            updatedAt: agora,
          })
          .where(and(eq(sinistros.id, id), eq(sinistros.corretoraId, request.corretoraId)))
          .returning();

        await tx.insert(historicoSinistro).values({
          sinistroId: id,
          usuarioId: request.user.sub,
          tipo: 'APROVACAO',
          statusAnterior: sinistro.status,
          statusNovo: 'APROVADO',
          descricao: data.observacao ?? null,
        });

        return rows;
      });

      return reply.send({ success: true, data: updated, message: 'Sinistro aprovado com sucesso' });
    },
  );

  // POST /sinistros/:id/recusar
  fastify.post(
    '/:id/reject',
    {
      schema: { tags: ['Sinistros'], summary: 'Recusar sinistro', ...sinistrosDocs.recusar },
      preHandler: [authorize(['sinistros:aprovar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = recusarSinistroSchema.parse(request.body);

      const sinistro = await getSinistroOrThrow(id, request.corretoraId, request.user, { skipOwnershipCheck: true });

      if (!TRANSICOES_VALIDAS[sinistro.status as StatusSinistro]?.includes('RECUSADO')) {
        throw new UnprocessableEntityError(
          `Sinistro com status ${sinistro.status} não pode ser recusado`,
        );
      }

      const agora = new Date();
      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx
          .update(sinistros)
          .set({
            status: 'RECUSADO',
            motivoRecusa: data.motivoRecusa,
            dataRecusa: agora,
            updatedAt: agora,
          })
          .where(and(eq(sinistros.id, id), eq(sinistros.corretoraId, request.corretoraId)))
          .returning();

        await tx.insert(historicoSinistro).values({
          sinistroId: id,
          usuarioId: request.user.sub,
          tipo: 'RECUSA',
          statusAnterior: sinistro.status,
          statusNovo: 'RECUSADO',
          descricao: data.motivoRecusa,
        });

        return rows;
      });

      return reply.send({ success: true, data: updated, message: 'Sinistro recusado' });
    },
  );

  // POST /sinistros/:id/pagar
  fastify.post(
    '/:id/pay',
    {
      schema: { tags: ['Sinistros'], summary: 'Registrar pagamento do sinistro', ...sinistrosDocs.pagar },
      preHandler: [authorize(['sinistros:aprovar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = pagarSinistroSchema.parse(request.body);

      const sinistro = await getSinistroOrThrow(id, request.corretoraId, request.user, { skipOwnershipCheck: true });

      if (!TRANSICOES_VALIDAS[sinistro.status as StatusSinistro]?.includes('PAGO')) {
        throw new UnprocessableEntityError(
          `Sinistro com status ${sinistro.status} não pode ser marcado como pago`,
        );
      }

      const agora = new Date();
      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx
          .update(sinistros)
          .set({ status: 'PAGO', dataPagamento: agora, updatedAt: agora })
          .where(and(eq(sinistros.id, id), eq(sinistros.corretoraId, request.corretoraId)))
          .returning();

        await tx.insert(historicoSinistro).values({
          sinistroId: id,
          usuarioId: request.user.sub,
          tipo: 'PAGAMENTO',
          statusAnterior: 'APROVADO',
          statusNovo: 'PAGO',
          descricao: data.observacao ?? null,
        });

        return rows;
      });

      return reply.send({ success: true, data: updated, message: 'Sinistro marcado como pago' });
    },
  );

  // POST /sinistros/:id/cancelar
  fastify.post(
    '/:id/cancel',
    {
      schema: { tags: ['Sinistros'], summary: 'Cancelar sinistro', ...sinistrosDocs.cancelar },
      preHandler: [authorizeAny(['sinistros:criar', 'sinistros:aprovar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const canManage =
        request.user.isAdmin || request.user.permissoes?.includes('sinistros:aprovar');
      const sinistro = await getSinistroOrThrow(id, request.corretoraId, request.user, {
        skipOwnershipCheck: canManage,
      });

      if (!TRANSICOES_VALIDAS[sinistro.status as StatusSinistro]?.includes('CANCELADO')) {
        throw new UnprocessableEntityError(
          `Sinistro com status ${sinistro.status} não pode ser cancelado`,
        );
      }

      const agora = new Date();
      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx
          .update(sinistros)
          .set({ status: 'CANCELADO', updatedAt: agora })
          .where(and(eq(sinistros.id, id), eq(sinistros.corretoraId, request.corretoraId)))
          .returning();

        await tx.insert(historicoSinistro).values({
          sinistroId: id,
          usuarioId: request.user.sub,
          tipo: 'CANCELAMENTO',
          statusAnterior: sinistro.status,
          statusNovo: 'CANCELADO',
        });

        return rows;
      });

      return reply.send({ success: true, data: updated, message: 'Sinistro cancelado' });
    },
  );

  // POST /sinistros/:id/anotar — Adicionar anotação
  fastify.post(
    '/:id/note',
    {
      schema: { tags: ['Sinistros'], summary: 'Adicionar anotação ao sinistro', ...sinistrosDocs.anotar },
      preHandler: [authorizeAny(['sinistros:criar', 'sinistros:analisar', 'sinistros:aprovar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { texto } = z.object({ texto: z.string().min(1).max(2000) }).parse(request.body);

      await getSinistroOrThrow(id, request.corretoraId, request.user);

      const [entry] = await db
        .insert(historicoSinistro)
        .values({
          sinistroId: id,
          usuarioId: request.user.sub,
          tipo: 'ANOTACAO',
          descricao: texto,
        })
        .returning();

      const withUser = await db.query.historicoSinistro.findFirst({
        where: eq(historicoSinistro.id, entry.id),
        with: { usuario: { columns: { id: true, nome: true, email: true } } },
      });

      return reply.status(201).send({ success: true, data: withUser });
    },
  );

  // GET /sinistros/:id/comentarios
  fastify.get(
    '/:id/comments',
    {
      schema: { tags: ['Sinistros'], summary: 'Comentários do sinistro', ...sinistrosDocs.listarComentarios },
      preHandler: [authorizeAny(['sinistros:visualizar', 'sinistros:criar', 'sinistros:analisar', 'sinistros:aprovar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      await getSinistroOrThrow(id, request.corretoraId, request.user);

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
        .where(and(eq(comentarios.entidadeId, id), eq(comentarios.entidadeTipo, 'sinistro'), eq(comentarios.corretoraId, request.corretoraId)))
        .orderBy(comentarios.createdAt);

      const uniqueKeys = [...new Set(rows.map((c) => c.autor.avatarR2Key).filter(Boolean))];
      const avatarMap = new Map(
        await Promise.all(uniqueKeys.map(async (key) => [key, await getAvatarUrl(key)] as const)),
      );
      const withAvatars = rows.map((c) => ({
        ...c,
        autor: { id: c.autor.id, nome: c.autor.nome, avatarUrl: avatarMap.get(c.autor.avatarR2Key ?? '') ?? null },
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

      return reply.send(ok(tree as any));
    },
  );

  // POST /sinistros/:id/comentarios
  fastify.post(
    '/:id/comments',
    {
      schema: { tags: ['Sinistros'], summary: 'Adicionar comentário ao sinistro', ...sinistrosDocs.adicionarComentario },
      preHandler: [authorizeAny(['sinistros:criar', 'sinistros:analisar', 'sinistros:aprovar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { texto, parentId } = z.object({ texto: z.string().min(1).max(2000), parentId: z.string().nullable().optional() }).parse(request.body);

      const canComment = request.user.isAdmin || request.user.isGestor ||
        request.user.permissoes?.includes('sinistros:analisar') ||
        request.user.permissoes?.includes('sinistros:aprovar');
      await getSinistroOrThrow(id, request.corretoraId, request.user, { skipOwnershipCheck: canComment });

      const [inserted] = await db
        .insert(comentarios)
        .values({ corretoraId: request.corretoraId, entidadeTipo: 'sinistro', entidadeId: id, autorId: request.user.sub, parentId: parentId ?? null, texto: texto.trim() })
        .returning();

      const autor = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { id: true, nome: true, avatarR2Key: true },
      });

      return reply.status(201).send(ok({
        ...inserted,
        replies: [],
        autor: { id: autor?.id ?? '', nome: autor?.nome ?? '', avatarUrl: await getAvatarUrl(autor?.avatarR2Key) },
      }));
    },
  );

  // GET /sinistros/:id/historico
  fastify.get(
    '/:id/history',
    {
      schema: { tags: ['Sinistros'], summary: 'Histórico do sinistro', ...sinistrosDocs.historico },
      preHandler: [authorizeAny(['sinistros:visualizar', 'sinistros:criar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      await getSinistroOrThrow(id, request.corretoraId, request.user);

      const historico = await db.query.historicoSinistro.findMany({
        where: eq(historicoSinistro.sinistroId, id),
        orderBy: [desc(historicoSinistro.createdAt)],
        with: {
          usuario: { columns: { id: true, nome: true, email: true } },
        },
      });

      return reply.send({ success: true, data: historico });
    },
  );
};

export default sinistrosRoutes;
