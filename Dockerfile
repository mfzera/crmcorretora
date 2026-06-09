FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# ── Stage 1: install deps ─────────────────────────────────────────────────────
# Copia apenas os manifests do workspace para que esta camada seja cacheada pelo
# Docker e só seja reinvalidada quando um package.json ou pnpm-lock.yaml mudar.
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ patches/

# apps
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web-new/package.json apps/web-new/
COPY apps/mcp-server/package.json apps/mcp-server/

# libs/features
COPY libs/features/auth/package.json libs/features/auth/
COPY libs/features/cargos/package.json libs/features/cargos/
COPY libs/features/clientes/package.json libs/features/clientes/
COPY libs/features/cotacoes/package.json libs/features/cotacoes/
COPY libs/features/dashboard/package.json libs/features/dashboard/
COPY libs/features/documentos-venda/package.json libs/features/documentos-venda/
COPY libs/features/endossos/package.json libs/features/endossos/
COPY libs/features/equipes/package.json libs/features/equipes/
COPY libs/features/produtos/package.json libs/features/produtos/
COPY libs/features/propostas/package.json libs/features/propostas/
COPY libs/features/renovacoes/package.json libs/features/renovacoes/
COPY libs/features/seguradora/package.json libs/features/seguradora/
COPY libs/features/seguradoras-parceiras/package.json libs/features/seguradoras-parceiras/
COPY libs/features/usuarios/package.json libs/features/usuarios/
COPY libs/features/vendedores/package.json libs/features/vendedores/

# libs/plugins
COPY libs/plugins/admin-auth/package.json libs/plugins/admin-auth/
COPY libs/plugins/auth/package.json libs/plugins/auth/
COPY libs/plugins/authorization/package.json libs/plugins/authorization/
COPY libs/plugins/chat/package.json libs/plugins/chat/
COPY libs/plugins/error-handler/package.json libs/plugins/error-handler/
COPY libs/plugins/quota-validator/package.json libs/plugins/quota-validator/
COPY libs/plugins/rate-limit/package.json libs/plugins/rate-limit/
COPY libs/plugins/tenant-isolation/package.json libs/plugins/tenant-isolation/

# libs/shared
COPY libs/shared/config/package.json libs/shared/config/
COPY libs/shared/database/package.json libs/shared/database/
COPY libs/shared/domain/package.json libs/shared/domain/
COPY libs/shared/storage/package.json libs/shared/storage/
COPY libs/shared/types/package.json libs/shared/types/
COPY libs/shared/utils/package.json libs/shared/utils/

# Filter exclui web-new para não instalar React, Three.js, GSAP, Framer Motion, etc.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter='!@ecotech/web-new' && \
    pnpm rebuild esbuild

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY . .
RUN pnpm exec nx build api

# Instala as ~30 runtime deps fora do workspace (sem pnpm-workspace.yaml),
# reaproveitando o pnpm store já populado pelo stage deps.
RUN mkdir /runtime && \
    cp /app/dist/apps/api/package.json /runtime/ && \
    cd /runtime && \
    pnpm install --ignore-scripts

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=4096

COPY --from=builder /runtime/node_modules ./node_modules
COPY --from=builder /app/dist/apps/api/main.js ./
COPY --from=builder /app/dist/apps/api/libs ./libs

CMD ["node", "main.js"]
