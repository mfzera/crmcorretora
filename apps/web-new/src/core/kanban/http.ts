import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type { KanbanBoardConfig, KanbanColumnDef, KanbanDefaultColumn } from './types';

export const kanbanConfigKeys = {
  all: ['kanban-config'] as const,
  board: (boardType: string) => [...kanbanConfigKeys.all, boardType] as const,
};

function mergeColumns(
  defaults: KanbanDefaultColumn[],
  config: KanbanBoardConfig,
): { all: KanbanColumnDef[]; visible: KanbanColumnDef[] } {
  const configMap = new Map(config.standardConfigs.map((c) => [c.columnId, c]));

  const standard: KanbanColumnDef[] = defaults.map((col, i) => {
    const override = configMap.get(col.id);
    return {
      id: col.id,
      title: override?.label ?? col.title,
      color: override?.color ?? col.color,
      headerBg: col.headerBg,
      visible: override?.visible ?? true,
      ordem: override?.ordem ?? i,
      isCustom: false,
      isTerminal: col.isTerminal,
    };
  });

  const custom: KanbanColumnDef[] = config.customColumns.map((col) => {
    const override = configMap.get(col.id);
    return {
      id: col.id,
      title: col.label,
      color: col.color,
      visible: override?.visible ?? true,
      ordem: col.ordem,
      isCustom: true,
      isTerminal: col.isTerminal,
    };
  });

  const all = [...standard, ...custom].sort((a, b) => a.ordem - b.ordem);
  return { all, visible: all.filter((c) => c.visible) };
}

export function useKanbanConfig(boardType: string, defaults: KanbanDefaultColumn[]) {
  const { data, isLoading } = useQuery({
    queryKey: kanbanConfigKeys.board(boardType),
    queryFn: () => api.get<KanbanBoardConfig>(`/kanban-config/${boardType}`),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const fallback: KanbanColumnDef[] = defaults.map((col, i) => ({
    ...col,
    visible: true,
    ordem: i,
    isCustom: false,
  }));

  const merged = data ? mergeColumns(defaults, data) : { all: fallback, visible: fallback };

  return {
    /** Apenas colunas visíveis — usar no board */
    columns: merged.visible,
    /** Todas as colunas incluindo ocultas — usar no dialog de configuração */
    allColumns: merged.all,
    isLoading,
    rawConfig: data,
  };
}

export function useUpdateKanbanColumn(boardType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      columnId,
      data,
    }: {
      columnId: string;
      data: { visible?: boolean; ordem?: number; label?: string | null; color?: string | null };
    }) => api.patch(`/kanban-config/${boardType}/columns/${columnId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kanbanConfigKeys.board(boardType) }),
  });
}

export function useCreateCustomColumn(boardType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { label: string; color: string; isTerminal?: boolean; ordem?: number }) =>
      api.post(`/kanban-config/${boardType}/columns/custom`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kanbanConfigKeys.board(boardType) }),
  });
}

export function useUpdateCustomColumn(boardType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { label?: string; color?: string; isTerminal?: boolean; ordem?: number; visible?: boolean };
    }) => api.patch(`/kanban-config/${boardType}/columns/custom/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kanbanConfigKeys.board(boardType) }),
  });
}

export function useDeleteCustomColumn(boardType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/kanban-config/${boardType}/columns/custom/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kanbanConfigKeys.board(boardType) }),
  });
}
