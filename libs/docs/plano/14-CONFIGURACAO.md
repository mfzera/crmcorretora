# 14 - Configuração de Ambiente

## 📝 Variáveis de Ambiente

### Arquivo: `.env`

```env
# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://user:password@localhost:5432/ecotech

# ============================================
# CLOUDFLARE R2 (Storage)
# ============================================
R2_ACCOUNT_ID=seu-account-id-cloudflare
R2_ACCESS_KEY_ID=sua-access-key-id
R2_SECRET_ACCESS_KEY=sua-secret-access-key
R2_BUCKET_NAME=ecotech-anexos
R2_BACKUP_BUCKET_NAME=ecotech-backups
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxx.r2.dev

# ============================================
# ADMIN PANEL
# ============================================
ADMIN_SECRET_KEY=chave-super-secreta-para-admin-min-32-chars
ADMIN_JWT_SECRET=outro-secret-diferente-para-jwt-admin-min-32-chars
ADMIN_JWT_EXPIRES_IN=7d
ADMIN_EMAILS=admin1@empresa.com,admin2@empresa.com

# ============================================
# STORAGE LIMITS (Defaults)
# ============================================
DEFAULT_STORAGE_LIMIT_GB=5
DEFAULT_FILE_LIMIT=10000
DEFAULT_MAX_FILE_SIZE_MB=10
DEFAULT_ALERT_THRESHOLD_PERCENT=80
DEFAULT_BLOCK_THRESHOLD_PERCENT=95

# ============================================
# BACKUP
# ============================================
BACKUP_RETENTION_INCREMENTAL_DAYS=30
BACKUP_RETENTION_FULL_DAYS=90
BACKUP_AUTO_VERIFY=true

# ============================================
# REDIS (para BullMQ)
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ============================================
# EMAIL (para alertas)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app
SMTP_FROM=noreply@ecotech.com

# ============================================
# URLS
# ============================================
API_URL=http://localhost:3000
WEB_URL=http://localhost:3001
ADMIN_URL=http://localhost:3002

# ============================================
# RATE LIMIT (para uploads)
# ============================================
RATE_LIMIT_UPLOAD_MAX=100
RATE_LIMIT_UPLOAD_WINDOW_MS=3600000

# ============================================
# LOGS
# ============================================
LOG_LEVEL=info
LOG_PRETTY=true
```

## 🔧 Como Obter Credenciais do Cloudflare R2

### 1. Criar Conta no Cloudflare

1. Acesse https://dash.cloudflare.com/
2. Crie uma conta (ou faça login)
3. No menu lateral, clique em **R2**
4. Aceite os termos de serviço

### 2. Criar Bucket

```bash
# Via Dashboard:
1. Clique em "Create bucket"
2. Nome: ecotech-anexos
3. Location: Automatic (recomendado)
4. Clique em "Create bucket"

# Repita para bucket de backup:
Nome: ecotech-backups
```

### 3. Gerar API Token

```bash
# Via Dashboard:
1. Vá para R2 > Manage R2 API Tokens
2. Clique em "Create API token"
3. Nome: ecotech-production
4. Permissions:
   - Object Read & Write
   - Buckets: ecotech-anexos, ecotech-backups
5. Clique em "Create API token"

# Copie as credenciais (mostradas apenas uma vez):
- Access Key ID → R2_ACCESS_KEY_ID
- Secret Access Key → R2_SECRET_ACCESS_KEY
- Account ID (no topo da página) → R2_ACCOUNT_ID
```

### 4. Configurar Domínio Público (Opcional)

```bash
# Se quiser URLs públicas sem assinatura:
1. No bucket, clique em "Settings"
2. Em "Public access", clique em "Allow Access"
3. Configure custom domain (opcional)
4. Copie a URL pública → R2_PUBLIC_URL
```

## 🗄️ Configuração do PostgreSQL

### Criar Database

