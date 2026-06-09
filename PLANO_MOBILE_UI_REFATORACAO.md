# Plano de Refatoração Mobile — Todas as Rotas da Sidebar

## Contexto

A aplicação `apps/web-new` foi construída com mentalidade desktop-first. Várias páginas quebram em telas < 640px: tabelas com 6–9 colunas em grid fixo, popovers com largura `w-[400px]`, sidebars laterais sem fallback mobile, botões dependentes de `group-hover` (invisíveis em touch), KPIs em `grid-cols-2` apertados, etc.

Este documento define **um plano objetivo por rota** + **padrões globais** que devem ser aplicados em ordem de prioridade. A rota `/ranking` já foi refatorada (commit anterior).

---

## Padrões globais (aplicar em todas as rotas)

| # | Regra | Antes | Depois |
|---|-------|-------|--------|
| 1 | KPI/stat grids | `grid-cols-2 lg:grid-cols-4` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| 2 | Filtros em flex-row | `flex gap-2` | `flex flex-col sm:flex-row gap-2 [child:w-full sm:w-auto]` |
| 3 | Larguras fixas em popover/select/combobox | `w-[400px]`, `w-56`, `w-40` | `w-[90vw] sm:w-[400px]` ou `w-full sm:w-[180px]` |
| 4 | Tabelas HTML 6+ colunas | `<Table>` direto | Dual render: `hidden sm:block` (tabela) + `sm:hidden` (cards stacked) |
| 5 | Ações `opacity-0 group-hover:opacity-100` | invisível em touch | `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` |
| 6 | Side-panels fixos (resize, w-80, w-64) | `w-80 hidden lg:block` | Substituir por `Sheet`/`Drawer` em < 768px |
| 7 | Hit area mínima | `h-7 w-7`, `h-4 w-4` ícones soltos | `h-9 w-9 sm:h-8 sm:w-8` (target ≥ 36px em mobile) |
| 8 | Paginação completa | botões 1..N inline | `< Página X de Y >` em mobile |
| 9 | Header com múltiplos botões | `flex gap-2 flex-wrap` | Botões secundários `hidden sm:inline-flex` ou em `DropdownMenu` mobile |
| 10 | Tabs com labels longas | `<TabsTrigger>texto</TabsTrigger>` | Texto com `hidden sm:inline` + ícone permanente |
| 11 | Padding container | `p-8` | `p-3 sm:p-6 lg:p-8` |
| 12 | `min-w-0` em flex children | ausente, causa truncate quebrado | adicionar em todo `flex-1` que contém texto |

**Reutilização:** já existe `Sheet` (shadcn), `Drawer`, `DropdownMenu`. Padrões dual-render existem em `negocios-corretora.tsx` e `notificacoes.tsx` — usar como referência.

---

## Plano por rota

### CENTRO

#### 1. `/dashboard` — `routes/_app/dashboard/index.tsx`
**Problemas:** stats em `grid-cols-2 lg:grid-cols-4` (apertado em xs); form "Adicionar tarefa" em flex-row sem wrap; botão delete `opacity-0 group-hover:opacity-100` (invisível em touch); textos longos truncam.

**Plano:**
- Stats: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Form tarefa: `flex flex-col sm:flex-row gap-2` + `w-full sm:w-auto` no botão
- Delete: `opacity-40 sm:opacity-0 sm:group-hover:opacity-100`
- Headings: `text-xl sm:text-2xl md:text-3xl`

---

#### 2. `/notificacoes` — `routes/_app/notificacoes.tsx`
**Status:** já tem dual render parcial; ações em `group-hover` ainda invisíveis em mobile.

**Plano:**
- Ações `NotificationCard`: `opacity-100 md:opacity-0 md:group-hover:opacity-100`
- Botões `size-icon`: aumentar para `h-9 w-9` em mobile
- Timestamp: `max-w-[60px] truncate sm:max-w-none`

