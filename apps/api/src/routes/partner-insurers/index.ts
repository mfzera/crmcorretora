import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authorize } from '@ecotech/plugins/authorization';
import {
  createSeguradoraParceiraSchema,
  updateSeguradoraParceiraSchema,
  listSeguradorasParceiraQuerySchema,
  seguradorasParceiraService,
} from '@ecotech/features/seguradoras-parceiras';

const seguradorasParceiraRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post(
    '/',
    {
      schema: { tags: ['Seguradoras Parceiras'], summary: 'Criar nova seguradora parceira' },
      preHandler: [authorize(['config:gerenciar_seguradoras_parceiras'])],
    },
    async (request, reply) => {
      const data = createSeguradoraParceiraSchema.parse(request.body);
      const seguradora = await seguradorasParceiraService.criar(request.corretoraId, data);
      return reply.status(201).send({ success: true, data: seguradora });
    },
  );

  fastify.get(
    '/select',
    {
      schema: {
        tags: ['Seguradoras Parceiras'],
        summary: 'Listar seguradoras parceiras para seleção',
      },
    },
    async (request) => {
      const seguradoras = await seguradorasParceiraService.listarParaSelect(request.corretoraId);
      return { success: true, data: seguradoras };
    },
  );

  fastify.get(
    '/',
    {
      schema: {
        tags: ['Seguradoras Parceiras'],
        summary: 'Listar seguradoras parceiras',
        querystring: listSeguradorasParceiraQuerySchema,
      },
    },
    async (request) => {
      const query = listSeguradorasParceiraQuerySchema.parse(request.query);
      const result = await seguradorasParceiraService.listar(request.corretoraId, query);
      return { success: true, data: result };
    },
  );

  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Seguradoras Parceiras'],
        summary: 'Obter detalhes da seguradora parceira',
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const seguradora = await seguradorasParceiraService.buscar(request.corretoraId, id);
      return { success: true, data: seguradora };
    },
  );

  fastify.patch(
    '/:id',
    {
      schema: { tags: ['Seguradoras Parceiras'], summary: 'Atualizar seguradora parceira' },
      preHandler: [authorize(['config:gerenciar_seguradoras_parceiras'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = updateSeguradoraParceiraSchema.parse(request.body);
      const updated = await seguradorasParceiraService.atualizar(request.corretoraId, id, data);
      return { success: true, data: updated };
    },
  );

  fastify.delete(
    '/:id',
    {
      schema: { tags: ['Seguradoras Parceiras'], summary: 'Excluir seguradora parceira' },
      preHandler: [authorize(['config:gerenciar_seguradoras_parceiras'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      await seguradorasParceiraService.excluir(request.corretoraId, id);
      return { success: true, message: 'Seguradora parceira excluída com sucesso' };
    },
  );
};

export default seguradorasParceiraRoutes;
