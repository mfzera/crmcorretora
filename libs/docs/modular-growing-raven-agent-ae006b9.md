# Plano de Implementação: Sistema de Controle de Usuários

## Visão Geral
Implementação completa de uma seção de controle de usuários com gestão de usuários, cargos e permissões em três tabs principais, seguindo os padrões estabelecidos no projeto EcoTech.

---

## Arquitetura de Arquivos

### 1. Estrutura de Diretórios
```
apps/web/src/
├── app/(app)/
│   └── usuarios/
│       └── page.tsx                          # Página principal com tabs
├── components/
│   └── usuarios/
│       ├── usuarios-tab.tsx                   # Tab de gestão de usuários
│       ├── cargos-tab.tsx                     # Tab de gestão de cargos
│       ├── equipes-tab.tsx                    # Tab de gestão de equipes (futuro)
│       ├── usuario-dialog.tsx                 # Criar/editar usuário
│       ├── excluir-usuario-dialog.tsx         # Confirmar exclusão de usuário
│       ├── resetar-senha-dialog.tsx           # Resetar senha de usuário
│       ├── cargo-dialog.tsx                   # Criar/editar cargo
│       ├── excluir-cargo-dialog.tsx           # Confirmar exclusão de cargo
│       ├── permissoes-dialog.tsx              # Atribuir permissões ao cargo
│       └── visualizar-usuario-dialog.tsx      # Ver detalhes do usuário
├── lib/
│   └── queries/
│       ├── usuarios.ts                        # Query hooks para usuários (já existe)
│       ├── cargos.ts                          # Query hooks para cargos
│       └── permissoes.ts                      # Query hooks para permissões
└── types/
    ├── usuario.ts                             # Types para usuários
    ├── cargo.ts                               # Types para cargos
    └── permissao.ts                           # Types para permissões
```

---

## Fase 1: Preparação - Types e Query Hooks

### 1.1 Types (TypeScript Definitions)

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/types/usuario.ts`
```typescript
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  primeiroAcesso: boolean;
  ultimoLogin: string | null;
  cargo: {
    id: string;
    nome: string;
  } | null;
  equipe: {
    id: string;
    nome: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsuariosParams {
  page?: number;
  limit?: number;
  search?: string;
  cargoId?: string;
  equipeId?: string;
  ativo?: 'true' | 'false';
}

export interface ListUsuariosResponse {
  data: Usuario[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateUsuarioDTO {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  cargoId?: string;
  equipeId?: string;
}

export interface UpdateUsuarioDTO {
  nome?: string;
  telefone?: string;
  cargoId?: string;
  equipeId?: string;
  ativo?: boolean;
}
```

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/types/cargo.ts`
```typescript
export interface Cargo {
  id: string;
  nomeCargo: string;
  descricao: string | null;
  isAdmin: boolean;
  isGestor: boolean;
  isVendedor: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CargoComPermissoes extends Cargo {
  permissoes: Permissao[];
}

export interface CreateCargoDTO {
  nomeCargo: string;
  descricao?: string;
  isGestor?: boolean;
  isVendedor?: boolean;
}

export interface UpdateCargoDTO {
  nomeCargo?: string;
  descricao?: string;
  isGestor?: boolean;
  isVendedor?: boolean;
}
```

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/types/permissao.ts`
```typescript
export interface Permissao {
  id: string;
  nomePermissao: string;
  descricao: string | null;
  grupo: string | null;
}

export interface PermissoesAgrupadasResponse {
  [grupo: string]: Permissao[];
}
```

### 1.2 Query Hooks

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/lib/queries/cargos.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Cargo,
  CargoComPermissoes,
  CreateCargoDTO,
  UpdateCargoDTO,
} from '@/types/cargo';

// Query Keys
export const cargosKeys = {
  all: ['cargos'] as const,
  lists: () => [...cargosKeys.all, 'list'] as const,
  list: () => [...cargosKeys.lists()] as const,
  details: () => [...cargosKeys.all, 'detail'] as const,
  detail: (id: string) => [...cargosKeys.details(), id] as const,
};

// Hook para listar cargos
export function useCargos() {
  return useQuery({
    queryKey: cargosKeys.list(),
    queryFn: async () => {
      try {
        const response = await api.get<{ success: boolean; data: Cargo[] }>('/cargos');
        return response.data || [];
      } catch (error) {
        console.warn('Erro ao buscar cargos:', error);
        return [];
      }
    },
    retry: false,
    staleTime: 30000,
  });
}

// Hook para buscar cargo por ID com permissões
export function useCargo(id: string | null) {
  return useQuery({
    queryKey: cargosKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      try {
        const response = await api.get<{ success: boolean; data: CargoComPermissoes }>(
          `/cargos/${id}`
        );
        return response.data;
      } catch (error) {
        console.warn('Erro ao buscar cargo:', error);
        return null;
      }
    },
    enabled: !!id,
    retry: false,
  });
}

// Hook para criar cargo
export function useCriarCargo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCargoDTO) => {
      return api.post<Cargo>('/cargos', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cargosKeys.lists() });
    },
  });
}

// Hook para atualizar cargo
export function useAtualizarCargo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCargoDTO }) => {
      return api.patch<Cargo>(`/cargos/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cargosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cargosKeys.detail(variables.id) });
    },
  });
}

