/**
 * Sistema de Reconhecimento — concede badges automáticos baseados em volume,
 * cadência, conversão, relacionamento e marcos. Idempotente: só concede se o
 * usuário ainda não tiver o badge.
 *
 * Categorias:
 * 1. Volume vitalício (novos seguros, renovações, cotações) — bronze→diamante
 * 2. Consistência (streaks de dias úteis, mês de fogo, hat-trick)
 * 3. Conversão e qualidade (caçador, tricampeão, guardião, ticket alto)
 * 4. Relacionamento (pós-venda, comunicador, atento)
 * 5. Marcos (estreante, primeira venda, primeira renovação, 1 ano de casa)
 */

import {
  db,
  documentosVenda,
  cotacoes,
  renovacoesComerciais,
  usuarios,
  usuarioBadges,
  badgeTipos,
  metas,
  sinistros,
  mensagensChat,
} from '@ecotech/shared/database';
import { eq, and, isNull, isNotNull, inArray, gte, lte, sql, asc } from 'drizzle-orm';
import { awardBadge } from './progresso-metrica.js';

// ==================== TIPOS DE TIER (vitalício, acumulativo) ====================

export interface VolumeTier {
  slug: string;
  metrica: 'novos_seguros' | 'renovacoes' | 'cotacoes';
  limiar: number;
}

export const VOLUME_TIERS: VolumeTier[] = [
  // Novos seguros
  { slug: 'vol_seguros_bronze',   metrica: 'novos_seguros', limiar: 5 },
  { slug: 'vol_seguros_prata',    metrica: 'novos_seguros', limiar: 25 },
  { slug: 'vol_seguros_ouro',     metrica: 'novos_seguros', limiar: 100 },
  { slug: 'vol_seguros_platina',  metrica: 'novos_seguros', limiar: 250 },
  { slug: 'vol_seguros_diamante', metrica: 'novos_seguros', limiar: 500 },
  // Renovações
  { slug: 'vol_renov_bronze',   metrica: 'renovacoes', limiar: 5 },
  { slug: 'vol_renov_prata',    metrica: 'renovacoes', limiar: 25 },
  { slug: 'vol_renov_ouro',     metrica: 'renovacoes', limiar: 100 },
  { slug: 'vol_renov_platina',  metrica: 'renovacoes', limiar: 250 },
  { slug: 'vol_renov_diamante', metrica: 'renovacoes', limiar: 500 },
  // Cotações
  { slug: 'vol_cot_bronze',   metrica: 'cotacoes', limiar: 50 },
  { slug: 'vol_cot_prata',    metrica: 'cotacoes', limiar: 250 },
  { slug: 'vol_cot_ouro',     metrica: 'cotacoes', limiar: 1000 },
  { slug: 'vol_cot_platina',  metrica: 'cotacoes', limiar: 2500 },
  { slug: 'vol_cot_diamante', metrica: 'cotacoes', limiar: 5000 },
];

const STREAK_TIERS: Array<{ slug: string; limiar: number }> = [
  { slug: 'streak_5',  limiar: 5 },
  { slug: 'streak_20', limiar: 20 },
  { slug: 'streak_60', limiar: 60 },
];

const TICKET_ALTO_TIERS: Array<{ slug: string; limiar: number }> = [
  { slug: 'ticket_alto_1',  limiar: 1 },
  { slug: 'ticket_alto_5',  limiar: 5 },
  { slug: 'ticket_alto_10', limiar: 10 },
];

const POS_VENDA_TIERS: Array<{ slug: string; limiar: number }> = [
  { slug: 'pos_venda_1',  limiar: 1 },
  { slug: 'pos_venda_10', limiar: 10 },
];

const COMUNICADOR_TIERS: Array<{ slug: string; limiar: number }> = [
  { slug: 'comunicador_100', limiar: 100 },
  { slug: 'comunicador_500', limiar: 500 },
];

const TICKET_ALTO_LIMIAR_PREMIO = 10000; // R$ 10k

// ==================== HELPERS ====================

async function temBadge(corretoraId: string, usuarioId: string, slug: string): Promise<boolean> {
  const tipo = await db.query.badgeTipos.findFirst({
    where: eq(badgeTipos.slug, slug),
    columns: { id: true },
  });
  if (!tipo) return false;

  const existing = await db.query.usuarioBadges.findFirst({
    where: and(
      eq(usuarioBadges.corretoraId, corretoraId),
      eq(usuarioBadges.usuarioId, usuarioId),
      eq(usuarioBadges.badgeTipoId, tipo.id),
    ),
    columns: { id: true },
  });
  return !!existing;
}

