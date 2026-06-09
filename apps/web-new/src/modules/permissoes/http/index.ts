import { useQuery } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import type { PermissoesAgrupadasResponse } from '@/types/permissao';

export interface PermissaoGlobal {
  id: string;
  nomePermissao: string;
  descricao: string | null;
  grupo: string | null;
}

// Query Keys
export const permissoesKeys = {
  all: ['permissoes'] as const,
  disponiveis: () => [...permissoesKeys.all, 'disponiveis'] as const,
  globais: () => [...permissoesKeys.all, 'globais'] as const,
};

// Hook para listar permissões disponíveis agrupadas
export function usePermissoesDisponiveis() {
  return useQuery({
    queryKey: permissoesKeys.disponiveis(),
    queryFn: async () => {
      const response = await api.get<PermissoesAgrupadasResponse>(
        '/roles/permissions/available',
      );
      // O interceptor do Axios já extrai response.data.data
      // Então a resposta já vem como PermissoesAgrupadasResponse
      return response || {};
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
    staleTime: 300000, // 5 minutos - permissões mudam raramente
  });
}

// Hook para listar todas as permissões globais (array flat)
export function usePermissoesGlobais() {
  return useQuery({
    queryKey: permissoesKeys.globais(),
    queryFn: async () => {
      const gruposPermissoes = await api.get<
        Record<string, PermissaoGlobal[]>
      >('/roles/permissions/available');
      // Converter objeto agrupado em array flat
      const permissoesArray: PermissaoGlobal[] = [];
      Object.values(gruposPermissoes).forEach((grupo) => {
        permissoesArray.push(...grupo);
      });
      return permissoesArray;
    },
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.statusCode === 403) return false;
      return failureCount < 2;
    },
    staleTime: 300000, // 5 minutos - permissões mudam raramente
  });
}
