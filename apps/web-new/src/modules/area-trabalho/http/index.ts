import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { useAuthStore } from '@/infra/auth/auth-store';
import type { ResumoAreaTrabalho, RenovacaoPlanilha } from '@/types/area-trabalho';

export type ActivityFilters = {
  categorias?: string;
  q?: string;
  dataInicio?: string;
  dataFim?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve o cliente canônico de uma renovação bruta retornada pela API.
 *
 * INVARIANTE: renovacao.cliente (via renovacao_comercial.cliente_id) é a fonte
 * autoritativa e reflete qualquer reassign feito via POST /renewals/:id/reassign-client.
 * documentoVendaAnterior.cliente é dado histórico (o cliente no momento da venda
 * anterior) e NÃO é atualizado pelo reassign — usar como fallback apenas para
 * renovações antigas sem clienteId direto.
 */
export function resolveClienteFromRenovacao(renovacao: any): any | null {
  return renovacao.cliente || renovacao.documentoVendaAnterior?.cliente || null;
}

// Query Keys
export const areaTrabalhoKeys = {
  all: ['area-trabalho'] as const,
  resumo: () => [...areaTrabalhoKeys.all, 'resumo'] as const,
  renovacoes: () => [...areaTrabalhoKeys.all, 'renovacoes'] as const,
  cotacoes: () => [...areaTrabalhoKeys.all, 'cotacoes'] as const,
  cotacoesFinalizadas: () => [...areaTrabalhoKeys.all, 'cotacoes-finalizadas'] as const,
  propostas: () => [...areaTrabalhoKeys.all, 'propostas'] as const,
  vendasWorkspace: () => [...areaTrabalhoKeys.all, 'vendas-workspace'] as const,
  vendasConfirmadas: () => [...areaTrabalhoKeys.all, 'vendas-confirmadas'] as const,
  convertidos: () => [...areaTrabalhoKeys.all, 'convertidos'] as const,
  endossos: () => [...areaTrabalhoKeys.all, 'endossos'] as const,
  cancelados: () => [...areaTrabalhoKeys.all, 'cancelados'] as const,
  equipe: () => [...areaTrabalhoKeys.all, 'equipe'] as const,
  cadastroLogs: () => [...areaTrabalhoKeys.all, 'cadastro-logs'] as const,
  workspaceActivity: (page: number, limit: number, filters: ActivityFilters) => [...areaTrabalhoKeys.all, 'workspace-activity', page, limit, filters] as const,
  documentoHistorico: (documentoId: string | null) => [...areaTrabalhoKeys.all, 'documento-historico', documentoId] as const,
  planilha: (filtros: { vigenciaInicio?: string; vigenciaFim?: string }) =>
    [...areaTrabalhoKeys.all, 'planilha', filtros] as const,
  comentariosRenovacao: (id: string) => [...areaTrabalhoKeys.all, 'comentarios-renovacao', id] as const,
};

// Queries
export function useResumoAreaTrabalho() {
  return useQuery({
    queryKey: areaTrabalhoKeys.resumo(),
    queryFn: async () => {
      const response = await api.get<ResumoAreaTrabalho>(
        '/workspace/summary',
      );
      return response;
    },
    staleTime: 60 * 1000, // 1 minuto
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useRenovacoesPendentes(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: areaTrabalhoKeys.renovacoes(),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled !== false,
    queryFn: async () => {
      const response = await api.get('/renewals/pending');
      // Garante que sempre retorna um array
      const renovacoes = Array.isArray(response) ? response : [];

      // Transformar dados da API para o formato esperado
      return renovacoes
        .map((renovacao: any) => {
          const diasParaVencimento = renovacao.dataVencimento
            ? Math.ceil(
                (new Date(renovacao.dataVencimento).getTime() -
                  new Date().getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0;

          // Extrair dados do documento anterior com null-safety
          const docAnterior = renovacao.documentoVendaAnterior;
          const cliente = resolveClienteFromRenovacao(renovacao);

          // Produto: documento anterior > produto direto na renovação (resolvido no /iniciar) > texto importado
          const produto = docAnterior?.produto ?? (renovacao as any).produto ?? null;
          const produtoImportado =
            renovacao.produtoDescricao || renovacao.itemDescricao;

          // Se não há cliente, não é uma renovação válida
          if (!cliente) {
            return null;
          }

          return {
            ...renovacao,
            // Cliente pode vir do documento ou diretamente da renovação
            cliente: {
              id: cliente.id,
              nome: cliente.nome || 'Cliente sem nome',
              razaoSocial: cliente.razaoSocial || null,
              nomeFantasia: cliente.nomeFantasia || null,
              tipoPessoa: cliente.tipoPessoa || 'FISICA',
              cpf: cliente.cpf || null,
              cnpj: cliente.cnpj || null,
              // Contato: usa docAnterior.cliente mas cai para renovacao.cliente
              // (podem ter clienteId diferente ou dado mais atualizado)
              email: cliente.email || renovacao.cliente?.email || null,
              telefone: cliente.telefone || renovacao.cliente?.telefone || null,
              ativo: cliente.ativo ?? true,
            },
            // Produto pode vir do documento ou dos dados importados
            produto: produto
              ? {
                  id: produto.id,
                  nomeProduto:
                    produto.nomeProduto || produto.nome || 'Produto sem nome',
                  tipoSeguro: produto.tipoSeguro || produto.categoria || null,
                  ativo: produto.ativo ?? true,
                }
              : {
                  id: null,
                  nomeProduto: produtoImportado || 'Produto importado',
                  tipoSeguro: null,
                  ativo: true,
                },
            // Dados adicionais da importação
            itemDescricao: renovacao.itemDescricao || null,
            produtoDescricao: renovacao.produtoDescricao || null,
            seguradoraAnterior: renovacao.seguradoraAnterior || null,
            numeroApolice:
              docAnterior?.numeroApoliceExterna ||
              docAnterior?.numeroDocumento ||
              null,
            vigenciaFim: renovacao.dataVencimento,
            premioAtual: renovacao.premioAnterior
              ? parseFloat(renovacao.premioAnterior)
              : null,
            percentualComissaoAnterior: renovacao.percentualComissaoAnterior != null
              ? parseFloat(renovacao.percentualComissaoAnterior)
              : null,
            valorComissaoAnterior: renovacao.valorComissaoAnterior != null
              ? parseFloat(renovacao.valorComissaoAnterior)
              : null,
            vendedor: renovacao.vendedor || docAnterior?.vendedor || null,
            seguradoraParceira:
              docAnterior?.seguradoraParceira || renovacao.seguradoraAnterior
                ? { nomeFantasia: renovacao.seguradoraAnterior }
                : null,
            diasParaVencimento,
            prioridade:
              diasParaVencimento <= 20
                ? 'ALTA'
                : diasParaVencimento <= 40
                  ? 'MEDIA'
                  : 'BAIXA',
            // Mapear status da API para o formato esperado pelo frontend
            status:
              renovacao.status === 'NAO_TRABALHADO'
                ? 'PENDENTE'
                : renovacao.status === 'EM_PROSPECCAO' ||
                    renovacao.status === 'EM_NEGOCIACAO' ||
                    renovacao.status === 'AGUARDANDO_CLIENTE'
                  ? 'EM_ANDAMENTO'
                  : renovacao.status,
            statusOriginal: renovacao.status,
            // Documento de venda novo (se já foi gerado)
            documentoVendaNovo: renovacao.documentoVendaNovo || null,
            // Flag para identificar se veio de importação
            importadoDePlanilha: !docAnterior,
          };
        })
        .filter(
          (r: any): r is import('@/types/area-trabalho').RenovacaoPendente =>
            r !== null,
        ); // Remove renovações inválidas
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useRenovacoesVencidas(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...areaTrabalhoKeys.renovacoes(), 'vencidas'],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled !== false,
    queryFn: async () => {
      const response = await api.get('/renewals/overdue');
      const renovacoes = Array.isArray(response) ? response : [];

      return renovacoes
        .map((renovacao: any) => {
          const diasVencido = renovacao.dataVencimento
            ? Math.ceil(
                (new Date().getTime() -
                  new Date(renovacao.dataVencimento).getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0;

          const docAnterior = renovacao.documentoVendaAnterior;
          const cliente = resolveClienteFromRenovacao(renovacao);
          const produto = docAnterior?.produto ?? (renovacao as any).produto ?? null;
          const produtoImportado =
            renovacao.produtoDescricao || renovacao.itemDescricao;

          if (!cliente) return null;

          return {
            ...renovacao,
            cliente: {
              id: cliente.id,
              nome: cliente.nome || 'Cliente sem nome',
              razaoSocial: cliente.razaoSocial || null,
              nomeFantasia: cliente.nomeFantasia || null,
              tipoPessoa: cliente.tipoPessoa || 'FISICA',
              cpf: cliente.cpf || null,
              cnpj: cliente.cnpj || null,
              email: cliente.email || renovacao.cliente?.email || null,
              telefone: cliente.telefone || renovacao.cliente?.telefone || null,
              ativo: cliente.ativo ?? true,
            },
            produto: produto
              ? {
                  id: produto.id,
                  nomeProduto:
                    produto.nomeProduto || produto.nome || 'Produto sem nome',
                  tipoSeguro: produto.tipoSeguro || produto.categoria || null,
                  ativo: produto.ativo ?? true,
                }
              : {
                  id: null,
                  nomeProduto: produtoImportado || 'Produto importado',
                  tipoSeguro: null,
                  ativo: true,
                },
            itemDescricao: renovacao.itemDescricao || null,
            produtoDescricao: renovacao.produtoDescricao || null,
            seguradoraAnterior: renovacao.seguradoraAnterior || null,
            numeroApolice:
              docAnterior?.numeroApoliceExterna ||
              docAnterior?.numeroDocumento ||
              null,
            vigenciaFim: renovacao.dataVencimento,
            premioAtual: renovacao.premioAnterior != null
              ? parseFloat(renovacao.premioAnterior)
              : null,
            percentualComissaoAnterior: renovacao.percentualComissaoAnterior != null
              ? parseFloat(renovacao.percentualComissaoAnterior)
              : null,
            valorComissaoAnterior: renovacao.valorComissaoAnterior != null
              ? parseFloat(renovacao.valorComissaoAnterior)
              : null,
            vendedor: renovacao.vendedor || docAnterior?.vendedor || null,
            diasParaVencimento: -diasVencido,
            diasVencido,
            prioridade: 'ALTA' as const,
            status:
              renovacao.status === 'NAO_TRABALHADO'
                ? 'PENDENTE'
                : 'EM_ANDAMENTO',
            statusOriginal: renovacao.status,
            documentoVendaNovo: renovacao.documentoVendaNovo || null,
            importadoDePlanilha: !docAnterior,
          };
        })
        .filter((r: any): r is import('@/types/area-trabalho').RenovacaoPendente & { diasVencido: number } =>
          r !== null,
        );
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useCotacao(id: string | null, options?: { initialData?: any; initialDataUpdatedAt?: number }) {
  return useQuery({
    queryKey: [...areaTrabalhoKeys.cotacoes(), id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get(`/quotes/${id}`);
      return response;
    },
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
    ...(options?.initialData !== undefined && {
      initialData: options.initialData,
      initialDataUpdatedAt: options.initialDataUpdatedAt ?? 0,
    }),
  });
}

export interface ComentarioItem {
  id: string;
  parentId: string | null;
  texto: string;
  createdAt: string;
  autor: { id: string; nome: string; avatarUrl: string | null };
  replies: ComentarioItem[];
}

// Keep old alias for compat
export type ComentarioCotacao = ComentarioItem;

export function useComentariosCotacao(cotacaoId: string | null) {
  return useQuery({
    queryKey: [...areaTrabalhoKeys.cotacoes(), cotacaoId, 'comentarios'],
    queryFn: async () => {
      const data = await api.get<ComentarioItem[]>(`/quotes/${cotacaoId}/comments`);
      return data ?? [];
    },
    enabled: !!cotacaoId,
    staleTime: 30 * 1000,
  });
}

export function useAdicionarComentarioCotacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cotacaoId, texto, parentId }: { cotacaoId: string; texto: string; parentId?: string | null }) => {
      return api.post<ComentarioItem>(`/quotes/${cotacaoId}/comments`, { texto, parentId });
    },
    onSuccess: (_, { cotacaoId }) => {
      queryClient.invalidateQueries({ queryKey: [...areaTrabalhoKeys.cotacoes(), cotacaoId, 'comentarios'] });
    },
  });
}

export function useComentariosDocumentoVenda(documentoId: string | null) {
  return useQuery({
    queryKey: ['documentos-venda', documentoId, 'comentarios'],
    queryFn: async () => {
      const data = await api.get<ComentarioItem[]>(`/sales-documents/${documentoId}/comments`);
      return data ?? [];
    },
    enabled: !!documentoId,
    staleTime: 30 * 1000,
  });
}

export function useAdicionarComentarioDocumentoVenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentoId, texto, parentId }: { documentoId: string; texto: string; parentId?: string | null }) => {
      return api.post<ComentarioItem>(`/sales-documents/${documentoId}/comments`, { texto, parentId });
    },
    onSuccess: (_, { documentoId }) => {
      queryClient.invalidateQueries({ queryKey: ['documentos-venda', documentoId, 'comentarios'] });
    },
  });
}

const fetchCotacoesAtivas = async () => {
  const response = await api.get<any>('/quotes', { params: { status: 'EM_ELABORACAO' } });
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && 'data' in response) {
    if (Array.isArray(response.data)) return response.data;
  }
  console.error('[cotacoes] formato inesperado na resposta:', JSON.stringify(response).substring(0, 200));
  return [];
};

