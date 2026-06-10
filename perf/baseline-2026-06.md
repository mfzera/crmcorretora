# Baseline de Performance — Junho 2026 (ANTES)

> Snapshot de referência **antes** das otimizações (Fase 3). Preencher com os
> números p75 de **campo** (Sentry, janela de 5–7 dias) e os de **lab**
> (Lighthouse). Datar a coleta. Este arquivo é a referência fixa para o
> comparativo "antes × depois" — não editar após congelado; criar
> `resultados-pos-fase3.md` para o depois.

- **Janela de coleta:** `<AAAA-MM-DD>` a `<AAAA-MM-DD>`
- **Fonte de campo:** Sentry (env=production)
- **Sample rate na janela:** `SENTRY_TRACES_SAMPLE_RATE=___` / `VITE_SENTRY_TRACES_SAMPLE_RATE=___`
- **Coletado por:** `<nome>`

## Core Web Vitals + API por rota (campo, p75)

| Rota | LCP (ms) | INP (ms) | CLS | FCP (ms) | TTFB (ms) | API p95 (ms) | # requests/nav | Observações |
|---|---|---|---|---|---|---|---|---|
| `/_app/metricas` | | | | | | | | |
| `/_app/ranking` | | | | | | | | |
| `/_app/clientes` | | | | | | | | |
| `/_app/workspace` | | | | | | | | |
| documento-venda-dialog (abertura) | | | | | | | | |

**Alvos (do plano):** LCP < 2500 · INP < 200 · CLS < 0,1 · FCP < 1800 · TTFB < 800 · API p95 < 500.

## Lab — Lighthouse (sintético, throttling 4x CPU / Slow 4G)

| Rota | Performance score | LCP | TBT | CLS | Speed Index | Arquivo JSON |
|---|---|---|---|---|---|---|
| `/_app/metricas` | | | | | | `lab/lighthouse-metricas-____.json` |
| `/_app/ranking` | | | | | | `lab/lighthouse-ranking-____.json` |

## Bundle (do `dist/stats.html`)

> Baseline já capturado no build de 2026-06-10 (deps pesadas isoladas em chunks lazy):

| Chunk | Tamanho (min, não-gzip) | Carregamento |
|---|---|---|
| vendor-aggrid | 1.115 kB | lazy (rotas de grid) |
| particle-field (three.js) | 887 kB | lazy (landing) |
| vendor-charts (recharts) | 414 kB | lazy |
| index-* (entry/rotas) | 209–291 kB | inicial — **investigar** |
| vendor-react | 198 kB | inicial |
| vendor-radix | 166 kB | inicial |

**Snapshot HTML:** `lab/stats-2026-06-10.html` (copiar do build).

## Re-renders (React Profiler) — top ofensores suspeitos

| Componente | # re-renders / interação | Profile |
|---|---|---|
| `documento-venda-dialog.tsx` | | `lab/profile-____.json` |
| `workspace-screen.tsx` | | |
| `cotacoes-ativas-table.tsx` | | |

## Polling simultâneo por tela (contagem de requests recorrentes)

| Tela | Polls ativos | Intervalos |
|---|---|---|
| Métricas | | notificações 15s, label 30s, … |
| Workspace | | lock 10s + 5min, … |