async function concederSeNovo(
  corretoraId: string,
  usuarioId: string,
  slug: string,
  observacao?: string,
): Promise<void> {
  if (await temBadge(corretoraId, usuarioId, slug)) return;
  await awardBadge({ corretoraId, usuarioId, badgeSlug: slug, observacao });
}

/** Conta novos seguros vitalícios (cotação NOVO + documento aprovado pelo cadastro). */
async function contarNovosSeguros(corretoraId: string, usuarioId: string): Promise<number> {
  const [r] = await db
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
        eq(documentosVenda.vendedorId, usuarioId),
        isNull(documentosVenda.deletedAt),
        isNotNull(documentosVenda.dataAprovacaoCadastro),
      ),
    );
  return r?.count ?? 0;
}

async function contarRenovacoes(corretoraId: string, usuarioId: string): Promise<number> {
  const [r] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(renovacoesComerciais)
    .where(
      and(
        eq(renovacoesComerciais.corretoraId, corretoraId),
        eq(renovacoesComerciais.vendedorId, usuarioId),
        eq(renovacoesComerciais.status, 'RENOVADO'),
      ),
    );
  return r?.count ?? 0;
}

async function contarCotacoes(corretoraId: string, usuarioId: string): Promise<number> {
  const [r] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cotacoes)
    .where(
      and(
        eq(cotacoes.corretoraId, corretoraId),
        eq(cotacoes.vendedorId, usuarioId),
        isNull(cotacoes.deletedAt),
      ),
    );
  return r?.count ?? 0;
}

// ==================== STREAK (dias úteis) ====================

const DIA_MS = 86400000;

function ehDiaUtil(date: Date): boolean {
  const d = date.getDay(); // 0 dom, 6 sáb
  return d !== 0 && d !== 6;
}

function diaUtilAnterior(date: Date): Date {
  const d = new Date(date);
  do {
    d.setTime(d.getTime() - DIA_MS);
  } while (!ehDiaUtil(d));
  return d;
}

function ymd(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calcula o streak atual de dias úteis seguidos com pelo menos 1 cotação criada.
 * Conta a partir de hoje (se for dia útil) ou do último dia útil; ignora sáb/dom.
 */
export async function calcularStreakCotacoes(
  corretoraId: string,
  usuarioId: string,
): Promise<number> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Olhar últimos 120 dias (mais que suficiente pro maior tier de 60 dias úteis)
  const limite = new Date(hoje.getTime() - 120 * DIA_MS);

  const dias = await db
    .selectDistinct({
      dia: sql<string>`to_char(${cotacoes.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`,
    })
    .from(cotacoes)
    .where(
      and(
        eq(cotacoes.corretoraId, corretoraId),
        eq(cotacoes.vendedorId, usuarioId),
        isNull(cotacoes.deletedAt),
        gte(cotacoes.createdAt, limite),
      ),
    );

  const diasComCotacao = new Set(dias.map((d) => d.dia));

  // Ponto de partida: hoje (se útil) ou último dia útil anterior
  let cursor = ehDiaUtil(hoje) ? new Date(hoje) : diaUtilAnterior(hoje);

  // Caso especial: se hoje é dia útil mas ainda não cotou, considerar o anterior
  // como ponto de partida — o streak não quebra durante o dia em curso.
  if (ehDiaUtil(hoje) && !diasComCotacao.has(ymd(hoje))) {
    cursor = diaUtilAnterior(hoje);
  }

  let streak = 0;
  while (diasComCotacao.has(ymd(cursor))) {
    streak += 1;
    cursor = diaUtilAnterior(cursor);
  }
  return streak;
}

// ==================== CHECKS POR CATEGORIA ====================

async function checkVolumeTiers(corretoraId: string, usuarioId: string): Promise<void> {
  const [novos, renov, cot] = await Promise.all([
    contarNovosSeguros(corretoraId, usuarioId),
    contarRenovacoes(corretoraId, usuarioId),
    contarCotacoes(corretoraId, usuarioId),
  ]);

  const totais: Record<VolumeTier['metrica'], number> = {
    novos_seguros: novos,
    renovacoes: renov,
    cotacoes: cot,
  };

  for (const tier of VOLUME_TIERS) {
    if (totais[tier.metrica] >= tier.limiar) {
      await concederSeNovo(corretoraId, usuarioId, tier.slug);
    }
  }
}

