import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { ok } from '../../docs/index.js';
import { cargosDocs } from '../../docs/cargos/schemas.js';
import { authorize, authorizeAny, requireAdmin } from '@ecotech/plugins/authorization';
import { invalidateAuthCacheByCargoId } from '@ecotech/plugins/auth';
import {
  createCargoSchema,
  updateCargoSchema,
  atribuirPermissoesSchema,
  cargosService,
} from '@ecotech/features/cargos';
import { db } from '@ecotech/shared/database';
import { usuarios, cargoPermissoes, permissoesGlobais, cargos, auditoriaPermissoes } from '@ecotech/shared/database';
import { eq, and, isNull, desc } from 'drizzle-orm';

const cargosRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // Debug endpoint — kept in route because it accesses request.user token data
  fastify.get(
    '/debug/my-permissions',
    {
      schema: { tags: ['Cargos e Permissões'], summary: 'Debug: Minhas permissões', ...cargosDocs.minhasPermissoes },
      preHandler: [requireAdmin()],
    },
    async (request) => {
      const usuario = await db.query.usuarios.findFirst({
        where: eq(usuarios.id, request.user.sub),
        with: { cargo: true } as any,
      });

      let permissoesCargo: string[] = [];
      if (usuario!.cargoId) {
        const perms = await db
          .select({ nomePermissao: permissoesGlobais.nomePermissao })
          .from(cargoPermissoes)
          .innerJoin(
            permissoesGlobais,
            eq(cargoPermissoes.permissaoGlobalId, permissoesGlobais.id),
          )
          .where(eq(cargoPermissoes.cargoId, usuario!.cargoId!));
        permissoesCargo = perms.map((p) => p.nomePermissao);
      }

      return ok({
          usuario: { id: usuario!.id, nome: usuario!.nome, email: usuario!.email, cargoId: usuario!.cargoId },
          cargo: (usuario as any).cargo
            ? { id: (usuario as any).cargo.id, nomeCargo: (usuario as any).cargo.nomeCargo, isAdmin: (usuario as any).cargo.isAdmin, isGestor: (usuario as any).cargo.isGestor, isVendedor: (usuario as any).cargo.isVendedor }
            : null,
          permissoesNoToken: request.user.permissoes,
          permissoesDoBanco: permissoesCargo,
          totalPermissoesToken: request.user.permissoes.length,
          totalPermissoesBanco: permissoesCargo.length,
      });
    },
  );

  fastify.get(
    '/permissions/available',
    {
      schema: { tags: ['Cargos e Permissões'], summary: 'Listar permissões disponíveis', ...cargosDocs.permissoesDisponiveis },
      preHandler: [authorizeAny(['cargos:criar', 'cargos:editar', 'cargos:atribuir_permissoes'])],
    },
    async () => {
      const grouped = await cargosService.getPermissoesDisponiveis();
      return ok(grouped);
    },
  );

  fastify.post(
    '/',
    {
      schema: { tags: ['Cargos e Permissões'], summary: 'Criar novo cargo', ...cargosDocs.criar },
      preHandler: [authorize(['cargos:criar'])],
    },
    async (request, reply) => {
      const data = createCargoSchema.parse(request.body);
      const cargo = await cargosService.criar(request.corretoraId, data);
      return reply.status(201).send(ok({
          id: cargo.id,
          nomeCargo: cargo.nomeCargo,
          descricao: cargo.descricao,
          cor: cargo.cor,
          isAdmin: cargo.isAdmin,
          isGestor: cargo.isGestor,
          isVendedor: cargo.isVendedor,
          createdAt: cargo.createdAt,
      }));
    },
  );

  fastify.get(
    '/with-permission',
    {
      schema: {
        tags: ['Cargos e Permissões'],
        summary: 'Listar cargos que possuem uma permissão',
        description: 'Usado na página /sem-permissao para sugerir qual cargo o admin deve atribuir.',
        querystring: z.object({ permissao: z.string() }),
      },
    },
    async (request) => {
      const { permissao } = request.query as { permissao: string };
      const cargosComPermissao = await db
        .select({ id: cargos.id, nomeCargo: cargos.nomeCargo, cor: cargos.cor })
        .from(cargos)
        .innerJoin(cargoPermissoes, eq(cargoPermissoes.cargoId, cargos.id))
        .innerJoin(permissoesGlobais, eq(permissoesGlobais.id, cargoPermissoes.permissaoGlobalId))
        .where(
          and(
            eq(cargos.corretoraId, request.corretoraId),
            eq(permissoesGlobais.nomePermissao, permissao),
            isNull(cargos.deletedAt),
          ),
        );
      return ok(cargosComPermissao);
    },
  );

  fastify.get(
    '/',
    { schema: { tags: ['Cargos e Permissões'], summary: 'Listar cargos', ...cargosDocs.listar } },
    async (request) => {
      const list = await cargosService.listar(request.corretoraId);
      return ok(list.map((c) => ({
          id: c.id,
          nomeCargo: c.nomeCargo,
          descricao: c.descricao,
          cor: c.cor,
          isAdmin: c.isAdmin,
          isGestor: c.isGestor,
          isVendedor: c.isVendedor,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
      })));
    },
  );

  fastify.get(
    '/:id',
    { schema: { tags: ['Cargos e Permissões'], summary: 'Obter detalhes do cargo', ...cargosDocs.buscar } },
    async (request) => {
      const { id } = request.params as { id: string };
      const cargo = await cargosService.buscar(request.corretoraId, id);
      return ok(cargo);
    },
  );

  fastify.patch(
    '/:id/cor',
    {
      schema: {
        tags: ['Cargos e Permissões'],
        summary: 'Atualizar cor do cargo',
        ...cargosDocs.atualizarCor,
      },
      preHandler: [authorize(['cargos:editar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { cor } = request.body as { cor: string };
      const updated = await cargosService.atualizarCor(request.corretoraId, id, cor);
      return { ...ok({ id: updated.id, nomeCargo: updated.nomeCargo, cor: updated.cor }), message: 'Cor do cargo atualizada com sucesso' };
    },
  );

  fastify.patch(
    '/:id',
    {
      schema: { tags: ['Cargos e Permissões'], summary: 'Atualizar cargo', ...cargosDocs.atualizar },
      preHandler: [authorize(['cargos:editar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = updateCargoSchema.parse(request.body);
      const updated = await cargosService.atualizar(request.corretoraId, id, data);
      return ok({
          id: updated.id,
          nomeCargo: updated.nomeCargo,
          descricao: updated.descricao,
          cor: updated.cor,
          isGestor: updated.isGestor,
          isVendedor: updated.isVendedor,
          updatedAt: updated.updatedAt,
      });
    },
  );

  fastify.delete(
    '/:id',
    {
      schema: { tags: ['Cargos e Permissões'], summary: 'Excluir cargo', ...cargosDocs.excluir },
      preHandler: [authorize(['cargos:excluir'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      await cargosService.excluir(request.corretoraId, id);
      return { success: true as const, message: 'Cargo excluído com sucesso' };
    },
  );

  fastify.post(
    '/:id/permissions',
    {
      schema: { tags: ['Cargos e Permissões'], summary: 'Atribuir permissões ao cargo', ...cargosDocs.atribuirPermissoes },
      preHandler: [authorize(['cargos:atribuir_permissoes'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { permissaoIds } = atribuirPermissoesSchema.parse(request.body);
      await cargosService.atribuirPermissoes(request.corretoraId, id, permissaoIds);
      await invalidateAuthCacheByCargoId(id);
      return { success: true as const, message: 'Permissões atualizadas com sucesso', requiresTokenRefresh: true };
    },
  );

  fastify.delete(
    '/:id/permissions/:permissionId',
    {
      schema: {
        tags: ['Cargos e Permissões'],
        summary: 'Remover permissão do cargo',
        ...cargosDocs.removerPermissao,
        params: z.object({ id: z.string().uuid(), permissionId: z.string().uuid() }),
      },
      preHandler: [authorize(['cargos:atribuir_permissoes'])],
    },
    async (request) => {
      const { id, permissionId } = request.params;
      await cargosService.removerPermissao(request.corretoraId, id, permissionId);
      await invalidateAuthCacheByCargoId(id);
      return { success: true as const, message: 'Permissão removida com sucesso', requiresTokenRefresh: true };
    },
  );

  fastify.get(
    '/:id/audit',
    {
      schema: {
        tags: ['Cargos e Permissões'],
        summary: 'Histórico de auditoria do cargo',
        params: z.object({ id: z.string().uuid() }),
        querystring: z.object({ limit: z.coerce.number().min(1).max(200).default(50) }),
      },
      preHandler: [authorizeAny(['cargos:editar', 'cargos:atribuir_permissoes'])],
    },
    async (request) => {
      const { id } = request.params;
      const { limit } = request.query as { limit: number };
      const rows = await db.query.auditoriaPermissoes.findMany({
        where: and(eq(auditoriaPermissoes.cargoId, id), eq(auditoriaPermissoes.corretoraId, request.corretoraId)),
        with: {
          permissao: { columns: { id: true, nomePermissao: true, descricao: true } },
          usuario: { columns: { id: true, nome: true } },
        } as any,
        orderBy: desc(auditoriaPermissoes.createdAt),
        limit,
      });
      return ok(rows);
    },
  );

  fastify.get(
    '/templates',
    { schema: { tags: ['Cargos e Permissões'], summary: 'Listar templates de cargos', ...cargosDocs.listarTemplates } },
    async () => {
      const templates = await cargosService.listTemplates();
      return ok(templates);
    },
  );

  fastify.get(
    '/templates/:templateId',
    { schema: { tags: ['Cargos e Permissões'], summary: 'Obter detalhes do template' } },
    async (request) => {
      const { templateId } = request.params as { templateId: string };
      const template = await cargosService.getTemplate(templateId);
      return ok(template);
    },
  );

  fastify.post(
    '/from-template/:templateId',
    {
      schema: {
        tags: ['Cargos e Permissões'],
        summary: 'Criar cargo a partir de template',
        ...cargosDocs.criarDeTemplate,
      },
      preHandler: [authorize(['cargos:criar'])],
    },
    async (request, reply) => {
      const { templateId } = request.params as { templateId: string };
      const { nomeCargo, descricao, cor } = request.body as {
        nomeCargo: string;
        descricao?: string;
        cor?: string;
      };
      const { cargo, totalPermissoes } = await cargosService.criarDeTemplate(
        request.corretoraId,
        templateId,
        nomeCargo,
        descricao,
        cor,
      );
      return reply.status(201).send({
        ...ok({
          id: cargo.id,
          nomeCargo: cargo.nomeCargo,
          descricao: cargo.descricao,
          cor: cargo.cor,
          isGestor: cargo.isGestor,
          isVendedor: cargo.isVendedor,
          totalPermissoes,
        }),
        message: 'Cargo criado com sucesso a partir do template',
      });
    },
  );

  fastify.post(
    '/:id/duplicate',
    {
      schema: {
        tags: ['Cargos e Permissões'],
        summary: 'Duplicar cargo',
        ...cargosDocs.duplicar,
      },
      preHandler: [authorize(['cargos:criar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { nomeCargo, descricao, cor } = request.body as {
        nomeCargo: string;
        descricao?: string;
        cor?: string;
      };
      const { cargo, totalPermissoes } = await cargosService.duplicar(
        request.corretoraId,
        id,
        nomeCargo,
        descricao,
        cor,
      );
      return reply.status(201).send({
        ...ok({
          id: cargo.id,
          nomeCargo: cargo.nomeCargo,
          descricao: cargo.descricao,
          cor: cargo.cor,
          isGestor: cargo.isGestor,
          isVendedor: cargo.isVendedor,
          totalPermissoes,
        }),
        message: 'Cargo duplicado com sucesso',
      });
    },
  );
};

export default cargosRoutes;
