# Plano de Melhoria UI/UX — EcoTech CRM

**Objetivo:** Transformar o app de uma interface funcional para um produto de alto padrão visual —
landing page visual/marketing-first, dashboards com hierarquia clara, filtros simples e
carga cognitiva mínima. Regra de ouro: entender em 5s, encontrar problema em 15s, decidir em 1min.

---

## Decisões Arquiteturais

| Decisão | Escolha | Motivo |
|---|---|---|
| KPI Card canônico | `src/core/ui/kpi-card.tsx` | Único no layer `core/ui`; mais rico em props; `DashboardKpiCard` será aposentado na Fase 2 |
| Filtros canônicos | `FilterToolbar` (em `metricas-filtros.tsx`) | Padrão inline correto; legado `MetricasFiltros` mantido só em renovacoes |
| Deduplicação de dashboards | `DashboardContent` único com `roleContext` | `metricas-dashboard` e `dashboard-equipe` eram cópias; qualquer melhoria precisava ser feita 2x |
| `formatCurrency` | `src/core/utils/format-currency.ts` | Existia em 4+ locais com pequenas variações; `metricas-utils.ts` agora re-exporta daqui |
| `PeriodoPreset` | `src/core/utils/period-presets.ts` | Lógica de preset duplicada em `metricas/index.tsx` e `MetricasFiltros` |

---

## Fase 1 — Fundação e Ganhos Rápidos ✅ CONCLUÍDA

**Entrega:** Duplicações removidas, padrões estabelecidos, KPIs reduzidos.

### 1.1 — Deduplicar os dois dashboards
**Novos arquivos:**
- `src/modules/metricas-dashboard/utils.ts` — `calcDelta`, `CLOSED_STATUSES`
- `src/modules/metricas-dashboard/components/dashboard-content.tsx` — componente unificado com `roleContext: 'corretora' | 'gestor'`

**Arquivos modificados (viram wrappers ~25 linhas):**
- `src/routes/_app/metricas-dashboard.tsx`
- `src/routes/_app/dashboard-equipe.tsx`

