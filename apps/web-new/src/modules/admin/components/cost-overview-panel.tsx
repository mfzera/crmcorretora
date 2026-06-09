
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Progress } from '@/core/ui/progress';
import { Skeleton } from '@/core/ui/skeleton';
import { Badge } from '@/core/ui/badge';
import { adminApi } from '@/infra/http/admin-api';
import {
  DollarSign,
  Gift,
  TrendingUp,
  CheckCircle2,
  HardDrive,
  Database,
  Server,
  Cloud,
  AlertCircle,
  Zap,
} from 'lucide-react';

// ─── Pricing constants ────────────────────────────────────────────────────────

const R2_PRICING = {
  storage: { pricePerGB: 0.015, freeTierGB: 10 },
  classA:  { pricePerMillion: 4.5,  freeTierMillion: 1  }, // writes
  classB:  { pricePerMillion: 0.36, freeTierMillion: 10 }, // reads
};

const NEON_PRICING = {
  compute:  { pricePerCUHour: 0.106, freeTierHours: 5 },
  storage:  { pricePerGBMonth: 0.35, freeTierGB: 10   },
  transfer: { pricePerGB: 0.09,      freeTierGB: 5    },
};

const RAILWAY_PRICING = {
  cpu:     { perMinute: 0.000463 }, // $20/vCPU/month
  memory:  { perMinute: 0.000231 }, // $10/GB/month
  network: { perGB: 0.10 },
};

const PLAN_FREE_STORAGE: Record<string, number> = {
  free: 0.5, launch_v3: 10, scale_v3: 50, business: 500,
};

// ─── Cost calculation ─────────────────────────────────────────────────────────

function calcR2Cost(storageBytes: number, writes: number, reads: number, periodDays: number) {
  const storageGB = storageBytes / 1024 ** 3;
  const factor    = periodDays > 0 ? 30 / periodDays : 1;
  const monthlyWrites = writes * factor;
  const monthlyReads  = reads  * factor;

  const billableStorageGB = Math.max(0, storageGB - R2_PRICING.storage.freeTierGB);
  const billableWritesM   = Math.max(0, monthlyWrites / 1e6 - R2_PRICING.classA.freeTierMillion);
  const billableReadsM    = Math.max(0, monthlyReads  / 1e6 - R2_PRICING.classB.freeTierMillion);

  const storageCost = billableStorageGB * R2_PRICING.storage.pricePerGB;
  const writeCost   = billableWritesM   * R2_PRICING.classA.pricePerMillion;
  const readCost    = billableReadsM    * R2_PRICING.classB.pricePerMillion;

  const savedStorage = Math.min(storageGB, R2_PRICING.storage.freeTierGB) * R2_PRICING.storage.pricePerGB;
  const savedWrites  = Math.min(monthlyWrites / 1e6, R2_PRICING.classA.freeTierMillion) * R2_PRICING.classA.pricePerMillion;
  const savedReads   = Math.min(monthlyReads  / 1e6, R2_PRICING.classB.freeTierMillion) * R2_PRICING.classB.pricePerMillion;

  return {
    total:      storageCost + writeCost + readCost,
    totalSaved: savedStorage + savedWrites + savedReads,
    storageGB,
    monthlyWrites,
    monthlyReads,
    storagePercent: Math.min(100, (storageGB / R2_PRICING.storage.freeTierGB) * 100),
    writePercent:   Math.min(100, (monthlyWrites / 1e6 / R2_PRICING.classA.freeTierMillion) * 100),
    readPercent:    Math.min(100, (monthlyReads  / 1e6 / R2_PRICING.classB.freeTierMillion) * 100),
  };
}

