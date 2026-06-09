import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type {
  Cliente,
  ClientesPaginados,
  CriarClienteDTO,
  AtualizarClienteDTO,
  ClienteFiltros,
} from '@/types/cliente';

// Query Keys
export const clientesKeys = {
  all: ['clientes'] as const,
  lists: () => [...clientesKeys.all, 'list'] as const,
  list: (filtros?: ClienteFiltros, pagina?: number, porPagina?: number) =>
    [...clientesKeys.lists(), { filtros, pagina, porPagina }] as const,
  details: () => [...clientesKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientesKeys.details(), id] as const,
  search: (query: string) => [...clientesKeys.all, 'search', query] as const,
};

export function clientesQueryOptions(
  filtros?: ClienteFiltros,
  pagina = 1,
  porPagina = 10,
) {
  return queryOptions({
    queryKey: clientesKeys.list(filtros, pagina, porPagina),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filtros?.tipoPessoa) params.append('tipoPessoa', filtros.tipoPessoa);
      if (filtros?.ativo !== undefined)
        params.append('ativo', String(filtros.ativo));
      if (filtros?.busca) params.append('search', filtros.busca);
      if (filtros?.cidade) params.append('cidade', filtros.cidade);
      if (filtros?.estado) params.append('estado', filtros.estado);
      if (filtros?.dataCriacaoInicio)
        params.append('dataCriacaoInicio', filtros.dataCriacaoInicio);
      if (filtros?.dataCriacaoFim)
        params.append('dataCriacaoFim', filtros.dataCriacaoFim);
      if (filtros?.vendedorId) params.append('vendedorId', filtros.vendedorId);
      if (filtros?.soTransferidos)
        params.append('soTransferidos', 'true');
      if (filtros?.isActiveCliente !== undefined)
        params.append('isActiveCliente', String(filtros.isActiveCliente));

      params.append('page', String(pagina));
      params.append('limit', String(porPagina));

      const response = await api.get<ClientesPaginados>(
        `/clients?${params.toString()}`,
      );
      return response;
    },
    retry: false,
    staleTime: 30 * 1000,
  });
}

// Hook para listar clientes com paginação
export function useClientes(
  filtros?: ClienteFiltros,
  pagina = 1,
  porPagina = 10,
) {
  return useQuery(clientesQueryOptions(filtros, pagina, porPagina));
}

// Hook para buscar um cliente por ID
export function useCliente(id: string | null) {
  return useQuery({
    queryKey: clientesKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<Cliente>(`/clients/${id}`);
      return response;
    },
    enabled: !!id,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

// Hook para buscar clientes (autocomplete/combobox)
export function useSearchClients(query: string) {
  return useQuery({
    queryKey: clientesKeys.search(query),
    queryFn: async () => {
      const response = await api.get<Cliente[]>(
        `/clients/search?q=${encodeURIComponent(query)}`,
      );
      // api.get já extrai o .data automaticamente
      return Array.isArray(response) ? response : [];
    },
    enabled: query.length >= 3,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

// Mutation para criar cliente
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CriarClienteDTO) => {
      return api.post<Cliente>('/clients', data);
    },
    onSuccess: () => {
      // Invalida todas as listas de clientes
      queryClient.invalidateQueries({ queryKey: clientesKeys.lists() });
    },
  });
}

// Mutation para criar múltiplos clientes de uma vez (import flow)
export function useCreateClientsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientes: CriarClienteDTO[]) => {
      return api.post<{ criados: number; jaExistiam: number; erros: { documento: string; motivo: string }[] }>(
        '/clients/batch',
        { clientes },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientesKeys.lists() });
    },
  });
}

// Mutation para atualizar cliente
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AtualizarClienteDTO) => {
      const { id, ...updateData } = data;
      return api.patch<Cliente>(`/clients/${id}`, updateData);
    },
    onSuccess: (data, variables) => {
      // Invalida as listas e o detalhe específico
      queryClient.invalidateQueries({ queryKey: clientesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: clientesKeys.detail(variables.id),
      });
      // Força refetch imediato
      queryClient.refetchQueries({ queryKey: clientesKeys.lists() });
    },
  });
}

// Mutation para excluir cliente
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      // Invalida todas as listas de clientes
      queryClient.invalidateQueries({ queryKey: clientesKeys.lists() });
    },
  });
}

// Mutation para ativar/desativar cliente
export function useToggleStatusCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      return api.patch<Cliente>(`/clients/${id}/status`, { ativo });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: clientesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: clientesKeys.detail(variables.id),
      });
    },
  });
}

// Mutation para transferir cliente
export function useTransferirCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      novoVendedorId,
    }: {
      id: string;
      novoVendedorId: string;
    }) => {
      return api.post(`/clients/${id}/transfer-portfolio`, {
        novoVendedorId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: clientesKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: clientesKeys.detail(variables.id),
      });
      queryClient.refetchQueries({ queryKey: clientesKeys.lists() });
    },
  });
}