export const cotacoesAtivasQueryOptions = () => ({
  queryKey: areaTrabalhoKeys.cotacoes(),
  queryFn: fetchCotacoesAtivas,
  staleTime: 90 * 1000,
});

export function useCotacoesAtivas(options?: { enabled?: boolean }) {
  return useQuery({
    ...cotacoesAtivasQueryOptions(),
    refetchOnWindowFocus: false,
    enabled: options?.enabled !== false,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

function parseQuotesResponse(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && 'data' in response) {
    if (Array.isArray((response as any).data)) return (response as any).data;
  }
  return [];
}

export function useCotacoesFinalizadas(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: areaTrabalhoKeys.cotacoesFinalizadas(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled !== false,
    queryFn: async () => {
      // O endpoint só aceita um status por vez
      const [perdidas, convertidas] = await Promise.all([
        api.get<any>('/quotes', { params: { status: 'PERDIDA' } }),
        api.get<any>('/quotes', { params: { status: 'CONVERTIDA' } }),
      ]);
      return [...parseQuotesResponse(perdidas), ...parseQuotesResponse(convertidas)];
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function usePropostasAtivas() {
  return useQuery({
    queryKey: areaTrabalhoKeys.propostas(),
    staleTime: 60 * 1000,
    queryFn: async () => {
      const response = await api.get<any>('/proposals', {
        params: {
          status:
            'AGUARDANDO_ENVIO,ENVIADA,EM_ANALISE,PENDENTE_DOCUMENTACAO,APROVADA',
        },
      });

      // O api.ts já extrai o data da ApiResponse e retorna:
      // - Array direto se não houver meta
      // - { data: [...], meta: {...} } se houver paginação
      if (Array.isArray(response)) {
        return response;
      }

      if (response && typeof response === 'object' && 'data' in response) {
        if (Array.isArray(response.data)) {
          return response.data;
        }
      }

      return [];
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useVendasWorkspace() {
  const hoje = new Date();
  const limite45Dias = new Date();
  limite45Dias.setDate(hoje.getDate() + 45);
  const vigenciaFimAte = limite45Dias.toISOString().split('T')[0];

  return useQuery({
    queryKey: [...areaTrabalhoKeys.vendasWorkspace(), vigenciaFimAte],
    queryFn: async () => {
      const response = await api.get<any[]>('/sales-documents', {
        params: {
          status: 'ATIVO',
          vigenciaFimAte,
        },
      });

      // Garante que sempre retorna um array
      const vendas = Array.isArray(response) ? response : [];

      // Todos os documentos com status ATIVO são vendas ativas
      // Renovações são identificadas através da tabela renovacoes_comerciais
      return {
        todas: vendas,
        ativas: vendas,
        renovacoes: [], // Renovações vêm de outra query (useRenovacoesPendentes)
      };
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

const CONVERTIDOS_PAGE_SIZE = 20;

interface ConvertidosFilters {
  clienteId?: string;
  criadoApos?: string;
  criadoAntes?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function useConvertidos(filters?: ConvertidosFilters) {
  return useInfiniteQuery({
    queryKey: [...areaTrabalhoKeys.convertidos(), filters],
    queryFn: async ({ pageParam = 1 }) => {
      // A API retorna { success, data, meta } mas o client extrai só o conteúdo
      // Para paginação, precisamos da resposta completa
      const response = await api.get<PaginatedResponse<any>>(
        '/sales-documents',
        {
          params: {
            status: 'ATIVO,PERDIDO',
            page: pageParam,
            limit: CONVERTIDOS_PAGE_SIZE,
            ...filters,
          },
        },
      );

      // O api client pode retornar:
      // 1. Array direto (quando não há wrapper)
      // 2. { data: [], meta: {} } (quando há paginação)
      const isArray = Array.isArray(response);
      const data = isArray ? response : response?.data || [];
      const meta = isArray
        ? {
            total: data.length,
            page: pageParam,
            limit: CONVERTIDOS_PAGE_SIZE,
            totalPages: 1,
            hasNext: false,
          }
        : response?.meta || {
            total: data.length,
            page: pageParam,
            limit: CONVERTIDOS_PAGE_SIZE,
            totalPages: 1,
            hasNext: false,
          };

      return {
        data,
        meta,
        nextPage: meta.hasNext ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
    placeholderData: keepPreviousData, // Mantém dados anteriores enquanto carrega novos filtros
  });
}

// Hook helper para obter todos os convertidos como array plano
export function useConvertidosFlat(filters?: ConvertidosFilters) {
  const query = useConvertidos(filters);
  const allData = query.data?.pages.flatMap((page) => page.data) || [];
  const total = query.data?.pages[0]?.meta.total || 0;

  return {
    ...query,
    data: allData,
    total,
  };
}

// Mutations
export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/quotes', data);

      return response;
    },
    onSuccess: async () => {
      // Invalida as queries
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.equipe() });

      // Força refetch imediato
      await queryClient.refetchQueries({
        queryKey: areaTrabalhoKeys.cotacoes(),
      });
    },
  });
}

export function useCreateProspecto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { nome: string; produtoId: string }) => {
      const response = await api.post('/quotes/prospecto', data);
      return response;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.equipe() });
      await queryClient.refetchQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.patch(`/quotes/${id}`, data);
    },
    onSuccess: (responseData: any, { id }) => {
      // Atualiza cache da lista imediatamente com a resposta do PATCH.
      queryClient.setQueryData<any[]>(areaTrabalhoKeys.cotacoes(), (old) =>
        Array.isArray(old) ? old.map((c) => (c.id === id ? { ...c, ...responseData } : c)) : old,
      );
      // Atualiza cache individual para que CotacaoDialog leia dados frescos
      // sem precisar de um round-trip ao backend.
      queryClient.setQueryData<any>([...areaTrabalhoKeys.cotacoes(), id], (old: any) =>
        old ? { ...old, ...responseData } : responseData,
      );
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.equipe() });
    },
  });
}

export function useSolicitarInclusaoItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentoId,
      data,
    }: {
      documentoId: string;
      data: {
        produtoId?: string;
        seguradoraParceiraId?: string;
        vigenciaInicio?: string;
        vigenciaFim?: string;
        premioLiquido?: number;
        itemDescricao?: string;
        observacoes: string;
        novoVendedorId?: string;
      };
    }) => {
      return api.post(`/sales-documents/${documentoId}/request-inclusion`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.convertidos() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
    },
  });
}

