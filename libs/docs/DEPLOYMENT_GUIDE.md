# Guia de Deploy - Ecosistema Seguros

**Versão:** 1.0  
**Última Atualização:** 04 de Fevereiro de 2026  
**Ambiente:** Produção

---

## 📋 Índice

1. [Arquitetura do Sistema](#arquitetura-do-sistema)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Pré-requisitos](#pré-requisitos)
4. [Configuração de Infraestrutura](#configuração-de-infraestrutura)
5. [Deploy do Frontend (Vercel)](#deploy-do-frontend-vercel)
6. [Deploy do Backend (Fly.io)](#deploy-do-backend-flyio)
7. [Configuração do Banco de Dados (Neon)](#configuração-do-banco-de-dados-neon)
8. [Configuração do S3 (Cloudflare R2)](#configuração-do-s3-cloudflare-r2)
9. [Configuração do Redis (Upstash/Redis Cloud)](#configuração-do-redis-upstash-redis-cloud)
10. [Variáveis de Ambiente](#variáveis-de-ambiente)
11. [CI/CD e Automação](#cicd-e-automação)
12. [Monitoramento e Logs](#monitoramento-e-logs)
13. [Troubleshooting](#troubleshooting)
14. [Checklist de Deploy](#checklist-de-deploy)

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                         USUÁRIO                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (Vercel)                          │
│  - Next.js 16 (App Router)                                  │
│  - React 19                                                 │
│  - Tailwind CSS                                             │
│  - Framer Motion                                            │
│  - Stripe SDK                                               │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/WSS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Fly.io)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API (Fastify)                                      │   │
│  │  - REST API                                         │   │
│  │  - WebSocket                                        │   │
│  │  - JWT Auth                                         │   │
│  │  - Rate Limiting                                    │   │
│  │  - Scalar/OpenAPI Docs                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Worker (BullMQ)                                    │   │
│  │  - Background Jobs                                  │   │
│  │  - Email Processing                                 │   │
│  │  - PDF Generation                                   │   │
│  │  - Data Exports                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└────┬──────────────────┬──────────────────┬─────────────────┘
     │                  │                  │
     ▼                  ▼                  ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────────┐
│  PostgreSQL │  │    Redis    │  │  Cloudflare R2  │
│    (Neon)   │  │  (Upstash)  │  │   (S3 Storage)  │
│             │  │             │  │                 │
│  - Drizzle  │  │  - Cache    │  │  - Avatars      │
│  - Multi-   │  │  - Sessions │  │  - Documents    │
│    tenant   │  │  - Queue    │  │  - Exports      │
└─────────────┘  └─────────────┘  └─────────────────┘
```

---

## 🛠️ Stack Tecnológica

### Frontend
- **Framework:** Next.js 16 (App Router)
- **React:** 19.2.3
- **Styling:** Tailwind CSS + CVA
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod
- **State:** React Context + TanStack Virtual
- **Payments:** Stripe SDK
- **Deploy:** Vercel

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Fastify 4
- **ORM:** Drizzle ORM
- **Validation:** Zod
- **Auth:** JWT (@fastify/jwt)
- **WebSocket:** @fastify/websocket
- **Jobs:** BullMQ
- **API Docs:** Scalar/OpenAPI
- **Deploy:** Fly.io

### Database & Storage
- **Database:** PostgreSQL (Neon)
- **Cache/Queue:** Redis (Upstash/Redis Cloud)
- **Object Storage:** Cloudflare R2 (S3-compatible)

### External Services
- **Payments:** Stripe
- **Email:** (A configurar - Resend/SendGrid)
- **Monitoring:** (A configurar - Sentry/LogRocket)

---

## ✅ Pré-requisitos

### Ferramentas Locais
```bash
# Node.js e pnpm
node --version  # >= 20.0.0
pnpm --version  # >= 8.0.0

# CLI Tools
npm install -g vercel    # Vercel CLI
npm install -g flyctl    # Fly.io CLI
npm install -g drizzle-kit  # Drizzle CLI
```

### Contas Necessárias
- [ ] Conta Vercel (https://vercel.com)
- [ ] Conta Fly.io (https://fly.io)
- [ ] Conta Neon (https://neon.tech)
- [ ] Conta Cloudflare (https://cloudflare.com)
- [ ] Conta Upstash ou Redis Cloud (https://upstash.com)
- [ ] Conta Stripe (https://stripe.com)

---

## 🔧 Configuração de Infraestrutura

### 1. Neon (PostgreSQL)

#### 1.1 Criar Projeto
```bash
# Acesse https://console.neon.tech
# Clique em "Create Project"
# Região: Escolha a mais próxima (ex: US East, EU West)
# Nome: ecotech-production
```

#### 1.2 Obter Connection String
```bash
# No dashboard do Neon, copie a connection string:
# Format: postgresql://user:password@host/database?sslmode=require

# Exemplo:
DATABASE_URL="postgresql://neondb_owner:XXXX@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

#### 1.3 Configurar Pooling (Opcional mas Recomendado)
```bash
# Neon oferece connection pooling nativo
# Use a connection string com "-pooler" para ambientes serverless

# Pooler Connection String (para API):
DATABASE_URL="postgresql://user:password@host-pooler/database?sslmode=require"

# Direct Connection String (para migrações):
DIRECT_DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

#### 1.4 Configurar Backups
- Neon faz backups automáticos
- Configure Point-in-Time Recovery (PITR) no dashboard
- Retenção recomendada: 7-30 dias

---

### 2. Cloudflare R2 (Object Storage)

#### 2.1 Criar Bucket
```bash
# Acesse Cloudflare Dashboard > R2
# Clique em "Create bucket"
# Nome: ecotech-storage
# Região: Automatic (global)
```

#### 2.2 Gerar API Tokens
```bash
# R2 > Manage R2 API Tokens > Create API Token
# Permissions: Object Read & Write
# Copie as credenciais:

R2_ACCOUNT_ID="your_account_id"
R2_ACCESS_KEY_ID="your_access_key"
R2_SECRET_ACCESS_KEY="your_secret_key"
R2_BUCKET_NAME="ecotech-storage"
R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"  # Se configurar public access
```

#### 2.3 Configurar Public Access (Opcional)
```bash
# Para arquivos públicos (avatares, etc)
# R2 > seu-bucket > Settings > Public Access
# Habilite "Allow public access"
# Configure custom domain se necessário
```

#### 2.4 Configurar CORS
```json
// No Cloudflare R2 > Settings > CORS Policy
[
  {
    "AllowedOrigins": [
      "https://seu-dominio.com",
      "https://*.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

### 3. Upstash Redis (Cache & Queue)

#### 3.1 Criar Database
```bash
# Acesse https://console.upstash.com
# Create Database
# Name: ecotech-cache
# Type: Regional (escolha região próxima ao backend)
# Eviction: allkeys-lru (para cache)
```

#### 3.2 Obter Credenciais
```bash
# No dashboard do Redis, copie:

REDIS_URL="rediss://:password@endpoint:port"
# Ou
REDIS_HOST="endpoint"
REDIS_PORT="6379"
REDIS_PASSWORD="password"
REDIS_TLS="true"
```

#### 3.3 Configurar TTL (Time To Live)
```bash
# Para cache:
DEFAULT_CACHE_TTL=3600  # 1 hora

# Para sessions:
SESSION_TTL=86400  # 24 horas

# Para rate limiting:
RATE_LIMIT_WINDOW=60  # 1 minuto
```

---

### 4. Stripe (Pagamentos)

#### 4.1 Configurar Conta
```bash
# Acesse https://dashboard.stripe.com
# Complete o onboarding
# Configure produtos e preços em "Products"
```

#### 4.2 Obter API Keys
```bash
# Developers > API keys

# Test Mode (para desenvolvimento):
STRIPE_PUBLISHABLE_KEY="pk_test_xxxxx"
STRIPE_SECRET_KEY="sk_test_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"

# Production Mode:
STRIPE_PUBLISHABLE_KEY="pk_live_xxxxx"
STRIPE_SECRET_KEY="sk_live_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
```

#### 4.3 Configurar Webhooks
```bash
# Developers > Webhooks > Add endpoint
# URL: https://api.seu-dominio.com/api/webhooks/stripe
# Events:
#   - checkout.session.completed
#   - customer.subscription.created
#   - customer.subscription.updated
#   - customer.subscription.deleted
#   - invoice.payment_succeeded
#   - invoice.payment_failed
```

#### 4.4 Criar Produtos
```bash
# Products > Add product
# Exemplo de estrutura:

# Produto: Ecosistema Seguros - Starter
# Price: R$ 29/usuário/mês
# Billing: Recurring, monthly
# Price ID: price_xxxxx (copie para variável de ambiente)
```

---

## 🚀 Deploy do Frontend (Vercel)

### 5.1 Conectar Repositório

#### Via Vercel Dashboard
```bash
# 1. Acesse https://vercel.com/new
# 2. Import Git Repository
# 3. Selecione seu repositório GitHub/GitLab/Bitbucket
# 4. Configure as opções:
```

#### Configurações do Projeto (IMPORTANTE)
```yaml
Framework Preset: Next.js
Root Directory: apps/web  # ← Definir o diretório raiz como apps/web
# Os comandos no vercel.json já incluem "cd ../.." então NÃO repita aqui
Node Version: 20.x

# NOTA: Com vercel.json presente, esses comandos são opcionais:
# O arquivo vercel.json (em apps/web/) já define os comandos corretos
```

**⚠️ ATENÇÃO:** Se você configurar `Root Directory: apps/web` no Vercel Dashboard, o arquivo `vercel.json` deve estar em `apps/web/vercel.json` e os comandos devem usar `cd ../..` para voltar à raiz do monorepo

#### Via Vercel CLI
```bash
# No diretório raiz do monorepo:
cd apps/web
vercel

# Responda as perguntas:
# Set up and deploy "~/ecotech-sys/apps/web"? Y
# Which scope? (selecione sua conta/team)
# Link to existing project? N
# What's your project's name? ecotech-web
# In which directory is your code located? ./
# Override settings? Y
# Build Command: cd ../.. && pnpm nx build web
# Output Directory: ../../dist/apps/web/.next
# Development Command: cd ../.. && pnpm nx dev web
```

### 5.2 Configurar Variáveis de Ambiente

#### Via Vercel Dashboard
```bash
# Settings > Environment Variables
# Adicione as seguintes variáveis:
```

#### Variáveis do Frontend
```bash
# API Connection
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com
NEXT_PUBLIC_WS_URL=wss://api.seu-dominio.com

# Stripe (Public Keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# App Config
NEXT_PUBLIC_APP_NAME=Ecosistema Seguros
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# Analytics (opcional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

#### Configurar por Ambiente
```bash
# Production: Usar valores de produção
# Preview: Usar valores de staging/test
# Development: Usar valores locais
```

### 5.3 Configurar Domínio Customizado

```bash
# Settings > Domains
# Add Domain: seu-dominio.com
# Configure DNS:

# Tipo A Record:
# Name: @
# Value: 76.76.21.21 (Vercel IP)

# Tipo CNAME:
# Name: www
# Value: cname.vercel-dns.com

# Aguarde propagação DNS (até 48h, geralmente < 1h)
```

### 5.4 Deploy

```bash
# Via Git (automático):
git push origin main  # Deploys automaticamente

# Via CLI (manual):
vercel --prod

# Rollback (se necessário):
vercel rollback
```

### 5.5 Configurações Adicionais do Vercel

#### IMPORTANTE: Configuração para Monorepo Nx

Como este é um monorepo usando Nx, o arquivo `vercel.json` DEVE estar localizado em `apps/web/vercel.json` (não na raiz).

**Estrutura correta:**
```
ecotech-sys/
  apps/
    web/
      vercel.json    ← Arquivo de configuração aqui
      next.config.js
      package.json
      src/
  package.json
  nx.json
```

#### vercel.json (apps/web/vercel.json) ✅
```json
{
  "buildCommand": "cd ../.. && pnpm nx build web",
  "devCommand": "cd ../.. && pnpm nx dev web",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

**Explicação dos comandos:**
- `cd ../..`: Navega para a raiz do monorepo (necessário para acessar workspace packages)
- `pnpm nx build web`: Executa o build usando Nx (que tem acesso a todas as libs compartilhadas)
- `outputDirectory: ".next"`: Relativo a `apps/web`, onde Next.js gera o build

#### next.config.js (apps/web)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Para otimizar bundle
  images: {
    domains: [
      'pub-xxxxx.r2.dev', // Cloudflare R2
      'ecotech-storage.r2.dev'
    ],
    formats: ['image/avif', 'image/webp']
  },
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL
  }
}

module.exports = nextConfig
```

---

## 🐳 Deploy do Backend (Fly.io)

### 6.1 Preparar Aplicação

#### Criar Dockerfile (apps/api/Dockerfile)
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY libs ./libs

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api ./apps/api
COPY nx.json tsconfig.base.json ./

# Build application
RUN pnpm nx build api

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy built application
COPY --from=builder /app/dist/apps/api ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run as non-root user
USER node

EXPOSE 3000

CMD ["node", "main.js"]
```

#### Criar .dockerignore (apps/api)
```
node_modules
dist
.env
.env.*
*.log
.git
.nx
tmp
coverage
```

### 6.2 Configurar Fly.io

#### Instalar CLI
```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Ou via brew
brew install flyctl

# Verificar instalação
flyctl version
```

#### Login e Criar App
```bash
# Login
flyctl auth login

# Criar app (no diretório apps/api)
cd apps/api
flyctl launch

# Responda as perguntas:
# App Name: ecotech-api (ou deixe gerar)
# Region: gru (São Paulo) ou iad (US East)
# PostgreSQL: No (já temos Neon)
# Redis: No (já temos Upstash)
# Deploy now: No (vamos configurar antes)
```

#### fly.toml (apps/api/fly.toml)
```toml
app = "ecotech-api"
primary_region = "gru"  # São Paulo

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

  [http_service.concurrency]
    type = "connections"
    hard_limit = 250
    soft_limit = 200

  [[http_service.checks]]
    interval = "30s"
    timeout = "5s"
    grace_period = "10s"
    method = "GET"
    path = "/health"

[[services]]
  protocol = "tcp"
  internal_port = 3000

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 250
    soft_limit = 200

[[vm]]
  size = "shared-cpu-1x"  # 1 vCPU, 256 MB RAM
  # Para produção, considere: shared-cpu-2x ou dedicated-cpu-1x

[metrics]
  port = 9091
  path = "/metrics"
```

### 6.3 Configurar Variáveis de Ambiente

```bash
# Database
flyctl secrets set DATABASE_URL="postgresql://..."
flyctl secrets set DIRECT_DATABASE_URL="postgresql://..."

# Redis
flyctl secrets set REDIS_URL="rediss://..."

# JWT
flyctl secrets set JWT_SECRET="$(openssl rand -base64 32)"
flyctl secrets set JWT_EXPIRES_IN="24h"

# Stripe
flyctl secrets set STRIPE_SECRET_KEY="sk_live_xxxxx"
flyctl secrets set STRIPE_WEBHOOK_SECRET="whsec_xxxxx"

# AWS S3 / Cloudflare R2
flyctl secrets set R2_ACCOUNT_ID="xxxxx"
flyctl secrets set R2_ACCESS_KEY_ID="xxxxx"
flyctl secrets set R2_SECRET_ACCESS_KEY="xxxxx"
flyctl secrets set R2_BUCKET_NAME="ecotech-storage"
flyctl secrets set R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"

# CORS
flyctl secrets set CORS_ORIGIN="https://seu-dominio.com,https://www.seu-dominio.com"

# App Config
flyctl secrets set APP_URL="https://api.seu-dominio.com"
flyctl secrets set FRONTEND_URL="https://seu-dominio.com"

# Verificar secrets
flyctl secrets list
```

### 6.4 Deploy da API

```bash
# Deploy inicial
flyctl deploy

# Acompanhar logs
flyctl logs

# Verificar status
flyctl status

# Abrir app no browser
flyctl open

# Verificar health
curl https://ecotech-api.fly.dev/health
```

### 6.5 Configurar Domínio Customizado

```bash
# Adicionar certificado SSL
flyctl certs add api.seu-dominio.com

# Configure DNS (no seu provedor):
# Tipo CNAME:
# Name: api
# Value: ecotech-api.fly.dev

# Verificar certificado
flyctl certs show api.seu-dominio.com

# Testar
curl https://api.seu-dominio.com/health
```

### 6.6 Escalar Aplicação

```bash
# Ver configuração atual
flyctl scale show

# Escalar verticalmente (mais recursos por máquina)
flyctl scale vm shared-cpu-2x  # 2 vCPU, 512 MB RAM
flyctl scale vm dedicated-cpu-1x  # 1 dedicated vCPU, 2 GB RAM

# Escalar horizontalmente (mais máquinas)
flyctl scale count 2  # 2 instâncias
flyctl scale count 3 --region gru  # 3 em São Paulo
flyctl scale count 2 --region iad  # 2 em US East (multi-region)

# Auto-scaling (Fly.io Pro)
flyctl autoscale set min=1 max=5

# Verificar
flyctl status
```

---

## 🔄 Deploy do Worker (Fly.io)

### 7.1 Criar Worker App

#### Dockerfile (apps/worker/Dockerfile)
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY libs ./libs

RUN pnpm install --frozen-lockfile

COPY apps/worker ./apps/worker
COPY nx.json tsconfig.base.json ./

RUN pnpm nx build worker

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

COPY --from=builder /app/dist/apps/worker ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER node

CMD ["node", "main.js"]
```

#### fly.toml (apps/worker/fly.toml)
```toml
app = "ecotech-worker"
primary_region = "gru"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"

# Sem HTTP service (worker apenas processa jobs)
[processes]
  worker = "node main.js"

[[vm]]
  size = "shared-cpu-1x"
```

### 7.2 Deploy do Worker

```bash
cd apps/worker

flyctl launch --name ecotech-worker

# Configurar as mesmas secrets da API:
flyctl secrets set DATABASE_URL="..."
flyctl secrets set REDIS_URL="..."
flyctl secrets set R2_ACCESS_KEY_ID="..."
# ... etc

flyctl deploy

flyctl logs
```

---

## 🗄️ Migrações do Banco de Dados

### 8.1 Executar Migrações Localmente (Primeiro Deploy)

```bash
# No seu ambiente local:
cd /path/to/ecotech-sys

# Build do projeto
pnpm nx build api

# Gerar migrations
pnpm db:generate

# Executar migrations
pnpm db:migrate

# Ou push direto (cuidado em produção!)
pnpm db:push
```

### 8.2 Executar Migrações via Fly.io

```bash
# Opção 1: Via SSH
flyctl ssh console --app ecotech-api
cd /app
node -e "require('./main.js')"  # Se tiver script de migração

# Opção 2: Via script customizado
# Criar script: apps/api/migrate.js
const { migrate } = require('drizzle-orm/node-postgres/migrator')
const { drizzle } = require('drizzle-orm/node-postgres')
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const db = drizzle(pool)

async function main() {
  await migrate(db, { migrationsFolder: './migrations' })
  console.log('Migrations complete')
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

# Executar:
flyctl ssh console --app ecotech-api
node migrate.js
```

### 8.3 Seed Data (Primeira Vez)

```bash
# Local:
pnpm db:seed

# Via Fly.io:
flyctl ssh console --app ecotech-api
node seed.js
```

### 8.4 Criar Usuário Admin

```bash
# Local:
pnpm admin:create

# Via Fly.io:
flyctl ssh console --app ecotech-api
node scripts/create-admin-user.js
```

---

## 🌍 Variáveis de Ambiente - Resumo Completo

### Frontend (.env.production)

```bash
# ======================
# FRONTEND - VERCEL
# ======================

# API Connection
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com
NEXT_PUBLIC_WS_URL=wss://api.seu-dominio.com

# Stripe Public Key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# App Metadata
NEXT_PUBLIC_APP_NAME=Ecosistema Seguros
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
NEXT_PUBLIC_APP_DESCRIPTION=Sistema de gestão para corretoras de seguros

# Analytics (Opcional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTAG_ID=GTM-XXXXXXX

# Feature Flags (Opcional)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CHAT=false
```

### Backend (Fly.io Secrets)

```bash
# ======================
# BACKEND - FLY.IO
# ======================

# Node Environment
NODE_ENV=production
PORT=3000

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@host-pooler/db?sslmode=require
DIRECT_DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Redis (Upstash)
REDIS_URL=rediss://:password@endpoint:port
REDIS_HOST=endpoint
REDIS_PORT=6379
REDIS_PASSWORD=password
REDIS_TLS=true

# JWT Authentication
JWT_SECRET=seu-secret-super-seguro-aqui-com-32-chars-min
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_STARTER=price_xxxxx
STRIPE_PRICE_PROFESSIONAL=price_xxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxx

# Cloudflare R2 (S3-compatible)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=ecotech-storage
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
R2_ENDPOINT=https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com

# CORS Configuration
CORS_ORIGIN=https://seu-dominio.com,https://www.seu-dominio.com
CORS_CREDENTIALS=true

# App URLs
APP_URL=https://api.seu-dominio.com
FRONTEND_URL=https://seu-dominio.com

# Email (Opcional - Resend/SendGrid)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@seu-dominio.com
EMAIL_FROM_NAME=Ecosistema Seguros

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60

# Logs
LOG_LEVEL=info
PRETTY_PRINT=false

# Monitoring (Opcional)
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### Worker (Fly.io Secrets - Mesmas da API)

```bash
# O worker usa as mesmas variáveis do backend:
DATABASE_URL=...
REDIS_URL=...
R2_ACCESS_KEY_ID=...
# etc.
```

---

## 🔄 CI/CD e Automação

### 9.1 GitHub Actions Workflow

#### .github/workflows/deploy.yml
```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '8'

jobs:
  # Lint & Test
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Lint
        run: pnpm nx run-many --target=lint --all
      
      - name: Type check
        run: pnpm nx run-many --target=typecheck --all
      
      - name: Test
        run: pnpm nx run-many --target=test --all

  # Deploy Frontend (Vercel)
  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: apps/web

  # Deploy Backend (Fly.io)
  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Fly
        uses: superfly/flyctl-actions/setup-flyctl@master
      
      - name: Deploy API to Fly.io
        run: flyctl deploy --remote-only --app ecotech-api
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
        working-directory: apps/api
      
      - name: Deploy Worker to Fly.io
        run: flyctl deploy --remote-only --app ecotech-worker
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
        working-directory: apps/worker

  # Database Migrations
  migrate:
    needs: [deploy-backend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run migrations
        run: pnpm db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### 9.2 Configurar Secrets no GitHub

```bash
# Settings > Secrets and variables > Actions > New repository secret

# Vercel
VERCEL_TOKEN=xxxxx
VERCEL_ORG_ID=xxxxx
VERCEL_PROJECT_ID=xxxxx

# Fly.io
FLY_API_TOKEN=xxxxx  # Obter com: flyctl auth token

# Database
DATABASE_URL=postgresql://...
```

---

## 📊 Monitoramento e Logs

### 10.1 Logs da Aplicação

#### Vercel (Frontend)
```bash
# Via CLI
vercel logs --app=ecotech-web

# Via Dashboard
https://vercel.com/your-team/ecotech-web/logs

# Filtros:
# - Por deployment
# - Por tipo (Build, Runtime, Edge)
# - Por período
```

#### Fly.io (Backend)
```bash
# Logs em tempo real
flyctl logs --app ecotech-api

# Logs do worker
flyctl logs --app ecotech-worker

# Filtrar por região
flyctl logs --app ecotech-api --region gru

# Últimas 100 linhas
flyctl logs --app ecotech-api -n 100
```

### 10.2 Métricas

#### Fly.io Metrics
```bash
# Via CLI
flyctl status --app ecotech-api

# Via Dashboard
https://fly.io/apps/ecotech-api/metrics

# Métricas disponíveis:
# - CPU usage
# - Memory usage
# - Request rate
# - Response time
# - Error rate
```

#### Vercel Analytics
```bash
# Habilitar no Dashboard:
# Project > Analytics

# Métricas:
# - Page views
# - Unique visitors
# - Top pages
# - Geographic distribution
# - Device types
```

### 10.3 Uptime Monitoring

#### Configurar Health Checks

**API Health Endpoint (apps/api/src/routes/health.ts)**
```typescript
import { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (request, reply) => {
    try {
      // Check database
      await app.db.execute('SELECT 1')
      
      // Check redis
      await app.redis.ping()
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
          redis: 'up'
        }
      }
    } catch (error) {
      reply.code(503)
      return {
        status: 'unhealthy',
        error: error.message
      }
    }
  })
  
  app.get('/health/ready', async (request, reply) => {
    return { ready: true }
  })
  
  app.get('/health/live', async (request, reply) => {
    return { live: true }
  })
}
```

#### Serviços de Monitoramento (Opcional)

**UptimeRobot** (Gratuito)
```bash
# Configure em: https://uptimerobot.com
# Monitor Type: HTTPS
# URL: https://api.seu-dominio.com/health
# Interval: 5 minutes
# Alert Contacts: seu-email@exemplo.com
```

**BetterUptime** (Freemium)
```bash
# Configure em: https://betteruptime.com
# Monitorar:
# - https://seu-dominio.com
# - https://api.seu-dominio.com/health
# - https://api.seu-dominio.com/metrics
```

### 10.4 Error Tracking (Sentry - Opcional)

#### Instalar Sentry
```bash
pnpm add @sentry/node @sentry/nextjs
```

#### Configurar no Backend (apps/api/src/main.ts)
```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
})

// No fastify error handler:
app.setErrorHandler((error, request, reply) => {
  Sentry.captureException(error)
  // ... rest of handler
})
```

#### Configurar no Frontend (apps/web/instrumentation.ts)
```typescript
import * as Sentry from '@sentry/nextjs'

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV
    })
  }
  
  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV
    })
  }
}
```

---

## 🐛 Troubleshooting

### Problemas Comuns

#### 0. Vercel NOT_FOUND Error (Monorepo)
```bash
# Erro: "NOT_FOUND" ao acessar deployment URL
# Causa: Configuração incorreta para monorepo Nx

# ✅ SOLUÇÃO COMPLETA:

# 1. Verificar estrutura de arquivos:
ecotech-sys/
  apps/
    web/
      vercel.json    ← Deve existir aqui
      next.config.js
      package.json

# 2. Verificar conteúdo do vercel.json (apps/web/vercel.json):
{
  "buildCommand": "cd ../.. && pnpm nx build web",
  "devCommand": "cd ../.. && pnpm nx dev web",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": ".next"
}

# 3. Configurar no Vercel Dashboard:
# Settings > General > Root Directory: apps/web

# 4. Verificar Build Logs no Vercel:
# - Deve mostrar: "Running build command: cd ../.. && pnpm nx build web"
# - Deve completar sem erros
# - Deve gerar arquivos em .next/

# 5. Redesploiar:
git add apps/web/vercel.json
git commit -m "fix: add vercel.json for monorepo configuration"
git push origin main

# 6. Verificar deployment:
# - Aguarde build completar
# - Acesse URL de preview
# - Se funcionar, promova para produção

# Debug adicional:
vercel --debug
vercel logs

# Sinais de que está correto:
# ✓ Build mostra "cd ../.. && pnpm nx build web"
# ✓ Dependências de @ecotech/* são encontradas
# ✓ Build completa sem erro de módulos não encontrados
# ✓ Output directory contém arquivos .next/
```

#### 1. Build Falha no Vercel
```bash
# Erro: "Cannot find module..."
# Solução: Verificar que todas as dependências estão no package.json

# Erro: "Build timeout"
# Solução: Otimizar build ou aumentar timeout no Vercel Pro

# Erro: "Out of memory"
# Solução: Reduzir bundle size ou upgrade plano Vercel

# Debug:
vercel build --debug
```

#### 2. Deploy Falha no Fly.io
```bash
# Erro: "Failed to build image"
# Solução: Verificar Dockerfile e .dockerignore

# Erro: "Health check failed"
# Solução: Verificar que o endpoint /health está respondendo

# Debug:
flyctl logs --app ecotech-api
flyctl ssh console --app ecotech-api
```

#### 3. Banco de Dados - Connection Issues
```bash
# Erro: "Connection timeout"
# Solução: Verificar connection string e SSL mode

# Erro: "Too many connections"
# Solução: Usar connection pooling (Neon Pooler)

# Erro: "SSL required"
# Solução: Adicionar ?sslmode=require na connection string

# Test connection:
psql $DATABASE_URL
```

#### 4. Redis - Connection Issues
```bash
# Erro: "ECONNREFUSED"
# Solução: Verificar credenciais e TLS habilitado

# Erro: "Authentication failed"
# Solução: Verificar password no REDIS_URL

# Test connection:
redis-cli -u $REDIS_URL ping
```

#### 5. Cloudflare R2 - Upload Issues
```bash
# Erro: "Access Denied"
# Solução: Verificar API tokens e permissões

# Erro: "Bucket not found"
# Solução: Criar bucket ou corrigir R2_BUCKET_NAME

# Erro: "CORS error"
# Solução: Configurar CORS policy no R2 dashboard

# Test upload:
aws s3 cp test.txt s3://ecotech-storage/ \
  --endpoint-url https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com \
  --profile r2
```

#### 6. Stripe Webhooks - Não Recebidos
```bash
# Problema: Webhooks não chegam na API
# Solução 1: Verificar URL do webhook no Stripe Dashboard
# Solução 2: Verificar STRIPE_WEBHOOK_SECRET
# Solução 3: Testar com Stripe CLI:

stripe listen --forward-to https://api.seu-dominio.com/api/webhooks/stripe

# Enviar evento de teste:
stripe trigger checkout.session.completed
```

#### 7. CORS Errors
```bash
# Erro: "Access-Control-Allow-Origin"
# Solução: Verificar CORS_ORIGIN no backend

# Backend (apps/api/src/main.ts):
app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(','),
  credentials: true
})

