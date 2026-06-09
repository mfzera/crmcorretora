import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db, googleCalendarTokens, tarefas } from '@ecotech/shared/database';
import { eq, and, isNull, gte } from 'drizzle-orm';
import { env } from '@ecotech/shared/utils/env';
import {
  createGoogleTask,
  createGoogleCalendarEvent,
} from '../../utils/google-calendar.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
].join(' ');

const googleCalendarRoutes: FastifyPluginAsyncZod = async function (fastify) {
  // GET /auth/google-calendar/connect-url
  // Retorna a URL de autorização do Google como JSON. Requer autenticação JWT.
  // O frontend chama via api.get() e depois redireciona com window.location.href.
  fastify.get(
    '/google-calendar/connect-url',
    {
      schema: {
        tags: ['Google Calendar'],
        summary: 'Obter URL de conexão com Google Calendar',
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
        return reply
          .status(503)
          .send({ success: false, error: 'Google Calendar não configurado' });
      }

      const url = new URL(GOOGLE_AUTH_URL);
      url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
      url.searchParams.set('redirect_uri', env.GOOGLE_REDIRECT_URI);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', SCOPES);
      url.searchParams.set('access_type', 'offline');
      url.searchParams.set('prompt', 'consent');
      url.searchParams.set('state', request.user.sub);

      return { success: true, data: { url: url.toString() } };
    },
  );

  // GET /auth/google-calendar/callback
  // Google redireciona aqui após o usuário autorizar. NÃO requer JWT (é redirect do Google).
  fastify.get(
    '/google-calendar/callback',
    {
      schema: {
        tags: ['Google Calendar'],
        summary: 'Callback OAuth do Google Calendar',
      },
    },
    async (request, reply) => {
      const {
        code,
        state: usuarioId,
        error,
      } = request.query as {
        code?: string;
        state?: string;
        error?: string;
      };

      const webUrl = process.env.APP_URL ?? 'http://localhost:3000';

      if (error || !code || !usuarioId) {
        return reply.redirect(`${webUrl}/perfil?tab=conexoes&google=error`);
      }

      try {
        // Trocar code por tokens
        const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID!,
            client_secret: env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: env.GOOGLE_REDIRECT_URI!,
            grant_type: 'authorization_code',
          }),
        });

        const tokens = (await tokenRes.json()) as {
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
          error?: string;
        };

        if (!tokenRes.ok || !tokens.access_token || !tokens.refresh_token) {
          return reply.redirect(`${webUrl}/perfil?tab=conexoes&google=error`);
        }

        await db
          .insert(googleCalendarTokens)
          .values({
            usuarioId,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(
              Date.now() + (tokens.expires_in ?? 3600) * 1000,
            ),
          })
          .onConflictDoUpdate({
            target: googleCalendarTokens.usuarioId,
            set: {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiresAt: new Date(
                Date.now() + (tokens.expires_in ?? 3600) * 1000,
              ),
              updatedAt: new Date(),
            },
          });

        return reply.redirect(`${webUrl}/perfil?tab=conexoes&google=connected`);
      } catch {
        return reply.redirect(`${webUrl}/perfil?tab=conexoes&google=error`);
      }
    },
  );

  // DELETE /auth/google-calendar/disconnect
  // Remove os tokens do banco e desvincula o Google Calendar.
  fastify.delete(
    '/google-calendar/disconnect',
    {
      schema: {
        tags: ['Google Calendar'],
        summary: 'Desconectar Google Calendar',
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      await db
        .delete(googleCalendarTokens)
        .where(eq(googleCalendarTokens.usuarioId, request.user.sub));

      return reply.send({ success: true });
    },
  );

  // POST /auth/google-calendar/sync
  // Envia tarefas do sistema para o Google Tasks.
  fastify.post(
    '/google-calendar/sync',
    {
      schema: {
        tags: ['Google Calendar'],
        summary: 'Sincronizar tarefas do sistema para Google Tasks',
      },
      preHandler: [fastify.authenticate],
    },
    async (request) => {
      const usuarioId = request.user.sub;
      const corretoraId = request.corretoraId;

      // Buscar tarefas não concluídas com vencimento futuro
      const items = await db.query.tarefas.findMany({
        where: and(
          eq(tarefas.corretoraId, corretoraId),
          eq(tarefas.usuarioId, usuarioId),
          eq(tarefas.concluida, false),
          isNull(tarefas.deletedAt),
          gte(tarefas.dataVencimento, new Date()),
        ),
      });

      let syncedTarefas = 0;
      let syncedEventos = 0;
      let erros = 0;

      await Promise.all(
        items.map(async (tarefa) => {
          const googleId = await createGoogleTask(usuarioId, {
            titulo: tarefa.titulo,
            descricao: tarefa.descricao,
            dataVencimento: tarefa.dataVencimento ?? undefined,
          });

          if (googleId) {
            syncedTarefas++;
            if (tarefa.dataVencimento) {
              const eventoId = await createGoogleCalendarEvent(usuarioId, {
                titulo: tarefa.titulo,
                descricao: tarefa.descricao,
                inicio: tarefa.dataVencimento,
              });
              if (eventoId) syncedEventos++;
            }
          } else {
            erros++;
          }
        }),
      );

      return {
        success: true,
        data: { syncedTarefas, syncedEventos, erros, total: items.length },
      };
    },
  );

  // GET /auth/google-calendar/status
  // Retorna se o usuário tem Google Calendar conectado.
  fastify.get(
    '/google-calendar/status',
    {
      schema: {
        tags: ['Google Calendar'],
        summary: 'Status da conexão com Google Calendar',
      },
      preHandler: [fastify.authenticate],
    },
    async (request) => {
      const record = await db.query.googleCalendarTokens.findFirst({
        where: eq(googleCalendarTokens.usuarioId, request.user.sub),
      });

      return {
        success: true,
        data: { conectado: !!record },
      };
    },
  );
};

export default googleCalendarRoutes;
