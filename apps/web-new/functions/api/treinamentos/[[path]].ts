import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  VITE_TREINAMENTOS_URL?: string;
}

async function proxy(request: Request, env: Env, path: string | string[]) {
  const treinamentosUrl = env.VITE_TREINAMENTOS_URL;
  if (!treinamentosUrl) {
    return Response.json({ error: 'TREINAMENTOS_URL não configurado' }, { status: 503 });
  }

  const splat = Array.isArray(path) ? path.join('/') : (path ?? '');
  const url = new URL(request.url);
  const targetUrl = `${treinamentosUrl}/${splat}${url.search}`;

  const isFormData = request.headers.get('content-type')?.includes('multipart/form-data');

  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  if (!isFormData) headers.set('content-type', request.headers.get('content-type') ?? 'application/json');

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : request.body;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  const responseHeaders = new Headers();
  const contentType = response.headers.get('content-type');
  if (contentType) responseHeaders.set('content-type', contentType);

  if (contentType?.includes('text/event-stream')) {
    responseHeaders.set('Cache-Control', 'no-cache');
    responseHeaders.set('Connection', 'keep-alive');
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const onRequest: PagesFunction<Env, 'path'> = async ({ request, env, params }) => {
  return proxy(request, env, params.path as string | string[]);
};
