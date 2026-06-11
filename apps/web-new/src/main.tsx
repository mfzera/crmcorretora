import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { createRouter } from './router';

const router = createRouter();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// Sentry (init + tracing + replay) pesa ~100 KB gz e não precisa bloquear o
// primeiro paint. Carregamos em chunk assíncrono logo após o render, tirando-o
// do caminho crítico. O mesmo módulo é reusado (deduplicado) pelo AppErrorBoundary.
void import('./infra/sentry').then((m) => m.initSentry());
