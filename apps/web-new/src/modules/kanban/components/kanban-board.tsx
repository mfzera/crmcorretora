
import { useCallback, useMemo, useState, useTransition } from 'react';
import { type DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { LayoutList, Kanban, Search, X } from 'lucide-react';
import {
  useOportunidades,
  useMoverOportunidade,
  useUpdateOportunidade,
} from '../http';
import { useProdutos } from '@/modules/produtos/http';
import { useVendedoresStats } from '@/modules/gestao-crm/http';
import { usePermissions } from '@/core/hooks/use-permissions';
import { KANBAN_COLUMNS } from '@/types/kanban';
import type { Oportunidade, OportunidadeStatus, OportunidadeTemperatura } from '@/types/kanban';
import { handleApiError } from '@/core/utils/handle-api-error';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { KanbanBoardCore, KanbanConfigDialog, useKanbanConfig, useUpdateKanbanColumn, useUpdateCustomColumn } from '@/core/kanban';
import type { KanbanColumnDef } from '@/core/kanban';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { KanbanCard } from './kanban-card';
import { KanbanTeamHeader } from './kanban-team-header';
import { KanbanActionsProvider, useKanbanActions } from './kanban-dialogs';
import { KanbanFilters, type FiltroPeriodo, type FiltroTipoData } from './kanban-filters';
import { KanbanArquivadosSection } from './kanban-arquivados-section';
import { KanbanListView } from './kanban-list-view';

function getDateRange(periodo: FiltroPeriodo): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (periodo === 'hoje') return { start: today, end: endOfDay };
  if (periodo === 'semana') {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    return { start, end };
  }
  if (periodo === 'mes') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (periodo === '7dias') {
    const start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    return { start, end: endOfDay };
  }
  const start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { start, end: endOfDay };
}

export function KanbanBoard() {
  return (
    <KanbanActionsProvider>
      <KanbanBoardInner />
    </KanbanActionsProvider>
  );
}

