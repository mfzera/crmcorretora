import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import { changelogs, changelogItems, admins } from '@ecotech/shared/database';
import { eq, desc, isNull, and } from 'drizzle-orm';
import { wireDate } from '../../docs/wire.js';

const changelogItemSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  metadata: z.unknown().nullable(),
  order: z.unknown(),
});

const changelogSchema = z.object({
  id: z.string().uuid(),
  version: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  releaseDate: wireDate,
  publishedAt: wireDate.nullable(),
  publishedBy: z.string().nullable(),
  items: z.array(changelogItemSchema),
});

const publicChangelogsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/public/changelogs - Listar changelogs publicados
  fastify.get(
    '/changelogs',
    {
      schema: {
        tags: ['Public', 'Changelogs'],
        summary: 'Listar changelogs publicados',
        description:
          'Lista todos os changelogs publicados do sistema, ordenados por data de lançamento mais recente. Não requer autenticação.',
        response: {
          200: z.object({
            changelogs: z.array(changelogSchema),
            total: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      // Buscar apenas changelogs publicados
      const publishedChangelogs = await db
        .select()
        .from(changelogs)
        .where(
          and(
            eq(changelogs.isPublished, true),
            isNull(changelogs.deletedAt),
          ),
        )
        .orderBy(desc(changelogs.releaseDate));

      // Buscar items e nome do publicador para cada changelog
      const changelogsWithItems = await Promise.all(
        publishedChangelogs.map(async (changelog) => {
          const [items, publishedByAdmin] = await Promise.all([
            db
              .select()
              .from(changelogItems)
              .where(
                and(
                  eq(changelogItems.changelogId, changelog.id),
                  isNull(changelogItems.deletedAt),
                ),
              )
              .orderBy(changelogItems.order),
            changelog.publishedById
              ? db
                  .select({ nome: admins.nome })
                  .from(admins)
                  .where(eq(admins.id, changelog.publishedById))
                  .then((r) => r[0]?.nome ?? null)
              : Promise.resolve(null),
          ]);

          return {
            id: changelog.id,
            version: changelog.version,
            title: changelog.title,
            description: changelog.description,
            releaseDate: changelog.releaseDate,
            publishedAt: changelog.publishedAt,
            publishedBy: publishedByAdmin,
            items: items.map((item) => ({
              id: item.id,
              type: item.type,
              title: item.title,
              description: item.description,
              metadata: item.metadata,
              order: item.order,
            })),
          };
        }),
      );

      return {
        changelogs: changelogsWithItems,
        total: changelogsWithItems.length,
      };
    },
  );
};

export default publicChangelogsRoutes;
