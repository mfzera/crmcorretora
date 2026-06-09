export enum TipoSeguro {
  AUTO = 'AUTO',
  VIDA = 'VIDA',
  RESIDENCIAL = 'RESIDENCIAL',
  EMPRESARIAL = 'EMPRESARIAL',
  SAUDE = 'SAUDE',
  VIAGEM = 'VIAGEM',
  OUTROS = 'OUTROS',
}

export interface Produto {
  id: string;
  corretoraId: string;
  nomeProduto: string;
  descricao?: string | null;
  tipoSeguro: TipoSeguro;
  premioMinimo?: string | null;
  premioMaximo?: string | null;
  percentualComissaoPadrao?: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateProdutoData {
  nomeProduto: string;
  descricao?: string;
  tipoSeguro: TipoSeguro;
  premioMinimo?: number;
  premioMaximo?: number;
  percentualComissaoPadrao?: number;
  ativo?: boolean;
}

export interface UpdateProdutoData {
  nomeProduto?: string;
  descricao?: string;
  tipoSeguro?: TipoSeguro;
  premioMinimo?: number;
  premioMaximo?: number;
  percentualComissaoPadrao?: number;
  ativo?: boolean;
}

export interface ProdutosFilters {
  tipoSeguro?: TipoSeguro | 'TODOS';
  ativo?: boolean | 'TODOS';
  search?: string;
}

export function getTipoSeguroLabel(tipo: TipoSeguro): string {
  const labels: Record<TipoSeguro, string> = {
    [TipoSeguro.AUTO]: 'Auto',
    [TipoSeguro.VIDA]: 'Vida',
    [TipoSeguro.RESIDENCIAL]: 'Residencial',
    [TipoSeguro.EMPRESARIAL]: 'Empresarial',
    [TipoSeguro.SAUDE]: 'Saúde',
    [TipoSeguro.VIAGEM]: 'Viagem',
    [TipoSeguro.OUTROS]: 'Outros',
  };
  return labels[tipo];
}

export function getTipoSeguroBadgeColor(tipo: TipoSeguro): string {
  const colors: Record<TipoSeguro, string> = {
    [TipoSeguro.AUTO]:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    [TipoSeguro.VIDA]:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
    [TipoSeguro.RESIDENCIAL]:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800',
    [TipoSeguro.EMPRESARIAL]:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
    [TipoSeguro.SAUDE]:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
    [TipoSeguro.VIAGEM]:
      'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800',
    [TipoSeguro.OUTROS]:
      'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-300 dark:border-gray-800',
  };
  return colors[tipo];
}
