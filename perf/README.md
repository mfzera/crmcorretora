# Performance — coleta e armazenamento de dados

Iniciativa **measurement-first**: coletar evidência real antes de otimizar.

> Nota: a pasta raiz `docs/` é gitignored neste repo. Por isso os artefatos de
> performance versionados moram aqui em `perf/` (raiz, versionável).

## Onde cada dado mora

| Tipo | Fonte | Armazenamento | Retenção |
|---|---|---|---|
| Campo (RUM) — CWV, INP, traces de API | Sentry + Cloudflare Web Analytics | Dashboard do provedor | ~30–90 dias (plano) |
| Métricas HTTP ao vivo (2xx/4xx/5xx) | Redis `admin:http:*` | Redis | **25h (efêmero)** |
| Lab — Lighthouse, bundle, React Profiler | Arquivos | `perf/lab/` | permanente (versionado) |
| **Baseline/snapshot** (antes × depois) | extraído do Sentry | `perf/baseline-*.md` | permanente (versionado) |

O markdown versionado é o que torna o "antes × depois" auditável **mesmo após o
Sentry expirar** os dados brutos.

## Como os dados chegam até a análise

- **Lab** → arquivo no git (`perf/lab/`): lido e resumido direto dos arquivos.
- **Campo (Sentry)** → precisa de **token de API do Sentry** (consulta via API)
  **ou** exportação manual (CSV/colar) para preencher o baseline. Não há acesso
  vivo ao dashboard por padrão.

## Como gerar os artefatos de lab

```bash
# Lighthouse (JSON diffável) — repetir por rota e por data
npx lighthouse "<url-da-rota>" \
  --preset=desktop --throttling.cpuSlowdownMultiplier=4 \
  --output=json --output-path=perf/lab/lighthouse-<rota>-<AAAA-MM-DD>.json

# Bundle — copiar o stats gerado no build com data
pnpm exec nx build web-new && cp apps/web-new/dist/stats.html perf/lab/stats-<AAAA-MM-DD>.html

# React Profiler — exportar o profile (.json) pelo DevTools → perf/lab/
```

## Janela de diagnóstico (densificar amostragem)

Durante a coleta, subir a amostragem do Sentry por env (reverter depois):

```
# backend
SENTRY_TRACES_SAMPLE_RATE=0.5
# frontend
VITE_SENTRY_TRACES_SAMPLE_RATE=0.5
```

`Server-Timing: total;dur=<ms>` já é enviado em todo response da API (visível em
DevTools → Network → Timing, e legível via PerformanceObserver no RUM).