async function checkStreakBadges(corretoraId: string, usuarioId: string): Promise<void> {
  const streak = await calcularStreakCotacoes(corretoraId, usuarioId);
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.limiar) {
      await concederSeNovo(corretoraId, usuarioId, tier.slug);
    }
  }
}

async function checkMesDeFogo(corretoraId: string, usuarioId: string): Promise<void> {
  if (await temBadge(corretoraId, usuarioId, 'mes_de_fogo')) return;

  // 10 novos seguros num mesmo mês-calendário
  const result = await db
    .select({
      mes: sql<string>`to_char(${documentosVenda.dataAprovacaoCadastro}, 'YYYY-MM')`,
      total: sql<number>`count(*)::int`,
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
    .where(
      and(
        eq(documentosVenda.corretoraId, corretoraId),
        eq(documentosVenda.vendedorId, usuarioId),
        isNull(documentosVenda.deletedAt),
        isNotNull(documentosVenda.dataAprovacaoCadastro),
      ),
    )
    .groupBy(sql`to_char(${documentosVenda.dataAprovacaoCadastro}, 'YYYY-MM')`);

  if (result.some((r) => (r.total ?? 0) >= 10)) {
    await concederSeNovo(corretoraId, usuarioId, 'mes_de_fogo');
  }
}

async function checkHatTrick(corretoraId: string, usuarioId: string): Promise<void> {
  if (await temBadge(corretoraId, usuarioId, 'hat_trick')) return;

  // 3 metas concluídas em 3 meses-calendário consecutivos com escopo do usuário
  const concluidas = await db.query.metas.findMany({
    where: and(
      eq(metas.corretoraId, corretoraId),
      eq(metas.usuarioId, usuarioId),
      eq(metas.status, 'CONCLUIDA'),
      isNull(metas.deletedAt),
    ),
    columns: { dataFim: true },
    orderBy: [asc(metas.dataFim)],
  });
  if (concluidas.length < 3) return;

  const meses = Array.from(new Set(concluidas.map((m) => m.dataFim.substring(0, 7)))).sort();

  function consecutivos(seq: string[]): boolean {
    let cnt = 1;
    for (let i = 1; i < seq.length; i += 1) {
      const [ay, am] = seq[i - 1].split('-').map(Number);
      const [by, bm] = seq[i].split('-').map(Number);
      const diff = (by - ay) * 12 + (bm - am);
      cnt = diff === 1 ? cnt + 1 : 1;
      if (cnt >= 3) return true;
    }
    return false;
  }

  if (consecutivos(meses)) {
    await concederSeNovo(corretoraId, usuarioId, 'hat_trick');
  }
}

async function checkCacadorEficiente(corretoraId: string, usuarioId: string): Promise<void> {
  if (await temBadge(corretoraId, usuarioId, 'cacador_eficiente')) return;

  // Por mês: total de cotações criadas vs. cotações que viraram venda confirmada
  const meses = await db
    .select({
      mes: sql<string>`to_char(${cotacoes.createdAt}, 'YYYY-MM')`,
      cotacoes: sql<number>`count(*)::int`,
      vendas: sql<number>`sum(case when ${cotacoes.documentoVendaId} is not null and ${cotacoes.situacao} = 'NOVO' then 1 else 0 end)::int`,
    })
    .from(cotacoes)
    .where(
      and(
        eq(cotacoes.corretoraId, corretoraId),
        eq(cotacoes.vendedorId, usuarioId),
        isNull(cotacoes.deletedAt),
      ),
    )
    .groupBy(sql`to_char(${cotacoes.createdAt}, 'YYYY-MM')`);

  const elegivel = meses.some(
    (m) => (m.cotacoes ?? 0) >= 5 && (m.vendas ?? 0) / (m.cotacoes ?? 1) > 0.3,
  );
  if (elegivel) {
    await concederSeNovo(corretoraId, usuarioId, 'cacador_eficiente');
  }
}

async function checkGuardiao(corretoraId: string, usuarioId: string): Promise<void> {
  if (await temBadge(corretoraId, usuarioId, 'guardiao')) return;

  // Em algum mês-calendário com renovações tendo dataVencimento naquele mês,
  // todas estão com status RENOVADO
  const linhas = await db
    .select({
      mes: sql<string>`to_char(${renovacoesComerciais.dataVencimento}, 'YYYY-MM')`,
      total: sql<number>`count(*)::int`,
      renovadas: sql<number>`sum(case when ${renovacoesComerciais.status} = 'RENOVADO' then 1 else 0 end)::int`,
    })
    .from(renovacoesComerciais)
    .where(
      and(
        eq(renovacoesComerciais.corretoraId, corretoraId),
        eq(renovacoesComerciais.vendedorId, usuarioId),
      ),
    )
    .groupBy(sql`to_char(${renovacoesComerciais.dataVencimento}, 'YYYY-MM')`);

  const elegivel = linhas.some((l) => (l.total ?? 0) >= 3 && l.total === l.renovadas);
  if (elegivel) {
    await concederSeNovo(corretoraId, usuarioId, 'guardiao');
  }
}

async function checkTicketAlto(corretoraId: string, usuarioId: string): Promise<void> {
  // Conta apólices vitalícias do vendedor com prêmio líquido acima do limiar
  const [r] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documentosVenda)
    .where(
      and(
        eq(documentosVenda.corretoraId, corretoraId),
        eq(documentosVenda.vendedorId, usuarioId),
        inArray(documentosVenda.status, ['VENDA_CONFIRMADA', 'ATIVO']),
        isNull(documentosVenda.deletedAt),
        sql`coalesce(${documentosVenda.premioLiquido}::numeric, 0) >= ${TICKET_ALTO_LIMIAR_PREMIO}`,
      ),
    );
  const total = r?.count ?? 0;

  for (const tier of TICKET_ALTO_TIERS) {
    if (total >= tier.limiar) {
      await concederSeNovo(corretoraId, usuarioId, tier.slug);
    }
  }
}

async function checkPosVenda(corretoraId: string, usuarioId: string): Promise<void> {
  const [r] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sinistros)
    .where(
      and(
        eq(sinistros.corretoraId, corretoraId),
        eq(sinistros.solicitanteId, usuarioId),
      ),
    );
  const total = r?.count ?? 0;

  for (const tier of POS_VENDA_TIERS) {
    if (total >= tier.limiar) {
      await concederSeNovo(corretoraId, usuarioId, tier.slug);
    }
  }
}

