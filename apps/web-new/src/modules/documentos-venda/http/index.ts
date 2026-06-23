import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type { DocumentoVenda } from '@/types/documento-venda';
import type { Sinistro } from '@/types/sinistro';

// Query Keys
export const documentosVendaKeys = {
  all: ['documentos-venda'] as const,
  lists: () => [...documentosVendaKeys.all, 'list'] as const,
  list: (filters?: any) => [...documentosVendaKeys.lists(), filters] as const,
  cadastro: () => [...documentosVendaKeys.all, 'cadastro'] as const,
  // Mantidos por compatibilidade com invalidações em outros lugares
  aguardandoCadastro: () =>
    [...documentosVendaKeys.all, 'cadastro'] as const,
  perdidos: () => [...documentosVendaKeys.all, 'cadastro'] as const,
  detail: (id: string) => [...documentosVendaKeys.all, 'detail', id] as const,
};

function extractArray(response: any): any[] {
  if (Array.isArray(response)) return response;
  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    Array.isArray(response.data)
  ) {
    return response.data;
  }
  return [];
}

// Queries

// Busca todos os documentos relevantes para a página de cadastro em um único request
export function useDocumentosVendaCadastro() {
  return useQuery({
    queryKey: documentosVendaKeys.cadastro(),
    queryFn: async () => {
      const response = await api.get<any[]>('/sales-documents', {
        params: {
          status: 'AGUARDANDO_CADASTRO,ATIVO,PERDIDO',
        },
      });
      return extractArray(response);
    },
    staleTime: 30_000,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

// Mantidos como aliases para compatibilidade
export function useDocumentosVendaAguardandoCadastro() {
  return useDocumentosVendaCadastro();
}

export function useDocumentosVendaPerdidos() {
  return useDocumentosVendaCadastro();
}

export function useDocumentoVenda(id: string) {
  return useQuery({
    queryKey: documentosVendaKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<DocumentoVenda>(`/sales-documents/${id}`);
      return response;
    },
    enabled: !!id,
    retry: (failureCount, error: any) => error?.status !== 403 && failureCount < 2,
  });
}

export function useDocumentosCliente(clienteId: string | null) {
  return useQuery({
    queryKey: [...documentosVendaKeys.all, 'cliente', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const response = await api.get<any[]>('/sales-documents', {
        params: {
          clienteId,
          status: 'ATIVO',
        },
      });
      return extractArray(response);
    },
    enabled: !!clienteId,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useDocumentosVendaAtivos(search?: string) {
  return useQuery({
    queryKey: [...documentosVendaKeys.all, 'ativos', search ?? ''],
    queryFn: async () => {
      const params: Record<string, string> = { status: 'ATIVO', limit: '200' };
      if (search) params.search = search;
      const response = await api.get<any>('/sales-documents', { params });
      return extractArray(response) as DocumentoVenda[];
    },
    staleTime: 30_000,
  });
}

// Mutations
export function useFinalizarCadastro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentoId,
      numeroApolice,
      dataEmissao,
      itemDescricao,
    }: {
      documentoId: string;
      numeroApolice?: string;
      dataEmissao?: string;
      itemDescricao?: string;
    }) => {
      // Se tiver apólice ou itemDescricao, atualiza primeiro
      if (numeroApolice || itemDescricao) {
        await api.patch(`/sales-documents/${documentoId}`, {
          ...(numeroApolice && { numeroApoliceExterna: numeroApolice }),
          ...(dataEmissao && { dataEmissaoApolice: dataEmissao }),
          ...(itemDescricao && { itemDescricao }),
        });
      }

      // Aprova o cadastro (já cria a renovação automaticamente no backend)
      const aprovarResponse = await api.post<any>(
        `/sales-documents/${documentoId}/approve-registration`,
      );

      return {
        venda: aprovarResponse,
        renovacao: aprovarResponse, // O backend já retorna a info da renovação criada
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentosVendaKeys.aguardandoCadastro(),
      });
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.lists() });
    },
  });
}

export function useReprovarCadastro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentoId,
      motivoRejeicao,
    }: {
      documentoId: string;
      motivoRejeicao: string;
    }) => {
      const response = await api.post<any>(
        `/sales-documents/${documentoId}/reject-registration`,
        { motivoRejeicao },
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentosVendaKeys.aguardandoCadastro(),
      });
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.lists() });
    },
  });
}

export function useCriarEndosso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      documentoVendaId: string;
      tipoEndosso: string;
      descricao: string;
      motivoEndosso?: string;
      premioNovo?: number;
      percentualComissaoNovo?: number;
      alteracoes?: Record<string, unknown>;
      dataVigenciaEndosso: string;
      observacoes?: string;
    }) => {
      const response = await api.post<any>('/endorsements', data);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentosVendaKeys.detail(variables.documentoVendaId),
      });
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.lists() });
      // Invalidate endossos pendentes na área de trabalho
      queryClient.invalidateQueries({
        queryKey: ['area-trabalho', 'endossos'],
      });
      queryClient.invalidateQueries({ queryKey: ['area-trabalho', 'resumo'] });
    },
  });
}

