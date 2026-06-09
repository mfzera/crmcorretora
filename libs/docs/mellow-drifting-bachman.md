# Plano: Sistema de Anexos com Cloudflare R2 + Painel Admin Multi-Tenant

## Visão Geral

Implementar sistema completo de anexos usando Cloudflare R2 como storage, permitindo:
1. Upload de arquivos (PDFs, imagens, documentos)
2. Anexação em cotações e documentos de venda
3. Leitura e extração de dados de PDFs
4. Envio de arquivos no chat (já tem suporte parcial)
5. Visualização e download de anexos
6. **🆕 Painel administrativo multi-tenant** para monitoramento, versionamento e backup

---

# PARTE 1: SISTEMA DE ANEXOS

## Análise do Sistema Atual

### O que já existe:
- **Chat com suporte a arquivos**: Schema `mensagensChat` já tem campos `arquivoUrl`, `arquivoNome`, `arquivoTipo`
- **@fastify/multipart**: Já instalado no package.json para parsing de uploads
- **WebSocket funcional**: Chat service implementado com broadcast real-time
- **Estrutura de cotações e documentos**: Schemas bem definidos com JSONB para dados flexíveis

### O que precisa ser criado:
- Schema de anexos no banco de dados
- SDK client do Cloudflare R2 (S3-compatible)
- Rotas de upload/download na API
- Service layer para gerenciamento de anexos
- Biblioteca de extração de texto de PDFs
- Componentes React para upload e visualização
- Integração com chat WebSocket para envio de arquivos

## Arquitetura da Solução

### 1. Storage: Cloudflare R2
- **Por que R2?**: S3-compatible, zero egress fees, alta performance
- **SDK**: `@aws-sdk/client-s3` (compatível com R2)
- **Estrutura de pastas no bucket**:
  ```
  {corretoraId}/
    ├── cotacoes/{cotacaoId}/
    ├── documentos/{documentoId}/
    ├── chat/{canalId}/
    └── temp/
  ```

### 2. Banco de Dados: Nova tabela `anexos`

```typescript
anexos {
  id: uuid PK
  corretoraId: uuid FK (tenant isolation)
  
  // Relacionamentos polimórficos
  entidadeTipo: enum('cotacao', 'documento_venda', 'mensagem_chat')
  entidadeId: uuid (ID da cotação/documento/mensagem)
  
  // Metadados do arquivo
  nomeOriginal: varchar(256)
  nomeArquivo: varchar(256) // Nome gerado (UUID + extensão)
  mimeType: varchar(100)
  tamanho: bigint // bytes
  
  // Storage
  r2Key: varchar(512) // Chave completa no R2
  r2Bucket: varchar(100)
  urlPublica: varchar(1024) // URL assinada ou pública
  
  // 🆕 Versionamento
  versao: integer DEFAULT 1
  arquivoAnteriorId: uuid FK (anexos) // Link para versão anterior
  
  // Extração de conteúdo (PDFs)
  textoExtraido: text
  metadadosExtracao: jsonb // páginas, autor, data criação, etc
  
  // Auditoria
  uploadPorId: uuid FK (usuarios)
  uploadEm: timestamp
  
  deletedAt: timestamp (soft delete)
  deletedPorId: uuid FK (usuarios)
  
  indexes:
    - (corretoraId, entidadeTipo, entidadeId)
    - (r2Key)
    - (uploadPorId)
    - (arquivoAnteriorId) // Para histórico de versões
}
```

## Implementação Detalhada - Anexos

### Fase 1: Configuração do R2 e SDK

**Arquivos a criar:**
- `libs/shared/storage/src/index.ts` - Storage service
- `libs/shared/storage/src/r2-client.ts` - Cliente R2
- `libs/shared/storage/package.json`

**Dependências a instalar:**
```json
{
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/s3-request-presigner": "^3.x",
  "pdf-parse": "^1.1.1"
}
```

**Variáveis de ambiente (.env):**
```env
# Cloudflare R2
R2_ACCOUNT_ID=sua-account-id
R2_ACCESS_KEY_ID=sua-access-key
R2_SECRET_ACCESS_KEY=sua-secret-key
R2_BUCKET_NAME=ecotech-anexos
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# 🆕 Admin Panel
ADMIN_SECRET_KEY=chave-secreta-super-segura
ADMIN_JWT_SECRET=outro-secret-para-admin
```