// Hook para excluir cargo
export function useExcluirCargo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/cargos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cargosKeys.lists() });
    },
  });
}

// Hook para atribuir permissões ao cargo
export function useAtribuirPermissoes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      cargoId, 
      permissaoIds 
    }: { 
      cargoId: string; 
      permissaoIds: string[] 
    }) => {
      return api.post(`/cargos/${cargoId}/permissoes`, { permissaoIds });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cargosKeys.detail(variables.cargoId) });
    },
  });
}
```

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/lib/queries/permissoes.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PermissoesAgrupadasResponse } from '@/types/permissao';

// Query Keys
export const permissoesKeys = {
  all: ['permissoes'] as const,
  disponiveis: () => [...permissoesKeys.all, 'disponiveis'] as const,
};

// Hook para listar permissões disponíveis agrupadas
export function usePermissoesDisponiveis() {
  return useQuery({
    queryKey: permissoesKeys.disponiveis(),
    queryFn: async () => {
      try {
        const response = await api.get<{ 
          success: boolean; 
          data: PermissoesAgrupadasResponse 
        }>('/cargos/permissoes/disponiveis');
        return response.data || {};
      } catch (error) {
        console.warn('Erro ao buscar permissões:', error);
        return {};
      }
    },
    retry: false,
    staleTime: 300000, // 5 minutos - permissões mudam raramente
  });
}
```

#### Atualizar arquivo existente: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/lib/queries/usuarios.ts`
Verificar se já existe e complementar com:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Usuario,
  ListUsuariosParams,
  ListUsuariosResponse,
  CreateUsuarioDTO,
  UpdateUsuarioDTO,
} from '@/types/usuario';

// Query Keys
export const usuariosKeys = {
  all: ['usuarios'] as const,
  lists: () => [...usuariosKeys.all, 'list'] as const,
  list: (params?: ListUsuariosParams) => [...usuariosKeys.lists(), params] as const,
  details: () => [...usuariosKeys.all, 'detail'] as const,
  detail: (id: string) => [...usuariosKeys.details(), id] as const,
};

// Hook para listar usuários
export function useUsuarios(params?: ListUsuariosParams) {
  return useQuery({
    queryKey: usuariosKeys.list(params),
    queryFn: async () => {
      try {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.append('page', String(params.page));
        if (params?.limit) searchParams.append('limit', String(params.limit));
        if (params?.search) searchParams.append('search', params.search);
        if (params?.cargoId) searchParams.append('cargoId', params.cargoId);
        if (params?.equipeId) searchParams.append('equipeId', params.equipeId);
        if (params?.ativo) searchParams.append('ativo', params.ativo);

        const queryString = searchParams.toString();
        const endpoint = queryString ? `/usuarios?${queryString}` : '/usuarios';

        const response = await api.get<ListUsuariosResponse>(endpoint);
        return response;
      } catch (error) {
        console.warn('Erro ao buscar usuários:', error);
        return {
          data: [],
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: 0,
            totalPages: 0,
          },
        } as ListUsuariosResponse;
      }
    },
    retry: false,
    staleTime: 30000,
  });
}

// Hook para buscar usuário por ID
export function useUsuario(id: string | null) {
  return useQuery({
    queryKey: usuariosKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;
      try {
        const response = await api.get<{ success: boolean; data: Usuario }>(
          `/usuarios/${id}`
        );
        return response.data;
      } catch (error) {
        console.warn('Erro ao buscar usuário:', error);
        return null;
      }
    },
    enabled: !!id,
    retry: false,
  });
}

// Hook para criar usuário
export function useCriarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUsuarioDTO) => {
      return api.post<Usuario>('/usuarios', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() });
    },
  });
}

// Hook para atualizar usuário
export function useAtualizarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUsuarioDTO }) => {
      return api.patch<Usuario>(`/usuarios/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usuariosKeys.detail(variables.id) });
    },
  });
}

// Hook para excluir usuário
export function useExcluirUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/usuarios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() });
    },
  });
}

// Hook para resetar senha
export function useResetarSenha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, novaSenha }: { id: string; novaSenha: string }) => {
      return api.post(`/usuarios/${id}/resetar-senha`, { novaSenha });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: usuariosKeys.detail(variables.id) });
    },
  });
}
```

---

## Fase 2: Componentes Base - Diálogos

### 2.1 Dialog de Usuário (Criar/Editar)

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/components/usuarios/usuario-dialog.tsx`

**Características:**
- Formulário com react-hook-form + zod
- Campos: nome, email, senha (apenas criação), telefone, cargo, equipe, status
- Validações: email único, senha mínima 8 caracteres, nome mínimo 2 caracteres
- Carrega lista de cargos e equipes para seleção
- Admin define senha na criação
- Suporta modo criação e edição

**Estrutura:**
```typescript
// Imports
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
// ... outros imports

// Schema Zod
const createSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  telefone: z.string().optional(),
  cargoId: z.string().uuid('Cargo é obrigatório'),
  equipeId: z.string().uuid().optional(),
  ativo: z.boolean().default(true),
});

const updateSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  telefone: z.string().optional(),
  cargoId: z.string().uuid().optional(),
  equipeId: z.string().uuid().optional(),
  ativo: z.boolean(),
});

// Component
export function UsuarioDialog({ usuarioId, trigger, onSuccess }) {
  // Estado e hooks
  // Formulário
  // Handlers
  // JSX com Dialog, Form, FormFields
}
```

### 2.2 Dialog de Resetar Senha

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/components/usuarios/resetar-senha-dialog.tsx`

**Características:**
- Campo único para nova senha
- Validação mínima 8 caracteres
- Marca usuário como primeiro acesso
- Usado por admins para redefinir senha de outros usuários

### 2.3 Dialog de Exclusão de Usuário

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/components/usuarios/excluir-usuario-dialog.tsx`

**Características:**
- Confirmação de exclusão
- Mostra nome do usuário
- Soft delete (marca deletedAt)
- Não permite excluir a si mesmo

### 2.4 Dialog de Cargo (Criar/Editar)

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/components/usuarios/cargo-dialog.tsx`

**Características:**
- Campos: nomeCargo, descrição, isGestor, isVendedor
- Não permite editar cargo Admin
- Validação de nome único

### 2.5 Dialog de Permissões

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/components/usuarios/permissoes-dialog.tsx`

**Características:**
- Lista permissões agrupadas por categoria
- Checkboxes para selecionar/desselecionar
- Grupos: vendas, cadastro, clientes, usuarios, cargos, config, relatorios
- Mostra descrição de cada permissão
- Salva array de IDs de permissões selecionadas

**Layout:**
```
[Dialog]
  Vendas
    □ vendas:criar_cotacao - Permite criar cotações
    □ vendas:visualizar_cotacao - Permite visualizar cotações
    ...
  
  Cadastro
    □ cadastro:validar_documentos - Permite validar documentos
    ...
  
  [Cancelar] [Salvar Permissões]
```

### 2.6 Dialog de Exclusão de Cargo

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/components/usuarios/excluir-cargo-dialog.tsx`

**Características:**
- Não permite excluir se houver usuários vinculados
- Não permite excluir cargo Admin
- Confirmação com nome do cargo

### 2.7 Dialog de Visualização de Usuário

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/components/usuarios/visualizar-usuario-dialog.tsx`

**Características:**
- Modo somente leitura
- Mostra todos os dados do usuário
- Exibe permissões do cargo atual
- Data de criação, último login

---

## Fase 3: Tabs de Conteúdo

### 3.1 Tab de Usuários

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/components/usuarios/usuarios-tab.tsx`

**Estrutura:**
```typescript
export function UsuariosTab() {
  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          - Input de busca (nome, email)
          - Select de cargo
          - Select de equipe
          - Select de status (Ativo/Inativo/Todos)
          - Botão limpar filtros
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <Badge>X usuários</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              - Nome
              - Email
              - Cargo
              - Equipe
              - Status
              - Último Login
              - Ações
            </TableHeader>
            <TableBody>
              {usuarios.map(usuario => (
                <TableRow>
                  - Dados do usuário
                  - DropdownMenu com ações:
                    - Visualizar
                    - Editar
                    - Resetar Senha
                    - Desativar/Ativar
                    - Excluir
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Paginação */}
          <PaginationControls />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Funcionalidades:**
- Busca por nome ou email
- Filtro por cargo
- Filtro por equipe
- Filtro por status (ativo/inativo)
- Paginação (20 itens por página)
- Badge de status colorido
- Menu de ações por usuário

### 3.2 Tab de Cargos

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/components/usuarios/cargos-tab.tsx`

