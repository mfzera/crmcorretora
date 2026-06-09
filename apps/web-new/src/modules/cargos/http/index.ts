import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { useAuthStore } from '@/infra/auth/auth-store';
import { toast } from 'sonner';

// Types
export interface Cargo {
  id: string;
  nomeCargo: string;
  descricao: string | null;
  cor: string | null;
  isAdmin: boolean;
  isGestor: boolean;
  isVendedor: boolean;
  padrao?: boolean;
  corretoraId: string;
  createdAt: string;
  updatedAt: string;
  permissoes?: Array<{
    permissaoGlobalId: string;
    nomePermissao?: string;
    descricao?: string;
    grupo?: string;
  }>;
}

export interface PermissaoGlobal {
  id: string;
  nomePermissao: string;
  descricao: string | null;
  grupo: string | null;
}

export interface CargoComPermissoes extends Omit<Cargo, 'permissoes'> {
  permissoes: PermissaoGlobal[];
}

export interface CreateCargoData {
  nomeCargo: string;
  descricao?: string;
  cor?: string;
  isAdmin?: boolean;
  isGestor?: boolean;
  isVendedor?: boolean;
  permissoes?: string[]; // IDs das permissões
}

export interface UpdateCargoData extends Partial<CreateCargoData> {
  id: string;
}

