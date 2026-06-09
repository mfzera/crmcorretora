import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db, workspace2PlanilhaPrefs } from '@ecotech/shared/database';
import { and, eq } from 'drizzle-orm';
import { ok } from '../../docs/index.js';

const columnStateItemSchema = z.object({
  colId: z.string(),
  hide: z.boolean().nullable().optional(),
  width: z.number().nullable().optional(),
  flex: z.number().nullable().optional(),
  pinned: z.union([z.literal('left'), z.literal('right'), z.null()]).optional(),
  sort: z.union([z.literal('asc'), z.literal('desc'), z.null()]).optional(),
  sortIndex: z.number().nullable().optional(),
});

const columnColorsSchema = z.record(z.string(), z.string().min(1).nullable());

const filterStateSchema = z.object({
  situacao: z.array(z.string()).optional().default([]),
  tags: z.array(z.string().uuid()).optional().default([]),
  vendedores: z.array(z.string().uuid()).optional().default([]),
  produtos: z.array(z.string().uuid()).optional().default([]),
  seguradoras: z.array(z.string().uuid()).optional().default([]),
  showExcluidos: z.boolean().optional().default(true),
});

const putBodySchema = z.object({
  columnState: z.array(columnStateItemSchema).max(50),
  columnColors: columnColorsSchema.optional().default({}),
  filterState: filterStateSchema.optional().default({ situacao: [], tags: [], vendedores: [], produtos: [], seguradoras: [], showExcluidos: true }),
});

const workspace2PrefsRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get(
    '/planilha',
    { schema: { tags: ['Workspace'], summary: 'Buscar preferências de colunas da planilha workspace2' } },
    async (request) => {
      const prefs = await db.query.workspace2PlanilhaPrefs.findFirst({
        where: and(
          eq(workspace2PlanilhaPrefs.usuarioId, request.user.sub),
          eq(workspace2PlanilhaPrefs.corretoraId, request.corretoraId),
        ),
      });
      return ok({
        columnState: (prefs?.columnState as any[]) ?? [],
        columnColors: (prefs?.columnColors as Record<string, string | null>) ?? {},
        filterState: (prefs?.filterState as Record<string, unknown>) ?? {},
      });
    },
  );

  fastify.put(
    '/planilha',
    {
      schema: {
        tags: ['Workspace'],
        summary: 'Salvar preferências de colunas da planilha workspace2',
        body: putBodySchema,
      },
    },
    async (request) => {
      const { columnState, columnColors, filterState } = request.body;
      const [saved] = await db
        .insert(workspace2PlanilhaPrefs)
        .values({
          usuarioId: request.user.sub,
          corretoraId: request.corretoraId,
          columnState,
          columnColors,
          filterState,
        })
        .onConflictDoUpdate({
          target: [workspace2PlanilhaPrefs.usuarioId, workspace2PlanilhaPrefs.corretoraId],
          set: { columnState, columnColors, filterState, updatedAt: new Date() },
        })
        .returning();
      return ok({
        columnState: (saved.columnState as any[]) ?? [],
        columnColors: (saved.columnColors as Record<string, string | null>) ?? {},
        filterState: (saved.filterState as Record<string, unknown>) ?? {},
      });
    },
  );
};

export default workspace2PrefsRoutes;
