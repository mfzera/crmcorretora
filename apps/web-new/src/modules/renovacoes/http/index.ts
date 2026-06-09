import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';

export type ClientePendente = {
  linha: number;
  tipoPessoa: 'PF' | 'PJ';
  nome: string;
  documento: string;
  emails: string[];
  telefones: string[];
  produto: string;
  premioLiquido: string | null;
  comissao: string | null;
  vigenciaFinal: string;
  seguradora: string | null;
};

export type ResultadoImportacao = {
  importacaoId: string;
  total: number;
  sucesso: number;
  erros: number;
  pendentes: number;
  pulados: number;
};

// Query Keys
export const renovacoesKeys = {
  all: ['renovacoes'] as const,
  lists: () => [...renovacoesKeys.all, 'list'] as const,
  importar: () => [...renovacoesKeys.all, 'importar'] as const,
  gestao: (filters: FiltrosRenovacoesGestao) => [...renovacoesKeys.all, 'gestao', filters] as const,
};

// ── Tipos para gestão ────────────────────────────────────────────────────────

export type FiltrosRenovacoesGestao = {
  page?: number;
  limit?: number;
  status?: string;
  vendedorId?: string;
  vendedorIds?: string[];
  dataVencimentoInicio?: string;
  dataVencimentoFim?: string;
  search?: string;
};

export type RenovacaoGestao = {
  id: string;
  status: string;
  dataVencimento: string;
  premioAnterior: string | null;
  itemDescricao: string | null;
  produtoDescricao: string | null;
  seguradoraAnterior: string | null;
  clienteId: string | null;
  vendedorId: string;
  vendedor: { id: string; nome: string } | null;
  cliente: {
    id: string;
    nome: string | null;
    razaoSocial: string | null;
    tipoPessoa: 'PF' | 'PJ';
  } | null;
  documentoVendaAnterior: {
    id: string;
    cliente: {
      id: string;
      nome: string | null;
      razaoSocial: string | null;
      tipoPessoa: 'PF' | 'PJ';
    } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type RenovacoesGestaoResult = {
  data: RenovacaoGestao[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.token || null;
    }
  } catch {
    return null;
  }
  return null;
}

// Hook para importar renovações
export function useImportarRenovacoes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData): Promise<ResultadoImportacao> => {
      const token = getAuthToken();
      const apiUrl =
        import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${apiUrl}/renewals/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: 'Erro ao importar' }));
        throw new Error(
          error.error?.message ||
            error.message ||
            'Erro ao importar renovações',
        );
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas a renovações
      queryClient.invalidateQueries({ queryKey: renovacoesKeys.lists() });
    },
  });
}

