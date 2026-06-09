import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import { getRedis, withCacheGeneric } from '../../utils/cache.js';
import {
  corretoras,
  usuarios,
  backups,
  storageMetrics,
  clientes,
  anexos,
  cotacoes,
  documentosVenda,
  adminAuditLogs,
} from '@ecotech/shared/database';
import { MetricsService } from '@ecotech/shared/storage';
import { eq, desc, gte, and, isNull, isNotNull, sum, count, avg } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const statsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/stats - Estatísticas globais
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Estatísticas globais do sistema',
        description:
          'Retorna estatísticas consolidadas de todo o sistema SaaS: total de tenants (corretoras), usuários, clientes, arquivos, armazenamento usado e backups ativos. Requer autenticação de administrador.',
        response: {
          200: z.object({
            totalTenants: z.number(),
            totalUsers: z.number(),
            totalClientes: z.number(),
            totalArquivos: z.number(),
            totalStorage: z.number(),
            activeBackups: z.number(),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, reply) => {
      // Total de corretoras
      const [{ count: countTenants }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(corretoras);
      const totalTenants = Number(countTenants);

      // Total de usuários
      const [{ count: countUsers }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(usuarios);
      const totalUsers = Number(countUsers);

      // Total de clientes
      const [{ count: countClientes }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(clientes);
      const totalClientes = Number(countClientes);

      // Total de arquivos
      const [{ count: countArquivos }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(anexos);
      const totalArquivos = Number(countArquivos);

      // Armazenamento total — tenta MetricsService; fallback direto na tabela de anexos
      let totalStorage = 0;
      try {
        const overview = await MetricsService.getGlobalOverview();
        totalStorage = overview.totalBytes;
      } catch {
        // ignore
      }
      if (totalStorage === 0) {
        const [{ total }] = await db
          .select({ total: sql<number>`COALESCE(sum(${anexos.tamanho}), 0)` })
          .from(anexos);
        totalStorage = Number(total);
      }

      // Backups concluídos (independente de verificação)
      const [{ count: countBackups }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(backups)
        .where(eq(backups.status, 'concluido'));
      const activeBackups = Number(countBackups);

      await fastify.auditService.logViewGlobalMetrics(
        request.admin!.id,
        request.admin!.email,
        request,
      );

      return {
        totalTenants,
        totalUsers,
        totalClientes,
        totalArquivos,
        totalStorage,
        activeBackups,
      };
    },
  );

  // GET /api/admin/stats/usage - Histórico de uso agregado
  fastify.get(
    '/stats/usage',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Histórico de uso agregado',
        description:
          'Retorna série temporal agregada de uso de armazenamento e requests de todos os tenants. Padrão: últimos 30 dias. Útil para análise de crescimento do sistema.',
        querystring: z.object({
          days: z.coerce.number().min(1).max(365).default(30).optional(),
        }),
        response: {
          200: z.array(z.object({
            date: z.string(),
            storage: z.number(),
            requests: z.number(),
          })),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, reply) => {
      const days = request.query.days ?? 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Buscar métricas agregadas por data
      const metricsHistory = await db
        .select({
          data: storageMetrics.data,
          totalBytes: sql<number>`sum(${storageMetrics.totalBytes})`,
          totalArquivos: sql<number>`sum(${storageMetrics.totalArquivos})`,
        })
        .from(storageMetrics)
        .where(gte(storageMetrics.data, startDateStr))
        .groupBy(storageMetrics.data)
        .orderBy(desc(storageMetrics.data))
        .limit(days);

      // Formatar resposta
      const usageHistory = metricsHistory.map((metric) => ({
        date: metric.data,
        storage: Number(metric.totalBytes),
        requests: Number(metric.totalArquivos),
      }));

      return usageHistory;
    },
  );

  // GET /api/admin/stats/charts - Dados agregados para gráficos do dashboard
  fastify.get(
    '/stats/charts',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Dados para gráficos do dashboard',
        description:
          'Retorna séries temporais agregadas para os gráficos do overview: receita mensal (invoices), prêmio líquido mensal (cotações), histórico diário de backups e anomalias de sistema.',
        response: {
          200: z.unknown(),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (_request, _reply) => {
      const now = new Date();

      const twelveMonthsAgo = new Date(now);
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // ── 1. Média de comissão mensal (documentos ATIVOS) ───────────────────
      const revenueRows = await db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${documentosVenda.createdAt}), 'YYYY-MM')`,
          total: avg(documentosVenda.percentualComissao),
          qty: count(),
        })
        .from(documentosVenda)
        .where(
          and(
            eq(documentosVenda.status, 'ATIVO'),
            isNull(documentosVenda.deletedAt),
            isNotNull(documentosVenda.percentualComissao),
            gte(documentosVenda.createdAt, twelveMonthsAgo),
          ),
        )
        .groupBy(sql`date_trunc('month', ${documentosVenda.createdAt})`)
        .orderBy(sql`date_trunc('month', ${documentosVenda.createdAt})`);

      // ── 2. Prêmio líquido mensal (cotações criadas) ───────────────────────
      const premiumRows = await db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${cotacoes.createdAt}), 'YYYY-MM')`,
          total: sum(cotacoes.premioLiquido),
          qty: count(),
        })
        .from(cotacoes)
        .where(
          and(
            isNotNull(cotacoes.premioLiquido),
            isNull(cotacoes.deletedAt),
            gte(cotacoes.createdAt, twelveMonthsAgo),
          ),
        )
        .groupBy(sql`date_trunc('month', ${cotacoes.createdAt})`)
        .orderBy(sql`date_trunc('month', ${cotacoes.createdAt})`);

      // ── 3. Histórico diário de backups (últimos 30 dias) ──────────────────
      const backupRows = await db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${backups.iniciadoEm}), 'YYYY-MM-DD')`,
          status: backups.status,
          qty: count(),
          bytes: sum(backups.totalBytes),
          duration: sql<number>`round(avg(${backups.duracaoSegundos}))`,
        })
        .from(backups)
        .where(gte(backups.iniciadoEm, thirtyDaysAgo))
        .groupBy(
          sql`date_trunc('day', ${backups.iniciadoEm})`,
          backups.status,
        )
        .orderBy(sql`date_trunc('day', ${backups.iniciadoEm})`);

      // Pivot: { day, concluido, falhou, em_progresso, bytes, duration }
      const backupByDay = new Map<
        string,
        { day: string; concluido: number; falhou: number; em_progresso: number; bytes: number; duration: number }
      >();
      for (const row of backupRows) {
        const d = row.day;
        if (!backupByDay.has(d)) {
          backupByDay.set(d, { day: d, concluido: 0, falhou: 0, em_progresso: 0, bytes: 0, duration: 0 });
        }
        const entry = backupByDay.get(d)!;
        entry[row.status as 'concluido' | 'falhou' | 'em_progresso'] += Number(row.qty);
        entry.bytes += Number(row.bytes ?? 0);
        if (row.status === 'concluido') entry.duration = Number(row.duration ?? 0);
      }

      // ── 4. Anomalias diárias (ações de erro nos audit logs admin) ─────────
      const anomalyRows = await db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${adminAuditLogs.timestamp}), 'YYYY-MM-DD')`,
          qty: count(),
        })
        .from(adminAuditLogs)
        .where(
          and(
            gte(adminAuditLogs.timestamp, thirtyDaysAgo),
            sql`(
              ${adminAuditLogs.acao} ILIKE '%falhou%'
              OR ${adminAuditLogs.acao} ILIKE '%erro%'
              OR ${adminAuditLogs.acao} ILIKE '%failed%'
              OR ${adminAuditLogs.acao} ILIKE '%error%'
              OR ${adminAuditLogs.acao} ILIKE '%falha%'
            )`,
          ),
        )
        .groupBy(sql`date_trunc('day', ${adminAuditLogs.timestamp})`)
        .orderBy(sql`date_trunc('day', ${adminAuditLogs.timestamp})`);

      return {
        monthlyRevenue: revenueRows.map((r) => ({
          month: r.month,
          total: Number(r.total ?? 0),
          count: Number(r.qty),
        })),
        monthlyPremium: premiumRows.map((r) => ({
          month: r.month,
          total: Number(r.total ?? 0),
          count: Number(r.qty),
        })),
        dailyBackups: Array.from(backupByDay.values()),
        dailyAnomalies: anomalyRows.map((r) => ({
          day: r.day,
          count: Number(r.qty),
        })),
      };
    },
  );

  // GET /api/admin/stats/tenants-summary - Resumo por tenant para os cards do dashboard
  fastify.get(
    '/stats/tenants-summary',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Resumo de tenants para o dashboard',
        description: 'Retorna contagem de clientes e usuários por corretora, ordenado por volume de clientes.',
        response: {
          200: z.array(z.object({
            id: z.string().uuid(),
            nome: z.string(),
            clienteCount: z.number(),
            userCount: z.number(),
          })),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async () => {
      const rows = await db
        .select({
          id: corretoras.id,
          nome: corretoras.razaoSocial,
          clienteCount: sql<number>`count(distinct ${clientes.id})`,
          userCount: sql<number>`count(distinct ${usuarios.id})`,
        })
        .from(corretoras)
        .leftJoin(clientes, and(eq(clientes.corretoraId, corretoras.id), isNull(clientes.deletedAt)))
        .leftJoin(usuarios, and(eq(usuarios.corretoraId, corretoras.id), isNull(usuarios.deletedAt)))
        .groupBy(corretoras.id, corretoras.razaoSocial)
        .orderBy(desc(sql`count(distinct ${clientes.id})`));

      return rows.map((r) => ({
        id: r.id,
        nome: r.nome,
        clienteCount: Number(r.clienteCount),
        userCount: Number(r.userCount),
      }));
    },
  );

  // GET /api/admin/stats/http-metrics - Métricas HTTP das últimas 24h
  fastify.get(
    '/stats/http-metrics',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Métricas HTTP das últimas 24h',
        description: 'Lê do Redis os contadores de requests HTTP por classe de status (2xx/4xx/5xx) nas últimas 24 horas, retornando totais e série horária.',
        response: {
          200: z.unknown(),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async () => {
      try {
        const redis = getRedis();
        const now = new Date();

        const hourKeys = Array.from({ length: 24 }, (_, i) => {
          const d = new Date(now.getTime() - i * 3600 * 1000);
          return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0'),
            String(d.getHours()).padStart(2, '0'),
          ].join('-');
        }).reverse();

        const hourly = await Promise.all(
          hourKeys.map(async (hk) => {
            const [v2, v4, v5] = await Promise.all([
              redis.get(`admin:http:2xx:${hk}`),
              redis.get(`admin:http:4xx:${hk}`),
              redis.get(`admin:http:5xx:${hk}`),
            ]);
            const [, , , hh] = hk.split('-');
            return {
              hour: `${hh}:00`,
              s2xx: Number(v2 ?? 0),
              s4xx: Number(v4 ?? 0),
              s5xx: Number(v5 ?? 0),
            };
          }),
        );

        const total2xx = hourly.reduce((a, h) => a + h.s2xx, 0);
        const total4xx = hourly.reduce((a, h) => a + h.s4xx, 0);
        const total5xx = hourly.reduce((a, h) => a + h.s5xx, 0);
        const total    = total2xx + total4xx + total5xx;
        const errorRate = total > 0
          ? Number(((total4xx + total5xx) / total * 100).toFixed(2))
          : null;

        return {
          available: true,
          last24h: { total, s2xx: total2xx, s4xx: total4xx, s5xx: total5xx, errorRate },
          hourly,
        };
      } catch {
        return { available: false, last24h: null, hourly: [] };
      }
    },
  );

  // GET /api/admin/stats/dashboard-init - Bundle crítico do dashboard
  fastify.get(
    '/stats/dashboard-init',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Bundle inicial do dashboard admin',
        description: 'Retorna stats globais, resumo de tenants e métricas HTTP em paralelo, com cache Redis de 20 segundos. Use este endpoint para inicializar o dashboard com uma única requisição.',
        response: {
          200: z.unknown(),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request) => {
      void fastify.auditService
        .logViewGlobalMetrics(request.admin!.id, request.admin!.email, request)
        .catch(() => { /* audit não pode bloquear nem falhar a resposta */ });

      const r2DefaultBucket =
        process.env.CLOUDFLARE_R2_BUCKET || process.env.R2_BUCKET_NAME || null;

      return withCacheGeneric(
        'admin:dashboard-init:v1',
        20,
        async () => {
          const redis = (() => {
            try { return getRedis(); } catch { return null; }
          })();

          const [statsResult, tenantsResult, httpResult] = await Promise.allSettled([
            (async () => {
              const [
                [{ count: countTenants }],
                [{ count: countUsers }],
                [{ count: countClientes }],
                [{ count: countArquivos }],
                [{ count: countBackups }],
              ] = await Promise.all([
                db.select({ count: sql<number>`count(*)` }).from(corretoras),
                db.select({ count: sql<number>`count(*)` }).from(usuarios),
                db.select({ count: sql<number>`count(*)` }).from(clientes),
                db.select({ count: sql<number>`count(*)` }).from(anexos),
                db.select({ count: sql<number>`count(*)` }).from(backups).where(eq(backups.status, 'concluido')),
              ]);

              let totalStorage = 0;
              try {
                const overview = await MetricsService.getGlobalOverview();
                totalStorage = overview.totalBytes;
              } catch { /* ignore */ }
              if (totalStorage === 0) {
                const [{ total }] = await db
                  .select({ total: sql<number>`COALESCE(sum(${anexos.tamanho}), 0)` })
                  .from(anexos);
                totalStorage = Number(total);
              }

              return {
                totalTenants: Number(countTenants),
                totalUsers: Number(countUsers),
                totalClientes: Number(countClientes),
                totalArquivos: Number(countArquivos),
                totalStorage,
                activeBackups: Number(countBackups),
              };
            })(),

            (async () => {
              const rows = await db
                .select({
                  id: corretoras.id,
                  nome: corretoras.razaoSocial,
                  clienteCount: sql<number>`count(distinct ${clientes.id})`,
                  userCount: sql<number>`count(distinct ${usuarios.id})`,
                })
                .from(corretoras)
                .leftJoin(clientes, and(eq(clientes.corretoraId, corretoras.id), isNull(clientes.deletedAt)))
                .leftJoin(usuarios, and(eq(usuarios.corretoraId, corretoras.id), isNull(usuarios.deletedAt)))
                .groupBy(corretoras.id, corretoras.razaoSocial)
                .orderBy(desc(sql`count(distinct ${clientes.id})`));

              return rows.map((r) => ({
                id: r.id,
                nome: r.nome,
                clienteCount: Number(r.clienteCount),
                userCount: Number(r.userCount),
              }));
            })(),

            (async () => {
              if (!redis) return { available: false, last24h: null, hourly: [] };
              const now = new Date();
              const hourKeys = Array.from({ length: 24 }, (_, i) => {
                const d = new Date(now.getTime() - i * 3600 * 1000);
                return [
                  d.getFullYear(),
                  String(d.getMonth() + 1).padStart(2, '0'),
                  String(d.getDate()).padStart(2, '0'),
                  String(d.getHours()).padStart(2, '0'),
                ].join('-');
              }).reverse();

              // MGET em batch único — 1 RTT para 72 chaves em vez de 24 RTTs paralelos
              const mgetKeys = hourKeys.flatMap((hk) => [
                `admin:http:2xx:${hk}`,
                `admin:http:4xx:${hk}`,
                `admin:http:5xx:${hk}`,
              ]);
              const raw = await redis.mget(...mgetKeys);

              const hourly = hourKeys.map((hk, i) => {
                const [, , , hh] = hk.split('-');
                return {
                  hour: `${hh}:00`,
                  s2xx: Number(raw[i * 3] ?? 0),
                  s4xx: Number(raw[i * 3 + 1] ?? 0),
                  s5xx: Number(raw[i * 3 + 2] ?? 0),
                };
              });

              const total2xx = hourly.reduce((a, h) => a + h.s2xx, 0);
              const total4xx = hourly.reduce((a, h) => a + h.s4xx, 0);
              const total5xx = hourly.reduce((a, h) => a + h.s5xx, 0);
              const total    = total2xx + total4xx + total5xx;
              const errorRate = total > 0 ? Number(((total4xx + total5xx) / total * 100).toFixed(2)) : null;

              return { available: true, last24h: { total, s2xx: total2xx, s4xx: total4xx, s5xx: total5xx, errorRate }, hourly };
            })(),
          ]);

          return {
            stats: statsResult.status === 'fulfilled' ? statsResult.value : null,
            tenantsSummary: tenantsResult.status === 'fulfilled' ? tenantsResult.value : [],
            httpMetrics: httpResult.status === 'fulfilled' ? httpResult.value : { available: false, last24h: null, hourly: [] },
            r2DefaultBucket,
          };
        },
      );
    },
  );
};

export default statsRoutes;