### 1.2 — Reduzir contagem de KPIs
- **`metricas-dashboard` + `dashboard-equipe`:** 7/6 → **5 cards** (Prêmio · Comissão mesclada · Clientes · Renovação · Pipeline)
- **`metricas/index.tsx`:** 8 → **6 cards**, linha única, hierarquia: receita → alertas → risco
  - Removido: "Ticket Médio", "Clientes Ativos" (info movida para footers)
  - Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`

### 1.3 — `formatCurrency` unificado
**Novo arquivo:** `src/core/utils/format-currency.ts`
- `formatCurrency` — padrão com decimais
- `formatCurrencyCompact` — sem decimais
- `formatCurrencyBR` — R$ 124.582 (sem decimais para valores ≥ 1.000)
- `formatCurrencyShort` — R$ 124k / R$ 1.2M para espaços compactos

### 1.4 — Skeleton nos selects do FilterToolbar
`metricas-filtros.tsx`: Selects de Vendedor, Seguradora e Produto mostram `<Skeleton>` pulsante enquanto o query está em loading — elimina layout shift e tela vazia.

### 1.5 — Period presets compartilhado
**Novo arquivo:** `src/core/utils/period-presets.ts`
- `PeriodoPreset` (tipo)
- `PERIODO_PRESETS` (array canônico)
- `PERIODO_LABELS` (labels em pt-BR)
- `applyPreset(preset) → { dataInicio, dataFim }`

---

## Fase 2 — Redesign dos Dashboards (Semanas 4–7) ✅ CONCLUÍDA

**Objetivo:** Hierarquia visual, números como protagonistas, filtros preset-first.

### 2.1 — Novo variant `'metric'` no `KpiCard`
**Arquivo:** `src/core/ui/kpi-card.tsx`

Adicionar `variant: 'metric'` com:
- Número dominante `text-2xl font-bold tabular-nums`
- Badge de trend compacta (chip colorido com seta) abaixo do número
- Goal bar: linha de 2px na base da célula (não seção separada)
- Prop `sparkline?: number[]` → mini `AreaChart` 40×20px Recharts no canto superior direito
- Strip de 5 células separadas por dividers 1px dentro de um card — sem bordas individuais

Aposentar `DashboardKpiCard` após migrar todos os callsites.

### 2.2 — Redesign dos 3 painéis de insight
**PipelineHealthStrip:**
- Headline com total ("23 negócios · R$ 480k")
- Barras com valor monetário compacto como label
- "Valor em risco" como chip amber na base

**SeguradorasMixChart:**
- Legenda com total premium por seguradora
- Nomes truncados com tooltip

**VendedoresRankingTable:**
- Coluna de posição (#1, #2...)
- Linhas clicáveis → drill-down (já suportado pelo `onVendedorClick`)
- Mini progress bar de taxa de renovação por vendedor

### 2.3 — AlertsCompactStrip semântico
- `border-l-2` amber/vermelho quando `total > 0`
- Tokens semânticos em vez de classes Tailwind ad-hoc
- Empty state: "Todas as renovações estão em dia"

### 2.4 — Filtros em 2 camadas (preset-first)
**Arquivo:** `metricas-filtros.tsx` → `FilterToolbar`

- **Camada 1 (sempre visível):** botões preset (Este mês / 3m / 6m / 12m) + botão "Filtros avançados" com badge de contagem quando ativos
- **Camada 2 (toggle):** date range, Vendedor, Seguradora, Produto, Status, Comparação
- Estado do toggle persiste em `sessionStorage`

### 2.5 — Tipografia numérica consistente
- Classe CSS `.tabular-num-display` com `font-variant-numeric: tabular-nums`
- Aplicada consistentemente em todos os valores KPI (`tabular-nums` existia só no `DashboardKpiCard`)

---

## Fase 3 — Landing Page: Marketing-First (Semanas 8–11)

**Objetivo:** Converter corretores de seguros, não impressionar devs.

### 3.1 — Hero: 2 colunas + mockup do produto
**Arquivo:** `src/components/landing/hero.tsx`

- **Esquerda:** texto/CTAs (existente, inalterado)
- **Direita:** frame de browser estilizado com screenshot do dashboard de métricas
- `position: sticky` com sombra e borda para parecer browser real
- Social proof: "X corretoras ativas · R$ X em prêmios gerenciados" abaixo dos badges
- Remover anotações técnicas (`HERO_SECTION_01`, `min-h-screen.particles`)
- Remover `MagneticButton` dos CTAs (efeito legal, zero conversão)
- Iframe de partículas: `loading="lazy"` + skip se `navigator.hardwareConcurrency <= 4`

### 3.2 — Features: abas em vez de sticky scroll 380vh
**Arquivo:** `src/components/landing/features.tsx`

- 380vh de sticky scroll ≈ 3.000px de scroll → usuário perde metade dos features
- Substituir por **abas verticais + painel animado:**
  - Coluna esquerda: lista de 8 features (tabs)
  - Coluna direita: painel de detalhe com `AnimatePresence`
  - Seção inteira cabe em 1 viewport
- Mobile: accordion (já existe em `MobileFeatures`, manter)

### 3.3 — HowItWorks: 3 colunas em vez de pan horizontal 240vh
**Arquivo:** `src/components/landing/how-it-works.tsx`

- 3 steps em grid 3-col com linha conector estática (SVG neon)
- Redução: `240vh` → `py-24` seção única
- Mobile: stagger vertical (já existe, manter)

### 3.4 — Pricing: gradiente dark→light + limpeza de performance
**Arquivo:** `src/components/landing/pricing-preview.tsx`

- Overlay de 80px `#000 → var(--background)` na base da seção escura
- Remover 3 orbs animados com `blur: size * 0.45` (pesados em mobile)
- Corrigir inconsistência: `SEMESTRAL` no `PLAN_ORDER` mas não renderizado no toggle

### 3.5 — CTA: copy orientado a resultado
**Arquivo:** `src/components/landing/cta.tsx`

- Headline: "Sua corretora organizada em 7 dias"
- Body: "Centralizar clientes, renovações e comissões. Começar hoje leva menos de 10 minutos."
- Botão secundário: "Ver demonstração" (substitui "Falar conosco")
- Reduzir orbs de 3 para 1 com blur menor (`size * 0.3`)

### 3.6 — Stats section
**Arquivo:** `src/components/landing/stats.tsx` (implementar)
- Strip entre Hero e Features: corretoras ativas, apólices gerenciadas, etc.
- Dados estáticos inicialmente, hook para live numbers no futuro

---

## Fase 4 — Métricas Avançadas e Mobile (Semanas 12–16) ✅ CONCLUÍDA

### 4.1 — Sparklines nos KPI cards
**Arquivos:** `core/ui/kpi-card.tsx` + `dashboard-content.tsx`
- `useMetricasEvolucao` → últimos 8 pontos → prop `sparkline` dos cards
- `AreaChart` 40×20px sem eixos, cor segue direção do trend

### 4.2 — Health Score Card
**Novo arquivo:** `modules/metricas-dashboard/components/health-score-card.tsx`
- Score 0–100 ponderado: renovação (40%) + cotações paradas (30%) + clientes ativos (30%)
- Gauge com `RadialBarChart` (Recharts) + 3 chips de subfator
- Verde ≥70 / Amber 50–69 / Vermelho <50
- Substitui slot do "Convertido (Kanban)" removido na Fase 1

### 4.3 — Empty states em todos os componentes
**Arquivos:** `VendedoresRankingTable`, `PipelineHealthStrip`, `RankingVendedores`
- Mensagem contextual + link CTA ("Ir para o Pipeline →")

