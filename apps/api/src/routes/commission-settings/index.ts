import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import {
  corretoraComissaoConfigs,
  cargoComissaoConfigs,
  usuarioComissaoConfigs,
  comissaoConfigHistorico,
  comissaoLancamentos,
  documentosVenda,
  usuarios,
  cargos,
  produtos,
} from '@ecotech/shared/database';
import {
  eq,
  and,
  isNull,
  or,
  sql,
  gte,
  lte,
  desc,
  sum,
  count,
  inArray,
} from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';
import { NotFoundError, ValidationError } from '@ecotech/shared/utils';

const tipoNegocioSchema = z.enum(['NOVO', 'RENOVACAO']).optional().nullable();

const globalConfigSchema = z.object({
  tipoSeguro: z.string().min(1).max(100),
  tipoNegocio: tipoNegocioSchema,
  percentualParticipacao: z.number().min(0).max(100),
});

const usuarioConfigSchema = z.object({
  usuarioId: z.string().uuid(),
  tipoSeguro: z.string().min(1).max(100),
  tipoNegocio: tipoNegocioSchema,
  percentualParticipacao: z.number().min(0).max(100),
});

const updateUsuarioConfigSchema = z.object({
  percentualParticipacao: z.number().min(0).max(100),
});

const cargoConfigSchema = z.object({
  cargoId: z.string().uuid(),
  tipoSeguro: z.string().min(1).max(100),
  tipoNegocio: tipoNegocioSchema,
  percentualParticipacao: z.number().min(0).max(100),
});

const updateCargoConfigSchema = z.object({
  percentualParticipacao: z.number().min(0).max(100),
});

// ─── Helper: registrar histórico de config ────────────────────────────────────

async function recordHistory({
  corretoraId,
  usuarioId,
  usuarioNome,
  escopo,
  registroId,
  tipoOperacao,
  dadosAntes,
  dadosDepois,
}: {
  corretoraId: string;
  usuarioId?: string;
  usuarioNome?: string;
  escopo: 'global' | 'cargo' | 'vendedor';
  registroId?: string;
  tipoOperacao: 'CRIACAO' | 'ATUALIZACAO' | 'EXCLUSAO';
  dadosAntes?: object | null;
  dadosDepois?: object | null;
}) {
  await db.insert(comissaoConfigHistorico).values({
    corretoraId,
    escopo,
    registroId: registroId ?? null,
    tipoOperacao,
    dadosAntes: dadosAntes ?? null,
    dadosDepois: dadosDepois ?? null,
    usuarioId: usuarioId ?? null,
    usuarioNome: usuarioNome ?? null,
  });
}

const configuracaoComissoesRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ─── Global (corretora level) ───────────────────────────────────────────────

  fastify.get(
    '/global',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Listar configurações globais de comissão',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      return db
        .select()
        .from(corretoraComissaoConfigs)
        .where(eq(corretoraComissaoConfigs.corretoraId, request.corretoraId))
        .orderBy(corretoraComissaoConfigs.tipoSeguro);
    },
  );

  fastify.put(
    '/global',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Criar ou atualizar configuração global por tipo de seguro',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      const data = globalConfigSchema.parse(request.body);
      const tipoSeguroNormalizado = data.tipoSeguro.toUpperCase();

      const existente = await db.query.corretoraComissaoConfigs.findFirst({
        where: and(
          eq(corretoraComissaoConfigs.corretoraId, request.corretoraId),
          eq(corretoraComissaoConfigs.tipoSeguro, tipoSeguroNormalizado),
          data.tipoNegocio
            ? eq(corretoraComissaoConfigs.tipoNegocio, data.tipoNegocio)
            : isNull(corretoraComissaoConfigs.tipoNegocio),
        ),
      });

      const [config] = await db
        .insert(corretoraComissaoConfigs)
        .values({
          corretoraId: request.corretoraId,
          tipoSeguro: tipoSeguroNormalizado,
          tipoNegocio: data.tipoNegocio ?? null,
          percentualParticipacao: String(data.percentualParticipacao),
        })
        .onConflictDoUpdate({
          target: [
            corretoraComissaoConfigs.corretoraId,
            corretoraComissaoConfigs.tipoSeguro,
            corretoraComissaoConfigs.tipoNegocio,
          ],
          set: {
            percentualParticipacao: String(data.percentualParticipacao),
            updatedAt: new Date(),
          },
        })
        .returning();

      await recordHistory({
        corretoraId: request.corretoraId,
        usuarioId: request.user?.sub,
        usuarioNome: request.user?.nome,
        escopo: 'global',
        registroId: config.id,
        tipoOperacao: existente ? 'ATUALIZACAO' : 'CRIACAO',
        dadosAntes: existente ?? null,
        dadosDepois: config,
      });

      return config;
    },
  );

  fastify.delete(
    '/global/:id',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Remover configuração global por id',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const [deleted] = await db
        .delete(corretoraComissaoConfigs)
        .where(
          and(
            eq(corretoraComissaoConfigs.corretoraId, request.corretoraId),
            eq(corretoraComissaoConfigs.id, id),
          ),
        )
        .returning();

      if (!deleted) throw new NotFoundError('Configuração não encontrada');

      await recordHistory({
        corretoraId: request.corretoraId,
        usuarioId: request.user?.sub,
        usuarioNome: request.user?.nome,
        escopo: 'global',
        registroId: id,
        tipoOperacao: 'EXCLUSAO',
        dadosAntes: deleted,
        dadosDepois: null,
      });

      return reply.status(204).send();
    },
  );

  // ─── Por vendedor (override) ────────────────────────────────────────────────

  fastify.get(
    '/sellers',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Listar configurações específicas por vendedor',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      return db
        .select({
          id: usuarioComissaoConfigs.id,
          usuarioId: usuarioComissaoConfigs.usuarioId,
          nomeUsuario: usuarios.nome,
          tipoSeguro: usuarioComissaoConfigs.tipoSeguro,
          tipoNegocio: usuarioComissaoConfigs.tipoNegocio,
          percentualParticipacao: usuarioComissaoConfigs.percentualParticipacao,
          createdAt: usuarioComissaoConfigs.createdAt,
          updatedAt: usuarioComissaoConfigs.updatedAt,
        })
        .from(usuarioComissaoConfigs)
        .innerJoin(
          usuarios,
          eq(usuarioComissaoConfigs.usuarioId, usuarios.id),
        )
        .where(
          eq(usuarioComissaoConfigs.corretoraId, request.corretoraId),
        )
        .orderBy(usuarios.nome, usuarioComissaoConfigs.tipoSeguro);
    },
  );

  fastify.post(
    '/sellers',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Criar configuração específica para um vendedor',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request, reply) => {
      const data = usuarioConfigSchema.parse(request.body);

      const usuarioExiste = await db.query.usuarios.findFirst({
        where: and(
          eq(usuarios.id, data.usuarioId),
          eq(usuarios.corretoraId, request.corretoraId),
        ),
      });
      if (!usuarioExiste) throw new NotFoundError('Usuário não encontrado');

      const tipoSeguroNormalizado = data.tipoSeguro.toUpperCase();
      const tipoNegocio = data.tipoNegocio ?? null;

      const jaExiste = await db.query.usuarioComissaoConfigs.findFirst({
        where: and(
          eq(usuarioComissaoConfigs.corretoraId, request.corretoraId),
          eq(usuarioComissaoConfigs.usuarioId, data.usuarioId),
          eq(usuarioComissaoConfigs.tipoSeguro, tipoSeguroNormalizado),
          tipoNegocio
            ? eq(usuarioComissaoConfigs.tipoNegocio, tipoNegocio)
            : isNull(usuarioComissaoConfigs.tipoNegocio),
        ),
      });
      if (jaExiste) {
        throw new ValidationError(
          `Já existe uma configuração para este vendedor e tipo de seguro. Use PUT /vendedores/${jaExiste.id} para atualizar.`,
        );
      }

      const [config] = await db
        .insert(usuarioComissaoConfigs)
        .values({
          corretoraId: request.corretoraId,
          usuarioId: data.usuarioId,
          tipoSeguro: tipoSeguroNormalizado,
          tipoNegocio,
          percentualParticipacao: String(data.percentualParticipacao),
        })
        .returning();

      await recordHistory({
        corretoraId: request.corretoraId,
        usuarioId: request.user?.sub,
        usuarioNome: request.user?.nome,
        escopo: 'vendedor',
        registroId: config.id,
        tipoOperacao: 'CRIACAO',
        dadosAntes: null,
        dadosDepois: { ...config, nomeVendedor: usuarioExiste.nome },
      });

      return reply.status(201).send(config);
    },
  );

  fastify.put(
    '/sellers/:id',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Atualizar configuração específica de um vendedor',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = updateUsuarioConfigSchema.parse(request.body);

      const antes = await db.query.usuarioComissaoConfigs.findFirst({
        where: and(
          eq(usuarioComissaoConfigs.id, id),
          eq(usuarioComissaoConfigs.corretoraId, request.corretoraId),
        ),
      });

      const [updated] = await db
        .update(usuarioComissaoConfigs)
        .set({
          percentualParticipacao: String(data.percentualParticipacao),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(usuarioComissaoConfigs.id, id),
            eq(usuarioComissaoConfigs.corretoraId, request.corretoraId),
          ),
        )
        .returning();

      if (!updated) throw new NotFoundError('Configuração não encontrada');

      await recordHistory({
        corretoraId: request.corretoraId,
        usuarioId: request.user?.sub,
        usuarioNome: request.user?.nome,
        escopo: 'vendedor',
        registroId: id,
        tipoOperacao: 'ATUALIZACAO',
        dadosAntes: antes ?? null,
        dadosDepois: updated,
      });

      return updated;
    },
  );

  fastify.delete(
    '/sellers/:id',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Remover configuração específica de um vendedor',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const [deleted] = await db
        .delete(usuarioComissaoConfigs)
        .where(
          and(
            eq(usuarioComissaoConfigs.id, id),
            eq(usuarioComissaoConfigs.corretoraId, request.corretoraId),
          ),
        )
        .returning();

      if (!deleted) throw new NotFoundError('Configuração não encontrada');

      await recordHistory({
        corretoraId: request.corretoraId,
        usuarioId: request.user?.sub,
        usuarioNome: request.user?.nome,
        escopo: 'vendedor',
        registroId: id,
        tipoOperacao: 'EXCLUSAO',
        dadosAntes: deleted,
        dadosDepois: null,
      });

      return reply.status(204).send();
    },
  );

  // ─── Por vendedor - lote ────────────────────────────────────────────────────

  fastify.post(
    '/sellers/batch',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Criar configuração para múltiplos vendedores de uma vez',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request, reply) => {
      const schema = z.object({
        usuarioIds: z.array(z.string().uuid()).min(1).max(50),
        tipoSeguro: z.string().min(1).max(100),
        tipoNegocio: tipoNegocioSchema,
        percentualParticipacao: z.number().min(0).max(100),
      });

      const data = schema.parse(request.body);
      const tipoSeguroNormalizado = data.tipoSeguro.toUpperCase();
      const tipoNegocio = data.tipoNegocio ?? null;

      const vendedoresValidos = await db
        .select({ id: usuarios.id, nome: usuarios.nome })
        .from(usuarios)
        .where(
          and(
            eq(usuarios.corretoraId, request.corretoraId),
            inArray(usuarios.id, data.usuarioIds),
          ),
        );

      if (vendedoresValidos.length === 0) {
        throw new ValidationError('Nenhum vendedor válido encontrado');
      }

      const results = { criados: 0, atualizados: 0, erros: [] as string[] };

      for (const vendedor of vendedoresValidos) {
        const existente = await db.query.usuarioComissaoConfigs.findFirst({
          where: and(
            eq(usuarioComissaoConfigs.corretoraId, request.corretoraId),
            eq(usuarioComissaoConfigs.usuarioId, vendedor.id),
            eq(usuarioComissaoConfigs.tipoSeguro, tipoSeguroNormalizado),
            tipoNegocio
              ? eq(usuarioComissaoConfigs.tipoNegocio, tipoNegocio)
              : isNull(usuarioComissaoConfigs.tipoNegocio),
          ),
        });

        if (existente) {
          await db
            .update(usuarioComissaoConfigs)
            .set({ percentualParticipacao: String(data.percentualParticipacao), updatedAt: new Date() })
            .where(eq(usuarioComissaoConfigs.id, existente.id));

          await recordHistory({
            corretoraId: request.corretoraId,
            usuarioId: request.user?.sub,
            usuarioNome: request.user?.nome,
            escopo: 'vendedor',
            registroId: existente.id,
            tipoOperacao: 'ATUALIZACAO',
            dadosAntes: existente,
            dadosDepois: { ...existente, percentualParticipacao: String(data.percentualParticipacao) },
          });

          results.atualizados++;
        } else {
          const [novo] = await db
            .insert(usuarioComissaoConfigs)
            .values({
              corretoraId: request.corretoraId,
              usuarioId: vendedor.id,
              tipoSeguro: tipoSeguroNormalizado,
              tipoNegocio,
              percentualParticipacao: String(data.percentualParticipacao),
            })
            .returning();

          await recordHistory({
            corretoraId: request.corretoraId,
            usuarioId: request.user?.sub,
            usuarioNome: request.user?.nome,
            escopo: 'vendedor',
            registroId: novo.id,
            tipoOperacao: 'CRIACAO',
            dadosAntes: null,
            dadosDepois: { ...novo, nomeVendedor: vendedor.nome },
          });

          results.criados++;
        }
      }

      return reply.status(200).send(results);
    },
  );

  // ─── Por cargo ─────────────────────────────────────────────────────────────

  fastify.get(
    '/roles',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Listar configurações de comissão por cargo',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      return db
        .select({
          id: cargoComissaoConfigs.id,
          cargoId: cargoComissaoConfigs.cargoId,
          nomeCargo: cargos.nomeCargo,
          tipoSeguro: cargoComissaoConfigs.tipoSeguro,
          tipoNegocio: cargoComissaoConfigs.tipoNegocio,
          percentualParticipacao: cargoComissaoConfigs.percentualParticipacao,
          createdAt: cargoComissaoConfigs.createdAt,
          updatedAt: cargoComissaoConfigs.updatedAt,
        })
        .from(cargoComissaoConfigs)
        .innerJoin(cargos, eq(cargoComissaoConfigs.cargoId, cargos.id))
        .where(eq(cargoComissaoConfigs.corretoraId, request.corretoraId))
        .orderBy(cargos.nomeCargo, cargoComissaoConfigs.tipoSeguro);
    },
  );

  fastify.post(
    '/roles',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Criar configuração de comissão para um cargo',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request, reply) => {
      const data = cargoConfigSchema.parse(request.body);

      const cargoExiste = await db.query.cargos.findFirst({
        where: and(
          eq(cargos.id, data.cargoId),
          eq(cargos.corretoraId, request.corretoraId),
        ),
      });
      if (!cargoExiste) throw new NotFoundError('Cargo não encontrado');

      const tipoNormalizado = data.tipoSeguro.toUpperCase();
      const tipoNegocio = data.tipoNegocio ?? null;

      const existente = await db.query.cargoComissaoConfigs.findFirst({
        where: and(
          eq(cargoComissaoConfigs.corretoraId, request.corretoraId),
          eq(cargoComissaoConfigs.cargoId, data.cargoId),
          eq(cargoComissaoConfigs.tipoSeguro, tipoNormalizado),
          tipoNegocio
            ? eq(cargoComissaoConfigs.tipoNegocio, tipoNegocio)
            : isNull(cargoComissaoConfigs.tipoNegocio),
        ),
      });

      const [config] = await db
        .insert(cargoComissaoConfigs)
        .values({
          corretoraId: request.corretoraId,
          cargoId: data.cargoId,
          tipoSeguro: tipoNormalizado,
          tipoNegocio,
          percentualParticipacao: String(data.percentualParticipacao),
        })
        .onConflictDoUpdate({
          target: [
            cargoComissaoConfigs.corretoraId,
            cargoComissaoConfigs.cargoId,
            cargoComissaoConfigs.tipoSeguro,
            cargoComissaoConfigs.tipoNegocio,
          ],
          set: {
            percentualParticipacao: String(data.percentualParticipacao),
            updatedAt: new Date(),
          },
        })
        .returning();

      await recordHistory({
        corretoraId: request.corretoraId,
        usuarioId: request.user?.sub,
        usuarioNome: request.user?.nome,
        escopo: 'cargo',
        registroId: config.id,
        tipoOperacao: existente ? 'ATUALIZACAO' : 'CRIACAO',
        dadosAntes: existente ?? null,
        dadosDepois: { ...config, nomeCargo: cargoExiste.nomeCargo },
      });

      return reply.status(201).send(config);
    },
  );

  fastify.put(
    '/roles/:id',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Atualizar configuração de comissão de um cargo',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = updateCargoConfigSchema.parse(request.body);

      const antes = await db.query.cargoComissaoConfigs.findFirst({
        where: and(
          eq(cargoComissaoConfigs.id, id),
          eq(cargoComissaoConfigs.corretoraId, request.corretoraId),
        ),
      });

      const [updated] = await db
        .update(cargoComissaoConfigs)
        .set({
          percentualParticipacao: String(data.percentualParticipacao),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(cargoComissaoConfigs.id, id),
            eq(cargoComissaoConfigs.corretoraId, request.corretoraId),
          ),
        )
        .returning();

      if (!updated) throw new NotFoundError('Configuração não encontrada');

      await recordHistory({
        corretoraId: request.corretoraId,
        usuarioId: request.user?.sub,
        usuarioNome: request.user?.nome,
        escopo: 'cargo',
        registroId: id,
        tipoOperacao: 'ATUALIZACAO',
        dadosAntes: antes ?? null,
        dadosDepois: updated,
      });

      return updated;
    },
  );

  fastify.delete(
    '/roles/:id',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Remover configuração de comissão de um cargo',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const [deleted] = await db
        .delete(cargoComissaoConfigs)
        .where(
          and(
            eq(cargoComissaoConfigs.id, id),
            eq(cargoComissaoConfigs.corretoraId, request.corretoraId),
          ),
        )
        .returning();

      if (!deleted) throw new NotFoundError('Configuração não encontrada');

      await recordHistory({
        corretoraId: request.corretoraId,
        usuarioId: request.user?.sub,
        usuarioNome: request.user?.nome,
        escopo: 'cargo',
        registroId: id,
        tipoOperacao: 'EXCLUSAO',
        dadosAntes: deleted,
        dadosDepois: null,
      });

      return reply.status(204).send();
    },
  );

  // ─── Resolução ──────────────────────────────────────────────────────────────

  fastify.get(
    '/resolve',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Resolver percentual de participação para vendedor + tipo_seguro',
      },
    },
    async (request) => {
      const { usuarioId, tipoSeguro, tipoNegocio } = request.query as {
        usuarioId?: string;
        tipoSeguro: string;
        tipoNegocio?: 'NOVO' | 'RENOVACAO';
      };

      if (!tipoSeguro) throw new ValidationError('tipoSeguro é obrigatório');

      const tipoNormalizado = tipoSeguro.toUpperCase();

      const findComissao = async (
        table: typeof usuarioComissaoConfigs | typeof cargoComissaoConfigs | typeof corretoraComissaoConfigs,
        extraConditions: any[],
      ) => {
        const queryKey =
          table === usuarioComissaoConfigs ? 'usuarioComissaoConfigs'
          : table === cargoComissaoConfigs ? 'cargoComissaoConfigs'
          : 'corretoraComissaoConfigs';
        if (tipoNegocio) {
          const especifico = await (db.query[queryKey] as any).findFirst({
            where: and(...extraConditions, eq((table as any).tipoNegocio, tipoNegocio)),
          });
          if (especifico) return especifico;
        }
        return (db.query[queryKey] as any).findFirst({
          where: and(...extraConditions, isNull((table as any).tipoNegocio)),
        });
      };

      if (usuarioId) {
        const baseUsuario = [
          eq(usuarioComissaoConfigs.corretoraId, request.corretoraId),
          eq(usuarioComissaoConfigs.usuarioId, usuarioId),
          eq(usuarioComissaoConfigs.tipoSeguro, tipoNormalizado),
        ];
        const configUsuario = await findComissao(usuarioComissaoConfigs, baseUsuario);
        if (configUsuario) {
          return { percentualParticipacao: configUsuario.percentualParticipacao, fonte: 'usuario', sistemaAtivo: true };
        }

        const usuario = await db.query.usuarios.findFirst({
          where: eq(usuarios.id, usuarioId),
          columns: { cargoId: true },
        });
        if (usuario?.cargoId) {
          const baseCargo = [
            eq(cargoComissaoConfigs.corretoraId, request.corretoraId),
            eq(cargoComissaoConfigs.cargoId, usuario.cargoId),
            eq(cargoComissaoConfigs.tipoSeguro, tipoNormalizado),
          ];
          const configCargo = await findComissao(cargoComissaoConfigs, baseCargo);
          if (configCargo) {
            return { percentualParticipacao: configCargo.percentualParticipacao, fonte: 'cargo', sistemaAtivo: true };
          }
        }
      }

      const baseGlobal = [
        eq(corretoraComissaoConfigs.corretoraId, request.corretoraId),
        eq(corretoraComissaoConfigs.tipoSeguro, tipoNormalizado),
      ];
      const configGlobal = await findComissao(corretoraComissaoConfigs, baseGlobal);
      if (configGlobal) {
        return { percentualParticipacao: configGlobal.percentualParticipacao, fonte: 'global', sistemaAtivo: true };
      }

      // Nenhum match. Distinguir "corretora adotou o sistema mas faltou regra"
      // de "corretora ainda não usa o sistema" — o front só mostra o aviso no
      // primeiro caso, pra não poluir UI em corretoras em modo legado.
      const [temGlobal, temCargo, temUsuario] = await Promise.all([
        db.query.corretoraComissaoConfigs.findFirst({
          where: eq(corretoraComissaoConfigs.corretoraId, request.corretoraId),
          columns: { id: true },
        }),
        db.query.cargoComissaoConfigs.findFirst({
          where: eq(cargoComissaoConfigs.corretoraId, request.corretoraId),
          columns: { id: true },
        }),
        db.query.usuarioComissaoConfigs.findFirst({
          where: eq(usuarioComissaoConfigs.corretoraId, request.corretoraId),
          columns: { id: true },
        }),
      ]);
      const sistemaAtivo = !!(temGlobal || temCargo || temUsuario);

      return { percentualParticipacao: null, fonte: null, sistemaAtivo };
    },
  );

  // ─── Extrato de comissões ───────────────────────────────────────────────────

  fastify.get(
    '/statement',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Listar documentos de venda com dados de comissão',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      const { vendedorId, statusPagamento, dataInicio, dataFim, page, limit } = request.query as {
        vendedorId?: string;
        statusPagamento?: string;
        dataInicio?: string;
        dataFim?: string;
        page?: string;
        limit?: string;
      };

      const pageNum = Math.max(1, parseInt(page ?? '1'));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '20')));
      const offset = (pageNum - 1) * limitNum;

      const conditions = [
        eq(documentosVenda.corretoraId, request.corretoraId),
        sql`${documentosVenda.valorComissao} IS NOT NULL`,
        sql`${documentosVenda.deletedAt} IS NULL`,
      ];

      if (vendedorId) {
        conditions.push(
          or(
            eq(documentosVenda.vendedorId, vendedorId),
            eq(documentosVenda.vendedorSecundarioId, vendedorId),
            eq(documentosVenda.vendedorTerceiroId, vendedorId),
          ) as any,
        );
      }

      if (statusPagamento) {
        conditions.push(eq(documentosVenda.statusPagamentoComissao, statusPagamento as any));
      }

      if (dataInicio) {
        conditions.push(gte(documentosVenda.createdAt, new Date(dataInicio)));
      }

      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        conditions.push(lte(documentosVenda.createdAt, fim));
      }

      const whereClause = and(...conditions);

      const [rows, [{ total }]] = await Promise.all([
        db
          .select({
            id: documentosVenda.id,
            numeroDocumento: documentosVenda.numeroDocumento,
            status: documentosVenda.status,
            statusPagamentoComissao: documentosVenda.statusPagamentoComissao,
            dataPagamentoComissao: documentosVenda.dataPagamentoComissao,
            observacaoPagamentoComissao: documentosVenda.observacaoPagamentoComissao,
            premioLiquido: documentosVenda.premioLiquido,
            percentualComissao: documentosVenda.percentualComissao,
            valorComissao: documentosVenda.valorComissao,
            valorComissaoCorretora: documentosVenda.valorComissaoCorretora,
            valorComissaoVendedor: documentosVenda.valorComissaoVendedor,
            negocioCorretora: documentosVenda.negocioCorretora,
            vigenciaInicio: documentosVenda.vigenciaInicio,
            vigenciaFim: documentosVenda.vigenciaFim,
            createdAt: documentosVenda.createdAt,
            nomeVendedor: usuarios.nome,
            nomeProduto: produtos.nomeProduto,
          })
          .from(documentosVenda)
          .innerJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
          .innerJoin(produtos, eq(documentosVenda.produtoId, produtos.id))
          .where(whereClause)
          .orderBy(desc(documentosVenda.createdAt))
          .limit(limitNum)
          .offset(offset),
        db
          .select({ total: count() })
          .from(documentosVenda)
          .where(whereClause),
      ]);

      return {
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(total),
          pages: Math.ceil(Number(total) / limitNum),
        },
      };
    },
  );

  fastify.patch(
    '/statement/:id/payment',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Atualizar status de pagamento de comissão de um documento',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const schema = z.object({
        statusPagamentoComissao: z.enum(['PENDENTE', 'PAGO', 'CANCELADO']),
        dataPagamentoComissao: z.string().datetime().optional().nullable(),
        observacaoPagamentoComissao: z.string().max(500).optional().nullable(),
      });

      const data = schema.parse(request.body);

      const [updated] = await db
        .update(documentosVenda)
        .set({
          statusPagamentoComissao: data.statusPagamentoComissao,
          dataPagamentoComissao: data.dataPagamentoComissao ? new Date(data.dataPagamentoComissao) : null,
          observacaoPagamentoComissao: data.observacaoPagamentoComissao ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(documentosVenda.id, id),
            eq(documentosVenda.corretoraId, request.corretoraId),
          ),
        )
        .returning({
          id: documentosVenda.id,
          statusPagamentoComissao: documentosVenda.statusPagamentoComissao,
          dataPagamentoComissao: documentosVenda.dataPagamentoComissao,
          observacaoPagamentoComissao: documentosVenda.observacaoPagamentoComissao,
        });

      if (!updated) throw new NotFoundError('Documento não encontrado');

      return updated;
    },
  );

  // ─── Relatório agregado ─────────────────────────────────────────────────────

  fastify.get(
    '/report',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Relatório agregado de comissões por período',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      const { dataInicio, dataFim } = request.query as {
        dataInicio?: string;
        dataFim?: string;
      };

      const conditions = [
        eq(documentosVenda.corretoraId, request.corretoraId),
        sql`${documentosVenda.valorComissao} IS NOT NULL`,
        sql`${documentosVenda.deletedAt} IS NULL`,
      ];

      if (dataInicio) {
        conditions.push(gte(documentosVenda.createdAt, new Date(dataInicio)));
      }
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        conditions.push(lte(documentosVenda.createdAt, fim));
      }

      const whereClause = and(...conditions);

      // Totais globais
      const [totais] = await db
        .select({
          totalComissoes: sum(documentosVenda.valorComissao),
          totalPago: sum(
            sql`CASE WHEN ${documentosVenda.statusPagamentoComissao} = 'PAGO' THEN ${documentosVenda.valorComissao} ELSE 0 END`,
          ),
          totalPendente: sum(
            sql`CASE WHEN ${documentosVenda.statusPagamentoComissao} = 'PENDENTE' THEN ${documentosVenda.valorComissao} ELSE 0 END`,
          ),
          totalCancelado: sum(
            sql`CASE WHEN ${documentosVenda.statusPagamentoComissao} = 'CANCELADO' THEN ${documentosVenda.valorComissao} ELSE 0 END`,
          ),
          qtdDocumentos: count(),
          qtdPago: count(
            sql`CASE WHEN ${documentosVenda.statusPagamentoComissao} = 'PAGO' THEN 1 END`,
          ),
          qtdPendente: count(
            sql`CASE WHEN ${documentosVenda.statusPagamentoComissao} = 'PENDENTE' THEN 1 END`,
          ),
        })
        .from(documentosVenda)
        .where(whereClause);

      // Por vendedor (top 10)
      const porVendedor = await db
        .select({
          vendedorId: documentosVenda.vendedorId,
          nomeVendedor: usuarios.nome,
          totalComissao: sum(documentosVenda.valorComissaoVendedor),
          qtdDocumentos: count(),
        })
        .from(documentosVenda)
        .innerJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
        .where(whereClause)
        .groupBy(documentosVenda.vendedorId, usuarios.nome)
        .orderBy(desc(sum(documentosVenda.valorComissaoVendedor)))
        .limit(10);

      // Por produto/tipo de seguro
      const porProduto = await db
        .select({
          produtoId: documentosVenda.produtoId,
          nomeProduto: produtos.nomeProduto,
          totalComissao: sum(documentosVenda.valorComissao),
          qtdDocumentos: count(),
        })
        .from(documentosVenda)
        .innerJoin(produtos, eq(documentosVenda.produtoId, produtos.id))
        .where(whereClause)
        .groupBy(documentosVenda.produtoId, produtos.nomeProduto)
        .orderBy(desc(sum(documentosVenda.valorComissao)))
        .limit(10);

      return {
        totais: {
          totalComissoes: totais.totalComissoes ?? '0',
          totalPago: totais.totalPago ?? '0',
          totalPendente: totais.totalPendente ?? '0',
          totalCancelado: totais.totalCancelado ?? '0',
          qtdDocumentos: Number(totais.qtdDocumentos),
          qtdPago: Number(totais.qtdPago),
          qtdPendente: Number(totais.qtdPendente),
        },
        porVendedor,
        porProduto,
      };
    },
  );

  // ─── Histórico de configurações ─────────────────────────────────────────────

  fastify.get(
    '/config-history',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Histórico de alterações nas configurações de comissão',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      const { escopo, page, limit } = request.query as {
        escopo?: string;
        page?: string;
        limit?: string;
      };

      const pageNum = Math.max(1, parseInt(page ?? '1'));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '30')));
      const offset = (pageNum - 1) * limitNum;

      const conditions = [
        eq(comissaoConfigHistorico.corretoraId, request.corretoraId),
      ];

      if (escopo) {
        conditions.push(eq(comissaoConfigHistorico.escopo, escopo));
      }

      const whereClause = and(...conditions);

      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(comissaoConfigHistorico)
          .where(whereClause)
          .orderBy(desc(comissaoConfigHistorico.createdAt))
          .limit(limitNum)
          .offset(offset),
        db
          .select({ total: count() })
          .from(comissaoConfigHistorico)
          .where(whereClause),
      ]);

      return {
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(total),
          pages: Math.ceil(Number(total) / limitNum),
        },
      };
    },
  );

  // ─── Lançamentos de comissão ────────────────────────────────────────────────

  fastify.get(
    '/entries',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Listar lançamentos de comissão com filtros',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      const {
        documentoVendaId,
        vendedorId,
        statusPagamentoVendedor,
        statusRecebimentoSeguradora,
        tipo,
        dataInicio,
        dataFim,
        page,
        limit,
      } = request.query as {
        documentoVendaId?: string;
        vendedorId?: string;
        statusPagamentoVendedor?: string;
        statusRecebimentoSeguradora?: string;
        tipo?: string;
        dataInicio?: string;
        dataFim?: string;
        page?: string;
        limit?: string;
      };

      const pageNum = Math.max(1, parseInt(page ?? '1'));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '30')));
      const offset = (pageNum - 1) * limitNum;

      const conditions: any[] = [
        eq(comissaoLancamentos.corretoraId, request.corretoraId),
      ];

      if (documentoVendaId) {
        conditions.push(eq(comissaoLancamentos.documentoVendaId, documentoVendaId));
      }
      if (statusPagamentoVendedor) {
        conditions.push(eq(comissaoLancamentos.statusPagamentoVendedor, statusPagamentoVendedor as any));
      }
      if (statusRecebimentoSeguradora) {
        conditions.push(eq(comissaoLancamentos.statusRecebimentoSeguradora, statusRecebimentoSeguradora as any));
      }
      if (tipo) {
        conditions.push(eq(comissaoLancamentos.tipo, tipo as any));
      }
      if (dataInicio) {
        conditions.push(gte(comissaoLancamentos.dataVencimento, dataInicio));
      }
      if (dataFim) {
        conditions.push(lte(comissaoLancamentos.dataVencimento, dataFim));
      }

      const whereClause = and(...conditions);

      if (vendedorId) {
        conditions.push(eq(documentosVenda.vendedorId, vendedorId));
      }

      const [rows, [{ total }]] = await Promise.all([
        db
          .select({
            lancamento: comissaoLancamentos,
            vendedorNome: usuarios.nome,
            vendedorEmail: usuarios.email,
          })
          .from(comissaoLancamentos)
          .innerJoin(documentosVenda, eq(comissaoLancamentos.documentoVendaId, documentosVenda.id))
          .leftJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
          .where(whereClause)
          .orderBy(desc(comissaoLancamentos.dataVencimento))
          .limit(limitNum)
          .offset(offset),
        db
          .select({ total: count() })
          .from(comissaoLancamentos)
          .innerJoin(documentosVenda, eq(comissaoLancamentos.documentoVendaId, documentosVenda.id))
          .where(whereClause),
      ]);

      return {
        data: rows.map((r) => ({ ...r.lancamento, vendedorNome: r.vendedorNome, vendedorEmail: r.vendedorEmail })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(total),
          pages: Math.ceil(Number(total) / limitNum),
        },
      };
    },
  );

  fastify.patch(
    '/entries/:id/receipt',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Atualizar status de recebimento da seguradora em um lançamento',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = z
        .object({
          statusRecebimentoSeguradora: z.enum(['AGUARDANDO', 'RECEBIDO', 'NAO_APLICAVEL']),
          dataRecebimentoSeguradora: z.string().nullable().optional(),
          observacaoRecebimento: z.string().max(500).nullable().optional(),
        })
        .parse(request.body);

      const lancamento = await db.query.comissaoLancamentos.findFirst({
        where: and(
          eq(comissaoLancamentos.id, id),
          eq(comissaoLancamentos.corretoraId, request.corretoraId),
        ),
      });

      if (!lancamento) throw new NotFoundError('Lançamento não encontrado');

      const [updated] = await db
        .update(comissaoLancamentos)
        .set({
          statusRecebimentoSeguradora: data.statusRecebimentoSeguradora,
          dataRecebimentoSeguradora: data.dataRecebimentoSeguradora ?? null,
          observacaoRecebimento: data.observacaoRecebimento ?? null,
          updatedAt: new Date(),
        })
        .where(eq(comissaoLancamentos.id, id))
        .returning();

      return updated;
    },
  );

  fastify.patch(
    '/entries/:id/payment',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Atualizar status de pagamento ao vendedor em um lançamento',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = z
        .object({
          statusPagamentoVendedor: z.enum(['PENDENTE', 'PAGO', 'CANCELADO']),
          dataPagamentoVendedor: z.string().nullable().optional(),
          observacaoPagamento: z.string().max(500).nullable().optional(),
        })
        .parse(request.body);

      const lancamento = await db.query.comissaoLancamentos.findFirst({
        where: and(
          eq(comissaoLancamentos.id, id),
          eq(comissaoLancamentos.corretoraId, request.corretoraId),
        ),
      });

      if (!lancamento) throw new NotFoundError('Lançamento não encontrado');

      const [updated] = await db
        .update(comissaoLancamentos)
        .set({
          statusPagamentoVendedor: data.statusPagamentoVendedor,
          dataPagamentoVendedor: data.dataPagamentoVendedor ? new Date(data.dataPagamentoVendedor) : null,
          observacaoPagamento: data.observacaoPagamento ?? null,
          pago_por_id: data.statusPagamentoVendedor === 'PAGO' ? (request.user?.sub ?? null) : null,
          updatedAt: new Date(),
        })
        .where(eq(comissaoLancamentos.id, id))
        .returning();

      return updated;
    },
  );

  fastify.post(
    '/entries/pay-batch',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Marcar múltiplos lançamentos como pagos ao vendedor',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      const { ids, dataPagamento, observacao } = z
        .object({
          ids: z.array(z.string().uuid()).min(1).max(200),
          dataPagamento: z.string().optional(),
          observacao: z.string().max(500).optional(),
        })
        .parse(request.body);

      // Verify all IDs belong to this corretora
      const existentes = await db
        .select({ id: comissaoLancamentos.id })
        .from(comissaoLancamentos)
        .where(and(
          inArray(comissaoLancamentos.id, ids),
          eq(comissaoLancamentos.corretoraId, request.corretoraId),
          eq(comissaoLancamentos.statusPagamentoVendedor, 'PENDENTE'),
        ));

      const idsValidos = existentes.map((e) => e.id);
      if (idsValidos.length === 0) {
        throw new ValidationError('Nenhum lançamento pendente encontrado para os IDs fornecidos');
      }

      await db
        .update(comissaoLancamentos)
        .set({
          statusPagamentoVendedor: 'PAGO',
          dataPagamentoVendedor: dataPagamento ? new Date(dataPagamento) : new Date(),
          observacaoPagamento: observacao ?? null,
          pago_por_id: request.user?.sub ?? null,
          updatedAt: new Date(),
        })
        .where(inArray(comissaoLancamentos.id, idsValidos));

      return { pagos: idsValidos.length, ignorados: ids.length - idsValidos.length };
    },
  );

  fastify.get(
    '/entries/projection',
    {
      schema: {
        tags: ['Configurações de Comissões'],
        summary: 'Projeção de recebimentos e pagamentos futuros agrupados por mês',
      },
      preHandler: [authorize(['configuracoes:gerenciar_comissoes'])],
    },
    async (request) => {
      const { meses } = request.query as { meses?: string };
      const qtdMeses = Math.min(24, Math.max(1, parseInt(meses ?? '6')));

      const hoje = new Date();
      const dataFimProjecao = new Date(hoje);
      dataFimProjecao.setMonth(dataFimProjecao.getMonth() + qtdMeses);

      const dataFimStr = dataFimProjecao.toISOString().substring(0, 10);

      const rows = await db
        .select({
          mes: sql<string>`to_char(${comissaoLancamentos.dataVencimento}, 'YYYY-MM')`,
          totalComissao: sum(comissaoLancamentos.valorComissaoTotal),
          totalVendedor: sum(comissaoLancamentos.valorComissaoVendedor),
          totalCorretora: sum(comissaoLancamentos.valorComissaoCorretora),
          qtdParcelas: count(),
          qtdPendentes: sql<number>`count(*) filter (where ${comissaoLancamentos.statusPagamentoVendedor} = 'PENDENTE')`,
          qtdPagos: sql<number>`count(*) filter (where ${comissaoLancamentos.statusPagamentoVendedor} = 'PAGO')`,
          qtdNaoRecebido: sql<number>`count(*) filter (where ${comissaoLancamentos.statusRecebimentoSeguradora} = 'AGUARDANDO')`,
        })
        .from(comissaoLancamentos)
        .where(and(
          eq(comissaoLancamentos.corretoraId, request.corretoraId),
          gte(comissaoLancamentos.dataVencimento, hoje.toISOString().substring(0, 10)),
          lte(comissaoLancamentos.dataVencimento, dataFimStr),
        ))
        .groupBy(sql`to_char(${comissaoLancamentos.dataVencimento}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${comissaoLancamentos.dataVencimento}, 'YYYY-MM')`);

      return rows;
    },
  );
};

export default configuracaoComissoesRoutes;
