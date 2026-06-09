import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { toast } from 'sonner';

// Types
export interface TransferenciaRenovacao {
  id: string;
  corretoraId: string;
  solicitanteId: string;
  destinatarioId: string;
  status: 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'CANCELADA';
  motivoRecusa?: string;
  observacoes?: string;
  criadoEm: string;
  respondidoEm?: string;
  respondidoPorId?: string;
  solicitante: {
    id: string;
    nome: string;
    email: string;
  };
  itens: Array<{
    id: string;
    transferenciaId: string;
    renovacaoId: string;
    renovacao: {
      id: string;
      clienteId: string;
      dataVencimento: string;
      status: string;
      cliente: {
        nome: string | null;
        nomeFantasia?: string | null;
        razaoSocial?: string | null;
      };
    };
  }>;
}

// Queries
export function useTransferenciasPendentes() {
  return useQuery({
    queryKey: ['transferencias', 'pendentes'],
    queryFn: async () => {
      const response = await api.get<TransferenciaRenovacao[]>(
        '/renewals/transfers/pending',
      );
      return response;
    },
  });
}

// Mutations
export function useSolicitarTransferencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      renovacaoIds: string[];
      novoVendedorId: string;
      observacoes?: string;
    }) => {
      return await api.post<{ message: string }>(
        '/renewals/transfer',
        data,
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['renovacoes'] });
      toast.success(data.message || 'Solicitação enviada com sucesso');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erro ao solicitar transferência',
      );
    },
  });
}

export function useAceitarTransferencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferenciaId: string) => {
      return await api.post<{ message: string }>(
        `/renewals/transfers/${transferenciaId}/accept`,
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      queryClient.invalidateQueries({ queryKey: ['renovacoes'] });
      queryClient.invalidateQueries({ queryKey: ['area-trabalho'] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      toast.success(data.message || 'Transferência aceita com sucesso');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erro ao aceitar transferência',
      );
    },
  });
}

export function useRecusarTransferencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { transferenciaId: string; motivo?: string }) => {
      return await api.post<{ message: string }>(
        `/renewals/transfers/${data.transferenciaId}/reject`,
        { motivo: data.motivo },
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      queryClient.invalidateQueries({ queryKey: ['renovacoes'] });
      queryClient.invalidateQueries({ queryKey: ['area-trabalho'] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      toast.success(data.message || 'Transferência recusada');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erro ao recusar transferência',
      );
    },
  });
}
