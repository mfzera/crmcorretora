import { db, documentosVenda, renovacoesComerciais, cotacoes, metas, missoes, usuarios, equipes, usuarioBadges, badgeTipos, notificacoes } from '@ecotech/shared/database';
import { eq, and, inArray, isNull, isNotNull, gte, lte, sql } from 'drizzle-orm';

export type TipoMetrica = 'novos_seguros' | 'renovacoes' | 'cotacoes' | 'valor_premio' | 'taxa_renovacao' | 'premio_renovacao';

/**
 * Calcula o progresso atual de uma métrica para um conjunto de usuários dentro de um período.
 */
export async function calculateProgress(
  corretoraId: string,
  tipoMetrica: TipoMetrica,
  dataInicio: string, // ISO date string 'YYYY-MM-DD'
  dataFim: string,
  usuarioIds: string[],
): Promise<number> {
  if (usuarioIds.length === 0) return 0;

  switch (tipoMetrica) {
    case 'novos_seguros': {
      // Conta documentos de venda aprovados pelo cadastro cuja cotação de origem tem situacao='NOVO'
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documentosVenda)
        .innerJoin(
          cotacoes,
          and(
            eq(cotacoes.documentoVendaId, documentosVenda.id),
            eq(cotacoes.situacao, 'NOVO'),
            isNull(cotacoes.deletedAt),
          ),
        )
        .where(
          and(
            eq(documentosVenda.corretoraId, corretoraId),
            inArray(documentosVenda.vendedorId, usuarioIds),
            isNull(documentosVenda.deletedAt),
            isNotNull(documentosVenda.dataAprovacaoCadastro),
            gte(documentosVenda.dataAprovacaoCadastro, new Date(dataInicio)),
            lte(documentosVenda.dataAprovacaoCadastro, new Date(dataFim + 'T23:59:59Z')),
          ),
        );
      return result[0]?.count ?? 0;
    }

    case 'renovacoes': {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(renovacoesComerciais)
        .where(
          and(
            eq(renovacoesComerciais.corretoraId, corretoraId),
            inArray(renovacoesComerciais.vendedorId, usuarioIds),
            eq(renovacoesComerciais.status, 'RENOVADO'),
            gte(renovacoesComerciais.dataFinalizacao, new Date(dataInicio)),
            lte(renovacoesComerciais.dataFinalizacao, new Date(dataFim + 'T23:59:59Z')),
          ),
        );
      return result[0]?.count ?? 0;
    }

    case 'cotacoes': {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(cotacoes)
        .where(
          and(
            eq(cotacoes.corretoraId, corretoraId),
            inArray(cotacoes.vendedorId, usuarioIds),
            isNull(cotacoes.deletedAt),
            gte(cotacoes.createdAt, new Date(dataInicio)),
            lte(cotacoes.createdAt, new Date(dataFim + 'T23:59:59Z')),
          ),
        );
      return result[0]?.count ?? 0;
    }

    case 'valor_premio': {
      const result = await db
        .select({ total: sql<number>`coalesce(sum(premio_liquido::numeric), 0)::float` })
        .from(documentosVenda)
        .where(
          and(
            eq(documentosVenda.corretoraId, corretoraId),
            inArray(documentosVenda.vendedorId, usuarioIds),
            inArray(documentosVenda.status, ['VENDA_CONFIRMADA', 'ATIVO']),
            isNull(documentosVenda.deletedAt),
            gte(documentosVenda.createdAt, new Date(dataInicio)),
            lte(documentosVenda.createdAt, new Date(dataFim + 'T23:59:59Z')),
          ),
        );
      return result[0]?.total ?? 0;
    }

    case 'taxa_renovacao': {
      // Base: todas as renovações com dataVencimento no período (elegíveis)
      const baseResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(renovacoesComerciais)
        .where(
          and(
            eq(renovacoesComerciais.corretoraId, corretoraId),
            inArray(renovacoesComerciais.vendedorId, usuarioIds),
            gte(renovacoesComerciais.dataVencimento, dataInicio),
            lte(renovacoesComerciais.dataVencimento, dataFim),
          ),
        );
      const base = baseResult[0]?.count ?? 0;
      if (base === 0) return 0;

      // Renovadas: do mesmo conjunto, apenas as com status RENOVADO
      const renovadasResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(renovacoesComerciais)
        .where(
          and(
            eq(renovacoesComerciais.corretoraId, corretoraId),
            inArray(renovacoesComerciais.vendedorId, usuarioIds),
            gte(renovacoesComerciais.dataVencimento, dataInicio),
            lte(renovacoesComerciais.dataVencimento, dataFim),
            eq(renovacoesComerciais.status, 'RENOVADO'),
          ),
        );
      const renovadas = renovadasResult[0]?.count ?? 0;

      return Math.round((renovadas / base) * 1000) / 10; // 1 casa decimal
    }

    case 'premio_renovacao': {
      const result = await db
        .select({ total: sql<number>`coalesce(sum(premio_novo::numeric), 0)::float` })
        .from(renovacoesComerciais)
        .where(
          and(
            eq(renovacoesComerciais.corretoraId, corretoraId),
            inArray(renovacoesComerciais.vendedorId, usuarioIds),
            eq(renovacoesComerciais.status, 'RENOVADO'),
            gte(renovacoesComerciais.dataFinalizacao, new Date(dataInicio)),
            lte(renovacoesComerciais.dataFinalizacao, new Date(dataFim + 'T23:59:59Z')),
          ),
        );
      return result[0]?.total ?? 0;
    }

    default:
      return 0;
  }
}

