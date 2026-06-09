// Tipos base
export type TipoPessoa = 'PF' | 'PJ';

export interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface Contato {
  id?: string;
  tipo: 'EMAIL' | 'TELEFONE' | 'CELULAR' | 'WHATSAPP';
  valor: string;
  principal: boolean;
  observacoes?: string;
}

// Cliente Pessoa Física
export interface ClientePF {
  tipoPessoa: 'PF';
  nome: string;
  cpf: string;
  rg?: string;
  dataNascimento?: string;
  sexo?: 'M' | 'F' | 'OUTRO';
  estadoCivil?: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'OUTRO';
  profissao?: string;
}

// Cliente Pessoa Jurídica
export interface ClientePJ {
  tipoPessoa: 'PJ';
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  ramoAtividade?: string;
  dataAbertura?: string;
}

// Cliente completo (união dos tipos)
export interface Cliente {
  id: string;
  tipoPessoa: TipoPessoa;

  // Campos de PF (opcionais quando PJ)
  nome?: string;
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  sexo?: 'M' | 'F' | 'OUTRO';
  estadoCivil?: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'OUTRO';
  profissao?: string;

  // Campos de PJ (opcionais quando PF)
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  ramoAtividade?: string;
  dataAbertura?: string;

  // Campos comuns
  email: string;
  telefone: string;
  celular?: string;
  endereco?: Endereco;
  contatos?: Contato[];
  observacoes?: string;
  ativo: boolean;
  isActiveCliente?: boolean;

  // Metadata
  corretoraId: string;
  vendedorId?: string;
  vendedorOriginalId?: string;
  vendedor?: {
    id: string;
    nome: string;
    email?: string;
  };
  criadoEm?: string;
  atualizadoEm?: string;
  createdAt?: string;
  updatedAt?: string;
  criadoPor?: string;
  atualizadoPor?: string;
}

// DTOs para criação e atualização
export type CriarClientePFDTO = Omit<ClientePF, 'tipoPessoa'> & {
  email: string;
  telefone: string;
  celular?: string;
  endereco?: Endereco;
  contatos?: Omit<Contato, 'id'>[];
  observacoes?: string;
  ativo?: boolean;
};

export type CriarClientePJDTO = Omit<ClientePJ, 'tipoPessoa'> & {
  email: string;
  telefone: string;
  celular?: string;
  endereco?: Endereco;
  contatos?: Omit<Contato, 'id'>[];
  observacoes?: string;
  ativo?: boolean;
};

export type CriarClienteDTO =
  | ({ tipoPessoa: 'PF' } & CriarClientePFDTO)
  | ({ tipoPessoa: 'PJ' } & CriarClientePJDTO);

export type AtualizarClienteDTO = Partial<CriarClienteDTO> & {
  id: string;
};

// Filtros para listagem
export interface ClienteFiltros {
  tipoPessoa?: TipoPessoa;
  ativo?: boolean;
  busca?: string; // Busca por nome, CPF/CNPJ, email
  cidade?: string;
  estado?: string;
  dataCriacaoInicio?: string;
  dataCriacaoFim?: string;
  vendedorId?: string;
  soTransferidos?: boolean;
  isActiveCliente?: boolean;
}

// Resposta paginada (estrutura real retornada pelo api.ts wrapper)
export interface ClientesPaginados {
  data: Cliente[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Helpers para type guards
export function isClientePF(cliente: Cliente): cliente is Cliente & ClientePF {
  return cliente.tipoPessoa === 'PF';
}

export function isClientePJ(cliente: Cliente): cliente is Cliente & ClientePJ {
  return cliente.tipoPessoa === 'PJ';
}

// Helper para obter nome do cliente
export function getNomeCliente(cliente: Cliente): string {
  if (isClientePF(cliente)) {
    return cliente.nome || '';
  }
  return cliente.nomeFantasia || cliente.razaoSocial || '';
}

// Helper para obter documento do cliente
export function getDocumentoCliente(cliente: Cliente): string {
  if (isClientePF(cliente)) {
    return cliente.cpf || '';
  }
  return cliente.cnpj || '';
}
