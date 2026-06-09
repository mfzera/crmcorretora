import { useQuery, keepPreviousData, queryOptions } from '@tanstack/react-query';
import { api } from '@/infra/http/api';

export type FiltrosMetricas = {
  dataInicio?: string;
  dataFim?: string;
  vendedorId?: string;
  equipeId?: string;
  produtoId?: string;
  seguradoraParceiraId?: string;
  status?: string;
};

export type MetricasResumo = {
  premioLiquido: {
    resumo: {
      total: number;
      media: number;
      count: number;
      maior: number;
      menor: number;
    };
    porStatus: Array<{
      status: string;
      total: number;
      count: number;
    }>;
  };
  comissao: {
    resumo: {
      totalComissao: number;
      mediaComissao: number;
      mediaPercentualComissao: number;
      totalCorretora: number;
      countNegocioCorretora: number;
    };
  };
  kanban: {
    porStatus: Array<{
      status: string;
      count: number;
      premioEstimado: number;
      valorFechado: number;
    }>;
    porPrioridade: Array<{
      prioridade: string;
      count: number;
    }>;
    porTemperatura: Array<{
      temperatura: string;
      count: number;
    }>;
  };
  cadastro: {
    totalClientes: number;
    clientesPF: number;
    clientesPJ: number;
    clientesAtivos: number;
  };
  renovacao: {
    resumo: {
      total: number;
      renovados: number;
      perdidos: number;
      emAndamento: number;
    };
    detalhado: Array<{
      status: string;
      count: number;
      premioAnterior: number;
      premioNovo: number;
    }>;
    porProduto: Array<{
      produto: string | null;
      count: number;
      premioAnterior: number;
    }>;
  };
  endosso: {
    resumo: {
      total: number;
      aprovados: number;
      solicitados: number;
      recusados: number;
    };
    detalhado: Array<{
      status: string;
      tipo: string;
      count: number;
    }>;
  };
  topVendedores: Array<{
    vendedorId: string;
    vendedorNome: string;
    avatarUrl: string | null;
    equipeNome: string | null;
    totalPremio: number;
    totalComissao: number;
    count: number;
    renovacoesTotal: number;
    renovacoesFechadas: number;
  }>;
  seguradoras: {
    metricas: Array<{
      seguradoraParceiraId: string | null;
      seguradoraNome: string | null;
      totalPremio: number;
      totalComissao: number;
      mediaComissao: number;
      countDocumentos: number;
      countClientes: number;
    }>;
    clientes: Array<{
      seguradoraParceiraId: string | null;
      seguradoraNome: string | null;
      countClientes: number;
      countClientesPF: number;
      countClientesPJ: number;
    }>;
  };
  negocioCorretora: {
    resumo: {
      totalDocumentos: number;
      totalPremio: number;
      totalComissaoVendedor: number;
      totalComissaoCorretora: number;
      mediaPercentualCorretora: number;
    };
    porSeguradora: Array<{
      seguradoraParceiraId: string | null;
      seguradoraNome: string | null;
      countDocumentos: number;
      totalPremio: number;
      totalComissaoCorretora: number;
    }>;
  };
  renovacoesVencidas: {
    total: number;
    porVendedor: Array<{
      vendedorId: string;
      vendedorNome: string | null;
      count: number;
    }>;
  };
  cotacoesParadas: {
    total: number;
    porVendedor: Array<{
      vendedorId: string;
      vendedorNome: string | null;
      count: number;
    }>;
  };
  anterior: {
    premioLiquido: { total: number; count: number };
    comissao: { totalComissao: number; mediaPercentualComissao: number };
    renovacao: { total: number; renovados: number; emAndamento: number };
  } | null;
  filtros: FiltrosMetricas;
};

export type CategoriaMetrica =
  | 'premio_liquido'
  | 'comissao'
  | 'status_kanban'
  | 'cadastro'
  | 'renovacao'
  | 'endosso'
  | 'renovacoes_vencidas'
  | 'cotacoes_paradas';

