import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/core/ui/card';
import { cn } from '@/core/utils';
import { AreaChart, Area } from 'recharts';

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  iconBg?: string;
  hint?: string;
  isLoading?: boolean;
  highlighted?: boolean;
  valueColor?: string;
  footer?: ReactNode;
  trend?: {
    delta: number;
    positiveIsGood?: boolean;
    label?: string;
  };
  goal?: {
    current: number;
    target: number;
  };
  // Array de valores para sparkline mini-gráfico (variant 'metric')
  sparkline?: number[];
  variant?: 'card' | 'tile' | 'metric';
  className?: string;
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  icon,
  iconBg,
  hint,
  isLoading,
  highlighted,
  valueColor,
  footer,
  trend,
  goal,
  sparkline,
  variant = 'card',
  className,
  onClick,
}: KpiCardProps) {
  const trendIsPositive = trend ? trend.delta > 0 : false;
  const positiveIsGood = trend?.positiveIsGood ?? true;
  const trendIsGood = trend ? (trendIsPositive ? positiveIsGood : !positiveIsGood) : null;

  // ── Variant: metric (strip cell — sem card próprio, usado dentro de grid com dividers)
  if (variant === 'metric') {
    const sparkData = sparkline?.map((v, i) => ({ i, v }));
    const sparkColor = trendIsGood === true
      ? '#22c55e'
      : trendIsGood === false
        ? '#ef4444'
        : 'var(--color-primary)';

    if (isLoading) {
      return (
        <div className={cn('px-3 py-3 space-y-1.5', className)}>
          <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
          <div className="h-7 w-28 rounded bg-muted animate-pulse" />
          <div className="h-2 w-16 rounded bg-muted animate-pulse" />
        </div>
      );
    }

    const goalPct = goal ? Math.min((goal.current / goal.target) * 100, 100) : null;
    const goalColor =
      goal
        ? goal.current >= goal.target
          ? 'bg-green-500'
          : goal.current >= goal.target * 0.75
            ? 'bg-amber-500'
            : 'bg-red-500'
        : '';

    return (
      <div
        className={cn(
          'relative px-3 pt-2.5 pb-2 space-y-0.5',
          onClick && 'cursor-pointer hover:bg-muted/30 transition-colors',
          className,
        )}
        onClick={onClick}
      >
        {/* Sparkline — canto superior direito */}
        {sparkData && sparkData.length > 1 && (
          <div className="absolute top-2 right-2 opacity-60">
            <AreaChart width={44} height={22} data={sparkData}>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                fill={sparkColor}
                fillOpacity={0.15}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </div>
        )}

        {/* Label */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pr-12">
          {label}
        </p>

        {/* Value */}
        <p className={cn('text-2xl font-bold tabular-num-display leading-tight', valueColor)}>
          {value}
        </p>

        {/* Trend badge */}
        {trend && Math.abs(trend.delta) > 0.05 && (
          <div className="flex items-center gap-1">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                trendIsGood
                  ? 'bg-status-positive text-status-positive'
                  : 'bg-status-negative text-status-negative',
              )}
            >
              {trendIsPositive ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
              {trendIsPositive ? '+' : ''}{trend.delta.toFixed(1)}%
            </span>
            {trend.label && (
              <span className="text-[10px] text-muted-foreground/60">{trend.label}</span>
            )}
          </div>
        )}

        {/* Hint */}
        {hint && <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>}

        {/* Goal bar — linha de 2px na base */}
        {goalPct !== null && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-muted overflow-hidden">
            <div className={cn('h-full transition-all', goalColor)} style={{ width: `${goalPct}%` }} />
          </div>
        )}
      </div>
    );
  }

  // ── Variant: tile (admin dashboard — grande, aspect-ratio)
  if (variant === 'tile') {
    return (
      <div
        className={cn(
          'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-border aspect-[4/3] min-h-[180px]',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {icon ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-primary">
                {icon}
              </span>
            ) : null}
            <span className="truncate">{label}</span>
          </div>
          {trend ? (
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                trendIsGood
                  ? 'bg-[var(--admin-accent-soft)] text-primary'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {trendIsPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trendIsPositive ? '+' : ''}{trend.delta}%
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <p className="font-sora text-3xl font-semibold tracking-tight text-foreground md:text-4xl tabular-num-display">
            {value}
          </p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>

        {footer ? <div className="pt-3">{footer}</div> : null}
      </div>
    );
  }

  // ── Variant: card (padrão — com Card wrapper, ícone, goal bar)
  return (
    <Card
      className={cn(
        'shadow-sm py-0 gap-0',
        highlighted && 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10',
        className,
      )}
    >
      <CardContent className="px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            {label}
          </p>
          {icon && (
            <div className={cn('flex h-6 w-6 items-center justify-center rounded-md', iconBg)}>
              {icon}
            </div>
          )}
        </div>
        {isLoading ? (
          <>
            <div className="h-6 w-24 animate-pulse rounded bg-muted mb-1" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted mt-1" />
          </>
        ) : (
          <>
            <p className={cn('text-xl font-bold leading-tight tabular-num-display', valueColor)}>
              {value}
            </p>
            {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
            {trend && Math.abs(trend.delta) > 0.1 && (
              <div
                className={cn(
                  'flex items-center gap-0.5 mt-0.5 text-[10px] font-medium',
                  trendIsGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                )}
              >
                {trendIsPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {Math.abs(trend.delta).toFixed(1)}%
                <span className="text-muted-foreground/60 ml-0.5">
                  {trend.label ?? 'vs período anterior'}
                </span>
              </div>
            )}
            {goal && (
              <div className="mt-1.5">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      goal.current >= goal.target
                        ? 'bg-green-500'
                        : goal.current >= goal.target * 0.75
                          ? 'bg-amber-500'
                          : 'bg-red-500',
                    )}
                    style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Meta: {goal.target}%</p>
              </div>
            )}
            {footer && !goal && <div className="mt-0.5">{footer}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
