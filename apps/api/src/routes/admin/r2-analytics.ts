import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const CLOUDFLARE_GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';

interface R2OperationGroup {
  dimensions: {
    actionType: string;
    bucketName: string;
    date: string;
  };
  sum: {
    requests: number;
    responseObjectSize: number;
  };
}

interface CloudflareGraphQLResponse {
  data?: {
    viewer?: {
      accounts?: Array<{
        r2OperationsAdaptiveGroups?: R2OperationGroup[];
        r2StorageAdaptiveGroups?: CloudflareStorageGroup[];
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

interface CloudflareStorageGroup {
  dimensions: { bucketName: string; date?: string };
  max: {
    objectCount: number | null;
    payloadSize: number | null;
    metadataSize: number | null;
    uploadCount: number | null;
  };
}

function isDevMode(): boolean {
  const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
  return !accountId || accountId === 'local-dev' || !process.env.CLOUDFLARE_API_TOKEN;
}

function getDateStr(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
}

const r2AnalyticsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/r2/buckets - Lista buckets R2 da conta Cloudflare
  fastify.get(
    '/r2/buckets',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Listar buckets R2',
        description: 'Lista todos os buckets R2 da conta Cloudflare via REST API.',
        response: {
          200: z.unknown(),
          502: z.object({
            error: z.string(),
            details: z.array(z.unknown()),
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
          message: 'Cloudflare API disponível apenas em produção.',
          buckets: [],
        };
      }

      const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID)!;
      const apiToken = process.env.CLOUDFLARE_API_TOKEN!;

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`,
        { headers: { Authorization: `Bearer ${apiToken}` } },
      );

      if (!response.ok) {
        return reply.status(502).send({
          error: 'Falha ao listar buckets',
          details: [`HTTP ${response.status}`],
        });
      }

      const result = await response.json() as {
        success: boolean;
        result: { buckets: Array<{ name: string; creation_date: string }> };
      };

      return {
        available: true,
        buckets: result.result?.buckets ?? [],
      };
    },
  );

  // GET /api/admin/r2/analytics/operations - Operações R2 via GraphQL Analytics API
  fastify.get(
    '/r2/analytics/operations',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Operações R2 via Cloudflare GraphQL Analytics API',
        description:
          'Consulta operações de leitura/escrita nos buckets R2 via Cloudflare GraphQL Analytics API. Requer CLOUDFLARE_API_TOKEN configurado com permissão "Account Analytics: Read". Disponível apenas em produção.',
        querystring: z.object({
          bucketName: z.string().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          limit: z.coerce.number().min(1).max(10000).default(10000).optional(),
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
          message:
            'Cloudflare Analytics API disponível apenas em produção. Configure CLOUDFLARE_API_TOKEN e R2_ACCOUNT_ID.',
          data: [],
          meta: {},
        };
      }

      const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID)!;
      const apiToken = process.env.CLOUDFLARE_API_TOKEN!;

      const { bucketName, limit = 10000 } = request.query;
      const dateFrom = request.query.dateFrom || getDateStr(30);
      const dateTo = request.query.dateTo || getDateStr(0);

      const filterParts: string[] = [
        `date_geq: "${dateFrom}"`,
        `date_leq: "${dateTo}"`,
      ];
      if (bucketName) {
        filterParts.push(`bucketName: "${bucketName}"`);
      }

      const query = `{
        viewer {
          accounts(filter: { accountTag: "${accountId}" }) {
            r2OperationsAdaptiveGroups(
              filter: { ${filterParts.join(', ')} }
              limit: ${limit}
              orderBy: [date_ASC]
            ) {
              dimensions {
                actionType
                bucketName
                date
              }
              sum {
                requests
                responseObjectSize
              }
            }
          }
        }
      }`;

      const response = await fetch(CLOUDFLARE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        return reply.status(502).send({
          error: 'Falha ao consultar Cloudflare GraphQL Analytics API',
          details: [`HTTP ${response.status}: ${response.statusText}`],
        });
      }

      const result = (await response.json()) as CloudflareGraphQLResponse;

      if (result.errors?.length) {
        return reply.status(502).send({
          error: 'Erro retornado pela Cloudflare GraphQL API',
          details: result.errors.map((e) => e.message),
        });
      }

      const operations =
        result.data?.viewer?.accounts?.[0]?.r2OperationsAdaptiveGroups ?? [];

      await fastify.auditService.log({
        adminId: request.admin!.id,
        acao: 'view_r2_analytics_operations',
        detalhes: {
          bucketName: bucketName || null,
          dateFrom,
          dateTo,
          totalRecords: operations.length,
        },
        request,
      });

      return {
        available: true,
        data: operations,
        meta: {
          dateFrom,
          dateTo,
          bucketName: bucketName || 'todos',
          totalRecords: operations.length,
        },
      };
    },
  );

  // GET /api/admin/r2/analytics/bucket-metrics - Métricas de armazenamento via GraphQL
  fastify.get(
    '/r2/analytics/bucket-metrics',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Métricas de armazenamento de um bucket R2',
        description:
          'Obtém métricas de armazenamento de um bucket R2 específico via Cloudflare GraphQL Analytics API. Retorna objectCount, payloadSize e metadataSize.',
        querystring: z.object({
          bucketName: z.string(),
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
      const { bucketName } = request.query;

      if (isDevMode()) {
        return {
          available: false,
          message:
            'Cloudflare Analytics API disponível apenas em produção. Configure CLOUDFLARE_API_TOKEN e R2_ACCOUNT_ID.',
          bucket: bucketName,
          storage: null,
        };
      }

      const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID)!;
      const apiToken = process.env.CLOUDFLARE_API_TOKEN!;

      const dateFrom = request.query.dateFrom || getDateStr(30);
      const dateTo = request.query.dateTo || getDateStr(0);

      const query = `{
        viewer {
          accounts(filter: { accountTag: "${accountId}" }) {
            r2StorageAdaptiveGroups(
              filter: {
                bucketName: "${bucketName}"
                date_geq: "${dateFrom}"
                date_leq: "${dateTo}"
              }
              limit: 1
              orderBy: [date_DESC]
            ) {
              dimensions { bucketName date }
              max {
                objectCount
                payloadSize
                metadataSize
                uploadCount
              }
            }
          }
        }
      }`;

      const response = await fetch(CLOUDFLARE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        return reply.status(502).send({
          error: 'Falha ao consultar Cloudflare GraphQL Analytics API',
          details: [`HTTP ${response.status}: ${response.statusText}`],
        });
      }

      const result = (await response.json()) as CloudflareGraphQLResponse;

      if (result.errors?.length) {
        return reply.status(502).send({
          error: 'Erro retornado pela Cloudflare GraphQL API',
          details: result.errors.map((e) => e.message),
        });
      }

      const storageGroups =
        result.data?.viewer?.accounts?.[0]?.r2StorageAdaptiveGroups ?? [];
      const rawMax = storageGroups[0]?.max ?? null;
      const storage = rawMax
        ? {
            objectCount:   rawMax.objectCount   ?? null,
            payloadSize:   rawMax.payloadSize    ?? null,
            metadataSize:  rawMax.metadataSize   ?? null,
            uploadCount:   rawMax.uploadCount    ?? null,
          }
        : null;

      await fastify.auditService.log({
        adminId: request.admin!.id,
        acao: 'view_r2_bucket_metrics',
        detalhes: { bucketName, dateFrom, dateTo },
        request,
      });

      return {
        available: true,
        bucket: bucketName,
        storage,
      };
    },
  );
};

export default r2AnalyticsRoutes;
