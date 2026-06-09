# 🔧 Gerenciamento de Variáveis de Ambiente

## Filosofia Simplificada

Este projeto usa uma **estratégia centralizada** para gerenciar variáveis de ambiente em desenvolvimento:

✅ **Um único arquivo**: `.env.development` (fonte da verdade)  
✅ **Um único comando**: `./scripts/setup-env.sh` (propaga para todos os apps)  
✅ **Zero confusão**: Não precisa editar múltiplos arquivos

## Estrutura de Arquivos

```
ecotech-sys/
├── .env.development          # ✅ EDITE AQUI (fonte da verdade)
├── .env                       # ⚙️  Gerado automaticamente (API + Next.js)
├── .env.exemple               # 📋 Template para novos devs
│
├── apps/
│   ├── web/
│   │   └── .env.local.example # 📋 Template (Next.js lê da raiz)
│   │
│   └── worker/
│       ├── .env               # ⚙️  Gerado automaticamente (worker)
│       └── .env.example       # 📋 Template
│
└── scripts/
    └── setup-env.sh           # 🚀 Script de setup
```

## Como Usar

### 1️⃣ Primeira vez (novo desenvolvedor)

```bash
# Clone o repositório
git clone <repo-url>
cd ecotech-sys

# Rode o script de setup
./scripts/setup-env.sh

# Inicie os serviços
pnpm dev
```

### 2️⃣ Alterando configurações

```bash
# 1. Edite APENAS o .env.development
vim .env.development

# 2. Rode o script para propagar as mudanças
./scripts/setup-env.sh

# 3. Reinicie os serviços
pnpm dev
```

### 3️⃣ Verificando configurações

```bash
# Ver todas as variáveis carregadas
cat .env.development

# Verificar se os arquivos foram gerados
ls -la .env
ls -la apps/web/.env.local
ls -la apps/worker/.env
```

## Variáveis Principais

### 🗄️ Database
```bash
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/saas_seguradoras
```

### 🔐 JWT
```bash
JWT_SECRET=dev-secret-key-change-in-production-min-32-chars
JWT_ADMIN_SECRET=dev-admin-secret-key-change-in-production-min-32-chars
```

### 🌐 API & Frontend
```bash
# Backend
HOST=0.0.0.0
PORT=3001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TENANT_ID=ecosistema
```

### 💾 Storage (MinIO local)
```bash
CLOUDFLARE_R2_ENDPOINT=http://localhost:9000
CLOUDFLARE_R2_ACCESS_KEY_ID=minioadmin
CLOUDFLARE_R2_SECRET_ACCESS_KEY=minioadmin123
```

### 🔴 Redis
```bash
REDIS_URL=redis://localhost:6379
```

## Troubleshooting

### ❌ "As variáveis não estão sendo carregadas"

**Solução:**
```bash
# 1. Rode o script de setup
./scripts/setup-env.sh

# 2. Reinicie TODOS os serviços
pnpm dev
```

### ❌ "Arquivo .env.development não existe"

**Solução:**
```bash
# Copie do exemplo
cp .env.exemple .env.development

# Rode o setup
./scripts/setup-env.sh
```

### ❌ "Backend não conecta ao banco"

**Verifique se:**
1. PostgreSQL está rodando: `docker ps | grep postgres`
2. A `DATABASE_URL` está correta no `.env.development`
3. Você rodou `./scripts/setup-env.sh` após alterar
4. Reiniciou o backend

### ❌ "Frontend não conecta ao backend"

**Verifique se:**
1. Backend está rodando em `localhost:3001`
2. `NEXT_PUBLIC_API_URL` está como `http://localhost:3001/api`
3. Você rodou `./scripts/setup-env.sh`
4. Reiniciou o frontend (Next.js precisa rebuild)

## Produção vs Desenvolvimento

| Ambiente | Arquivo | Como funciona |
|----------|---------|---------------|
| **Desenvolvimento** | `.env.development` | Copiado para `.env` e outros via script |
| **Produção** | Variáveis de ambiente do host | Configuradas no servidor/container |

**⚠️ NUNCA comite arquivos `.env` com secrets reais!**

## Git Ignore

Os seguintes arquivos estão no `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Keep only
# .env.development (development defaults)
# .env.exemple (template)
# .env.local.example (template)
# .env.example (template)
```

## Fluxo de Trabalho Recomendado

```mermaid
graph LR
    A[Editar .env.development] --> B[Rodar ./scripts/setup-env.sh]
    B --> C[Reiniciar pnpm dev]
    C --> D[Testar aplicação]
```

## Dicas

1. **Sempre edite `.env.development`**, nunca os outros `.env`
2. **Rode `./scripts/setup-env.sh`** após cada mudança
3. **Reinicie os serviços** para aplicar mudanças
4. **Use `NEXT_PUBLIC_` prefix** para variáveis do frontend
5. **Não comite secrets** no git

## Scripts Úteis

```bash
# Setup completo do ambiente
./scripts/setup-env.sh

# Ver diferenças entre arquivos
diff .env.development .env

# Validar se todas as variáveis necessárias estão definidas
grep -E "^[A-Z_]+=" .env.development | sort
```

## Suporte

Se tiver problemas com configuração de ambiente, consulte:
- `docs/QUICK_START_ADMIN.md` - Setup inicial do sistema
- `docs/LOGIN_TROUBLESHOOTING.md` - Problemas de login
- `docs/ADMIN_SETUP.md` - Configuração de admin

---

**Última atualização:** 2026-01-27
