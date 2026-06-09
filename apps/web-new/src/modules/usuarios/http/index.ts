import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type {
  Usuario,
  ListUsuariosParams,
  ListUsuariosResponse,
  CreateUsuarioDTO,
  UpdateUsuarioDTO,
  ResetarSenhaDTO,
} from '@/types/usuario';

export const usuariosKeys = {
  all: ['usuarios'] as const,
  lists: () => [...usuariosKeys.all, 'list'] as const,
  list: (filters?: any) => [...usuariosKeys.lists(), filters] as const,
  details: () => [...usuariosKeys.all, 'detail'] as const,
  detail: (id: string) => [...usuariosKeys.details(), id] as const,
};

export function usuariosQueryOptions(params?: ListUsuariosParams) {
  return queryOptions({
    queryKey: usuariosKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', String(params.page));
      if (params?.limit) searchParams.append('limit', String(params.limit));
      if (params?.search) searchParams.append('search', params.search);
      if (params?.cargoId) searchParams.append('cargoId', params.cargoId);
      if (params?.equipeId) searchParams.append('equipeId', params.equipeId);
      if (params?.ativo) searchParams.append('ativo', params.ativo);

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/users?${queryString}` : '/users';

      const response = await api.get<any>(endpoint);

      if (Array.isArray(response)) {
        return {
          data: response,
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: response.length,
            totalPages: 1,
          },
        } as ListUsuariosResponse;
      }

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
        } as ListUsuariosResponse;
      }

      return response as ListUsuariosResponse;
    },
    staleTime: 30000,
  });
}

// Lightweight hook for vendedor selects/dropdowns (no usuarios:visualizar needed)
export const vendedoresSelectQueryOptions = queryOptions({
  queryKey: [...usuariosKeys.all, 'vendedores'] as const,
  queryFn: async () => {
    const response = await api.get<
      { id: string; nome: string; email: string }[]
    >('/users?select=true');
    return Array.isArray(response) ? response : [];
  },
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  refetchOnMount: false,
});

export function useVendedores(options?: { enabled?: boolean }) {
  return useQuery({
    ...vendedoresSelectQueryOptions,
    enabled: options?.enabled !== false,
  });
}

export function useUsuarios(
  params?: ListUsuariosParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    ...usuariosQueryOptions(params),
    enabled: options?.enabled !== false,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useUsuario(id: string | null) {
  return useQuery({
    queryKey: usuariosKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<Usuario>(`/users/${id}`);
      // O interceptor do Axios já extrai response.data.data
      return response;
    },
    enabled: !!id,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export type PerfilPublico = {
  id: string;
  nome: string;
  avatarUrl: string | null;
  cargo: {
    id: string;
    nome: string;
    cor: string | null;
    isAdmin: boolean;
    isGestor: boolean;
    isVendedor: boolean;
  } | null;
  equipe: {
    id: string;
    nome: string;
    gestorId: string | null;
    membros: {
      id: string;
      nome: string;
      avatarUrl: string | null;
      cargo: { nome: string; cor: string | null } | null;
    }[];
  } | null;
  badges: {
    id: string;
    createdAt: string;
    badgeTipo: {
      id: string;
      slug: string;
      nome: string;
      descricao: string | null;
      icone: string;
      cor: string;
    };
  }[];
  membroDesde: string | null;
};

export function usePerfilPublico(id: string | null) {
  return useQuery({
    queryKey: [...usuariosKeys.all, 'perfil-publico', id] as const,
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<PerfilPublico>(
        `/users/${id}/public-profile`,
      );
      return response;
    },
    enabled: !!id,
    staleTime: 60000,
  });
}

// Hook para criar usuário
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUsuarioDTO) => {
      return api.post<Usuario>('/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() });
    },
  });
}

// Hook para atualizar usuário
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateUsuarioDTO;
    }) => {
      return api.patch<Usuario>(`/users/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: usuariosKeys.detail(variables.id),
      });
    },
  });
}

// Hook para excluir usuário
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() });
    },
  });
}

// Hook para resetar senha
export function useResetarSenha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      novaSenha,
    }: {
      id: string;
      novaSenha: string;
    }) => {
      return api.post(`/users/${id}/reset-password`, { novaSenha });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: usuariosKeys.detail(variables.id),
      });
    },
  });
}

// Hook para upload de avatar
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      // Don't set Content-Type manually - let axios set it with boundary
      const response = await api.post<{ avatarUrl: string }>(
        `/users/${id}/avatar`,
        formData,
      );
      return response;
    },
    onSuccess: (data, variables) => {
      // Update cache directly instead of invalidating to avoid refetch
      queryClient.setQueryData(
        usuariosKeys.detail(variables.id),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            avatarUrl: data?.avatarUrl,
          };
        },
      );

      // Invalidate lists to update user listings
      queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() });
    },
  });
}

// Hook para remover avatar
export function useRemoverAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/users/${id}/avatar`);
    },
    onSuccess: (_, id) => {
      // Update cache directly instead of invalidating to avoid refetch
      queryClient.setQueryData(usuariosKeys.detail(id), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          avatarUrl: null,
        };
      });

      // Invalidate lists to update user listings
      queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() });
    },
  });
}

// ─── Subvendedores ────────────────────────────────────────────────────────────

export interface Subvendedor {
  id: string;
  subvendedorId: string;
  nome: string;
  email: string | null;
  percentualNovo: number | null;
  percentualRenovacao: number | null;
  dataInicio: string;
  dataFim: string | null;
  ativo: boolean;
}

export interface CreateSubvendedorDTO {
  subvendedorId: string;
  percentualNovo?: number | null;
  percentualRenovacao?: number | null;
  dataInicio: string;
  dataFim?: string | null;
}

export interface UpdateSubvendedorDTO {
  percentualNovo?: number | null;
  percentualRenovacao?: number | null;
  dataInicio?: string;
  dataFim?: string | null;
  ativo?: boolean;
}

export const subvendedoresKeys = {
  all: (vendedorId: string) => ['usuarios', vendedorId, 'subvendedores'] as const,
};

export function useSubvendedores(vendedorId: string | null | undefined) {
  return useQuery({
    queryKey: subvendedoresKeys.all(vendedorId ?? ''),
    queryFn: async () => {
      if (!vendedorId) return [];
      const response = await api.get<Subvendedor[]>(`/users/${vendedorId}/subvendedores`);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!vendedorId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateSubvendedor(vendedorPrincipalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSubvendedorDTO) =>
      api.post<Subvendedor>(`/users/${vendedorPrincipalId}/subvendedores`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subvendedoresKeys.all(vendedorPrincipalId) });
    },
  });
}

export function useUpdateSubvendedor(vendedorPrincipalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubvendedorDTO }) =>
      api.patch<Subvendedor>(`/users/${vendedorPrincipalId}/subvendedores/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subvendedoresKeys.all(vendedorPrincipalId) });
    },
  });
}

export function useDeleteSubvendedor(vendedorPrincipalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/users/${vendedorPrincipalId}/subvendedores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subvendedoresKeys.all(vendedorPrincipalId) });
    },
  });
}
