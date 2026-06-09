import { memo } from 'react';
import { type DateRange } from 'react-day-picker';
import { Archive, CalendarDays, ChevronDown, ChevronUp, TrendingUp, X } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/ui/popover';
import { Calendar } from '@/core/ui/calendar';
import { cn } from '@/core/utils';
import { dayjs } from '@/core/utils/date-utils';
import { TEMPERATURA_LABELS } from '@/types/kanban';
import type { OportunidadeTemperatura } from '@/types/kanban';

export type FiltroPeriodo = 'hoje' | 'semana' | 'mes' | '7dias' | '30dias';
export type FiltroTipoData = 'atualizacao' | 'criacao' | 'fechamento';

type ProdutoOption = { id: string; nomeProduto: string };

interface KanbanFiltersProps {
  filtroProdutoId: string;
  onChangeProdutoId: (value: string) => void;

  filtroTemperatura: OportunidadeTemperatura | '';
  onChangeTemperatura: (value: OportunidadeTemperatura | '') => void;

  filtroPeriodo: FiltroPeriodo | '';
  onChangePeriodo: (value: FiltroPeriodo | '') => void;

  filtroDataRange: DateRange | undefined;
  onChangeDataRange: (range: DateRange | undefined) => void;

  filtroTipoData: FiltroTipoData;
  onChangeTipoData: (value: FiltroTipoData) => void;

  showArquivados: boolean;
  onToggleArquivados: () => void;

  produtos: ProdutoOption[];
  filteredCount: number;
  arquivadasCount: number;
  totalConvertido: number;
  activeFilterCount: number;
  onClearAll: () => void;
}

const PERIODO_LABELS: Record<FiltroPeriodo, string> = {
  hoje: 'Hoje',
  semana: 'Esta semana',
  mes: 'Este mês',
  '7dias': 'Últ. 7 dias',
  '30dias': 'Últ. 30 dias',
};

const TIPO_DATA_LABELS: Record<FiltroTipoData, string> = {
  atualizacao: 'Atualização',
  criacao: 'Criação',
  fechamento: 'Fechamento',
};

const PERIODO_OPTIONS: { value: FiltroPeriodo | ''; label: string }[] = [
  { value: '', label: 'Todos os períodos' },
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mês' },
  { value: '7dias', label: 'Últimos 7 dias' },
  { value: '30dias', label: 'Últimos 30 dias' },
];

