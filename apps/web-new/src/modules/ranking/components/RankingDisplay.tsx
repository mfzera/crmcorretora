import { lazy, Suspense, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/core/utils';
import { CATEGORY_STYLE } from './RankingPodium';
import { type TipoDoc, type TipoRanking } from './LeaderboardTable';
import { CategoryNav, CATEGORIES, ROTATION_INTERVAL } from './CategoryNav';
import { RankingFilterBar } from './RankingFilterBar';
import { useRankingData, getPeriodo, type Periodo } from '../hooks/useRankingData';
import { useRankingSSE } from '../hooks/useRankingSSE';

// ── Code splitting — carregados sob demanda ────────────────────────────────
const RankingPodium = lazy(() =>
  import('./RankingPodium').then((m) => ({ default: m.RankingPodium })),
);
const RankingRestList = lazy(() =>
  import('./RankingRestList').then((m) => ({ default: m.RankingRestList })),
);
const MetasCampanhasPanel = lazy(() =>
  import('./MetasCampanhasPanel').then((m) => ({ default: m.MetasCampanhasPanel })),
);
const RankingClassicView = lazy(() =>
  import('./RankingClassicView').then((m) => ({ default: m.RankingClassicView })),
);
// ──────────────────────────────────────────────────────────────────────────

export function RankingDisplay() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>('mes_atual');
  const [tipoDoc, setTipoDoc] = useState<TipoDoc>('todos');
  const [activeCategory, setActiveCategory] = useState<TipoRanking>('premio');
  const [rotationKey, setRotationKey] = useState(0);
  const [viewMode, setViewMode] = useState<'modern' | 'classic'>('modern');
  const [showBackground, setShowBackground] = useState(true);

  // Alterna entre pódio e grade a cada 15 minutos
  useEffect(() => {
    const id = setInterval(() => {
      setViewMode((v) => (v === 'modern' ? 'classic' : 'modern'));
    }, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const params = useMemo(() => getPeriodo(periodo), [periodo]);

  const { rankingLoading, rankingsByMetric, vendedorMetricas, usuariosMap, metas, campanhas } =
    useRankingData(params, tipoDoc);

  useRankingSSE();

  // Trava o scroll do <main> — ranking é viewport-fill
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

  // Auto-rotation — reinicia quando o usuário muda de categoria manualmente
  useEffect(() => {
    const id = setInterval(() => {
      setActiveCategory((prev) => {
        const idx = CATEGORIES.indexOf(prev);
        return CATEGORIES[(idx + 1) % CATEGORIES.length];
      });
    }, ROTATION_INTERVAL);
    return () => clearInterval(id);
  }, [rotationKey]);

  // Progress bar via rAF — sem re-renders
  useEffect(() => {
    const bar = progressBarRef.current;
    if (!bar) return;
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / ROTATION_INTERVAL) * 100);
      bar.style.width = `${pct}%`;
      if (pct > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeCategory]);

  const handleSelectCategory = useCallback((cat: TipoRanking) => {
    setActiveCategory(cat);
    setRotationKey((k) => k + 1);
  }, []);

  const handlePrev = useCallback(() => {
    setActiveCategory((prev) => {
      const idx = CATEGORIES.indexOf(prev);
      return CATEGORIES[(idx - 1 + CATEGORIES.length) % CATEGORIES.length];
    });
    setRotationKey((k) => k + 1);
  }, []);

  const handleNext = useCallback(() => {
    setActiveCategory((prev) => {
      const idx = CATEGORIES.indexOf(prev);
      return CATEGORIES[(idx + 1) % CATEGORIES.length];
    });
    setRotationKey((k) => k + 1);
  }, []);

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

  const activeCatStyle = CATEGORY_STYLE[activeCategory];
  const activeRanking = rankingsByMetric[activeCategory];
  const top3 = activeRanking.slice(0, 3);
  const rest = activeRanking.slice(3);

  // mapa userId → posição em cada métrica
  const userPositionsMap = useMemo(() => {
    const map: Record<string, Partial<Record<TipoRanking, number>>> = {};
    for (const [cat, items] of Object.entries(rankingsByMetric) as [TipoRanking, typeof activeRanking][]) {
      for (const item of items) {
        if (!map[item.usuarioId]) map[item.usuarioId] = {};
        map[item.usuarioId][cat] = item.posicao;
      }
    }
    return map;
  }, [rankingsByMetric]);

  return (
    <div ref={rootRef} className="flex flex-col h-full overflow-hidden bg-[#080910]">

      {/* ── Filtros: período + tipo doc — oculto em fullscreen ── */}
      {!isFullscreen && (
        <RankingFilterBar
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          tipoDoc={tipoDoc}
          onTipoDocChange={setTipoDoc}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          viewMode={viewMode}
          onViewModeToggle={() => setViewMode((v) => (v === 'modern' ? 'classic' : 'modern'))}
          showBackground={showBackground}
          onToggleBackground={() => setShowBackground((v) => !v)}
        />
      )}

      {viewMode === 'classic' ? (
        /* ── Modo clássico: 4 colunas simultâneas ── */
        <Suspense fallback={<div className="flex-1" />}>
          <RankingClassicView
            rankingsByMetric={rankingsByMetric}
            vendedorMetricas={vendedorMetricas}
            usuariosMap={usuariosMap}
            isLoading={rankingLoading}
            showBackground={showBackground}
          />
        </Suspense>
      ) : (
        /* ── Modo moderno: pódio com rotação ── */
        <>
          {/* Navegação de categoria + barra de progresso (embutida no nav) */}
          <CategoryNav
            activeCategory={activeCategory}
            onSelect={handleSelectCategory}
            onPrev={handlePrev}
            onNext={handleNext}
            progressBarRef={progressBarRef}
            progressBarColor={activeCatStyle.hex}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />

          {/* Conteúdo principal */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

            {/* Pódio — ocupa toda a altura disponível fora do fullscreen */}
            <div className="flex-1 min-h-0">
              <Suspense fallback={<PodiumSkeleton />}>
                <RankingPodium
                  tipoRanking={activeCategory}
                  top3={top3}
                  vendedorMetricas={vendedorMetricas}
                  usuariosMap={usuariosMap}
                  userPositionsMap={userPositionsMap}
                  isLoading={rankingLoading}
                />
              </Suspense>
            </div>

            {/* Lista 4+ — sempre visível */}
            <Suspense fallback={null}>
              <RankingRestList
                items={rest}
                activeCategory={activeCategory}
                vendedorMetricas={vendedorMetricas}
                usuariosMap={usuariosMap}
                isFullscreen={isFullscreen}
              />
            </Suspense>
          </div>
        </>
      )}

      {/* ── Metas & campanhas ── */}
      <div className="shrink-0 h-14 border-t border-white/[0.06] bg-[#0d0e14] overflow-hidden">
        <Suspense fallback={<div className="h-full" />}>
          <MetasCampanhasPanel metas={metas} campanhas={campanhas} />
        </Suspense>
      </div>
    </div>
  );
}

function PodiumSkeleton() {
  return (
    <div className={cn('flex flex-col h-full items-center justify-end pb-5 px-4')}>
      <div className="flex items-end gap-4 w-full max-w-2xl">
        {[1.0, 1.3, 1.0].map((scale, i) => (
          <div
            key={i}
            className="flex-1 rounded-2xl bg-white/[0.025] border border-white/[0.04] animate-pulse"
            style={{ height: `${Math.round(160 * scale)}px` }}
          />
        ))}
      </div>
    </div>
  );
}
