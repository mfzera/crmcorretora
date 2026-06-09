export interface Permissao {
  id: string;
  nomePermissao: string;
  descricao: string | null;
  grupo: string | null;
}

export interface PermissoesAgrupadasResponse {
  [grupo: string]: Permissao[];
}
