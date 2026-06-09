import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { toast } from 'sonner';

export function useTiposSeguro() {
  return useQuery({
    queryKey: ['produtos', 'tipos-seguro'],
    queryFn: () => api.get<string[]>('/products/tipos-seguro'),
    staleTime: 5 * 60 * 1000,
  });
}

export type TipoNegocio = 'NOVO' | 'RENOVACAO' | null;
export type StatusPagamentoComissao = 'PENDENTE' | 'PAGO' | 'CANCELADO';

export interface CorretoraComissaoConfig {
  id: string;
  corretoraId: string;
  tipoSeguro: string;
  tipoNegocio: TipoNegocio;
  percentualParticipacao: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioComissaoConfig {
  id: string;
  usuarioId: string;
  nomeUsuario: string;
  tipoSeguro: string;
  tipoNegocio: TipoNegocio;
  percentualParticipacao: string;
  createdAt: string;
  updatedAt: string;
}

export interface CargoComissaoConfig {
  id: string;
  cargoId: string;
  nomeCargo: string;
  tipoSeguro: string;
  tipoNegocio: TipoNegocio;
  percentualParticipacao: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtratoComissaoItem {
  id: string;
  numeroDocumento: string;
  status: string;
  statusPagamentoComissao: StatusPagamentoComissao;
  dataPagamentoComissao: string | null;
  observacaoPagamentoComissao: string | null;
  premioLiquido: string | null;
  percentualComissao: string | null;
  valorComissao: string | null;
  valorComissaoCorretora: string | null;
  valorComissaoVendedor: string | null;
  negocioCorretora: boolean;
  vigenciaInicio: string;
  vigenciaFim: string;
  createdAt: string;
  nomeVendedor: string;
  nomeProduto: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface RelatorioComissoes {
  totais: {
    totalComissoes: string;
    totalPago: string;
    totalPendente: string;
    totalCancelado: string;
    qtdDocumentos: number;
    qtdPago: number;
    qtdPendente: number;
  };
  porVendedor: Array<{
    vendedorId: string;
    nomeVendedor: string;
    totalComissao: string | null;
    qtdDocumentos: number;
  }>;
  porProduto: Array<{
    produtoId: string;
    nomeProduto: string;
    totalComissao: string | null;
    qtdDocumentos: number;
  }>;
}

export interface ComissaoConfigHistoricoItem {
  id: string;
  corretoraId: string;
  escopo: string;
  registroId: string | null;
  tipoOperacao: 'CRIACAO' | 'ATUALIZACAO' | 'EXCLUSAO';
  dadosAntes: Record<string, any> | null;
  dadosDepois: Record<string, any> | null;
  usuarioId: string | null;
  usuarioNome: string | null;
  createdAt: string;
}

// ─── Config Queries ───────────────────────────────────────────────────────────

export function useConfigsGlobais() {
  return useQuery({
    queryKey: ['configuracoes-comissoes', 'global'],
    queryFn: () => api.get<CorretoraComissaoConfig[]>('/settings/commissions/global'),
  });
}

export function useConfigsVendedores() {
  return useQuery({
    queryKey: ['configuracoes-comissoes', 'vendedores'],
    queryFn: () => api.get<UsuarioComissaoConfig[]>('/settings/commissions/sellers'),
  });
}

export function useConfigsCargos() {
  return useQuery({
    queryKey: ['configuracoes-comissoes', 'cargos'],
    queryFn: () => api.get<CargoComissaoConfig[]>('/settings/commissions/roles'),
  });
}

export function useResolveCommission(params: {
  usuarioId?: string;
  tipoSeguro?: string;
  tipoNegocio?: 'NOVO' | 'RENOVACAO';
  enabled?: boolean;
}) {
  const query = new URLSearchParams();
  if (params.usuarioId) query.set('usuarioId', params.usuarioId);
  if (params.tipoSeguro) query.set('tipoSeguro', params.tipoSeguro);
  if (params.tipoNegocio) query.set('tipoNegocio', params.tipoNegocio);

  return useQuery({
    queryKey: ['configuracoes-comissoes', 'resolver', params],
    queryFn: () =>
      api.get<{
        percentualParticipacao: string | null;
        fonte: string | null;
        sistemaAtivo: boolean;
      }>(`/settings/commissions/resolve?${query.toString()}`),
    enabled: !!params.tipoSeguro && params.enabled !== false,
    staleTime: 30 * 1000,
  });
}

// ─── Config Mutations ─────────────────────────────────────────────────────────

export function useUpsertConfigGlobal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { tipoSeguro: string; tipoNegocio?: TipoNegocio; percentualParticipacao: number }) =>
      api.put('/settings/commissions/global', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'global'] });
      toast.success('Configuração salva');
    },
    onError: () => toast.error('Erro ao salvar configuração'),
  });
}

