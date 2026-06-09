import {
  clientes,
  cotacoes,
  cotacaoVendedores,
  db,
  documentosVenda,
  endossos,
  equipes,
  oportunidades,
  produtos,
  renovacoesComerciais,
  seguradorasParceiras,
  usuarios,
} from '@ecotech/shared/database';
import { MetricsService } from '@ecotech/shared/storage';
import {
  and,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { withCacheGeneric } from '../../utils/cache.js';
import { metricasDocs } from '../../docs/metricas/schemas.js';
import { ok } from '../../docs/index.js';

type EvolucaoRow = {
  periodo: string;
  totalPremio: number;
  mediaPercentualComissao: number;
};

/**
 * Garante que todos os períodos no intervalo [dataInicio, dataFim] apareçam,
 * preenchendo com zeros os dias/semanas/meses sem dados.
 */
function fillGaps(
  rows: EvolucaoRow[],
  gran: 'dia' | 'semana' | 'mes',
  dataInicio?: string,
  dataFim?: string,
): EvolucaoRow[] {
  if (!dataInicio || !dataFim) {
    return rows.map((r) => ({
      periodo: r.periodo,
      totalPremio: Number(r.totalPremio),
      mediaPercentualComissao: Number(r.mediaPercentualComissao),
    }));
  }

  const map = new Map(rows.map((r) => [r.periodo, r]));
  const result: EvolucaoRow[] = [];

  // Usa noon UTC para evitar problemas de timezone ao fatiar slice(0,10)
  const start = new Date(dataInicio + 'T12:00:00Z');
  const end = new Date(dataFim + 'T12:00:00Z');

  if (gran === 'dia') {
    const cur = new Date(start);
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      const r = map.get(key);
      result.push({
        periodo: key,
        totalPremio: Number(r?.totalPremio ?? 0),
        mediaPercentualComissao: Number(r?.mediaPercentualComissao ?? 0),
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else if (gran === 'semana') {
    // Recua até a segunda-feira da semana que contém dataInicio
    const cur = new Date(start);
    const dow = cur.getUTCDay(); // 0=Dom ... 6=Sáb
    cur.setUTCDate(cur.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      const r = map.get(key);
      result.push({
        periodo: key,
        totalPremio: Number(r?.totalPremio ?? 0),
        mediaPercentualComissao: Number(r?.mediaPercentualComissao ?? 0),
      });
      cur.setUTCDate(cur.getUTCDate() + 7);
    }
  } else {
    // mes
    const cur = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
    );
    const endMes = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1),
    );
    while (cur <= endMes) {
      const key = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}`;
      const r = map.get(key);
      result.push({
        periodo: key,
        totalPremio: Number(r?.totalPremio ?? 0),
        mediaPercentualComissao: Number(r?.mediaPercentualComissao ?? 0),
      });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
  }

  return result;
}

/**
 * Resolve os IDs de vendedores visíveis para um gestor:
 * o próprio gestor + todos os membros da equipe que ele lidera.
 * Se o gestor não tiver equipe, retorna apenas o próprio ID.
 */
async function resolveEquipeVendedorIds(usuarioId: string): Promise<string[]> {
  const equipeLiderada = await db.query.equipes.findFirst({
    where: eq(equipes.gestorId, usuarioId),
  });
  if (!equipeLiderada) return [usuarioId];
  const membros = await db.query.usuarios.findMany({
    where: eq(usuarios.equipeId, equipeLiderada.id),
    columns: { id: true },
  });
  return [...new Set([usuarioId, ...membros.map((m) => m.id)])];
}

const metricasRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Aplicar tenant isolation e autenticação
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /metricas - Métricas gerais consolidadas
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Métricas'],
        summary: 'Métricas gerais consolidadas',
        description:
          'Retorna métricas consolidadas de toda a operação: prêmio líquido, comissões, oportunidades kanban, cadastros, renovações e endossos. Suporta filtros por período, vendedor, produto e seguradora. Respeita permissões de visualização.',
        ...metricasDocs.principal,
      },
    },
    async (request, reply) => {
      const {
        dataInicio,
        dataFim,
        vendedorId,
        equipeId,
        produtoId,
        seguradoraParceiraId,
        status,
      } = request.query;
      const {
        corretoraId,
        sub: usuarioAtualId,
        permissoes,
        isGestor,
        isLiderEquipe,
        isAdmin,
      } = request.user;

      // Admin sempre vê tudo. Gestores/líderes sem isAdmin ficam limitados à equipe.
      const isGestorOuLider = !!(isGestor || isLiderEquipe);
      const podeVerTodos =
        isAdmin ||
        (permissoes?.includes('relatorios:vendas') && !isGestorOuLider);

      // Cache key: escopo por corretora + usuário (sem permissão "ver todos" usa dados próprios) + todos os filtros
      const paramsKey = [
        podeVerTodos ? 'todos' : usuarioAtualId,
        dataInicio,
        dataFim,
        vendedorId,
        equipeId,
        produtoId,
        seguradoraParceiraId,
        status,
      ]
        .filter(Boolean)
        .join(':');

      const data = await withCacheGeneric(
        `metricas:${corretoraId}:${paramsKey}`,
        180, // 3 minutos
        () =>
          fetchMetricas({
            corretoraId,
            usuarioAtualId,
            podeVerTodos: !!podeVerTodos,
            isGestor: isGestorOuLider,
            isAdmin: !!isAdmin,
            dataInicio,
            dataFim,
            vendedorId,
            equipeId,
            produtoId,
            seguradoraParceiraId,
            status,
          }),
      );
      return { success: true as const, data };
    },
  );

  // Função que executa todas as queries de métricas em paralelo
  async function fetchMetricas({
    corretoraId,
    usuarioAtualId,
    podeVerTodos,
    isGestor,
    isAdmin,
    dataInicio,
    dataFim,
    vendedorId,
    equipeId,
    produtoId,
    seguradoraParceiraId,
    status,
  }: {
    corretoraId: string;
    usuarioAtualId: string;
    podeVerTodos: boolean;
    isGestor: boolean;
    isAdmin: boolean;
    dataInicio?: string;
    dataFim?: string;
    vendedorId?: string;
    equipeId?: string;
    produtoId?: string;
    seguradoraParceiraId?: string;
    status?: string;
  }) {
    // Gestor sem isAdmin: resolve IDs da equipe uma vez, reutiliza em todas as queries
    const equipeVendedorIds =
      isGestor && !isAdmin
        ? await resolveEquipeVendedorIds(usuarioAtualId)
        : null;

    // Construir condições base
    // dateColumn: coluna de data a usar (padrão: createdAt)
    // isDateType: true quando a coluna é tipo DATE (não timestamp) — usa string direta sem conversão de timezone
    const buildConditions = (
      table: any,
      dateColumn?: any,
      isDateType = false,
    ) => {
      const conditions = [eq(table.corretoraId, corretoraId)];

      // Filtro de data: usa a coluna de data informada ou createdAt por padrão
      const col = dateColumn ?? table.createdAt;
      if (dataInicio) {
        conditions.push(
          gte(
            col,
            isDateType ? dataInicio : new Date(dataInicio + 'T00:00:00-03:00'),
          ),
        );
      }
      if (dataFim) {
        conditions.push(
          lte(
            col,
            isDateType ? dataFim : new Date(dataFim + 'T23:59:59.999-03:00'),
          ),
        );
      }

      // Filtro de vendedor: três caminhos —
      //   1. admin/relatorios:vendas → sem filtro (vê tudo)
      //   2. gestor → filtra pelos IDs da equipe (clampeando filtro explícito de vendedorId também)
      //   3. vendedor comum → apenas os próprios dados
      if (vendedorId) {
        if (equipeVendedorIds && !equipeVendedorIds.includes(vendedorId)) {
          // Gestor tentando filtrar por vendedor fora da equipe — clampear
          conditions.push(inArray(table.vendedorId, equipeVendedorIds));
        } else {
          conditions.push(eq(table.vendedorId, vendedorId));
        }
      } else if (podeVerTodos) {
        // sem filtro de vendedor
      } else if (equipeVendedorIds) {
        conditions.push(inArray(table.vendedorId, equipeVendedorIds));
      } else {
        conditions.push(eq(table.vendedorId, usuarioAtualId));
      }

      // Filtro de seguradora parceira (apenas para documento_venda)
      if (seguradoraParceiraId && table.seguradoraParceiraId) {
        conditions.push(eq(table.seguradoraParceiraId, seguradoraParceiraId));
      }

      return conditions;
    };

    // Calcular período anterior para comparação de tendências
    let anteriorInicio: string | undefined;
    let anteriorFim: string | undefined;
    if (dataInicio && dataFim) {
      const d1 = new Date(dataInicio + 'T12:00:00Z');
      const d2 = new Date(dataFim + 'T12:00:00Z');
      const diffMs = d2.getTime() - d1.getTime();
      const anteriorFimDate = new Date(d1.getTime() - 24 * 60 * 60 * 1000);
      const anteriorInicioDate = new Date(anteriorFimDate.getTime() - diffMs);
      anteriorFim = anteriorFimDate.toISOString().slice(0, 10);
      anteriorInicio = anteriorInicioDate.toISOString().slice(0, 10);
    }

    // ============================
    // Condições base (reutilizadas nas queries paralelas)
    // ============================
    // Usa COALESCE(dataSolicitacaoCadastro, ...) como "data de produção":
    // - dataSolicitacaoCadastro preenchida → usa essa data
    // - documento importado (importacaoId IS NOT NULL) → usa vigenciaInicio (início da cobertura)
    // - demais → usa createdAt
    const premioDateCol = sql`COALESCE(
      ${documentosVenda.dataSolicitacaoCadastro},
      CASE WHEN ${documentosVenda.importacaoId} IS NOT NULL
           THEN (${documentosVenda.vigenciaInicio} || ' 12:00:00')::timestamptz
           ELSE ${documentosVenda.createdAt}
      END
    )`;
    const premioConditions = buildConditions(documentosVenda, premioDateCol);
    if (produtoId) {
      premioConditions.push(eq(documentosVenda.produtoId, produtoId));
    }
    if (status) {
      premioConditions.push(eq(documentosVenda.status, status as any));
    }

    const oportunidadeConditions = buildConditions(oportunidades);
    const renovacaoConditions = buildConditions(
      renovacoesComerciais,
      renovacoesComerciais.dataVencimento,
      true,
    );
    const endossoConditions = buildConditions(
      endossos,
      endossos.dataSolicitacao,
    );

    const cadastroConditions = [eq(clientes.corretoraId, corretoraId)];
    if (dataInicio)
      cadastroConditions.push(
        gte(clientes.createdAt, new Date(dataInicio + 'T00:00:00-03:00')),
      );
    if (dataFim)
      cadastroConditions.push(
        lte(clientes.createdAt, new Date(dataFim + 'T23:59:59.999-03:00')),
      );
    if (vendedorId) {
      if (equipeVendedorIds && !equipeVendedorIds.includes(vendedorId)) {
        cadastroConditions.push(
          inArray(clientes.vendedorId, equipeVendedorIds),
        );
      } else {
        cadastroConditions.push(eq(clientes.vendedorId, vendedorId));
      }
    } else if (podeVerTodos) {
      // sem filtro
    } else if (equipeVendedorIds) {
      cadastroConditions.push(inArray(clientes.vendedorId, equipeVendedorIds));
    } else {
      cadastroConditions.push(eq(clientes.vendedorId, usuarioAtualId));
    }

    const hoje = new Date().toISOString().split('T')[0];
    const renovacoesVencidasConditions = [
      eq(renovacoesComerciais.corretoraId, corretoraId),
      sql`${renovacoesComerciais.status} IN ('NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE')`,
      sql`${renovacoesComerciais.dataVencimento} < ${hoje}`,
    ];
    if (vendedorId) {
      if (equipeVendedorIds && !equipeVendedorIds.includes(vendedorId)) {
        renovacoesVencidasConditions.push(
          inArray(renovacoesComerciais.vendedorId, equipeVendedorIds),
        );
      } else {
        renovacoesVencidasConditions.push(
          eq(renovacoesComerciais.vendedorId, vendedorId),
        );
      }
    } else if (podeVerTodos) {
      // sem filtro
    } else if (equipeVendedorIds) {
      renovacoesVencidasConditions.push(
        inArray(renovacoesComerciais.vendedorId, equipeVendedorIds),
      );
    } else {
      renovacoesVencidasConditions.push(
        eq(renovacoesComerciais.vendedorId, usuarioAtualId),
      );
    }

    const cincosDiasAtras = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const cotacoesParadasConditions = [
      eq(cotacoes.corretoraId, corretoraId),
      eq(cotacoes.status, 'EM_ELABORACAO'),
      isNull(cotacoes.deletedAt),
      lt(cotacoes.updatedAt, cincosDiasAtras),
    ];
    if (vendedorId) {
      if (equipeVendedorIds && !equipeVendedorIds.includes(vendedorId)) {
        cotacoesParadasConditions.push(
          inArray(cotacoes.vendedorId, equipeVendedorIds),
        );
      } else {
        cotacoesParadasConditions.push(eq(cotacoes.vendedorId, vendedorId));
      }
    } else if (podeVerTodos) {
      // sem filtro
    } else if (equipeVendedorIds) {
      cotacoesParadasConditions.push(
        inArray(cotacoes.vendedorId, equipeVendedorIds),
      );
    } else {
      cotacoesParadasConditions.push(eq(cotacoes.vendedorId, usuarioAtualId));
    }

    // Condições para período anterior (tendências)
    const anteriorPremioConditions =
      anteriorInicio && anteriorFim
        ? (() => {
            const c = [eq(documentosVenda.corretoraId, corretoraId)];
            const anteriorDateCol = sql`COALESCE(${documentosVenda.dataSolicitacaoCadastro}, ${documentosVenda.createdAt})`;
            c.push(
              gte(
                anteriorDateCol,
                new Date(anteriorInicio + 'T00:00:00-03:00'),
              ),
            );
            c.push(
              lte(
                anteriorDateCol,
                new Date(anteriorFim + 'T23:59:59.999-03:00'),
              ),
            );
            if (vendedorId) {
              if (
                equipeVendedorIds &&
                !equipeVendedorIds.includes(vendedorId)
              ) {
                c.push(inArray(documentosVenda.vendedorId, equipeVendedorIds));
              } else {
                c.push(eq(documentosVenda.vendedorId, vendedorId));
              }
            } else if (podeVerTodos) {
              // sem filtro
            } else if (equipeVendedorIds) {
              c.push(inArray(documentosVenda.vendedorId, equipeVendedorIds));
            } else {
              c.push(eq(documentosVenda.vendedorId, usuarioAtualId));
            }
            if (produtoId) c.push(eq(documentosVenda.produtoId, produtoId));
            return c;
          })()
        : null;

    const anteriorRenovacaoConditions =
      anteriorInicio && anteriorFim
        ? (() => {
            const c = [eq(renovacoesComerciais.corretoraId, corretoraId)];
            c.push(gte(renovacoesComerciais.dataVencimento, anteriorInicio!));
            c.push(lte(renovacoesComerciais.dataVencimento, anteriorFim!));
            if (vendedorId) {
              if (
                equipeVendedorIds &&
                !equipeVendedorIds.includes(vendedorId)
              ) {
                c.push(
                  inArray(renovacoesComerciais.vendedorId, equipeVendedorIds),
                );
              } else {
                c.push(eq(renovacoesComerciais.vendedorId, vendedorId));
              }
            } else if (podeVerTodos) {
              // sem filtro
            } else if (equipeVendedorIds) {
              c.push(
                inArray(renovacoesComerciais.vendedorId, equipeVendedorIds),
              );
            } else {
              c.push(eq(renovacoesComerciais.vendedorId, usuarioAtualId));
            }
            return c;
          })()
        : null;

    // ============================
    // TODAS AS QUERIES EM PARALELO
    // ============================
    const [
      metricasPremioLiquido,
      premioPorStatus,
      metricasComissao,
      clientesAtivosDocs,
      topVendedores,
      metricasPorSeguradora,
      metricasKanban,
      metricasPrioridade,
      metricasTemperatura,
      metricasCadastro,
      metricasRenovacao,
      metricasEndosso,
      negocioCorretora,
      negocioCorretoraPorSeguradora,
      clientesPorSeguradora,
      renovacoesVencidasPorVendedor,
      cotacoesParadasPorVendedor,
      anteriorPremioResult,
      anteriorComissaoResult,
      anteriorRenovacaoResult,
      renovacoesPorProduto,
    ] = await Promise.all([
      // 1. Prêmio líquido (documentos ATIVOS)
      db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`,
          media: sql<number>`COALESCE(AVG(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`,
          maior: sql<number>`COALESCE(MAX(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`,
          menor: sql<number>`COALESCE(MIN(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`,
        })
        .from(documentosVenda)
        .where(and(...premioConditions, eq(documentosVenda.status, 'ATIVO'))),

      // 2. Prêmio por status
      db
        .select({
          status: documentosVenda.status,
          total: sql<number>`COALESCE(SUM(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(documentosVenda)
        .where(and(...premioConditions))
        .groupBy(documentosVenda.status),

      // 3. Comissão
      db
        .select({
          totalComissao: sql<number>`COALESCE(SUM(CAST(${documentosVenda.valorComissao} AS DECIMAL)), 0)`,
          mediaComissao: sql<number>`COALESCE(AVG(CAST(${documentosVenda.valorComissao} AS DECIMAL)), 0)`,
          mediaPercentualComissao: sql<number>`COALESCE(AVG(CAST(${documentosVenda.percentualComissao} AS DECIMAL)), 0)`,
          totalCorretora: sql<number>`COALESCE(SUM(CAST(${documentosVenda.valorComissaoCorretora} AS DECIMAL)), 0)`,
          countNegocioCorretora: sql<number>`COUNT(CASE WHEN ${documentosVenda.negocioCorretora} = true THEN 1 END)`,
        })
        .from(documentosVenda)
        .where(and(...premioConditions, eq(documentosVenda.status, 'ATIVO'))),

      // 4. Clientes ativos (distintos com docs ATIVOS)
      db
        .select({ count: countDistinct(documentosVenda.clienteId) })
        .from(documentosVenda)
        .where(and(...premioConditions, eq(documentosVenda.status, 'ATIVO'))),

      // 5. Top vendedores — premioConditions já aplica o escopo correto por perfil
      db
        .select({
          vendedorId: documentosVenda.vendedorId,
          vendedorNome: usuarios.nome,
          avatarUrl: usuarios.avatarUrl,
          equipeNome: equipes.nome,
          totalPremio: sql<number>`COALESCE(SUM(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`,
          totalComissao: sql<number>`COALESCE(SUM(CAST(${documentosVenda.valorComissao} AS DECIMAL)), 0)`,
          count: sql<number>`COUNT(*)`,
          renovacoesTotal: sql<number>`(
              SELECT COUNT(*) FROM renovacao_comercial r
              WHERE r.vendedor_id = ${documentosVenda.vendedorId}
                AND r.corretora_id = ${corretoraId}
                ${dataInicio ? sql`AND r.data_vencimento >= ${dataInicio}` : sql``}
                ${dataFim ? sql`AND r.data_vencimento <= ${dataFim}` : sql``}
            )`,
          renovacoesFechadas: sql<number>`(
              SELECT COUNT(*) FROM renovacao_comercial r
              WHERE r.vendedor_id = ${documentosVenda.vendedorId}
                AND r.corretora_id = ${corretoraId}
                AND r.status = 'RENOVADO'
                ${dataInicio ? sql`AND r.data_vencimento >= ${dataInicio}` : sql``}
                ${dataFim ? sql`AND r.data_vencimento <= ${dataFim}` : sql``}
            )`,
        })
        .from(documentosVenda)
        .leftJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
        .leftJoin(equipes, eq(usuarios.equipeId, equipes.id))
        .where(and(...premioConditions, eq(documentosVenda.status, 'ATIVO')))
        .groupBy(
          documentosVenda.vendedorId,
          usuarios.nome,
          usuarios.avatarUrl,
          equipes.nome,
        )
        .orderBy(
          desc(sql`COALESCE(SUM(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`),
        )
        .limit(100),

      // 6. Métricas por seguradora parceira
      db
        .select({
          seguradoraParceiraId: documentosVenda.seguradoraParceiraId,
          seguradoraNome: sql<
            string | null
          >`COALESCE(${seguradorasParceiras.nomeFantasia}, ${seguradorasParceiras.razaoSocial})`,
          totalPremio: sql<number>`COALESCE(SUM(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`,
          totalComissao: sql<number>`COALESCE(SUM(CAST(${documentosVenda.valorComissao} AS DECIMAL)), 0)`,
          mediaComissao: sql<number>`COALESCE(AVG(CAST(${documentosVenda.valorComissao} AS DECIMAL)), 0)`,
          countDocumentos: sql<number>`COUNT(*)`,
          countClientes: sql<number>`COUNT(DISTINCT ${documentosVenda.clienteId})`,
        })
        .from(documentosVenda)
        .leftJoin(
          seguradorasParceiras,
          eq(documentosVenda.seguradoraParceiraId, seguradorasParceiras.id),
        )
        .where(
          and(
            ...premioConditions,
            eq(documentosVenda.status, 'ATIVO'),
            isNotNull(documentosVenda.seguradoraParceiraId),
          ),
        )
        .groupBy(
          documentosVenda.seguradoraParceiraId,
          seguradorasParceiras.nomeFantasia,
          seguradorasParceiras.razaoSocial,
        )
        .orderBy(
          desc(sql`COALESCE(SUM(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`),
        ),

      // 7. Kanban por status
      db
        .select({
          status: oportunidades.status,
          count: sql<number>`COUNT(*)`,
          premioEstimado: sql<number>`COALESCE(SUM(CAST(${oportunidades.premioEstimado} AS DECIMAL)), 0)`,
          valorFechado: sql<number>`COALESCE(SUM(CAST(${oportunidades.valorFechado} AS DECIMAL)), 0)`,
        })
        .from(oportunidades)
        .where(and(...oportunidadeConditions))
        .groupBy(oportunidades.status),

      // 8. Kanban por prioridade
      db
        .select({
          prioridade: oportunidades.prioridade,
          count: sql<number>`COUNT(*)`,
        })
        .from(oportunidades)
        .where(and(...oportunidadeConditions))
        .groupBy(oportunidades.prioridade),

      // 9. Kanban por temperatura
      db
        .select({
          temperatura: oportunidades.temperatura,
          count: sql<number>`COUNT(*)`,
        })
        .from(oportunidades)
        .where(and(...oportunidadeConditions))
        .groupBy(oportunidades.temperatura),

      // 10. Cadastro de clientes
      db
        .select({
          totalClientes: sql<number>`COUNT(*)`,
          clientesPF: sql<number>`COUNT(CASE WHEN ${clientes.tipoPessoa} = 'PF' THEN 1 END)`,
          clientesPJ: sql<number>`COUNT(CASE WHEN ${clientes.tipoPessoa} = 'PJ' THEN 1 END)`,
        })
        .from(clientes)
        .where(and(...cadastroConditions)),

      // 11. Renovações por status
      db
        .select({
          status: renovacoesComerciais.status,
          count: sql<number>`COUNT(*)`,
          premioAnterior: sql<number>`COALESCE(SUM(CAST(${renovacoesComerciais.premioAnterior} AS DECIMAL)), 0)`,
          premioNovo: sql<number>`COALESCE(SUM(CAST(${renovacoesComerciais.premioNovo} AS DECIMAL)), 0)`,
        })
        .from(renovacoesComerciais)
        .where(and(...renovacaoConditions))
        .groupBy(renovacoesComerciais.status),

      // 12. Endossos por status/tipo
      db
        .select({
          status: endossos.status,
          tipo: endossos.tipoEndosso,
          count: sql<number>`COUNT(*)`,
        })
        .from(endossos)
        .where(and(...endossoConditions))
        .groupBy(endossos.status, endossos.tipoEndosso),

      // 13. Negócio corretora total
      db
        .select({
          totalDocumentos: sql<number>`COUNT(*)`,
          totalPremio: sql<number>`COALESCE(SUM(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`,
          totalComissaoVendedor: sql<number>`COALESCE(SUM(CAST(${documentosVenda.valorComissao} AS DECIMAL)), 0)`,
          totalComissaoCorretora: sql<number>`COALESCE(SUM(CAST(${documentosVenda.valorComissaoCorretora} AS DECIMAL)), 0)`,
          mediaPercentualCorretora: sql<number>`COALESCE(AVG(CAST(${documentosVenda.percentualCorretora} AS DECIMAL)), 0)`,
        })
        .from(documentosVenda)
        .where(
          and(
            ...premioConditions,
            eq(documentosVenda.status, 'ATIVO'),
            eq(documentosVenda.negocioCorretora, true),
          ),
        ),

      // 14. Negócio corretora por seguradora
      db
        .select({
          seguradoraParceiraId: documentosVenda.seguradoraParceiraId,
          seguradoraNome: sql<
            string | null
          >`COALESCE(${seguradorasParceiras.nomeFantasia}, ${seguradorasParceiras.razaoSocial})`,
          countDocumentos: sql<number>`COUNT(*)`,
          totalPremio: sql<number>`COALESCE(SUM(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`,
          totalComissaoCorretora: sql<number>`COALESCE(SUM(CAST(${documentosVenda.valorComissaoCorretora} AS DECIMAL)), 0)`,
        })
        .from(documentosVenda)
        .leftJoin(
          seguradorasParceiras,
          eq(documentosVenda.seguradoraParceiraId, seguradorasParceiras.id),
        )
        .where(
          and(
            ...premioConditions,
            eq(documentosVenda.status, 'ATIVO'),
            eq(documentosVenda.negocioCorretora, true),
            isNotNull(documentosVenda.seguradoraParceiraId),
          ),
        )
        .groupBy(
          documentosVenda.seguradoraParceiraId,
          seguradorasParceiras.nomeFantasia,
          seguradorasParceiras.razaoSocial,
        )
        .orderBy(desc(sql`COUNT(*)`)),

      // 15. Clientes por seguradora
      db
        .select({
          seguradoraParceiraId: documentosVenda.seguradoraParceiraId,
          seguradoraNome: sql<
            string | null
          >`COALESCE(${seguradorasParceiras.nomeFantasia}, ${seguradorasParceiras.razaoSocial})`,
          countClientes: sql<number>`COUNT(DISTINCT ${documentosVenda.clienteId})`,
          countClientesPF: sql<number>`COUNT(DISTINCT CASE WHEN ${clientes.tipoPessoa} = 'PF' THEN ${documentosVenda.clienteId} END)`,
          countClientesPJ: sql<number>`COUNT(DISTINCT CASE WHEN ${clientes.tipoPessoa} = 'PJ' THEN ${documentosVenda.clienteId} END)`,
        })
        .from(documentosVenda)
        .innerJoin(clientes, eq(documentosVenda.clienteId, clientes.id))
        .leftJoin(
          seguradorasParceiras,
          eq(documentosVenda.seguradoraParceiraId, seguradorasParceiras.id),
        )
        .where(
          and(
            ...premioConditions,
            eq(documentosVenda.status, 'ATIVO'),
            isNotNull(documentosVenda.seguradoraParceiraId),
          ),
        )
        .groupBy(
          documentosVenda.seguradoraParceiraId,
          seguradorasParceiras.nomeFantasia,
          seguradorasParceiras.razaoSocial,
        )
        .orderBy(desc(sql`COUNT(DISTINCT ${documentosVenda.clienteId})`)),

      // 16. Renovações vencidas por vendedor
      db
        .select({
          vendedorId: renovacoesComerciais.vendedorId,
          vendedorNome: usuarios.nome,
          count: sql<number>`COUNT(*)`,
        })
        .from(renovacoesComerciais)
        .leftJoin(usuarios, eq(renovacoesComerciais.vendedorId, usuarios.id))
        .where(and(...renovacoesVencidasConditions))
        .groupBy(renovacoesComerciais.vendedorId, usuarios.nome)
        .orderBy(desc(sql`COUNT(*)`)),

      // 17. Cotações paradas por vendedor
      db
        .select({
          vendedorId: cotacoes.vendedorId,
          vendedorNome: usuarios.nome,
          count: sql<number>`COUNT(*)`,
        })
        .from(cotacoes)
        .leftJoin(usuarios, eq(cotacoes.vendedorId, usuarios.id))
        .where(and(...cotacoesParadasConditions))
        .groupBy(cotacoes.vendedorId, usuarios.nome)
        .orderBy(desc(sql`COUNT(*)`)),

      // 18. Prêmio período anterior (tendência)
      anteriorPremioConditions
        ? db
            .select({
              total: sql<number>`COALESCE(SUM(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`,
              count: sql<number>`COUNT(*)`,
            })
            .from(documentosVenda)
            .where(
              and(
                ...anteriorPremioConditions,
                eq(documentosVenda.status, 'ATIVO'),
              ),
            )
        : Promise.resolve(null),

      // 19. Comissão período anterior (tendência)
      anteriorPremioConditions
        ? db
            .select({
              totalComissao: sql<number>`COALESCE(SUM(CAST(${documentosVenda.valorComissao} AS DECIMAL)), 0)`,
              mediaPercentualComissao: sql<number>`COALESCE(AVG(CAST(${documentosVenda.percentualComissao} AS DECIMAL)), 0)`,
            })
            .from(documentosVenda)
            .where(
              and(
                ...anteriorPremioConditions,
                eq(documentosVenda.status, 'ATIVO'),
              ),
            )
        : Promise.resolve(null),

      // 20. Renovações período anterior (tendência)
      anteriorRenovacaoConditions
        ? db
            .select({
              status: renovacoesComerciais.status,
              count: sql<number>`COUNT(*)`,
            })
            .from(renovacoesComerciais)
            .where(and(...anteriorRenovacaoConditions))
            .groupBy(renovacoesComerciais.status)
        : Promise.resolve(null),

      // 21. Renovações previstas a renovar por produto
      db
        .select({
          produto: renovacoesComerciais.produtoDescricao,
          count: sql<number>`COUNT(*)`,
          premioAnterior: sql<number>`COALESCE(SUM(CAST(${renovacoesComerciais.premioAnterior} AS DECIMAL)), 0)`,
        })
        .from(renovacoesComerciais)
        .where(
          and(
            ...renovacaoConditions,
            inArray(renovacoesComerciais.status, [
              'NAO_TRABALHADO',
              'EM_PROSPECCAO',
              'EM_NEGOCIACAO',
              'AGUARDANDO_CLIENTE',
            ]),
          ),
        )
        .groupBy(renovacoesComerciais.produtoDescricao)
        .orderBy(desc(sql`COUNT(*)`)),
    ]);

    // Reduções JS (custo zero — apenas iteração de arrays já em memória)
    const renovacaoTotal = metricasRenovacao.reduce(
      (acc, r) => ({
        total: acc.total + Number(r.count),
        renovados:
          acc.renovados + (r.status === 'RENOVADO' ? Number(r.count) : 0),
        perdidos: acc.perdidos + (r.status === 'PERDIDO' ? Number(r.count) : 0),
        emAndamento:
          acc.emAndamento +
          (['EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE'].includes(
            r.status,
          )
            ? Number(r.count)
            : 0),
      }),
      { total: 0, renovados: 0, perdidos: 0, emAndamento: 0 },
    );

    const endossoResumido = metricasEndosso.reduce(
      (acc, e) => ({
        total: acc.total + Number(e.count),
        aprovados:
          acc.aprovados + (e.status === 'APROVADO' ? Number(e.count) : 0),
        solicitados:
          acc.solicitados + (e.status === 'SOLICITADO' ? Number(e.count) : 0),
        recusados:
          acc.recusados + (e.status === 'RECUSADO' ? Number(e.count) : 0),
      }),
      { total: 0, aprovados: 0, solicitados: 0, recusados: 0 },
    );

    // Calcular anterior para tendências
    const anteriorRenovacaoTotal = anteriorRenovacaoResult
      ? anteriorRenovacaoResult.reduce(
          (acc: any, r: any) => ({
            total: acc.total + Number(r.count),
            renovados:
              acc.renovados + (r.status === 'RENOVADO' ? Number(r.count) : 0),
            emAndamento:
              acc.emAndamento +
              ([
                'EM_PROSPECCAO',
                'EM_NEGOCIACAO',
                'AGUARDANDO_CLIENTE',
              ].includes(r.status)
                ? Number(r.count)
                : 0),
          }),
          { total: 0, renovados: 0, emAndamento: 0 },
        )
      : null;

    const anterior =
      anteriorPremioResult && anteriorComissaoResult && anteriorRenovacaoTotal
        ? {
            premioLiquido: {
              total: Number((anteriorPremioResult as any[])[0]?.total ?? 0),
              count: Number((anteriorPremioResult as any[])[0]?.count ?? 0),
            },
            comissao: {
              totalComissao: Number(
                (anteriorComissaoResult as any[])[0]?.totalComissao ?? 0,
              ),
              mediaPercentualComissao: Number(
                (anteriorComissaoResult as any[])[0]?.mediaPercentualComissao ??
                  0,
              ),
            },
            renovacao: anteriorRenovacaoTotal,
          }
        : null;

    return {
      premioLiquido: {
        resumo: metricasPremioLiquido[0],
        porStatus: premioPorStatus,
      },
      comissao: {
        resumo: metricasComissao[0],
      },
      kanban: {
        porStatus: metricasKanban,
        porPrioridade: metricasPrioridade,
        porTemperatura: metricasTemperatura,
      },
      cadastro: {
        ...metricasCadastro[0],
        clientesAtivos: clientesAtivosDocs[0]?.count ?? 0,
      },
      renovacao: {
        resumo: renovacaoTotal,
        detalhado: metricasRenovacao,
        porProduto: renovacoesPorProduto,
      },
      endosso: {
        resumo: endossoResumido,
        detalhado: metricasEndosso,
      },
      topVendedores,
      seguradoras: {
        metricas: metricasPorSeguradora,
        clientes: clientesPorSeguradora,
      },
      negocioCorretora: {
        resumo: negocioCorretora[0] || {
          totalDocumentos: 0,
          totalPremio: 0,
          totalComissaoVendedor: 0,
          totalComissaoCorretora: 0,
          mediaPercentualCorretora: 0,
        },
        porSeguradora: negocioCorretoraPorSeguradora,
      },
      renovacoesVencidas: {
        total: renovacoesVencidasPorVendedor.reduce(
          (sum, r) => sum + Number(r.count),
          0,
        ),
        porVendedor: renovacoesVencidasPorVendedor,
      },
      cotacoesParadas: {
        total: cotacoesParadasPorVendedor.reduce(
          (sum, r) => sum + Number(r.count),
          0,
        ),
        porVendedor: cotacoesParadasPorVendedor,
      },
      anterior,
      filtros: {
        dataInicio,
        dataFim,
        vendedorId,
        equipeId,
        produtoId,
        seguradoraParceiraId,
        status,
      },
    };
  }

  // GET /metricas/evolucao - Prêmio e comissão agrupados por período
  fastify.get(
    '/evolution',
    {
      schema: {
        tags: ['Métricas'],
        summary: 'Evolução de prêmio e comissão por período',
        ...metricasDocs.evolucao,
      },
    },
    async (request, _reply) => {
      const {
        dataInicio,
        dataFim,
        vendedorId,
        granularidade,
        produtoId,
        status,
      } = request.query;
      const {
        corretoraId,
        sub: usuarioAtualId,
        permissoes,
        isGestor,
        isLiderEquipe,
        isAdmin,
      } = request.user;
      const isGestorOuLider = !!(isGestor || isLiderEquipe);
      const podeVerTodos =
        isAdmin ||
        (permissoes?.includes('relatorios:vendas') && !isGestorOuLider);

      const gran = granularidade ?? 'mes';

      const evolucaoDateCol = sql`COALESCE(
        ${documentosVenda.dataSolicitacaoCadastro},
        CASE WHEN ${documentosVenda.importacaoId} IS NOT NULL
             THEN (${documentosVenda.vigenciaInicio} || ' 12:00:00')::timestamptz
             ELSE ${documentosVenda.createdAt}
        END
      )`;

      const conditions: SQL[] = [
        eq(documentosVenda.corretoraId, corretoraId),
        // Se um status específico foi solicitado, aplica-o; caso contrário filtra apenas ATIVO
        status
          ? eq(documentosVenda.status, status as any)
          : eq(documentosVenda.status, 'ATIVO'),
      ];

      if (dataInicio)
        conditions.push(
          gte(evolucaoDateCol, new Date(dataInicio + 'T00:00:00-03:00')),
        );
      if (dataFim)
        conditions.push(
          lte(evolucaoDateCol, new Date(dataFim + 'T23:59:59.999-03:00')),
        );
      if (produtoId) conditions.push(eq(documentosVenda.produtoId, produtoId));

      const equipeVendedorIds =
        isGestorOuLider && !isAdmin
          ? await resolveEquipeVendedorIds(usuarioAtualId)
          : null;

      if (vendedorId) {
        if (equipeVendedorIds && !equipeVendedorIds.includes(vendedorId)) {
          conditions.push(
            inArray(documentosVenda.vendedorId, equipeVendedorIds),
          );
        } else {
          conditions.push(eq(documentosVenda.vendedorId, vendedorId));
        }
      } else if (podeVerTodos) {
        // sem filtro
      } else if (equipeVendedorIds) {
        conditions.push(inArray(documentosVenda.vendedorId, equipeVendedorIds));
      } else {
        conditions.push(eq(documentosVenda.vendedorId, usuarioAtualId));
      }

      // Determina truncamento e formato de saída pela granularidade
      // Usa COALESCE(dataSolicitacaoCadastro, createdAt) como "data de produção"
      let selectPeriodo: SQL<string>;
      let truncExpr: SQL;

      if (gran === 'semana') {
        truncExpr = sql`DATE_TRUNC('week', ${evolucaoDateCol}::date)`;
        selectPeriodo = sql<string>`TO_CHAR(DATE_TRUNC('week', ${evolucaoDateCol}::date), 'YYYY-MM-DD')`;
      } else if (gran === 'dia') {
        truncExpr = sql`${evolucaoDateCol}::date`;
        selectPeriodo = sql<string>`TO_CHAR(${evolucaoDateCol}::date, 'YYYY-MM-DD')`;
      } else {
        truncExpr = sql`DATE_TRUNC('month', ${evolucaoDateCol}::date)`;
        selectPeriodo = sql<string>`TO_CHAR(DATE_TRUNC('month', ${evolucaoDateCol}::date), 'YYYY-MM')`;
      }

      const rows = await db
        .select({
          periodo: selectPeriodo,
          totalPremio: sql<number>`COALESCE(SUM(CAST(${documentosVenda.premioLiquido} AS DECIMAL)), 0)`,
          mediaPercentualComissao: sql<number>`COALESCE(AVG(CAST(${documentosVenda.percentualComissao} AS DECIMAL)), 0)`,
        })
        .from(documentosVenda)
        .where(and(...conditions))
        .groupBy(truncExpr)
        .orderBy(truncExpr);

      // Preenche períodos sem dados com zeros para garantir série contínua
      const evolucao = fillGaps(rows, gran, dataInicio, dataFim);

      return { success: true as const, data: { evolucao } };
    },
  );

  // GET /metricas/detalhes - Detalhes por categoria
  fastify.get(
    '/details',
    {
      schema: {
        tags: ['Métricas'],
        summary: 'Detalhes de métricas por categoria',
        description:
          'Retorna listagem detalhada de registros para uma categoria específica (últimos 100 registros). Útil para drill-down em métricas consolidadas. Suporta filtros por período e vendedor.',
        ...metricasDocs.detalhes,
      },
    },
    async (request, reply) => {
      const { categoria, dataInicio, dataFim, vendedorId, equipeId } = request.query;
      const {
        corretoraId,
        sub: usuarioAtualId,
        permissoes,
        isGestor,
        isLiderEquipe,
        isAdmin,
      } = request.user;

      const isGestorOuLider = !!(isGestor || isLiderEquipe);
      const podeVerTodos =
        isAdmin ||
        (permissoes?.includes('relatorios:vendas') && !isGestorOuLider);

      const equipeVendedorIds =
        isGestorOuLider && !isAdmin
          ? await resolveEquipeVendedorIds(usuarioAtualId)
          : null;

      // Helper local para aplicar filtro de vendedor de forma consistente
      const applyVendedorFilter = (conditions: any[], col: any) => {
        if (vendedorId) {
          if (equipeVendedorIds && !equipeVendedorIds.includes(vendedorId)) {
            conditions.push(inArray(col, equipeVendedorIds));
          } else {
            conditions.push(eq(col, vendedorId));
          }
        } else if (podeVerTodos) {
          // sem filtro
        } else if (equipeVendedorIds) {
          conditions.push(inArray(col, equipeVendedorIds));
        } else {
          conditions.push(eq(col, usuarioAtualId));
        }
      };

      // Construir condições base para documentos de venda
      const conditions = [eq(documentosVenda.corretoraId, corretoraId)];

      const detalhesDateCol = sql`COALESCE(
        ${documentosVenda.dataSolicitacaoCadastro},
        CASE WHEN ${documentosVenda.importacaoId} IS NOT NULL
             THEN (${documentosVenda.vigenciaInicio} || ' 12:00:00')::timestamptz
             ELSE ${documentosVenda.createdAt}
        END
      )`;

      if (dataInicio) {
        conditions.push(
          gte(detalhesDateCol, new Date(dataInicio + 'T00:00:00-03:00')),
        );
      }
      if (dataFim) {
        conditions.push(
          lte(detalhesDateCol, new Date(dataFim + 'T23:59:59.999-03:00')),
        );
      }
      applyVendedorFilter(conditions, documentosVenda.vendedorId);

      let detalhes: any = [];

      switch (categoria) {
        case 'premio_liquido':
        case 'comissao':
          detalhes = await db
            .select({
              id: documentosVenda.id,
              numeroDocumento: documentosVenda.numeroDocumento,
              clienteNome: clientes.nome,
              produtoNome: produtos.nomeProduto,
              vendedorNome: usuarios.nome,
              premioLiquido: documentosVenda.premioLiquido,
              valorComissao: documentosVenda.valorComissao,
              percentualComissao: documentosVenda.percentualComissao,
              negocioCorretora: documentosVenda.negocioCorretora,
              valorComissaoCorretora: documentosVenda.valorComissaoCorretora,
              status: documentosVenda.status,
              vigenciaInicio: documentosVenda.vigenciaInicio,
              vigenciaFim: documentosVenda.vigenciaFim,
              createdAt: documentosVenda.createdAt,
            })
            .from(documentosVenda)
            .leftJoin(clientes, eq(documentosVenda.clienteId, clientes.id))
            .leftJoin(produtos, eq(documentosVenda.produtoId, produtos.id))
            .leftJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
            .where(and(...conditions))
            .orderBy(desc(documentosVenda.createdAt))
            .limit(100);
          break;

        case 'status_kanban':
          const oportunidadeConditions = [
            eq(oportunidades.corretoraId, corretoraId),
          ];
          if (dataInicio) {
            oportunidadeConditions.push(
              gte(
                oportunidades.createdAt,
                new Date(dataInicio + 'T00:00:00-03:00'),
              ),
            );
          }
          if (dataFim) {
            oportunidadeConditions.push(
              lte(
                oportunidades.createdAt,
                new Date(dataFim + 'T23:59:59.999-03:00'),
              ),
            );
          }
          applyVendedorFilter(oportunidadeConditions, oportunidades.vendedorId);

          detalhes = await db
            .select({
              id: oportunidades.id,
              nomeCliente: oportunidades.nomeCliente,
              vendedorNome: usuarios.nome,
              status: oportunidades.status,
              prioridade: oportunidades.prioridade,
              temperatura: oportunidades.temperatura,
              premioEstimado: oportunidades.premioEstimado,
              valorFechado: oportunidades.valorFechado,
              dataVencimento: oportunidades.dataVencimento,
              dataFechamento: oportunidades.dataFechamento,
              createdAt: oportunidades.createdAt,
            })
            .from(oportunidades)
            .leftJoin(usuarios, eq(oportunidades.vendedorId, usuarios.id))
            .where(and(...oportunidadeConditions))
            .orderBy(desc(oportunidades.createdAt))
            .limit(100);
          break;

        case 'cadastro':
          const cadastroConditions = [eq(clientes.corretoraId, corretoraId)];
          if (dataInicio) {
            cadastroConditions.push(
              gte(clientes.createdAt, new Date(dataInicio + 'T00:00:00-03:00')),
            );
          }
          if (dataFim) {
            cadastroConditions.push(
              lte(
                clientes.createdAt,
                new Date(dataFim + 'T23:59:59.999-03:00'),
              ),
            );
          }
          applyVendedorFilter(cadastroConditions, clientes.vendedorId);

          detalhes = await db
            .select({
              id: clientes.id,
              nome: clientes.nome,
              tipoPessoa: clientes.tipoPessoa,
              cpf: clientes.cpf,
              cnpj: clientes.cnpj,
              email: clientes.email,
              telefone: clientes.telefone,
              vendedorNome: usuarios.nome,
              ativo: clientes.ativo,
              createdAt: clientes.createdAt,
            })
            .from(clientes)
            .leftJoin(usuarios, eq(clientes.vendedorId, usuarios.id))
            .where(and(...cadastroConditions))
            .orderBy(desc(clientes.createdAt))
            .limit(100);
          break;

        case 'renovacao':
          const renovacaoConditions = [
            eq(renovacoesComerciais.corretoraId, corretoraId),
          ];
          if (dataInicio) {
            renovacaoConditions.push(
              gte(renovacoesComerciais.dataVencimento, dataInicio),
            );
          }
          if (dataFim) {
            renovacaoConditions.push(
              lte(renovacoesComerciais.dataVencimento, dataFim),
            );
          }
          applyVendedorFilter(
            renovacaoConditions,
            renovacoesComerciais.vendedorId,
          );

          detalhes = await db
            .select({
              id: renovacoesComerciais.id,
              vendedorNome: usuarios.nome,
              status: renovacoesComerciais.status,
              premioAnterior: renovacoesComerciais.premioAnterior,
              premioNovo: renovacoesComerciais.premioNovo,
              valorComissaoAnterior: renovacoesComerciais.valorComissaoAnterior,
              valorComissaoNovo: renovacoesComerciais.valorComissaoNovo,
              dataVencimento: renovacoesComerciais.dataVencimento,
              dataFinalizacao: renovacoesComerciais.dataFinalizacao,
              motivoPerda: renovacoesComerciais.motivoPerda,
              createdAt: renovacoesComerciais.createdAt,
            })
            .from(renovacoesComerciais)
            .leftJoin(
              usuarios,
              eq(renovacoesComerciais.vendedorId, usuarios.id),
            )
            .where(and(...renovacaoConditions))
            .orderBy(desc(renovacoesComerciais.createdAt))
            .limit(100);
          break;

        case 'endosso':
          const endossoConditions = [eq(endossos.corretoraId, corretoraId)];
          if (dataInicio) {
            endossoConditions.push(
              gte(
                endossos.dataSolicitacao,
                new Date(dataInicio + 'T00:00:00-03:00'),
              ),
            );
          }
          if (dataFim) {
            endossoConditions.push(
              lte(
                endossos.dataSolicitacao,
                new Date(dataFim + 'T23:59:59.999-03:00'),
              ),
            );
          }
          applyVendedorFilter(endossoConditions, endossos.vendedorId);

          detalhes = await db
            .select({
              id: endossos.id,
              numeroEndosso: endossos.numeroEndosso,
              vendedorNome: usuarios.nome,
              tipoEndosso: endossos.tipoEndosso,
              status: endossos.status,
              premioAnterior: endossos.premioAnterior,
              premioNovo: endossos.premioNovo,
              diferencaPremio: endossos.diferencaPremio,
              dataSolicitacao: endossos.dataSolicitacao,
              dataAprovacao: endossos.dataAprovacao,
              dataRecusa: endossos.dataRecusa,
              motivoRecusa: endossos.motivoRecusa,
              createdAt: endossos.createdAt,
            })
            .from(endossos)
            .leftJoin(usuarios, eq(endossos.vendedorId, usuarios.id))
            .where(and(...endossoConditions))
            .orderBy(desc(endossos.createdAt))
            .limit(100);
          break;

        case 'renovacoes_vencidas': {
          const hoje = new Date().toISOString().split('T')[0];
          const rvConditions: any[] = [
            eq(renovacoesComerciais.corretoraId, corretoraId),
            sql`${renovacoesComerciais.status} IN ('NAO_TRABALHADO','EM_PROSPECCAO','EM_NEGOCIACAO','AGUARDANDO_CLIENTE')`,
            sql`${renovacoesComerciais.dataVencimento} < ${hoje}`,
          ];
          applyVendedorFilter(rvConditions, renovacoesComerciais.vendedorId);
          detalhes = await db
            .select({
              id: renovacoesComerciais.id,
              vendedorNome: usuarios.nome,
              clienteNome: clientes.nome,
              produtoDescricao: renovacoesComerciais.produtoDescricao,
              itemDescricao: renovacoesComerciais.itemDescricao,
              premioAnterior: renovacoesComerciais.premioAnterior,
              status: renovacoesComerciais.status,
              dataVencimento: renovacoesComerciais.dataVencimento,
            })
            .from(renovacoesComerciais)
            .leftJoin(usuarios, eq(renovacoesComerciais.vendedorId, usuarios.id))
            .leftJoin(clientes, eq(renovacoesComerciais.clienteId, clientes.id))
            .where(and(...rvConditions))
            .orderBy(renovacoesComerciais.dataVencimento)
            .limit(200);
          break;
        }

        case 'cotacoes_paradas': {
          const cincosDiasAtras = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
          const cpConditions: any[] = [
            eq(cotacoes.corretoraId, corretoraId),
            eq(cotacoes.status, 'EM_ELABORACAO'),
            isNull(cotacoes.deletedAt),
            lt(cotacoes.updatedAt, cincosDiasAtras),
          ];
          applyVendedorFilter(cpConditions, cotacoes.vendedorId);
          detalhes = await db
            .select({
              id: cotacoes.id,
              numeroCotacao: cotacoes.numeroCotacao,
              vendedorNome: usuarios.nome,
              clienteNome: clientes.nome,
              produtoNome: produtos.nomeProduto,
              premioLiquido: cotacoes.premioLiquido,
              updatedAt: cotacoes.updatedAt,
            })
            .from(cotacoes)
            .leftJoin(usuarios, eq(cotacoes.vendedorId, usuarios.id))
            .leftJoin(clientes, eq(cotacoes.clienteId, clientes.id))
            .leftJoin(produtos, eq(cotacoes.produtoId, produtos.id))
            .where(and(...cpConditions))
            .orderBy(cotacoes.updatedAt)
            .limit(200);
          break;
        }
      }

      return ok({ categoria, detalhes, total: detalhes.length });
    },
  );

  // GET /metricas/vendedores - Lista de vendedores para filtro
  fastify.get(
    '/sellers',
    {
      schema: {
        tags: ['Métricas'],
        summary: 'Listar vendedores disponíveis',
        description:
          'Retorna lista de vendedores ativos para uso em filtros de métricas. Administradores veem todos os vendedores, vendedores veem apenas a si mesmos.',
        ...metricasDocs.vendedores,
      },
    },
    async (request, reply) => {
      const {
        corretoraId,
        permissoes,
        sub: usuarioAtualId,
        isGestor,
        isLiderEquipe,
        isAdmin,
      } = request.user;

      // Admin sempre vê tudo. Gestores/líderes sem isAdmin ficam limitados à equipe.
      const isGestorOuLider = !!(isGestor || isLiderEquipe);
      const podeVerTodos =
        isAdmin ||
        (permissoes?.includes('relatorios:vendas') && !isGestorOuLider);

      const vendedorColumns = {
        id: true,
        nome: true,
        email: true,
      } as const;
      const vendedorWith = {
        equipe: { columns: { id: true, nome: true } },
      } as any;

      let vendedores;
      if (isAdmin || podeVerTodos) {
        // Admin ou usuário com relatorios:vendas sem restrição de equipe: vê todos da corretora
        vendedores = await db.query.usuarios.findMany({
          where: and(
            eq(usuarios.corretoraId, corretoraId),
            eq(usuarios.ativo, true),
          ),
          columns: vendedorColumns,
          with: vendedorWith,
          orderBy: [usuarios.nome],
        });
      } else if (isGestorOuLider) {
        // Gestor: vê apenas os membros da própria equipe + si mesmo
        const equipeLiderada = await db.query.equipes.findFirst({
          where: eq(equipes.gestorId, usuarioAtualId),
        });
        if (equipeLiderada) {
          const membros = await db.query.usuarios.findMany({
            where: and(
              eq(usuarios.equipeId, equipeLiderada.id),
              eq(usuarios.ativo, true),
            ),
            columns: vendedorColumns,
            with: vendedorWith,
            orderBy: [usuarios.nome],
          });
          // Garante que o próprio gestor aparece na lista mesmo se não for membro
          const gestorJaMembro = membros.some((v) => v.id === usuarioAtualId);
          if (!gestorJaMembro) {
            const gestorUser = await db.query.usuarios.findFirst({
              where: and(
                eq(usuarios.id, usuarioAtualId),
                eq(usuarios.corretoraId, corretoraId),
              ),
              columns: vendedorColumns,
              with: vendedorWith,
            });
            vendedores = gestorUser ? [gestorUser, ...membros] : membros;
          } else {
            vendedores = membros;
          }
        } else {
          // Gestor sem equipe atribuída: retorna apenas si mesmo
          vendedores = await db.query.usuarios.findMany({
            where: and(
              eq(usuarios.id, usuarioAtualId),
              eq(usuarios.corretoraId, corretoraId),
            ),
            columns: vendedorColumns,
            with: vendedorWith,
          });
        }
      } else {
        // Vendedor comum: apenas si mesmo
        vendedores = await db.query.usuarios.findMany({
          where: and(
            eq(usuarios.id, usuarioAtualId),
            eq(usuarios.corretoraId, corretoraId),
          ),
          columns: vendedorColumns,
          with: vendedorWith,
        });
      }

      return ok(vendedores as any);
    },
  );

  // GET /metricas/storage - Métricas de armazenamento da corretora
  fastify.get(
    '/storage',
    {
      schema: {
        tags: ['Métricas'],
        summary: 'Métricas de armazenamento',
        description:
          'Retorna uso atual de armazenamento da corretora: total de arquivos, bytes utilizados por tipo (cotações, documentos, chat), status de limites e maiores arquivos.',
        ...metricasDocs.storage,
      },
    },
    async (request, reply) => {
      const { corretoraId } = request.user;

      const currentUsage =
        await MetricsService.calculateCurrentUsage(corretoraId);
      const limitStatus = await MetricsService.checkLimits(corretoraId);
      const largestFiles = await MetricsService.getLargestFiles(
        corretoraId,
        10,
      );

      return {
        success: true as const,
        data: {
          usage: {
            totalFiles: currentUsage.totalArquivos,
            totalBytes: currentUsage.totalBytes,
            byType: {
              cotacoes: {
                bytes: currentUsage.byType.cotacoes,
                formatted: MetricsService.formatBytes(
                  currentUsage.byType.cotacoes,
                ),
              },
              documentos: {
                bytes: currentUsage.byType.documentos,
                formatted: MetricsService.formatBytes(
                  currentUsage.byType.documentos,
                ),
              },
              chat: {
                bytes: currentUsage.byType.chat,
                formatted: MetricsService.formatBytes(
                  currentUsage.byType.chat,
                ),
              },
            },
            formatted: MetricsService.formatBytes(currentUsage.totalBytes),
          },
          limits: limitStatus,
          largestFiles: largestFiles.slice(0, 10),
        },
      };
    },
  );

  // GET /metricas/storage/history - Histórico de uso de storage
  fastify.get(
    '/storage/history',
    {
      schema: {
        tags: ['Métricas'],
        summary: 'Histórico de uso de armazenamento',
        description:
          'Retorna série temporal do uso de armazenamento da corretora. Padrão: últimos 30 dias. Útil para visualizar tendências e crescimento.',
        ...metricasDocs.storageHistory,
      },
    },
    async (request, reply) => {
      const { corretoraId } = request.user;
      const days = request.query.days ?? 30;

      const history = await MetricsService.getUsageHistory(corretoraId, days);

      return { success: true as const, data: { history, days } };
    },
  );

  // GET /metricas/storage/costs - Custos de armazenamento
  fastify.get(
    '/storage/costs',
    {
      schema: {
        tags: ['Métricas'],
        summary: 'Custos estimados de armazenamento',
        description:
          'Calcula e retorna estimativa de custos de armazenamento baseado no uso atual. Inclui custo por GB e projeção mensal.',
        ...metricasDocs.storageCosts,
      },
    },
    async (request, reply) => {
      const { corretoraId } = request.user;

      const costs = await MetricsService.calculateCosts(corretoraId);

      return {
        success: true as const,
        data: {
          costs: {
            ...costs,
            storageFormatted: MetricsService.formatBytes(
              costs.storageGB * 1024 * 1024 * 1024,
            ),
          },
        },
      };
    },
  );

  // ─── Comissão por tipo de seguro ────────────────────────────────────────────
  fastify.get(
    '/commissions-by-insurance-type',
    {
      schema: {
        tags: ['Métricas'],
        summary: 'Comissão por vendedor e tipo de seguro',
        ...metricasDocs.comissaoPorTipoSeguro,
      },
    },
    async (request) => {
      const { vendedorId, equipeId, dataInicio, dataFim } = request.query;

      const filters: any[] = [
        eq(documentosVenda.corretoraId, request.corretoraId),
        isNull(documentosVenda.deletedAt),
        inArray(documentosVenda.status, ['ATIVO', 'VENDA_CONFIRMADA', 'AGUARDANDO_CADASTRO']),
      ];

      if (vendedorId) filters.push(eq(documentosVenda.vendedorId, vendedorId));
      if (dataInicio) filters.push(gte(documentosVenda.createdAt, new Date(dataInicio)));
      if (dataFim) filters.push(lte(documentosVenda.createdAt, new Date(dataFim)));

      if (equipeId) {
        const membros = await db
          .select({ id: usuarios.id })
          .from(usuarios)
          .where(and(eq(usuarios.equipeId, equipeId), eq(usuarios.corretoraId, request.corretoraId)));
        const membroIds = membros.map((m) => m.id);
        if (membroIds.length > 0) {
          filters.push(inArray(documentosVenda.vendedorId, membroIds));
        }
      }

      const rows = await db
        .select({
          vendedorId: documentosVenda.vendedorId,
          nomeUsuario: usuarios.nome,
          tipoSeguro: produtos.tipoSeguro,
          totalComissao: sql<number>`COALESCE(SUM(${documentosVenda.valorComissao}::numeric), 0)`,
          quantidadeVendas: sql<number>`COUNT(*)`,
        })
        .from(documentosVenda)
        .innerJoin(usuarios, eq(documentosVenda.vendedorId, usuarios.id))
        .innerJoin(produtos, eq(documentosVenda.produtoId, produtos.id))
        .where(and(...filters))
        .groupBy(documentosVenda.vendedorId, usuarios.nome, produtos.tipoSeguro)
        .orderBy(usuarios.nome, produtos.tipoSeguro);

      return { success: true as const, data: rows };
    },
  );

  // ─── Breakdown por papel do vendedor ────────────────────────────────────────
  fastify.get(
    '/seller-role',
    {
      schema: {
        tags: ['Métricas'],
        summary: 'Quantidade de cotações por papel do vendedor (COTADOR/FECHADOR)',
        ...metricasDocs.papelVendedor,
      },
    },
    async (request) => {
      const { vendedorId, dataInicio, dataFim } = request.query;

      const filters: any[] = [
        eq(cotacaoVendedores.cotacaoId, cotacoes.id),
        eq(cotacoes.corretoraId, request.corretoraId),
      ];

      if (vendedorId) filters.push(eq(cotacaoVendedores.vendedorId, vendedorId));
      if (dataInicio) filters.push(gte(cotacoes.createdAt, new Date(dataInicio)));
      if (dataFim) filters.push(lte(cotacoes.createdAt, new Date(dataFim)));

      const rows = await db
        .select({
          vendedorId: cotacaoVendedores.vendedorId,
          nome: usuarios.nome,
          papel: cotacaoVendedores.papel,
          quantidade: sql<number>`COUNT(*)`,
        })
        .from(cotacaoVendedores)
        .innerJoin(cotacoes, eq(cotacaoVendedores.cotacaoId, cotacoes.id))
        .innerJoin(usuarios, eq(cotacaoVendedores.vendedorId, usuarios.id))
        .where(and(...filters))
        .groupBy(cotacaoVendedores.vendedorId, usuarios.nome, cotacaoVendedores.papel)
        .orderBy(usuarios.nome);

      return { success: true as const, data: rows };
    },
  );
};

export default metricasRoutes;
