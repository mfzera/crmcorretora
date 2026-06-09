import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db, kanbanBoardConfigs, kanbanCustomColumns } from '@ecotech/shared/database';
import { and, eq, isNull } from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';
import { ok } from '../../docs/index.js';

const BOARD_TYPES = ['oportunidades', 'sinistros', 'funil-cotacoes'] as const;

const kanbanConfigRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/kanban-config/:boardType
  // Retorna: overrides de colunas padrão + colunas customizadas da corretora
  fastify.get(
    '/:boardType',
    {
      schema: {
        tags: ['Kanban'],
        summary: 'Buscar configuração de colunas do board',
        params: z.object({ boardType: z.enum(BOARD_TYPES) }),
      },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const { boardType } = request.params;
      const corretoraId = request.corretoraId;

      const [standardConfigs, customColumns] = await Promise.all([
        db.query.kanbanBoardConfigs.findMany({
          where: and(
            eq(kanbanBoardConfigs.corretoraId, corretoraId),
            eq(kanbanBoardConfigs.boardType, boardType),
          ),
        }),
        db.query.kanbanCustomColumns.findMany({
          where: and(
            eq(kanbanCustomColumns.corretoraId, corretoraId),
            eq(kanbanCustomColumns.boardType, boardType),
            isNull(kanbanCustomColumns.deletedAt),
          ),
          orderBy: (t, { asc }) => [asc(t.ordem)],
        }),
      ]);

      return ok({ standardConfigs, customColumns });
    },
  );

  // PATCH /api/kanban-config/:boardType/columns/:columnId
  // Atualiza visibilidade, ordem, label ou cor de uma coluna padrão
  fastify.patch(
    '/:boardType/columns/:columnId',
    {
      schema: {
        tags: ['Kanban'],
        summary: 'Atualizar configuração de coluna padrão',
        params: z.object({
          boardType: z.enum(BOARD_TYPES),
          columnId: z.string().min(1).max(100),
        }),
        body: z.object({
          visible: z.boolean().optional(),
          ordem: z.number().int().min(0).optional(),
          label: z.string().min(1).max(100).nullable().optional(),
          color: z.string().min(1).max(100).nullable().optional(),
        }),
      },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const { boardType, columnId } = request.params;
      const { visible, ordem, label, color } = request.body;
      const corretoraId = request.corretoraId;

      const existing = await db.query.kanbanBoardConfigs.findFirst({
        where: and(
          eq(kanbanBoardConfigs.corretoraId, corretoraId),
          eq(kanbanBoardConfigs.boardType, boardType),
          eq(kanbanBoardConfigs.columnId, columnId),
        ),
      });

      if (existing) {
        const [updated] = await db
          .update(kanbanBoardConfigs)
          .set({
            ...(visible !== undefined && { visible }),
            ...(ordem !== undefined && { ordem }),
            ...(label !== undefined && { label }),
            ...(color !== undefined && { color }),
            updatedAt: new Date(),
          })
          .where(eq(kanbanBoardConfigs.id, existing.id))
          .returning();
        return ok(updated);
      }

      const [created] = await db
        .insert(kanbanBoardConfigs)
        .values({
          corretoraId,
          boardType,
          columnId,
          visible: visible ?? true,
          ordem: ordem ?? 0,
          label: label ?? null,
          color: color ?? null,
        })
        .returning();
      return ok(created);
    },
  );

  // POST /api/kanban-config/:boardType/columns/custom
  // Cria uma nova coluna customizada
  fastify.post(
    '/:boardType/columns/custom',
    {
      schema: {
        tags: ['Kanban'],
        summary: 'Criar coluna customizada',
        params: z.object({ boardType: z.enum(BOARD_TYPES) }),
        body: z.object({
          label: z.string().min(1).max(100),
          color: z.string().min(1).max(100).default('bg-slate-500'),
          isTerminal: z.boolean().default(false),
          ordem: z.number().int().min(0).optional(),
        }),
      },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request, reply) => {
      const { boardType } = request.params;
      const { label, color, isTerminal, ordem } = request.body;
      const corretoraId = request.corretoraId;

      const [created] = await db
        .insert(kanbanCustomColumns)
        .values({ corretoraId, boardType, label, color, isTerminal, ordem: ordem ?? 999 })
        .returning();

      return reply.status(201).send(ok(created));
    },
  );

  // PATCH /api/kanban-config/:boardType/columns/custom/:id
  // Atualiza label, cor, isTerminal ou ordem de uma coluna customizada
  fastify.patch(
    '/:boardType/columns/custom/:id',
    {
      schema: {
        tags: ['Kanban'],
        summary: 'Atualizar coluna customizada',
        params: z.object({
          boardType: z.enum(BOARD_TYPES),
          id: z.string().uuid(),
        }),
        body: z.object({
          label: z.string().min(1).max(100).optional(),
          color: z.string().min(1).max(100).optional(),
          isTerminal: z.boolean().optional(),
          ordem: z.number().int().min(0).optional(),
          visible: z.boolean().optional(),
        }),
      },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const { id } = request.params;
      const corretoraId = request.corretoraId;
      const { label, color, isTerminal, ordem, visible } = request.body;

      const [updated] = await db
        .update(kanbanCustomColumns)
        .set({
          ...(label !== undefined && { label }),
          ...(color !== undefined && { color }),
          ...(isTerminal !== undefined && { isTerminal }),
          ...(ordem !== undefined && { ordem }),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(kanbanCustomColumns.id, id),
            eq(kanbanCustomColumns.corretoraId, corretoraId),
            isNull(kanbanCustomColumns.deletedAt),
          ),
        )
        .returning();

      // visible para coluna custom é armazenado em kanbanBoardConfigs
      if (visible !== undefined && updated) {
        const existing = await db.query.kanbanBoardConfigs.findFirst({
          where: and(
            eq(kanbanBoardConfigs.corretoraId, corretoraId),
            eq(kanbanBoardConfigs.boardType, request.params.boardType),
            eq(kanbanBoardConfigs.columnId, id),
          ),
        });
        if (existing) {
          await db
            .update(kanbanBoardConfigs)
            .set({ visible, updatedAt: new Date() })
            .where(eq(kanbanBoardConfigs.id, existing.id));
        } else {
          await db.insert(kanbanBoardConfigs).values({
            corretoraId,
            boardType: request.params.boardType,
            columnId: id,
            visible,
            ordem: updated?.ordem ?? 999,
          });
        }
      }

      return ok(updated);
    },
  );

  // DELETE /api/kanban-config/:boardType/columns/custom/:id
  // Soft-delete de coluna customizada
  fastify.delete(
    '/:boardType/columns/custom/:id',
    {
      schema: {
        tags: ['Kanban'],
        summary: 'Excluir coluna customizada',
        params: z.object({
          boardType: z.enum(BOARD_TYPES),
          id: z.string().uuid(),
        }),
      },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request, reply) => {
      const { id } = request.params;
      const corretoraId = request.corretoraId;

      await db
        .update(kanbanCustomColumns)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(kanbanCustomColumns.id, id),
            eq(kanbanCustomColumns.corretoraId, corretoraId),
          ),
        );

      return reply.status(204).send();
    },
  );
};

export default kanbanConfigRoutes;