export function useDeleteConfigGlobal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/settings/commissions/global/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'global'] });
      toast.success('Configuração removida');
    },
    onError: () => toast.error('Erro ao remover configuração'),
  });
}

export function useCreateConfigVendedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { usuarioId: string; tipoSeguro: string; tipoNegocio?: TipoNegocio; percentualParticipacao: number }) =>
      api.post('/settings/commissions/sellers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'vendedores'] });
      toast.success('Configuração criada');
    },
    onError: (err: any) =>
      toast.error(err?.message ?? 'Erro ao criar configuração'),
  });
}

export function useUpdateConfigVendedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, percentualParticipacao }: { id: string; percentualParticipacao: number }) =>
      api.put(`/settings/commissions/sellers/${id}`, { percentualParticipacao }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'vendedores'] });
      toast.success('Configuração atualizada');
    },
    onError: () => toast.error('Erro ao atualizar configuração'),
  });
}

export function useDeleteConfigVendedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/settings/commissions/sellers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'vendedores'] });
      toast.success('Configuração removida');
    },
    onError: () => toast.error('Erro ao remover configuração'),
  });
}

export function useCreateBatchConfigs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      usuarioIds: string[];
      tipoSeguro: string;
      tipoNegocio?: TipoNegocio;
      percentualParticipacao: number;
    }) => api.post<{ criados: number; atualizados: number; erros: string[] }>('/settings/commissions/sellers/lote', data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'vendedores'] });
      toast.success(`${result.criados} criados, ${result.atualizados} atualizados`);
    },
    onError: () => toast.error('Erro ao aplicar configuração em lote'),
  });
}

export function useUpsertConfigCargo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { cargoId: string; tipoSeguro: string; tipoNegocio?: TipoNegocio; percentualParticipacao: number }) =>
      api.post('/settings/commissions/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'cargos'] });
      toast.success('Configuração salva');
    },
    onError: () => toast.error('Erro ao salvar configuração'),
  });
}

export function useDeleteConfigCargo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/settings/commissions/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'cargos'] });
      toast.success('Configuração removida');
    },
    onError: () => toast.error('Erro ao remover configuração'),
  });
}

// ─── Extrato ──────────────────────────────────────────────────────────────────

export function useExtratoComissoes(params: {
  vendedorId?: string;
  statusPagamento?: StatusPagamentoComissao | '';
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.vendedorId) query.set('vendedorId', params.vendedorId);
  if (params.statusPagamento) query.set('statusPagamento', params.statusPagamento);
  if (params.dataInicio) query.set('dataInicio', params.dataInicio);
  if (params.dataFim) query.set('dataFim', params.dataFim);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  return useQuery({
    queryKey: ['configuracoes-comissoes', 'extrato', params],
    queryFn: () =>
      api.get<PaginatedResponse<ExtratoComissaoItem>>(
        `/settings/commissions/statement?${query.toString()}`,
      ),
  });
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      statusPagamentoComissao: StatusPagamentoComissao;
      dataPagamentoComissao?: string | null;
      observacaoPagamentoComissao?: string | null;
    }) => api.patch(`/settings/commissions/statement/${id}/payment`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'extrato'] });
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'relatorio'] });
      toast.success('Status de pagamento atualizado');
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });
}

// ─── Relatório ────────────────────────────────────────────────────────────────

export function useRelatorioComissoes(params: { dataInicio?: string; dataFim?: string }) {
  const query = new URLSearchParams();
  if (params.dataInicio) query.set('dataInicio', params.dataInicio);
  if (params.dataFim) query.set('dataFim', params.dataFim);

  return useQuery({
    queryKey: ['configuracoes-comissoes', 'relatorio', params],
    queryFn: () =>
      api.get<RelatorioComissoes>(
        `/settings/commissions/report?${query.toString()}`,
      ),
  });
}

// ─── Lançamentos ─────────────────────────────────────────────────────────────

export type StatusRecebimentoSeguradora = 'AGUARDANDO' | 'RECEBIDO' | 'NAO_APLICAVEL';
export type TipoLancamento = 'NORMAL' | 'AJUSTE_ENDOSSO' | 'ESTORNO_CANCELAMENTO' | 'PRO_RATA';
export type ModalidadePagamentoVendedor = 'AVISTA' | 'PARCELADO';