function calcNeonCost(
  computeHours: number,
  storageGBMonth: number,
  transferGB: number,
  subscriptionType?: string,
) {
  const freeStorage = PLAN_FREE_STORAGE[subscriptionType ?? ''] ?? NEON_PRICING.storage.freeTierGB;

  const computeCost  = Math.max(0, computeHours   - NEON_PRICING.compute.freeTierHours) * NEON_PRICING.compute.pricePerCUHour;
  const storageCost  = Math.max(0, storageGBMonth - freeStorage)                        * NEON_PRICING.storage.pricePerGBMonth;
  const transferCost = Math.max(0, transferGB     - NEON_PRICING.transfer.freeTierGB)   * NEON_PRICING.transfer.pricePerGB;

  const savedCompute  = Math.min(computeHours,   NEON_PRICING.compute.freeTierHours) * NEON_PRICING.compute.pricePerCUHour;
  const savedStorage  = Math.min(storageGBMonth, freeStorage)                        * NEON_PRICING.storage.pricePerGBMonth;
  const savedTransfer = Math.min(transferGB,     NEON_PRICING.transfer.freeTierGB)   * NEON_PRICING.transfer.pricePerGB;

  return {
    total:          computeCost + storageCost + transferCost,
    totalSaved:     savedCompute + savedStorage + savedTransfer,
    computePercent: Math.min(100, (computeHours   / NEON_PRICING.compute.freeTierHours) * 100),
    storagePercent: Math.min(100, (storageGBMonth / freeStorage)                        * 100),
    transferPercent:Math.min(100, (transferGB     / NEON_PRICING.transfer.freeTierGB)   * 100),
    freeStorage,
  };
}

