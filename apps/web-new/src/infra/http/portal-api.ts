import { getPortalToken } from '@/infra/auth/portal-auth-store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

class PortalApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PortalApiError';
  }
}

export { PortalApiError };

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, body, headers: customHeaders, ...init } = options;

  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const token = getPortalToken();

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...init,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data =
    response.status === 204
      ? {}
      : await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new PortalApiError(
      response.status,
      data.error?.code ?? 'UNKNOWN_ERROR',
      data.error?.message ?? 'Ocorreu um erro inesperado',
    );
  }

  return (data.data ?? data) as T;
}

export const portalApi = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'body'>) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),
};

// Auth
export async function portalLogin(data: {
  subdominio: string;
  documento: string;
  dataNascimento: string;
}) {
  return portalApi.post<{
    token: string;
    cliente: { id: string; nome: string; tipoPessoa: 'PF' | 'PJ' };
    corretora: { nomeFantasia: string };
  }>('/portal/auth/login', data);
}

export async function portalLogoutApi() {
  return portalApi.post('/portal/auth/logout');
}

// Apólices
export async function getPortalApolices() {
  return portalApi.get<Apolice[]>('/portal/apolices');
}

export async function getPortalApolice(id: string) {
  return portalApi.get<ApoliceDetalhe>(`/portal/apolices/${id}`);
}

export async function getPortalVencimentos() {
  return portalApi.get<{
    vencidas: Apolice[];
    em30dias: Apolice[];
    em60dias: Apolice[];
    em90dias: Apolice[];
  }>('/portal/apolices/vencimentos');
}

// Produtos
export async function getPortalProdutos() {
  return portalApi.get<Produto[]>('/portal/produtos');
}

// Corretora pública
export async function getCorretoraPublica(subdominio: string) {
  return portalApi.get<{
    nomeFantasia: string | null;
    razaoSocial: string;
    cnpj: string | null;
    cidade: string | null;
    uf: string | null;
    logoUrl: string | null;
    coresTema: { primary?: string; secondary?: string } | null;
    emailContato: string | null;
    telefone: string | null;
  }>('/public/corretora', { params: { subdominio } });
}

// Types
export interface Apolice {
  id: string;
  numeroDocumento: string;
  numeroApoliceExterna: string | null;
  vigenciaInicio: string;
  vigenciaFim: string;
  diasParaVencer: number;
  produto: { nomeProduto: string; tipoSeguro: string };
  seguradora: {
    nomeFantasia: string | null;
    razaoSocial: string | null;
    telefone: string | null;
    email: string | null;
    telefone24h: string | null;
    whatsapp24h: string | null;
    horarioAtendimento24h: string | null;
  } | null;
}

export interface ApoliceDetalhe extends Apolice {
  numeroPropostaExterna: string | null;
  coberturas: unknown;
  valorSegurado: string | null;
  franquia: string | null;
  observacoes: string | null;
  produto: {
    id: string;
    nomeProduto: string;
    tipoSeguro: string;
    descricao: string | null;
  };
  seguradora: {
    id: string;
    razaoSocial: string | null;
    nomeFantasia: string | null;
    cnpj: string | null;
    telefone: string | null;
    email: string | null;
    telefone24h: string | null;
    whatsapp24h: string | null;
    horarioAtendimento24h: string | null;
  } | null;
  vendedor: {
    id: string;
    nome: string | null;
    email: string | null;
    telefone: string | null;
  } | null;
}

export interface Produto {
  id: string;
  nomeProduto: string;
  descricao: string | null;
  tipoSeguro: string | null;
  premioMinimo: string | null;
  seguradora: { nomeFantasia: string | null; razaoSocial: string | null } | null;
}

// Perfil
export async function getPortalPerfil() {
  return portalApi.get<PerfilSegurado>('/portal/perfil');
}

export async function updatePortalPerfil(data: {
  email?: string;
  telefone?: string;
  celular?: string;
}) {
  return request<{ email: string | null; telefone: string | null; celular: string | null }>(
    '/portal/perfil',
    { method: 'PATCH', body: data },
  );
}

// Documentos
export async function getPortalDocumentos(apoliceId: string) {
  return portalApi.get<DocumentoApoliceItem[]>(`/portal/documentos/${apoliceId}`);
}

export async function getPortalDocumentoDownload(id: string) {
  return portalApi.get<{ url: string; nome: string; mimeType: string | null }>(
    `/portal/documentos/${id}/download`,
  );
}

// Cotações
export async function solicitarCotacao(data: { produtoId?: string; mensagem?: string }) {
  return portalApi.post<{ id: string }>('/portal/cotacoes', data);
}

// Additional Types
export interface PerfilSegurado {
  id: string;
  tipoPessoa: 'PF' | 'PJ';
  nome: string | null;
  cpf: string | null;
  dataNascimento: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
}

export interface DocumentoApoliceItem {
  id: string;
  nome: string;
  tipo: string;
  mimeType: string | null;
  tamanhoBytes: number | null;
  createdAt: string;
}