**Service principal:**
```typescript
// libs/shared/storage/src/index.ts
export class StorageService {
  // Upload arquivo para R2
  async uploadFile(params: UploadParams): Promise<Anexo>
  
  // Download arquivo do R2
  async downloadFile(anexoId: string): Promise<Buffer>
  
  // Gerar URL assinada (24h expiração)
  async getSignedUrl(anexoId: string): Promise<string>
  
  // 🆕 Upload com versionamento
  async uploadNewVersion(anexoId: string, file: Buffer): Promise<Anexo>
  
  // 🆕 Restaurar versão anterior
  async restoreVersion(anexoId: string, versaoId: string): Promise<Anexo>
  
  // Deletar arquivo (soft delete no DB + remover do R2)
  async deleteFile(anexoId: string): Promise<void>
  
  // Extrair texto de PDF
  async extractPdfText(buffer: Buffer): Promise<ExtractedData>
  
  // 🆕 Calcular uso de storage por corretora
  async getStorageUsage(corretoraId: string): Promise<StorageStats>
}
```

### Fase 2: Schema e Migration do Banco

**Arquivos:**
- `libs/shared/database/src/schema/anexo.ts` - Schema Drizzle
- `libs/shared/database/migrations/0018_add_anexos.sql` - Migration

**Schema Drizzle:**
```typescript
export const entidadeTipoEnum = pgEnum('entidade_tipo_anexo', [
  'cotacao',
  'documento_venda', 
  'mensagem_chat'
]);

export const anexos = pgTable('anexo', {
  id: uuid('id').primaryKey().defaultRandom(),
  corretoraId: uuid('corretora_id').notNull().references(() => corretoras.id),
  
  entidadeTipo: entidadeTipoEnum('entidade_tipo').notNull(),
  entidadeId: uuid('entidade_id').notNull(),
  
  nomeOriginal: varchar('nome_original', { length: 256 }).notNull(),
  nomeArquivo: varchar('nome_arquivo', { length: 256 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  tamanho: bigint('tamanho', { mode: 'number' }).notNull(),
  
  r2Key: varchar('r2_key', { length: 512 }).notNull(),
  r2Bucket: varchar('r2_bucket', { length: 100 }).notNull(),
  urlPublica: varchar('url_publica', { length: 1024 }),
  
  // 🆕 Versionamento
  versao: integer('versao').notNull().default(1),
  arquivoAnteriorId: uuid('arquivo_anterior_id').references(() => anexos.id),
  
  textoExtraido: text('texto_extraido'),
  metadadosExtracao: jsonb('metadados_extracao'),
  
  uploadPorId: uuid('upload_por_id').notNull().references(() => usuarios.id),
  uploadEm: timestamp('upload_em', { withTimezone: true }).defaultNow(),
  
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedPorId: uuid('deleted_por_id').references(() => usuarios.id)
}, (table) => [
  index('idx_anexo_entidade').on(table.corretoraId, table.entidadeTipo, table.entidadeId),
  index('idx_anexo_r2key').on(table.r2Key),
  index('idx_anexo_upload_por').on(table.uploadPorId),
  index('idx_anexo_versao_anterior').on(table.arquivoAnteriorId)
]);
```

### Fase 3: Rotas da API

**Arquivo:** `apps/api/src/routes/anexos/index.ts`

**Rotas a implementar:**

1. **POST /api/anexos/upload**
   - Body: multipart/form-data
   - Headers: Authorization, x-tenant-id
   - Params: entidadeTipo, entidadeId
   - Response: { anexo: Anexo, url: string }
   - Permissão: Depende da entidade (cotacao/documento)

2. **GET /api/anexos/:id**
   - Retorna metadados do anexo
   - Gera URL assinada para download

3. **GET /api/anexos/:id/download**
   - Stream direto do arquivo
   - Valida permissões antes de servir

4. **DELETE /api/anexos/:id**
   - Soft delete
   - Remove arquivo do R2 após soft delete

5. **GET /api/cotacoes/:id/anexos**
   - Lista anexos de uma cotação
   - Com URLs assinadas

6. **GET /api/documentos-venda/:id/anexos**
   - Lista anexos de um documento
   - Com URLs assinadas

7. **POST /api/anexos/:id/extract-pdf**
   - Extrai texto de PDF
   - Salva no campo textoExtraido
   - Retorna texto + metadados

8. **🆕 POST /api/anexos/:id/new-version**
   - Upload de nova versão do arquivo
   - Mantém histórico completo
   - Retorna nova versão

9. **🆕 GET /api/anexos/:id/versions**
   - Lista todas as versões do arquivo
   - Com metadados de cada versão

10. **🆕 POST /api/anexos/:id/restore-version/:versaoId**
    - Restaura versão específica
    - Cria nova versão como cópia da anterior

**Validações:**
- Tamanho máximo: 10MB (configurável por tenant)
- Tipos permitidos: PDF, PNG, JPG, JPEG, DOCX, XLSX
- Permissões: Usuário deve ter acesso à entidade vinculada

### Fase 4: Integração com Chat

**Arquivo:** `libs/plugins/chat/src/chat.service.ts` (modificar)

**Mudanças necessárias:**

