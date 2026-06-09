import { cn } from '@/core/utils';
import { formatCurrencyShort } from '@/core/utils/format-currency';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

const KANBAN_STATUS_LABEL: Record<string, string> = {
  lead: 'Lead',
  contato_inicial: 'Contato',
  negociacao: 'Negociação',
  ganha: 'Ganha',
  perdida: 'Perdida',
  arquivada: 'Arquivada',
};

const STATUS_STYLE: Record<string, { bar: string; text: string; dot: string }> = {
  ganha: { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  perdida: { bar: 'bg-red-400', text: 'text-red-500', dot: 'bg-red-400' },
  arquivada: { bar: 'bg-muted-foreground/30', text: 'text-muted-foreground/60', dot: 'bg-muted-foreground/30' },
};

const TEMP_STYLE: Record<string, string> = {
  quente: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
  morno: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
  frio: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
};

type StatusItem = { status: string; count: number; premioEstimado: number };
type TemperaturaItem = { temperatura: string; count: number };

type Props = {
  porStatus: StatusItem[];
  porTemperatura: TemperaturaItem[];
  isLoading: boolean;
};

const CLOSED = new Set(['ganha', 'perdida', 'arquivada']);

export function PipelineHealthStrip({ porStatus, porTemperatura, isLoading }: Props) {
  const ativos = porStatus.filter((s) => !CLOSED.has(s.status));
  const totalAtivos = ativos.reduce((a, s) => a + s.count, 0);
  const totalValor = ativos.reduce((a, s) => a + Number(s.premioEstimado), 0);
  const maxCount = Math.max(...porStatus.map((s) => s.count), 1);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card min-h-[220px]">
        <div className="px-3 py-2.5 border-b flex items-center justify-between">
          <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
          <div className="h-3.5 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="p-3 space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-2 flex-1 rounded bg-muted animate-pulse" />
              <div className="h-3 w-10 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (porStatus.length === 0) {
    return (
      <div className="rounded-lg border bg-card min-h-[220px] flex flex-col items-center justify-center gap-2 text-center px-6">
        <p className="text-sm font-medium text-muted-foreground">Nenhuma negociação ativa</p>
        <p className="text-xs text-muted-foreground/70">O pipeline aparece aqui quando há negócios em andamento.</p>
        <Link to="/dashboard/kanban" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Ir para o Pipeline <ArrowRight className="size-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card min-h-[220px] flex flex-col">
      {/* Header com headline */}
      <div className="px-3 py-2.5 border-b flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Funil Ativo
        </h3>
        <span className="text-xs font-semibold tabular-nums text-foreground shrink-0">
          {totalAtivos} negócio{totalAtivos !== 1 ? 's' : ''} · {formatCurrencyShort(totalValor)}
        </span>
      </div>

      {/* Barras por status */}
      <div className="p-3 space-y-2 flex-1">
        {porStatus.map((item) => {
          const pct = (item.count / maxCount) * 100;
          const style = STATUS_STYLE[item.status];
          const barColor = style?.bar ?? 'bg-primary/70';
          const textColor = style?.text ?? 'text-foreground';

          return (
            <div key={item.status} className="flex items-center gap-2">
              <span className={cn('text-[11px] w-20 shrink-0 truncate font-medium', textColor)}>
                {KANBAN_STATUS_LABEL[item.status] ?? item.status}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] tabular-nums font-semibold w-5 text-right text-foreground">
                {item.count}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground w-14 text-right">
                {formatCurrencyShort(Number(item.premioEstimado))}
              </span>
            </div>
          );
        })}
      </div>

      {/* Temperatura + chip "em risco" */}
      <div className="px-3 py-2 border-t flex items-center gap-2 flex-wrap">
        {porTemperatura.map((t) => {
          const key = t.temperatura.toLowerCase();
          return (
            <span
              key={t.temperatura}
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border',
                TEMP_STYLE[key] ?? 'bg-muted text-muted-foreground border-border',
              )}
            >
              {t.temperatura}: {t.count}
            </span>
          );
        })}
        {/* "Valor em risco" — negócios frios com valor estimado */}
        {(() => {
          const frio = porTemperatura.find((t) => t.temperatura.toLowerCase() === 'frio');
          const emRisco = porStatus
            .filter((s) => !CLOSED.has(s.status))
            .reduce((a, s) => a + Number(s.premioEstimado), 0);
          if (!frio || frio.count === 0 || emRisco === 0) return null;
          return (
            <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-700 border-amber-200 dark:border-amber-800 dark:text-amber-400">
              {formatCurrencyShort(emRisco)} em aberto
            </span>
          );
        })()}
      </div>
    </div>
  );
}
