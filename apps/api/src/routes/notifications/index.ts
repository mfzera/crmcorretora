import { eq, and, desc, isNull, sql, count } from 'drizzle-orm';
import { db } from '@ecotech/shared/database';
import { notificacoes } from '@ecotech/shared/database';
import { NotFoundError } from '@ecotech/shared/utils';
import {
  getPaginationParams,
  createPaginatedResult,
} from '@ecotech/shared/utils';
import { notificacoesDocs } from '../../docs/notificacoes/schemas.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const notificacoesRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // Listar notificações do usuário logado
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Notificações'],
        summary: 'Listar notificações',
        description: 'Retorna as notificações do usuário autenticado.',
        ...notificacoesDocs.listar,
      },
    },
    async (request) => {
      const { page, limit, lida, tipo } = request.query;
      const take = limit ?? 20;
      const { offset } = getPaginationParams({ page, limit: take });
      const lidaBool = lida === undefined ? undefined : lida === 'true';

      const conditions = [
        eq(notificacoes.corretoraId, request.corretoraId),
        eq(notificacoes.usuarioId, request.user.sub),
        isNull(notificacoes.deletedAt),
      ];

      if (lidaBool !== undefined) {
        conditions.push(eq(notificacoes.lida, lidaBool));
      }

      if (tipo) {
        conditions.push(eq(notificacoes.tipo, tipo));
      }

      const items = await db.query.notificacoes.findMany({
        where: and(...conditions),
        orderBy: [desc(notificacoes.createdAt)],
        limit: take,
        offset,
      });

      const [totalResult] = await db
        .select({ count: count() })
        .from(notificacoes)
        .where(and(...conditions));

      const total = Number(totalResult.count);

      return {
        success: true as const,
        ...createPaginatedResult(items, total, page, take),
      };
    },
  );

  // Obter contagem de notificações não lidas
  fastify.get(
    '/unread/count',
    {
      schema: {
        tags: ['Notificações'],
        summary: 'Contar notificações não lidas',
        description:
          'Retorna a quantidade de notificações não lidas do usuário.',
        ...notificacoesDocs.countNaoLidas,
      },
    },
    async (request) => {
      const [result] = await db
        .select({ count: count() })
        .from(notificacoes)
        .where(
          and(
            eq(notificacoes.corretoraId, request.corretoraId),
            eq(notificacoes.usuarioId, request.user.sub),
            eq(notificacoes.lida, false),
            isNull(notificacoes.deletedAt),
          ),
        );

      return {
        success: true as const,
        data: {
          count: Number(result.count),
        },
      };
    },
  );

  // Obter detalhes de uma notificação
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Notificações'],
        summary: 'Obter notificação',
        description: 'Retorna os detalhes de uma notificação específica.',
        ...notificacoesDocs.buscar,
      },
    },
    async (request) => {
      const { id } = request.params;

      const notificacao = await db.query.notificacoes.findFirst({
        where: and(
          eq(notificacoes.id, id),
          eq(notificacoes.corretoraId, request.corretoraId),
          eq(notificacoes.usuarioId, request.user.sub),
          isNull(notificacoes.deletedAt),
        ),
      });

      if (!notificacao) {
        throw new NotFoundError('Notificação');
      }

      return {
        success: true as const,
        data: notificacao,
      };
    },
  );

  // Marcar notificação como lida
  fastify.patch(
    '/:id/mark-as-read',
    {
      schema: {
        tags: ['Notificações'],
        summary: 'Marcar como lida',
        description: 'Marca uma notificação específica como lida.',
        ...notificacoesDocs.marcarLida,
      },
    },
    async (request) => {
      const { id } = request.params;

      const notificacao = await db.query.notificacoes.findFirst({
        where: and(
          eq(notificacoes.id, id),
          eq(notificacoes.corretoraId, request.corretoraId),
          eq(notificacoes.usuarioId, request.user.sub),
          isNull(notificacoes.deletedAt),
        ),
      });

      if (!notificacao) {
        throw new NotFoundError('Notificação');
      }

      const [updated] = await db
        .update(notificacoes)
        .set({
          lida: true,
          lidaEm: new Date(),
        })
        .where(eq(notificacoes.id, id))
        .returning();

      return {
        success: true as const,
        data: updated,
      };
    },
  );

  // Marcar todas como lidas
  fastify.patch(
    '/mark-all-as-read',
    {
      schema: {
        tags: ['Notificações'],
        summary: 'Marcar todas como lidas',
        description: 'Marca todas as notificações do usuário como lidas.',
        ...notificacoesDocs.marcarTodasLidas,
      },
    },
    async (request) => {
      await db
        .update(notificacoes)
        .set({
          lida: true,
          lidaEm: new Date(),
        })
        .where(
          and(
            eq(notificacoes.corretoraId, request.corretoraId),
            eq(notificacoes.usuarioId, request.user.sub),
            eq(notificacoes.lida, false),
            isNull(notificacoes.deletedAt),
          ),
        );

      return {
        success: true as const,
        message: 'Todas as notificações foram marcadas como lidas',
      };
    },
  );

  // Excluir notificação (soft delete)
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Notificações'],
        summary: 'Excluir notificação',
        description: 'Exclui uma notificação (soft delete).',
        ...notificacoesDocs.excluir,
      },
    },
    async (request) => {
      const { id } = request.params;

      const notificacao = await db.query.notificacoes.findFirst({
        where: and(
          eq(notificacoes.id, id),
          eq(notificacoes.corretoraId, request.corretoraId),
          eq(notificacoes.usuarioId, request.user.sub),
          isNull(notificacoes.deletedAt),
        ),
      });

      if (!notificacao) {
        throw new NotFoundError('Notificação');
      }

      await db
        .update(notificacoes)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(notificacoes.id, id));

      return {
        success: true as const,
        message: 'Notificação excluída com sucesso',
      };
    },
  );

  // Excluir todas as notificações lidas
  fastify.delete(
    '/read/delete-all',
    {
      schema: {
        tags: ['Notificações'],
        summary: 'Excluir todas notificações lidas',
        description: 'Exclui todas as notificações lidas do usuário.',
        ...notificacoesDocs.excluirTodasLidas,
      },
    },
    async (request) => {
      await db
        .update(notificacoes)
        .set({
          deletedAt: new Date(),
        })
        .where(
          and(
            eq(notificacoes.corretoraId, request.corretoraId),
            eq(notificacoes.usuarioId, request.user.sub),
            eq(notificacoes.lida, true),
            isNull(notificacoes.deletedAt),
          ),
        );

      return {
        success: true as const,
        message: 'Todas as notificações lidas foram excluídas',
      };
    },
  );
};

export default notificacoesRoutes;