1. **Novo método `sendFileMessage`:**
```typescript
async sendFileMessage(
  canalId: string,
  usuarioId: string,
  file: MultipartFile,
  legenda?: string
): Promise<MensagemChat> {
  // 1. Upload para R2
  const anexo = await storageService.uploadFile({
    file,
    entidadeTipo: 'mensagem_chat',
    corretoraId,
    uploadPorId: usuarioId
  });
  
  // 2. Criar mensagem com tipo 'arquivo'
  const mensagem = await db.insert(mensagensChat).values({
    canalId,
    usuarioId,
    tipo: 'arquivo',
    conteudo: legenda || anexo.nomeOriginal,
    arquivoUrl: anexo.urlPublica,
    arquivoNome: anexo.nomeOriginal,
    arquivoTipo: anexo.mimeType
  }).returning();
  
  // 3. Vincular anexo à mensagem
  await db.update(anexos)
    .set({ entidadeId: mensagem.id })
    .where(eq(anexos.id, anexo.id));
  
  // 4. Broadcast via WebSocket
  await this.broadcastToChannel(...);
  
  return mensagem;
}
```

### Fase 5: Leitura de PDFs de Cotações Antigas

**Objetivo:** Importar PDFs existentes e extrair dados

**Arquivo:** `apps/api/src/routes/anexos/import-legacy.ts`

**Funcionalidades:**
1. **POST /api/anexos/import-legacy**
   - Upload de PDF de cotação antiga
   - Extração automática de texto
   - Tentativa de parsing de dados (regex patterns)
   - Sugestão de campos para preencher cotação
   - Retorna: textoExtraido + campos sugeridos

2. **Patterns de extração:**
```typescript
const patterns = {
  numeroCotacao: /cota[çc][aã]o\s*n[°º]?\s*:?\s*(\d+[-\/]\d+)/i,
  valor: /valor\s*:?\s*r\$\s*([\d.,]+)/i,
  vigencia: /vig[êe]ncia\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  segurado: /segurado\s*:?\s*([^\n]+)/i
};
```

---

# PARTE 2: PAINEL ADMINISTRATIVO MULTI-TENANT

## Objetivo

Criar interface administrativa **acima do tenant** para:
1. Monitorar uso de storage por corretora (GB, arquivos, custos)
2. Gerenciar versionamento de arquivos
3. Realizar backups manuais e automáticos
4. Alertas de limite de uso
5. Análise de crescimento e tendências

## Arquitetura do Admin Panel

### 1. Autenticação Separada

**Sistema dual de autenticação:**
- **Auth normal**: JWT para usuários de corretoras (já existe)
- **Auth admin**: JWT separado para super-admin (novo)

**Schema de admin:**
```typescript
// libs/shared/database/src/schema/admin.ts
admins {
  id: uuid PK
  email: varchar(255) UNIQUE
  senha: varchar(255) // bcrypt
  nome: varchar(255)
  
  // Permissões granulares
  permissoes: jsonb // ['view_usage', 'manage_backups', 'view_all_tenants']
  
  ultimoLogin: timestamp
  ativo: boolean DEFAULT true
  
  createdAt: timestamp
  updatedAt: timestamp
}

// Log de ações administrativas (auditoria)
admin_audit_logs {
  id: uuid PK
  adminId: uuid FK
  acao: varchar(100) // 'backup_created', 'storage_limit_updated'
  entidadeTipo: varchar(50) // 'corretora', 'anexo', 'backup'
  entidadeId: uuid
  detalhes: jsonb
  ip: varchar(45)
  userAgent: text
  timestamp: timestamp
}
```

### 2. Monitoramento de Uso de Storage

**Nova tabela para métricas:**
```typescript
// libs/shared/database/src/schema/storage-metrics.ts
storage_metrics {
  id: uuid PK
  corretoraId: uuid FK
  
  // Snapshot diário
  data: date NOT NULL
  
  // Métricas de uso
  totalArquivos: integer
  totalBytes: bigint
  totalBytesCotacoes: bigint
  totalBytesDocumentos: bigint
  totalBytesChat: bigint
  
  // Crescimento
  arquivosAdicionados: integer
  arquivosRemovidos: integer
  bytesAdicionados: bigint
  bytesRemovidos: bigint
  
  // Custos estimados (R2 pricing)
  custoEstimadoMensal: decimal(10,2)
  
  createdAt: timestamp
  
  indexes:
    - (corretoraId, data) UNIQUE
    - (data)
}

// Limites de storage por corretora
storage_limits {
  id: uuid PK
  corretoraId: uuid FK UNIQUE
  
  // Limites configuráveis
  limiteBytes: bigint // Ex: 5GB = 5 * 1024^3
  limiteArquivos: integer
  
  // Alertas
  alertarEm: decimal(5,2) DEFAULT 80 // Alertar em 80%
  bloquearUploadEm: decimal(5,2) DEFAULT 95 // Bloquear em 95%
  
  // Contatos para alertas
  emailsAlerta: jsonb // ['admin@corretora.com']
  
  updatedAt: timestamp
  updatedPorId: uuid FK (admins)
}
```

