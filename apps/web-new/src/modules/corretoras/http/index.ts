import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { useAuthStore } from '@/infra/auth/auth-store';

export interface Corretora {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj?: string;
  logoUrl?: string | null;
  status: string;
  cargo?: {
    id: string;
    nome: string;
    isAdmin: boolean;
    isGestor: boolean;
    isVendedor: boolean;
  } | null;
  ativa: boolean;
  dataVinculo?: string;
}

interface CorretorasResponse {
  success: boolean;
  data: Corretora[];
}

interface SwitchCorretoraResponse {
  success: boolean;
  data: {
    token: string;
    permissoes: string[];
    usuario: {
      id: string;
      nome: string;
      email: string;
      corretoraId: string;
      corretoraAtiva: {
        id: string;
        razaoSocial: string;
        nomeFantasia: string;
      };
      cargo: {
        id: string;
        nome: string;
        isAdmin: boolean;
        isGestor: boolean;
        isVendedor: boolean;
      } | null;
    };
  };
  message: string;
}

/**
 * Hook para buscar todas as corretoras do usuário autenticado
 */
export function useCorretoras() {
  return useQuery<Corretora[]>({
    queryKey: ['corretoras'],
    queryFn: async () => {
      // api.get já retorna response.data desempacotado automaticamente
      const data = await api.get<Corretora[]>('/auth/corretoras');
      return data || [];
    },
  });
}

/**
 * Hook para trocar de corretora ativa
 */
export function useSwitchCorretora() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (corretoraId: string) => {
      // api.post já retorna response.data desempacotado automaticamente
      const data = await api.post<SwitchCorretoraResponse['data']>(
        '/auth/corretoras/switch',
        { corretoraId },
      );
      return data;
    },
    onSuccess: (data) => {
      // Decodificar o token JWT para extrair todas as informações incluindo permissões
      if (data.token) {
        const base64Url = data.token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const tokenPayload = JSON.parse(atob(base64));

        const userData = {
          id: data.usuario.id,
          sub: tokenPayload.sub || data.usuario.id,
          nome: data.usuario.nome,
          email: data.usuario.email,
          avatarUrl: tokenPayload.avatarUrl || null,
          corretoraId: data.usuario.corretoraId,
          cargoId: tokenPayload.cargoId || null,
          isAdmin: tokenPayload.isAdmin || false,
          isGestor: tokenPayload.isGestor || false,
          isVendedor: tokenPayload.isVendedor || false,
          isLiderEquipe: tokenPayload.isLiderEquipe || false,
          permissoes: data.permissoes || [],
          cargo: tokenPayload.cargoId
            ? {
                id: tokenPayload.cargoId,
                isAdmin: tokenPayload.isAdmin || false,
                isGestor: tokenPayload.isGestor || false,
                isVendedor: tokenPayload.isVendedor || false,
              }
            : null,
        };

        // Atualizar token e dados do usuário no store usando setAuth
        const { setAuth, resetSessionExpired } = useAuthStore.getState();
        setAuth(userData, data.token);
        // Limpar flag de sessão expirada — requests in-flight com o token antigo
        // podem ter retornado 401 durante a troca, acionando o modal erroneamente.
        resetSessionExpired();
      }

      // Invalidar todas as queries para recarregar dados da nova corretora
      queryClient.invalidateQueries();
    },
  });
}
