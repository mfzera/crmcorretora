import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const VERCEL_API_URL = 'https://api.vercel.com';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  readyState: string;
  created: number;
  ready: number | null;
  buildingAt: number | null;
  source: string | null;
  meta: {
    githubCommitMessage?: string;
    githubCommitRef?: string;
    githubCommitSha?: string;
    githubCommitAuthorName?: string;
  };
  creator: { username: string } | null;
}

interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  nodeVersion: string | null;
  createdAt: number;
  updatedAt: number;
  link?: {
    type: string;
    repo?: string;
    repoId?: number;
    org?: string;
    defaultBranch?: string;
  };
  latestDeployments?: VercelDeployment[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isDevMode(): boolean {
  return !process.env.VERCEL_TOKEN || !process.env.VERCEL_PROJECT_ID;
}

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function teamQuery(): string {
  return process.env.VERCEL_TEAM_ID ? `&teamId=${process.env.VERCEL_TEAM_ID}` : '';
}

async function vercelFetch(path: string): Promise<Response> {
  return fetch(`${VERCEL_API_URL}${path}`, { headers: getHeaders() });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const vercelAnalyticsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/vercel/project
  fastify.get(
    '/vercel/project',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Vercel Project Info',
        description: 'Retorna dados do projeto Vercel e deployments recentes.',
        response: {
          200: z.unknown(),
          502: z.unknown(),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, reply) => {
      if (isDevMode()) {
        return {
          available: false,
          message: 'Configure VERCEL_TOKEN e VERCEL_PROJECT_ID para visualizar dados do Vercel.',
        };
      }

      const projectId = process.env.VERCEL_PROJECT_ID!;
      const tq = teamQuery();

      const resp = await vercelFetch(`/v9/projects/${projectId}?${tq}`);
      if (!resp.ok) {
        let body: unknown;
        try { body = await resp.json(); } catch { body = await resp.text().catch(() => null); }
        return reply.status(502).send({
          error: 'Falha ao buscar projeto Vercel',
          details: [`HTTP ${resp.status}: ${resp.statusText}`],
          vercelError: body,
        });
      }
      const project = (await resp.json()) as VercelProject;

      await fastify.auditService.log({
        adminId: request.admin!.id,
        acao: 'view_vercel_analytics',
        detalhes: { projectId, projectName: project.name },
        request,
      });

      return { available: true, project };
    },
  );

  // GET /api/admin/vercel/deployments
  fastify.get(
    '/vercel/deployments',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Vercel Deployments',
        description: 'Lista deployments do projeto Vercel com estado e métricas de duração.',
        querystring: z.object({
          limit: z.string().optional(),
          since: z.string().optional(),
          until: z.string().optional(),
        }),
        response: {
          200: z.unknown(),
          502: z.unknown(),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['view_usage']),
    },
    async (request, reply) => {
      if (isDevMode()) {
        return {
          available: false,
          message: 'Configure VERCEL_TOKEN e VERCEL_PROJECT_ID para visualizar dados do Vercel.',
          deployments: [],
        };
      }

      const projectId = process.env.VERCEL_PROJECT_ID!;
      const limit  = request.query.limit ?? '50';
      const since  = request.query.since;
      const until  = request.query.until;

      const params = new URLSearchParams({
        projectId,
        limit,
        ...(since ? { since } : {}),
        ...(until ? { until } : {}),
      });

      if (process.env.VERCEL_TEAM_ID) {
        params.set('teamId', process.env.VERCEL_TEAM_ID);
      }

      const resp = await vercelFetch(`/v6/deployments?${params}`);
      if (!resp.ok) {
        let body: unknown;
        try { body = await resp.json(); } catch { body = await resp.text().catch(() => null); }
        return reply.status(502).send({
          error: 'Falha ao listar deployments Vercel',
          details: [`HTTP ${resp.status}: ${resp.statusText}`],
          vercelError: body,
        });
      }

      const result = (await resp.json()) as { deployments: VercelDeployment[] };
      const deployments = (result.deployments ?? []).map((d) => ({
        uid:           d.uid,
        name:          d.name,
        url:           d.url,
        state:         d.state,
        created:       d.created,
        ready:         d.ready,
        buildingAt:    d.buildingAt,
        // duração de build em segundos
        buildDuration: d.buildingAt && d.ready ? Math.round((d.ready - d.buildingAt) / 1000) : null,
        source:        d.source,
        commitMessage: d.meta?.githubCommitMessage ?? null,
        commitRef:     d.meta?.githubCommitRef ?? null,
        commitSha:     d.meta?.githubCommitSha?.slice(0, 7) ?? null,
        commitAuthor:  d.meta?.githubCommitAuthorName ?? null,
        creator:       d.creator?.username ?? null,
      }));

      return { available: true, deployments };
    },
  );
};

export default vercelAnalyticsRoutes;
