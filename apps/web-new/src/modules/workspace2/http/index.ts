import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';

export const workspace2Keys = {
  all: ['workspace2'] as const,
  prefs: () => [...workspace2Keys.all, 'prefs'] as const,
};

export interface FilterState {
  situacao: string[];
  tags: string[];
  vendedores: string[];
  produtos: string[];
  seguradoras: string[];
  showExcluidos: boolean;
}

export interface PlanilhaPrefs {
  columnState: unknown[];
  columnColors: Record<string, string | null>;
  filterState: Partial<FilterState>;
}

export const workspace2PrefsQueryOptions = () => ({
  queryKey: workspace2Keys.prefs(),
  queryFn: () => api.get<PlanilhaPrefs>('/workspace2-prefs/planilha'),
  staleTime: Infinity,
  gcTime: Infinity,
});

export function useWorkspace2Prefs() {
  return useQuery(workspace2PrefsQueryOptions());
}

export function useSaveWorkspace2Prefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PlanilhaPrefs) => api.put('/workspace2-prefs/planilha', data),
    onMutate: (data) => {
      // Optimistic update: cache reflete imediatamente o que foi salvo
      queryClient.setQueryData(workspace2Keys.prefs(), data);
    },
    onError: () => {
      // Em caso de falha, força re-sync com servidor
      queryClient.invalidateQueries({ queryKey: workspace2Keys.prefs() });
    },
  });
}
