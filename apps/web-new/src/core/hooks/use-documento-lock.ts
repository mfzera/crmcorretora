import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type { DocumentoVendaLockStatus } from '@/types/documento-venda';
import { toast } from 'sonner';

interface LockDocumentoResponse {
  success: boolean;
  data?: {
    lockedBy?: {
      id: string;
      nome: string;
    };
    lockExpiresAt?: string;
  };
  message?: string;
  error?: string;
  lockedBy?: {
    id: string;
    nome: string;
  };
}

interface LockStatusResponse {
  success: boolean;
  data: DocumentoVendaLockStatus;
}

export function useDocumentoLock(documentoId: string | null, enabled = false) {
  const queryClient = useQueryClient();
  const lockRenewalIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Query para verificar o status do lock
  const {
    data: lockStatus,
    isLoading,
    refetch,
  } = useQuery<LockStatusResponse>({
    queryKey: ['documento-lock-status', documentoId],
    queryFn: async () => {
      if (!documentoId) throw new Error('ID do documento não fornecido');
      const defaultStatus = {
        isLocked: false,
        isLockedByCurrentUser: false,
        lockedBy: null,
        lockedAt: null,
        lockExpiresAt: null,
      };
      try {
        // api.get já extrai o .data da resposta
        const data = await api.get<DocumentoVendaLockStatus>(
          `/sales-documents/${documentoId}/lock-status`,
        );
        return {
          success: true,
          data: data ?? defaultStatus,
        };
      } catch {
        // Retornar status padrão em caso de erro
        return {
          success: true,
          data: defaultStatus,
        };
      }
    },
    enabled: enabled && !!documentoId,
    refetchInterval: 10000, // Verifica a cada 10 segundos
    retry: false, // Não tentar novamente em caso de erro
  });

  // Mutation para bloquear documento
  const lockMutation = useMutation<LockDocumentoResponse, Error, string>({
    mutationFn: async (id: string) => {
      // api.post já extrai o .data da resposta, então retornamos diretamente
      const data = await api.post<LockDocumentoResponse['data']>(
        `/sales-documents/${id}/lock`,
      );
      return { success: true, data } as LockDocumentoResponse;
    },
    onSuccess: (data) => {
      if (data?.success) {
        queryClient.invalidateQueries({
          queryKey: ['documento-lock-status', documentoId],
        });
        // Iniciar renovação automática do lock a cada 5 minutos
        startLockRenewal();
      }
    },
    onError: (error: any) => {
      if (error.statusCode === 423) {
        toast.error(error.message || `Documento bloqueado por outro usuário`);
      } else {
        // Silenciar erro de lock - não é crítico para o funcionamento
      }
    },
  });

  // Mutation para desbloquear documento
  const unlockMutation = useMutation<LockDocumentoResponse, Error, string>({
    mutationFn: async (id: string) => {
      // api.post já extrai o .data da resposta
      const data = await api.post<LockDocumentoResponse['data']>(
        `/sales-documents/${id}/unlock`,
      );
      return { success: true, data } as LockDocumentoResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['documento-lock-status', documentoId],
      });
      stopLockRenewal();
    },
    onError: () => {
      toast.error('Erro ao desbloquear documento');
    },
  });

  // Função para iniciar renovação automática do lock
  const startLockRenewal = useCallback(() => {
    if (lockRenewalIntervalRef.current) {
      clearInterval(lockRenewalIntervalRef.current);
    }

    // Renovar o lock a cada 5 minutos (o lock expira em 15 minutos)
    lockRenewalIntervalRef.current = setInterval(
      () => {
        if (documentoId) {
          lockMutation.mutate(documentoId);
        }
      },
      5 * 60 * 1000,
    );
  }, [documentoId]);

  // Função para parar renovação automática
  const stopLockRenewal = useCallback(() => {
    if (lockRenewalIntervalRef.current) {
      clearInterval(lockRenewalIntervalRef.current);
      lockRenewalIntervalRef.current = null;
    }
  }, []);

  // Função para tentar bloquear o documento
  const acquireLock = useCallback(
    async (id: string) => {
      return lockMutation.mutateAsync(id);
    },
    [lockMutation],
  );

  // Função para desbloquear o documento
  const releaseLock = useCallback(
    async (id: string) => {
      return unlockMutation.mutateAsync(id);
    },
    [unlockMutation],
  );

  // Limpar interval quando o componente desmontar
  useEffect(() => {
    return () => {
      stopLockRenewal();
    };
  }, [stopLockRenewal]);

  // Desbloquear automaticamente quando o componente desmontar (se for o dono do lock)
  useEffect(() => {
    return () => {
      if (documentoId && lockStatus?.data?.isLockedByCurrentUser && enabled) {
        // Desbloquear de forma assíncrona sem esperar
        api.post(`/sales-documents/${documentoId}/unlock`).catch(() => {
          // Ignorar erros ao desbloquear na desmontagem
        });
      }
    };
  }, [documentoId, lockStatus?.data?.isLockedByCurrentUser, enabled]);

  return {
    lockStatus: lockStatus?.data,
    isLoading,
    acquireLock,
    releaseLock,
    refetchLockStatus: refetch,
    isLocking: lockMutation.isPending,
    isUnlocking: unlockMutation.isPending,
  };
}
