import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db, campanhas, documentosVenda, clientes, usuarios } from '@ecotech/shared/database';
import { eq, and, isNull, isNotNull, lte, gte, desc } from 'drizzle-orm';
import { authorize, authorizeAny, requireModule } from '@ecotech/plugins/authorization';
import { NotFoundError } from '@ecotech/shared/utils';
import { sql } from 'drizzle-orm';
import { campanhasDocs } from '../../docs/gamificacao/schemas.js';
import { ok } from '../../docs/index.js';

const criarCampanhaSchema = z.object({
  titulo: z.string().min(1).max(255),
  descricao: z.string().min(1),
  seguradoraParceiraId: z.string().uuid().optional(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ativa: z.boolean().default(true),
});

const atualizarCampanhaSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descricao: z.string().min(1).optional(),
  seguradoraParceiraId: z.string().uuid().nullable().optional(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ativa: z.boolean().optional(),
});

const campanhasRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', requireModule('gamificacao'));

  // Listar campanhas ativas (para todos os usuários da corretora)
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Gamificação'],
        summary: 'Listar campanhas',
        ...campanhasDocs.listar,
        querystring: z.object({ todas: z.coerce.boolean().optional() }),
      },
      preHandler: [authorizeAny(['workspace:acessar', 'gamificacao:gerenciar'])],
    },
    async (request) => {
      const { todas } = request.query as { todas?: boolean };
      const hoje = new Date().toISOString().split('T')[0];

      const conditions: any[] = [
        eq(campanhas.corretoraId, request.corretoraId),
        isNull(campanhas.deletedAt),
      ];

      // Por padrão, retorna apenas campanhas ativas no período atual
      if (!todas && !request.user.isAdmin && !request.user.isGestor) {
        conditions.push(eq(campanhas.ativa, true));
        conditions.push(lte(campanhas.dataInicio, hoje));
        conditions.push(gte(campanhas.dataFim, hoje));
      }

      const items = await db.query.campanhas.findMany({
        where: and(...conditions),
        orderBy: [desc(campanhas.dataFim)],
        with: {
          seguradoraParceira: {
            columns: { id: true, razaoSocial: true, nomeFantasia: true },
          },
          criadaPor: { columns: { id: true, nome: true } },
        },
      });

      return ok(items);
    },
  );

  // Criar campanha
  fastify.post(
    '/',
    {
      schema: { tags: ['Gamificação'], summary: 'Criar campanha', ...campanhasDocs.criar },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request, reply) => {
      const data = criarCampanhaSchema.parse(request.body);

      const [campanha] = await db
        .insert(campanhas)
        .values({
          corretoraId: request.corretoraId,
          criadaPorId: request.user.sub,
          titulo: data.titulo,
          descricao: data.descricao,
          seguradoraParceiraId: data.seguradoraParceiraId ?? null,
          dataInicio: data.dataInicio,
          dataFim: data.dataFim,
          ativa: data.ativa,
        })
        .returning();

      return reply.status(201).send(ok(campanha));
    },
  );

  // Atualizar campanha
  fastify.patch(
    '/:id',
    {
      schema: { tags: ['Gamificação'], summary: 'Atualizar campanha', ...campanhasDocs.atualizar },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = atualizarCampanhaSchema.parse(request.body);

      const campanha = await db.query.campanhas.findFirst({
        where: and(
          eq(campanhas.id, id),
          eq(campanhas.corretoraId, request.corretoraId),
          isNull(campanhas.deletedAt),
        ),
      });

      if (!campanha) throw new NotFoundError('Campanha não encontrada');

      const [updated] = await db
        .update(campanhas)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(campanhas.id, id))
        .returning();

      return ok(updated);
    },
  );

  // Auditoria de campanha: vendas aprovadas da seguradora parceira no período
  fastify.get(
    '/:id/audit',
    {
      schema: { tags: ['Gamificação'], summary: 'Auditoria de campanha', ...campanhasDocs.auditoria },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const campanha = await db.query.campanhas.findFirst({
        where: and(eq(campanhas.id, id), eq(campanhas.corretoraId, request.corretoraId), isNull(campanhas.deletedAt)),
      });

      if (!campanha) {
        const { NotFoundError } = await import('@ecotech/shared/utils');
        throw new NotFoundError('Campanha não encontrada');
      }

      const conditions = and(
        eq(documentosVenda.corretoraId, request.corretoraId),
        isNull(documentosVenda.deletedAt),
        isNotNull(documentosVenda.dataAprovacaoCadastro),
        gte(documentosVenda.dataAprovacaoCadastro, new Date(campanha.dataInicio)),
        lte(documentosVenda.dataAprovacaoCadastro, new Date(campanha.dataFim + 'T23:59:59Z')),
        ...(campanha.seguradoraParceiraId
          ? [eq(documentosVenda.seguradoraParceiraId, campanha.seguradoraParceiraId)]
          : []),
      );

      const registros = await db
        .select({
          id: documentosVenda.id,
          numero: documentosVenda.numeroDocumento,
          status: documentosVenda.status,
          premioLiquido: documentosVenda.premioLiquido,
          data: documentosVenda.dataAprovacaoCadastro,
          clienteNome: clientes.nome,
          vendedorNome: usuarios.nome,
        })
        .from(documentosVenda)
        .leftJoin(clientes, eq(documentosVenda.clienteId, clientes.id))
        .leftJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
        .where(conditions)
        .orderBy(desc(documentosVenda.dataAprovacaoCadastro));

      return ok(registros);
    },
  );

  // Deletar campanha (soft delete)
  fastify.delete(
    '/:id',
    {
      schema: { tags: ['Gamificação'], summary: 'Remover campanha', ...campanhasDocs.excluir },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const campanha = await db.query.campanhas.findFirst({
        where: and(
          eq(campanhas.id, id),
          eq(campanhas.corretoraId, request.corretoraId),
          isNull(campanhas.deletedAt),
        ),
      });

      if (!campanha) throw new NotFoundError('Campanha não encontrada');

      await db
        .update(campanhas)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(campanhas.id, id));

      return reply.status(204).send({});
    },
  );
};

export default campanhasRoutes;
