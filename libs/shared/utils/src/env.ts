import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Server
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.preprocess((val) => {
    if (val === '' || val == null) return 'production';
    const aliases: Record<string, string> = {
      develop: 'development',
      dev: 'development',
      staging: 'production',
      preview: 'production',
      prod: 'production',
    };
    return aliases[val as string] ?? val;
  }, z.enum(['development', 'production', 'test'])),

  // Platform
  APP_URL: z.string().default('http://localhost:3000'),
  APP_EXTRA_ORIGINS: z.string().optional(),
  PLATFORM_DOMAIN: z.string().default('plataforma.com.br'),

  // Rate limiting — z.preprocess trata string vazia como undefined para o .default() funcionar
  RATE_LIMIT_MAX: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.coerce.number().default(250),
  ),
  RATE_LIMIT_WINDOW_MS: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.coerce.number().default(60000),
  ),

  // MCP Server (internal service auth)
  MCP_INTERNAL_SECRET: z.string().optional(),

  // Asaas
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_API_URL: z.string().optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),

  // Google Calendar OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  // Observabilidade
  SENTRY_DSN: z.string().optional(),
  // Taxa de amostragem de traces (0..1). Permite densificar a coleta durante
  // janelas de diagnóstico de performance sem alterar código. Default: 0.2 prod.
  SENTRY_TRACES_SAMPLE_RATE: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.coerce.number().min(0).max(1).optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  // Skip validation in browser/client context
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    return {} as Env;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = validateEnv();
