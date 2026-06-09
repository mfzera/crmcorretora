# Plano: Renomear seguradoraId → corretoraId

## Contexto
O sistema é um SaaS para **corretoras** de seguros. A tabela `seguradora` representa o tenant (a corretora), mas o nome causa confusão pois "seguradora" são as parceiras (Porto Seguro, etc). 

A migration SQL `0011_rename_seguradora_to_corretora.sql` já existe e renomeia:
- Tabela: `seguradora` → `corretora`
- Coluna FK: `seguradora_id` → `corretora_id` (em 14 tabelas)

**Objetivo**: Atualizar todo o código TypeScript para refletir essa mudança.

---

## Escopo da Mudança

| Área | Arquivos | Mudança Principal |
|------|----------|-------------------|
| Database Schema | 15 arquivos | `seguradoraId` → `corretoraId`, imports |
| Backend Routes | 20 arquivos | `request.seguradoraId` → `request.corretoraId` |
| Backend Plugins | 3 arquivos | Injeção do tenant ID |
| Backend Utils | 2 arquivos | Parâmetros e queries |
| Frontend Types | 4 arquivos | Interfaces |
| Frontend Stores | 1 arquivo | Auth store |
| Frontend Queries | 2 arquivos | Response types |
| Frontend Components | 5 arquivos | Props e forms |
| Shared Types | 2 arquivos | Fastify types |

---

## Etapas de Implementação

### Fase 1: Database Schema (libs/shared/database)

#### 1.1 Renomear arquivo principal
- `libs/shared/database/src/schema/seguradora.ts` → `corretora.ts`
- Alterar: tabela `"seguradora"` → `"corretora"`
- Alterar: export `seguradoras` → `corretoras`
- Alterar: types `Seguradora` → `Corretora`, `NewSeguradora` → `NewCorretora`

#### 1.2 Atualizar schemas dependentes (14 arquivos)
Cada arquivo precisa:
- Trocar import: `import { seguradoras }` → `import { corretoras }`
- Trocar coluna: `seguradoraId: uuid('seguradora_id')` → `corretoraId: uuid('corretora_id')`
- Trocar índice: `idx_*_seguradora` → `idx_*_corretora`
- Trocar relation: `seguradoras` → `corretoras`

**Arquivos:**
- `usuario.ts`
- `cargo.ts`
- `equipe.ts`
- `cliente.ts`
- `produto.ts`
- `cotacao.ts`
- `proposta.ts`
- `documento-venda.ts`
- `endosso.ts`
- `renovacao.ts`
- `notificacao.ts`
- `chat.ts`
- `oportunidade.ts`
- `audit-log.ts`

#### 1.3 Atualizar index.ts
- `libs/shared/database/src/index.ts` - trocar export de `seguradora.js` → `corretora.js`

#### 1.4 Atualizar repositories
- `documento-venda.repository.ts`
- `cotacao.repository.ts`
- `renovacao.repository.ts`

#### 1.5 Atualizar services
- `notificacao.service.ts`

#### 1.6 Atualizar seed
- `seed-user.ts`

---

### Fase 2: Shared Types (libs/shared/types)

- `libs/shared/types/src/fastify.d.ts` - `seguradoraId` → `corretoraId`, `seguradora` → `corretora`

---

### Fase 3: Plugins (libs/plugins)

#### 3.1 Tenant Isolation (CRÍTICO)
- `libs/plugins/tenant-isolation/src/index.ts`
  - `request.seguradoraId` → `request.corretoraId`
  - `request.seguradora` → `request.corretora`
  - Imports e queries

#### 3.2 Auth Plugin
- `libs/plugins/auth/src/index.ts` - `seguradoraId` → `corretoraId`

#### 3.3 Chat Plugin
- `libs/plugins/chat/src/chat.service.ts`
- `libs/plugins/chat/src/index.ts`