**Estrutura:**
```typescript
export function CargosTab() {
  return (
    <div className="space-y-6">
      {/* Lista de Cargos */}
      <Card>
        <CardHeader>
          <CardTitle>Cargos Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              - Nome do Cargo
              - Descrição
              - Tipo (Admin/Gestor/Vendedor/Outro)
              - Permissões (count)
              - Usuários (count)
              - Ações
            </TableHeader>
            <TableBody>
              {cargos.map(cargo => (
                <TableRow>
                  - Dados do cargo
                  - Badge de tipo
                  - Badge com número de permissões
                  - DropdownMenu com ações:
                    - Ver Permissões
                    - Gerenciar Permissões
                    - Editar
                    - Excluir (se não for Admin e sem usuários)
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Card de Explicação */}
      <Card>
        <CardHeader>
          <AlertCircle />
          <CardTitle>Sobre Cargos e Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Cargos definem o conjunto de permissões que usuários têm no sistema...</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Funcionalidades:**
- Listagem de todos os cargos
- Badges visuais para tipos de cargo
- Indicador de quantidade de permissões
- Contador de usuários com cada cargo
- Não permite editar/excluir cargo Admin
- Alerta se tentar excluir cargo com usuários

### 3.3 Tab de Equipes (Placeholder)

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/components/usuarios/equipes-tab.tsx`

**Estrutura:**
```typescript
export function EquipesTab() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center space-y-4">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3>Gestão de Equipes</h3>
          <p className="text-muted-foreground">
            A funcionalidade de gestão de equipes estará disponível em breve.
          </p>
          <p className="text-sm text-muted-foreground">
            Por enquanto, você pode atribuir equipes aos usuários através do cadastro.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Fase 4: Página Principal

### 4.1 Página /usuarios

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/app/(app)/usuarios/page.tsx`

