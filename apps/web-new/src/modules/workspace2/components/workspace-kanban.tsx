import { memo, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { CalendarRange, Percent } from 'lucide-react';
import { Card } from '@/core/ui/card';
import { KanbanBoardCore, KanbanDraggingContext } from '@/core/kanban';
import type { KanbanColumnDef } from '@/core/kanban';
import { cn } from '@/core/utils';
import { fmt, fmtDate } from '../helpers';
import { SITUACAO_STYLES } from '../types';
import type { WorkspaceRow, SituacaoLabel } from '../types';

const WORKSPACE_KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: 'Renovar',            title: 'Renovar',            color: 'bg-amber-400',  headerBg: 'bg-gradient-to-r from-amber-500 to-amber-400',   visible: true, ordem: 0, isCustom: false },
  { id: 'Vencida',            title: 'Vencida',            color: 'bg-rose-500',   headerBg: 'bg-gradient-to-r from-rose-600 to-rose-500',     visible: true, ordem: 1, isCustom: false },
  { id: 'Iniciado',           title: 'Iniciado',           color: 'bg-blue-500',   headerBg: 'bg-gradient-to-r from-blue-600 to-blue-500',     visible: true, ordem: 2, isCustom: false },
  { id: 'Cotação Enviada',   title: 'Cotação Enviada',   color: 'bg-violet-500', headerBg: 'bg-gradient-to-r from-violet-600 to-violet-500', visible: true, ordem: 3, isCustom: false },
  { id: 'Aguardando Retorno', title: 'Aguardando Retorno', color: 'bg-orange-400', headerBg: 'bg-gradient-to-r from-orange-500 to-orange-400', visible: true, ordem: 4, isCustom: false },
  { id: 'Fechado',            title: 'Fechado',            color: 'bg-slate-500',  headerBg: 'bg-gradient-to-r from-slate-600 to-slate-500',   visible: true, ordem: 5, isCustom: false },
  { id: 'Convertido',         title: 'Convertido',         color: 'bg-green-500',  headerBg: 'bg-gradient-to-r from-green-600 to-green-500',   visible: true, ordem: 6, isCustom: false, isTerminal: true },
  { id: 'Perdido',            title: 'Perdido',            color: 'bg-red-500',    headerBg: 'bg-gradient-to-r from-red-600 to-red-500',       visible: true, ordem: 7, isCustom: false, isTerminal: true },
  { id: 'Cancelado',          title: 'Cancelado',          color: 'bg-gray-400',   headerBg: 'bg-gradient-to-r from-gray-500 to-gray-400',     visible: true, ordem: 8, isCustom: false, isTerminal: true },
  { id: 'Excluído',           title: 'Excluído',           color: 'bg-red-400',    headerBg: 'bg-gradient-to-r from-red-500 to-red-400',       visible: true, ordem: 9, isCustom: false, isTerminal: true },
];

const BLOCKED_COLUMN_IDS = ['Renovar', 'Vencida', 'Convertido', 'Perdido', 'Cancelado', 'Excluído'];

// ── Drag overlay ──────────────────────────────────────────────────────────────

const WorkspaceKanbanCardOverlay = memo(function WorkspaceKanbanCardOverlay({ row }: { row: WorkspaceRow }) {
  return (
    <Card className="cursor-grabbing shadow-2xl rotate-1 w-[260px] px-3 py-2">
      <p className="text-sm font-semibold truncate">{row.clienteNome}</p>
      <p className="text-xs text-muted-foreground truncate">{row.produto}</p>
    </Card>
  );
});

// ── Card ──────────────────────────────────────────────────────────────────────

interface WorkspaceKanbanCardProps {
  row: WorkspaceRow;
  boardType: string;
  onVerDetalhes: (row: WorkspaceRow) => void;
}

