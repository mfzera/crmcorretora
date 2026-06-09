import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { renovacoesKeys } from '@/modules/renovacoes/http';

// Types
export type ImportacaoResumo = {
  id: string;
  nomeArquivo: string;
  status: string;
  totalLinhas: number;
  totalSucesso: number;
  totalErros: number;
  totalPulados: number;
  totalPendentes: number;
  usuarioNome: string | null;
  vendedorId: string;
  concluidoEm: string | null;
  createdAt: string;
};

export type ImportacaoItem = {
  id: string;
  importacaoId: string;
  linhaNumero: number;
  status: 'SUCESSO' | 'ERRO' | 'PULADO' | 'PENDENTE' | 'REVERTIDO';
  mensagem: string | null;
  nomeCliente: string | null;
  documentoCliente: string | null;
  produto: string | null;
  dadosLinha: Record<string, any> | null;
  renovacaoId: string | null;
  documentoVendaId: string | null;
  erroDetalhes: string | null;
  retentativas: number;
  createdAt: string;
};

export type ImportacaoDetalhe = {
  importacao: ImportacaoResumo & {
    usuarioId: string;
    vendedorNome: string | null;
    tamanhoArquivo: number | null;
    totalRevertidos: number;
  };
  itens: {
    data: ImportacaoItem[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

export type FiltrosHistorico = {
  page?: number;
  limit?: number;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
  busca?: string;
};

// Query Keys
export const importacoesKeys = {
  all: ['importacoes-renovacoes'] as const,
  lists: () => [...importacoesKeys.all, 'list'] as const,
  list: (filters: FiltrosHistorico) =>
    [...importacoesKeys.all, 'list', filters] as const,
  details: () => [...importacoesKeys.all, 'detail'] as const,
  detail: (id: string, params?: Record<string, any>) =>
    [...importacoesKeys.all, 'detail', id, params] as const,
};

// Hook: Listar histórico de importações
export function useImportacoesHistorico(filters: FiltrosHistorico = {}) {
  return useQuery({
    queryKey: importacoesKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      if (filters.status) params.status = filters.status;
      if (filters.dataInicio) params.dataInicio = filters.dataInicio;
      if (filters.dataFim) params.dataFim = filters.dataFim;
      if (filters.busca) params.busca = filters.busca;

      const result = await api.get<{
        data: ImportacaoResumo[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>('/renewal-imports', { params });
      return result;
    },
    staleTime: 30_000,
  });
}

// Hook: Detalhe de uma importação com itens paginados
export function useImportacaoDetalhe(
  id: string | null,
  params?: { page?: number; limit?: number; statusItem?: string; busca?: string },
) {
  return useQuery({
    queryKey: importacoesKeys.detail(id || '', params),
    queryFn: async () => {
      const queryParams: Record<string, string | number> = {};
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;
      if (params?.statusItem) queryParams.statusItem = params.statusItem;
      if (params?.busca) queryParams.busca = params.busca;

      const result = await api.get<ImportacaoDetalhe>(
        `/renewal-imports/${id}`,
        { params: queryParams },
      );
      return result;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

// Hook: Retry itens com erro
export function useRetryImportacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      importacaoId,
      itemIds,
    }: {
      importacaoId: string;
      itemIds?: string[];
    }) => {
      return api.post<{ retried: number; newSucesso: number; newErros: number }>(
        `/renewal-imports/${importacaoId}/retry`,
        { itemIds },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: importacoesKeys.details(),
      });
      queryClient.invalidateQueries({
        queryKey: importacoesKeys.lists(),
      });
      queryClient.invalidateQueries({ queryKey: renovacoesKeys.lists() });
    },
  });
}

// Hook: Rollback seletivo
export function useRollbackImportacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      importacaoId,
      itemIds,
    }: {
      importacaoId: string;
      itemIds: string[];
    }) => {
      return api.post<{ reverted: number; blocked: number; message: string }>(
        `/renewal-imports/${importacaoId}/rollback`,
        { itemIds },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: importacoesKeys.details(),
      });
      queryClient.invalidateQueries({
        queryKey: importacoesKeys.lists(),
      });
      queryClient.invalidateQueries({ queryKey: renovacoesKeys.lists() });
    },
  });
}

// Hook: Reprocessar itens pulados
export function useRetryPulados() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      importacaoId,
      itemIds,
    }: {
      importacaoId: string;
      itemIds?: string[];
    }) => {
      return api.post<{ retried: number; newSucesso: number; stillPulados: number }>(
        `/renewal-imports/${importacaoId}/retry-skipped`,
        { itemIds },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: importacoesKeys.details(),
      });
      queryClient.invalidateQueries({
        queryKey: importacoesKeys.lists(),
      });
      queryClient.invalidateQueries({ queryKey: renovacoesKeys.lists() });
    },
  });
}

// Hook: Processar pendentes de uma importação
export function useProcessImportPending() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      importacaoId,
      itemIds,
      clienteId,
    }: {
      importacaoId: string;
      itemIds?: string[];
      clienteId?: string;
    }) => {
      return api.post<{
        processed: number;
        newSucesso: number;
        newErros: number;
      }>(`/renewal-imports/${importacaoId}/process-pending`, {
        itemIds,
        clienteId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: importacoesKeys.details(),
      });
      queryClient.invalidateQueries({
        queryKey: importacoesKeys.lists(),
      });
      queryClient.invalidateQueries({ queryKey: renovacoesKeys.lists() });
    },
  });
}