### 4.4 — Mobile: grid 2 colunas para KPIs
- `grid-cols-2` em mobile (atual colapsa para 1 — desperdício de espaço)
- `FilterToolbar` avançado em bottom `Sheet` no mobile (componente já existe em `core/ui/sheet.tsx`)

### 4.5 — Persistência de filtros
**Novo arquivo:** `modules/metricas/hooks/use-metricas-filtros.ts`
- Filtros persistem em `sessionStorage`
- Restaurados ao voltar do drill-down de vendedor

---

## Fase 5 — Qualidade, Acessibilidade, Performance (Semanas 17–20) ✅ CONCLUÍDA

### 5.1 — Tokens semânticos de status
**Arquivo:** `src/styles/globals.css`
- Definir `--status-positive`, `--status-negative`, `--status-alert`, `--status-neutral`
- Substituir `amber-500`, `emerald-500`, `red-500` ad-hoc nos componentes de dashboard

### 5.2 — Bundle de charts: lazy individual
- Lazy-load de cada tipo de chart individualmente em `metricas-tabs.tsx` e `metricas-graficos.tsx`

### 5.3 — Acessibilidade dos charts
- `role="img"` + `aria-label` em todos os `ChartContainer`
- Parágrafo `sr-only` com resumo dos dados principais

### 5.4 — Landing page: Three.js condicional
**Arquivo:** `src/components/landing/hero.tsx`
- Skip iframe de partículas se `navigator.hardwareConcurrency <= 4`
- `loading="lazy"` no iframe (não bloqueia LCP)

---

## Resumo de Entrega por Fase

| Fase | Semanas | Entrega | Risco | Status |
|---|---|---|---|---|
| 1 | 1–3 | Deduplicação, shared utils, KPIs reduzidos | Baixo | ✅ Concluída |
| 2 | 4–7 | Dashboard completamente redesenhado | Médio | ✅ Concluída |
| 3 | 8–11 | Landing page que converte | Baixo (arquivos isolados) | Pendente |
| 4 | 12–16 | Sparklines, Health Score, mobile, persistência | Médio | ✅ Concluída |
| 5 | 17–20 | Tokens, acessibilidade, performance | Baixo | ✅ Concluída |

> Fases 2 e 3 podem correr **em paralelo** — não compartilham arquivos.

---

## Arquivos Modificados na Fase 2

| Arquivo | Tipo | Propósito |
|---|---|---|
| `src/core/ui/kpi-card.tsx` | Modificado | Novo variant `'metric'`: número dominante, sparkline, trend badge, goal bar |
| `src/styles/globals.css` | Modificado | Classe `.tabular-num-display` com `font-variant-numeric: tabular-nums` |
| `src/modules/metricas-dashboard/components/pipeline-health-strip.tsx` | Modificado | Headline com total, chip "em aberto", empty state com link para kanban |
| `src/modules/metricas-dashboard/components/seguradoras-mix-chart.tsx` | Modificado | Legenda com totais + `RadixTooltip` em nomes truncados, tooltip customizado |
| `src/modules/metricas-dashboard/components/vendedores-ranking-table.tsx` | Modificado | Linhas clicáveis, dual progress bar (prêmio + renovação), `ArrowRight` drill-down |
| `src/modules/metricas-dashboard/components/alerts-compact-strip.tsx` | Modificado | `border-l-2` semântico por tipo, empty state "Todas em dia" com `CheckCircle2` |
| `src/modules/metricas/components/metricas-filtros.tsx` | Modificado | FilterToolbar 2 camadas: presets sempre visíveis + advanced com badge de contagem |

---

## Arquivos Criados na Fase 1

| Arquivo | Tipo | Propósito |
|---|---|---|
| `src/core/utils/format-currency.ts` | Novo | `formatCurrency`, `formatCurrencyBR`, `formatCurrencyShort` |
| `src/core/utils/period-presets.ts` | Novo | `PeriodoPreset`, `applyPreset`, `PERIODO_LABELS` |
| `src/modules/metricas-dashboard/utils.ts` | Novo | `calcDelta`, `CLOSED_STATUSES` |
| `src/modules/metricas-dashboard/components/dashboard-content.tsx` | Novo | Dashboard unificado com `roleContext` |
| `src/routes/_app/metricas-dashboard.tsx` | Refatorado | Wrapper fino ~25 linhas |
| `src/routes/_app/dashboard-equipe.tsx` | Refatorado | Wrapper fino ~55 linhas |
| `src/routes/_app/metricas/index.tsx` | Refatorado | 8 → 6 KPIs, usa `period-presets` |
| `src/modules/metricas/components/metricas-filtros.tsx` | Modificado | Skeleton nos 3 selects de dimensão |
| `src/modules/metricas/components/metricas-utils.ts` | Modificado | Re-exporta de `core/utils` em vez de duplicar |
