
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/core/ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Skeleton } from '@/core/ui/skeleton';
import { Badge } from '@/core/ui/badge';
import { adminApi, type NeonProjectConsumption } from '@/infra/http/admin-api';
import {
  Cpu,
  HardDrive,
  ArrowDownUp,
  DollarSign,
  TrendingDown,
  Gift,
  AlertCircle,
  Database,
  PencilLine,
} from 'lucide-react';

// ─── Preços Neon (pay-as-you-go / launch plan) ───────────────────────────────
// https://neon.tech/pricing  (preços pós free tier)
const NEON_PRICING = {
  compute:  { pricePerCUHour: 0.106, freeTierHours: 5    },
  storage:  { pricePerGBMonth: 0.35, freeTierGB: 10      }, // Launch: 10 GB incluídos
  transfer: { pricePerGB: 0.09,      freeTierGB: 5       },
};

// Planos Neon (para exibição do free tier correto)
const PLAN_STORAGE_FREE: Record<string, number> = {
  free:       0.5,
  launch_v3:  10,
  scale_v3:   50,
  business:   500,
};

function calcNeonCost(
  computeHours: number,
  storageGBMonth: number,
  transferGB: number,
  subscriptionType?: string,
) {
  const freeStorage = PLAN_STORAGE_FREE[subscriptionType ?? ''] ?? NEON_PRICING.storage.freeTierGB;

  const billableCompute  = Math.max(0, computeHours   - NEON_PRICING.compute.freeTierHours);
  const billableStorage  = Math.max(0, storageGBMonth - freeStorage);
  const billableTransfer = Math.max(0, transferGB     - NEON_PRICING.transfer.freeTierGB);

  const computeCost  = billableCompute  * NEON_PRICING.compute.pricePerCUHour;
  const storageCost  = billableStorage  * NEON_PRICING.storage.pricePerGBMonth;
  const transferCost = billableTransfer * NEON_PRICING.transfer.pricePerGB;
  const total = computeCost + storageCost + transferCost;

  const savedCompute  = Math.min(computeHours,   NEON_PRICING.compute.freeTierHours) * NEON_PRICING.compute.pricePerCUHour;
  const savedStorage  = Math.min(storageGBMonth, freeStorage)                        * NEON_PRICING.storage.pricePerGBMonth;
  const savedTransfer = Math.min(transferGB,     NEON_PRICING.transfer.freeTierGB)   * NEON_PRICING.transfer.pricePerGB;
  const totalSaved = savedCompute + savedStorage + savedTransfer;

  return { computeCost, storageCost, transferCost, total, totalSaved, freeStorage };
}

// ─── Chart config ─────────────────────────────────────────────────────────────
const chartConfig = {
  'CU-h': { label: 'Compute (CU-h)', color: '#3b82f6' },
} satisfies ChartConfig;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtUSD(v: number) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 });
}

function cuSecondsToHours(s: number) { return s / 3600; }
function bytesToGB(b: number)        { return b / 1e9; }
function bytesHourToGBMonth(bh: number) { return bh / 730 / 1e9; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function planLabel(sub?: string) {
  const map: Record<string, string> = {
    free: 'Free', launch_v3: 'Launch', scale_v3: 'Scale', business: 'Business',
  };
  return map[sub ?? ''] ?? sub ?? '—';
}

/** Agrega dados de todos os projetos por dia (para modo org com histórico diário) */
function buildDailyChart(data: NeonProjectConsumption[]) {
  const byDay: Record<string, number> = {};
  for (const proj of data) {
    for (const p of proj.periods) {
      const day = p.period_start.split('T')[0];
      byDay[day] = (byDay[day] ?? 0) + cuSecondsToHours(p.compute_unit_seconds ?? 0);
    }
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, 'CU-h': parseFloat(v.toFixed(4)) }));
}

