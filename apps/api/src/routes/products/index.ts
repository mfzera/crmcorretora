import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authorize } from '@ecotech/plugins/authorization';
import { produtosDocs } from '../../docs/produtos/schemas.js';
import { ok } from '../../docs/index.js';
import {
  createProdutoSchema,
  updateProdutoSchema,
  listProdutosQuerySchema,
  produtosService,
} from '@ecotech/features/produtos';

const produtosRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get(
    '/tipos-seguro',
    { schema: { tags: ['Produtos'], summary: 'Listar tipos de seguro em uso', ...produtosDocs.tiposSeguro } },
    async (request) => {
      const data = await produtosService.getTiposSeguro(request.corretoraId);
      return ok(data);
    },
  );

  fastify.post(
    '/',
    {
      schema: { tags: ['Produtos'], summary: 'Criar novo produto', ...produtosDocs.criar },
      preHandler: [authorize(['config:gerenciar_produtos'])],
    },
    async (request, reply) => {
      const data = createProdutoSchema.parse(request.body);
      const produto = await produtosService.criar(request.corretoraId, data);
      return reply.status(201).send(ok(produto));
    },
  );

  fastify.get(
    '/',
    {
      schema: {
        tags: ['Produtos'],
        summary: 'Listar produtos',
        ...produtosDocs.listar,
      },
    },
    async (request) => {
      const query = listProdutosQuerySchema.parse(request.query);
      const result = await produtosService.listar(request.corretoraId, query);
      return ok(result);
    },
  );

  fastify.get(
    '/:id',
    { schema: { tags: ['Produtos'], summary: 'Obter detalhes do produto', ...produtosDocs.buscar } },
    async (request) => {
      const { id } = request.params as { id: string };
      const produto = await produtosService.buscar(request.corretoraId, id);
      return ok(produto);
    },
  );

  fastify.patch(
    '/:id',
    {
      schema: { tags: ['Produtos'], summary: 'Atualizar produto', ...produtosDocs.atualizar },
      preHandler: [authorize(['config:gerenciar_produtos'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = updateProdutoSchema.parse(request.body);
      const updated = await produtosService.atualizar(request.corretoraId, id, data);
      return ok(updated);
    },
  );

  fastify.delete(
    '/:id',
    {
      schema: { tags: ['Produtos'], summary: 'Excluir produto', ...produtosDocs.excluir },
      preHandler: [authorize(['config:gerenciar_produtos'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      await produtosService.excluir(request.corretoraId, id);
      return { success: true as const, message: 'Produto excluído com sucesso' };
    },
  );
};

export default produtosRoutes;
