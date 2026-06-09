import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// @deprecated — use @fastify/rate-limit (Redis-backed) registered in app.ts instead.
// Este plugin em memória não é registrado em produção. O store e o setInterval
// foram removidos para não vazar memória caso o módulo seja importado acidentalmente.
const store: RateLimitStore = {};

/**
 * Rate limiter simples em memória
 * Para produção, usar Redis
 */
export function createRateLimiter(options: {
  max: number; // máximo de requisições
  windowMs: number; // janela de tempo em ms
  message?: string;
}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = `${request.ip}:${request.user?.sub || 'anonymous'}`;
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      return;
    }

    store[key].count++;

    if (store[key].count > options.max) {
      return reply.status(429).send({
        error: options.message || 'Muitas requisições. Tente novamente mais tarde.',
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      });
    }
  };
}

async function rateLimitPlugin(fastify: FastifyInstance) {
  fastify.decorate('rateLimit', createRateLimiter);
}

declare module 'fastify' {
  interface FastifyInstance {
    rateLimit: typeof createRateLimiter;
  }
}

export default fp(rateLimitPlugin, {
  name: 'rate-limit',
});