/**
 * Resolve os IDs de usuários elegíveis para uma meta/missão com base no escopo.
 */
export async function resolveUserIds(
  corretoraId: string,
  equipeId: string | null | undefined,
  usuarioId: string | null | undefined,
): Promise<string[]> {
  if (usuarioId) {
    return [usuarioId];
  }

  if (equipeId) {
    const membros = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.corretoraId, corretoraId),
          eq(usuarios.equipeId, equipeId),
          isNull(usuarios.deletedAt),
        ),
      );
    return membros.map((m) => m.id);
  }

  // Corretora-wide: todos usuários ativos
  const todos = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.corretoraId, corretoraId), isNull(usuarios.deletedAt)));
  return todos.map((u) => u.id);
}

/**
 * Concede um badge ao usuário e cria uma notificação.
 */
export async function awardBadge(params: {
  corretoraId: string;
  usuarioId: string;
  badgeSlug: string;
  metaId?: string;
  missaoId?: string;
  concedidoPorId?: string;
  observacao?: string;
}) {
  const badgeTipo = await db.query.badgeTipos.findFirst({
    where: eq(badgeTipos.slug, params.badgeSlug),
  });
  if (!badgeTipo) return;

  await db.insert(usuarioBadges).values({
    corretoraId: params.corretoraId,
    usuarioId: params.usuarioId,
    badgeTipoId: badgeTipo.id,
    metaId: params.metaId ?? null,
    missaoId: params.missaoId ?? null,
    concedidoPorId: params.concedidoPorId ?? null,
    observacao: params.observacao ?? null,
  });

  await db.insert(notificacoes).values({
    corretoraId: params.corretoraId,
    usuarioId: params.usuarioId,
    tipo: 'gamificacao',
    titulo: `Badge conquistado: ${badgeTipo.nome}`,
    mensagem: params.observacao ?? `Parabéns! Você ganhou o badge "${badgeTipo.nome}".`,
    prioridade: 'media',
    linkAcao: '/meu-desempenho',
    metadata: {
      badgeTipoId: badgeTipo.id,
      badgeSlug: params.badgeSlug,
      badgeNome: badgeTipo.nome,
      badgeDescricao: badgeTipo.descricao ?? null,
      badgeIcone: badgeTipo.icone,
      badgeCor: badgeTipo.cor,
      metaId: params.metaId ?? null,
      missaoId: params.missaoId ?? null,
    },
  });
}

