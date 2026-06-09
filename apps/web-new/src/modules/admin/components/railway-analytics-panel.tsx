
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
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
import { Button } from '@/core/ui/button';
import {
  adminApi,
  type RailwayDeployment,
  type RailwayService,
  type RailwayMetric,
  type RailwayUsageBreakdown,
} from '@/infra/http/admin-api';
import {
  Train,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Activity,
  ServerCrash,
  DollarSign,
  TrendingDown,
  Gift,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getISOStr(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }
> = {
  SUCCESS:      { label: 'Sucesso',     icon: CheckCircle2, variant: 'default',     color: 'text-emerald-500' },
  FAILED:       { label: 'Falhou',      icon: XCircle,      variant: 'destructive',  color: 'text-red-500'     },
  CRASHED:      { label: 'Crashed',     icon: ServerCrash,  variant: 'destructive',  color: 'text-red-500'     },
  BUILDING:     { label: 'Compilando',  icon: Loader2,      variant: 'secondary',    color: 'text-yellow-500'  },
  DEPLOYING:    { label: 'Deployando',  icon: Loader2,      variant: 'secondary',    color: 'text-blue-500'    },
  INITIALIZING: { label: 'Iniciando',   icon: Loader2,      variant: 'secondary',    color: 'text-blue-400'    },
  RESTARTING:   { label: 'Reiniciando', icon: Loader2,      variant: 'secondary',    color: 'text-orange-500'  },
  SLEEPING:     { label: 'Dormindo',    icon: Clock,        variant: 'outline',      color: 'text-slate-400'   },
  REMOVED:      { label: 'Removido',    icon: XCircle,      variant: 'outline',      color: 'text-slate-400'   },
  SKIPPED:      { label: 'Ignorado',    icon: XCircle,      variant: 'outline',      color: 'text-slate-400'   },
  WAITING:      { label: 'Aguardando',  icon: Clock,        variant: 'outline',      color: 'text-slate-500'   },
};

function DeploymentStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: Activity, variant: 'outline' as const, color: 'text-slate-500' };
  const Icon = cfg.icon;

  return (
    <Badge variant={cfg.variant} className="gap-1 text-xs">
      <Icon className={`h-3 w-3 ${cfg.color}`} />
      {cfg.label}
    </Badge>
  );
}

// ─── Railway Pricing (pay-as-you-go, março 2025) ──────────────────────────────
// https://railway.com/pricing
const RAILWAY_PRICING = {
  cpu:     { perMinute: 0.000463, label: 'vCPU-min',  unit: 'vCPU-min' }, // $20/vCPU/month
  memory:  { perMinute: 0.000231, label: 'GB-min',    unit: 'GB-min'   }, // $10/GB/month
  network: { perGB: 0.10,         label: 'GB egresso', unit: 'GB'       }, // $0.10/GB
};

function calcRailwayCost(usage: RailwayUsageBreakdown) {
  const cpu     = usage.cpuMinutes      * RAILWAY_PRICING.cpu.perMinute;
  const memory  = usage.memoryGBMinutes * RAILWAY_PRICING.memory.perMinute;
  const network = usage.networkTxGB     * RAILWAY_PRICING.network.perGB;
  return { cpu, memory, network, total: cpu + memory + network };
}

function fmtUSD(v: number) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 });
}

function CostBreakdown({ actual, estimated }: { actual: RailwayUsageBreakdown; estimated: RailwayUsageBreakdown }) {
  const act = calcRailwayCost(actual);
  const est = calcRailwayCost(estimated);

  return (
    <div className="rounded-lg border p-4 space-y-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Custo Railway (billing period atual)</p>
        </div>
        {est.total > 0 && (
          <Badge variant="outline" className="text-violet-500 border-violet-500 gap-1 text-xs">
            <Gift className="h-3 w-3" />
            Projeção mensal: {fmtUSD(est.total)}
          </Badge>
        )}
      </div>

      {/* Actual cost rows */}
      {[
        { label: 'CPU', detail: `${actual.cpuMinutes.toFixed(3)} vCPU-min × $${RAILWAY_PRICING.cpu.perMinute}/min`, cost: act.cpu },
        { label: 'Memória', detail: `${actual.memoryGBMinutes.toFixed(2)} GB-min × $${RAILWAY_PRICING.memory.perMinute}/min`, cost: act.memory },
        { label: 'Rede (egresso)', detail: `${actual.networkTxGB.toFixed(4)} GB × $${RAILWAY_PRICING.network.perGB}/GB`, cost: act.network },
      ].map(({ label, detail, cost }) => (
        <div key={label} className="flex items-center justify-between py-2 border-b last:border-0">
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{detail}</p>
          </div>
          <span className="text-sm font-semibold">{fmtUSD(cost)}</span>
        </div>
      ))}

      <div className="flex items-center justify-between pt-3 mt-1">
        <div className="flex items-center gap-1 text-muted-foreground">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm">Acumulado no período</span>
        </div>
        <span className={`text-lg font-bold ${act.total < 1 ? 'text-emerald-500' : ''}`}>
          {fmtUSD(act.total)}
        </span>
      </div>
    </div>
  );
}