async function checkComunicador(corretoraId: string, usuarioId: string): Promise<void> {
  const [r] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mensagensChat)
    .where(eq(mensagensChat.usuarioId, usuarioId));
  const total = r?.count ?? 0;

  for (const tier of COMUNICADOR_TIERS) {
    if (total >= tier.limiar) {
      await concederSeNovo(corretoraId, usuarioId, tier.slug);
    }
  }
}

async function checkAtento(corretoraId: string, usuarioId: string): Promise<void> {
  if (await temBadge(corretoraId, usuarioId, 'atento')) return;

  // Aprovado se nas últimas ~30 dias toda cotação aberta do usuário teve algum
  // movimento (updatedAt) — proxy: nenhuma cotação ativa parada >5 dias.
  const limite30 = new Date(Date.now() - 30 * DIA_MS);
  const limiteParado = new Date(Date.now() - 5 * DIA_MS);

  // Existem cotações criadas nos últimos 30 dias (precisa ter atividade)
  const [criadas] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cotacoes)
    .where(
      and(
        eq(cotacoes.corretoraId, corretoraId),
        eq(cotacoes.vendedorId, usuarioId),
        isNull(cotacoes.deletedAt),
        gte(cotacoes.createdAt, limite30),
      ),
    );
  if (!criadas || (criadas.count ?? 0) < 1) return;

  // Nenhuma cotação aberta sem movimento há mais de 5 dias
  const [paradas] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cotacoes)
    .where(
      and(
        eq(cotacoes.corretoraId, corretoraId),
        eq(cotacoes.vendedorId, usuarioId),
        isNull(cotacoes.deletedAt),
        eq(cotacoes.status, 'EM_ELABORACAO'),
        lte(cotacoes.updatedAt, limiteParado),
      ),
    );

  if ((paradas?.count ?? 0) === 0) {
    await concederSeNovo(corretoraId, usuarioId, 'atento');
  }
}