**Service para cálculo de métricas:**
```typescript
// libs/shared/storage/src/metrics-service.ts
export class StorageMetricsService {
  // Calcular uso atual de uma corretora
  async calculateUsage(corretoraId: string): Promise<UsageStats> {
    const anexos = await db.query.anexos.findMany({
      where: and(
        eq(anexos.corretoraId, corretoraId),
        isNull(anexos.deletedAt)
      )
    });
    
    return {
      totalFiles: anexos.length,
      totalBytes: anexos.reduce((sum, a) => sum + a.tamanho, 0),
      byType: {
        cotacoes: anexos.filter(a => a.entidadeTipo === 'cotacao'),
        documentos: anexos.filter(a => a.entidadeTipo === 'documento_venda'),
        chat: anexos.filter(a => a.entidadeTipo === 'mensagem_chat')
      }
    };
  }
  
  // Criar snapshot diário (cron job)
  async createDailySnapshot(): Promise<void> {
    const corretoras = await db.query.corretoras.findMany();
    
    for (const corretora of corretoras) {
      const usage = await this.calculateUsage(corretora.id);
      
      await db.insert(storageMetrics).values({
        corretoraId: corretora.id,
        data: new Date(),
        totalArquivos: usage.totalFiles,
        totalBytes: usage.totalBytes,
        // ... outras métricas
      });
    }
  }
  
  // Verificar se corretora está próxima do limite
  async checkLimits(corretoraId: string): Promise<LimitStatus> {
    const usage = await this.calculateUsage(corretoraId);
    const limit = await db.query.storageLimits.findFirst({
      where: eq(storageLimits.corretoraId, corretoraId)
    });
    
    if (!limit) return { ok: true };
    
    const percentUsed = (usage.totalBytes / limit.limiteBytes) * 100;
    
    return {
      ok: percentUsed < limit.bloquearUploadEm,
      shouldAlert: percentUsed >= limit.alertarEm,
      percentUsed,
      bytesUsed: usage.totalBytes,
      bytesLimit: limit.limiteBytes
    };
  }
}
```

### 3. Sistema de Backup

**Estratégia de backup:**
- **Backup incremental diário**: Apenas arquivos novos/modificados
- **Backup completo semanal**: Todos os arquivos
- **Retenção**: 30 dias para incrementais, 90 dias para completos

**Nova tabela:**
```typescript
// libs/shared/database/src/schema/backup.ts
backups {
  id: uuid PK
  
  tipo: enum('incremental', 'completo') NOT NULL
  
  // Escopo
  corretoraId: uuid FK // null = backup global
  
  // Status
  status: enum('em_progresso', 'concluido', 'falhou') NOT NULL
  
  // Metadados
  totalArquivos: integer
  totalBytes: bigint
  arquivosNovos: integer // Para incrementais
  arquivosModificados: integer
  
  // Storage do backup
  backupBucket: varchar(100) // Bucket separado para backups
  backupPrefix: varchar(512) // Prefixo no bucket
  
  // Verificação de integridade
  checksumMD5: varchar(32)
  verificado: boolean DEFAULT false
  
  // Metadados de execução
  iniciadoEm: timestamp NOT NULL
  finalizadoEm: timestamp
  duracaoSegundos: integer
  
  iniciadoPorId: uuid FK (admins)
  
  // Logs e erros
  logs: jsonb
  erro: text
  
  indexes:
    - (corretoraId, tipo, status)
    - (iniciadoEm DESC)
}

// Agendamentos de backup
backup_schedules {
  id: uuid PK
  corretoraId: uuid FK // null = todas
  
  tipo: enum('incremental', 'completo')
  
  // Cron expression
  cronExpression: varchar(100) // '0 2 * * *' = 2am todo dia
  ativo: boolean DEFAULT true
  
  proximaExecucao: timestamp
  ultimaExecucao: timestamp
  
  createdAt: timestamp
  createdPorId: uuid FK (admins)
}
```