export const KanbanFilters = memo(function KanbanFilters({
  filtroProdutoId,
  onChangeProdutoId,
  filtroTemperatura,
  onChangeTemperatura,
  filtroPeriodo,
  onChangePeriodo,
  filtroDataRange,
  onChangeDataRange,
  filtroTipoData,
  onChangeTipoData,
  showArquivados,
  onToggleArquivados,
  produtos,
  filteredCount,
  arquivadasCount,
  totalConvertido,
  activeFilterCount,
  onClearAll,
}: KanbanFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 pb-3">
      {/* Produto */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filtroProdutoId ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 px-3 text-sm gap-1.5 font-normal"
          >
            <span className="truncate max-w-[140px]">
              {filtroProdutoId
                ? (produtos.find((p) => p.id === filtroProdutoId)?.nomeProduto ?? 'Produto')
                : 'Produto'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            {filtroProdutoId && (
              <span
                role="button"
                className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-foreground/10 -mr-1"
                onClick={(e) => { e.stopPropagation(); onChangeProdutoId(''); }}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-0.5">
            {[{ id: '', nomeProduto: 'Todos os produtos' }, ...produtos].map((p) => (
              <button
                key={p.id || '__all__'}
                type="button"
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-sm text-sm transition-colors',
                  filtroProdutoId === p.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-accent',
                )}
                onClick={() => onChangeProdutoId(p.id)}
              >
                {p.nomeProduto}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Temperatura */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filtroTemperatura ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 px-3 text-sm gap-1.5 font-normal"
          >
            <span>{filtroTemperatura ? TEMPERATURA_LABELS[filtroTemperatura] : 'Temperatura'}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            {filtroTemperatura && (
              <span
                role="button"
                className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-foreground/10 -mr-1"
                onClick={(e) => { e.stopPropagation(); onChangeTemperatura(''); }}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-2" align="start">
          <div className="space-y-0.5">
            <button
              type="button"
              className={cn(
                'w-full text-left px-2.5 py-1.5 rounded-sm text-sm transition-colors',
                !filtroTemperatura ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent',
              )}
              onClick={() => onChangeTemperatura('')}
            >
              Todas
            </button>
            {(Object.entries(TEMPERATURA_LABELS) as [OportunidadeTemperatura, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-sm text-sm transition-colors',
                  filtroTemperatura === value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent',
                )}
                onClick={() => onChangeTemperatura(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-5 bg-border hidden sm:block" />

      {/* Data: período + tipo + personalizado em um único popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filtroPeriodo || filtroDataRange?.from ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 px-3 text-sm gap-1.5 font-normal"
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>
              {filtroDataRange?.from
                ? filtroDataRange.to && filtroDataRange.to.getTime() !== filtroDataRange.from.getTime()
                  ? `${dayjs(filtroDataRange.from).format('DD/MM/YY')} – ${dayjs(filtroDataRange.to).format('DD/MM/YY')}`
                  : dayjs(filtroDataRange.from).format('DD/MM/YY')
                : filtroPeriodo
                  ? PERIODO_LABELS[filtroPeriodo]
                  : 'Data'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            {(filtroPeriodo || filtroDataRange?.from) && (
              <span
                role="button"
                className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-foreground/10 -mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangePeriodo('');
                  onChangeDataRange(undefined);
                }}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          {/* Tipo de data */}
          <div className="p-3 pb-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Filtrar por</p>
            <div className="flex gap-1">
              {(['atualizacao', 'criacao', 'fechamento'] as FiltroTipoData[]).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  className={cn(
                    'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                    filtroTipoData === tipo
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => onChangeTipoData(tipo)}
                >
                  {TIPO_DATA_LABELS[tipo]}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t" />

          {/* Períodos rápidos */}
          <div className="p-3 pb-2 space-y-0.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Período</p>
            {PERIODO_OPTIONS.map((opt) => (
              <button
                key={opt.value || '__all__'}
                type="button"
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-sm text-sm transition-colors',
                  filtroPeriodo === opt.value && !filtroDataRange?.from
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-accent text-foreground',
                )}
                onClick={() => {
                  onChangePeriodo(opt.value as FiltroPeriodo | '');
                  if (opt.value) onChangeDataRange(undefined);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="border-t" />

          {/* Personalizado */}
          <div className="p-2">
            <p className="px-0.5 pb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Personalizado</p>
            <Calendar
              mode="range"
              selected={filtroDataRange}
              onSelect={(range) => {
                onChangeDataRange(range);
                if (range?.from) onChangePeriodo('');
              }}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Limpar filtros */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-xs gap-1.5"
          onClick={onClearAll}
        >
          <X className="h-3 w-3" />
          Limpar
          <span className="rounded-full bg-muted-foreground/20 px-1.5 text-[10px] font-medium tabular-nums">
            {activeFilterCount}
          </span>
        </Button>
      )}

      {/* Métricas e ações — direita */}
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
          {filteredCount} oportunidade{filteredCount !== 1 ? 's' : ''}
        </span>

        <div className="h-4 w-px bg-border hidden sm:block" />

        <div className={cn(
          'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium',
          totalConvertido > 0
            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
            : 'bg-muted/60 text-muted-foreground',
        )}>
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          <span>R${' '}{totalConvertido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>

        <Button
          variant={showArquivados ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 px-3 text-xs gap-1.5"
          onClick={onToggleArquivados}
        >
          <Archive className="h-3.5 w-3.5" />
          Arquivados
          {arquivadasCount > 0 && (
            <span className="bg-muted-foreground/20 text-muted-foreground rounded px-1 text-[10px] font-medium">
              {arquivadasCount}
            </span>
          )}
          {showArquivados ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
});
