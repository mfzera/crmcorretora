import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { authorize } from '@ecotech/plugins/authorization';
import {
  db,
  cotacoes,
  cotacaoTags,
  cotacaoTagRelacoes,
  usuarios,
} from '@ecotech/shared/database';

const createTagSchema = z.object({
  nome: z.string().min(1).max(50),
  cor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve ser um hex válido (#rrggbb)')
    .default('#6366f1'),
});

const updateTagSchema = z.object({
  nome: z.string().min(1).max(50).optional(),
  cor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve ser um hex válido (#rrggbb)')
    .optional(),
});

const cotacaoTagsRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // List tags visible to the current user (own + team)
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Tags de Cotação'],
        summary: 'Listar tags de cotação',
        preHandler: [authorize(['vendas:visualizar_cotacao'])],
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                id: z.string().uuid(),
                nome: z.string(),
                cor: z.string(),
                criadorId: z.string().uuid(),
                equipeId: z.string().uuid().nullable(),
                isOwn: z.boolean(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const currentUser = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { equipeId: true },
      });

      const conditions = [
        eq(cotacaoTags.corretoraId, request.corretoraId),
        isNull(cotacaoTags.deletedAt),
      ];

      const visibilityFilter = currentUser?.equipeId
        ? or(
            eq(cotacaoTags.criadorId, request.user.sub),
            eq(cotacaoTags.equipeId, currentUser.equipeId),
          )!
        : eq(cotacaoTags.criadorId, request.user.sub);

      conditions.push(visibilityFilter);

      const tags = await db.query.cotacaoTags.findMany({
        where: and(...conditions),
        columns: {
          id: true,
          nome: true,
          cor: true,
          criadorId: true,
          equipeId: true,
        },
        orderBy: (t, { asc }) => [asc(t.nome)],
      });

      return {
        success: true as const,
        data: tags.map((t) => ({
          ...t,
          isOwn: t.criadorId === request.user.sub,
        })),
      };
    },
  );

  // Create tag
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Tags de Cotação'],
        summary: 'Criar tag de cotação',
        body: createTagSchema,
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              nome: z.string(),
              cor: z.string(),
              criadorId: z.string().uuid(),
              equipeId: z.string().uuid().nullable(),
            }),
          }),
        },
      },
      preHandler: [authorize(['vendas:criar_cotacao'])],
    },
    async (request, reply) => {
      const data = createTagSchema.parse(request.body);

      const currentUser = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        columns: { equipeId: true },
      });

      const [tag] = await db
        .insert(cotacaoTags)
        .values({
          corretoraId: request.corretoraId,
          criadorId: request.user.sub,
          equipeId: currentUser?.equipeId ?? null,
          nome: data.nome,
          cor: data.cor,
        })
        .returning({
          id: cotacaoTags.id,
          nome: cotacaoTags.nome,
          cor: cotacaoTags.cor,
          criadorId: cotacaoTags.criadorId,
          equipeId: cotacaoTags.equipeId,
        });

      return reply.status(201).send({ success: true as const, data: tag });
    },
  );

  // Update tag (own only)
  fastify.patch(
    '/:tagId',
    {
      schema: {
        tags: ['Tags de Cotação'],
        summary: 'Atualizar tag de cotação',
        params: z.object({ tagId: z.string().uuid() }),
        body: updateTagSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string().uuid(),
              nome: z.string(),
              cor: z.string(),
            }),
          }),
        },
      },
      preHandler: [authorize(['vendas:editar_cotacao'])],
    },
    async (request) => {
      const { NotFoundError, OwnershipError } = await import('@ecotech/shared/utils');
      const { tagId } = request.params as { tagId: string };
      const data = updateTagSchema.parse(request.body);

      const tag = await db.query.cotacaoTags.findFirst({
        where: and(
          eq(cotacaoTags.id, tagId),
          eq(cotacaoTags.corretoraId, request.corretoraId),
          isNull(cotacaoTags.deletedAt),
        ),
      });

      if (!tag) throw new NotFoundError('Tag');
      if (tag.criadorId !== request.user.sub)
        throw new OwnershipError('Você só pode editar suas próprias tags');

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.cor !== undefined) updateData.cor = data.cor;

      const [updated] = await db
        .update(cotacaoTags)
        .set(updateData)
        .where(eq(cotacaoTags.id, tagId))
        .returning({ id: cotacaoTags.id, nome: cotacaoTags.nome, cor: cotacaoTags.cor });

      return { success: true as const, data: updated };
    },
  );

  // Delete tag (own only)
  fastify.delete(
    '/:tagId',
    {
      schema: {
        tags: ['Tags de Cotação'],
        summary: 'Excluir tag de cotação',
        params: z.object({ tagId: z.string().uuid() }),
        response: {
          200: z.object({ success: z.literal(true), message: z.string() }),
        },
      },
      preHandler: [authorize(['vendas:editar_cotacao'])],
    },
    async (request) => {
      const { NotFoundError, OwnershipError } = await import('@ecotech/shared/utils');
      const { tagId } = request.params as { tagId: string };

      const tag = await db.query.cotacaoTags.findFirst({
        where: and(
          eq(cotacaoTags.id, tagId),
          eq(cotacaoTags.corretoraId, request.corretoraId),
          isNull(cotacaoTags.deletedAt),
        ),
      });

      if (!tag) throw new NotFoundError('Tag');
      if (tag.criadorId !== request.user.sub)
        throw new OwnershipError('Você só pode excluir suas próprias tags');

      await db
        .update(cotacaoTags)
        .set({ deletedAt: new Date() })
        .where(eq(cotacaoTags.id, tagId));

      return { success: true as const, message: 'Tag excluída com sucesso' };
    },
  );
};

