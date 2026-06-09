
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import {
  DollarSign,
  Target,
  TrendingUp,
  Users,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { useEstatisticasCRM } from '../http';
import { useAuthStore } from '@/infra/auth/auth-store';
import { Skeleton } from '@/core/ui/skeleton';
import { StatCard } from '@/core/components/shared';

export function EstatisticasCRM() {
  const { user } = useAuthStore();
  const { data: stats, isLoading } = useEstatisticasCRM({ enabled: !!(user?.isAdmin || user?.isGestor) });

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-9 w-32" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-44" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="space-y-1">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Oportunidades"
          value={stats.geral.totalOportunidades || 0}
          icon={Target}
          color="blue"
        />
        <StatCard
          title="Em Negociação"
          value={(stats.geral.totalContatoInicial || 0) + (stats.geral.totalNegociacao || 0)}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Valor Ganho"
          value={(stats.geral.valorTotalGanho || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${(stats.geral.taxaConversao || 0).toFixed(1)}%`}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
        {/* Distribuição por Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5" />
              Distribuição por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.prioridade.map((item) => {
                const total = stats.prioridade.reduce(
                  (acc, curr) => acc + curr.count,
                  0,
                );
                const percentage = total > 0 ? (item.count / total) * 100 : 0;

                return (
                  <div key={item.prioridade} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{item.prioridade}</span>
                      <span className="font-medium">
                        {item.count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full ${
                          item.prioridade === 'alta'
                            ? 'bg-red-500'
                            : item.prioridade === 'media'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por Temperatura */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-5 w-5" />
              Distribuição por Temperatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.temperatura.map((item) => {
                const total = stats.temperatura.reduce(
                  (acc, curr) => acc + curr.count,
                  0,
                );
                const percentage = total > 0 ? (item.count / total) * 100 : 0;

                return (
                  <div key={item.temperatura} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{item.temperatura}</span>
                      <span className="font-medium">
                        {item.count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full ${
                          item.temperatura === 'quente'
                            ? 'bg-red-500'
                            : item.temperatura === 'morno'
                              ? 'bg-orange-500'
                              : 'bg-blue-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
