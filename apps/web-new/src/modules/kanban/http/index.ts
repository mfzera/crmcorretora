import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { documentosVendaKeys } from '@/modules/documentos-venda/http';
import { areaTrabalhoKeys } from '@/modules/area-trabalho/http';
import type {
  Oportunidade,
  OportunidadeStatus,
  CreateOportunidadeDto,
  UpdateOportunidadeDto,
  MoverOportunidadeDto,
  FecharOportunidadeDto,
  PerderOportunidadeDto,
  TransferirOportunidadeDto,
  OportunidadeTransferencia,
  OportunidadeHistorico,
} from '@/types/kanban';

// Query Keys
export const oportunidadesKeys = {
  all: ['oportunidades'] as const,
  lists: () => [...oportunidadesKeys.all, 'list'] as const,
  list: (filters?: { status?: OportunidadeStatus; vendedorId?: string; produtoId?: string }) =>
    [...oportunidadesKeys.lists(), filters ?? {}] as const,
  details: () => [...oportunidadesKeys.all, 'detail'] as const,
  detail: (id: string) => [...oportunidadesKeys.details(), id] as const,
  ganhasSemCliente: () => [...oportunidadesKeys.all, 'ganhas-sem-cliente'] as const,
};

// List Oportunidades
export function oportunidadesQueryOptions(filters?: {
  status?: OportunidadeStatus;
  vendedorId?: string;
  produtoId?: string;
}) {
  return {
    queryKey: oportunidadesKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.vendedorId) params.append('vendedorId', filters.vendedorId);
      if (filters?.produtoId) params.append('produtoId', filters.produtoId);

      const queryString = params.toString();
      const endpoint = queryString ? `/opportunities?${queryString}` : '/opportunities';

      const response = await api.get<Oportunidade[]>(endpoint);
      return response || [];
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  };
}

export function useOportunidades(
  filters?: {
    status?: OportunidadeStatus;
    vendedorId?: string;
    produtoId?: string;
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    ...oportunidadesQueryOptions(filters),
    enabled: options?.enabled ?? true,
  });
}

// Get Oportunidade by ID
export function useOportunidade(id: string | null) {
  return useQuery({
    queryKey: oportunidadesKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) throw new Error('ID é obrigatório');
      const response = await api.get<Oportunidade>(`/opportunities/${id}`);
      return response;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Create Oportunidade
export function useCreateOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOportunidadeDto) => {
      const response = await api.post<Oportunidade>('/opportunities', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oportunidadesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['kpis', 'kanban'] });
    },
  });
}

// Update Oportunidade
export function useUpdateOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateOportunidadeDto;
    }) => {
      const response = await api.patch<Oportunidade>(
        `/opportunities/${id}`,
        data,
      );
      return response;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: oportunidadesKeys.lists() });

      const previousList = queryClient.getQueryData<Oportunidade[]>(
        oportunidadesKeys.list({}),
      );

      if (previousList) {
        queryClient.setQueryData<Oportunidade[]>(
          oportunidadesKeys.list({}),
          (old) => old?.map((o) => (o.id === id ? ({ ...o, ...data } as Oportunidade) : o)) ?? old,
        );
      }

      return { previousList };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(oportunidadesKeys.list({}), context.previousList);
      }
    },
    onSuccess: (updated) => {
      // Merge com dados existentes para preservar relações (vendedor, cliente, produto)
      queryClient.setQueryData<Oportunidade[]>(
        oportunidadesKeys.list({}),
        (old) => old?.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)) ?? old,
      );
      queryClient.invalidateQueries({
        queryKey: oportunidadesKeys.detail(updated.id),
        refetchType: 'none',
      });
      queryClient.invalidateQueries({ queryKey: ['kpis', 'kanban'], refetchType: 'none' });
    },
  });
}

