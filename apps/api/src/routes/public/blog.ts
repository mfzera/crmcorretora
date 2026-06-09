import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import { blogPosts } from '@ecotech/shared/database';
import { eq, desc, isNull, and } from 'drizzle-orm';

const blogPostSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  coverImageUrl: z.string().nullable(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const blogPostFullSchema = blogPostSummarySchema.extend({
  content: z.string(),
});

const publicBlogRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/blog/posts',
    {
      schema: {
        tags: ['Public', 'Blog'],
        summary: 'Listar posts do blog',
        description: 'Lista todos os posts publicados, sem conteúdo completo. Não requer autenticação.',
        response: {
          200: z.object({
            posts: z.array(blogPostSummarySchema),
            total: z.number(),
          }),
        },
      },
    },
    async () => {
      const posts = await db
        .select({
          id: blogPosts.id,
          slug: blogPosts.slug,
          title: blogPosts.title,
          excerpt: blogPosts.excerpt,
          coverImageUrl: blogPosts.coverImageUrl,
          publishedAt: blogPosts.publishedAt,
          createdAt: blogPosts.createdAt,
          updatedAt: blogPosts.updatedAt,
        })
        .from(blogPosts)
        .where(and(eq(blogPosts.isPublished, true), isNull(blogPosts.deletedAt)))
        .orderBy(desc(blogPosts.publishedAt));

      return {
        posts: posts.map((p) => ({
          ...p,
          publishedAt: p.publishedAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
        total: posts.length,
      };
    },
  );

  fastify.get(
    '/blog/posts/:slug',
    {
      schema: {
        tags: ['Public', 'Blog'],
        summary: 'Obter post do blog por slug',
        description: 'Retorna um post completo incluindo conteúdo Markdown. Não requer autenticação.',
        params: z.object({ slug: z.string() }),
        response: {
          200: z.object({ post: blogPostFullSchema }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { slug } = request.params;

      const [post] = await db
        .select()
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.slug, slug),
            eq(blogPosts.isPublished, true),
            isNull(blogPosts.deletedAt),
          ),
        );

      if (!post) {
        return reply.status(404).send({ error: 'Post não encontrado' });
      }

      return {
        post: {
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          coverImageUrl: post.coverImageUrl,
          publishedAt: post.publishedAt?.toISOString() ?? null,
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        },
      };
    },
  );
};

export default publicBlogRoutes;
