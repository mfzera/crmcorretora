import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authorize, requireModule } from '@ecotech/plugins/authorization';
import { checkAllRecognitions, getRecognitionStats } from '../../utils/reconhecimento.js';
import { reconhecimentoDocs } from '../../docs/gamificacao/schemas.js';
import { ok } from '../../docs/index.js';

const reconhecimentoRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', requireModule('gamificacao'));

  fastify.get(
    '/',
    {
      schema: {
        tags: ['Gamificação'],
        summary: 'Reconhecimento do usuário (níveis vitalícios + streak)',
        ...reconhecimentoDocs.stats,
      },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      // Aproveita a request para reconciliar badges (idempotente).
      // Não bloqueia a resposta; falhas só logam.
      checkAllRecognitions(request.corretoraId, request.user.sub).catch((err) => {
        console.error('Erro ao reconciliar reconhecimentos:', err);
      });

      const stats = await getRecognitionStats(request.corretoraId, request.user.sub);
      return ok(stats);
    },
  );
};

export default reconhecimentoRoutes;
