
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
  type VercelDeployment,
} from '@/infra/http/admin-api';
import {
  Triangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Activity,
  GitBranch,
  GitCommit,
  Timer,
  Globe,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(ts: number | string) {
  const d = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

function fmtDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function getISOStr(daysAgo: number): number {
  return Date.now() - daysAgo * 24 * 60 * 60 * 1000;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }
> = {
  READY:        { label: 'Pronto',      icon: CheckCircle2, variant: 'default',     color: 'text-emerald-500' },
  ERROR:        { label: 'Erro',        icon: XCircle,      variant: 'destructive',  color: 'text-red-500'     },
  CANCELED:     { label: 'Cancelado',   icon: XCircle,      variant: 'outline',      color: 'text-slate-400'   },
  BUILDING:     { label: 'Compilando',  icon: Loader2,      variant: 'secondary',    color: 'text-yellow-500'  },
  INITIALIZING: { label: 'Iniciando',   icon: Loader2,      variant: 'secondary',    color: 'text-blue-400'    },
  QUEUED:       { label: 'Na fila',     icon: Clock,        variant: 'outline',      color: 'text-slate-500'   },
};

function DeployStatusBadge({ state }: { state: string }) {
  const cfg = STATUS_CONFIG[state] ?? { label: state, icon: Activity, variant: 'outline' as const, color: 'text-slate-500' };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="gap-1 text-xs">
      <Icon className={`h-3 w-3 ${cfg.color}`} />
      {cfg.label}
    </Badge>
  );
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

const deployChartConfig = {
  'Deploys': { label: 'Deploys',   color: '#000000' },
  'Erros':   { label: 'Erros',     color: '#ef4444' },
} satisfies ChartConfig;

function buildDeployChart(deployments: VercelDeployment[]) {
  const byDay: Record<string, { success: number; error: number }> = {};

  for (const d of deployments) {
    const day = new Date(d.created).toISOString().split('T')[0];
    if (!byDay[day]) byDay[day] = { success: 0, error: 0 };
    if (d.state === 'READY') byDay[day].success++;
    else if (d.state === 'ERROR') byDay[day].error++;
  }

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, 'Deploys': v.success, 'Erros': v.error }));
}

const durationChartConfig = {
  'Build (s)': { label: 'Build (s)', color: '#6366f1' },
} satisfies ChartConfig;

function buildDurationChart(deployments: VercelDeployment[]) {
  return deployments
    .filter((d) => d.buildDuration !== null && d.state === 'READY')
    .sort((a, b) => a.created - b.created)
    .slice(-20) // últimos 20 builds bem-sucedidos
    .map((d) => ({
      date: new Date(d.created).toISOString().split('T')[0],
      'Build (s)': d.buildDuration!,
    }));
}

