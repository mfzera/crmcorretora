
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { useVirtualizer } from '@tanstack/react-virtual';
import { GripVertical } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { cn } from '@/core/utils';
import type { KanbanColumnDef } from './types';

const VIRTUALIZE_THRESHOLD = 15;
const CARD_ESTIMATED_HEIGHT = 128;
const CARD_GAP = 8;
const VISIBLE_PAGE_SIZE = 20;

function DropIndicator({ edge }: { edge: Edge }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute left-0 right-0 z-20 flex items-center gap-0',
        edge === 'top' ? '-top-[5px]' : '-bottom-[5px]',
      )}
    >
      <div className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-primary bg-background" />
      <div className="h-0.5 flex-1 bg-primary" />
    </div>
  );
}

function KanbanCardSlot({
  itemId,
  columnId,
  boardType,
  children,
}: {
  itemId: string;
  columnId: string;
  boardType: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return dropTargetForElements({
      element: el,
      getData: ({ input, element }) =>
        attachClosestEdge(
          { type: 'card-slot', itemId, columnId, boardType },
          { element, input, allowedEdges: ['top', 'bottom'] },
        ),
      canDrop: ({ source }) =>
        source.data.type === 'card' &&
        source.data.boardType === boardType &&
        source.data.id !== itemId,
      onDrag: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
      onDragLeave: () => setClosestEdge(null),
      onDrop: () => setClosestEdge(null),
    });
  }, [itemId, columnId, boardType]);

  return (
    <div ref={ref} className="relative">
      {closestEdge === 'top' && <DropIndicator edge="top" />}
      {children}
      {closestEdge === 'bottom' && <DropIndicator edge="bottom" />}
    </div>
  );
}

interface KanbanColumnCoreProps<TItem> {
  column: KanbanColumnDef;
  boardType: string;
  items: TItem[];
  getItemId: (item: TItem) => string;
  renderCard: (item: TItem) => React.ReactNode;
  getItemValue?: (item: TItem) => number;
  emptyMessage?: string;
  canReorder?: boolean;
}

export const KanbanColumnCore = memo(function KanbanColumnCore<TItem>({
  column,
  boardType,
  items,
  getItemId,
  renderCard,
  getItemValue,
  emptyMessage = 'Nenhum item',
  canReorder = true,
}: KanbanColumnCoreProps<TItem>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [isColumnDragging, setIsColumnDragging] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return dropTargetForElements({
      element: el,
      getData: () => ({ columnId: column.id, boardType }),
      canDrop: ({ source }) => source.data.type === 'card' && source.data.boardType === boardType,
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    });
  }, [column.id, boardType]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return autoScrollForElements({
      element: el,
      canScroll: ({ source }) => source.data.type === 'card' && source.data.boardType === boardType,
    });
  }, [boardType]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el || !canReorder) return;
    return draggable({
      element: el,
      getInitialData: () => ({ type: 'column', boardType, columnId: column.id }),
      onDragStart: () => setIsColumnDragging(true),
      onDrop: () => setIsColumnDragging(false),
    });
  }, [column.id, boardType, canReorder]);

  const [visibleCount, setVisibleCount] = useState(VISIBLE_PAGE_SIZE);
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = items.length > visibleItems.length;
  const remaining = items.length - visibleItems.length;

  useEffect(() => {
    if (items.length <= VISIBLE_PAGE_SIZE && visibleCount !== VISIBLE_PAGE_SIZE) {
      setVisibleCount(VISIBLE_PAGE_SIZE);
    }
  }, [items.length, visibleCount]);

  const shouldVirtualize = visibleItems.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_ESTIMATED_HEIGHT + CARD_GAP,
    overscan: 4,
    enabled: shouldVirtualize,
  });

  const totalValor = useMemo(
    () => getItemValue ? items.reduce((acc, item) => acc + getItemValue(item), 0) : 0,
    [items, getItemValue],
  );

  const headerBg = column.headerBg ?? column.color;

  return (
    <div className={cn('flex flex-col rounded-xl border bg-muted/40 md:h-full overflow-hidden transition-opacity duration-150', isColumnDragging && 'opacity-40')}>
      <div
        ref={headerRef}
        className={cn('px-3 pt-3 pb-2.5 rounded-t-xl select-none', headerBg, canReorder && 'cursor-grab active:cursor-grabbing')}
      >
        <div className="flex items-center gap-1.5">
          {canReorder && (
            <GripVertical className="h-3.5 w-3.5 text-white/50 shrink-0" />
          )}
          <h3 className="flex-1 font-semibold text-sm text-white truncate">{column.title}</h3>
          <span className="rounded-full bg-black/20 text-white px-2 py-0.5 text-xs font-medium tabular-nums min-w-[1.5rem] text-center">
            {items.length}
          </span>
        </div>
        {totalValor > 0 && (
          <p className="text-xs font-medium text-white/70 mt-1 pl-5">
            R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>

      <div
        ref={scrollRef}
        className={cn(
          'p-3 transition-all duration-150 ease-out md:flex-1 md:overflow-y-auto',
          '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full',
          isOver && 'bg-muted/60',
          !shouldVirtualize && 'space-y-2',
        )}
      >
        {items.length === 0 ? (
          <div
            className={cn(
              'flex flex-1 min-h-[8rem] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed transition-colors duration-150',
              isOver ? 'border-muted-foreground/40 bg-muted/60' : 'border-muted-foreground/20',
            )}
          >
            <p className="text-xs font-medium text-muted-foreground">
              {isOver ? 'Soltar aqui' : emptyMessage}
            </p>
          </div>
        ) : shouldVirtualize ? (
          <>
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((vItem) => {
                const item = visibleItems[vItem.index];
                const id = getItemId(item);
                return (
                  <div
                    key={id}
                    data-index={vItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      transform: `translateY(${vItem.start}px)`,
                      paddingBottom: CARD_GAP,
                    }}
                  >
                    <KanbanCardSlot itemId={id} columnId={column.id} boardType={boardType}>
                      {renderCard(item)}
                    </KanbanCardSlot>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setVisibleCount((c) => c + VISIBLE_PAGE_SIZE)}
                >
                  Ver mais ({remaining} restante{remaining !== 1 ? 's' : ''})
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {visibleItems.map((item) => {
              const id = getItemId(item);
              return (
                <KanbanCardSlot key={id} itemId={id} columnId={column.id} boardType={boardType}>
                  {renderCard(item)}
                </KanbanCardSlot>
              );
            })}
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setVisibleCount((c) => c + VISIBLE_PAGE_SIZE)}
              >
                Ver mais ({remaining} restante{remaining !== 1 ? 's' : ''})
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}) as <TItem>(props: KanbanColumnCoreProps<TItem>) => React.ReactElement;
