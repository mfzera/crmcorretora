import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type {
  Notificacao,
  NotificacaoListParams,
  NotificacoesResponse,
} from '@/types/notificacao';

// Listar notificações
export function useNotificacoes(params?: NotificacaoListParams) {
  return useQuery({
    queryKey: ['notificacoes', params],
    queryFn: async () => {
      const response = await api.get<{ data: Notificacao[]; meta: any }>(
        '/notifications',
        {
          params: params ? { ...params } : undefined,
        },
      );
      // Transformar para o formato esperado pelo frontend
      return {
        items: response.data,
        total: response.meta.total,
        page: response.meta.page,
        limit: response.meta.limit,
        totalPages: response.meta.totalPages,
      };
    },
  });
}

// Contar notificações não lidas
export function useNotificacoesNaoLidas() {
  return useQuery({
    queryKey: ['notificacoes', 'nao-lidas', 'count'],
    queryFn: async () => {
      const response = await api.get<{ count: number }>(
        '/notifications/unread/count',
      );
      return response.count || 0;
    },
    refetchInterval: 15000,
  });
}

// Obter uma notificação específica
export function useNotificacao(id: string | null) {
  return useQuery({
    queryKey: ['notificacoes', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<Notificacao>(`/notifications/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

// Marcar como lida
export function useMarcarNotificacaoComoLida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<Notificacao>(
        `/notifications/${id}/mark-as-read`,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}

// Marcar todas como lidas
export function useMarcarTodasComoLidas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.patch('/notifications/mark-all-as-read');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}

// Excluir notificação
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/notifications/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}

// Excluir todas as notificações lidas
export function useDeleteAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete('/notifications/read/delete-all');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}
