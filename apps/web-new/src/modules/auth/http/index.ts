import { api } from '@/infra/http/api';

interface LoginRequest {
  email: string;
  password: string;
  recaptchaToken: string;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    avatarUrl: string | null;
    primeiroAcesso: boolean;
  };
  permissoes: string[];
  corretora: {
    id: string;
    nomeFantasia: string;
    razaoSocial: string;
    subdominio: string;
  };
}

interface MeResponse {
  usuario: {
    id: string;
    nome: string;
    email: string;
    avatarUrl: string | null;
    telefone: string | null;
    primeiroAcesso: boolean;
    cargo: { id: string; nome: string } | null;
    equipe: { id: string; nome: string } | null;
  };
  permissoes: string[];
  corretora: {
    id: string;
    nomeFantasia: string;
    razaoSocial: string;
    logoUrl: string | null;
    subdominio: string;
  };
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return await api.post<LoginResponse>('/auth/login', data);
}

export async function getMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/auth/me');
}

export async function refreshToken(currentRefreshToken: string): Promise<{ token: string; refreshToken: string; permissoes: string[] }> {
  return api.post<{ token: string; refreshToken: string; permissoes: string[] }>('/auth/refresh', { refreshToken: currentRefreshToken });
}
