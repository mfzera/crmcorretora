import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db, produtos, seguradorasParceiras } from '@ecotech/shared/database';
import { authenticatePortal } from './auth.js';

const portalProdutosRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    await authenticatePortal(fastify, request, reply);
  });

  // GET /api/portal/produtos — catálogo de produtos da corretora
  fastify.get(
    '/products',
    {
      schema: {
        tags: ['Portal Segurado'],
        summary: 'Catálogo de produtos de seguro',
        description:
          'Retorna os produtos de seguro disponíveis na corretora. Permite ao segurado descobrir novos tipos de cobertura.',
      },
    },
    async (request) => {
      const { corretoraId } = request.portalCliente;

      const lista = await db
        .select({
          id: produtos.id,
          nomeProduto: produtos.nomeProduto,
          descricao: produtos.descricao,
          tipoSeguro: produtos.tipoSeguro,
          premioMinimo: produtos.premioMinimo,
          seguradora: {
            nomeFantasia: seguradorasParceiras.nomeFantasia,
            razaoSocial: seguradorasParceiras.razaoSocial,
          },
        })
        .from(produtos)
        .leftJoin(
          seguradorasParceiras,
          eq(produtos.seguradoraParceiraId, seguradorasParceiras.id),
        )
        .where(
          and(
            eq(produtos.corretoraId, corretoraId),
            eq(produtos.ativo, true),
            isNull(produtos.deletedAt),
          ),
        )
        .orderBy(produtos.nomeProduto);

      return { success: true, data: lista };
    },
  );
};

export default portalProdutosRoutes;