export function useRegistrarEndossoExterno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clienteId: string;
      produtoId: string;
      seguradoraParceiraId?: string;
      numeroPropostaExterna: string;
      vigenciaInicio: string;
      vigenciaFim: string;
      premioLiquido: number;
      percentualComissao?: number;
      observacoesDocumento?: string;
      tipoEndosso: string;
      descricao: string;
      motivoEndosso?: string;
      premioNovo?: number;
      percentualComissaoNovo?: number;
      dataVigenciaEndosso: string;
      observacoesEndosso?: string;
    }) => {
      const response = await api.post<{
        documento: DocumentoVenda;
        endosso: any;
      }>('/endorsements/external', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: ['area-trabalho', 'endossos'],
      });
      queryClient.invalidateQueries({ queryKey: ['area-trabalho', 'resumo'] });
    },
  });
}

export function useConfirmarPerda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentoId: string) => {
      const response = await api.post<any>(
        `/sales-documents/${documentoId}/confirm-loss`,
      );
      return response;
    },
    onSuccess: () => {
      // Invalidar e refetch imediato
      queryClient.invalidateQueries({
        queryKey: documentosVendaKeys.perdidos(),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: documentosVendaKeys.aguardandoCadastro(),
      });
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.lists() });
    },
  });
}

export function useRejeitarPerda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentoId: string) => {
      const response = await api.post<any>(
        `/sales-documents/${documentoId}/reject-loss`,
      );
      return response;
    },
    onSuccess: () => {
      // Invalidar e refetch imediato
      queryClient.invalidateQueries({
        queryKey: documentosVendaKeys.perdidos(),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: documentosVendaKeys.aguardandoCadastro(),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.lists() });
    },
  });
}

// ── Exclusão de Venda Confirmada (via aprovação) ──────────────────────────────

export type SolicitacaoExclusaoVenda = {
  id: string;
  documentoVendaId: string;
  motivo: string | null;
  status: 'PENDENTE' | 'ACEITA' | 'RECUSADA';
  criadoEm: string;
  solicitante: { id: string; nome: string; email: string };
  documentoVenda: {
    id: string;
    numeroDocumento: string | null;
    status: string;
    premioLiquido: number | null;
    vigenciaInicio: string | null;
    vigenciaFim: string | null;
    cliente: {
      id: string;
      tipoPessoa: 'PF' | 'PJ';
      nome?: string | null;
      razaoSocial?: string | null;
    };
    produto: { id: string; nomeProduto: string } | null;
    vendedor: { id: string; nome: string } | null;
  };
};

export function useSolicitacoesExclusaoVendaPendentes() {
  return useQuery({
    queryKey: ['documentos-venda', 'solicitacoes-exclusao', 'pendentes'],
    queryFn: async () => {
      return api.get<SolicitacaoExclusaoVenda[]>(
        '/sales-documents/deletion-requests/pending',
      );
    },
  });
}

export function useSolicitarExclusaoVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentoId, motivo }: { documentoId: string; motivo?: string }) => {
      return api.post(`/sales-documents/${documentoId}/request-deletion`, { motivo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.cadastro() });
      queryClient.invalidateQueries({ queryKey: ['documentos-venda', 'solicitacoes-exclusao'] });
    },
  });
}

export function useAceitarExclusaoVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (solicitacaoId: string) => {
      return api.post(`/sales-documents/deletion-requests/${solicitacaoId}/accept`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.cadastro() });
      queryClient.invalidateQueries({ queryKey: ['documentos-venda', 'solicitacoes-exclusao'] });
      queryClient.invalidateQueries({ queryKey: ['area-trabalho'] });
    },
  });
}

export function useRecusarExclusaoVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ solicitacaoId, motivoRecusa }: { solicitacaoId: string; motivoRecusa: string }) => {
      return api.post(
        `/sales-documents/deletion-requests/${solicitacaoId}/reject`,
        { motivoRecusa },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-venda', 'solicitacoes-exclusao'] });
    },
  });
}

export interface FiltrosVendedorItens {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  produtoId?: string;
  criadoApos?: string;
  criadoAntes?: string;
}

