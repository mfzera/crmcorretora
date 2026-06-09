export interface EquipeMembro {
  id: string;
  nome: string;
  email: string;
  avatarUrl: string | null;
  ativo: boolean;
  cargo: {
    id: string;
    nomeCargo: string;
    cor: string | null;
  } | null;
}

export interface EquipeGestor {
  id: string;
  nome: string;
  avatarUrl: string | null;
}

export interface Equipe {
  id: string;
  nome: string;
  ativo: boolean;
  gestorId: string | null;
  gestor: EquipeGestor | null;
  totalMembros: number;
  createdAt: string;
}

export interface EquipeDetalhe extends Omit<Equipe, 'totalMembros'> {
  membros: EquipeMembro[];
  updatedAt: string;
}

export interface CreateEquipeDTO {
  nome: string;
  gestorId?: string | null;
}

export interface UpdateEquipeDTO {
  nome?: string;
  gestorId?: string | null;
  ativo?: boolean;
}

export interface AtribuirLiderDTO {
  gestorId: string | null;
}

export interface AdicionarMembroDTO {
  usuarioId: string;
}

export interface ListEquipesParams {
  page?: number;
  limit?: number;
  search?: string;
  ativo?: 'true' | 'false';
}
