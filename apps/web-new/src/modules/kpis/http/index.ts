import { useQuery } from '@tanstack/react-query';
import { api } from '@/infra/http/api';

export type KPIsData = {
  taxaConversao: {
    valor: number;
    total: number;
    ganhas: number;
    emAndamento: number;
  };
  valorMedioPremio: {
    valor: number;
    totalVendas: number;
    totalPremio: number;
  };
  taxaRenovacao: {
    valor: number;
    total: number;
    concluidas: number;
    periodo: string;
  };
};

export type KanbanKPIsData = {
  premioMedio: {
    valor: number;
    count: number;
    total: number;
  };
  clientesUrgencia: {
    count: number;
    total: number;
  };
  leadsFrios: {
    count: number;
    total: number;
  };
};

export function useKPIs() {
  return useQuery({
    queryKey: ['kpis'],
    queryFn: async () => {
      const response = await api.get<KPIsData>('/kpis');
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
  });
}

export function useKanbanKPIs() {
  return useQuery({
    queryKey: ['kpis', 'kanban'],
    queryFn: async () => {
      const response = await api.get<KanbanKPIsData>('/kpis/kanban');
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
  });
}