---

#### 3. `/agenda` — `routes/_app/agenda.tsx` → `CalendarioPage`
**Problemas:** sidebar de filtros `hidden lg:block` (filtros somem em mobile); checkboxes com hit area `py-1.5` (~30px); calendar grid sem overflow horizontal explícito.

**Plano:**
- Sidebar → `Sheet` mobile com botão "Filtros" no header (ícone `SlidersHorizontal`)
- Checkboxes: `px-4 py-2.5 sm:px-3 sm:py-1.5` + `Checkbox` size `h-5 w-5 sm:h-4 sm:w-4`
- Calendar wrapper: `overflow-x-auto`, células `min-w-[44px]`
- Header: `flex flex-col sm:flex-row gap-2`

---

#### 4. `/workspace` — `routes/_app/workspace/index.tsx`
**Problemas:** 4 botões de ação (Planilha, Cadastro, Endosso, Novo Seguro) em `flex-wrap` quebram em 2 linhas; Popover combobox `w-[280px]`; DateInputs `w-[180px]` lado a lado em mobile = overflow; Tabs com `overflow-x-auto` mas labels truncam.

**Plano:**
- Header: `Novo Seguro` + `Cadastro` visíveis em mobile; `Planilha` e `Endosso` movidos para `DropdownMenu` (`<MoreVertical />`) em mobile
- Combobox cliente: `PopoverContent className="w-[90vw] sm:w-[280px]"`
- Filtros convertidos: `flex flex-col sm:flex-row` + DateInputs `w-full sm:w-[180px]`
- TabsList: já scrollable; aumentar `py-2.5` para hit area melhor

---

#### 5. `/meu-desempenho` — `routes/_app/meu-desempenho.tsx`
**Problemas:** stats no hero em `grid-cols-2 md:grid-cols-4` apertados; badge showcase `grid-cols-3` em mobile (badges muito pequenas); avatar+nome/email com `truncate` ilegível; campanhas em `lg:col-span-2` desalinha.

**Plano:**
- Hero stats: `grid-cols-2 sm:grid-cols-4` mantém, mas `text-xs sm:text-sm` nos labels e `min-w-0` para evitar overflow
- Badge showcase: `grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6`
- Hero text: remover `truncate` do email, usar `break-all sm:truncate`
- Timeline conquistas: campos secundários `hidden md:block`

---

#### 6. `/ranking` — ✅ **REFATORADO** (commit anterior)
Hero compacto em mobile, faixa de cards horizontalmente scrollável, leaderboard com 3 colunas em mobile e 6 em desktop, painel de Metas empilhado embaixo com `max-h-52`.

---

#### 7. `/dashboard/kanban` — `routes/_app/dashboard/kanban.tsx` → `KanbanBoard`
**Problemas:** kanban grid `xl:grid-cols-5` sem `overflow-x-auto` claro; header com `flex justify-between` aperta botão "+ Nova Oportunidade"; filtros em flex-row sem wrap.

**Plano:**
- Kanban grid: `flex sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto snap-x` — em mobile, scroll horizontal com `snap-x` para "swipe entre colunas"
- Cada coluna: `min-w-[280px] sm:min-w-0` + `min-w-0` no children
- Header: `flex flex-col sm:flex-row gap-2`; botão `w-full sm:w-auto`
- Filtros: `flex flex-col sm:flex-row gap-2` + selects `w-full sm:w-[180px]`
- KPIs: `grid-cols-2 sm:grid-cols-4`

---

#### 8. `/chat` — `routes/_app/chat.tsx` → `ChatInterface`
**Problemas:** desktop-first com `w-80` channel list + chat + `${profileWidth}px` profile panel; já tem lógica `isMobile` para alternar lista/chat mas sem transição visual; botão toggle `h-10 w-10` apertado em mobile.