# Frontend: Verificar que está fazendo requests para API correta
console.log(process.env.NEXT_PUBLIC_API_URL)
```

#### 8. WebSocket Connection Failed
```bash
# Erro: "WebSocket connection failed"
# Solução 1: Verificar WS_URL no frontend
# Solução 2: Fly.io suporta WebSocket por padrão, mas verificar:

# fly.toml:
[[services.ports]]
  handlers = ["tls", "http"]  # HTTP suporta upgrade para WS
  port = 443

# Backend: Verificar que @fastify/websocket está registrado
app.register(websocket)
```

---

## ✅ Checklist de Deploy

### Pré-Deploy
- [ ] Todas as dependências instaladas e atualizadas
- [ ] Testes passando localmente
- [ ] Build passando localmente
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados criado (Neon)
- [ ] Redis criado (Upstash)
- [ ] Cloudflare R2 bucket criado
- [ ] Stripe configurado e testado
- [ ] Domínios registrados

### Deploy Frontend (Vercel)
- [ ] Repositório conectado ao Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Build settings corretos
- [ ] Deploy executado com sucesso
- [ ] Site acessível via URL temporária
- [ ] Domínio customizado configurado
- [ ] SSL ativo
- [ ] Teste de funcionalidades básicas

### Deploy Backend (Fly.io)
- [ ] Dockerfile criado e testado
- [ ] fly.toml configurado
- [ ] App criada no Fly.io
- [ ] Secrets configurados
- [ ] Deploy executado com sucesso
- [ ] Health check respondendo
- [ ] Logs sem erros críticos
- [ ] Domínio customizado configurado
- [ ] SSL ativo
- [ ] API acessível e respondendo

### Deploy Worker (Fly.io)
- [ ] Dockerfile criado
- [ ] App criada no Fly.io
- [ ] Secrets configurados
- [ ] Deploy executado
- [ ] Logs mostrando processamento de jobs

### Database
- [ ] Migrations executadas
- [ ] Seed data inserido (se necessário)
- [ ] Usuário admin criado
- [ ] Backup configurado
- [ ] Connection pooling ativo

### Storage (R2)
- [ ] Bucket criado
- [ ] CORS configurado
- [ ] Public access configurado (se necessário)
- [ ] Upload teste realizado

### Integrações
- [ ] Stripe webhooks configurados e testando
- [ ] Email provider configurado (se aplicável)
- [ ] Analytics configurado (se aplicável)

### Monitoramento
- [ ] Health checks ativos
- [ ] Uptime monitoring configurado
- [ ] Error tracking configurado (Sentry)
- [ ] Logs acessíveis

### CI/CD
- [ ] GitHub Actions workflow configurado
- [ ] Secrets configurados no GitHub
- [ ] Deploy automático funcionando

### Segurança
- [ ] HTTPS forçado
- [ ] JWT secrets aleatórios e seguros
- [ ] Rate limiting ativo
- [ ] CORS configurado corretamente
- [ ] Helmet configurado (segurança headers)

### Performance
- [ ] CDN ativo (Vercel Edge Network)
- [ ] Images otimizadas
- [ ] Caching configurado (Redis)
- [ ] Database queries otimizadas

### Testes Pós-Deploy
- [ ] Registro de usuário funciona
- [ ] Login funciona
- [ ] API endpoints respondendo
- [ ] WebSocket conectando
- [ ] Upload de arquivos funciona
- [ ] Payments funcionando (Stripe)
- [ ] Jobs sendo processados (Worker)
- [ ] Email sendo enviado (se aplicável)

---

## 📝 Comandos Úteis de Referência

### Vercel CLI
```bash
# Login
vercel login