export type MetricasDetalhes = {
  categoria: CategoriaMetrica;
  detalhes: any[];
  total: number;
};

export type Vendedor = {
  id: string;
  nome: string;
  email: string;
  cargo?: {
    nomeCargo: string;
    isVendedor: boolean;
  };
  equipe?: {
    id: string;
    nome: string;
  };
};

export function metricasQueryOptions(filtros: FiltrosMetricas = {}) {
  return queryOptions({
    queryKey: ['metricas', filtros] as const,
    queryFn: async () => {
      const response = await api.get<MetricasResumo>('/metrics', {
        params: filtros,
      });
      return response;
    },
    staleTime: 30000,
    placeholderData: keepPreviousData,
  });
}

// Query: Buscar métricas consolidadas
export function useMetricas(filtros: FiltrosMetricas = {}, options?: { enabled?: boolean }) {
  return useQuery({
    ...metricasQueryOptions(filtros),
    enabled: options?.enabled ?? true,
  });
}

// Query: Buscar detalhes de uma categoria específica
export function useMetricasDetalhes(
  categoria: CategoriaMetrica,
  filtros: Omit<FiltrosMetricas, 'produtoId'> = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ['metricas', 'detalhes', categoria, filtros],
    queryFn: async () => {
      try {
        const response = await api.get<MetricasDetalhes>('/metrics/details', {
          params: {
            categoria,
            ...filtros,
          },
        });
        return response;
      } catch (error) {
        throw error;
      }
    },
    staleTime: 30000,
    enabled: options.enabled ?? true,
  });
}

export type Granularidade = 'mes' | 'semana' | 'dia';

export type EvolucaoItem = {
  periodo: string; // 'YYYY-MM' (mes) | 'YYYY-MM-DD' (semana/dia)
  totalPremio: number;
  mediaPercentualComissao: number; // % média de comissão no período
};

export function metricasEvolucaoQueryOptions(
  filtros: Pick<FiltrosMetricas, 'dataInicio' | 'dataFim' | 'vendedorId' | 'produtoId' | 'status'> & { granularidade?: Granularidade } = {},
) {
  return queryOptions({
    queryKey: ['metricas', 'evolucao', filtros] as const,
    queryFn: async () => {
      const response = await api.get<{ evolucao: EvolucaoItem[] }>(
        '/metrics/evolution',
        { params: filtros },
      );
      return response.evolucao ?? [];
    },
    staleTime: 30000,
    placeholderData: keepPreviousData,
  });
}

// Query: Evolução de prêmio e comissão por período
export function useMetricasEvolucao(
  filtros: Pick<FiltrosMetricas, 'dataInicio' | 'dataFim' | 'vendedorId' | 'produtoId' | 'status'> & { granularidade?: Granularidade } = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    ...metricasEvolucaoQueryOptions(filtros),
    enabled: options?.enabled ?? true,
  });
}

// Query: Buscar lista de vendedores para filtro
export function useVendedores() {
  return useQuery({
    queryKey: ['metricas', 'vendedores'],
    queryFn: async () => {
      try {
        const vendedores = await api.get<Vendedor[]>('/metrics/sellers');
        return { vendedores };
      } catch (error) {
        return { vendedores: [] };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Query: Buscar lista de produtos para filtro
export function useProdutosParaFiltro() {
  return useQuery({
    queryKey: ['metricas', 'produtos-filtro'],
    queryFn: async () => {
      try {
        const response = await api.get<{
          data: Array<{ id: string; nomeProduto: string }>;
        }>('/products?porPagina=200');
        return response.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Query: Buscar lista de seguradoras parceiras para filtro
export function useSeguradoras() {
  return useQuery({
    queryKey: ['seguradoras-parceiras', 'filtro'],
    queryFn: async () => {
      try {
        const response = await api.get<
          Array<{
            id: string;
            nomeFantasia: string;
            razaoSocial: string;
          }>
        >('/partner-insurers/select');
        return response || [];
      } catch (error) {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}
