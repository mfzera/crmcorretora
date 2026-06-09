/**
 * Audita rotas registradas no Fastify e lista as que não têm autorização.
 * Uso: npx tsx apps/api/scripts/audit-permissions.ts
 * Output: CSV em stdout + resumo no stderr.
 */

import Fastify from 'fastify';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Tipos mínimos para analisar rotas sem subir o servidor completo
type RouteInfo = {
  method: string;
  url: string;
  hasAuth: boolean;
  hasPublicTag: boolean;
};

const PUBLIC_PATHS = [
  '/api/health',
  '/api/_manifest/permissions',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/register',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/portal',
  '/api/public',
];

async function buildAudit() {
  const app = Fastify({ logger: false });

  // Registrar plugins mínimos para coletar rotas
  try {
    const { default: appPlugin } = await import('../src/app.js');
    await app.register(appPlugin);
    await app.ready();
  } catch (err) {
    console.error('[audit] Falha ao inicializar app:', err);
    process.exit(1);
  }

  const routes: RouteInfo[] = [];

  for (const route of app.routes?.() ?? []) {
    const method = String(route.method).toUpperCase();
    if (method === 'HEAD' || method === 'OPTIONS') continue;

    const isPublicPath = PUBLIC_PATHS.some((p) => route.url.startsWith(p));
    const preHandlers = Array.isArray(route.handler) ? route.handler : [route.handler];
    const hasAuthHandler = preHandlers.some(
      (fn: any) => fn?.__permissionMeta || fn?.name === 'authenticate' || fn?.name === 'requireAdmin',
    );
    const routePreHandlers = Array.isArray(route.constraints) ? [] : [];
    const hasAuth = isPublicPath || hasAuthHandler;

    routes.push({
      method,
      url: route.url,
      hasAuth,
      hasPublicTag: isPublicPath,
    });
  }

  const unprotected = routes.filter((r) => !r.hasAuth);

  // CSV output
  const csv = [
    'method,url,status',
    ...routes.map((r) => `${r.method},${r.url},${r.hasAuth ? 'OK' : 'UNPROTECTED'}`),
  ].join('\n');

  const outPath = join(process.cwd(), 'dist', 'audit-permissions.csv');
  try {
    writeFileSync(outPath, csv, 'utf-8');
    console.error(`[audit] CSV salvo em: ${outPath}`);
  } catch {
    // Se não conseguir salvar, imprime no stdout
    console.log(csv);
  }

  console.error(`\n[audit] Resumo:`);
  console.error(`  Total de rotas: ${routes.length}`);
  console.error(`  Rotas protegidas: ${routes.length - unprotected.length}`);
  console.error(`  Rotas sem autorização: ${unprotected.length}`);

  if (unprotected.length > 0) {
    console.error('\n[audit] Rotas sem autorização:');
    unprotected.forEach((r) => console.error(`  ${r.method} ${r.url}`));
    process.exit(1);
  }

  await app.close();
}

buildAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