export function useCreateSaleDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      return api.post('/sales-documents', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
    },
  });
}

export function useConverterCotacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cotacaoId,
      tipo,
    }: {
      cotacaoId: string;
      tipo: 'PROPOSTA' | 'DOCUMENTO_VENDA';
    }) => {
      return api.post(`/quotes/${cotacaoId}/converter`, { tipo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.propostas() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.equipe() });
    },
  });
}

export function useConfirmarVendaCotacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cotacaoId,
      skipAnexosCheck,
      fechadorId,
      vigenciaInicio,
      vigenciaFim,
    }: {
      cotacaoId: string;
      skipAnexosCheck?: boolean;
      fechadorId?: string;
      vigenciaInicio: string;
      vigenciaFim: string;
    }) => {
      return api.post(`/quotes/${cotacaoId}/confirm-sale`, {
        skipAnexosCheck: skipAnexosCheck ?? false,
        ...(fechadorId ? { fechadorId } : {}),
        vigenciaInicio,
        vigenciaFim,
      });
    },
    onSuccess: () => {
      // Invalida toda a hierarquia area-trabalho de uma vez para garantir consistência
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.all });
    },
  });
}

export function useMarcarCotacaoPerdida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cotacaoId,
      ...data
    }: {
      cotacaoId: string;
      motivoPerda: string;
      detalhesPerda?: string;
      concorrenteGanhou?: string;
    }) => {
      return api.post(`/quotes/${cotacaoId}/mark-as-lost`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoesFinalizadas() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.equipe() });
    },
    onError: () => {
      // Força refetch do status real da cotação para que o dialog reflita
      // o estado atual do banco (ex: já estava PERDIDA quando o erro ocorreu)
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
    },
  });
}

