import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { ok } from '../../docs/index.js';
import { usuariosDocs } from '../../docs/usuarios/schemas.js';
import bcrypt from 'bcryptjs';
import { db } from '@ecotech/shared/database';
import { usuarios, cargos, equipes, usuarioSubvendedores } from '@ecotech/shared/database';
import { eq, and, ilike, sql, isNull, inArray, lte, gte, or } from 'drizzle-orm';
import { z } from 'zod';
import { authorize, authorizeAny } from '@ecotech/plugins/authorization';
import {
  createUsuarioSchema,
  updateUsuarioSchema,
  listUsuariosQuerySchema,
  atribuirCargoSchema,
  resetarSenhaSchema,
} from '@ecotech/features/usuarios';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} from '@ecotech/shared/utils';
import {
  getPaginationParams,
  createPaginatedResult,
} from '@ecotech/shared/utils';

const usuariosRoutes: FastifyPluginAsyncZod = async function (fastify) {
  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // Create user
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Usuários'],
        summary: 'Criar novo usuário',
        description:
          'Cria um novo usuário na seguradora. Requer permissão "usuarios:criar".',
        ...usuariosDocs.criar,
      },
      preHandler: [authorize(['usuarios:criar'])],
    },
    async (request, reply) => {
      const data = createUsuarioSchema.parse(request.body);
      const { usuarioCorretora } = await import('@ecotech/shared/database');

      const emailLowerCase = data.email.toLowerCase();

      // Check if email already exists globally (usar select direto do drizzle, mais confiável)
      const [usuarioExistente] = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.email, emailLowerCase))
        .limit(1);

      // Se usuário existe globalmente, verificar se já está nesta corretora
      if (usuarioExistente) {
        // Verificar se já está vinculado a esta corretora
        const vinculoExistente = await db.query.usuarioCorretora.findFirst({
          where: and(
            eq(usuarioCorretora.usuarioId, usuarioExistente.id),
            eq(usuarioCorretora.corretoraId, request.corretoraId),
          ),
        });

        if (vinculoExistente) {
          throw new ConflictError('Usuário já está vinculado a esta corretora');
        }

        // Validar cargo se fornecido
        if (data.cargoId) {
          const cargo = await db.query.cargos.findFirst({
            where: and(
              eq(cargos.id, data.cargoId),
              eq(cargos.corretoraId, request.corretoraId),
            ),
          });

          if (!cargo) {
            throw new ValidationError('Cargo não encontrado');
          }

          // Check quota for sellers
          if (cargo.isVendedor) {
            await fastify.validateQuota(request.corretoraId, 'vendedor');
          }
        }

        // Validate quota for users
        await fastify.validateQuota(request.corretoraId, 'usuario');

        // Criar vínculo na tabela usuario_corretora
        await db.insert(usuarioCorretora).values({
          usuarioId: usuarioExistente.id,
          corretoraId: request.corretoraId,
          cargoId: data.cargoId || null,
          ativo: true,
          vinculadoPorId: request.user.sub,
        });

        // Increment quotas
        await fastify.incrementQuota(request.corretoraId, 'usuario');

        if (data.cargoId) {
          const cargo = await db.query.cargos.findFirst({
            where: eq(cargos.id, data.cargoId),
          });
          if (cargo?.isVendedor) {
            await fastify.incrementQuota(request.corretoraId, 'vendedor');
          }
        }

        const { passwordHash: _ph, avatarR2Key: _ak, ...usuarioPublico } = usuarioExistente;
        return reply.status(201).send(ok({ ...usuarioPublico, cargoId: data.cargoId ?? null }));
      }

      // Se usuário não existe, criar novo
      // Validate cargo if provided
      if (data.cargoId) {
        const cargo = await db.query.cargos.findFirst({
          where: and(
            eq(cargos.id, data.cargoId),
            eq(cargos.corretoraId, request.corretoraId),
          ),
        });

        if (!cargo) {
          throw new ValidationError('Cargo não encontrado');
        }

        // Check quota for sellers
        if (cargo.isVendedor) {
          await fastify.validateQuota(request.corretoraId, 'vendedor');
        }
      }

      // Validate quota for users
      await fastify.validateQuota(request.corretoraId, 'usuario');

      // Create user
      const passwordHash = await bcrypt.hash(data.senha, 10);

      const result = await db.transaction(async (tx) => {
        const [usuario] = await tx
          .insert(usuarios)
          .values({
            corretoraId: request.corretoraId,
            corretoraAtivaId: request.corretoraId,
            nome: data.nome,
            email: data.email.toLowerCase(),
            passwordHash,
            telefone: data.telefone,
            cargoId: data.cargoId,
            equipeId: data.equipeId,
            gestorId: data.gestorId,
            ativo: true,
            primeiroAcesso: true,
          })
          .returning();

        // Criar vínculo inicial na tabela usuario_corretora
        await tx.insert(usuarioCorretora).values({
          usuarioId: usuario.id,
          corretoraId: request.corretoraId,
          cargoId: data.cargoId || null,
          ativo: true,
          vinculadoPorId: request.user.sub,
        });

        return usuario;
      });

      // Increment quotas
      await fastify.incrementQuota(request.corretoraId, 'usuario');

      if (data.cargoId) {
        const cargo = await db.query.cargos.findFirst({
          where: eq(cargos.id, data.cargoId),
        });
        if (cargo?.isVendedor) {
          await fastify.incrementQuota(request.corretoraId, 'vendedor');
        }
      }

      const { passwordHash: _ph, avatarR2Key: _ak, ...resultPublico } = result;
      return reply.status(201).send(ok(resultPublico));
    },
  );

  // List users (with ?select=true for lightweight dropdown mode)
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Usuários'],
        summary: 'Listar usuários',
        description:
          'Lista usuários da corretora. Com ?select=true retorna apenas id/nome/email para dropdowns (permissão ampla). Sem esse param, retorna lista completa paginada e requer "usuarios:visualizar".',
        ...usuariosDocs.listar,
      },
      preHandler: [
        authorizeAny([
          'usuarios:visualizar',
          'kanban:acessar',
          'kanban:criar',
          'kanban:editar',
          'vendas:criar_cotacao',
          'vendas:editar_cotacao',
          'importar_renovacoes:acessar',
        ]),
      ],
    },
    async (request) => {
      const query = listUsuariosQuerySchema.parse(request.query);
      const { usuarioCorretora } = await import('@ecotech/shared/database');

      const vinculos = await db.query.usuarioCorretora.findMany({
        where: eq(usuarioCorretora.corretoraId, request.corretoraId),
        columns: { usuarioId: true },
      });

      const usuarioIds = vinculos.map((v) => v.usuarioId);

      if (query.select) {
        if (usuarioIds.length === 0) return ok([]);

        const results = await db.query.usuarios.findMany({
          where: and(
            inArray(usuarios.id, usuarioIds),
            eq(usuarios.ativo, true),
            isNull(usuarios.deletedAt),
          ),
          columns: { id: true, nome: true, email: true, avatarR2Key: true },
          with: { cargo: { columns: { id: true, nomeCargo: true } } },
          orderBy: (u, { asc }) => [asc(u.nome)],
        });

        const { storageClient } = await import('@ecotech/shared/storage');
        const mapped = await Promise.all(
          results.map(async (u) => {
            let avatarUrl: string | null = null;
            if (u.avatarR2Key) {
              try {
                avatarUrl = await storageClient.getSignedDownloadUrl(u.avatarR2Key);
              } catch {
                // fallback to null
              }
            }
            return {
              id: u.id,
              nome: u.nome,
              email: u.email,
              avatarUrl,
              cargo: u.cargo ? { nomeCargo: u.cargo.nomeCargo } : null,
            };
          }),
        );

        return ok(mapped);
      }

      // Full list requires usuarios:visualizar
      if (!request.user.isAdmin && !request.user.permissoes?.includes('usuarios:visualizar')) {
        throw new ForbiddenError('Permissão insuficiente para listar usuários');
      }

      const { offset, limit, page } = getPaginationParams(query);

      if (usuarioIds.length === 0) {
        return { success: true as const, ...createPaginatedResult([], 0, page, limit) };
      }

      const conditions = [
        inArray(usuarios.id, usuarioIds),
        isNull(usuarios.deletedAt),
      ];

      if (query.search) {
        conditions.push(
          sql`(${usuarios.nome} ILIKE ${`%${query.search}%`} OR ${usuarios.email} ILIKE ${`%${query.search}%`})`,
        );
      }

      if (query.cargoId) {
        conditions.push(eq(usuarios.cargoId, query.cargoId));
      }

      if (query.equipeId) {
        conditions.push(eq(usuarios.equipeId, query.equipeId));
      }

      if (query.ativo !== undefined) {
        conditions.push(eq(usuarios.ativo, query.ativo === 'true'));
      }

      const [usersResult, countResult] = await Promise.all([
        db.query.usuarios.findMany({
          where: and(...conditions),
          with: { cargo: true, equipe: true, gestor: { columns: { id: true, nome: true } } },
          limit,
          offset,
          orderBy: (u, { desc }) => [desc(u.createdAt)],
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(usuarios)
          .where(and(...conditions)),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      const { storageClient } = await import('@ecotech/shared/storage');
      const usersWithAvatars = await Promise.all(
        usersResult.map(async (u) => {
          let avatarUrl = null;
          if (u.avatarR2Key) {
            try {
              avatarUrl = await storageClient.getSignedDownloadUrl(u.avatarR2Key);
            } catch (error) {
              console.error(`Erro ao gerar URL do avatar para usuário ${u.id}:`, error);
            }
          }

          return {
            id: u.id,
            nome: u.nome,
            email: u.email,
            telefone: u.telefone,
            cargoId: u.cargoId,
            equipeId: u.equipeId,
            avatarUrl: avatarUrl,
            ativo: u.ativo,
            primeiroAcesso: u.primeiroAcesso,
            ultimoLogin: u.ultimoLogin,
            cargo: u.cargo
              ? { id: u.cargo.id, nome: u.cargo.nomeCargo, cor: u.cargo.cor }
              : null,
            equipe: u.equipe ? { id: u.equipe.id, nome: u.equipe.nome } : null,
            gestor: u.gestor ? { id: u.gestor.id, nome: u.gestor.nome } : null,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
          };
        }),
      );

      return { success: true as const, ...createPaginatedResult(usersWithAvatars, total, page, limit) };
    },
  );

  // Perfil público de um membro (visível por qualquer membro da mesma corretora)
  fastify.get(
    '/:id/public-profile',
    {
      schema: {
        tags: ['Usuários'],
        summary: 'Perfil público de membro',
        description:
          'Retorna o perfil público de um membro da corretora. Acessível por qualquer membro autenticado da mesma corretora.',
        ...usuariosDocs.perfilPublico,
      },
      preHandler: [authorize(['workspace:acessar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { usuarioCorretora } = await import('@ecotech/shared/database');

      // Verificar que o usuário alvo pertence a esta corretora
      const vinculo = await db.query.usuarioCorretora.findFirst({
        where: and(
          eq(usuarioCorretora.usuarioId, id),
          eq(usuarioCorretora.corretoraId, request.corretoraId),
          eq(usuarioCorretora.ativo, true),
        ),
      });

      if (!vinculo) {
        throw new NotFoundError('Membro não encontrado nesta corretora');
      }

      const usuario = await db.query.usuarios.findFirst({
        where: and(eq(usuarios.id, id), isNull(usuarios.deletedAt)),
        with: {
          cargo: true,
          equipe: true,
        },
      });

      if (!usuario) {
        throw new NotFoundError('Usuário');
      }

      const { usuarioBadges } = await import('@ecotech/shared/database');
      const { storageClient } = await import('@ecotech/shared/storage');

      // Buscar badges, avatar e membros da equipe em paralelo
      const [badges, avatarUrl, equipeComMembros] = await Promise.all([
        db.query.usuarioBadges.findMany({
          where: and(
            eq(usuarioBadges.usuarioId, id),
            eq(usuarioBadges.corretoraId, request.corretoraId),
          ),
          with: { badgeTipo: true },
          orderBy: (b, { desc }) => [desc(b.createdAt)],
        }),
        usuario.avatarR2Key
          ? storageClient
              .getSignedDownloadUrl(usuario.avatarR2Key)
              .catch(() => null)
          : Promise.resolve(null),
        // Membros da equipe (só se o usuário tiver equipe)
        usuario.equipeId
          ? (async () => {
              // Buscar a equipe para obter gestorId
              const equipe = await db.query.equipes.findFirst({
                where: (e, { eq }) => eq(e.id, usuario.equipeId!),
              });

              // IDs vinculados a esta corretora
              const vinculosEquipe = await db.query.usuarioCorretora.findMany({
                where: and(
                  eq(usuarioCorretora.corretoraId, request.corretoraId),
                  eq(usuarioCorretora.ativo, true),
                ),
                columns: { usuarioId: true },
              });
              const idsCorretora = vinculosEquipe.map((v) => v.usuarioId);
              if (idsCorretora.length === 0) return { gestorId: equipe?.gestorId ?? null, membros: [] };

              // Membros com equipeId desta equipe
              const membros = await db.query.usuarios.findMany({
                where: and(
                  inArray(usuarios.id, idsCorretora),
                  eq(usuarios.equipeId, usuario.equipeId!),
                  isNull(usuarios.deletedAt),
                  eq(usuarios.ativo, true),
                ),
                with: { cargo: true },
                orderBy: (u, { asc }) => [asc(u.nome)],
              });

              // Se o gestor não tem equipeId definido, buscá-lo separadamente
              const gestorId = equipe?.gestorId ?? null;
              const gestorJaIncluso = !gestorId || membros.some((m) => m.id === gestorId);
              let gestorExtra = null;
              if (!gestorJaIncluso && idsCorretora.includes(gestorId!)) {
                gestorExtra = await db.query.usuarios.findFirst({
                  where: and(
                    eq(usuarios.id, gestorId!),
                    isNull(usuarios.deletedAt),
                    eq(usuarios.ativo, true),
                  ),
                  with: { cargo: true },
                });
              }

              const todos = gestorExtra ? [gestorExtra, ...membros] : membros;

              const membrosComAvatar = await Promise.all(
                todos.map(async (m) => ({
                  id: m.id,
                  nome: m.nome,
                  avatarUrl: m.avatarR2Key
                    ? await storageClient
                        .getSignedDownloadUrl(m.avatarR2Key)
                        .catch(() => null)
                    : null,
                  cargo: m.cargo
                    ? { nome: m.cargo.nomeCargo, cor: m.cargo.cor }
                    : null,
                })),
              );

              return { gestorId, membros: membrosComAvatar };
            })()
          : Promise.resolve({ gestorId: null, membros: [] }),
      ]);

      return ok({
          id: usuario.id,
          nome: usuario.nome,
          avatarUrl,
          cargo: usuario.cargo
            ? {
                id: usuario.cargo.id,
                nome: usuario.cargo.nomeCargo,
                cor: usuario.cargo.cor,
                isAdmin: usuario.cargo.isAdmin,
                isGestor: usuario.cargo.isGestor,
                isVendedor: usuario.cargo.isVendedor,
              }
            : null,
          equipe: usuario.equipe
            ? {
                id: usuario.equipe.id,
                nome: usuario.equipe.nome,
                gestorId: equipeComMembros.gestorId,
                membros: equipeComMembros.membros,
              }
            : null,
          badges: badges.map((b) => ({
            id: b.id,
            createdAt: b.createdAt,
            badgeTipo: b.badgeTipo,
          })),
          membroDesde: vinculo.createdAt,
      });
    },
  );

  // Get user by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Usuários'],
        summary: 'Obter detalhes do usuário',
        description:
          'Retorna informações completas de um usuário específico. Requer permissão "usuarios:visualizar".',
        ...usuariosDocs.buscar,
      },
      preHandler: [authorize(['usuarios:visualizar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const usuario = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, id),
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
        with: {
          cargo: true,
          equipe: true,
          gestor: true,
        },
      });

      if (!usuario) {
        throw new NotFoundError('Usuário');
      }

      // Generate fresh signed URL for avatar if exists
      let avatarUrl = null;
      if (usuario.avatarR2Key) {
        try {
          const { storageClient } = await import('@ecotech/shared/storage');
          avatarUrl = await storageClient.getSignedDownloadUrl(
            usuario.avatarR2Key,
          );
        } catch (error) {
          console.error('Erro ao gerar URL do avatar:', error);
          // Continue without avatar URL if generation fails
        }
      }

      return ok({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          telefone: usuario.telefone,
          avatarUrl: avatarUrl,
          ativo: usuario.ativo,
          primeiroAcesso: usuario.primeiroAcesso,
          ultimoLogin: usuario.ultimoLogin,
          cargo: usuario.cargo
            ? { id: usuario.cargo.id, nome: usuario.cargo.nomeCargo }
            : null,
          equipe: usuario.equipe
            ? { id: usuario.equipe.id, nome: usuario.equipe.nome }
            : null,
          gestor: usuario.gestor
            ? { id: usuario.gestor.id, nome: usuario.gestor.nome }
            : null,
          createdAt: usuario.createdAt,
          updatedAt: usuario.updatedAt,
      } as any);
    },
  );

  // Update user
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Usuários'],
        summary: 'Atualizar dados do usuário',
        description:
          'Modifica informações de um usuário. Requer permissão "usuarios:editar".',
        ...usuariosDocs.atualizar,
      },
      preHandler: [authorize(['usuarios:editar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = updateUsuarioSchema.parse(request.body);

      const usuario = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, id),
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
        with: { cargo: true },
      });

      if (!usuario) {
        throw new NotFoundError('Usuário');
      }

      // Handle email change: check uniqueness and normalize
      if (data.email !== undefined && data.email.toLowerCase() !== usuario.email) {
        const emailNormalizado = data.email.toLowerCase();
        const [emailExistente] = await db
          .select()
          .from(usuarios)
          .where(eq(usuarios.email, emailNormalizado))
          .limit(1);

        if (emailExistente) {
          throw new ConflictError('Este email já está em uso por outro usuário');
        }

        data.email = emailNormalizado;
      }

      // Handle cargo change quota
      if (data.cargoId !== undefined && data.cargoId !== usuario.cargoId) {
        const wasVendedor = usuario.cargo?.isVendedor ?? false;

        let willBeVendedor = false;
        if (data.cargoId) {
          const newCargo = await db.query.cargos.findFirst({
            where: and(
              eq(cargos.id, data.cargoId),
              eq(cargos.corretoraId, request.corretoraId),
            ),
          });

          if (!newCargo) {
            throw new ValidationError('Cargo não encontrado');
          }

          willBeVendedor = newCargo.isVendedor ?? false;

          if (willBeVendedor && !wasVendedor) {
            await fastify.validateQuota(request.corretoraId, 'vendedor');
          }
        }

        // Update quotas after successful update
        if (wasVendedor && !willBeVendedor) {
          await fastify.decrementQuota(request.corretoraId, 'vendedor');
        } else if (!wasVendedor && willBeVendedor) {
          await fastify.incrementQuota(request.corretoraId, 'vendedor');
        }
      }

      const [updated] = await db
        .update(usuarios)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(usuarios.id, id))
        .returning();

      return ok({
          id: updated.id,
          nome: updated.nome,
          email: updated.email,
          telefone: updated.telefone,
          cargoId: updated.cargoId,
          equipeId: updated.equipeId,
          ativo: updated.ativo,
          updatedAt: updated.updatedAt,
      } as any);
    },
  );

  // Delete user (soft delete + anonymization LGPD)
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Usuários'],
        summary: 'Excluir usuário',
        description:
          'Remove e anonimiza um usuário (LGPD Art. 18). Requer permissão "usuarios:excluir".',
        ...usuariosDocs.excluir,
      },
      preHandler: [authorize(['usuarios:excluir'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const usuario = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, id),
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
        with: { cargo: true },
      });

      if (!usuario) {
        throw new NotFoundError('Usuário');
      }

      // Cannot delete yourself
      if (usuario.id === request.user.sub) {
        throw new ValidationError('Você não pode excluir sua própria conta');
      }

      // Remove avatar do R2 se existir
      if (usuario.avatarR2Key) {
        try {
          const { storageClient } = await import('@ecotech/shared/storage');
          await storageClient.delete(usuario.avatarR2Key);
        } catch {
          // Continua mesmo se falhar
        }
      }

      const agora = new Date();

      // Soft delete + anonimização de PII (LGPD Art. 18)
      await db
        .update(usuarios)
        .set({
          nome: `Usuário Removido`,
          email: `removido+${id}@anonimizado.invalid`,
          telefone: null,
          avatarUrl: null,
          avatarR2Key: null,
          deletedAt: agora,
          anonimizadoEm: agora,
          ativo: false,
          updatedAt: agora,
        })
        .where(eq(usuarios.id, id));

      // Decrement quotas
      await fastify.decrementQuota(request.corretoraId, 'usuario');
      if (usuario.cargo?.isVendedor) {
        await fastify.decrementQuota(request.corretoraId, 'vendedor');
      }

      return { success: true as const, message: 'Usuário excluído e dados anonimizados com sucesso' };
    },
  );

  // Assign role to user
  fastify.post(
    '/:id/assign-role',
    {
      schema: {
        tags: ['Usuários'],
        summary: 'Atribuir cargo ao usuário',
        description:
          'Altera o cargo de um usuário. Requer permissão "usuarios:atribuir_cargo".',
        ...usuariosDocs.atribuirCargo,
      },
      preHandler: [authorize(['usuarios:atribuir_cargo'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { cargoId } = atribuirCargoSchema.parse(request.body);

      const usuario = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, id),
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
        with: { cargo: true },
      });

      if (!usuario) {
        throw new NotFoundError('Usuário');
      }

      const cargo = await db.query.cargos.findFirst({
        where: and(
          eq(cargos.id, cargoId),
          eq(cargos.corretoraId, request.corretoraId),
        ),
      });

      if (!cargo) {
        throw new NotFoundError('Cargo');
      }

      const wasVendedor = usuario.cargo?.isVendedor ?? false;
      const willBeVendedor = cargo.isVendedor ?? false;

      if (willBeVendedor && !wasVendedor) {
        await fastify.validateQuota(request.corretoraId, 'vendedor');
      }

      await db
        .update(usuarios)
        .set({
          cargoId,
          updatedAt: new Date(),
        })
        .where(eq(usuarios.id, id));

      if (wasVendedor && !willBeVendedor) {
        await fastify.decrementQuota(request.corretoraId, 'vendedor');
      } else if (!wasVendedor && willBeVendedor) {
        await fastify.incrementQuota(request.corretoraId, 'vendedor');
      }

      return { success: true as const, message: 'Cargo atribuído com sucesso' };
    },
  );

  // Reset user password
  fastify.post(
    '/:id/reset-password',
    {
      schema: {
        tags: ['Usuários'],
        summary: 'Resetar senha do usuário',
        description:
          'Reseta a senha de um usuário e marca como primeiro acesso. Requer permissão "usuarios:editar".',
        ...usuariosDocs.resetarSenha,
      },
      preHandler: [authorize(['usuarios:editar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { novaSenha } = resetarSenhaSchema.parse(request.body);

      const usuario = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, id),
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
      });

      if (!usuario) {
        throw new NotFoundError('Usuário');
      }

      const passwordHash = await bcrypt.hash(novaSenha, 10);

      await db
        .update(usuarios)
        .set({
          passwordHash,
          primeiroAcesso: true,
          updatedAt: new Date(),
        })
        .where(eq(usuarios.id, id));

      return { success: true as const, message: 'Senha resetada com sucesso' };
    },
  );

  // Upload profile picture
  fastify.post(
    '/:id/avatar',
    {
      schema: {
        tags: ['Usuários'],
        summary: 'Upload de foto de perfil',
        description:
          'Faz upload da foto de perfil do usuário. Usuários podem atualizar seu próprio avatar.',
        ...usuariosDocs.uploadAvatar,
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { StorageService } = await import('@ecotech/shared/storage');
      const storageService = new StorageService();

      // Verificar se o usuário está atualizando seu próprio perfil ou tem permissão
      const isOwnProfile = id === request.user.sub;
      if (!isOwnProfile) {
        // Se não é o próprio perfil, precisa ter permissão de editar usuários
        const hasPermission =
          request.user.isAdmin ||
          request.user.permissoes?.includes('usuarios:editar');
        if (!hasPermission) {
          throw new ValidationError(
            'Você só pode atualizar sua própria foto de perfil',
          );
        }
      }

      // Verificar se usuário existe
      const usuario = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, id),
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
      });

      if (!usuario) {
        throw new NotFoundError('Usuário');
      }

      // Get uploaded file
      const data = await request.file();

      if (!data) {
        throw new ValidationError('Nenhum arquivo enviado');
      }

      const buffer = await data.toBuffer();

      // Validate file type (only images)
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        throw new ValidationError(
          'Formato de arquivo inválido. Envie apenas imagens JPG ou PNG',
        );
      }

      // Validate file size (max 2MB for avatars)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (buffer.length > maxSize) {
        throw new ValidationError('Arquivo muito grande. Tamanho máximo: 2MB');
      }

      // Build R2 key for avatar
      const fileExtension = data.filename.split('.').pop() || 'jpg';
      const { v4: uuidv4 } = await import('uuid');
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const r2Key = `${request.corretoraId}/avatars/${id}/${uniqueFileName}`;

      // Upload to R2
      const { storageClient } = await import('@ecotech/shared/storage');
      await storageClient.upload(r2Key, buffer, data.mimetype);

      // Delete old avatar from R2 if exists
      if (usuario.avatarR2Key) {
        try {
          await storageClient.delete(usuario.avatarR2Key);
        } catch (error) {
          console.error('Erro ao deletar avatar antigo:', error);
          // Don't fail the upload if old avatar deletion fails
        }
      }

      // Update user record with R2 key (not the signed URL)
      const [updated] = await db
        .update(usuarios)
        .set({
          avatarR2Key: r2Key,
          updatedAt: new Date(),
        })
        .where(eq(usuarios.id, id))
        .returning();

      // Generate fresh signed URL for response (valid for 1 hour)
      const avatarUrl = await storageClient.getSignedDownloadUrl(r2Key);

      return reply.status(200).send(ok({
          id: updated.id,
          avatarUrl: avatarUrl,
      }));
    },
  );

  // Delete profile picture
  fastify.delete(
    '/:id/avatar',
    {
      schema: {
        tags: ['Usuários'],
        summary: 'Remover foto de perfil',
        description:
          'Remove a foto de perfil do usuário. Usuários podem remover seu próprio avatar.',
        ...usuariosDocs.excluirAvatar,
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verificar se o usuário está atualizando seu próprio perfil ou tem permissão
      const isOwnProfile = id === request.user.sub;
      if (!isOwnProfile) {
        const hasPermission =
          request.user.isAdmin ||
          request.user.permissoes?.includes('usuarios:editar');
        if (!hasPermission) {
          throw new ValidationError(
            'Você só pode remover sua própria foto de perfil',
          );
        }
      }

      // Verificar se usuário existe
      const usuario = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, id),
          eq(usuarios.corretoraId, request.corretoraId),
          isNull(usuarios.deletedAt),
        ),
      });

      if (!usuario) {
        throw new NotFoundError('Usuário');
      }

      // Delete avatar from R2 if exists
      if (usuario.avatarR2Key) {
        try {
          const { storageClient } = await import('@ecotech/shared/storage');
          await storageClient.delete(usuario.avatarR2Key);
        } catch (error) {
          console.error('Erro ao deletar avatar do R2:', error);
          // Continue even if R2 deletion fails
        }
      }

      // Update user record to remove avatar
      await db
        .update(usuarios)
        .set({
          avatarUrl: null,
          avatarR2Key: null,
          updatedAt: new Date(),
        })
        .where(eq(usuarios.id, id));

      return reply.status(200).send({ success: true as const, message: 'Foto de perfil removida com sucesso' });
    },
  );

  // ─── Subvendedores ────────────────────────────────────────────────────────

  const subvendedorBodySchema = z.object({
    subvendedorId: z.string().uuid(),
    percentualNovo: z.number().min(0).max(100).optional().nullable(),
    percentualRenovacao: z.number().min(0).max(100).optional().nullable(),
    dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  });

  const updateSubvendedorSchema = z.object({
    percentualNovo: z.number().min(0).max(100).optional().nullable(),
    percentualRenovacao: z.number().min(0).max(100).optional().nullable(),
    dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    ativo: z.boolean().optional(),
  });

  // GET /users/:id/subvendedores - lista subvendedores ativos de um vendedor
  fastify.get(
    '/:id/subvendedores',
    {
      preHandler: [authorizeAny(['usuarios:visualizar', 'vendas:criar_cotacao', 'vendas:editar_cotacao'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const hoje = new Date().toISOString().slice(0, 10);

      const vinculos = await db.query.usuarioSubvendedores.findMany({
        where: and(
          eq(usuarioSubvendedores.vendedorPrincipalId, id),
          eq(usuarioSubvendedores.ativo, true),
          or(
            isNull(usuarioSubvendedores.dataFim),
            gte(usuarioSubvendedores.dataFim, hoje),
          ),
        ),
        with: {
          subvendedor: {
            columns: { id: true, nome: true, email: true },
          },
        },
        orderBy: (s, { asc }) => [asc(s.dataInicio)],
      });

      return ok(
        vinculos.map((v) => ({
          id: v.id,
          subvendedorId: v.subvendedorId,
          nome: v.subvendedor.nome,
          email: v.subvendedor.email,
          percentualNovo: v.percentualNovo ? Number(v.percentualNovo) : null,
          percentualRenovacao: v.percentualRenovacao ? Number(v.percentualRenovacao) : null,
          dataInicio: v.dataInicio,
          dataFim: v.dataFim,
          ativo: v.ativo,
        })),
      );
    },
  );

  // POST /users/:id/subvendedores - vincula um subvendedor
  fastify.post(
    '/:id/subvendedores',
    {
      preHandler: [authorize(['usuarios:editar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = subvendedorBodySchema.parse(request.body);

      if (id === data.subvendedorId) {
        throw new ValidationError('Um vendedor não pode ser subvendedor de si mesmo');
      }

      const [principal, sub] = await Promise.all([
        db.query.usuarios.findFirst({ where: eq(usuarios.id, id), columns: { id: true } }),
        db.query.usuarios.findFirst({ where: eq(usuarios.id, data.subvendedorId), columns: { id: true } }),
      ]);

      if (!principal) throw new NotFoundError('Vendedor principal não encontrado');
      if (!sub) throw new NotFoundError('Subvendedor não encontrado');

      const [vinculo] = await db
        .insert(usuarioSubvendedores)
        .values({
          vendedorPrincipalId: id,
          subvendedorId: data.subvendedorId,
          percentualNovo: data.percentualNovo != null ? String(data.percentualNovo) : null,
          percentualRenovacao: data.percentualRenovacao != null ? String(data.percentualRenovacao) : null,
          dataInicio: data.dataInicio,
          dataFim: data.dataFim ?? null,
          criadoPorId: request.user.sub,
        })
        .onConflictDoUpdate({
          target: [usuarioSubvendedores.vendedorPrincipalId, usuarioSubvendedores.subvendedorId],
          set: {
            percentualNovo: data.percentualNovo != null ? String(data.percentualNovo) : null,
            percentualRenovacao: data.percentualRenovacao != null ? String(data.percentualRenovacao) : null,
            dataInicio: data.dataInicio,
            dataFim: data.dataFim ?? null,
            ativo: true,
            updatedAt: new Date(),
          },
        })
        .returning();

      return reply.status(201).send(ok(vinculo));
    },
  );

  // PATCH /users/:id/subvendedores/:subId - atualiza vínculo
  fastify.patch(
    '/:id/subvendedores/:subId',
    {
      preHandler: [authorize(['usuarios:editar'])],
    },
    async (request) => {
      const { id, subId } = request.params as { id: string; subId: string };
      const data = updateSubvendedorSchema.parse(request.body);

      const existing = await db.query.usuarioSubvendedores.findFirst({
        where: and(
          eq(usuarioSubvendedores.id, subId),
          eq(usuarioSubvendedores.vendedorPrincipalId, id),
        ),
      });

      if (!existing) throw new NotFoundError('Vínculo não encontrado');

      const [updated] = await db
        .update(usuarioSubvendedores)
        .set({
          ...(data.percentualNovo !== undefined && {
            percentualNovo: data.percentualNovo != null ? String(data.percentualNovo) : null,
          }),
          ...(data.percentualRenovacao !== undefined && {
            percentualRenovacao: data.percentualRenovacao != null ? String(data.percentualRenovacao) : null,
          }),
          ...(data.dataInicio !== undefined && { dataInicio: data.dataInicio }),
          ...(data.dataFim !== undefined && { dataFim: data.dataFim }),
          ...(data.ativo !== undefined && { ativo: data.ativo }),
          updatedAt: new Date(),
        })
        .where(eq(usuarioSubvendedores.id, subId))
        .returning();

      return ok(updated);
    },
  );

  // DELETE /users/:id/subvendedores/:subId - desativa vínculo
  fastify.delete(
    '/:id/subvendedores/:subId',
    {
      preHandler: [authorize(['usuarios:editar'])],
    },
    async (request, reply) => {
      const { id, subId } = request.params as { id: string; subId: string };

      const existing = await db.query.usuarioSubvendedores.findFirst({
        where: and(
          eq(usuarioSubvendedores.id, subId),
          eq(usuarioSubvendedores.vendedorPrincipalId, id),
        ),
      });

      if (!existing) throw new NotFoundError('Vínculo não encontrado');

      await db
        .update(usuarioSubvendedores)
        .set({ ativo: false, updatedAt: new Date() })
        .where(eq(usuarioSubvendedores.id, subId));

      return reply.status(204).send();
    },
  );
};

export default usuariosRoutes;
