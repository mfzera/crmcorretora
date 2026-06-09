# 🗄️ Setup do Banco de Dados

## 📋 Pré-requisitos

- Docker Desktop instalado e rodando
- Node.js >= 20.0.0
- pnpm >= 8.0.0

## 🚀 Passo a Passo

### 1️⃣ Subir o PostgreSQL com Docker

```bash
# Subir o container do PostgreSQL
docker-compose up -d

# Verificar se está rodando
docker ps
```

Você deve ver algo como:
```
CONTAINER ID   IMAGE                PORTS                    STATUS
xxxxxxxxxxxxx   postgres:16-alpine   0.0.0.0:5432->5432/tcp   Up 10 seconds
```

### 2️⃣ Rodar as Migrations

```bash
# Executar migrations para criar as tabelas
pnpm db:push
```

Ou se preferir usar migrate:
```bash
pnpm db:generate  # Gera as migrations
pnpm db:migrate   # Aplica as migrations
```

### 3️⃣ Criar Dados Iniciais (Planos e Permissões)

```bash
pnpm db:seed
```

Isso criará:
- ✅ 3 planos (Starter, Professional, Enterprise)
- ✅ Todas as permissões globais do sistema

### 4️⃣ Criar Usuário e Corretora

```bash
pnpm tsx libs/shared/database/src/seed-user.ts
```

Isso criará:
- ✅ **Corretora:** Ecosistema Seguros
- ✅ **CNPJ:** 12.345.678/0001-90
- ✅ **Usuário:** Miguel Caetano
- ✅ **Email:** ecotech@grupoecosistema.com.br
- ✅ **Senha:** senha123
- ✅ **Permissões:** Admin, Gestor e Vendedor

## 🎯 Credenciais de Acesso

Após executar todos os passos, você poderá fazer login com:

```
📧 Email:    ecotech@grupoecosistema.com.br
🔐 Senha:    senha123
🏢 Empresa:  Ecosistema Seguros
📋 CNPJ:     12.345.678/0001-90
```

## 🛠️ Comandos Úteis

```bash
# Ver logs do banco de dados
docker-compose logs -f postgres

# Parar o banco de dados
docker-compose down

# Parar e remover volumes (⚠️ apaga todos os dados)
docker-compose down -v

# Acessar o PostgreSQL via CLI
docker exec -it ecotech-postgres psql -U postgres -d saas_seguradoras

# Visualizar banco com Drizzle Studio
pnpm db:studio
```

## 🔍 Verificar Dados

Após criar o usuário, você pode verificar no Drizzle Studio:

```bash
pnpm db:studio
```

Abrirá em: https://local.drizzle.studio

Navegue até as tabelas:
- **seguradoras** → Verá "Ecosistema Seguros"
- **usuarios** → Verá "Miguel Caetano"
- **planos** → Verá os 3 planos criados

## ⚠️ Troubleshooting

### Erro: "ECONNREFUSED ::1:5432"
**Problema:** PostgreSQL não está rodando

**Solução:**
```bash
docker-compose up -d
# Aguarde alguns segundos para o banco inicializar
docker-compose logs postgres
```

### Erro: "relation does not exist"
**Problema:** Tabelas não foram criadas

**Solução:**
```bash
pnpm db:push
```

### Erro: "duplicate key value violates unique constraint"
**Problema:** Dados já existem

**Solução:** Isso é normal! O script tem `onConflictDoUpdate` e vai atualizar os dados existentes.

## 🎉 Pronto!

Agora você pode:
1. Iniciar a API: `pnpm dev:api`
2. Iniciar o Frontend: `pnpm dev:web`
3. Fazer login com as credenciais acima

**URL da aplicação:** http://localhost:4200 (ou a porta configurada)
