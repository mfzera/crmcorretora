import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const RAILWAY_GRAPHQL_URL = 'https://backboard.railway.app/graphql/v2';

// ─── API response types ───────────────────────────────────────────────────────

interface RailwayService {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface RailwayEnvironment {
  id: string;
  name: string;
}

interface RailwayProject {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RailwayDeployment {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  serviceId: string;
  environmentId: string;
  staticUrl: string | null;
}

interface RailwayMetric {
  measurement: string;
  tags: {
    serviceId?: string;
    environmentId?: string;
    projectId?: string;
  };
  values: { ts: number; value: number }[];
}

// ─── Config helpers ───────────────────────────────────────────────────────────

function isDevMode(): boolean {
  return !process.env.RAILWAY_TOKEN;
}

function getProjectId(): string | null {
  return process.env.RAILWAY_PROJECT_ID ?? null;
}

function getEnvironmentId(): string | null {
  return process.env.RAILWAY_ENVIRONMENT_ID ?? null;
}

function getISOStr(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

async function railwayFetch(
  query: string,
  variables: Record<string, unknown>,
  token: string,
): Promise<Response> {
  return fetch(RAILWAY_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const railwayAnalyticsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/railway/project
  fastify.get(
    '/railway/project',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Projeto Railway',
        description:
          'Retorna informações do projeto Railway, serviços, ambientes e histórico de deployments. ' +
          'Requer RAILWAY_TOKEN e RAILWAY_PROJECT_ID.',
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
          message: 'Railway API disponível apenas em produção. Configure RAILWAY_TOKEN e RAILWAY_PROJECT_ID.',
          project: null,
          services: [],
          environments: [],
          deployments: [],
        };
      }

      const token = process.env.RAILWAY_TOKEN!;
      const projectId = getProjectId();

      if (!projectId) {
        return {
          available: false,
          message: 'Configure RAILWAY_PROJECT_ID para visualizar dados do Railway.',
          project: null,
          services: [],
          environments: [],
          deployments: [],
        };
      }

      const environmentId = getEnvironmentId();

      // Query project info + services + environments
      const projectQuery = `
        query ProjectInfo($projectId: String!) {
          project(id: $projectId) {
            id
            name
            description
            createdAt
            updatedAt
            services {
              edges {
                node {
                  id
                  name
                  createdAt
                  updatedAt
                }
              }
            }
            environments {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
      `;

      const projectResp = await railwayFetch(projectQuery, { projectId }, token);

      if (!projectResp.ok) {
        return reply.status(502).send({
          error: 'Falha ao consultar Railway API',
          details: [`HTTP ${projectResp.status}: ${projectResp.statusText}`],
        });
      }

      const projectResult = (await projectResp.json()) as {
        data?: {
          project?: RailwayProject & {
            services: { edges: { node: RailwayService }[] };
            environments: { edges: { node: RailwayEnvironment }[] };
          };
        };
        errors?: { message: string }[];
      };

      if (projectResult.errors?.length) {
        return reply.status(502).send({
          error: 'Erro retornado pela Railway API',
          details: projectResult.errors.map((e) => e.message),
        });
      }

      const project = projectResult.data?.project ?? null;
      const services = project?.services.edges.map((e) => e.node) ?? [];
      const environments = project?.environments.edges.map((e) => e.node) ?? [];

      // Query recent deployments
      const deploymentsQuery = `
        query RecentDeployments($projectId: String!, $environmentId: String) {
          deployments(input: {
            projectId: $projectId
            ${environmentId ? 'environmentId: $environmentId' : ''}
          }) {
            edges {
              node {
                id
                status
                createdAt
                updatedAt
                serviceId
                environmentId
                staticUrl
              }
            }
          }
        }
      `;

      const deploymentsResp = await railwayFetch(
        deploymentsQuery,
        environmentId ? { projectId, environmentId } : { projectId },
        token,
      );

      let deployments: RailwayDeployment[] = [];

      if (deploymentsResp.ok) {
        const deploymentsResult = (await deploymentsResp.json()) as {
          data?: { deployments?: { edges: { node: RailwayDeployment }[] } };
          errors?: { message: string }[];
        };

        if (!deploymentsResult.errors?.length) {
          deployments = deploymentsResult.data?.deployments?.edges.map((e) => e.node) ?? [];
          // Mais recentes primeiro, máximo 30
          deployments.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          deployments = deployments.slice(0, 30);
        }
      }

      await fastify.auditService.log({
        adminId: request.admin!.id,
        acao: 'view_railway_project',
        detalhes: {
          projectId,
          totalServices: services.length,
          totalDeployments: deployments.length,
        },
        request,
      });

      return {
        available: true,
        project: project
          ? {
              id: project.id,
              name: project.name,
              description: project.description,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
            }
          : null,
        services,
        environments,
        deployments,
      };
    },
  );

