import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type { ComentarioItem } from '@/modules/area-trabalho/http';
import type {
  Sinistro,
  StatusSinistro,
  TipoSinistro,
  CreateSinistroDto,
  IndicarSinistroDto,
  UpdateSinistroDto,
  MoverSinistroDto,
  AprovarSinistroDto,
  RecusarSinistroDto,
  PagarSinistroDto,
  HistoricoSinistro,
} from '@/types/sinistro';

export const sinistrosKeys = {
  all: ['sinistros'] as const,
  lists: () => [...sinistrosKeys.all, 'list'] as const,
  list: (filters?: {
    status?: StatusSinistro;
    documentoVendaId?: string;
    solicitanteId?: string;
    tipoSinistro?: TipoSinistro;
  }) => [...sinistrosKeys.lists(), filters ?? {}] as const,
  details: () => [...sinistrosKeys.all, 'detail'] as const,
  detail: (id: string) => [...sinistrosKeys.details(), id] as const,
  historico: (id: string) => [...sinistrosKeys.detail(id), 'historico'] as const,
  comentarios: (id: string) => [...sinistrosKeys.detail(id), 'comentarios'] as const,
};

interface ListSinistrosFilters {
  status?: StatusSinistro;
  documentoVendaId?: string;
  solicitanteId?: string;
  tipoSinistro?: TipoSinistro;
  dataAberturaInicio?: string;
  dataAberturaFim?: string;
  page?: number;
  limit?: number;
}

interface PaginatedSinistros {
  data: Sinistro[];
  total: number;
  page: number;
  pageSize: number;
}

export function useSinistros(filters?: ListSinistrosFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sinistrosKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.documentoVendaId) params.append('documentoVendaId', filters.documentoVendaId);
      if (filters?.solicitanteId) params.append('solicitanteId', filters.solicitanteId);
      if (filters?.tipoSinistro) params.append('tipoSinistro', filters.tipoSinistro);
      if (filters?.dataAberturaInicio) params.append('dataAberturaInicio', filters.dataAberturaInicio);
      if (filters?.dataAberturaFim) params.append('dataAberturaFim', filters.dataAberturaFim);
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));

      const qs = params.toString();
      const response = await api.get<PaginatedSinistros>(`/claims${qs ? `?${qs}` : ''}`);
      return response;
    },
    placeholderData: keepPreviousData,
    enabled: options?.enabled !== false,
  });
}

export function useSinistro(id: string | null) {
  return useQuery({
    queryKey: sinistrosKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) throw new Error('ID é obrigatório');
      const response = await api.get<Sinistro>(`/claims/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

export function useHistoricoSinistro(id: string | null) {
  return useQuery({
    queryKey: sinistrosKeys.historico(id ?? ''),
    queryFn: async () => {
      if (!id) throw new Error('ID é obrigatório');
      const response = await api.get<HistoricoSinistro[]>(`/claims/${id}/history`);
      return response ?? [];
    },
    enabled: !!id,
  });
}

export function useIndicarSinistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: IndicarSinistroDto) => {
      return api.post<Sinistro>('/claims/indicar', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.lists() });
    },
  });
}

export function useCreateSinistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSinistroDto) => {
      return api.post<Sinistro>('/claims', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.lists() });
    },
  });
}

export function useUpdateSinistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSinistroDto }) => {
      return api.patch<Sinistro>(`/claims/${id}`, data);
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.detail(id) });
    },
  });
}

export function useMoverSinistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MoverSinistroDto }) => {
      return api.post<Sinistro>(`/claims/${id}/move`, data);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: sinistrosKeys.lists() });
      const prev = queryClient.getQueriesData<PaginatedSinistros>({ queryKey: sinistrosKeys.lists() });
      queryClient.setQueriesData<PaginatedSinistros>(
        { queryKey: sinistrosKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((s) =>
              s.id === id ? { ...s, status: data.novoStatus } : s,
            ),
          };
        },
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        for (const [key, value] of context.prev) {
          queryClient.setQueryData(key, value);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.lists() });
    },
  });
}

export function useAprovarSinistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AprovarSinistroDto }) => {
      return api.post<Sinistro>(`/claims/${id}/approve`, data);
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.detail(id) });
    },
  });
}

export function useRecusarSinistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RecusarSinistroDto }) => {
      return api.post<Sinistro>(`/claims/${id}/reject`, data);
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.detail(id) });
    },
  });
}

export function usePagarSinistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PagarSinistroDto }) => {
      return api.post<Sinistro>(`/claims/${id}/pay`, data);
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.detail(id) });
    },
  });
}

export function useCancelarSinistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.post<Sinistro>(`/claims/${id}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.lists() });
    },
  });
}

export function useAdicionarAnotacaoSinistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, texto }: { id: string; texto: string }) => {
      return api.post<HistoricoSinistro>(`/claims/${id}/note`, { texto });
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.historico(id) });
    },
  });
}

export function useComentariosSinistro(sinistroId: string | null) {
  return useQuery({
    queryKey: sinistrosKeys.comentarios(sinistroId ?? ''),
    queryFn: async () => {
      const data = await api.get<ComentarioItem[]>(`/claims/${sinistroId}/comments`);
      return data ?? [];
    },
    enabled: !!sinistroId,
    staleTime: 30 * 1000,
  });
}

export function useAdicionarComentarioSinistro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sinistroId, texto, parentId }: { sinistroId: string; texto: string; parentId?: string | null }) => {
      return api.post<ComentarioItem>(`/claims/${sinistroId}/comments`, { texto, parentId });
    },
    onSuccess: (_, { sinistroId }) => {
      queryClient.invalidateQueries({ queryKey: sinistrosKeys.comentarios(sinistroId) });
    },
  });
}
