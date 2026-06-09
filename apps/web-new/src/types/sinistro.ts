export type OrigemSinistro = 'DIRETA' | 'INDICACAO';

export type TipoSinistro =
  | 'COLISAO'
  | 'ROUBO_FURTO'
  | 'INCENDIO'
  | 'DANOS_NATURAIS'
  | 'DANOS_TERCEIROS'
  | 'INVALIDEZ'
  | 'MORTE'
  | 'HOSPITALIZACAO'
  | 'OUTROS';

export type StatusSinistro =
  | 'ABERTO'
  | 'EM_ANALISE'
  | 'AGUARDANDO_DOCUMENTOS'
  | 'APROVADO'
  | 'RECUSADO'
  | 'PAGO'
  | 'CANCELADO';

export type TipoEventoSinistro =
  | 'ABERTURA'
  | 'MUDANCA_STATUS'
  | 'APROVACAO'
  | 'RECUSA'
  | 'PAGAMENTO'
  | 'DOCUMENTO_ADICIONADO'
  | 'ANOTACAO'
  | 'CANCELAMENTO';

export interface Sinistro {
  id: string;
  corretoraId: string;
  documentoVendaId: string;
  solicitanteId: string;
  numeroSinistro: string;
  numeroSinistroExterno: string | null;
  tipoSinistro: TipoSinistro;
  status: StatusSinistro;
  origem: OrigemSinistro;
  descricao: string;
  dataOcorrencia: string;
  valorReclamado: string | null;
  valorAprovado: string | null;
  dataAbertura: string;
  dataAnalise: string | null;
  dataAprovacao: string | null;
  dataRecusa: string | null;
  dataPagamento: string | null;
  analistaPorId: string | null;
  aprovadoPorId: string | null;
  motivoRecusa: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // Relations
  documentoVenda?: {
    id: string;
    numeroDocumento: string;
    cliente?: { id: string; nome: string };
    produto?: { id: string; nomeProduto: string };
  };
  solicitante?: { id: string; nome: string; email: string };
  analistaPor?: { id: string; nome: string; email: string };
  aprovadoPor?: { id: string; nome: string; email: string };
  historico?: HistoricoSinistro[];
}

export interface HistoricoSinistro {
  id: string;
  sinistroId: string;
  usuarioId: string | null;
  tipo: TipoEventoSinistro;
  statusAnterior: StatusSinistro | null;
  statusNovo: StatusSinistro | null;
  descricao: string | null;
  createdAt: string;
  usuario?: { id: string; nome: string; email: string };
}

export interface IndicarSinistroDto {
  documentoVendaId: string;
  tipoSinistro: TipoSinistro;
  descricao: string;
  dataOcorrencia: string;
  observacoes?: string;
}

export interface CreateSinistroDto {
  documentoVendaId: string;
  tipoSinistro: TipoSinistro;
  descricao: string;
  dataOcorrencia: string;
  valorReclamado?: number;
  numeroSinistroExterno?: string;
  observacoes?: string;
}

export interface UpdateSinistroDto {
  tipoSinistro?: TipoSinistro;
  descricao?: string;
  dataOcorrencia?: string;
  valorReclamado?: number;
  numeroSinistroExterno?: string;
  observacoes?: string;
}

export interface MoverSinistroDto {
  novoStatus: StatusSinistro;
  observacao?: string;
}

export interface AprovarSinistroDto {
  valorAprovado?: number;
  observacao?: string;
}

export interface RecusarSinistroDto {
  motivoRecusa: string;
}

export interface PagarSinistroDto {
  observacao?: string;
}

export interface SinistroColumn {
  id: StatusSinistro;
  title: string;
  color: string;
  headerBg?: string;
  isTerminal?: boolean;
}

export const SINISTRO_COLUMNS: SinistroColumn[] = [
  { id: 'ABERTO', title: 'Aberto', color: 'bg-blue-500' },
  { id: 'EM_ANALISE', title: 'Em Análise', color: 'bg-orange-500' },
  { id: 'AGUARDANDO_DOCUMENTOS', title: 'Aguard. Documentos', color: 'bg-yellow-500' },
  { id: 'APROVADO', title: 'Aprovado', color: 'bg-green-500' },
  { id: 'RECUSADO', title: 'Recusado', color: 'bg-red-500', isTerminal: true },
  { id: 'PAGO', title: 'Pago', color: 'bg-teal-500', isTerminal: true },
];

export const TIPO_SINISTRO_LABELS: Record<TipoSinistro, string> = {
  COLISAO: 'Colisão',
  ROUBO_FURTO: 'Roubo / Furto',
  INCENDIO: 'Incêndio',
  DANOS_NATURAIS: 'Danos Naturais',
  DANOS_TERCEIROS: 'Danos a Terceiros',
  INVALIDEZ: 'Invalidez',
  MORTE: 'Morte',
  HOSPITALIZACAO: 'Hospitalização',
  OUTROS: 'Outros',
};

export const STATUS_SINISTRO_LABELS: Record<StatusSinistro, string> = {
  ABERTO: 'Aberto',
  EM_ANALISE: 'Em Análise',
  AGUARDANDO_DOCUMENTOS: 'Aguardando Documentos',
  APROVADO: 'Aprovado',
  RECUSADO: 'Recusado',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
};
