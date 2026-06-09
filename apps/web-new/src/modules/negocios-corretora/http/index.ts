import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

export interface NegociosFiltros {
  search: string;
  negocioCorretora: 'todos' | 'sim' | 'nao';
  status: string;
  produto: string;
  vendedorId: string;
  dataInicio: string;
  dataFim: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

export const defaultFiltros: NegociosFiltros = {
  search: '',
  negocioCorretora: 'todos',
  status: 'todos',
  produto: 'todos',
  vendedorId: 'todos',
  dataInicio: '',
  dataFim: '',
  sortBy: 'dataAprovacaoCadastro',
  sortDir: 'desc',
};

export const negociosKeys = {
  all: ['negocios-corretora'] as const,
  lists: () => [...negociosKeys.all, 'list'] as const,
  list: (filtros: NegociosFiltros, page: number, limit: number) =>
    [...negociosKeys.lists(), { filtros, page, limit }] as const,
};

export function useNegocios(filtros: NegociosFiltros, page: number, limit = 20) {
  return useQuery({
    queryKey: negociosKeys.list(filtros, page, limit),
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        limit,
        sortBy: filtros.sortBy,
        sortDir: filtros.sortDir,
      };

      if (filtros.search) params.search = filtros.search;
      if (filtros.status !== 'todos') params.status = filtros.status;
      if (filtros.vendedorId !== 'todos') params.vendedorId = filtros.vendedorId;
      if (filtros.dataInicio) params.dataInicio = filtros.dataInicio;
      if (filtros.dataFim) params.dataFim = filtros.dataFim;
      if (filtros.negocioCorretora === 'sim') params.negocioCorretora = 'true';
      if (filtros.negocioCorretora === 'nao') params.negocioCorretora = 'false';

      const response = await api.get('/sales-documents', { params });
      const raw = response as any;

      if (raw?.data && Array.isArray(raw.data)) {
        return {
          data: raw.data as any[],
          meta: raw.meta ?? { total: raw.data.length, page, limit, totalPages: 1 },
        };
      }

      const arr = Array.isArray(raw) ? raw : [];
      return {
        data: arr as any[],
        meta: { total: arr.length, page, limit, totalPages: 1 },
      };
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export interface ConfigComissaoPadraoPayload {
  percentualCorretora: number;
  percentualPrincipal1Vendedor: number;
  percentualPrincipal2Vendedores: number;
  percentualSecundario2Vendedores: number;
}

const LS_KEYS = {
  corretora: 'comissao_corretora_percentual',
  principal1v: 'comissao_principal_1vendedor',
  principal2v: 'comissao_principal_2vendedores',
  secundario2v: 'comissao_secundario_2vendedores',
} as const;

function loadFromLocalStorage(): ConfigComissaoPadraoPayload {
  return {
    percentualCorretora: parseFloat(localStorage.getItem(LS_KEYS.corretora) ?? '30') || 30,
    percentualPrincipal1Vendedor: parseFloat(localStorage.getItem(LS_KEYS.principal1v) ?? '100') || 100,
    percentualPrincipal2Vendedores: parseFloat(localStorage.getItem(LS_KEYS.principal2v) ?? '50') || 50,
    percentualSecundario2Vendedores: parseFloat(localStorage.getItem(LS_KEYS.secundario2v) ?? '50') || 50,
  };
}

function saveToLocalStorage(data: ConfigComissaoPadraoPayload) {
  localStorage.setItem(LS_KEYS.corretora, String(data.percentualCorretora));
  localStorage.setItem(LS_KEYS.principal1v, String(data.percentualPrincipal1Vendedor));
  localStorage.setItem(LS_KEYS.principal2v, String(data.percentualPrincipal2Vendedores));
  localStorage.setItem(LS_KEYS.secundario2v, String(data.percentualSecundario2Vendedores));
}

export function useConfigComissaoPadrao() {
  return useQuery({
    queryKey: [...negociosKeys.all, 'config-padrao'],
    queryFn: () => loadFromLocalStorage(),
    staleTime: Infinity,
  });
}

export function useSalvarConfigComissaoPadrao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ConfigComissaoPadraoPayload) => {
      saveToLocalStorage(data);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData([...negociosKeys.all, 'config-padrao'], data);
      toast.success('Configuração padrão salva!', {
        description: 'Estes valores serão usados como padrão para novos negócios',
      });
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });
}
