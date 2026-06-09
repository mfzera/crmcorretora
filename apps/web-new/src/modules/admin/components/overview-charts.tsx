
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import {
  Archive,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { Skeleton } from '@/core/ui/skeleton';
import { adminApi } from '@/infra/http/admin-api';
import type { DashboardCharts, ChartsDailyBackup } from '@/infra/http/admin-api';
import { cn } from '@/core/utils';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary:   '#4C9AFF',
  primary30: 'rgba(76,154,255,0.30)',
  primary10: 'rgba(76,154,255,0.10)',
  success:   '#34d399',
  success20: 'rgba(52,211,153,0.20)',
  danger:    '#f87171',
  danger20:  'rgba(248,113,113,0.20)',
  warn:      '#fbbf24',
  warn20:    'rgba(251,191,36,0.20)',
  purple:    '#a78bfa',
  purple20:  'rgba(167,139,250,0.20)',
  text:      'rgba(242,243,245,0.55)',
  grid:      'rgba(255,255,255,0.05)',
  tick:      'rgba(242,243,245,0.35)',
};

// ─── Shared tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatter?: (v: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-[#1a1e24] px-3 py-2.5 shadow-xl text-xs min-w-[140px]">
      {label && <p className="font-mono text-muted-foreground mb-1.5">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="font-semibold text-foreground">
            {formatter ? formatter(p.value, p.name) : p.value.toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────

function ChartCard({
  children,
  icon: Icon,
  title,
  subtitle,
  label,
  badge,
  badgeColor,
  className,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative rounded-xl border border-border/50 bg-card p-6 flex flex-col gap-5', className)}>
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40 rounded-tl" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-border/30 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-border/30 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-border/30 rounded-br" />
      {/* Mono label */}
      <div className="absolute -top-3 left-3 bg-card px-1 text-[8px] font-mono text-muted-foreground/35">
        {label}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-primary shrink-0">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {badge && (
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium"
            style={{
              background: badgeColor ? `${badgeColor}20` : C.primary10,
              color: badgeColor ?? C.primary,
              border: `1px solid ${badgeColor ?? C.primary}30`,
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}

// ─── Empty / loading states ───────────────────────────────────────────────────

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}

function EmptyChart({ message = 'Sem dados disponíveis' }: { message?: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

// ─── Axis tick helpers ────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function fmtMonth(m: string | undefined) {
  if (!m) return '';
  const [y, mo] = m.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(mo, 10) - 1]} ${y?.slice(2)}`;
}

function fmtDay(d: string | undefined) {
  if (!d) return '';
  const [, mo, dy] = d.split('-');
  return `${dy}/${mo}`;
}

// ─── 1. BACKUP STATUS CHART ───────────────────────────────────────────────────

export function BackupStatusChart({ data }: { data: ChartsDailyBackup[] }) {
  if (!data.length) return <EmptyChart message="Nenhum backup nos últimos 30 dias" />;

  const max = Math.max(...data.map((d) => d.concluido + d.falhou + d.em_progresso), 1);
  const total = data.reduce((a, d) => a + d.concluido, 0);
  const totalFailed = data.reduce((a, d) => a + d.falhou, 0);
  const successRate = total + totalFailed > 0
    ? ((total / (total + totalFailed)) * 100).toFixed(1)
    : null;

  return (
    <ChartCard
      icon={Archive}
      title="Status de Backups"
      subtitle="Histórico diário — últimos 30 dias"
      label="BACKUP_STATUS_01"
      badge={successRate ? `${successRate}% sucesso` : undefined}
      badgeColor={
        successRate
          ? parseFloat(successRate) >= 95 ? C.success
          : parseFloat(successRate) >= 80 ? C.warn
          : C.danger
        : undefined
      }
    >
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Concluídos', value: total, color: C.success },
          { label: 'Falhas', value: totalFailed, color: C.danger },
          { label: 'Dias', value: data.length, color: C.primary },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border/40 bg-[var(--admin-surface-elevated)] px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="font-sora text-xl font-semibold mt-0.5" style={{ color: s.color }}>
              {s.value.toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={8} barGap={2} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke={C.grid} />
            <XAxis
              dataKey="day"
              tickFormatter={fmtDay}
              tick={{ fill: C.tick, fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: C.tick, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={30}
              domain={[0, Math.ceil(max * 1.2)]}
            />
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip active={active} payload={payload as any} label={fmtDay(label as string)} />
              )}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="concluido" name="Concluídos" stackId="a" fill={C.success} fillOpacity={0.85} radius={[0, 0, 0, 0]} />
            <Bar dataKey="em_progresso" name="Em progresso" stackId="a" fill={C.primary} fillOpacity={0.7} />
            <Bar dataKey="falhou" name="Falhas" stackId="a" fill={C.danger} fillOpacity={0.9} radius={[3, 3, 0, 0]} />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 10, color: C.text, paddingTop: 8 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Duration average */}
      {data.some((d) => d.duration > 0) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/30 pt-3">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span>
            Duração média:{' '}
            <span className="text-foreground font-medium">
              {Math.round(
                data.filter((d) => d.duration > 0).reduce((a, d) => a + d.duration, 0) /
                  Math.max(data.filter((d) => d.duration > 0).length, 1),
              )}s
            </span>
          </span>
        </div>
      )}
    </ChartCard>
  );
}

// ─── 2. PRÊMIO LÍQUIDO CHART ──────────────────────────────────────────────────

export function PremiumChart({
  data,
  revenue,
}: {
  data: { month: string; total: number; count: number }[];
  revenue: { month: string; total: number; count: number }[];
}) {
  // Merge premium + avg commission by month
  const months = Array.from(
    new Set([...data.map((d) => d.month), ...revenue.map((r) => r.month)]),
  ).sort();

  const merged = months.map((m) => ({
    month: m,
    premium: data.find((d) => d.month === m)?.total ?? 0,
    comissao: revenue.find((r) => r.month === m)?.total ?? 0,
    cotacoes: data.find((d) => d.month === m)?.count ?? 0,
  }));

  const totalPremium = data.reduce((a, d) => a + d.total, 0);
  const avgComissao =
    revenue.length > 0
      ? revenue.reduce((a, r) => a + r.total, 0) / revenue.length
      : 0;

  if (!merged.length) return <EmptyChart message="Sem dados de prêmio nos últimos 12 meses" />;

  return (
    <ChartCard
      icon={TrendingUp}
      title="Prêmio Líquido & Comissão"
      subtitle="Últimos 12 meses"
      label="PREMIUM_REVENUE_01"
      badge="12 meses"
      badgeColor={C.purple}
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Prêmio total (12m)', value: fmtBRL(totalPremium), color: C.purple },
          { label: 'Média comissão (12m)', value: `${avgComissao.toFixed(1)}%`, color: C.success },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border/40 bg-[var(--admin-surface-elevated)] px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="font-sora text-xl font-semibold mt-0.5" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={merged} margin={{ top: 4, right: 24, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="gradPremium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.purple} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.purple} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradComissao" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.success} stopOpacity={0.25} />
                <stop offset="95%" stopColor={C.success} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={C.grid} />
            <XAxis
              dataKey="month"
              tickFormatter={fmtMonth}
              tick={{ fill: C.tick, fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="premium"
              tick={{ fill: C.tick, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtBRL}
              width={54}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              tick={{ fill: C.tick, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              width={30}
            />
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload as any}
                  label={fmtMonth(label as string)}
                  formatter={(v, name) =>
                    name === 'Comissão média' ? `${Number(v).toFixed(1)}%` : fmtBRL(v)
                  }
                />
              )}
              cursor={{ stroke: C.grid, strokeWidth: 1 }}
            />
            <Area
              yAxisId="premium"
              type="monotone"
              dataKey="premium"
              name="Prêmio líquido"
              stroke={C.purple}
              strokeWidth={2}
              fill="url(#gradPremium)"
              dot={false}
              activeDot={{ r: 4, fill: C.purple, strokeWidth: 0 }}
            />
            <Area
              yAxisId="pct"
              type="monotone"
              dataKey="comissao"
              name="Comissão média"
              stroke={C.success}
              strokeWidth={2}
              fill="url(#gradComissao)"
              dot={false}
              activeDot={{ r: 4, fill: C.success, strokeWidth: 0 }}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 10, color: C.text, paddingTop: 8 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
export function OverviewCharts() {
  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ['admin', 'stats', 'charts'],
    queryFn: () => adminApi.getDashboardCharts(),
    staleTime: 300_000,
  });

  return (
    <div className="space-y-6">
      {/* Section divider */}
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-mono text-muted-foreground/40 tracking-wider">ANALYTICS_CHARTS_01</span>
        <div className="h-px flex-1 bg-border/30" />
      </div>

      {/* Backup + Premium/Revenue */}
      <div className="grid gap-4 lg:grid-cols-2">
        {chartsLoading ? (
          <>
            <ChartSkeleton height={380} />
            <ChartSkeleton height={380} />
          </>
        ) : (
          <>
            <BackupStatusChart data={charts?.dailyBackups ?? []} />
            <PremiumChart
              data={charts?.monthlyPremium ?? []}
              revenue={charts?.monthlyRevenue ?? []}
            />
          </>
        )}
      </div>
    </div>
  );
}
