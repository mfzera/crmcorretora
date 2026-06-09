# 01 - Arquitetura Geral do Sistema

## 🎯 Objetivo

Implementar um sistema completo de gerenciamento de anexos com:
- Upload/download de arquivos usando Cloudflare R2
- Versionamento de arquivos
- Extração de dados de PDFs
- Painel administrativo multi-tenant para monitoramento
- Sistema de backup automático

## 🏗️ Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      TENANT APP (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Cotações    │  │  Documentos  │  │     Chat     │      │
│  │   + Anexos   │  │   + Anexos   │  │   + Anexos   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ API REST + WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API FASTIFY (Backend)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Rotas Anexos │  │ Rotas Admin  │  │  Chat Plugin │      │
│  │  + Tenant    │  │  (Separado)  │  │ + WebSocket  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │                 │                 │              │
│           └─────────────────┼─────────────────┘              │
│                             ▼                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Storage    │  │   Metrics    │  │    Backup    │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Cloudflare R2│    │  PostgreSQL  │    │   BullMQ     │
│   (Storage)  │    │  (Database)  │    │  (Jobs)      │
└──────────────┘    └──────────────┘    └──────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   ADMIN PANEL (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │   Tenants    │  │   Backups    │      │
│  │   Métricas   │  │  Detalhes    │  │   Gestão     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Decisões Técnicas Importantes

### 1. Por que Cloudflare R2?

**Vantagens:**
- ✅ **Zero egress fees**: Não cobra pela saída de dados (principal diferença do S3)
- ✅ **S3-compatible**: Usa mesmo SDK do AWS S3
- ✅ **Alta performance**: Rede global da Cloudflare
- ✅ **Preço baixo**: $0.015/GB/mês (vs S3 $0.023/GB/mês)

**Custos estimados (10 corretoras, 5GB cada):**
- Storage: 50GB × $0.015 = $0.75/mês
- Operations: ~$0.63/mês
- **Total: ~$1.40/mês** (sem backup)
- **Com backup: ~$2.15/mês**

### 2. Estrutura de Pastas no R2

```
ecotech-anexos/
├── {corretoraId-1}/
│   ├── cotacoes/
│   │   └── {cotacaoId}/
│   │       ├── file1.pdf
│   │       └── file2.jpg
│   ├── documentos/
│   │   └── {documentoId}/
│   │       └── proposta.pdf
│   └── chat/
│       └── {canalId}/
│           └── image.png
├── {corretoraId-2}/
│   └── ...
└── temp/ (arquivos temporários, cleanup automático)

ecotech-backups/ (bucket separado)
├── full/
│   └── {corretoraId}/
│       └── {timestamp}/
│           └── arquivos...
└── incremental/
    └── {corretoraId}/
        └── {timestamp}/
            └── arquivos-novos...
```

### 3. Tenant Isolation

**Multi-tenancy em todas as camadas:**

1. **Database**: Todas as tabelas têm `corretoraId`
2. **R2**: Pasta raiz por corretora
3. **API**: Middleware `tenantIsolation` valida cada request
4. **Admin**: Acessa todos os tenants, mas com autenticação separada

### 4. Versionamento de Arquivos

**Estratégia:**
- Cada nova versão é um arquivo separado no R2
- Link entre versões no banco de dados (`arquivoAnteriorId`)
- Histórico completo preservado
- Possibilidade de restaurar qualquer versão

**Exemplo:**
```typescript
// Versão 1 (original)
anexo_v1 = {
  id: 'uuid-1',
  nomeOriginal: 'contrato.pdf',
  versao: 1,
  arquivoAnteriorId: null,
  r2Key: '{corretoraId}/documentos/{docId}/uuid-1.pdf'
}

// Versão 2 (atualização)
anexo_v2 = {
  id: 'uuid-2',
  nomeOriginal: 'contrato.pdf',
  versao: 2,
  arquivoAnteriorId: 'uuid-1', // ← Link para v1
  r2Key: '{corretoraId}/documentos/{docId}/uuid-2.pdf'
}
```

### 5. Autenticação Dual

**Sistema 1: Tenant Users (já existe)**
- JWT com `corretoraId`, `userId`, `permissoes`
- Acesso apenas ao próprio tenant
- Rotas: `/api/anexos/*`, `/api/cotacoes/*`, etc.

**Sistema 2: Admin Users (novo)**
- JWT separado com `adminId`, `permissoes`
- Acesso a todos os tenants
- Rotas: `/api/admin/*`
- Login em app separado: `apps/admin/`

### 6. Backup Incremental vs Completo

**Backup Incremental (diário):**
- Copia apenas arquivos novos/modificados desde último backup
- Rápido e econômico
- Retenção: 30 dias

**Backup Completo (semanal):**
- Copia todos os arquivos da corretora
- Mais lento, mas garante restore completo
- Retenção: 90 dias

**Estratégia de Restore:**
1. Último backup completo
2. Aplicar todos os incrementais subsequentes
3. = Estado atual restaurado

## 📊 Fluxo de Dados

### Upload de Arquivo

```
1. Cliente (React)
   └─> Upload via multipart/form-data

2. API Fastify
   ├─> Validar: tamanho, MIME type, permissões
   ├─> Gerar UUID + nome único
   └─> Chamar StorageService

3. StorageService
   ├─> Upload para R2 (SDK AWS S3)
   ├─> Extrair texto (se PDF)
   └─> Inserir registro no DB

4. Response
   └─> { anexo, urlAssinada }
```

### Download de Arquivo

```
1. Cliente requisita anexo
   └─> GET /api/anexos/:id

2. API valida permissões
   ├─> Usuário tem acesso à entidade?
   └─> Tenant correto?

3. Gera URL assinada (24h)
   └─> Usando @aws-sdk/s3-request-presigner

4. Cliente baixa diretamente do R2
   └─> Via URL assinada (sem passar pela API)
```

### Monitoramento de Uso

```
1. Job diário (00:00)
   └─> StorageMetricsService.createDailySnapshot()

2. Para cada corretora
   ├─> Conta arquivos no DB
   ├─> Soma tamanhos
   ├─> Calcula crescimento
   └─> Insere em storage_metrics

3. Admin Panel
   ├─> Lê metrics do DB
   ├─> Gera gráficos
   └─> Exibe dashboard
```

### Backup Automático

```
1. Job agendado (02:00 diário / 03:00 domingo)
   └─> BackupService.createBackup()

2. Lista arquivos
   ├─> Incremental: WHERE uploadEm > lastBackup
   └─> Completo: Todos os arquivos

3. Copia para bucket de backup
   ├─> Preserva estrutura de pastas
   └─> Adiciona metadata (timestamp, tipo)

4. Registra no DB
   └─> backup { status: 'concluido', totalBytes, ... }

5. Verificação (job 05:00)
   └─> Compara checksums
```

## 🔐 Segurança

### Camadas de Proteção

1. **Autenticação**: JWT obrigatório em todas as rotas
2. **Tenant Isolation**: Middleware valida corretoraId
3. **Permissões**: Decoradores `@authorize(['permissao'])`
4. **MIME Type**: Whitelist de tipos permitidos
5. **Tamanho**: Limite configurável por tenant
6. **URLs Assinadas**: Expiração de 24h
7. **Soft Delete**: Arquivos deletados mantidos para auditoria
8. **Auditoria Admin**: Log completo de ações administrativas

### Validações de Upload

```typescript
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // XLSX
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (configurável por tenant)
```

## 📦 Dependências Principais

### Backend
```json
{
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/s3-request-presigner": "^3.x",
  "pdf-parse": "^1.1.1",
  "bullmq": "^5.x" // Jobs agendados
}
```

### Frontend Admin
```json
{
  "recharts": "^2.x", // Gráficos
  "date-fns": "^3.x",
  "@tanstack/react-table": "^8.x"
}
```

## 🚀 Performance

### Otimizações

1. **Upload direto para R2**: Cliente → R2 (via presigned URL)
2. **Download direto do R2**: Cliente ← R2 (via signed URL)
3. **Cache de métricas**: Snapshot diário (não calcula em tempo real)
4. **Índices no DB**: Todos os foreign keys e buscas frequentes
5. **Paginação**: Limite de 50 registros por request

### Escalabilidade

- **R2**: Escala automaticamente (sem limite de arquivos)
- **Database**: Índices otimizados para queries frequentes
- **API**: Stateless, pode escalar horizontalmente
- **Jobs**: BullMQ com Redis para distribuição

## 📝 Próximos Documentos

Agora que você entende a arquitetura geral, continue com:

1. **[02-SCHEMAS.md](./02-SCHEMAS.md)** - Estrutura completa do banco de dados
2. **[03-STORAGE-SERVICE.md](./03-STORAGE-SERVICE.md)** - Implementação do service de storage
3. **[19-ROADMAP.md](./19-ROADMAP.md)** - Ordem de implementação por sprint
