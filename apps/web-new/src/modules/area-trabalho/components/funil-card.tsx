import { memo, useContext, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { CalendarRange, Check, Eye, Flag, MessageSquare, MoreHorizontal, Pencil, Percent, Tag } from 'lucide-react';
import { Card } from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/core/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
import { KanbanDraggingContext } from '@/core/kanban';
import { cn } from '@/core/utils';
import {
  useCotacaoTags,
  useAddTagToCotacao,
  useRemoveTagFromCotacao,
  areaTrabalhoKeys,
} from '../http';
import { api } from '@/infra/http/api';
import type { Cotacao } from '@/types/area-trabalho';

const BOARD_TYPE = 'funil-cotacoes';

function nomeCliente(c: Cotacao) {
  const cl = c.cliente;
  return cl?.tipoPessoa === 'PJ'
    ? (cl.nomeFantasia || cl.razaoSocial || '—')
    : (cl?.nome || '—');
}

function formatCurrency(value: number | null | undefined) {
  if (!value) return null;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Minimal overlay shown during drag
export const FunilCardOverlay = memo(function FunilCardOverlay({ cotacao }: { cotacao: Cotacao }) {
  return (
    <Card className="cursor-grabbing shadow-2xl rotate-1 w-[260px] px-3 py-2">
      <p className="text-sm font-semibold truncate">{nomeCliente(cotacao)}</p>
      <p className="text-xs text-muted-foreground truncate">{cotacao.produto?.nomeProduto}</p>
    </Card>
  );
});

interface FunilCardProps {
  cotacao: Cotacao;
  onVisualizar: (c: Cotacao) => void;
  onEditar: (c: Cotacao) => void;
  onMarcarPerdida: (c: Cotacao) => void;
}

export const FunilCard = memo(function FunilCard({
  cotacao,
  onVisualizar,
  onEditar,
  onMarcarPerdida,
}: FunilCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const draggingId = useContext(KanbanDraggingContext);
  const isDragging = draggingId === cotacao.id;
  const queryClient = useQueryClient();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    hoverTimer.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: [...areaTrabalhoKeys.cotacoes(), cotacao.id],
        queryFn: () => api.get(`/quotes/${cotacao.id}`),
        staleTime: 30_000,
      });
      queryClient.prefetchQuery({
        queryKey: ['anexos', 'cotacao', cotacao.id],
        queryFn: () => api.get(`/attachments/entidade/cotacao/${cotacao.id}`),
        staleTime: 60_000,
      });
    }, 300);
  }, [cotacao.id, queryClient]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    queryClient.cancelQueries({ queryKey: [...areaTrabalhoKeys.cotacoes(), cotacao.id] });
    queryClient.cancelQueries({ queryKey: ['anexos', 'cotacao', cotacao.id] });
  }, [cotacao.id, queryClient]);

  const { data: allTags = [] } = useCotacaoTags();
  const addTag = useAddTagToCotacao();
  const removeTag = useRemoveTagFromCotacao();

  const currentTagIds = new Set((cotacao.tags ?? []).map((t) => t.id));

  const toggleTag = (tagId: string, isSelected: boolean) => {
    if (isSelected) {
      removeTag.mutate({ cotacaoId: cotacao.id, tagId });
    } else {
      addTag.mutate({ cotacaoId: cotacao.id, tagId });
    }
  };

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    return draggable({
      element: el,
      canDrag: ({ input }) => !document.elementsFromPoint(input.clientX, input.clientY).some(
        (el) => el.tagName === 'BUTTON' || el.getAttribute('role') === 'button',
      ),
      getInitialData: () => ({ type: 'card', boardType: BOARD_TYPE, id: cotacao.id }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          render: ({ container }) => {
            const root = createRoot(container);
            root.render(<FunilCardOverlay cotacao={cotacao} />);
            return () => root.unmount();
          },
        });
      },
    });
  }, [cotacao]);

  const cliente = nomeCliente(cotacao);
  const produto = cotacao.produto?.nomeProduto;
  const seguradora = cotacao.seguradoraParceira?.nomeFantasia || cotacao.seguradoraParceira?.razaoSocial;
  const premio = formatCurrency(cotacao.premioLiquido ?? undefined);
  const isEditable = cotacao.status === 'EM_ELABORACAO';

  const vigencia = cotacao.vigenciaInicio && cotacao.vigenciaFim
    ? `${new Date(cotacao.vigenciaInicio + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })} → ${new Date(cotacao.vigenciaFim + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}`
    : null;
  const numeroCotacao = cotacao.numeroCotacao ?? cotacao.numero;
  const vendedor = cotacao.vendedor?.nome;
  const comissao = cotacao.percentualComissao != null ? `${Number(cotacao.percentualComissao).toFixed(1)}%` : null;
  const vendedorInitials = vendedor
    ? vendedor.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : null;
  const hasHoverContent = !!(vigencia || comissao);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div ref={cardRef} className={cn('rounded-lg', isDragging && 'opacity-25 pointer-events-none')}>
          <Card
            onClick={() => { if (!isDragging) onVisualizar(cotacao); }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
              'cursor-grab active:cursor-grabbing relative group',
              'transition-[transform,box-shadow] duration-200',
              'hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.40)]',
            )}
          >
            <div className="px-2.5 py-2 space-y-1.5">
              {/* Row 1: nome + menu */}
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-semibold leading-tight truncate flex-1">{cliente}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 -mt-0.5 -mr-1 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onSelect={() => onVisualizar(cotacao)}>
                      <Eye className="h-3.5 w-3.5" />Visualizar
                    </DropdownMenuItem>
                    {isEditable && (
                      <DropdownMenuItem onSelect={() => onEditar(cotacao)}>
                        <Pencil className="h-3.5 w-3.5" />Editar
                      </DropdownMenuItem>
                    )}
                    {isEditable && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => onMarcarPerdida(cotacao)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Flag className="h-3.5 w-3.5" />Marcar perdida
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Row 2: produto + seguradora */}
              {(produto || seguradora) && (
                <p className="text-xs text-muted-foreground truncate">
                  {produto}{produto && seguradora ? ' · ' : ''}{seguradora}
                </p>
              )}

              {/* Row 3: tags */}
              {cotacao.tags && cotacao.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {cotacao.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: tag.cor }}
                    >
                      {tag.nome}
                    </span>
                  ))}
                </div>
              )}

              {/* Row 4: prêmio + badges */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {premio ? (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {premio}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/50">Sem prêmio</span>
                )}
                <div className="flex items-center gap-1.5">
                  {cotacao.origem === 'RENOVACAO_PENDENTE' && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-blue-300 text-blue-600">
                      Renov.
                    </Badge>
                  )}
                  {cotacao.situacao === 'RENOVACAO' && cotacao.origem !== 'RENOVACAO_PENDENTE' && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      Renov.
                    </Badge>
                  )}
                  {(cotacao.comentariosCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      {cotacao.comentariosCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Vendedor — always visible */}
              {vendedor && (
                <div className="flex items-center gap-1.5 pt-0.5 border-t border-border/40">
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-muted-foreground">
                    {vendedorInitials}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">{vendedor}</span>
                </div>
              )}

              {/* Hover expand */}
              {hasHoverContent && (
                <div className="overflow-hidden max-h-0 group-hover:max-h-16 transition-all duration-200 ease-out">
                  <div className="border-t border-border/50 mt-1 pt-1.5 space-y-0.5">
                    {vigencia && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <CalendarRange className="h-3 w-3 shrink-0" />
                        <span>{vigencia}</span>
                      </div>
                    )}
                    {comissao && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Percent className="h-3 w-3 shrink-0" />
                        <span>Comissão {comissao}</span>
                      </div>
                    )}
                    {numeroCotacao && (
                      <p className="text-[10px] text-muted-foreground/50 tabular-nums">
                        {numeroCotacao}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-44">
        <ContextMenuItem onSelect={() => onVisualizar(cotacao)}>
          <Eye className="h-3.5 w-3.5" />Visualizar
        </ContextMenuItem>
        {isEditable && (
          <ContextMenuItem onSelect={() => onEditar(cotacao)}>
            <Pencil className="h-3.5 w-3.5" />Editar
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Tag className="h-3.5 w-3.5" />Tags
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {allTags.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-1.5">Nenhuma tag criada</p>
            ) : (
              allTags.map((tag) => {
                const selected = currentTagIds.has(tag.id);
                return (
                  <ContextMenuItem
                    key={tag.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      toggleTag(tag.id, selected);
                    }}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.cor }} />
                    <span className="flex-1 truncate">{tag.nome}</span>
                    {selected && <Check className="h-3 w-3 shrink-0 text-primary" />}
                  </ContextMenuItem>
                );
              })
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        {isEditable && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onSelect={() => onMarcarPerdida(cotacao)}
            >
              <Flag className="h-3.5 w-3.5" />Marcar perdida
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});
