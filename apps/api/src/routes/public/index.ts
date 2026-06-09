import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import changelogsRoutes from './changelogs.js';
import roadmapRoutes from './roadmap.js';
import corretoraRoutes from './corretora.js';
import blogRoutes from './blog.js';
import sitemapRoutes from './sitemap.js';

/**
 * Plugin de rotas públicas
 * Rotas que não requerem autenticação
 */
const publicRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Rotas de changelogs públicos
  await fastify.register(changelogsRoutes);

  // Rotas de roadmap público
  await fastify.register(roadmapRoutes);

  // Dados públicos de corretora (para portal do segurado)
  await fastify.register(corretoraRoutes);

  // Rotas do blog
  await fastify.register(blogRoutes);

  // Sitemap dinâmico com posts do blog
  await fastify.register(sitemapRoutes);
};

export default publicRoutes;