**Service de backup:**
```typescript
// libs/shared/storage/src/backup-service.ts
export class BackupService {
  private backupBucket = 'ecotech-backups';
  
  // Backup completo de uma corretora
  async createFullBackup(corretoraId: string): Promise<Backup> {
    const backup = await db.insert(backups).values({
      tipo: 'completo',
      corretoraId,
      status: 'em_progresso',
      iniciadoEm: new Date()
    }).returning();
    
    try {
      // Listar todos os anexos da corretora
      const anexos = await db.query.anexos.findMany({
        where: and(
          eq(anexos.corretoraId, corretoraId),
          isNull(anexos.deletedAt)
        )
      });
      
      // Copiar arquivos para bucket de backup
      const backupPrefix = `full/${corretoraId}/${Date.now()}`;
      
      for (const anexo of anexos) {
        await this.copyToBackup(anexo.r2Key, backupPrefix);
      }
      
      // Atualizar status
      await db.update(backups)
        .set({
          status: 'concluido',
          finalizadoEm: new Date(),
          totalArquivos: anexos.length,
          totalBytes: anexos.reduce((sum, a) => sum + a.tamanho, 0),
          backupBucket: this.backupBucket,
          backupPrefix
        })
        .where(eq(backups.id, backup.id));
      
      return backup;
    } catch (error) {
      await db.update(backups)
        .set({
          status: 'falhou',
          finalizadoEm: new Date(),
          erro: error.message
        })
        .where(eq(backups.id, backup.id));
      
      throw error;
    }
  }
  
  // Restaurar backup
  async restoreBackup(backupId: string): Promise<void> {
    const backup = await db.query.backups.findFirst({
      where: eq(backups.id, backupId)
    });
    
    if (!backup || backup.status !== 'concluido') {
      throw new Error('Backup inválido ou incompleto');
    }
    
    // Listar arquivos do backup e restaurar
    // ... lógica de restore
  }
  
  // Verificar integridade do backup
  async verifyBackup(backupId: string): Promise<boolean> {
    // Comparar checksums
    // Verificar existência dos arquivos
    // ... lógica de verificação
  }
}
```

### 4. Rotas da API Admin

**Arquivo:** `apps/api/src/routes/admin/index.ts`

**Autenticação:**
```typescript
// Middleware de autenticação admin
const authenticateAdmin = async (request, reply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return reply.status(401).send({ error: 'Token não fornecido' });
  }
  
  try {
    const decoded = jwt.verify(token, env.ADMIN_JWT_SECRET);
    
    const admin = await db.query.admins.findFirst({
      where: and(
        eq(admins.id, decoded.sub),
        eq(admins.ativo, true)
      )
    });
    
    if (!admin) {
      return reply.status(401).send({ error: 'Admin inválido' });
    }
    
    request.admin = admin;
  } catch (error) {
    return reply.status(401).send({ error: 'Token inválido' });
  }
};
```

**Rotas:**

1. **POST /api/admin/auth/login**
   - Login de super-admin
   - Retorna JWT separado

2. **GET /api/admin/tenants**
   - Lista todas as corretoras
   - Com métricas de uso

3. **GET /api/admin/tenants/:id/usage**
   - Detalhes de uso de uma corretora
   - Gráficos de crescimento
   - Lista de maiores arquivos

4. **GET /api/admin/tenants/:id/usage/history**
   - Histórico de uso (storage_metrics)
   - Para gráficos de tendência

5. **PUT /api/admin/tenants/:id/limits**
   - Atualizar limites de storage
   - Configurar alertas

6. **GET /api/admin/storage/overview**
   - Visão geral de todo o sistema
   - Total usado, por corretora, crescimento

7. **POST /api/admin/backups**
   - Criar backup manual
   - Params: corretoraId (opcional), tipo

8. **GET /api/admin/backups**
   - Listar todos os backups
   - Filtros: corretora, tipo, status

9. **GET /api/admin/backups/:id**
   - Detalhes de um backup
   - Logs, arquivos incluídos

10. **POST /api/admin/backups/:id/restore**
    - Restaurar backup
    - Requer confirmação

11. **POST /api/admin/backups/:id/verify**
    - Verificar integridade

12. **GET /api/admin/audit-logs**
    - Logs de ações administrativas
    - Auditoria completa

13. **POST /api/admin/backups/schedule**
    - Criar agendamento de backup

14. **GET /api/admin/files/orphaned**
    - Listar arquivos órfãos (sem registro no DB)
    - Para limpeza

15. **POST /api/admin/files/cleanup**
    - Limpar arquivos deletados antigos
    - Remover do R2

### 5. Frontend Admin Panel

**Nova aplicação Next.js separada:**
```
apps/
├── web/ (app normal dos tenants)
└── admin/ ✨ NOVO
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/
    │   │   │   └── login/
    │   │   └── (dashboard)/
    │   │       ├── overview/ - Dashboard geral
    │   │       ├── tenants/ - Lista de corretoras
    │   │       │   └── [id]/
    │   │       │       ├── usage/ - Uso de storage
    │   │       │       ├── files/ - Lista de arquivos
    │   │       │       └── settings/ - Configurações
    │   │       ├── backups/ - Gerenciamento de backups
    │   │       ├── audit/ - Logs de auditoria
    │   │       └── settings/ - Configurações globais
    │   └── components/
    │       ├── charts/
    │       │   ├── storage-usage-chart.tsx
    │       │   ├── growth-trend-chart.tsx
    │       │   └── breakdown-pie-chart.tsx
    │       ├── tenants/
    │       │   ├── tenant-list.tsx
    │       │   ├── tenant-card.tsx
    │       │   └── usage-meter.tsx
    │       └── backups/
    │           ├── backup-list.tsx
    │           ├── create-backup-dialog.tsx
    │           └── restore-backup-dialog.tsx
    └── package.json
```