export interface ComissaoLancamento {
  id: string;
  corretoraId: string;
  documentoVendaId: string;
  endossoId: string | null;
  tipo: TipoLancamento;
  descricao: string | null;
  numeroParcela: number;
  totalParcelas: number;
  valorPremioReferencia: string | null;
  percentualComissao: string | null;
  valorComissaoTotal: string;
  valorComissaoVendedor: string | null;
  valorComissaoCorretora: string | null;
  dataCompetencia: string | null;
  dataVencimento: string | null;
  statusRecebimentoSeguradora: StatusRecebimentoSeguradora;
  dataRecebimentoSeguradora: string | null;
  observacaoRecebimento: string | null;
  statusPagamentoVendedor: StatusPagamentoComissao;
  dataPagamentoVendedor: string | null;
  observacaoPagamento: string | null;
  pago_por_id: string | null;
  createdAt: string;
  updatedAt: string;
  vendedorNome: string | null;
  vendedorEmail: string | null;
}

export interface ProjecaoMes {
  mes: string;
  totalComissao: string | null;
  totalVendedor: string | null;
  totalCorretora: string | null;
  qtdParcelas: number;
  qtdPendentes: number;
  qtdPagos: number;
  qtdNaoRecebido: number;
}

export function useLancamentosComissao(params: {
  documentoVendaId?: string;
  vendedorId?: string;
  statusPagamentoVendedor?: StatusPagamentoComissao | '';
  statusRecebimentoSeguradora?: StatusRecebimentoSeguradora | '';
  tipo?: TipoLancamento | '';
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.documentoVendaId) query.set('documentoVendaId', params.documentoVendaId);
  if (params.vendedorId) query.set('vendedorId', params.vendedorId);
  if (params.statusPagamentoVendedor) query.set('statusPagamentoVendedor', params.statusPagamentoVendedor);
  if (params.statusRecebimentoSeguradora) query.set('statusRecebimentoSeguradora', params.statusRecebimentoSeguradora);
  if (params.tipo) query.set('tipo', params.tipo);
  if (params.dataInicio) query.set('dataInicio', params.dataInicio);
  if (params.dataFim) query.set('dataFim', params.dataFim);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  return useQuery({
    queryKey: ['configuracoes-comissoes', 'lancamentos', params],
    queryFn: () =>
      api.get<PaginatedResponse<ComissaoLancamento>>(
        `/settings/commissions/entries?${query.toString()}`,
      ),
  });
}

export function useUpdateEntryReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      statusRecebimentoSeguradora: StatusRecebimentoSeguradora;
      dataRecebimentoSeguradora?: string | null;
      observacaoRecebimento?: string | null;
    }) => api.patch(`/settings/commissions/entries/${id}/receipt`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'projecao'] });
      toast.success('Recebimento atualizado');
    },
    onError: () => toast.error('Erro ao atualizar recebimento'),
  });
}

export function useAtualizarPagamentoLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      statusPagamentoVendedor: StatusPagamentoComissao;
      dataPagamentoVendedor?: string | null;
      observacaoPagamento?: string | null;
    }) => api.patch(`/settings/commissions/entries/${id}/payment`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'projecao'] });
      toast.success('Pagamento atualizado');
    },
    onError: () => toast.error('Erro ao atualizar pagamento'),
  });
}

export function usePagarLoteLancamentos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { ids: string[]; dataPagamento?: string; observacao?: string }) =>
      api.post<{ pagos: number; ignorados: number }>('/settings/commissions/entries/pay-batch', data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'lancamentos'] });
      queryClient.invalidateQueries({ queryKey: ['configuracoes-comissoes', 'projecao'] });
      toast.success(`${result.pagos} lançamento(s) marcado(s) como pago`);
    },
    onError: () => toast.error('Erro ao pagar lançamentos em lote'),
  });
}

export function useProjecaoLancamentos(meses?: number) {
  return useQuery({
    queryKey: ['configuracoes-comissoes', 'projecao', meses],
    queryFn: () =>
      api.get<ProjecaoMes[]>(
        `/settings/commissions/entries/projection${meses ? `?meses=${meses}` : ''}`,
      ),
  });
}

// ─── Histórico ────────────────────────────────────────────────────────────────

export function useHistoricoConfigs(params: {
  escopo?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.escopo) query.set('escopo', params.escopo);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  return useQuery({
    queryKey: ['configuracoes-comissoes', 'historico-configs', params],
    queryFn: () =>
      api.get<PaginatedResponse<ComissaoConfigHistoricoItem>>(
        `/settings/commissions/history-configs?${query.toString()}`,
      ),
  });
}
