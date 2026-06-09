/**
 * Data Transfer Objects (DTOs)
 *
 * These types define the shape of data sent between frontend and backend.
 * They may differ from database entities to provide a cleaner API surface.
 *
 * NOTE: Types defined inline to avoid circular dependency with database package
 */

// Inline entity types (minimal definitions needed for DTOs)
type Cliente = any;
type Produto = any;
type DocumentoVenda = any;
type RenovacaoComercial = any;

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Common filters
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

// Cliente DTOs
export interface ClienteDTO
  extends Omit<Cliente, 'createdAt' | 'updatedAt' | 'deletedAt'> {
  createdAt: string;
  updatedAt: string;
}

export interface CreateClienteDTO {
  tipoPessoa: 'PF' | 'PJ';
  nome?: string;
  cpf?: string;
  razaoSocial?: string;
  cnpj?: string;
  nomeFantasia?: string;
  email?: string;
  telefone?: string;
  celular?: string;
}

export interface UpdateClienteDTO extends Partial<CreateClienteDTO> {
  ativo?: boolean;
}

// Produto DTOs
export interface ProdutoDTO
  extends Omit<Produto, 'createdAt' | 'updatedAt' | 'deletedAt'> {
  createdAt: string;
  updatedAt: string;
}

export interface CreateProdutoDTO {
  nomeProduto: string;
  descricao?: string;
  tipoSeguro: string;
  premioMinimo?: number;
  premioMaximo?: number;
  percentualComissaoPadrao?: number;
  ativo?: boolean;
}

// Renovacao DTOs (extended with computed fields)
export interface RenovacaoDTO {
  id: string;
  documentoVendaAnteriorId: string;
  documentoVendaNovoId?: string | null;
  vendedorId: string;
  status: string;
  dataVencimento: string;
  premioAnterior?: string | null;
  premioNovo?: string | null;

  // Computed fields
  diasParaVencimento: number;
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';

  // Related data
  cliente?: {
    id: string;
    nome?: string;
    razaoSocial?: string;
    tipoPessoa: 'PF' | 'PJ';
  };
  produto?: {
    id: string;
    nomeProduto: string;
    tipoSeguro: string;
  };
}

// Documento Venda DTOs
export interface DocumentoVendaDTO
  extends Omit<DocumentoVenda, 'createdAt' | 'updatedAt' | 'deletedAt'> {
  createdAt: string;
  updatedAt: string;
  cliente?: ClienteDTO;
  produto?: ProdutoDTO;
}

// Area de Trabalho DTOs
export interface RenovacaoPendenteDTO {
  id: string;
  documentoVendaId: string;
  numeroApolice: string | null;
  cliente: {
    id: string;
    nome?: string;
    razaoSocial?: string;
    tipoPessoa: 'PF' | 'PJ';
  };
  produto: {
    id: string;
    nomeProduto: string;
    tipoSeguro: string;
  };
  vigenciaFim: string;
  premioAtual: number | null;
  diasParaVencimento: number;
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';
  status: string;
  vendedorId: string;
}

export interface CotacaoDTO {
  id: string;
  numeroCotacao: string;
  clienteId: string;
  produtoId: string;
  status: string;
  premioEstimado: number | null;
  percentualComissao: number | null;
  vigenciaInicio: string;
  vigenciaFim: string;
  createdAt: string;

  cliente?: {
    id: string;
    nome?: string;
    razaoSocial?: string;
    tipoPessoa: 'PF' | 'PJ';
  };
  produto?: {
    id: string;
    nomeProduto: string;
    tipoSeguro: string;
  };
}