**Dependências frontend admin:**
```json
{
  "recharts": "^2.x", // Para gráficos
  "date-fns": "^3.x", // Manipulação de datas
  "@tanstack/react-table": "^8.x" // Tabelas avançadas
}
```

**Componentes principais:**

1. **Dashboard Overview (`overview/page.tsx`):**
   - Cards com totais: Storage usado, Arquivos, Corretoras
   - Gráfico de crescimento nos últimos 30 dias
   - Lista de corretoras mais próximas do limite
   - Últimos backups realizados
   - Alertas e notificações

2. **Tenant Usage (`tenants/[id]/usage/page.tsx`):**
   - Gráfico de pizza: Uso por tipo (cotações, documentos, chat)
   - Gráfico de linha: Crescimento histórico
   - Lista dos 50 maiores arquivos
   - Botão para criar backup
   - Configurar limites e alertas

3. **Backup Management (`backups/page.tsx`):**
   - Tabela de backups com status
   - Filtros por corretora, tipo, data
   - Botão "Criar Backup"
   - Ações: Verificar, Restaurar, Download logs
   - Agendamentos ativos

4. **Audit Logs (`audit/page.tsx`):**
   - Tabela de logs de ações administrativas
   - Filtros por admin, ação, data
   - Detalhes de cada ação em modal

### 6. Worker para Tarefas Agendadas

**Arquivo:** `apps/worker/src/jobs/storage-jobs.ts`

**Jobs a implementar:**

1. **Daily Metrics Snapshot** (todo dia 00:00):
```typescript
async function dailyMetricsSnapshot() {
  const metricsService = new StorageMetricsService();
  await metricsService.createDailySnapshot();
}
```

2. **Check Storage Limits** (a cada hora):
```typescript
async function checkStorageLimits() {
  const corretoras = await db.query.corretoras.findMany();
  
  for (const corretora of corretoras) {
    const status = await metricsService.checkLimits(corretora.id);
    
    if (status.shouldAlert) {
      // Enviar email de alerta
      await sendAlertEmail({
        to: corretora.emailAdmin,
        subject: 'Alerta: Limite de storage próximo',
        body: `Sua corretora está usando ${status.percentUsed}% do limite.`
      });
    }
  }
}
```

3. **Incremental Backup** (todo dia 02:00):
```typescript
async function incrementalBackup() {
  const backupService = new BackupService();
  const corretoras = await db.query.corretoras.findMany();
  
  for (const corretora of corretoras) {
    await backupService.createIncrementalBackup(corretora.id);
  }
}
```

4. **Weekly Full Backup** (domingo 03:00):
```typescript
async function weeklyFullBackup() {
  const backupService = new BackupService();
  const corretoras = await db.query.corretoras.findMany();
  
  for (const corretora of corretoras) {
    await backupService.createFullBackup(corretora.id);
  }
}
```

5. **Cleanup Old Backups** (todo dia 04:00):
```typescript
async function cleanupOldBackups() {
  // Remover backups incrementais > 30 dias
  // Remover backups completos > 90 dias
}
```

6. **Verify Recent Backups** (todo dia 05:00):
```typescript
async function verifyRecentBackups() {
  const backupService = new BackupService();
  
  // Verificar backups dos últimos 7 dias
  const recentBackups = await db.query.backups.findMany({
    where: and(
      eq(backups.verificado, false),
      gt(backups.iniciadoEm, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    )
  });
  
  for (const backup of recentBackups) {
    await backupService.verifyBackup(backup.id);
  }
}
```

### 7. Alertas e Notificações

