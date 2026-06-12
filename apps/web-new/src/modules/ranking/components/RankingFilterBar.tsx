import { LayoutGrid, Play, ImageIcon } from 'lucide-react';
import { cn } from '@/core/utils';
import { RankingControls } from './RankingControls';
import { type TipoDoc } from './LeaderboardTable';
import { type Periodo } from '../hooks/useRankingData';
import { useEquipes } from '@/modules/equipes/http';

const PERIODO_LABELS: Record<Periodo, string> = {
  mes_atual: 'Mês atual',
  mes_anterior: 'Mês ant.',
  trimestre: '3 meses',
  ano: 'Ano',
};

const TIPO_DOC_LABELS: Record<TipoDoc, string> = {
  todos: 'Todos',
  novo: 'Novo',
  renovacao: 'Renovação',
};

interface RankingFilterBarProps {
  periodo: Periodo;
  onPeriodoChange: (p: Periodo) => void;
  tipoDoc: TipoDoc;
  onTipoDocChange: (t: TipoDoc) => void;
  equipeId: string | undefined;
  onEquipeIdChange: (id: string | undefined) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  viewMode: 'modern' | 'classic';
  onViewModeToggle: () => void;
  showBackground: boolean;
  onToggleBackground: () => void;
}

export function RankingFilterBar({
  periodo,
  onPeriodoChange,
  tipoDoc,
  onTipoDocChange,
  equipeId,
  onEquipeIdChange,
  isFullscreen,
  onToggleFullscreen,
  viewMode,
  onViewModeToggle,
  showBackground,
  onToggleBackground,
}: RankingFilterBarProps) {
  const { data: equipesData } = useEquipes();
  const equipes: any[] = Array.isArray(equipesData) ? equipesData : ((equipesData as any)?.data ?? []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.06] bg-[#0a0b10] shrink-0 overflow-x-auto">
      {/* Período */}
      <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5 shrink-0">
        {(Object.keys(PERIODO_LABELS) as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => onPeriodoChange(p)}
            className={cn(
              'text-[10px] px-2.5 py-1 rounded-md transition-colors font-medium whitespace-nowrap',
              periodo === p ? 'bg-white/[0.12] text-white' : 'text-white/35 hover:text-white/60',
            )}
          >
            {PERIODO_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-white/[0.08] shrink-0" />

      {/* Tipo doc */}
      <div className="flex items-center gap-0.5 shrink-0">
        {(Object.keys(TIPO_DOC_LABELS) as TipoDoc[]).map((t) => (
          <button
            key={t}
            onClick={() => onTipoDocChange(t)}
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
            {TIPO_DOC_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-white/[0.08] shrink-0" />

      {/* Equipe */}
      <select
        value={equipeId ?? ''}
        onChange={(e) => onEquipeIdChange(e.target.value || undefined)}
        className="text-[10px] bg-white/[0.04] border border-white/[0.08] text-white/60 rounded-md px-2 py-1 outline-none cursor-pointer hover:text-white/80 hover:bg-white/[0.07] transition-colors shrink-0"
      >
        <option value="">Todas as equipes</option>
        {equipes.map((eq) => (
          <option key={eq.id} value={eq.id}>{eq.nome}</option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        {/* Fundo — apenas no modo clássico */}
        {viewMode === 'classic' && (
          <button
            onClick={onToggleBackground}
            className={cn(
              'flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors font-medium',
              showBackground
                ? 'bg-white/10 text-white/70 hover:bg-white/15'
                : 'text-white/30 hover:text-white/55',
            )}
          >
            <ImageIcon className="h-3 w-3" />
            Fundo
          </button>
        )}

        {/* Alternar modo de visualização */}
        <button
          onClick={onViewModeToggle}
          className={cn(
            'flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors font-medium',
            'text-white/50 hover:text-white/80 hover:bg-white/[0.06]',
          )}
        >
          {viewMode === 'modern' ? (
            <>
              <LayoutGrid className="h-3 w-3" />
              Grade
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              Pódio
            </>
          )}
        </button>

        <RankingControls isFullscreen={isFullscreen} onToggleFullscreen={onToggleFullscreen} />
      </div>
    </div>
  );
}
