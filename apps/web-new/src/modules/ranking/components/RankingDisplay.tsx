import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Zap } from 'lucide-react';
import { dayjs, fromNow } from '@/core/utils/date-utils';
import { api } from '@/infra/http/api';
import {
  useRankingGamificacao,
  useUltimaConquista,
  useMetasAtivas,
  useCampanhasAtivas,
} from '@/modules/gamificacao/http';
import { type RankingItem } from '@/modules/gamificacao/http';
import { cn } from '@/core/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { RankingControls } from './RankingControls';
import { MetasCampanhasPanel } from './MetasCampanhasPanel';
import { MiniLeaderboard } from './MiniLeaderboard';
import { type VendedorMetricas, type TipoDoc } from './LeaderboardTable';

type Periodo = 'mes_atual' | 'mes_anterior' | 'trimestre' | 'ano';

const periodoLabels: Record<Periodo, string> = {
  mes_atual: 'Mês atual',
  mes_anterior: 'Mês ant.',
  trimestre: '3 meses',
  ano: 'Ano',
};

const tipoDocLabels: Record<TipoDoc, string> = {
  todos: 'Todos',
  novo: 'Novo',
  renovacao: 'Renovação',
};

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

function initials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function formatBRL(value: number) {
  if (value >= 1_000_000)
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (value >= 1_000)
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function sortedByMetric(
  ranking: RankingItem[],
  docsFiltrados: any[],
  vendedorMetricas: Record<string, VendedorMetricas>,
  sortKey: keyof VendedorMetricas,
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
    .filter((s) => (vendedorMetricas[s.usuarioId]?.[sortKey] ?? 0) > 0)
    .sort(
      (a, b) =>
        (vendedorMetricas[b.usuarioId]?.[sortKey] ?? 0) -
        (vendedorMetricas[a.usuarioId]?.[sortKey] ?? 0),
    )
    .map((s, i) => ({ ...s, posicao: i + 1 }));
}

export function RankingDisplay() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>('mes_atual');
  const [tipoDoc, setTipoDoc] = useState<TipoDoc>('todos');
  const [bgImage, setBgImage] = useState<string | null>(() => {
    try { return localStorage.getItem('ranking-bg'); } catch { return null; }
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trava o scroll do <main> — ranking é dashboard full-viewport
  useEffect(() => {
    let el = rootRef.current?.parentElement ?? null;
    while (el) {
      const { overflowY } = window.getComputedStyle(el);
      if (overflowY === 'auto' || overflowY === 'scroll') {
        el.style.overflowY = 'hidden';
        const target = el;
        return () => { target.style.overflowY = ''; };
      }
      el = el.parentElement;
    }
  }, []);

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
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0] as any;
  }, [ultimaVendaDocs]);

  const { data: ultimaConquistaRaw } = useUltimaConquista();
  const ultimaConquista = (ultimaConquistaRaw as any)?.data ?? ultimaConquistaRaw ?? null;

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
    if (tipoDoc === 'todos') return docsPeriodo as any[];
    return (docsPeriodo as any[]).filter((doc) => {
      const situacao = String(doc.situacaoCotacao ?? '').toUpperCase();
      if (tipoDoc === 'renovacao') return situacao === 'RENOVACAO';
      if (tipoDoc === 'novo') return situacao === 'NOVO';
      return true;
    });
  }, [docsPeriodo, tipoDoc]);

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
      if (!map[id]) map[id] = { totalPremio: 0, quantidadeVendas: 0, somaPercentualComissao: 0, countComissao: 0 };
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
      comissao: sortedByMetric(ranking, docsFiltrados, vendedorMetricas, 'mediaComissao'),
      quantidade: sortedByMetric(ranking, docsFiltrados, vendedorMetricas, 'quantidadeVendas'),
      ticketMedio: sortedByMetric(ranking, docsFiltrados, vendedorMetricas, 'ticketMedio'),
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

  const vendedorId = ultimaVenda?.vendedor?.id;
  const vendedorAvatarUrl = vendedorId ? (usuariosMap[vendedorId]?.avatarUrl ?? null) : null;
  const conquistaUsuarioId = ultimaConquista?.usuario?.id;
  const conquistaAvatarUrl = conquistaUsuarioId ? (usuariosMap[conquistaUsuarioId]?.avatarUrl ?? null) : null;

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
      try { localStorage.setItem('ranking-bg', result); } catch { /* */ }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const clearBg = useCallback(() => {
    setBgImage(null);
    try { localStorage.removeItem('ranking-bg'); } catch { /* */ }
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col h-full overflow-hidden bg-[#0a0a0a]">

      {/* ── BANNER ── slim: apenas fundo + chips compactos de atividade */}
      <div className="relative shrink-0 h-[90px] sm:h-[110px] overflow-hidden">
        {bgImage ? (
          <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        )}
        {/* gradiente à esquerda para dar profundidade sem escurecer demais */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Chips compactos de atividade — bottom-right do banner */}
        <div className="absolute bottom-2.5 right-3 z-10 hidden sm:flex flex-row gap-2 items-end">
          {ultimaConquista && (
            <div className="flex items-center gap-2 pl-2.5 pr-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-lg max-w-[260px]">
              <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <Avatar className="h-6 w-6 shrink-0">
                {conquistaAvatarUrl && <AvatarImage src={conquistaAvatarUrl} alt={ultimaConquista.usuario.nome} />}
                <AvatarFallback className="text-[9px] font-bold bg-white/10 text-white/60">
                  {initials(ultimaConquista.usuario.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-white text-[11px] font-semibold truncate leading-tight">
                  {ultimaConquista.usuario.nome}
                </p>
                <p className="text-amber-400/80 text-[10px] truncate leading-tight">
                  {ultimaConquista.badgeTipo.nome}
                </p>
              </div>
              <span className="text-white/30 text-[9px] shrink-0 ml-1">
                {fromNow(ultimaConquista.createdAt)}
              </span>
            </div>
          )}

          {ultimaVenda && (
            <div className="flex items-center gap-2 pl-2.5 pr-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-lg max-w-[280px]">
              <Zap className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
              <Avatar className="h-6 w-6 shrink-0">
                {vendedorAvatarUrl && <AvatarImage src={vendedorAvatarUrl} alt={ultimaVenda.vendedor?.nome} />}
                <AvatarFallback className="text-[9px] font-bold bg-white/10 text-white/60">
                  {initials(ultimaVenda.vendedor?.nome || 'V')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-white text-[11px] font-semibold truncate leading-tight">
                  {ultimaVenda.vendedor?.nome}
                </p>
                {ultimaVenda.premioLiquido != null && (
                  <p className="text-green-400 text-[10px] font-bold leading-tight">
                    {formatBRL(parseFloat(String(ultimaVenda.premioLiquido)))}
                  </p>
                )}
              </div>
              <span className="text-white/30 text-[9px] shrink-0 ml-1">
                {fromNow(ultimaVenda.createdAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── BARRA DE FILTROS ── */}
      <div className="flex items-center gap-3 px-3 sm:px-4 py-1.5 border-b border-white/8 bg-[#0f0f0f] shrink-0 overflow-x-auto">
        <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 shrink-0">
          {(Object.keys(periodoLabels) as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={cn(
                'text-[10px] px-2 sm:px-2.5 py-1 rounded-md transition-colors font-medium whitespace-nowrap',
                periodo === p ? 'bg-white/15 text-white' : 'text-white/35 hover:text-white/60',
              )}
            >
              {periodoLabels[p]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(Object.keys(tipoDocLabels) as TipoDoc[]).map((t) => (
            <button
              key={t}
              onClick={() => setTipoDoc(t)}
              className={cn(
                'text-[10px] px-2.5 py-0.5 rounded-full transition-colors font-medium whitespace-nowrap',
                tipoDoc === t
                  ? t === 'renovacao'
                    ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                    : t === 'novo'
                    ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30'
                    : 'bg-white/12 text-white'
                  : 'text-white/30 hover:text-white/55',
              )}
            >
              {tipoDocLabels[t]}
            </button>
          ))}
        </div>

        <div className="ml-auto shrink-0">
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
      </div>

      {/* ── GRID 4 RANKINGS ── */}
      {/* wrapper flex-1 min-h-0 → grid h-full garante height explícito para 1fr funcionar */}
      <div className="flex-1 min-h-0">
        <div className="h-full grid grid-cols-2 grid-rows-2 lg:grid-cols-4 lg:grid-rows-1 gap-px bg-white/5 overflow-hidden">
          <div className="flex flex-col bg-[#0f0f0f] overflow-hidden">
            <MiniLeaderboard
              tipoRanking="premio"
              ranking={rankingsByMetric.premio}
              vendedorMetricas={vendedorMetricas}
              usuariosMap={usuariosMap}
              isLoading={rankingLoading}
            />
          </div>
          <div className="flex flex-col bg-[#0f0f0f] overflow-hidden">
            <MiniLeaderboard
              tipoRanking="comissao"
              ranking={rankingsByMetric.comissao}
              vendedorMetricas={vendedorMetricas}
              usuariosMap={usuariosMap}
              isLoading={rankingLoading}
            />
          </div>
          <div className="flex flex-col bg-[#0f0f0f] overflow-hidden">
            <MiniLeaderboard
              tipoRanking="quantidade"
              ranking={rankingsByMetric.quantidade}
              vendedorMetricas={vendedorMetricas}
              usuariosMap={usuariosMap}
              isLoading={rankingLoading}
            />
          </div>
          <div className="flex flex-col bg-[#0f0f0f] overflow-hidden">
            <MiniLeaderboard
              tipoRanking="ticketMedio"
              ranking={rankingsByMetric.ticketMedio}
              vendedorMetricas={vendedorMetricas}
              usuariosMap={usuariosMap}
              isLoading={rankingLoading}
            />
          </div>
        </div>
      </div>

      {/* ── METAS & CAMPANHAS ── */}
      <div className="shrink-0 h-14 border-t border-white/8 bg-[#111] overflow-hidden">
        <MetasCampanhasPanel metas={metas} campanhas={campanhas} />
      </div>
    </div>
  );
}
