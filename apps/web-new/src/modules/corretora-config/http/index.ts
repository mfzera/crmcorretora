import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { toast } from 'sonner';

export type ModuloSlug = 'crm' | 'sinistros' | 'gamificacao';

export interface CorretoraConfig {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  subdominio: string;
  emailContato: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  status: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  modulosAtivos: ModuloSlug[];
}

export type UpdateCorretoraInput = Partial<{
  nomeFantasia: string;
  razaoSocial: string;
  emailContato: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
}>;

export interface CorretoraHistoricoItem {
  id: string;
  acao: string;
  usuarioId: string | null;
  usuarioNome: string | null;
  usuarioEmail: string | null;
  dadosAnteriores: Record<string, unknown> | null;
  dadosNovos: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const QK = ['configuracoes', 'corretora'] as const;
const QK_HIST = ['configuracoes', 'corretora', 'historico'] as const;

export function useCorretoraConfig() {
  return useQuery<CorretoraConfig>({
    queryKey: QK,
    queryFn: () => api.get<CorretoraConfig>('/settings/broker'),
  });
}

export function useUpdateCorretora() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCorretoraInput) =>
      api.patch<CorretoraConfig>('/settings/broker', input),
    onSuccess: (data) => {
      qc.setQueryData(QK, data);
      qc.invalidateQueries({ queryKey: QK_HIST });
      qc.invalidateQueries({ queryKey: ['corretoras'] });
      toast.success('Dados da corretora atualizados');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao atualizar dados');
    },
  });
}

export function useUploadCorretoraLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post<{ logoUrl: string | null }>(
        '/settings/broker/logo',
        formData,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: QK_HIST });
      qc.invalidateQueries({ queryKey: ['corretoras'] });
      toast.success('Logo atualizado');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao enviar logo');
    },
  });
}

export function useRemoveCorretoraLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.delete<{ logoUrl: null }>('/settings/broker/logo'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: QK_HIST });
      qc.invalidateQueries({ queryKey: ['corretoras'] });
      toast.success('Logo removido');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao remover logo');
    },
  });
}

export function useCorretoraHistorico(limit = 50) {
  return useQuery<CorretoraHistoricoItem[]>({
    queryKey: [...QK_HIST, limit],
    queryFn: () =>
      api.get<CorretoraHistoricoItem[]>('/settings/broker/history', {
        params: { limit },
      }),
  });
}

/**
 * Retorna quais módulos estão habilitados para a corretora.
 * Reutiliza o cache do useCorretoraConfig — sem request adicional.
 */
export function useModulos() {
  const { data } = useCorretoraConfig();
  const modulos = data?.modulosAtivos ?? ['crm'];
  return {
    crm: modulos.includes('crm'),
    sinistros: modulos.includes('sinistros'),
    gamificacao: modulos.includes('gamificacao'),
    lista: modulos as ModuloSlug[],
  };
}
