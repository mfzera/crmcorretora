# Plano: Reestruturação do Sistema - De Seguradora para Corretora + Gestão de Seguradoras

## Contexto

O sistema atual foi projetado como um **SaaS multi-tenant para corretoras de seguros**, onde cada "seguradora" no código é na verdade uma **corretora** (tenant). Agora precisamos:

1. **Renomear a nomenclatura**: Trocar "seguradora" por "corretora" em todo o sistema
2. **Adicionar gestão de seguradoras**: Criar funcionalidade para que cada corretora gerencie as seguradoras parceiras com quem trabalha
3. **Relacionar produtos com seguradoras**: Produtos devem estar vinculados a uma seguradora específica
4. **Atualizar fluxos**: Cotações, renovações, documentos de venda devem exigir a seleção da seguradora

## Descobertas da Exploração

### Estrutura Atual Multi-Tenant
- **Campo central**: `seguradoraId` (UUID) em todas as tabelas principais
- **Isolamento**: Aplicado via `tenantIsolation` plugin no Fastify
- **152 ocorrências** de `request.seguradoraId` em 13 arquivos de rotas
- **61 arquivos** mencionam "seguradora"

### Tabelas que já possuem `seguradoraId`:
- ✅ `seguradoras` (tabela principal - será renomeada para "corretoras")
- ✅ `produtos` (com FK para seguradoras)
- ✅ `cotacoes` (com FK para seguradoras)
- ✅ `renovacoes_comerciais` (com FK para seguradoras)
- ✅ `documentos_venda` (com FK para seguradoras)
- ✅ `endossos` (com FK para seguradoras)
- ✅ `clientes` (com FK para seguradoras)
- ✅ `usuarios` (com FK para seguradoras)
- ✅ `cargos` (com FK para seguradoras)
- ✅ `equipes` (com FK para seguradoras)

## Decisões de Arquitetura

### 1. Nova Tabela "Seguradoras Parceiras"
```sql
CREATE TABLE seguradoras_parceiras (
  id UUID PRIMARY KEY,
  corretora_id UUID NOT NULL REFERENCES seguradoras(id), -- tenant isolation
  cnpj VARCHAR(18) NOT NULL,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  telefone VARCHAR(20),
  email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'ATIVA', -- ATIVA, INATIVA
  deleted_at TIMESTAMP, -- soft delete
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Relacionamento Produto ↔ Seguradora
- **One-to-One**: Cada produto pertence a UMA seguradora específica
- Adicionar `seguradora_parceira_id` na tabela `produtos`
- Exemplo: "Seguro Auto Premium" → "Porto Seguro"

### 3. Fluxos (Cotação/Renovação)
- **Herdado do produto**: Quando seleciona produto, seguradora é preenchida automaticamente
- Campo readonly no frontend, apenas informativo
- Validação no backend garante consistência

### 4. Scope da Renomeação
- **Frontend**: Renomear tudo para "Corretora"
- **Backend**: 
  - ✅ Renomear: Types, interfaces, comentários, documentação
  - ❌ NÃO renomear: Nomes de tabelas/colunas no banco (evitar migração complexa)
  - Manter `seguradoraId` no DB, mas usar `corretoraId` em types

### 5. Permissões
- Nova permissão: `config:gerenciar_seguradoras_parceiras`
- Apenas usuários com essa permissão podem criar/editar seguradoras parceiras

### 6. Ordem de Implementação
**Abordagem faseada** (mais segura):
1. Adicionar entidade seguradoras_parceiras
2. Vincular produtos às seguradoras
3. Atualizar fluxos (cotações, renovações)
4. Renomear terminologia no frontend
5. Renomear types/interfaces no backend

---

## Plano de Implementação

## FASE 1: Adicionar Entidade Seguradoras Parceiras

### 1.1 Database Schema (Backend)

**Arquivo**: `libs/shared/database/src/schema/seguradora-parceira.ts` (NOVO)
```typescript
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { seguradora } from './seguradora';

