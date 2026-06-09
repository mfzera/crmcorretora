export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  avatarUrl: string | null;
  ativo: boolean;
  primeiroAcesso: boolean;
  ultimoLogin: string | null;
  cargo: {
    id: string;
    nome: string;
    cor?: string | null;
  } | null;
  equipe: {
    id: string;
    nome: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsuariosParams {
  page?: number;
  limit?: number;
  search?: string;
  cargoId?: string;
  equipeId?: string;
  ativo?: 'true' | 'false';
}

export interface ListUsuariosResponse {
  data: Usuario[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateUsuarioDTO {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  cargoId: string;
  equipeId?: string;
}

export interface UpdateUsuarioDTO {
  nome?: string;
  email?: string;
  telefone?: string;
  cargoId?: string;
  equipeId?: string;
  ativo?: boolean;
}

export interface ResetarSenhaDTO {
  novaSenha: string;
}
