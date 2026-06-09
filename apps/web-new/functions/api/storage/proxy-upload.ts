import type { PagesFunction } from '@cloudflare/workers-types';

export const onRequestPut: PagesFunction = async ({ request }) => {
  const targetUrl = new URL(request.url).searchParams.get('url');
  if (!targetUrl) {
    return Response.json({ error: 'Missing url param' }, { status: 400 });
  }

  const contentType = request.headers.get('content-type') ?? 'application/octet-stream';
  const body = await request.arrayBuffer();

  const response = await fetch(targetUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(body.byteLength),
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return Response.json(
      { error: `Storage upload failed (${response.status})`, detail: text },
      { status: response.status },
    );
  }

  return Response.json({ ok: true });
};
