
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const KanbanDraggingContext = createContext<string | null>(null);
import { monitorForElements, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { Skeleton } from '@/core/ui/skeleton';
import { cn } from '@/core/utils';
import { KanbanColumnCore } from './kanban-column-core';
import type { KanbanColumnDef } from './types';

function ColumnDropIndicator({ edge }: { edge: 'left' | 'right' }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 bottom-0 z-20 w-[3px] rounded-full bg-primary',
        edge === 'left' ? '-left-2' : '-right-2',
      )}
    />
  );
}

function KanbanColumnWrapper({
  column,
  boardType,
  children,
}: {
  column: KanbanColumnDef;
  boardType: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [closestEdge, setClosestEdge] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return dropTargetForElements({
      element: el,
      getData: ({ input, element }) =>
        attachClosestEdge(
          { type: 'column-slot', columnId: column.id, boardType },
          { element, input, allowedEdges: ['left', 'right'] },
        ),
      canDrop: ({ source }) =>
        source.data.type === 'column' &&
        source.data.boardType === boardType &&
        source.data.columnId !== column.id,
      onDrag: ({ self }) => {
        const edge = extractClosestEdge(self.data);
        setClosestEdge(edge as 'left' | 'right' | null);
      },
      onDragLeave: () => setClosestEdge(null),
      onDrop: () => setClosestEdge(null),
    });
  }, [column.id, boardType]);

  return (
    <div
      ref={ref}
      className="relative shrink-0 w-[85vw] max-w-[320px] md:w-auto md:max-w-none md:min-w-0 snap-start md:snap-align-none"
    >
      {closestEdge === 'left' && <ColumnDropIndicator edge="left" />}
      {children}
      {closestEdge === 'right' && <ColumnDropIndicator edge="right" />}
    </div>
  );
}

interface KanbanBoardCoreProps<TItem> {
  boardType: string;
  items: TItem[];
  getItemId: (item: TItem) => string;
  getItemColumnKey: (item: TItem) => string;
  columns: KanbanColumnDef[];
  renderCard: (item: TItem) => React.ReactNode;
  getItemValue?: (item: TItem, columnId: string) => number;
  onMove: (itemId: string, toColumnId: string, rollback: () => void) => void;
  onReorder?: (itemId: string, columnId: string, targetItemId: string, edge: 'top' | 'bottom', rollback: () => void) => void;
  onReorderColumns?: (columns: KanbanColumnDef[]) => void;
  onMoveBlocked?: (item: TItem, toColumnId: string) => void;
  blockedColumnIds?: string[];
  isLoading?: boolean;
  gridColsClass?: string;
  emptyMessages?: Record<string, string>;
}