**Plano:**
- Container: `flex flex-col md:flex-row` (já existe lógica)
- Channel list: `w-full md:w-80` + animação slide-in/out
- Profile panel → `Sheet right-side` em mobile (`hidden md:block` no resizable)
- Resize handle: `hidden md:block`
- ChatWindow header em mobile: adicionar `<button onClick={voltar}>← canais</button>` para navegação clara
- Botão toggle `PanelLeftOpen`: `h-12 w-12 sm:h-10 sm:w-10`

---

#### 9. `/clientes` — `routes/_app/clientes.tsx`
**Problemas:** tabela 8 colunas (Tipo, Nome, Documento, Email, Telefone, Responsável, Status, Ações) sem fallback mobile; dropdown filtros `w-56` excede viewport pequeno; paginação numerada inline.

**Plano:**
- Implementar dual render:
  - Desktop: `<div className="hidden md:block">` + tabela atual
  - Mobile: `<div className="md:hidden space-y-2">` com cards `border rounded-lg p-3` mostrando: Avatar/iniciais, Nome (font-semibold), Documento (text-xs muted), Email truncate, Status badge, chevron à direita ou kebab menu
- Filtros dropdown: `w-[90vw] sm:w-56`
- Paginação: `<Prev />  Página X de Y  <Next />` em mobile (esconder numéricos com `hidden sm:flex`)
- Header ações: `flex flex-col sm:flex-row gap-2 sm:gap-4`

---

### GESTÃO

#### 10. `/gestao-crm` — `routes/_app/gestao-crm.tsx`
**Componentes delegados:** `EstatisticasCRM`, `VendedoresTable`, `OportunidadesGestaoList`

**Problemas:** estatísticas `md:grid-cols-2 lg:grid-cols-4` (sem col-1 explícito); `VendedoresTable` já tem cards mobile (manter); `OportunidadesGestaoList` é tabela 7 colunas sem fallback; selects de filtro full-width quebram.

**Plano:**
- `EstatisticasCRM`: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- `OportunidadesGestaoList`: replicar dual render do `VendedoresTable` — cards stacked com Cliente, Status, Valor, dropdown ações
- Filtros: `flex flex-col sm:flex-row gap-2 w-full sm:w-auto` + selects `w-full sm:w-[200px]`
- Header com botões: `flex flex-col sm:flex-row` para evitar quebra fora de ordem

---

#### 11. `/produtos` — `routes/_app/produtos.tsx` → `ProdutosList`
**Problemas:** tabela 7 colunas sem fallback mobile; header em `flex justify-between`; filtros 3 selects + busca em row, overflow em < 320px; paginação `Página X de Y` aperta em mobile.

**Plano:**
- Cards mobile: `border rounded-lg p-3 space-y-2 cursor-pointer` com Nome, Tipo (badge), Status badge, faixa Prêmio "Min – Max", chevron
- Header: `flex flex-col sm:flex-row sm:justify-between gap-2`
- Filtros: search `w-full max-w-none sm:max-w-md` + selects `w-full sm:w-[180px]` em `flex flex-col sm:flex-row gap-2`
- Paginação: `flex flex-col sm:flex-row` ou simplificar mobile

---

#### 12. `/importar-renovacoes` — `routes/_app/importar-renovacoes/index.tsx`
**Problemas:** popover seletor de vendedor `w-[400px]` extrapola viewport; header com `justify-between` empurra botão "Histórico" para 2ª linha; planilha columns grid OK; botões finais com `flex-1` ficam grandes em landscape estreito.

**Plano:**
- Popover vendedor: `PopoverContent className="w-[90vw] sm:w-[400px] max-w-md"`; em xs, considerar `<Sheet>` com lista vertical
- Header: `flex flex-col sm:flex-row sm:items-start gap-3`; botão Histórico `w-full sm:w-auto`
- Botões ação (Importar/Cancelar): `flex flex-col-reverse sm:flex-row gap-2`
- Container outer: trocar `max-w-4xl py-8 px-4` por `max-w-4xl py-4 sm:py-8 px-3 sm:px-4`

