import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import { corretoras, storageMetrics } from '@ecotech/shared/database';
import { MetricsService } from '@ecotech/shared/storage';
import { eq, desc } from 'drizzle-orm';

const idParams = z.object({ id: z.string().uuid() });

const metricsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/storage/overview - Visão geral global do armazenamento
  fastify.get(
    '/storage/overview',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Visão geral global de armazenamento',
        description:
          'Retorna visão consolidada de armazenamento de todos os tenants: uso total, distribuição por tipo, maiores consumidores. Requer permissão view_usage.',
        response: {
          200: z.unknown(),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, reply) => {
      const overview = await MetricsService.getGlobalOverview();

      await fastify.auditService.logViewGlobalMetrics(
        request.admin!.id,
        request.admin!.email,
        request,
      );

      return overview;
    },
  );

  // GET /api/admin/tenants - Listar todos os tenants com uso de armazenamento
  fastify.get(
    '/tenants',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Listar todos os tenants',
        description:
          'Retorna lista de todas as corretoras (tenants) com seus respectivos usos de armazenamento, limites e status. Inclui CNPJ, data de criação e breakdown por tipo de arquivo.',
        response: {
          200: z.object({
            tenants: z.array(z.unknown()),
            totalTenants: z.number(),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, reply) => {
      // Buscar todas as corretoras
      const allCorretoras = await db.select().from(corretoras);

      // Calcular uso atual para cada corretora
      const tenantsWithUsage = await Promise.all(
        allCorretoras.map(async (corretora) => {
          const usage = await MetricsService.calculateCurrentUsage(
            corretora.id,
          );
          const limitStatus = await MetricsService.checkLimits(corretora.id);

          return {
            id: corretora.id,
            nome: corretora.razaoSocial,
            cnpj: corretora.cnpj,
            createdAt: corretora.createdAt,
            usage: {
              totalFiles: usage.totalArquivos,
              totalBytes: usage.totalBytes,
              totalBytesCotacoes: usage.byType.cotacoes,
              totalBytesDocumentos: usage.byType.documentos,
              totalBytesChat: usage.byType.chat,
            },
            limits: limitStatus,
          };
        }),
      );

      await fastify.auditService.logViewTenantList(
        request.admin!.id,
        request.admin!.email,
        request,
      );

      return {
        tenants: tenantsWithUsage,
        totalTenants: tenantsWithUsage.length,
      };
    },
  );

  // GET /api/admin/tenants/:id/usage - Uso detalhado de um tenant específico
  fastify.get(
    '/tenants/:id/usage',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Uso detalhado de um tenant',
        description:
          'Retorna informações detalhadas de uso de armazenamento de uma corretora específica: arquivos por tipo (cotações, documentos, chat), limites configurados e status atual.',
        params: idParams,
        response: {
          200: z.unknown(),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, reply) => {
      const { id } = request.params;

      // Verificar se a corretora existe
      const [corretora] = await db
        .select()
        .from(corretoras)
        .where(eq(corretoras.id, id));

      if (!corretora) {
        return reply.status(404).send({ error: 'Tenant não encontrado' });
      }

      // Calcular uso atual
      const currentUsage = await MetricsService.calculateCurrentUsage(id);
      const limitStatus = await MetricsService.checkLimits(id);

      await fastify.auditService.logViewTenant(
        request.admin!.id,
        request.admin!.email,
        id,
        corretora.razaoSocial,
        request,
      );

      return {
        tenant: {
          id: corretora.id,
          nome: corretora.razaoSocial,
          cnpj: corretora.cnpj,
          createdAt: corretora.createdAt,
        },
        currentUsage: {
          totalFiles: currentUsage.totalArquivos,
          totalBytes: currentUsage.totalBytes,
          totalBytesCotacoes: currentUsage.byType.cotacoes,
          totalBytesDocumentos: currentUsage.byType.documentos,
          totalBytesChat: currentUsage.byType.chat,
        },
        limits: limitStatus,
      };
    },
  );

  // GET /api/admin/tenants/:id/usage/history - Histórico de métricas de um tenant
  fastify.get(
    '/tenants/:id/usage/history',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Histórico de uso de um tenant',
        description:
          'Retorna série temporal de uso de armazenamento de uma corretora específica. Inclui total de arquivos, bytes por tipo e custo estimado mensal. Padrão: últimos 30 dias.',
        params: idParams,
        querystring: z.object({
          days: z.coerce.number().min(1).max(365).default(30).optional(),
        }),
        response: {
          200: z.unknown(),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, reply) => {
      const { id } = request.params;
      const days = request.query.days ?? 30;

      // Verificar se a corretora existe
      const [corretora] = await db
        .select()
        .from(corretoras)
        .where(eq(corretoras.id, id));

      if (!corretora) {
        return reply.status(404).send({ error: 'Tenant não encontrado' });
      }

      // Buscar métricas históricas (últimos N dias)
      const history = await db
        .select()
        .from(storageMetrics)
        .where(eq(storageMetrics.corretoraId, id))
        .orderBy(desc(storageMetrics.data))
        .limit(days);

      await fastify.auditService.logViewTenantMetrics(
        request.admin!.id,
        request.admin!.email,
        id,
        corretora.razaoSocial,
        request,
      );

      return {
        tenant: {
          id: corretora.id,
          nome: corretora.razaoSocial,
        },
        history: history.map((metric) => ({
          date: metric.data,
          totalFiles: metric.totalArquivos,
          totalBytes: metric.totalBytes,
          totalBytesCotacoes: metric.totalBytesCotacoes,
          totalBytesDocumentos: metric.totalBytesDocumentos,
          totalBytesChat: metric.totalBytesChat,
          estimatedMonthlyCost: metric.custoEstimadoMensal,
        })),
      };
    },
  );

  // GET /api/admin/tenants/:id/largest-files - Arquivos maiores de um tenant
  fastify.get(
    '/tenants/:id/largest-files',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Maiores arquivos de um tenant',
        description:
          'Retorna lista dos maiores arquivos armazenados por uma corretora. Útil para identificar oportunidades de otimização e arquivos problemáticos. Padrão: top 20.',
        params: idParams,
        querystring: z.object({
          limit: z.coerce.number().min(1).max(100).default(20).optional(),
        }),
        response: {
          200: z.unknown(),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, reply) => {
      const { id } = request.params;
      const limit = request.query.limit ?? 20;

      // Verificar se a corretora existe
      const [corretora] = await db
        .select()
        .from(corretoras)
        .where(eq(corretoras.id, id));

      if (!corretora) {
        return reply.status(404).send({ error: 'Tenant não encontrado' });
      }

      const largestFiles = await MetricsService.getLargestFiles(id, limit);

      return {
        tenant: {
          id: corretora.id,
          nome: corretora.razaoSocial,
        },
        largestFiles,
      };
    },
  );

  // GET /api/admin/tenants/:id/costs - Custos detalhados de um tenant
  fastify.get(
    '/tenants/:id/costs',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Custos estimados de um tenant',
        description:
          'Calcula e retorna estimativa detalhada de custos de armazenamento de uma corretora: custo por GB, custo mensal projetado e breakdown por tipo de arquivo.',
        params: idParams,
        response: {
          200: z.unknown(),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, reply) => {
      const { id } = request.params;

      // Verificar se a corretora existe
      const [corretora] = await db
        .select()
        .from(corretoras)
        .where(eq(corretoras.id, id));

      if (!corretora) {
        return reply.status(404).send({ error: 'Tenant não encontrado' });
      }

      const costs = await MetricsService.calculateCosts(id);

      return {
        tenant: {
          id: corretora.id,
          nome: corretora.razaoSocial,
        },
        costs,
      };
    },
  );

  // POST /api/admin/tenants/:id/snapshot - Criar snapshot manual
  fastify.post(
    '/tenants/:id/snapshot',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Criar snapshot manual de um tenant',
        description:
          'Cria snapshot imediato das métricas de armazenamento de uma corretora. Útil para capturar estado atual antes de operações de manutenção ou auditorias.',
        params: idParams,
        response: {
          200: z.object({
            success: z.boolean(),
            snapshot: z.unknown(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_limits']),
    },
    async (request, reply) => {
      const { id } = request.params;

      // Verificar se a corretora existe
      const [corretora] = await db
        .select()
        .from(corretoras)
        .where(eq(corretoras.id, id));

      if (!corretora) {
        return reply.status(404).send({ error: 'Tenant não encontrado' });
      }

      const snapshot = await MetricsService.createDailySnapshot(id);

      return {
        success: true,
        snapshot,
      };
    },
  );

  // POST /api/admin/snapshot-all - Criar snapshots para todos os tenants
  fastify.post(
    '/snapshot-all',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Criar snapshots de todos os tenants',
        description:
          'Cria snapshots de métricas de armazenamento para todas as corretoras do sistema de uma vez. Operação em lote útil para relatórios periódicos e análises consolidadas.',
        response: {
          200: z.object({
            success: z.boolean(),
            totalSnapshots: z.number(),
            snapshots: z.array(z.unknown()),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_limits']),
    },
    async (request, reply) => {
      const snapshots = await MetricsService.createDailySnapshotsForAll();

      return {
        success: true,
        totalSnapshots: snapshots.length,
        snapshots,
      };
    },
  );
};

export default metricsRoutes;