export const seguradoraParceira = pgTable('seguradoras_parceiras', {
  id: uuid('id').primaryKey().defaultRandom(),
  corretoraId: uuid('corretora_id').notNull().references(() => seguradora.id, { onDelete: 'cascade' }),
  cnpj: varchar('cnpj', { length: 18 }).notNull(),
  razaoSocial: varchar('razao_social', { length: 255 }).notNull(),
  nomeFantasia: varchar('nome_fantasia', { length: 255 }),
  telefone: varchar('telefone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('ATIVA'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const seguradoraParceiraRelations = relations(seguradoraParceira, ({ one, many }) => ({
  corretora: one(seguradora, {
    fields: [seguradoraParceira.corretoraId],
    references: [seguradora.id],
  }),
  produtos: many(produto),
}));
```

**Arquivo**: `libs/shared/database/migrations/XXXX_add_seguradoras_parceiras.sql` (NOVO)
```sql
CREATE TABLE seguradoras_parceiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretora_id UUID NOT NULL REFERENCES seguradoras(id) ON DELETE CASCADE,
  cnpj VARCHAR(18) NOT NULL,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  telefone VARCHAR(20),
  email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seguradoras_parceiras_corretora ON seguradoras_parceiras(corretora_id);
CREATE INDEX idx_seguradoras_parceiras_cnpj ON seguradoras_parceiras(cnpj);
CREATE INDEX idx_seguradoras_parceiras_status ON seguradoras_parceiras(status);
```

**Arquivo**: `libs/shared/database/src/schema/index.ts`
- Adicionar export: `export * from './seguradora-parceira'`

### 1.2 Validation Schemas (Backend)

**Arquivo**: `libs/features/seguradoras-parceiras/src/schemas.ts` (NOVO)
```typescript
import { z } from 'zod';

export const createSeguradoraParceiraSchema = z.object({
  cnpj: z.string().length(18, 'CNPJ deve ter 18 caracteres (com formatação)'),
  razaoSocial: z.string().min(1, 'Razão social é obrigatória').max(255),
  nomeFantasia: z.string().max(255).optional(),
  telefone: z.string().max(20).optional(),
  email: z.string().email('Email inválido').max(255).optional(),
  status: z.enum(['ATIVA', 'INATIVA']).default('ATIVA'),
});

export const updateSeguradoraParceiraSchema = createSeguradoraParceiraSchema.partial();

