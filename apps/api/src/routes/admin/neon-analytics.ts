import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import { sql } from 'drizzle-orm';
import { rowsSamplesBuffer } from '../../plugins/neon-rows-sampler.js';

const NEON_API_URL = 'https://console.neon.tech/api/v2';

// ─── API response types ───────────────────────────────────────────────────────

interface NeonProject {
  id: string;
  name: string;
  region_id: string;
  pg_version: number;
  created_at: string;
  updated_at: string;
  cpu_used_sec: number;
  active_time_seconds: number;
  compute_time_seconds: number;
  data_storage_bytes_hour: number;
  data_transfer_bytes: number;
  written_data_bytes: number;
  synthetic_storage_size: number;
  branch_logical_size_limit_bytes: number;
  consumption_period_start: string;
  consumption_period_end: string;
  owner?: {
    subscription_type: string;
    email: string;
  };
}

interface NeonProjectConsumptionPeriod {
  period_start: string;
  compute_unit_seconds: number;
  written_data_bytes: number;
  data_transfer_bytes: number;
  data_storage_bytes_hour: number;
}

interface NeonOrgConsumptionProject {
  project_id: string;
  periods: NeonProjectConsumptionPeriod[];
}

// ─── Config helpers ───────────────────────────────────────────────────────────

function isDevMode(): boolean {
  return !process.env.NEON_API_KEY;
}

function getProjectId(): string | null {
  return process.env.NEON_PROJECT_ID ?? null;
}

function getOrgId(): string | null {
  return process.env.NEON_ORG_ID ?? null;
}

