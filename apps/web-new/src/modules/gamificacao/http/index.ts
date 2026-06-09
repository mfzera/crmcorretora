import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { useModulos } from '@/modules/corretora-config/http';

// Query Keys
export const gamificacaoKeys = {
  all: ['gamificacao'] as const,
  metas: () => [...gamificacaoKeys.all, 'metas'] as const,
  meta: (id: string) => [...gamificacaoKeys.all, 'meta', id] as const,
  metaAuditoria: (id: string) => [...gamificacaoKeys.all, 'meta-auditoria', id] as const,
  missoes: () => [...gamificacaoKeys.all, 'missoes'] as const,
  missao: (id: string) => [...gamificacaoKeys.all, 'missao', id] as const,
  campanhas: () => [...gamificacaoKeys.all, 'campanhas'] as const,
  badgeTipos: () => [...gamificacaoKeys.all, 'badge-tipos'] as const,
  meusBadges: () => [...gamificacaoKeys.all, 'meus-badges'] as const,
  badgesUsuario: (id: string) => [...gamificacaoKeys.all, 'badges-usuario', id] as const,
  ranking: (params: RankingParams) =>
    [...gamificacaoKeys.all, 'ranking', params] as const,
  reconhecimento: () => [...gamificacaoKeys.all, 'reconhecimento'] as const,
};

export interface NivelInfo {
  slug: string;
  metrica?: string;
  limiar: number;
}

export interface NivelMetrica {
  total: number;
  atual: NivelInfo | null;
  proximo: NivelInfo | null;
}

export interface ReconhecimentoResponse {
  novos_seguros: NivelMetrica;
  renovacoes: NivelMetrica;
  cotacoes: NivelMetrica;
  streak: {
    atual: number;
    proximo: { slug: string; limiar: number } | null;
    tiers: Array<{ slug: string; limiar: number }>;
  };
}

export interface RankingParams {
  dataInicio?: string;
  dataFim?: string;
  equipeId?: string;
}

export interface RankingItem {
  usuarioId: string;
  nome: string;
  email: string;
  avatarUrl: string | null;
  equipeId: string | null;
  equipeNome: string | null;
  pontos: number;
  badges: number;
  metasBatidas: number;
  missoesCumpridas: number;
  posicao: number;
}

export interface RankingEquipe {
  equipeId: string;
  equipeNome: string;
  pontos: number;
  membros: number;
  posicao: number;
}

export interface RankingResponse {
  ranking: RankingItem[];
  rankingEquipes: RankingEquipe[];
  periodo: { dataInicio: string; dataFim: string };
  regras: { pontosBadge: number; pontosMeta: number; pontosMissao: number };
}

// ============ Metas ============

export function useMetasAtivas() {
  const { gamificacao } = useModulos();
  return useQuery({
    queryKey: gamificacaoKeys.metas(),
    queryFn: () => api.get<any[]>('/goals'),
    enabled: gamificacao,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useMeta(id: string) {
  return useQuery({
    queryKey: gamificacaoKeys.meta(id),
    queryFn: () => api.get<any>(`/goals/${id}`),
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<any>('/goals', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificacaoKeys.metas() });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch<any>(`/goals/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificacaoKeys.metas() });
    },
  });
}

export function useMetaAuditoria(metaId: string) {
  return useQuery({
    queryKey: gamificacaoKeys.metaAuditoria(metaId),
    queryFn: () => api.get<any[]>(`/goals/${metaId}/audit`),
    enabled: !!metaId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMissaoAuditoria(missaoId: string) {
  return useQuery({
    queryKey: [...gamificacaoKeys.all, 'missao-auditoria', missaoId] as const,
    queryFn: () => api.get<any[]>(`/missions/${missaoId}/audit`),
    enabled: !!missaoId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCampanhaAuditoria(campanhaId: string) {
  return useQuery({
    queryKey: [...gamificacaoKeys.all, 'campanha-auditoria', campanhaId] as const,
    queryFn: () => api.get<any[]>(`/campaigns/${campanhaId}/audit`),
    enabled: !!campanhaId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCancelGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/goals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificacaoKeys.metas() });
    },
  });
}

// ============ Missões ============

export function useMissoesAtivas() {
  const { gamificacao } = useModulos();
  return useQuery({
    queryKey: gamificacaoKeys.missoes(),
    queryFn: () => api.get<any[]>('/missions'),
    enabled: gamificacao,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useCreateMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<any>('/missions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificacaoKeys.missoes() });
    },
  });
}

export function useUpdateMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch<any>(`/missions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificacaoKeys.missoes() });
    },
  });
}

