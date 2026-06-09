import { createFileRoute } from '@tanstack/react-router';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Skeleton } from '@/core/ui/skeleton';
import { Badge } from '@/core/ui/badge';
import { AdminGuard } from '@/modules/admin/components/admin-guard';
import { adminApi, type Tenant } from '@/infra/http/admin-api';
import {
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Building2,
  AlertCircle,
  Info,
  ArrowRight,
  HardDrive,
  Database,
  Server,
} from 'lucide-react';
import { PageHeader } from '@/modules/admin/components/page-header';

export const Route = createFileRoute('/_admin/admin/pricing')({
  component: AdminPricingPage,
});


// ─── Pricing constants ────────────────────────────────────────────────────────

const R2_PRICING = {
  storage: { pricePerGB: 0.015, freeTierGB: 10 },
  classA:  { pricePerMillion: 4.5,  freeTierMillion: 1  },
  classB:  { pricePerMillion: 0.36, freeTierMillion: 10 },
};
const NEON_PRICING = {
  compute:  { pricePerCUHour: 0.106, freeTierHours: 5 },
  storage:  { pricePerGBMonth: 0.35, freeTierGB: 10   },
  transfer: { pricePerGB: 0.09,      freeTierGB: 5    },
};
const RAILWAY_PRICING = {
  cpu:     { perMinute: 0.000463 },
  memory:  { perMinute: 0.000231 },
  network: { perGB: 0.10 },
};
const PLAN_FREE_STORAGE: Record<string, number> = {
  free: 0.5, launch_v3: 10, scale_v3: 50, business: 500,
};

