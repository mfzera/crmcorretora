import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/core/utils';

type Props = {
  label: string;
  value: string | number;
  hint: string;
  subhint: string;
  trend?: {
    delta: number;
    label: string;
  };
  isLoading?: boolean;
};

export function DashboardKpiCard({
  label,
  value,
  hint,
  subhint,
  trend,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="px-2.5 py-2 space-y-1.5">
        <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
        <div className="h-6 w-28 rounded bg-muted animate-pulse" />
        <div className="space-y-1">
          <div className="h-2 w-24 rounded bg-muted animate-pulse" />
          <div className="h-2 w-18 rounded bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  const isPositive = !trend || trend.delta >= 0;

  return (
    <div
      className={cn(
        'px-2.5 py-2 space-y-1 relative',
        trend && 'before:absolute before:inset-x-0 before:top-0 before:h-[2px]',
        trend
          ? trend.delta >= 0
            ? 'before:bg-emerald-500'
            : 'before:bg-red-500'
          : '',
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>

      <div>
        <span className="text-lg font-bold tabular-nums tracking-tight leading-none break-all">
          {value}
        </span>
        {trend && isFinite(trend.delta) && (
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className={cn(
                'flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
                isPositive ? 'text-emerald-600' : 'text-red-500',
              )}
            >
              {isPositive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {isPositive && trend.delta > 0 ? '+' : ''}
              {trend.delta.toFixed(1)}%
            </div>
            <span className="text-[10px] text-muted-foreground/60 tabular-nums leading-none">
              {trend.label}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground leading-tight">{hint}</p>
        <p className="text-[10px] text-muted-foreground/70">{subhint}</p>
      </div>
    </div>
  );
}
