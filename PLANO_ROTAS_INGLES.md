# Plano: Padronizar pastas e sub-paths de rotas para inglês

## Contexto

Os **URL prefixes da API já estão em inglês** (registrados em `apps/api/src/app.ts`).
O que falta são:
1. **Nomes das pastas** em `apps/api/src/routes/` (ainda em português)
2. **Sub-paths** dentro de algumas rotas específicas (ainda em português)

Não há necessidade de versionar ou redirecionar — os sub-paths em português
não têm clientes externos, são chamadas internas entre frontend e backend do monorepo.

---

## Parte 1 — Renomear pastas de rotas

### Mapeamento de pastas

| Pasta atual | Nova pasta |
|---|---|
| `routes/usuarios/` | `routes/users/` |
| `routes/cargos/` | `routes/roles/` |
| `routes/clientes/` | `routes/clients/` |
| `routes/produtos/` | `routes/products/` |
| `routes/cotacoes/` | `routes/quotes/` |
| `routes/propostas/` | `routes/proposals/` |
| `routes/documentos-venda/` | `routes/sales-documents/` |
| `routes/endossos/` | `routes/endorsements/` |
| `routes/sinistros/` | `routes/claims/` |
| `routes/renovacoes/` | `routes/renewals/` |
| `routes/importacoes-renovacoes/` | `routes/renewal-imports/` |
| `routes/seguradora/` | `routes/insurer/` |
| `routes/seguradoras-parceiras/` | `routes/partner-insurers/` |
| `routes/notificacoes/` | `routes/notifications/` |
| `routes/oportunidades/` | `routes/opportunities/` |
| `routes/metricas/` | `routes/metrics/` |
| `routes/gestao-crm/` | `routes/crm-management/` |
| `routes/anexos/` | `routes/attachments/` |
| `routes/tarefas/` | `routes/tasks/` |
| `routes/calendario/` | `routes/calendar/` |
| `routes/equipes/` | `routes/teams/` |
| `routes/lgpd/` | `routes/gdpr/` |
| `routes/metas/` | `routes/goals/` |
| `routes/missoes/` | `routes/missions/` |
| `routes/campanhas/` | `routes/campaigns/` |
| `routes/gamificacao/` | `routes/gamification/` |
| `routes/configuracoes-comissoes/` | `routes/commission-settings/` |
| `routes/corretora-config/` | `routes/broker-config/` |
| `routes/portal-segurado/` | `routes/insured-portal/` |

Pastas que já estão em inglês (não mexer):
`auth`, `dashboard`, `workspace`, `chat`, `kpis`, `marketing`, `badges`,
`asaas`, `admin`, `public`, `_manifest`, `shared`

### Como renomear

Para cada pasta, fazer `git mv` (preserva histórico):

```bash
cd apps/api/src/routes

git mv usuarios users
git mv cargos roles
git mv clientes clients
git mv produtos products
git mv cotacoes quotes
git mv propostas proposals
git mv documentos-venda sales-documents
git mv endossos endorsements
git mv sinistros claims
git mv renovacoes renewals
git mv importacoes-renovacoes renewal-imports
git mv seguradora insurer
git mv seguradoras-parceiras partner-insurers
git mv notificacoes notifications
git mv oportunidades opportunities
git mv metricas metrics
git mv gestao-crm crm-management
git mv anexos attachments
git mv tarefas tasks
git mv calendario calendar
git mv equipes teams
git mv lgpd gdpr
git mv metas goals
git mv missoes missions
git mv campanhas campaigns
git mv gamificacao gamification
git mv configuracoes-comissoes commission-settings
git mv corretora-config broker-config
git mv portal-segurado insured-portal
```

### Atualizar imports em `apps/api/src/app.ts`

Após renomear as pastas, atualizar cada `import` correspondente:

```typescript
// Antes → Depois
import usuariosRoutes from './routes/usuarios/index.js'        → './routes/users/index.js'
import cargosRoutes from './routes/cargos/index.js'            → './routes/roles/index.js'
import clientesRoutes from './routes/clientes/index.js'        → './routes/clients/index.js'
import produtosRoutes from './routes/produtos/index.js'        → './routes/products/index.js'
import cotacoesRoutes from './routes/cotacoes/index.js'        → './routes/quotes/index.js'
import propostasRoutes from './routes/propostas/index.js'      → './routes/proposals/index.js'
import documentosVendaRoutes from './routes/documentos-venda/index.js'  → './routes/sales-documents/index.js'
import endossosRoutes from './routes/endossos/index.js'        → './routes/endorsements/index.js'
import sinistrosRoutes from './routes/sinistros/index.js'      → './routes/claims/index.js'
import renovacoesRoutes from './routes/renovacoes/index.js'    → './routes/renewals/index.js'
import importacoesRenovacoesRoutes from './routes/importacoes-renovacoes/index.js'  → './routes/renewal-imports/index.js'
import seguradoraRoutes from './routes/seguradora/index.js'    → './routes/insurer/index.js'
import seguradorasParceiraRoutes from './routes/seguradoras-parceiras/index.js'  → './routes/partner-insurers/index.js'
import notificacoesRoutes from './routes/notificacoes/index.js'  → './routes/notifications/index.js'
import oportunidadesRoutes from './routes/oportunidades/index.js'  → './routes/opportunities/index.js'
import metricasRoutes from './routes/metricas/index.js'        → './routes/metrics/index.js'
import gestaoCrmRoutes from './routes/gestao-crm/index.js'     → './routes/crm-management/index.js'
import anexosRoutes from './routes/anexos/index.js'            → './routes/attachments/index.js'
import tarefasRoutes from './routes/tarefas/index.js'          → './routes/tasks/index.js'
import calendarioRoutes from './routes/calendario/index.js'    → './routes/calendar/index.js'
import equipesRoutes from './routes/equipes/index.js'          → './routes/teams/index.js'
import lgpdRoutes from './routes/lgpd/index.js'               → './routes/gdpr/index.js'
import metasRoutes from './routes/metas/index.js'              → './routes/goals/index.js'
import missoesRoutes from './routes/missoes/index.js'          → './routes/missions/index.js'
import campanhasRoutes from './routes/campanhas/index.js'      → './routes/campaigns/index.js'
import rankingGamificacaoRoutes from './routes/gamificacao/ranking.js'  → './routes/gamification/ranking.js'
import reconhecimentoRoutes from './routes/gamificacao/reconhecimento.js'  → './routes/gamification/recognition.js'
import configuracoesComissoesRoutes from './routes/configuracoes-comissoes/index.js'  → './routes/commission-settings/index.js'
import corretoraConfigRoutes from './routes/corretora-config/index.js'  → './routes/broker-config/index.js'
import portalSeguradoRoutes from './routes/portal-segurado/index.js'  → './routes/insured-portal/index.js'
```

