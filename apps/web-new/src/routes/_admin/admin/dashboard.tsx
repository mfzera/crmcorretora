import { createFileRoute } from '@tanstack/react-router';

import { useState, useEffect, lazy, Suspense, memo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  HardDrive, Database, Activity, Server,
  Cloud, Globe, Train, Sparkles, RotateCcw,
} from 'lucide-react';

// Recharts permanece fora do bundle crítico — carregado sob demanda
const OverviewCharts = lazy(() =>
  import('@/modules/admin/components/overview-charts').then((m) => ({ default: m.OverviewCharts })),
);
const Spark = lazy(() =>
  import('@/modules/admin/components/dashboard-charts').then((m) => ({ default: m.Spark })),
);
const SparkTime = lazy(() =>
  import('@/modules/admin/components/dashboard-charts').then((m) => ({ default: m.SparkTime })),
);
const SparkHttp = lazy(() =>
  import('@/modules/admin/components/dashboard-charts').then((m) => ({ default: m.SparkHttp })),
);
const NeonRowsInlineChart = lazy(() =>
  import('@/modules/admin/components/dashboard-charts').then((m) => ({ default: m.NeonRowsInlineChart })),
);

import { AdminGuard } from '@/modules/admin/components/admin-guard';
import { Skeleton } from '@/core/ui/skeleton';
import { adminApi } from '@/infra/http/admin-api';
import type { HttpMetricsHour, TenantSummary, NeonProject, NeonConsumptionResponse, R2BucketStorage, NeonDbStatsResponse, NeonMetricsTimeseriesResponse } from '@/infra/http/admin-api';
import { cn } from '@/core/utils';

export const Route = createFileRoute('/_admin/admin/dashboard')({
  component: AdminDashboardPage,
});


// Fallbacks que ocupam exatamente o espaço do chart — evitam CLS
const SparkFallback = () => <div style={{ height: 28 }} />;
const SparkTimeFallback = () => <div style={{ height: 44 }} />;
const SparkHttpFallback = () => <div style={{ height: 72 }} />;
const NeonRowsFallback = () => <div style={{ height: 228 }} />;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBytes(b: number) {
  if (b === 0) return '0 B';
  const k = 1024, s = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

function lastVal(
  metrics: { measurement: string; values: { ts: number; value: number }[] }[],
  name: string,
): number | null {
  const m = metrics.find((m) => m.measurement === name);
  if (!m?.values.length) return null;
  return m.values[m.values.length - 1]?.value ?? null;
}

function metricSeriesTs(
  metrics: { measurement: string; values: { ts: number; value: number }[] }[],
  name: string,
): { v: number; ts: number }[] {
  const m = metrics.find((m) => m.measurement === name);
  if (!m) return [];
  return m.values.map((p) => ({ v: p.value, ts: p.ts }));
}

// ─── SVG Gauge (sem recharts) ────────────────────────────────────────────────

function GaugeArc({ percent, color }: { percent: number | null; color: string }) {
  const r = 20, circ = 2 * Math.PI * r;
  const pct = percent ?? 0;
  const offset = circ - (pct / 100) * circ;
  const filterId = `gauge-neon-${color.replace('#', '')}`;
  const hasValue = percent !== null && percent > 0;
  return (
    <svg width="44" height="44" className="-rotate-90 shrink-0">
      <defs>
        <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
      <circle
        cx="22" cy="22" r={r} fill="none"
        stroke={color} strokeWidth="3.5"
        strokeDasharray={circ}
        strokeDashoffset={percent === null ? circ : offset}
        strokeLinecap="round"
        filter={hasValue ? `url(#${filterId})` : undefined}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ─── Elapsed label isolado — só ele re-renderiza a cada 1s ───────────────────

const ElapsedLabel = memo(function ElapsedLabel({ lastUpdatedAt }: { lastUpdatedAt: number }) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - lastUpdatedAt) / 1000));

  useEffect(() => {
    setElapsed(Math.floor((Date.now() - lastUpdatedAt) / 1000));
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - lastUpdatedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  function fmt(s: number) {
    if (s < 5)    return 'agora';
    if (s < 60)   return `${s}s atrás`;
    if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
    return `${Math.floor(s / 3600)}h atrás`;
  }

  const isStale = elapsed > 90;

  return (
    <>
      <div className={cn(
        'h-1.5 w-1.5 rounded-full shrink-0',
        isStale
          ? 'bg-yellow-400/70'
          : 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)] animate-pulse',
      )} />
      <span className="text-[9px] font-mono text-muted-foreground/50 tabular-nums">{fmt(elapsed)}</span>
    </>
  );
});

// ─── Railway resource card (CPU + Memory merged) ─────────────────────────────