**Sistema de alertas:**
```typescript
// libs/shared/utils/src/alerts.ts
export class AlertService {
  // Alerta de limite de storage
  async alertStorageLimit(corretoraId: string, percentUsed: number) {
    const corretora = await db.query.corretoras.findFirst({
      where: eq(corretoras.id, corretoraId)
    });
    
    const limit = await db.query.storageLimits.findFirst({
      where: eq(storageLimits.corretoraId, corretoraId)
    });
    
    // Enviar email
    await emailService.send({
      to: limit?.emailsAlerta || [corretora.emailAdmin],
      subject: '⚠️ Alerta: Limite de storage',
      template: 'storage-limit-alert',
      data: {
        corretoraName: corretora.nomeFantasia,
        percentUsed: percentUsed.toFixed(2),
        bytesUsed: formatBytes(usage.totalBytes),
        bytesLimit: formatBytes(limit.limiteBytes),
        dashboardUrl: `${env.ADMIN_URL}/tenants/${corretoraId}/usage`
      }
    });
    
    // Criar notificação no sistema
    await db.insert(notificacoes).values({
      corretoraId,
      tipo: 'storage_alert',
      titulo: 'Limite de storage próximo',
      mensagem: `Você está usando ${percentUsed}% do seu limite de storage.`,
      linkAcao: '/configuracoes/storage'
    });
  }
  
  // Alerta de backup falhou
  async alertBackupFailed(backupId: string) {
    const backup = await db.query.backups.findFirst({
      where: eq(backups.id, backupId),
      with: { corretora: true }
    });
    
    // Enviar email para admins
    await emailService.send({
      to: env.ADMIN_EMAILS.split(','),
      subject: '🚨 Backup falhou',
      template: 'backup-failed',
      data: {
        corretoraName: backup.corretora?.nomeFantasia,
        backupType: backup.tipo,
        error: backup.erro,
        timestamp: backup.iniciadoEm
      }
    });
  }
}
```

## Estrutura de Diretórios Final

```
ecotech-sys/
├── libs/
│   ├── shared/
│   │   ├── database/
│   │   │   ├── src/schema/
│   │   │   │   ├── anexo.ts ✨ NOVO
│   │   │   │   ├── admin.ts ✨ NOVO
│   │   │   │   ├── storage-metrics.ts ✨ NOVO
│   │   │   │   └── backup.ts ✨ NOVO
│   │   │   └── migrations/
│   │   │       ├── 0018_add_anexos.sql ✨ NOVO
│   │   │       ├── 0019_add_admin_tables.sql ✨ NOVO
│   │   │       └── 0020_add_storage_metrics.sql ✨ NOVO
│   │   ├── storage/ ✨ NOVO
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   ├── r2-client.ts
│   │   │   │   ├── pdf-extractor.ts
│   │   │   │   ├── metrics-service.ts ✨ NOVO
│   │   │   │   └── backup-service.ts ✨ NOVO
│   │   │   └── package.json
│   │   └── utils/
│   │       └── src/
│   │           └── alerts.ts ✨ NOVO
│   └── plugins/
│       └── chat/
│           └── src/chat.service.ts 🔧 MODIFICAR
├── apps/
│   ├── api/
│   │   └── src/routes/
│   │       ├── anexos/ ✨ NOVO
│   │       │   ├── index.ts
│   │       │   └── import-legacy.ts
│   │       └── admin/ ✨ NOVO
│   │           ├── index.ts
│   │           ├── auth.ts
│   │           ├── tenants.ts
│   │           ├── backups.ts
│   │           └── audit.ts
│   ├── web/ (app normal)
│   ├── admin/ ✨ NOVO (painel admin)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/login/
│   │   │   │   └── (dashboard)/
│   │   │   │       ├── overview/
│   │   │   │       ├── tenants/
│   │   │   │       ├── backups/
│   │   │   │       ├── audit/
│   │   │   │       └── settings/
│   │   │   └── components/
│   │   └── package.json
│   └── worker/
│       └── src/jobs/
│           └── storage-jobs.ts ✨ NOVO
└── .env
    └── # Adicionar vars ✨ NOVO
```

## Ordem de Implementação

### Sprint 1: Fundação - Anexos (Backend)
1. ✅ Instalar dependências: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `pdf-parse`
2. ✅ Criar schema de anexos + migration
3. ✅ Implementar `StorageService` (R2 client)
4. ✅ Implementar extração de PDFs
5. ✅ Criar rotas básicas de upload/download

### Sprint 2: Integração com Entidades
6. ✅ Rotas de anexos para cotações
7. ✅ Rotas de anexos para documentos
8. ✅ Integração com chat (mensagens com arquivo)
9. ✅ Componentes React básicos de anexos

### Sprint 3: 🆕 Admin Panel - Fundação
10. ✅ Criar schemas admin, storage_metrics, backup
11. ✅ Implementar autenticação admin separada
12. ✅ Criar `StorageMetricsService`
13. ✅ Criar `BackupService`
14. ✅ Implementar rotas admin básicas

### Sprint 4: 🆕 Admin Panel - Frontend
15. ✅ Criar app Next.js separado (`apps/admin`)
16. ✅ Implementar dashboard overview
17. ✅ Página de detalhes de tenant
18. ✅ Página de gerenciamento de backups
19. ✅ Gráficos e visualizações

### Sprint 5: 🆕 Automação e Workers
20. ✅ Implementar jobs do worker (BullMQ)
21. ✅ Daily metrics snapshot
22. ✅ Storage limits check + alertas
23. ✅ Backups automáticos (incremental/completo)
24. ✅ Cleanup de backups antigos

