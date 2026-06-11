# Resultado das otimizações — rota `/workspace2` (2026-06-11)

Build de produção local após Passos 1–5. Comparar com `baseline/workspace2-bundle-2026-06-11.md`.

## Bundle — caminho crítico da rota

| Item | Antes | Depois | Δ |
|---|---|---|---|
| Chunk da rota workspace2 | `index-CBzIorii.js` **208 kB** | `index-2MWICYOs.js` **68 kB** | **−140 kB (−67%)** |
| `vendor-aggrid` no caminho crítico | **sim** (import estático) | **não** (só no chunk `workspace-grid`, lazy) | removido do FCP/LCP |
| Novos chunks lazy | — | `workspace-grid` 26,8 kB · `cotacao-dialog` 68,2 kB · Kanban via `vendor-dnd`/`kanban-board` | sob demanda |

Verificação: o chunk da rota (`index-2MWICYOs.js`, 6 marcadores workspace2) **não** tem
`import{...}from"./vendor-aggrid-..."`; importa `workspace-grid-*.js` dinamicamente. O ag-grid
(1.115 kB) só carrega quando a grid renderiza, atrás de `<Suspense>`.

## Mudanças por passo

- **Passo 1** — loader não-bloqueante (`ensureQueryData` sem await) + `pendingComponent` em
  `routes/_app/workspace2/index.tsx`. A tela monta na hora com skeletons. → FCP/LCP.
- **Passo 2** — grid extraída para `components/workspace-grid.tsx` (lazy + `memo` + `forwardRef`);
  registro do ag-grid e `themeQuartz`/columnDefs/cell-editors movidos para lá. → −140 kB no chunk da rota.
- **Passo 3** — `WorkspaceKanban`, `ActivityFeed`, `EquipeWorkspaceView` viraram `React.lazy` + Suspense.
- **Passo 4** — `useVendedores`/`useProdutos`/`useSeguradorasParceiras` gateadas com
  `enabled: !loadingRenovacoes` em `use-workspace-data.ts` (saem do fan-out inicial, sem editor vazio).
- **Passo 5** — INP:
  - 5a `startTransition` nas aberturas de dialog (`use-workspace-dialogs.ts`).
  - 5b `gridProps` → handlers memoizados; 5c `WorkspaceGrid` em `memo` (abrir dialog não re-renderiza a grid).
  - 5d `setQueryData(cotacoes())` em `startTransition` no `onDirectUpdate`/`flushCotacaoPatch`
    (`use-workspace-inline-edit.ts`) — tira o rebuild O(linhas) do caminho bloqueante, sem revert.
  - 5e (deferredNameFilter): já estava correto no código (passado a `useWorkspaceData`).
  - 5f `startTransition` na troca de aba (`setActiveTab`) e de view planilha/kanban
    (`handleViewModeChange`) — campo mostrou clique na aba "Novos Seguros" custando 1.216ms de INP
    (monta a 2ª grid). A aba destaca na hora; a montagem da grid sai do caminho bloqueante.

## Verificação ainda pendente (requer app autenticado + Sentry)

- **Smoke test de runtime** (eu não consigo rodar o app autenticado):
  - Grid renova/NS renderiza; seleção múltipla + Transferir; Imprimir; refs do grid funcionam.
  - Edição inline de produto/vendedor/seguradora persiste **sem revert visual**.
  - Selecionar subvendedor no popover "Grupo" funciona.
  - Abrir "Iniciar", clicar célula de Cliente → dialog abre; trocar de aba/view (kanban/logs/equipe).
- **Lighthouse antes/depois** na rota (FCP/LCP) → `perf/lab/`.
- **Sentry CWV pós-deploy**: confirmar LCP/FCP/INP caindo no campo.
