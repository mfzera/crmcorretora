
import * as React from 'react';
import {
  Calendar as CalendarIcon,
  User,
  X,
  Building2,
  ChevronDown,
  SlidersHorizontal,
  ArrowLeftRight,
  Package2,
  Activity,
  SlidersVertical,
} from 'lucide-react';
import { type PeriodoPreset, PERIODO_PRESETS, PERIODO_LABELS, applyPreset } from '@/core/utils/period-presets';
import { type DateRange } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale';
import { dayjs } from '@/core/utils/date-utils';
import { Button } from '@/core/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Label } from '@/core/ui/label';
import { Calendar } from '@/core/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import { cn } from '@/core/utils';
import { Skeleton } from '@/core/ui/skeleton';
import { useIsMobile } from '@/core/hooks/use-mobile';
import { getStatusLabel, STATUS_DOCUMENTO_CONFIG } from '@/core/utils/status-config';
import {
  useVendedores,
  useSeguradoras,
  useProdutosParaFiltro,
  FiltrosMetricas,
} from '../http';

const STATUS_DOCUMENTO = Object.entries(STATUS_DOCUMENTO_CONFIG).map(([value]) => ({
  value,
  label: getStatusLabel(value),
}));

const PERIODO_LABELS_MOBILE: Record<string, string> = {
  mes_atual: 'Mês',
  '3_meses': '3M',
  '6_meses': '6M',
  '12_meses': '12M',
};

type MetricasFiltrosProps = {
  filtros: FiltrosMetricas;
  onFiltrosChange: (filtros: FiltrosMetricas) => void;
  filtrosComparacao?: FiltrosMetricas | null;
  onFiltrosComparacaoChange?: (filtros: FiltrosMetricas | null) => void;
};