async function checkMarcos(corretoraId: string, usuarioId: string): Promise<void> {
  // Estreante: 1ª cotação
  if (!(await temBadge(corretoraId, usuarioId, 'estreante'))) {
    const [r] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cotacoes)
      .where(
        and(
          eq(cotacoes.corretoraId, corretoraId),
          eq(cotacoes.vendedorId, usuarioId),
          isNull(cotacoes.deletedAt),
        ),
      );
    if ((r?.count ?? 0) >= 1) {
      await concederSeNovo(corretoraId, usuarioId, 'estreante');
    }
  }

  // Primeira venda: 1ª venda confirmada
  if (!(await temBadge(corretoraId, usuarioId, 'primeira_venda'))) {
    const [r] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documentosVenda)
      .where(
        and(
          eq(documentosVenda.corretoraId, corretoraId),
          eq(documentosVenda.vendedorId, usuarioId),
          inArray(documentosVenda.status, ['VENDA_CONFIRMADA', 'ATIVO']),
          isNull(documentosVenda.deletedAt),
        ),
      );
    if ((r?.count ?? 0) >= 1) {
      await concederSeNovo(corretoraId, usuarioId, 'primeira_venda');
    }
  }

  // Primeira renovação concluída
  if (!(await temBadge(corretoraId, usuarioId, 'primeira_renovacao'))) {
    const [r] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(renovacoesComerciais)
      .where(
        and(
          eq(renovacoesComerciais.corretoraId, corretoraId),
          eq(renovacoesComerciais.vendedorId, usuarioId),
          eq(renovacoesComerciais.status, 'RENOVADO'),
        ),
      );
    if ((r?.count ?? 0) >= 1) {
      await concederSeNovo(corretoraId, usuarioId, 'primeira_renovacao');
    }
  }

  // 1 ano de casa: createdAt do usuário >= 1 ano
  if (!(await temBadge(corretoraId, usuarioId, 'um_ano_de_casa'))) {
    const u = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, usuarioId),
      columns: { createdAt: true },
    });
    if (u?.createdAt) {
      const umAnoMs = 365 * DIA_MS;
      if (Date.now() - new Date(u.createdAt).getTime() >= umAnoMs) {
        await concederSeNovo(corretoraId, usuarioId, 'um_ano_de_casa');
      }
    }
  }
}

// ==================== ORQUESTRADOR ====================

/**
 * Roda todos os checks de reconhecimento para o usuário. Idempotente — pode
 * ser chamado múltiplas vezes; só concede badge novo quando aplicável.
 */
export async function checkAllRecognitions(
  corretoraId: string,
  usuarioId: string,
): Promise<void> {
  await Promise.all([
    checkVolumeTiers(corretoraId, usuarioId),
    checkStreakBadges(corretoraId, usuarioId),
    checkMesDeFogo(corretoraId, usuarioId),
    checkHatTrick(corretoraId, usuarioId),
    checkCacadorEficiente(corretoraId, usuarioId),
    checkGuardiao(corretoraId, usuarioId),
    checkTicketAlto(corretoraId, usuarioId),
    checkPosVenda(corretoraId, usuarioId),
    checkComunicador(corretoraId, usuarioId),
    checkAtento(corretoraId, usuarioId),
    checkMarcos(corretoraId, usuarioId),
  ]);
}

/** Devolve totais que alimentam o card de reconhecimento no frontend. */
export async function getRecognitionStats(corretoraId: string, usuarioId: string) {
  const [novos, renov, cot, streak] = await Promise.all([
    contarNovosSeguros(corretoraId, usuarioId),
    contarRenovacoes(corretoraId, usuarioId),
    contarCotacoes(corretoraId, usuarioId),
    calcularStreakCotacoes(corretoraId, usuarioId),
  ]);

  function nivelAtual(metrica: VolumeTier['metrica'], total: number) {
    const tiersDaMetrica = VOLUME_TIERS.filter((t) => t.metrica === metrica);
    const conquistados = tiersDaMetrica.filter((t) => total >= t.limiar);
    const atual = conquistados[conquistados.length - 1] ?? null;
    const proximo = tiersDaMetrica.find((t) => total < t.limiar) ?? null;
    return { total, atual, proximo };
  }

  return {
    novos_seguros: nivelAtual('novos_seguros', novos),
    renovacoes: nivelAtual('renovacoes', renov),
    cotacoes: nivelAtual('cotacoes', cot),
    streak: {
      atual: streak,
      proximo: STREAK_TIERS.find((t) => streak < t.limiar) ?? null,
      tiers: STREAK_TIERS,
    },
  };
}