// ─── Deployments frequency chart ──────────────────────────────────────────────

const deployChartConfig = {
  'Deploys': { label: 'Deploys', color: '#7c3aed' },
  'Falhas':  { label: 'Falhas',  color: '#ef4444' },
} satisfies ChartConfig;

function buildDeployChart(deployments: RailwayDeployment[]) {
  const byDay: Record<string, { success: number; failed: number }> = {};

  for (const d of deployments) {
    const day = d.createdAt.split('T')[0];
    if (!byDay[day]) byDay[day] = { success: 0, failed: 0 };
    if (d.status === 'SUCCESS') {
      byDay[day].success++;
    } else if (d.status === 'FAILED' || d.status === 'CRASHED') {
      byDay[day].failed++;
    }
  }

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, 'Deploys': v.success, 'Falhas': v.failed }));
}

// ─── Metrics chart ────────────────────────────────────────────────────────────

const metricsChartConfig = {
  'CPU (%)':     { label: 'CPU (%)',     color: '#3b82f6' },
  'RAM (GB)':    { label: 'RAM (GB)',    color: '#8b5cf6' },
  'TX (GB)':     { label: 'TX (GB)',     color: '#10b981' },
  'RX (GB)':     { label: 'RX (GB)',     color: '#f59e0b' },
} satisfies ChartConfig;

function buildMetricsChart(metrics: RailwayMetric[]) {
  const byDate: Record<string, Record<string, number>> = {};

  const measurementKey: Record<string, string> = {
    CPU_USAGE:       'CPU (%)',
    MEMORY_USAGE_GB: 'RAM (GB)',
    NETWORK_TX_GB:   'TX (GB)',
    NETWORK_RX_GB:   'RX (GB)',
  };

  for (const m of metrics) {
    const key = measurementKey[m.measurement];
    if (!key) continue;
    for (const v of m.values) {
      const date = new Date(v.ts * 1000).toISOString().split('T')[0];
      if (!byDate[date]) byDate[date] = {};
      byDate[date][key] = (byDate[date][key] ?? 0) + v.value;
    }
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));
}

