
import { RefreshCcw, AlertTriangle, ShieldAlert, DollarSign } from 'lucide-react';
import { KpiCard } from '../kpi-card';
import { formatCurrency } from '../metricas-utils';
import { useRenovacoesGestao } from '@/modules/renovacoes/http';
import { dayjs } from '@/core/utils/date-utils';

const STATUS_PENDENTES = ['NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE'];

export function RenovacoesKpis() {
  const hoje = dayjs().format('YYYY-MM-DD');

  const { data: totalData, isLoading: loadingTotal } = useRenovacoesGestao({
    limit: 1,
  });

  const { data: pendentesData, isLoading: loadingPendentes } = useRenovacoesGestao({
    limit: 1,
    status: 'NAO_TRABALHADO',
  });

  const { data: vencidasData, isLoading: loadingVencidas } = useRenovacoesGestao({
    limit: 1,
    dataVencimentoFim: hoje,
    status: 'NAO_TRABALHADO',
  });

  // Para prêmio em risco, busca os pendentes com mais itens para somar
  const { data: riscoData, isLoading: loadingRisco } = useRenovacoesGestao({
    limit: 100,
    status: 'NAO_TRABALHADO',
  });

  const totalPendentes =
    (pendentesData as any)?.meta?.total ??
    (pendentesData as any)?.data?.meta?.total ?? 0;

  const totalVencidas =
    (vencidasData as any)?.meta?.total ??
    (vencidasData as any)?.data?.meta?.total ?? 0;

  const totalRenovacoes =
    (totalData as any)?.meta?.total ??
    (totalData as any)?.data?.meta?.total ?? 0;

  const riscoItems = (riscoData as any)?.data ?? (riscoData as any)?.data?.data ?? [];
  const premioEmRisco = Array.isArray(riscoItems)
    ? riscoItems.reduce((sum: number, r: any) => sum + Number(r.premioAnterior || 0), 0)
    : 0;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="TOTAL DE RENOVAÇÕES"
        value={totalRenovacoes}
        icon={<RefreshCcw className="size-5 text-blue-500" />}
        isLoading={loadingTotal}
        iconBg="bg-blue-50 dark:bg-blue-950/30"
      />
      <KpiCard
        label="PENDENTES"
        value={totalPendentes}
        icon={<RefreshCcw className="size-5 text-amber-500" />}
        isLoading={loadingPendentes}
        iconBg="bg-amber-50 dark:bg-amber-950/30"
        valueColor={totalPendentes > 0 ? 'text-amber-600 dark:text-amber-400' : undefined}
      />
      <KpiCard
        label="VENCIDAS"
        value={totalVencidas}
        icon={<AlertTriangle className="size-5 text-red-500" />}
        isLoading={loadingVencidas}
        iconBg="bg-red-50 dark:bg-red-950/30"
        valueColor={totalVencidas > 0 ? 'text-red-600 dark:text-red-400' : undefined}
      />
      <KpiCard
        label="PRÊMIO EM RISCO"
        value={formatCurrency(premioEmRisco)}
        icon={<ShieldAlert className="size-5 text-red-500" />}
        isLoading={loadingRisco}
        iconBg="bg-red-50 dark:bg-red-950/30"
        valueColor={premioEmRisco > 0 ? 'text-red-600 dark:text-red-400' : undefined}
      />
    </div>
  );
}
