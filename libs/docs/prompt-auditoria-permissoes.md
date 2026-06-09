# Prompt: Auditoria Completa do Sistema de Permissões — EcoTech SYS

## Contexto

Você está analisando o sistema de permissões de um SaaS multi-tenant para corretoras de seguros chamado **EcoTech SYS**. Ele tem:

- **Backend:** Node.js + Fastify + Drizzle ORM + PostgreSQL (Neon)
- **Frontend:** Next.js 16 App Router + Zustand + TanStack Query
- **Monorepo:** Nx + pnpm workspaces

---

## Como o sistema funciona hoje

### 1. Modelo de dados (banco)

Três tabelas centrais:

```
permissao_global (id, nomePermissao, descricao, grupo, createdAt)
cargo            (id, corretoraId, nomeCargo, isAdmin, isGestor, isVendedor, deletedAt, ...)
cargo_permissao  (cargoId FK, permissaoGlobalId FK)   ← PK composta
```

Permissões seguem o padrão `"recurso:acao"` (ex: `kanban:visualizar_todas`, `vendas:editar_cotacao`).

Cada corretora cria seus próprios cargos, que referenciam permissões globais do sistema.

### 2. Fluxo de autenticação e carregamento de permissões

**Login (POST /login):**
1. Valida credenciais → busca `usuario` no BD
2. `generateTokenPayload(usuarioId)` → JWT com `{ sub, corretoraId, cargoId, isAdmin, isGestor, isVendedor, isLiderEquipe }` — **permissões NÃO estão no JWT**
3. `loadUserRuntimeData(usuarioId, isAdmin, cargoId)` → busca `permissoes: string[]` do BD (JOIN `cargo_permissao` ↔ `permissao_global`)
4. Resposta ao cliente: `{ token, refreshToken, usuario, permissoes, corretora }`

**A cada request autenticado** (middleware `fastify.authenticate`):
1. `jwtVerify()` → decodifica JWT
2. Valida que usuário existe e está ativo
3. **Chama `loadUserRuntimeData()` novamente** → repopula `request.user.permissoes` do BD a cada request
4. `resolveTenant()` → popula `request.corretoraId` e `request.corretora`

**Admin bypass:** `isAdmin == true` → `loadUserRuntimeData` retorna `SELECT * FROM permissao_global` (todas as permissões).

### 3. Middleware de autorização (backend)

Arquivo: `libs/plugins/authorization/src/index.ts`

```typescript
authorize(perms[])      // Requer TODAS as permissões listadas
authorizeAny(perms[])   // Requer QUALQUER UMA das permissões listadas
requireGestor()         // Requer isAdmin || isGestor (ignora permissoes[])
requireAdmin()          // Requer apenas isAdmin
requireOwnership(type)  // Valida posse do recurso (cotacao/proposta/documento)
requireStatus(type, []) // Valida status do recurso
requireEquipeAccess(lvl)// Valida acesso a equipe específica
```

### 4. Frontend — verificação de permissões

**Auth store** (`apps/web/src/stores/auth-store.ts`):
- Persiste `user.permissoes: string[]` em localStorage (`'auth-storage'`)
- `hasPermission(p)`: `user.isAdmin || user.cargo?.isAdmin || user.permissoes.includes(p)`
- `hasAnyPermission(ps)`: `user.isAdmin || user.cargo?.isAdmin || ps.some(p => user.permissoes.includes(p))`

**Hook** (`apps/web/src/hooks/use-permissions.ts`):
- Mesma lógica, expõe `hasPermission`, `hasAnyPermission`, `hasAllPermissions`

**PageGuard** (`apps/web/src/components/auth/page-guard.tsx`):
- Envolve pages; redireciona para `/sem-permissao` se sem acesso
- Qualquer `api.ts` que receba HTTP 403 faz `window.location.href = '/sem-permissao'`

**Sidebar** (`apps/web/src/components/layout/app-sidebar.tsx`):
- Filtra itens por `user.permissoes.includes(item.permission)`
- Suporta `visibleFn` para lógica customizada

### 5. Mapeamento atual (rotas de API × proteção)

