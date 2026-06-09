import { createFileRoute } from '@tanstack/react-router';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useMetricasFiltros } from '@/modules/metricas/hooks/use-metricas-filtros';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Button } from '@/core/ui/button';
import { Link } from '@tanstack/react-router';
import {
  Clock,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Calendar,
  RefreshCcw,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import { dayjs } from '@/core/utils/date-utils';
import {
  PERIODO_LABELS,
  PERIODO_PRESETS,
} from '@/core/utils/period-presets';
import { formatCurrency, formatCurrencyCompact } from '@/core/utils/format-currency';
import { useEquipes } from '@/modules/equipes/http';
import { useMetricas, type FiltrosMetricas } from '@/modules/metricas/http';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { cn } from '@/core/utils';
import { useIsMobile } from '@/core/hooks/use-mobile';

import { KpiCard } from '@/core/ui/kpi-card';
import { RankingVendedores } from '@/modules/metricas/components/ranking-vendedores';
import { VendedorDetalheView } from '@/modules/metricas/components/vendedor-detalhe-view';
import { type VendedorDetalhe } from '@/modules/metricas/components/metricas-utils';

export const Route = createFileRoute('/_app/metricas/')({
  component: MetricasPage,
});

function MetricasPage() {
  return (
    <PageGuard permission="metricas:acessar">
      <MetricasContent />
    </PageGuard>
  );
}

function MetricasContent() {
  const {
    periodoPreset,
    dataInicio,
    dataFim,
    equipeIdFiltro,
    aplicarPeriodoPreset,
    setPeriodo,
    setEquipeIdFiltro,
  } = useMetricasFiltros();

  const isMobile = useIsMobile();
  const [vendedorSelecionado, setVendedorSelecionado] = useState<VendedorDetalhe | null>(null);

  const { data: equipesData } = useEquipes({ limit: 100 });

  const filtros: FiltrosMetricas = useMemo(() => {
    const f: FiltrosMetricas = { dataInicio, dataFim };
    if (equipeIdFiltro !== 'todas') f.equipeId = equipeIdFiltro;
    return f;
  }, [dataInicio, dataFim, equipeIdFiltro]);

  const {
    data: metricas,
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useMetricas(filtros);

  // "Atualizado há X min" — recalculado a cada 30s
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const calcLabel = () => {
      if (!dataUpdatedAt) { setLastUpdatedLabel(''); return; }
      const diffMin = Math.floor((Date.now() - dataUpdatedAt) / 60000);
      if (diffMin < 1) setLastUpdatedLabel('agora');
      else if (diffMin === 1) setLastUpdatedLabel('há 1 min');
      else setLastUpdatedLabel(`há ${diffMin} min`);
    };
    calcLabel();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(calcLabel, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [dataUpdatedAt]);


  // ── KPIs derivados ──────────────────────────────────────────────────────────

  const totalPremio = Number(metricas?.premioLiquido.resumo.total ?? 0);
  const totalDocumentos = metricas?.premioLiquido.resumo.count ?? 0;
  const totalRenovacoes = metricas?.renovacao.resumo.total ?? 0;
  const renovados = metricas?.renovacao.resumo.renovados ?? 0;
  const taxaConversao = totalRenovacoes > 0 ? (renovados / totalRenovacoes) * 100 : 0;

  const renovacoesVencidas = metricas?.renovacoesVencidas?.total ?? 0;
  const cotacoesParadas = metricas?.cotacoesParadas?.total ?? 0;
  const emAndamento = metricas?.renovacao.resumo.emAndamento ?? 0;

  const premioEmRisco = (metricas?.renovacao.detalhado ?? [])
    .filter((r) =>
      ['NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE'].includes(r.status),
    )
    .reduce((sum, r) => sum + Number(r.premioAnterior || 0), 0);

  // Tendências vs período anterior
  const anterior = metricas?.anterior ?? null;
  const calcDelta = (atual: number, ant: number) =>
    !ant || ant === 0 ? null : ((atual - ant) / ant) * 100;

  const premioDelta = anterior ? calcDelta(totalPremio, anterior.premioLiquido.total) : null;
  const taxaConversaoDelta =
    anterior && anterior.renovacao.total > 0
      ? calcDelta(taxaConversao, (anterior.renovacao.renovados / anterior.renovacao.total) * 100)
      : null;

  const topVendedores = metricas?.topVendedores ?? [];
  const cotacoesParadasPorVendedor = metricas?.cotacoesParadas?.porVendedor ?? [];
  const renovacoesVencidasPorVendedor = metricas?.renovacoesVencidas?.porVendedor ?? [];

  const handleVendedorClick = (vendedorId: string, vendedorNome: string) => {
    const vendedor = topVendedores.find((v) => v.vendedorId === vendedorId);
    setVendedorSelecionado({
      vendedorId,
      vendedorNome,
      equipeNome: vendedor?.equipeNome ?? undefined,
    });
  };

  if (vendedorSelecionado) {
    const avatarUrl =
      topVendedores.find((v) => v.vendedorId === vendedorSelecionado.vendedorId)?.avatarUrl ?? null;
    return (
      <VendedorDetalheView
        vendedor={vendedorSelecionado}
        avatarUrl={avatarUrl}
        filtros={filtros}
        periodoPreset={periodoPreset}
        onVoltar={() => setVendedorSelecionado(null)}
        onVendedorChange={(v) =>
          setVendedorSelecionado({
            vendedorId: v.vendedorId,
            vendedorNome: v.vendedorNome,
            equipeNome: v.equipeNome ?? undefined,
          })
        }
        topVendedores={topVendedores}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              Performance de Gestão
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Visão consolidada por vendedor
            </p>
          </div>
          {/* Melhoria 3: botão de refresh com label mais descritivo */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 sm:h-8 gap-1.5 text-muted-foreground self-start sm:self-auto"
            onClick={() => refetch()}
            disabled={isFetching}
            title={`Atualizado ${lastUpdatedLabel || 'agora'}`}
          >
            <RefreshCcw className={cn('size-3.5', isFetching && 'animate-spin')} />
            {lastUpdatedLabel && (
              <span className="text-xs hidden sm:inline">{lastUpdatedLabel}</span>
            )}
          </Button>
        </div>

        {/* Melhoria 1: presets com scroll horizontal no mobile */}
        <div className="flex w-full sm:w-auto overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-0.5 rounded-lg border p-1 mx-auto sm:mx-0">
            {PERIODO_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant={periodoPreset === preset ? 'default' : 'ghost'}
                size="sm"
                className="h-9 sm:h-7 text-sm sm:text-xs whitespace-nowrap shrink-0"
                onClick={() => aplicarPeriodoPreset(preset)}
              >
                {PERIODO_LABELS[preset]}
              </Button>
            ))}
          </div>
        </div>

        {/* Controles adicionais */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <MonthRangePicker
            dataInicio={dataInicio}
            dataFim={dataFim}
            onChange={setPeriodo}
          />

          {equipesData && equipesData.data.length > 0 && (
            <Select
              value={equipeIdFiltro}
              onValueChange={setEquipeIdFiltro}
            >
              <SelectTrigger className="w-full sm:w-40 h-9 sm:h-8">
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas equipes</SelectItem>
                {equipesData.data
                  .filter((e) => e.ativo)
                  .map((equipe) => (
                    <SelectItem key={equipe.id} value={equipe.id}>
                      {equipe.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" size="sm" className="h-9 sm:h-8 gap-2 w-full sm:w-auto" asChild>
            <Link to="/metricas/renovacoes">
              <RefreshCcw className="size-4" />
              {/* Melhoria 5: texto mais curto no mobile */}
              <span className="sm:hidden">Renovações</span>
              <span className="hidden sm:inline">Gestão de Renovações</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Melhoria 2: KPI cards — scroll horizontal em telas muito pequenas */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="PRÊMIO LÍQUIDO"
          value={formatCurrency(totalPremio)}
          icon={<DollarSign className="size-5 text-green-500" />}
          isLoading={isLoading}
          iconBg="bg-green-50 dark:bg-green-950/30"
          valueColor="text-green-600 dark:text-green-400"
          highlighted
          trend={premioDelta !== null ? { delta: premioDelta, positiveIsGood: true } : undefined}
          footer={
            <span className="text-muted-foreground text-xs">{totalDocumentos} documentos</span>
          }
        />

        <KpiCard
          label="TAXA DE CONVERSÃO"
          value={`${taxaConversao.toFixed(1)}%`}
          icon={<TrendingUp className="size-5 text-emerald-500" />}
          isLoading={isLoading}
          iconBg="bg-emerald-50 dark:bg-emerald-950/30"
          trend={
            taxaConversaoDelta !== null
              ? { delta: taxaConversaoDelta, positiveIsGood: true }
              : undefined
          }
          goal={{ current: taxaConversao, target: 75 }}
        />
        <KpiCard
          label="RENOVAÇÕES PENDENTES"
          value={emAndamento}
          icon={<Clock className="size-5 text-amber-500" />}
          isLoading={isLoading}
          iconBg="bg-amber-50 dark:bg-amber-950/30"
          footer={
            renovacoesVencidas > 0 ? (
              <span className="text-amber-600 text-xs font-medium">
                {renovacoesVencidas} vencidas
              </span>
            ) : undefined
          }
        />
        <KpiCard
          label="COTAÇÕES PARADAS"
          value={cotacoesParadas}
          icon={<AlertTriangle className="size-5 text-orange-500" />}
          isLoading={isLoading}
          iconBg="bg-orange-50 dark:bg-orange-950/30"
          valueColor={
            cotacoesParadas > 0 ? 'text-orange-600 dark:text-orange-400' : undefined
          }
          footer={
            cotacoesParadas > 0 ? (
              <span className="text-muted-foreground text-xs">Paradas há mais de 7 dias</span>
            ) : undefined
          }
        />
        <KpiCard
          label="CARTEIRA EM RISCO"
          value={formatCurrency(premioEmRisco)}
          icon={<ShieldAlert className="size-5 text-red-500" />}
          isLoading={isLoading}
          iconBg="bg-red-50 dark:bg-red-950/30"
          valueColor={premioEmRisco > 0 ? 'text-red-600 dark:text-red-400' : undefined}
          footer={
            renovacoesVencidas > 0 ? (
              <span className="text-red-600 dark:text-red-400 text-xs font-medium">
                {renovacoesVencidas} renovações vencidas
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Ranking */}
      <RankingVendedores
        vendedores={topVendedores}
        cotacoesParadasPorVendedor={cotacoesParadasPorVendedor}
        renovacoesVencidasPorVendedor={renovacoesVencidasPorVendedor}
        isLoading={isLoading}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onVendedorClick={handleVendedorClick}
      />
    </div>
  );
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function buildMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = dayjs();
  for (let i = 35; i >= 0; i--) {
    const d = now.subtract(i, 'month');
    options.push({ value: d.format('YYYY-MM'), label: `${MONTH_NAMES[d.month()]} ${d.year()}` });
  }
  return options;
}

function MonthRangePicker({
  dataInicio,
  dataFim,
  onChange,
}: {
  dataInicio: string;
  dataFim: string;
  onChange: (inicio: string, fim: string) => void;
}) {
  const monthOptions = useMemo(buildMonthOptions, []);
  const inicioYM = dayjs(dataInicio).format('YYYY-MM');
  const fimYM = dayjs(dataFim).format('YYYY-MM');

  const handleInicioChange = (ym: string) => {
    const d = dayjs(ym + '-01');
    const inicio = d.startOf('month').format('YYYY-MM-DD');
    const fim = d.isAfter(dayjs(dataFim), 'month')
      ? d.endOf('month').format('YYYY-MM-DD')
      : dataFim;
    onChange(inicio, fim);
  };

  const handleFimChange = (ym: string) => {
    const d = dayjs(ym + '-01');
    const fim = d.endOf('month').format('YYYY-MM-DD');
    const inicio = d.isBefore(dayjs(dataInicio), 'month')
      ? d.startOf('month').format('YYYY-MM-DD')
      : dataInicio;
    onChange(inicio, fim);
  };

  // Melhoria 6: label compacto no mobile (MMM YY) e completo no desktop
  const labelMobile =
    inicioYM === fimYM
      ? dayjs(dataInicio).format('MMM YY')
      : `${dayjs(dataInicio).format('MMM YY')} – ${dayjs(dataFim).format('MMM YY')}`;
  const labelDesktop =
    inicioYM === fimYM
      ? dayjs(dataInicio).format('MMM YYYY')
      : `${dayjs(dataInicio).format('MMM YYYY')} – ${dayjs(dataFim).format('MMM YYYY')}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 sm:h-8 gap-2 w-full sm:w-auto justify-start sm:justify-center"
        >
          <Calendar className="size-4" />
          <span className="sm:hidden">{labelMobile}</span>
          <span className="hidden sm:inline">{labelDesktop}</span>
        </Button>
      </PopoverTrigger>
      {/* Melhoria 4: align="start" no mobile para evitar estouro lateral */}
      <PopoverContent className="w-[90vw] max-w-sm sm:w-auto p-3" align="start">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-7 shrink-0">De</span>
            <Select value={inicioYM} onValueChange={handleInicioChange}>
              <SelectTrigger className="h-8 sm:h-7 w-full sm:w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-7 shrink-0">Até</span>
            <Select value={fimYM} onValueChange={handleFimChange}>
              <SelectTrigger className="h-8 sm:h-7 w-full sm:w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
