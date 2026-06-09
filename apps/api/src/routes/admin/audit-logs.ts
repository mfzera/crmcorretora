import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import { adminAuditLogs, admins } from '@ecotech/shared/database';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { wireDate } from '../../docs/wire.js';

const auditLogSchema = z.object({
  id: z.string(),
  adminId: z.string(),
  acao: z.string(),
  entidadeTipo: z.string().nullable(),
  entidadeId: z.string().nullable(),
  detalhes: z.unknown(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  timestamp: wireDate,
  adminName: z.string().nullable(),
  adminEmail: z.string().nullable(),
});

const auditLogsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/audit-logs - Listar logs de auditoria
  fastify.get(
    '/audit-logs',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Listar logs de auditoria',
        description:
          'Retorna logs de ações administrativas com filtros por admin, ação, período e paginação. Inclui nome e email do admin que executou cada ação. Ordenado por mais recente.',
        querystring: z.object({
          adminId: z.string().uuid().optional(),
          acao: z.string().optional(),
          dataInicio: z.string().optional(),
          dataFim: z.string().optional(),
          limit: z.coerce.number().min(1).max(500).default(100),
          offset: z.coerce.number().min(0).default(0),
        }),
        response: {
          200: z.object({
            logs: z.array(auditLogSchema),
            total: z.number(),
            limit: z.number(),
            offset: z.number(),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_audit_logs']),
    },
    async (request, reply) => {
      const { adminId, acao, dataInicio, dataFim, limit, offset } = request.query;

      // Construir filtros
      const filters = [];

      if (adminId) {
        filters.push(eq(adminAuditLogs.adminId, adminId));
      }

      if (acao) {
        filters.push(eq(adminAuditLogs.acao, acao));
      }

      if (dataInicio) {
        filters.push(gte(adminAuditLogs.timestamp, new Date(dataInicio + 'T00:00:00-03:00')));
      }

      if (dataFim) {
        filters.push(lte(adminAuditLogs.timestamp, new Date(dataFim + 'T23:59:59.999-03:00')));
      }

      // Buscar logs
      let query = db
        .select()
        .from(adminAuditLogs)
        .orderBy(desc(adminAuditLogs.timestamp));

      if (filters.length > 0) {
        query = query.where(and(...filters)) as any;
      }

      const logs = await query.limit(limit).offset(offset);

      // Buscar informações dos admins
      const logsWithAdminInfo = await Promise.all(
        logs.map(async (log) => {
          const [admin] = await db
            .select({ nome: admins.nome, email: admins.email })
            .from(admins)
            .where(eq(admins.id, log.adminId));

          return {
            id: log.id,
            adminId: log.adminId,
            acao: log.acao,
            entidadeTipo: log.entidadeTipo,
            entidadeId: log.entidadeId,
            detalhes: log.detalhes,
            ip: log.ip,
            userAgent: log.userAgent,
            timestamp: log.timestamp,
            /* v8 ignore next 2 */
            adminName: admin?.nome || null,
            adminEmail: admin?.email || null,
          };
        }),
      );

      return {
        logs: logsWithAdminInfo,
        total: logsWithAdminInfo.length,
        limit,
        offset,
      };
    },
  );

  // GET /api/admin/audit-logs/actions - Listar ações únicas (para filtros)
  fastify.get(
    '/audit-logs/actions',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Listar tipos de ações únicas',
        description:
          'Retorna lista de todos os tipos de ações registrados nos logs de auditoria. Útil para popular dropdown de filtros na interface de auditoria.',
        response: {
          200: z.object({
            actions: z.array(z.string()),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_audit_logs']),
    },
    async (request, reply) => {
      // Buscar todas as ações únicas
      const actions = await db
        .selectDistinct({ acao: adminAuditLogs.acao })
        .from(adminAuditLogs);

      return {
        actions: actions.map((a) => a.acao),
      };
    },
  );

  // GET /api/admin/audit-logs/stats - Estatísticas de auditoria
  fastify.get(
    '/audit-logs/stats',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Estatísticas de auditoria',
        description:
          'Retorna estatísticas dos últimos 30 dias: total de logs, contagem por tipo de ação e top 5 admins mais ativos. Útil para dashboard e análise de atividade administrativa.',
        response: {
          200: z.object({
            period: z.object({
              start: wireDate,
              end: wireDate,
              days: z.number(),
            }),
            totalLogs: z.number(),
            actionCounts: z.record(z.string(), z.number()),
            topAdmins: z.array(
              z.object({
                adminId: z.string(),
                nome: z.string(),
                email: z.string().nullable(),
                count: z.number(),
              }),
            ),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_audit_logs']),
    },
    async (request, reply) => {
      // Estatísticas gerais dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentLogs = await db
        .select()
        .from(adminAuditLogs)
        .where(gte(adminAuditLogs.timestamp, thirtyDaysAgo));

      // Contar por ação
      const actionCounts: Record<string, number> = {};
      recentLogs.forEach((log) => {
        actionCounts[log.acao] = (actionCounts[log.acao] || 0) + 1;
      });

      // Contar por admin
      const adminCounts: Record<string, number> = {};
      recentLogs.forEach((log) => {
        adminCounts[log.adminId] = (adminCounts[log.adminId] || 0) + 1;
      });

      // Buscar nomes dos admins mais ativos
      const topAdminIds = Object.entries(adminCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry) => entry[0]);

      const topAdmins = await Promise.all(
        topAdminIds.map(async (id) => {
          const [admin] = await db
            .select({ nome: admins.nome, email: admins.email })
            .from(admins)
            .where(eq(admins.id, id));

          /* v8 ignore next 5 */
          return {
            adminId: id,
            nome: admin?.nome || 'Desconhecido',
            email: admin?.email || null,
            count: adminCounts[id],
          };
        }),
      );

      return {
        period: {
          start: thirtyDaysAgo,
          end: new Date(),
          days: 30,
        },
        totalLogs: recentLogs.length,
        actionCounts,
        topAdmins,
      };
    },
  );
};

export default auditLogsRoutes;
