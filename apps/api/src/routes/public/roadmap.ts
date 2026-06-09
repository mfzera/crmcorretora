import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import { roadmapPhases, roadmapItems } from '@ecotech/shared/database';
import { eq, asc, isNull, and } from 'drizzle-orm';

const publicRoadmapRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/public/roadmap/phases - Listar fases publicadas com itens
  fastify.get(
    '/roadmap/phases',
    {
      schema: {
        tags: ['Public', 'Roadmap'],
        summary: 'Listar fases do roadmap publicadas',
        description:
          'Lista todas as fases do roadmap publicadas, ordenadas por data estimada. Não requer autenticação.',
        response: {
          200: z.object({
            phases: z.array(
              z.object({
                id: z.string().uuid(),
                name: z.string(),
                estimatedDate: z.string(),
                order: z.unknown(),
                items: z.array(
                  z.object({
                    id: z.string().uuid(),
                    title: z.string(),
                    description: z.string().nullable(),
                    status: z.string(),
                    order: z.unknown(),
                  }),
                ),
              }),
            ),
            total: z.number(),
          }),
        },
      },
    },
    async () => {
      const publishedPhases = await db
        .select()
        .from(roadmapPhases)
        .where(
          and(
            eq(roadmapPhases.isPublished, true),
            isNull(roadmapPhases.deletedAt),
          ),
        )
        .orderBy(asc(roadmapPhases.estimatedDate), asc(roadmapPhases.order));

      const phasesWithItems = await Promise.all(
        publishedPhases.map(async (phase) => {
          const items = await db
            .select()
            .from(roadmapItems)
            .where(
              and(
                eq(roadmapItems.phaseId, phase.id),
                isNull(roadmapItems.deletedAt),
              ),
            )
            .orderBy(asc(roadmapItems.order));

          return {
            id: phase.id,
            name: phase.name,
            estimatedDate: phase.estimatedDate,
            order: phase.order,
            items: items.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              status: item.status,
              order: item.order,
            })),
          };
        }),
      );

      return { phases: phasesWithItems, total: phasesWithItems.length };
    },
  );
};

export default publicRoadmapRoutes;
