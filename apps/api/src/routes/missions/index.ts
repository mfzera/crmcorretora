import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db, missoes, usuarios, cotacoes, clientes, renovacoesComerciais, documentosVenda } from '@ecotech/shared/database';
import { eq, and, isNull, isNotNull, inArray, gte, lte, desc } from 'drizzle-orm';
import { authorize, authorizeAny, requireModule } from '@ecotech/plugins/authorization';
import { NotFoundError } from '@ecotech/shared/utils';
import {
  calculateProgress,
  resolveUserIds,
} from '../../utils/progresso-metrica.js';
import { missoesDocs } from '../../docs/gamificacao/schemas.js';
import { ok } from '../../docs/index.js';

const criarMissaoSchema = z.object({
  titulo: z.string().min(1).max(255),
  descricao: z.string().optional(),
  tipoMetrica: z.enum(['novos_seguros', 'renovacoes', 'cotacoes', 'valor_premio', 'taxa_renovacao', 'premio_renovacao']),
  valorAlvo: z.number().positive(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  equipeId: z.string().uuid().optional(),
  usuarioId: z.string().uuid().optional(),
  badgeTipoId: z.string().uuid().optional(),
  badgeObservacao: z.string().optional(),
});

const atualizarMissaoSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descricao: z.string().nullable().optional(),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['CANCELADA', 'EM_ANDAMENTO']).optional(),
});

async function enrichMission(missao: any, corretoraId: string) {
  const usuarioIds = await resolveUserIds(corretoraId, missao.equipeId, missao.usuarioId);
  const atual = await calculateProgress(corretoraId, missao.tipoMetrica, missao.dataInicio, missao.prazo, usuarioIds);
  const alvo = parseFloat(missao.valorAlvo);
  return {
    ...missao,
    progressoAtual: atual,
    percentual: alvo > 0 ? Math.min(100, Math.round((atual / alvo) * 100)) : 0,
  };
}

const missoesRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', requireModule('gamificacao'));

  // Listar missões
  fastify.get(
    '/',
    {
      schema: { tags: ['Gamificação'], summary: 'Listar missões', ...missoesDocs.listar },
      preHandler: [authorizeAny(['workspace:acessar', 'gamificacao:gerenciar'])],
    },
    async (request) => {
      const user = request.user;
      const hoje = new Date().toISOString().split('T')[0];

      const todasMissoes = await db.query.missoes.findMany({
        where: and(
          eq(missoes.corretoraId, request.corretoraId),
          isNull(missoes.deletedAt),
        ),
        orderBy: [desc(missoes.createdAt)],
        with: {
          badgeTipo: true,
          criadaPor: { columns: { id: true, nome: true } },
          usuario: { columns: { id: true, nome: true } },
          equipe: { columns: { id: true, nome: true } },
        },
      });

      // Expirar missões vencidas automaticamente
      for (const missao of todasMissoes) {
        if (
          (missao.status === 'PENDENTE' || missao.status === 'EM_ANDAMENTO') &&
          missao.prazo < hoje
        ) {
          await db
            .update(missoes)
            .set({ status: 'EXPIRADA', updatedAt: new Date() })
            .where(eq(missoes.id, missao.id));
          missao.status = 'EXPIRADA';
        }
      }

      // Vendedores veem apenas missões atribuídas a eles ou à equipe deles
      let filtradas = todasMissoes;
      if (!user.isAdmin && !user.isGestor) {
        const dbUser = await db.query.usuarios.findFirst({
          where: eq(usuarios.id, user.sub),
          columns: { equipeId: true },
        });
        const equipeId = dbUser?.equipeId;

        filtradas = todasMissoes.filter((m) => {
          if (m.usuarioId === user.sub) return true;
          if (equipeId && m.equipeId === equipeId) return true;
          return false;
        });
      }

      const enriquecidas = await Promise.all(
        filtradas.map((m) => enrichMission(m, request.corretoraId)),
      );

      return ok(enriquecidas as any);
    },
  );

  // Criar missão
  fastify.post(
    '/',
    {
      schema: { tags: ['Gamificação'], summary: 'Criar missão', ...missoesDocs.criar },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request, reply) => {
      const data = criarMissaoSchema.parse(request.body);

      const [missao] = await db
        .insert(missoes)
        .values({
          corretoraId: request.corretoraId,
          criadaPorId: request.user.sub,
          titulo: data.titulo,
          descricao: data.descricao ?? null,
          tipoMetrica: data.tipoMetrica,
          valorAlvo: String(data.valorAlvo),
          dataInicio: data.dataInicio,
          prazo: data.prazo,
          equipeId: data.equipeId ?? null,
          usuarioId: data.usuarioId ?? null,
          badgeTipoId: data.badgeTipoId ?? null,
          badgeObservacao: data.badgeObservacao ?? null,
        })
        .returning();

      return reply.status(201).send(ok(missao as any));
    },
  );

  // Buscar missão por ID
  fastify.get(
    '/:id',
    {
      schema: { tags: ['Gamificação'], summary: 'Buscar missão', ...missoesDocs.buscar },
      preHandler: [authorizeAny(['workspace:acessar', 'gamificacao:gerenciar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const missao = await db.query.missoes.findFirst({
        where: and(
          eq(missoes.id, id),
          eq(missoes.corretoraId, request.corretoraId),
          isNull(missoes.deletedAt),
        ),
        with: { badgeTipo: true },
      });

      if (!missao) throw new NotFoundError('Missão não encontrada');

      const enriquecida = await enrichMission(missao, request.corretoraId);
      return ok(enriquecida as any);
    },
  );

  // Atualizar missão
  fastify.patch(
    '/:id',
    {
      schema: { tags: ['Gamificação'], summary: 'Atualizar missão', ...missoesDocs.atualizar },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = atualizarMissaoSchema.parse(request.body);

      const missao = await db.query.missoes.findFirst({
        where: and(
          eq(missoes.id, id),
          eq(missoes.corretoraId, request.corretoraId),
          isNull(missoes.deletedAt),
        ),
      });

      if (!missao) throw new NotFoundError('Missão não encontrada');

      const [updated] = await db
        .update(missoes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(missoes.id, id))
        .returning();

      return ok(updated as any);
    },
  );

  // Auditoria de missão
  fastify.get(
    '/:id/audit',
    {
      schema: { tags: ['Gamificação'], summary: 'Auditoria de missão', ...missoesDocs.auditoria },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const missao = await db.query.missoes.findFirst({
        where: and(eq(missoes.id, id), eq(missoes.corretoraId, request.corretoraId), isNull(missoes.deletedAt)),
      });

      if (!missao) {
        const { NotFoundError } = await import('@ecotech/shared/utils');
        throw new NotFoundError('Missão não encontrada');
      }

      const usuarioIds = await resolveUserIds(request.corretoraId, missao.equipeId, missao.usuarioId);
      if (usuarioIds.length === 0) return ok([] as any);

      const dataFim = missao.prazo;
      let registros: any[] = [];

      if (missao.tipoMetrica === 'novos_seguros') {
        registros = await db
          .select({
            id: documentosVenda.id,
            numero: documentosVenda.numeroDocumento,
            status: documentosVenda.status,
            premioLiquido: documentosVenda.premioLiquido,
            numeroCotacao: cotacoes.numeroCotacao,
            itemDescricao: cotacoes.itemDescricao,
            data: documentosVenda.dataAprovacaoCadastro,
            clienteNome: clientes.nome,
            vendedorNome: usuarios.nome,
          })
          .from(documentosVenda)
          .innerJoin(cotacoes, and(eq(cotacoes.documentoVendaId, documentosVenda.id), eq(cotacoes.situacao, 'NOVO'), isNull(cotacoes.deletedAt)))
          .leftJoin(clientes, eq(documentosVenda.clienteId, clientes.id))
          .leftJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
          .where(and(
            eq(documentosVenda.corretoraId, request.corretoraId),
            inArray(documentosVenda.vendedorId, usuarioIds),
            isNull(documentosVenda.deletedAt),
            isNotNull(documentosVenda.dataAprovacaoCadastro),
            gte(documentosVenda.dataAprovacaoCadastro, new Date(missao.dataInicio)),
            lte(documentosVenda.dataAprovacaoCadastro, new Date(dataFim + 'T23:59:59Z')),
          ))
          .orderBy(desc(documentosVenda.dataAprovacaoCadastro));
      } else if (missao.tipoMetrica === 'cotacoes') {
        registros = await db
          .select({ id: cotacoes.id, numero: cotacoes.numeroCotacao, situacao: cotacoes.situacao, itemDescricao: cotacoes.itemDescricao, data: cotacoes.createdAt, clienteNome: clientes.nome, vendedorNome: usuarios.nome })
          .from(cotacoes)
          .leftJoin(clientes, eq(cotacoes.clienteId, clientes.id))
          .leftJoin(usuarios, eq(cotacoes.vendedorId, usuarios.id))
          .where(and(eq(cotacoes.corretoraId, request.corretoraId), inArray(cotacoes.vendedorId, usuarioIds), isNull(cotacoes.deletedAt), gte(cotacoes.createdAt, new Date(missao.dataInicio)), lte(cotacoes.createdAt, new Date(dataFim + 'T23:59:59Z'))))
          .orderBy(desc(cotacoes.createdAt));
      } else if (missao.tipoMetrica === 'renovacoes') {
        registros = await db
          .select({ id: renovacoesComerciais.id, itemDescricao: renovacoesComerciais.itemDescricao, produtoDescricao: renovacoesComerciais.produtoDescricao, seguradoraAnterior: renovacoesComerciais.seguradoraAnterior, data: renovacoesComerciais.dataFinalizacao, clienteNome: clientes.nome, vendedorNome: usuarios.nome })
          .from(renovacoesComerciais)
          .leftJoin(clientes, eq(renovacoesComerciais.clienteId, clientes.id))
          .leftJoin(usuarios, eq(renovacoesComerciais.vendedorId, usuarios.id))
          .where(and(eq(renovacoesComerciais.corretoraId, request.corretoraId), inArray(renovacoesComerciais.vendedorId, usuarioIds), eq(renovacoesComerciais.status, 'RENOVADO'), gte(renovacoesComerciais.dataFinalizacao, new Date(missao.dataInicio)), lte(renovacoesComerciais.dataFinalizacao, new Date(dataFim + 'T23:59:59Z'))))
          .orderBy(desc(renovacoesComerciais.dataFinalizacao));
      } else if (missao.tipoMetrica === 'valor_premio') {
        registros = await db
          .select({ id: documentosVenda.id, numero: documentosVenda.numeroDocumento, status: documentosVenda.status, premioLiquido: documentosVenda.premioLiquido, data: documentosVenda.createdAt, clienteNome: clientes.nome, vendedorNome: usuarios.nome })
          .from(documentosVenda)
          .leftJoin(clientes, eq(documentosVenda.clienteId, clientes.id))
          .leftJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
          .where(and(eq(documentosVenda.corretoraId, request.corretoraId), inArray(documentosVenda.vendedorId, usuarioIds), inArray(documentosVenda.status, ['VENDA_CONFIRMADA', 'ATIVO']), isNull(documentosVenda.deletedAt), gte(documentosVenda.createdAt, new Date(missao.dataInicio)), lte(documentosVenda.createdAt, new Date(dataFim + 'T23:59:59Z'))))
          .orderBy(desc(documentosVenda.createdAt));
      }

      return ok(registros as any);
    },
  );

  // Deletar missão (soft delete)
  fastify.delete(
    '/:id',
    {
      schema: { tags: ['Gamificação'], summary: 'Remover missão', ...missoesDocs.excluir },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const missao = await db.query.missoes.findFirst({
        where: and(
          eq(missoes.id, id),
          eq(missoes.corretoraId, request.corretoraId),
          isNull(missoes.deletedAt),
        ),
      });

      if (!missao) throw new NotFoundError('Missão não encontrada');

      await db
        .update(missoes)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(missoes.id, id));

      return reply.status(204).send({});
    },
  );
};

export default missoesRoutes;
