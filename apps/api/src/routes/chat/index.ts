import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '@ecotech/shared/database';
import {
  canaisChat,
  canaisMembros,
  mensagensChat,
  usuarios,
} from '@ecotech/shared/database';
import { eq, and, or, sql, desc, inArray } from 'drizzle-orm';
import { chatDocs } from '../../docs/chat/schemas.js';
import chatAnexosRoutes from './anexos.js';
import chatUploadRoutes from './upload.js';
import { storageClient } from '@ecotech/shared/storage';
import { randomUUID } from 'crypto';

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

const chatRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Registrar sub-rotas de anexos
  await fastify.register(chatAnexosRoutes);
  // Registrar sub-rotas de upload
  await fastify.register(chatUploadRoutes);
  // Aplicar tenant isolation e autenticação a todas as rotas de chat
  fastify.addHook('onRequest', fastify.authenticate);

  // Ticket curto para handshake WebSocket (evita JWT grande no query string)
  fastify.post(
    '/ws-ticket',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Gerar ticket de conexão WebSocket',
        description:
          'Gera um ticket JWT curto para autenticação do WebSocket do chat.',
        ...chatDocs.wsTicket,
      },
    },
    async (request) => {
      const { sub, corretoraId } = request.user;

      const ticketPayload = {
        sub,
        corretoraId,
        type: 'ws_ticket',
        jti: randomUUID(),
      } as any;

      const ticket = fastify.jwt.sign(ticketPayload, {
        expiresIn: '60s',
      });

      return {
        ticket,
        expiresIn: 60,
      };
    },
  );

  // Listar canais do usuário
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Listar canais do usuário',
        description:
          'Retorna todos os canais (gerais e diretos) que o usuário participa, incluindo última mensagem e contador de mensagens não lidas. Ordenado por atividade recente.',
        ...chatDocs.listarCanais,
      },
    },
    async (request, reply) => {
      const { sub: usuarioId, corretoraId } = request.user;

      // Buscar canais gerais onde o usuário é membro
      const canaisGerais: any = await db.query.canaisChat.findMany({
        where: and(
          eq(canaisChat.corretoraId, corretoraId),
          eq(canaisChat.tipo, 'geral'),
          eq(canaisChat.ativo, true),
        ),
        with: {
          membros: {
            where: eq(canaisMembros.usuarioId, usuarioId),
          },
          criadoPor: {
            columns: {
              id: true,
              nome: true,
            },
          },
        } as any,
      });

      // Filtrar apenas canais onde o usuário é membro
      const canaisGeraisFiltrados = canaisGerais.filter(
        (canal: any) => canal.membros.length > 0,
      );

      // Buscar canais diretos (DMs)
      const canaisDiretosRaw: any = await db.query.canaisChat.findMany({
        where: and(
          eq(canaisChat.corretoraId, corretoraId),
          eq(canaisChat.tipo, 'direto'),
          or(
            eq(canaisChat.usuarioId1, usuarioId),
            eq(canaisChat.usuarioId2, usuarioId),
          ),
        ),
        with: {
          usuario1: {
            columns: {
              id: true,
              nome: true,
              email: true,
              avatarR2Key: true,
            },
          },
          usuario2: {
            columns: {
              id: true,
              nome: true,
              email: true,
              avatarR2Key: true,
            },
          },
        } as any,
      });

      // Filtrar canais diretos onde ambos usuários existem e têm dados válidos
      const canaisDiretos = canaisDiretosRaw.filter((canal: any) => {
        const usuario1Valido =
          canal.usuario1 && canal.usuario1.id && canal.usuario1.nome;
        const usuario2Valido =
          canal.usuario2 && canal.usuario2.id && canal.usuario2.nome;
        return usuario1Valido && usuario2Valido;
      });

      // Para cada canal, buscar a última mensagem e contagem de não lidas
      const canaisComInfo = await Promise.all([
        ...canaisGeraisFiltrados.map(async (canal: any) => {
          const ultimaMensagem: any = await db.query.mensagensChat.findFirst({
            where: eq(mensagensChat.canalId, canal.id),
            orderBy: [desc(mensagensChat.createdAt)],
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

          // Contar mensagens não lidas
          const naoLidas = await db
            .select({ count: sql<number>`count(*)` })
            .from(mensagensChat)
            .leftJoin(
              sql`(SELECT mensagem_id FROM mensagem_leitura WHERE usuario_id = ${usuarioId})`,
              sql`mensagem_chat.id = mensagem_id`,
            )
            .where(
              and(
                eq(mensagensChat.canalId, canal.id),
                sql`mensagem_id IS NULL`,
                sql`mensagem_chat.usuario_id != ${usuarioId}`,
              ),
            );

          // Resolve avatar for last message user
          let ultimaMensagemResolved = ultimaMensagem;
          if (ultimaMensagem?.usuario) {
            const avatarUrl = await resolveAvatarUrl(
              ultimaMensagem.usuario.avatarR2Key,
            );
            ultimaMensagemResolved = {
              ...ultimaMensagem,
              usuario: {
                id: ultimaMensagem.usuario.id,
                nome: ultimaMensagem.usuario.nome,
                email: ultimaMensagem.usuario.email,
                avatarUrl,
              },
            };
          }

          return {
            id: canal.id,
            tipo: canal.tipo,
            nome: canal.nome,
            descricao: canal.descricao,
            corretoraId: canal.corretoraId,
            criadoPorId: canal.criadoPorId,
            ativo: canal.ativo,
            createdAt: canal.createdAt,
            ultimaMensagem: ultimaMensagemResolved,
            naoLidas: Number(naoLidas[0]?.count || 0),
          };
        }),
        ...canaisDiretos.map(async (canal: any) => {
          const ultimaMensagem: any = await db.query.mensagensChat.findFirst({
            where: eq(mensagensChat.canalId, canal.id),
            orderBy: [desc(mensagensChat.createdAt)],
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

          // Contar mensagens não lidas
          const naoLidas = await db
            .select({ count: sql<number>`count(*)` })
            .from(mensagensChat)
            .leftJoin(
              sql`(SELECT mensagem_id FROM mensagem_leitura WHERE usuario_id = ${usuarioId})`,
              sql`mensagem_chat.id = mensagem_id`,
            )
            .where(
              and(
                eq(mensagensChat.canalId, canal.id),
                sql`mensagem_id IS NULL`,
                sql`mensagem_chat.usuario_id != ${usuarioId}`,
              ),
            );

          // Resolve avatar for last message user
          let ultimaMensagemResolved = ultimaMensagem;
          if (ultimaMensagem?.usuario) {
            const avatarUrl = await resolveAvatarUrl(
              ultimaMensagem.usuario.avatarR2Key,
            );
            ultimaMensagemResolved = {
              ...ultimaMensagem,
              usuario: {
                id: ultimaMensagem.usuario.id,
                nome: ultimaMensagem.usuario.nome,
                email: ultimaMensagem.usuario.email,
                avatarUrl,
              },
            };
          }

          // Determinar o outro usuário e resolver avatar
          const outroUsuarioRaw =
            canal.usuarioId1 === usuarioId ? canal.usuario2 : canal.usuario1;
          const outroUsuario = outroUsuarioRaw
            ? {
                id: outroUsuarioRaw.id,
                nome: outroUsuarioRaw.nome,
                email: outroUsuarioRaw.email,
                avatarUrl: await resolveAvatarUrl(outroUsuarioRaw.avatarR2Key),
              }
            : null;

          return {
            id: canal.id,
            tipo: canal.tipo,
            nome: canal.nome,
            descricao: canal.descricao,
            corretoraId: canal.corretoraId,
            criadoPorId: canal.criadoPorId,
            ativo: canal.ativo,
            createdAt: canal.createdAt,
            outroUsuario,
            ultimaMensagem: ultimaMensagemResolved,
            naoLidas: Number(naoLidas[0]?.count || 0),
          };
        }),
      ]);

      // Filtrar canais nulos (usuário deletado) e ordenar por atividade recente
      const canaisValidos = canaisComInfo.filter(
        (canal) => canal !== null,
      ) as any[];

      return reply.send({
        canais: canaisValidos.sort((a, b) => {
          const dateA =
            a.ultimaMensagem?.createdAt || a.createdAt || new Date();
          const dateB =
            b.ultimaMensagem?.createdAt || b.createdAt || new Date();
          return dateB.getTime() - dateA.getTime();
        }),
      });
    },
  );

  // Criar canal geral (apenas admin)
  fastify.post('/', {
    schema: {
      tags: ['Chat'],
      summary: 'Criar canal geral',
      description:
        'Cria um novo canal geral de chat com múltiplos membros. Apenas administradores da corretora podem criar canais. O criador é automaticamente adicionado como administrador do canal.',
      ...chatDocs.criarCanal,
    },
    handler: async (request, reply) => {
      const { nome, descricao, membrosIds } = request.body as {
        nome: string;
        descricao?: string;
        membrosIds: string[];
      };
      const { sub: usuarioId, corretoraId, isAdmin } = request.user;

      // Apenas admins podem criar canais
      if (!isAdmin) {
        return reply.status(403 as any).send({
          message: 'Apenas administradores podem criar canais',
        });
      }

      // Criar canal
      const [canal] = await db
        .insert(canaisChat)
        .values({
          corretoraId,
          tipo: 'geral',
          nome,
          descricao,
          criadoPorId: usuarioId,
        })
        .returning();

      // Adicionar membros (excluindo o criador, que será adicionado como admin)
      const outrosMembros = membrosIds.filter((id) => id !== usuarioId);
      if (outrosMembros.length > 0) {
        await db.insert(canaisMembros).values(
          outrosMembros.map((membroId) => ({
            canalId: canal.id,
            usuarioId: membroId,
            adicionadoPorId: usuarioId,
            isAdmin: false,
          })),
        );
      }

      // Adicionar criador como admin do canal
      await db.insert(canaisMembros).values({
        canalId: canal.id,
        usuarioId,
        adicionadoPorId: usuarioId,
        isAdmin: true,
      });

      return reply.status(201).send({ canal });
    },
  });

  // Criar/obter canal direto
  fastify.post('/direto', {
    schema: {
      tags: ['Chat'],
      summary: 'Criar ou obter canal direto (DM)',
      description:
        'Cria um novo canal de mensagem direta entre dois usuários. Se já existe um canal direto entre eles, retorna o canal existente ao invés de criar duplicata.',
      ...chatDocs.criarCanalDireto,
    },
    handler: async (request, reply) => {
      const { usuarioDestinoId } = request.body as {
        usuarioDestinoId: string;
      };
      const { sub: usuarioId, corretoraId } = request.user;

      // Não pode criar DM consigo mesmo
      if (usuarioId === usuarioDestinoId) {
        return reply
          .status(400 as any)
          .send({ message: 'Não é possível criar DM consigo mesmo' });
      }

      // Verificar se já existe canal direto entre os dois usuários (em qualquer ordem)
      const canalExistente = await db.query.canaisChat.findFirst({
        where: and(
          eq(canaisChat.corretoraId, corretoraId),
          eq(canaisChat.tipo, 'direto'),
          or(
            and(
              eq(canaisChat.usuarioId1, usuarioId),
              eq(canaisChat.usuarioId2, usuarioDestinoId),
            ),
            and(
              eq(canaisChat.usuarioId1, usuarioDestinoId),
              eq(canaisChat.usuarioId2, usuarioId),
            ),
          ),
        ),
      });

      if (canalExistente) {
        return reply.send({ canal: canalExistente, created: false });
      }

      // Criar novo canal direto
      const [canal] = await db
        .insert(canaisChat)
        .values({
          corretoraId,
          tipo: 'direto',
          usuarioId1: usuarioId,
          usuarioId2: usuarioDestinoId,
          criadoPorId: usuarioId,
        })
        .returning();

      return reply.status(201).send({ canal, created: true });
    },
  });

  // Buscar histórico de mensagens
  fastify.get('/:canalId/mensagens', {
    schema: {
      tags: ['Chat'],
      summary: 'Buscar histórico de mensagens do canal',
      description:
        'Retorna o histórico de mensagens de um canal com paginação. Inclui informações do autor, leituras, reações e menções. Verifica permissão de acesso ao canal.',
      ...chatDocs.listarMensagens,
    },
    handler: async (request, reply) => {
      const { canalId } = request.params as { canalId: string };
      const { limit = 50, offset = 0 } = request.query as {
        limit?: number;
        offset?: number;
      };
      const { sub: usuarioId } = request.user;

      // Verificar se usuário tem acesso ao canal
      const canal = await db.query.canaisChat.findFirst({
        where: eq(canaisChat.id, canalId),
      });

      if (!canal) {
        return reply.status(404).send({ message: 'Canal não encontrado' } as any);
      }

      // Verificar permissão
      let hasAccess = false;

      if (canal.tipo === 'direto') {
        hasAccess =
          canal.usuarioId1 === usuarioId || canal.usuarioId2 === usuarioId;
      } else {
        const membro = await db.query.canaisMembros.findFirst({
          where: and(
            eq(canaisMembros.canalId, canalId),
            eq(canaisMembros.usuarioId, usuarioId),
          ),
        });
        hasAccess = membro !== undefined;
      }

      if (!hasAccess) {
        return reply
          .status(403)
          .send({ message: 'Sem permissão para acessar este canal' } as any);
      }

      // Buscar mensagens do banco
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
                  cor: true,
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
          mencoes: {
            with: {
              usuarioMencionado: {
                columns: {
                  id: true,
                  nome: true,
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
            },
          },
        },
      });

      // Filtrar mensagens sem usuário (usuário deletado)
      const mensagensValidas = mensagens.filter((m: any) => m.usuario);

      // Resolve avatar URLs from R2 keys
      const mensagensComAvatar = await Promise.all(
        mensagensValidas.map(async (m: any) => ({
          ...m,
          usuario: {
            ...m.usuario,
            avatarUrl: await resolveAvatarUrl(m.usuario.avatarR2Key),
            avatarR2Key: undefined,
          },
        })),
      );

      return { mensagens: mensagensComAvatar.reverse() };
    },
  });

  // Adicionar membro ao canal (apenas admin do canal)
  fastify.post('/:canalId/members', {
    schema: {
      tags: ['Chat'],
      summary: 'Adicionar membro ao canal',
      description:
        'Adiciona um novo membro a um canal geral. Apenas administradores do canal podem adicionar membros. Não aplicável a canais diretos.',
      ...chatDocs.adicionarMembro,
    },
    handler: async (request, reply) => {
      const { canalId } = request.params as { canalId: string };
      const { usuarioId: novoMembroId } = request.body as {
        usuarioId: string;
      };
      const { sub: usuarioId } = request.user;

      // Verificar se o canal existe e é geral
      const canal = await db.query.canaisChat.findFirst({
        where: eq(canaisChat.id, canalId),
      });

      if (!canal || canal.tipo !== 'geral') {
        return reply
          .status(404)
          .send({ message: 'Canal não encontrado ou não é um canal geral' });
      }

      // Verificar se o usuário é admin do canal
      const membro = await db.query.canaisMembros.findFirst({
        where: and(
          eq(canaisMembros.canalId, canalId),
          eq(canaisMembros.usuarioId, usuarioId),
        ),
      });

      if (!membro?.isAdmin) {
        return reply
          .status(403)
          .send({ message: 'Apenas admins do canal podem adicionar membros' });
      }

      // Adicionar novo membro
      await db
        .insert(canaisMembros)
        .values({
          canalId,
          usuarioId: novoMembroId,
          adicionadoPorId: usuarioId,
        })
        .onConflictDoNothing();

      return reply
        .status(201)
        .send({ message: 'Membro adicionado com sucesso' });
    },
  });

  // Listar membros do canal
  fastify.get(
    '/:canalId/members',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Listar membros do canal',
        description:
          'Retorna lista de membros de um canal. Para canais gerais, lista todos os membros com suas permissões. Para canais diretos, lista os dois participantes.',
        ...chatDocs.listarMembros,
      },
    },
    async (request, reply) => {
      const { canalId } = request.params as { canalId: string };
      const { sub: usuarioId } = request.user;

      // Verificar se usuário tem acesso ao canal
      const canal = await db.query.canaisChat.findFirst({
        where: eq(canaisChat.id, canalId),
      });

      if (!canal) {
        return reply.status(404).send({ message: 'Canal não encontrado' } as any);
      }

      // Verificar permissão
      let hasAccess = false;

      if (canal.tipo === 'direto') {
        hasAccess =
          canal.usuarioId1 === usuarioId || canal.usuarioId2 === usuarioId;

        // Para canais diretos, retornar os dois usuários
        if (hasAccess) {
          const usuariosCanal: any = await db.query.usuarios.findMany({
            where: or(
              eq(usuarios.id, canal.usuarioId1!),
              eq(usuarios.id, canal.usuarioId2!),
            ),
            columns: {
              id: true,
              nome: true,
              email: true,
              avatarR2Key: true,
            },
            with: {
              equipe: {
                columns: {
                  nome: true,
                },
              },
            } as any,
          });
          const membrosComAvatar = await Promise.all(
            usuariosCanal.map(async (u: any) => ({
              ...u,
              avatarUrl: await resolveAvatarUrl(u.avatarR2Key),
              avatarR2Key: undefined,
            })),
          );
          return { membros: membrosComAvatar };
        }
      } else {
        const membro = await db.query.canaisMembros.findFirst({
          where: and(
            eq(canaisMembros.canalId, canalId),
            eq(canaisMembros.usuarioId, usuarioId),
          ),
        });
        hasAccess = membro !== undefined;
      }

      if (!hasAccess) {
        return reply
          .status(403)
          .send({ message: 'Sem permissão para acessar este canal' } as any);
      }

      // Buscar membros
      const membros: any = await db.query.canaisMembros.findMany({
        where: eq(canaisMembros.canalId, canalId),
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

      const membrosComAvatar = await Promise.all(
        membros.map(async (m: any) => ({
          ...m.usuario,
          avatarUrl: await resolveAvatarUrl(m.usuario?.avatarR2Key),
          avatarR2Key: undefined,
          isAdmin: m.isAdmin,
          podeEnviarMensagem: m.podeEnviarMensagem,
        })),
      );

      return { membros: membrosComAvatar };
    },
  );

  // Buscar perfil de usuário
  fastify.get(
    '/usuarios/:usuarioId/perfil',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Buscar perfil de usuário',
        description:
          'Retorna informações de perfil de um usuário específico da corretora. Útil para exibir detalhes ao clicar em um usuário no chat.',
        ...chatDocs.perfilUsuario,
      },
    },
    async (request, reply) => {
      const { usuarioId } = request.params as { usuarioId: string };
      const { corretoraId } = request.user;

      const usuario: any = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, usuarioId),
          eq(usuarios.corretoraId, corretoraId),
        ),
        columns: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          avatarR2Key: true,
          ativo: true,
        },
        with: {
          equipe: {
            columns: {
              nome: true,
            },
          },
          cargo: {
            columns: {
              nomeCargo: true,
              cor: true,
            },
          },
        } as any,
      });

      if (!usuario) {
        return reply.status(404).send({ message: 'Usuário não encontrado' } as any);
      }

      return {
        usuario: {
          ...usuario,
          avatarUrl: await resolveAvatarUrl(usuario.avatarR2Key),
          avatarR2Key: undefined,
        },
      };
    },
  );

  // Adicionar múltiplos membros ao canal
  fastify.post(
    '/:canalId/members/bulk',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Adicionar múltiplos membros ao canal',
        description:
          'Adiciona vários membros de uma vez a um canal geral. Apenas administradores do canal podem executar esta ação. Útil para criação de grupos com muitos participantes.',
        ...chatDocs.adicionarMembrosBulk,
      },
    },
    async (request, reply) => {
      const { canalId } = request.params as { canalId: string };
      const { usuarioIds } = request.body as { usuarioIds: string[] };
      const { sub: usuarioId } = request.user;

      if (!usuarioIds || usuarioIds.length === 0) {
        return reply
          .status(400)
          .send({ message: 'Lista de usuários não pode estar vazia' });
      }

      // Verificar se o canal existe e é geral
      const canal = await db.query.canaisChat.findFirst({
        where: eq(canaisChat.id, canalId),
      });

      if (!canal || canal.tipo !== 'geral') {
        return reply
          .status(404)
          .send({ message: 'Canal não encontrado ou não é um canal geral' });
      }

      // Verificar se o usuário é admin do canal
      const membro = await db.query.canaisMembros.findFirst({
        where: and(
          eq(canaisMembros.canalId, canalId),
          eq(canaisMembros.usuarioId, usuarioId),
        ),
      });

      if (!membro?.isAdmin) {
        return reply
          .status(403)
          .send({ message: 'Apenas admins do canal podem adicionar membros' });
      }

      // Adicionar novos membros em batch
      const membrosData = usuarioIds.map((uid) => ({
        canalId,
        usuarioId: uid,
        adicionadoPorId: usuarioId,
      }));

      await db.insert(canaisMembros).values(membrosData).onConflictDoNothing();

      return reply.status(201).send({
        message: `${usuarioIds.length} ${usuarioIds.length === 1 ? 'membro adicionado' : 'membros adicionados'} com sucesso`,
      });
    },
  );

  // Remover membro do canal
  fastify.delete(
    '/:canalId/members/:memberId',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Remover membro do canal',
        description:
          'Remove um membro de um canal geral. Apenas administradores do canal podem remover membros. Administrador não pode remover a si mesmo (use rota de sair do canal).',
        ...chatDocs.removerMembro,
        params: z.object({ canalId: z.string().uuid(), memberId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { canalId, memberId } = request.params as {
        canalId: string;
        memberId: string;
      };
      const { sub: usuarioId } = request.user;

      // Verificar se o canal existe
      const canal = await db.query.canaisChat.findFirst({
        where: eq(canaisChat.id, canalId),
      });

      if (!canal) {
        return reply.status(404).send({ message: 'Canal não encontrado' });
      }

      // Verificar se o usuário é admin do canal
      const adminMembro = await db.query.canaisMembros.findFirst({
        where: and(
          eq(canaisMembros.canalId, canalId),
          eq(canaisMembros.usuarioId, usuarioId),
        ),
      });

      if (!adminMembro?.isAdmin) {
        return reply
          .status(403)
          .send({ message: 'Apenas admins do canal podem remover membros' });
      }

      // Não permitir remover a si mesmo
      if (memberId === usuarioId) {
        return reply
          .status(400)
          .send({ message: 'Use a rota de sair do canal para se remover' });
      }

      // Remover membro
      await db
        .delete(canaisMembros)
        .where(
          and(
            eq(canaisMembros.canalId, canalId),
            eq(canaisMembros.usuarioId, memberId),
          ),
        );

      return reply.send({ message: 'Membro removido com sucesso' });
    },
  );

  // Sair do canal
  fastify.post(
    '/:canalId/leave',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Sair do canal',
        description:
          'Remove o usuário atual de um canal geral. Se for o último administrador e houver outros membros, deve promover alguém a admin antes de sair.',
        ...chatDocs.sairCanal,
      },
    },
    async (request, reply) => {
      const { canalId } = request.params as { canalId: string };
      const { sub: usuarioId } = request.user;

      // Verificar se o canal existe
      const canal = await db.query.canaisChat.findFirst({
        where: eq(canaisChat.id, canalId),
      });

      if (!canal || canal.tipo !== 'geral') {
        return reply
          .status(404)
          .send({ message: 'Canal não encontrado ou não é um canal geral' });
      }

      // Verificar se é o único admin
      const membros = await db.query.canaisMembros.findMany({
        where: eq(canaisMembros.canalId, canalId),
      });

      const admins = membros.filter((m) => m.isAdmin);
      const isAdmin = admins.some((a) => a.usuarioId === usuarioId);

      if (isAdmin && admins.length === 1 && membros.length > 1) {
        return reply.status(400).send({
          message: 'Você é o último admin. Promova outro membro antes de sair.',
        });
      }

      // Remover do canal
      await db
        .delete(canaisMembros)
        .where(
          and(
            eq(canaisMembros.canalId, canalId),
            eq(canaisMembros.usuarioId, usuarioId),
          ),
        );

      return reply.send({ message: 'Você saiu do canal com sucesso' });
    },
  );

  // Atualizar configurações do canal
  fastify.patch(
    '/:canalId/settings',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Atualizar configurações do canal',
        description:
          'Atualiza nome e descrição de um canal geral. Apenas administradores do canal podem alterar configurações.',
        ...chatDocs.configurarCanal,
      },
    },
    async (request, reply) => {
      const { canalId } = request.params as { canalId: string };
      const { nome, descricao } = request.body as {
        nome?: string;
        descricao?: string;
      };
      const { sub: usuarioId } = request.user;

      // Verificar se o canal existe
      const canal = await db.query.canaisChat.findFirst({
        where: eq(canaisChat.id, canalId),
      });

      if (!canal || canal.tipo !== 'geral') {
        return reply
          .status(404)
          .send({ message: 'Canal não encontrado ou não é um canal geral' });
      }

      // Verificar se o usuário é admin do canal
      const membro = await db.query.canaisMembros.findFirst({
        where: and(
          eq(canaisMembros.canalId, canalId),
          eq(canaisMembros.usuarioId, usuarioId),
        ),
      });

      if (!membro?.isAdmin) {
        return reply.status(403).send({
          message: 'Apenas admins do canal podem alterar configurações',
        });
      }

      // Atualizar canal
      const updateData: any = {};
      if (nome) updateData.nome = nome;
      if (descricao !== undefined) updateData.descricao = descricao;

      await db
        .update(canaisChat)
        .set(updateData)
        .where(eq(canaisChat.id, canalId));

      return reply.send({ message: 'Configurações atualizadas com sucesso' });
    },
  );

  // Buscar usuários do canal (para menções)
  fastify.get(
    '/:canalId/usuarios',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Buscar usuários do canal para menções',
        description:
          'Retorna lista de usuários do canal filtrada por termo de busca. Útil para autocomplete de menções (@usuario). Exclui o usuário logado da lista.',
        ...chatDocs.buscarUsuarios,
      },
    },
    async (request, reply) => {
      const { canalId } = request.params as { canalId: string };
      const { sub: usuarioId, corretoraId } = request.user;
      const { q } = request.query as { q?: string };

      // Verificar se o canal existe
      const canal = await db.query.canaisChat.findFirst({
        where: and(
          eq(canaisChat.id, canalId),
          eq(canaisChat.corretoraId, corretoraId),
        ),
      });

      if (!canal) {
        return reply.status(404).send({ message: 'Canal não encontrado' } as any);
      }

      let usuariosDoCanal: any[] = [];

      if (canal.tipo === 'direto') {
        // Canal direto: retornar os dois usuários
        const usuarioIds = [canal.usuarioId1, canal.usuarioId2].filter(
          (id): id is string => id !== null,
        );

        usuariosDoCanal = await db.query.usuarios.findMany({
          where: and(
            eq(usuarios.corretoraId, corretoraId),
            inArray(usuarios.id, usuarioIds),
          ),
          columns: {
            id: true,
            nome: true,
            email: true,
            avatarR2Key: true,
          },
        });
      } else {
        // Canal geral: buscar membros
        const membros: any = await db.query.canaisMembros.findMany({
          where: eq(canaisMembros.canalId, canalId),
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

        usuariosDoCanal = membros.map((m: any) => m.usuario);
      }

      // Filtrar por query de busca se fornecida
      if (q && q.trim().length > 0) {
        const searchTerm = q.toLowerCase();
        usuariosDoCanal = usuariosDoCanal.filter(
          (u) =>
            u.nome.toLowerCase().includes(searchTerm) ||
            u.email.toLowerCase().includes(searchTerm),
        );
      }

      // Não incluir o próprio usuário na lista
      usuariosDoCanal = usuariosDoCanal.filter((u) => u.id !== usuarioId);

      // Resolve avatar URLs from R2 keys
      const usuariosComAvatar = await Promise.all(
        usuariosDoCanal.map(async (u: any) => ({
          ...u,
          avatarUrl: await resolveAvatarUrl(u.avatarR2Key),
          avatarR2Key: undefined,
        })),
      );

      return reply.send({
        success: true,
        data: usuariosComAvatar,
      });
    },
  );

  // Marcar mensagens como lidas via REST (fallback durável para o WebSocket)
  fastify.post(
    '/:canalId/mark-read',
    {
      schema: {
        tags: ['Chat'],
        summary: 'Marcar mensagens como lidas',
        description:
          'Marca todas as mensagens do canal até a mensagem especificada como lidas. Endpoint REST como fallback durável para o WebSocket mark_read.',
        ...chatDocs.marcarLido,
      },
    },
    async (request, reply) => {
      const { canalId } = request.params as { canalId: string };
      const { mensagemId } = request.body as { mensagemId: string };
      const { sub: usuarioId } = request.user;

      const chatService = (fastify as any).chatService;
      if (chatService) {
        await chatService.markAsRead(mensagemId, usuarioId);
      } else {
        // Fallback direto no banco se chatService não disponível
        const { mensagensLeituras } = await import(
          '@ecotech/shared/database'
        );

        const mensagem = await db.query.mensagensChat.findFirst({
          where: eq(mensagensChat.id, mensagemId),
        });

        if (mensagem && mensagem.canalId === canalId) {
          const mensagensParaMarcar = await db
            .select({ id: mensagensChat.id })
            .from(mensagensChat)
            .where(
              and(
                eq(mensagensChat.canalId, canalId),
                sql`mensagem_chat.usuario_id != ${usuarioId}`,
                sql`mensagem_chat.created_at <= ${mensagem.createdAt}`,
              ),
            );

          if (mensagensParaMarcar.length > 0) {
            await db
              .insert(mensagensLeituras)
              .values(
                mensagensParaMarcar.map((m) => ({
                  mensagemId: m.id,
                  usuarioId,
                })),
              )
              .onConflictDoNothing();
          }
        }
      }

      return reply.send({ success: true as const });
    },
  );
};

export default chatRoutes;
