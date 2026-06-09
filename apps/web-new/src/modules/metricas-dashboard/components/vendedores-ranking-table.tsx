import { cn } from '@/core/utils';
import { formatCurrency } from '@/core/utils/format-currency';
import { ArrowRight } from 'lucide-react';

type VendedorItem = {
  vendedorId: string;
  vendedorNome: string | null;
  avatarUrl?: string | null;
  equipeNome?: string | null;
  totalPremio: number | string;
  totalComissao: number | string;
  count: number;
  renovacoesTotal: number;
  renovacoesFechadas: number;
};

type Props = {
  data: VendedorItem[];
  isLoading: boolean;
  onVendedorClick?: (vendedorId: string) => void;
};

export function VendedoresRankingTable({ data, isLoading, onVendedorClick }: Props) {
  const top5 = data.slice(0, 5);
  const maxPremio = top5.length > 0 ? Math.max(...top5.map((v) => Number(v.totalPremio))) : 1;

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card min-h-[220px]">
        <div className="px-3 py-2.5 border-b">
          <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
        </div>
        <div className="divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="h-5 w-5 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse flex-1" />
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (top5.length === 0) {
    return (
      <div className="rounded-lg border bg-card min-h-[220px] flex flex-col items-center justify-center gap-2 text-center px-6">
        <p className="text-sm font-medium text-muted-foreground">Sem dados de vendedores</p>
        <p className="text-xs text-muted-foreground/70">O ranking aparece aqui quando há documentos no período selecionado.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card min-h-[220px] flex flex-col">
      {/* Header */}
      <div className="px-3 py-2.5 border-b">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Top Vendedores
        </h3>
      </div>

      <div className="divide-y divide-border flex-1">
        {top5.map((vendedor, index) => {
          const premio = Number(vendedor.totalPremio);
          const barPct = (premio / maxPremio) * 100;
          const taxaRen =
            vendedor.renovacoesTotal > 0
              ? (vendedor.renovacoesFechadas / vendedor.renovacoesTotal) * 100
              : 0;
          const renColor =
            taxaRen >= 70 ? 'bg-emerald-500' : taxaRen >= 50 ? 'bg-amber-500' : 'bg-red-400';

          return (
            <button
              key={vendedor.vendedorId}
              type="button"
              className={cn(
                'w-full text-left px-3 py-2 transition-colors',
                onVendedorClick
                  ? 'hover:bg-muted/30 cursor-pointer'
                  : 'cursor-default',
              )}
              onClick={() => onVendedorClick?.(vendedor.vendedorId)}
            >
              <div className="flex items-center gap-2">
                {/* Posição */}
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold tabular-nums shrink-0',
                    index === 0 && 'bg-amber-400/20 text-amber-600',
                    index === 1 && 'bg-slate-400/20 text-slate-500',
                    index === 2 && 'bg-orange-500/20 text-orange-600',
                    index >= 3 && 'text-muted-foreground/40',
                  )}
                >
                  {index + 1}
                </span>

                {/* Nome */}
                <span className="text-xs font-medium truncate min-w-0 flex-1">
                  {vendedor.vendedorNome}
                </span>

                {/* Taxa renovação */}
                {vendedor.renovacoesTotal > 0 && (
                  <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                    {taxaRen.toFixed(0)}% ren.
                  </span>
                )}

                {/* Prêmio */}
                <span className="text-xs tabular-nums font-semibold shrink-0 w-20 text-right">
                  {formatCurrency(premio)}
                </span>

                {/* Seta drill-down */}
                {onVendedorClick && (
                  <ArrowRight className="size-3 text-muted-foreground/40 shrink-0" />
                )}
              </div>

              {/* Barras: prêmio + renovação sobrepostas */}
              <div className="mt-1 ml-7 flex gap-1">
                <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all duration-500"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                {vendedor.renovacoesTotal > 0 && (
                  <div className="w-10 h-1 rounded-full bg-muted/50 overflow-hidden shrink-0">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', renColor)}
                      style={{ width: `${Math.min(taxaRen, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