export const listSeguradorasParceiraQuerySchema = z.object({
  status: z.enum(['ATIVA', 'INATIVA', 'TODAS']).optional().default('ATIVA'),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
```

### 1.3 API Routes (Backend)

**Arquivo**: `apps/api/src/routes/seguradoras-parceiras/index.ts` (NOVO)
```typescript
import { FastifyPluginAsync } from 'fastify';
import { eq, and, or, like, isNull } from 'drizzle-orm';
import { seguradoraParceira } from '@ecotech/database/schema';
import {
  createSeguradoraParceiraSchema,
  updateSeguradoraParceiraSchema,
  listSeguradorasParceiraQuerySchema,
} from '@ecotech/features/seguradoras-parceiras/schemas';

const seguradorasParceiraRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /seguradoras-parceiras - Criar nova seguradora parceira
  fastify.post('/', {
    onRequest: [fastify.authenticate, fastify.tenantIsolation],
    schema: {
      body: createSeguradoraParceiraSchema,
    },
  }, async (request, reply) => {
    const corretoraId = request.seguradoraId; // tenant isolation
    const data = request.body;

    // Verificar permissão
    if (!request.user.permissoes.includes('config:gerenciar_seguradoras_parceiras')) {
      return reply.code(403).send({ message: 'Sem permissão para gerenciar seguradoras parceiras' });
    }

    // Verificar se CNPJ já existe para esta corretora
    const existing = await fastify.db
      .select()
      .from(seguradoraParceira)
      .where(
        and(
          eq(seguradoraParceira.corretoraId, corretoraId),
          eq(seguradoraParceira.cnpj, data.cnpj),
          isNull(seguradoraParceira.deletedAt)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return reply.code(409).send({ message: 'CNPJ já cadastrado' });
    }

    const [newSeguradora] = await fastify.db
      .insert(seguradoraParceira)
      .values({
        corretoraId,
        ...data,
      })
      .returning();

    return reply.code(201).send(newSeguradora);
  });

  // GET /seguradoras-parceiras - Listar seguradoras parceiras
  fastify.get('/', {
    onRequest: [fastify.authenticate, fastify.tenantIsolation],
    schema: {
      querystring: listSeguradorasParceiraQuerySchema,
    },
  }, async (request, reply) => {
    const corretoraId = request.seguradoraId;
    const { status, search, page, limit } = request.query;

    const conditions = [eq(seguradoraParceira.corretoraId, corretoraId)];

    // Filtrar por status
    if (status !== 'TODAS') {
      conditions.push(eq(seguradoraParceira.status, status));
    }

    // Soft delete
    conditions.push(isNull(seguradoraParceira.deletedAt));

    // Busca por texto
    if (search) {
      conditions.push(
        or(
          like(seguradoraParceira.razaoSocial, `%${search}%`),
          like(seguradoraParceira.nomeFantasia, `%${search}%`),
          like(seguradoraParceira.cnpj, `%${search}%`)
        )
      );
    }

    const offset = (page - 1) * limit;

    const [data, countResult] = await Promise.all([
      fastify.db
        .select()
        .from(seguradoraParceira)
        .where(and(...conditions))
        .orderBy(seguradoraParceira.razaoSocial)
        .limit(limit)
        .offset(offset),
      fastify.db
        .select({ count: count() })
        .from(seguradoraParceira)
        .where(and(...conditions)),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total: countResult[0]?.count ?? 0,
        totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
      },
    };
  });

  // GET /seguradoras-parceiras/:id - Buscar por ID
  fastify.get('/:id', {
    onRequest: [fastify.authenticate, fastify.tenantIsolation],
  }, async (request, reply) => {
    const { id } = request.params;
    const corretoraId = request.seguradoraId;

    const [seguradora] = await fastify.db
      .select()
      .from(seguradoraParceira)
      .where(
        and(
          eq(seguradoraParceira.id, id),
          eq(seguradoraParceira.corretoraId, corretoraId),
          isNull(seguradoraParceira.deletedAt)
        )
      )
      .limit(1);

    if (!seguradora) {
      return reply.code(404).send({ message: 'Seguradora parceira não encontrada' });
    }

    return seguradora;
  });

  // PATCH /seguradoras-parceiras/:id - Atualizar
  fastify.patch('/:id', {
    onRequest: [fastify.authenticate, fastify.tenantIsolation],
    schema: {
      body: updateSeguradoraParceiraSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const corretoraId = request.seguradoraId;
    const data = request.body;

    // Verificar permissão
    if (!request.user.permissoes.includes('config:gerenciar_seguradoras_parceiras')) {
      return reply.code(403).send({ message: 'Sem permissão para gerenciar seguradoras parceiras' });
    }

    const [updated] = await fastify.db
      .update(seguradoraParceira)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(seguradoraParceira.id, id),
          eq(seguradoraParceira.corretoraId, corretoraId),
          isNull(seguradoraParceira.deletedAt)
        )
      )
      .returning();

    if (!updated) {
      return reply.code(404).send({ message: 'Seguradora parceira não encontrada' });
    }

    return updated;
  });

  // DELETE /seguradoras-parceiras/:id - Soft delete
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, fastify.tenantIsolation],
  }, async (request, reply) => {
    const { id } = request.params;
    const corretoraId = request.seguradoraId;

    // Verificar permissão
    if (!request.user.permissoes.includes('config:gerenciar_seguradoras_parceiras')) {
      return reply.code(403).send({ message: 'Sem permissão para gerenciar seguradoras parceiras' });
    }

    // Verificar se há produtos vinculados
    const produtosVinculados = await fastify.db
      .select({ count: count() })
      .from(produto)
      .where(
        and(
          eq(produto.seguradoraParceiraId, id),
          isNull(produto.deletedAt)
        )
      );

    if (produtosVinculados[0]?.count > 0) {
      return reply.code(409).send({
        message: 'Não é possível excluir seguradora com produtos vinculados',
      });
    }

    const [deleted] = await fastify.db
      .update(seguradoraParceira)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(seguradoraParceira.id, id),
          eq(seguradoraParceira.corretoraId, corretoraId),
          isNull(seguradoraParceira.deletedAt)
        )
      )
      .returning();

    if (!deleted) {
      return reply.code(404).send({ message: 'Seguradora parceira não encontrada' });
    }

    return reply.code(204).send();
  });
};

