# Module-Based Migration — Plano de Execução

Referência: https://medium.com/@alyssonbarrera.s/module-based-code-organization-48091ee917b0

---

## Contexto do projeto

Monorepo Nx com:
- `apps/api` — Fastify (rotas com lógica de negócio embutida, ~1800–2800 linhas por route)
- `apps/web` — Next.js App Router
- `apps/worker` — BullMQ jobs (detect-renewals, notify, backup)
- `libs/features/<mod>` — Hoje só contêm schemas Zod; `lib.ts` são stubs vazios
- `libs/shared/` — database (Drizzle), domain (serviços), storage (R2), utils, types, ui
- `libs/plugins/` — Plugins Fastify já bem estruturados (referência de padrão)

---

## Estrutura alvo por módulo

### Backend — `libs/features/<module>/src/`
```
schemas.ts                   ← já existe (Zod validators)
repositories/
  <module>.repository.ts     ← queries Drizzle (extrair das routes)
services/
  <module>.service.ts        ← regras de negócio (extrair das routes)
index.ts                     ← re-export público
```
`apps/api/src/routes/<module>/index.ts` vira um handler HTTP fino:
parse request → chama service → formata response.

### Frontend — `apps/web/src/modules/<module>/`
```
components/     ← de components/<module>/
http/           ← de lib/queries/<module>.ts
hooks/          ← hooks específicos do módulo
validations/    ← schemas Zod para forms (client-side)
index.ts        ← re-export público
```

### Regras para cada fase
1. **Um módulo por PR** — facilita review e rollback
2. **Backend antes do frontend** — API estabiliza antes de mexer no cliente
3. **Path aliases** — nunca usar paths relativos longos, sempre `@/modules/x`
4. **`libs/features/<mod>/index.ts`** — só exporta interface pública; repositórios são internos
5. **Não duplicar lógica** — se já existe em `libs/shared/domain`, mover (não copiar)

---

## ✅ FASE 0 — Infraestrutura frontend (CONCLUÍDA)

### O que foi feito

Criada nova estrutura em `apps/web/src/`:

```
core/
  ui/          ← movido de components/ui/ (45 arquivos)
  components/  ← movido de components/shared/
  hooks/       ← movido de hooks/
infra/
  http/        ← api.ts, admin-api.ts, portal-api.ts, treinamentos-api.ts, admin-auth.ts
  stores/      ← auth-store.ts, portal-auth-store.ts
  providers/   ← index.tsx, query-provider.tsx, theme-provider.tsx
modules/       ← diretório criado (vazio, pronto para as fases seguintes)
```

### Imports atualizados (bulk sed + dynamic imports)

| De | Para |
|----|------|
| `@/components/ui/*` | `@/core/ui/*` |
| `@/components/shared` | `@/core/components` |
| `@/hooks/*` | `@/core/hooks/*` |
| `@/lib/api` | `@/infra/http/api` |
| `@/lib/admin-api` | `@/infra/http/admin-api` |
| `@/lib/portal-api` | `@/infra/http/portal-api` |
| `@/lib/treinamentos-api` | `@/infra/http/treinamentos-api` |
| `@/lib/admin-auth` | `@/infra/http/admin-auth` |
| `@/stores/*` | `@/infra/stores/*` |
| `@/providers` / `@/providers/*` | `@/infra/providers` / `@/infra/providers/*` |

### tsconfig.json atualizado

Adicionados path aliases explícitos:
```json
"@/core/*": ["src/core/*"],
"@/infra/*": ["src/infra/*"],
"@/modules/*": ["src/modules/*"]
```

### O que permanece em `apps/web/src/lib/`

Esses arquivos **não foram movidos** — serão migrados nas fases seguintes:
- `lib/queries/` — React Query hooks por feature (migrar para `modules/<mod>/http/`)
- `lib/validators/` — `documento.ts` (CPF, CNPJ, formatadores)
- `lib/utils/` — utilitários gerais
- `lib/hooks/` — `use-documento-lock.ts`
- `lib/constants/`, `lib/utils.ts`, `lib/handle-api-error.ts`, `lib/avatar-cache.ts`

**Build:** ✅ `npx nx build web` passa sem erros após a fase 0.

---

## FASE 1 — Módulos independentes (sem deps de negócio)

**Módulos:** `produtos` · `cargos` · `seguradoras-parceiras` · `seguradora`

Esses módulos não dependem de nenhum outro módulo de negócio — ótimos para piloto.

### Backend (para cada módulo)

