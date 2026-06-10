import * as Sentry from '@sentry/node';

const dsn = process.env['SENTRY_DSN'];

// instrument.ts carrega antes da validação de env (--import), então lê process.env
// direto. Permite sobrescrever a amostragem de traces por env durante diagnósticos.
function resolveTracesSampleRate(): number {
  const raw = process.env['SENTRY_TRACES_SAMPLE_RATE'];
  const n = raw != null && raw !== '' ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  return process.env['NODE_ENV'] === 'production' ? 0.2 : 1.0;
}

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] ?? 'production',
    tracesSampleRate: resolveTracesSampleRate(),
    integrations: [Sentry.fastifyIntegration()],
  });
}

export { Sentry };
