import { useState, useMemo, useTransition, useDeferredValue, lazy, Suspense } from 'react';
import { BarChart3, LayoutDashboard, RefreshCcw } from 'lucide-react';
import { KpiCard } from '@/core/ui/kpi-card';
import { HealthScoreCard } from './health-score-card';
import { PipelineHealthStrip } from './pipeline-health-strip';
import { VendedoresRankingTable } from './vendedores-ranking-table';
import { AlertsCompactStrip } from './alerts-compact-strip';
import { AlertDetailsSheet } from './alert-details-sheet';
import { FilterToolbar } from '@/modules/metricas/components/metricas-filtros';
import { Skeleton } from '@/core/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Button } from '@/core/ui/button';
import {
  useMetricas,
  useMetricasEvolucao,
  type FiltrosMetricas,
  type Granularidade,
} from '@/modules/metricas/http';
import { dayjs } from '@/core/utils/date-utils';
import { formatCurrency } from '@/core/utils/format-currency';
import { calcDelta, CLOSED_STATUSES } from '../utils';
import { cn } from '@/core/utils';
import { useIsMobile } from '@/core/hooks/use-mobile';

const PremioSeguradoraChart = lazy(() =>
  import('./premio-seguradora-chart').then((m) => ({ default: m.PremioSeguradoraChart })),
);
const SeguradorasMixChart = lazy(() =>
  import('./seguradoras-mix-chart').then((m) => ({ default: m.SeguradorasMixChart })),
);
const MetricasTabs = lazy(() =>
  import('@/modules/metricas/components/metricas-tabs').then((m) => ({ default: m.MetricasTabs })),
);

export type DashboardRoleContext = 'corretora' | 'gestor';

type Props = {
  roleContext: DashboardRoleContext;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
};

