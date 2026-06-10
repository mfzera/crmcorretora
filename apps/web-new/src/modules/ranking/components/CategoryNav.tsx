import { type RefObject } from 'react';
import { TrendingUp, Percent, BarChart3, Ticket, ChevronLeft, ChevronRight, Minimize2 } from 'lucide-react';
import { cn } from '@/core/utils';
import { CATEGORY_STYLE } from './RankingPodium';
import { type TipoRanking } from './LeaderboardTable';

export const CATEGORIES: TipoRanking[] = ['premio', 'comissao', 'quantidade', 'ticketMedio'];
export const ROTATION_INTERVAL = 60_000;

const CATEGORY_ICONS: Record<TipoRanking, React.ElementType> = {
  premio: TrendingUp,
  comissao: Percent,
  quantidade: BarChart3,
  ticketMedio: Ticket,
  pontos: TrendingUp, // fallback, pontos não aparece nas tabs
};

interface CategoryNavProps {
  activeCategory: TipoRanking;
  onSelect: (cat: TipoRanking) => void;
  onPrev: () => void;
  onNext: () => void;
  progressBarRef: RefObject<HTMLDivElement>;
  progressBarColor: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function CategoryNav({ activeCategory, onSelect, onPrev, onNext, progressBarRef, progressBarColor, isFullscreen, onToggleFullscreen }: CategoryNavProps) {
  const activeCatStyle = CATEGORY_STYLE[activeCategory];

  return (
    <div className="shrink-0 flex flex-col bg-[#0b0c10]">
    <div className="flex items-center gap-2 px-3 py-2">
      <button
        onClick={onPrev}
        className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-white/35 hover:text-white hover:bg-white/[0.06] transition-colors"
        aria-label="Categoria anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Pills — md+ */}
      <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const style = CATEGORY_STYLE[cat];
          const isActive = cat === activeCategory;
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium tracking-[0.01em] transition-all whitespace-nowrap',
                isActive
                  ? 'text-white bg-white/[0.07] border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]'
                  : 'text-white/30 hover:text-white/55 hover:bg-white/[0.05]',
              )}
            >
              <Icon className={cn('h-3 w-3 shrink-0', isActive ? style.colorClass : 'text-current')} />
              {style.label}
            </button>
          );
        })}
      </div>

      {/* Nome ativo + dots — abaixo de md */}
      <div className="flex md:hidden flex-1 flex-col items-center gap-1.5">
        <div className={cn('flex items-center gap-1.5 text-[13px] font-bold', activeCatStyle.colorClass)}>
          {(() => { const Icon = CATEGORY_ICONS[activeCategory]; return <Icon className="h-3.5 w-3.5" />; })()}
          {activeCatStyle.label}
        </div>
        <div className="flex items-center gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={cn(
                'rounded-full transition-all',
                cat === activeCategory
                  ? cn('w-4 h-1.5', activeCatStyle.bgClass, 'opacity-90')
                  : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40',
              )}
            />
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-white/35 hover:text-white hover:bg-white/[0.06] transition-colors"
        aria-label="Próxima categoria"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {isFullscreen && onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="shrink-0 flex items-center gap-1 h-7 px-2 rounded-lg text-white/35 hover:text-white hover:bg-white/[0.06] transition-colors text-[11px] font-medium"
        >
          <Minimize2 className="h-3 w-3" />
          Sair
        </button>
      )}
    </div>

    {/* Barra de progresso — borda inferior do nav, não flutua sobre o conteúdo */}
    <div className="h-0.5 bg-white/[0.04]">
      <div ref={progressBarRef} className="h-full transition-none" style={{ backgroundColor: progressBarColor }} />
    </div>
  </div>
  );
}