**Estrutura completa:**
```typescript
'use client';

import { useState } from 'react';
import { Users as UsersIcon, Shield, UsersRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { UsuariosTab } from '@/components/usuarios/usuarios-tab';
import { CargosTab } from '@/components/usuarios/cargos-tab';
import { EquipesTab } from '@/components/usuarios/equipes-tab';
import { UsuarioDialog } from '@/components/usuarios/usuario-dialog';
import { CargoDialog } from '@/components/usuarios/cargo-dialog';

export default function UsuariosPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('usuarios');
  
  // Verificar permissões
  const canManageUsers = user?.permissoes?.includes('usuarios:criar') || user?.isAdmin;
  const canManageRoles = user?.permissoes?.includes('cargos:criar') || user?.isAdmin;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <div className="rounded-xl bg-primary/10 p-2.5 ring-1 ring-primary/20">
              <UsersIcon className="size-7 text-primary" />
            </div>
            Controle de Usuários
          </h1>
          <p className="text-muted-foreground pl-[52px]">
            Gerencie usuários, cargos e permissões da sua seguradora
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          {activeTab === 'usuarios' && canManageUsers && (
            <UsuarioDialog trigger={
              <Button>
                <Plus className="mr-2 size-4" />
                Novo Usuário
              </Button>
            } />
          )}
          {activeTab === 'cargos' && canManageRoles && (
            <CargoDialog trigger={
              <Button>
                <Plus className="mr-2 size-4" />
                Novo Cargo
              </Button>
            } />
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="usuarios" className="gap-2">
            <UsersIcon className="size-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="cargos" className="gap-2">
            <Shield className="size-4" />
            Cargos
          </TabsTrigger>
          <TabsTrigger value="equipes" className="gap-2">
            <UsersRound className="size-4" />
            Equipes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-6">
          <UsuariosTab />
        </TabsContent>

        <TabsContent value="cargos" className="mt-6">
          <CargosTab />
        </TabsContent>

        <TabsContent value="equipes" className="mt-6">
          <EquipesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Características:**
- Header consistente com outras páginas
- Sistema de tabs com ícones
- Botões de ação contextuais (mudam conforme tab ativa)
- Verificação de permissões
- Layout responsivo

---

## Fase 5: Integração com Sidebar

### 5.1 Atualizar Sidebar

#### Arquivo: `/home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/src/components/layout/app-sidebar.tsx`

**Modificações:**
1. Adicionar item no array `adminItems`:
```typescript
const adminItems = [
  {
    title: 'Usuários',
    url: '/usuarios',
    icon: Users,
    permission: 'usuarios:visualizar',
  },
  {
    title: 'Negócios Corretora',
    url: '/negocios-corretora',
    icon: Building2,
  },
  // ... resto dos itens
];
```

2. O sistema de permissões já está implementado no componente, então vai funcionar automaticamente.

---

## Fase 6: Validações e Schemas Zod Detalhados

### 6.1 Schema de Criação de Usuário
```typescript
const createUsuarioSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(256, 'Nome muito longo'),
  email: z
    .string()
    .email('Email inválido')
    .toLowerCase(),
  senha: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter letras maiúsculas, minúsculas e números'
    ),
  telefone: z
    .string()
    .max(20)
    .optional()
    .transform(val => val || undefined),
  cargoId: z
    .string()
    .uuid('Selecione um cargo válido'),
  equipeId: z
    .string()
    .uuid()
    .optional()
    .transform(val => val || undefined),
});
```

### 6.2 Schema de Atualização de Usuário
```typescript
const updateUsuarioSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(256, 'Nome muito longo')
    .optional(),
  telefone: z
    .string()
    .max(20)
    .optional()
    .nullable()
    .transform(val => val || null),
  cargoId: z
    .string()
    .uuid()
    .optional()
    .nullable(),
  equipeId: z
    .string()
    .uuid()
    .optional()
    .nullable(),
  ativo: z.boolean().optional(),
});
```

### 6.3 Schema de Cargo
```typescript
const cargoSchema = z.object({
  nomeCargo: z
    .string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome muito longo'),
  descricao: z
    .string()
    .max(500, 'Descrição muito longa')
    .optional()
    .transform(val => val || undefined),
  isGestor: z.boolean().default(false),
  isVendedor: z.boolean().default(false),
});
```

---

## Fase 7: Fluxos de Usuário

### 7.1 Fluxo: Criar Novo Usuário
1. Admin clica em "Novo Usuário"
2. Dialog abre com formulário vazio
3. Admin preenche:
   - Nome (obrigatório)
   - Email (obrigatório, validado)
   - Senha inicial (obrigatória, mín 8 chars)
   - Telefone (opcional)
   - Cargo (obrigatório, select com lista de cargos)
   - Equipe (opcional, select com lista de equipes)
   - Status Ativo (checkbox, padrão: true)
4. Ao submeter:
   - Validação Zod
   - POST /api/usuarios
   - Se sucesso: toast sucesso, fecha dialog, recarrega lista
   - Se erro: mostra erro (email duplicado, etc)

### 7.2 Fluxo: Editar Usuário
1. Admin clica em "Editar" no menu de ações
2. Dialog abre carregando dados do usuário
3. Campos preenchidos (exceto senha)
4. Admin modifica campos desejados
5. Ao submeter:
   - Validação Zod
   - PATCH /api/usuarios/:id
   - Se sucesso: toast sucesso, fecha dialog, recarrega lista
   - Se erro: mostra erro

### 7.3 Fluxo: Resetar Senha
1. Admin clica em "Resetar Senha"
2. Dialog simples com campo de nova senha
3. Admin digita nova senha
4. Ao submeter:
   - POST /api/usuarios/:id/resetar-senha
   - Marca primeiroAcesso = true
   - Toast: "Senha resetada. Usuário deverá mudar na próxima vez que logar"
   - Fecha dialog

### 7.4 Fluxo: Desativar/Ativar Usuário
1. Admin clica em "Desativar" ou "Ativar"
2. Confirmação rápida (opcional)
3. PATCH /api/usuarios/:id com { ativo: false/true }
4. Toast sucesso, atualiza lista
5. Usuário desativado não consegue fazer login

### 7.5 Fluxo: Excluir Usuário
1. Admin clica em "Excluir"
2. Dialog de confirmação:
   - "Tem certeza que deseja excluir [Nome]?"
   - "Esta ação não pode ser desfeita"
3. Admin confirma
4. DELETE /api/usuarios/:id (soft delete)
5. Toast sucesso, recarrega lista
6. Validação backend: não permite excluir a si mesmo

### 7.6 Fluxo: Criar Cargo
1. Admin clica em "Novo Cargo" na tab Cargos
2. Dialog com campos:
   - Nome do Cargo
   - Descrição
   - É Gestor? (checkbox)
   - É Vendedor? (checkbox)
3. Ao submeter:
   - POST /api/cargos
   - Toast sucesso, fecha dialog
   - Recarrega lista de cargos

### 7.7 Fluxo: Gerenciar Permissões
1. Admin clica em "Gerenciar Permissões" em um cargo
2. Dialog grande abre com:
   - Checkboxes agrupadas por categoria
   - Permissões atuais marcadas
3. Admin seleciona/desseleciona permissões
4. Ao submeter:
   - POST /api/cargos/:id/permissoes com array de IDs
   - Backend substitui todas as permissões
   - Toast sucesso, fecha dialog
5. Usuários com esse cargo ganham/perdem permissões instantaneamente

### 7.8 Fluxo: Excluir Cargo
1. Admin clica em "Excluir Cargo"
2. Backend valida:
   - Se é cargo Admin: erro "Não é possível excluir o cargo de Administrador"
   - Se tem usuários vinculados: erro "Cargo possui usuários vinculados"
3. Se válido:
   - Dialog de confirmação
   - DELETE /api/cargos/:id
   - Toast sucesso, recarrega lista

---

## Fase 8: Estados de Loading e Erro

### 8.1 Estados de Loading
- **Lista de usuários**: Skeleton com linhas de tabela
- **Lista de cargos**: Skeleton com cards
- **Dialog ao carregar dados**: Spinner nos campos
- **Botões durante submit**: "Salvando...", desabilitado

### 8.2 Estados de Erro
- **API indisponível**: Alert no topo "Não foi possível conectar ao servidor"
- **Sem resultados com filtros**: "Nenhum usuário encontrado com os filtros aplicados"
- **Sem usuários cadastrados**: Alert com "Nenhum usuário cadastrado ainda. Comece criando um."
- **Erro ao salvar**: Toast com mensagem específica do backend
- **Erro de validação**: Mensagens embaixo de cada campo

### 8.3 Estados Vazios
```typescript
{/* Empty State - Usuários */}
{!isLoading && usuarios.length === 0 && !hasFilters && (
  <Alert>
    <AlertCircle className="size-4" />
    <AlertTitle>Nenhum usuário cadastrado</AlertTitle>
    <AlertDescription>
      Comece cadastrando os usuários que terão acesso ao sistema.
    </AlertDescription>
  </Alert>
)}
```

---

## Fase 9: Tratamento de Permissões

### 9.1 Verificações de Permissão na UI
```typescript
const canCreate = user?.permissoes?.includes('usuarios:criar') || user?.isAdmin;
const canEdit = user?.permissoes?.includes('usuarios:editar') || user?.isAdmin;
const canDelete = user?.permissoes?.includes('usuarios:excluir') || user?.isAdmin;
const canViewAll = user?.permissoes?.includes('usuarios:visualizar') || user?.isAdmin;
const canManageRoles = user?.permissoes?.includes('cargos:criar') || user?.isAdmin;
const canAssignPermissions = user?.permissoes?.includes('cargos:atribuir_permissoes') || user?.isAdmin;
```

### 9.2 Renderização Condicional
```typescript
{canCreate && (
  <Button onClick={handleCreate}>Novo Usuário</Button>
)}

