
import { memo, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import {
  CheckCircle2,
  Clock,
  Edit,
  Flame,
  History,
  MoreHorizontal,
  Package,
  RotateCcw,
  Share2,
  Trash2,
  TrendingUp,
  User,
  XCircle,
} from 'lucide-react';
import type { Oportunidade, OportunidadePrioridade, OportunidadeTemperatura } from '@/types/kanban';
import { Card } from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
import { cn } from '@/core/utils';
import { TEMPERATURA_LABELS } from '@/types/kanban';

const TEMPERATURA_BORDER: Record<OportunidadeTemperatura, string> = {
  quente: 'border-l-red-500',
  morno: 'border-l-amber-400',
  frio: 'border-l-sky-400',
};

const PRIORIDADE_DOT: Record<OportunidadePrioridade, string> = {
  urgente: 'bg-red-500',
  alta: 'bg-orange-400',
  media: 'bg-yellow-400',
  baixa: 'bg-slate-300 dark:bg-slate-600',
};

const TEMPERATURA_NEXT: Record<OportunidadeTemperatura, OportunidadeTemperatura> = {
  frio: 'morno',
  morno: 'quente',
  quente: 'frio',
};

function getTemperaturaChip(temperatura: OportunidadeTemperatura) {
  switch (temperatura) {
    case 'quente':
      return { bg: 'bg-red-500/10 text-red-600 dark:text-red-400 hover:ring-red-400', icon: <Flame className="h-3 w-3" /> };
    case 'morno':
      return { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:ring-amber-400', icon: <TrendingUp className="h-3 w-3" /> };
    case 'frio':
      return { bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:ring-sky-400', icon: <Clock className="h-3 w-3" /> };
  }
}

function getVencimentoBadge(oportunidade: Oportunidade) {
  if (!oportunidade.dataVencimento || oportunidade.status === 'ganha' || oportunidade.status === 'perdida') return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(oportunidade.dataVencimento);
  vencimento.setHours(0, 0, 0, 0);
  const diffDias = Math.round((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-0 text-[11px] h-5 px-2 font-medium">Vencida</Badge>;
  if (diffDias === 0) return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-0 text-[11px] h-5 px-2 font-medium">Vence hoje</Badge>;
  if (diffDias <= 2) return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-0 text-[11px] h-5 px-2 font-medium">Vence em {diffDias}d</Badge>;
  if (diffDias <= 7) return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-0 text-[11px] h-5 px-2 font-medium">Vence em {diffDias}d</Badge>;
  return null;
}

export const KanbanCardOverlay = memo(function KanbanCardOverlay({ oportunidade }: { oportunidade: Oportunidade }) {
  const temperaturaChip = getTemperaturaChip(oportunidade.temperatura);
  const valor = oportunidade.valorFechado ?? oportunidade.premioEstimado;
  return (
    <Card className={cn('cursor-grabbing border-l-4 shadow-2xl rotate-1 w-[280px]', TEMPERATURA_BORDER[oportunidade.temperatura])}>
      <div className="px-3 py-2">
        <h4 className="text-sm font-semibold leading-tight mb-1.5">{oportunidade.nomeCliente}</h4>
        <div className="flex items-center justify-between gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', temperaturaChip.bg)}>
            {temperaturaChip.icon}{TEMPERATURA_LABELS[oportunidade.temperatura]}
          </span>
          {valor && (
            <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:text-green-400">
              R$ {parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
});

interface KanbanCardProps {
  oportunidade: Oportunidade;
  onEdit?: (oportunidade: Oportunidade) => void;
  onDelete?: (oportunidade: Oportunidade) => void;
  onPerder?: (oportunidade: Oportunidade) => void;
  onFechar?: (oportunidade: Oportunidade) => void;
  onShare?: (oportunidade: Oportunidade) => void;
  onHistorico?: (oportunidade: Oportunidade) => void;
  onReativar?: (id: string) => void;
  onUpdateTemperatura?: (id: string, temperatura: OportunidadeTemperatura) => void;
}

export const KanbanCard = memo(function KanbanCard({
  oportunidade,
  onEdit,
  onDelete,
  onPerder,
  onFechar,
  onShare,
  onHistorico,
  onReativar,
  onUpdateTemperatura,
}: KanbanCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    return draggable({
      element: el,
      getInitialData: () => ({ type: 'card', boardType: 'oportunidades', id: oportunidade.id }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          render: ({ container }) => {
            const root = createRoot(container);
            root.render(<KanbanCardOverlay oportunidade={oportunidade} />);
            return () => root.unmount();
          },
        });
      },
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [oportunidade]);

  const vencimentoBadge = getVencimentoBadge(oportunidade);
  const temperaturaChip = getTemperaturaChip(oportunidade.temperatura);
  const valor = oportunidade.valorFechado ?? oportunidade.premioEstimado;
  const isClosed = oportunidade.status === 'ganha' || oportunidade.status === 'perdida';
  const hasAnyAction = !!onEdit || !!onShare || !!onHistorico || !!onFechar || !!onPerder || !!onDelete || !!onReativar;
  const hasExpandContent = !!oportunidade.observacoes || !!oportunidade.produto;

  return (
    <div ref={cardRef} className={cn('rounded-lg', isDragging && 'opacity-25 pointer-events-none')}>
      <Card
        onClick={() => { if (!isDragging) onEdit?.(oportunidade); }}
        className={cn(
          'cursor-grab active:cursor-grabbing relative group border-l-4',
          'transition-[transform,box-shadow] duration-200',
          'hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.40)]',
          TEMPERATURA_BORDER[oportunidade.temperatura],
        )}
      >
        <div className="px-2.5 py-1.5">
          {/* Row 1: priority dot + name + menu */}
          <div className="flex items-start justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full mt-0.5', PRIORIDADE_DOT[oportunidade.prioridade])}
                title={oportunidade.prioridade}
              />
              <h4 className="text-sm font-semibold leading-tight truncate">{oportunidade.nomeCliente}</h4>
            </div>
            {hasAnyAction && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 -mt-1 -mr-1 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {onHistorico && (
                    <DropdownMenuItem onSelect={() => onHistorico(oportunidade)}>
                      <History className="h-3.5 w-3.5" />Histórico
                    </DropdownMenuItem>
                  )}
                  {onShare && (
                    <DropdownMenuItem onSelect={() => onShare(oportunidade)}>
                      <Share2 className="h-3.5 w-3.5" />Compartilhar
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onSelect={() => onEdit(oportunidade)}>
                      <Edit className="h-3.5 w-3.5" />Editar
                    </DropdownMenuItem>
                  )}
                  {!isClosed && onFechar && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => onFechar(oportunidade)}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />Marcar como ganha
                      </DropdownMenuItem>
                    </>
                  )}
                  {!isClosed && onPerder && (
                    <DropdownMenuItem onSelect={() => onPerder(oportunidade)}>
                      <XCircle className="h-3.5 w-3.5 text-destructive" />Marcar como perdida
                    </DropdownMenuItem>
                  )}
                  {oportunidade.status === 'perdida' && onReativar && (
                    <DropdownMenuItem onSelect={() => onReativar(oportunidade.id)}>
                      <RotateCcw className="h-3.5 w-3.5" />Reativar como Lead
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(oportunidade)}>
                        <Trash2 className="h-3.5 w-3.5" />Excluir
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Row 2: temperatura + valor */}
          <div className="flex items-center justify-between gap-2">
            <button
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                'transition-all duration-150 hover:ring-2 hover:ring-offset-1 cursor-pointer',
                temperaturaChip.bg,
              )}
              onClick={(e) => { e.stopPropagation(); onUpdateTemperatura?.(oportunidade.id, TEMPERATURA_NEXT[oportunidade.temperatura]); }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Clique para alterar temperatura"
            >
              {temperaturaChip.icon}
              {TEMPERATURA_LABELS[oportunidade.temperatura]}
            </button>
            {valor && (
              <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:text-green-400">
                R$ {parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {/* Row 3: vendedor */}
          {oportunidade.vendedor?.nome && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{oportunidade.vendedor.nome}</span>
            </div>
          )}

          {/* Hover expand — fora do flow normal para não criar ghost margin */}
          {hasExpandContent && (
            <div className="overflow-hidden max-h-0 group-hover:max-h-20 transition-all duration-200 ease-out">
              {oportunidade.produto && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                  <Package className="h-3 w-3 shrink-0" />
                  <span className="truncate">{oportunidade.produto.nomeProduto}</span>
                </div>
              )}
              {oportunidade.observacoes && (
                <p className="text-[11px] text-muted-foreground/80 line-clamp-2 mt-1 italic">
                  {oportunidade.observacoes}
                </p>
              )}
            </div>
          )}

          {/* Vencimento */}
          {vencimentoBadge && <div className="mt-0.5">{vencimentoBadge}</div>}
        </div>
      </Card>
    </div>
  );
});
