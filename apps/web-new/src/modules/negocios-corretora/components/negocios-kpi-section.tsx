import { DollarSign, TrendingUp, FileText, Percent } from 'lucide-react';
import { Skeleton } from '@/core/ui/skeleton';
import { formatCurrencyShort, formatCurrencyBR } from '@/core/utils/format-currency';
import { cn } from '@/core/utils';
import type { useNegociosKpis } from '../hooks/use-negocios-kpis';

interface NegociosKpiSectionProps {
  kpis: ReturnType<typeof useNegociosKpis>;
  isLoading: boolean;
}

interface KpiItemProps {
  label: string;
  value: string;
  subvalue?: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
  isLoading: boolean;
}

function KpiItem({ label, value, subvalue, icon, iconBg, valueColor, isLoading }: KpiItemProps) {
  return (
    <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconBg)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground leading-none mb-1 truncate">
          {label}
        </p>
        {isLoading ? (
          <Skeleton className="h-5 w-20" />
        ) : (
          <>
            <p className={cn('text-lg font-bold leading-tight tabular-nums', valueColor)}>
              {value}
            </p>
            {subvalue && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subvalue}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function NegociosKpiSection({ kpis, isLoading }: NegociosKpiSectionProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      <KpiItem
        label="Prêmio líquido"
        value={formatCurrencyShort(kpis.totalPremioLiquido)}
        subvalue={kpis.totalPremioLiquido >= 1000 ? formatCurrencyBR(kpis.totalPremioLiquido) : undefined}
        icon={<DollarSign className="size-4 text-green-600" />}
        iconBg="bg-green-50 dark:bg-green-950/40"
        valueColor="text-green-700 dark:text-green-400"
        isLoading={isLoading}
      />
      <KpiItem
        label="Comissão corretora"
        value={formatCurrencyShort(kpis.totalValorComissaoCorretora)}
        subvalue={kpis.totalValorComissaoCorretora >= 1000 ? formatCurrencyBR(kpis.totalValorComissaoCorretora) : undefined}
        icon={<TrendingUp className="size-4 text-emerald-600" />}
        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
        valueColor="text-emerald-700 dark:text-emerald-400"
        isLoading={isLoading}
      />
      <KpiItem
        label="Média comissão"
        value={kpis.mediaComissaoFormatada}
        subvalue="Percentual médio"
        icon={<Percent className="size-4 text-indigo-600" />}
        iconBg="bg-indigo-50 dark:bg-indigo-950/40"
        isLoading={isLoading}
      />
      <KpiItem
        label="Negócios"
        value={isLoading ? '—' : String(kpis.totalNegocios)}
        subvalue="Nesta página"
        icon={<FileText className="size-4 text-blue-600" />}
        iconBg="bg-blue-50 dark:bg-blue-950/40"
        isLoading={isLoading}
      />
    </div>
  );
}