function calcRailwayCost(cpuMin: number, memGBMin: number, networkTxGB: number) {
  return {
    total:      cpuMin * RAILWAY_PRICING.cpu.perMinute
              + memGBMin * RAILWAY_PRICING.memory.perMinute
              + networkTxGB * RAILWAY_PRICING.network.perGB,
    totalSaved: 0,
    cpuMin,
    memGBMin,
    networkTxGB,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtUSD(v: number, decimals = 2) {
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getRange30d() {
  const now  = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fmt  = (d: Date) => d.toISOString().split('T')[0];
  return { dateFrom: fmt(from), dateTo: fmt(now) };
}

function progressColor(pct: number) {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${accent ?? 'text-muted-foreground'}`} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${accent ?? ''}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

interface FreeTierRow {
  label: string;
  value: string;
  percent: number;
  freeCap: string;
}

function ServiceCard({
  icon: Icon,
  name,
  cost,
  badge,
  color,
  rows,
  unavailable,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  cost: number | null;
  badge?: string;
  color: string;
  rows?: FreeTierRow[];
  unavailable?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{name}</span>
          {badge ? (
            <Badge variant="secondary" className="text-xs">{badge}</Badge>
          ) : unavailable ? (
            <Badge variant="outline" className="text-xs text-muted-foreground">Indisponível</Badge>
          ) : cost !== null ? (
            <span className="text-sm font-bold">{fmtUSD(cost)}</span>
          ) : null}
        </div>

        {rows?.map((row) => (
          <div key={row.label} className="mt-2">
            <div className="mb-0.5 flex justify-between text-xs text-muted-foreground">
              <span>{row.label}: <strong className="text-foreground">{row.value}</strong></span>
              <span>{row.freeCap}</span>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all ${progressColor(row.percent)}`}
                style={{ width: `${row.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function CostOverviewPanel() {
  const { dateFrom, dateTo } = React.useMemo(() => getRange30d(), []);

  // ── R2 ──────────────────────────────────────────────────────────────────────
  const { data: r2Buckets, isLoading: loadingBuckets } = useQuery({
    queryKey: ['admin', 'r2', 'buckets'],
    queryFn:  () => adminApi.getR2Buckets(),
    staleTime: 5 * 60 * 1000,
  });
  const firstBucket = r2Buckets?.buckets?.[0]?.name;

  const { data: r2Metrics, isLoading: loadingR2Metrics } = useQuery({
    queryKey: ['admin', 'r2', 'metrics', firstBucket, dateFrom, dateTo],
    queryFn:  () => adminApi.getR2BucketMetrics(firstBucket!, dateFrom, dateTo),
    enabled:  !!firstBucket,
    staleTime: 5 * 60 * 1000,
  });

  const { data: r2Ops, isLoading: loadingR2Ops } = useQuery({
    queryKey: ['admin', 'r2', 'ops', firstBucket, dateFrom, dateTo],
    queryFn:  () => adminApi.getR2Operations({ bucketName: firstBucket, dateFrom, dateTo }),
    enabled:  !!firstBucket,
    staleTime: 5 * 60 * 1000,
  });

  // ── Neon ────────────────────────────────────────────────────────────────────
  const { data: neonData, isLoading: loadingNeon } = useQuery({
    queryKey: ['admin', 'neon', 'consumption'],
    queryFn:  () => adminApi.getNeonConsumption(),
    staleTime: 5 * 60 * 1000,
  });

  // ── Railway ─────────────────────────────────────────────────────────────────
  const { data: railwayUsage, isLoading: loadingRailway } = useQuery({
    queryKey: ['admin', 'railway', 'usage'],
    queryFn:  () => adminApi.getRailwayUsage(),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingBuckets || loadingNeon || loadingRailway;
  const isR2Loading = loadingR2Metrics || loadingR2Ops;

  // ── Derived cost data ────────────────────────────────────────────────────────

  const r2StorageBytes = (r2Metrics?.storage?.payloadSize ?? 0) + (r2Metrics?.storage?.metadataSize ?? 0);
  const r2Writes = r2Ops?.data
    .filter((g) => g.dimensions.actionType === 'writeObject')
    .reduce((a, g) => a + g.sum.requests, 0) ?? 0;
  const r2Reads = r2Ops?.data
    .filter((g) => g.dimensions.actionType === 'readObject')
    .reduce((a, g) => a + g.sum.requests, 0) ?? 0;
  const r2 = calcR2Cost(r2StorageBytes, r2Writes, r2Reads, 30);

  const neonSub = neonData?.data?.[0]?.subscription_type;
  const neonComputeH = (neonData?.data ?? []).reduce(
    (acc, p) => acc + p.periods.reduce((a, period) => a + period.compute_unit_seconds / 3600, 0), 0,
  );
  const neonStorageGBMonth = (neonData?.data ?? []).reduce(
    (acc, p) => acc + p.periods.reduce((a, period) => a + period.data_storage_bytes_hour / 730 / 1e9, 0), 0,
  );
  const neonTransferGB = (neonData?.data ?? []).reduce(
    (acc, p) => acc + p.periods.reduce((a, period) => a + period.data_transfer_bytes / 1e9, 0), 0,
  );
  const neon = calcNeonCost(neonComputeH, neonStorageGBMonth, neonTransferGB, neonSub);

  const ru = railwayUsage?.estimated ?? railwayUsage?.actual;
  const railway = (ru != null && ru.cpuMinutes != null)
    ? calcRailwayCost(ru.cpuMinutes, ru.memoryGBMinutes ?? 0, ru.networkTxGB ?? 0)
    : { total: 0, totalSaved: 0, cpuMin: 0, memGBMin: 0, networkTxGB: 0 };

  const totalCost  = r2.total + neon.total + railway.total;
  const totalSaved = r2.totalSaved + neon.totalSaved;

  // Most expensive paid service
  const costMap = [
    { name: 'Railway',       cost: railway.total },
    { name: 'Neon DB',       cost: neon.total    },
    { name: 'Cloudflare R2', cost: r2.total      },
  ].sort((a, b) => b.cost - a.cost);
  const mostExpensive = costMap[0];

  // Chart data
  const chartData = [
    { name: 'Cloudflare R2', value: r2.total,      color: '#f97316' },
    { name: 'Neon DB',       value: neon.total,     color: '#3b82f6' },
    { name: 'Railway',       value: railway.total,  color: '#8b5cf6' },
  ].filter((d) => d.value > 0);
  const allFree = chartData.length === 0;

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            Visão Geral de Custos
          </CardTitle>
          <CardDescription>Estimativa mensal consolidada de infraestrutura</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-56" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          Visão Geral de Custos
        </CardTitle>
        <CardDescription>
          Estimativa mensal consolidada de infraestrutura — últimos 30 dias
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={DollarSign}
            label="Total Estimado / mês"
            value={fmtUSD(totalCost)}
            sub={allFree ? 'Tudo no free tier!' : undefined}
            accent="text-emerald-600"
          />
          <KpiCard
            icon={Gift}
            label="Economia Free Tier"
            value={fmtUSD(totalSaved)}
            sub="vs. cobrança sem tier grátis"
            accent="text-blue-500"
          />
          <KpiCard
            icon={TrendingUp}
            label="Serviço + Caro"
            value={mostExpensive.cost > 0 ? mostExpensive.name : '—'}
            sub={mostExpensive.cost > 0 ? fmtUSD(mostExpensive.cost) : 'Tudo gratuito'}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Serviços Gratuitos"
            value="2"
            sub="Vercel (Hobby) + Redis via Railway"
          />
        </div>

        {/* ── Chart + Service Breakdown ──────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Pie / empty state */}
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Distribuição de Custos
            </p>
            {allFree ? (
              <div className="flex h-52 items-center justify-center rounded-lg border border-dashed bg-muted/30">
                <div className="text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-medium">Custo zero este mês</p>
                  <p className="text-xs text-muted-foreground">Todos os serviços dentro do free tier</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmtUSD(v), 'Custo est.']}
                    labelFormatter={(l) => l as string}
                  />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Analyses / insights */}
            <div className="mt-4 space-y-2">
              {totalSaved > totalCost && (
                <div className="flex items-start gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                  <Zap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  Free tier cobre <strong>{((totalSaved / (totalCost + totalSaved)) * 100).toFixed(0)}%</strong> do uso real — ótimo aproveitamento.
                </div>
              )}
              {r2.storagePercent >= 80 && (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  Storage R2 em <strong>{r2.storagePercent.toFixed(0)}%</strong> do free tier (10 GB). Considere monitorar o crescimento.
                </div>
              )}
              {neon.computePercent >= 80 && (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  Compute Neon em <strong>{neon.computePercent.toFixed(0)}%</strong> das 5h gratuitas — próximo de cobrança extra.
                </div>
              )}
              {railway.total > 5 && (
                <div className="flex items-start gap-2 rounded-md bg-purple-50 dark:bg-purple-950/30 p-2.5 text-xs text-purple-700 dark:text-purple-300">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  Railway representa <strong>{fmtUSD(railway.total)}</strong>/mês — o maior custo atual.
                </div>
              )}
            </div>
          </div>

          {/* Per-service breakdown */}
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Por Serviço
            </p>
            <div className="space-y-2.5">

              <ServiceCard
                icon={HardDrive}
                name="Cloudflare R2"
                cost={isR2Loading ? null : r2.total}
                color="text-orange-500"
                unavailable={r2Buckets?.available === false}
                rows={isR2Loading ? undefined : [
                  {
                    label: 'Storage',
                    value: `${r2.storageGB.toFixed(2)} GB`,
                    percent: r2.storagePercent,
                    freeCap: '10 GB grátis',
                  },
                  {
                    label: 'Escritas',
                    value: `${(r2.monthlyWrites / 1e6).toFixed(3)} M`,
                    percent: r2.writePercent,
                    freeCap: '1 M grátis',
                  },
                  {
                    label: 'Leituras',
                    value: `${(r2.monthlyReads / 1e6).toFixed(3)} M`,
                    percent: r2.readPercent,
                    freeCap: '10 M grátis',
                  },
                ]}
              />

              <ServiceCard
                icon={Database}
                name="Neon DB"
                cost={neon.total}
                color="text-blue-500"
                unavailable={neonData?.available === false}
                rows={[
                  {
                    label: 'Compute',
                    value: `${neonComputeH.toFixed(2)} CU-h`,
                    percent: neon.computePercent,
                    freeCap: '5h grátis',
                  },
                  {
                    label: 'Storage',
                    value: `${neonStorageGBMonth.toFixed(3)} GB-mês`,
                    percent: neon.storagePercent,
                    freeCap: `${neon.freeStorage} GB grátis`,
                  },
                  {
                    label: 'Transfer',
                    value: `${neonTransferGB.toFixed(3)} GB`,
                    percent: neon.transferPercent,
                    freeCap: '5 GB grátis',
                  },
                ]}
              />

              <ServiceCard
                icon={Server}
                name="Railway"
                cost={railway.total}
                color="text-purple-500"
                unavailable={railwayUsage?.available === false}
                rows={[
                  {
                    label: 'CPU',
                    value: `${(railway.cpuMin ?? 0).toFixed(0)} vCPU-min`,
                    percent: Math.min(100, ((railway.cpuMin ?? 0) / 43200) * 100), // 30d * 24h * 60min = 43200 vCPU-min @ 1vCPU
                    freeCap: 'pay-as-you-go',
                  },
                  {
                    label: 'Memória',
                    value: `${(railway.memGBMin ?? 0).toFixed(0)} GB-min`,
                    percent: Math.min(100, ((railway.memGBMin ?? 0) / 43200) * 100),
                    freeCap: 'pay-as-you-go',
                  },
                ]}
              />

              <ServiceCard
                icon={Cloud}
                name="Vercel"
                cost={0}
                badge="Hobby — grátis"
                color="text-slate-500"
              />

              <ServiceCard
                icon={Zap}
                name="Redis (Upstash/Railway)"
                cost={0}
                badge="Incluso no Railway"
                color="text-red-400"
              />

            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