Também renomear as variáveis de import para ficarem consistentes (opcional mas recomendado):

```typescript
// Exemplos de renomeação de variável
usuariosRoutes     → usersRoutes
cargosRoutes       → rolesRoutes
clientesRoutes     → clientsRoutes
cotacoesRoutes     → quotesRoutes
propostasRoutes    → proposalsRoutes
endossosRoutes     → endorsementsRoutes
sinistrosRoutes    → claimsRoutes
renovacoesRoutes   → renewalsRoutes
seguradoraRoutes   → insurerRoutes
notificacoesRoutes → notificationsRoutes
oportunidadesRoutes → opportunitiesRoutes
metricasRoutes     → metricsRoutes
gestaoCrmRoutes    → crmManagementRoutes
anexosRoutes       → attachmentsRoutes
tarefasRoutes      → tasksRoutes
calendarioRoutes   → calendarRoutes
equipesRoutes      → teamsRoutes
lgpdRoutes         → gdprRoutes
metasRoutes        → goalsRoutes
missoesRoutes      → missionsRoutes
campanhasRoutes    → campaignsRoutes
rankingGamificacaoRoutes → gamificationRankingRoutes
reconhecimentoRoutes     → gamificationRecognitionRoutes
configuracoesComissoesRoutes → commissionSettingsRoutes
corretoraConfigRoutes    → brokerConfigRoutes
portalSeguradoRoutes     → insuredPortalRoutes
```

---

## Parte 2 — Corrigir sub-paths em português

Estes são segmentos de URL dentro das rotas que ainda estão em português.
Cada item exige mudança coordenada: **backend (route handler) + frontend (http/index.ts)**.

### 2.1 Chat — `apps/api/src/routes/chat/index.ts`

| Sub-path atual | Sub-path novo |
|---|---|
| `/:id/configuracoes` | `/:id/settings` |
| `/:id/sair` | `/:id/leave` |
| `/:id/membros/:membroId` | `/:id/members/:memberId` |

Frontend afetado: `apps/web/src/modules/chat/` e `apps/web-new/src/modules/chat/`

Buscar e substituir nas chamadas HTTP:
```
/chat/${canalId}/configuracoes  →  /chat/${channelId}/settings
/chat/${canalId}/sair           →  /chat/${channelId}/leave
/chat/${canalId}/membros/       →  /chat/${channelId}/members/
```

### 2.2 Quotes — `apps/api/src/routes/cotacoes/index.ts` (após rename: `quotes/`)

| Sub-path atual | Sub-path novo |
|---|---|
| `/:id/converter` | `/:id/convert` |

Frontend afetado: buscar `/quotes/${cotacaoId}/converter` em `apps/web` e `apps/web-new`.

### 2.3 Commission Settings — `apps/api/src/routes/configuracoes-comissoes/index.ts`

| Sub-path atual | Sub-path novo |
|---|---|
| `/entries/:id/pagamento` | `/entries/:id/payment` |
| `/entries/:id/recebimento` | `/entries/:id/receipt` |
| `/statement/:id/pagamento` | `/statement/:id/payment` |

Frontend afetado: `apps/web/src/modules/configuracoes-comissoes/http/index.ts` e equivalente em `web-new`.

---

## Parte 3 — Verificação após as mudanças

1. Rodar typecheck do backend:
   ```bash
   npx tsc -p apps/api/tsconfig.json --noEmit
   ```

2. Rodar typecheck do frontend:
   ```bash
   npx tsc -p apps/web/tsconfig.json --noEmit
   npx tsc -p apps/web-new/tsconfig.json --noEmit
   ```

3. Conferir que nenhum import ainda referencia caminhos antigos:
   ```bash
   grep -r "routes/usuarios\|routes/cargos\|routes/cotacoes\|routes/renovacoes\|routes/clientes" apps/api/src/
   grep -r "configuracoes\|pagamento\|recebimento\|membros\|converter\|sair" apps/web/src/modules/*/http/
   grep -r "configuracoes\|pagamento\|recebimento\|membros\|converter\|sair" apps/web-new/src/modules/*/http/
   ```

---

## Escopo fora deste plano (não fazer aqui)

- Nomes de variáveis/funções/tipos em português dentro dos handlers → escopo separado
- Mensagens de erro visíveis ao usuário → manter em português (produto para mercado brasileiro)
- Nomes de tabelas e colunas do banco → exige migrations, risco alto, escopo separado
- Comentários internos nos arquivos → escopo separado
