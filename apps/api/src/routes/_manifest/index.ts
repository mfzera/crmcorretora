import type { FastifyInstance, RouteOptions, HTTPMethods } from 'fastify';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getPermissionMeta } from '@ecotech/plugins/authorization';

type ManifestEntry = {
  method: string;
  path: string;
  permissions: string[];
  mode: 'all' | 'any';
};

function stripApiPrefix(path: string): string {
  return path.startsWith('/api') ? path.slice(4) || '/' : path;
}

/**
 * Instala um hook onRoute que coleta metadata de autorização de cada rota
 * registrada e expõe o resultado em GET /api/_manifest/permissions.
 *
 * O frontend consulta esse manifesto para saber quais permissões cada endpoint
 * exige, e evita disparar requests que o backend rejeitaria com 403.
 *
 * Deve ser chamado ANTES de registrar as rotas da aplicação, caso contrário o
 * hook não vê as rotas já registradas.
 */
export function setupPermissionManifest(app: FastifyInstance): void {
  const entries: ManifestEntry[] = [];

  app.addHook('onRoute', (routeOptions: RouteOptions) => {
    const meta = getPermissionMeta(routeOptions.preHandler);
    if (!meta) return;

    const methods: HTTPMethods[] = Array.isArray(routeOptions.method)
      ? routeOptions.method
      : [routeOptions.method];

    for (const method of methods) {
      const upper = String(method).toUpperCase();
      if (upper === 'HEAD') continue;
      entries.push({
        method: upper,
        path: stripApiPrefix(routeOptions.url),
        permissions: meta.permissions,
        mode: meta.mode,
      });
    }
  });

  // ETag lazy: calculado na primeira request, imutável até restart
  let cachedEtag: string | null = null;

  app.get(
    '/api/_manifest/permissions',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['Sistema'],
        summary: 'Manifesto de permissões por endpoint',
        description:
          'Lista de rotas que exigem permissão. O cliente consulta antes de disparar requests para não fazer chamadas que serão rejeitadas com 403.',
        security: [],
        response: {
          200: z.object({
            success: z.boolean(),
            data: z.object({
              routes: z.array(
                z.object({
                  method: z.string(),
                  path: z.string(),
                  permissions: z.array(z.string()),
                  mode: z.enum(['all', 'any']),
                }),
              ),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      if (!cachedEtag) {
        cachedEtag = createHash('sha256').update(JSON.stringify(entries)).digest('hex').slice(0, 16);
      }
      reply.header('ETag', `"${cachedEtag}"`);
      reply.header('Cache-Control', 'no-cache');
      if (request.headers['if-none-match'] === `"${cachedEtag}"`) {
        return reply.status(304 as Parameters<typeof reply.status>[0]).send();
      }
      return {
        success: true,
        data: { routes: entries },
      };
    },
  );
}
