export interface SeguradoraParceira {
  id: string;
  corretoraId: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  telefone: string | null;
  email: string | null;
  telefone24h: string | null;
  whatsapp24h: string | null;
  horarioAtendimento24h: string | null;
  status: 'ATIVA' | 'INATIVA';
  createdAt: string;
  updatedAt: string;
}

export interface CreateSeguradoraParceiraDTO {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  telefone?: string;
  email?: string;
  telefone24h?: string;
  whatsapp24h?: string;
  horarioAtendimento24h?: string;
  status?: 'ATIVA' | 'INATIVA';
}

export interface UpdateSeguradoraParceiraDTO
  extends Partial<CreateSeguradoraParceiraDTO> {}

export interface ListSeguradorasParceiraParams {
  status?: 'ATIVA' | 'INATIVA' | 'TODAS';
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListSeguradorasParceiraResponse {
  data: SeguradoraParceira[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
