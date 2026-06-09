import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AgGridReact } from 'ag-grid-react';
import type { CellValueChangedEvent, CellEditingStartedEvent } from 'ag-grid-community';
import {
  areaTrabalhoKeys,
  useUpdateQuote,
  useUpdateRenovacaoStatus,
  useUpdateRenovacaoValues,
} from '@/modules/area-trabalho/http';
import { handleApiError } from '@/core/utils/handle-api-error';
import { situacaoToEtapa, situacaoToRenovacaoStatus, SITUACOES_BLOQUEADAS } from '../helpers';
import type { SelectOption, WorkspaceRow } from '../types';

type GridRef = React.RefObject<AgGridReact<WorkspaceRow> | null>;

interface UseWorkspaceInlineEditParams {
  gridRefRen: GridRef;
  gridRefNS: GridRef;
  filtros: { vigenciaInicio: string; vigenciaFim: string };
  vendedoresOptions: SelectOption[];
  produtosOptions: SelectOption[];
  seguradorasOptions: SelectOption[];
}

export function useWorkspaceInlineEdit({
  gridRefRen,
  gridRefNS,
  filtros,
  vendedoresOptions,
  produtosOptions,
  seguradorasOptions,
}: UseWorkspaceInlineEditParams) {
  const queryClient = useQueryClient();
  const updateQuoteMutation = useUpdateQuote();
  const updateRenovacaoStatusMutation = useUpdateRenovacaoStatus();
  const updateRenovacaoValuesMutation = useUpdateRenovacaoValues();

  const pendingCotacaoPatch = useRef<Record<string, unknown>>({});
  const pendingRenovacaoValues = useRef<Record<string, unknown>>({});
  const pendingCotacaoRowId = useRef<string | null>(null);
  const pendingRenovacaoRowId = useRef<string | null>(null);
  const debounceTimerCot = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRen = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollbackData = useRef<{ rowId: string; snapshot: WorkspaceRow } | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerCot.current) clearTimeout(debounceTimerCot.current);
      if (debounceTimerRen.current) clearTimeout(debounceTimerRen.current);
    };
  }, []);

  const rollbackRow = useCallback((rowId: string, snapshot: WorkspaceRow) => {
    for (const ref of [gridRefRen, gridRefNS]) {
      const node = ref.current?.api.getRowNode(rowId);
      if (node) {
        Object.assign(node.data!, snapshot);
        ref.current?.api.refreshCells({ rowNodes: [node], force: true });
        return;
      }
    }
  }, [gridRefRen, gridRefNS]);

  const onCellEditingStarted = useCallback((event: CellEditingStartedEvent<WorkspaceRow>) => {
    const { data } = event;
    if (!data) return;
    if (!rollbackData.current || rollbackData.current.rowId !== data.id) {
      rollbackData.current = { rowId: data.id, snapshot: { ...data } };
    }
  }, []);

  const onDirectUpdate = useCallback((
    row: WorkspaceRow,
    colId: 'col_seguradora' | 'col_produto' | 'col_vendedor' | 'col_vendedor_secundario',
    newId: string | null,
  ) => {
    const cotacaoId = row.cotacaoId || (row.rowType === 'cotacao' ? row.id : null);
    if (!cotacaoId) return;

    const patch: Record<string, unknown> = {};
    if (colId === 'col_seguradora') patch.seguradoraParceiraId = newId;
    else if (colId === 'col_produto') patch.produtoId = newId;
    else if (colId === 'col_vendedor') patch.vendedorId = newId;
    else if (colId === 'col_vendedor_secundario') patch.vendedorSecundarioId = newId;

    queryClient.cancelQueries({ queryKey: areaTrabalhoKeys.cotacoes() });

    const applyPatch = (c: any) => {
      if (colId === 'col_seguradora') {
        const opt = seguradorasOptions.find((s) => s.id === newId);
        return { ...c, seguradoraParceiraId: newId, seguradoraParceira: { ...(c.seguradoraParceira ?? {}), nomeFantasia: opt?.label } };
      }
      if (colId === 'col_produto') {
        const opt = produtosOptions.find((p) => p.id === newId);
        return { ...c, produtoId: newId, produto: { ...(c.produto ?? {}), nomeProduto: opt?.label } };
      }
      if (colId === 'col_vendedor') {
        const opt = vendedoresOptions.find((v) => v.id === newId);
        return { ...c, vendedorId: newId, vendedor: { ...(c.vendedor ?? {}), nome: opt?.label, avatarUrl: opt?.avatarUrl ?? null } };
      }
      if (colId === 'col_vendedor_secundario') {
        return { ...c, vendedorSecundarioId: newId, vendedorSecundario: newId ? { ...(c.vendedorSecundario ?? {}), id: newId } : null };
      }
      return c;
    };

    queryClient.setQueryData<any[]>(areaTrabalhoKeys.cotacoes(), (old) => {
      if (!Array.isArray(old)) return old;
      return old.map((c) => (c.id === cotacaoId ? applyPatch(c) : c));
    });

    queryClient.setQueryData<any>([...areaTrabalhoKeys.cotacoes(), cotacaoId], (old: any) => {
      const base = old ?? (queryClient.getQueryData<any[]>(areaTrabalhoKeys.cotacoes()) as any[])?.find((c: any) => c.id === cotacaoId);
      return base ? applyPatch(base) : old;
    });

    // Mantém os campos do WorkspaceRow em sincronia para filtros e avatar
    if (colId === 'col_vendedor') {
      const opt = vendedoresOptions.find((v) => v.id === newId);
      row.vendedorId = newId;
      row.vendedorAvatar = opt?.avatarUrl ?? null;
    } else if (colId === 'col_vendedor_secundario') {
      row.vendedorSecundarioId = newId;
    } else if (colId === 'col_produto') {
      row.produtoId = newId;
    } else if (colId === 'col_seguradora') {
      row.seguradoraId = newId;
    }

    const rollbackRowId = row.renovacaoId || row.id;
    const snapshot = rollbackData.current?.rowId === rollbackRowId ? rollbackData.current.snapshot : null;
    rollbackData.current = null;

    for (const ref of [gridRefRen, gridRefNS]) {
      const node = ref.current?.api.getRowNode(rollbackRowId);
      if (node) {
        ref.current?.api.refreshCells({ rowNodes: [node], force: true });
        break;
      }
    }

    updateQuoteMutation.mutate({ id: cotacaoId, data: patch }, {
      onError: (err) => {
        if (snapshot) rollbackRow(rollbackRowId, snapshot);
        toast.error(handleApiError(err));
      },
    });
  }, [updateQuoteMutation, rollbackRow, queryClient, seguradorasOptions, produtosOptions, vendedoresOptions]);

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<WorkspaceRow>) => {
      const { data, colDef } = event;
      if (!data) return;

      const field = colDef.field as string | undefined;
      const colId = colDef.colId as string | undefined;

      const flushCotacaoPatch = (cotacaoId: string, rollbackRowId: string) => {
        pendingCotacaoRowId.current = cotacaoId;
        // Atualiza cache imediatamente para evitar revert visual enquanto aguarda debounce
        queryClient.setQueryData<any[]>(areaTrabalhoKeys.cotacoes(), (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((c) => c.id === cotacaoId ? { ...c, ...pendingCotacaoPatch.current } : c);
        });
        if (debounceTimerCot.current) clearTimeout(debounceTimerCot.current);
        debounceTimerCot.current = setTimeout(() => {
          const id = pendingCotacaoRowId.current!;
          const patch = { ...pendingCotacaoPatch.current };
          const snapshot = rollbackData.current?.rowId === rollbackRowId ? rollbackData.current.snapshot : null;
          pendingCotacaoPatch.current = {};
          rollbackData.current = null;
          updateQuoteMutation.mutate({ id, data: patch }, {
            onError: (err) => {
              if (snapshot) rollbackRow(rollbackRowId, snapshot);
              toast.error(handleApiError(err));
            },
          });
        }, 600);
      };

      if (data.rowType === 'cotacao') {
        const cotacaoId = data.cotacaoId!;
        if (field === 'plAtual')            pendingCotacaoPatch.current.premioLiquido = data.plAtual;
        else if (field === 'comissaoPct')    pendingCotacaoPatch.current.percentualComissao = data.comissaoPct;
        else if (field === 'vigenciaInicio') pendingCotacaoPatch.current.vigenciaInicio = data.vigenciaInicio;
        else if (field === 'vigenciaFim')    pendingCotacaoPatch.current.vigenciaFim = data.vigenciaFim;
        else if (colId === 'col_situacao') {
          if (data.situacao === 'Fechado') {
            pendingCotacaoPatch.current.isFechado = true;
          } else {
            pendingCotacaoPatch.current.isFechado = false;
            const etapa = situacaoToEtapa(data.situacao);
            if (etapa) pendingCotacaoPatch.current.etapa = etapa;
          }
        }
        else return;
        flushCotacaoPatch(cotacaoId, cotacaoId);

      } else if (data.rowType === 'renovacao') {
        const renovacaoId = data.renovacaoId!;
        const snapshot = rollbackData.current?.rowId === renovacaoId ? rollbackData.current.snapshot : null;

        if (colId === 'col_situacao') {
          if (snapshot?.situacao && SITUACOES_BLOQUEADAS.has(snapshot.situacao)) {
            if (snapshot) rollbackRow(renovacaoId, snapshot);
            return;
          }
          if (data.situacao === 'Fechado' && data.cotacaoId) {
            rollbackData.current = null;
            updateQuoteMutation.mutate({ id: data.cotacaoId, data: { isFechado: true } }, {
              onSuccess: () => queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) }),
              onError: (err) => { if (snapshot) rollbackRow(renovacaoId, snapshot); toast.error(handleApiError(err)); },
            });
            return;
          }
          if (data.cotacaoId && (data.situacao === 'Iniciado' || data.situacao === 'Cotação Enviada' || data.situacao === 'Aguardando Retorno')) {
            const cotacaoSnap = rollbackData.current?.snapshot?._cotacao;
            if ((cotacaoSnap as any)?.isFechado) {
              rollbackData.current = null;
              const etapa = situacaoToEtapa(data.situacao);
              const status = situacaoToRenovacaoStatus(data.situacao);
              updateQuoteMutation.mutate({ id: data.cotacaoId, data: { isFechado: false, ...(etapa ? { etapa } : {}) } }, {
                onSuccess: () => {
                  if (status) updateRenovacaoStatusMutation.mutate({ id: renovacaoId, status }, {
                    onSuccess: () => queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) }),
                  });
                  else queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) });
                },
                onError: (err) => { if (snapshot) rollbackRow(renovacaoId, snapshot); toast.error(handleApiError(err)); },
              });
              return;
            }
          }
          const status = situacaoToRenovacaoStatus(data.situacao);
          if (!status) return;
          rollbackData.current = null;
          updateRenovacaoStatusMutation.mutate({ id: renovacaoId, status }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) });
            },
            onError: (err) => {
              if (snapshot) rollbackRow(renovacaoId, snapshot);
              toast.error(handleApiError(err));
            },
          });

        } else if (data.cotacaoId && (field === 'plAtual' || field === 'comissaoPct')) {
          // Linha com cotacao linkada: prêmio/comissão vão para a cotação; vigência sempre vai para novaVigencia* da renovação
          if (field === 'plAtual')            pendingCotacaoPatch.current.premioLiquido = data.plAtual;
          else if (field === 'comissaoPct')    pendingCotacaoPatch.current.percentualComissao = data.comissaoPct;
          flushCotacaoPatch(data.cotacaoId, renovacaoId);

        } else {
          // Linha sem cotacao: vigência vai para novaVigencia* da renovação
          if (field === 'comissaoPct')
            pendingRenovacaoValues.current.percentualComissaoNovo = data.comissaoPct;
          else if (field === 'vigenciaInicio') {
            if (data.vigenciaInicio == null) return;
            pendingRenovacaoValues.current.novaVigenciaInicio = data.vigenciaInicio;
          }
          else if (field === 'vigenciaFim') {
            if (data.vigenciaFim == null) return;
            pendingRenovacaoValues.current.novaVigenciaFim = data.vigenciaFim;
          }
          else return;

          pendingRenovacaoRowId.current = renovacaoId;
          if (debounceTimerRen.current) clearTimeout(debounceTimerRen.current);
          debounceTimerRen.current = setTimeout(() => {
            const id = pendingRenovacaoRowId.current!;
            const values = { ...pendingRenovacaoValues.current } as any;
            const snap = rollbackData.current?.rowId === id ? rollbackData.current.snapshot : null;
            pendingRenovacaoValues.current = {};
            rollbackData.current = null;
            updateRenovacaoValuesMutation.mutate({ id, data: values }, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.planilha(filtros) });
              },
              onError: (err) => {
                if (snap) rollbackRow(id, snap);
                toast.error(handleApiError(err));
              },
            });
          }, 600);
        }
      }
    },
    [queryClient, filtros, updateQuoteMutation, updateRenovacaoStatusMutation, updateRenovacaoValuesMutation, rollbackRow],
  );

  return {
    rollbackData,
    onCellEditingStarted,
    onDirectUpdate,
    onCellValueChanged,
  };
}
