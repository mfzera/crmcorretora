import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';

// ============================================================================
// INTERFACES
// ============================================================================

export interface Anexo {
  id: string;
  nomeOriginal: string;
  nomeArquivo: string;
  mimeType: string;
  tamanho: number;
  versao: number;
  versaoAtual?: boolean;
  entidadeTipo: string;
  entidadeId: string;
  uploadPor: {
    id: string;
    nome: string;
    email: string;
  };
  uploadEm: string;
  urlAssinada?: string;
  arquivoAnteriorId?: string;
}

export interface StorageUsage {
  usado: number;
  limite: number;
  percentual: number;
  arquivos: number;
  limiteArquivos: number;
}

export interface LimitStatus {
  espacoDisponivel: boolean;
  arquivosDisponiveis: boolean;
  mensagem?: string;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useAnexos(entidade: string, entidadeId: string) {
  return useQuery({
    queryKey: ['anexos', entidade, entidadeId],
    queryFn: async () => {
      const response = await api.get<Anexo[]>(
        `/attachments/entidade/${entidade}/${entidadeId}`,
      );

      return Array.isArray(response) ? response : [];
    },
    enabled: !!entidade && !!entidadeId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useAnexo(id: string) {
  return useQuery({
    queryKey: ['anexo', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<Anexo>(`/attachments/${id}`);
      return response || null;
    },
    enabled: !!id,
  });
}

export function useAnexoVersoes(anexoId: string) {
  return useQuery({
    queryKey: ['anexo-versoes', anexoId],
    queryFn: async () => {
      const response = await api.get<Anexo[]>(`/attachments/${anexoId}/versions`);
      return response || [];
    },
    enabled: !!anexoId,
  });
}

export function useStorageUsage() {
  return useQuery<{ usage: StorageUsage; limits: LimitStatus } | null>({
    queryKey: ['storage-usage'],
    queryFn: async () => {
      try {
        const response = await api.get<{
          usage: StorageUsage;
          limits: LimitStatus;
        }>('/attachments/storage/usage');
        if (!response) return null;
        const usage = response.usage;
        const limits = response.limits;
        return { usage, limits };
      } catch (error) {
        return null;
      }
    },
    // Cache por 5 minutos
    staleTime: 5 * 60 * 1000,
    // Desabilitar até implementar rota no backend
    enabled: false,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

interface UploadAnexoParams {
  entidade: string;
  entidadeId: string;
  arquivo: File;
  tags?: string[];
  onProgress?: (progress: number) => void;
}

export function useUploadAnexo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entidade,
      entidadeId,
      arquivo,
      tags,
      onProgress,
    }: UploadAnexoParams) => {
      const formData = new FormData();
      formData.append('entidadeTipo', entidade);
      formData.append('entidadeId', entidadeId);
      formData.append('file', arquivo);
      if (tags && tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }

      const response = await api.post<Anexo>('/attachments/upload', formData);

      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidar lista de anexos
      queryClient.invalidateQueries({
        queryKey: ['anexos', variables.entidade, variables.entidadeId],
      });

      // Invalidar storage usage
      queryClient.invalidateQueries({
        queryKey: ['storage-usage'],
      });
    },
  });
}

interface UploadNovaVersaoParams {
  anexoId: string;
  arquivo: File;
  onProgress?: (progress: number) => void;
}

export function useUploadNovaVersao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      anexoId,
      arquivo,
      onProgress,
    }: UploadNovaVersaoParams) => {
      const formData = new FormData();
      formData.append('file', arquivo);

      const response = await api.post<Anexo>(
        `/attachments/${anexoId}/new-version`,
        formData,
      );

      return response;
    },
    onSuccess: (data) => {
      // Invalidar o anexo atual
      queryClient.invalidateQueries({
        queryKey: ['anexo', data.id],
      });
      // Invalidar lista de anexos
      queryClient.invalidateQueries({
        queryKey: ['anexos', data.entidadeTipo, data.entidadeId],
      });
      // Invalidar versões
      queryClient.invalidateQueries({
        queryKey: ['anexo-versoes', data.id],
      });
    },
  });
}

export function useDeleteAnexo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/attachments/${id}`);
    },
    onSuccess: (_, id) => {
      // Invalidar anexo específico
      queryClient.invalidateQueries({
        queryKey: ['anexo', id],
      });
      // Invalidar todas as listas de anexos
      queryClient.invalidateQueries({
        queryKey: ['anexos'],
      });
    },
  });
}

// ============================================================================
// UTILS
// ============================================================================

export async function getDownloadUrl(id: string): Promise<string> {
  const response = await api.get<{ url: string }>(`/attachments/${id}/download`);
  // api.get já retorna os dados diretamente (não precisa de .data)
  return typeof response === 'object' && 'url' in response ? response.url : '';
}
