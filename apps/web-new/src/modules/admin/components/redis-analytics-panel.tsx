
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Skeleton } from '@/core/ui/skeleton';
import { Badge } from '@/core/ui/badge';
import { adminApi, type RedisQueueStats } from '@/infra/http/admin-api';
import {
  Database,
  AlertCircle,
  Server,
  MemoryStick,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Inbox,
  Zap,
  HardDrive,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function hitRate(hits: number, misses: number): string {
  const total = hits + misses;
  if (total === 0) return 'N/A';
  return `${((hits / total) * 100).toFixed(1)}%`;
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'bg-slate-500',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <div className={`rounded-md p-2 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Queue row ────────────────────────────────────────────────────────────────

const QUEUE_LABELS: Record<string, string> = {
  'renewals-detection':     'Detecção de Renovações',
  'urgent-notifications':   'Notificações Urgentes',
};

function QueueRow({ queue }: { queue: RedisQueueStats }) {
  const total = queue.waiting + queue.active + queue.completed + queue.failed + queue.delayed;
  const label = QUEUE_LABELS[queue.name] ?? queue.name;

  return (
    <div className="rounded-lg border px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <span className="text-xs text-muted-foreground font-mono">{queue.name}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {queue.waiting > 0 && (
          <Badge variant="outline" className="gap-1 text-xs text-yellow-600 border-yellow-400">
            <Inbox className="h-3 w-3" /> {queue.waiting} aguardando
          </Badge>
        )}
        {queue.active > 0 && (
          <Badge variant="outline" className="gap-1 text-xs text-blue-600 border-blue-400">
            <Zap className="h-3 w-3" /> {queue.active} ativos
          </Badge>
        )}
        {queue.delayed > 0 && (
          <Badge variant="outline" className="gap-1 text-xs text-orange-600 border-orange-400">
            <Clock className="h-3 w-3" /> {queue.delayed} agendados
          </Badge>
        )}
        <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-400">
          <CheckCircle2 className="h-3 w-3" /> {fmtNum(queue.completed)} concluídos
        </Badge>
        {queue.failed > 0 && (
          <Badge variant="outline" className="gap-1 text-xs text-red-600 border-red-400">
            <XCircle className="h-3 w-3" /> {queue.failed} falhos
          </Badge>
        )}
        {queue.waiting === 0 && queue.active === 0 && queue.delayed === 0 && queue.failed === 0 && (
          <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" /> Idle
          </Badge>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RedisAnalyticsPanel() {
  const { data: infoData, isLoading: loadingInfo } = useQuery({
    queryKey: ['admin', 'redis', 'info'],
    queryFn: () => adminApi.getRedisInfo(),
    refetchInterval: 30_000, // atualiza a cada 30s
  });

  const { data: queuesData, isLoading: loadingQueues } = useQuery({
    queryKey: ['admin', 'redis', 'queues'],
    queryFn: () => adminApi.getRedisQueues(),
    refetchInterval: 15_000, // atualiza a cada 15s
  });

  const loading = loadingInfo || loadingQueues;
  const info    = infoData;
  const queues  = queuesData?.queues ?? [];

  const memPercent = info && info.memory.maxmemoryBytes > 0
    ? ((info.memory.usedBytes / info.memory.maxmemoryBytes) * 100).toFixed(1)
    : null;

  const cacheHitRate = info
    ? hitRate(info.stats.keyspaceHits, info.stats.keyspaceMisses)
    : 'N/A';

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Redis Analytics
          {info?.server && (
            <span className="text-base font-normal text-muted-foreground">
              — v{info.server.version}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Métricas de memória, clientes, keyspace e filas BullMQ
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Server info strip */}
        {loading ? (
          <div className="flex gap-3 flex-wrap">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-6 w-32" />)}
          </div>
        ) : info?.server ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Server className="h-3 w-3" />
              {info.server.mode} · {info.server.role}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              Uptime: {fmtUptime(info.server.uptimeSeconds)}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3" />
              {info.stats.instantaneousOpsPerSec} ops/s
            </Badge>
            <Badge variant="secondary" className="gap-1 font-mono text-xs">
              {info.totalKeys} keys no keyspace
            </Badge>
          </div>
        ) : null}

        {/* Metric cards */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Recursos</p>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : info ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={MemoryStick}
                label="Memória usada"
                value={info.memory.usedHuman}
                sub={
                  memPercent
                    ? `${memPercent}% de ${info.memory.maxmemoryHuman}`
                    : `pico: ${info.memory.peakHuman}`
                }
                color="bg-violet-500"
              />
              <MetricCard
                icon={Users}
                label="Clientes conectados"
                value={String(info.clients.connected)}
                sub={info.clients.blocked > 0 ? `${info.clients.blocked} bloqueados` : 'Nenhum bloqueado'}
                color="bg-blue-500"
              />
              <MetricCard
                icon={Activity}
                label="Cache hit rate"
                value={cacheHitRate}
                sub={`${fmtNum(info.stats.keyspaceHits)} hits · ${fmtNum(info.stats.keyspaceMisses)} misses`}
                color="bg-emerald-500"
              />
              <MetricCard
                icon={HardDrive}
                label="Comandos processados"
                value={fmtNum(info.stats.totalCommandsProcessed)}
                sub={`${fmtNum(info.stats.expiredKeys)} expiradas · ${fmtNum(info.stats.evictedKeys)} evictadas`}
                color="bg-orange-500"
              />
            </div>
          ) : null}
        </div>

        {/* Memory detail */}
        {!loading && info && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Detalhes de memória</p>
              {info.memory.fragRatio > 1.5 && (
                <Badge variant="destructive" className="text-xs ml-auto">
                  Fragmentação alta ({info.memory.fragRatio.toFixed(2)}x)
                </Badge>
              )}
            </div>
            {[
              { label: 'Usada',         value: info.memory.usedHuman    },
              { label: 'RSS (SO)',       value: info.memory.rssHuman     },
              { label: 'Pico histórico', value: info.memory.peakHuman   },
              { label: 'Lua scripts',   value: fmtBytes(info.memory.luaBytes) },
              { label: 'Fragmentação',  value: `${info.memory.fragRatio.toFixed(2)}x` },
              { label: 'Política',      value: info.memory.maxmemoryPolicy },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium font-mono">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Network I/O */}
        {!loading && info && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Rede e conexões</p>
            </div>
            {[
              { label: 'Total conexões recebidas', value: fmtNum(info.stats.totalConnectionsReceived) },
              { label: 'Conexões rejeitadas',      value: fmtNum(info.stats.rejectedConnections)      },
              { label: 'Net Input total',           value: fmtBytes(info.stats.netInputBytes)          },
              { label: 'Net Output total',          value: fmtBytes(info.stats.netOutputBytes)         },
              { label: 'Keys expiradas',            value: fmtNum(info.stats.expiredKeys)              },
              { label: 'Keys evictadas',            value: fmtNum(info.stats.evictedKeys)              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium font-mono">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* BullMQ Queues */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Filas BullMQ
          </p>
          {loadingQueues ? (
            <div className="space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : queues.length > 0 ? (
            <div className="space-y-2">
              {queues.map((q) => (
                <QueueRow key={q.name} queue={q} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma queue encontrada.
            </p>
          )}
        </div>

        {/* Error state */}
        {!loading && !info?.server && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">Não foi possível conectar ao Redis.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