1. Criar `libs/features/<mod>/src/repositories/<mod>.repository.ts`
   - Extrair todas as queries Drizzle de `apps/api/src/routes/<mod>/index.ts`
   - Recebe `db: DrizzleClient` como dependência (injetar, não importar direto)
2. Criar `libs/features/<mod>/src/services/<mod>.service.ts`
   - Extrair lógica de negócio dos handlers
   - Recebe o repositório como dependência
3. Refatorar `apps/api/src/routes/<mod>/index.ts`
   - Importa service do lib, trata apenas HTTP (parse → call → respond)
4. Atualizar `libs/features/<mod>/src/index.ts` com exports públicos

### Frontend (para cada módulo)

1. Criar `apps/web/src/modules/<mod>/`
2. Mover `apps/web/src/components/<mod>/` → `apps/web/src/modules/<mod>/components/`
3. Mover `apps/web/src/lib/queries/<mod>.ts` → `apps/web/src/modules/<mod>/http/index.ts`
4. Criar `apps/web/src/modules/<mod>/index.ts` com re-exports
5. Atualizar imports nas pages `apps/web/src/app/(app)/<mod>/page.tsx`

### Arquivos envolvidos

| Módulo | Route API | Queries Web | Components Web |
|--------|-----------|-------------|----------------|
| `produtos` | `apps/api/src/routes/produtos/index.ts` | `lib/queries/produtos.ts` | `components/produtos/` |
| `cargos` | `apps/api/src/routes/cargos/index.ts` + `schemas.ts` | `lib/queries/cargos.ts` | `components/configuracoes/` (cargos) |
| `seguradoras-parceiras` | `apps/api/src/routes/seguradoras-parceiras/index.ts` | `lib/queries/seguradoras-parceiras.ts` | `components/seguradoras-parceiras/` |
| `seguradora` | `apps/api/src/routes/seguradora/index.ts` | `lib/queries/corretoras.ts` (parcial) | — |

---

## FASE 2 — Usuários e equipes

**Módulos:** `usuarios` · `equipes`

Fazer `usuarios` antes — `equipes` depende dele.

### Atenção
- `usuarios` tem upload de avatar (integra com `libs/shared/storage`)
- `equipes` tem relações com `usuarios` — o repositório de equipes pode chamar o de usuários

### Arquivos envolvidos

| Módulo | Route API | Queries Web | Components Web |
|--------|-----------|-------------|----------------|
| `usuarios` | `apps/api/src/routes/usuarios/index.ts` + `schemas.ts` | `lib/queries/usuarios.ts`, `lib/queries/permissoes.ts` | `components/usuarios/` |
| `equipes` | `apps/api/src/routes/equipes/index.ts` | `lib/queries/equipes.ts` | — |

---

## FASE 3 — Clientes

**Módulo:** `clientes`

### Atenção
- Dialogs grandes: `novo-cliente-dialog.tsx` (~33KB), `editar-cliente-dialog.tsx` (~23KB)
- Validação de CPF/CNPJ está em `lib/validators/documento.ts` — mover para `modules/clientes/validations/`
- Tem `transferir-carteira` — considerar criar `modules/clientes/services/transferir.ts`
- Busca de CEP usa a API route `/api/cep/[cep]` — manter como está

### Arquivos envolvidos

| | Caminho |
|-|---------|
| Route API | `apps/api/src/routes/clientes/index.ts` + `schemas.ts` |
| Queries Web | `lib/queries/clientes.ts` |
| Components Web | `components/clientes/` (5 arquivos) |
| Validators | `lib/validators/documento.ts` |

---

## FASE 4 — Cotações e propostas

**Módulos:** `cotacoes` · `propostas`

Fazer nessa ordem: `cotacoes` primeiro.

### Atenção — `cotacoes`
- Route tem 1818 linhas — a lógica de comissão é a mais complexa
- Extrair `comissao.service.ts` dentro do módulo (cálculo de splits)
- Anexos de cotação integram com `libs/shared/storage` — o service chama o storage, não duplicar
- `libs/features/cotacoes/src/schemas.ts` já existe com os schemas principais

### Atenção — `propostas`
- Depende de `cotacoes` — fazer depois
- Tem anexos, similar a cotações

### Arquivos envolvidos

| Módulo | Route API | Queries Web | Components Web |
|--------|-----------|-------------|----------------|
| `cotacoes` | `apps/api/src/routes/cotacoes/index.ts` + `anexos.ts` + `schemas.ts` | `lib/queries/documentos-venda.ts` (parcial) | `components/cotacoes/` (3 arquivos) |
| `propostas` | `apps/api/src/routes/propostas/index.ts` + `schemas.ts` | — | — |

