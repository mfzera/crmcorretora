import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type { Oportunidade } from '@/types/kanban';

// Types
export interface VendedorStats {
  id: string;
  nome: string;
  email: string;
  avatarUrl?: string | null;
  stats: {
    total: number;
    leads: number;
    contatoInicial: number;
    negociacao: number;
    ganhas: number;
    perdidas: number;
    valorTotal: number;
    valorEstimado: number;
    taxaConversao: number;
  };
}

export interface EstatisticasGerais {
  geral: {
    totalOportunidades: number;
    totalLeads: number;
    totalContatoInicial: number;
    totalNegociacao: number;
    totalGanhas: number;
    totalPerdidas: number;
    valorTotalGanho: number;
    valorEmNegociacao: number;
    taxaConversao: number;
  };
  prioridade: Array<{ prioridade: string; count: number }>;
  temperatura: Array<{ temperatura: string; count: number }>;
}

export interface NovaOportunidadeInput {
  vendedorId: string;
  nomeCliente: string;
  emailCliente?: string;
  telefoneCliente?: string;
  clienteId?: string;
  status?: string;
  prioridade?: 'baixa' | 'media' | 'alta';
  temperatura?: 'frio' | 'morno' | 'quente';
  premioEstimado?: number;
  dataVencimento?: string;
  observacoes?: string;
  tags?: string[];
  origem?: string;
}

// Queries
export function vendedoresStatsQueryOptions() {
  return {
    queryKey: ['gestao-crm', 'vendedores'] as const,
    queryFn: async () => {
      const response = await api.get<VendedorStats[]>('/crm-management/sellers');
      return response;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  };
}

export function useVendedoresStats({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ ...vendedoresStatsQueryOptions(), enabled });
}

export function useOportunidadesGestao(params?: {
  vendedorId?: string;
  status?: string;
  enabled?: boolean;
}) {
  const { enabled = true, ...queryParams } = params ?? {};
  return useQuery({
    queryKey: ['gestao-crm', 'oportunidades', queryParams],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (queryParams.vendedorId) searchParams.set('vendedorId', queryParams.vendedorId);
      if (queryParams.status) searchParams.set('status', queryParams.status);

      const url = `/crm-management/overview?${searchParams.toString()}`;

      const response = await api.get<Oportunidade[]>(url);

      return response;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useEstatisticasCRM({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['gestao-crm', 'estatisticas'],
    queryFn: async () => {
      const response = await api.get<EstatisticasGerais>(
        '/crm-management/statistics',
      );
      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// Mutations
export function useCreateManagerOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NovaOportunidadeInput) => {
      const response = await api.post<Oportunidade>(
        '/crm-management/opportunities',
        data,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-crm'] });
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
    },
  });
}

export function useReatribuirOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      novoVendedorId,
    }: {
      id: string;
      novoVendedorId: string;
    }) => {
      const response = await api.patch<Oportunidade>(
        `/crm-management/opportunities/${id}/reassign`,
        { novoVendedorId },
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-crm'] });
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
    },
  });
}

export function useDeletarOportunidadeGestor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm-management/opportunities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-crm'] });
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
    },
  });
}

// Configurações do CRM
export interface ConfigCRM {
  prioridadeAutomatica?: {
    habilitado: boolean;
    diasBaixa: number;
    diasMedia: number;
    diasAlta: number;
    diasUrgente: number;
  };
}

export function useConfigCRM() {
  return useQuery({
    queryKey: ['gestao-crm', 'config'],
    queryFn: async () => {
      const response = await api.get<ConfigCRM>('/crm-management/config');
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateCRMConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConfigCRM) => {
      const response = await api.patch<ConfigCRM>('/crm-management/config', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-crm', 'config'] });
    },
  });
}
