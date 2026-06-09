import { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/core/utils';

interface InsightHighlightProps {
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function InsightHighlight({
  eyebrow = 'Insights',
  children,
  action,
  className,
}: InsightHighlightProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/70 bg-[var(--admin-surface-elevated)] p-6 md:p-8',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(120% 120% at 80% -20%, var(--admin-accent-glow) 0%, transparent 55%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, var(--admin-accent-soft), transparent)',
        }}
      />

      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--admin-accent-soft)] px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            {eyebrow}
          </div>
          <div className="max-w-2xl font-sora text-2xl font-medium leading-tight text-foreground md:text-3xl">
            {children}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
