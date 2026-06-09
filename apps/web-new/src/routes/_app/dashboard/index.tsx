import { createFileRoute } from '@tanstack/react-router';

import {
  Users,
  RefreshCw,
  FileText,
  FileCheck,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckSquare,
  Plus,
  Check,
  Trash2,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardQueryOptions } from '@/modules/dashboard/http';
import {
  createTarefa,
  concluirTarefa,
  deleteTarefa,
} from '@/modules/tarefas/http';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { EmptyState } from '@/core/components/shared';
import { MinhaJornadaWidget } from '@/modules/gamificacao/components/MinhaJornadaWidget';
import { useState, startTransition, lazy, Suspense } from 'react';
import { cn } from '@/core/utils';
import { Skeleton } from '@/core/ui/skeleton';

const RenovacoesConvertidosChart = lazy(() =>
  import('@/modules/dashboard/components/renovacoes-convertidos-chart').then((m) => ({
    default: m.RenovacoesConvertidosChart,
  })),
);

export const Route = createFileRoute('/_app/dashboard/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(dashboardQueryOptions()).catch(() => {}),
  component: DashboardPage,
});


function DashboardPage() {
  return (
    <PageGuard permission="dashboard:visualizar">
      <DashboardPageContent />
    </PageGuard>
  );
}

