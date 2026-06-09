import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import {
  changelogs,
  changelogItems,
  admins,
  insertChangelogSchema,
  updateChangelogSchema,
  insertChangelogItemSchema,
  updateChangelogItemSchema,
} from '@ecotech/shared/database';
import { eq, desc, isNull, and } from 'drizzle-orm';

const idParams = z.object({ id: z.string().uuid() });

const changelogItemTypeEnum = z.enum([
  'feature',
  'bugfix',
  'improvement',
  'breaking',
  'security',
  'documentation',
]);

const changelogsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/changelogs - Listar todos os changelogs (incluindo não publicados)
  fastify.get(
    '/changelogs',
    {
      schema: {
        tags: ['Admin', 'Changelogs'],
        summary: 'Listar changelogs',
        description:
          'Lista todos os changelogs do sistema, incluindo versões não publicadas. Retorna changelogs ordenados por data de lançamento mais recente.',
        response: {
          200: z.object({
            changelogs: z.array(z.unknown()),
            total: z.number(),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_changelogs']),
    },
    async (request, reply) => {
      const allChangelogs = await db
        .select()
        .from(changelogs)
        .where(isNull(changelogs.deletedAt))
        .orderBy(desc(changelogs.releaseDate));

      // Buscar items e nome do publicador para cada changelog
      const changelogsWithItems = await Promise.all(
        allChangelogs.map(async (changelog) => {
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
            ...changelog,
            publishedBy: publishedByAdmin,
            items,
          };
        }),
      );

      // TODO: Add audit logging

      return {
        changelogs: changelogsWithItems,
        total: changelogsWithItems.length,
      };
    },
  );

  // GET /api/admin/changelogs/:id - Obter um changelog específico
  fastify.get(
    '/changelogs/:id',
    {
      schema: {
        tags: ['Admin', 'Changelogs'],
        summary: 'Obter changelog',
        description:
          'Retorna detalhes de um changelog específico com todos os seus itens.',
        params: idParams,
        response: {
          200: z.unknown(),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_changelogs']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [changelog] = await db
        .select()
        .from(changelogs)
        .where(and(eq(changelogs.id, id), isNull(changelogs.deletedAt)));

      if (!changelog) {
        return reply.status(404).send({ error: 'Changelog não encontrado' });
      }

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
        ...changelog,
        publishedBy: publishedByAdmin,
        items,
      };
    },
  );

  // POST /api/admin/changelogs - Criar novo changelog
  fastify.post(
    '/changelogs',
    {
      schema: {
        tags: ['Admin', 'Changelogs'],
        summary: 'Criar changelog',
        description:
          'Cria um novo changelog. Pode ser salvo como rascunho (não publicado) ou publicado imediatamente. Versão deve seguir formato X.Y.Z.',
        body: z.object({
          version: z.string().regex(/^\d+\.\d+\.\d+(\.\d+){0,2}$/, 'Versão no formato X.Y.Z'),
          title: z.string().min(1),
          description: z.string().optional(),
          releaseDate: z.string().datetime(),
          isPublished: z.boolean().default(false),
        }),
        response: {
          201: z.object({ changelog: z.unknown(), message: z.string() }),
          400: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const validatedData = insertChangelogSchema.parse({
        ...request.body,
        releaseDate: new Date(request.body.releaseDate),
        publishedAt: request.body.isPublished ? new Date() : null,
        publishedById: request.body.isPublished ? request.admin!.id : null,
      });

      try {
        const [newChangelog] = await db
          .insert(changelogs)
          .values(validatedData)
          .returning();

        // TODO: Add audit logging

        return reply.status(201).send({
          changelog: newChangelog,
          message: 'Changelog criado com sucesso',
        });
      } catch (err: any) {
        if (err?.code === '23505' || err?.cause?.code === '23505') {
          return reply.status(400).send({ error: `Já existe um changelog com a versão ${request.body.version}` });
        }
        throw err;
      }
    },
  );

  // PATCH /api/admin/changelogs/:id - Atualizar changelog
  fastify.patch(
    '/changelogs/:id',
    {
      schema: {
        tags: ['Admin', 'Changelogs'],
        summary: 'Atualizar changelog',
        description:
          'Atualiza informações de um changelog existente. Versão não pode ser alterada.',
        params: idParams,
        body: z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          releaseDate: z.string().datetime().optional(),
        }),
        response: {
          200: z.object({ changelog: z.unknown(), message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [existingChangelog] = await db
        .select()
        .from(changelogs)
        .where(and(eq(changelogs.id, id), isNull(changelogs.deletedAt)));

      if (!existingChangelog) {
        return reply.status(404).send({ error: 'Changelog não encontrado' });
      }

      const updateData = {
        ...request.body,
        releaseDate: request.body.releaseDate
          ? new Date(request.body.releaseDate)
          : undefined,
        updatedAt: new Date(),
      };

      const validatedData = updateChangelogSchema.parse(updateData);

      const [updatedChangelog] = await db
        .update(changelogs)
        .set(validatedData)
        .where(eq(changelogs.id, id))
        .returning();

      // TODO: Add audit logging

      return {
        changelog: updatedChangelog,
        message: 'Changelog atualizado com sucesso',
      };
    },
  );

  // POST /api/admin/changelogs/:id/publish - Publicar changelog
  fastify.post(
    '/changelogs/:id/publish',
    {
      schema: {
        tags: ['Admin', 'Changelogs'],
        summary: 'Publicar changelog',
        description:
          'Publica um changelog, tornando-o visível para todos os usuários na página pública.',
        params: idParams,
        response: {
          200: z.object({ changelog: z.unknown(), message: z.string() }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [changelog] = await db
        .select()
        .from(changelogs)
        .where(and(eq(changelogs.id, id), isNull(changelogs.deletedAt)));

      if (!changelog) {
        return reply.status(404).send({ error: 'Changelog não encontrado' });
      }

      if (changelog.isPublished) {
        return reply.status(400).send({ error: 'Changelog já está publicado' });
      }

      const [updatedChangelog] = await db
        .update(changelogs)
        .set({
          isPublished: true,
          publishedAt: new Date(),
          publishedById: request.admin!.id,
          updatedAt: new Date(),
        })
        .where(eq(changelogs.id, id))
        .returning();

      // TODO: Add audit logging

      return {
        changelog: updatedChangelog,
        message: 'Changelog publicado com sucesso',
      };
    },
  );

  // POST /api/admin/changelogs/:id/unpublish - Despublicar changelog
  fastify.post(
    '/changelogs/:id/unpublish',
    {
      schema: {
        tags: ['Admin', 'Changelogs'],
        summary: 'Despublicar changelog',
        description:
          'Remove um changelog da visualização pública, mantendo-o como rascunho.',
        params: idParams,
        response: {
          200: z.object({ changelog: z.unknown(), message: z.string() }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [changelog] = await db
        .select()
        .from(changelogs)
        .where(and(eq(changelogs.id, id), isNull(changelogs.deletedAt)));

      if (!changelog) {
        return reply.status(404).send({ error: 'Changelog não encontrado' });
      }

      if (!changelog.isPublished) {
        return reply.status(400).send({ error: 'Changelog já está despublicado' });
      }

      const [updatedChangelog] = await db
        .update(changelogs)
        .set({
          isPublished: false,
          updatedAt: new Date(),
        })
        .where(eq(changelogs.id, id))
        .returning();

      // TODO: Add audit logging

      return {
        changelog: updatedChangelog,
        message: 'Changelog despublicado com sucesso',
      };
    },
  );

  // DELETE /api/admin/changelogs/:id - Deletar changelog (soft delete)
  fastify.delete(
    '/changelogs/:id',
    {
      schema: {
        tags: ['Admin', 'Changelogs'],
        summary: 'Deletar changelog',
        description:
          'Deleta um changelog (soft delete). Também deleta todos os itens associados.',
        params: idParams,
        response: {
          200: z.object({ message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [changelog] = await db
        .select()
        .from(changelogs)
        .where(and(eq(changelogs.id, id), isNull(changelogs.deletedAt)));

      if (!changelog) {
        return reply.status(404).send({ error: 'Changelog não encontrado' });
      }

      await db.delete(changelogs).where(eq(changelogs.id, id));

      // TODO: Add audit logging

      return {
        message: 'Changelog deletado com sucesso',
      };
    },
  );

  // POST /api/admin/changelogs/:id/items - Criar item de changelog
  fastify.post(
    '/changelogs/:id/items',
    {
      schema: {
        tags: ['Admin', 'Changelogs'],
        summary: 'Criar item de changelog',
        description: 'Adiciona um novo item a um changelog existente.',
        params: idParams,
        body: z.object({
          type: changelogItemTypeEnum,
          title: z.string(),
          description: z.string(),
          metadata: z.unknown().optional(),
          order: z.string().optional(),
        }),
        response: {
          201: z.object({ item: z.unknown(), message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [changelog] = await db
        .select()
        .from(changelogs)
        .where(and(eq(changelogs.id, id), isNull(changelogs.deletedAt)));

      if (!changelog) {
        return reply.status(404).send({ error: 'Changelog não encontrado' });
      }

      const validatedData = insertChangelogItemSchema.parse({
        ...request.body,
        changelogId: id,
      });

      const [newItem] = await db
        .insert(changelogItems)
        .values(validatedData)
        .returning();

      // TODO: Add audit logging

      return reply.status(201).send({
        item: newItem,
        message: 'Item adicionado com sucesso',
      });
    },
  );

  // PATCH /api/admin/changelog-items/:id - Atualizar item de changelog
  fastify.patch(
    '/changelog-items/:id',
    {
      schema: {
        tags: ['Admin', 'Changelogs'],
        summary: 'Atualizar item de changelog',
        description: 'Atualiza um item de changelog existente.',
        params: idParams,
        body: z.object({
          type: changelogItemTypeEnum.optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          metadata: z.unknown().optional(),
          order: z.string().optional(),
        }),
        response: {
          200: z.object({ item: z.unknown(), message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [existingItem] = await db
        .select()
        .from(changelogItems)
        .where(
          and(eq(changelogItems.id, id), isNull(changelogItems.deletedAt)),
        );

      if (!existingItem) {
        return reply.status(404).send({ error: 'Item não encontrado' });
      }

      const updateData = {
        ...request.body,
        updatedAt: new Date(),
      };

      const validatedData = updateChangelogItemSchema.parse(updateData);

      const [updatedItem] = await db
        .update(changelogItems)
        .set(validatedData)
        .where(eq(changelogItems.id, id))
        .returning();

      // TODO: Add audit logging

      return {
        item: updatedItem,
        message: 'Item atualizado com sucesso',
      };
    },
  );

  // DELETE /api/admin/changelog-items/:id - Deletar item de changelog
  fastify.delete(
    '/changelog-items/:id',
    {
      schema: {
        tags: ['Admin', 'Changelogs'],
        summary: 'Deletar item de changelog',
        description: 'Deleta um item de changelog (soft delete).',
        params: idParams,
        response: {
          200: z.object({ message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const { id } = request.params;

      const [item] = await db
        .select()
        .from(changelogItems)
        .where(
          and(eq(changelogItems.id, id), isNull(changelogItems.deletedAt)),
        );

      if (!item) {
        return reply.status(404).send({ error: 'Item não encontrado' });
      }

      await db
        .update(changelogItems)
        .set({ deletedAt: new Date() })
        .where(eq(changelogItems.id, id));

      // TODO: Add audit logging

      return {
        message: 'Item deletado com sucesso',
      };
    },
  );
};

export default changelogsRoutes;
