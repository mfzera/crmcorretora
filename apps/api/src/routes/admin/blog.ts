import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import { blogPosts, insertBlogPostSchema, updateBlogPostSchema } from '@ecotech/shared/database';
import { eq, desc, isNull, and } from 'drizzle-orm';

const idParams = z.object({ id: z.string().uuid() });

const adminBlogRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/blog/posts
  fastify.get(
    '/blog/posts',
    {
      schema: {
        tags: ['Admin', 'Blog'],
        summary: 'Listar posts do blog',
        description: 'Lista todos os posts incluindo rascunhos.',
        response: {
          200: z.object({ posts: z.array(z.unknown()), total: z.number() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async () => {
      const posts = await db
        .select()
        .from(blogPosts)
        .where(isNull(blogPosts.deletedAt))
        .orderBy(desc(blogPosts.createdAt));

      return { posts, total: posts.length };
    },
  );

  // GET /api/admin/blog/posts/:id
  fastify.get(
    '/blog/posts/:id',
    {
      schema: {
        tags: ['Admin', 'Blog'],
        summary: 'Obter post do blog',
        params: idParams,
        response: {
          200: z.object({ post: z.unknown() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const { id } = request.params;
      const [post] = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.id, id), isNull(blogPosts.deletedAt)));

      if (!post) return reply.status(404).send({ error: 'Post não encontrado' });
      return { post };
    },
  );

  // POST /api/admin/blog/posts
  fastify.post(
    '/blog/posts',
    {
      schema: {
        tags: ['Admin', 'Blog'],
        summary: 'Criar post do blog',
        body: z.object({
          slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
          title: z.string().min(1),
          excerpt: z.string().min(1),
          content: z.string().min(1),
          coverImageUrl: z.string().url().nullable().optional(),
        }),
        response: {
          201: z.object({ post: z.unknown(), message: z.string() }),
          400: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const validated = insertBlogPostSchema.parse(request.body);

      try {
        const [post] = await db.insert(blogPosts).values(validated).returning();
        return reply.status(201).send({ post, message: 'Post criado com sucesso' });
      } catch (err: any) {
        if (err?.code === '23505' || err?.cause?.code === '23505') {
          return reply.status(400).send({ error: `Já existe um post com o slug "${request.body.slug}"` });
        }
        throw err;
      }
    },
  );

  // PUT /api/admin/blog/posts/:id
  fastify.put(
    '/blog/posts/:id',
    {
      schema: {
        tags: ['Admin', 'Blog'],
        summary: 'Atualizar post do blog',
        params: idParams,
        body: z.object({
          slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
          title: z.string().min(1).optional(),
          excerpt: z.string().min(1).optional(),
          content: z.string().min(1).optional(),
          coverImageUrl: z.string().url().nullable().optional(),
        }),
        response: {
          200: z.object({ post: z.unknown(), message: z.string() }),
          404: z.object({ error: z.string() }),
          400: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const { id } = request.params;
      const [existing] = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.id, id), isNull(blogPosts.deletedAt)));

      if (!existing) return reply.status(404).send({ error: 'Post não encontrado' });

      const validated = updateBlogPostSchema.parse(request.body);

      try {
        const [updated] = await db
          .update(blogPosts)
          .set({ ...validated, updatedAt: new Date() })
          .where(eq(blogPosts.id, id))
          .returning();

        return { post: updated, message: 'Post atualizado com sucesso' };
      } catch (err: any) {
        if (err?.code === '23505' || err?.cause?.code === '23505') {
          return reply.status(400).send({ error: `Já existe um post com esse slug` });
        }
        throw err;
      }
    },
  );

  // POST /api/admin/blog/posts/:id/publish
  fastify.post(
    '/blog/posts/:id/publish',
    {
      schema: {
        tags: ['Admin', 'Blog'],
        summary: 'Publicar post do blog',
        params: idParams,
        response: {
          200: z.object({ post: z.unknown(), message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const { id } = request.params;
      const [existing] = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.id, id), isNull(blogPosts.deletedAt)));

      if (!existing) return reply.status(404).send({ error: 'Post não encontrado' });

      const [updated] = await db
        .update(blogPosts)
        .set({
          isPublished: true,
          publishedAt: existing.publishedAt ?? new Date(),
          publishedById: request.admin!.id,
          updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, id))
        .returning();

      return { post: updated, message: 'Post publicado com sucesso' };
    },
  );

  // POST /api/admin/blog/posts/:id/unpublish
  fastify.post(
    '/blog/posts/:id/unpublish',
    {
      schema: {
        tags: ['Admin', 'Blog'],
        summary: 'Despublicar post do blog',
        params: idParams,
        response: {
          200: z.object({ post: z.unknown(), message: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_changelogs']),
    },
    async (request, reply) => {
      const { id } = request.params;
      const [existing] = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.id, id), isNull(blogPosts.deletedAt)));

      if (!existing) return reply.status(404).send({ error: 'Post não encontrado' });

      const [updated] = await db
        .update(blogPosts)
        .set({ isPublished: false, updatedAt: new Date() })
        .where(eq(blogPosts.id, id))
        .returning();

      return { post: updated, message: 'Post despublicado com sucesso' };
    },
  );

  // DELETE /api/admin/blog/posts/:id
  fastify.delete(
    '/blog/posts/:id',
    {
      schema: {
        tags: ['Admin', 'Blog'],
        summary: 'Excluir post do blog',
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
      const [existing] = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.id, id), isNull(blogPosts.deletedAt)));

      if (!existing) return reply.status(404).send({ error: 'Post não encontrado' });

      await db
        .update(blogPosts)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(blogPosts.id, id));

      return { message: 'Post excluído com sucesso' };
    },
  );
};

export default adminBlogRoutes;