| Rota | Método | Proteção atual |
|------|--------|----------------|
| `GET /oportunidades` | GET | `authorizeAny(['kanban:acessar', 'kanban:visualizar', 'kanban:visualizar_todas'])` |
| `POST /oportunidades` | POST | `authorize(['kanban:criar'])` |
| `PATCH /oportunidades/:id` | PATCH | `authorize(['kanban:editar'])` |
| `GET /gestao-crm/overview` | GET | `requireGestor()` |
| `GET /gestao-crm/vendedores` | GET | `authorizeAny(['gestao_crm:acessar', 'kanban:visualizar_todas'])` |
| `GET /clientes` | GET | *(apenas authenticate — sem authorize)* |
| `POST /clientes` | POST | `authorize(['clientes:criar'])` |
| `PATCH /clientes/:id` | PATCH | `authorize(['clientes:editar'])` |
| `DELETE /clientes/:id` | DELETE | `authorize(['clientes:excluir'])` |
| `GET /usuarios` | GET | `authorize(['usuarios:visualizar'])` |
| `POST /usuarios` | POST | `authorize(['usuarios:criar'])` |
| `PATCH /usuarios/:id` | PATCH | `authorize(['usuarios:editar'])` |
| `DELETE /usuarios/:id` | DELETE | `authorize(['usuarios:excluir'])` |
| `POST /usuarios/:id/cargo` | POST | `authorize(['usuarios:atribuir_cargo'])` |
| `GET /cotacoes/:id` | GET | `authorize(['vendas:visualizar_cotacao'])` |
| `POST /cotacoes` | POST | `authorize(['vendas:criar_cotacao'])` |
| `PATCH /cotacoes/:id` | PATCH | `authorize(['vendas:editar_cotacao'])` |
| `GET /propostas` | GET | `authorizeAny(['vendas:criar_proposta', 'vendas:editar_proposta', 'vendas:visualizar_proposta'])` |
| `POST /propostas` | POST | `authorize(['vendas:criar_proposta'])` |
| `PATCH /propostas/:id` | PATCH | `authorize(['vendas:editar_proposta'])` |
| `GET /documentos-venda` | GET | `authorizeAny(['vendas:visualizar_documento_venda', 'vendas:visualizar_todos_documentos'])` |
| `POST /documentos-venda` | POST | `authorize(['vendas:criar_documento_venda'])` |
| `PATCH /documentos-venda/:id` | PATCH | `authorize(['vendas:editar_documento_venda'])` |
| `POST /documentos-venda/:id/aprovar` | POST | `authorize(['cadastro:aprovar_venda'])` |
| `POST /documentos-venda/:id/rejeitar` | POST | `authorize(['cadastro:rejeitar_venda'])` |
| `POST /documentos-venda/:id/cancelar` | POST | `authorize(['vendas:cancelar_venda'])` |
| `GET /endossos` | GET | `authorizeAny(['vendas:criar_endosso', 'vendas:aprovar_endosso'])` |
| `POST /endossos` | POST | `authorize(['vendas:criar_endosso'])` |
| `POST /endossos/:id/aprovar` | POST | `authorize(['cadastro:aprovar_endosso'])` |
| `GET /dashboard` | GET | `authorize(['dashboard:visualizar'])` |
| `GET /dashboard/rentabilidade` | GET | `authorize(['relatorios:vendas'])` |
| `GET /dashboard/cotacoes` | GET | *(apenas authenticate)* |
| `GET /auth/me` | GET | *(apenas authenticate)* |
| `GET /renovacoes` | GET | `authorize(['vendas:visualizar_documento_venda'])` |
| `GET /chat/canais` | GET | *(apenas authenticate)* |
| `GET /notificacoes` | GET | *(apenas authenticate)* |
| `POST /produtos` | POST | `authorize(['config:gerenciar_produtos'])` |
| `PATCH /produtos/:id` | PATCH | `authorize(['config:gerenciar_produtos'])` |
| `POST /seguradoras-parceiras` | POST | `authorize(['config:gerenciar_seguradoras_parceiras'])` |
| `GET /importacoes-renovacoes` | GET | `authorize(['importar_renovacoes:acessar'])` |
| `POST /importacoes-renovacoes` | POST | `authorize(['importar_renovacoes:acessar'])` |
| `GET /missoes` | GET | `authorizeAny(['workspace:acessar', 'gamificacao:gerenciar'])` |
| `POST /missoes` | POST | `authorize(['gamificacao:gerenciar'])` |
| `GET /metas` | GET | `authorizeAny(['workspace:acessar', 'gamificacao:gerenciar'])` |
| `POST /metas` | POST | `authorize(['gamificacao:gerenciar'])` |
| `GET /campanhas` | GET | `authorizeAny(['workspace:acessar', 'gamificacao:gerenciar'])` |
| `POST /campanhas` | POST | `authorize(['gamificacao:gerenciar'])` |
| `GET /badges` | GET | `authorize(['workspace:acessar'])` |
| `POST /badges` | POST | `authorize(['gamificacao:gerenciar'])` |

