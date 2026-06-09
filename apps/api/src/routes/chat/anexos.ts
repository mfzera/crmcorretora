import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';
import { StorageService } from '@ecotech/shared/storage';
import { z } from 'zod';
import {
  db,
  canaisChat,
  canaisMembros,
  mensagensChat,
  anexos,
} from '@ecotech/shared/database';
import { NotFoundError, ForbiddenError, OwnershipError } from '@ecotech/shared/utils';

const chatAnexosRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const storageService = new StorageService();

  fastify.addHook('preHandler', fastify.authenticate);

  /**
   * POST /api/chat/canais/:canalId/anexos/upload
   * Upload de arquivo no chat
   */
  fastify.post(
    '/canais/:canalId/anexos/upload',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Upload de arquivo no chat',
        description: 'Envia um arquivo no canal de chat',
        params: z.object({ canalId: z.string().uuid() }),
      },
      preHandler: [authorize(['chat:enviar_mensagem'])],
    },
    async (request, reply) => {
      const { canalId } = request.params as { canalId: string };

      // Verificar se canal existe e pertence ao tenant
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

      // Verificar se usuário é membro do canal
      const membro = await db.query.canaisMembros.findFirst({
        where: and(
          eq(canaisMembros.canalId, canalId),
          eq(canaisMembros.usuarioId, request.user.sub),
        ),
      });

      if (!membro) {
        throw new OwnershipError('Você não é membro deste canal');
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

      // Obter mensagem de texto opcional
      const mensagemTexto = (data.fields.mensagem as any)?.value as
        | string
        | undefined;

      try {
        // Upload via storage service
        const resultUpload = await storageService.uploadFile({
          file: buffer,
          fileName: data.filename,
          mimeType: data.mimetype,
          corretoraId: request.corretoraId,
          entidadeTipo: 'mensagem_chat',
          entidadeId: canalId, // Temporariamente usar canalId, depois atualizar
          uploadPorId: request.user.sub,
        });

        // Criar mensagem no chat
        const [mensagem] = await db
          .insert(mensagensChat)
          .values({
            canalId,
            usuarioId: request.user.sub,
            tipo: 'arquivo',
            conteudo: mensagemTexto || `Enviou: ${data.filename}`,
            metadata: {
              anexoId: resultUpload.anexo.id,
              nomeArquivo: data.filename,
              tamanho: buffer.length,
              mimeType: data.mimetype,
            },
          })
          .returning();

        // Atualizar anexo com ID da mensagem correta
        await db
          .update(anexos)
          .set({ entidadeId: mensagem.id })
          .where(eq(anexos.id, resultUpload.anexo.id));

        // Broadcast via WebSocket
        const chatService = (fastify as any).chatService;
        if (chatService && typeof (chatService as any).broadcastToChannel === 'function') {
          await (chatService as any).broadcastToChannel(
            canalId,
            request.corretoraId,
            {
              type: 'message',
              canalId,
              usuarioId: request.user.sub,
              data: {
                ...mensagem,
                anexo: {
                  ...resultUpload.anexo,
                  urlAssinada: resultUpload.urlAssinada,
                },
              },
            },
          );
        }

        return reply.status(201).send({
          mensagem,
          anexo: resultUpload.anexo,
          urlAssinada: resultUpload.urlAssinada,
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

  /**
   * GET /api/chat/canais/:canalId/anexos
   * Listar todos os anexos de um canal
   */
  fastify.get(
    '/canais/:canalId/anexos',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Listar anexos do canal',
        description: 'Lista todos os arquivos enviados no canal',
        params: z.object({ canalId: z.string().uuid() }),
      },
      preHandler: [authorize(['chat:visualizar_mensagens'])],
    },
    async (request, reply) => {
      const { canalId } = request.params as { canalId: string };

      // Verificar se canal existe
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

      // Verificar se usuário é membro
      const membro = await db.query.canaisMembros.findFirst({
        where: and(
          eq(canaisMembros.canalId, canalId),
          eq(canaisMembros.usuarioId, request.user.sub),
        ),
      });

      if (!membro) {
        throw new OwnershipError('Você não é membro deste canal');
      }

      // Buscar mensagens do tipo file
      const mensagensComArquivo = await db.query.mensagensChat.findMany({
        where: and(
          eq(mensagensChat.canalId, canalId),
          eq(mensagensChat.tipo, 'arquivo'),
          isNull(mensagensChat.deletedAt),
        ),
        orderBy: (mensagensChat, { desc }) => [desc(mensagensChat.createdAt)],
        limit: 100,
      });

      // Buscar anexos dessas mensagens
      const mensagemIds = mensagensComArquivo.map((m) => m.id);

      if (mensagemIds.length === 0) {
        return reply.send([]);
      }

      const listaAnexos = await db.query.anexos.findMany({
        where: and(
          eq(anexos.corretoraId, request.corretoraId),
          eq(anexos.entidadeTipo, 'mensagem_chat'),
          inArray(anexos.entidadeId, mensagemIds),
          isNull(anexos.deletedAt),
        ),
        with: {
          uploadPor: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
        orderBy: (anexos, { desc }) => [desc(anexos.uploadEm)],
      });

      // Gerar URLs assinadas
      const anexosComUrl = await Promise.all(
        listaAnexos.map(async (anexo) => ({
          ...anexo,
          urlAssinada: await storageService.getSignedUrl(anexo.id),
        })),
      );

      return reply.send(anexosComUrl);
    },
  );

  /**
   * GET /api/chat/mensagens/:mensagemId/anexo
   * Obter anexo de uma mensagem específica
   */
  fastify.get(
    '/mensagens/:mensagemId/anexo',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Obter anexo da mensagem',
        description: 'Retorna o anexo vinculado a uma mensagem',
        params: z.object({ mensagemId: z.string().uuid() }),
      },
      preHandler: [authorize(['chat:visualizar_mensagens'])],
    },
    async (request, reply) => {
      const { mensagemId } = request.params as { mensagemId: string };

      // Buscar mensagem
      const mensagem = (await db.query.mensagensChat.findFirst({
        where: and(
          eq(mensagensChat.id, mensagemId),
          isNull(mensagensChat.deletedAt),
        ),
        with: {
          canal: true,
        } as any,
      })) as
        | (typeof mensagensChat.$inferSelect & {
            canal: { corretoraId: string } | null;
          })
        | null;

      if (!mensagem) {
        throw new NotFoundError('Mensagem');
      }

      // Verificar tenant
      if (mensagem.canal?.corretoraId !== request.corretoraId) {
        throw new ForbiddenError('Acesso negado');
      }

      // Verificar se usuário é membro do canal
      const membro = await db.query.canaisMembros.findFirst({
        where: and(
          eq(canaisMembros.canalId, mensagem.canalId),
          eq(canaisMembros.usuarioId, request.user.sub),
        ),
      });

      if (!membro) {
        throw new OwnershipError('Você não é membro deste canal');
      }

      // Buscar anexo
      const anexo = await db.query.anexos.findFirst({
        where: and(
          eq(anexos.entidadeTipo, 'mensagem_chat'),
          eq(anexos.entidadeId, mensagemId),
          isNull(anexos.deletedAt),
        ),
        with: {
          uploadPor: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
      });

      if (!anexo) {
        throw new NotFoundError('Anexo');
      }

      // Gerar URL assinada
      const urlAssinada = await storageService.getSignedUrl(anexo.id);

      return reply.send({
        ...anexo,
        urlAssinada,
      });
    },
  );
};

export default chatAnexosRoutes;
