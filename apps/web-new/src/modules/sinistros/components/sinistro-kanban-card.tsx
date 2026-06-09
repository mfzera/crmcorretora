
import { memo, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { AlertTriangle, CalendarDays, FileText, History, Pencil, User, ArrowUpFromLine } from 'lucide-react';
import { dayjs } from '@/core/utils/date-utils';
import type { Sinistro } from '@/types/sinistro';
import { TIPO_SINISTRO_LABELS } from '@/types/sinistro';
import { Card, CardContent, CardHeader } from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/core/ui/context-menu';
import { cn } from '@/core/utils';

interface SinistroKanbanCardProps {
  sinistro: Sinistro;
  canDrag?: boolean;
  onDetalhes?: (sinistro: Sinistro) => void;
  onHistorico?: (sinistro: Sinistro) => void;
  onEditar?: (sinistro: Sinistro) => void;
}

// Preview mínimo para o ghost nativo do browser
function SinistroCardPreview({ sinistro }: { sinistro: Sinistro }) {
  return (
    <Card className="w-[260px] shadow-2xl rotate-1 cursor-grabbing">
      <CardHeader className="p-3 pb-1">
        <p className="text-sm font-semibold truncate">
          {sinistro.documentoVenda?.cliente?.nome ?? 'Cliente'}
        </p>
        <p className="text-[10px] font-mono text-muted-foreground">{sinistro.numeroSinistro}</p>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-xs text-muted-foreground">{TIPO_SINISTRO_LABELS[sinistro.tipoSinistro]}</p>
      </CardContent>
    </Card>
  );
}

export const SinistroKanbanCard = memo(function SinistroKanbanCard({
  sinistro,
  canDrag = true,
  onDetalhes,
  onHistorico,
  onEditar,
}: SinistroKanbanCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    return draggable({
      element: el,
      canDrag: () => canDrag,
      getInitialData: () => ({ type: 'card', boardType: 'sinistros', id: sinistro.id }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          render: ({ container }) => {
            const root = createRoot(container);
            root.render(<SinistroCardPreview sinistro={sinistro} />);
            return () => root.unmount();
          },
        });
      },
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [sinistro, canDrag]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={cardRef}
          className={cn('rounded-lg', isDragging && 'opacity-25 pointer-events-none')}
        >
          <Card
            className={cn(
              'cursor-grab active:cursor-grabbing relative group transition-all duration-200 hover:shadow-md',
              !canDrag && 'cursor-not-allowed opacity-60',
            )}
          >
            <div className="absolute -top-2 -right-2 z-10 hidden group-hover:flex gap-1">
              <Button
                size="icon"
                variant="secondary"
                className="h-6 w-6 rounded-full shadow-md"
                onClick={(e) => { e.stopPropagation(); onEditar?.(sinistro); }}
                onPointerDown={(e) => e.stopPropagation()}
                title="Editar"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-6 w-6 rounded-full shadow-md"
                onClick={(e) => { e.stopPropagation(); onHistorico?.(sinistro); }}
                onPointerDown={(e) => e.stopPropagation()}
                title="Histórico"
              >
                <History className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-6 w-6 rounded-full shadow-md"
                onClick={(e) => { e.stopPropagation(); onDetalhes?.(sinistro); }}
                onPointerDown={(e) => e.stopPropagation()}
                title="Ver detalhes"
              >
                <FileText className="h-3 w-3" />
              </Button>
            </div>

            <div onDoubleClick={(e) => { e.stopPropagation(); onDetalhes?.(sinistro); }}>
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="text-sm font-semibold leading-tight truncate">
                    {sinistro.documentoVenda?.cliente?.nome ?? 'Cliente'}
                  </h4>
                  {sinistro.origem === 'INDICACAO' && (
                    <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                      <ArrowUpFromLine className="size-2.5" />
                      Indicação
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  {sinistro.numeroSinistro}
                  {sinistro.numeroSinistroExterno && (
                    <span className="ml-1.5 not-italic font-sans">· Prot. {sinistro.numeroSinistroExterno}</span>
                  )}
                </p>
              </CardHeader>

              <CardContent className="space-y-1.5 p-3 pt-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{TIPO_SINISTRO_LABELS[sinistro.tipoSinistro]}</span>
                </div>
                {sinistro.documentoVenda?.produto && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{sinistro.documentoVenda.produto.nomeProduto}</span>
                  </div>
                )}
                {sinistro.solicitante && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">{sinistro.solicitante.nome}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    <span>{dayjs(sinistro.dataOcorrencia).format('DD/MM/YY')}</span>
                  </div>
                  {sinistro.valorReclamado && (
                    <span className="text-xs font-medium text-orange-600">
                      R$ {parseFloat(sinistro.valorReclamado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onDetalhes?.(sinistro)}>
          <FileText className="h-4 w-4 mr-2" /> Ver detalhes
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onHistorico?.(sinistro)}>
          <History className="h-4 w-4 mr-2" /> Histórico
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onEditar?.(sinistro)}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