#### 3.4 Outros plugins
- `libs/plugins/quota-validator/src/index.ts`
- `libs/plugins/error-handler/src/index.ts`
- `libs/plugins/authorization/src/types.d.ts`

---

### Fase 4: Backend Routes (apps/api/src/routes)

Todos os arquivos precisam trocar:
- `request.seguradoraId` → `request.corretoraId`
- `eq(*.seguradoraId, ...)` → `eq(*.corretoraId, ...)`
- Imports de `seguradoras` → `corretoras`

**Arquivos (20):**
- `auth/index.ts`
- `cargos/index.ts`
- `chat/index.ts`
- `clientes/index.ts`
- `cotacoes/index.ts`
- `dashboard/index.ts`
- `documentos-venda/index.ts`
- `endossos/index.ts`
- `gestao-crm/index.ts`
- `kpis/index.ts`
- `metricas/index.ts`
- `notificacoes/index.ts`
- `oportunidades/index.ts`
- `produtos/index.ts`
- `propostas/index.ts`
- `renovacoes/index.ts`
- `seguradora/index.ts` → renomear para `corretora/index.ts`
- `seguradoras-parceiras/index.ts`
- `usuarios/index.ts`
- `workspace/index.ts`

---

### Fase 5: Backend Utils (apps/api/src/utils)

- `oportunidade-automation.ts`
- `comissao-automation.ts`

---

### Fase 6: Frontend Types (apps/web/src/types)

- `produto.ts` - interface `Produto`
- `kanban.ts` - interface `Oportunidade`, DTOs
- `cliente.ts` - interface `Cliente`
- `notificacao.ts` - interface `Notificacao`

---

### Fase 7: Frontend Stores

- `stores/auth-store.ts` - interface `User`

---

### Fase 8: Frontend Queries

- `lib/queries/auth.ts` - `MeResponse`
- `lib/queries/chat.ts` - type `Canal`
- `lib/queries/cargos.ts`
- `lib/queries/gestao-crm.ts`

---

### Fase 9: Frontend Components

- `components/kanban/nova-oportunidade-dialog.tsx`
- `components/kanban/editar-oportunidade-dialog.tsx`
- `components/seguradoras-parceiras/seguradoras-list.tsx`
- `components/seguradoras-parceiras/excluir-seguradora-dialog.tsx`
- `components/seguradoras-parceiras/seguradora-dialog.tsx`
- `components/gestao-crm/nova-oportunidade-gestor-dialog.tsx`

---

### Fase 10: Frontend Pages

- `app/(auth)/login/page.tsx`
- `app/(app)/seguradoras-parceiras/page.tsx`

---

### Fase 11: Scripts e Docs

- `scripts/check-oportunidades.ts`
- `scripts/add-gestao-crm-permissions.ts`
- `apps/api/scripts/seed-renovacoes.ts`
- `apps/api/scripts/check-and-seed.mjs`
- `assign-admin-role.js`
- Atualizar `MIGRATION_SEGURADORA_TO_CORRETORA.md` com status completo

---

## Verificação

1. **Build**: `pnpm build` - deve compilar sem erros TypeScript
2. **Migration**: Executar `0011_rename_seguradora_to_corretora.sql` no banco
3. **API**: `pnpm dev` na API - deve iniciar sem erros
4. **Frontend**: `pnpm dev` no web - deve iniciar sem erros
5. **Teste manual**: Login e navegação básica funcionando
6. **Tenant isolation**: Verificar que dados continuam isolados por corretora

---

## Estratégia de Execução

Usar **find-and-replace** global com cuidado para:
1. `seguradoraId` → `corretoraId` (código TS)
2. `seguradora_id` → `corretora_id` (strings SQL em código)
3. `seguradoras` → `corretoras` (imports e referências à tabela)
4. `Seguradora` → `Corretora` (types)
5. `request.seguradora` → `request.corretora` (objeto completo)

**Arquivos a renomear:**
- `seguradora.ts` → `corretora.ts`
- `routes/seguradora/` → `routes/corretora/`