function getISOStr(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

async function neonFetch(path: string, apiKey: string): Promise<Response> {
  return fetch(`${NEON_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const neonAnalyticsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/neon/projects
  fastify.get(
    '/neon/projects',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Listar projetos Neon',
        description:
          'Lista projetos Neon com métricas de uso. Suporta chave org-level (NEON_ORG_ID) ' +
          'ou chave project-scoped (NEON_PROJECT_ID).',
        response: {
          200: z.unknown(),
          502: z.object({
            error: z.string(),
            details: z.array(z.string()),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (_request, reply) => {
      if (isDevMode()) {
        return {
          available: false,
          message: 'Neon API disponível apenas em produção. Configure NEON_API_KEY.',
          mode: 'dev',
          projects: [],
        };
      }

      const apiKey = process.env.NEON_API_KEY!;
      const projectId = getProjectId();

      // ── Project-scoped key: busca projeto diretamente ──
      if (projectId) {
        const resp = await neonFetch(`/projects/${projectId}`, apiKey);
        if (!resp.ok) {
          return reply.status(502).send({
            error: 'Falha ao buscar projeto Neon',
            details: [`HTTP ${resp.status}: ${resp.statusText}`],
          });
        }
        const result = (await resp.json()) as { project: NeonProject };
        return { available: true, mode: 'project', projects: [result.project] };
      }

      // ── Org-level key: lista todos os projetos ──
      const resp = await neonFetch('/projects', apiKey);
      if (!resp.ok) {
        return reply.status(502).send({
          error: 'Falha ao listar projetos Neon',
          details: [`HTTP ${resp.status}: ${resp.statusText}`],
        });
      }
      const result = (await resp.json()) as { projects: NeonProject[] };
      return { available: true, mode: 'org', projects: result.projects ?? [] };
    },
  );

  // GET /api/admin/neon/analytics/consumption
  fastify.get(
    '/neon/analytics/consumption',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Consumo Neon',
        description:
          'Com NEON_PROJECT_ID (project-scoped): retorna totais do billing period atual. ' +
          'Com NEON_ORG_ID (org-level): retorna histórico diário via /consumption_history/v2.',
        querystring: z.object({
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
        }),
        response: {
          200: z.unknown(),
          502: z.object({
            error: z.string(),
            details: z.array(z.string()),
          }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, reply) => {
      if (isDevMode()) {
        return {
          available: false,
          message: 'Neon API disponível apenas em produção. Configure NEON_API_KEY.',
          mode: 'dev',
          data: [],
          meta: {},
        };
      }

      const apiKey = process.env.NEON_API_KEY!;
      const projectId = getProjectId();
      const orgId = getOrgId();
      const from = request.query.dateFrom ?? getISOStr(30);
      const to   = request.query.dateTo   ?? getISOStr(0);

      // ── Project-scoped key: usa dados do billing period atual ──
      if (projectId) {
        const resp = await neonFetch(`/projects/${projectId}`, apiKey);
        if (!resp.ok) {
          return reply.status(502).send({
            error: 'Falha ao buscar projeto Neon',
            details: [`HTTP ${resp.status}: ${resp.statusText}`],
          });
        }
        const result = (await resp.json()) as { project: NeonProject };
        const p = result.project;

        const data = [
          {
            project_id: p.id,
            project_name: p.name,
            subscription_type: p.owner?.subscription_type ?? null,
            consumption_period_start: p.consumption_period_start,
            consumption_period_end: p.consumption_period_end,
            synthetic_storage_size: p.synthetic_storage_size ?? 0,
            periods: [
              {
                period_start: p.consumption_period_start,
                compute_unit_seconds: p.cpu_used_sec ?? 0,
                written_data_bytes: p.written_data_bytes ?? 0,
                data_transfer_bytes: p.data_transfer_bytes ?? 0,
                data_storage_bytes_hour: p.data_storage_bytes_hour ?? 0,
              },
            ],
          },
        ];

        await fastify.auditService.log({
          adminId: request.admin!.id,
          acao: 'view_neon_analytics_consumption',
          detalhes: { projectId, mode: 'project', from, to },
          request,
        });

        return {
          available: true,
          mode: 'project',
          data,
          meta: {
            from: p.consumption_period_start,
            to: p.consumption_period_end,
            totalProjects: 1,
            mode: 'project',
            note: 'Dados do billing period atual. Para histórico diário configure uma chave org-level com NEON_ORG_ID.',
          },
        };
      }

      // ── Org-level key: histórico diário ──
      if (!orgId) {
        return {
          available: false,
          message: 'Configure NEON_PROJECT_ID (project-scoped) ou NEON_ORG_ID (org-level) para ver dados.',
          mode: 'unconfigured',
          data: [],
          meta: {},
        };
      }

      const params = new URLSearchParams({
        from,
        to,
        granularity: 'daily',
        org_id: orgId,
        metrics: 'compute_time_seconds,data_storage_bytes_hour,data_transfer_bytes,written_data_bytes',
      });

      const resp = await neonFetch(`/consumption_history/v2/projects?${params}`, apiKey);
      if (!resp.ok) {
        return reply.status(502).send({
          error: 'Falha ao consultar Neon Consumption API',
          details: [`HTTP ${resp.status}: ${resp.statusText}`],
        });
      }

      const result = (await resp.json()) as { projects: NeonOrgConsumptionProject[] };

      // Enriquecer com nomes de projetos
      const nameMap: Record<string, string> = {};
      const projResp = await neonFetch('/projects', apiKey);
      if (projResp.ok) {
        const pl = (await projResp.json()) as { projects: NeonProject[] };
        for (const proj of pl.projects ?? []) nameMap[proj.id] = proj.name;
      }

      const data = (result.projects ?? []).map((proj) => ({
        project_id: proj.project_id,
        project_name: nameMap[proj.project_id] ?? proj.project_id,
        periods: proj.periods ?? [],
      }));

      await fastify.auditService.log({
        adminId: request.admin!.id,
        acao: 'view_neon_analytics_consumption',
        detalhes: { orgId, mode: 'org', from, to, totalProjects: data.length },
        request,
      });

      return {
        available: true,
        mode: 'org',
        data,
        meta: { from, to, totalProjects: data.length, mode: 'org' },
      };
    },
  );

  // GET /api/admin/neon/analytics/metrics-timeseries
  fastify.get(
    '/neon/analytics/metrics-timeseries',
    {
      schema: {
        tags: ['Admin'],
        querystring: z.object({
          from: z.string().optional(),
          to: z.string().optional(),
        }),
        response: {
          200: z.unknown(),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, _reply) => {
      if (isDevMode()) {
        return { available: false, message: 'Configure NEON_API_KEY.', from: '', to: '', series: [] };
      }

      const projectId = getProjectId();
      if (!projectId) {
        return { available: false, message: 'Configure NEON_PROJECT_ID.', from: '', to: '', series: [] };
      }

      const apiKey = process.env.NEON_API_KEY!;
      const to   = request.query.to   ?? new Date().toISOString();
      const from = request.query.from ?? new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

      const metrics = [
        'rows_inserted_to_tables',
        'rows_updated_in_tables',
        'rows_deleted_from_tables',
      ];

      const params = new URLSearchParams({ from, to });
      for (const m of metrics) params.append('metrics[]', m);

      const resp = await neonFetch(`/projects/${projectId}/metrics?${params}`, apiKey);

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        return {
          available: false,
          message: `Neon metrics API: HTTP ${resp.status} — ${body.slice(0, 200)}`,
          from, to, series: [],
        };
      }

      // Neon returns: { metrics: { metric_name: [ { timestamp, value }, ... ] } }
      // or: { metrics: [ { metric_name, data: [ { timestamp, value } ] } ] }
      // Handle both shapes.
      const raw = await resp.json() as Record<string, unknown>;

      type Point = { timestamp: string; value: number };
      let insertedPts: Point[] = [];
      let updatedPts:  Point[] = [];
      let deletedPts:  Point[] = [];

      const metricsRaw = raw['metrics'];
      if (Array.isArray(metricsRaw)) {
        // Shape: array of { metric_name, data: Point[] }
        for (const entry of metricsRaw as { metric_name: string; data: Point[] }[]) {
          if (entry.metric_name === 'rows_inserted_to_tables') insertedPts = entry.data ?? [];
          if (entry.metric_name === 'rows_updated_in_tables')  updatedPts  = entry.data ?? [];
          if (entry.metric_name === 'rows_deleted_from_tables') deletedPts = entry.data ?? [];
        }
      } else if (metricsRaw && typeof metricsRaw === 'object') {
        // Shape: object keyed by metric name
        const m = metricsRaw as Record<string, Point[]>;
        insertedPts = m['rows_inserted_to_tables'] ?? [];
        updatedPts  = m['rows_updated_in_tables']  ?? [];
        deletedPts  = m['rows_deleted_from_tables'] ?? [];
      }

      // Merge all timestamps into one unified series
      const tsSet = new Set<string>([
        ...insertedPts.map((p) => p.timestamp),
        ...updatedPts.map((p)  => p.timestamp),
        ...deletedPts.map((p)  => p.timestamp),
      ]);

      const insertedMap = new Map(insertedPts.map((p) => [p.timestamp, p.value]));
      const updatedMap  = new Map(updatedPts.map((p)  => [p.timestamp, p.value]));
      const deletedMap  = new Map(deletedPts.map((p)  => [p.timestamp, p.value]));

      const series = Array.from(tsSet)
        .sort()
        .map((ts) => ({
          timestamp: ts,
          inserted: insertedMap.get(ts) ?? 0,
          updated:  updatedMap.get(ts)  ?? 0,
          deleted:  deletedMap.get(ts)  ?? 0,
        }));

      return { available: true, message: '', from, to, series };
    },
  );

  // GET /api/admin/neon/analytics/db-stats
  fastify.get(
    '/neon/analytics/db-stats',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Estatísticas do banco de dados PostgreSQL',
        description:
          'Consulta pg_stat_user_tables e pg_database_size para retornar uso por tabela: ' +
          'linhas vivas, mortas, inserts/updates/deletes, tamanho. Não usa a API Neon externa.',
        response: {
          200: z.unknown(),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (_request, _reply) => {
      type SizeRow = { db_size: string | number | bigint };
      type TableRow = {
        table_name: string;
        live_rows: string | number | bigint;
        dead_rows: string | number | bigint;
        inserts: string | number | bigint;
        updates: string | number | bigint;
        deletes: string | number | bigint;
        table_size_bytes: string | number | bigint;
        total_size_bytes: string | number | bigint;
      };

      const sizeResult = await db.execute(
        sql`SELECT pg_database_size(current_database())::bigint AS db_size`,
      );
      const sizeRow = (sizeResult.rows as unknown as SizeRow[])[0];

      const tableResult = await db.execute(sql`
        SELECT
          relname                                      AS table_name,
          COALESCE(n_live_tup, 0)::bigint             AS live_rows,
          COALESCE(n_dead_tup, 0)::bigint             AS dead_rows,
          COALESCE(n_tup_ins, 0)::bigint              AS inserts,
          COALESCE(n_tup_upd, 0)::bigint              AS updates,
          COALESCE(n_tup_del, 0)::bigint              AS deletes,
          COALESCE(pg_relation_size(relid), 0)::bigint          AS table_size_bytes,
          COALESCE(pg_total_relation_size(relid), 0)::bigint    AS total_size_bytes
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY live_rows DESC
        LIMIT 20
      `);

      const dbSizeBytes = Number(sizeRow?.db_size ?? 0);

      const tables = (tableResult.rows as unknown as TableRow[]).map((r) => ({
        tableName: r.table_name,
        liveRows: Number(r.live_rows),
        deadRows: Number(r.dead_rows),
        inserts: Number(r.inserts),
        updates: Number(r.updates),
        deletes: Number(r.deletes),
        tableSizeBytes: Number(r.table_size_bytes),
        totalSizeBytes: Number(r.total_size_bytes),
      }));

      const totalLiveRows  = tables.reduce((a, t) => a + t.liveRows,  0);
      const totalDeadRows  = tables.reduce((a, t) => a + t.deadRows,  0);
      const totalInserts   = tables.reduce((a, t) => a + t.inserts,   0);
      const totalUpdates   = tables.reduce((a, t) => a + t.updates,   0);
      const totalDeletes   = tables.reduce((a, t) => a + t.deletes,   0);

      return { dbSizeBytes, totalLiveRows, totalDeadRows, totalInserts, totalUpdates, totalDeletes, tables };
    },
  );

  // GET /api/admin/neon/analytics/rows-sample
  fastify.get(
    '/neon/analytics/rows-sample',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Série temporal de rows via pg_stat sampling',
        response: {
          200: z.unknown(),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (_request, _reply) => {
      return {
        available: rowsSamplesBuffer.length > 0,
        message: rowsSamplesBuffer.length === 0 ? 'Aguardando primeira amostra (próxima em 5min).' : '',
        series: rowsSamplesBuffer,
      };
    },
  );
};

export default neonAnalyticsRoutes;