// ─── DATE RANGES ──────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function VercelAnalyticsPanel() {
  const [days, setDays] = React.useState(7);

  const { data: projectData, isLoading: loadingProject } = useQuery({
    queryKey: ['admin', 'vercel', 'project'],
    queryFn: () => adminApi.getVercelProject(),
  });

  const { data: deploymentsData, isLoading: loadingDeploys } = useQuery({
    queryKey: ['admin', 'vercel', 'deployments', days],
    queryFn: () =>
      adminApi.getVercelDeployments({
        limit: 50,
        since: getISOStr(days),
      }),
    enabled: !!projectData?.available,
  });

  const deployments = deploymentsData?.deployments ?? [];
  const deployChart  = React.useMemo(() => buildDeployChart(deployments), [deployments]);
  const durationChart = React.useMemo(() => buildDurationChart(deployments), [deployments]);

  const successCount  = deployments.filter((d) => d.state === 'READY').length;
  const errorCount    = deployments.filter((d) => d.state === 'ERROR').length;
  const avgBuild = React.useMemo(() => {
    const built = deployments.filter((d) => d.buildDuration !== null && d.state === 'READY');
    if (!built.length) return null;
    return Math.round(built.reduce((s, d) => s + d.buildDuration!, 0) / built.length);
  }, [deployments]);

  // Not available state
  if (!loadingProject && projectData && !projectData.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Triangle className="h-5 w-5" />
            Vercel Analytics
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

  const project = projectData?.project;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Triangle className="h-5 w-5" />
              Vercel Analytics
              {project && (
                <span className="text-base font-normal text-muted-foreground">
                  — {project.name}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Deployments, duração de build e status do projeto Vercel
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

        {/* Project metadata */}
        {loadingProject ? (
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-28" />
          </div>
        ) : project ? (
          <div className="flex flex-wrap gap-2 mt-2">
            {project.framework && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Globe className="h-3 w-3" />
                {project.framework}
              </Badge>
            )}
            {project.link?.repo && (
              <Badge variant="outline" className="gap-1 text-xs font-mono">
                <GitBranch className="h-3 w-3" />
                {project.link.org}/{project.link.repo} ({project.link.defaultBranch ?? 'main'})
              </Badge>
            )}
            {project.nodeVersion && (
              <Badge variant="secondary" className="text-xs">
                Node {project.nodeVersion}
              </Badge>
            )}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary cards */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Deployments ({days} dias)
          </p>
          {loadingDeploys ? (
            <div className="grid gap-3 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="rounded-md p-2 bg-black dark:bg-white">
                  <Activity className="h-5 w-5 text-white dark:text-black" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{deployments.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="rounded-md p-2 bg-emerald-500">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sucesso</p>
                  <p className="text-xl font-bold">{successCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="rounded-md p-2 bg-red-500">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                  <p className="text-xl font-bold">{errorCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="rounded-md p-2 bg-indigo-500">
                  <Timer className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Build médio</p>
                  <p className="text-xl font-bold">{fmtDuration(avgBuild)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Deploy frequency chart */}
        {(loadingDeploys || deployChart.length > 1) && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Frequência de deploys
            </p>
            {loadingDeploys ? (
              <Skeleton className="h-52" />
            ) : (
              <ChartContainer config={deployChartConfig} className="aspect-auto h-[200px] w-full">
                <AreaChart data={deployChart} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="vercelDeploys" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#000000" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#000000" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="vercelErrors" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="Deploys" stroke="var(--color-Deploys)" fill="url(#vercelDeploys)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Erros"   stroke="var(--color-Erros)"   fill="url(#vercelErrors)"  strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            )}
          </div>
        )}

        {/* Build duration chart */}
        {!loadingDeploys && durationChart.length > 1 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Duração dos builds (últimos {durationChart.length} deploys)
            </p>
            <ChartContainer config={durationChartConfig} className="aspect-auto h-[180px] w-full">
              <AreaChart data={durationChart} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="vercelBuild" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
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
                <YAxis tickLine={false} axisLine={false} width={40} unit="s" />
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
                <Area type="monotone" dataKey="Build (s)" stroke="var(--color-Build (s))" fill="url(#vercelBuild)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </div>
        )}

        {/* Recent deployments list */}
        {deployments.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Histórico recente
            </p>
            <div className="space-y-2">
              {deployments.slice(0, 10).map((d) => (
                <div
                  key={d.uid}
                  className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <DeployStatusBadge state={d.state} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {d.commitRef && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <GitBranch className="h-3 w-3" />{d.commitRef}
                          </span>
                        )}
                        {d.commitSha && (
                          <span className="text-xs font-mono text-muted-foreground flex items-center gap-0.5">
                            <GitCommit className="h-3 w-3" />{d.commitSha}
                          </span>
                        )}
                      </div>
                      {d.commitMessage && (
                        <p className="text-sm font-medium truncate max-w-xs" title={d.commitMessage}>
                          {d.commitMessage}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDate(d.created)}
                        {d.buildDuration !== null && (
                          <span className="ml-2 text-muted-foreground/70">
                            · build {fmtDuration(d.buildDuration)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(d.created)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loadingDeploys && deployments.length === 0 && projectData?.available && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum deployment encontrado no período.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
