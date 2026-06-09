import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const root = resolve(__dirname, '../../..');
const testsDir = resolve(__dirname);

export default defineConfig({
  test: {
    name: 'api-e2e',
    environment: 'node',
    globals: true,
    include: [`${testsDir}/**/*.test.ts`],
    setupFiles: [
      resolve(testsDir, 'setup/env.ts'),
      resolve(testsDir, 'setup/mocks.ts'),
    ],
    globalSetup: resolve(testsDir, 'setup/global-setup.ts'),
    pool: 'forks',
    sequence: { shuffle: false, concurrent: false },
    fileParallelism: false,
    bail: 3,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      include: ['apps/api/src/**/*.ts'],
      exclude: [
        // Entrypoints — não testáveis diretamente
        'apps/api/src/main.ts',
        'apps/api/src/server.ts',
        'apps/api/src/migrations.ts',
        // Worker — processo separado, não coberto por E2E da API
        'apps/api/src/worker/**',
        // Arquivos de declaração de tipos TypeScript
        'apps/api/src/types/**',
        // Módulos com apenas declarações de tipo (augmentação de interface) — sem código executável
        'apps/api/src/routes/portal-segurado/middleware.ts',
        // Schemas Zod/TypeBox — apenas definições de tipo, sem lógica executável
        'apps/api/src/routes/**/schemas.ts',
        'apps/api/src/routes/shared/**',
        // Rotas de debug/manutenção — não testadas em E2E
        'apps/api/src/routes/debug/**',
        'apps/api/src/routes/fix-permissions.ts',
        // Rotas auxiliares de renovações (scripts de manutenção pontuais)
        'apps/api/src/routes/renovacoes/fix-pending-renewals.ts',
        'apps/api/src/routes/renovacoes/limpar-bugadas.ts',
        'apps/api/src/routes/renovacoes/transferir.ts',
        // Stripe — integração externa sem testes E2E configurados
        'apps/api/src/routes/stripe/**',
        // Utilitários não exercitados diretamente pelas rotas testadas
        'apps/api/src/utils/recaptcha.ts',
        'apps/api/src/utils/comissao-automation.ts',
        'apps/api/src/utils/oportunidade-automation.ts',
        // Integrações externas — OAuth/APIs de terceiros sem testes E2E configurados
        'apps/api/src/utils/google-calendar.ts',
        'apps/api/src/utils/meta-api.ts',
        'apps/api/src/routes/auth/google-calendar.ts',
        'apps/api/src/routes/auth/mcp.ts',
        'apps/api/src/routes/whatsapp/**',
        // Analytics de infra — proxies de APIs externas (Railway, R2, Neon, Redis, Vercel)
        'apps/api/src/routes/admin/neon-analytics.ts',
        'apps/api/src/routes/admin/r2-analytics.ts',
        'apps/api/src/routes/admin/railway-analytics.ts',
        'apps/api/src/routes/admin/redis-analytics.ts',
        'apps/api/src/routes/admin/vercel-analytics.ts',
      ],
    },
  },
  poolOptions: {
    forks: { singleFork: true, isolate: true },
  },
  resolve: {
    alias: [
      // Strip .js extensions from relative imports so Vite resolves .ts files.
      // This prevents Drizzle from loading duplicate module instances (one as
      // .js and one as .ts), which breaks relation lookups (referencedTable error).
      {
        find: /^(\..*)\.js$/,
        replacement: '$1',
      },
      // Workspace path aliases — more specific paths before their prefix
      {
        find: '@ecotech/shared/utils/env',
        replacement: `${root}/libs/shared/utils/src/env.ts`,
      },
      {
        find: '@ecotech/shared/utils/logger',
        replacement: `${root}/libs/shared/utils/src/logger.ts`,
      },
      {
        find: '@ecotech/shared/utils/api-helpers',
        replacement: `${root}/libs/shared/utils/src/api-helpers.ts`,
      },
      {
        find: '@ecotech/shared/utils/email.service',
        replacement: `${root}/libs/shared/utils/src/email.service.ts`,
      },
      {
        find: '@ecotech/shared/utils',
        replacement: `${root}/libs/shared/utils/src/index.ts`,
      },
      {
        find: '@ecotech/shared/types',
        replacement: `${root}/libs/shared/types/src/index.ts`,
      },
      {
        find: '@ecotech/shared/config',
        replacement: `${root}/libs/shared/config/src/index.ts`,
      },
      {
        find: '@ecotech/shared/database',
        replacement: `${root}/libs/shared/database/src/index.ts`,
      },
      {
        find: '@ecotech/shared/domain',
        replacement: `${root}/libs/shared/domain/src/index.ts`,
      },
      {
        find: '@ecotech/shared/storage',
        replacement: `${root}/libs/shared/storage/src/index.ts`,
      },
      {
        find: '@ecotech/plugins/auth',
        replacement: `${root}/libs/plugins/auth/src/index.ts`,
      },
      {
        find: '@ecotech/plugins/authorization',
        replacement: `${root}/libs/plugins/authorization/src/index.ts`,
      },
      {
        find: '@ecotech/plugins/chat',
        replacement: `${root}/libs/plugins/chat/src/index.ts`,
      },
      {
        find: '@ecotech/plugins/tenant-isolation',
        replacement: `${root}/libs/plugins/tenant-isolation/src/index.ts`,
      },
      {
        find: '@ecotech/plugins/quota-validator',
        replacement: `${root}/libs/plugins/quota-validator/src/index.ts`,
      },
      {
        find: '@ecotech/plugins/error-handler',
        replacement: `${root}/libs/plugins/error-handler/src/index.ts`,
      },
      {
        find: '@ecotech/plugins/admin-auth',
        replacement: `${root}/libs/plugins/admin-auth/src/index.ts`,
      },
      {
        find: '@ecotech/features/auth',
        replacement: `${root}/libs/features/auth/src/index.ts`,
      },
      {
        find: '@ecotech/features/usuarios',
        replacement: `${root}/libs/features/usuarios/src/index.ts`,
      },
      {
        find: '@ecotech/features/cargos',
        replacement: `${root}/libs/features/cargos/src/index.ts`,
      },
      {
        find: '@ecotech/features/clientes',
        replacement: `${root}/libs/features/clientes/src/index.ts`,
      },
      {
        find: '@ecotech/features/produtos',
        replacement: `${root}/libs/features/produtos/src/index.ts`,
      },
      {
        find: '@ecotech/features/cotacoes',
        replacement: `${root}/libs/features/cotacoes/src/index.ts`,
      },
      {
        find: '@ecotech/features/propostas',
        replacement: `${root}/libs/features/propostas/src/index.ts`,
      },
      {
        find: '@ecotech/features/documentos-venda',
        replacement: `${root}/libs/features/documentos-venda/src/index.ts`,
      },
      {
        find: '@ecotech/features/endossos',
        replacement: `${root}/libs/features/endossos/src/index.ts`,
      },
      {
        find: '@ecotech/features/renovacoes',
        replacement: `${root}/libs/features/renovacoes/src/index.ts`,
      },
      {
        find: '@ecotech/features/dashboard',
        replacement: `${root}/libs/features/dashboard/src/index.ts`,
      },
      {
        find: '@ecotech/features/seguradora',
        replacement: `${root}/libs/features/seguradora/src/index.ts`,
      },
      {
        find: '@ecotech/features/seguradoras-parceiras',
        replacement: `${root}/libs/features/seguradoras-parceiras/src/index.ts`,
      },
      {
        find: '@ecotech/features/equipes',
        replacement: `${root}/libs/features/equipes/src/index.ts`,
      },
      {
        find: '@ecotech/features/vendedores',
        replacement: `${root}/libs/features/vendedores/src/index.ts`,
      },
    ],
  },
});