```sql
-- Como superuser
CREATE DATABASE ecotech;
CREATE USER ecotech_user WITH ENCRYPTED PASSWORD 'senha-segura';
GRANT ALL PRIVILEGES ON DATABASE ecotech TO ecotech_user;

-- Conectar ao database ecotech
\c ecotech

-- Conceder permissões no schema public
GRANT ALL ON SCHEMA public TO ecotech_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ecotech_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ecotech_user;

-- Para que funcione em novas tabelas também
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO ecotech_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON SEQUENCES TO ecotech_user;
```

### String de Conexão

```env
DATABASE_URL=postgresql://ecotech_user:senha-segura@localhost:5432/ecotech
```

## 🔴 Configuração do Redis

### Instalar Redis

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# macOS (Homebrew)
brew install redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Iniciar Redis

```bash
# Linux
sudo systemctl start redis-server

# macOS
brew services start redis

# Verificar se está rodando
redis-cli ping
# Deve retornar: PONG
```

## 📧 Configuração de Email (Gmail)

### 1. Criar Senha de App

```
1. Acesse https://myaccount.google.com/security
2. Ative "Verificação em duas etapas" (se não ativou)
3. Vá em "Senhas de app"
4. Selecione:
   - App: Mail
   - Dispositivo: Outro (nome personalizado)
   - Nome: "Ecotech Alertas"
5. Clique em "Gerar"
6. Copie a senha gerada (16 caracteres) → SMTP_PASSWORD
```

### 2. Configurar no .env

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Senha de app
SMTP_FROM=noreply@ecotech.com
```

## 🚀 Scripts de Setup

### Arquivo: `scripts/setup-env.sh`

```bash
#!/bin/bash

echo "🔧 Ecotech Setup - Configuração de Ambiente"
echo ""

# Verificar se .env já existe
if [ -f .env ]; then
  echo "⚠️  Arquivo .env já existe!"
  read -p "Deseja sobrescrever? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Copiar template
cp .env.example .env

echo "✅ Arquivo .env criado!"
echo ""
echo "📝 Configure as seguintes variáveis:"
echo "   - DATABASE_URL"
echo "   - R2_ACCOUNT_ID"
echo "   - R2_ACCESS_KEY_ID"
echo "   - R2_SECRET_ACCESS_KEY"
echo "   - ADMIN_SECRET_KEY"
echo "   - ADMIN_JWT_SECRET"
echo ""
echo "📖 Consulte 14-CONFIGURACAO.md para mais detalhes."
```

### Arquivo: `scripts/init-db.sh`

```bash
#!/bin/bash

echo "🗄️  Ecotech Setup - Inicialização do Banco de Dados"
echo ""

# Verificar se DATABASE_URL está configurado
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não configurado no .env"
  exit 1
fi

# Rodar migrations
echo "📦 Rodando migrations..."
pnpm db:migrate

# Gerar types
echo "🔧 Gerando types do Drizzle..."
pnpm db:generate

# Seed (opcional)
read -p "Deseja popular com dados de teste? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🌱 Populando banco de dados..."
  pnpm db:seed
fi

echo ""
echo "✅ Banco de dados inicializado!"
```

### Arquivo: `scripts/create-admin.ts`

```typescript
/**
 * Script para criar primeiro admin
 * Uso: pnpm tsx scripts/create-admin.ts
 */
import { db } from '@ecotech/shared/database';
import { admins } from '@ecotech/shared/database';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  console.log('👑 Criar Primeiro Admin\n');

  const nome = await question('Nome: ');
  const email = await question('Email: ');
  const senha = await question('Senha: ');

  // Hash da senha
  const senhaHash = await bcrypt.hash(senha, 10);

  // Criar admin com todas as permissões
  const [admin] = await db
    .insert(admins)
    .values({
      nome,
      email,
      senha: senhaHash,
      permissoes: [
        'view_usage',
        'manage_limits',
        'view_all_tenants',
        'manage_backups',
        'manage_admins',
        'view_audit_logs',
        'cleanup_files',
      ],
      ativo: true,
    })
    .returning();

  console.log('\n✅ Admin criado com sucesso!');
  console.log(`ID: ${admin.id}`);
  console.log(`Email: ${admin.email}`);

  rl.close();
  process.exit(0);
}

