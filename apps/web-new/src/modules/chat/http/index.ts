import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { toast } from 'sonner';
import { stabilizeUsuarioAvatar } from '@/core/utils/avatar-cache';

export type Canal = {
  id: string;
  tipo: 'geral' | 'direto';
  nome?: string;
  descricao?: string;
  corretoraId: string;
  criadoPorId: string;
  ativo: boolean;
  createdAt: string;
  outroUsuario?: {
    id: string;
    nome: string;
    email: string;
    avatarUrl?: string;
    cargo?: { nomeCargo: string };
    equipe?: { nome: string };
  };
  ultimaMensagem?: {
    id: string;
    conteudo: string;
    createdAt: string;
    usuarioId: string;
    usuario?: {
      id: string;
      nome: string;
    };
  };
  naoLidas: number;
  // Fix: Ensure valid user data
};

export type Mensagem = {
  id: string;
  canalId: string;
  usuarioId: string;
  conteudo: string;
  tipo: 'texto' | 'sistema' | 'arquivo';
  respostaParaId?: string;
  editado: boolean;
  editadoEm?: string;
  createdAt: string;
  deletedAt?: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    avatarUrl?: string;
    cargo?: { nomeCargo: string };
    equipe?: { nome: string };
  };
  leituras?: Array<{
    id: string;
    mensagemId: string;
    usuarioId: string;
    lidoEm: string;
    usuario: {
      id: string;
      nome: string;
    };
  }>;
  reacoes?: Array<{
    id: string;
    mensagemId: string;
    usuarioId: string;
    emoji: string;
    createdAt: string;
    usuario: {
      id: string;
      nome: string;
    };
  }>;
};

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  avatarUrl?: string;
  ativo: boolean;
  isAdmin?: boolean;
  podeEnviarMensagem?: boolean;
  cargo?: {
    nomeCargo: string;
    descricao?: string;
    cor?: string;
  };
  equipe?: {
    nome: string;
  };
};

// Query: Buscar canais do usuário
export function useCanais() {
  return useQuery({
    queryKey: ['canais'],
    queryFn: async () => {
      try {
        const response = await api.get<{ canais: Canal[] }>('/chat');

        // Filtrar canais diretos sem outroUsuario válido (ex: usuário deletado)
        const canaisValidos =
          response?.canais?.filter((canal) => {
            if (canal.tipo === 'direto') {
              return canal.outroUsuario && canal.outroUsuario.nome;
            }
            return true;
          }) || [];

        // Estabilizar URLs de avatar para evitar flash
        const canaisEstabilizados = canaisValidos.map((canal) => {
          if (canal.outroUsuario) {
            return {
              ...canal,
              outroUsuario: stabilizeUsuarioAvatar(canal.outroUsuario),
            };
          }
          return canal;
        });

        return { canais: canaisEstabilizados };
      } catch (error) {
        console.error('Erro ao buscar canais:', error);
        return { canais: [] };
      }
    },
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // Refetch a cada 1 minuto como fallback
  });
}

// Query: Buscar mensagens de um canal
export function useMensagens(canalId: string, enabled = true) {
  return useQuery({
    queryKey: ['mensagens', canalId],
    queryFn: async () => {
      try {
        const response = await api.get<{ mensagens: Mensagem[] }>(
          `/chat/${canalId}/mensagens`,
          {
            params: { limit: 50, offset: 0 },
          },
        );

        // Estabilizar URLs de avatar para evitar flash
        const mensagens = (response?.mensagens || []).map((m) => ({
          ...m,
          usuario: m.usuario ? stabilizeUsuarioAvatar(m.usuario) : m.usuario,
        }));

        return { mensagens };
      } catch (error) {
        return { mensagens: [] };
      }
    },
    enabled: !!canalId && enabled,
    staleTime: 60000, // 60 segundos — WS faz inserção incremental
  });
}

// Query: Buscar perfil de usuário
export function useUsuarioPerfil(usuarioId: string) {
  return useQuery({
    queryKey: ['usuario-perfil', usuarioId],
    queryFn: async () => {
      try {
        const response = await api.get<{ usuario: Usuario }>(
          `/chat/usuarios/${usuarioId}/perfil`,
        );
        return response;
      } catch (error) {
        return null; // Retornar null em vez de throw para não quebrar
      }
    },
    enabled: !!usuarioId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Query: Buscar membros de um canal
export function useMembrosCanal(canalId: string) {
  return useQuery({
    queryKey: ['membros-canal', canalId],
    queryFn: async () => {
      try {
        const response = await api.get<{ membros: Usuario[] }>(
          `/chat/${canalId}/members`,
        );
        return response || { membros: [] };
      } catch (error) {
        return { membros: [] };
      }
    },
    enabled: !!canalId,
    staleTime: 60000, // 1 minuto
  });
}

// Query: Buscar todos os usuários da seguradora (para criar DM)
export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      try {
        const response = await api.get<{ usuarios: Usuario[] }>('/users');
        return response || { usuarios: [] };
      } catch (error) {
        return { usuarios: [] };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Mutation: Criar canal geral
export function useCreateCanalGeral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      nome: string;
      descricao?: string;
      membrosIds: string[];
    }) => {
      const response = await api.post<{ canal: Canal }>('/chat', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canais'] });
      toast.success('Canal criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar canal');
    },
  });
}

// Mutation: Criar canal direto
export function useCreateCanalDireto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (usuarioDestinoId: string) => {
      const response = await api.post<{ canal: Canal; created: boolean }>(
        '/chat/direto',
        { usuarioDestinoId },
      );
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['canais'] });
      if (data.created) {
        toast.success('Conversa iniciada!');
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar conversa');
    },
  });
}

// Mutation: Adicionar membro ao canal
export function useAddMembroCanal(canalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (usuarioId: string) => {
      const response = await api.post<any>(`/chat/${canalId}/members`, {
        usuarioId,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membros-canal', canalId] });
      toast.success('Membro adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao adicionar membro');
    },
  });
}

// Mutation: Adicionar múltiplos membros
export function useAddMembrosCanal(canalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (usuarioIds: string[]) => {
      const response = await api.post<any>(`/chat/${canalId}/members/bulk`, {
        usuarioIds,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membros-canal', canalId] });
      queryClient.invalidateQueries({ queryKey: ['canais'] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Erro ao adicionar membros',
      );
    },
  });
}

// Mutation: Remover membro do canal
export function useRemoverMembroCanal(canalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membroId: string) => {
      await api.delete(`/chat/${canalId}/members/${membroId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membros-canal', canalId] });
      queryClient.invalidateQueries({ queryKey: ['canais'] });
      toast.success('Membro removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao remover membro');
    },
  });
}

// Mutation: Sair do canal
export function useSairDoCanal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (canalId: string) => {
      await api.post(`/chat/${canalId}/leave`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canais'] });
      toast.success('Você saiu do canal');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao sair do canal');
    },
  });
}

// Mutation: Atualizar configurações do canal
export function useUpdateChannel(canalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { nome?: string; descricao?: string }) => {
      await api.patch(`/chat/${canalId}/settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canais'] });
      toast.success('Configurações atualizadas!');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Erro ao atualizar configurações',
      );
    },
  });
}
