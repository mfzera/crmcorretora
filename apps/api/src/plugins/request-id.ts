import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import * as Sentry from '@sentry/node';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requestIdPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('requestId', '');

  fastify.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers['x-request-id'];
    const id =
      typeof incoming === 'string' && UUID_RE.test(incoming)
        ? incoming
        : crypto.randomUUID();

    request.requestId = id;
    reply.header('X-Request-ID', id);

    Sentry.withScope((scope) => {
      scope.setTag('request_id', id);
      scope.setTag('url', request.url);
      scope.setTag('method', request.method);
    });
  });
}

export default fp(requestIdPlugin, { name: 'request-id' });
