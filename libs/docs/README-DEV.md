# Ecotech SaaS - Guia de Desenvolvimento

Sistema SaaS Multi-Tenant para gestão de vendas de seguros com sistema completo de anexos usando Cloudflare R2.

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+ 
- pnpm 8+
- Docker & Docker Compose
- Git

### Setup Automático (Recomendado)

```bash
# 1. Clone o repositório
git clone <url-do-repo>
cd ecotech-sys

# 2. Instale as dependências
pnpm install

# 3. Execute o script de setup (cria .env, sobe PostgreSQL e MinIO, executa migrações)
./scripts/dev-setup.sh

# 4. Inicie a API
pnpm dev
```

A API estará disponível em `http://localhost:3000`

### Setup Manual

Se preferir configurar manualmente:

```bash
# 1. Copiar variáveis de ambiente
cp .env.development .env

# 2. Iniciar containers Docker
docker compose up -d

# 3. Executar migrações
cd libs/shared/database
pnpm drizzle-kit push
cd ../../..

# 4. Iniciar API
pnpm dev
```

## 🧪 Testando o MinIO (S3 Local)

MinIO é um servidor S3-compatible que roda localmente para desenvolvimento.

### Acessar Console Web
- URL: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin123`

### Testar Upload/Download

```bash
# Executar script de teste
./scripts/test-minio.sh
```

### Endpoints MinIO
- **API:** http://localhost:9000
- **Console:** http://localhost:9001

Veja documentação completa em: `docs/desenvolvimento/minio-setup.md`

## 📦 Serviços Disponíveis

| Serviço | Porta | Credenciais |
|---------|-------|-------------|
| API | 3000 | - |
| PostgreSQL | 5432 | postgres / postgres123 |
| MinIO API | 9000 | minioadmin / minioadmin123 |
| MinIO Console | 9001 | minioadmin / minioadmin123 |
| Swagger Docs | 3000/docs | - |

## 🗂️ Estrutura do Projeto

```
ecotech-sys/
├── apps/
│   └── api/                    # API Fastify
│       └── src/
│           └── routes/         # Rotas da API
│               ├── admin/      # Painel admin (Sprint 3)
│               ├── anexos/     # Gestão de anexos (Sprint 1)
│               ├── cotacoes/   # Cotações + anexos
│               └── ...
├── libs/
│   ├── shared/
│   │   ├── database/          # Schemas Drizzle + Migrações
│   │   ├── storage/           # R2Client, StorageService, MetricsService
│   │   └── utils/             # Utilidades compartilhadas
│   └── plugins/
│       ├── admin-auth/        # Autenticação admin (JWT separado)
│       ├── auth/              # Autenticação tenants
│       └── ...
├── docs/
│   ├── plano/                 # Plano original do sistema
│   ├── implementacao/         # Documentação de sprints
│   └── desenvolvimento/       # Guias de desenvolvimento
└── scripts/                   # Scripts úteis
```

## 📚 Documentação

### Sprints Implementados
- [Sprint 1 - Foundation (Backend)](docs/implementacao/sprint-1-foundation.md)
- [Sprint 2 - Entity Integration](docs/implementacao/sprint-2-entity-integration.md)
- [Sprint 3 - Admin Panel (Backend)](docs/implementacao/sprint-3-admin-backend.md)

### Guias de Desenvolvimento
- [MinIO Setup](docs/desenvolvimento/minio-setup.md)
- [Plano Completo](docs/plano/00-INDICE.md)

## 🔑 Variáveis de Ambiente

Principais variáveis (veja `.env.development` para lista completa):

```env
# Database
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/saas_seguradoras

# JWT
JWT_SECRET=dev-secret-key-change-in-production-min-32-chars
JWT_ADMIN_SECRET=dev-admin-secret-key-change-in-production-min-32-chars

# MinIO (desenvolvimento)
CLOUDFLARE_R2_ENDPOINT=http://localhost:9000
CLOUDFLARE_R2_ACCESS_KEY_ID=minioadmin
CLOUDFLARE_R2_SECRET_ACCESS_KEY=minioadmin123
CLOUDFLARE_R2_BUCKET=ecotech-anexos
CLOUDFLARE_R2_BACKUP_BUCKET=ecotech-backups
```

## 🛠️ Comandos Úteis

### Desenvolvimento
```bash
# Iniciar API em modo dev
pnpm dev

# Build da API
pnpm build

# Executar testes
pnpm test

# Lint
pnpm lint
```

### Docker
```bash
# Iniciar todos os serviços
docker compose up -d

# Ver logs
docker compose logs -f

# Parar serviços
docker compose down

# Resetar TUDO (apaga volumes)
docker compose down -v
```

### Database
```bash
# Gerar migração
cd libs/shared/database
pnpm drizzle-kit generate

