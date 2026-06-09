import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db, metas, equipes, usuarios, cotacoes, clientes, renovacoesComerciais, documentosVenda } from '@ecotech/shared/database';
import { eq, and, isNull, isNotNull, or, desc, inArray, gte, lte } from 'drizzle-orm';
import { authorize, authorizeAny, requireGestor, requireModule } from '@ecotech/plugins/authorization';
import { metasDocs } from '../../docs/gamificacao/schemas.js';
import { ok } from '../../docs/index.js';
import { NotFoundError, ForbiddenError } from '@ecotech/shared/utils';
import {
  calculateProgress,
  resolveUserIds,
} from '../../utils/progresso-metrica.js';

const criarMetaSchema = z.object({
  titulo: z.string().min(1).max(255),
  descricao: z.string().optional(),
  tipoMetrica: z.enum(['novos_seguros', 'renovacoes', 'cotacoes', 'valor_premio', 'taxa_renovacao', 'premio_renovacao']),
  valorAlvo: z.number().positive(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  equipeId: z.string().uuid().optional(),
  usuarioId: z.string().uuid().optional(),
});

const atualizarMetaSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descricao: z.string().nullable().optional(),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['CANCELADA']).optional(),
});

async function enrichMeta(meta: any, corretoraId: string) {
  const usuarioIds = await resolveUserIds(corretoraId, meta.equipeId, meta.usuarioId);
  const atual = await calculateProgress(corretoraId, meta.tipoMetrica, meta.dataInicio, meta.dataFim, usuarioIds);
  const alvo = parseFloat(meta.valorAlvo);
  return {
    ...meta,
    progressoAtual: atual,
    percentual: alvo > 0 ? Math.min(100, Math.round((atual / alvo) * 100)) : 0,
  };
}

const metasRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', requireModule('gamificacao'));

  // Listar metas
  fastify.get(
    '/',
    {
      schema: { tags: ['Gamificação'], summary: 'Listar metas', ...metasDocs.listar },
      preHandler: [authorizeAny(['workspace:acessar', 'gamificacao:gerenciar'])],
    },
    async (request) => {
      const user = request.user;
      const hoje = new Date().toISOString().split('T')[0];

      const todasMetas = await db.query.metas.findMany({
        where: and(
          eq(metas.corretoraId, request.corretoraId),
          isNull(metas.deletedAt),
        ),
        orderBy: [desc(metas.createdAt)],
      });

      // Expirar metas vencidas automaticamente
      for (const meta of todasMetas) {
        if (meta.status === 'ATIVA' && meta.dataFim < hoje) {
          await db
            .update(metas)
            .set({ status: 'EXPIRADA', updatedAt: new Date() })
            .where(eq(metas.id, meta.id));
          meta.status = 'EXPIRADA';
        }
      }

      // Gestores e admins veem todas; vendedores veem apenas as que os incluem
      let metasFiltradas = todasMetas;
      if (!user.isAdmin && !user.isGestor) {
        const equipeId = (
          await db.query.usuarios.findFirst({
            where: eq(usuarios.id, user.sub),
            columns: { equipeId: true },
          })
        )?.equipeId;

        metasFiltradas = todasMetas.filter((m) => {
          if (!m.usuarioId && !m.equipeId) return true; // corretora-wide
          if (m.usuarioId === user.sub) return true;
          if (equipeId && m.equipeId === equipeId) return true;
          return false;
        });
      }

      const enriquecidas = await Promise.all(
        metasFiltradas.map((m) => enrichMeta(m, request.corretoraId)),
      );

      return ok(enriquecidas as any);
    },
  );

  // Criar meta
  fastify.post(
    '/',
    {
      schema: { tags: ['Gamificação'], summary: 'Criar meta', ...metasDocs.criar },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request, reply) => {
      const data = criarMetaSchema.parse(request.body);

      const [meta] = await db
        .insert(metas)
        .values({
          corretoraId: request.corretoraId,
          criadaPorId: request.user.sub,
          titulo: data.titulo,
          descricao: data.descricao ?? null,
          tipoMetrica: data.tipoMetrica,
          valorAlvo: String(data.valorAlvo),
          dataInicio: data.dataInicio,
          dataFim: data.dataFim,
          equipeId: data.equipeId ?? null,
          usuarioId: data.usuarioId ?? null,
        })
        .returning();

      const enriquecida = await enrichMeta(meta, request.corretoraId);
      return reply.status(201).send(ok(enriquecida as any));
    },
  );

  // Buscar meta por ID
  fastify.get(
    '/:id',
    {
      schema: { tags: ['Gamificação'], summary: 'Buscar meta', ...metasDocs.buscar },
      preHandler: [authorizeAny(['workspace:acessar', 'gamificacao:gerenciar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const meta = await db.query.metas.findFirst({
        where: and(
          eq(metas.id, id),
          eq(metas.corretoraId, request.corretoraId),
          isNull(metas.deletedAt),
        ),
      });

      if (!meta) throw new NotFoundError('Meta não encontrada');

      const enriquecida = await enrichMeta(meta, request.corretoraId);
      return ok(enriquecida as any);
    },
  );

  // Atualizar meta
  fastify.patch(
    '/:id',
    {
      schema: { tags: ['Gamificação'], summary: 'Atualizar meta', ...metasDocs.atualizar },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const data = atualizarMetaSchema.parse(request.body);

      const meta = await db.query.metas.findFirst({
        where: and(
          eq(metas.id, id),
          eq(metas.corretoraId, request.corretoraId),
          isNull(metas.deletedAt),
        ),
      });

      if (!meta) throw new NotFoundError('Meta não encontrada');

      const [updated] = await db
        .update(metas)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(metas.id, id))
        .returning();

      return ok(updated as any);
    },
  );

  // Auditoria de meta: retorna os registros que compõem o progresso
  fastify.get(
    '/:id/audit',
    {
      schema: { tags: ['Gamificação'], summary: 'Auditoria de meta', ...metasDocs.auditoria },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request) => {
      const { id } = request.params as { id: string };

      const meta = await db.query.metas.findFirst({
        where: and(
          eq(metas.id, id),
          eq(metas.corretoraId, request.corretoraId),
          isNull(metas.deletedAt),
        ),
      });

      if (!meta) throw new NotFoundError('Meta não encontrada');

      const usuarioIds = await resolveUserIds(request.corretoraId, meta.equipeId, meta.usuarioId);
      if (usuarioIds.length === 0) return ok([] as any);

      const vendedor = {
        id: usuarios.id,
        nome: usuarios.nome,
      };

      let registros: any[] = [];

      if (meta.tipoMetrica === 'novos_seguros') {
        // Documentos aprovados pelo cadastro com cotação de origem situacao='NOVO'
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
          .innerJoin(
            cotacoes,
            and(
              eq(cotacoes.documentoVendaId, documentosVenda.id),
              eq(cotacoes.situacao, 'NOVO'),
              isNull(cotacoes.deletedAt),
            ),
          )
          .leftJoin(clientes, eq(documentosVenda.clienteId, clientes.id))
          .leftJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              inArray(documentosVenda.vendedorId, usuarioIds),
              isNull(documentosVenda.deletedAt),
              isNotNull(documentosVenda.dataAprovacaoCadastro),
              gte(documentosVenda.dataAprovacaoCadastro, new Date(meta.dataInicio)),
              lte(documentosVenda.dataAprovacaoCadastro, new Date(meta.dataFim + 'T23:59:59Z')),
            ),
          )
          .orderBy(desc(documentosVenda.dataAprovacaoCadastro));
      } else if (meta.tipoMetrica === 'cotacoes') {
        registros = await db
          .select({
            id: cotacoes.id,
            numero: cotacoes.numeroCotacao,
            situacao: cotacoes.situacao,
            itemDescricao: cotacoes.itemDescricao,
            data: cotacoes.createdAt,
            clienteNome: clientes.nome,
            vendedorNome: usuarios.nome,
          })
          .from(cotacoes)
          .leftJoin(clientes, eq(cotacoes.clienteId, clientes.id))
          .leftJoin(usuarios, eq(cotacoes.vendedorId, usuarios.id))
          .where(
            and(
              eq(cotacoes.corretoraId, request.corretoraId),
              inArray(cotacoes.vendedorId, usuarioIds),
              isNull(cotacoes.deletedAt),
              gte(cotacoes.createdAt, new Date(meta.dataInicio)),
              lte(cotacoes.createdAt, new Date(meta.dataFim + 'T23:59:59Z')),
            ),
          )
          .orderBy(desc(cotacoes.createdAt));
      } else if (meta.tipoMetrica === 'renovacoes') {
        registros = await db
          .select({
            id: renovacoesComerciais.id,
            itemDescricao: renovacoesComerciais.itemDescricao,
            produtoDescricao: renovacoesComerciais.produtoDescricao,
            seguradoraAnterior: renovacoesComerciais.seguradoraAnterior,
            data: renovacoesComerciais.dataFinalizacao,
            clienteNome: clientes.nome,
            vendedorNome: usuarios.nome,
          })
          .from(renovacoesComerciais)
          .leftJoin(clientes, eq(renovacoesComerciais.clienteId, clientes.id))
          .leftJoin(usuarios, eq(renovacoesComerciais.vendedorId, usuarios.id))
          .where(
            and(
              eq(renovacoesComerciais.corretoraId, request.corretoraId),
              inArray(renovacoesComerciais.vendedorId, usuarioIds),
              eq(renovacoesComerciais.status, 'RENOVADO'),
              gte(renovacoesComerciais.dataFinalizacao, new Date(meta.dataInicio)),
              lte(renovacoesComerciais.dataFinalizacao, new Date(meta.dataFim + 'T23:59:59Z')),
            ),
          )
          .orderBy(desc(renovacoesComerciais.dataFinalizacao));
      } else if (meta.tipoMetrica === 'valor_premio') {
        registros = await db
          .select({
            id: documentosVenda.id,
            numero: documentosVenda.numeroDocumento,
            status: documentosVenda.status,
            premioLiquido: documentosVenda.premioLiquido,
            data: documentosVenda.createdAt,
            clienteNome: clientes.nome,
            vendedorNome: usuarios.nome,
          })
          .from(documentosVenda)
          .leftJoin(clientes, eq(documentosVenda.clienteId, clientes.id))
          .leftJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
          .where(
            and(
              eq(documentosVenda.corretoraId, request.corretoraId),
              inArray(documentosVenda.vendedorId, usuarioIds),
              inArray(documentosVenda.status, ['VENDA_CONFIRMADA', 'ATIVO']),
              isNull(documentosVenda.deletedAt),
              gte(documentosVenda.createdAt, new Date(meta.dataInicio)),
              lte(documentosVenda.createdAt, new Date(meta.dataFim + 'T23:59:59Z')),
            ),
          )
          .orderBy(desc(documentosVenda.createdAt));
      } else if (meta.tipoMetrica === 'taxa_renovacao') {
        // Mostra todas as renovações elegíveis do período (vencimento no período), com status
        registros = await db
          .select({
            id: renovacoesComerciais.id,
            itemDescricao: renovacoesComerciais.itemDescricao,
            produtoDescricao: renovacoesComerciais.produtoDescricao,
            seguradoraAnterior: renovacoesComerciais.seguradoraAnterior,
            status: renovacoesComerciais.status,
            dataVencimento: renovacoesComerciais.dataVencimento,
            premioNovo: renovacoesComerciais.premioNovo,
            premioAnterior: renovacoesComerciais.premioAnterior,
            percentualComissaoAnterior: renovacoesComerciais.percentualComissaoAnterior,
            percentualComissaoNovo: renovacoesComerciais.percentualComissaoNovo,
            data: renovacoesComerciais.dataFinalizacao,
            clienteNome: clientes.nome,
            vendedorNome: usuarios.nome,
          })
          .from(renovacoesComerciais)
          .leftJoin(clientes, eq(renovacoesComerciais.clienteId, clientes.id))
          .leftJoin(usuarios, eq(renovacoesComerciais.vendedorId, usuarios.id))
          .where(
            and(
              eq(renovacoesComerciais.corretoraId, request.corretoraId),
              inArray(renovacoesComerciais.vendedorId, usuarioIds),
              gte(renovacoesComerciais.dataVencimento, meta.dataInicio),
              lte(renovacoesComerciais.dataVencimento, meta.dataFim),
            ),
          )
          .orderBy(desc(renovacoesComerciais.dataVencimento));
      } else if (meta.tipoMetrica === 'premio_renovacao') {
        registros = await db
          .select({
            id: renovacoesComerciais.id,
            itemDescricao: renovacoesComerciais.itemDescricao,
            produtoDescricao: renovacoesComerciais.produtoDescricao,
            seguradoraAnterior: renovacoesComerciais.seguradoraAnterior,
            premioNovo: renovacoesComerciais.premioNovo,
            data: renovacoesComerciais.dataFinalizacao,
            clienteNome: clientes.nome,
            vendedorNome: usuarios.nome,
          })
          .from(renovacoesComerciais)
          .leftJoin(clientes, eq(renovacoesComerciais.clienteId, clientes.id))
          .leftJoin(usuarios, eq(renovacoesComerciais.vendedorId, usuarios.id))
          .where(
            and(
              eq(renovacoesComerciais.corretoraId, request.corretoraId),
              inArray(renovacoesComerciais.vendedorId, usuarioIds),
              eq(renovacoesComerciais.status, 'RENOVADO'),
              gte(renovacoesComerciais.dataFinalizacao, new Date(meta.dataInicio)),
              lte(renovacoesComerciais.dataFinalizacao, new Date(meta.dataFim + 'T23:59:59Z')),
            ),
          )
          .orderBy(desc(renovacoesComerciais.dataFinalizacao));
      }

      return ok(registros as any);
    },
  );

  // Deletar meta (soft delete)
  fastify.delete(
    '/:id',
    {
      schema: { tags: ['Gamificação'], summary: 'Remover meta', ...metasDocs.excluir },
      preHandler: [authorize(['gamificacao:gerenciar'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const meta = await db.query.metas.findFirst({
        where: and(
          eq(metas.id, id),
          eq(metas.corretoraId, request.corretoraId),
          isNull(metas.deletedAt),
        ),
      });

      if (!meta) throw new NotFoundError('Meta não encontrada');

      await db
        .update(metas)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(metas.id, id));

      return reply.status(204).send({});
    },
  );
};

export default metasRoutes;
