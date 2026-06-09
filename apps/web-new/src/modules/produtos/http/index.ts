import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type {
  Produto,
  CreateProdutoData,
  UpdateProdutoData,
  ProdutosFilters,
} from '@/types/produto';

// Query Keys
export const produtosKeys = {
  all: ['produtos'] as const,
  lists: () => [...produtosKeys.all, 'list'] as const,
  list: (filtros?: ProdutosFilters, pagina?: number, porPagina?: number) =>
    [...produtosKeys.lists(), { filtros, pagina, porPagina }] as const,
  details: () => [...produtosKeys.all, 'detail'] as const,
  detail: (id: string) => [...produtosKeys.details(), id] as const,
};

interface ProdutosPaginados {
  data: Produto[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

// Hook para listar produtos com paginação
export function produtosQueryOptions(filtros?: ProdutosFilters, pagina = 1, porPagina = 10) {
  return {
    queryKey: produtosKeys.list(filtros, pagina, porPagina),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filtros?.tipoSeguro && filtros.tipoSeguro !== 'TODOS') {
        params.append('tipoSeguro', filtros.tipoSeguro);
      }
      if (filtros?.ativo !== undefined && filtros.ativo !== 'TODOS') {
        params.append('ativo', String(filtros.ativo));
      }
      if (filtros?.search) {
        params.append('busca', filtros.search);
      }

      params.append('pagina', String(pagina));
      params.append('porPagina', String(porPagina));

      const response = await api.get<ProdutosPaginados>(`/products?${params.toString()}`);
      return response;
    },
    retry: (failureCount: number, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };
}

export function useProdutos(filtros?: ProdutosFilters, pagina = 1, porPagina = 10, options?: { enabled?: boolean }) {
  return useQuery({ ...produtosQueryOptions(filtros, pagina, porPagina), enabled: options?.enabled !== false });
}

// Hook para buscar um produto por ID
export function useProduto(id: string | null) {
  return useQuery({
    queryKey: produtosKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<Produto>(`/products/${id}`);
      return response;
    },
    enabled: !!id,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

// Hook para criar produto
export function useCriarProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProdutoData) => {
      return api.post<Produto>('/products', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produtosKeys.lists() });
    },
  });
}

// Hook para atualizar produto
export function useAtualizarProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProdutoData }) => {
      return api.patch<Produto>(`/products/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: produtosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: produtosKeys.detail(variables.id) });
    },
  });
}

// Hook para excluir produto (soft delete)
export function useExcluirProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: produtosKeys.lists() });
    },
  });
}

// Hook para toggle status do produto
export function useToggleStatusProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      return api.patch<Produto>(`/products/${id}`, { ativo });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: produtosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: produtosKeys.detail(variables.id) });
    },
  });
}
