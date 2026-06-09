
import { useCallback, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { handleApiError } from '@/core/utils/handle-api-error';
import { Button } from '@/core/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { usePermissions } from '@/core/hooks/use-permissions';
import type { Sinistro, StatusSinistro, TipoSinistro } from '@/types/sinistro';
import { SINISTRO_COLUMNS, TIPO_SINISTRO_LABELS } from '@/types/sinistro';
import { useSinistros, useMoverSinistro } from '../http';
import { SinistroKanbanCard } from './sinistro-kanban-card';
import { SinistroDetalheSheet } from './sinistro-detalhe-sheet';
import { NovoSinistroDialog } from './novo-sinistro-dialog';
import { EditarSinistroDialog } from './editar-sinistro-dialog';
import { KanbanBoardCore, KanbanConfigDialog, useKanbanConfig, useUpdateKanbanColumn, useUpdateCustomColumn } from '@/core/kanban';
import type { KanbanColumnDef } from '@/core/kanban';

const TERMINAIS: StatusSinistro[] = ['RECUSADO', 'PAGO', 'CANCELADO'];

export function SinistroKanbanBoard() {
  const [detalhesSinistro, setDetalhesSinistro] = useState<Sinistro | null>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [editarSinistro, setEditarSinistro] = useState<Sinistro | null>(null);
  const [editarOpen, setEditarOpen] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<TipoSinistro | ''>('');
  const [, startTransition] = useTransition();

  const { hasPermission } = usePermissions();
  const podeCriar = hasPermission('sinistros:criar');

  const { data: paginado, isLoading, error } = useSinistros({
    tipoSinistro: filtroTipo || undefined,
    limit: 200,
  });

  const sinistros = useMemo(() => paginado?.data ?? [], [paginado]);
  const mover = useMoverSinistro();
  const updateKanbanColumn = useUpdateKanbanColumn('sinistros');
  const updateCustomColumn = useUpdateCustomColumn('sinistros');

  const { columns, allColumns, isLoading: isConfigLoading } = useKanbanConfig('sinistros', SINISTRO_COLUMNS);

  const sinistroMap = useMemo(
    () => new Map(sinistros.map((s) => [s.id, s])),
    [sinistros],
  );

  const handleDetalhes = useCallback((sinistro: Sinistro) => {
    startTransition(() => {
      setDetalhesSinistro(sinistro);
      setDetalhesOpen(true);
    });
  }, []);

  const handleEditar = useCallback((sinistro: Sinistro) => {
    startTransition(() => {
      setEditarSinistro(sinistro);
      setEditarOpen(true);
    });
  }, []);

  const handleMove = useCallback(
    (itemId: string, toColumnId: string, rollback: () => void) => {
      const sinistro = sinistroMap.get(itemId);
      if (sinistro && TERMINAIS.includes(sinistro.status)) {
        toast.error(`Sinistros "${sinistro.status}" não podem ser movidos`);
        rollback();
        return;
      }
      mover.mutate(
        { id: itemId, data: { novoStatus: toColumnId as StatusSinistro } },
        { onError: (err: unknown) => { toast.error(handleApiError(err)); rollback(); } },
      );
    },
    [sinistroMap, mover],
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

  const getItemValue = useCallback((item: Sinistro) => {
    return item.valorReclamado ? parseFloat(item.valorReclamado) : 0;
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Carregando sinistros...</p>
      </div>
    );
  }

  if (error) {
    const err = error as { statusCode?: number; message?: string };
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="font-medium text-destructive">
          {err.statusCode === 403
            ? 'Sem permissão para visualizar sinistros'
            : 'Erro ao carregar sinistros'}
        </p>
        <p className="text-sm text-muted-foreground">{err.message}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 px-3 sm:px-4 pb-3">
        <Select
          value={filtroTipo || '__all__'}
          onValueChange={(v) =>
            startTransition(() => setFiltroTipo(v === '__all__' ? '' : (v as TipoSinistro)))
          }
        >
          <SelectTrigger className="w-full sm:w-[200px] h-9 sm:h-8 text-sm">
            <SelectValue placeholder="Tipo de sinistro" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="__all__">Todos os tipos</SelectItem>
            {Object.entries(TIPO_SINISTRO_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtroTipo && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 sm:h-8 px-2 text-xs self-start sm:self-auto"
            onClick={() => startTransition(() => setFiltroTipo(''))}
          >
            <X className="h-3 w-3 mr-1" /> Limpar
          </Button>
        )}

        <KanbanConfigDialog boardType="sinistros" columns={columns} allColumns={allColumns} />

        {podeCriar && (
          <div className="sm:ml-auto">
            <Button size="sm" className="h-9 sm:h-8 gap-1.5 w-full sm:w-auto" onClick={() => setNovoOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Novo sinistro
            </Button>
          </div>
        )}
      </div>

      <KanbanBoardCore
        boardType="sinistros"
        items={sinistros}
        getItemId={(item) => item.id}
        getItemColumnKey={(item) => item.status}
        columns={columns}
        renderCard={(item) => (
          <SinistroKanbanCard
            sinistro={item}
            canDrag={!TERMINAIS.includes(item.status)}
            onDetalhes={handleDetalhes}
            onHistorico={handleDetalhes}
            onEditar={handleEditar}
          />
        )}
        getItemValue={(item) => getItemValue(item)}
        onMove={handleMove}
        onReorderColumns={handleReorderColumns}
        isLoading={isConfigLoading}
        gridColsClass="xl:grid-cols-6"
      />

      <SinistroDetalheSheet
        sinistro={detalhesSinistro}
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
      />
      <NovoSinistroDialog open={novoOpen} onOpenChange={setNovoOpen} />
      <EditarSinistroDialog
        sinistro={editarSinistro}
        open={editarOpen}
        onOpenChange={setEditarOpen}
      />
    </>
  );
}