# Deploy
vercel --prod

# Listar projetos
vercel ls

# Ver informações do projeto
vercel inspect

# Logs
vercel logs

# Variáveis de ambiente
vercel env ls
vercel env add VARIAVEL production
vercel env pull .env.local

# Rollback
vercel rollback

# Domains
vercel domains ls
vercel domains add seu-dominio.com
```

### Fly.io CLI
```bash
# Login
flyctl auth login

# Apps
flyctl apps list
flyctl apps create nome-da-app
flyctl apps destroy nome-da-app

# Deploy
flyctl deploy
flyctl deploy --remote-only
flyctl deploy --no-cache

# Logs
flyctl logs
flyctl logs -a ecotech-api
flyctl logs --region gru

# Status
flyctl status
flyctl status --all

# SSH
flyctl ssh console
flyctl ssh console -C "comando"

# Secrets
flyctl secrets list
flyctl secrets set KEY=value
flyctl secrets unset KEY

# Scale
flyctl scale show
flyctl scale count 2
flyctl scale vm shared-cpu-2x
flyctl autoscale set min=1 max=5

# Volumes
flyctl volumes list
flyctl volumes create data --size 10

# Postgres (se usar Fly Postgres)
flyctl postgres create
flyctl postgres connect -a nome-do-db
```

### Database (Drizzle)
```bash
# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# Push schema (dev only)
pnpm db:push