function DashboardPageContent() {
  const queryClient = useQueryClient();
  const [novaTarefa, setNovaTarefa] = useState('');

  const { data, isLoading } = useQuery(dashboardQueryOptions());

  const criarMutation = useMutation({
    mutationFn: (titulo: string) => createTarefa({ titulo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setNovaTarefa('');
    },
  });

  const concluirMutation = useMutation({
    mutationFn: ({ id, concluida }: { id: string; concluida: boolean }) =>
      concluirTarefa(id, concluida),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  });

  const deletarMutation = useMutation({
    mutationFn: (id: string) => deleteTarefa(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  });

  const handleAdicionarTarefa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaTarefa.trim()) return;
    criarMutation.mutate(novaTarefa.trim());
  };

  const stats = data?.stats || {
    clientesAtivos: 0,
    renovacoesPendentes: 0,
    cotacoesAbertas: 0,
    prospeccoesEmCadastro: 0,
    premioLiquidoMes: 0,
    comissaoMes: 0,
    mediaComissaoPercent: 0,
  };

  const statCards = [
    {
      label: 'Clientes Ativos',
      value: stats.clientesAtivos,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
    },
    {
      label: 'Renovações Pendentes',
      value: stats.renovacoesPendentes,
      icon: RefreshCw,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-950',
    },
    {
      label: 'Cotações Abertas',
      value: stats.cotacoesAbertas,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
    },
    {
      label: 'Prospecções em Cadastro',
      value: stats.prospeccoesEmCadastro,
      icon: FileCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-950',
    },
  ];

  const alertasFollowUp = data?.alertasFollowUp || [];
  const tarefasPendentes = data?.tarefasPendentes || [];

  return (
    <div className="space-y-5 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Suas estatísticas e atividades
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-lg" />
          ))
        ) : statCards.map((stat) => (
          <Card
            key={stat.label}
            className="overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 border-border/50 py-0 gap-0"
          >
            <CardContent className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </span>
                  <span className="text-2xl font-bold tracking-tight">
                    {stat.value}
                  </span>
                </div>
                <div
                  className={`rounded-lg p-2 ${stat.bgColor} ring-1 ring-black/5`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {isLoading ? (
          <>
            <Skeleton className="h-[72px] rounded-lg" />
            <Skeleton className="h-[72px] rounded-lg" />
          </>
        ) : (
        <><Card className="border-border/50 py-0 gap-0">
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Prêmio Líquido do Mês
                </p>
                <p className="text-2xl font-bold mt-0.5">
                  {stats.premioLiquidoMes.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 py-0 gap-0">
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Comissão do Mês
                </p>
                <p className="text-2xl font-bold mt-0.5">
                  {stats.comissaoMes.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Média de{' '}
                  <span className="font-semibold text-emerald-600">
                    {stats.mediaComissaoPercent.toFixed(1)}%
                  </span>{' '}
                  sobre o prêmio
                </p>
              </div>
            </div>
          </CardContent>
        </Card></>
        )}
      </div>

      {/* Widget de Gamificação */}
      <MinhaJornadaWidget />

      {/* Gráfico Renovações x Convertidos */}
      <Suspense fallback={<Skeleton className="h-[300px] rounded-lg" />}>
        <RenovacoesConvertidosChart />
      </Suspense>

      {/* Alertas de Follow-up + Tarefas */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Alertas de follow-up */}
        <Card className="border-border/50 min-h-[160px] sm:min-h-[320px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Alertas de Follow-up
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Cotações sem movimento há mais de 5 dias
            </p>
          </CardHeader>
          <CardContent className="min-h-[120px] sm:min-h-[240px]">
            {isLoading ? (
              <DashboardListSkeleton items={4} />
            ) : alertasFollowUp.length === 0 ? (
              <EmptyState icon={AlertCircle} description="Nenhum alerta de follow-up" />
            ) : (
              <div className="space-y-3">
                {alertasFollowUp.map((alerta) => (
                  <div
                    key={alerta.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {alerta.clienteNome}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {alerta.numeroCotacao} · {alerta.produto}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        {alerta.diasSemMovimento}d parado
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tarefas / Lembretes */}
        <Card className="border-border/50 min-h-[160px] sm:min-h-[320px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckSquare className="h-5 w-5 text-primary" />
              Tarefas e Lembretes
              {tarefasPendentes.length > 0 && (
                <span className="ml-auto text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {tarefasPendentes.length} pendente
                  {tarefasPendentes.length !== 1 ? 's' : ''}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 min-h-[120px] sm:min-h-[240px]">
            {/* Input para nova tarefa */}
            <form onSubmit={handleAdicionarTarefa} className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Adicionar lembrete..."
                value={novaTarefa}
                onChange={(e) => setNovaTarefa(e.target.value)}
                className="text-sm"
                disabled={criarMutation.isPending}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!novaTarefa.trim() || criarMutation.isPending}
                className="shrink-0 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 sm:mr-0 mr-1.5" />
                <span className="sm:hidden">Adicionar</span>
              </Button>
            </form>

            {/* Lista de tarefas */}
            {isLoading ? (
              <DashboardTaskSkeleton items={4} />
            ) : tarefasPendentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="rounded-full bg-muted p-4 mb-3">
                  <CheckSquare className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nenhuma tarefa pendente
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tarefasPendentes.map((tarefa) => {
                  const vencida =
                    tarefa.dataVencimento &&
                    new Date(tarefa.dataVencimento) < new Date();
                  return (
                    <div
                      key={tarefa.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors group"
                    >
                      <button
                        onClick={() =>
                          startTransition(() =>
                            concluirMutation.mutate({
                              id: tarefa.id,
                              concluida: true,
                            })
                          )
                        }
                        disabled={concluirMutation.isPending}
                        className="shrink-0 h-5 w-5 rounded border-2 border-muted-foreground/40 hover:border-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
                      >
                        <Check className="h-3 w-3 opacity-0 group-hover:opacity-50 text-primary" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{tarefa.titulo}</p>
                        {tarefa.dataVencimento && (
                          <p
                            className={cn(
                              'text-xs flex items-center gap-1 mt-0.5',
                              vencida
                                ? 'text-destructive'
                                : 'text-muted-foreground',
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            {new Date(tarefa.dataVencimento).toLocaleDateString(
                              'pt-BR',
                            )}
                          </p>
                        )}
                      </div>
                      <PrioridadeBadge prioridade={tarefa.prioridade} />
                      <button
                        onClick={() => startTransition(() => deletarMutation.mutate(tarefa.id))}
                        disabled={deletarMutation.isPending}
                        aria-label="Excluir tarefa"
                        className="shrink-0 h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center rounded-md opacity-40 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Renewals */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Renewals */}
        <Card className="border-border/50 min-h-[160px] sm:min-h-[280px]">
          <CardHeader>
            <CardTitle className="text-lg">Renovações Urgentes</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[100px] sm:min-h-[200px]">
            {isLoading ? (
              <DashboardListSkeleton items={3} />
            ) : !data?.renovacoesUrgentes ||
            data.renovacoesUrgentes.length === 0 ? (
              <EmptyState icon={RefreshCw} description="Nenhuma renovação urgente" />
            ) : (
              <div className="space-y-3">
                {data.renovacoesUrgentes.map((renovacao) => (
                  <div
                    key={renovacao.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{renovacao.clienteNome}</p>
                      <p className="text-sm text-muted-foreground">
                        {renovacao.produto}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-destructive">
                        {renovacao.diasRestantes} dias
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {renovacao.premioAnterior.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="border-border/50 min-h-[160px] sm:min-h-[280px]">
          <CardHeader>
            <CardTitle className="text-lg">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[100px] sm:min-h-[200px]">
            {isLoading ? (
              <DashboardActivitySkeleton items={3} />
            ) : !data?.atividadesRecentes ||
            data.atividadesRecentes.length === 0 ? (
              <EmptyState icon={TrendingUp} description="Nenhuma atividade recente" />
            ) : (
              <div className="space-y-3">
                {data.atividadesRecentes.map((atividade) => (
                  <div
                    key={atividade.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm">{atividade.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(atividade.data).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PrioridadeBadge({ prioridade }: { prioridade: string }) {
  if (prioridade === 'baixa') return null;
  return (
    <span
      className={cn(
        'shrink-0 text-xs px-1.5 py-0.5 rounded font-medium',
        prioridade === 'alta'
          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
      )}
    >
      {prioridade === 'alta' ? 'Alta' : 'Média'}
    </span>
  );
}

function DashboardListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-lg border border-border/50 p-3"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32 max-w-full" />
            <Skeleton className="h-3 w-40 max-w-full" />
          </div>
          <div className="ml-3 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardTaskSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-2 rounded-lg border border-border/50 p-2"
        >
          <Skeleton className="h-5 w-5 shrink-0 rounded" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-12 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function DashboardActivitySkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex items-start gap-3 rounded-lg border border-border/50 p-3"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