  // GET /api/admin/railway/metrics
  fastify.get(
    '/railway/metrics',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Métricas Railway',
        description:
          'Retorna métricas de CPU, memória e rede de serviços Railway. ' +
          'Requer RAILWAY_TOKEN, RAILWAY_PROJECT_ID e RAILWAY_ENVIRONMENT_ID.',
        querystring: z.object({
          serviceId: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          sampleRateSeconds: z.coerce.number().default(3600).optional(),
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
          message: 'Railway API disponível apenas em produção. Configure RAILWAY_TOKEN.',
          metrics: [],
          meta: {},
        };
      }

      const token = process.env.RAILWAY_TOKEN!;
      const projectId = getProjectId();

      if (!projectId) {
        return {
          available: false,
          message: 'Configure RAILWAY_PROJECT_ID para ver métricas.',
          metrics: [],
          meta: {},
        };
      }

      // Auto-discover environment if RAILWAY_ENVIRONMENT_ID is not set
      let environmentId = getEnvironmentId();
      if (!environmentId) {
        try {
          const envQuery = `
            query($id: String!) {
              project(id: $id) {
                environments { edges { node { id name } } }
              }
            }
          `;
          const envResp = await railwayFetch(envQuery, { id: projectId }, token);
          if (envResp.ok) {
            const envResult = await envResp.json() as {
              data?: { project?: { environments: { edges: { node: { id: string; name: string } }[] } } };
            };
            const edges = envResult.data?.project?.environments?.edges ?? [];
            const prod = edges.find((e) => e.node.name.toLowerCase().includes('production')) ?? edges[0];
            environmentId = prod?.node?.id ?? null;
          }
        } catch {
          // fallthrough — will fail below
        }
      }

      if (!environmentId) {
        return {
          available: false,
          message: 'Não foi possível determinar o environment. Configure RAILWAY_ENVIRONMENT_ID.',
          metrics: [],
          meta: {},
        };
      }

      const {
        serviceId,
        startDate = getISOStr(7),
        endDate = getISOStr(0),
        sampleRateSeconds = 3600,
      } = request.query;

      const metricsQuery = `
        query ServiceMetrics(
          $projectId: String
          $environmentId: String
          $startDate: DateTime!
          $endDate: DateTime
          $measurements: [MetricMeasurement!]!
          $sampleRateSeconds: Int
        ) {
          metrics(
            projectId: $projectId
            environmentId: $environmentId
            startDate: $startDate
            endDate: $endDate
            measurements: $measurements
            sampleRateSeconds: $sampleRateSeconds
          ) {
            measurement
            tags {
              serviceId
              environmentId
              projectId
            }
            values {
              ts
              value
            }
          }
        }
      `;

      const variables: Record<string, unknown> = {
        projectId,
        environmentId,
        startDate,
        endDate,
        measurements: ['CPU_USAGE', 'MEMORY_USAGE_GB', 'NETWORK_TX_GB', 'NETWORK_RX_GB'],
        sampleRateSeconds: Number(sampleRateSeconds),
      };

      if (serviceId) {
        variables.serviceId = serviceId;
      }

      const resp = await railwayFetch(metricsQuery, variables, token);

      if (!resp.ok) {
        return reply.status(502).send({
          error: 'Falha ao consultar métricas Railway',
          details: [`HTTP ${resp.status}: ${resp.statusText}`],
        });
      }

      const result = (await resp.json()) as {
        data?: { metrics?: RailwayMetric[] };
        errors?: { message: string }[];
      };

      if (result.errors?.length) {
        return reply.status(502).send({
          error: 'Erro retornado pela Railway API',
          details: result.errors.map((e) => e.message),
        });
      }

      const metrics = (result.data?.metrics ?? []).map((m) => ({
        ...m,
        measurement: m.measurement.toLowerCase(),
      }));

      await fastify.auditService.log({
        adminId: request.admin!.id,
        acao: 'view_railway_metrics',
        detalhes: { projectId, environmentId, serviceId: serviceId ?? null, startDate, endDate },
        request,
      });

      return {
        available: true,
        metrics,
        meta: {
          serviceId: serviceId ?? null,
          startDate,
          endDate,
        },
      };
    },
  );

