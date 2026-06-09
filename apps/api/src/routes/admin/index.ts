import { FastifyPluginAsync } from 'fastify';
import authRoutes from './auth.js';
import auth2faRoutes from './auth-2fa.js';
import statsRoutes from './stats.js';
import metricsRoutes from './metrics.js';
import storageLimitsRoutes from './storage-limits.js';
import backupsRoutes from './backups.js';
import auditLogsRoutes from './audit-logs.js';
import migrarAnexosRoutes from './migrar-anexos.js';
import changelogsRoutes from './changelogs.js';
import roadmapRoutes from './roadmap.js';
import blogRoutes from './blog.js';
import r2AnalyticsRoutes from './r2-analytics.js';
import neonAnalyticsRoutes from './neon-analytics.js';
import railwayAnalyticsRoutes from './railway-analytics.js';
import redisAnalyticsRoutes from './redis-analytics.js';
import vercelAnalyticsRoutes from './vercel-analytics.js';
import subscriptionsRoutes from './subscriptions.js';

/**
 * Plugin principal de rotas do painel admin
 * Agrupa todas as rotas relacionadas à administração do sistema
 */
const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Rotas de autenticação (não requerem autenticação prévia)
  await fastify.register(authRoutes, { prefix: '/auth' });

  // Rotas de 2FA
  await fastify.register(auth2faRoutes, { prefix: '/auth/2fa' });

  // Rotas de estatísticas globais
  await fastify.register(statsRoutes);

  // Rotas de métricas e uso de armazenamento
  await fastify.register(metricsRoutes);

  // Rotas de limites de armazenamento
  await fastify.register(storageLimitsRoutes);

  // Rotas de backup
  await fastify.register(backupsRoutes);

  // Rotas de logs de auditoria
  await fastify.register(auditLogsRoutes);

  // Rotas de changelogs
  await fastify.register(changelogsRoutes);

  // Rotas de roadmap
  await fastify.register(roadmapRoutes);

  // Rotas do blog
  await fastify.register(blogRoutes);

  // Rotas de migração de anexos
  await fastify.register(migrarAnexosRoutes, { prefix: '/migrate-attachments' });

  // Rotas de analytics R2 via Cloudflare GraphQL/REST API
  await fastify.register(r2AnalyticsRoutes);

  // Rotas de analytics Neon via Neon API
  await fastify.register(neonAnalyticsRoutes);

  // Rotas de analytics Railway via Railway GraphQL API
  await fastify.register(railwayAnalyticsRoutes);

  // Rotas de analytics Redis (INFO + BullMQ queues)
  await fastify.register(redisAnalyticsRoutes);

  // Rotas de analytics Vercel via Vercel REST API
  await fastify.register(vercelAnalyticsRoutes);

  // Rotas de gerenciamento de assinaturas (Asaas)
  await fastify.register(subscriptionsRoutes);
};

export default adminRoutes;
