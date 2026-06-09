export async function onRequest(context: EventContext<Record<string, unknown>, string, Record<string, unknown>>) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const response = await context.next();

  const apiUrl = (context.env as Record<string, string>).VITE_API_URL ?? '';
  const storageUrl = (context.env as Record<string, string>).VITE_STORAGE_URL ?? '';

  let apiOrigin = '';
  let wsOrigin = '';
  let storageOrigin = '';

  try {
    if (apiUrl) {
      const u = new URL(apiUrl);
      apiOrigin = u.origin;
      wsOrigin = `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}`;
    }
    if (storageUrl) storageOrigin = new URL(storageUrl).origin;
  } catch {}

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' propaga confiança do nonce para imports dinâmicos do Vite e scripts
    // filhos do reCAPTCHA — 'self' e host-allowlists são ignorados quando strict-dynamic está
    // ativo, por isso foram removidos para eliminar os warnings do browser.
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'sha256-i2TO/Plff2H9pEc1VuZBDgBFjirA7sy6mrFZ7ZoPPyQ='`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self' data: blob: https://*.r2.cloudflarestorage.com${storageOrigin ? ` ${storageOrigin}` : ''}`,
    `connect-src 'self' https://www.google.com/recaptcha/ https://*.r2.cloudflarestorage.com${apiOrigin ? ` ${apiOrigin}` : ''}${wsOrigin ? ` ${wsOrigin}` : ''}${storageOrigin ? ` ${storageOrigin}` : ''}`,
    `frame-src 'self' blob: https://*.r2.cloudflarestorage.com${storageOrigin ? ` ${storageOrigin}` : ''} https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  const newHeaders = new Headers(response.headers);
  newHeaders.set('Content-Security-Policy', csp);
  newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  return new HTMLRewriter()
    .on('script', { element: (el) => el.setAttribute('nonce', nonce) })
    .transform(new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    }));
}
