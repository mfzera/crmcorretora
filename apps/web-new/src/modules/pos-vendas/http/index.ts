import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type { DocumentoVenda } from '@/types/documento-venda';

export interface CrossSellingFilters {
  search?: string;
  produtoId?: string;
  seguradoraParceiraId?: string;
  vendedorId?: string;
  vigenciaInicioDe?: string;
  vigenciaInicioAte?: string;
  vigenciaFimDe?: string;
  vigenciaFimAte?: string;
  dataAprovacaoDe?: string;
  dataAprovacaoAte?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedSegurosCrossS {
  data: DocumentoVenda[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const crossSellingKeys = {
  all: ['pos-vendas', 'cross-selling'] as const,
  lists: () => [...crossSellingKeys.all, 'list'] as const,
  list: (filters?: CrossSellingFilters) => [...crossSellingKeys.lists(), filters ?? {}] as const,
};

export function useSegurosAtivos(filters: CrossSellingFilters = {}) {
  return useQuery({
    queryKey: crossSellingKeys.list(filters),
    queryFn: async (): Promise<PaginatedSegurosCrossS> => {
      const params: Record<string, string> = {
        status: 'ATIVO',
        limit: String(filters.limit ?? 20),
        page: String(filters.page ?? 1),
      };
      if (filters.search) params.search = filters.search;
      if (filters.produtoId) params.produtoId = filters.produtoId;
      if (filters.seguradoraParceiraId) params.seguradoraParceiraId = filters.seguradoraParceiraId;
      if (filters.vendedorId) params.vendedorId = filters.vendedorId;
      if (filters.vigenciaInicioDe) params.vigenciaInicioDe = filters.vigenciaInicioDe;
      if (filters.vigenciaInicioAte) params.vigenciaInicioAte = filters.vigenciaInicioAte;
      if (filters.vigenciaFimDe) params.vigenciaFimDe = filters.vigenciaFimDe;
      if (filters.vigenciaFimAte) params.vigenciaFimAte = filters.vigenciaFimAte;
      if (filters.dataAprovacaoDe) params.dataAprovacaoDe = filters.dataAprovacaoDe;
      if (filters.dataAprovacaoAte) params.dataAprovacaoAte = filters.dataAprovacaoAte;

      console.log('[xsell] GET /sales-documents params', params);
      const response = await api.get<any>('/sales-documents', { params });

      if (response && typeof response === 'object' && 'data' in response && 'meta' in response) {
        const res = response as PaginatedSegurosCrossS;
        console.log('[xsell] response meta.total', res.meta?.total, 'data.length', res.data?.length);
        return res;
      }
      const arr = Array.isArray(response) ? response : (response as any)?.data ?? [];
      return {
        data: arr,
        meta: { total: arr.length, page: 1, totalPages: 1, hasNext: false, hasPrev: false },
      };
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