// Hook para processar renovações pendentes após cadastro de clientes
export function useProcessPending() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      vendedorId: string;
      linhasPendentes: Array<{
        linha: number;
        documento: string;
        itemDescricao?: string;
        produtoDescricao?: string;
        seguradoraAnterior?: string;
        premioLiquido?: string;
        comissao?: string;
        vigenciaFinal: string;
        statusPlanilha?: string;
      }>;
    }): Promise<{
      total: number;
      sucesso: number;
      erros: number;
      detalhes: Array<{
        linha: number;
        status: 'sucesso' | 'erro';
        mensagem: string;
      }>;
    }> => {
      const token = getAuthToken();
      const apiUrl =
        import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${apiUrl}/renewals/process-pending`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: 'Erro ao processar' }));
        throw new Error(
          error.error?.message ||
            error.message ||
            'Erro ao processar renovações pendentes',
        );
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: renovacoesKeys.lists() });
    },
  });
}

// Hook para solicitar exclusão de renovação
export function useSolicitarExclusaoRenovacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { renovacaoId: string; motivo: string }) => {
      return api.post(`/renewals/${data.renovacaoId}/request-deletion`, {
        motivo: data.motivo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renovacoes'] });
      queryClient.invalidateQueries({ queryKey: ['area-trabalho'] });
    },
  });
}

export type SolicitacaoExclusaoRenovacao = {
  id: string;
  renovacaoId: string;
  motivo: string | null;
  status: 'PENDENTE' | 'ACEITA' | 'RECUSADA';
  criadoEm: string;
  solicitante: { id: string; nome: string; email: string };
  renovacao: {
    id: string;
    clienteId: string | null;
    cliente: { id: string; nome: string } | null;
    itemDescricao: string | null;
    produtoDescricao: string | null;
    seguradoraAnterior: string | null;
    dataVencimento: string;
    novaVigenciaInicio: string | null;
    novaVigenciaFim: string | null;
    premioAnterior: string | null;
    premioNovo: string | null;
    percentualComissaoAnterior: string | null;
    valorComissaoAnterior: string | null;
    status: string;
    observacoes: string | null;
    motivoPerda: string | null;
    createdAt: string;
  };
};

// Hook para listar solicitações de exclusão pendentes (admin)
export function useSolicitacoesExclusaoPendentes() {
  return useQuery({
    queryKey: ['renovacoes', 'solicitacoes-exclusao', 'pendentes'],
    queryFn: async () => {
      return api.get<SolicitacaoExclusaoRenovacao[]>(
        '/renewals/deletion-requests/pending',
      );
    },
  });
}

// Hook para aceitar solicitação de exclusão (admin)
export function useAceitarExclusaoRenovacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (solicitacaoId: string) => {
      return api.post(
        `/renewals/deletion-requests/${solicitacaoId}/accept`,
        {},
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renovacoes'] });
      queryClient.invalidateQueries({ queryKey: ['area-trabalho'] });
    },
  });
}

// Hook para recusar solicitação de exclusão (admin)
export function useRecusarExclusaoRenovacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      solicitacaoId: string;
      motivoRecusa: string;
    }) => {
      return api.post(
        `/renewals/deletion-requests/${data.solicitacaoId}/reject`,
        { motivoRecusa: data.motivoRecusa },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['renovacoes', 'solicitacoes-exclusao'],
      });
    },
  });
}

export type SolicitacaoExclusaoRenovacaoHistorico = SolicitacaoExclusaoRenovacao & {
  motivoRecusa: string | null;
  respondidoEm: string | null;
  respondidoPor: { id: string; nome: string; email: string } | null;
};

// Hook para listar histórico completo de solicitações de exclusão (admin)
export function useSolicitacoesExclusaoHistorico() {
  return useQuery({
    queryKey: ['renovacoes', 'solicitacoes-exclusao', 'historico'],
    queryFn: async () => {
      return api.get<SolicitacaoExclusaoRenovacaoHistorico[]>(
        '/renewals/deletion-requests',
      );
    },
  });
}

// Hook para desfazer perda de renovação (admin/gestor)
export function useDesfazerPerdaRenovacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (renovacaoId: string) => {
      return api.post(`/renewals/${renovacaoId}/undo-loss`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renovacoes'] });
      queryClient.invalidateQueries({ queryKey: ['area-trabalho'] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
    },
  });
}

// Hook para reativar renovação cancelada (admin)
export function useReativarRenovacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (renovacaoId: string) => {
      return api.post(`/renewals/${renovacaoId}/reactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renovacoes'] });
      queryClient.invalidateQueries({ queryKey: ['area-trabalho'] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
    },
  });
}

// ── Hooks de Gestão ──────────────────────────────────────────────────────────

export function useRenovacoesGestao(filters: FiltrosRenovacoesGestao) {
  const { vendedorIds, ...rest } = filters;
  const params = {
    ...rest,
    ...(vendedorIds && vendedorIds.length > 0 ? { vendedorIds: vendedorIds.join(',') } : {}),
  };
  return useQuery({
    queryKey: renovacoesKeys.gestao(filters),
    queryFn: () =>
      api.get<RenovacoesGestaoResult>('/renewals', { params }),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: (count, error: any) =>
      error?.response?.status === 403 ? false : count < 2,
  });
}

export function useCreateManualRenewal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentoVendaAnteriorId: string) =>
      api.post('/renewals/create-manual', { documentoVendaAnteriorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: renovacoesKeys.all });
    },
  });
}

// Hook para transferir renovações
export function useTransferirRenovacoes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      renovacaoIds: string[];
      novoVendedorId: string;
    }) => {
      return api.post('/renewals/transfer', data);
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['renovacoes'] });
      queryClient.invalidateQueries({ queryKey: ['renovacoes-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}
