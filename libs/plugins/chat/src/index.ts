import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import '@fastify/jwt';
import { ChatService } from './chat.service.js';
import { env } from '@ecotech/shared/utils/env';
import { logger } from '@ecotech/shared/utils/logger';

declare module 'fastify' {
  interface FastifyInstance {
    chatService: ChatService;
  }
}

const chatPlugin: FastifyPluginAsync = async (fastify) => {
  // Registrar WebSocket
  await fastify.register(websocket);

  // Criar instância do ChatService (sem Redis)
  const chatService = new ChatService();
  await chatService.initialize();

  // Decorar fastify com chatService
  fastify.decorate('chatService', chatService);

  // Rota WebSocket
  fastify.route({
    method: 'GET',
    url: '/api/chat/ws',
    schema: {
      tags: ['Chat'],
      summary: 'Conectar ao WebSocket do chat',
      description: `Estabelece conexão WebSocket para chat em tempo real. Requer token JWT como query parameter.

**Tipos de mensagens que o cliente pode enviar:**
- \`send_message\`: Enviar mensagem (requer: canalId, conteudo)
- \`mark_read\`: Marcar mensagem como lida (requer: mensagemId)
- \`typing\`: Indicar que está digitando (requer: canalId)
- \`stop_typing\`: Parar indicação de digitação (requer: canalId)
- \`add_reaction\`: Adicionar reação a mensagem (requer: mensagemId, emoji)
- \`remove_reaction\`: Remover reação (requer: mensagemId, emoji)
- \`edit_message\`: Editar mensagem (requer: mensagemId, conteudo)
- \`delete_message\`: Deletar mensagem (requer: mensagemId)
- \`file_message\`: Notificar envio de arquivo (requer: canalId, anexoId)
- \`ping\`: Manter conexão viva

**Mensagens recebidas do servidor:**
- \`connected\`: Confirmação de conexão
- \`message\`: Nova mensagem no canal
- \`message_updated\`: Mensagem editada
- \`message_deleted\`: Mensagem deletada
- \`reaction_added\`: Reação adicionada
- \`reaction_removed\`: Reação removida
- \`user_typing\`: Usuário digitando
- \`user_stop_typing\`: Usuário parou de digitar
- \`error\`: Erro na operação
- \`pong\`: Resposta ao ping`,
      querystring: z.object({
        token: z.string().describe('Token JWT de autenticação'),
      }),
      response: {
        200: z.object({
          error: z.string(),
        }),
      },
    },
    handler: (req, reply) => {
      reply.send({ error: 'Use WebSocket connection' });
    },
    wsHandler: async (socket, req: FastifyRequest) => {
      try {
        // Extract token from query parameter
        const token = (req.query as { token?: string }).token;

        if (!token) {
          logger.error('WebSocket connection without token');
          socket.close(1008, 'Unauthorized - No token provided');
          return;
        }

        // Verify JWT token
        let decoded;
        try {
          decoded = await fastify.jwt.verify(token);
        } catch (error) {
          logger.error({ error }, 'WebSocket authentication failed');
          socket.close(1008, 'Unauthorized - Invalid token');
          return;
        }

        if (
          !decoded ||
          decoded.type !== 'ws_ticket' ||
          !decoded.sub ||
          !decoded.corretoraId
        ) {
          logger.error('Invalid WebSocket ticket payload');
          socket.close(1008, 'Unauthorized - Invalid WebSocket ticket');
          return;
        }

        const { sub: usuarioId, corretoraId } = decoded;

        // Adicionar cliente ao ChatService
        await chatService.addClient(usuarioId, corretoraId, socket);

        logger.info(
          `WebSocket connected: Usuario ${usuarioId}, Corretora ${corretoraId}`,
        );

        // Enviar confirmação de conexão
        socket.send(
          JSON.stringify({
            type: 'connected',
            message: 'Conectado ao chat com sucesso',
            usuarioId,
          }),
        );

        // Listener para mensagens do cliente
        socket.on('message', async (rawMessage: Buffer) => {
          try {
            const message = JSON.parse(rawMessage.toString());

            // Validar estrutura básica da mensagem
            if (!message.type) {
              socket.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Tipo de mensagem não especificado',
                }),
              );
              return;
            }

            switch (message.type) {
              case 'send_message':
                if (!message.canalId || !message.conteudo) {
                  socket.send(
                    JSON.stringify({
                      type: 'error',
                      message: 'Canal e conteúdo são obrigatórios',
                    }),
                  );
                  return;
                }

                await chatService.sendMessage(
                  message.canalId,
                  usuarioId,
                  message.conteudo,
                  message.respostaParaId,
                  message.tipoMensagem,
                  message.metadata,
                );
                break;

              case 'mark_read':
                if (!message.mensagemId) {
                  socket.send(
                    JSON.stringify({
                      type: 'error',
                      message: 'ID da mensagem é obrigatório',
                    }),
                  );
                  return;
                }
                await chatService.markAsRead(message.mensagemId, usuarioId);
                break;

              case 'typing':
                if (!message.canalId) {
                  socket.send(
                    JSON.stringify({
                      type: 'error',
                      message: 'ID do canal é obrigatório',
                    }),
                  );
                  return;
                }
                await chatService.startTyping(message.canalId, usuarioId);
                break;

              case 'stop_typing':
                if (!message.canalId) {
                  socket.send(
                    JSON.stringify({
                      type: 'error',
                      message: 'ID do canal é obrigatório',
                    }),
                  );
                  return;
                }
                await chatService.stopTyping(message.canalId, usuarioId);
                break;

              case 'add_reaction':
                if (!message.mensagemId || !message.emoji) {
                  socket.send(
                    JSON.stringify({
                      type: 'error',
                      message: 'ID da mensagem e emoji são obrigatórios',
                    }),
                  );
                  return;
                }
                await chatService.addReaction(
                  message.mensagemId,
                  usuarioId,
                  message.emoji,
                );
                break;

              case 'remove_reaction':
                if (!message.mensagemId || !message.emoji) {
                  socket.send(
                    JSON.stringify({
                      type: 'error',
                      message: 'ID da mensagem e emoji são obrigatórios',
                    }),
                  );
                  return;
                }
                await chatService.removeReaction(
                  message.mensagemId,
                  usuarioId,
                  message.emoji,
                );
                break;

              case 'edit_message':
                if (!message.mensagemId || !message.conteudo) {
                  socket.send(
                    JSON.stringify({
                      type: 'error',
                      message: 'ID da mensagem e conteúdo são obrigatórios',
                    }),
                  );
                  return;
                }
                await chatService.editMessage(
                  message.mensagemId,
                  usuarioId,
                  message.conteudo,
                );
                break;

              case 'delete_message':
                if (!message.mensagemId) {
                  socket.send(
                    JSON.stringify({
                      type: 'error',
                      message: 'ID da mensagem é obrigatório',
                    }),
                  );
                  return;
                }
                await chatService.deleteMessage(message.mensagemId, usuarioId);
                break;

              case 'file_message':
                // Cliente enviou arquivo via REST e agora notifica via WebSocket
                if (!message.canalId || !message.anexoId) {
                  socket.send(
                    JSON.stringify({
                      type: 'error',
                      message: 'Canal e anexoId são obrigatórios',
                    }),
                  );
                  return;
                }

                // Buscar anexo
                const { db, anexos } = await import('@ecotech/shared/database');
                const { eq } = await import('drizzle-orm');

                const anexo = await db.query.anexos.findFirst({
                  where: eq(anexos['id'], message.anexoId),
                });

                if (!anexo) {
                  socket.send(
                    JSON.stringify({
                      type: 'error',
                      message: 'Anexo não encontrado',
                    }),
                  );
                  return;
                }

                // Criar mensagem
                const { mensagensChat } = await import(
                  '@ecotech/shared/database'
                );
                const storage = new (
                  await import('@ecotech/shared/storage')
                ).StorageService();

                const [mensagemArquivo] = await db
                  .insert(mensagensChat)
                  .values({
                    canalId: message.canalId,
                    usuarioId,
                    tipo: 'arquivo',
                    conteudo: message.legenda || anexo['nomeOriginal'],
                    metadata: {
                      anexoId: anexo['id'],
                      nomeArquivo: anexo['nomeOriginal'],
                      tamanho: anexo['tamanho'],
                      mimeType: anexo['mimeType'],
                    },
                    arquivoUrl: await storage.getSignedUrl(anexo['id']),
                    arquivoNome: anexo['nomeOriginal'],
                    arquivoTipo: anexo['mimeType'],
                  })
                  .returning();

                // Atualizar anexo com ID da mensagem
                await db
                  .update(anexos)
                  .set({ entidadeId: mensagemArquivo.id })
                  .where(eq(anexos['id'], anexo['id']));

                // Buscar canal para broadcast
                const { canaisChat } = await import('@ecotech/shared/database');
                const canal = await db.query.canaisChat.findFirst({
                  where: eq(canaisChat.id, message.canalId),
                });

                if (canal) {
                  // Buscar mensagem completa com relações
                  const mensagemCompleta =
                    await db.query.mensagensChat.findFirst({
                      where: eq(mensagensChat.id, mensagemArquivo.id),
                      with: {
                        usuario: {
                          columns: {
                            id: true,
                            nome: true,
                            email: true,
                            avatarUrl: true,
                          },
                          with: {
                            cargo: {
                              columns: {
                                nomeCargo: true,
                                cor: true,
                              },
                            },
                          },
                        },
                      } as any,
                    });

                  // Broadcast (método broadcastToChannel é privado, então usamos via reflexão)
                  // Ou fazemos broadcast manualmente
                  await (chatService as any).broadcastToChannel(
                    message.canalId,
                    canal.corretoraId,
                    {
                      type: 'message',
                      canalId: message.canalId,
                      usuarioId,
                      data: mensagemCompleta,
                    },
                  );
                }
                break;

              case 'ping':
                // Cliente pode enviar ping para manter conexão viva
                socket.send(JSON.stringify({ type: 'pong' }));
                break;

              default:
                logger.warn(`Unknown message type: ${message.type}`);
                socket.send(
                  JSON.stringify({
                    type: 'error',
                    message: `Tipo de mensagem desconhecido: ${message.type}`,
                  }),
                );
            }
          } catch (error) {
            logger.error({ error }, 'Error handling WebSocket message');

            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Erro ao processar mensagem';

            socket.send(
              JSON.stringify({
                type: 'error',
                message: errorMessage,
              }),
            );
          }
        });

        // Listener para desconexão
        socket.on('close', () => {
          chatService.removeClient(usuarioId, socket);
          logger.info(`WebSocket disconnected: Usuario ${usuarioId}`);
        });

        // Listener para erros
        socket.on('error', (error: Error) => {
          logger.error({ error }, 'WebSocket error');
          chatService.removeClient(usuarioId, socket);
        });
      } catch (error) {
        logger.error({ error }, 'Error in WebSocket handler');
        socket.close(1011, 'Internal Server Error');
      }
    },
  });

  // Cleanup ao desligar o servidor
  fastify.addHook('onClose', async () => {
    await chatService.close();
  });
};

export default fp(chatPlugin, {
  name: 'chat',
  dependencies: ['auth'],
});