/** Totais consolidados de todos os projetos/períodos */
function calcTotals(data: NeonProjectConsumption[]) {
  let computeSec = 0, storageByteHour = 0, transferBytes = 0, writtenBytes = 0;
  let syntheticStorageBytes = 0;

  for (const proj of data) {
    syntheticStorageBytes += proj.synthetic_storage_size ?? 0;
    for (const p of proj.periods) {
      computeSec       += p.compute_unit_seconds    ?? 0;
      storageByteHour  += p.data_storage_bytes_hour ?? 0;
      transferBytes    += p.data_transfer_bytes     ?? 0;
      writtenBytes     += p.written_data_bytes      ?? 0;
    }
  }

  // Para project-scoped (billing period), usa synthetic_storage_size como referência de storage
  // Para org mode, usa data_storage_bytes_hour convertido a GB-month
  const storageGBMonth = storageByteHour > 0
    ? bytesHourToGBMonth(storageByteHour)
    : bytesToGB(syntheticStorageBytes);

  return {
    computeHours: cuSecondsToHours(computeSec),
    storageGBMonth,
    transferGB: bytesToGB(transferBytes),
    writtenGB:  bytesToGB(writtenBytes),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <div className={`rounded-md p-2 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function CostRow({ label, detail, cost, free }: {
  label: string; detail: string; cost: number; free?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="text-right">
        {free
          ? <span className="text-xs font-semibold text-emerald-500">GRÁTIS</span>
          : <span className="text-sm font-semibold">{fmtUSD(cost)}</span>
        }
      </div>
    </div>
  );
}

function CostBreakdown({ computeHours, storageGBMonth, transferGB, subscriptionType }: {
  computeHours: number; storageGBMonth: number; transferGB: number; subscriptionType?: string;
}) {
  const cost = calcNeonCost(computeHours, storageGBMonth, transferGB, subscriptionType);

  return (
    <div className="rounded-lg border p-4 space-y-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Estimativa do billing period</p>
        </div>
        {cost.totalSaved > 0 && (
          <Badge variant="outline" className="text-emerald-500 border-emerald-500 gap-1 text-xs">
            <Gift className="h-3 w-3" />
            Plano economiza {fmtUSD(cost.totalSaved)}
          </Badge>
        )}
      </div>

      <CostRow
        label="Compute"
        detail={`${computeHours.toFixed(3)} CU-h × $${NEON_PRICING.compute.pricePerCUHour}/CU-h · free: ${NEON_PRICING.compute.freeTierHours} CU-h`}
        cost={cost.computeCost}
        free={cost.computeCost === 0}
      />
      <CostRow
        label="Armazenamento"
        detail={`${storageGBMonth.toFixed(3)} GB × $${NEON_PRICING.storage.pricePerGBMonth}/GB-mês · incluído: ${cost.freeStorage} GB`}
        cost={cost.storageCost}
        free={cost.storageCost === 0}
      />
      <CostRow
        label="Transferência de dados"
        detail={`${transferGB.toFixed(4)} GB × $${NEON_PRICING.transfer.pricePerGB}/GB · free: ${NEON_PRICING.transfer.freeTierGB} GB`}
        cost={cost.transferCost}
        free={cost.transferCost === 0}
      />

      <div className="flex items-center justify-between pt-3 mt-1">
        <div className="flex items-center gap-1 text-muted-foreground">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm">Total estimado no período</span>
        </div>
        <span className={`text-lg font-bold ${cost.total === 0 ? 'text-emerald-500' : ''}`}>
          {cost.total === 0 ? 'US$ 0,00' : fmtUSD(cost.total)}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function NeonAnalyticsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'neon', 'consumption'],
    queryFn: () => adminApi.getNeonConsumption(),
  });

  const chartData = React.useMemo(
    () => (data?.mode === 'org' && data.available ? buildDailyChart(data.data) : []),
    [data],
  );

  const totals = React.useMemo(
    () => (data?.available ? calcTotals(data.data) : { computeHours: 0, storageGBMonth: 0, transferGB: 0, writtenGB: 0 }),
    [data],
  );

  const firstProject = data?.data?.[0];
  const subscriptionType = firstProject?.subscription_type;
  const periodStart = firstProject?.consumption_period_start;
  const periodEnd   = firstProject?.consumption_period_end;
  const hasDaily = data?.mode === 'org' && chartData.length > 1;

  // Modo not available
  if (!isLoading && data && !data.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Neon Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{data.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Neon Analytics
            </CardTitle>
            <CardDescription>
              Compute, armazenamento e estimativa de custos NeonDB
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {subscriptionType && (
              <Badge variant="secondary" className="text-xs">
                Plano {planLabel(subscriptionType)}
              </Badge>
            )}
            {firstProject && (
              <Badge variant="outline" className="text-xs font-mono">
                {firstProject.project_name}
              </Badge>
            )}
          </div>
        </div>

        {periodStart && periodEnd && (
          <p className="text-xs text-muted-foreground mt-1">
            Billing period: {formatDate(periodStart)} → {formatDate(periodEnd)}
          </p>
        )}
        {data?.meta?.note && (
          <p className="text-xs text-muted-foreground mt-0.5">{data.meta.note}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Metric cards */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Uso {data?.mode === 'project' ? 'do billing period atual' : 'dos últimos 30 dias'}
          </p>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard icon={Cpu}         label="Compute"       value={`${totals.computeHours.toFixed(2)} CU-h`}        color="bg-blue-500"   />
              <MetricCard icon={HardDrive}   label="Armazenamento" value={`${totals.storageGBMonth.toFixed(3)} GB`}         color="bg-violet-500" />
              <MetricCard icon={ArrowDownUp} label="Transferência" value={`${totals.transferGB.toFixed(4)} GB`}             color="bg-slate-500"  />
              <MetricCard icon={PencilLine}  label="Dados gravados" value={`${totals.writtenGB.toFixed(4)} GB`}            color="bg-orange-500" />
            </div>
          )}
        </div>

        {/* Chart — somente com histórico diário (org mode) */}
        {(isLoading || hasDaily) && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Compute diário (CU-h)
            </p>
            {isLoading ? (
              <Skeleton className="h-52" />
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
                <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="neonCompute" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
                    }
                  />
                  <YAxis tickLine={false} axisLine={false} width={50} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(v) =>
                          new Date(v).toLocaleDateString('pt-BR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })
                        }
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="CU-h"
                    stroke="var(--color-CU-h)"
                    fill="url(#neonCompute)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </div>
        )}

        {/* Cost breakdown */}
        {!isLoading && data?.available && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Estimativa de custos</p>
            <CostBreakdown
              computeHours={totals.computeHours}
              storageGBMonth={totals.storageGBMonth}
              transferGB={totals.transferGB}
              subscriptionType={subscriptionType}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
