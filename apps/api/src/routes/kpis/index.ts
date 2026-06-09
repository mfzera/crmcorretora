import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '@ecotech/shared/database';
import {
  oportunidades,
  documentosVenda,
  renovacoesComerciais,
} from '@ecotech/shared/database';
import { eq, and, sql, gte, lte, isNull, inArray } from 'drizzle-orm';
import { kpisDocs } from '../../docs/metricas/schemas.js';
import { ok } from '../../docs/index.js';

const kpisRoutes: FastifyPluginAsyncZod = async function (fastify) {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /kpis - Retorna KPIs principais
  fastify.get(
    '/',
    {
      schema: {
        tags: ['KPIs'],
        summary: 'Obter KPIs principais',
        description:
          'Retorna os principais indicadores de performance do sistema',
        ...kpisDocs.principal,
      },
    },
    async (request) => {
      const { corretoraId } = request;

      const dataAtual = new Date();
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 90);
      const dataAtualStr = dataAtual.toISOString().split('T')[0];
      const dataLimiteStr = dataLimite.toISOString().split('T')[0];

      // 3 queries paralelas em vez de 6 sequenciais
      const [oportunidadesStats, vendasConcluidas, renovacoesStats] =
        await Promise.all([
          // Agrega total, ganhas e em andamento numa query só
          db
            .select({
              total: sql<number>`COUNT(*)`,
              ganhas: sql<number>`COUNT(CASE WHEN status = 'ganha' THEN 1 END)`,
              emAndamento: sql<number>`COUNT(CASE WHEN status IN ('lead','contato_inicial','negociacao') THEN 1 END)`,
            })
            .from(oportunidades)
            .where(
              and(
                eq(oportunidades.corretoraId, corretoraId),
                isNull(oportunidades.deletedAt),
              ),
            ),

          db
            .select({
              totalPremio: sql<number>`SUM(CAST(premio_liquido AS DECIMAL))`,
              count: sql<number>`COUNT(*)`,
            })
            .from(documentosVenda)
            .where(
              and(
                eq(documentosVenda.corretoraId, corretoraId),
                eq(documentosVenda.status, 'ATIVO'),
                isNull(documentosVenda.deletedAt),
              ),
            ),

          // Agrega pendentes e renovadas numa query só
          db
            .select({
              total: sql<number>`COUNT(*)`,
              concluidas: sql<number>`COUNT(CASE WHEN status = 'RENOVADO' THEN 1 END)`,
            })
            .from(renovacoesComerciais)
            .where(
              and(
                eq(renovacoesComerciais.corretoraId, corretoraId),
                gte(renovacoesComerciais.dataVencimento, dataLimiteStr),
                lte(renovacoesComerciais.dataVencimento, dataAtualStr),
              ),
            ),
        ]);

      const total = Number(oportunidadesStats[0]?.total) || 0;
      const ganhas = Number(oportunidadesStats[0]?.ganhas) || 0;
      const taxaConversao = total > 0 ? (ganhas / total) * 100 : 0;

      const totalVendas = Number(vendasConcluidas[0]?.count) || 0;
      const totalPremio = Number(vendasConcluidas[0]?.totalPremio) || 0;
      const valorMedioPremio = totalVendas > 0 ? totalPremio / totalVendas : 0;

      const totalRenovacoes = Number(renovacoesStats[0]?.total) || 0;
      const concluidas = Number(renovacoesStats[0]?.concluidas) || 0;
      const taxaRenovacao =
        totalRenovacoes > 0 ? (concluidas / totalRenovacoes) * 100 : 0;

      return ok({
        taxaConversao: {
          valor: Math.round(taxaConversao * 100) / 100,
          total,
          ganhas,
          emAndamento: Number(oportunidadesStats[0]?.emAndamento) || 0,
        },
        valorMedioPremio: {
          valor: Math.round(valorMedioPremio * 100) / 100,
          totalVendas,
          totalPremio: Math.round(totalPremio * 100) / 100,
        },
        taxaRenovacao: {
          valor: Math.round(taxaRenovacao * 100) / 100,
          total: totalRenovacoes,
          concluidas,
          periodo: '90 dias',
        },
      });
    },
  );

  // GET /kpis/kanban - Retorna KPIs específicos do Kanban
  fastify.get(
    '/kanban',
    {
      schema: {
        tags: ['KPIs'],
        summary: 'Obter KPIs do Kanban',
        description: 'Retorna métricas específicas do Kanban de oportunidades',
        ...kpisDocs.kanban,
      },
    },
    async (request) => {
      const { corretoraId, user } = request;

      // Verifica se pode ver todas as oportunidades
      const podeVerTodas =
        user.isAdmin || user.permissoes?.includes('kanban:visualizar_todas');

      // Condições base para todas as queries
      const baseConditions = [
        eq(oportunidades.corretoraId, corretoraId),
        inArray(oportunidades.status, [
          'lead',
          'contato_inicial',
          'negociacao',
        ]),
        isNull(oportunidades.deletedAt),
      ];

      // Se não pode ver todas, adiciona filtro de vendedor
      if (!podeVerTodas) {
        baseConditions.push(eq(oportunidades.vendedorId, user.sub));
      }

      // 4 queries sequenciais (incluindo duplicata) → 1 query com agregação condicional
      const [stats] = await db
        .select({
          media: sql<number>`AVG(CAST(premio_estimado AS DECIMAL))`,
          count: sql<number>`COUNT(*)`,
          total: sql<number>`SUM(CAST(premio_estimado AS DECIMAL))`,
          urgentes: sql<number>`COUNT(CASE WHEN prioridade = 'urgente' THEN 1 END)`,
          frios: sql<number>`COUNT(CASE WHEN temperatura = 'frio' THEN 1 END)`,
        })
        .from(oportunidades)
        .where(and(...baseConditions));

      const totalAtivas = Number(stats?.count) || 0;

      return ok({
        premioMedio: {
          valor: Math.round(Number(stats?.media || 0) * 100) / 100,
          count: totalAtivas,
          total: Math.round(Number(stats?.total || 0) * 100) / 100,
        },
        clientesUrgencia: {
          count: Number(stats?.urgentes) || 0,
          total: totalAtivas,
        },
        leadsFrios: {
          count: Number(stats?.frios) || 0,
          total: totalAtivas,
        },
      });
    },
  );
};

export default kpisRoutes;
