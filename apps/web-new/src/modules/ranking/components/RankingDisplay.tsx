import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dayjs } from '@/core/utils/date-utils';
import { api } from '@/infra/http/api';
import {
  useRankingGamificacao,
  useUltimaConquista,
  useMetasAtivas,
  useCampanhasAtivas,
} from '@/modules/gamificacao/http';
import { RankingControls } from './RankingControls';
import { UltimaVendaCard } from './UltimaVendaCard';
import { UltimaConquistaCard } from './UltimaConquistaCard';
import { MetasCampanhasPanel } from './MetasCampanhasPanel';
import { LeaderboardTable, type VendedorMetricas, type TipoDoc } from './LeaderboardTable';

type Periodo = 'mes_atual' | 'mes_anterior' | 'trimestre' | 'ano';

function getPeriodo(p: Periodo): { dataInicio: string; dataFim: string } {
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

export function RankingDisplay() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>('mes_atual');
  const [tipoDoc, setTipoDoc] = useState<TipoDoc>('todos');
  const [bgImage, setBgImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ranking-bg');
    } catch {
      return null;
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const params = useMemo(() => getPeriodo(periodo), [periodo]);

  const { data: rankingData, isLoading: rankingLoading } = useRankingGamificacao(params);
  const ranking = rankingData?.ranking ?? [];

  // Última venda — polling 15s
  const { data: ultimaVendaDocs } = useQuery({
    queryKey: ['ranking-ultima-venda'],
    queryFn: async () => {
      const res = await api.get('/sales-documents', {
        params: {
          criadoApos: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          criadoAntes: dayjs().format('YYYY-MM-DD'),
        },
      });
      return Array.isArray(res) ? res : ((res as any)?.data ?? []);
    },
    refetchInterval: 15_000,
    retry: false,
    staleTime: 0,
  });

  const ultimaVenda = useMemo(() => {
    if (!ultimaVendaDocs?.length) return null;
    return [...ultimaVendaDocs].sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0] as any;
  }, [ultimaVendaDocs]);

  // Última conquista — polling 15s
  const { data: ultimaConquistaRaw } = useUltimaConquista();
  const ultimaConquista = (ultimaConquistaRaw as any)?.data ?? ultimaConquistaRaw ?? null;

  // Metas e campanhas ativas
  const { data: metasRaw } = useMetasAtivas();
  const metas = useMemo(() => {
    const lista = Array.isArray(metasRaw) ? metasRaw : ((metasRaw as any)?.data ?? []);
    return lista;
  }, [metasRaw]);

  const { data: campanhasRaw } = useCampanhasAtivas();
  const campanhas = useMemo(() => {
    const lista = Array.isArray(campanhasRaw) ? campanhasRaw : ((campanhasRaw as any)?.data ?? []);
    return lista;
  }, [campanhasRaw]);

  // Documentos do período selecionado — para calcular métricas de vendas
  const { data: docsPeriodo = [] } = useQuery({
    queryKey: ['ranking-docs-periodo', params],
    queryFn: async () => {
      const res = await api.get('/sales-documents', {
        params: {
          criadoApos: params.dataInicio,
          criadoAntes: params.dataFim,
        },
      });
      return Array.isArray(res) ? res : ((res as any)?.data ?? []);
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Filtra documentos por tipo (novo / renovação / todos) via situacaoCotacao
  const docsFiltrados = useMemo(() => {
    if (tipoDoc === 'todos') return docsPeriodo as any[];
    return (docsPeriodo as any[]).filter((doc) => {
      const situacao = String(doc.situacaoCotacao ?? '').toUpperCase();
      if (tipoDoc === 'renovacao') return situacao === 'RENOVACAO';
      if (tipoDoc === 'novo') return situacao === 'NOVO';
      return true;
    });
  }, [docsPeriodo, tipoDoc]);

  // Taxa de renovação por vendedor + meta alvo
  const renovacaoData = useMemo(() => {
    const metaRenovacao = metas.find(
      (m: any) => m.tipoMetrica === 'taxa_renovacao' && m.status === 'ATIVA',
    );
    const metaAlvo: number | null = metaRenovacao?.valorAlvo ?? null;

    const map: Record<string, { renovacoes: number; total: number }> = {};
    (docsPeriodo as any[]).forEach((doc) => {
      const id = doc.vendedor?.id;
      if (!id) return;
      if (!map[id]) map[id] = { renovacoes: 0, total: 0 };
      map[id].total += 1;
      if (String(doc.situacaoCotacao ?? '').toUpperCase() === 'RENOVACAO') {
        map[id].renovacoes += 1;
      }
    });

    const taxaByVendedor: Record<string, number> = {};
    for (const [id, v] of Object.entries(map)) {
      taxaByVendedor[id] = v.total > 0 ? (v.renovacoes / v.total) * 100 : 0;
    }

    return { metaAlvo, taxaByVendedor };
  }, [docsPeriodo, metas]);

  // Métricas de vendas por vendedorId
  const vendedorMetricas = useMemo<Record<string, VendedorMetricas>>(() => {
    const map: Record<
      string,
      {
        totalPremio: number;
        quantidadeVendas: number;
        somaPercentualComissao: number;
        countComissao: number;
      }
    > = {};

    docsFiltrados.forEach((doc) => {
      const id = doc.vendedor?.id;
      if (!id) return;
      const premio = doc.premioLiquido ? parseFloat(String(doc.premioLiquido)) : 0;
      const pct = doc.percentualComissao ? parseFloat(String(doc.percentualComissao)) : 0;

      if (!map[id]) {
        map[id] = { totalPremio: 0, quantidadeVendas: 0, somaPercentualComissao: 0, countComissao: 0 };
      }
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

  // Avatar e cargo dos vendedores (para UltimaVendaCard)
  const { data: usuariosMap = {} } = useQuery<
    Record<string, { avatarUrl: string | null; cargo: string | null }>
  >({
    queryKey: ['ranking-usuarios-info'],
    queryFn: async () => {
      const res = await api.get<any[]>('/users', { params: { select: true } });
      const lista = Array.isArray(res) ? res : ((res as any)?.data ?? []);
      return Object.fromEntries(
        lista.map((u: any) => [
          u.id,
          { avatarUrl: u.avatarUrl ?? null, cargo: u.cargo?.nomeCargo ?? null },
        ]),
      );
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const vendedorId = ultimaVenda?.vendedor?.id;
  const vendedorExtra = vendedorId ? (usuariosMap[vendedorId] ?? null) : null;

  const conquistaUsuarioId = ultimaConquista?.usuario?.id;
  const conquistaAvatarUrl = conquistaUsuarioId ? (usuariosMap[conquistaUsuarioId]?.avatarUrl ?? null) : null;

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
      document.body.classList.add('hide-sidebar');
    } else {
      document.exitFullscreen();
      document.body.classList.remove('hide-sidebar');
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      document.body.classList.toggle('hide-sidebar', isFull);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.body.classList.remove('hide-sidebar');
    };
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setBgImage(result);
      try {
        localStorage.setItem('ranking-bg', result);
      } catch {
        //
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const clearBg = useCallback(() => {
    setBgImage(null);
    try {
      localStorage.removeItem('ranking-bg');
    } catch {
      //
    }
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0a0a0a]">

      {/* ── TOP: imagem + cards flutuantes ── */}
      <div className="relative flex-[35] sm:flex-[55] overflow-hidden min-h-0">
        {bgImage ? (
          <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-black/50" />

        {/* Controles (topo direito) */}
        <div className="absolute top-4 right-4 z-20">
          <RankingControls
            isFullscreen={isFullscreen}
            hasBg={!!bgImage}
            fileInputRef={fileInputRef}
            onToggleFullscreen={toggleFullscreen}
            onPickImage={() => fileInputRef.current?.click()}
            onClearImage={clearBg}
            onFileChange={handleFileChange}
          />
        </div>

        {/* Cards flutuantes — lado a lado à direita (apenas desktop) */}
        <div className="hidden sm:flex absolute top-12 right-4 z-10 flex-row gap-3 items-start">
          <UltimaConquistaCard conquista={ultimaConquista} avatarUrl={conquistaAvatarUrl} />
          <UltimaVendaCard
            venda={ultimaVenda}
            avatarUrl={vendedorExtra?.avatarUrl}
            cargo={vendedorExtra?.cargo}
          />
        </div>
      </div>

      {/* ── FAIXA DE CARDS (apenas mobile) ── */}
      <div className="flex sm:hidden shrink-0 gap-3 px-3 py-2 overflow-x-auto border-b border-white/8 bg-[#0a0a0a]">
        <UltimaConquistaCard conquista={ultimaConquista} avatarUrl={conquistaAvatarUrl} />
        <UltimaVendaCard
          venda={ultimaVenda}
          avatarUrl={vendedorExtra?.avatarUrl}
          cargo={vendedorExtra?.cargo}
        />
      </div>

      {/* ── BOTTOM ── */}
      <div className="flex flex-col sm:flex-row flex-1 sm:flex-[45] min-h-0 border-t border-white/8">
        {/* Leaderboard */}
        <div className="flex-1 sm:flex-[65] min-w-0 overflow-hidden bg-[#0f0f0f]">
          <LeaderboardTable
            ranking={ranking}
            isLoading={rankingLoading}
            periodo={periodo}
            onPeriodoChange={setPeriodo}
            tipoDoc={tipoDoc}
            onTipoDocChange={setTipoDoc}
            vendedorMetricas={vendedorMetricas}
            usuariosMap={usuariosMap}
            renovacaoData={renovacaoData}
          />
        </div>

        {/* Metas, Campanhas, Testes & Outros */}
        <div className="shrink-0 sm:flex-[35] max-h-52 sm:max-h-none border-t sm:border-t-0 sm:border-l border-white/8 bg-[#111] overflow-hidden flex flex-col">
          <MetasCampanhasPanel metas={metas} campanhas={campanhas} />
        </div>
      </div>
    </div>
  );
}
