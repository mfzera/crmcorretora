import type { FastifyPluginAsync } from 'fastify';
import { db } from '@ecotech/shared/database';
import { blogPosts } from '@ecotech/shared/database';
import { eq, isNull, and } from 'drizzle-orm';

const BASE_URL = 'https://ecotechts.com.br';

const staticUrls = [
  { loc: `${BASE_URL}/`, changefreq: 'weekly', priority: '1.0' },
  { loc: `${BASE_URL}/sobre`, changefreq: 'monthly', priority: '0.8' },
  { loc: `${BASE_URL}/precos`, changefreq: 'weekly', priority: '0.9' },
  { loc: `${BASE_URL}/funcionalidades`, changefreq: 'monthly', priority: '0.8' },
  { loc: `${BASE_URL}/treinamentos`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/roadmap`, changefreq: 'weekly', priority: '0.6' },
  { loc: `${BASE_URL}/changelog`, changefreq: 'weekly', priority: '0.6' },
  { loc: `${BASE_URL}/blog`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${BASE_URL}/contato`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/checkout`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${BASE_URL}/termos`, changefreq: 'yearly', priority: '0.3' },
  { loc: `${BASE_URL}/privacidade`, changefreq: 'yearly', priority: '0.3' },
  { loc: `${BASE_URL}/lgpd`, changefreq: 'yearly', priority: '0.3' },
  { loc: `${BASE_URL}/cookies`, changefreq: 'yearly', priority: '0.3' },
  { loc: `${BASE_URL}/docs`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${BASE_URL}/docs/primeiros-passos`, changefreq: 'monthly', priority: '0.6' },
  { loc: `${BASE_URL}/docs/overview`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${BASE_URL}/docs/agenda`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${BASE_URL}/docs/clientes`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${BASE_URL}/docs/cotacoes`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${BASE_URL}/docs/kanban`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${BASE_URL}/docs/metricas`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${BASE_URL}/docs/performance`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${BASE_URL}/docs/dashboard`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${BASE_URL}/docs/configuracoes`, changefreq: 'monthly', priority: '0.5' },
];

const sitemapRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/sitemap.xml', async (request, reply) => {
    const posts = await db
      .select({
        slug: blogPosts.slug,
        updatedAt: blogPosts.updatedAt,
      })
      .from(blogPosts)
      .where(and(eq(blogPosts.isPublished, true), isNull(blogPosts.deletedAt)));

    const today = new Date().toISOString().split('T')[0];

    const urlEntries = [
      ...staticUrls.map(
        (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
      ),
      ...posts.map(
        (p) => `  <url>
    <loc>${BASE_URL}/blog/${p.slug}</loc>
    <lastmod>${p.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`;

    reply.header('Content-Type', 'application/xml');
    reply.header('Cache-Control', 'public, max-age=3600');
    return reply.send(xml);
  });
};

export default sitemapRoutes;