  // GET /api/admin/railway/usage
  fastify.get(
    '/railway/usage',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Uso e custo estimado Railway',
        description:
          'Retorna consumo real acumulado e projeção mensal do billing period Railway. ' +
          'Inclui CPU (vCPU-min), memória (GB-min) e rede (GB).',
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
          message: 'Railway API disponível apenas em produção. Configure RAILWAY_TOKEN.',
          actual: null,
          estimated: null,
        };
      }

      const token = process.env.RAILWAY_TOKEN!;
      const projectId = getProjectId();

      if (!projectId) {
        return {
          available: false,
          message: 'Configure RAILWAY_PROJECT_ID para visualizar dados de uso.',
          actual: null,
          estimated: null,
        };
      }

      const measurements = ['CPU_USAGE', 'MEMORY_USAGE_GB', 'NETWORK_TX_GB', 'NETWORK_RX_GB'];

      const usageQuery = `
        query ProjectUsage($projectId: String!, $measurements: [MetricMeasurement!]!) {
          actual: usage(measurements: $measurements, projectId: $projectId) {
            measurement
            value
          }
          estimated: estimatedUsage(measurements: $measurements, projectId: $projectId) {
            measurement
            estimatedValue
          }
        }
      `;

      const resp = await railwayFetch(usageQuery, { projectId, measurements }, token);

      if (!resp.ok) {
        return reply.status(502).send({
          error: 'Falha ao consultar Railway usage API',
          details: [`HTTP ${resp.status}: ${resp.statusText}`],
        });
      }

      const result = (await resp.json()) as {
        data?: {
          actual?: { measurement: string; value: number }[];
          estimated?: { measurement: string; estimatedValue: number }[];
        };
        errors?: { message: string }[];
      };

      if (result.errors?.length) {
        return reply.status(502).send({
          error: 'Erro retornado pela Railway API',
          details: result.errors.map((e) => e.message),
        });
      }

      const toMap = (items: { measurement: string; value?: number; estimatedValue?: number }[]) => {
        const m: Record<string, number> = {};
        for (const item of items) m[item.measurement] = item.value ?? item.estimatedValue ?? 0;
        return m;
      };

      const actualMap   = toMap(result.data?.actual   ?? []);
      const estimatedMap = toMap(result.data?.estimated ?? []);

      return {
        available: true,
        actual: {
          cpuMinutes:      actualMap['CPU_USAGE']       ?? 0,
          memoryGBMinutes: actualMap['MEMORY_USAGE_GB'] ?? 0,
          networkTxGB:     actualMap['NETWORK_TX_GB']   ?? 0,
          networkRxGB:     actualMap['NETWORK_RX_GB']   ?? 0,
        },
        estimated: {
          cpuMinutes:      estimatedMap['CPU_USAGE']       ?? 0,
          memoryGBMinutes: estimatedMap['MEMORY_USAGE_GB'] ?? 0,
          networkTxGB:     estimatedMap['NETWORK_TX_GB']   ?? 0,
          networkRxGB:     estimatedMap['NETWORK_RX_GB']   ?? 0,
        },
      };
    },
  );
};

export default railwayAnalyticsRoutes;
