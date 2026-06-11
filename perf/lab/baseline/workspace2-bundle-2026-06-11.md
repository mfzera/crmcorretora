# Baseline de bundle — rota `/workspace2` (2026-06-11)

Build de produção local (`vite build`, sem `CF_PAGES_BRANCH`), `built in 1m12s`.
Snapshot do treemap: `stats-2026-06-11.html` (neste diretório).
Tamanhos em **minificado, não-gzip** (o build roda com `reportCompressedSize: false`).

## Chunk da rota workspace2

| Item | Chunk | Tamanho | Carregamento |
|---|---|---|---|
| Rota `/workspace2` | `index-CBzIorii.js` | **208 kB** | inicial da rota |
| ag-grid (importado **estaticamente** pela rota) | `vendor-aggrid-BKX5iI5b.js` | **1.115 kB** | dispara junto com a rota |

> Identificação: `index-CBzIorii.js` contém 6 marcadores exclusivos do workspace2
> (`novos-seguros`, `planilha-renovacoes`, `cotacoesAtivas`, `workspace:viewMode`) e tem
> `import{...}from"./vendor-aggrid-..."` (estático, **não** `import(...)` dinâmico).
> O chunk `index-C4J4Sakq.js` (248 kB) é a rota antiga `/workspace`, não esta.

## Vendors no caminho inicial (compartilhados)

| Chunk | Tamanho |
|---|---|
| vendor-react | 197,6 kB |
| vendor-radix | 166,0 kB |
| vendor-tanstack | 143,1 kB |
| vendor-motion | 135,9 kB |
| vendor-icons | 55,2 kB |

## Confirmações vs. plano

- **Passo 2 confirmado:** a rota workspace2 importa `vendor-aggrid` (1.115 kB) **estaticamente** →
  download + parse de ~1,3 MB de JS antes da rota renderizar. Excluído do modulepreload
  (`vite.config.ts:103`), mas o import estático ainda o torna dependência de execução do chunk.
- **Sentry já fora do crítico:** chunk `sentry-DM3DKoYn.js` = 469,8 kB, carregado via dynamic
  import (commit `ef8c465f`) — não no caminho inicial. ✓
- **Lazy chunks corretos:** `particle-field` 886,8 kB (landing) e `vendor-charts` 413,9 kB (rotas app) isolados. ✓

## Pendente (Fase 0 de campo — requer sessão autenticada)

- 0.2 Lighthouse autenticado na rota (LCP element, waterfall do loader vs FCP, script-eval breakdown)
- 0.3 React Profiler numa edição inline (confirmar cadeia `todasCotacoes → allRowsRen → rowsRen`)
- 0.4 Server-Timing `total;dur` das 2 chamadas bloqueantes (separar tempo Railway de rede)
