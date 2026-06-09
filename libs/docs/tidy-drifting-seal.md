# Plano: Funcionalidade de Equipes com Lider

## Contexto
O sistema já possui a tabela `equipe` com `gestorId` (lider), e os usuários têm `equipeId`. A tab "Equipes" existe no frontend mas é um placeholder "em breve". Permissões `equipes:*` já estão nos templates de cargo. Falta a implementação completa: API routes, cargo template, e frontend funcional.

**Decisões de design:**
- Sem flag `isLider` no cargo — lider é identificado por `equipe.gestorId === user.id`
- Escopo automático: Admin vê/gerencia tudo; lider com `equipes:visualizar` vê só a sua equipe
- Apenas Admin pode criar equipes e definir lideres
- Cargo template "Lider de Equipe" com permissões intermediárias

---

## Arquivos Críticos

- `libs/shared/database/src/schema/equipe.ts` — schema da equipe (já existe, sem mudanças)
- `libs/shared/database/src/schema/relations.ts` — adicionar relação equipe → membros
- `libs/shared/utils/src/cargos-padrao.ts` — adicionar template "Lider de Equipe"
- `libs/plugins/authorization/src/index.ts` — adicionar `requireEquipeAccess()`
- `apps/api/src/routes/equipes/index.ts` — **novo** — rotas CRUD de equipes
- `apps/api/src/routes/index.ts` — registrar rota `/equipes`
- `libs/features/equipes/` — **novo** — feature lib com schemas Zod
- `apps/web/src/types/equipe.ts` — **novo** — tipos TypeScript frontend
- `apps/web/src/lib/queries/equipes.ts` — **novo** — React Query hooks
- `apps/web/src/components/usuarios/equipes-tab.tsx` — substituir placeholder
- Novos componentes: `equipe-dialog.tsx`, `equipe-detail-dialog.tsx`, `excluir-equipe-dialog.tsx`

---

## Etapas de Implementação

### 1. Adicionar relação membros no schema de equipes
**`libs/shared/database/src/schema/relations.ts`**
- Adicionar `membros: many(usuarios)` na relação de `equipes` apontando para `usuario.equipeId`
- Sem migração necessária (campo já existe no banco)

### 2. Adicionar template "Lider de Equipe"
**`libs/shared/utils/src/cargos-padrao.ts`**
- Novo template `LIDER` com `isGestor: false, isVendedor: true` (ou false), cor `#8b5cf6`
- Permissões (superset de Vendedor + scope de equipe):
  - Tudo do Vendedor (vendas próprias, clientes próprios, kanban, chat, performance)
  - `equipes:visualizar`, `equipes:editar`, `equipes:gerenciar_membros`
  - `metricas:visualizar_equipe`, `metricas:comparar_vendedores`
  - `vendas:visualizar_todas` (para ver vendas dos membros)
  - `kanban:visualizar_todas` (para ver oportunidades da equipe)
  - `usuarios:visualizar` (para ver membros da equipe)
- Adicionar `LIDER` ao `CARGO_TEMPLATE_KEYS`
- Incluir no `register-corretora` para criação automática junto com os outros cargos padrão

### 3. Helper de autorização de escopo
**`libs/plugins/authorization/src/index.ts`**
- Nova função `requireEquipeAccess(mode: 'view' | 'manage' | 'admin')`
  - `admin`: só `isAdmin`
  - `manage`: `isAdmin` ou (`equipes:gerenciar_membros` e é `gestorId` da equipe)
  - `view`: `isAdmin` ou `isGestor` ou (`equipes:visualizar` e é `gestorId` da equipe)
- Aceita `equipeId` via `request.params.id`
- Consulta `equipes` no banco para verificar `gestorId`

### 4. Feature lib Zod schemas
**`libs/features/equipes/src/schemas.ts`** (novo módulo)
```
createEquipeSchema: { nome, gestorId? }
updateEquipeSchema: { nome?, gestorId? }
listEquipesQuerySchema: { search?, ativo?, page?, limit? }
atribuirLiderSchema: { gestorId }
adicionarMembroSchema: { usuarioId }
```