export interface PaginatedDocumentosVenda {
  data: DocumentoVenda[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function useRegistrarApoliceAvulsa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clienteId: string;
      produtoId: string;
      seguradoraParceiraId?: string;
      numeroApoliceExterna: string;
      vigenciaInicio: string;
      vigenciaFim: string;
      premioLiquido?: number;
      percentualComissao?: number;
      valorSegurado?: number;
      franquia?: number;
      itemDescricao?: string;
      observacoes?: string;
    }) => {
      return api.post<{ success: true; data: DocumentoVenda }>(
        '/sales-documents/register-standalone-policy',
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.all });
    },
  });
}

export function useDocumentosVendaVendedor(
  vendedorId: string,
  filters: FiltrosVendedorItens = {},
) {
  return useQuery({
    queryKey: documentosVendaKeys.list({ vendedorId, ...filters }),
    queryFn: async (): Promise<PaginatedDocumentosVenda> => {
      const response = await api.get<any>('/sales-documents', {
        params: {
          vendedorId,
          limit: filters.limit ?? 20,
          ...filters,
        },
      });
      // api client retorna { data: [...], meta: { total, page, totalPages, ... } }
      if (response && typeof response === 'object' && 'data' in response && 'meta' in response) {
        return response as PaginatedDocumentosVenda;
      }
      // fallback: resposta era array direto (sem paginação)
      const arr = Array.isArray(response) ? response : (response as any)?.data ?? [];
      return {
        data: arr,
        meta: { total: arr.length, page: 1, totalPages: 1, hasNext: false, hasPrev: false },
      };
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: !!vendedorId,
  });
}

// ── Troca de Vendedor ────────────────────────────────────────────────────────

export type SolicitacaoTrocaVendedor = {
  id: string;
  documentoVendaId: string;
  tipoVendedor: 'principal' | 'secundario' | 'terceiro';
  motivo: string;
  status: 'PENDENTE' | 'APROVADA' | 'RECUSADA';
  motivoRecusa: string | null;
  createdAt: string;
  dataAprovacao: string | null;
  dataRecusa: string | null;
  solicitante: { id: string; nome: string; email: string };
  vendedorAtual: { id: string; nome: string; email: string };
  novoVendedor: { id: string; nome: string; email: string };
  aprovadoPor: { id: string; nome: string } | null;
};

export function useSolicitacoesTrocaVendedor(
  documentoId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...documentosVendaKeys.detail(documentoId ?? ''), 'vendor-change-requests'],
    queryFn: async () => {
      const res = await api.get<any>(
        `/sales-documents/${documentoId}/vendor-change-requests`,
      );
      if (res && typeof res === 'object' && 'data' in res) return res.data as SolicitacaoTrocaVendedor[];
      return res as SolicitacaoTrocaVendedor[];
    },
    enabled: !!documentoId && options?.enabled !== false,
  });
}

export function useSolicitarTrocaVendedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentoId,
      tipoVendedor,
      novoVendedorId,
      motivo,
    }: {
      documentoId: string;
      tipoVendedor: 'principal' | 'secundario' | 'terceiro';
      novoVendedorId: string;
      motivo: string;
    }) => {
      return api.post(`/sales-documents/${documentoId}/vendor-change-requests`, {
        tipoVendedor,
        novoVendedorId,
        motivo,
      });
    },
    onSuccess: (_, { documentoId }) => {
      queryClient.invalidateQueries({
        queryKey: [...documentosVendaKeys.detail(documentoId), 'vendor-change-requests'],
      });
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.detail(documentoId) });
    },
  });
}

export function useAprovarTrocaVendedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentoId,
      requestId,
    }: {
      documentoId: string;
      requestId: string;
    }) => {
      return api.post(
        `/sales-documents/${documentoId}/vendor-change-requests/${requestId}/approve`,
        {},
      );
    },
    onSuccess: (_, { documentoId }) => {
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.detail(documentoId) });
      queryClient.invalidateQueries({
        queryKey: [...documentosVendaKeys.detail(documentoId), 'vendor-change-requests'],
      });
      queryClient.invalidateQueries({ queryKey: documentosVendaKeys.cadastro() });
    },
  });
}

export function useRecusarTrocaVendedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentoId,
      requestId,
      motivoRecusa,
    }: {
      documentoId: string;
      requestId: string;
      motivoRecusa: string;
    }) => {
      return api.post(
        `/sales-documents/${documentoId}/vendor-change-requests/${requestId}/reject`,
        { motivoRecusa },
      );
    },
    onSuccess: (_, { documentoId }) => {
      queryClient.invalidateQueries({
        queryKey: [...documentosVendaKeys.detail(documentoId), 'vendor-change-requests'],
      });
    },
  });
}

export function useSinistrosByDocumento(
  documentoId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...documentosVendaKeys.detail(documentoId ?? ''), 'sinistros'],
    queryFn: () => api.get<Sinistro[]>(`/sales-documents/${documentoId}/sinistros`),
    enabled: !!documentoId && options?.enabled !== false,
  });
}