export default seguradorasParceiraRoutes;
```

**Arquivo**: `apps/api/src/routes/index.ts`
- Adicionar rota: `fastify.register(seguradorasParceiraRoutes, { prefix: '/seguradoras-parceiras' });`

### 1.4 Permissões

**Arquivo**: `libs/shared/utils/src/permissoes-padrao.ts`
- Adicionar nova permissão: `'config:gerenciar_seguradoras_parceiras'` ao array de permissões de ADMIN e GESTOR

### 1.5 Types (Frontend)

**Arquivo**: `apps/web/src/types/seguradora-parceira.ts` (NOVO)
```typescript
export interface SeguradoraParceira {
  id: string;
  corretoraId: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  telefone: string | null;
  email: string | null;
  status: 'ATIVA' | 'INATIVA';
  createdAt: string;
  updatedAt: string;
}

export interface CreateSeguradoraParceiraDTO {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  telefone?: string;
  email?: string;
  status?: 'ATIVA' | 'INATIVA';
}

export interface UpdateSeguradoraParceiraDTO extends Partial<CreateSeguradoraParceiraDTO> {}

export interface ListSeguradorasParceiraParams {
  status?: 'ATIVA' | 'INATIVA' | 'TODAS';
  search?: string;
  page?: number;
  limit?: number;
}
```

### 1.6 API Client (Frontend)

**Arquivo**: `apps/web/src/lib/api/seguradoras-parceiras.ts` (NOVO)
```typescript
import { api } from './client';
import type {
  SeguradoraParceira,
  CreateSeguradoraParceiraDTO,
  UpdateSeguradoraParceiraDTO,
  ListSeguradorasParceiraParams,
} from '@/types/seguradora-parceira';

