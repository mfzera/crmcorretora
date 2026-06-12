import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dayjs } from '@/core/utils/date-utils';
import { api } from '@/infra/http/api';
import {
  useRankingGamificacao,
  useMetasAtivas,
  useCampanhasAtivas,
} from '@/modules/gamificacao/http';
import { type RankingItem } from '@/modules/gamificacao/http';
import { type VendedorMetricas, type TipoDoc } from '../components/LeaderboardTable';

export type Periodo = 'mes_atual' | 'mes_anterior' | 'trimestre' | 'ano';

/**
 * Mínimo de vendas no período para um vendedor exibir/rankear Comissão Média e
 * Ticket Médio. Como são médias, poucas vendas distorcem o valor (ex.: 1 venda
 * com 40% de comissão viraria "40% de comissão média").
 */
export const MIN_VENDAS_MEDIA = 10;

export function getPeriodo(p: Periodo): { dataInicio: string; dataFim: string } {
  const hoje = dayjs();
  switch (p) {
    case 'mes_atual':
      return {
        dataInicio: hoje.startOf('month').format('YYYY-MM-DD'),
        dataFim: hoje.endOf('month').format('YYYY-MM-DD'),
      };
    case 'mes_anterior': {
      const ant = hoje.subtract(1, 'month');
      return {
        dataInicio: ant.startOf('month').format('YYYY-MM-DD'),
        dataFim: ant.endOf('month').format('YYYY-MM-DD'),
      };
    }
    case 'trimestre':
      return {
        dataInicio: hoje.subtract(2, 'month').startOf('month').format('YYYY-MM-DD'),
        dataFim: hoje.endOf('month').format('YYYY-MM-DD'),
      };
    case 'ano':
      return {
        dataInicio: hoje.startOf('year').format('YYYY-MM-DD'),
        dataFim: hoje.endOf('year').format('YYYY-MM-DD'),
      };
  }
}

function sortedByMetric(
  ranking: RankingItem[],
  docsFiltrados: any[],
  vendedorMetricas: Record<string, VendedorMetricas>,
  sortKey: keyof VendedorMetricas,
  minVendas = 0,
): RankingItem[] {
  const sellersInfo = new Map<string, RankingItem>();
  ranking.forEach((r) => sellersInfo.set(r.usuarioId, r));
  docsFiltrados.forEach((doc) => {
    const v = doc.vendedor;
    if (!v?.id || sellersInfo.has(v.id)) return;
    sellersInfo.set(v.id, {
      usuarioId: v.id,
      nome: v.nome ?? v.name ?? 'Vendedor',
      email: '',
      avatarUrl: v.avatarUrl ?? null,
      equipeId: null,
      equipeNome: null,
      pontos: 0,
      badges: 0,
      metasBatidas: 0,
      missoesCumpridas: 0,
      posicao: 0,
    });
  });
  return [...sellersInfo.values()]
    .filter(
      (s) =>
        (vendedorMetricas[s.usuarioId]?.[sortKey] ?? 0) > 0 &&
        (vendedorMetricas[s.usuarioId]?.quantidadeVendas ?? 0) >= minVendas,
    )
    .sort(
      (a, b) =>
        (vendedorMetricas[b.usuarioId]?.[sortKey] ?? 0) -
        (vendedorMetricas[a.usuarioId]?.[sortKey] ?? 0),
    )
    .map((s, i) => ({ ...s, posicao: i + 1 }));
}