export function useDeleteMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/missions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificacaoKeys.missoes() });
    },
  });
}

// ============ Campanhas ============

export function useCampanhasAtivas() {
  const { gamificacao } = useModulos();
  return useQuery({
    queryKey: gamificacaoKeys.campanhas(),
    queryFn: () => api.get<any[]>('/campaigns'),
    enabled: gamificacao,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useCampanhasGestao() {
  return useQuery({
    queryKey: [...gamificacaoKeys.campanhas(), 'todas'],
    queryFn: () => api.get<any[]>('/campaigns?todas=true'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<any>('/campaigns', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificacaoKeys.campanhas() });
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch<any>(`/campaigns/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificacaoKeys.campanhas() });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/campaigns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificacaoKeys.campanhas() });
    },
  });
}

// ============ Badges ============

export function useBadgeTipos() {
  return useQuery({
    queryKey: gamificacaoKeys.badgeTipos(),
    queryFn: () => api.get<any[]>('/badges'),
    staleTime: 10 * 60 * 1000, // catálogo raramente muda
  });
}

export function useMeusBadges() {
  const { gamificacao } = useModulos();
  return useQuery({
    queryKey: gamificacaoKeys.meusBadges(),
    queryFn: () => api.get<any[]>('/badges/mine'),
    enabled: gamificacao,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export interface UltimaConquista {
  id: string;
  createdAt: string;
  usuario: { id: string; nome: string; avatarUrl: string | null };
  badgeTipo: { slug: string; nome: string; descricao: string | null; icone: string; cor: string };
}

export function useUltimaConquista() {
  const { gamificacao } = useModulos();
  return useQuery({
    queryKey: [...gamificacaoKeys.all, 'badge-recente'] as const,
    queryFn: () => api.get<UltimaConquista | null>('/badges/recent'),
    enabled: gamificacao,
    refetchInterval: 15_000,
    staleTime: 0,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useBadgesUsuario(usuarioId: string) {
  return useQuery({
    queryKey: gamificacaoKeys.badgesUsuario(usuarioId),
    queryFn: () => api.get<any[]>(`/badges/user/${usuarioId}`),
    enabled: !!usuarioId,
  });
}

// ============ Ranking de Gamificação ============

export function useRankingGamificacao(params: RankingParams = {}) {
  const { gamificacao } = useModulos();
  const search = new URLSearchParams();
  if (params.dataInicio) search.set('dataInicio', params.dataInicio);
  if (params.dataFim) search.set('dataFim', params.dataFim);
  if (params.equipeId) search.set('equipeId', params.equipeId);
  const qs = search.toString();
  const path = `/gamification/ranking${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: gamificacaoKeys.ranking(params),
    queryFn: () => api.get<RankingResponse>(path),
    enabled: gamificacao,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

// ============ Reconhecimento ============

export function useReconhecimento() {
  const { gamificacao } = useModulos();
  return useQuery({
    queryKey: gamificacaoKeys.reconhecimento(),
    queryFn: () => api.get<ReconhecimentoResponse>('/gamification/recognition'),
    enabled: gamificacao,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useAwardBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { usuarioId: string; badgeTipoId: string; observacao?: string }) =>
      api.post<any>('/badges/grant', data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: gamificacaoKeys.badgesUsuario(variables.usuarioId) });
    },
  });
}
