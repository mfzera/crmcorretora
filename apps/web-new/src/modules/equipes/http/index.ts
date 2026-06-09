import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { toast } from 'sonner';
import type {
  Equipe,
  EquipeDetalhe,
  CreateEquipeDTO,
  UpdateEquipeDTO,
  AtribuirLiderDTO,
  AdicionarMembroDTO,
  ListEquipesParams,
} from '@/types/equipe';

export function useEquipes(params?: ListEquipesParams & { enabled?: boolean }) {
  const { enabled = true, ...queryParams } = params ?? {};
  return useQuery({
    queryKey: ['equipes', queryParams],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (queryParams.page) searchParams.set('page', String(queryParams.page));
      if (queryParams.limit) searchParams.set('limit', String(queryParams.limit));
      if (queryParams.search) searchParams.set('search', queryParams.search);
      if (queryParams.ativo) searchParams.set('ativo', queryParams.ativo);
      const qs = searchParams.toString();
      return api.get<{ data: Equipe[]; total: number; page: number; limit: number; totalPages: number }>(
        `/teams${qs ? `?${qs}` : ''}`,
      );
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos — equipes mudam raramente
  });
}

export function useEquipe(id: string | null) {
  return useQuery({
    queryKey: ['equipes', id],
    queryFn: async () => {
      if (!id) return null;
      return api.get<EquipeDetalhe>(`/teams/${id}`);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEquipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEquipeDTO) => api.post<Equipe>('/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipes'] });
      toast.success('Equipe criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar equipe');
    },
  });
}

export function useUpdateEquipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateEquipeDTO & { id: string }) =>
      api.patch<Equipe>(`/teams/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['equipes'] });
      queryClient.invalidateQueries({ queryKey: ['equipes', variables.id] });
      toast.success('Equipe atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar equipe');
    },
  });
}

export function useDeleteEquipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipes'] });
      toast.success('Equipe excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir equipe');
    },
  });
}

export function useAtribuirLider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ equipeId, gestorId }: AtribuirLiderDTO & { equipeId: string }) =>
      api.post(`/teams/${equipeId}/assign-leader`, { gestorId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['equipes'] });
      queryClient.invalidateQueries({ queryKey: ['equipes', variables.equipeId] });
      toast.success('Lider atribuído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atribuir lider');
    },
  });
}

export function useAdicionarMembro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ equipeId, usuarioId }: AdicionarMembroDTO & { equipeId: string }) =>
      api.post(`/teams/${equipeId}/members`, { usuarioId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['equipes', variables.equipeId] });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Membro adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar membro');
    },
  });
}

export function useRemoverMembro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ equipeId, usuarioId }: { equipeId: string; usuarioId: string }) =>
      api.delete(`/teams/${equipeId}/members/${usuarioId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['equipes', variables.equipeId] });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Membro removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover membro');
    },
  });
}
