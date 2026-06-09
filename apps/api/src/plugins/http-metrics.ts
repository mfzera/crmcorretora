import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { getRedis } from '../utils/cache.js';

const httpMetricsPlugin: FastifyPluginAsync = async (app) => {
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
