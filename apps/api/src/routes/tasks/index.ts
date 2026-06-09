import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '@ecotech/shared/database';
import { tarefas } from '@ecotech/shared/database';
import { eq, and, desc, isNull, count, asc, lte } from 'drizzle-orm';
import { NotFoundError } from '@ecotech/shared/utils';
import { tarefasDocs } from '../../docs/tarefas/schemas.js';
import { ok } from '../../docs/index.js';

const tarefasRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // Listar tarefas do usuário logado
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Tarefas'],
        summary: 'Listar tarefas',
        description: 'Retorna as tarefas do usuário autenticado.',
        ...tarefasDocs.listar,
      },
    },
    async (request) => {
      const { concluida, prioridade } = request.query as any;

      const conditions = [
        eq(tarefas.corretoraId, request.corretoraId),
        eq(tarefas.usuarioId, request.user.sub),
        isNull(tarefas.deletedAt),
      ];

      if (concluida !== undefined) {
        conditions.push(eq(tarefas.concluida, concluida === 'true'));
      }

      if (prioridade) {
        conditions.push(eq(tarefas.prioridade, prioridade));
      }

      const items = await db.query.tarefas.findMany({
        where: and(...conditions),
        orderBy: [
          asc(tarefas.concluida),
          asc(tarefas.dataVencimento),
          desc(tarefas.createdAt),
        ],
      });

      return ok(items);
    },
  );

  // Criar tarefa
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Tarefas'],
        summary: 'Criar tarefa',
        description: 'Cria uma nova tarefa para o usuário autenticado.',
        ...tarefasDocs.criar,
      },
    },
    async (request, reply) => {
      const body = request.body;

      const [tarefa] = await db
        .insert(tarefas)
        .values({
          corretoraId: request.corretoraId,
          usuarioId: request.user.sub,
          titulo: body.titulo,
          descricao: body.descricao,
          prioridade: body.prioridade,
          dataVencimento: body.dataVencimento ? new Date(body.dataVencimento) : null,
          entidadeTipo: body.entidadeTipo,
          entidadeId: body.entidadeId,
        })
        .returning();

      reply.code(201);
      return ok(tarefa);
    },
  );

  // Atualizar tarefa
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Tarefas'],
        summary: 'Atualizar tarefa',
        description: 'Atualiza os dados de uma tarefa.',
        ...tarefasDocs.atualizar,
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body;

      const tarefa = await db.query.tarefas.findFirst({
        where: and(
          eq(tarefas.id, id),
          eq(tarefas.corretoraId, request.corretoraId),
          eq(tarefas.usuarioId, request.user.sub),
          isNull(tarefas.deletedAt),
        ),
      });

      if (!tarefa) throw new NotFoundError('Tarefa');

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (body.titulo !== undefined) updateData.titulo = body.titulo;
      if (body.descricao !== undefined) updateData.descricao = body.descricao;
      if (body.prioridade !== undefined) updateData.prioridade = body.prioridade;
      if (body.dataVencimento !== undefined) {
        updateData.dataVencimento = body.dataVencimento ? new Date(body.dataVencimento) : null;
      }
      if (body.concluida !== undefined) {
        updateData.concluida = body.concluida;
        updateData.concluidaEm = body.concluida ? new Date() : null;
      }

      const [updated] = await db
        .update(tarefas)
        .set(updateData)
        .where(eq(tarefas.id, id))
        .returning();

      return ok(updated);
    },
  );

  // Concluir/desconcluir tarefa (atalho)
  fastify.patch(
    '/:id/complete',
    {
      schema: {
        tags: ['Tarefas'],
        summary: 'Concluir tarefa',
        description: 'Marca uma tarefa como concluída ou pendente.',
        ...tarefasDocs.concluir,
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { concluida = true } = (request.body as any) ?? {};

      const tarefa = await db.query.tarefas.findFirst({
        where: and(
          eq(tarefas.id, id),
          eq(tarefas.corretoraId, request.corretoraId),
          eq(tarefas.usuarioId, request.user.sub),
          isNull(tarefas.deletedAt),
        ),
      });

      if (!tarefa) throw new NotFoundError('Tarefa');

      const [updated] = await db
        .update(tarefas)
        .set({
          concluida,
          concluidaEm: concluida ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(tarefas.id, id))
        .returning();

      return ok(updated);
    },
  );

  // Excluir tarefa (soft delete)
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Tarefas'],
        summary: 'Excluir tarefa',
        description: 'Exclui uma tarefa (soft delete).',
        ...tarefasDocs.excluir,
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const tarefa = await db.query.tarefas.findFirst({
        where: and(
          eq(tarefas.id, id),
          eq(tarefas.corretoraId, request.corretoraId),
          eq(tarefas.usuarioId, request.user.sub),
          isNull(tarefas.deletedAt),
        ),
      });

      if (!tarefa) throw new NotFoundError('Tarefa');

      await db
        .update(tarefas)
        .set({ deletedAt: new Date() })
        .where(eq(tarefas.id, id));

      return { success: true as const, message: 'Tarefa excluída com sucesso' };
    },
  );
};

export default tarefasRoutes;
