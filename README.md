# EcoTech Sys

Sistema SaaS multi-tenant de gestão de vendas para corretoras de seguros.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Fastify 5, TypeScript, Drizzle ORM |
| Banco | PostgreSQL 16 |
| Cache / Filas | Redis 7 + BullMQ |
| Storage | AWS S3 / Cloudflare R2 (MinIO local) |
| Frontend | React 19, Vite 7, TanStack Router |
| Estilização | Tailwind CSS 4, Radix UI |
| Dados | TanStack Query 5, React Hook Form, Zod |
| Monorepo | Nx 22, pnpm workspaces |
| Deploy | Cloudflare Pages (web), Railway/Fly (API/Worker) |

## Estrutura

```
ecotech-sys/
├── apps/
│   ├── api/          # API REST Fastify (porta 3001)
│   ├── web-new/      # Frontend React + Vite (porta 3000)
│   ├── worker/       # Serviço de filas BullMQ
│   └── mcp-server/   # Servidor MCP para bot WhatsApp (porta 3002)
├── libs/
│   ├── shared/
│   │   ├── database/ # Schema Drizzle, migrations, repositórios
│   │   ├── types/    # Tipos TypeScript compartilhados
│   │   ├── utils/    # Utilitários (env, logger, cripto)
│   │   ├── config/   # Configuração de ambiente
│   │   ├── storage/  # Cliente S3/R2
│   │   ├── domain/   # Modelos e serviços de domínio
│   │   └── ui/       # Exports de componentes UI
│   ├── features/     # Módulos de domínio (auth, vendedores, clientes, ...)
│   └── plugins/      # Plugins Fastify (auth, authorization, tenant, ...)
├── migrations/       # Migrations do banco de dados
├── docs/             # Documentação técnica
├── scripts/          # Scripts utilitários
└── docker-compose.yml
```

## Módulos

- **Clientes** — cadastro com CPF/CNPJ, contatos, vínculos com vendedores
- **Cotações / Propostas** — pipeline do lead até a venda
- **Documentos de Venda** — apólices e documentos com rastreio de status
- **Renovações** — importação em lote e gestão de renovações
- **Endossos** — modificações de apólice
- **Sinistros** — gestão de sinistros
- **Vendedores / Equipes** — hierarquia de vendedores e times
- **Usuários / Cargos / Permissões** — RBAC com herança de templates
- **Comissões** — configuração e cálculo por cargo
- **Dashboard / Métricas** — KPIs e analytics
- **Gamificação** — badges e missões por streaks (dias úteis seg–sex)
- **Notificações** — sistema em tempo real
- **Backup** — backup automático de banco e storage
- **Chat** — camada de comunicação interna
- **Integração Google Calendar** — sincronização de agenda
- **Anexos** — gestão de arquivos vinculados a qualquer entidade
- **Admin Portal** — operações exclusivas de administrador
- **LGPD** — exportação e exclusão de dados

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

## Setup local

```bash
# 1. Clonar e instalar dependências
git clone <repo-url>
cd ecotech-sys
pnpm install

# 2. Configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env com as variáveis necessárias

# 3. Subir infraestrutura local (Postgres, Redis, MinIO)
docker compose up -d postgres redis minio

# 4. Rodar migrations e seed inicial
pnpm db:migrate
pnpm db:seed

# 5. Iniciar em desenvolvimento
pnpm dev
```

## Variáveis de ambiente obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `REDIS_URL` | Connection string Redis |
| `JWT_SECRET` | Secret para access tokens |
| `JWT_REFRESH_SECRET` | Secret para refresh tokens |
| `JWT_ADMIN_SECRET` | Secret para tokens de admin |
| `CLOUDFLARE_R2_*` / `MINIO_*` | Configurações de storage |
| `SENDGRID_API_KEY` | Envio de e-mails transacionais |
| `STRIPE_SECRET_KEY` | Processamento de pagamentos |
| `PORT` / `HOST` | Configuração do servidor |
| `PLATFORM_DOMAIN` | Domínio da plataforma |

## Comandos

### Desenvolvimento

```bash
pnpm dev          # API + web simultaneamente
pnpm dev:api      # Somente API (porta 3001)
pnpm dev:web      # Somente frontend (porta 3000)
pnpm dev:mcp      # Servidor MCP / WhatsApp (porta 3002)
```

### Banco de dados

```bash
pnpm db:generate  # Gerar migration pelo Drizzle (não criar manualmente)
pnpm db:migrate   # Aplicar migrations pendentes
pnpm db:push      # Push do schema direto ao banco (dev)
pnpm db:studio    # Abrir Drizzle Studio
pnpm db:seed      # Popular dados iniciais
```

### Build

```bash
pnpm build        # Build da API
pnpm build:web    # Build do frontend para produção
pnpm build:all    # Build de todos os apps
pnpm build:mcp    # Build do servidor MCP
```

### Qualidade

```bash
pnpm lint         # Lint de todos os apps
pnpm test         # Suíte de testes
pnpm nx:graph     # Visualizar grafo de dependências
```

### Produção / Deploy

```bash
pnpm start            # Rodar API compilada
pnpm start:mcp        # Rodar servidor MCP compilado
pnpm deploy:migrate   # Deploy com migrations
pnpm admin:create     # Criar usuário admin
```

## Docker Compose

Serviços disponíveis localmente:

| Serviço | Porta |
|---------|-------|
| PostgreSQL 16 | 5432 |
| Redis 7 | 6379 |
| MinIO (S3) | 9000 / 9001 (console) |
| API | 3001 |
| Worker | — |

## Arquitetura

- **Multi-tenant:** cada corretora é isolada por `tenantId` no Redis e no banco
- **Plugin architecture:** concerns transversais (auth, RBAC, rate-limit, tenant) como plugins Fastify
- **Repository pattern:** acesso ao banco centralizado em repositórios em `libs/shared/database`
- **RBAC:** permissões granulares com herança de cargo template; o backend auto-introspecta rotas com `authorize()` e expõe para o frontend fazer gate local antes de cada request
- **Background jobs:** BullMQ para renovações, backups e notificações assíncronas
- **MCP Server:** acesso do bot WhatsApp via servidor MCP dedicado (sem acesso direto ao banco)
- **Padrão de datas:** `todayInSP()`, dayjs, crons em UTC-3

## Observações importantes

- **Migrations:** sempre geradas pelo Drizzle (`pnpm db:generate`), nunca escritas à mão
- **Validação rápida:** preferir `typecheck + build` a rodar a suíte E2E (1800+ testes, 15+ min)
- **Streaks de gamificação:** contam apenas dias úteis (seg–sex)
- **Push:** sempre confirmar com o usuário antes de fazer push para o remoto
