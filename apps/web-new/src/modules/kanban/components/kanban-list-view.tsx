
import { Flame, Clock, TrendingUp, CheckCircle2, XCircle, RotateCcw, Edit, MoreHorizontal, History, Share2, Trash2 } from 'lucide-react';
import { cn } from '@/core/utils';
import type { Oportunidade, OportunidadeTemperatura } from '@/types/kanban';
import { TEMPERATURA_LABELS, KANBAN_COLUMNS } from '@/types/kanban';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';

const TEMPERATURA_ICON: Record<OportunidadeTemperatura, React.ReactNode> = {
  quente: <Flame className="h-3.5 w-3.5 text-red-500" />,
  morno: <TrendingUp className="h-3.5 w-3.5 text-amber-500" />,
  frio: <Clock className="h-3.5 w-3.5 text-sky-500" />,
};

const STATUS_LABELS = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, c.title]));

function getVencimentoText(dataVencimento: string | null | undefined) {
  if (!dataVencimento) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataVencimento);
  venc.setHours(0, 0, 0, 0);
  const diff = Math.round((venc.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return { label: 'Vencida', cls: 'text-red-500' };
  if (diff === 0) return { label: 'Hoje', cls: 'text-red-500' };
  if (diff <= 2) return { label: `${diff}d`, cls: 'text-red-500' };
  if (diff <= 7) return { label: `${diff}d`, cls: 'text-yellow-600 dark:text-yellow-400' };
  return { label: `${diff}d`, cls: 'text-muted-foreground' };
}

interface KanbanListViewProps {
  oportunidades: Oportunidade[];
  onEdit?: (o: Oportunidade) => void;
  onDelete?: (o: Oportunidade) => void;
  onPerder?: (o: Oportunidade) => void;
  onFechar?: (o: Oportunidade) => void;
  onShare?: (o: Oportunidade) => void;
  onHistorico?: (o: Oportunidade) => void;
  onReativar?: (id: string) => void;
}

export function KanbanListView({
  oportunidades,
  onEdit,
  onDelete,
  onPerder,
  onFechar,
  onShare,
  onHistorico,
  onReativar,
}: KanbanListViewProps) {
  if (oportunidades.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground px-4">
        Nenhuma oportunidade encontrada
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 pb-4 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm border-collapse">
        <thead>
          <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
            <th className="text-left py-2 px-3 font-medium">Cliente</th>
            <th className="text-left py-2 px-3 font-medium">Status</th>
            <th className="text-left py-2 px-3 font-medium">Temp.</th>
            <th className="text-right py-2 px-3 font-medium">Valor</th>
            <th className="text-left py-2 px-3 font-medium hidden md:table-cell">Produto</th>
            <th className="text-left py-2 px-3 font-medium hidden lg:table-cell">Vendedor</th>
            <th className="text-right py-2 px-3 font-medium">Vence</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {oportunidades.map((o) => {
            const valor = o.valorFechado ?? o.premioEstimado;
            const venc = getVencimentoText(o.dataVencimento);
            const isClosed = o.status === 'ganha' || o.status === 'perdida';
            return (
              <tr
                key={o.id}
                className="border-b hover:bg-muted/40 cursor-pointer transition-colors"
                onClick={() => onEdit?.(o)}
              >
                <td className="py-2.5 px-3">
                  <div className="font-medium truncate max-w-[180px]">{o.nomeCliente}</div>
                </td>
                <td className="py-2.5 px-3">
                  <Badge variant="outline" className="text-[11px] h-5 font-normal">
                    {STATUS_LABELS[o.status] ?? o.status}
                  </Badge>
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    {TEMPERATURA_ICON[o.temperatura]}
                    {TEMPERATURA_LABELS[o.temperatura]}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">
                  {valor ? (
                    <span className="text-green-700 dark:text-green-400 font-medium">
                      R$ {parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3 hidden md:table-cell">
                  <span className="truncate max-w-[140px] block text-muted-foreground">
                    {o.produto?.nomeProduto ?? '—'}
                  </span>
                </td>
                <td className="py-2.5 px-3 hidden lg:table-cell">
                  <span className="truncate max-w-[120px] block text-muted-foreground">
                    {o.vendedor?.nome ?? '—'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  {venc ? (
                    <span className={cn('text-[11px] font-medium tabular-nums', venc.cls)}>{venc.label}</span>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">—</span>
                  )}
                </td>
                <td className="py-2.5 px-1" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      {onHistorico && (
                        <DropdownMenuItem onSelect={() => onHistorico(o)}>
                          <History className="h-3.5 w-3.5" />Histórico
                        </DropdownMenuItem>
                      )}
                      {onShare && (
                        <DropdownMenuItem onSelect={() => onShare(o)}>
                          <Share2 className="h-3.5 w-3.5" />Compartilhar
                        </DropdownMenuItem>
                      )}
                      {onEdit && (
                        <DropdownMenuItem onSelect={() => onEdit(o)}>
                          <Edit className="h-3.5 w-3.5" />Editar
                        </DropdownMenuItem>
                      )}
                      {!isClosed && onFechar && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => onFechar(o)}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />Marcar como ganha
                          </DropdownMenuItem>
                        </>
                      )}
                      {!isClosed && onPerder && (
                        <DropdownMenuItem onSelect={() => onPerder(o)}>
                          <XCircle className="h-3.5 w-3.5 text-destructive" />Marcar como perdida
                        </DropdownMenuItem>
                      )}
                      {o.status === 'perdida' && onReativar && (
                        <DropdownMenuItem onSelect={() => onReativar(o.id)}>
                          <RotateCcw className="h-3.5 w-3.5" />Reativar como Lead
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(o)}>
                            <Trash2 className="h-3.5 w-3.5" />Excluir
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