---

## FASE 5 — Documentos de venda e endossos

**Módulos:** `documentos-venda` · `endossos`

Fazer `documentos-venda` antes — `endossos` depende dele.

### Atenção
- `documentos-venda` tem geração de PDF + upload R2
  - Lógica de PDF fica em `libs/shared/storage` (já existe `pdf-extractor.ts`)
  - O service do módulo apenas orquestra
- `libs/features/documentos-venda/src/schemas.ts` já existe

### Arquivos envolvidos

| Módulo | Route API | Queries Web | Components Web |
|--------|-----------|-------------|----------------|
| `documentos-venda` | `apps/api/src/routes/documentos-venda/index.ts` + `anexos.ts` + `schemas.ts` | `lib/queries/documentos-venda.ts` | `components/documentos-venda/` |
| `endossos` | `apps/api/src/routes/endossos/index.ts` | — | — |

---

## FASE 6 — Renovações (mais complexo)

**Módulo:** `renovacoes`

### Atenção
- Route tem ~2800 linhas
- `libs/shared/domain/src/services/renovacao.service.ts` já existe — **mover** para `libs/features/renovacoes/src/services/`, não duplicar
- `libs/shared/domain/src/models/renovacao.model.ts` também — mover para `libs/features/renovacoes/src/models/`
- Worker jobs em `apps/worker/src/jobs/detect-renewals.job.ts` e `notify-urgent-renewals.job.ts` importam de `libs/shared/domain` — atualizar imports após a movimentação
- Importação via planilha tem lógica própria em `libs/shared/utils/src/importacao-utils.ts` — pode ficar em shared/utils ou mover para `libs/features/renovacoes/`

### Arquivos envolvidos

| | Caminho |
|-|---------|
| Route API | `apps/api/src/routes/renovacoes/index.ts` + `transferir.ts` + `schemas.ts` + `fix-*.ts` |
| Service existente | `libs/shared/domain/src/services/renovacao.service.ts` → mover |
| Model existente | `libs/shared/domain/src/models/renovacao.model.ts` → mover |
| Queries Web | `lib/queries/renovacoes.ts`, `lib/queries/importacoes-renovacoes.ts`, `lib/queries/transferencias.ts` |
| Components Web | `components/importacao-renovacoes/` |
| Worker jobs | `apps/worker/src/jobs/detect-renewals.job.ts`, `notify-urgent-renewals.job.ts` |

---

## FASE 7 — Auth, dashboard, métricas, admin, workspace

**Módulos:** `auth` · `dashboard` · `metricas` / `kpis` · `workspace` · `admin`

### Atenção por módulo

**`auth`**
- `libs/features/auth/` já existe com schemas
- `libs/plugins/auth/` já está bem estruturado — manter como plugin Fastify
- Frontend: `components/auth/`, `lib/queries/auth.ts`

**`dashboard` / `metricas` / `kpis`**
- São queries de agregação cross-module, sem entidades próprias
- Não precisam de `repository.ts` — criar `queries/` no lugar de `repositories/`
- Frontend: `components/dashboard/`, `components/metricas/`, `lib/queries/dashboard.ts`, `lib/queries/metricas.ts`, `lib/queries/kpis.ts`

**`workspace`**
- UI complexa (kanban + planilha + área de trabalho)
- Frontend: `components/area-trabalho/`, `components/kanban/`, `lib/queries/kanban.ts`, `lib/queries/area-trabalho.ts`

**`admin`**
- Conjunto de rotas admin em `apps/api/src/routes/admin/`
- Frontend: `components/admin/`, pages em `app/(admin)/`

---

## Ordem final de execução

```
✅ Fase 0  → infra web (core/, infra/, modules/ criados)
   Fase 1  → produtos, cargos, seguradoras-parceiras, seguradora
   Fase 2  → usuarios, equipes
   Fase 3  → clientes
   Fase 4  → cotacoes, propostas
   Fase 5  → documentos-venda, endossos
   Fase 6  → renovacoes
   Fase 7  → auth, dashboard, metricas, workspace, admin
```

---

## Comandos úteis

```bash
# Verificar build web
npx nx build web --skip-nx-cache

# Verificar imports antigos restantes
grep -r "from '@/components/ui" apps/web/src --include="*.ts" --include="*.tsx" -l
grep -r "from '@/lib/queries" apps/web/src --include="*.ts" --include="*.tsx" -l

# Ver estrutura atual de um módulo
ls apps/web/src/modules/
ls libs/features/
```
