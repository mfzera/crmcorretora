
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
import { adminApi, type R2OperationGroup, type R2BucketStorage } from '@/infra/http/admin-api';
import {
  Database,
  FileArchive,
  HardDrive,
  BarChart3,
  AlertCircle,
  DollarSign,
  TrendingDown,
  Gift,
} from 'lucide-react';

// ─── Preços Cloudflare R2 ────────────────────────────────────────────────────
const R2_PRICING = {
  storage: { pricePerGB: 0.015, freeTierGB: 10 },
  classA: { pricePerMillion: 4.5, freeTierMillion: 1 },   // writes
  classB: { pricePerMillion: 0.36, freeTierMillion: 10 },  // reads
};

function calcR2Cost(
  storageBytes: number,
  writes: number,
  reads: number,
  periodDays: number,
) {
  const storageGB = storageBytes / 1024 ** 3;
  // Extrapola operações para 30 dias caso o período seja menor
  const factor = periodDays > 0 ? 30 / periodDays : 1;
  const monthlyWrites = writes * factor;
  const monthlyReads  = reads  * factor;

  const billableStorageGB = Math.max(0, storageGB - R2_PRICING.storage.freeTierGB);
  const billableWritesM   = Math.max(0, monthlyWrites / 1e6 - R2_PRICING.classA.freeTierMillion);
  const billableReadsM    = Math.max(0, monthlyReads  / 1e6 - R2_PRICING.classB.freeTierMillion);

  const storageCost = billableStorageGB  * R2_PRICING.storage.pricePerGB;
  const writeCost   = billableWritesM    * R2_PRICING.classA.pricePerMillion;
  const readCost    = billableReadsM     * R2_PRICING.classB.pricePerMillion;
  const total       = storageCost + writeCost + readCost;

  // Quanto o free tier está economizando
  const savedStorage = Math.min(storageGB, R2_PRICING.storage.freeTierGB) * R2_PRICING.storage.pricePerGB;
  const savedWrites  = Math.min(monthlyWrites / 1e6, R2_PRICING.classA.freeTierMillion) * R2_PRICING.classA.pricePerMillion;
  const savedReads   = Math.min(monthlyReads  / 1e6, R2_PRICING.classB.freeTierMillion) * R2_PRICING.classB.pricePerMillion;
  const totalSaved   = savedStorage + savedWrites + savedReads;

  return {
    storageGB,
    monthlyWrites,
    monthlyReads,
    storageCost,
    writeCost,
    readCost,
    total,
    totalSaved,
  };
}

// ─── Configs ─────────────────────────────────────────────────────────────────
const chartConfig = {
  Leituras: { label: 'Leituras', color: '#22c55e' },
  Escritas:  { label: 'Escritas',  color: '#16a34a' },
} satisfies ChartConfig;

const DATE_RANGES = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0)          return '0 B';
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 ** 2)    return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)    return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatUSD(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 });
}

function getDateStr(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
}

function groupOperationsByDate(data: R2OperationGroup[]) {
  const byDate: Record<string, { reads: number; writes: number }> = {};

  for (const item of data) {
    const date = item.dimensions.date;
    if (!byDate[date]) byDate[date] = { reads: 0, writes: 0 };

    const action = item.dimensions.actionType?.toLowerCase() ?? '';
    if (action.includes('get') || action.includes('head') || action.includes('list')) {
      byDate[date].reads += item.sum.requests;
    } else {
      byDate[date].writes += item.sum.requests;
    }
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, Leituras: v.reads, Escritas: v.writes }));
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StorageMetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
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

function CostRow({
  label,
  detail,
  cost,
  free,
}: {
  label: string;
  detail: string;
  cost: number;
  free?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="text-right">
        {free ? (
          <span className="text-xs font-semibold text-emerald-500">GRÁTIS</span>
        ) : (
          <span className="text-sm font-semibold">{formatUSD(cost)}</span>
        )}
      </div>
    </div>
  );
}

