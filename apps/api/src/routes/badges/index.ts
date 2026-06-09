import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db, badgeTipos, usuarioBadges, usuarios } from '@ecotech/shared/database';
import { eq, and, desc } from 'drizzle-orm';
import { authorize, requireModule } from '@ecotech/plugins/authorization';
import { NotFoundError, ValidationError } from '@ecotech/shared/utils';
import { awardBadge } from '../../utils/progresso-metrica.js';
import { badgesDocs } from '../../docs/gamificacao/schemas.js';
import { ok } from '../../docs/index.js';

const concederBadgeSchema = z.object({
  usuarioId: z.string().uuid(),
  badgeTipoId: z.string().uuid(),
  observacao: z.string().optional(),
});

const badgesRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', requireModule('gamificacao'));

  // Catálogo de tipos de badge
  fastify.get(
    '/',
    {
      schema: { tags: ['Gamificação'], summary: 'Listar tipos de badge', ...badgesDocs.listar },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async () => {
      const tipos = await db.query.badgeTipos.findMany({
        orderBy: [desc(badgeTipos.createdAt)],
      });
      return ok(tipos);
    },
  );

  // Badge mais recente da corretora (para TV/ranking)
  fastify.get(
    '/recent',
    {
      schema: { tags: ['Gamificação'], summary: 'Badge mais recente da corretora', ...badgesDocs.recente },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const badge = await db.query.usuarioBadges.findFirst({
        where: eq(usuarioBadges.corretoraId, request.corretoraId),
        orderBy: [desc(usuarioBadges.createdAt)],
        with: {
          badgeTipo: true,
          usuario: {
            columns: { id: true, nome: true, avatarUrl: true },
          },
        },
      });
      return ok(badge ?? null);
    },
  );

  // Badges do usuário logado
  fastify.get(
    '/mine',
    {
      schema: { tags: ['Gamificação'], summary: 'Meus badges', ...badgesDocs.meus },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const badges = await db.query.usuarioBadges.findMany({
        where: and(
          eq(usuarioBadges.corretoraId, request.corretoraId),
          eq(usuarioBadges.usuarioId, request.user.sub),
        ),
        orderBy: [desc(usuarioBadges.createdAt)],
        with: { badgeTipo: true },
      });
      return ok(badges);
    },
  );

  // Badges de um usuário específico (gestor)
  fastify.get(
    '/user/:id',
    {
      schema: { tags: ['Gamificação'], summary: 'Badges de usuário', ...badgesDocs.porUsuario },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const badges = await db.query.usuarioBadges.findMany({
        where: and(
          eq(usuarioBadges.corretoraId, request.corretoraId),
          eq(usuarioBadges.usuarioId, id),
        ),
        orderBy: [desc(usuarioBadges.createdAt)],
        with: { badgeTipo: true },
      });
      return ok(badges);
    },
  );

  // Concessão manual de badge pelo gestor
  fastify.post(
    '/grant',
    {
      schema: { tags: ['Gamificação'], summary: 'Conceder badge manualmente', ...badgesDocs.conceder },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request, reply) => {
      const data = concederBadgeSchema.parse(request.body);

      // Verificar que o usuário pertence à corretora
      const usuario = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, data.usuarioId),
        columns: { id: true, corretoraId: true },
      });

      if (!usuario || usuario.corretoraId !== request.corretoraId) {
        throw new NotFoundError('Usuário não encontrado');
      }

      // Verificar que o badge_tipo existe
      const badgeTipo = await db.query.badgeTipos.findFirst({
        where: eq(badgeTipos.id, data.badgeTipoId),
      });

      if (!badgeTipo) throw new NotFoundError('Tipo de badge não encontrado');

      await awardBadge({
        corretoraId: request.corretoraId,
        usuarioId: data.usuarioId,
        badgeSlug: badgeTipo.slug,
        concedidoPorId: request.user.sub,
        observacao: data.observacao,
      });

      return reply.status(201).send({ success: true, message: 'Badge concedido com sucesso' });
    },
  );
};

export default badgesRoutes;