### 6. Mapeamento frontend — PageGuard × Sidebar × Permissão

| Página | PageGuard usa | Sidebar usa |
|--------|--------------|-------------|
| `/dashboard` | `dashboard:visualizar` | `dashboard:visualizar` |
| `/dashboard/kanban` | `kanban:acessar` | `kanban:acessar` |
| `/workspace` | `workspace:acessar` | `workspace:acessar` |
| `/workspace/planilha` | `workspace:visualizar_planilha` | *(sem item direto)* |
| `/clientes` | `clientes:visualizar` | `clientes:visualizar` |
| `/usuarios` | `usuarios:visualizar` | `usuarios:visualizar` |
| `/configuracoes/cargos` | `configuracoes:gerenciar_cargos` | *(não tem item)* |
| `/chat` | `chat:acessar` | `chat:acessar` |
| `/produtos` | `produtos:visualizar` | `produtos:visualizar` |
| `/cadastro` | `cadastro:acessar` | `cadastro:acessar` |
| `/gestao-crm` | `gestao_crm:acessar` | `gestao_crm:acessar` |
| `/importar-renovacoes` | `importar_renovacoes:acessar` | `importar_renovacoes:acessar` |
| `/marketing` | *(sem PageGuard)* | `marketing:acessar` |
| `/metricas` | *(sem PageGuard)* | `metricas:acessar` |
| `/metricas-dashboard` | *(sem PageGuard)* | `metricas:acessar` |
| `/performance` | *(sem PageGuard)* | `performance:visualizar` |
| `/gestao` | *(sem PageGuard)* | `gamificacao:gerenciar` |

### 7. Queries frontend com `enabled` condicionado a permissão/role

| Componente / Arquivo | Query | Condição `enabled` |
|---------------------|-------|-------------------|
| `kanban-board.tsx:140` | `useVendedoresStats` | `hasPermission('kanban:visualizar_todas')` |
| `oportunidades-gestao-list.tsx:111` | `useOportunidadesGestao` | `user?.isAdmin \|\| user?.isGestor` |
| `oportunidades-gestao-list.tsx:113` | `useVendedoresStats` | `user?.isAdmin \|\| user?.isGestor` |
| `vendedores-table.tsx:25` | `useVendedoresStats` | `user?.isAdmin \|\| user?.isGestor` |
| `nova-oportunidade-gestor-dialog.tsx:65` | `useVendedoresStats` | `user?.isAdmin \|\| user?.isGestor` |
| `estatisticas-crm.tsx:19` | `useEstatisticasCRM` | `user?.isAdmin \|\| user?.isGestor` |
| `cadastro/page.tsx:75` | `useEndossosPendentes` | `hasPermission('cadastro:acessar')` |
| `metricas/page.tsx:73` | `useEquipes` | `hasPermission('equipes:visualizar')` |
| `performance/page.tsx:90` | `useEquipes` | `hasPermission('equipes:visualizar')` |

### 8. Bug já corrigido (para não reportar de novo)

**`GET /gestao-crm/vendedores` — 403 para vendedores com `kanban:visualizar_todas`:**
- O kanban-board habilitava `useVendedoresStats` para qualquer usuário com `kanban:visualizar_todas`
- O endpoint exigia `requireGestor()` (isAdmin ou isGestor)
- Vendedores com `kanban:visualizar_todas` recebiam 403, que redirecionava toda a página para `/sem-permissao`
- **Fix aplicado:** endpoint agora usa `authorizeAny(['gestao_crm:acessar', 'kanban:visualizar_todas'])`

---

## Sua tarefa

Analise exaustivamente o sistema de permissões descrito acima e identifique:

### A. Bugs e inconsistências

Procure especificamente por:

1. **Mismatches frontend × backend** — PageGuard usa permissão X, mas a API que a página chama requer Y. O usuário passa no guard mas recebe 403 da API (ou vice-versa).

2. **Queries sem `enabled` guard** — chamadas de API que ocorrem mesmo sem permissão, gerando 403 silenciosos (ou ruidosos, como o bug corrigido acima).

