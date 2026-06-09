import { memo, useState } from 'react';
import { type DateRange } from 'react-day-picker';
import { CalendarDays, ChevronDown, Search, X } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/ui/popover';
import { Calendar } from '@/core/ui/calendar';
import { cn } from '@/core/utils';
import { dayjs } from '@/core/utils/date-utils';

interface FilterOption {
  id: string;
  label: string;
}

export interface CrossSellingFiltersState {
  search: string;
  produtoId: string;
  seguradoraId: string;
  vendedorId: string;
  vigenciaInicioRange: DateRange | undefined;
  vigenciaFimRange: DateRange | undefined;
  dataAprovacaoRange: DateRange | undefined;
}

interface CrossSellingFiltersProps {
  filters: CrossSellingFiltersState;
  onChangeFilters: (next: Partial<CrossSellingFiltersState>) => void;
  onClearAll: () => void;
  produtos: FilterOption[];
  seguradoras: FilterOption[];
  vendedores: FilterOption[];
  total: number;
  activeFilterCount: number;
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  width = 'w-52',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: FilterOption[];
  width?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={value ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 px-3 text-sm gap-1.5 font-normal"
        >
          <span className="truncate max-w-[140px]">
            {value ? (options.find((o) => o.id === value)?.label ?? placeholder) : placeholder}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          {value && (
            <span
              role="button"
              className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-foreground/10 -mr-1"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('p-2', width)} align="start">
        <div className="space-y-0.5">
          {[{ id: '', label: `Todos` }, ...options].map((opt) => (
            <button
              key={opt.id || '__all__'}
              type="button"
              className={cn(
                'w-full text-left px-2.5 py-1.5 rounded-sm text-sm transition-colors',
                value === opt.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-accent',
              )}
              onClick={() => onChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const CrossSellingFilters = memo(function CrossSellingFilters({
  filters,
  onChangeFilters,
  onClearAll,
  produtos,
  seguradoras,
  vendedores,
  total,
  activeFilterCount,
}: CrossSellingFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onChangeFilters({ search: searchInput });
  };

  const handleSearchBlur = () => {
    if (searchInput !== filters.search) onChangeFilters({ search: searchInput });
  };

  const vigenciaInicioLabel = (() => {
    const range = filters.vigenciaInicioRange;
    if (!range?.from) return 'Início vigência';
    if (range.to && range.to.getTime() !== range.from.getTime()) {
      return `${dayjs(range.from).format('DD/MM/YY')} – ${dayjs(range.to).format('DD/MM/YY')}`;
    }
    return dayjs(range.from).format('DD/MM/YY');
  })();

  const vigenciaLabel = (() => {
    const range = filters.vigenciaFimRange;
    if (!range?.from) return 'Venc. vigência';
    if (range.to && range.to.getTime() !== range.from.getTime()) {
      return `${dayjs(range.from).format('DD/MM/YY')} – ${dayjs(range.to).format('DD/MM/YY')}`;
    }
    return dayjs(range.from).format('DD/MM/YY');
  })();

  const dataAprovacaoLabel = (() => {
    const range = filters.dataAprovacaoRange;
    if (!range?.from) return 'Dt. aprovação';
    if (range.to && range.to.getTime() !== range.from.getTime()) {
      return `${dayjs(range.from).format('DD/MM/YY')} – ${dayjs(range.to).format('DD/MM/YY')}`;
    }
    return dayjs(range.from).format('DD/MM/YY');
  })();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Busca */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onBlur={handleSearchBlur}
          placeholder="Buscar cliente, apólice..."
          className="h-8 pl-8 text-sm w-52"
        />
        {searchInput && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => {
              setSearchInput('');
              onChangeFilters({ search: '' });
            }}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <div className="w-px h-5 bg-border hidden sm:block" />

      {/* Produto */}
      <FilterSelect
        value={filters.produtoId}
        onChange={(v) => onChangeFilters({ produtoId: v })}
        placeholder="Produto"
        options={produtos}
      />

      {/* Seguradora */}
      <FilterSelect
        value={filters.seguradoraId}
        onChange={(v) => onChangeFilters({ seguradoraId: v })}
        placeholder="Seguradora"
        options={seguradoras}
        width="w-60"
      />

      {/* Vendedor */}
      <FilterSelect
        value={filters.vendedorId}
        onChange={(v) => onChangeFilters({ vendedorId: v })}
        placeholder="Vendedor"
        options={vendedores}
        width="w-56"
      />

      {/* Início da vigência */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filters.vigenciaInicioRange?.from ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 px-3 text-sm gap-1.5 font-normal"
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>{vigenciaInicioLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            {filters.vigenciaInicioRange?.from && (
              <span
                role="button"
                className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-foreground/10 -mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeFilters({ vigenciaInicioRange: undefined });
                }}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
            mode="range"
            selected={filters.vigenciaInicioRange}
            onSelect={(range) => onChangeFilters({ vigenciaInicioRange: range })}
          />
        </PopoverContent>
      </Popover>

      {/* Vencimento da vigência */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filters.vigenciaFimRange?.from ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 px-3 text-sm gap-1.5 font-normal"
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>{vigenciaLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            {filters.vigenciaFimRange?.from && (
              <span
                role="button"
                className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-foreground/10 -mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeFilters({ vigenciaFimRange: undefined });
                }}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
            mode="range"
            selected={filters.vigenciaFimRange}
            onSelect={(range) => onChangeFilters({ vigenciaFimRange: range })}
          />
        </PopoverContent>
      </Popover>

      {/* Dt. aprovação */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={filters.dataAprovacaoRange?.from ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 px-3 text-sm gap-1.5 font-normal"
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>{dataAprovacaoLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            {filters.dataAprovacaoRange?.from && (
              <span
                role="button"
                className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-foreground/10 -mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeFilters({ dataAprovacaoRange: undefined });
                }}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
            mode="range"
            selected={filters.dataAprovacaoRange}
            onSelect={(range) => onChangeFilters({ dataAprovacaoRange: range })}
          />
        </PopoverContent>
      </Popover>

      {/* Limpar */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs gap-1.5" onClick={onClearAll}>
          <X className="h-3 w-3" />
          Limpar
          <span className="rounded-full bg-muted-foreground/20 px-1.5 text-[10px] font-medium tabular-nums">
            {activeFilterCount}
          </span>
        </Button>
      )}

      <div className="ml-auto text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
        {total} seguro{total !== 1 ? 's' : ''} ativo{total !== 1 ? 's' : ''}
      </div>
    </div>
  );
});