### Sprint 6: Versionamento e Features Avançadas
25. ✅ Implementar versionamento de arquivos
26. ✅ UI para histórico de versões
27. ✅ Restaurar versão anterior
28. ✅ Import de PDFs legados

### Sprint 7: Testes e Refinamentos
29. ✅ Testes de carga (upload massivo)
30. ✅ Testes de restore de backup
31. ✅ Validação de integridade
32. ✅ Documentação completa

## Arquivos Críticos

### Backend Core:
- `libs/shared/database/src/schema/anexo.ts` - Schema de anexos
- `libs/shared/storage/src/index.ts` - Service principal
- `apps/api/src/routes/anexos/index.ts` - Rotas de anexos

### Admin Backend:
- `libs/shared/database/src/schema/admin.ts` - Schema admin
- `libs/shared/database/src/schema/storage-metrics.ts` - Métricas
- `libs/shared/database/src/schema/backup.ts` - Backups
- `libs/shared/storage/src/metrics-service.ts` - Cálculo de métricas
- `libs/shared/storage/src/backup-service.ts` - Gerenciamento de backups
- `apps/api/src/routes/admin/index.ts` - Rotas admin

### Admin Frontend:
- `apps/admin/src/app/(dashboard)/overview/page.tsx` - Dashboard
- `apps/admin/src/app/(dashboard)/tenants/[id]/usage/page.tsx` - Detalhes
- `apps/admin/src/app/(dashboard)/backups/page.tsx` - Backups
- `apps/admin/src/components/charts/*` - Gráficos

### Workers:
- `apps/worker/src/jobs/storage-jobs.ts` - Jobs agendados

## Verificação e Testes

### Testes de Anexos:
1. Upload básico (PDF, imagem)
2. Download e URLs assinadas
3. Versionamento de arquivos
4. Extração de texto de PDF
5. Chat com arquivos

### Testes de Admin:
1. Login no painel admin
2. Visualizar métricas de corretora
3. Criar backup manual
4. Verificar integridade de backup
5. Restaurar backup
6. Configurar limites
7. Receber alertas de limite

### Testes de Automação:
1. Job de snapshot diário executando
2. Alertas sendo enviados
3. Backups incrementais automáticos
4. Backup completo semanal
5. Cleanup de backups antigos

## Segurança

### Isolamento:
1. **Tenant Isolation**: Anexos isolados por corretoraId
2. **Admin Isolation**: Autenticação completamente separada
3. **Auditoria**: Todos os acessos admin são registrados

### Validações:
- Tamanho máximo por arquivo e por tenant
- MIME types permitidos
- Limites de quota aplicados em tempo real
- Bloqueio de upload quando limite atingido

### Backups:
- Bucket separado para backups
- Retenção de 30-90 dias
- Verificação de integridade automática
- Criptografia em repouso (R2 default)

## Custos Estimados (Cloudflare R2)

**Pricing R2 (2024):**
- Storage: $0.015/GB/mês
- Class A operations (write): $4.50/milhão
- Class B operations (read): $0.36/milhão
- Egress: **$0** (principal vantagem)

**Exemplo para 10 corretoras:**
- 5GB por corretora = 50GB total
- Custo storage: 50GB × $0.015 = **$0.75/mês**
- Uploads (100k/mês): 100k × $0.0000045 = **$0.45/mês**
- Downloads (500k/mês): 500k × $0.00000036 = **$0.18/mês**
- **TOTAL: ~$1.40/mês** (muito barato!)

**Backups:**
- Bucket separado: +50GB = +$0.75/mês
- **TOTAL COM BACKUP: ~$2.15/mês**

## Observações Importantes

1. **R2 vs S3**: R2 é muito mais barato devido a zero egress fees
2. **Versionamento**: Cada versão é um arquivo separado no R2
3. **Soft delete**: Arquivos deletados ficam no banco mas são removidos do R2
4. **Backup incremental**: Economiza espaço e tempo
5. **Admin separado**: Não compartilha autenticação com tenants
6. **Métricas diárias**: Permite análise histórica precisa
7. **Alertas proativos**: Evita surpresas de limite estourado

## Próximos Passos (Pós-MVP)

- [ ] CDN na frente do R2 (Cloudflare CDN)
- [ ] Compressão automática de imagens
- [ ] OCR para PDFs escaneados
- [ ] Thumbnails automáticos
- [ ] Busca full-text em anexos
- [ ] Relatórios de uso por usuário
- [ ] Integração com antivírus (ClamAV)
- [ ] Backup para S3 Glacier (archive de longo prazo)
- [ ] Dashboard de custos real-time
- [ ] Predição de crescimento com ML
