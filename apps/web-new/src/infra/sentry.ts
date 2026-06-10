import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

// Amostragem de traces configurável por env (0..1). Permite densificar a coleta
// de Web Vitals / transactions durante janelas de diagnóstico sem mudar código.
function resolveTracesSampleRate(): number {
  const raw = import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string | undefined;
  const n = raw != null && raw !== '' ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  return import.meta.env.PROD ? 0.2 : 1.0;
}

export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: resolveTracesSampleRate(),
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });
}

export { Sentry };