{canEdit && (
  <DropdownMenuItem onClick={handleEdit}>
    <Edit className="mr-2 size-4" />
    Editar
  </DropdownMenuItem>
)}
```

### 9.3 Redirect se Sem Permissão
```typescript
useEffect(() => {
  if (!user?.permissoes?.includes('usuarios:visualizar') && !user?.isAdmin) {
    router.push('/dashboard');
    toast.error('Você não tem permissão para acessar esta página');
  }
}, [user]);
```

---

## Fase 10: Edge Cases e Validações Especiais

### 10.1 Edge Cases Importantes

#### 1. Não pode excluir a si mesmo
```typescript
if (usuario.id === user.id) {
  toast.error('Você não pode excluir sua própria conta');
  return;
}
```

#### 2. Não pode editar cargo Admin
```typescript
if (cargo.isAdmin) {
  toast.error('Não é possível editar o cargo de Administrador');
  return;
}
```

#### 3. Não pode excluir cargo com usuários
```typescript
// Backend valida e retorna erro
// Frontend mostra mensagem clara
if (error.message.includes('usuários vinculados')) {
  toast.error('Este cargo possui usuários vinculados. Reatribua os usuários antes de excluir.');
}
```

#### 4. Email duplicado
```typescript
if (error.statusCode === 409) {
  toast.error('Este email já está cadastrado na seguradora');
}
```

#### 5. Quota de usuários atingida
```typescript
if (error.message.includes('quota')) {
  toast.error('Limite de usuários atingido para seu plano. Entre em contato para upgrade.');
}
```

#### 6. Senha fraca
```typescript
// Validação Zod com regex
senha: z.string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Deve conter letra maiúscula')
  .regex(/[a-z]/, 'Deve conter letra minúscula')
  .regex(/[0-9]/, 'Deve conter número')
```

#### 7. Troca de cargo de Vendedor
```typescript
// Backend valida quota de vendedores
// Se passar de não-vendedor para vendedor, verifica quota
// Se passar de vendedor para não-vendedor, decrementa quota
```

### 10.2 Validações de Formulário

#### Validação de Email em Tempo Real
```typescript
const checkEmailExists = async (email: string) => {
  try {
    const response = await api.get(`/usuarios/check-email?email=${email}`);
    return response.exists;
  } catch {
    return false;
  }
};
```

#### Formatação de Telefone
```typescript
const formatTelefone = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};
```

---

## Fase 11: Testes de Integração

### 11.1 Cenários de Teste

#### Teste 1: Criar usuário completo
- Preencher todos os campos
- Selecionar cargo e equipe
- Verificar toast de sucesso
- Verificar aparece na lista

#### Teste 2: Criar usuário mínimo
- Apenas campos obrigatórios
- Verificar funciona sem telefone e equipe

#### Teste 3: Email duplicado
- Tentar criar com email existente
- Verificar erro claro

#### Teste 4: Editar usuário
- Mudar nome e cargo
- Verificar atualização na lista

#### Teste 5: Resetar senha
- Resetar senha de um usuário
- Tentar login com senha antiga (deve falhar)
- Login com nova senha e forçar mudança

#### Teste 6: Desativar usuário
- Desativar usuário
- Tentar login (deve falhar com "Usuário inativo")
- Reativar e tentar login

#### Teste 7: Excluir usuário
- Excluir usuário sem documentos
- Verificar soft delete (deletedAt preenchido)

#### Teste 8: Criar cargo personalizado
- Criar cargo "Atendente"
- Atribuir permissões básicas
- Criar usuário com esse cargo
- Verificar permissões funcionam

#### Teste 9: Gerenciar permissões
- Adicionar permissão a cargo existente
- Verificar usuário ganha acesso imediato
- Remover permissão
- Verificar usuário perde acesso

#### Teste 10: Excluir cargo com usuários
- Tentar excluir cargo que tem usuários
- Verificar erro apropriado
- Reatribuir usuários a outro cargo
- Conseguir excluir cargo vazio

---

## Fase 12: Otimizações e Performance

### 12.1 Otimizações de Query

#### Debounce no Search
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchTerm);
  }, 300);
  return () => clearTimeout(timer);
}, [searchTerm]);
```