export function useReabrirCotacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cotacaoId: string) => {
      return api.post(`/quotes/${cotacaoId}/reopen`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.equipe() });
      queryClient.invalidateQueries({ queryKey: ['renovacoes'] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
    },
  });
}

export function useConfirmarVendaProposta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propostaId: string) => {
      return api.post(`/proposals/${propostaId}/confirm-sale`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.propostas() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
    },
  });
}

export function useIniciarRenovacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ renovacaoId, produtoId }: { renovacaoId: string; produtoId?: string }) => {
      return api.post(`/renewals/${renovacaoId}/start`, produtoId ? { produtoId } : {});
    },
    onSuccess: async (data: any, { renovacaoId }) => {
      // Pre-popular cache da cotação individual com as relações já retornadas
      // pelo backend — evita o GET extra em abrirCotacaoDaRenovacao.
      if (data?.cotacao?.id) {
        queryClient.setQueryData(
          [...areaTrabalhoKeys.cotacoes(), data.cotacao.id],
          data.cotacao,
        );
      }
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.renovacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
      // Garante que comentários stale da renovação não apareçam ao desfazer o início.
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.comentariosRenovacao(renovacaoId) });
      // Equipe em background — endpoint mais pesado, não bloqueia abertura do dialog.
      queryClient.refetchQueries({ queryKey: areaTrabalhoKeys.equipe() });
      // Aguarda apenas a lista de cotações para garantir exibição imediata na aba.
      await queryClient.refetchQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
    },
  });
}

export function useReatribuirClienteRenovacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      renovacaoId,
      novoClienteId,
    }: {
      renovacaoId: string;
      novoClienteId: string;
    }) => {
      return api.post(`/renewals/${renovacaoId}/reassign-client`, {
        novoClienteId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.renovacoes() });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}

export function useDesfazerInicioRenovacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (renovacaoId: string) => {
      return api.post(`/renewals/${renovacaoId}/undo-start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.renovacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.equipe() });
    },
  });
}

// Cotação - Vendedores
export function useVendedoresCotacao(cotacaoId: string) {
  return useQuery({
    queryKey: [
      ...areaTrabalhoKeys.cotacoes(),
      cotacaoId,
      'vendedores',
    ] as const,
    queryFn: async () => {
      const response = await api.get<any[]>(
        `/quotes/${cotacaoId}/sellers`,
      );
      return Array.isArray(response) ? response : [];
    },
    enabled: !!cotacaoId,
  });
}

export function useAdicionarVendedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cotacaoId,
      vendedorId,
    }: {
      cotacaoId: string;
      vendedorId: string;
    }) => {
      return api.post(`/quotes/${cotacaoId}/sellers`, { vendedorId });
    },
    onSuccess: (_, { cotacaoId }) => {
      queryClient.invalidateQueries({
        queryKey: [...areaTrabalhoKeys.cotacoes(), cotacaoId],
      });
      queryClient.invalidateQueries({
        queryKey: [...areaTrabalhoKeys.cotacoes(), cotacaoId, 'vendedores'],
      });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
    },
  });
}

// Endossos
// Requer: workspace:acessar OU cadastro:acessar (backend: /area-trabalho/endossos)
export function useEndossosPendentes(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: areaTrabalhoKeys.endossos(),
    queryFn: async () => {
      const response = await api.get<any>('/workspace/endorsements');
      const items = Array.isArray(response) ? response : (response?.data ?? []);
      return Array.isArray(items) ? items : [];
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
    staleTime: 60 * 1000, // 1 minuto
    enabled: options?.enabled ?? true,
  });
}

// Endossos recusados recentemente (últimos 30 dias, para o vendedor ver o motivo)
export function useEndossosRecusados(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...areaTrabalhoKeys.all, 'endossos-recusados'] as const,
    queryFn: async () => {
      const response = await api.get<any>('/endorsements?status=RECUSADO&limit=20');
      const items = response?.data ?? response?.items ?? [];
      return Array.isArray(items) ? items : [];
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

// Documentos Cancelados
export function useDocumentosCancelados() {
  return useQuery({
    queryKey: areaTrabalhoKeys.cancelados(),
    queryFn: async () => {
      const response = await api.get<any[]>('/workspace/cancelled');
      return Array.isArray(response) ? response : [];
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Documentos VENDA_CONFIRMADA (aguardando envio ao cadastro ou rejeitados)
export function useDocumentosVendaConfirmados() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: areaTrabalhoKeys.vendasConfirmadas(),
    enabled: !!user?.sub,
    queryFn: async () => {
      const response = await api.get<any>('/sales-documents', {
        params: { status: 'VENDA_CONFIRMADA,AGUARDANDO_CADASTRO', vendedorId: user!.sub },
      });
      if (Array.isArray(response)) return response;
      if (response && typeof response === 'object' && 'data' in response) {
        return Array.isArray(response.data) ? response.data : [];
      }
      return [];
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
    staleTime: 60 * 1000,
  });
}

export function useCadastroLogs(page = 1, limit = 20, search = '', enabled = true) {
  return useQuery({
    queryKey: [...areaTrabalhoKeys.cadastroLogs(), page, limit, search],
    enabled,
    queryFn: async () => {
      const response = await api.get<any>('/sales-documents/registration-logs', {
        params: { page, limit, ...(search ? { search } : {}) },
      });
      if (response && typeof response === 'object' && 'data' in response) {
        return {
          data: Array.isArray(response.data) ? response.data : [],
          total: response.total ?? 0,
          page: response.page ?? page,
          totalPages: response.totalPages ?? 1,
        };
      }
      return { data: [], total: 0, page, totalPages: 1 };
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
    staleTime: 60 * 1000,
  });
}

export function useWorkspaceActivity(page = 1, limit = 30, filters: ActivityFilters = {}) {
  return useQuery({
    queryKey: areaTrabalhoKeys.workspaceActivity(page, limit, filters),
    queryFn: async () => {
      const params: Record<string, any> = { page, limit };
      if (filters.categorias) params.categorias = filters.categorias;
      if (filters.q) params.q = filters.q;
      if (filters.dataInicio) params.dataInicio = filters.dataInicio;
      if (filters.dataFim) params.dataFim = filters.dataFim;
      const response = await api.get<any>('/workspace/activity', { params });
      if (response && typeof response === 'object' && 'data' in response) {
        return {
          data: Array.isArray(response.data) ? response.data : [],
          total: (response as any).total ?? 0,
          page: (response as any).page ?? page,
          totalPages: (response as any).totalPages ?? 1,
        };
      }
      return { data: [], total: 0, page, totalPages: 1 };
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useDocumentoHistorico(documentoVendaId: string | null) {
  return useQuery({
    queryKey: areaTrabalhoKeys.documentoHistorico(documentoVendaId),
    enabled: !!documentoVendaId,
    queryFn: async () => {
      const response = await api.get<any>(`/sales-documents/${documentoVendaId}/history`);
      if (response && typeof response === 'object' && 'data' in response) {
        return Array.isArray(response.data) ? response.data : [];
      }
      return Array.isArray(response) ? response : [];
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
    staleTime: 30 * 1000,
  });
}

export function useEndosso(id: string | null) {
  return useQuery({
    queryKey: [...areaTrabalhoKeys.all, 'endosso', id],
    queryFn: async () => {
      const response = await api.get<any>(`/endorsements/${id}`);
      return (response as any)?.data ?? response;
    },
    enabled: !!id,
    retry: (failureCount, error: any) => error?.status !== 403 && failureCount < 2,
    staleTime: 30 * 1000,
  });
}

export function useEndossosRecusadosByDocumento(
  documentoId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...areaTrabalhoKeys.all, 'endossos-recusados-doc', documentoId],
    queryFn: async () => {
      const res = await api.get<any>(`/endorsements?documentoVendaId=${documentoId}&status=RECUSADO`);
      const items = (res as any)?.data ?? (res as any)?.items ?? [];
      return Array.isArray(items) ? items : [];
    },
    enabled: !!documentoId && options?.enabled !== false,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
    staleTime: 30 * 1000,
  });
}

export function useAtualizarEndosso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return api.patch(`/endorsements/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...areaTrabalhoKeys.all, 'endossos-recusados'] });
    },
  });
}