### 5. API Routes `/equipes`
**`apps/api/src/routes/equipes/index.ts`** (novo arquivo)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/equipes/` | `isAdmin` | Criar equipe |
| `GET` | `/equipes/` | `equipes:visualizar` + escopo | Listar equipes |
| `GET` | `/equipes/:id` | `equipes:visualizar` + escopo | Detalhe com membros |
| `PATCH` | `/equipes/:id` | `isAdmin` | Editar nome/status |
| `DELETE` | `/equipes/:id` | `isAdmin` | Soft delete |
| `POST` | `/equipes/:id/atribuir-lider` | `isAdmin` | Definir lider |
| `POST` | `/equipes/:id/membros` | `requireEquipeAccess('manage')` | Adicionar membro |
| `DELETE` | `/equipes/:id/membros/:usuarioId` | `requireEquipeAccess('manage')` | Remover membro |

**Lógica de escopo no `GET /equipes/`:**
- `isAdmin` ou `isGestor` → todas as equipes da corretora
- Usuário com `equipes:visualizar` → apenas equipes onde `gestorId === user.sub`

**Ao remover membro:** setar `usuario.equipeId = null`
**Ao adicionar membro:** setar `usuario.equipeId = equipeId` (valida que o usuário é da mesma corretora)
**Soft delete de equipe:** setar `equipe.deletedAt`, setar `usuario.equipeId = null` para todos os membros, limpar `equipe.gestorId`

### 6. Registrar rota no app
**`apps/api/src/routes/index.ts`**
- Adicionar `fastify.register(equipeRoutes, { prefix: '/equipes' })`

### 7. Frontend — Tipos
**`apps/web/src/types/equipe.ts`** (novo)
```typescript
interface Equipe { id, nome, gestorId, gestor?, membros?, ativo, createdAt }
interface CreateEquipeDTO { nome, gestorId? }
interface UpdateEquipeDTO { nome?, gestorId?, ativo? }
```

### 8. Frontend — Query hooks
**`apps/web/src/lib/queries/equipes.ts`** (novo)
- `useEquipes(params?)` — lista paginada
- `useEquipe(id)` — detalhe com membros
- `useCreateEquipe()` — mutation
- `useUpdateEquipe()` — mutation
- `useDeleteEquipe()` — mutation
- `useAtribuirLider()` — mutation
- `useAdicionarMembro()` — mutation
- `useRemoverMembro()` — mutation

### 9. Frontend — Componentes

**`equipes-tab.tsx`** (substituir placeholder):
- Cards de equipe: nome, cor/avatar gerado, lider (nome + avatar), contagem de membros, status badge
- Botão "Nova Equipe" (visível só para admin)
- Filtro de busca e status
- Click no card abre `EquipeDetailDialog`

**`equipe-dialog.tsx`** (criar/editar):
- Campo: nome da equipe
- Select: lider (lista de usuários da corretora)
- Apenas admin vê este dialog

**`equipe-detail-dialog.tsx`** (detalhe + membros):
- Header: nome, lider, status
- Lista de membros com avatar, nome, cargo
- Botão "Adicionar Membro" → select de usuários sem equipe
- Botão "Remover" por membro (admin ou lider da equipe)
- Botão "Editar" abre `EquipeDialog` (só admin)

**`excluir-equipe-dialog.tsx`** (confirmação):
- Aviso que membros ficarão sem equipe

---

## Verificação / Testes

1. **Admin**: criar equipe → atribuir lider → adicionar membros → ver lista completa de equipes
2. **Lider**: logar com cargo "Lider de Equipe" e ser `gestorId` de uma equipe → só vê sua própria equipe na tab → pode adicionar/remover membros → não vê botão de criar equipe
3. **Vendedor**: não vê a tab "Equipes" (sem permissão `equipes:visualizar`)
4. **Gestor**: vê todas as equipes mas não pode criar/editar (sem `isAdmin`)
5. Soft delete de equipe → membros ficam com `equipeId = null`
6. Cargo template "Lider de Equipe" criado automaticamente no `register-corretora`