# Studio (visualizar dados)
pnpm db:studio

# Seed
pnpm db:seed
```

### Git
```bash
# Deploy (via CI/CD)
git add .
git commit -m "deploy: production release v1.0.0"
git push origin main

# Tags
git tag v1.0.0
git push origin v1.0.0
```

---

## 🎯 Próximos Passos

### Após Primeiro Deploy

1. **Configurar Domínio de Email**
   - Configurar SPF, DKIM, DMARC
   - Testar envio de emails
   - Configurar templates de email

2. **Implementar Monitoring Avançado**
   - Adicionar Sentry para error tracking
   - Configurar alertas no UptimeRobot
   - Dashboard de métricas customizado

3. **Otimizações de Performance**
   - Implementar caching agressivo
   - Otimizar queries do banco
   - Implementar CDN para assets estáticos

4. **Backup Strategy**
   - Automatizar backups do Neon
   - Backup de uploads do R2
   - Documentar processo de restore

5. **Security Hardening**
   - Implementar 2FA
   - Audit logs
   - Security headers (CSP, etc)
   - Penetration testing

6. **Documentação**
   - API docs completo (Scalar/OpenAPI)
   - User guide
   - Admin guide
   - Troubleshooting guide

---

## 📚 Recursos Adicionais

### Documentação Oficial
- **Vercel:** https://vercel.com/docs
- **Fly.io:** https://fly.io/docs
- **Neon:** https://neon.tech/docs
- **Cloudflare R2:** https://developers.cloudflare.com/r2
- **Upstash Redis:** https://docs.upstash.com/redis
- **Stripe:** https://stripe.com/docs
- **Drizzle ORM:** https://orm.drizzle.team/docs
- **Fastify:** https://fastify.dev/docs
- **Next.js:** https://nextjs.org/docs

### Comunidade
- **Discord Vercel:** https://vercel.com/discord
- **Discord Fly.io:** https://fly.io/discord
- **Slack Drizzle:** https://drizzle.team/discord

### Suporte
- **Vercel Support:** https://vercel.com/support
- **Fly.io Community:** https://community.fly.io
- **GitHub Issues:** https://github.com/seu-usuario/ecotech-sys/issues

---

## 📄 Licença

Este guia é parte do projeto Ecosistema Seguros e está sob a licença MIT.

---

**Última atualização:** 04/02/2026  
**Versão do Guia:** 1.0.0  
**Mantido por:** Equipe Ecosistema Seguros

---

**🚀 Boa sorte com o deploy!**

Se encontrar problemas não cobertos neste guia, consulte a documentação oficial dos serviços ou abra uma issue no repositório do projeto.
