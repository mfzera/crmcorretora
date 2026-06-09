export type StatusDocumentoVenda =
  | 'EM_NEGOCIACAO'
  | 'AGUARDANDO_CLIENTE'
  | 'AGUARDANDO_APROVACAO'
  | 'VENDA_CONFIRMADA'
  | 'AGUARDANDO_CADASTRO'
  | 'ATIVO'
  | 'ARQUIVADO'
  | 'RENOVACAO'
  | 'CANCELADO'
  | 'PERDIDO'
  | 'EXPIRADO';

export type TipoDocumentoVenda =
  | 'COTACAO_DIRETA'
  | 'PROPOSTA_FORMAL'
  | 'VENDA_EXPRESSA';

export interface DocumentoVenda {
  id: string;
  numero: string;
  tipo: TipoDocumentoVenda;
  status: StatusDocumentoVenda;

  // Relações
  clienteId: string;
  cliente: {
    id: string;
    nome?: string;
    razaoSocial?: string;
    tipoPessoa: 'PF' | 'PJ';
    cpf?: string | null;
    cnpj?: string | null;
    email?: string | null;
    telefone?: string | null;
    celular?: string | null;
  };

  produtoId: string;
  produto: {
    id: string;
    nomeProduto: string;
    tipoSeguro: string;
  };

  seguradoraParceiraId: string;
  seguradoraParceira?: {
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
  } | null;

  vendedorId: string;
  vendedorSecundarioId?: string | null;
  vendedorTerceiroId?: string | null;
  vendedor?: {
    id: string;
    nome: string;
    email?: string;
    avatarUrl?: string | null;
  };
  vendedorSecundario?: {
    id: string;
    nome: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
  vendedorTerceiro?: {
    id: string;
    nome: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
  atuante?: {
    id: string;
    nome: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;

  // Dados da venda
  vigenciaInicio: string;
  vigenciaFim: string;
  premioLiquido: number | null;
  percentualComissao: number | null;
  valorComissao: number | null;

  // Parcelamento e pagamento ao vendedor
  numeroParcelas?: number | null;
  modalidadePagamentoVendedor?: 'AVISTA' | 'PARCELADO' | null;

  // Comissão split
  negocioCorretora?: boolean;
  percentualCorretora?: number | null;
  valorComissaoCorretora?: number | null;

  // Dados do seguro (opcionais)
  itemDescricao?: string | null;
  franquia?: number | null;
  valorSegurado?: number | null;
  coberturas?: Record<string, unknown> | null;

  // Apólice (opcional)
  numeroApolice?: string | null;
  numeroPropostaExterna?: string | null;
  numeroApoliceExterna?: string | null;
  dataEmissao?: string | null;

  // Renovação
  documentoOrigemId?: string | null;
  situacaoCotacao?: 'NOVO' | 'RENOVACAO' | null;
  renovacoes?: DocumentoVenda[];
  dataInicioJanelaRenovacao?: string | null;

  // Lock fields
  lockedById?: string | null;
  lockedBy?: {
    id: string;
    nome: string;
  } | null;
  lockedAt?: string | null;
  lockExpiresAt?: string | null;

  // Aprovação do cadastro
  aprovadoPorId?: string | null;
  aprovadoPor?: {
    id: string;
    nome: string;
  } | null;
  dataAprovacaoCadastro?: string | null;

  // Rejeição do cadastro
  motivoRejeicao?: string | null;
  dataRejeicaoCadastro?: string | null;
  rejeitadoPorId?: string | null;
  rejeitadoPor?: {
    id: string;
    nome: string;
  } | null;

  // Metadados
  observacoes?: string | null;
  metadata?: Record<string, unknown> | null;
  motivoPerda?: string | null;
  ultimoComentario?: {
    id: string;
    texto: string;
    createdAt: string;
    autor: { id: string; nome: string };
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentoVendaLockStatus {
  isLocked: boolean;
  isLockedByCurrentUser: boolean;
  lockedBy: {
    id: string;
    nome: string;
  } | null;
  lockedAt: string | null;
  lockExpiresAt: string | null;
}