createAdmin().catch((error) => {
  console.error('❌ Erro:', error);
  rl.close();
  process.exit(1);
});
```

## 🔐 Gerar Secrets Seguros

### Arquivo: `scripts/generate-secrets.sh`

```bash
#!/bin/bash

echo "🔐 Gerar Secrets"
echo ""

# Gerar secret para admin
ADMIN_SECRET=$(openssl rand -base64 32)
echo "ADMIN_SECRET_KEY=$ADMIN_SECRET"

# Gerar JWT secret
ADMIN_JWT=$(openssl rand -base64 32)
echo "ADMIN_JWT_SECRET=$ADMIN_JWT"

echo ""
echo "📋 Copie e cole no arquivo .env"
```

## 📦 Instalar Todas as Dependências

```bash
# Root
pnpm install

# Se criou novo workspace (storage)
cd libs/shared/storage
pnpm install
cd ../../..

# Se criou novo app (admin)
cd apps/admin
pnpm install
cd ../..
```

## ✅ Checklist de Configuração

### Backend
- [ ] PostgreSQL instalado e rodando
- [ ] Redis instalado e rodando
- [ ] Arquivo `.env` configurado
- [ ] Bucket R2 criado
- [ ] API tokens do R2 gerados
- [ ] Dependencies instaladas (`pnpm install`)
- [ ] Migrations rodadas (`pnpm db:migrate`)
- [ ] Types gerados (`pnpm db:generate`)
- [ ] Primeiro admin criado (`pnpm tsx scripts/create-admin.ts`)

### Email (Alertas)
- [ ] Gmail configurado com senha de app
- [ ] SMTP testado

### Desenvolvimento
- [ ] Todas as apps iniciam sem erro
- [ ] API responde em http://localhost:3000/health
- [ ] Web app carrega em http://localhost:3001
- [ ] Admin app carrega em http://localhost:3002

## 🧪 Testar Configuração

### 1. Testar Database

```bash
pnpm db:studio
# Abre Drizzle Studio em http://localhost:4983
# Verifique se consegue ver as tabelas
```

### 2. Testar R2

```typescript
// test-r2.ts
import { R2Client } from '@ecotech/storage';

async function test() {
  const r2 = new R2Client();
  
  // Upload teste
  await r2.upload('test/hello.txt', Buffer.from('Hello R2!'), 'text/plain');
  console.log('✅ Upload OK');
  
  // Download teste
  const buffer = await r2.download('test/hello.txt');
  console.log('✅ Download OK:', buffer.toString());
  
  // Cleanup
  await r2.delete('test/hello.txt');
  console.log('✅ Delete OK');
}

test();
```

### 3. Testar Redis

```bash
redis-cli
> SET test "hello"
> GET test
# Deve retornar: "hello"
> DEL test
> EXIT
```

### 4. Testar Email

```typescript
// test-email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: 'seu-email@example.com',
  subject: 'Teste Ecotech',
  text: 'Email de teste funcionando!',
});

console.log('✅ Email enviado!');
```

## 🚨 Troubleshooting

### Erro: "Cannot connect to database"
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão manual
psql -h localhost -U ecotech_user -d ecotech
```

### Erro: "R2 access denied"
```bash
# Verificar credenciais
# Verificar se buckets existem
# Verificar permissões do token
```

### Erro: "Redis connection refused"
```bash
# Verificar se Redis está rodando
redis-cli ping

# Iniciar Redis
sudo systemctl start redis-server
```

## 📝 Próximo Documento

Continue com **[15-MIGRATIONS.md](./15-MIGRATIONS.md)** para ver os scripts SQL completos.
