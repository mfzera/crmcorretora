import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type {
  SeguradoraParceira,
  CreateSeguradoraParceiraDTO,
  UpdateSeguradoraParceiraDTO,
  ListSeguradorasParceiraParams,
  ListSeguradorasParceiraResponse,
} from '@/types/seguradora-parceira';

// Query Keys
export const seguradorasParceiraKeys = {
  all: ['seguradoras-parceiras'] as const,
  lists: () => [...seguradorasParceiraKeys.all, 'list'] as const,
  list: (params?: ListSeguradorasParceiraParams) =>
    [...seguradorasParceiraKeys.lists(), params] as const,
  details: () => [...seguradorasParceiraKeys.all, 'detail'] as const,
  detail: (id: string) => [...seguradorasParceiraKeys.details(), id] as const,
};

export function seguradorasParceiraQueryOptions(params?: ListSeguradorasParceiraParams) {
  return queryOptions({
    queryKey: seguradorasParceiraKeys.list(params),
    queryFn: async () => {
      try {
        const searchParams = new URLSearchParams();

        if (params?.status) searchParams.append('status', params.status);
        if (params?.search) searchParams.append('search', params.search);
        if (params?.page) searchParams.append('page', String(params.page));
        if (params?.limit) searchParams.append('limit', String(params.limit));

        const queryString = searchParams.toString();
        const endpoint = queryString ? `/partner-insurers?${queryString}` : '/partner-insurers';

        const response = await api.get<ListSeguradorasParceiraResponse>(endpoint);
        return response;
      } catch {
        return {
          data: [],
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: 0,
            totalPages: 0,
          },
        } as ListSeguradorasParceiraResponse;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Hook para listar seguradoras parceiras com paginação
export function useSeguradorasParceiras(params?: ListSeguradorasParceiraParams, options?: { enabled?: boolean }) {
  return useQuery({ ...seguradorasParceiraQueryOptions(params), enabled: options?.enabled !== false });
}

// Hook para buscar uma seguradora parceira por ID
export function useSeguradoraParceira(id: string | null) {
  return useQuery({
    queryKey: seguradorasParceiraKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      try {
        const response = await api.get<SeguradoraParceira>(
          `/partner-insurers/${id}`,
        );
        return response;
      } catch (error) {
        return null;
      }
    },
    enabled: !!id,
    retry: false,
  });
}

// Hook para criar seguradora parceira
export function useCreateInsurancePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSeguradoraParceiraDTO) => {
      return api.post<SeguradoraParceira>('/partner-insurers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: seguradorasParceiraKeys.lists(),
      });
    },
  });
}

// Hook para atualizar seguradora parceira
export function useUpdateInsurancePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSeguradoraParceiraDTO;
    }) => {
      return api.patch<SeguradoraParceira>(
        `/partner-insurers/${id}`,
        data,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: seguradorasParceiraKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: seguradorasParceiraKeys.detail(variables.id),
      });
    },
  });
}

// Hook para excluir seguradora parceira (soft delete)
export function useDeleteInsurancePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/partner-insurers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: seguradorasParceiraKeys.lists(),
      });
    },
  });
}

// Hook para toggle status da seguradora parceira
export function useToggleStatusSeguradoraParceira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: 'ATIVA' | 'INATIVA';
    }) => {
      return api.patch<SeguradoraParceira>(`/partner-insurers/${id}`, {
        status,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: seguradorasParceiraKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: seguradorasParceiraKeys.detail(variables.id),
      });
    },
  });
}