export async function listSeguradorasParceiras(params?: ListSeguradorasParceiraParams) {
  const response = await api.get<{
    data: SeguradoraParceira[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>('/seguradoras-parceiras', { params });
  return response.data;
}

export async function getSeguradoraParceira(id: string) {
  const response = await api.get<SeguradoraParceira>(`/seguradoras-parceiras/${id}`);
  return response.data;
}

export async function createSeguradoraParceira(data: CreateSeguradoraParceiraDTO) {
  const response = await api.post<SeguradoraParceira>('/seguradoras-parceiras', data);
  return response.data;
}

export async function updateSeguradoraParceira(id: string, data: UpdateSeguradoraParceiraDTO) {
  const response = await api.patch<SeguradoraParceira>(`/seguradoras-parceiras/${id}`, data);
  return response.data;
}

export async function deleteSeguradoraParceira(id: string) {
  await api.delete(`/seguradoras-parceiras/${id}`);
}
```

### 1.7 React Query Hooks (Frontend)

**Arquivo**: `apps/web/src/lib/queries/seguradoras-parceiras.ts` (NOVO)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSeguradorasParceiras,
  getSeguradoraParceira,
  createSeguradoraParceira,
  updateSeguradoraParceira,
  deleteSeguradoraParceira,
} from '@/lib/api/seguradoras-parceiras';
import type {
  ListSeguradorasParceiraParams,
  CreateSeguradoraParceiraDTO,
  UpdateSeguradoraParceiraDTO,
} from '@/types/seguradora-parceira';

export function useSeguradorasParceiras(params?: ListSeguradorasParceiraParams) {
  return useQuery({
    queryKey: ['seguradoras-parceiras', params],
    queryFn: () => listSeguradorasParceiras(params),
  });
}

export function useSeguradoraParceira(id: string) {
  return useQuery({
    queryKey: ['seguradoras-parceiras', id],
    queryFn: () => getSeguradoraParceira(id),
    enabled: !!id,
  });
}

export function useCreateSeguradoraParceira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSeguradoraParceira,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguradoras-parceiras'] });
    },
  });
}

export function useUpdateSeguradoraParceira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSeguradoraParceiraDTO }) =>
      updateSeguradoraParceira(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguradoras-parceiras'] });
    },
  });
}

export function useDeleteSeguradoraParceira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSeguradoraParceira,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguradoras-parceiras'] });
    },
  });
}
```

---

## FASE 2: Interface de Gestão de Seguradoras Parceiras (Frontend)

### 2.1 Página Principal

**Arquivo**: `apps/web/src/app/(app)/seguradoras-parceiras/page.tsx` (NOVO)
```typescript
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSeguradorasParceiras } from '@/lib/queries/seguradoras-parceiras';
import { SeguradorasParceiraTable } from '@/components/seguradoras-parceiras/table';
import { SeguradoraParceiraDialog } from '@/components/seguradoras-parceiras/dialog';

export default function SeguradorasParceiraPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useSeguradorasParceiras({ status: 'ATIVA' });

  return (
    <div className="flex-1 space-y-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Seguradoras Parceiras
        </h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Nova Seguradora
        </Button>
      </div>

      <SeguradorasParceiraTable data={data?.data ?? []} isLoading={isLoading} />

      <SeguradoraParceiraDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
```

### 2.2 Componentes

**Arquivo**: `apps/web/src/components/seguradoras-parceiras/table.tsx` (NOVO)
- DataTable com colunas: CNPJ, Razão Social, Nome Fantasia, Status, Ações
- Ações: Editar, Excluir
- Filtros: Status (ATIVA/INATIVA), Busca por texto

**Arquivo**: `apps/web/src/components/seguradoras-parceiras/dialog.tsx` (NOVO)
- Dialog para criar/editar seguradora parceira
- Campos: CNPJ (com máscara), Razão Social, Nome Fantasia, Telefone, Email, Status
- Validação com Zod

**Arquivo**: `apps/web/src/components/seguradoras-parceiras/delete-dialog.tsx` (NOVO)
- AlertDialog para confirmar exclusão

### 2.3 Adicionar ao Menu Lateral

**Arquivo**: `apps/web/src/components/layout/app-sidebar.tsx`
- Adicionar item no menu: "Seguradoras" com ícone Shield
- Posicionar na seção de Configurações
- Mostrar apenas para usuários com permissão `config:gerenciar_seguradoras_parceiras`

---

## FASE 3: Vincular Produtos às Seguradoras

### 3.1 Database Migration

**Arquivo**: `libs/shared/database/migrations/XXXX_add_seguradora_parceira_to_produtos.sql` (NOVO)
```sql
-- Adicionar coluna
ALTER TABLE produtos
ADD COLUMN seguradora_parceira_id UUID REFERENCES seguradoras_parceiras(id) ON DELETE RESTRICT;

-- Criar índice
CREATE INDEX idx_produtos_seguradora_parceira ON produtos(seguradora_parceira_id);

-- Nota: Produtos existentes terão NULL inicialmente
-- Será necessário atualizar manualmente após popular seguradoras_parceiras
```

### 3.2 Schema Update

**Arquivo**: `libs/shared/database/src/schema/produto.ts`
```typescript
// Adicionar campo
seguradoraParceiraId: uuid('seguradora_parceira_id').references(() => seguradoraParceira.id, {
  onDelete: 'restrict',
}),

// Adicionar relation
seguradoraParceira: one(seguradoraParceira, {
  fields: [produto.seguradoraParceiraId],
  references: [seguradoraParceira.id],
}),
```

### 3.3 Validation Schema Update

**Arquivo**: `libs/features/produtos/src/schemas.ts`
```typescript
// Adicionar ao createProdutoSchema
seguradoraParceiraId: z.string().uuid('ID de seguradora parceira inválido').optional(),
```

### 3.4 Frontend Type Update

**Arquivo**: `apps/web/src/types/produto.ts`
```typescript
// Adicionar campo
seguradoraParceiraId?: string | null;
seguradoraParceira?: {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
} | null;
```

### 3.5 Formulário de Produto

**Arquivo**: `apps/web/src/components/produtos/produto-dialog.tsx`
```typescript
// Adicionar campo Select para Seguradora Parceira
<div className="space-y-2">
  <Label htmlFor="seguradoraParceiraId">Seguradora</Label>
  <Select
    value={form.watch('seguradoraParceiraId')}
    onValueChange={(value) => form.setValue('seguradoraParceiraId', value)}
  >
    <SelectTrigger className="h-9">
      <SelectValue placeholder="Selecione a seguradora" />
    </SelectTrigger>
    <SelectContent>
      {seguradoras?.data.map((seg) => (
        <SelectItem key={seg.id} value={seg.id}>
          {seg.nomeFantasia || seg.razaoSocial}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### 3.6 Visualização de Produto

**Arquivo**: `apps/web/src/components/produtos/produto-details.tsx`
- Adicionar exibição da Seguradora Parceira (nome fantasia ou razão social)
- Ícone Shield

---

## FASE 4: Atualizar Fluxos (Cotações, Renovações, Documentos)

### 4.1 Backend - Incluir Seguradora nos Endpoints

**Arquivo**: `apps/api/src/routes/cotacoes/index.ts`
```typescript
// No GET /cotacoes/:id, incluir join com seguradora_parceira via produto
const cotacao = await fastify.db
  .select({
    ...cotacoes,
    produto: {
      ...produtos,
      seguradoraParceira: seguradoraParceira,
    },
  })
  .from(cotacoes)
  .leftJoin(produtos, eq(cotacoes.produtoId, produtos.id))
  .leftJoin(seguradoraParceira, eq(produtos.seguradoraParceiraId, seguradoraParceira.id))
  .where(and(
    eq(cotacoes.id, id),
    eq(cotacoes.seguradoraId, corretoraId)
  ))
  .limit(1);
```

**Arquivo**: `apps/api/src/routes/renovacoes/index.ts`
- Mesma lógica: incluir seguradora_parceira via join com produto

**Arquivo**: `apps/api/src/routes/documentos-venda/index.ts`
- Mesma lógica: incluir seguradora_parceira via join com produto

### 4.2 Frontend - Exibir Seguradora

**Arquivo**: `apps/web/src/components/area-trabalho/cotacao-dialog.tsx`
```typescript
// Adicionar campo readonly exibindo a seguradora
{cotacao.produto?.seguradoraParceira && (
  <div className="space-y-2">
    <Label>Seguradora</Label>
    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
      <Shield className="size-4 text-primary" />
      <span className="text-sm">
        {cotacao.produto.seguradoraParceira.nomeFantasia ||
         cotacao.produto.seguradoraParceira.razaoSocial}
      </span>
    </div>
  </div>
)}
```

**Arquivo**: `apps/web/src/components/area-trabalho/renovacoes-pendentes-card.tsx`
- Já foi implementado na refatoração anterior, apenas garantir que está mostrando

**Arquivo**: `apps/web/src/components/documentos-venda/documento-dialog.tsx`
- Adicionar campo readonly similar ao cotacao-dialog

---

## FASE 5: Renomear Terminologia no Frontend

### 5.1 Textos da Interface

**Arquivos a atualizar** (buscar "seguradora" e substituir por "corretora" onde se refere ao tenant):
- `apps/web/src/app/(app)/workspace/page.tsx`
- `apps/web/src/app/(app)/cadastro/page.tsx`
- `apps/web/src/components/layout/app-sidebar.tsx`
- `apps/web/src/components/clientes/*.tsx`
- `apps/web/src/components/usuarios/*.tsx`
- Todos os textos exibidos ao usuário

**Exemplos de mudança**:
- "Minha Seguradora" → "Minha Corretora"
- "Dados da Seguradora" → "Dados da Corretora"
- "Seguradora não encontrada" → "Corretora não encontrada"

### 5.2 Manter "Seguradora" onde se refere à parceira

**NÃO alterar** em contextos onde se refere à seguradora parceira:
- `apps/web/src/components/seguradoras-parceiras/*` (novo contexto)
- Campos que exibem a seguradora do produto
- Documentação que fala sobre seguradoras parceiras

---

## FASE 6: Renomear Types/Interfaces no Backend

### 6.1 Type Aliases

**Arquivo**: `libs/shared/database/src/schema/index.ts` (ou novo arquivo de aliases)
```typescript
// Criar aliases para tornar o código mais semântico
export { seguradora as corretora } from './seguradora';
export type { Seguradora as Corretora } from './seguradora';

// Manter export original para compatibilidade
export * from './seguradora';
```

### 6.2 Comentários e Documentação

**Arquivos backend** (adicionar comentários explicativos):
```typescript
// No topo de arquivos que usam seguradoraId
/**
 * NOTA: No código, 'seguradoraId' refere-se ao ID da CORRETORA (tenant).
 * As seguradoras parceiras (empresas de seguro) estão em 'seguradoras_parceiras'.
 */
```

### 6.3 Novos Arquivos

Criar novos arquivos com nomenclatura correta para futuras features:
- Usar `corretoraId` em novos types TypeScript
- Manter queries do banco usando `seguradoraId` (nome da coluna real)
- Fazer mapping na camada de serviço

---

## Estratégia de Migração de Dados

### Cenário 1: Sistema Novo (Sem Dados)
1. Rodar migrations na ordem
2. Popular seguradoras_parceiras manualmente
3. Associar produtos às seguradoras

### Cenário 2: Sistema com Dados Existentes
1. Rodar migration de seguradoras_parceiras
2. **Script de Migração**: Popular seguradoras_parceiras com dados padrão
3. Rodar migration add_seguradora_parceira_to_produtos
4. **Script de Associação**: Atualizar produtos existentes
   - Pode ser manual via interface
   - Ou via script SQL se houver padrão

**Arquivo**: `libs/shared/database/migrations/XXXX_seed_seguradoras_parceiras.sql` (OPCIONAL)
```sql
-- Exemplo: Popular com seguradoras comuns do mercado brasileiro
INSERT INTO seguradoras_parceiras (corretora_id, cnpj, razao_social, nome_fantasia, status)
SELECT 
  id as corretora_id,
  '00.000.000/0000-00' as cnpj, -- CNPJ placeholder
  'Porto Seguro S.A.' as razao_social,
  'Porto Seguro' as nome_fantasia,
  'ATIVA' as status
FROM seguradoras
WHERE NOT EXISTS (
  SELECT 1 FROM seguradoras_parceiras WHERE razao_social = 'Porto Seguro S.A.'
);

-- Repetir para outras seguradoras comuns...
```

---

## Testes

### Backend
1. **Unit tests**: Schemas de validação (Zod)
2. **Integration tests**: 
   - CRUD de seguradoras_parceiras
   - Vincular produto a seguradora
   - Listar cotações com seguradora do produto
   - Tenant isolation

### Frontend
1. **Component tests**: 
   - SeguradoraParceiraDialog
   - SeguradorasParceiraTable
2. **E2E tests**:
   - Fluxo completo: Criar seguradora → Criar produto → Criar cotação
   - Verificar exibição da seguradora em cotações/renovações

---

## Rollback Plan

### Se houver problemas após deploy:

1. **Fase 1-2 (Seguradoras Parceiras)**: 
   - Remover rotas do backend
   - Remover páginas do frontend
   - Manter migration (dados não afetam sistema existente)

2. **Fase 3 (Produtos vinculados)**:
   - Reverter migration: `ALTER TABLE produtos DROP COLUMN seguradora_parceira_id;`
   - Deploy código anterior

3. **Fase 4-6 (Renomeações)**:
   - Deploy código anterior (sem breaking changes no DB)
   - Apenas textos voltam ao estado original

---

## Arquivos Críticos

### Backend
- `libs/shared/database/src/schema/seguradora-parceira.ts` (NOVO)
- `libs/features/seguradoras-parceiras/src/schemas.ts` (NOVO)
- `apps/api/src/routes/seguradoras-parceiras/index.ts` (NOVO)
- `libs/shared/database/src/schema/produto.ts` (MODIFICAR)
- `libs/shared/utils/src/permissoes-padrao.ts` (MODIFICAR)

### Frontend
- `apps/web/src/app/(app)/seguradoras-parceiras/page.tsx` (NOVO)
- `apps/web/src/components/seguradoras-parceiras/` (NOVO - múltiplos arquivos)
- `apps/web/src/types/seguradora-parceira.ts` (NOVO)
- `apps/web/src/lib/api/seguradoras-parceiras.ts` (NOVO)
- `apps/web/src/lib/queries/seguradoras-parceiras.ts` (NOVO)
- `apps/web/src/components/layout/app-sidebar.tsx` (MODIFICAR)
- `apps/web/src/components/produtos/produto-dialog.tsx` (MODIFICAR)
- `apps/web/src/components/area-trabalho/cotacao-dialog.tsx` (MODIFICAR)

### Migrations
- `XXXX_add_seguradoras_parceiras.sql` (NOVO)
- `XXXX_add_seguradora_parceira_to_produtos.sql` (NOVO)
- `XXXX_seed_seguradoras_parceiras.sql` (NOVO - OPCIONAL)

---

## Estimativa de Esforço

- **Fase 1**: 4-6 horas (Backend seguradoras_parceiras)
- **Fase 2**: 6-8 horas (Frontend CRUD seguradoras_parceiras)
- **Fase 3**: 2-3 horas (Vincular produtos)
- **Fase 4**: 3-4 horas (Atualizar fluxos)
- **Fase 5**: 2-3 horas (Renomear frontend)
- **Fase 6**: 1-2 horas (Renomear backend types)

**Total estimado**: 18-26 horas de desenvolvimento
