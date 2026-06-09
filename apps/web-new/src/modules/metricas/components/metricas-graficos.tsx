
import { lazy, Suspense } from 'react';
import { MetricasResumo } from '../http';

const PipelineStatusChart = lazy(() =>
  import('./pipeline-status-chart').then((m) => ({ default: m.PipelineStatusChart })),
);
const PipelinePrioridadeChart = lazy(() =>
  import('./pipeline-prioridade-chart').then((m) => ({ default: m.PipelinePrioridadeChart })),
);
const PipelineTemperaturaChart = lazy(() =>
  import('./pipeline-temperatura-chart').then((m) => ({ default: m.PipelineTemperaturaChart })),
);
const PremioStatusChart = lazy(() =>
  import('./premio-status-chart').then((m) => ({ default: m.PremioStatusChart })),
);
const RenovacaoStatusChart = lazy(() =>
  import('./renovacao-status-chart').then((m) => ({ default: m.RenovacaoStatusChart })),
);
const EndossoTiposChart = lazy(() =>
  import('./endosso-tipos-chart').then((m) => ({ default: m.EndossoTiposChart })),
);

function ChartSkeleton() {
  return <div className="h-[400px] rounded-lg border bg-card animate-pulse" />;
}

type MetricasGraficosProps = {
  metricas?: MetricasResumo;
  isLoading?: boolean;
};

export function MetricasGraficos({ metricas, isLoading }: MetricasGraficosProps) {
  if (isLoading || !metricas) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <ChartSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {metricas.kanban.porStatus.length > 0 && (
        <Suspense fallback={<ChartSkeleton />}>
          <PipelineStatusChart data={metricas.kanban.porStatus} />
        </Suspense>
      )}
      {metricas.kanban.porPrioridade.length > 0 && (
        <Suspense fallback={<ChartSkeleton />}>
          <PipelinePrioridadeChart data={metricas.kanban.porPrioridade} />
        </Suspense>
      )}
      {metricas.kanban.porTemperatura.length > 0 && (
        <Suspense fallback={<ChartSkeleton />}>
          <PipelineTemperaturaChart data={metricas.kanban.porTemperatura} />
        </Suspense>
      )}
      {metricas.premioLiquido.porStatus.length > 0 && (
        <Suspense fallback={<ChartSkeleton />}>
          <PremioStatusChart data={metricas.premioLiquido.porStatus} />
        </Suspense>
      )}
      {metricas.renovacao.detalhado.length > 0 && (
        <Suspense fallback={<ChartSkeleton />}>
          <RenovacaoStatusChart data={metricas.renovacao.detalhado} />
        </Suspense>
      )}
      {metricas.endosso.detalhado.length > 0 && (
        <Suspense fallback={<ChartSkeleton />}>
          <EndossoTiposChart data={metricas.endosso.detalhado} />
        </Suspense>
      )}
    </div>
  );
}