export function useRankingData(
  params: { dataInicio: string; dataFim: string },
  tipoDoc: TipoDoc,
  equipeId?: string,
) {
  const { data: rankingData, isLoading: rankingLoading } = useRankingGamificacao({ ...params, equipeId });
  const ranking = rankingData?.ranking ?? [];

  const { data: metasRaw } = useMetasAtivas();
  const metas = useMemo(
    () => (Array.isArray(metasRaw) ? metasRaw : ((metasRaw as any)?.data ?? [])),
    [metasRaw],
  );

  const { data: campanhasRaw } = useCampanhasAtivas();
  const campanhas = useMemo(
    () => (Array.isArray(campanhasRaw) ? campanhasRaw : ((campanhasRaw as any)?.data ?? [])),
    [campanhasRaw],
  );

  const { data: docsPeriodo = [] } = useQuery({
    queryKey: ['ranking-docs-periodo', params],
    queryFn: async () => {
      const res = await api.get('/sales-documents', {
        params: { criadoApos: params.dataInicio, criadoAntes: params.dataFim },
      });
      return Array.isArray(res) ? res : ((res as any)?.data ?? []);
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const docsFiltrados = useMemo(() => {
    let docs = docsPeriodo as any[];
    if (tipoDoc !== 'todos') {
      docs = docs.filter((doc) => {
        const situacao = String(doc.situacaoCotacao ?? '').toUpperCase();
        if (tipoDoc === 'renovacao') return situacao === 'RENOVACAO';
        if (tipoDoc === 'novo') return situacao === 'NOVO';
        return true;
      });
    }
    if (equipeId) {
      const teamUserIds = new Set(ranking.map((r) => r.usuarioId));
      docs = docs.filter((doc) => doc.vendedor?.id && teamUserIds.has(doc.vendedor.id));
    }
    return docs;
  }, [docsPeriodo, tipoDoc, equipeId, ranking]);

  const vendedorMetricas = useMemo<Record<string, VendedorMetricas>>(() => {
    const map: Record<
      string,
      { totalPremio: number; quantidadeVendas: number; somaPercentualComissao: number; countComissao: number }
    > = {};
    docsFiltrados.forEach((doc) => {
      const id = doc.vendedor?.id;
      if (!id) return;
      const premio = doc.premioLiquido ? parseFloat(String(doc.premioLiquido)) : 0;
      const pct = doc.percentualComissao ? parseFloat(String(doc.percentualComissao)) : 0;
      if (!map[id])
        map[id] = { totalPremio: 0, quantidadeVendas: 0, somaPercentualComissao: 0, countComissao: 0 };
      map[id].totalPremio += premio;
      map[id].quantidadeVendas += 1;
      if (pct > 0) {
        map[id].somaPercentualComissao += pct;
        map[id].countComissao += 1;
      }
    });
    return Object.fromEntries(
      Object.entries(map).map(([id, v]) => [
        id,
        {
          totalPremio: v.totalPremio,
          quantidadeVendas: v.quantidadeVendas,
          ticketMedio: v.quantidadeVendas > 0 ? v.totalPremio / v.quantidadeVendas : 0,
          mediaComissao: v.countComissao > 0 ? v.somaPercentualComissao / v.countComissao : 0,
        },
      ]),
    );
  }, [docsFiltrados]);

  const rankingsByMetric = useMemo(() => {
    const byPontos = [...ranking]
      .sort((a, b) => b.pontos - a.pontos)
      .map((s, i) => ({ ...s, posicao: i + 1 }));
    return {
      pontos: byPontos,
      premio: sortedByMetric(ranking, docsFiltrados, vendedorMetricas, 'totalPremio'),
      comissao: sortedByMetric(ranking, docsFiltrados, vendedorMetricas, 'mediaComissao', MIN_VENDAS_MEDIA),
      quantidade: sortedByMetric(ranking, docsFiltrados, vendedorMetricas, 'quantidadeVendas'),
      ticketMedio: sortedByMetric(ranking, docsFiltrados, vendedorMetricas, 'ticketMedio', MIN_VENDAS_MEDIA),
    };
  }, [ranking, vendedorMetricas, docsFiltrados]);

  const { data: usuariosMap = {} } = useQuery<
    Record<string, { avatarUrl: string | null; cargo: string | null }>
  >({
    queryKey: ['ranking-usuarios-info'],
    queryFn: async () => {
      const res = await api.get<any[]>('/users', { params: { select: true } });
      const lista = Array.isArray(res) ? res : ((res as any)?.data ?? []);
      return Object.fromEntries(
        lista.map((u: any) => [u.id, { avatarUrl: u.avatarUrl ?? null, cargo: u.cargo?.nomeCargo ?? null }]),
      );
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    ranking,
    rankingLoading,
    metas,
    campanhas,
    vendedorMetricas,
    rankingsByMetric,
    usuariosMap,
  };
}