export function DashboardContent({ roleContext, title, subtitle, icon }: Props) {
  const [, startTransition] = useTransition();

  const [filtros, setFiltros] = useState<FiltrosMetricas>(() => ({
    dataInicio: dayjs().subtract(3, 'month').format('YYYY-MM-DD'),
    dataFim: dayjs().format('YYYY-MM-DD'),
  }));
  const [filtrosComparacao, setFiltrosComparacao] = useState<FiltrosMetricas | null>(null);
  const [alertSheet, setAlertSheet] = useState<{
    open: boolean;
    categoria: 'renovacoes_vencidas' | 'cotacoes_paradas';
    vendedorId?: string;
    vendedorNome?: string;
  }>({ open: false, categoria: 'renovacoes_vencidas' });

  const deferredFiltros = useDeferredValue(filtros);
  const deferredFiltrosComparacao = useDeferredValue(filtrosComparacao);

  // Melhoria 1: detectar mobile para ajustes de layout
  const isMobile = useIsMobile();

  const granularidade: Granularidade = useMemo(() => {
    if (!deferredFiltros.dataInicio || !deferredFiltros.dataFim) return 'mes';
    const dias = dayjs(deferredFiltros.dataFim).diff(dayjs(deferredFiltros.dataInicio), 'day');
    if (dias <= 60) return 'dia';
    if (dias <= 180) return 'semana';
    return 'mes';
  }, [deferredFiltros.dataInicio, deferredFiltros.dataFim]);

  const { data: metricas, isLoading, isFetching, refetch } = useMetricas(deferredFiltros);

  const filtrosComparacaoCompletos: FiltrosMetricas | null =
    deferredFiltrosComparacao?.dataInicio
      ? {
          ...deferredFiltrosComparacao,
          vendedorId: deferredFiltros.vendedorId,
          seguradoraParceiraId: deferredFiltros.seguradoraParceiraId,
        }
      : null;

  const { data: metricasComparacao } = useMetricas(filtrosComparacaoCompletos ?? {}, {
    enabled: !!filtrosComparacaoCompletos,
  });

  const { data: evolucao = [], isLoading: isLoadingEvolucao } = useMetricasEvolucao({
    dataInicio: deferredFiltros.dataInicio,
    dataFim: deferredFiltros.dataFim,
    vendedorId: deferredFiltros.vendedorId,
    produtoId: deferredFiltros.produtoId,
    status: deferredFiltros.status,
    granularidade,
  });

  const { data: evolucaoComparacao = [] } = useMetricasEvolucao(
    {
      dataInicio: filtrosComparacaoCompletos?.dataInicio,
      dataFim: filtrosComparacaoCompletos?.dataFim,
      vendedorId: deferredFiltros.vendedorId,
      produtoId: deferredFiltros.produtoId,
      status: deferredFiltros.status,
      granularidade,
    },
    { enabled: !!filtrosComparacaoCompletos },
  );

  const sparkPremio = useMemo(
    () => evolucao.slice(-8).map((e) => Number(e.totalPremio)),
    [evolucao],
  );
  const sparkComissao = useMemo(
    () => evolucao.slice(-8).map((e) => Number(e.mediaPercentualComissao ?? 0)),
    [evolucao],
  );

  const totalPremio = metricas?.premioLiquido.resumo.total ?? 0;
  const totalApolicoes = metricas?.premioLiquido.resumo.count ?? 0;
  const totalComissao = metricas?.comissao.resumo.totalComissao ?? 0;
  const totalCorretora = metricas?.comissao.resumo.totalCorretora ?? 0;
  const mediaPercentualComissao = Number(metricas?.comissao.resumo.mediaPercentualComissao ?? 0);

  const clientesPF = metricas?.cadastro.clientesPF ?? 0;
  const clientesPJ = metricas?.cadastro.clientesPJ ?? 0;
  const clientesAtivos = metricas?.cadastro.clientesAtivos ?? 0;
  const totalClientes = metricas?.cadastro.totalClientes ?? 0;
  const taxaAtividade = totalClientes > 0 ? (clientesAtivos / totalClientes) * 100 : 0;

  const totalRenovacoes = metricas?.renovacao.resumo.total ?? 0;
  const renovados = metricas?.renovacao.resumo.renovados ?? 0;
  const taxaRenovacao = totalRenovacoes > 0 ? (renovados / totalRenovacoes) * 100 : 0;

  const pipelineStatus = metricas?.kanban.porStatus ?? [];
  const pipelineAberto = useMemo(
    () =>
      pipelineStatus
        .filter((s) => !CLOSED_STATUSES.has(s.status))
        .reduce(
          (acc, s) => ({
            count: acc.count + Number(s.count),
            premio: acc.premio + Number(s.premioEstimado),
          }),
          { count: 0, premio: 0 },
        ),
    [pipelineStatus],
  );

  const labelComp = filtrosComparacaoCompletos?.dataInicio
    ? `vs ${dayjs(filtrosComparacaoCompletos.dataInicio).format('DD/MM')}–${dayjs(filtrosComparacaoCompletos.dataFim).format('DD/MM/YY')}`
    : undefined;

  const deltaPremio = metricasComparacao
    ? calcDelta(totalPremio, metricasComparacao.premioLiquido.resumo.total)
    : null;

  const deltaComissaoTotal = metricasComparacao
    ? calcDelta(totalComissao, metricasComparacao.comissao.resumo.totalComissao)
    : null;

  const deltaClientes = metricasComparacao
    ? calcDelta(clientesAtivos, metricasComparacao.cadastro.clientesAtivos)
    : null;

  const taxaRenovacaoComp = metricasComparacao
    ? (metricasComparacao.renovacao.resumo.renovados /
        (metricasComparacao.renovacao.resumo.total || 1)) *
      100
    : undefined;
  const deltaRenovacao = calcDelta(taxaRenovacao, taxaRenovacaoComp);

  // Melhoria 2: label do período atual para exibir no header
  const periodoLabel = useMemo(() => {
    if (!filtros.dataInicio || !filtros.dataFim) return '';
    return `${dayjs(filtros.dataInicio).format('DD/MM/YY')} – ${dayjs(filtros.dataFim).format('DD/MM/YY')}`;
  }, [filtros.dataInicio, filtros.dataFim]);

  return (
    <>
    <Tabs defaultValue="visao-geral" className="flex flex-col h-full">

      {/* ── Header + FilterToolbar ──────────────────────────────────────────── */}
      <div className="shrink-0 bg-card">
        {/* Melhoria 3: layout responsivo — header empilha no mobile */}
        <header className="border-b px-3 sm:px-6 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-muted-foreground shrink-0">{icon}</span>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold leading-none">{title}</h1>
                {/* Melhoria 4: período no subtítulo no mobile */}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  <span className="hidden sm:inline">{subtitle} · </span>
                  <span className="text-foreground/70">{periodoLabel}</span>
                </p>
              </div>
            </div>
            {/* Melhoria 5: botão de refresh no header */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground sm:hidden"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Atualizar dados"
            >
              <RefreshCcw className={cn('size-3.5', isFetching && 'animate-spin')} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <FilterToolbar
              filtros={filtros}
              onFiltrosChange={(f) => startTransition(() => setFiltros(f))}
              filtrosComparacao={filtrosComparacao}
              onFiltrosComparacaoChange={(f) => startTransition(() => setFiltrosComparacao(f))}
            />
            {/* Melhoria 6: refresh visível no desktop */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hidden sm:flex"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Atualizar dados"
            >
              <RefreshCcw className={cn('size-3.5', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </header>

        {/* Melhoria 7: tabs com scroll horizontal no mobile */}
        <div className="border-b px-3 sm:px-6 overflow-x-auto">
          <TabsList className="h-11 sm:h-10 rounded-none bg-transparent p-0 gap-0 border-0 justify-start w-full min-w-max">
            <TabsTrigger
              value="visao-geral"
              className={cn(
                'h-full rounded-none border-b-2 border-transparent shrink-0',
                'data-[state=active]:border-primary data-[state=active]:bg-transparent',
                'px-3 sm:px-4 text-xs sm:text-sm font-medium gap-1.5',
                'text-muted-foreground data-[state=active]:text-foreground transition-none',
              )}
            >
              <LayoutDashboard className="size-3.5" />
              {/* Melhoria 8: label completo em todos os tamanhos */}
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger
              value="analise-detalhada"
              className={cn(
                'h-full rounded-none border-b-2 border-transparent shrink-0',
                'data-[state=active]:border-primary data-[state=active]:bg-transparent',
                'px-3 sm:px-4 text-xs sm:text-sm font-medium gap-1.5',
                'text-muted-foreground data-[state=active]:text-foreground transition-none',
              )}
            >
              <BarChart3 className="size-3.5" />
              <span>Análise Detalhada</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      {/* ── Conteúdo scrollável ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Tab: Visão Geral ─────────────────────────────────────────────── */}
        <TabsContent value="visao-geral" className="px-3 sm:px-6 pt-4 pb-8 space-y-4 m-0">

          {/* KPI grid — 2 colunas mobile, 3 tablet, 5 desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border rounded-lg border overflow-hidden">
            <div className="bg-card">
              <KpiCard
                variant="metric"
                label="Prêmio Líquido"
                value={formatCurrency(totalPremio)}
                hint={`${totalApolicoes} apólices emitidas`}
                trend={deltaPremio !== null && labelComp ? { delta: deltaPremio, label: labelComp } : undefined}
                sparkline={sparkPremio.length > 1 ? sparkPremio : undefined}
                isLoading={isLoading}
              />
            </div>
            <div className="bg-card">
              <KpiCard
                variant="metric"
                label="Comissão"
                value={formatCurrency(totalComissao)}
                hint={`${mediaPercentualComissao.toFixed(1)}% média · +${formatCurrency(totalCorretora)} corretora`}
                trend={deltaComissaoTotal !== null && labelComp ? { delta: deltaComissaoTotal, label: labelComp } : undefined}
                sparkline={sparkComissao.length > 1 ? sparkComissao : undefined}
                isLoading={isLoading}
              />
            </div>
            <div className="bg-card">
              <KpiCard
                variant="metric"
                label="Clientes Ativos"
                value={clientesAtivos}
                hint={`${clientesPF} PF · ${clientesPJ} PJ · ${totalClientes} total`}
                trend={deltaClientes !== null && labelComp ? { delta: deltaClientes, label: labelComp } : undefined}
                isLoading={isLoading}
              />
            </div>
            <div className="bg-card">
              <KpiCard
                variant="metric"
                label="Taxa Renovação"
                value={`${taxaRenovacao.toFixed(1)}%`}
                hint={taxaRenovacao >= 60 ? `${renovados}/${totalRenovacoes} · dentro da meta` : `${renovados}/${totalRenovacoes} · abaixo da meta`}
                trend={deltaRenovacao !== null && labelComp ? { delta: deltaRenovacao, label: labelComp } : undefined}
                goal={{ current: taxaRenovacao, target: 60 }}
                isLoading={isLoading}
              />
            </div>
            {/* Último card: ocupa 2 colunas no mobile (linha cheia) e 1 no restante */}
            <div className="bg-card col-span-2 sm:col-span-1">
              <KpiCard
                variant="metric"
                label="Pipeline Aberto"
                value={pipelineAberto.count}
                hint={`${formatCurrency(pipelineAberto.premio)} estimado`}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* ROW 2: Evolução de prêmio */}
          <Suspense fallback={<Skeleton className="h-[240px] sm:h-[300px] w-full rounded" />}>
            <PremioSeguradoraChart
              data={evolucao}
              dataComparacao={filtrosComparacaoCompletos ? evolucaoComparacao : undefined}
              labelComparacao={labelComp}
              isLoading={isLoadingEvolucao}
              granularidade={granularidade}
            />
          </Suspense>

          {/* Melhoria 10: insights grid responsivo — 1 col mobile, 2 tablet, 4 desktop */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-h-[200px] sm:[&>*]:min-h-[220px]">
            <HealthScoreCard
              taxaRenovacao={taxaRenovacao}
              cotacoesParadas={metricas?.cotacoesParadas?.total ?? 0}
              taxaAtividadeClientes={taxaAtividade}
              isLoading={isLoading}
            />
            <PipelineHealthStrip
              porStatus={pipelineStatus}
              porTemperatura={metricas?.kanban.porTemperatura ?? []}
              isLoading={isLoading}
            />
            <Suspense fallback={<Skeleton className="h-[200px] w-full rounded" />}>
              <SeguradorasMixChart
                data={metricas?.seguradoras.metricas ?? []}
                isLoading={isLoading}
              />
            </Suspense>
            <VendedoresRankingTable
              data={metricas?.topVendedores ?? []}
              isLoading={isLoading}
              onVendedorClick={(id) =>
                startTransition(() => setFiltros((prev) => ({ ...prev, vendedorId: id })))
              }
            />
          </div>

          {/* ROW 4: Alertas */}
          <AlertsCompactStrip
            renovacoesVencidas={metricas?.renovacoesVencidas ?? { total: 0, porVendedor: [] }}
            cotacoesParadas={metricas?.cotacoesParadas ?? { total: 0, porVendedor: [] }}
            isLoading={isLoading}
            onVendedorClick={(vendedorId) =>
              startTransition(() => setFiltros((prev) => ({ ...prev, vendedorId })))
            }
            onAlertClick={(categoria, vendedorId, vendedorNome) =>
              setAlertSheet({ open: true, categoria, vendedorId, vendedorNome })
            }
          />
        </TabsContent>

        {/* ── Tab: Análise Detalhada ────────────────────────────────────────── */}
        <TabsContent value="analise-detalhada" className="p-3 sm:p-6 m-0">
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded" />}>
            <MetricasTabs metricas={metricas} isLoading={isLoading} />
          </Suspense>
        </TabsContent>

      </div>
    </Tabs>

    <AlertDetailsSheet
      open={alertSheet.open}
      onOpenChange={(v) => setAlertSheet((s) => ({ ...s, open: v }))}
      categoria={alertSheet.categoria}
      vendedorId={alertSheet.vendedorId}
      vendedorNome={alertSheet.vendedorNome}
    />
    </>
  );
}