/**
 * Verifica todas as metas ativas do usuário e conclui/expira conforme necessário.
 * Chamado após operações que podem avançar o progresso.
 */
export async function checkPendingGoals(corretoraId: string, usuarioId: string) {
  const hoje = new Date().toISOString().split('T')[0];

  const metasAtivas = await db.query.metas.findMany({
    where: and(
      eq(metas.corretoraId, corretoraId),
      eq(metas.status, 'ATIVA'),
      isNull(metas.deletedAt),
    ),
  });

  for (const meta of metasAtivas) {
    // Expira se passou do prazo
    if (meta.dataFim < hoje) {
      await db.update(metas).set({ status: 'EXPIRADA', updatedAt: new Date() }).where(eq(metas.id, meta.id));
      continue;
    }

    // Verifica se o usuário está no escopo desta meta
    const usuarioIds = await resolveUserIds(corretoraId, meta.equipeId, meta.usuarioId);
    if (!usuarioIds.includes(usuarioId)) continue;

    const atual = await calculateProgress(corretoraId, meta.tipoMetrica, meta.dataInicio, meta.dataFim, usuarioIds);
    if (atual >= parseFloat(meta.valorAlvo)) {
      await db.update(metas).set({ status: 'CONCLUIDA', updatedAt: new Date() }).where(eq(metas.id, meta.id));

      // Conceder badge "meta_batida" a todos os usuários no escopo
      for (const uid of usuarioIds) {
        await awardBadge({
          corretoraId,
          usuarioId: uid,
          badgeSlug: 'meta_batida',
          metaId: meta.id,
        });
      }
    }
  }
}

/**
 * Verifica missões ativas do usuário e conclui/expira conforme necessário.
 */
export async function checkPendingMissions(corretoraId: string, usuarioId: string) {
  const hoje = new Date().toISOString().split('T')[0];

  const missoesAtivas = await db.query.missoes.findMany({
    where: and(
      eq(missoes.corretoraId, corretoraId),
      inArray(missoes.status, ['PENDENTE', 'EM_ANDAMENTO']),
      isNull(missoes.deletedAt),
    ),
  });

  for (const missao of missoesAtivas) {
    // Expira se passou do prazo
    if (missao.prazo < hoje) {
      await db.update(missoes).set({ status: 'EXPIRADA', updatedAt: new Date() }).where(eq(missoes.id, missao.id));
      continue;
    }

    const usuarioIds = await resolveUserIds(corretoraId, missao.equipeId, missao.usuarioId);
    if (!usuarioIds.includes(usuarioId)) continue;

    const atual = await calculateProgress(corretoraId, missao.tipoMetrica, missao.dataInicio, missao.prazo, usuarioIds);
    if (atual >= parseFloat(missao.valorAlvo)) {
      await db.update(missoes).set({ status: 'CONCLUIDA', updatedAt: new Date() }).where(eq(missoes.id, missao.id));

      if (missao.badgeTipoId) {
        // Buscar o slug do badge pelo ID
        const bt = await db.query.badgeTipos.findFirst({ where: eq(badgeTipos.id, missao.badgeTipoId) });
        if (bt) {
          for (const uid of usuarioIds) {
            await awardBadge({
              corretoraId,
              usuarioId: uid,
              badgeSlug: bt.slug,
              missaoId: missao.id,
              observacao: missao.badgeObservacao ?? undefined,
            });
          }
        }
      } else {
        for (const uid of usuarioIds) {
          await awardBadge({
            corretoraId,
            usuarioId: uid,
            badgeSlug: 'missao_cumprida',
            missaoId: missao.id,
          });
        }
      }
    }
  }
}
