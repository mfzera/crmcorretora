import type { Permissao } from './permissao';

export interface Cargo {
  id: string;
  nomeCargo: string;
  descricao: string | null;
  cor: string | null;
  isAdmin: boolean;
  isGestor: boolean;
  isVendedor: boolean;
  padrao?: boolean;
  corretoraId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CargoComPermissoes extends Cargo {
  permissoes: Permissao[];
}

export interface CreateCargoDTO {
  nomeCargo: string;
  descricao?: string;
  cor?: string;
  isGestor?: boolean;
  isVendedor?: boolean;
}

export interface UpdateCargoDTO {
  nomeCargo?: string;
  descricao?: string;
  cor?: string;
  isGestor?: boolean;
  isVendedor?: boolean;
}

export interface AtribuirPermissoesDTO {
  permissaoIds: string[];
}
