import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';

const chatUploadRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const { db, canaisChat, canaisMembros } = await import(
    '@ecotech/shared/database'
  );
  const { NotFoundError, ForbiddenError, OwnershipError } = await import(
    '@ecotech/shared/utils'
  );

  fastify.addHook('preHandler', fastify.authenticate);

  /**
   * POST /api/chat/upload
   * Upload de arquivo diretamente no chat
   */
  fastify.post(
    '/upload',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Upload de arquivo no chat',
        description:
          'Faz upload de um arquivo e envia como mensagem no canal de chat',
        querystring: z.object({ canalId: z.string().uuid(), legenda: z.string().optional() }),
      },
      preHandler: [authorize(['chat:enviar_mensagem'])],
    },
    async (request, reply) => {
      const { canalId, legenda } = request.query as {
        canalId: string;
        legenda?: string;
      };

      // Validar acesso ao canal
      const canal = await db.query.canaisChat.findFirst({
        where: and(
          eq(canaisChat.id, canalId),
          eq(canaisChat.corretoraId, request.corretoraId),
          isNull(canaisChat.deletedAt),
        ),
      });

      if (!canal) {
        throw new NotFoundError('Canal de chat');
      }

      // Verificar se usuário tem acesso ao canal
      const chatService = (fastify as any).chatService;
      if (!chatService) {
        return reply.status(500).send({
          error: 'Chat service não disponível',
        });
      }

      const hasAccess = await chatService.checkChannelPermission(
        canalId,
        request.user.sub,
      );

      if (!hasAccess) {
        throw new OwnershipError('Você não tem acesso a este canal');
      }

      // Receber arquivo via multipart
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          error: 'Nenhum arquivo foi enviado',
        });
      }

      // Ler arquivo em buffer
      const buffer = await data.toBuffer();

      try {
        // Upload e criar mensagem via ChatService
        const mensagem = await chatService.sendFileMessage(
          canalId,
          request.user.sub,
          buffer,
          data.filename,
          data.mimetype,
          legenda,
        );

        return reply.status(201).send({
          success: true,
          data: mensagem,
        });
      } catch (error: any) {
        fastify.log.error('Erro ao fazer upload no chat:', error);

        if (error.message.includes('não permitido')) {
          return reply.status(400).send({ error: error.message });
        }

        if (error.message.includes('muito grande')) {
          return reply.status(413).send({ error: error.message });
        }

        throw error;
      }
    },
  );
};

export default chatUploadRoutes;
