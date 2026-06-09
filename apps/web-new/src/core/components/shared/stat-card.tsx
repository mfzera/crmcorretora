
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/core/ui/card';
import { cn } from '@/core/utils';

type StatCardColor = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'cyan' | 'yellow' | 'default';

const COLOR_ICON: Record<StatCardColor, string> = {
  blue: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  green: 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400',
  orange: 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400',
  purple: 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
  red: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400',
  cyan: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400',
  yellow: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400',
  default: 'bg-primary/10 text-primary',
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: StatCardColor;
  isLoading?: boolean;
  trend?: {
    value: number;
    positiveIsGood?: boolean;
    label?: string;
  };
  goal?: {
    value: number;
    target: number;
    label?: string;
  };
  footer?: React.ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color = 'default',
  isLoading,
  trend,
  goal,
  footer,
  className,
}: StatCardProps) {
  const trendIsPositive = trend && trend.value > 0;
  const trendIsGood = trend
    ? trendIsPositive
      ? (trend.positiveIsGood ?? true)
      : !(trend.positiveIsGood ?? true)
    : null;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 border-border/50',
        className,
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
            {isLoading ? (
              <>
                <div className="h-9 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </>
            ) : (
              <>
                <span className="text-4xl font-bold tracking-tight break-all">{value}</span>
                {trend && Math.abs(trend.value) > 0.1 && (
                  <div
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium',
                      trendIsGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {trendIsPositive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                    {trendIsPositive ? '+' : ''}
                    {trend.value.toFixed(1)}%{trend.label ? ` ${trend.label}` : ''}
                  </div>
                )}
                {goal && (
                  <div className="mt-1">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          goal.value >= goal.target
                            ? 'bg-green-500'
                            : goal.value >= goal.target * 0.75
                              ? 'bg-amber-500'
                              : 'bg-red-500',
                        )}
                        style={{ width: `${Math.min((goal.value / goal.target) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Meta: {goal.label ?? `${goal.target}%`}
                    </p>
                  </div>
                )}
                {footer && <div className="mt-1">{footer}</div>}
              </>
            )}
          </div>
          <div className={cn('rounded-xl p-3 ring-1 ring-black/5 shrink-0 ml-4', COLOR_ICON[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type { StatCardColor, StatCardProps };
