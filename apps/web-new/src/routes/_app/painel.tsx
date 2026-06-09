import { createFileRoute } from '@tanstack/react-router';
import { BarChart3 } from 'lucide-react';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { DashboardContent } from '@/modules/metricas-dashboard/components/dashboard-content';
import { metricasQueryOptions, metricasEvolucaoQueryOptions } from '@/modules/metricas/http';
import { dayjs } from '@/core/utils/date-utils';

export const Route = createFileRoute('/_app/painel')({
  loader: ({ context: { queryClient } }) => {
    const defaultFiltros = {
      dataInicio: dayjs().subtract(3, 'month').format('YYYY-MM-DD'),
      dataFim: dayjs().format('YYYY-MM-DD'),
    };
    return Promise.all([
      queryClient.ensureQueryData(metricasQueryOptions(defaultFiltros)),
      queryClient.ensureQueryData(
        metricasEvolucaoQueryOptions({ ...defaultFiltros, granularidade: 'semana' }),
      ),
    ]).catch(() => {});
  },
  component: MetricasDashboardPage,
});

function MetricasDashboardPage() {
  return (
    <PageGuard permission="metricas:acessar">
      <DashboardContent
        roleContext="corretora"
        title="Métricas"
        subtitle="Análise de performance da corretora"
        icon={<BarChart3 className="size-4" />}
      />
    </PageGuard>
  );
}