3. **Rotas sem proteção** — endpoints da API que têm apenas `fastify.authenticate` sem `authorize()`, quando deveriam restringir por permissão (ex: `GET /clientes`, `GET /dashboard/cotacoes`, `GET /chat/canais`). Avalie o risco real de cada um.

4. **Inconsistências sidebar × PageGuard** — itens que aparecem no sidebar com permissão A, mas a página usa PageGuard com permissão B diferente.

5. **Gaps em operações CRUD** — se há `POST /x` com `authorize(['x:criar'])`, mas `GET /x` sem proteção, ou `DELETE /x` com permissão diferente do esperado.

6. **`requireGestor()` vs permissão explícita** — lugares que usam `requireGestor()` mas deveriam usar uma permissão granular (e vice-versa). O `requireGestor()` bypassa o sistema de permissões e não pode ser sobrescrito por cargo customizado.

7. **Condições `isGestor/isAdmin` no frontend sem equivalente no backend** — queries habilitadas por `user.isGestor` no frontend, mas o endpoint correspondente usa `authorize()` baseado em permissão de string (podem divergir se um gestor não tiver a permissão explícita).

8. **Sessão stale** — permissões ficam em localStorage. Se um admin remover uma permissão de um cargo, o usuário logado ainda tem acesso até fazer logout. Avalie se há endpoints críticos sem validação server-side suficiente.

9. **`cargo?.isAdmin` vs `isAdmin`** — o auth-store checa `user.isAdmin || user.cargo?.isAdmin`, mas o JWT só carrega `isAdmin` do cargo no momento do login. Se o cargo mudar para `isAdmin=true` depois, a sessão não reflete isso. Avalie impacto.

10. **Permissões que existem no frontend mas não na tabela `permissao_global`** — PageGuard checa `workspace:visualizar_planilha` e `configuracoes:gerenciar_cargos`. Verifique se essas permissões estão seedadas no banco e atribuídas aos cargos corretos.

### B. Sugestões de melhoria arquitetural

1. **Performance** — `loadUserRuntimeData()` faz um JOIN no BD **a cada request**. Com alto volume isso pode ser um gargalo. Sugira alternativas (cache Redis com TTL, permissões no JWT, invalidação por evento).

2. **Granularidade do `requireGestor()`** — avalie se faz sentido substituí-lo por permissões explícitas como `gestao_crm:acessar`, tornando o sistema mais flexível para cargos customizados.

3. **Isolamento multi-tenant** — verifique se há risco de um usuário de uma corretora acessar dados de outra via ID manipulation (ex: `GET /clientes/:id` sem checar `corretoraId`).

4. **Consistência na checagem admin** — há pelo menos 3 formas de checar admin: `user.isAdmin`, `user.cargo?.isAdmin`, `user.isAdmin || user.cargo?.isAdmin`. Avalie se isso gera brechas.

5. **Redirect 403 global** — o `api.ts` redireciona qualquer 403 para `/sem-permissao`. Isso é agressivo: uma query secundária de baixo risco (ex: buscar lista de vendedores para um filtro) quebra toda a página. Sugira alternativa mais granular.

6. **Ausência de middleware de autorização no Next.js** — não há `middleware.ts` no frontend. Rotas protegidas só são verificadas client-side pelo PageGuard. Avalie risco e impacto de adicionar verificação server-side.

7. **Refresh token sem permissões** — o refresh token não recarrega permissões do BD quando emitido. Só o login completo faz isso. Se permissões mudarem, o usuário precisa fazer logout/login. Avalie se há endpoint `/auth/refresh` e se ele também chama `loadUserRuntimeData`.

### C. Formato da resposta esperada

Para cada item encontrado, use este formato:

```
## [TIPO] Título curto

**Severidade:** Crítico | Alto | Médio | Baixo
**Área:** Backend | Frontend | Arquitetura | Performance

**Problema:**
Descrição clara do que está errado ou pode ser melhorado.

**Evidência:**
- Arquivo: `path/to/file.ts` linha X
- Arquivo: `path/to/other.ts` linha Y

**Impacto:**
O que pode acontecer se não for corrigido.

**Sugestão:**
Como corrigir ou melhorar, com exemplo de código se aplicável.
```

Seja objetivo. Priorize por severidade. Não repita o bug já corrigido (`/gestao-crm/vendedores`).