export function MetricasFiltros({
  filtros,
  onFiltrosChange,
}: MetricasFiltrosProps) {
  const { data: vendedoresData } = useVendedores();
  const vendedores = vendedoresData?.vendedores || [];

  const seguradoras = useSeguradoras();
  const seguradorasList = seguradoras.data || [];

  const isMobile = useIsMobile();

  const temFiltrosAtivos =
    filtros.dataInicio ||
    filtros.dataFim ||
    filtros.vendedorId ||
    filtros.equipeId ||
    filtros.produtoId ||
    filtros.seguradoraParceiraId;

  // Melhoria 1: começa colapsado se não há filtros ativos
  const [isOpen, setIsOpen] = React.useState(() => !!temFiltrosAtivos);

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    () => {
      if (filtros.dataInicio || filtros.dataFim) {
        return {
          from: filtros.dataInicio ? new Date(filtros.dataInicio) : undefined,
          to: filtros.dataFim ? new Date(filtros.dataFim) : undefined,
        };
      }
      return undefined;
    },
  );

  React.useEffect(() => {
    if (dateRange?.from) {
      const dataInicio = dayjs(dateRange.from).format('YYYY-MM-DD');
      const dataFim = dateRange.to
        ? dayjs(dateRange.to).format('YYYY-MM-DD')
        : dataInicio;

      onFiltrosChange({
        ...filtros,
        dataInicio,
        dataFim,
      });
    } else if (!dateRange) {
      const { dataInicio, dataFim, ...restFiltros } = filtros;
      onFiltrosChange(restFiltros);
    }
  }, [dateRange]);

  const handleLimparFiltros = () => {
    setDateRange(undefined);
    onFiltrosChange({});
  };

  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  // Melhoria 2: detectar atalho ativo via helper PERIODO_PRESETS
  const atalhoAtivo = React.useMemo(() => {
    if (!filtros.dataInicio || !filtros.dataFim) return null;
    for (const p of PERIODO_PRESETS) {
      const { dataInicio, dataFim } = applyPreset(p);
      if (filtros.dataInicio === dataInicio && filtros.dataFim === dataFim) return p;
    }
    return null;
  }, [filtros.dataInicio, filtros.dataFim]);

  const filtroAtivoPeriodo =
    filtros.dataInicio && filtros.dataFim
      ? `${new Date(filtros.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} – ${new Date(filtros.dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}`
      : null;
  const filtroAtivoVendedor = filtros.vendedorId
    ? (vendedores.find((v) => v.id === filtros.vendedorId)?.nome ?? 'Vendedor')
    : null;
  const filtroAtivoSeguradora = filtros.seguradoraParceiraId
    ? (seguradorasList.find((s) => s.id === filtros.seguradoraParceiraId)
        ?.nomeFantasia ??
      seguradorasList.find((s) => s.id === filtros.seguradoraParceiraId)
        ?.razaoSocial ??
      'Seguradora')
    : null;

  return (
    <div className="bg-card border rounded-lg">
      {/* Cabeçalho clicável */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/40 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">Filtros</span>
          {!isOpen && temFiltrosAtivos && (
            <div className="flex items-center gap-1.5 ml-1 flex-wrap">
              {filtroAtivoPeriodo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-normal">
                  <CalendarIcon className="h-3 w-3" />
                  {filtroAtivoPeriodo}
                </span>
              )}
              {filtroAtivoVendedor && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-normal">
                  <User className="h-3 w-3" />
                  {filtroAtivoVendedor}
                </span>
              )}
              {filtroAtivoSeguradora && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-normal">
                  <Building2 className="h-3 w-3" />
                  {filtroAtivoSeguradora}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {temFiltrosAtivos && isOpen && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleLimparFiltros();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  handleLimparFiltros();
                }
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              <X className="h-3 w-3" />
              Limpar
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </button>

      {/* Melhoria 3: animação de colapso via grid-rows */}
      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 space-y-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
              {/* Filtro de Data Range */}
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Período
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateRange && 'text-muted-foreground',
                        dateRange && 'border-primary ring-1 ring-primary/30',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {dayjs(dateRange.from).format('DD/MM/YYYY')} -{' '}
                            {dayjs(dateRange.to).format('DD/MM/YYYY')}
                          </>
                        ) : (
                          dayjs(dateRange.from).format('DD/MM/YYYY')
                        )
                      ) : (
                        <span>Selecione um período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  {/* Melhoria 4: 1 mês no mobile, 2 meses no desktop */}
                  <PopoverContent className="w-[calc(100vw-24px)] sm:w-auto p-0 overflow-x-auto" align="start">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={isMobile ? 1 : 2}
                      locale={ptBR}
                      disabled={(date) => date > hoje}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro de Vendedor */}
              <div className="space-y-2">
                <Label htmlFor="vendedor" className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Vendedor
                  </span>
                  {/* Melhoria 5: X para limpar filtro individual */}
                  {filtros.vendedorId && (
                    <button
                      type="button"
                      onClick={() => onFiltrosChange({ ...filtros, vendedorId: undefined })}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Limpar filtro de vendedor"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </Label>
                <Select
                  value={filtros.vendedorId || 'todos'}
                  onValueChange={(value) =>
                    onFiltrosChange({
                      ...filtros,
                      vendedorId: value === 'todos' ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger
                    id="vendedor"
                    className={cn(
                      filtros.vendedorId && 'border-primary ring-1 ring-primary/30',
                    )}
                  >
                    <SelectValue placeholder="Todos os vendedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os vendedores</SelectItem>
                    {vendedores.map((vendedor) => (
                      <SelectItem key={vendedor.id} value={vendedor.id}>
                        {vendedor.nome}
                        {vendedor.cargo?.nomeCargo && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({vendedor.cargo.nomeCargo})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Seguradora Parceira */}
              <div className="space-y-2">
                <Label htmlFor="seguradora" className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Seguradora
                  </span>
                  {/* Melhoria 6: X individual */}
                  {filtros.seguradoraParceiraId && (
                    <button
                      type="button"
                      onClick={() => onFiltrosChange({ ...filtros, seguradoraParceiraId: undefined })}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Limpar filtro de seguradora"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </Label>
                <Select
                  value={filtros.seguradoraParceiraId || 'todas'}
                  onValueChange={(value) =>
                    onFiltrosChange({
                      ...filtros,
                      seguradoraParceiraId: value === 'todas' ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger
                    id="seguradora"
                    className={cn(
                      filtros.seguradoraParceiraId && 'border-primary ring-1 ring-primary/30',
                    )}
                  >
                    <SelectValue placeholder="Todas as seguradoras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as seguradoras</SelectItem>
                    {seguradorasList.map((seguradora) => (
                      <SelectItem key={seguradora.id} value={seguradora.id}>
                        {seguradora.nomeFantasia || seguradora.razaoSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Melhoria 7: atalhos usando PERIODO_PRESETS */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0">Rápido:</span>
              <div className="flex gap-1 flex-wrap">
                {PERIODO_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    variant={atalhoAtivo === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const { dataInicio, dataFim } = applyPreset(preset);
                      setDateRange({
                        from: new Date(dataInicio + 'T00:00:00'),
                        to: new Date(dataFim + 'T00:00:00'),
                      });
                      onFiltrosChange({ ...filtros, dataInicio, dataFim });
                    }}
                  >
                    {PERIODO_LABELS[preset]}
                  </Button>
                ))}
                {dateRange && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRange(undefined)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar Período
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FilterToolbar ─────────────────────────────────────────────────────────────

const SESSION_KEY = 'metricas-filtros-avancados';

function readAdvancedOpen(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === 'true'; } catch { return false; }
}

function writeAdvancedOpen(v: boolean) {
  try { sessionStorage.setItem(SESSION_KEY, String(v)); } catch { /* ignorado */ }
}

function detectPreset(filtros: FiltrosMetricas): PeriodoPreset | null {
  if (!filtros.dataInicio || !filtros.dataFim) return null;
  for (const p of PERIODO_PRESETS) {
    const { dataInicio, dataFim } = applyPreset(p);
    if (filtros.dataInicio === dataInicio && filtros.dataFim === dataFim) return p;
  }
  return null;
}

export function FilterToolbar({
  filtros,
  onFiltrosChange,
  filtrosComparacao,
  onFiltrosComparacaoChange,
}: MetricasFiltrosProps) {
  const { data: vendedoresData, isLoading: isLoadingVendedores } = useVendedores();
  const vendedores = vendedoresData?.vendedores || [];
  const { data: seguradorasList = [], isLoading: isLoadingSeguradoras } = useSeguradoras();
  const { data: produtos = [], isLoading: isLoadingProdutos } = useProdutosParaFiltro();

  // Melhoria 8: detectar mobile para ajustar calendário
  const isMobile = useIsMobile();

  const hoje = new Date();

  const [showAdvanced, setShowAdvanced] = React.useState<boolean>(readAdvancedOpen);

  const toggleAdvanced = () => {
    setShowAdvanced((v) => {
      writeAdvancedOpen(!v);
      return !v;
    });
  };

  const activePreset = detectPreset(filtros);

  const handlePreset = (preset: PeriodoPreset) => {
    const { dataInicio, dataFim } = applyPreset(preset);
    setDateRange({
      from: new Date(dataInicio + 'T00:00:00'),
      to: new Date(dataFim + 'T00:00:00'),
    });
    onFiltrosChange({ ...filtros, dataInicio, dataFim });
  };

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() =>
    filtros.dataInicio || filtros.dataFim
      ? {
          from: filtros.dataInicio ? new Date(filtros.dataInicio + 'T00:00:00') : undefined,
          to: filtros.dataFim ? new Date(filtros.dataFim + 'T00:00:00') : undefined,
        }
      : undefined,
  );

  const [dateRangeComp, setDateRangeComp] = React.useState<DateRange | undefined>(() =>
    filtrosComparacao?.dataInicio || filtrosComparacao?.dataFim
      ? {
          from: filtrosComparacao.dataInicio ? new Date(filtrosComparacao.dataInicio + 'T00:00:00') : undefined,
          to: filtrosComparacao.dataFim ? new Date(filtrosComparacao.dataFim + 'T00:00:00') : undefined,
        }
      : undefined,
  );

  React.useEffect(() => {
    if (dateRange?.from) {
      const dataInicio = dayjs(dateRange.from).format('YYYY-MM-DD');
      const dataFim = dateRange.to ? dayjs(dateRange.to).format('YYYY-MM-DD') : dataInicio;
      onFiltrosChange({ ...filtros, dataInicio, dataFim });
    } else if (dateRange === undefined) {
      const { dataInicio: _i, dataFim: _f, ...rest } = filtros;
      onFiltrosChange(rest);
    }
  }, [dateRange]);

  React.useEffect(() => {
    if (!onFiltrosComparacaoChange) return;
    if (dateRangeComp?.from) {
      onFiltrosComparacaoChange({
        dataInicio: dayjs(dateRangeComp.from).format('YYYY-MM-DD'),
        dataFim: dateRangeComp.to
          ? dayjs(dateRangeComp.to).format('YYYY-MM-DD')
          : dayjs(dateRangeComp.from).format('YYYY-MM-DD'),
      });
    }
  }, [dateRangeComp]);

  const advancedCount = [
    !activePreset && (filtros.dataInicio || filtros.dataFim),
    filtros.vendedorId,
    filtros.seguradoraParceiraId,
    filtros.produtoId,
    filtros.status,
    filtrosComparacao,
  ].filter(Boolean).length;

  const handleLimpar = () => {
    setDateRange(undefined);
    setDateRangeComp(undefined);
    onFiltrosChange({});
    onFiltrosComparacaoChange?.(null);
  };

  const handleRemoverComparacao = () => {
    setDateRangeComp(undefined);
    onFiltrosComparacaoChange?.(null);
  };

  // Melhoria 9: sugestão de período anterior com mesma duração
  const handleSugerirComparacao = () => {
    if (!filtros.dataInicio || !filtros.dataFim) return;
    const dias = dayjs(filtros.dataFim).diff(dayjs(filtros.dataInicio), 'day') + 1;
    const fimComp = dayjs(filtros.dataInicio).subtract(1, 'day');
    const inicioComp = fimComp.subtract(dias - 1, 'day');
    const range: DateRange = {
      from: inicioComp.toDate(),
      to: fimComp.toDate(),
    };
    setDateRangeComp(range);
    onFiltrosComparacaoChange?.({
      dataInicio: inicioComp.format('YYYY-MM-DD'),
      dataFim: fimComp.format('YYYY-MM-DD'),
    });
  };

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      {/* Camada 1: presets + toggle */}
      <div className="flex items-center gap-1.5">
        {/* Grupo de presets */}
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-1 flex-1 sm:flex-none">
          {PERIODO_PRESETS.map((preset) => (
            <Button
              key={preset}
              variant={activePreset === preset ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs whitespace-nowrap shrink-0 flex-1 sm:flex-none"
              onClick={() => handlePreset(preset)}
            >
              {/* label curto no mobile, completo no desktop */}
              <span className="sm:hidden">{PERIODO_LABELS_MOBILE[preset]}</span>
              <span className="hidden sm:inline">{PERIODO_LABELS[preset]}</span>
            </Button>
          ))}
        </div>

        {/* Toggle filtros avançados */}
        <Button
          variant={showAdvanced ? 'secondary' : 'outline'}
          size="sm"
          className={cn(
            'h-9 sm:h-7 gap-1.5 text-xs shrink-0 px-3 sm:px-2.5',
            advancedCount > 0 && !showAdvanced && 'border-primary text-primary',
          )}
          onClick={toggleAdvanced}
        >
          <SlidersVertical className="size-3.5 sm:size-3" />
          <span className="hidden sm:inline">Filtros</span>
          {advancedCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
              {advancedCount}
            </span>
          )}
          <ChevronDown className={cn('size-3 transition-transform duration-200', showAdvanced && 'rotate-180')} />
        </Button>
      </div>

      {/* Melhoria 12: animação de colapso via grid-rows em vez de renderização condicional */}
      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          showAdvanced ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md border bg-muted/30 mt-0.5">
            {/* Date range customizado */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-7 gap-1.5 text-xs font-normal bg-background',
                    dateRange && !activePreset && 'border-primary text-primary',
                  )}
                >
                  <CalendarIcon className="size-3 shrink-0" />
                  <span className="truncate max-w-[120px]">
                    {dateRange?.from
                      ? `${dayjs(dateRange.from).format('DD/MM')} – ${dayjs(dateRange.to ?? dateRange.from).format('DD/MM')}`
                      : 'Período personalizado'}
                  </span>
                </Button>
              </PopoverTrigger>
              {/* Melhoria 13: 1 mês no mobile */}
              <PopoverContent className="w-[calc(100vw-24px)] sm:w-auto p-0 overflow-x-auto" align="end">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={isMobile ? 1 : 2}
                  locale={ptBR}
                  disabled={(date) => date > hoje}
                />
              </PopoverContent>
            </Popover>

            {/* Período de comparação */}
            {onFiltrosComparacaoChange && (
              filtrosComparacao ? (
                <>
                  <span className="text-[10px] text-muted-foreground">vs</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn('h-7 gap-1.5 text-xs font-normal bg-background', dateRangeComp && 'border-primary text-primary')}
                      >
                        <CalendarIcon className="size-3 shrink-0" />
                        <span className="truncate max-w-[100px]">
                          {dateRangeComp?.from
                            ? `${dayjs(dateRangeComp.from).format('DD/MM')} – ${dayjs(dateRangeComp.to ?? dateRangeComp.from).format('DD/MM')}`
                            : 'Anterior'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[calc(100vw-24px)] sm:w-auto p-0 overflow-x-auto" align="end">
                      <Calendar
                        mode="range"
                        defaultMonth={dateRangeComp?.from}
                        selected={dateRangeComp}
                        onSelect={setDateRangeComp}
                        numberOfMonths={isMobile ? 1 : 2}
                        locale={ptBR}
                        disabled={(date) => date > hoje}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleRemoverComparacao}>
                    <X className="size-3" />
                  </Button>
                </>
              ) : (
                // Melhoria 14: botão "Comparar" com sugestão de período anterior
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-background"
                    onClick={() => onFiltrosComparacaoChange?.({})}
                  >
                    <ArrowLeftRight className="size-3" />
                    Comparar
                  </Button>
                  {filtros.dataInicio && filtros.dataFim && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground px-1.5"
                      title="Comparar com período anterior de mesma duração"
                      onClick={handleSugerirComparacao}
                    >
                      vs anterior
                    </Button>
                  )}
                </div>
              )
            )}

            {/* Vendedor */}
            {isLoadingVendedores ? (
              <Skeleton className="h-7 w-28 rounded-md" />
            ) : (
              <div className="flex items-center gap-0.5">
                <Select
                  value={filtros.vendedorId || 'todos'}
                  onValueChange={(v) => onFiltrosChange({ ...filtros, vendedorId: v === 'todos' ? undefined : v })}
                >
                  <SelectTrigger className={cn('h-7 text-xs w-auto min-w-[100px] bg-background', filtros.vendedorId && 'border-primary text-primary')}>
                    <User className="size-3 mr-1 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os vendedores</SelectItem>
                    {vendedores.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Melhoria 15: X para limpar filtro individual */}
                {filtros.vendedorId && (
                  <button
                    type="button"
                    onClick={() => onFiltrosChange({ ...filtros, vendedorId: undefined })}
                    className="h-7 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label="Limpar vendedor"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            )}

            {/* Seguradora */}
            {isLoadingSeguradoras ? (
              <Skeleton className="h-7 w-28 rounded-md" />
            ) : (
              <div className="flex items-center gap-0.5">
                <Select
                  value={filtros.seguradoraParceiraId || 'todas'}
                  onValueChange={(v) => onFiltrosChange({ ...filtros, seguradoraParceiraId: v === 'todas' ? undefined : v })}
                >
                  <SelectTrigger className={cn('h-7 text-xs w-auto min-w-[100px] bg-background', filtros.seguradoraParceiraId && 'border-primary text-primary')}>
                    <Building2 className="size-3 mr-1 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Seguradora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as seguradoras</SelectItem>
                    {seguradorasList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nomeFantasia || s.razaoSocial}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filtros.seguradoraParceiraId && (
                  <button
                    type="button"
                    onClick={() => onFiltrosChange({ ...filtros, seguradoraParceiraId: undefined })}
                    className="h-7 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label="Limpar seguradora"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            )}

            {/* Produto */}
            {isLoadingProdutos ? (
              <Skeleton className="h-7 w-24 rounded-md" />
            ) : (
              <div className="flex items-center gap-0.5">
                <Select
                  value={filtros.produtoId || 'todos'}
                  onValueChange={(v) => onFiltrosChange({ ...filtros, produtoId: v === 'todos' ? undefined : v })}
                >
                  <SelectTrigger className={cn('h-7 text-xs w-auto min-w-[90px] bg-background', filtros.produtoId && 'border-primary text-primary')}>
                    <Package2 className="size-3 mr-1 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os produtos</SelectItem>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nomeProduto}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filtros.produtoId && (
                  <button
                    type="button"
                    onClick={() => onFiltrosChange({ ...filtros, produtoId: undefined })}
                    className="h-7 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label="Limpar produto"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-0.5">
              <Select
                value={filtros.status || 'todos'}
                onValueChange={(v) => onFiltrosChange({ ...filtros, status: v === 'todos' ? undefined : v })}
              >
                <SelectTrigger className={cn('h-7 text-xs w-auto min-w-[90px] bg-background', filtros.status && 'border-primary text-primary')}>
                  <Activity className="size-3 mr-1 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {STATUS_DOCUMENTO.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filtros.status && (
                <button
                  type="button"
                  onClick={() => onFiltrosChange({ ...filtros, status: undefined })}
                  className="h-7 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Limpar status"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Limpar tudo */}
            {advancedCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleLimpar}>
                <X className="size-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
