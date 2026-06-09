import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '@ecotech/shared/database';
import { usuarios, equipes } from '@ecotech/shared/database';
import { eq, and, ilike, sql, isNull, or } from 'drizzle-orm';
import {
  authorize,
  requireAdmin,
  requireEquipeAccess,
} from '@ecotech/plugins/authorization';
import { equipesDocs } from '../../docs/equipes/schemas.js';
import {
  createEquipeSchema,
  updateEquipeSchema,
  listEquipesQuerySchema,
  atribuirLiderSchema,
  adicionarMembroSchema,
} from '@ecotech/features/equipes';
import { NotFoundError, ValidationError, ConflictError } from '@ecotech/shared/utils';
import { getPaginationParams, createPaginatedResult } from '@ecotech/shared/utils';
import { ok } from '../../docs/index.js';

const equipesRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /equipes — Criar equipe (admin only)
  fastify.post(
    '/',
    {
      schema: { tags: ['Equipes'], summary: 'Criar equipe', ...equipesDocs.criar },
      preHandler: [requireAdmin()],
    },
    async (request, reply) => {
      const data = createEquipeSchema.parse(request.body);

      // Validar gestor se informado
      if (data.gestorId) {
        const gestor = await db.query.usuarios.findFirst({
          where: and(
            eq(usuarios.id, data.gestorId),
            eq(usuarios.corretoraId, request.corretoraId),
            isNull(usuarios.deletedAt),
          ),
        });
        if (!gestor) throw new ValidationError('Lider não encontrado');
      }

      let equipe: typeof equipes.$inferSelect;
      try {
        [equipe] = await db
          .insert(equipes)
          .values({
            corretoraId: request.corretoraId,
            nome: data.nome,
            gestorId: data.gestorId ?? null,
          })
          .returning();
      } catch (err: any) {
        if (err?.cause?.code === '23505' || err?.message?.includes('unq_corretora_equipe')) {
          throw new ConflictError('Já existe uma equipe com este nome');
        }
        throw err;
      }

      // Vincular o gestor à equipe (equipeId no usuário)
      if (data.gestorId) {
        await db
          .update(usuarios)
          .set({ equipeId: equipe.id, updatedAt: new Date() })
          .where(eq(usuarios.id, data.gestorId));
      }

      return reply.status(201).send(ok(equipe));
    },
  );

  // GET /equipes — Listar equipes (escopo automático)
  fastify.get(
    '/',
    {
      schema: { tags: ['Equipes'], summary: 'Listar equipes', ...equipesDocs.listar },
      preHandler: [authorize(['equipes:visualizar'])],
    },
    async (request) => {
      const query = listEquipesQuerySchema.parse(request.query);
      const { offset, limit, page } = getPaginationParams(query);
      const user = request.user;

      const conditions: ReturnType<typeof eq>[] = [
        eq(equipes.corretoraId, request.corretoraId),
        isNull(equipes.deletedAt) as any,
      ];

      // Escopo: lider só vê a própria equipe
      if (!user.isAdmin && !user.isGestor) {
        conditions.push(eq(equipes.gestorId, user.sub) as any);
      }

      if (query.search) {
        conditions.push(ilike(equipes.nome, `%${query.search}%`) as any);
      }

      if (query.ativo !== undefined) {
        conditions.push(eq(equipes.ativo, query.ativo === 'true') as any);
      }

      const [equipesResult, countResult] = await Promise.all([
        db.query.equipes.findMany({
          where: and(...(conditions as any[])),
          with: {
            membros: {
              where: and(isNull(usuarios.deletedAt), eq(usuarios.ativo, true)),
              columns: { id: true, nome: true, avatarR2Key: true },
              with: { cargo: { columns: { id: true, nomeCargo: true, cor: true } } },
            },
          },
          limit,
          offset,
          orderBy: (e, { asc }) => [asc(e.nome)],
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(equipes)
          .where(and(...(conditions as any[]))),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      // Enriquecer com lider e contagem
      const { storageClient } = await import('@ecotech/shared/storage');
      const data = await Promise.all(
        equipesResult.map(async (e) => {
          let gestor = null;
          if (e.gestorId) {
            const g = e.membros.find((m) => m.id === e.gestorId);
            if (g) {
              let avatarUrl = null;
              if (g.avatarR2Key) {
                try { avatarUrl = await storageClient.getSignedDownloadUrl(g.avatarR2Key); } catch {}
              }
              gestor = { id: g.id, nome: g.nome, avatarUrl };
            } else {
              // gestor pode não ser membro (edge case)
              const gUser = await db.query.usuarios.findFirst({
                where: eq(usuarios.id, e.gestorId),
                columns: { id: true, nome: true, avatarR2Key: true },
              });
              if (gUser) {
                let avatarUrl = null;
                if (gUser.avatarR2Key) {
                  try { avatarUrl = await storageClient.getSignedDownloadUrl(gUser.avatarR2Key); } catch {}
                }
                gestor = { id: gUser.id, nome: gUser.nome, avatarUrl };
              }
            }
          }

          return {
            id: e.id,
            nome: e.nome,
            ativo: e.ativo,
            gestorId: e.gestorId,
            gestor,
            totalMembros: e.membros.length,
            createdAt: e.createdAt,
          };
        }),
      );

      const paged = createPaginatedResult(data, total, page, limit);
      return { ...ok(paged.data), meta: paged.meta };
    },
  );

  // GET /equipes/:id — Detalhe com membros
  fastify.get(
    '/:id',
    {
      schema: { tags: ['Equipes'], summary: 'Detalhe da equipe com membros', ...equipesDocs.buscar },
      preHandler: [authorize(['equipes:visualizar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const user = request.user;

      const equipe = await db.query.equipes.findFirst({
        where: and(
          eq(equipes.id, id),
          eq(equipes.corretoraId, request.corretoraId),
          isNull(equipes.deletedAt),
        ),
        with: {
          membros: {
            where: and(isNull(usuarios.deletedAt), eq(usuarios.ativo, true)),
            columns: { id: true, nome: true, email: true, avatarR2Key: true, ativo: true },
            with: { cargo: { columns: { id: true, nomeCargo: true, cor: true } } },
          },
        },
      });

      if (!equipe) throw new NotFoundError('Equipe');

      // Escopo: lider só acessa a própria equipe
      if (!user.isAdmin && !user.isGestor && equipe.gestorId !== user.sub) {
        throw new NotFoundError('Equipe');
      }

      const { storageClient } = await import('@ecotech/shared/storage');

      const membrosComAvatar = await Promise.all(
        equipe.membros.map(async (m) => {
          let avatarUrl = null;
          if (m.avatarR2Key) {
            try { avatarUrl = await storageClient.getSignedDownloadUrl(m.avatarR2Key); } catch {}
          }
          return { ...m, avatarR2Key: undefined, avatarUrl };
        }),
      );

      // Buscar dados do gestor
      let gestor = null;
      if (equipe.gestorId) {
        const g = await db.query.usuarios.findFirst({
          where: eq(usuarios.id, equipe.gestorId),
          columns: { id: true, nome: true, avatarR2Key: true },
        });
        if (g) {
          let avatarUrl = null;
          if (g.avatarR2Key) {
            try { avatarUrl = await storageClient.getSignedDownloadUrl(g.avatarR2Key); } catch {}
          }
          gestor = { id: g.id, nome: g.nome, avatarUrl };
        }
      }

      return ok({
        id: equipe.id,
        nome: equipe.nome,
        ativo: equipe.ativo,
        gestorId: equipe.gestorId,
        gestor,
        membros: membrosComAvatar,
        createdAt: equipe.createdAt,
        updatedAt: equipe.updatedAt,
      });
    },
  );

  // PATCH /equipes/:id — Editar equipe (admin only)
  fastify.patch(
    '/:id',
    {
      schema: { tags: ['Equipes'], summary: 'Editar equipe', ...equipesDocs.atualizar },
      preHandler: [requireAdmin()],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = updateEquipeSchema.parse(request.body);

      const equipe = await db.query.equipes.findFirst({
        where: and(
          eq(equipes.id, id),
          eq(equipes.corretoraId, request.corretoraId),
          isNull(equipes.deletedAt),
        ),
      });
      if (!equipe) throw new NotFoundError('Equipe');

      if (data.gestorId !== undefined && data.gestorId !== null) {
        const gestor = await db.query.usuarios.findFirst({
          where: and(
            eq(usuarios.id, data.gestorId),
            eq(usuarios.corretoraId, request.corretoraId),
            isNull(usuarios.deletedAt),
          ),
        });
        if (!gestor) throw new ValidationError('Lider não encontrado');
      }

      const [updated] = await db
        .update(equipes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(equipes.id, id))
        .returning();

      // Sincronizar equipeId dos gestores ao mudar gestor
      if (data.gestorId !== undefined) {
        // Remover equipeId do gestor anterior (se era gestor por este campo)
        if (equipe.gestorId && equipe.gestorId !== data.gestorId) {
          await db
            .update(usuarios)
            .set({ equipeId: null, updatedAt: new Date() })
            .where(and(eq(usuarios.id, equipe.gestorId), eq(usuarios.equipeId, id)));
        }
        // Setar equipeId do novo gestor
        if (data.gestorId) {
          await db
            .update(usuarios)
            .set({ equipeId: id, updatedAt: new Date() })
            .where(eq(usuarios.id, data.gestorId));
        }
      }

      return ok(updated);
    },
  );

  // DELETE /equipes/:id — Soft delete (admin only)
  fastify.delete(
    '/:id',
    {
      schema: { tags: ['Equipes'], summary: 'Excluir equipe', ...equipesDocs.excluir },
      preHandler: [requireAdmin()],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const equipe = await db.query.equipes.findFirst({
        where: and(
          eq(equipes.id, id),
          eq(equipes.corretoraId, request.corretoraId),
          isNull(equipes.deletedAt),
        ),
      });
      if (!equipe) throw new NotFoundError('Equipe');

      await db.transaction(async (tx) => {
        // Desassociar membros
        await tx
          .update(usuarios)
          .set({ equipeId: null, updatedAt: new Date() })
          .where(and(eq(usuarios.equipeId, id), eq(usuarios.corretoraId, request.corretoraId)));

        // Soft delete
        await tx
          .update(equipes)
          .set({ deletedAt: new Date(), ativo: false, gestorId: null, updatedAt: new Date() })
          .where(eq(equipes.id, id));
      });

      return { ...ok(null), message: 'Equipe excluída com sucesso' };
    },
  );

  // POST /equipes/:id/atribuir-lider — Atribuir lider (admin only)
  fastify.post(
    '/:id/assign-leader',
    {
      schema: { tags: ['Equipes'], summary: 'Atribuir lider à equipe', ...equipesDocs.atribuirLider },
      preHandler: [requireAdmin()],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { gestorId } = atribuirLiderSchema.parse(request.body);

      const equipe = await db.query.equipes.findFirst({
        where: and(
          eq(equipes.id, id),
          eq(equipes.corretoraId, request.corretoraId),
          isNull(equipes.deletedAt),
        ),
      });
      if (!equipe) throw new NotFoundError('Equipe');

      if (gestorId) {
        const gestor = await db.query.usuarios.findFirst({
          where: and(
            eq(usuarios.id, gestorId),
            eq(usuarios.corretoraId, request.corretoraId),
            isNull(usuarios.deletedAt),
          ),
        });
        if (!gestor) throw new ValidationError('Lider não encontrado');
      }

      const [updated] = await db
        .update(equipes)
        .set({ gestorId, updatedAt: new Date() })
        .where(eq(equipes.id, id))
        .returning();

      // Sincronizar equipeId dos gestores
      if (equipe.gestorId && equipe.gestorId !== gestorId) {
        await db
          .update(usuarios)
          .set({ equipeId: null, updatedAt: new Date() })
          .where(and(eq(usuarios.id, equipe.gestorId), eq(usuarios.equipeId, id)));
      }
      if (gestorId) {
        await db
          .update(usuarios)
          .set({ equipeId: id, updatedAt: new Date() })
          .where(eq(usuarios.id, gestorId));
      }

      return ok(updated);
    },
  );

  // POST /equipes/:id/membros — Adicionar membro
  fastify.post(
    '/:id/members',
    {
      schema: { tags: ['Equipes'], summary: 'Adicionar membro à equipe', ...equipesDocs.adicionarMembro },
      preHandler: [requireEquipeAccess('manage')],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { usuarioId } = adicionarMembroSchema.parse(request.body);

      const equipe = await db.query.equipes.findFirst({
        where: and(
          eq(equipes.id, id),
          eq(equipes.corretoraId, request.corretoraId),
          isNull(equipes.deletedAt),
        ),
      });
      if (!equipe) throw new NotFoundError('Equipe');

      const usuario = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, usuarioId),
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
      });
      if (!usuario) throw new NotFoundError('Usuário');

      await db
        .update(usuarios)
        .set({ equipeId: id, updatedAt: new Date() })
        .where(eq(usuarios.id, usuarioId));

      return { ...ok(null), message: 'Membro adicionado com sucesso' };
    },
  );

  // DELETE /equipes/:id/membros/:usuarioId — Remover membro
  fastify.delete(
    '/:id/members/:memberId',
    {
      schema: {
        tags: ['Equipes'],
        summary: 'Remover membro da equipe',
        ...equipesDocs.removerMembro,
        params: z.object({ id: z.string().uuid(), memberId: z.string().uuid() }),
      },
      preHandler: [requireEquipeAccess('manage')],
    },
    async (request) => {
      const { id, memberId } = request.params;

      const usuario = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, memberId),
          eq(usuarios.equipeId, id),
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
      });
      if (!usuario) throw new NotFoundError('Membro não encontrado nesta equipe');

      await db
        .update(usuarios)
        .set({ equipeId: null, updatedAt: new Date() })
        .where(eq(usuarios.id, memberId));

      return { ...ok(null), message: 'Membro removido com sucesso' };
    },
  );
};

export default equipesRoutes;
