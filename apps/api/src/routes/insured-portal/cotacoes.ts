import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, isNull } from 'drizzle-orm';
import {
  db,
  portalCotacaoSolicitacoes,
  produtos,
} from '@ecotech/shared/database';
import { authenticatePortal } from './auth.js';

const portalCotacoesRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    await authenticatePortal(fastify, request, reply);
  });

  // POST /api/portal/cotacoes — solicitar cotação de um produto
  fastify.post(
    '/quotes',
    {
      schema: {
        tags: ['Portal Segurado'],
        summary: 'Solicitar cotação de produto',
        description: 'Registra interesse do segurado em cotar um produto.',
      },
    },
    async (request, reply) => {
      const { clienteId, corretoraId } = request.portalCliente;
      const body = request.body as {
        produtoId?: string;
        mensagem?: string;
      };

      let vendedorPortalId: string | null = null;

      // Valida produto e busca vendedor configurado para roteamento automático
      if (body.produtoId) {
        const produto = await db.query.produtos.findFirst({
          where: and(
            eq(produtos.id, body.produtoId),
            eq(produtos.corretoraId, corretoraId),
            eq(produtos.ativo, true),
            isNull(produtos.deletedAt),
          ),
          columns: { id: true, vendedorPortalId: true },
        });

        if (!produto) {
          return reply.status(400).send({
            success: false,
            error: 'Produto não encontrado',
          });
        }

        vendedorPortalId = produto.vendedorPortalId ?? null;
      }

      const [solicitacao] = await db
        .insert(portalCotacaoSolicitacoes)
        .values({
          corretoraId,
          clienteId,
          produtoId: body.produtoId ?? null,
          vendedorId: vendedorPortalId,
          mensagem: body.mensagem ?? null,
          status: 'PENDENTE',
        })
        .returning({ id: portalCotacaoSolicitacoes.id });

      return reply.status(201).send({
        success: true,
        data: { id: solicitacao.id },
        message: 'Solicitação enviada! Sua corretora entrará em contato em breve.',
      });
    },
  );
};

export default portalCotacoesRoutes;