// Sub-routes to manage tags on a specific quotation — registered under /quotes/:id/tags
export const cotacaoTagsManagementRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // Add tag to cotacao
  fastify.post(
    '/:id/tags',
    {
      schema: {
        tags: ['Tags de Cotação'],
        summary: 'Adicionar tag a cotação',
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ tagId: z.string().uuid() }),
        response: {
          200: z.object({ success: z.literal(true), message: z.string() }),
        },
      },
      preHandler: [authorize(['vendas:editar_cotacao'])],
    },
    async (request) => {
      const { NotFoundError } = await import('@ecotech/shared/utils');
      const { id } = request.params as { id: string };
      const { tagId } = request.body as { tagId: string };

      const [cotacao, tag] = await Promise.all([
        db.query.cotacoes.findFirst({
          where: and(
            eq(cotacoes.id, id),
            eq(cotacoes.corretoraId, request.corretoraId),
            isNull(cotacoes.deletedAt),
          ),
          columns: { id: true },
        }),
        db.query.cotacaoTags.findFirst({
          where: and(
            eq(cotacaoTags.id, tagId),
            eq(cotacaoTags.corretoraId, request.corretoraId),
            isNull(cotacaoTags.deletedAt),
          ),
          columns: { id: true },
        }),
      ]);

      if (!cotacao) throw new NotFoundError('Cotação');
      if (!tag) throw new NotFoundError('Tag');

      await db
        .insert(cotacaoTagRelacoes)
        .values({ cotacaoId: id, tagId, criadoPorId: request.user.sub })
        .onConflictDoNothing();

      return { success: true as const, message: 'Tag adicionada' };
    },
  );

  // Remove tag from cotacao
  fastify.delete(
    '/:id/tags/:tagId',
    {
      schema: {
        tags: ['Tags de Cotação'],
        summary: 'Remover tag de cotação',
        params: z.object({ id: z.string().uuid(), tagId: z.string().uuid() }),
        response: {
          200: z.object({ success: z.literal(true), message: z.string() }),
        },
      },
      preHandler: [authorize(['vendas:editar_cotacao'])],
    },
    async (request) => {
      const { id, tagId } = request.params as { id: string; tagId: string };

      await db
        .delete(cotacaoTagRelacoes)
        .where(
          and(
            eq(cotacaoTagRelacoes.cotacaoId, id),
            eq(cotacaoTagRelacoes.tagId, tagId),
          ),
        );

      return { success: true as const, message: 'Tag removida' };
    },
  );
};

export default cotacaoTagsRoutes;