#### Cache de Listas
```typescript
// TanStack Query já faz cache automático
// staleTime: 30000 = 30 segundos
// Listas não mudam com frequência
```

#### Invalidação Seletiva
```typescript
// Após criar usuário, invalida apenas lista de usuários
queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() });

// Após editar, invalida lista E detalhe específico
queryClient.invalidateQueries({ queryKey: usuariosKeys.lists() });
queryClient.invalidateQueries({ queryKey: usuariosKeys.detail(id) });
```

### 12.2 Lazy Loading de Componentes
```typescript
// Dialogs grandes só carregam quando abertos
const PermissoesDialog = dynamic(() => import('./permissoes-dialog'), {
  loading: () => <Skeleton />,
});
```

### 12.3 Paginação Eficiente
- Backend retorna apenas 20 registros por vez
- Total count para calcular páginas
- Offset/limit para navegação
- Cache de páginas visitadas

---

## Checklist de Implementação

### Backend (Já Existe)
- [x] APIs de usuários em `/apps/api/src/routes/usuarios/`
- [x] APIs de cargos em `/apps/api/src/routes/cargos/`
- [x] Schemas Drizzle para usuario, cargo, permissao
- [x] Sistema multi-tenant
- [x] Autenticação e autorização
- [x] Permissões em `cargos-padrao.ts`

### Frontend - Types
- [ ] Criar `/apps/web/src/types/usuario.ts`
- [ ] Criar `/apps/web/src/types/cargo.ts`
- [ ] Criar `/apps/web/src/types/permissao.ts`

### Frontend - Query Hooks
- [ ] Criar `/apps/web/src/lib/queries/cargos.ts`
- [ ] Criar `/apps/web/src/lib/queries/permissoes.ts`
- [ ] Verificar/complementar `/apps/web/src/lib/queries/usuarios.ts`

### Frontend - Componentes de Diálogos
- [ ] Criar `/apps/web/src/components/usuarios/usuario-dialog.tsx`
- [ ] Criar `/apps/web/src/components/usuarios/resetar-senha-dialog.tsx`
- [ ] Criar `/apps/web/src/components/usuarios/excluir-usuario-dialog.tsx`
- [ ] Criar `/apps/web/src/components/usuarios/visualizar-usuario-dialog.tsx`
- [ ] Criar `/apps/web/src/components/usuarios/cargo-dialog.tsx`
- [ ] Criar `/apps/web/src/components/usuarios/excluir-cargo-dialog.tsx`
- [ ] Criar `/apps/web/src/components/usuarios/permissoes-dialog.tsx`

### Frontend - Tabs
- [ ] Criar `/apps/web/src/components/usuarios/usuarios-tab.tsx`
- [ ] Criar `/apps/web/src/components/usuarios/cargos-tab.tsx`
- [ ] Criar `/apps/web/src/components/usuarios/equipes-tab.tsx`

### Frontend - Página Principal
- [ ] Criar `/apps/web/src/app/(app)/usuarios/page.tsx`

### Integração
- [ ] Adicionar item no sidebar (`/apps/web/src/components/layout/app-sidebar.tsx`)
- [ ] Testar permissões de acesso
- [ ] Testar todos os fluxos de usuário

### Testes
- [ ] Testar criação de usuário
- [ ] Testar edição de usuário
- [ ] Testar resetar senha
- [ ] Testar exclusão de usuário
- [ ] Testar criação de cargo
- [ ] Testar atribuição de permissões
- [ ] Testar exclusão de cargo
- [ ] Testar filtros e busca
- [ ] Testar paginação
- [ ] Testar edge cases

---

## Ordem de Implementação Recomendada

1. **Dia 1: Fundação**
   - Criar todos os types (usuario.ts, cargo.ts, permissao.ts)
   - Criar query hooks (usuarios.ts, cargos.ts, permissoes.ts)
   - Testar chamadas API