// ─── DATE_RANGES ──────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function RailwayAnalyticsPanel() {
  const [days, setDays] = React.useState(7);
  const [activeService, setActiveService] = React.useState<RailwayService | null>(null);

  const { data: projectData, isLoading: loadingProject } = useQuery({
    queryKey: ['admin', 'railway', 'project'],
    queryFn: () => adminApi.getRailwayProject(),
  });

  const services = projectData?.services ?? [];
  const deployments = projectData?.deployments ?? [];

  // Seleciona o primeiro serviço automaticamente
  React.useEffect(() => {
    if (services.length > 0 && !activeService) {
      setActiveService(services[0]);
    }
  }, [services, activeService]);

  const startDate = getISOStr(days);
  const endDate = getISOStr(0);

  const { data: metricsData, isLoading: loadingMetrics } = useQuery({
    queryKey: ['admin', 'railway', 'metrics', activeService?.id, days],
    queryFn: () =>
      adminApi.getRailwayMetrics({
        serviceId: activeService?.id,
        startDate,
        endDate,
        sampleRateSeconds: days <= 7 ? 3600 : 86400,
      }),
    enabled: !!activeService && !!projectData?.available,
  });

  const { data: usageData } = useQuery({
    queryKey: ['admin', 'railway', 'usage'],
    queryFn: () => adminApi.getRailwayUsage(),
    enabled: !!projectData?.available,
  });

  const deployChart = React.useMemo(() => buildDeployChart(deployments), [deployments]);
  const metricsChart = React.useMemo(
    () => buildMetricsChart(metricsData?.metrics ?? []),
    [metricsData],
  );

  // Filtra deployments por serviço ativo e data range
  const filteredDeployments = React.useMemo(() => {
    const cutoff = new Date(startDate).getTime();
    return deployments.filter((d) => {
      if (activeService && d.serviceId !== activeService.id) return false;
      return new Date(d.createdAt).getTime() >= cutoff;
    });
  }, [deployments, activeService, startDate]);

  const successCount = filteredDeployments.filter((d) => d.status === 'SUCCESS').length;
  const failCount = filteredDeployments.filter(
    (d) => d.status === 'FAILED' || d.status === 'CRASHED',
  ).length;

  // Not available state
  if (!loadingProject && projectData && !projectData.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Train className="h-5 w-5" />
            Railway Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{projectData.message}</p>
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
              <Train className="h-5 w-5" />
              Railway Analytics
              {projectData?.project && (
                <span className="text-base font-normal text-muted-foreground">
                  — {projectData.project.name}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Deployments, métricas de compute e status dos serviços Railway
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {DATE_RANGES.map((range) => (
              <Button
                key={range.days}
                variant={days === range.days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(range.days)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Service selector */}
        {loadingProject ? (
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-7 w-32" />
          </div>
        ) : services.length > 0 ? (
          <div className="flex gap-2 mt-2 flex-wrap">
            {services.map((svc) => (
              <Badge
                key={svc.id}
                variant={activeService?.id === svc.id ? 'default' : 'outline'}
                className="cursor-pointer text-sm py-1 px-3"
                onClick={() => setActiveService(svc)}
              >
                {svc.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Deploy summary cards */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Deployments ({days} dias)
          </p>
          {loadingProject ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="rounded-md p-2 bg-violet-500">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{filteredDeployments.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="rounded-md p-2 bg-emerald-500">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sucessos</p>
                  <p className="text-xl font-bold">{successCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="rounded-md p-2 bg-red-500">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Falhas</p>
                  <p className="text-xl font-bold">{failCount}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Deploy frequency chart */}
        {(loadingProject || deployChart.length > 1) && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Frequência de deploys
            </p>
            {loadingProject ? (
              <Skeleton className="h-52" />
            ) : (
              <ChartContainer config={deployChartConfig} className="aspect-auto h-[200px] w-full">
                <AreaChart data={deployChart} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="railwayDeploys" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="railwayFails" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
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
                  <YAxis tickLine={false} axisLine={false} width={30} allowDecimals={false} />
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
                  <Legend />
                  <Area type="monotone" dataKey="Deploys" stroke="var(--color-Deploys)" fill="url(#railwayDeploys)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Falhas"  stroke="var(--color-Falhas)"  fill="url(#railwayFails)"   strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            )}
          </div>
        )}

        {/* Metrics charts (CPU / RAM) */}
        {metricsData?.available && metricsChart.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Métricas de compute — {activeService?.name}
            </p>
            <ChartContainer config={metricsChartConfig} className="aspect-auto h-[220px] w-full">
              <AreaChart data={metricsChart} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="rwCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="rwRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={formatDateShort}
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
                <Legend />
                <Area type="monotone" dataKey="CPU (%)"  stroke="var(--color-CPU (%))"  fill="url(#rwCpu)" strokeWidth={2} />
                <Area type="monotone" dataKey="RAM (GB)" stroke="var(--color-RAM (GB))" fill="url(#rwRam)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </div>
        )}

        {loadingMetrics && activeService && (
          <Skeleton className="h-52" />
        )}

        {/* Cost breakdown */}
        {usageData?.available && usageData.actual && usageData.estimated && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Estimativa de custos</p>
            <CostBreakdown actual={usageData.actual} estimated={usageData.estimated} />
          </div>
        )}

        {/* Recent deployments list */}
        {filteredDeployments.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Histórico recente
            </p>
            <div className="space-y-2">
              {filteredDeployments.slice(0, 10).map((d) => {
                const svc = services.find((s) => s.id === d.serviceId);
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <DeploymentStatusBadge status={d.status} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {svc?.name ?? d.serviceId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(d.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {timeAgo(d.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loadingProject && filteredDeployments.length === 0 && projectData?.available && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum deployment encontrado no período.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