export function useReenviarEndosso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (endossoId: string) => {
      return api.post(`/endorsements/${endossoId}/resend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...areaTrabalhoKeys.all, 'endossos-recusados'] });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.endossos() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
    },
  });
}

export function useSolicitarValidacaoCadastro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentoId: string) => {
      return api.post(`/sales-documents/${documentoId}/request-registration-validation`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.vendasConfirmadas() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
    },
  });
}

export function useUpdateSaleDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      return api.patch(`/sales-documents/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.vendasConfirmadas() });
    },
  });
}

export interface MembroEquipe {
  id: string;
  nome: string;
  avatarUrl: string | null;
}

export interface EquipeWorkspaceData {
  renovacoesPendentes: import('@/types/area-trabalho').RenovacaoPendente[];
  renovacoesVencidas: (import('@/types/area-trabalho').RenovacaoPendente & { diasVencido: number })[];
  cotacoes: any[];
  membros: MembroEquipe[];
}

function transformRenovacaoItem(r: any, isVencida = false): (import('@/types/area-trabalho').RenovacaoPendente & { diasVencido?: number }) | null {
  const docAnterior = r.documentoVendaAnterior;
  const cliente = docAnterior?.cliente || r.cliente;
  const produto = docAnterior?.produto ?? r.produto ?? null;
  const produtoImportado = r.produtoDescricao || r.itemDescricao;

  if (!cliente) return null;

  const diasParaVencimento = r.dataVencimento
    ? Math.ceil((new Date(r.dataVencimento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    ...r,
    cliente: {
      id: cliente.id,
      nome: cliente.nome || 'Cliente sem nome',
      razaoSocial: cliente.razaoSocial || null,
      nomeFantasia: cliente.nomeFantasia || null,
      tipoPessoa: cliente.tipoPessoa || 'FISICA',
      cpf: cliente.cpf || null,
      cnpj: cliente.cnpj || null,
      email: cliente.email || r.cliente?.email || null,
      telefone: cliente.telefone || r.cliente?.telefone || null,
      ativo: cliente.ativo ?? true,
    },
    produto: produto
      ? { id: produto.id, nomeProduto: produto.nomeProduto || 'Produto sem nome', tipoSeguro: produto.tipoSeguro || null, ativo: produto.ativo ?? true }
      : { id: null, nomeProduto: produtoImportado || 'Produto importado', tipoSeguro: null, ativo: true },
    itemDescricao: r.itemDescricao || null,
    produtoDescricao: r.produtoDescricao || null,
    seguradoraAnterior: r.seguradoraAnterior || null,
    numeroApolice: docAnterior?.numeroApoliceExterna || docAnterior?.numeroDocumento || null,
    vigenciaFim: r.dataVencimento,
    premioAtual: r.premioAnterior ? parseFloat(r.premioAnterior) : null,
    percentualComissaoAnterior: r.percentualComissaoAnterior != null ? parseFloat(r.percentualComissaoAnterior) : null,
    valorComissaoAnterior: r.valorComissaoAnterior != null ? parseFloat(r.valorComissaoAnterior) : null,
    vendedor: r.vendedor || docAnterior?.vendedor || null,
    seguradoraParceira: docAnterior?.seguradoraParceira || (r.seguradoraAnterior ? { nomeFantasia: r.seguradoraAnterior } : null),
    diasParaVencimento: isVencida ? -Math.abs(diasParaVencimento) : diasParaVencimento,
    diasVencido: isVencida ? Math.abs(diasParaVencimento) : undefined,
    prioridade: (isVencida || diasParaVencimento <= 20) ? 'ALTA' : diasParaVencimento <= 40 ? 'MEDIA' : 'BAIXA',
    status: r.status === 'NAO_TRABALHADO' ? 'PENDENTE' : 'EM_ANDAMENTO',
    statusOriginal: r.status,
    importadoDePlanilha: !docAnterior,
  } as any;
}

export type ComentarioRenovacao = ComentarioItem;

export function useComentariosRenovacao(renovacaoId: string | null) {
  return useQuery({
    queryKey: areaTrabalhoKeys.comentariosRenovacao(renovacaoId ?? ''),
    queryFn: async () => {
      const data = await api.get<ComentarioItem[]>(`/renewals/${renovacaoId}/comments`);
      return data ?? [];
    },
    enabled: !!renovacaoId,
    staleTime: 30 * 1000,
  });
}

export function useAdicionarComentarioRenovacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ renovacaoId, texto, parentId }: { renovacaoId: string; texto: string; parentId?: string | null }) => {
      return api.post<ComentarioItem>(`/renewals/${renovacaoId}/comments`, { texto, parentId });
    },
    onSuccess: (_, { renovacaoId }) => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.comentariosRenovacao(renovacaoId) });
    },
  });
}