function KanbanBoardInner() {
  const actions = useKanbanActions();

  const [filtroProdutoId, setFiltroProdutoId] = useState('');
  const [filtroVendedorIds, setFiltroVendedorIds] = useState<string[]>([]);
  const [filtroTemperatura, setFiltroTemperatura] = useState<OportunidadeTemperatura | ''>('');
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo | ''>('');
  const [filtroDataRange, setFiltroDataRange] = useState<DateRange | undefined>();
  const [filtroTipoData, setFiltroTipoData] = useState<FiltroTipoData>('atualizacao');
  const [showArquivados, setShowArquivados] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const [filtroNome, setFiltroNome] = useState('');
  const [isFilterPending, startFilterTransition] = useTransition();

  const { hasPermission } = usePermissions();
  const podeVerTodas = hasPermission('kanban:visualizar_todas');

  const {
    data: oportunidades = [],
    isLoading,
    isFetching,
    isPlaceholderData,
    error: oportunidadesError,
  } = useOportunidades({ produtoId: filtroProdutoId || undefined });

  const { data: arquivadasCount = [] } = useOportunidades(
    { status: 'arquivada', produtoId: filtroProdutoId || undefined },
    { enabled: showArquivados },
  );
  const { data: produtosResponse } = useProdutos({ ativo: true }, 1, 100);
  const produtosList = produtosResponse?.data || [];
  const { data: vendedoresList = [] } = useVendedoresStats({ enabled: podeVerTodas });

  const moverOportunidade = useMoverOportunidade();
  const updateOportunidade = useUpdateOportunidade();
  const updateKanbanColumn = useUpdateKanbanColumn('oportunidades');
  const updateCustomColumn = useUpdateCustomColumn('oportunidades');

  const { columns, allColumns, isLoading: isConfigLoading } = useKanbanConfig('oportunidades', KANBAN_COLUMNS);

  const handleUpdateTemperatura = useCallback(
    (id: string, temperatura: OportunidadeTemperatura) => {
      updateOportunidade.mutate({ id, data: { temperatura } });
    },
    [updateOportunidade],
  );

  const handleReorderColumns = useCallback(
    (orderedColumns: KanbanColumnDef[]) => {
      orderedColumns.forEach((col, index) => {
        if (col.isCustom) {
          updateCustomColumn.mutate({ id: col.id, data: { ordem: index } });
        } else {
          updateKanbanColumn.mutate({ columnId: col.id, data: { ordem: index } });
        }
      });
    },
    [updateKanbanColumn, updateCustomColumn],
  );

  const handleReativar = useCallback(
    (id: string) => {
      moverOportunidade.mutate(
        { id, data: { novoStatus: 'lead', novaOrdem: 0 } },
        {
          onSuccess: () => toast.success('Oportunidade reativada como Lead'),
          onError: (error: unknown) => toast.error(handleApiError(error)),
        },
      );
    },
    [moverOportunidade],
  );

  const filteredOportunidades = useMemo(() => {
    let start: Date | undefined;
    let end: Date | undefined;

    if (filtroPeriodo) {
      const range = getDateRange(filtroPeriodo);
      start = range.start;
      end = range.end;
    } else if (filtroDataRange?.from) {
      start = filtroDataRange.from;
      const endDay = filtroDataRange.to ?? filtroDataRange.from;
      end = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate(), 23, 59, 59, 999);
    }

    const byDate =
      !start || !end
        ? oportunidades
        : oportunidades.filter((o) => {
            let dateStr: string | null;
            if (filtroTipoData === 'criacao') dateStr = o.createdAt;
            else if (filtroTipoData === 'fechamento') dateStr = o.dataFechamento;
            else dateStr = o.updatedAt;
            if (!dateStr) return false;
            const d = new Date(dateStr);
            return d >= start! && d <= end!;
          });

    const byTemperatura = !filtroTemperatura
      ? byDate
      : byDate.filter((o) => o.temperatura === filtroTemperatura);

    const byVendedor = filtroVendedorIds.length === 0
      ? byTemperatura
      : byTemperatura.filter((o) => filtroVendedorIds.includes(o.vendedorId ?? ''));

    if (!filtroNome.trim()) return byVendedor;
    const nome = filtroNome.trim().toLowerCase();
    return byVendedor.filter((o) => o.nomeCliente.toLowerCase().includes(nome));
  }, [oportunidades, filtroPeriodo, filtroDataRange, filtroTipoData, filtroTemperatura, filtroVendedorIds, filtroNome]);

  const totalConvertido = useMemo(
    () =>
      filteredOportunidades
        .filter((o) => o.status === 'ganha')
        .reduce((acc, o) => acc + (o.valorFechado ? parseFloat(o.valorFechado) : 0), 0),
    [filteredOportunidades],
  );

  const activeFilterCount = useMemo(
    () =>
      [filtroProdutoId, filtroVendedorIds.length > 0, filtroTemperatura, filtroPeriodo, filtroDataRange?.from]
        .filter(Boolean).length,
    [filtroProdutoId, filtroVendedorIds, filtroTemperatura, filtroPeriodo, filtroDataRange],
  );

  // Ordena os items antes de passar ao core (o core apenas agrupa por coluna)
  const sortedOportunidades = useMemo(() => {
    const ascending = filtroTipoData === 'criacao';
    const getTs = (o: Oportunidade): number => {
      if (filtroTipoData === 'atualizacao') return new Date(o.updatedAt ?? o.createdAt).getTime();
      if (filtroTipoData === 'fechamento') return new Date(o.dataFechamento ?? '').getTime() || 0;
      return new Date(o.createdAt).getTime();
    };
    return [...filteredOportunidades].sort((a, b) =>
      ascending ? getTs(a) - getTs(b) : getTs(b) - getTs(a),
    );
  }, [filteredOportunidades, filtroTipoData]);

  const getItemColumnKey = useCallback(
    (item: Oportunidade) => item.kanbanColumnKey ?? item.status,
    [],
  );

  const handleMove = useCallback(
    (itemId: string, toColumnId: string, rollback: () => void) => {
      const col = columns.find((c) => c.id === toColumnId);
      const data = col?.isCustom
        ? { kanbanColumnKey: toColumnId }
        : { novoStatus: toColumnId as OportunidadeStatus, novaOrdem: 0 };
      moverOportunidade.mutate(
        { id: itemId, data },
        { onError: (error: unknown) => { toast.error(handleApiError(error)); rollback(); } },
      );
    },
    [columns, moverOportunidade],
  );

  const handleReorder = useCallback(
    (itemId: string, columnId: string, targetItemId: string, edge: Edge, rollback: () => void) => {
      const colItems = sortedOportunidades.filter((o) => getItemColumnKey(o) === columnId);
      const sourceIdx = colItems.findIndex((o) => o.id === itemId);
      const targetIdx = colItems.findIndex((o) => o.id === targetItemId);
      let insertIdx = edge === 'top' ? targetIdx : targetIdx + 1;
      if (sourceIdx < targetIdx) insertIdx -= 1;
      const novaOrdem = Math.max(0, insertIdx);

      moverOportunidade.mutate(
        { id: itemId, data: { novoStatus: columnId as OportunidadeStatus, novaOrdem } },
        { onError: (error: unknown) => { toast.error(handleApiError(error)); rollback(); } },
      );
    },
    [sortedOportunidades, getItemColumnKey, moverOportunidade],
  );

  const handleMoveBlocked = useCallback(
    (item: Oportunidade, toColumnId: string) => {
      if (toColumnId === 'perdida') actions.onPerder(item);
      else if (toColumnId === 'ganha') actions.onFechar(item);
    },
    [actions],
  );

  const getItemValue = useCallback((item: Oportunidade, columnId: string) => {
    const v = columnId === 'ganha' ? (item.valorFechado ?? item.premioEstimado) : item.premioEstimado;
    return v ? parseFloat(v) : 0;
  }, []);

  const isFilterLoading = isFilterPending || isLoading || (isFetching && isPlaceholderData) || isConfigLoading;

  if (oportunidadesError) {
    const err = oportunidadesError as { statusCode?: number; code?: string; message?: string };
    const isForbidden = err.statusCode === 403;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center p-6">
        <p className="font-medium text-destructive">
          {isForbidden ? 'Sem permissão para visualizar oportunidades' : 'Erro ao carregar oportunidades'}
        </p>
        <p className="text-sm text-muted-foreground">
          {isForbidden
            ? 'Seu cargo não possui a permissão "kanban:visualizar". Contate o administrador.'
            : `${err.code ?? 'ERRO'}: ${err.message ?? 'Tente recarregar a página.'}`}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap px-3 sm:px-4 pb-1">
        <div className="relative flex-1 min-w-[180px] max-w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={filtroNome}
            onChange={(e) => startFilterTransition(() => setFiltroNome(e.target.value))}
            placeholder="Buscar cliente..."
            className="h-8 pl-8 pr-8 text-sm"
          />
          {filtroNome && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setFiltroNome('')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center border rounded-md overflow-hidden h-8">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 rounded-none p-0"
            onClick={() => setViewMode('kanban')}
            title="Visualização kanban"
          >
            <Kanban className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === 'lista' ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 rounded-none p-0"
            onClick={() => setViewMode('lista')}
            title="Visualização lista"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </Button>
        </div>
        <KanbanConfigDialog
          boardType="oportunidades"
          columns={columns}
          allColumns={allColumns}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <KanbanFilters
          filtroProdutoId={filtroProdutoId}
          onChangeProdutoId={(v) => startFilterTransition(() => setFiltroProdutoId(v))}
          filtroTemperatura={filtroTemperatura}
          onChangeTemperatura={(v) => startFilterTransition(() => setFiltroTemperatura(v))}
          filtroPeriodo={filtroPeriodo}
          onChangePeriodo={(v) => startFilterTransition(() => setFiltroPeriodo(v))}
          filtroDataRange={filtroDataRange}
          onChangeDataRange={(v) => startFilterTransition(() => setFiltroDataRange(v))}
          filtroTipoData={filtroTipoData}
          onChangeTipoData={(v) => startFilterTransition(() => setFiltroTipoData(v))}
          showArquivados={showArquivados}
          onToggleArquivados={() => startFilterTransition(() => setShowArquivados((v) => !v))}
          produtos={produtosList}
          filteredCount={filteredOportunidades.length}
          arquivadasCount={arquivadasCount.length}
          totalConvertido={totalConvertido}
          activeFilterCount={activeFilterCount}
          onClearAll={() =>
            startFilterTransition(() => {
              setFiltroProdutoId('');
              setFiltroVendedorIds([]);
              setFiltroTemperatura('');
              setFiltroPeriodo('');
              setFiltroDataRange(undefined);
            })
          }
        />
      </div>

      {podeVerTodas && vendedoresList.length > 0 && (
        <KanbanTeamHeader
          vendedores={vendedoresList}
          filtroVendedorIds={filtroVendedorIds}
          onToggle={(id) =>
            startFilterTransition(() =>
              setFiltroVendedorIds((prev) =>
                prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
              ),
            )
          }
          onClear={() => startFilterTransition(() => setFiltroVendedorIds([]))}
        />
      )}

      {viewMode === 'lista' ? (
        <KanbanListView
          oportunidades={sortedOportunidades}
          onEdit={actions.onEdit}
          onDelete={actions.onDelete}
          onPerder={actions.onPerder}
          onFechar={actions.onFechar}
          onShare={actions.onShare}
          onHistorico={actions.onHistorico}
          onReativar={handleReativar}
        />
      ) : (
        <KanbanBoardCore
          boardType="oportunidades"
          items={sortedOportunidades}
          getItemId={(item) => item.id}
          getItemColumnKey={getItemColumnKey}
          columns={columns}
          renderCard={(item) => (
            <KanbanCard
              oportunidade={item}
              onEdit={actions.onEdit}
              onDelete={actions.onDelete}
              onPerder={actions.onPerder}
              onFechar={actions.onFechar}
              onShare={actions.onShare}
              onHistorico={actions.onHistorico}
              onReativar={handleReativar}
              onUpdateTemperatura={handleUpdateTemperatura}
            />
          )}
          getItemValue={getItemValue}
          onMove={handleMove}
          onReorder={handleReorder}
          onReorderColumns={handleReorderColumns}
          onMoveBlocked={handleMoveBlocked}
          blockedColumnIds={['ganha', 'perdida']}
          isLoading={isFilterLoading}
          gridColsClass="xl:grid-cols-5"
        />
      )}

      {showArquivados && <KanbanArquivadosSection produtoId={filtroProdutoId} />}
    </>
  );
}
