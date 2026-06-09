
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/core/utils';

type MetricaCardProps = {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icone?: LucideIcon;
  corIcone?: string;
  trend?: {
    valor: number;
    label: string;
  };
  onClick?: () => void;
  isLoading?: boolean;
};

export function MetricaCard({
  titulo,
  valor,
  subtitulo,
  trend,
  onClick,
  isLoading,
}: MetricaCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-3 space-y-2">
        <div className="h-2 w-16 rounded bg-muted animate-pulse" />
        <div className="h-6 w-24 rounded bg-muted animate-pulse" />
        <div className="h-2 w-20 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-3 space-y-2 transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/30',
      )}
      onClick={onClick}
    >
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {titulo}
      </p>
      <p className="text-xl font-bold tabular-nums tracking-tight leading-none">
        {valor}
      </p>
      {subtitulo && (
        <p className="text-[10px] text-muted-foreground/80">{subtitulo}</p>
      )}
      {trend && (
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              trend.valor >= 0 ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            {trend.valor >= 0 ? '+' : ''}
            {trend.valor}%
          </span>
          <span className="text-[10px] text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