const fetchEquipeWorkspace = async (): Promise<EquipeWorkspaceData> => {
  const response = await api.get<any>('/workspace/team');
  const raw = (response && 'renovacoesPendentes' in response) ? response : { renovacoesPendentes: [], renovacoesVencidas: [], cotacoes: [], membros: [] };
  return {
    renovacoesPendentes: (raw.renovacoesPendentes || []).map((r: any) => transformRenovacaoItem(r, false)).filter(Boolean) as import('@/types/area-trabalho').RenovacaoPendente[],
    renovacoesVencidas: (raw.renovacoesVencidas || []).map((r: any) => transformRenovacaoItem(r, true)).filter(Boolean) as any[],
    cotacoes: raw.cotacoes || [],
    membros: raw.membros || [],
  };
};

export const equipeWorkspaceQueryOptions = () => ({
  queryKey: areaTrabalhoKeys.equipe(),
  queryFn: fetchEquipeWorkspace,
  staleTime: 2 * 60 * 1000,
});

export function useEquipeWorkspace() {
  return useQuery({
    ...equipeWorkspaceQueryOptions(),
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useUpdateRenovacaoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/renewals/${id}/update-status`, { status });
    },
    onSuccess: () => {
      // Planilha é invalidada no callback do inline-edit (tem acesso aos filtros de vigência)
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
    },
  });
}

export function useUpdateRenovacaoValues() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        premioNovo?: number;
        percentualComissaoNovo?: number;
        novaVigenciaInicio?: string;
        novaVigenciaFim?: string;
      };
    }) => {
      return api.patch(`/renewals/${id}/update-values`, data);
    },
    // Planilha invalidada no callback do inline-edit; valores não afetam contadores do resumo
  });
}

const fetchPlanilhaRenovacoes = async (filtros: { vigenciaInicio?: string; vigenciaFim?: string }) => {
  const params: Record<string, string> = {};
  if (filtros.vigenciaInicio) params.vigenciaInicio = filtros.vigenciaInicio;
  if (filtros.vigenciaFim) params.vigenciaFim = filtros.vigenciaFim;
  const response = await api.get<RenovacaoPlanilha[]>('/workspace/spreadsheet', { params });
  return Array.isArray(response) ? response : [];
};

export const planilhaRenovacoesQueryOptions = (filtros: { vigenciaInicio?: string; vigenciaFim?: string }) => ({
  queryKey: areaTrabalhoKeys.planilha(filtros),
  queryFn: () => fetchPlanilhaRenovacoes(filtros),
  staleTime: 2 * 60 * 1000,
});

export function usePlanilhaRenovacoes(filtros: {
  vigenciaInicio?: string;
  vigenciaFim?: string;
}) {
  return useQuery({
    ...planilhaRenovacoesQueryOptions(filtros),
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

// ─── Cotação Tags ────────────────────────────────────────────────────────────

export const cotacaoTagsKeys = {
  all: ['cotacao-tags'] as const,
  list: () => [...cotacaoTagsKeys.all, 'list'] as const,
};

export function useCotacaoTags() {
  return useQuery({
    queryKey: cotacaoTagsKeys.list(),
    queryFn: async () => {
      const response = await api.get<import('@/types/area-trabalho').CotacaoTag[]>(
        '/cotacao-tags',
      );
      return Array.isArray(response) ? response : [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateCotacaoTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { nome: string; cor: string }) => {
      return api.post('/cotacao-tags', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cotacaoTagsKeys.list() });
    },
  });
}

export function useUpdateCotacaoTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tagId,
      data,
    }: {
      tagId: string;
      data: { nome?: string; cor?: string };
    }) => {
      return api.patch(`/cotacao-tags/${tagId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cotacaoTagsKeys.list() });
    },
  });
}

