import { AlertTriangle, PauseCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/core/utils';

type VendedorCount = {
  vendedorId: string;
  vendedorNome: string | null;
  count: number;
};

type AlertData = {
  total: number;
  porVendedor: VendedorCount[];
};

type Props = {
  renovacoesVencidas: AlertData;
  cotacoesParadas: AlertData;
  isLoading: boolean;
  onVendedorClick?: (vendedorId: string) => void;
  onAlertClick?: (categoria: 'renovacoes_vencidas' | 'cotacoes_paradas', vendedorId?: string, vendedorNome?: string) => void;
};

function VendorPills({
  items,
  categoria,
  onVendedorClick,
  onAlertClick,
}: {
  items: VendedorCount[];
  categoria: 'renovacoes_vencidas' | 'cotacoes_paradas';
  onVendedorClick?: (vendedorId: string) => void;
  onAlertClick?: Props['onAlertClick'];
}) {
  const visible = items.slice(0, 3);
  const remaining = items.length - 3;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visible.map((v) => {
        const nome = v.vendedorNome?.split(' ')[0] ?? 'N/A';
        return (
          <button
            key={v.vendedorId}
            type="button"
            onClick={() => onVendedorClick?.(v.vendedorId)}
            className={cn(
              'text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/60',
              'hover:bg-muted transition-colors cursor-pointer tabular-nums',
            )}
          >
            {nome}: {v.count}
          </button>
        );
      })}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => onAlertClick?.(categoria)}
          className="text-[10px] text-primary hover:underline underline-offset-2 cursor-pointer"
        >
          +{remaining} mais
        </button>
      )}
    </div>
  );
}

export function AlertsCompactStrip({
  renovacoesVencidas,
  cotacoesParadas,
  isLoading,
  onVendedorClick,
  onAlertClick,
}: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-3.5 w-3.5 rounded bg-muted animate-pulse" />
          <div className="h-3.5 w-40 rounded bg-muted animate-pulse" />
          <div className="ml-auto h-3.5 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="border-t flex items-center gap-3 px-4 py-3">
          <div className="h-3.5 w-3.5 rounded bg-muted animate-pulse" />
          <div className="h-3.5 w-36 rounded bg-muted animate-pulse" />
          <div className="ml-auto h-3.5 w-28 rounded bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  const noAlerts = renovacoesVencidas.total === 0 && cotacoesParadas.total === 0;

  if (noAlerts) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
          <span className="text-xs text-muted-foreground">
            Todas as renovações estão em dia. Nenhum alerta no momento.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card divide-y divide-border overflow-hidden">
      {/* Renovações Vencidas */}
      {renovacoesVencidas.total > 0 && (
        <div className={cn(
          'flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3',
          'border-l-2 border-l-amber-500',
        )}>
          <div className="flex items-center gap-2 shrink-0">
            <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
            <button
              type="button"
              onClick={() => onAlertClick?.('renovacoes_vencidas')}
              className="text-xs font-medium hover:underline underline-offset-2 cursor-pointer"
            >
              Renovações Vencidas
            </button>
            <button
              type="button"
              onClick={() => onAlertClick?.('renovacoes_vencidas')}
              className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-status-alert text-status-alert border border-status-alert hover:opacity-80 transition-opacity"
            >
              {renovacoesVencidas.total}
            </button>
          </div>
          <div className="sm:ml-auto pl-5 sm:pl-0">
            <VendorPills
              items={renovacoesVencidas.porVendedor}
              categoria="renovacoes_vencidas"
              onVendedorClick={onVendedorClick}
              onAlertClick={onAlertClick}
            />
          </div>
        </div>
      )}

      {/* Cotações Paradas */}
      {cotacoesParadas.total > 0 && (
        <div className={cn(
          'flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3',
          'border-l-2 border-l-blue-500',
        )}>
          <div className="flex items-center gap-2 shrink-0">
            <PauseCircle className="size-3.5 text-blue-500 shrink-0" />
            <button
              type="button"
              onClick={() => onAlertClick?.('cotacoes_paradas')}
              className="text-xs font-medium hover:underline underline-offset-2 cursor-pointer"
            >
              Cotações Paradas
            </button>
            <button
              type="button"
              onClick={() => onAlertClick?.('cotacoes_paradas')}
              className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:opacity-80 transition-opacity"
            >
              {cotacoesParadas.total}
            </button>
          </div>
          <div className="sm:ml-auto pl-5 sm:pl-0">
            <VendorPills
              items={cotacoesParadas.porVendedor}
              categoria="cotacoes_paradas"
              onVendedorClick={onVendedorClick}
              onAlertClick={onAlertClick}
            />
          </div>
        </div>
      )}
    </div>
  );
}