function calcR2Total(storageBytes: number, writes: number, reads: number, periodDays: number) {
  const storageGB = storageBytes / 1024 ** 3;
  const factor    = periodDays > 0 ? 30 / periodDays : 1;
  const mW = writes * factor;
  const mR = reads  * factor;
  return (
    Math.max(0, storageGB - R2_PRICING.storage.freeTierGB) * R2_PRICING.storage.pricePerGB +
    Math.max(0, mW / 1e6 - R2_PRICING.classA.freeTierMillion) * R2_PRICING.classA.pricePerMillion +
    Math.max(0, mR / 1e6 - R2_PRICING.classB.freeTierMillion) * R2_PRICING.classB.pricePerMillion
  );
}
function calcNeonTotal(h: number, stGB: number, trGB: number, sub?: string) {
  const freeStorage = PLAN_FREE_STORAGE[sub ?? ''] ?? NEON_PRICING.storage.freeTierGB;
  return (
    Math.max(0, h    - NEON_PRICING.compute.freeTierHours) * NEON_PRICING.compute.pricePerCUHour +
    Math.max(0, stGB - freeStorage)                        * NEON_PRICING.storage.pricePerGBMonth +
    Math.max(0, trGB - NEON_PRICING.transfer.freeTierGB)   * NEON_PRICING.transfer.pricePerGB
  );
}
function calcRailwayTotal(cpu: number, mem: number, net: number) {
  return cpu * RAILWAY_PRICING.cpu.perMinute + mem * RAILWAY_PRICING.memory.perMinute + net * RAILWAY_PRICING.network.perGB;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtUSD(v: number, dec = 2) {
  return v.toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  });
}
function fmtBytes(b: number) {
  if (b === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / 1024 ** i).toFixed(2)} ${units[i]}`;
}
function getRange30d() {
  const now  = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { dateFrom: from.toISOString().split('T')[0], dateTo: now.toISOString().split('T')[0] };
}

// ─── Tier Card ────────────────────────────────────────────────────────────────

function TierCard({
  icon: Icon,
  label,
  price,
  multiplier,
  color,
  borderColor,
  description,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  price: number;
  multiplier: string;
  color: string;
  borderColor: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`relative ${borderColor} ${highlight ? 'ring-2 ring-offset-2 ring-emerald-500' : ''}`}>
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-emerald-500 text-white text-xs px-3">Recomendado</Badge>
        </div>
      )}
      <CardContent className="pt-6 pb-5 text-center">
        <Icon className={`mx-auto mb-3 h-8 w-8 ${color}`} />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
        <p className={`text-3xl font-bold ${color} mb-1`}>{fmtUSD(price)}</p>
        <p className="text-xs text-muted-foreground mb-3">por cliente / mês</p>
        <Badge variant="outline" className="text-xs mb-3">{multiplier}</Badge>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CostTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((a, p) => a + p.value, 0);
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs space-y-1 min-w-36">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className="font-mono">{fmtUSD(p.value, 4)}</span>
        </div>
      ))}
      <div className="border-t pt-1 flex justify-between gap-4 font-semibold">
        <span>Total</span>
        <span className="font-mono">{fmtUSD(total, 4)}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminPricingPage() {
  const { dateFrom, dateTo } = React.useMemo(() => getRange30d(), []);
  const [targetClients, setTargetClients] = React.useState<number | ''>('');
  const [selectedTenantId, setSelectedTenantId] = React.useState<string>('__avg__');

  // ── Fetch infra data ──────────────────────────────────────────────────────

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getGlobalStats(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tenantsData, isLoading: loadingTenants } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => adminApi.getTenants(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: r2Buckets, isLoading: loadingBuckets } = useQuery({
    queryKey: ['admin', 'r2', 'buckets'],
    queryFn: () => adminApi.getR2Buckets(),
    staleTime: 5 * 60 * 1000,
  });
  const firstBucket = r2Buckets?.buckets?.[0]?.name;

  const { data: r2Metrics } = useQuery({
    queryKey: ['admin', 'r2', 'metrics', firstBucket, dateFrom, dateTo],
    queryFn: () => adminApi.getR2BucketMetrics(firstBucket!, dateFrom, dateTo),
    enabled: !!firstBucket,
    staleTime: 5 * 60 * 1000,
  });

  const { data: r2Ops } = useQuery({
    queryKey: ['admin', 'r2', 'ops', firstBucket, dateFrom, dateTo],
    queryFn: () => adminApi.getR2Operations({ bucketName: firstBucket, dateFrom, dateTo }),
    enabled: !!firstBucket,
    staleTime: 5 * 60 * 1000,
  });

  const { data: neonData, isLoading: loadingNeon } = useQuery({
    queryKey: ['admin', 'neon', 'consumption'],
    queryFn: () => adminApi.getNeonConsumption(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: railwayUsage, isLoading: loadingRailway } = useQuery({
    queryKey: ['admin', 'railway', 'usage'],
    queryFn: () => adminApi.getRailwayUsage(),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingStats || loadingTenants || loadingBuckets || loadingNeon || loadingRailway;

  // ── Total infra costs ─────────────────────────────────────────────────────

  const r2StorageBytes = (r2Metrics?.storage?.payloadSize ?? 0) + (r2Metrics?.storage?.metadataSize ?? 0);
  const r2Writes = r2Ops?.data.filter(g => g.dimensions.actionType === 'writeObject').reduce((a, g) => a + g.sum.requests, 0) ?? 0;
  const r2Reads  = r2Ops?.data.filter(g => g.dimensions.actionType === 'readObject' ).reduce((a, g) => a + g.sum.requests, 0) ?? 0;
  const r2Total  = calcR2Total(r2StorageBytes, r2Writes, r2Reads, 30);

  const neonSub   = neonData?.data?.[0]?.subscription_type;
  const neonCompH = (neonData?.data ?? []).reduce((a, p) => a + p.periods.reduce((b, pe) => b + pe.compute_unit_seconds / 3600, 0), 0);
  const neonStGB  = (neonData?.data ?? []).reduce((a, p) => a + p.periods.reduce((b, pe) => b + pe.data_storage_bytes_hour / 730 / 1e9, 0), 0);
  const neonTrGB  = (neonData?.data ?? []).reduce((a, p) => a + p.periods.reduce((b, pe) => b + pe.data_transfer_bytes / 1e9, 0), 0);
  const neonTotal = calcNeonTotal(neonCompH, neonStGB, neonTrGB, neonSub);

  const ru           = railwayUsage?.estimated ?? railwayUsage?.actual;
  const railwayTotal = ru ? calcRailwayTotal(ru.cpuMinutes, ru.memoryGBMinutes, ru.networkTxGB) : 0;

  const infraTotal    = r2Total + neonTotal + railwayTotal;
  const activeTenants = stats?.totalTenants ?? 1;
  const tenants: Tenant[] = tenantsData ?? [];

  // ── Selected tenant ───────────────────────────────────────────────────────

  const selectedTenant = selectedTenantId === '__avg__'
    ? null
    : tenants.find(t => t.id === selectedTenantId) ?? null;

  // Per-client cost based on selection
  const baseClients = (typeof targetClients === 'number' && targetClients > 0)
    ? targetClients
    : activeTenants;

  // Average mode
  const avgR2PerClient      = r2Total      / Math.max(baseClients, 1);
  const avgNeonPerClient    = neonTotal    / Math.max(baseClients, 1);
  const avgRailwayPerClient = railwayTotal / Math.max(baseClients, 1);
  const avgCostPerClient    = infraTotal   / Math.max(baseClients, 1);

  // Client-specific mode
  const clientStorageBytes  = selectedTenant?.usage.totalBytes ?? 0;
  const clientStorageGB     = clientStorageBytes / 1024 ** 3;
  // R2 storage cost pro-rated by this client's share of total storage
  const totalStorageBytes   = tenants.reduce((a, t) => a + t.usage.totalBytes, 0) || 1;
  const clientStorageShare  = clientStorageBytes / totalStorageBytes;
  const clientR2Cost        = r2Total * clientStorageShare;
  const clientNeonCost      = neonTotal    / Math.max(activeTenants, 1);
  const clientRailwayCost   = railwayTotal / Math.max(activeTenants, 1);
  const clientTotalCost     = clientR2Cost + clientNeonCost + clientRailwayCost;

  const costPerClient = selectedTenant ? clientTotalCost : avgCostPerClient;
  const safetyZone    = costPerClient * 2;
  const profitZone    = safetyZone    * 2;

  // ── Chart data ─────────────────────────────────────────────────────────────

  // Cost breakdown bar chart — selected client vs. average
  const chartBreakdown = selectedTenant
    ? [
        {
          name: selectedTenant.nome.length > 16 ? selectedTenant.nome.slice(0, 14) + '…' : selectedTenant.nome,
          'R2 Storage': clientR2Cost,
          'Neon (cota)': clientNeonCost,
          'Railway (cota)': clientRailwayCost,
        },
        {
          name: 'Média',
          'R2 Storage': avgR2PerClient,
          'Neon (cota)': avgNeonPerClient,
          'Railway (cota)': avgRailwayPerClient,
        },
      ]
    : tenants.slice(0, 8).map(t => {
        const share    = t.usage.totalBytes / totalStorageBytes;
        const tR2      = r2Total      * share;
        const tNeon    = neonTotal    / Math.max(activeTenants, 1);
        const tRailway = railwayTotal / Math.max(activeTenants, 1);
        return {
          name: t.nome.length > 14 ? t.nome.slice(0, 12) + '…' : t.nome,
          'R2 Storage': tR2,
          'Neon (cota)': tNeon,
          'Railway (cota)': tRailway,
        };
      });

  // Storage breakdown for selected client
  const storageBreakdown = selectedTenant
    ? [
        { name: 'Cotações',   value: selectedTenant.usage.totalBytesCotacoes,  fill: '#3b82f6' },
        { name: 'Documentos', value: selectedTenant.usage.totalBytesDocumentos, fill: '#8b5cf6' },
        { name: 'Chat',       value: selectedTenant.usage.totalBytesChat,       fill: '#f97316' },
      ].filter(d => d.value > 0)
    : [];

  // Revenue projection
  const revenueRows = [
    baseClients > 1 ? Math.ceil(baseClients / 2) : null,
    baseClients,
    baseClients * 2,
    baseClients * 5,
  ]
    .filter((n): n is number => n !== null && n > 0)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .map(clients => ({ clients }));

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="space-y-10">
          <Skeleton className="h-12 w-72" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="space-y-10">
        <PageHeader
          eyebrow="Infraestrutura vs. receita"
          title="Calculadora de Preço"
          description="Baseado no custo real de infraestrutura — quanto cobrar por cliente."
        />

        {/* Infra summary + controls */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> Custo Infra / mês
              </p>
              <p className="text-2xl font-bold text-emerald-600">{fmtUSD(infraTotal)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">R2 + Neon + Railway</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> Clientes Ativos
              </p>
              <p className="text-2xl font-bold">{activeTenants}</p>
              <p className="text-xs text-muted-foreground mt-0.5">corretoras no sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <ArrowRight className="h-3.5 w-3.5" /> Custo / Cliente
              </p>
              <p className="text-2xl font-bold">{fmtUSD(costPerClient)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedTenant ? `específico: ${selectedTenant.nome}` : `média: ${fmtUSD(infraTotal)} ÷ ${baseClients}`}
              </p>
            </CardContent>
          </Card>

          {/* Simulador N clientes */}
          <Card className="border-dashed">
            <CardContent className="pt-5">
              <Label htmlFor="target" className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                <Info className="h-3.5 w-3.5" /> Simular com N clientes
              </Label>
              <Input
                id="target"
                type="number"
                min={1}
                placeholder={String(activeTenants)}
                value={targetClients}
                onChange={e => setTargetClients(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {typeof targetClients === 'number' && targetClients > 0
                  ? `Usando ${targetClients} clientes`
                  : 'Usando clientes atuais'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Client selector + chart */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Análise por Cliente</CardTitle>
                <CardDescription>
                  {selectedTenant
                    ? `Custo específico de ${selectedTenant.nome} — R2 proporcional ao armazenamento + cota de Neon/Railway`
                    : 'Comparativo de custo estimado por cliente com base no uso de armazenamento'}
                </CardDescription>
              </div>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Selecionar cliente…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__avg__">Todos (comparativo)</SelectItem>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-6 ${selectedTenant && storageBreakdown.length > 0 ? 'lg:grid-cols-2' : ''}`}>

              {/* Cost breakdown bar chart */}
              <div>
                <p className="text-xs text-muted-foreground mb-3 font-medium">
                  {selectedTenant ? 'Custo do cliente vs. média' : 'Custo por cliente (top 8)'}
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartBreakdown} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `$${v.toFixed(4)}`} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip content={<CostTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="R2 Storage"    stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Neon (cota)"   stackId="a" fill="#3b82f6" />
                    <Bar dataKey="Railway (cota)" stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Storage breakdown for selected client */}
              {selectedTenant && (
                <div>
                  <p className="text-xs text-muted-foreground mb-3 font-medium">
                    Armazenamento de {selectedTenant.nome}
                  </p>
                  <div className="space-y-3 mb-4">
                    {[
                      { label: 'Cotações',   bytes: selectedTenant.usage.totalBytesCotacoes,  color: 'bg-blue-500',   icon: HardDrive },
                      { label: 'Documentos', bytes: selectedTenant.usage.totalBytesDocumentos, color: 'bg-purple-500', icon: Database  },
                      { label: 'Chat',       bytes: selectedTenant.usage.totalBytesChat,       color: 'bg-orange-500', icon: Server    },
                    ].map(({ label, bytes, color, icon: Icon }) => {
                      const pct = selectedTenant.usage.totalBytes > 0
                        ? (bytes / selectedTenant.usage.totalBytes) * 100
                        : 0;
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="flex items-center gap-1.5">
                              <Icon className="h-3 w-3 text-muted-foreground" />
                              {label}
                            </span>
                            <span className="text-muted-foreground font-mono">{fmtBytes(bytes)} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total armazenado</span>
                      <span className="font-mono font-semibold">{fmtBytes(selectedTenant.usage.totalBytes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Arquivos</span>
                      <span className="font-mono">{selectedTenant.usage.totalFiles.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Share do armazenamento total</span>
                      <span className="font-mono">{(clientStorageShare * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logic bar */}
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">
            <strong className="text-foreground">Custo real</strong>
            {' → '}
            <strong className="text-amber-600">×2 = zona de segurança</strong>
            {' → '}
            <strong className="text-emerald-600">×2 = lucro</strong>
            {' (×4 do custo base) — '}
            {selectedTenant
              ? `valores específicos para ${selectedTenant.nome}`
              : `média entre ${baseClients} clientes`}
          </span>
        </div>

        {/* Tier cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          <TierCard
            icon={AlertCircle}
            label="Break-even"
            price={costPerClient}
            multiplier="1× custo base"
            color="text-slate-500"
            borderColor="border-slate-200 dark:border-slate-800"
            description="Cobre apenas o custo de infraestrutura. Sem margem para erros, crescimento ou suporte."
          />
          <TierCard
            icon={ShieldCheck}
            label="Zona de Segurança"
            price={safetyZone}
            multiplier="2× custo base"
            color="text-amber-500"
            borderColor="border-amber-200 dark:border-amber-800"
            description="Cobre infra + imprevistos, crescimento de uso e overhead operacional. Mínimo recomendado."
            highlight
          />
          <TierCard
            icon={TrendingUp}
            label="Com Lucro"
            price={profitZone}
            multiplier="4× custo base (2× segurança)"
            color="text-emerald-500"
            borderColor="border-emerald-200 dark:border-emerald-800"
            description="Margem saudável para reinvestir no produto, suporte dedicado e escalar a equipe."
          />
        </div>

        {/* Revenue projection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projeção de Receita</CardTitle>
            <CardDescription>
              Receita mensal em cada tier para diferentes volumes de clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium text-muted-foreground">Clientes</th>
                    <th className="pb-2 text-right font-medium text-slate-500">Break-even</th>
                    <th className="pb-2 text-right font-medium text-amber-600">Segurança</th>
                    <th className="pb-2 text-right font-medium text-emerald-600">Com Lucro</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Margem bruta</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {revenueRows.map(({ clients }) => {
                    const infraAtClients = infraTotal * (clients / Math.max(baseClients, 1));
                    const revBreak  = clients * costPerClient;
                    const revSafety = clients * safetyZone;
                    const revProfit = clients * profitZone;
                    const margin    = revProfit - infraAtClients;
                    const isCurrent = clients === baseClients;

                    return (
                      <tr key={clients} className={isCurrent ? 'bg-muted/40' : ''}>
                        <td className="py-2.5 pr-4">
                          <span className="font-medium">{clients} clientes</span>
                          {isCurrent && <Badge variant="secondary" className="ml-2 text-xs">base</Badge>}
                        </td>
                        <td className="py-2.5 text-right text-slate-500 font-mono">{fmtUSD(revBreak)}</td>
                        <td className="py-2.5 text-right text-amber-600 font-mono">{fmtUSD(revSafety)}</td>
                        <td className="py-2.5 text-right text-emerald-600 font-bold font-mono">{fmtUSD(revProfit)}</td>
                        <td className="py-2.5 text-right text-muted-foreground font-mono">+{fmtUSD(margin)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </AdminGuard>
  );
}