function RailwayResourceCard({
  cpuPct, cpuSpark,
  memPct, memSub, memSpark,
  lastUpdatedAt, onRefresh,
}: {
  cpuPct: number | null; cpuSpark: { v: number; ts: number }[];
  memPct: number | null; memSub: string; memSpark: { v: number; ts: number }[];
  lastUpdatedAt: number;
  onRefresh: () => void;
}) {
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    if (spinning) return;
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 800);
  }

  const cpuCol  = (cpuPct ?? 0) > 80 ? '#f87171' : (cpuPct ?? 0) > 60 ? '#fbbf24' : '#34d399';
  const memCol  = (memPct ?? 0) > 80 ? '#f87171' : (memPct ?? 0) > 60 ? '#fbbf24' : '#4C9AFF';

  return (
    <div className="admin-glass relative rounded border border-border/60 bg-card">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded overflow-hidden"
        style={{ background: `radial-gradient(ellipse at 50% -40%, ${cpuCol}12 0%, transparent 60%)` }}
      />
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/40" />
      <div className="absolute top-1.5 right-2 text-[8px] font-mono text-muted-foreground/25">RAILWAY_RES_01</div>

      <div className="relative flex items-stretch">
        <div className="flex items-center gap-3 px-5 py-3 border-r border-border/25 min-w-[130px]">
          <GaugeArc percent={cpuPct} color={cpuCol} />
          <div>
            <p
              className="font-sora text-2xl font-semibold leading-none"
              style={{
                color: cpuPct !== null ? cpuCol : undefined,
                textShadow: cpuPct !== null ? `0 0 10px ${cpuCol}66` : undefined,
              }}
            >
              {cpuPct !== null ? `${cpuPct.toFixed(1)}%` : '—'}
            </p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">CPU · 1h</p>
          </div>
        </div>

        <div className="flex flex-col justify-center flex-1 px-4 py-2 gap-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[8px] font-mono text-muted-foreground/40 uppercase tracking-widest">
              CPU &amp; Memória · Railway · Live
            </p>
            <div className="ml-auto flex items-center gap-1.5">
              <ElapsedLabel lastUpdatedAt={lastUpdatedAt} />
              <button
                onClick={handleRefresh}
                title="Atualizar métricas"
                className="flex items-center justify-center h-4 w-4 rounded-sm hover:bg-border/40 transition-colors text-muted-foreground/40 hover:text-muted-foreground"
              >
                <RotateCcw className={cn('h-2.5 w-2.5', spinning && 'animate-spin')} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Suspense fallback={<SparkTimeFallback />}>
              <SparkTime data={cpuSpark.length ? cpuSpark : []} color={cpuCol} label="CPU" unit="%" />
            </Suspense>
            <Suspense fallback={<SparkTimeFallback />}>
              <SparkTime data={memSpark.length ? memSpark : []} color={memCol} label="RAM" unit=" GB" />
            </Suspense>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 border-l border-border/25 min-w-[150px]">
          <div className="text-right">
            <p
              className="font-sora text-2xl font-semibold leading-none"
              style={{
                color: memPct !== null ? memCol : undefined,
                textShadow: memPct !== null ? `0 0 10px ${memCol}66` : undefined,
              }}
            >
              {memPct !== null ? `${memPct.toFixed(1)}%` : '—'}
            </p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">{memSub}</p>
          </div>
          <GaugeArc percent={memPct} color={memCol} />
        </div>
      </div>
    </div>
  );
}

// ─── Infra services panel ─────────────────────────────────────────────────────