# Aplicar migrações
pnpm drizzle-kit push

# Abrir Drizzle Studio (UI)
pnpm drizzle-kit studio
```

### MinIO
```bash
# Testar conectividade
./scripts/test-minio.sh

# Listar arquivos
docker exec ecotech-minio mc ls myminio/ecotech-anexos

# Limpar bucket
docker exec ecotech-minio mc rm --recursive --force myminio/ecotech-anexos

# Recriar buckets
docker compose up minio-setup
```

## 🔐 Sistema de Anexos

### Features Implementadas (Sprints 1-3)
- ✅ Upload/download de arquivos para R2
- ✅ Versionamento de arquivos
- ✅ Extração de texto de PDFs
- ✅ Validação de tipos e tamanhos
- ✅ Anexos em cotações, documentos e chat
- ✅ Painel admin com métricas
- ✅ Sistema de limites configuráveis
- ✅ Backups incrementais e completos
- ✅ Auditoria completa de ações admin

### Endpoints Principais

**Anexos Gerais:**
- POST `/api/anexos/upload`
- GET `/api/anexos/:id`
- GET `/api/anexos/:id/download`
- DELETE `/api/anexos/:id`

**Anexos por Entidade:**
- POST `/api/cotacoes/:id/anexos/upload`
- GET `/api/cotacoes/:id/anexos`
- POST `/api/documentos-venda/:id/anexos/upload`
- POST `/api/chat/:canalId/anexos/upload`

**Admin (requer admin JWT):**
- POST `/api/admin/auth/login`
- GET `/api/admin/storage/overview`
- GET `/api/admin/tenants`
- PUT `/api/admin/tenants/:id/limits`
- POST `/api/admin/backups`
- GET `/api/admin/audit-logs`

Veja documentação completa da API em: http://localhost:3000/docs

## 🧑‍💻 Fluxo de Desenvolvimento

### 1. Criar feature nova

```bash
# 1. Criar branch
git checkout -b feature/minha-feature

# 2. Fazer alterações no código
# ...

# 3. Executar testes
pnpm test

# 4. Commit
git add .
git commit -m "feat: minha nova feature"

# 5. Push
git push origin feature/minha-feature
```

### 2. Adicionar nova migração

```bash
# 1. Editar schema em libs/shared/database/src/schema/
# ...

# 2. Gerar migração
cd libs/shared/database
pnpm drizzle-kit generate

# 3. Revisar arquivo SQL gerado em migrations/
# ...

# 4. Aplicar migração
pnpm drizzle-kit push

# Ou aplicar manualmente via Docker:
docker exec -i ecotech-postgres psql -U postgres -d saas_seguradoras < migrations/XXXX_nome.sql
```

### 3. Testar upload de arquivo

```bash
# 1. Obter token JWT
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","senha":"suasenha"}' \
  | jq -r '.token')

# 2. Upload de arquivo
curl -X POST http://localhost:3000/api/anexos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "arquivo=@/path/to/file.pdf" \
  -F "entidadeTipo=cotacao" \
  -F "entidadeId=uuid-da-cotacao"

# 3. Verificar no MinIO Console
# Abra http://localhost:9001 e veja em ecotech-anexos
```

## 🚨 Troubleshooting

### API não inicia
```bash
# Verificar se PostgreSQL está rodando
docker ps | grep postgres

# Verificar logs
docker logs ecotech-postgres

# Verificar .env
cat .env | grep DATABASE_URL
```

### MinIO não funciona
```bash
# Verificar status
curl http://localhost:9000/minio/health/live

# Verificar logs
docker logs ecotech-minio

# Recriar buckets
docker compose up minio-setup

# Executar teste
./scripts/test-minio.sh
```

### Erro de migração
```bash
# Ver último estado do banco
cd libs/shared/database
pnpm drizzle-kit studio

# Reverter última migração (manual)
docker exec -i ecotech-postgres psql -U postgres -d saas_seguradoras
# DROP TABLE ...
```

### Resetar ambiente completamente
```bash
# Parar tudo e apagar volumes
docker compose down -v

# Executar setup novamente
./scripts/dev-setup.sh
```

## 📖 Recursos Adicionais

- **Fastify Docs:** https://fastify.dev
- **Drizzle ORM:** https://orm.drizzle.team
- **MinIO Docs:** https://min.io/docs
- **AWS SDK v3:** https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/
- **Cloudflare R2:** https://developers.cloudflare.com/r2/

## 🤝 Contribuindo

1. Crie uma branch para sua feature
2. Escreva testes
3. Documente mudanças significativas
4. Faça commit seguindo Conventional Commits
5. Abra Pull Request

## 📝 Licença

Proprietary - Ecotech

---

**Pronto para começar!** Execute `./scripts/dev-setup.sh` e comece a desenvolver. 🚀