function CostBreakdown({
  storage,
  chartData,
  days,
}: {
  storage: R2BucketStorage | null;
  chartData: { Leituras: number; Escritas: number }[];
  days: number;
}) {
  const totalReads  = chartData.reduce((a, d) => a + d.Leituras, 0);
  const totalWrites = chartData.reduce((a, d) => a + d.Escritas, 0);

  if (!storage) return null;

  const cost = calcR2Cost(storage.payloadSize ?? 0, totalWrites, totalReads, days);

  return (
    <div className="rounded-lg border p-4 space-y-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Estimativa mensal</p>
        </div>
        {cost.totalSaved > 0 && (
          <Badge variant="outline" className="text-emerald-500 border-emerald-500 gap-1 text-xs">
            <Gift className="h-3 w-3" />
            Free tier economiza {formatUSD(cost.totalSaved)}
          </Badge>
        )}
      </div>

      <CostRow
        label="Armazenamento"
        detail={`${cost.storageGB.toFixed(3)} GB · free tier: ${R2_PRICING.storage.freeTierGB} GB`}
        cost={cost.storageCost}
        free={cost.storageCost === 0}
      />
      <CostRow
        label="Escritas (Class A)"
        detail={`${(cost.monthlyWrites / 1e6).toFixed(4)}M req/mês · free tier: ${R2_PRICING.classA.freeTierMillion}M`}
        cost={cost.writeCost}
        free={cost.writeCost === 0}
      />
      <CostRow
        label="Leituras (Class B)"
        detail={`${(cost.monthlyReads / 1e6).toFixed(4)}M req/mês · free tier: ${R2_PRICING.classB.freeTierMillion}M`}
        cost={cost.readCost}
        free={cost.readCost === 0}
      />
      <CostRow
        label="Egresso"
        detail="Sempre grátis no R2"
        cost={0}
        free
      />

      <div className="flex items-center justify-between pt-3 mt-1">
        <div className="flex items-center gap-1 text-muted-foreground">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm">Total estimado/mês</span>
        </div>
        <span className={`text-lg font-bold ${cost.total === 0 ? 'text-emerald-500' : ''}`}>
          {cost.total === 0 ? 'US$ 0,00' : formatUSD(cost.total)}
        </span>
      </div>

      {days < 30 && (
        <p className="text-xs text-muted-foreground pt-1">
          * Operações extrapoladas de {days} dias para 30 dias
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function R2AnalyticsPanel() {
  const [days, setDays] = React.useState(30);
  const [activeBucket, setActiveBucket] = React.useState<string | null>(null);

  const dateFrom = getDateStr(days);
  const dateTo   = getDateStr(0);

  const { data: bucketsData, isLoading: loadingBuckets } = useQuery({
    queryKey: ['admin', 'r2', 'buckets'],
    queryFn: () => adminApi.getR2Buckets(),
  });

  const buckets = bucketsData?.buckets ?? [];

  React.useEffect(() => {
    if (buckets.length > 0 && !activeBucket) {
      setActiveBucket(buckets[0].name);
    }
  }, [buckets, activeBucket]);

  const { data: opsData, isLoading: loadingOps } = useQuery({
    queryKey: ['admin', 'r2', 'operations', activeBucket, dateFrom, dateTo],
    queryFn: () => adminApi.getR2Operations({ bucketName: activeBucket ?? undefined, dateFrom, dateTo }),
    enabled: !!activeBucket,
  });

  const { data: metricsData, isLoading: loadingMetrics } = useQuery({
    queryKey: ['admin', 'r2', 'bucket-metrics', activeBucket, dateFrom, dateTo],
    queryFn: () => adminApi.getR2BucketMetrics(activeBucket!, dateFrom, dateTo),
    enabled: !!activeBucket,
  });

  const chartData = React.useMemo(
    () => groupOperationsByDate(opsData?.data ?? []),
    [opsData],
  );

  const totalRequests = chartData.reduce((acc, d) => acc + d.Leituras + d.Escritas, 0);
  const storage = metricsData?.storage ?? null;

  if (!bucketsData?.available && bucketsData !== undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            R2 Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{bucketsData.message}</p>
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
              <BarChart3 className="h-5 w-5" />
              R2 Analytics
            </CardTitle>
            <CardDescription>
              Operações, armazenamento e estimativa de custos Cloudflare R2
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

        {loadingBuckets ? (
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-7 w-40" />
          </div>
        ) : (
          <div className="flex gap-2 mt-2 flex-wrap">
            {buckets.map((b) => (
              <Badge
                key={b.name}
                variant={activeBucket === b.name ? 'default' : 'outline'}
                className="cursor-pointer text-sm py-1 px-3"
                onClick={() => setActiveBucket(b.name)}
              >
                {b.name}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Storage metrics */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Armazenamento</p>
          {loadingMetrics ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : !storage ? (
            <p className="text-sm text-muted-foreground">Sem dados para este bucket.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <StorageMetricCard icon={Database}     label="Objetos"       value={(storage.objectCount ?? 0).toLocaleString('pt-BR')} color="bg-blue-500"   />
              <StorageMetricCard icon={HardDrive}    label="Tamanho Total" value={formatBytes(storage.payloadSize ?? 0)}             color="bg-violet-500" />
              <StorageMetricCard icon={FileArchive}  label="Metadados"     value={formatBytes(storage.metadataSize ?? 0)}            color="bg-slate-500"  />
            </div>
          )}
        </div>

        {/* Operations chart */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">
              Operações ({days} dias)
            </p>
            {!loadingOps && opsData?.available && (
              <span className="text-sm text-muted-foreground">
                Total:{' '}
                <span className="font-semibold text-foreground">
                  {totalRequests.toLocaleString('pt-BR')} req
                </span>
              </span>
            )}
          </div>

          {loadingOps ? (
            <Skeleton className="h-52" />
          ) : !opsData?.available ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{opsData?.message}</p>
            </div>
          ) : chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma operação registrada no período.
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
              <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="colorWrites" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}   />
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
                <YAxis tickLine={false} axisLine={false} width={40} />
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
                <Area type="monotone" dataKey="Leituras" stroke="var(--color-Leituras)" fill="url(#colorReads)"  strokeWidth={2} />
                <Area type="monotone" dataKey="Escritas"  stroke="var(--color-Escritas)"  fill="url(#colorWrites)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        {/* Cost breakdown */}
        {!loadingOps && !loadingMetrics && opsData?.available && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Estimativa de custos</p>
            <CostBreakdown storage={storage} chartData={chartData} days={days} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