---

#### 13. `/gestao` — `routes/_app/gestao.tsx`
**Problemas:** KPI grid `grid-cols-2 lg:grid-cols-4`; 3 tabelas internas (metas, missões, campanhas) com `overflow-x-auto` e botões de ação em ícones soltos `h-4 w-4` (hit area minúscula); buscador de vendedor com resultados `py-2 px-3` apertados.

**Plano:**
- KPIs: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` + `text-xs sm:text-sm` nos labels
- Tabelas: ações reduzir gap `gap-0.5` e adicionar tooltips; em mobile, mover ações para `DropdownMenu`
- Filtros acima de cada tabela: `flex flex-col sm:flex-row gap-2` + inputs/selects `w-full sm:w-auto`
- Buscador vendedor: itens `py-2.5 px-3 hover:bg-accent active:bg-accent/80`
- Badges grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` com ícones `h-5 w-5 sm:h-4 sm:w-4`

---

### ADMIN

#### 14. `/usuarios` — `routes/_app/usuarios.tsx` → `UsuariosTab`
**Problemas:** tabela 6 colunas sem fallback mobile; filtros em `grid-cols-1 md:grid-cols-4` (em sm, Email fica largo demais); TabsList sem responsividade explícita; dropdown actions `align-end` pode sair do viewport.

**Plano:**
- Cards mobile: nome, email, cargo (badge), status, último login (`text-xs`), kebab menu
- Filtros: `flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-4 gap-2`
- Tabs (Usuários/Cargos/Equipes): `<TabsList>` com `overflow-x-auto`; labels com `hidden sm:inline` + ícone
- Dropdown action: `align="start"` em mobile (`md:align-end`)
- Paginação: ver padrão global #8

---

#### 15. `/negocios-corretora` — `routes/_app/negocios-corretora.tsx`
**Status:** já tem dual render (cards + tabela). Precisa apenas ajustes finos.

**Problemas:** KPIs `grid md:grid-cols-3` apertam números longos em sm; filtros `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` em sm com inputs muito pequenos; Tabs labels longas ("Negócio Corretora") quebram < 280px; badges inline nos cards mobile podem estourar linha.

**Plano:**
- KPIs: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` + `text-2xl sm:text-3xl` nos números
- Filtros: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5`
- Tabs: label completa `hidden sm:inline` + ícone permanente
- Cards mobile badges: container `flex flex-wrap gap-1.5`

---

#### 16. `/performance` — `routes/_app/performance.tsx`
**Problemas:** Card filtros com `cursor-pointer` no header sem visual hover; calendar Popover com `w-auto` pode exceder viewport mobile; KPIs `grid-cols-2 lg:grid-cols-4`; ranking item com 4 métricas em `hidden sm:flex` mas em sm (640px) ainda fica apertado.

**Plano:**
- Card filtros header: adicionar `hover:bg-muted/30 transition-colors` + ícone chevron animado
- Calendar Popover: `PopoverContent className="w-[calc(100vw-32px)] sm:w-auto"`
- KPIs: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Ranking item: `flex flex-col sm:flex-row` em mobile — nome em cima, métricas em strip horizontal scrollável abaixo (similar ao /ranking refatorado)
- Botão "Tela Cheia": `w-full sm:w-auto`

---

#### 17. `/metricas` — `routes/_app/metricas/index.tsx`
**Componentes delegados:** `RankingVendedores`, `VendedorDetalheView`

**Problemas:** header com 4 preset buttons + DateRangePicker + select equipe `w-40` + link "Gestão Renovações" + refresh em `flex flex-wrap` (3 linhas em mobile); preset buttons `h-7 text-xs` (hit area pequena); 8 KPI cards em 2 grids separados (4 linhas em mobile).

