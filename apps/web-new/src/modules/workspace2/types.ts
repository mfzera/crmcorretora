import type { RenovacaoPlanilha, Cotacao, CotacaoTag } from '@/types/area-trabalho';

export type { CotacaoTag };

export const FONT_SIZES = [
  { label: 'P', size: 11, rowHeight: 32, headerHeight: 32 },
  { label: 'M', size: 13, rowHeight: 38, headerHeight: 38 },
  { label: 'G', size: 15, rowHeight: 44, headerHeight: 42 },
] as const;

export type FontSizeKey = 0 | 1 | 2;

export type SituacaoLabel =
  | 'Renovar'
  | 'Vencida'
  | 'Iniciado'
  | 'Cotação Enviada'
  | 'Aguardando Retorno'
  | 'Aguardando Cadastro'
  | 'Convertido'
  | 'Perdido'
  | 'Cancelado'
  | 'Fechado'
  | 'Excluído'
  | 'Reprovada';

export type WorkspaceRow = {
  id: string;
  rowType: 'renovacao' | 'cotacao';
  clienteNome: string;
  clienteTipo: 'PF' | 'PJ';
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  produto: string;
  produtoId: string | null;
  vendedorNome: string | null;
  vendedorAvatar: string | null;
  vendedorId: string | null;
  vendedorSecundarioId: string | null;
  vendedorSecundarioNome: string | null;
  vendedorSecundarioAvatar: string | null;
  seguradora: string | null;
  seguradoraId: string | null;
  plAtual: number | null;
  comissaoPct: number | null;
  receita: number | null;
  situacao: SituacaoLabel;
  comentariosCount: number;
  anexosCount: number;
  ultimoComentario?: { texto: string; autorNome: string; autorAvatarUrl: string | null; createdAt: string } | null;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedByNome: string | null;
  tags: CotacaoTag[];
  renovacaoId?: string;
  cotacaoId?: string;
  _renovacao?: RenovacaoPlanilha;
  _cotacao?: Cotacao;
};

export interface SelectOption {
  id: string;
  label: string;
  avatarUrl?: string | null;
}

export interface GridContext {
  onIniciar: (row: WorkspaceRow) => void;
  onVerDetalhes: (row: WorkspaceRow) => void;
  onEditarDetalhes: (row: WorkspaceRow) => void;
  onProspectar: (row: WorkspaceRow) => void;
  onDelete: (row: WorkspaceRow) => void;
  onRestore: (row: WorkspaceRow) => void;
  onOpenComentarios: (row: WorkspaceRow) => void;
  addComentario: (row: WorkspaceRow, texto: string) => void;
  vendedores: SelectOption[];
  produtos: SelectOption[];
  seguradoras: SelectOption[];
  /** Atualiza seguradora/produto/vendedor diretamente sem passar pelo valueSetter do AG Grid */
  onDirectUpdate: (row: WorkspaceRow, colId: 'col_seguradora' | 'col_produto' | 'col_vendedor' | 'col_vendedor_secundario', newId: string | null) => void;
}

export const SITUACAO_STYLES: Record<SituacaoLabel, { dot: string; badge: string }> = {
  'Renovar':              { dot: 'bg-amber-400',   badge: 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' },
  'Vencida':              { dot: 'bg-rose-500',    badge: 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300' },
  'Iniciado':             { dot: 'bg-blue-400',    badge: 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' },
  'Cotação Enviada':     { dot: 'bg-violet-500',  badge: 'bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300' },
  'Aguardando Retorno':   { dot: 'bg-orange-400',  badge: 'bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300' },
  'Aguardando Cadastro':  { dot: 'bg-yellow-500',  badge: 'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' },
  'Convertido':           { dot: 'bg-green-500',   badge: 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300' },
  'Perdido':              { dot: 'bg-red-500',     badge: 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300' },
  'Cancelado':            { dot: 'bg-gray-400',    badge: 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400' },
  'Fechado':              { dot: 'bg-slate-500',   badge: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-300' },
  'Excluído':             { dot: 'bg-red-400',     badge: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 line-through' },
  'Reprovada':            { dot: 'bg-rose-600',    badge: 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300' },
};

export const SITUACOES: SituacaoLabel[] = [
  'Renovar', 'Vencida', 'Iniciado', 'Cotação Enviada', 'Aguardando Retorno',
  'Aguardando Cadastro', 'Convertido', 'Perdido', 'Cancelado', 'Fechado', 'Excluído', 'Reprovada',
];
