export interface Notificacao {
  id: string;
  corretoraId: string;
  usuarioId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  linkAcao?: string | null;
  prioridade?: 'baixa' | 'media' | 'alta' | 'urgente';
  metadata?: Record<string, any> | null;
  lida: boolean;
  lidaEm?: Date | null;
  createdAt: Date;
  deletedAt?: Date | null;
}

export interface NotificacaoListParams {
  page?: number;
  limit?: number;
  lida?: boolean;
  tipo?: string;
}

export interface NotificacoesResponse {
  items: Notificacao[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