**Plano:**
- Header: `flex flex-col sm:flex-row sm:items-center gap-2`; preset buttons em `flex w-full sm:w-auto overflow-x-auto`
- Preset buttons: `h-9 sm:h-7 text-sm sm:text-xs`
- Equipe select: `w-full sm:w-40 h-8`
- MonthRangePicker selects internos: `w-full sm:w-44`
- KPIs: unificar em `grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8` (1 grid de 8) ou manter separado mas `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

---

#### 18. `/metricas-dashboard` — `routes/_app/metricas-dashboard.tsx`
**Componentes delegados:** `MetricasTabs`, `PremioSeguradoraChart`, `SeguradorasMixChart`, `FilterToolbar`

**Problemas:** KPI strip `grid-cols-2 md:grid-cols-4 lg:grid-cols-7` (2 linhas de 2 em xs = 7+ rows total se 14 cards); FilterToolbar pode ter múltiplos selects sem responsividade; Tabs `h-10` com ícone+texto pequeno.

**Plano:**
- KPI strip: `grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7` ou avaliar **carrossel horizontal scrollável** em mobile (snap-x) com 1 KPI focado por vez
- `FilterToolbar`: auditar e aplicar `flex flex-col sm:flex-row gap-2` + popovers `w-[90vw] sm:w-auto`
- Tabs: `h-11 sm:h-10` + texto labels com `text-xs sm:text-sm`
- Charts grid `lg:grid-cols-3`: garantir `min-h-[280px]` para evitar collapse durante lazy load

---

### EQUIPE

#### 19. `/dashboard-equipe` — `routes/_app/dashboard-equipe.tsx`
Idêntico estruturalmente a `/metricas-dashboard` (KPI strip 6 cards + charts + tabs). Aplicar **mesmas mudanças** do item 18, ajustando cols para 6 em vez de 7.

---

### SINISTROS

#### 20. `/sinistro` — `routes/_app/sinistro/index.tsx`
**Problemas:** stats `grid-cols-3` fixo (texto sobrepõe ícones em xs); ícones internos com flex-wrap; lista items com botões `hidden group-hover:flex` (inacessível em touch); filtros em `flex-wrap` sem ordem responsiva.

**Plano:**
- Stats: `grid-cols-1 sm:grid-cols-3` + interno `flex-col sm:flex-row gap-2`
- Lista items: ações sempre visíveis em mobile — `<DropdownMenu>` com kebab no canto direito (substitui hover-only)
- Filtros: `flex flex-col sm:flex-row gap-2` + inputs `w-full sm:w-auto`
- Item card: trocar `flex items-start justify-between p-4 gap-3` por `flex flex-col sm:flex-row gap-2 sm:gap-3 p-3 sm:p-4`

---

#### 21. `/sinistro/kanban` — `routes/_app/sinistro/kanban.tsx`
**Problemas:** header `text-lg` sem scaling responsivo; kanban grid `grid-cols-1 ... xl:grid-cols-5` sem `min-w-0` em colunas (overflow visual); barra de filtros sem wrapping.

**Plano:**
- Header: `text-lg sm:text-xl` + `flex flex-col sm:flex-row gap-2`
- Kanban grid: aplicar mesmo padrão do `/dashboard/kanban` (item 7) — `flex` com scroll horizontal em mobile, `grid` em sm+; cada coluna `min-w-[280px] sm:min-w-0`
- Filtros: `flex flex-wrap sm:flex-nowrap items-center gap-2` + selects `w-full sm:w-[180px]`
- Arquivados: já está bom (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`)

---

### CADASTRO

#### 22. `/cadastro` — `routes/_app/cadastro.tsx`
**Componentes delegados:** `VendasPendentesTable`, `InclusoesPendentesTable`, `EndossosPendentesTable`, `VendasPerdidasTable`