export function useDeleteCotacaoTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tagId: string) => {
      return api.delete(`/cotacao-tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cotacaoTagsKeys.list() });
    },
  });
}

export function useAddTagToCotacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cotacaoId,
      tagId,
    }: {
      cotacaoId: string;
      tagId: string;
    }) => {
      return api.post(`/quotes/${cotacaoId}/tags`, { tagId });
    },
    onMutate: async ({ cotacaoId, tagId }) => {
      await queryClient.cancelQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      const prev = queryClient.getQueryData<import('@/types/area-trabalho').Cotacao[]>(areaTrabalhoKeys.cotacoes());
      const allTags = queryClient.getQueryData<import('@/types/area-trabalho').CotacaoTag[]>(cotacaoTagsKeys.list()) ?? [];
      const fullTag = allTags.find((t) => t.id === tagId) ?? ({ id: tagId } as any);
      const addTag = (tags: any[]) => [...tags, fullTag];
      queryClient.setQueryData<import('@/types/area-trabalho').Cotacao[]>(
        areaTrabalhoKeys.cotacoes(),
        (old) => old?.map((c) => c.id === cotacaoId ? { ...c, tags: addTag(c.tags ?? []) } : c) ?? [],
      );
      queryClient.setQueryData<any>([...areaTrabalhoKeys.cotacoes(), cotacaoId], (old: any) =>
        old ? { ...old, tags: addTag(old.tags ?? []) } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(areaTrabalhoKeys.cotacoes(), ctx.prev);
    },
    onSettled: (_data, _err, { cotacaoId }) => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: [...areaTrabalhoKeys.cotacoes(), cotacaoId] });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.equipe() });
    },
  });
}

export function useRemoveTagFromCotacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cotacaoId,
      tagId,
    }: {
      cotacaoId: string;
      tagId: string;
    }) => {
      return api.delete(`/quotes/${cotacaoId}/tags/${tagId}`);
    },
    onMutate: async ({ cotacaoId, tagId }) => {
      await queryClient.cancelQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      const prev = queryClient.getQueryData<import('@/types/area-trabalho').Cotacao[]>(areaTrabalhoKeys.cotacoes());
      const removeTag = (tags: any[]) => tags.filter((t) => t.id !== tagId);
      queryClient.setQueryData<import('@/types/area-trabalho').Cotacao[]>(
        areaTrabalhoKeys.cotacoes(),
        (old) => old?.map((c) => c.id === cotacaoId ? { ...c, tags: removeTag(c.tags ?? []) } : c) ?? [],
      );
      queryClient.setQueryData<any>([...areaTrabalhoKeys.cotacoes(), cotacaoId], (old: any) =>
        old ? { ...old, tags: removeTag(old.tags ?? []) } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(areaTrabalhoKeys.cotacoes(), ctx.prev);
    },
    onSettled: (_data, _err, { cotacaoId }) => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: [...areaTrabalhoKeys.cotacoes(), cotacaoId] });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.equipe() });
    },
  });
}

export function useUpdateCotacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cotacaoId,
      data,
    }: {
      cotacaoId: string;
      data: Record<string, unknown>;
    }) => {
      return api.patch(`/quotes/${cotacaoId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
    },
  });
}

export function useArchiveQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cotacaoId: string) => {
      return api.patch(`/quotes/${cotacaoId}/archive`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoesFinalizadas() });
      queryClient.invalidateQueries({ queryKey: [...areaTrabalhoKeys.all, 'cotacoes-arquivadas'] });
    },
  });
}

export function useRestoreQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cotacaoId: string) => {
      return api.post(`/quotes/${cotacaoId}/restore`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoesFinalizadas() });
      queryClient.invalidateQueries({ queryKey: [...areaTrabalhoKeys.all, 'cotacoes-arquivadas'] });
    },
  });
}

export function useArchiveRenovacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (renovacaoId: string) => {
      return api.patch(`/renewals/${renovacaoId}/archive`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...areaTrabalhoKeys.all, 'planilha'] });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.renovacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.equipe() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
    },
  });
}

export function useRestoreRenovacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (renovacaoId: string) => {
      return api.post(`/renewals/${renovacaoId}/restore`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...areaTrabalhoKeys.all, 'planilha'] });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.renovacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.equipe() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
    },
  });
}

export function useCancelarRenovacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivoCancelamento }: { id: string; motivoCancelamento: string }) => {
      return api.post(`/renewals/${id}/mark-as-cancelled`, { motivoCancelamento });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...areaTrabalhoKeys.all, 'planilha'] });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.renovacoes() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.equipe() });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
    },
  });
}

export function useCotacoesArquivadas(enabled = false) {
  return useQuery({
    queryKey: [...areaTrabalhoKeys.all, 'cotacoes-arquivadas'],
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await api.get<any>('/quotes', { params: { archivedOnly: 'true' } });
      if (Array.isArray(response)) return response;
      if (response && typeof response === 'object' && 'data' in response) {
        if (Array.isArray(response.data)) return response.data;
      }
      return [];
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useUpdateCotacaoEtapa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cotacaoId,
      etapa,
    }: {
      cotacaoId: string;
      etapa: import('@/types/area-trabalho').EtapaCotacao;
    }) => {
      return api.patch(`/quotes/${cotacaoId}`, { etapa });
    },
    onMutate: async () => {
      // Cancel any in-flight refetches so they don't overwrite the optimistic board state
      await queryClient.cancelQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.cotacoes() });
    },
  });
}
