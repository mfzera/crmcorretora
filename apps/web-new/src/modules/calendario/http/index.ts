import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type { CalendarioData } from '@/modules/calendario/components/types';

export const calendarioKeys = {
  all: ['calendario'] as const,
  mes: (mes: string, tipos: string) =>
    [...calendarioKeys.all, mes, tipos] as const,
};

export const googleCalendarKeys = {
  status: ['google-calendar', 'status'] as const,
};

export function useGoogleCalendarStatus() {
  return useQuery({
    queryKey: googleCalendarKeys.status,
    queryFn: () => api.get<{ conectado: boolean }>('/auth/google-calendar/status'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/auth/google-calendar/disconnect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.status });
      queryClient.invalidateQueries({ queryKey: calendarioKeys.all });
    },
  });
}

export function useSyncToGoogle() {
  return useMutation({
    mutationFn: () =>
      api.post<{ syncedTarefas: number; syncedEventos: number; erros: number; total: number }>(
        '/auth/google-calendar/sync',
      ),
  });
}

export function useCalendario(mes: string, tipos: string[]) {
  const tiposStr = tipos.join(',');
  return useQuery({
    queryKey: calendarioKeys.mes(mes, tiposStr),
    queryFn: () =>
      api.get<CalendarioData>('/calendar', {
        params: { mes, tipos: tiposStr },
      }),
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: tipos.length > 0,
  });
}