// Query: Listar todos os cargos
export function useCargos() {
  return useQuery({
    queryKey: ['cargos'],
    queryFn: async () => {
      // api.get já extrai o .data automaticamente
      const cargos = await api.get<Cargo[]>('/roles');
      return cargos;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos — cargos mudam raramente
  });
}

// Query: Buscar cargo por ID com permissões
export function useCargo(id: string | null) {
  return useQuery({
    queryKey: ['cargos', id],
    queryFn: async () => {
      if (!id) return null;
      // api.get já extrai o .data automaticamente
      const cargo = await api.get<CargoComPermissoes>(`/roles/${id}`);
      return cargo;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

// Query: Listar todas as permissões globais
export function usePermissoesGlobais() {
  return useQuery({
    queryKey: ['permissoes-globais'],
    queryFn: async () => {
      // api.get já extrai o .data automaticamente
      const gruposPermissoes = await api.get<Record<string, PermissaoGlobal[]>>(
        '/roles/permissions/available',
      );
      // Converter objeto agrupado em array flat
      const permissoesArray: PermissaoGlobal[] = [];
      Object.values(gruposPermissoes).forEach((grupo) => {
        permissoesArray.push(...grupo);
      });
      return permissoesArray;
    },
    staleTime: 30 * 60 * 1000, // 30 minutos — permissões disponíveis são estáticas
  });
}

// Mutation: Criar cargo
export function useCreateCargo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCargoData) => {
      return await api.post<Cargo>('/roles', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      toast.success('Cargo criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar cargo');
    },
  });
}

// Mutation: Atualizar cargo
export function useUpdateCargo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCargoData) => {
      return await api.patch<Cargo>(`/roles/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      queryClient.invalidateQueries({ queryKey: ['cargos', variables.id] });
      toast.success('Cargo atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar cargo');
    },
  });
}

// Mutation: Deletar cargo
export function useDeleteCargo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      toast.success('Cargo excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir cargo');
    },
  });
}

// Mutation: Atribuir permissões a um cargo
export function useAssignPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cargoId,
      permissaoIds,
    }: {
      cargoId: string;
      permissaoIds: string[];
    }) => {
      return await api.post<{ requiresTokenRefresh?: boolean }>(`/roles/${cargoId}/permissions`, {
        permissaoIds,
      });
    },
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      queryClient.invalidateQueries({
        queryKey: ['cargos', variables.cargoId],
      });
      toast.success('Permissões atualizadas com sucesso!');

      // Se o cargo alterado é o do usuário atual, avisar para recarregar
      if (data?.requiresTokenRefresh) {
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.cargoId === variables.cargoId) {
          toast('Suas permissões foram atualizadas.', {
            description: 'Recarregue a página para aplicar as novas permissões.',
            action: { label: 'Recarregar', onClick: () => window.location.reload() },
            duration: 10000,
          });
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar permissões');
    },
  });
}

// Helper: Agrupar permissões por grupo
export function agruparPermissoesPorGrupo(permissoes: PermissaoGlobal[]) {
  const grupos = new Map<string, PermissaoGlobal[]>();

  permissoes.forEach((permissao) => {
    const grupo = permissao.grupo || 'Outros';
    if (!grupos.has(grupo)) {
      grupos.set(grupo, []);
    }
    grupos.get(grupo)!.push(permissao);
  });

  return Array.from(grupos.entries()).map(([nome, permissoes]) => ({
    nome,
    permissoes: permissoes.sort((a, b) =>
      a.nomePermissao.localeCompare(b.nomePermissao),
    ),
  }));
}

// Helper: Cores dos grupos
export const CORES_GRUPOS: Record<string, string> = {
  dashboard: 'bg-blue-500',
  vendas: 'bg-green-500',
  clientes: 'bg-yellow-500',
  usuarios: 'bg-red-500',
  cargos: 'bg-red-400',
  equipes: 'bg-purple-500',
  produtos: 'bg-indigo-500',
  configuracoes: 'bg-gray-500',
  relatorios: 'bg-pink-500',
  metricas: 'bg-cyan-500',
  renovacoes: 'bg-orange-500',
  workspace: 'bg-teal-500',
  kanban: 'bg-amber-500',
  gestao: 'bg-violet-500',
  negocios: 'bg-lime-500',
  auditoria: 'bg-slate-500',
};

export function getCorGrupo(grupo: string): string {
  return CORES_GRUPOS[grupo.toLowerCase()] || 'bg-gray-400';
}

// Helper: Cor do cargo baseado em tipo
export function getCargoColor(cargo: Cargo): string {
  if (cargo.cor) return cargo.cor;
  if (cargo.isAdmin) return '#FFD700';
  if (cargo.isGestor) return '#3B82F6';
  if (cargo.isVendedor) return '#10B981';
  return '#6B7280';
}

// Query: Listar templates de cargos
export interface CargoTemplate {
  id: string;
  nomeTemplate: string;
  descricao: string | null;
  cor: string | null;
  isGestor: boolean;
  isVendedor: boolean;
  categoria: string | null;
  totalPermissoes: number;
}

export function useCargoTemplates() {
  return useQuery({
    queryKey: ['cargo-templates'],
    queryFn: async () => {
      const templates = await api.get<CargoTemplate[]>('/roles/templates');
      return templates;
    },
  });
}

// Query: Buscar template por ID com permissões
export function useCargoTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ['cargo-templates', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const template = await api.get<
        CargoTemplate & { permissoes: PermissaoGlobal[] }
      >(`/roles/templates/${templateId}`);
      return template;
    },
    enabled: !!templateId,
  });
}

// Mutation: Criar cargo a partir de template
export function useCreateCargoFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      nomeCargo,
      descricao,
      cor,
    }: {
      templateId: string;
      nomeCargo: string;
      descricao?: string;
      cor?: string;
    }) => {
      return await api.post<Cargo>(`/roles/from-template/${templateId}`, {
        nomeCargo,
        descricao,
        cor,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      toast.success('Cargo criado com sucesso a partir do template!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar cargo do template');
    },
  });
}

// Mutation: Duplicar cargo
export function useDuplicateCargo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cargoId,
      nomeCargo,
      descricao,
      cor,
    }: {
      cargoId: string;
      nomeCargo: string;
      descricao?: string;
      cor?: string;
    }) => {
      return await api.post<Cargo>(`/roles/${cargoId}/duplicate`, {
        nomeCargo,
        descricao,
        cor,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      toast.success('Cargo duplicado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao duplicar cargo');
    },
  });
}

// Query: Histórico de auditoria de um cargo
export interface AuditoriaEntry {
  id: string;
  acao: string;
  metadados: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
  usuario: { id: string; nome: string } | null;
  permissao: { id: string; nomePermissao: string; descricao: string | null } | null;
}

export function useCargoAuditoria(cargoId: string | null) {
  return useQuery({
    queryKey: ['cargo-auditoria', cargoId],
    queryFn: async () => {
      if (!cargoId) return [];
      return await api.get<AuditoriaEntry[]>(`/roles/${cargoId}/audit?limit=100`);
    },
    enabled: !!cargoId,
    staleTime: 30_000,
  });
}

// Mutation: Alterar cor do cargo
export function useUpdateCargoCor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cargoId, cor }: { cargoId: string; cor: string }) => {
      return await api.patch<Cargo>(`/roles/${cargoId}/cor`, { cor });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] });
      toast.success('Cor do cargo atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar cor do cargo');
    },
  });
}