2. **Dia 2: Diálogos Base**
   - Criar usuario-dialog.tsx (criar/editar)
   - Criar cargo-dialog.tsx (criar/editar)
   - Criar excluir-usuario-dialog.tsx
   - Criar excluir-cargo-dialog.tsx

3. **Dia 3: Diálogos Avançados**
   - Criar permissoes-dialog.tsx (mais complexo)
   - Criar resetar-senha-dialog.tsx
   - Criar visualizar-usuario-dialog.tsx

4. **Dia 4: Tabs**
   - Criar usuarios-tab.tsx (com tabela, filtros, paginação)
   - Criar cargos-tab.tsx (com tabela e gestão)
   - Criar equipes-tab.tsx (placeholder)

5. **Dia 5: Integração**
   - Criar page.tsx principal
   - Adicionar ao sidebar
   - Testar navegação
   - Ajustar permissões

6. **Dia 6: Refinamento**
   - Testar todos os fluxos
   - Corrigir bugs
   - Melhorar UX
   - Adicionar loading states
   - Tratar edge cases

---

## Padrões de Código a Seguir

### 1. Naming Conventions
- Componentes: PascalCase (UsuarioDialog)
- Hooks: camelCase com 'use' prefix (useUsuarios)
- Types: PascalCase (Usuario, CreateUsuarioDTO)
- Arquivos: kebab-case (usuario-dialog.tsx)

### 2. Estrutura de Componente
```typescript
'use client'; // Se usa hooks

import { ... } from 'react';
import { ... } from 'external-libs';
import { ... } from '@/components/ui';
import { ... } from '@/lib';
import { ... } from '@/types';

// Types/Interfaces locais
interface Props { ... }

// Schema Zod
const schema = z.object({ ... });

// Component
export function ComponentName(props: Props) {
  // State
  const [state, setState] = useState();
  
  // Hooks customizados
  const { data } = useQuery();
  
  // Handlers
  const handleSubmit = async () => { ... };
  
  // JSX
  return ( ... );
}
```

### 3. Error Handling
```typescript
try {
  await mutation.mutateAsync(data);
  toast.success('Operação realizada com sucesso!');
  onSuccess?.();
} catch (error: any) {
  console.error('Erro:', error);
  if (error instanceof ApiError) {
    toast.error(error.message);
  } else {
    toast.error('Erro inesperado. Tente novamente.');
  }
}
```

### 4. Loading States
```typescript
{isLoading ? (
  <div className="py-12 text-center text-muted-foreground">
    Carregando...
  </div>
) : data.length === 0 ? (
  <EmptyState />
) : (
  <DataTable />
)}
```

---

## Observações Finais

### Pontos de Atenção
1. **Multi-tenancy**: Todas as requisições incluem `x-tenant-id` header
2. **Autenticação**: Token JWT em `Authorization` header
3. **Permissões**: Verificar tanto no frontend quanto backend
4. **Soft Delete**: Usuários e cargos não são deletados fisicamente
5. **Quotas**: Sistema valida limites de usuários e vendedores
6. **Cargo Admin**: Não pode ser editado ou excluído
7. **Primeiro Acesso**: Usuário deve trocar senha no primeiro login

### Melhorias Futuras
1. **Importação em massa**: Upload CSV de usuários
2. **Histórico de alterações**: Audit log de mudanças em usuários/cargos
3. **Gestão de equipes completa**: CRUD de equipes
4. **Hierarquia de gestores**: Árvore de gestão
5. **Notificações por email**: Enviar credenciais para novo usuário
6. **2FA**: Autenticação de dois fatores
7. **SSO**: Integração com provedores externos
8. **Relatórios**: Analytics de uso por usuário/cargo

---

## Dependências e Requisitos

### Pacotes NPM (já instalados)
- `@tanstack/react-query`: Data fetching
- `react-hook-form`: Formulários
- `zod`: Validação
- `@hookform/resolvers`: Integração RHF + Zod
- `sonner`: Toasts
- `lucide-react`: Ícones
- `shadcn/ui`: Componentes UI

### APIs Backend (já implementadas)
- `GET /api/usuarios`: Listar usuários
- `POST /api/usuarios`: Criar usuário
- `GET /api/usuarios/:id`: Buscar usuário
- `PATCH /api/usuarios/:id`: Atualizar usuário
- `DELETE /api/usuarios/:id`: Excluir usuário
- `POST /api/usuarios/:id/resetar-senha`: Resetar senha
- `GET /api/cargos`: Listar cargos
- `POST /api/cargos`: Criar cargo
- `GET /api/cargos/:id`: Buscar cargo com permissões
- `PATCH /api/cargos/:id`: Atualizar cargo
- `DELETE /api/cargos/:id`: Excluir cargo
- `POST /api/cargos/:id/permissoes`: Atribuir permissões
- `GET /api/cargos/permissoes/disponiveis`: Listar permissões

---

