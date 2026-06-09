
import { DollarSign, AlertCircle, Snowflake, CheckCircle2 } from 'lucide-react';
import { useKanbanKPIs } from '@/modules/kpis/http';
import { Skeleton } from '@/core/ui/skeleton';
import { cn } from '@/core/utils';

export function KPIsCards() {
  const { data: kpis, isLoading } = useKanbanKPIs();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const urgenciaOk = kpis.clientesUrgencia.count === 0;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {/* Prêmio Médio Estimado */}
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Prêmio Médio Estimado</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-base font-bold tabular-nums leading-tight">
              {formatCurrency(kpis.premioMedio.valor)}
            </span>
            <span className="text-xs text-muted-foreground">
              {kpis.premioMedio.count} em aberto · total {formatCurrency(kpis.premioMedio.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Clientes em Urgência */}
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          urgenciaOk ? 'bg-green-500/10' : 'bg-destructive/10',
        )}>
          {urgenciaOk
            ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            : <AlertCircle className="h-4 w-4 text-destructive" />
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Clientes em Urgência</p>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              'text-base font-bold tabular-nums leading-tight',
              urgenciaOk ? 'text-green-600 dark:text-green-400' : 'text-destructive',
            )}>
              {kpis.clientesUrgencia.count}
            </span>
            <span className="text-xs text-muted-foreground">
              de {kpis.clientesUrgencia.total} ativas
              {' · '}{urgenciaOk ? 'tudo em dia' : 'atenção imediata'}
            </span>
          </div>
        </div>
      </div>

      {/* Leads Frios */}
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
          <Snowflake className="h-4 w-4 text-blue-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Leads Frios</p>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              'text-base font-bold tabular-nums leading-tight',
              kpis.leadsFrios.count > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground',
            )}>
              {kpis.leadsFrios.count}
            </span>
            <span className="text-xs text-muted-foreground">
              de {kpis.leadsFrios.total} ativas · reengajar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
