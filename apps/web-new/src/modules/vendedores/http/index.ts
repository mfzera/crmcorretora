import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { api } from '@/infra/http/api';

export type VendedorTipo = 'principal' | 'secundario' | 'externo';

export interface Vendedor {
  id: string;
  corretoraId: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tipo: VendedorTipo;
  observacoes: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListVendedoresParams {
  page?: number;
  limit?: number;
  search?: string;
  tipo?: VendedorTipo;
  ativo?: 'true' | 'false';
}

export interface ListVendedoresResponse {
  data: Vendedor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateVendedorDTO {
  nome: string;
  email?: string;
  telefone?: string;
  tipo: VendedorTipo;
  observacoes?: string;
}

export interface UpdateVendedorDTO {
  nome?: string;
  email?: string | null;
  telefone?: string | null;
  tipo?: VendedorTipo;
  observacoes?: string | null;
  ativo?: boolean;
}

export const vendedoresKeys = {
  all: ['vendedores'] as const,
  lists: () => [...vendedoresKeys.all, 'list'] as const,
  list: (filters?: any) => [...vendedoresKeys.lists(), filters] as const,
  details: () => [...vendedoresKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendedoresKeys.details(), id] as const,
  select: () => [...vendedoresKeys.all, 'select'] as const,
};

export function vendedoresQueryOptions(params?: ListVendedoresParams) {
  return queryOptions({
    queryKey: vendedoresKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', String(params.page));
      if (params?.limit) searchParams.append('limit', String(params.limit));
      if (params?.search) searchParams.append('search', params.search);
      if (params?.tipo) searchParams.append('tipo', params.tipo);
      if (params?.ativo) searchParams.append('ativo', params.ativo);

      const qs = searchParams.toString();
      const response = await api.get<ListVendedoresResponse>(
        qs ? `/vendedores?${qs}` : '/vendedores',
      );

      const meta = (response as any)?.meta;
      if (meta) {
        return {
          data: (response as any).data ?? [],
          pagination: {
            page: meta.page,
            limit: meta.limit,
            total: meta.total,
            totalPages: meta.totalPages,
          },
        } as ListVendedoresResponse;
      }

      return response as ListVendedoresResponse;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });
}

export function useVendedoresSelect() {
  return useQuery({
    queryKey: vendedoresKeys.select(),
    queryFn: async () => {
      const response = await api.get<{ id: string; nome: string; tipo: VendedorTipo }[]>(
        '/vendedores?select=true',
      );
      return Array.isArray(response) ? response : [];
    },
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useVendedores(
  params?: ListVendedoresParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    ...vendedoresQueryOptions(params),
    enabled: options?.enabled !== false,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useVendedor(id: string | null) {
  return useQuery({
    queryKey: vendedoresKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      return api.get<Vendedor>(`/vendedores/${id}`);
    },
    enabled: !!id,
  });
}

export function useCreateVendedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVendedorDTO) =>
      api.post<Vendedor>('/vendedores', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendedoresKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vendedoresKeys.select() });
    },
  });
}

export function useUpdateVendedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVendedorDTO }) =>
      api.patch<Vendedor>(`/vendedores/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vendedoresKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vendedoresKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: vendedoresKeys.select() });
    },
  });
}

export function useDeleteVendedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vendedores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendedoresKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vendedoresKeys.select() });
    },
  });
}