const WorkspaceKanbanCard = memo(function WorkspaceKanbanCard({
  row,
  boardType,
  onVerDetalhes,
}: WorkspaceKanbanCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const draggingId = useContext(KanbanDraggingContext);
  const isDragging = draggingId === row.id;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    return draggable({
      element: el,
      canDrag: ({ input }) =>
        !document.elementsFromPoint(input.clientX, input.clientY).some(
          (e) => e.tagName === 'BUTTON' || e.getAttribute('role') === 'button',
        ),
      getInitialData: () => ({ type: 'card', boardType, id: row.id }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          render: ({ container }) => {
            const root = createRoot(container);
            root.render(<WorkspaceKanbanCardOverlay row={row} />);
            return () => root.unmount();
          },
        });
      },
    });
  }, [row, boardType]);

  const style = SITUACAO_STYLES[row.situacao];
  const premioFmt = row.plAtual != null ? fmt(row.plAtual) : null;
  const comissaoFmt = row.comissaoPct != null ? `${Number(row.comissaoPct).toFixed(1)}%` : null;
  const vendedorInitials = row.vendedorNome
    ? row.vendedorNome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : null;
  const hasHoverContent = !!(row.vigenciaInicio || row.vigenciaFim || comissaoFmt);

  return (
    <div ref={cardRef} className={cn('rounded-lg', isDragging && 'opacity-25 pointer-events-none')}>
      <Card
        onClick={() => { if (!isDragging) onVerDetalhes(row); }}
        className={cn(
          'cursor-grab active:cursor-grabbing relative group',
          'transition-[transform,box-shadow] duration-200',
          'hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.40)]',
          row.isDeleted && 'opacity-50',
        )}
      >
        <div className="px-2.5 py-2 space-y-1.5">
          {/* nome + situação dot */}
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-semibold leading-tight truncate flex-1">{row.clienteNome}</p>
            <span className={cn('shrink-0 inline-flex h-1.5 w-1.5 mt-1.5 rounded-full', style.dot)} />
          </div>

          {/* produto + seguradora */}
          {(row.produto || row.seguradora) && (
            <p className="text-xs text-muted-foreground truncate">
              {row.produto}{row.produto && row.seguradora ? ' · ' : ''}{row.seguradora ?? ''}
            </p>
          )}

          {/* prêmio + tipo */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            {premioFmt ? (
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{premioFmt}</span>
            ) : (
              <span className="text-xs text-muted-foreground/50">Sem prêmio</span>
            )}
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', style.badge)}>
              {row.rowType === 'renovacao' ? 'Renov.' : 'Novo'}
            </span>
          </div>

          {/* vendedor */}
          {row.vendedorNome && (
            <div className="flex items-center gap-1.5 pt-0.5 border-t border-border/40">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-muted-foreground">
                {vendedorInitials}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">{row.vendedorNome}</span>
            </div>
          )}

          {/* hover expand */}
          {hasHoverContent && (
            <div className="overflow-hidden max-h-0 group-hover:max-h-16 transition-all duration-200 ease-out">
              <div className="border-t border-border/50 mt-1 pt-1.5 space-y-0.5">
                {(row.vigenciaInicio || row.vigenciaFim) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CalendarRange className="h-3 w-3 shrink-0" />
                    <span>{fmtDate(row.vigenciaInicio)} → {fmtDate(row.vigenciaFim)}</span>
                  </div>
                )}
                {comissaoFmt && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Percent className="h-3 w-3 shrink-0" />
                    <span>Comissão {comissaoFmt}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
});

// ── Board ─────────────────────────────────────────────────────────────────────

interface WorkspaceKanbanProps {
  rows: WorkspaceRow[];
  boardType: string;
  onSituacaoChange: (row: WorkspaceRow, newSituacao: SituacaoLabel, rollback: () => void) => void;
  onMoveBlocked: (row: WorkspaceRow, toColumnId: string) => void;
  onVerDetalhes: (row: WorkspaceRow) => void;
}

export function WorkspaceKanban({
  rows,
  boardType,
  onSituacaoChange,
  onMoveBlocked,
  onVerDetalhes,
}: WorkspaceKanbanProps) {
  const rowMap = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const getItemId = useCallback((row: WorkspaceRow) => row.id, []);
  const getItemColumnKey = useCallback((row: WorkspaceRow) => row.situacao, []);
  const getItemValue = useCallback((row: WorkspaceRow) => row.plAtual ?? 0, []);

  const handleMove = useCallback(
    (itemId: string, toColumnId: string, rollback: () => void) => {
      const row = rowMap.get(itemId);
      if (!row) { rollback(); return; }
      onSituacaoChange(row, toColumnId as SituacaoLabel, rollback);
    },
    [rowMap, onSituacaoChange],
  );

  const handleMoveBlocked = useCallback(
    (item: WorkspaceRow, toColumnId: string) => {
      onMoveBlocked(item, toColumnId);
    },
    [onMoveBlocked],
  );

  const renderCard = useCallback(
    (row: WorkspaceRow) => (
      <WorkspaceKanbanCard
        row={row}
        boardType={boardType}
        onVerDetalhes={onVerDetalhes}
      />
    ),
    [boardType, onVerDetalhes],
  );

  return (
    <KanbanBoardCore
      boardType={boardType}
      items={rows}
      getItemId={getItemId}
      getItemColumnKey={getItemColumnKey}
      getItemValue={getItemValue}
      columns={WORKSPACE_KANBAN_COLUMNS}
      renderCard={renderCard}
      onMove={handleMove}
      onMoveBlocked={handleMoveBlocked}
      blockedColumnIds={BLOCKED_COLUMN_IDS}
      gridColsClass="xl:grid-cols-10"
      emptyMessages={{
        'Renovar':            'Nenhuma renovação pendente',
        'Vencida':            'Nenhuma renovação vencida',
        'Iniciado':           'Nenhum iniciado',
        'Cotação Enviada':   'Nenhuma proposta enviada',
        'Aguardando Retorno': 'Nenhum aguardando retorno',
        'Fechado':            'Nenhum fechado',
        'Convertido':         'Nenhum convertido',
        'Perdido':            'Nenhum perdido',
        'Cancelado':          'Nenhum cancelado',
        'Excluído':           'Nenhum excluído',
      }}
    />
  );
}
