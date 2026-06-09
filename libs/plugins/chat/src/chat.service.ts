import { WebSocket } from 'ws';
import { db } from '@ecotech/shared/database';
import {
  mensagensChat,
  canaisChat,
  canaisMembros,
  mensagensLeituras,
  chatDigitando,
  usuarios,
  anexos,
} from '@ecotech/shared/database';
import { eq, and, desc, sql, or, inArray, lte } from 'drizzle-orm';
import { logger } from '@ecotech/shared/utils/logger';
import { StorageService, storageClient } from '@ecotech/shared/storage';

/** In-memory cache for signed avatar URLs — avoids generating new signatures
 *  on every request, which causes image flicker on the frontend. */
const avatarUrlCache = new Map<
  string,
  { url: string; expiresAt: number }
>();
const AVATAR_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Generate (or return cached) signed avatar URL from the R2 key stored in DB */
async function resolveAvatarUrl(
  avatarR2Key: string | null | undefined,
): Promise<string | null> {
  if (!avatarR2Key) return null;

  const cached = avatarUrlCache.get(avatarR2Key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  try {
    const url = await storageClient.getSignedDownloadUrl(avatarR2Key);
    if (url) {
      avatarUrlCache.set(avatarR2Key, {
        url,
        expiresAt: Date.now() + AVATAR_CACHE_TTL_MS,
      });
    }
    return url;
  } catch {
    return null;
  }
}

// Tipos para mensagens WebSocket
export interface ChatMessage {
  type: 'message' | 'typing' | 'stop_typing' | 'message_read' | 'user_status';
  canalId: string;
  usuarioId: string;
  data?: unknown;
}

export interface WebSocketClient {
  ws: WebSocket;
  usuarioId: string;
  corretoraId: string;
  pingInterval?: NodeJS.Timeout;
}

export class ChatService {
  private clients: Map<string, WebSocketClient[]> = new Map();
  // Cache de canais do usuário para broadcast rápido
  private userChannels: Map<string, Set<string>> = new Map();
  private storage: StorageService;

  constructor() {
    logger.info('Chat service initialized (in-memory mode)');
    this.storage = new StorageService();
  }

  async initialize() {
    logger.info('Chat service ready');
  }

  // Adicionar cliente WebSocket
  async addClient(usuarioId: string, corretoraId: string, ws: WebSocket) {
    // Buscar usuário no banco para validação
    const usuario = await db.query.usuarios.findFirst({
      where: and(
        eq(usuarios.id, usuarioId),
        eq(usuarios.corretoraId, corretoraId),
      ),
    });

    if (!usuario) {
      logger.error(`Usuario ${usuarioId} not found in database`);
      ws.close(1008, 'Usuario não encontrado');
      return;
    }

    // Carregar canais que o usuário participa (cache)
    await this.loadUserChannels(usuarioId, corretoraId);

    // Iniciar ping a cada 30 segundos
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    const client: WebSocketClient = {
      ws,
      usuarioId,
      corretoraId,
      pingInterval,
    };

    if (!this.clients.has(usuarioId)) {
      this.clients.set(usuarioId, []);
    }

    this.clients.get(usuarioId)?.push(client);

    logger.info(
      `User ${usuarioId} connected to chat (${usuario.nome}) - Corretora ${corretoraId}`,
    );

    // Notificar outros usuários que este usuário está online
    this.broadcastUserStatus(usuarioId, corretoraId, 'online');

    // Enviar ao novo cliente a lista de quem já está online na mesma corretora
    const onlinePayloads: string[] = [];
    this.clients.forEach((clientList, onlineUserId) => {
      if (onlineUserId === usuarioId) return;
      const sameCorretora = clientList.some((c) => c.corretoraId === corretoraId);
      if (sameCorretora) {
        onlinePayloads.push(
          JSON.stringify({ type: 'user_status', usuarioId: onlineUserId, data: { status: 'online' } }),
        );
      }
    });
    for (const payload of onlinePayloads) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  // Remover cliente WebSocket
  removeClient(usuarioId: string, ws: WebSocket) {
    const userClients = this.clients.get(usuarioId);
    if (userClients) {
      // Limpar o intervalo de ping
      const client = userClients.find((c) => c.ws === ws);
      if (client?.pingInterval) {
        clearInterval(client.pingInterval);
      }

      const filtered = userClients.filter((c) => c.ws !== ws);
      if (filtered.length === 0) {
        this.clients.delete(usuarioId);
        // Limpar cache de canais
        this.userChannels.delete(usuarioId);

        // Último cliente desconectado - usuário offline
        const corretoraId = userClients[0]?.corretoraId;
        if (corretoraId) {
          this.broadcastUserStatus(usuarioId, corretoraId, 'offline');
        }
      } else {
        this.clients.set(usuarioId, filtered);
      }
    }

    logger.info(`User ${usuarioId} disconnected from chat`);
  }

  // Carregar canais do usuário para cache
  private async loadUserChannels(usuarioId: string, corretoraId: string) {
    const canais = new Set<string>();

    // Buscar canais gerais onde é membro
    const canaisGerais = await db.query.canaisMembros.findMany({
      where: eq(canaisMembros.usuarioId, usuarioId),
      with: {
        canal: true,
      } as any,
    });

    canaisGerais.forEach((membro: any) => {
      if (
        membro.canal &&
        membro.canal.corretoraId === corretoraId &&
        membro.canal.ativo
      ) {
        canais.add(membro.canal.id);
      }
    });

    // Buscar canais diretos
    const canaisDiretos = await db.query.canaisChat.findMany({
      where: and(
        eq(canaisChat.corretoraId, corretoraId),
        eq(canaisChat.tipo, 'direto'),
        or(
          eq(canaisChat.usuarioId1, usuarioId),
          eq(canaisChat.usuarioId2, usuarioId),
        ),
      ),
    });

    canaisDiretos.forEach((canal) => {
      canais.add(canal.id);
    });

    this.userChannels.set(usuarioId, canais);
    logger.info(`Loaded ${canais.size} channels for user ${usuarioId}`);
  }

  // Enviar mensagem de chat
  async sendMessage(
    canalId: string,
    usuarioId: string,
    conteudo: string,
    respostaParaId?: string,
    tipo?: 'texto' | 'sistema' | 'arquivo' | 'oportunidade',
    metadata?: any,
  ) {
    logger.info(
      `📤 sendMessage called: canal=${canalId}, usuario=${usuarioId}, conteudo=${conteudo.substring(0, 50)}`,
    );

    // Validar conteúdo
    if (!conteudo || conteudo.trim().length === 0) {
      throw new Error('Mensagem não pode estar vazia');
    }

    // Verificar se o usuário tem permissão no canal
    const canal = await db.query.canaisChat.findFirst({
      where: eq(canaisChat.id, canalId),
    });

    if (!canal) {
      logger.error(`❌ Canal ${canalId} não encontrado`);
      throw new Error('Canal não encontrado');
    }

    logger.info(
      `✅ Canal encontrado: tipo=${canal.tipo}, corretora=${canal.corretoraId}`,
    );

    const hasPermission = await this.checkChannelPermission(canalId, usuarioId);
    if (!hasPermission) {
      logger.error(`❌ Usuario ${usuarioId} sem permissão no canal ${canalId}`);
      throw new Error('Sem permissão para enviar mensagens neste canal');
    }

    logger.info(`✅ Permissão validada para usuario ${usuarioId}`);

    // Inserir mensagem no banco
    const [mensagem] = await db
      .insert(mensagensChat)
      .values({
        canalId,
        usuarioId,
        conteudo,
        respostaParaId,
        tipo: tipo || 'texto',
        metadata,
      })
      .returning();

    logger.info(`💾 Mensagem salva no banco com ID: ${mensagem.id}`);

    // Processar menções (@usuario)
    await this.processMentions(mensagem.id, conteudo, canalId, usuarioId);

    // Buscar dados completos da mensagem com informações do usuário
    const mensagemRaw: any = await db.query.mensagensChat.findFirst({
      where: eq(mensagensChat.id, mensagem.id),
      with: {
        usuario: {
          columns: {
            id: true,
            nome: true,
            email: true,
            avatarR2Key: true,
          },
          with: {
            cargo: {
              columns: {
                nomeCargo: true,
              },
            },
            equipe: {
              columns: {
                nome: true,
              },
            },
          },
        },
      },
    });

    // Resolve avatar URL
    const mensagemCompleta = mensagemRaw
      ? {
          ...mensagemRaw,
          usuario: {
            ...mensagemRaw.usuario,
            avatarUrl: await resolveAvatarUrl(mensagemRaw.usuario?.avatarR2Key),
            avatarR2Key: undefined,
          },
        }
      : mensagemRaw;

    logger.info(`📡 Iniciando broadcast para canal ${canalId}`);

    // Broadcast para todos os membros do canal
    await this.broadcastToChannel(canalId, canal.corretoraId, {
      type: 'message',
      canalId,
      usuarioId,
      data: mensagemCompleta,
    });

    logger.info(
      `Message sent: User ${usuarioId} -> Canal ${canalId} (${conteudo.substring(0, 50)}...)`,
    );

    return mensagemCompleta;
  }

  /**
   * Enviar mensagem com arquivo no chat
   */
  async sendFileMessage(
    canalId: string,
    usuarioId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    legenda?: string,
  ) {
    logger.info(
      `📎 sendFileMessage: canal=${canalId}, usuario=${usuarioId}, file=${fileName}`,
    );

    // 1. Validar permissão no canal
    const hasPermission = await this.checkChannelPermission(canalId, usuarioId);
    if (!hasPermission) {
      throw new Error('Sem permissão para enviar mensagens neste canal');
    }

    // 2. Buscar canal para pegar corretoraId
    const canal = await db.query.canaisChat.findFirst({
      where: eq(canaisChat.id, canalId),
    });

    if (!canal) {
      throw new Error('Canal não encontrado');
    }

    // 3. Upload para R2 (cria anexo temporário)
    const uploadResult = await this.storage.uploadFile({
      file,
      fileName,
      mimeType,
      corretoraId: canal.corretoraId,
      entidadeTipo: 'mensagem_chat',
      entidadeId: 'temp', // Temporário, será atualizado depois
      uploadPorId: usuarioId,
    });

    logger.info(`📤 Arquivo uploaded: ${uploadResult.anexo['id']}`);

    // 4. Criar mensagem com tipo 'arquivo'
    const [mensagem] = await db
      .insert(mensagensChat)
      .values({
        canalId,
        usuarioId,
        tipo: 'arquivo',
        conteudo: legenda || fileName,
        metadata: {
          anexoId: uploadResult.anexo['id'],
          nomeArquivo: fileName,
          tamanho: file.length,
          mimeType,
          urlAssinada: uploadResult.urlAssinada,
        },
      })
      .returning();

    logger.info(`💾 Mensagem criada com ID: ${mensagem.id}`);

    // 5. Atualizar anexo com ID da mensagem
    await db
      .update(anexos)
      .set({ entidadeId: mensagem.id })
      .where(eq(anexos['id'], uploadResult.anexo['id']));

    logger.info(`🔗 Anexo vinculado à mensagem ${mensagem.id}`);

    // 6. Processar menções (se houver na legenda)
    if (legenda) {
      await this.processMentions(mensagem.id, legenda, canalId, usuarioId);
    }

    // 7. Buscar dados completos da mensagem
    const mensagemRaw: any = await db.query.mensagensChat.findFirst({
      where: eq(mensagensChat.id, mensagem.id),
      with: {
        usuario: {
          columns: {
            id: true,
            nome: true,
            email: true,
            avatarR2Key: true,
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

    // Resolve avatar URL
    const mensagemCompleta = mensagemRaw
      ? {
          ...mensagemRaw,
          usuario: {
            ...mensagemRaw.usuario,
            avatarUrl: await resolveAvatarUrl(mensagemRaw.usuario?.avatarR2Key),
            avatarR2Key: undefined,
          },
        }
      : mensagemRaw;

    logger.info(`📡 Iniciando broadcast para canal ${canalId}`);

    // 8. Broadcast via WebSocket
    await this.broadcastToChannel(canalId, canal.corretoraId, {
      type: 'message',
      canalId,
      usuarioId,
      data: mensagemCompleta,
    });

    logger.info(`✅ Arquivo enviado com sucesso no chat`);

    return mensagemCompleta;
  }

  // Marcar mensagem como lida (e todas anteriores no canal)
  async markAsRead(mensagemId: string, usuarioId: string) {
    // Buscar informações da mensagem para obter canalId e createdAt
    const mensagem: any = await db.query.mensagensChat.findFirst({
      where: eq(mensagensChat.id, mensagemId),
      with: {
        canal: true,
      } as any,
    });

    if (!mensagem?.canal) return;

    // Marcar todas as mensagens do canal até esta (inclusive) como lidas
    const mensagensParaMarcar = await db
      .select({ id: mensagensChat.id })
      .from(mensagensChat)
      .where(
        and(
          eq(mensagensChat.canalId, mensagem.canalId),
          sql`mensagem_chat.usuario_id != ${usuarioId}`,
          lte(mensagensChat.createdAt, mensagem.createdAt),
        ),
      );

    if (mensagensParaMarcar.length > 0) {
      await db
        .insert(mensagensLeituras)
        .values(mensagensParaMarcar.map((m) => ({ mensagemId: m.id, usuarioId })))
        .onConflictDoNothing();
    }

    await this.broadcastToChannel(
      mensagem.canalId,
      mensagem.canal.corretoraId,
      {
        type: 'message_read',
        canalId: mensagem.canalId,
        usuarioId,
        data: {
          mensagemId,
          usuarioId,
        },
      },
    );
  }

  // Indicar que está digitando
  async startTyping(canalId: string, usuarioId: string) {
    // Buscar canal para pegar corretoraId
    const canal = await db.query.canaisChat.findFirst({
      where: eq(canaisChat.id, canalId),
    });

    if (!canal) return;

    // Adicionar no banco com TTL de 5 segundos
    await db
      .insert(chatDigitando)
      .values({ canalId, usuarioId })
      .onConflictDoUpdate({
        target: [chatDigitando.canalId, chatDigitando.usuarioId],
        set: { iniciouEm: sql`NOW()` },
      });

    // Buscar nome do usuário para incluir no broadcast
    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, usuarioId),
      columns: { nome: true },
    });

    // Broadcast para o canal
    await this.broadcastToChannel(canalId, canal.corretoraId, {
      type: 'typing',
      canalId,
      usuarioId,
      data: { nome: usuario?.nome || 'Alguém' },
    });

    // Remover após 5 segundos automaticamente
    setTimeout(() => {
      this.stopTyping(canalId, usuarioId);
    }, 5000);
  }

  // Parar de digitar
  async stopTyping(canalId: string, usuarioId: string) {
    await db
      .delete(chatDigitando)
      .where(
        and(
          eq(chatDigitando.canalId, canalId),
          eq(chatDigitando.usuarioId, usuarioId),
        ),
      );

    // Buscar canal para pegar corretoraId
    const canal = await db.query.canaisChat.findFirst({
      where: eq(canaisChat.id, canalId),
    });

    if (canal) {
      await this.broadcastToChannel(canalId, canal.corretoraId, {
        type: 'stop_typing',
        canalId,
        usuarioId,
      });
    }
  }

  // Broadcast status do usuário (online/offline)
  private async broadcastUserStatus(
    usuarioId: string,
    corretoraId: string,
    status: 'online' | 'offline',
  ) {
    // Enviar para todos da mesma corretora
    this.clients.forEach((userClients) => {
      userClients.forEach((client) => {
        if (
          client.corretoraId === corretoraId &&
          client.ws.readyState === WebSocket.OPEN
        ) {
          client.ws.send(
            JSON.stringify({
              type: 'user_status',
              usuarioId,
              data: { status },
            }),
          );
        }
      });
    });
  }

  // Verificar permissão no canal
  async checkChannelPermission(
    canalId: string,
    usuarioId: string,
  ): Promise<boolean> {
    // Buscar informações do canal
    const canal = await db.query.canaisChat.findFirst({
      where: eq(canaisChat.id, canalId),
    });

    if (!canal) return false;

    // Se for canal direto, verificar se o usuário é um dos participantes
    if (canal.tipo === 'direto') {
      return canal.usuarioId1 === usuarioId || canal.usuarioId2 === usuarioId;
    }

    // Se for canal geral, verificar se é membro
    const membro = await db.query.canaisMembros.findFirst({
      where: and(
        eq(canaisMembros.canalId, canalId),
        eq(canaisMembros.usuarioId, usuarioId),
      ),
    });

    return membro !== undefined && (membro.podeEnviarMensagem ?? false);
  }

  // Broadcast para todos os clientes do canal (com isolamento por corretora)
  private async broadcastToChannel(
    canalId: string,
    corretoraId: string,
    data: {
      type: string;
      canalId?: string;
      usuarioId?: string;
      data?: unknown;
    },
  ) {
    // Buscar membros do canal
    const membros = await this.getChannelMembers(canalId);

    logger.info(
      `👥 Membros do canal ${canalId}: ${membros.length} [${membros.join(', ')}]`,
    );
    logger.info(
      `🔌 Clientes conectados: ${Array.from(this.clients.keys()).join(', ')}`,
    );

    let sentCount = 0;

    // Enviar para cada membro conectado (isolado por seguradora)
    membros.forEach((membroId) => {
      const userClients = this.clients.get(membroId);
      logger.info(
        `👤 Verificando membro ${membroId}: ${userClients ? userClients.length + ' clientes' : 'não conectado'}`,
      );

      if (userClients) {
        // Filtrar apenas clientes com conexão OPEN e limpar os fechados
        const activeClients = userClients.filter((client) => {
          if (client.ws.readyState !== WebSocket.OPEN) {
            logger.warn(
              `🧹 Removendo cliente inativo (readyState=${client.ws.readyState})`,
            );
            if (client.pingInterval) {
              clearInterval(client.pingInterval);
            }
            return false;
          }
          return true;
        });

        // Atualizar a lista com apenas clientes ativos
        if (activeClients.length !== userClients.length) {
          if (activeClients.length === 0) {
            this.clients.delete(membroId);
          } else {
            this.clients.set(membroId, activeClients);
          }
        }

        activeClients.forEach((client) => {
          // IMPORTANTE: Validar que o cliente pertence à mesma corretora (multi-tenant isolation)
          logger.info(
            `🔍 Cliente: corretora=${client.corretoraId}, esperado=${corretoraId}, ws.readyState=${client.ws.readyState}`,
          );

          if (client.corretoraId === corretoraId) {
            client.ws.send(JSON.stringify(data));
            sentCount++;
            logger.info(`✅ Mensagem enviada para ${membroId}`);
          } else {
            logger.warn(`❌ Não enviado para ${membroId}: corretora diferente`);
          }
        });
      }
    });

    logger.info(
      `📊 Broadcast to channel ${canalId}: ${sentCount}/${membros.length} clients notified`,
    );
  }

  // Obter membros de um canal
  private async getChannelMembers(canalId: string): Promise<string[]> {
    const canal = await db.query.canaisChat.findFirst({
      where: eq(canaisChat.id, canalId),
    });

    if (!canal) return [];

    // Se for canal direto
    if (canal.tipo === 'direto') {
      return [canal.usuarioId1!, canal.usuarioId2!].filter((id) => id !== null);
    }

    // Se for canal geral
    const membros = await db.query.canaisMembros.findMany({
      where: eq(canaisMembros.canalId, canalId),
    });

    return membros.map((m: { usuarioId: string }) => m.usuarioId);
  }

  // Buscar histórico de mensagens
  async getMessageHistory(canalId: string, limit = 50, offset = 0) {
    const mensagens = await db.query.mensagensChat.findMany({
      where: and(
        eq(mensagensChat.canalId, canalId),
        sql`${mensagensChat.deletedAt} IS NULL`, // Excluir mensagens deletadas
      ),
      orderBy: [desc(mensagensChat.createdAt)],
      limit,
      offset,
      with: {
        usuario: {
          columns: {
            id: true,
            nome: true,
            email: true,
            avatarR2Key: true,
          },
          with: {
            cargo: {
              columns: {
                nomeCargo: true,
              },
            },
            equipe: {
              columns: {
                nome: true,
              },
            },
          },
        },
        leituras: {
          with: {
            usuario: {
              columns: {
                id: true,
                nome: true,
              },
            },
          },
        },
        reacoes: {
          with: {
            usuario: {
              columns: {
                id: true,
                nome: true,
              },
            },
          },
        },
        respostaPara: {
          columns: {
            id: true,
            conteudo: true,
            usuarioId: true,
          },
          with: {
            usuario: {
              columns: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    // Resolve avatar URLs from R2 keys
    const mensagensComAvatar = await Promise.all(
      mensagens.map(async (m: any) => ({
        ...m,
        usuario: {
          ...m.usuario,
          avatarUrl: await resolveAvatarUrl(m.usuario?.avatarR2Key),
          avatarR2Key: undefined,
        },
      })),
    );

    return mensagensComAvatar.reverse(); // Retornar em ordem cronológica
  }

  // Adicionar reação a uma mensagem
  async addReaction(mensagemId: string, usuarioId: string, emoji: string): Promise<any[]> {
    // Verificar se a mensagem existe
    const mensagem: any = await db.query.mensagensChat.findFirst({
      where: eq(mensagensChat.id, mensagemId),
      with: {
        canal: true,
      } as any,
    });

    if (!mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    // Verificar permissão no canal
    const hasPermission = await this.checkChannelPermission(
      mensagem.canalId,
      usuarioId,
    );
    if (!hasPermission) {
      throw new Error('Sem permissão para reagir neste canal');
    }

    // Importar a tabela dinamicamente
    const { mensagensReacoes } = await import('@ecotech/shared/database');

    // Adicionar reação (unique constraint evita duplicatas)
    await db
      .insert(mensagensReacoes)
      .values({
        mensagemId,
        usuarioId,
        emoji,
      })
      .onConflictDoNothing();

    // Buscar todas as reações da mensagem
    const reacoes = await db.query.mensagensReacoes.findMany({
      where: eq(mensagensReacoes.mensagemId, mensagemId),
      with: {
        usuario: {
          columns: {
            id: true,
            nome: true,
          },
        },
      } as any,
    });

    // Broadcast para o canal
    await this.broadcastToChannel(
      mensagem.canalId,
      mensagem.canal.corretoraId,
      {
        type: 'reaction_added',
        canalId: mensagem.canalId,
        usuarioId,
        data: {
          mensagemId,
          emoji,
          usuarioId,
          reacoes,
        },
      },
    );

    return reacoes;
  }

  // Remover reação de uma mensagem
  async removeReaction(mensagemId: string, usuarioId: string, emoji: string): Promise<any[]> {
    const { mensagensReacoes } = await import('@ecotech/shared/database');

    const mensagem: any = await db.query.mensagensChat.findFirst({
      where: eq(mensagensChat.id, mensagemId),
      with: {
        canal: true,
      } as any,
    });

    if (!mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    // Remover reação
    await db
      .delete(mensagensReacoes)
      .where(
        and(
          eq(mensagensReacoes.mensagemId, mensagemId),
          eq(mensagensReacoes.usuarioId, usuarioId),
          eq(mensagensReacoes.emoji, emoji),
        ),
      );

    // Buscar reações atualizadas
    const reacoes = await db.query.mensagensReacoes.findMany({
      where: eq(mensagensReacoes.mensagemId, mensagemId),
      with: {
        usuario: {
          columns: {
            id: true,
            nome: true,
          },
        },
      } as any,
    });

    // Broadcast para o canal
    await this.broadcastToChannel(
      mensagem.canalId,
      mensagem.canal.corretoraId,
      {
        type: 'reaction_removed',
        canalId: mensagem.canalId,
        usuarioId,
        data: {
          mensagemId,
          emoji,
          usuarioId,
          reacoes,
        },
      },
    );

    return reacoes;
  }

  // Editar mensagem
  async editMessage(
    mensagemId: string,
    usuarioId: string,
    novoConteudo: string,
  ) {
    if (!novoConteudo || novoConteudo.trim().length === 0) {
      throw new Error('Mensagem não pode estar vazia');
    }

    const mensagem: any = await db.query.mensagensChat.findFirst({
      where: eq(mensagensChat.id, mensagemId),
      with: {
        canal: true,
      } as any,
    });

    if (!mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    // Verificar se é o autor da mensagem
    if (mensagem.usuarioId !== usuarioId) {
      throw new Error('Apenas o autor pode editar a mensagem');
    }

    // Verificar se a mensagem tem menos de 30 minutos
    if (mensagem.createdAt) {
      const mensagemData = new Date(mensagem.createdAt);
      const agora = new Date();
      const diffMinutos =
        (agora.getTime() - mensagemData.getTime()) / 1000 / 60;

      if (diffMinutos > 30) {
        throw new Error(
          'Não é possível editar mensagens com mais de 30 minutos',
        );
      }
    }

    // Atualizar mensagem
    const [mensagemAtualizada] = await db
      .update(mensagensChat)
      .set({
        conteudo: novoConteudo,
        editado: true,
        editadoEm: sql`NOW()`,
      })
      .where(eq(mensagensChat.id, mensagemId))
      .returning();

    // Buscar dados completos
    const mensagemRaw: any = await db.query.mensagensChat.findFirst({
      where: eq(mensagensChat.id, mensagemId),
      with: {
        usuario: {
          columns: {
            id: true,
            nome: true,
            email: true,
            avatarR2Key: true,
          },
        },
      } as any,
    });

    // Resolve avatar URL
    const mensagemCompleta = mensagemRaw
      ? {
          ...mensagemRaw,
          usuario: {
            ...mensagemRaw.usuario,
            avatarUrl: await resolveAvatarUrl(mensagemRaw.usuario?.avatarR2Key),
            avatarR2Key: undefined,
          },
        }
      : mensagemRaw;

    // Broadcast para o canal
    await this.broadcastToChannel(
      mensagem.canalId,
      mensagem.canal.corretoraId,
      {
        type: 'message_edited',
        canalId: mensagem.canalId,
        usuarioId,
        data: mensagemCompleta,
      },
    );

    return mensagemCompleta;
  }

  // Excluir mensagem (soft delete)
  async deleteMessage(mensagemId: string, usuarioId: string) {
    const mensagem: any = await db.query.mensagensChat.findFirst({
      where: eq(mensagensChat.id, mensagemId),
      with: {
        canal: true,
      } as any,
    });

    if (!mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    // Verificar se é o autor da mensagem
    if (mensagem.usuarioId !== usuarioId) {
      throw new Error('Apenas o autor pode excluir a mensagem');
    }

    // Verificar se a mensagem tem menos de 30 minutos
    if (mensagem.createdAt) {
      const mensagemData = new Date(mensagem.createdAt);
      const agora = new Date();
      const diffMinutos =
        (agora.getTime() - mensagemData.getTime()) / 1000 / 60;

      if (diffMinutos > 30) {
        throw new Error(
          'Não é possível excluir mensagens com mais de 30 minutos',
        );
      }
    }

    // Soft delete
    await db
      .update(mensagensChat)
      .set({
        deletedAt: sql`NOW()`,
      })
      .where(eq(mensagensChat.id, mensagemId));

    // Broadcast para o canal
    await this.broadcastToChannel(
      mensagem.canalId,
      mensagem.canal.corretoraId,
      {
        type: 'message_deleted',
        canalId: mensagem.canalId,
        usuarioId,
        data: {
          mensagemId,
        },
      },
    );
  }

  // Processar menções na mensagem
  private async processMentions(
    mensagemId: string,
    conteudo: string,
    canalId: string,
    autorId: string,
  ) {
    // Extrair menções do formato @usuario ou @[nome do usuario]
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)|@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(conteudo)) !== null) {
      // match[2] = userId do formato @[nome](userId)
      // match[3] = username do formato @username
      const userId = match[2] || match[3];
      if (userId && !mentions.includes(userId)) {
        mentions.push(userId);
      }
    }

    if (mentions.length === 0) {
      return;
    }

    logger.info(
      `📢 Processando ${mentions.length} menções na mensagem ${mensagemId}`,
    );

    // Importar tabelas necessárias
    const { mensagensMencoes, notificacoes } = await import(
      '@ecotech/shared/database'
    );

    // Buscar canal para obter corretoraId
    const canal = await db.query.canaisChat.findFirst({
      where: eq(canaisChat.id, canalId),
    });

    if (!canal) return;

    // Verificar quais usuários mencionados são válidos e estão no canal
    const usuariosValidos = await db.query.usuarios.findMany({
      where: and(
        eq(usuarios.corretoraId, canal.corretoraId),
        inArray(usuarios.id, mentions),
      ),
    });

    // Salvar menções e criar notificações
    for (const usuario of usuariosValidos) {
      // Não mencionar o próprio autor
      if (usuario.id === autorId) continue;

      // Verificar se o usuário tem acesso ao canal
      const hasAccess = await this.checkChannelPermission(canalId, usuario.id);
      if (!hasAccess) continue;

      try {
        // Salvar menção
        await db
          .insert(mensagensMencoes)
          .values({
            mensagemId,
            usuarioMencionadoId: usuario.id,
          })
          .onConflictDoNothing();

        // Buscar autor da mensagem para a notificação
        const autor = await db.query.usuarios.findFirst({
          where: eq(usuarios.id, autorId),
        });

        // Formatar conteúdo para notificação (remover IDs das menções)
        // Suporta tanto @[Nome](id) quanto @{Nome|id}
        const conteudoFormatado = conteudo
          .replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
          .replace(/@\{([^|]+)\|[^}]+\}/g, '@$1');

        // Criar notificação
        await db.insert(notificacoes).values({
          corretoraId: canal.corretoraId,
          usuarioId: usuario.id,
          tipo: 'chat_mention',
          titulo: `${autor?.nome || 'Alguém'} mencionou você`,
          mensagem:
            conteudoFormatado.length > 100
              ? conteudoFormatado.substring(0, 100) + '...'
              : conteudoFormatado,
          linkAcao: `/chat?canal=${canalId}&mensagem=${mensagemId}`,
          metadata: {
            canalId,
            mensagemId,
            autorId,
          },
        });

        logger.info(`✅ Notificação de menção criada para ${usuario.nome}`);
      } catch (error) {
        logger.error(
          `❌ Erro ao processar menção para ${usuario.id}: ${error}`,
        );
      }
    }
  }

  async close() {
    // Fechar todas as conexões WebSocket
    this.clients.forEach((userClients) => {
      userClients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close();
        }
      });
    });
    this.clients.clear();
    logger.info('Chat service closed');
  }
}