export function KanbanBoardCore<TItem>({
  boardType,
  items,
  getItemId,
  getItemColumnKey,
  columns,
  renderCard,
  getItemValue,
  onMove,
  onReorder,
  onReorderColumns,
  onMoveBlocked,
  blockedColumnIds = [],
  isLoading = false,
  gridColsClass = 'xl:grid-cols-5',
  emptyMessages,
}: KanbanBoardCoreProps<TItem>) {
  const boardRef = useRef<HTMLDivElement>(null);
  const blockedSet = useMemo(() => new Set(blockedColumnIds), [blockedColumnIds]);

  // ── Item grouping ──────────────────────────────────────────────────────────
  const itemsByColumn = useCallback(
    (source: TItem[]) => {
      const map = new Map<string, TItem[]>();
      for (const col of columns) map.set(col.id, []);
      for (const item of source) {
        const colId = getItemColumnKey(item);
        const list = map.get(colId) ?? [];
        list.push(item);
        map.set(colId, list);
      }
      return map;
    },
    [columns, getItemColumnKey],
  );

  // ── Local items (optimistic card moves) ────────────────────────────────────
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<Map<string, TItem[]>>(() => new Map());
  const isDraggingRef = useRef(false);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const itemsByColumnRef = useRef(itemsByColumn);
  useEffect(() => { itemsByColumnRef.current = itemsByColumn; }, [itemsByColumn]);

  useEffect(() => {
    if (isDraggingRef.current) return;
    setLocalItems(itemsByColumnRef.current(items));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // ── Local columns (optimistic column reorder) ──────────────────────────────
  const [localColumns, setLocalColumns] = useState<KanbanColumnDef[]>(columns);
  const isColumnDraggingRef = useRef(false);
  const localColumnsRef = useRef(localColumns);
  useEffect(() => { localColumnsRef.current = localColumns; }, [localColumns]);

  useEffect(() => {
    if (isColumnDraggingRef.current) return;
    setLocalColumns(columns);
  }, [columns]);

  // ── Lookup maps ────────────────────────────────────────────────────────────
  const itemMap = useMemo(() => new Map(items.map((i) => [getItemId(i), i])), [items, getItemId]);
  const itemMapRef = useRef(itemMap);
  useEffect(() => { itemMapRef.current = itemMap; }, [itemMap]);

  const onMoveRef = useRef(onMove);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);

  const onReorderRef = useRef(onReorder);
  useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);

  const onReorderColumnsRef = useRef(onReorderColumns);
  useEffect(() => { onReorderColumnsRef.current = onReorderColumns; }, [onReorderColumns]);

  const onMoveBlockedRef = useRef(onMoveBlocked);
  useEffect(() => { onMoveBlockedRef.current = onMoveBlocked; }, [onMoveBlocked]);

  // ── Auto-scroll board (horizontal) ────────────────────────────────────────
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    return autoScrollForElements({
      element: el,
      canScroll: ({ source }) => source.data.boardType === boardType,
    });
  }, [boardType]);

  // ── Monitor ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) =>
        source.data.boardType === boardType &&
        (source.data.type === 'card' || source.data.type === 'column'),
      onDragStart: ({ source }) => {
        if (source.data.type === 'card') {
          isDraggingRef.current = true;
          setDraggingItemId(source.data.id as string);
        }
        if (source.data.type === 'column') isColumnDraggingRef.current = true;
      },
      onDrop: ({ source, location }) => {
        const targets = location.current.dropTargets;

        // ── Column reorder ────────────────────────────────────────────────
        if (source.data.type === 'column') {
          isColumnDraggingRef.current = false;

          if (targets.length === 0) return;
          const firstTarget = targets[0];
          if (firstTarget.data.type !== 'column-slot') return;

          const fromColumnId = source.data.columnId as string;
          const toColumnId = firstTarget.data.columnId as string;
          if (fromColumnId === toColumnId) return;

          const edge = extractClosestEdge(firstTarget.data) as 'left' | 'right' | null;

          let next: KanbanColumnDef[] = [];
          setLocalColumns((prev) => {
            const list = [...prev];
            const fromIdx = list.findIndex((c) => c.id === fromColumnId);
            const toIdx = list.findIndex((c) => c.id === toColumnId);
            if (fromIdx === -1 || toIdx === -1) return prev;

            const [col] = list.splice(fromIdx, 1);
            const newToIdx = list.findIndex((c) => c.id === toColumnId);
            const insertAt = edge === 'left' ? newToIdx : newToIdx + 1;
            list.splice(Math.max(0, insertAt), 0, col);
            next = list;
            return list;
          });

          // Notify domain to persist
          requestAnimationFrame(() => {
            if (next.length > 0) onReorderColumnsRef.current?.(next);
          });
          return;
        }

        // ── Card move / reorder ───────────────────────────────────────────
        isDraggingRef.current = false;
        setDraggingItemId(null);

        if (targets.length === 0) {
          setLocalItems(itemsByColumn(itemsRef.current));
          return;
        }

        const itemId = source.data.id as string;
        const item = itemMapRef.current.get(itemId);
        if (!item) return;

        const fromColumnId = getItemColumnKey(item);
        const firstTarget = targets[0];

        if (firstTarget.data.type === 'card-slot') {
          const targetItemId = firstTarget.data.itemId as string;
          const toColumnId = firstTarget.data.columnId as string;
          const edge = extractClosestEdge(firstTarget.data) ?? 'bottom';

          if (fromColumnId === toColumnId) {
            setLocalItems((prev) => {
              const next = new Map(prev);
              const list = [...(next.get(toColumnId) ?? [])];
              const draggedIdx = list.findIndex((i) => getItemId(i) === itemId);
              const targetIdx = list.findIndex((i) => getItemId(i) === targetItemId);
              if (draggedIdx === -1 || targetIdx === -1) return prev;

              const [dragged] = list.splice(draggedIdx, 1);
              const newTargetIdx = list.findIndex((i) => getItemId(i) === targetItemId);
              const insertAt = edge === 'top' ? newTargetIdx : newTargetIdx + 1;
              list.splice(Math.max(0, insertAt), 0, dragged);
              next.set(toColumnId, list);
              return next;
            });

            const rollback = () => setLocalItems(itemsByColumn(itemsRef.current));
            onReorderRef.current?.(itemId, toColumnId, targetItemId, edge as 'top' | 'bottom', rollback);
            return;
          }

          if (blockedSet.has(toColumnId)) {
            onMoveBlockedRef.current?.(item, toColumnId);
            return;
          }

          setLocalItems((prev) => {
            const next = new Map(prev);
            const fromList = (next.get(fromColumnId) ?? []).filter((i) => getItemId(i) !== itemId);
            const toList = [...(next.get(toColumnId) ?? [])];
            const targetIdx = toList.findIndex((i) => getItemId(i) === targetItemId);
            const insertAt = edge === 'top' ? targetIdx : targetIdx + 1;
            toList.splice(Math.max(0, insertAt), 0, item);
            next.set(fromColumnId, fromList);
            next.set(toColumnId, toList);
            return next;
          });

          const rollback = () => setLocalItems(itemsByColumn(itemsRef.current));
          onMoveRef.current(itemId, toColumnId, rollback);
          return;
        }

        // Dropped on column empty area
        const toColumnId = firstTarget.data.columnId as string;
        if (fromColumnId === toColumnId) return;

        if (blockedSet.has(toColumnId)) {
          onMoveBlockedRef.current?.(item, toColumnId);
          return;
        }

        setLocalItems((prev) => {
          const next = new Map(prev);
          const fromList = (next.get(fromColumnId) ?? []).filter((i) => getItemId(i) !== itemId);
          const toList = [...(next.get(toColumnId) ?? []), item];
          next.set(fromColumnId, fromList);
          next.set(toColumnId, toList);
          return next;
        });

        const rollback = () => setLocalItems(itemsByColumn(itemsRef.current));
        onMoveRef.current(itemId, toColumnId, rollback);
      },
    });
  }, [boardType, blockedSet, getItemColumnKey, getItemId, itemsByColumn]);

  if (isLoading) {
    return (
      <div className={`flex md:grid md:h-full md:grid-cols-2 lg:grid-cols-3 ${gridColsClass} gap-4 overflow-x-hidden pb-4 px-3 sm:px-4 animate-pulse`}>
        {columns.map((col) => (
          <div key={col.id} className="shrink-0 w-[85vw] max-w-[320px] md:w-auto md:max-w-none md:min-w-0 flex flex-col rounded-xl border bg-muted/40 overflow-hidden">
            <div className={`h-12 rounded-t-xl ${col.headerBg ?? col.color}`} />
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[100px] w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <KanbanDraggingContext.Provider value={draggingItemId}>
      <div
        ref={boardRef}
        className={`flex md:grid md:h-full md:grid-cols-2 lg:grid-cols-3 ${gridColsClass} gap-4 overflow-x-auto snap-x snap-mandatory md:snap-none pb-4 px-3 sm:px-4`}
      >
        {localColumns.map((column) => (
          <KanbanColumnWrapper key={column.id} column={column} boardType={boardType}>
            <KanbanColumnCore
              column={column}
              boardType={boardType}
              items={localItems.get(column.id) ?? []}
              getItemId={getItemId}
              renderCard={renderCard}
              getItemValue={getItemValue ? (item) => getItemValue(item, column.id) : undefined}
              emptyMessage={emptyMessages?.[column.id]}
            />
          </KanbanColumnWrapper>
        ))}
      </div>
    </KanbanDraggingContext.Provider>
  );
}