// Mover Oportunidade
export function useMoverOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: MoverOportunidadeDto;
    }) => {
      const response = await api.patch<Oportunidade>(
        `/opportunities/${id}/move`,
        data,
      );
      return response;
    },
    onMutate: async ({ id, data: { novoStatus, novaOrdem } }) => {
      // Cancela refetches em andamento para não sobrescrever o optimistic update
      await queryClient.cancelQueries({ queryKey: oportunidadesKeys.lists() });

      const previousOportunidades = queryClient.getQueryData<Oportunidade[]>(
        oportunidadesKeys.list({}),
      );

      // Aplica o optimistic update
      queryClient.setQueryData<Oportunidade[]>(
        oportunidadesKeys.list({}),
        (old) => {
          if (!old) return old;
          return old.map((o) =>
            o.id === id
              ? {
                  ...o,
                  ...(novoStatus !== undefined && { status: novoStatus }),
                  ...(novaOrdem !== undefined && { ordem: novaOrdem }),
                }
              : o,
          );
        },
      );

      return { previousOportunidades };
    },
    onError: (_err, _variables, context) => {
      // Reverte em caso de erro
      if (context?.previousOportunidades) {
        queryClient.setQueryData(
          oportunidadesKeys.list({}),
          context.previousOportunidades,
        );
      }
    },
    onSuccess: (updatedOportunidade) => {
      // Atualiza o item específico no cache com a resposta real do servidor
      queryClient.setQueryData<Oportunidade[]>(
        oportunidadesKeys.list({}),
        (old) => {
          if (!old) return old;
          return old.map((o) =>
            o.id === updatedOportunidade.id ? updatedOportunidade : o,
          );
        },
      );
      // Invalida KPIs em background sem forçar refetch imediato
      queryClient.invalidateQueries({
        queryKey: ['kpis', 'kanban'],
        refetchType: 'none',
      });
    },
  });
}

// Fechar Oportunidade (Ganha)
export function useFecharOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: FecharOportunidadeDto;
    }) => {
      const response = await api.post<Oportunidade>(
        `/opportunities/${id}/close`,
        data,
      );
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: oportunidadesKeys.lists() });
      // Só invalida ganhas-sem-cliente se fechou sem clienteId vinculado
      if (!data.clienteId) {
        queryClient.invalidateQueries({ queryKey: oportunidadesKeys.ganhasSemCliente() });
      }
      // KPIs e área de trabalho: lazy — só refetch se o componente estiver montado
      queryClient.invalidateQueries({ queryKey: ['kpis', 'kanban'], refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.lists(), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes(), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo(), refetchType: 'none' });
    },
  });
}

// Oportunidades ganhas aguardando cadastro de cliente
export function useOportunidadesPendentesCadastroCliente() {
  return useQuery({
    queryKey: oportunidadesKeys.ganhasSemCliente(),
    queryFn: async () => {
      const response = await api.get<any[]>('/opportunities/won-without-client');
      return response || [];
    },
    staleTime: 30 * 1000,
  });
}

// Confirmar cliente e criar cotação para oportunidade ganha sem cliente
export function useConfirmarClienteOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clienteId }: { id: string; clienteId: string }) => {
      return api.post(`/opportunities/${id}/confirm-client`, { clienteId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oportunidadesKeys.ganhasSemCliente() });
      queryClient.invalidateQueries({ queryKey: oportunidadesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
    },
  });
}

// Vincular Cliente à Oportunidade
export function useVincularCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clienteId }: { id: string; clienteId: string }) => {
      return api.post(`/opportunities/${id}/link-client`, { clienteId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oportunidadesKeys.lists() });
    },
  });
}

// Perder Oportunidade
export function usePerderOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: PerderOportunidadeDto;
    }) => {
      const response = await api.post<Oportunidade>(
        `/opportunities/${id}/mark-as-lost`,
        data,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oportunidadesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['kpis', 'kanban'] });
    },
  });
}

// Delete Oportunidade
export function useDeleteOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/opportunities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oportunidadesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['kpis', 'kanban'] });
    },
  });
}

// Transferir Oportunidade
export function useTransferirOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: TransferirOportunidadeDto;
    }) => {
      const response = await api.post<Oportunidade>(
        `/opportunities/${id}/transfer`,
        data,
      );
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: oportunidadesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: oportunidadesKeys.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: ['kpis', 'kanban'] });
    },
  });
}

// Get Histórico de Eventos
export function useHistoricoOportunidade(oportunidadeId: string | null) {
  return useQuery({
    queryKey: ['oportunidades', 'historico', oportunidadeId ?? ''] as const,
    queryFn: async () => {
      if (!oportunidadeId) throw new Error('ID é obrigatório');
      const response = await api.get<OportunidadeHistorico[]>(
        `/opportunities/${oportunidadeId}/history`,
      );
      return response || [];
    },
    enabled: !!oportunidadeId,
    staleTime: 60 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

// Get Histórico de Transferências
export function useHistoricoTransferencias(oportunidadeId: string | null) {
  return useQuery({
    queryKey: [
      'oportunidades',
      'transferencias',
      oportunidadeId ?? '',
    ] as const,
    queryFn: async () => {
      if (!oportunidadeId) throw new Error('ID é obrigatório');
      const response = await api.get<OportunidadeTransferencia[]>(
        `/opportunities/${oportunidadeId}/transfer-history`,
      );
      return response || [];
    },
    enabled: !!oportunidadeId,
    staleTime: 60 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}
