
import { Building2, Clock, Flame, Package, TrendingUp } from 'lucide-react';
import { cn } from '@/core/utils';
import { TEMPERATURA_LABELS, type OportunidadeTemperatura } from '@/types/kanban';

const TEMPERATURA_BORDER: Record<OportunidadeTemperatura, string> = {
  quente: 'border-l-red-500',
  morno: 'border-l-orange-500',
  frio: 'border-l-blue-500',
};

function getTemperaturaChip(temperatura: OportunidadeTemperatura) {
  switch (temperatura) {
    case 'quente': return { bg: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: <Flame className="h-3 w-3" /> };
    case 'morno': return { bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', icon: <TrendingUp className="h-3 w-3" /> };
    case 'frio': return { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: <Clock className="h-3 w-3" /> };
  }
}

export interface CardPreviewData {
  nomeCliente?: string;
  seguradora?: string;
  produto?: string;
  premioEstimado?: string;
  temperatura?: OportunidadeTemperatura;
  dataVencimento?: string;
}

export function KanbanCardPreview({ data }: { data: CardPreviewData }) {
  const temperatura = data.temperatura ?? 'morno';
  const chip = getTemperaturaChip(temperatura);

  if (!data.nomeCliente) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-3 py-8 text-center">
        <p className="text-xs text-muted-foreground">Preencha os dados para ver a prévia</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-l-4 bg-card p-3 shadow-sm space-y-1.5', TEMPERATURA_BORDER[temperatura])}>
      <p className="text-sm font-semibold leading-tight">{data.nomeCliente}</p>

      {data.seguradora && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{data.seguradora}</span>
        </div>
      )}

      {data.produto && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="h-3 w-3 shrink-0" />
          <span className="truncate">{data.produto}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', chip.bg)}>
          {chip.icon}
          {TEMPERATURA_LABELS[temperatura]}
        </span>
        {data.premioEstimado && parseFloat(data.premioEstimado) > 0 && (
          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:text-green-400">
            R$ {parseFloat(data.premioEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {data.dataVencimento && (
        <div className="border-t border-border/50 pt-1">
          <span className="text-[11px] text-muted-foreground">
            Vence {new Date(data.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
          </span>
        </div>
      )}
    </div>
  );
}