**Problemas:** TabsList `grid-cols-3 md:grid-cols-6` (3 visíveis em mobile com labels truncadas); filtros busca + sort em `flex gap-3` com select `w-48` fixo; avatar filter row pode overflow; tabelas delegadas (sem auditoria interna) provavelmente sem dual render.

**Plano:**
- TabsList: manter `grid-cols-3 md:grid-cols-6` + labels com `hidden sm:inline` + ícone permanente; ou usar `Select` em mobile (padrão shadcn pattern)
- Filtros: `flex flex-col sm:flex-row gap-2` + select `w-full sm:w-48`
- Avatar filter: `flex flex-wrap gap-1.5 max-h-20 overflow-y-auto sm:max-h-none`
- **Auditoria pendente:** abrir cada tabela delegada (`*-table.tsx` em `modules/cadastro/`) e aplicar dual render se ainda forem desktop-only

---

### FOOTER

#### 23. `/perfil` — `routes/_app/perfil.tsx`
**Problemas:** avatar section em `flex flex-col sm:flex-row items-start sm:items-center gap-6` (OK), mas badges em `flex-wrap gap-2` quebram landscape estreito; inputs sem `h-10` explícito; Google Calendar card em `justify-between` aperta botão; permissões badges com texto longo.

**Plano:**
- Avatar section: `flex flex-col gap-4 sm:flex-row sm:gap-6 sm:items-start` + badges `flex flex-wrap gap-1.5`
- Inputs: garantir `h-10` ou `h-11 sm:h-10` para hit area
- Google Calendar card: `flex flex-col sm:flex-row sm:items-center gap-3 p-4` + botão `w-full sm:w-auto`
- Permissões: badges `text-xs` + `max-w-full break-words`
- Container: `p-3 sm:p-6`

---

## Ordem de execução sugerida

**Fase 1 — Quick wins (alta cobertura, baixo risco)**
- Padrão global #1, #2, #3, #5 aplicados em todas as rotas (substituições de classe simples)
- Inclui: /dashboard, /meu-desempenho, /metricas, /metricas-dashboard, /dashboard-equipe, /performance, /perfil

**Fase 2 — Tabelas em cards (mobile dual render)**
- /clientes, /produtos, /usuarios, /gestao-crm (oportunidades), /cadastro (4 tabelas delegadas)
- Reaproveitar pattern do `negocios-corretora.tsx` e `vendedores-table.tsx`

**Fase 3 — Side panels e drawers**
- /agenda (sidebar → Sheet)
- /chat (profile panel → Sheet, navegação canais ↔ chat)
- /workspace (header overflow → DropdownMenu mobile)

**Fase 4 — Kanbans com swipe**
- /dashboard/kanban e /sinistro/kanban: scroll horizontal com snap-x em mobile

**Fase 5 — Auditoria fina**
- /sinistro (lista) — substituir group-hover por DropdownMenu
- /importar-renovacoes — popover vendedor → Sheet em xs
- /notificacoes — visibilidade de ações em touch

---

## Verificação

Para cada rota refatorada:
1. `cd apps/web-new && npx tsc --noEmit` — sem erros de tipo
2. DevTools mobile (360×640 e 414×896): sem overflow horizontal, todos os controles clicáveis (target ≥ 36px), modais/popovers respeitam viewport
3. DevTools tablet (768×1024): layout intermediário coerente
4. Desktop: layout inalterado em ≥ 1280px
5. Testar interações específicas: filtros, ações em listas, dropdowns, navegação chat ↔ canais, kanban swipe

---

## Arquivos de referência (padrões já bons)

- `apps/web-new/src/routes/_app/notificacoes.tsx` — header e filtros responsivos
- `apps/web-new/src/routes/_app/negocios-corretora.tsx` — dual render tabela/cards
- `apps/web-new/src/modules/gestao-crm/components/vendedores-table.tsx` — cards mobile com chevron
- `apps/web-new/src/modules/ranking/components/*` — refatorado, layout fullscreen + mobile completo