function ServicesPanel({
  railway, neon, redis, vercel, r2,
  redisVer, redisKeys, redisUptime, redisOps,
  neonName, vercelName,
}: {
  railway: boolean | null; neon: boolean | null; redis: boolean | null;
  vercel: boolean | null; r2: boolean | null;
  redisVer?: string; redisKeys?: number; redisUptime?: string; redisOps?: string;
  neonName?: string; vercelName?: string;
}) {
  const services = [
    { icon: Train,    name: 'Railway', up: railway },
    { icon: Database, name: 'Neon',    up: neon,   detail: neonName },
    { icon: Server,   name: 'Redis',   up: redis,  detail: redisVer ? `v${redisVer}` : undefined },
    { icon: Globe,    name: 'Vercel',  up: vercel, detail: vercelName },
    { icon: Cloud,    name: 'R2',      up: r2 },
  ];

  return (
    <div className="admin-glass relative flex flex-col rounded border border-border/50 bg-card p-2.5 gap-2">
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/40" />
      <div className="absolute top-1.5 right-2 text-[8px] font-mono text-muted-foreground/25">SVC</div>

      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[var(--admin-accent-soft)] text-primary shrink-0">
          <Activity className="h-3 w-3" />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Infraestrutura</span>
      </div>

      <div className="space-y-1.5">
        {services.map(({ icon: Ic, name, up, detail }) => (
          <div key={name} className="flex items-center gap-2 rounded-sm border border-border/40 bg-[var(--admin-surface-elevated)] px-2.5 py-2">
            <Ic className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-foreground flex-1">{name}</span>
            {detail && <span className="text-[10px] text-muted-foreground hidden xl:block">{detail}</span>}
            <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', {
              'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)]': up === true,
              'bg-red-400': up === false,
              'bg-muted-foreground/30 animate-pulse': up === null,
            })} />
          </div>
        ))}
      </div>

      {(redisKeys !== undefined || redisUptime) && (
        <>
          <div className="h-px bg-border/30" />
          <p className="text-[8px] font-mono text-muted-foreground/35 uppercase tracking-wider">Redis detail</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { l: 'Keys',   v: redisKeys?.toLocaleString('pt-BR') },
              { l: 'Uptime', v: redisUptime },
              { l: 'Ops/s',  v: redisOps },
            ].filter((x) => x.v).map(({ l, v }) => (
              <div key={l} className="rounded-sm border border-border/40 bg-[var(--admin-surface-elevated)] px-2 py-1.5">
                <p className="text-[9px] text-muted-foreground uppercase">{l}</p>
                <p className="font-sora text-sm font-semibold text-foreground">{v}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── HTTP Status banner ───────────────────────────────────────────────────────

function HttpStatusBanner({
  data,
  hourly,
  loading,
}: {
  data: { total: number; s2xx: number; s4xx: number; s5xx: number; errorRate: number | null } | null | undefined;
  hourly: HttpMetricsHour[];
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-[120px] w-full rounded" />;

  const total     = data?.total ?? 0;
  const s2xx      = data?.s2xx ?? 0;
  const s4xx      = data?.s4xx ?? 0;
  const s5xx      = data?.s5xx ?? 0;
  const errorRate = data?.errorRate ?? null;
  const rateN     = errorRate ?? 0;

  const col = errorRate === null
    ? '#4C9AFF'
    : rateN <= 1 ? '#34d399'
    : rateN <= 5 ? '#fbbf24'
    : '#f87171';

  const noData = total === 0;

  const neonShadow = noData ? undefined : `0 0 12px ${col}55, 0 0 28px ${col}22`;

  return (
    <div className="admin-glass relative rounded border border-border/60 bg-card">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded overflow-hidden"
        style={{ background: `radial-gradient(ellipse at 65% -30%, ${col}15 0%, transparent 60%)` }}
      />
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/40" />
      <div className="absolute top-1.5 right-2 text-[8px] font-mono text-muted-foreground/25">HTTP_STATUS_01</div>

      <div className="relative flex items-stretch">
        <div className="flex flex-col justify-center gap-1.5 px-5 py-3 border-r border-border/25 min-w-[80px]">
          <div>
            <p className="font-sora text-2xl font-semibold leading-none" style={{ color: '#34d399', textShadow: noData ? undefined : '0 0 10px rgba(52,211,153,0.5)' }}>
              {noData ? '—' : s2xx.toLocaleString('pt-BR')}
            </p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">2xx OK</p>
          </div>
          <div>
            <p className="font-sora text-sm font-semibold leading-none text-muted-foreground">
              {noData ? '—' : total.toLocaleString('pt-BR')}
            </p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">Total req</p>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center flex-1 px-6 py-3">
          <p className="text-[8px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
            HTTP Error Rate · 24h
          </p>
          <p
            className="font-sora font-bold leading-none"
            style={{
              fontSize: 38,
              color: noData ? 'rgba(242,243,245,0.25)' : col,
              textShadow: neonShadow,
            }}
          >
            {noData ? '—' : rateN.toFixed(1)}
            {!noData && <span style={{ fontSize: 20 }}>%</span>}
          </p>
          {noData && (
            <p className="text-[9px] text-muted-foreground mt-1">Aguardando dados</p>
          )}
        </div>

        <div className="flex flex-col justify-center gap-1.5 px-5 py-3 border-l border-border/25 min-w-[90px]">
          <div>
            <p
              className="text-sm font-semibold font-mono"
              style={{
                color: s4xx > 0 ? '#fbbf24' : '#34d399',
                textShadow: !noData && s4xx > 0 ? '0 0 8px rgba(251,191,36,0.55)' : undefined,
              }}
            >
              {noData ? '—' : s4xx.toLocaleString('pt-BR')}
            </p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">4xx Client</p>
          </div>
          <div>
            <p
              className="text-sm font-semibold font-mono"
              style={{
                color: s5xx > 0 ? '#f87171' : '#34d399',
                textShadow: !noData && s5xx > 0 ? '0 0 8px rgba(248,113,113,0.55)' : undefined,
              }}
            >
              {noData ? '—' : s5xx.toLocaleString('pt-BR')}
            </p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">5xx Server</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border/20">
        <Suspense fallback={<SparkHttpFallback />}>
          <SparkHttp
            data={hourly.length ? hourly : Array.from({ length: 24 }, (_, i) => ({
              hour: new Date(Date.now() - (23 - i) * 3_600_000).toISOString(),
              s2xx: 0, s4xx: 0, s5xx: 0,
            }))}
          />
        </Suspense>
      </div>
    </div>
  );
}

// ─── Tenants + Users unified banner ──────────────────────────────────────────

type TenantBarProps = {
  id: string;
  nome: string;
  clienteCount: number;
  userCount: number;
  barHeightPct: number;
  platformPct: number;
  posIndex: number;
  posColor: string;
};

// memo: hover em uma barra não re-renderiza as outras
const TenantBar = memo(function TenantBar(p: TenantBarProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <span
        className="text-[10px] font-mono tabular-nums font-semibold transition-colors"
        style={{ color: hovered ? '#4C9AFF' : 'rgba(242,243,245,0.5)' }}
      >
        {p.clienteCount}
      </span>

      <div className="relative w-full flex items-end" style={{ height: 80 }}>
        <div
          className="relative w-full rounded-t-sm cursor-default transition-all duration-700"
          style={{
            height: `${p.barHeightPct}%`,
            background: hovered
              ? 'linear-gradient(to top, #4C9AFF, #7eb8ff)'
              : 'linear-gradient(to top, rgba(76,154,255,0.55), rgba(76,154,255,0.3))',
            boxShadow: hovered ? '0 0 12px rgba(76,154,255,0.35)' : undefined,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {hovered && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 pointer-events-none
                            rounded-lg border border-border/60 bg-[#1a1e24] px-3 py-2 shadow-xl text-[10px] min-w-[150px]">
              <p className="font-semibold text-foreground mb-1.5 truncate">{p.nome}</p>
              <div className="space-y-1">
                <div className="flex justify-between gap-4">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] inline-block" />
                    Usuários
                  </span>
                  <span className="font-semibold tabular-nums" style={{ color: '#34d399' }}>
                    {p.userCount.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4C9AFF] inline-block" />
                    Clientes
                  </span>
                  <span className="font-semibold tabular-nums" style={{ color: '#4C9AFF' }}>
                    {p.clienteCount.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between gap-4 pt-0.5 border-t border-border/30">
                  <span className="text-muted-foreground">% plataforma</span>
                  <span className="font-semibold tabular-nums text-foreground/60">
                    {p.platformPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <span className="text-[9px] font-mono font-bold" style={{ color: p.posColor }}>
        #{p.posIndex + 1}
      </span>

      <span className="text-[9px] text-muted-foreground truncate w-full text-center">{p.nome}</span>
    </div>
  );
});

function TenantsUsersCard({
  tenants, users, clientes, loading,
}: {
  tenants: TenantSummary[];
  users: number;
  clientes: number;
  loading?: boolean;
}) {
  const sorted        = [...tenants].sort((a, b) => b.clienteCount - a.clienteCount);
  const maxClientes   = Math.max(...sorted.map((t) => t.clienteCount), 1);
  const totalClientes = sorted.reduce((a, t) => a + t.clienteCount, 0);
  const totalUsers    = sorted.reduce((a, t) => a + t.userCount, 0);
  const ratio         = users > 0 ? (clientes / users) : null;
  const barTotal      = users + clientes;
  const userPct       = barTotal > 0 ? (users / barTotal) * 100 : 50;

  const posColors = ['#fbbf24', '#94a3b8', '#cd7c3a'];

  return (
    <div className="admin-glass relative rounded border border-border/60 bg-card">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded"
        style={{ background: 'radial-gradient(ellipse at 20% -40%, rgba(76,154,255,0.08) 0%, transparent 60%)' }}
      />
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/40" />
      <div className="absolute top-1.5 right-2 text-[8px] font-mono text-muted-foreground/25">TENANTS_01</div>

      <div className="relative flex items-stretch">
        <div className="flex flex-col flex-1 px-5 py-4 gap-3 border-r border-border/25">
          <p className="text-[8px] font-mono text-muted-foreground/40 uppercase tracking-widest">
            Corretoras · Ranking
          </p>

          {loading ? (
            <div className="flex gap-4 items-end h-28">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="flex-1 rounded" style={{ height: `${80 - i * 20}%` }} />)}
            </div>
          ) : (
            <div className="flex items-end gap-6 h-32">
              {sorted.map((t, i) => {
                const barHeightPct = Math.max((t.clienteCount / maxClientes) * 100, t.clienteCount > 0 ? 8 : 4);
                const platformPct  = totalClientes > 0 ? (t.clienteCount / totalClientes) * 100 : 0;
                const posColor     = posColors[i] ?? 'rgba(242,243,245,0.25)';
                return (
                  <TenantBar
                    key={t.id}
                    id={t.id}
                    nome={t.nome}
                    clienteCount={t.clienteCount}
                    userCount={t.userCount}
                    barHeightPct={barHeightPct}
                    platformPct={platformPct}
                    posIndex={i}
                    posColor={posColor}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center gap-3 px-6 py-3 min-w-[180px]">
          <p className="text-[8px] font-mono text-muted-foreground/40 uppercase tracking-widest">
            Usuários &amp; Clientes
          </p>

          <div>
            <p className="font-sora text-2xl font-semibold leading-none text-foreground">
              {ratio !== null ? ratio.toFixed(1) : '—'}
              <span className="text-sm text-muted-foreground font-normal ml-1">×</span>
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">clientes / conta</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              <div className="h-full rounded-l-full" style={{ width: `${userPct}%`, background: '#4C9AFF', opacity: 0.75 }} />
              <div className="h-full rounded-r-full" style={{ width: `${100 - userPct}%`, background: '#34d399', opacity: 0.65 }} />
            </div>
            <div className="flex justify-between text-[9px]">
              <span>
                <span className="font-semibold tabular-nums" style={{ color: '#4C9AFF' }}>{users}</span>
                <span className="text-muted-foreground ml-0.5">contas</span>
              </span>
              <span>
                <span className="font-semibold tabular-nums" style={{ color: '#34d399' }}>{clientes.toLocaleString('pt-BR')}</span>
                <span className="text-muted-foreground ml-0.5">clientes</span>
              </span>
            </div>
          </div>

          <div className="text-[9px] text-muted-foreground border-t border-border/25 pt-2">
            <span className="font-medium text-foreground/60">{sorted.length}</span> tenants
            {' · '}
            <span className="font-medium text-foreground/60">{totalUsers}</span> usuários
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Storage + R2 + Neon unified card ────────────────────────────────────────

function StorageInfraCard({
  totalFiles, totalStorage, activeBackups, storageSpark,
  r2Storage, neonProject, neonDbSizeBytes,
}: {
  totalFiles: number; totalStorage: number; activeBackups: number;
  storageSpark: { v: number }[];
  r2Storage: R2BucketStorage | null | undefined;
  neonProject: NeonProject | null | undefined;
  neonDbSizeBytes?: number;
}) {
  function fmtSec(s: number) {
    if (s >= 3600) return `${(s / 3600).toFixed(1)}h`;
    if (s >= 60) return `${Math.round(s / 60)}min`;
    return `${Math.round(s)}s`;
  }

  const dbSizeDisplay = neonDbSizeBytes && neonDbSizeBytes > 0
    ? `${(neonDbSizeBytes / 1024 / 1024 / 1024).toFixed(2)} GiB`
    : neonProject
      ? `${(neonProject.data_storage_bytes_hour / 1024 / 1024 / 1024).toFixed(2)} GiB`
      : null;
  const neonStorageGiB = dbSizeDisplay;
  const neonTransferMB = neonProject
    ? (neonProject.data_transfer_bytes / 1024 / 1024).toFixed(1)
    : null;
  const neonWrittenMB = neonProject
    ? (neonProject.written_data_bytes / 1024 / 1024).toFixed(1)
    : null;
  const computeTimeSec = neonProject
    ? ((neonProject as unknown as { compute_time_seconds?: number }).compute_time_seconds ?? neonProject.cpu_used_sec)
    : null;

  const NEON_COMPUTE_LIMIT_SEC = 191.9 * 3600;
  const computePct = neonProject && computeTimeSec !== null
    ? Math.min((neonProject.active_time_seconds / NEON_COMPUTE_LIMIT_SEC) * 100, 100)
    : null;
  const storageLimitGiB = neonProject?.branch_logical_size_limit_bytes
    ? neonProject.branch_logical_size_limit_bytes / 1024 / 1024 / 1024
    : null;
  const storageUsedGiB = neonDbSizeBytes && neonDbSizeBytes > 0
    ? neonDbSizeBytes / 1024 / 1024 / 1024
    : neonProject
      ? neonProject.data_storage_bytes_hour / 1024 / 1024 / 1024
      : null;
  const storagePct = storageUsedGiB !== null && storageLimitGiB !== null && storageLimitGiB > 0
    ? Math.min((storageUsedGiB / storageLimitGiB) * 100, 100)
    : null;

  const computeColor = computePct !== null
    ? computePct > 85 ? '#f87171' : computePct > 70 ? '#fbbf24' : '#34d399'
    : '#34d399';
  const storageColor = storagePct !== null
    ? storagePct > 85 ? '#f87171' : storagePct > 70 ? '#fbbf24' : '#a78bfa'
    : '#a78bfa';

  return (
    <div className="admin-glass relative flex flex-col rounded border border-border/50 bg-card p-2.5 gap-2.5 flex-1 overflow-hidden">
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/40" />
      <div className="absolute top-1.5 right-2 text-[8px] font-mono text-muted-foreground/25">STOR_INF_01</div>

      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[var(--admin-accent-soft)] text-primary shrink-0">
          <HardDrive className="h-3 w-3" />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Storage &amp; Infraestrutura
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: 'Arquivos', value: totalFiles.toLocaleString('pt-BR'), color: '#93C5FD' },
          { label: 'Storage', value: fmtBytes(totalStorage), color: '#4C9AFF' },
          { label: 'Backups', value: activeBackups.toLocaleString('pt-BR'), color: '#34d399' },
        ].map((k) => (
          <div key={k.label} className="rounded-sm border border-border/40 bg-[var(--admin-surface-elevated)] px-2 py-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
            <p className="font-sora text-sm font-semibold mt-0.5" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {storageSpark.length > 0 && (
        <div className="-mx-0.5">
          <Suspense fallback={<SparkFallback />}>
            <Spark data={storageSpark} color="#4C9AFF" neon />
          </Suspense>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border/25" />
        <span className="text-[8px] font-mono text-muted-foreground/35 uppercase tracking-wider flex items-center gap-1">
          <Cloud className="h-2.5 w-2.5" /> R2 · Cloudflare
        </span>
        <div className="h-px flex-1 bg-border/25" />
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 rounded-sm border border-border/40 bg-[var(--admin-surface-elevated)] flex flex-col items-center justify-center py-2">
          <p className="font-sora text-lg font-semibold leading-none" style={{ color: '#f97316' }}>
            {r2Storage?.payloadSize != null ? fmtBytes(r2Storage.payloadSize) : '—'}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase mt-1">Payload</p>
          {r2Storage?.metadataSize != null && (
            <p className="text-[9px] font-mono text-muted-foreground/40 mt-0.5">
              +{fmtBytes(r2Storage.metadataSize)} meta
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-1">
          {[
            { label: 'Objetos', value: r2Storage?.objectCount != null ? r2Storage.objectCount.toLocaleString('pt-BR') : '—', color: '#fbbf24' },
            ...(r2Storage?.uploadCount ? [{ label: 'Uploads', value: r2Storage.uploadCount.toLocaleString('pt-BR'), color: '#fb923c' }] : []),
            { label: 'Total', value: r2Storage != null ? fmtBytes((r2Storage.payloadSize ?? 0) + (r2Storage.metadataSize ?? 0)) : '—', color: '#f59e0b' },
          ].map((k) => (
            <div key={k.label} className="flex items-center justify-between rounded-sm border border-border/40 bg-[var(--admin-surface-elevated)] px-2 py-1">
              <p className="text-[9px] text-muted-foreground uppercase">{k.label}</p>
              <p className="font-sora text-xs font-semibold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border/25" />
        <span className="text-[8px] font-mono text-muted-foreground/35 uppercase tracking-wider flex items-center gap-1">
          <Database className="h-2.5 w-2.5" /> Neon · PostgreSQL{neonProject ? ` ${neonProject.pg_version}` : ''}
        </span>
        <div className="h-px flex-1 bg-border/25" />
      </div>

      <div className="flex items-center justify-around px-1">
        <div className="flex items-center gap-2">
          <GaugeArc percent={computePct} color={computeColor} />
          <div>
            <p className="font-sora text-base font-semibold leading-none" style={{ color: computeColor }}>
              {computeTimeSec !== null ? fmtSec(computeTimeSec) : '—'}
            </p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">Compute</p>
            {computePct !== null && (
              <p className="text-[9px] font-mono text-muted-foreground/40">{computePct.toFixed(1)}% lim</p>
            )}
          </div>
        </div>

        <div className="h-8 w-px bg-border/25" />

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="font-sora text-base font-semibold leading-none" style={{ color: storageColor }}>
              {neonStorageGiB ?? '—'}
            </p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">DB Size</p>
            {storageLimitGiB !== null && (
              <p className="text-[9px] font-mono text-muted-foreground/40">/ {storageLimitGiB.toFixed(1)} GiB</p>
            )}
          </div>
          <GaugeArc percent={storagePct} color={storageColor} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: 'CPU Usado', value: neonProject ? fmtSec(neonProject.cpu_used_sec) : '—', color: '#34d399' },
          { label: 'Transferência', value: neonTransferMB ? `${neonTransferMB} MB` : '—', color: '#6ee7b7' },
          ...(neonWrittenMB && parseFloat(neonWrittenMB) > 0
            ? [{ label: 'Escrito', value: `${neonWrittenMB} MB`, color: '#818cf8' }]
            : []),
          { label: 'Região', value: neonProject?.region_id?.replace('aws-', '') ?? '—', color: 'rgba(242,243,245,0.45)' },
        ].map((k) => (
          <div key={k.label} className="rounded-sm border border-border/40 bg-[var(--admin-surface-elevated)] px-2 py-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
            <p className="font-sora text-xs font-semibold mt-0.5 tabular-nums" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Neon DB Activity Banner ──────────────────────────────────────────────────

function NeonDbBanner({
  neonProject, consumption, dbStats, rowsData, loading,
}: {
  neonProject: NeonProject | null | undefined;
  consumption: NeonConsumptionResponse | null | undefined;
  dbStats: NeonDbStatsResponse | null | undefined;
  rowsData: NeonMetricsTimeseriesResponse | null | undefined;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-[140px] w-full rounded" />;

  const totalIns = dbStats?.totalInserts ?? 0;
  const totalUpd = dbStats?.totalUpdates ?? 0;
  const totalDel = dbStats?.totalDeletes ?? 0;
  const totalOps = totalIns + totalUpd + totalDel;

  const colIns  = '#34d399';
  const colMain = totalOps === 0 ? 'rgba(242,243,245,0.20)' : colIns;

  function fmtRows(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k`;
    return v.toLocaleString('pt-BR');
  }

  function fmtSec(s: number) {
    if (s >= 3600) return `${(s / 3600).toFixed(1)}h`;
    if (s >= 60) return `${Math.round(s / 60)}m`;
    return `${Math.round(s)}s`;
  }

  const noData = !neonProject;
  const dbSizeGiB = neonProject
    ? (neonProject.data_storage_bytes_hour / 1024 / 1024 / 1024).toFixed(2)
    : null;
  const transferMB = neonProject ? (neonProject.data_transfer_bytes / 1024 / 1024).toFixed(1) : null;

  void consumption;

  return (
    <div className="admin-glass relative rounded border border-border/60 bg-card">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded overflow-hidden"
        style={{ background: `radial-gradient(ellipse at 50% -40%, ${colMain}18 0%, transparent 60%)` }}
      />
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/40" />
      <div className="absolute top-1.5 right-10 text-[8px] font-mono text-muted-foreground/25">NEON_DB_01</div>

      <div className="relative flex items-center gap-6 px-5 pt-3 pb-2 border-b border-border/20 flex-wrap">
        <p className="text-[8px] font-mono text-muted-foreground/40 uppercase tracking-widest">
          Neon DB{neonProject?.name ? ` · ${neonProject.name}` : ''}
        </p>
        <div className="flex items-center gap-5 text-[10px]">
          <span>
            <span className="font-sora font-semibold text-foreground">{noData ? '—' : fmtSec(neonProject.cpu_used_sec)}</span>
            <span className="text-muted-foreground ml-1 text-[9px] uppercase tracking-wider">CPU Usado</span>
          </span>
          <span>
            <span className="font-sora font-semibold text-muted-foreground/60">{noData ? '—' : fmtSec(neonProject.active_time_seconds)}</span>
            <span className="text-muted-foreground ml-1 text-[9px] uppercase tracking-wider">Compute</span>
          </span>
          <span className="h-3 w-px bg-border/40" />
          <span>
            <span className="font-sora font-semibold" style={{ color: '#a78bfa' }}>{dbSizeGiB ? `${dbSizeGiB} GiB` : '—'}</span>
            <span className="text-muted-foreground ml-1 text-[9px] uppercase tracking-wider">DB Size</span>
          </span>
          <span>
            <span className="font-sora font-semibold" style={{ color: '#818cf8' }}>{transferMB ? `${transferMB} MB` : '—'}</span>
            <span className="text-muted-foreground ml-1 text-[9px] uppercase tracking-wider">Transfer</span>
          </span>
          {dbStats && (
            <>
              <span className="h-3 w-px bg-border/40" />
              {[
                { label: 'ins', value: totalIns, color: '#34d399' },
                { label: 'upd', value: totalUpd, color: '#4CC9F0' },
                { label: 'del', value: totalDel, color: '#6b7280' },
              ].map(({ label, value, color }) => (
                <span key={label}>
                  <span className="font-sora font-semibold tabular-nums" style={{ color }}>{fmtRows(value)}</span>
                  <span className="text-muted-foreground ml-1 text-[9px] uppercase tracking-wider">{label}</span>
                </span>
              ))}
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            noData ? 'bg-muted-foreground/30 animate-pulse' : 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)]',
          )} />
          <span className="text-[9px] font-mono text-muted-foreground/50">{noData ? 'sem dados' : 'conectado'}</span>
        </div>
      </div>

      <Suspense fallback={<NeonRowsFallback />}>
        <NeonRowsInlineChart series={rowsData?.available ? rowsData.series : []} />
      </Suspense>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminDashboardPage() {
  // Bundle crítico: stats + tenants + http-metrics + r2DefaultBucket em 1 RTT
  const { data: dashInit, isLoading: dashInitLoading, isSuccess: dashInitReady } = useQuery({
    queryKey: ['admin', 'dashboard-init'],
    queryFn: () => adminApi.getDashboardInit(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });

  const stats         = dashInit?.stats ?? null;
  const tenantsSummary: TenantSummary[] = dashInit?.tenantsSummary ?? [];
  const httpMetrics   = dashInit?.httpMetrics;
  const isLoading     = dashInitLoading;
  const tenantsLoading = dashInitLoading;
  const httpLoading   = dashInitLoading;

  // Histórico (sparklines laterais)
  const { data: usageHistory } = useQuery({
    queryKey: ['admin', 'usage', 14],
    queryFn: () => adminApi.getUsageHistory(14),
    staleTime: 300_000,
    placeholderData: keepPreviousData,
    enabled: dashInitReady,
  });

  // Railway metrics (live, 1h janela)
  const {
    data: railwayMetrics,
    dataUpdatedAt: railwayUpdatedAt,
    refetch: refetchRailway,
  } = useQuery({
    queryKey: ['admin', 'railway', 'metrics', 'overview'],
    queryFn: () => adminApi.getRailwayMetrics({
      startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      sampleRateSeconds: 60,
    }),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
    enabled: dashInitReady,
  });

  // Infra queries só montam após dashInit resolver — liberam o critical path
  const { data: redisInfo }      = useQuery({ queryKey: ['admin','redis','info'],      queryFn: () => adminApi.getRedisInfo(),         staleTime: 60_000,  enabled: dashInitReady });
  const { data: railwayProject } = useQuery({ queryKey: ['admin','railway','project'], queryFn: () => adminApi.getRailwayProject(),    staleTime: 600_000, enabled: dashInitReady });
  const { data: vercelProject }  = useQuery({ queryKey: ['admin','vercel','project'],  queryFn: () => adminApi.getVercelProject(),     staleTime: 600_000, enabled: dashInitReady });
  const { data: neonProjects }   = useQuery({ queryKey: ['admin','neon','projects'],   queryFn: () => adminApi.getNeonProjects(),      staleTime: 600_000, enabled: dashInitReady });

  // Waterfall R2 resolvido: usa bucket default do dashInit (env var no backend)
  // Só faz fetch de buckets como fallback se o default não estiver configurado
  const needsBucketList = dashInitReady && !dashInit?.r2DefaultBucket;
  const { data: r2Buckets } = useQuery({
    queryKey: ['admin', 'r2', 'buckets'],
    queryFn: () => adminApi.getR2Buckets(),
    staleTime: 600_000,
    enabled: needsBucketList,
  });
  const effectiveBucketName = dashInit?.r2DefaultBucket ?? r2Buckets?.buckets?.[0]?.name;

  const { data: r2Metrics } = useQuery({
    queryKey: ['admin', 'r2', 'bucket-metrics', effectiveBucketName],
    queryFn: () => adminApi.getR2BucketMetrics(effectiveBucketName!),
    enabled: dashInitReady && !!effectiveBucketName,
    staleTime: 600_000,
    placeholderData: keepPreviousData,
  });

  const { data: neonConsumption, isLoading: neonConsumptionLoading } = useQuery({
    queryKey: ['admin', 'neon', 'consumption'],
    queryFn: () => adminApi.getNeonConsumption(),
    staleTime: 600_000,
    placeholderData: keepPreviousData,
    enabled: dashInitReady,
  });

  const { data: neonDbStatsBanner } = useQuery({
    queryKey: ['admin', 'neon', 'db-stats-banner'],
    queryFn: () => adminApi.getNeonDbStats(),
    staleTime: 60_000,
    refetchInterval: 120_000,
    placeholderData: keepPreviousData,
    enabled: dashInitReady,
  });

  const { data: neonRowsBanner } = useQuery({
    queryKey: ['admin', 'neon', 'rows-sample'],
    queryFn: () => adminApi.getNeonRowsSample(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    placeholderData: keepPreviousData,
    enabled: dashInitReady,
  });

  const storageSpark = (usageHistory ?? []).map((d) => ({ v: d.storage }));
  const cpuSpark   = railwayMetrics?.available ? metricSeriesTs(railwayMetrics.metrics, 'cpu_usage') : [];
  const memGbSpark = railwayMetrics?.available ? metricSeriesTs(railwayMetrics.metrics, 'memory_usage_gb') : [];
  const cpuPct     = railwayMetrics?.available ? lastVal(railwayMetrics.metrics, 'cpu_usage') : null;
  const memGbRaw   = railwayMetrics?.available ? lastVal(railwayMetrics.metrics, 'memory_usage_gb') : null;
  const memGbMax   = memGbSpark.length ? Math.max(...memGbSpark.map((d) => d.v), 0.1) : null;
  const memPct     = memGbRaw !== null && memGbMax ? Math.min((memGbRaw / Math.max(memGbMax * 1.2, 0.5)) * 100, 100) : null;
  const memSub     = memGbRaw !== null ? `${memGbRaw.toFixed(2)} GB` : 'RAM servidor';

  function fmtUptime(s: number) {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
    return d > 0 ? `${d}d ${h}h` : `${h}h`;
  }

  return (
    <AdminGuard>
      <div className="flex flex-col gap-3 h-full">
        <div
          className="batcave-item flex items-end justify-between gap-4 pb-3 border-b border-border/40"
          style={{ animationDelay: '0ms' }}

        >
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                Baseado em todos os tenants
              </span>
            </div>
            <h1 className="font-sora text-3xl font-semibold tracking-tight text-foreground">
              Overview Panel
            </h1>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground/30">ADMIN_DASHBOARD_01</span>
        </div>

        <div className="flex gap-3 flex-1 min-h-0">
          <div className="flex flex-col gap-3 flex-1 min-w-0">

            <div className="batcave-item" style={{ animationDelay: '160ms' }}>
              <HttpStatusBanner
                data={httpMetrics?.available ? httpMetrics.last24h : null}
                hourly={httpMetrics?.hourly ?? []}
                loading={httpLoading}
              />
            </div>

            <div className="batcave-item" style={{ animationDelay: '380ms' }}>
              <RailwayResourceCard
                cpuPct={cpuPct}
                cpuSpark={cpuSpark}
                memPct={memPct}
                memSub={memSub}
                memSpark={memGbSpark}
                lastUpdatedAt={railwayUpdatedAt}
                onRefresh={refetchRailway}
              />
            </div>

            <div className="batcave-item" style={{ animationDelay: '600ms' }}>
              <TenantsUsersCard
                tenants={tenantsSummary ?? []}
                users={stats?.totalUsers ?? 0}
                clientes={stats?.totalClientes ?? 0}
                loading={tenantsLoading || isLoading}
              />
            </div>

            <div className="batcave-item" style={{ animationDelay: '820ms' }}>
              <NeonDbBanner
                neonProject={neonProjects?.available ? (neonProjects.projects?.[0] ?? null) : null}
                consumption={neonConsumption ?? null}
                dbStats={neonDbStatsBanner ?? null}
                rowsData={neonRowsBanner ?? null}
                loading={neonConsumptionLoading}
              />
            </div>

            <div className="batcave-item" style={{ animationDelay: '1040ms' }}>
              <Suspense fallback={<Skeleton className="h-[320px] w-full rounded" />}>
                <OverviewCharts />
              </Suspense>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-72 shrink-0">
            <div className="batcave-item" style={{ animationDelay: '270ms' }}>
              <ServicesPanel
                railway={railwayProject?.available ?? null}
                neon={neonProjects?.available ?? null}
                redis={redisInfo?.available ?? null}
                vercel={vercelProject?.available ?? null}
                r2={needsBucketList ? (r2Buckets?.available ?? null) : (dashInit?.r2DefaultBucket ? true : null)}
                redisVer={redisInfo?.server?.version}
                redisUptime={redisInfo?.available && redisInfo.server?.uptimeSeconds
                  ? fmtUptime(redisInfo.server.uptimeSeconds) : undefined}
                redisKeys={redisInfo?.available ? redisInfo.totalKeys : undefined}
                redisOps={redisInfo?.available ? String(redisInfo.stats?.instantaneousOpsPerSec ?? 0) : undefined}
                neonName={neonProjects?.projects?.[0]?.name}
                vercelName={vercelProject?.project?.name}
              />
            </div>
            <div className="batcave-item" style={{ animationDelay: '500ms' }}>
              <StorageInfraCard
                totalFiles={stats?.totalArquivos ?? 0}
                totalStorage={stats?.totalStorage ?? 0}
                activeBackups={stats?.activeBackups ?? 0}
                storageSpark={storageSpark.slice(-16)}
                r2Storage={r2Metrics?.available ? r2Metrics.storage : null}
                neonProject={neonProjects?.available ? (neonProjects.projects?.[0] ?? null) : null}
                neonDbSizeBytes={neonDbStatsBanner?.dbSizeBytes}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
