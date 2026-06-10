import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { getRedis } from '../utils/cache.js';

const httpMetricsPlugin: FastifyPluginAsync = async (app) => {
  // Server-Timing: expõe o tempo total de processamento do servidor por request.
  // Visível no DevTools (Network → Timing) e legível via PerformanceObserver no
  // RUM — permite separar TTFB (rede) do tempo gasto dentro da API.
  // onSend roda antes da resposta sair, então ainda é possível setar headers.
  app.addHook('onSend', async (_request, reply, payload) => {
    const dur = reply.elapsedTime;
    if (typeof dur === 'number' && dur >= 0) {
      const timing = `total;dur=${dur.toFixed(1)}`;
      const existing = reply.getHeader('Server-Timing');
      reply.header(
        'Server-Timing',
        existing ? `${existing as string}, ${timing}` : timing,
      );
    }
    return payload;
  });

  app.addHook('onResponse', async (_request, reply) => {
    const status = reply.statusCode;
    const bucket =
      status >= 500 ? '5xx' : status >= 400 ? '4xx' : status >= 300 ? '3xx' : '2xx';

    const now = new Date();
    const hk = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
    ].join('-');

    try {
      const redis = getRedis();
      const key = `admin:http:${bucket}:${hk}`;
      const pipe = redis.pipeline();
      pipe.incr(key);
      pipe.expire(key, 25 * 3600);
      await pipe.exec();
    } catch {
      // non-critical — Redis indisponível não afeta requests
    }
  });
};

export default fp(httpMetricsPlugin, { name: 'http-metrics' });
