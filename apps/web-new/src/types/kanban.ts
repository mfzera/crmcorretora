export type OportunidadeStatus =
  | 'lead'
  | 'contato_inicial'
  | 'negociacao'
  | 'ganha'
  | 'perdida'
  | 'arquivada';

export type OportunidadePrioridade = 'baixa' | 'media' | 'alta' | 'urgente';

export type OportunidadeTemperatura = 'frio' | 'morno' | 'quente';

export interface Oportunidade {
  id: string;
  corretoraId: string;
  clienteId: string | null;
  nomeCliente: string;
  vendedorId: string;
  vendedorOriginalId: string;
  status: OportunidadeStatus;
  kanbanColumnKey: string | null;
  prioridade: OportunidadePrioridade;
  temperatura: OportunidadeTemperatura;
  ordem: number;
  premioEstimado: string | null;
  valorFechado: string | null;
  motivoPerda: string | null;
  observacoes: string | null;
  metadata: Record<string, any> | null;
  emailCliente: string | null;
  telefoneCliente: string | null;
  dataVencimento: string | null;
  dataUltimoContato: string | null;
  createdAt: string;
  updatedAt: string;
  dataFechamento: string | null;
  dataRecontato: string | null;
  deletedAt: string | null;
  produtoId: string | null;
  // Relations
  seguradora?: {
    id: string;
    nome: string;
  };
  produto?: {
    id: string;
    nomeProduto: string;
  };
  vendedor?: {
    id: string;
    nome: string;
    email: string;
    avatarUrl?: string | null;
  };
  vendedorOriginal?: {
    id: string;
    nome: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface CreateOportunidadeDto {
  corretoraId: string;
  nomeCliente: string;
  vendedorId: string;
  prioridade?: OportunidadePrioridade;
  temperatura?: OportunidadeTemperatura;
  premioEstimado?: number;
  dataVencimento?: string;
  produtoId?: string;
  observacoes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateOportunidadeDto {
  corretoraId?: string;
  nomeCliente?: string;
  vendedorId?: string;
  prioridade?: OportunidadePrioridade;
  temperatura?: OportunidadeTemperatura;
  premioEstimado?: number;
  produtoId?: string;
  observacoes?: string;
  metadata?: Record<string, any>;
}

export interface MoverOportunidadeDto {
  novoStatus?: OportunidadeStatus;
  novaOrdem?: number;
  /** Para mover para coluna customizada (uuid da kanban_custom_column) */
  kanbanColumnKey?: string | null;
}

export interface FecharOportunidadeDto {
  valorFechado?: number;
  observacoes?: string;
  gerarDocumento?: boolean;
  produtoId?: string;
  seguradoraParceiraId?: string;
  situacao?: 'NOVO' | 'RENOVACAO';
  numeroProposta?: string;
  dataVigenciaInicio?: string;
  dataVigenciaFim?: string;
  premioFinal?: number;
  criarRenovacao?: boolean;
}

export interface PerderOportunidadeDto {
  motivoPerda: string;
  detalhesPerda?: string;
  dataRecontato?: string;
  observacaoRecontato?: string;
}

export interface TransferirOportunidadeDto {
  vendedorDestinoId: string;
  motivo?: string;
}

export interface OportunidadeHistorico {
  id: string;
  oportunidadeId: string;
  usuarioId: string | null;
  tipo: 'criacao' | 'mudanca_status' | 'fechamento' | 'perda';
  statusAnterior: string | null;
  statusNovo: string | null;
  descricao: string | null;
  createdAt: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };
}

export interface OportunidadeTransferencia {
  id: string;
  oportunidadeId: string;
  vendedorOrigemId: string;
  vendedorDestinoId: string;
  motivo: string | null;
  transferidoPorId: string;
  dataTransferencia: string;
  vendedorOrigem?: {
    id: string;
    nome: string;
    email: string;
  };
  vendedorDestino?: {
    id: string;
    nome: string;
    email: string;
  };
  transferidoPor?: {
    id: string;
    nome: string;
    email: string;
  };
}

export interface OportunidadeColumn {
  id: OportunidadeStatus;
  title: string;
  color: string;
  headerBg?: string;
  isTerminal?: boolean;
}

export const KANBAN_COLUMNS: OportunidadeColumn[] = [
  { id: 'lead', title: 'Lead', color: 'bg-slate-500', headerBg: 'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500' },
  { id: 'contato_inicial', title: 'Contato Inicial', color: 'bg-blue-500', headerBg: 'bg-gradient-to-r from-blue-800 via-blue-600 to-blue-500' },
  { id: 'negociacao', title: 'Negociação', color: 'bg-orange-500', headerBg: 'bg-gradient-to-r from-orange-700 via-orange-500 to-amber-400' },
  { id: 'ganha', title: 'Ganha', color: 'bg-green-500', headerBg: 'bg-gradient-to-r from-emerald-800 via-emerald-600 to-green-500' },
  { id: 'perdida', title: 'Perdida', color: 'bg-red-500', headerBg: 'bg-gradient-to-r from-rose-800 via-rose-600 to-red-500' },
];

export const PRIORIDADE_LABELS: Record<OportunidadePrioridade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const TEMPERATURA_LABELS: Record<OportunidadeTemperatura, string> = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
};
