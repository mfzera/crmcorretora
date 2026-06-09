# 02 - Schemas do Banco de Dados

## 📊 Visão Geral

Novos schemas necessários para o sistema de anexos e admin panel:

1. **anexos** - Armazenamento de metadados de arquivos
2. **admins** - Usuários administrativos (super-users)
3. **admin_audit_logs** - Auditoria de ações admin
4. **storage_metrics** - Métricas diárias de uso de storage
5. **storage_limits** - Limites configuráveis por tenant
6. **backups** - Registros de backups realizados
7. **backup_schedules** - Agendamentos de backup

## 🗂️ Schema 1: anexos

**Arquivo**: `libs/shared/database/src/schema/anexo.ts`

### Estrutura

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  bigint,
  integer,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum para tipos de entidade
export const entidadeTipoEnum = pgEnum('entidade_tipo_anexo', [
  'cotacao',
  'documento_venda',
  'mensagem_chat',
]);

export const anexos = pgTable(
  'anexo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Relacionamento polimórfico
    entidadeTipo: entidadeTipoEnum('entidade_tipo').notNull(),
    entidadeId: uuid('entidade_id').notNull(),

    // Metadados do arquivo
    nomeOriginal: varchar('nome_original', { length: 256 }).notNull(),
    nomeArquivo: varchar('nome_arquivo', { length: 256 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    tamanho: bigint('tamanho', { mode: 'number' }).notNull(),

    // Storage R2
    r2Key: varchar('r2_key', { length: 512 }).notNull(),
    r2Bucket: varchar('r2_bucket', { length: 100 }).notNull(),
    urlPublica: varchar('url_publica', { length: 1024 }),

    // Versionamento
    versao: integer('versao').notNull().default(1),
    arquivoAnteriorId: uuid('arquivo_anterior_id').references(() => anexos.id),

    // Extração de conteúdo (PDFs)
    textoExtraido: text('texto_extraido'),
    metadadosExtracao: jsonb('metadados_extracao'),

    // Auditoria
    uploadPorId: uuid('upload_por_id')
      .notNull()
      .references(() => usuarios.id),
    uploadEm: timestamp('upload_em', { withTimezone: true }).defaultNow(),

    // Soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedPorId: uuid('deleted_por_id').references(() => usuarios.id),
  },
  (table) => [
    index('idx_anexo_entidade').on(
      table.corretoraId,
      table.entidadeTipo,
      table.entidadeId
    ),
    index('idx_anexo_r2key').on(table.r2Key),
    index('idx_anexo_upload_por').on(table.uploadPorId),
    index('idx_anexo_versao_anterior').on(table.arquivoAnteriorId),
    index('idx_anexo_deleted').on(table.deletedAt),
  ]
);

// Relations
export const anexosRelations = relations(anexos, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [anexos.corretoraId],
    references: [corretoras.id],
  }),
  uploadPor: one(usuarios, {
    fields: [anexos.uploadPorId],
    references: [usuarios.id],
  }),
  deletedPor: one(usuarios, {
    fields: [anexos.deletedPorId],
    references: [usuarios.id],
    relationName: 'anexosDeleted',
  }),
  versaoAnterior: one(anexos, {
    fields: [anexos.arquivoAnteriorId],
    references: [anexos.id],
    relationName: 'versoes',
  }),
}));

// Types
export type Anexo = typeof anexos.$inferSelect;
export type NewAnexo = typeof anexos.$inferInsert;
```

### Campos Importantes

- **entidadeTipo/entidadeId**: Relacionamento polimórfico (pode ser cotação, documento ou mensagem)
- **versao/arquivoAnteriorId**: Sistema de versionamento em cadeia
- **r2Key**: Caminho completo no R2 (ex: `{corretoraId}/cotacoes/{id}/file.pdf`)
- **textoExtraido**: Texto extraído de PDFs para busca
- **metadadosExtracao**: `{ paginas: 10, autor: 'João', dataC riacao: '...' }`

## 👤 Schema 2: admins

**Arquivo**: `libs/shared/database/src/schema/admin.ts`

```typescript
export const admins = pgTable(
  'admin',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    senha: varchar('senha', { length: 255 }).notNull(), // bcrypt
    nome: varchar('nome', { length: 255 }).notNull(),

    // Permissões granulares
    permissoes: jsonb('permissoes').notNull().default([]),
    // Ex: ['view_usage', 'manage_backups', 'view_all_tenants', 'manage_admins']

    ultimoLogin: timestamp('ultimo_login', { withTimezone: true }),
    ativo: boolean('ativo').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('idx_admin_email').on(table.email)]
);

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
```

### Permissões Admin

```typescript
const ADMIN_PERMISSIONS = {
  VIEW_USAGE: 'view_usage', // Ver métricas de uso
  MANAGE_LIMITS: 'manage_limits', // Alterar limites de tenants
  VIEW_ALL_TENANTS: 'view_all_tenants', // Ver todos os tenants
  MANAGE_BACKUPS: 'manage_backups', // Criar/restaurar backups
  MANAGE_ADMINS: 'manage_admins', // Gerenciar outros admins
  VIEW_AUDIT_LOGS: 'view_audit_logs', // Ver logs de auditoria
  CLEANUP_FILES: 'cleanup_files', // Limpar arquivos órfãos
};
```

## 📝 Schema 3: admin_audit_logs

**Arquivo**: `libs/shared/database/src/schema/admin.ts` (mesmo arquivo)

```typescript
export const adminAuditLogs = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id),

    acao: varchar('acao', { length: 100 }).notNull(),
    // Ex: 'backup_created', 'storage_limit_updated', 'tenant_viewed'

    entidadeTipo: varchar('entidade_tipo', { length: 50 }),
    // Ex: 'corretora', 'anexo', 'backup'

    entidadeId: uuid('entidade_id'),

    detalhes: jsonb('detalhes'),
    // Ex: { limiteAnterior: 5GB, limiteNovo: 10GB }

    // Metadata de segurança
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),

    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_audit_admin').on(table.adminId),
    index('idx_audit_timestamp').on(table.timestamp),
    index('idx_audit_acao').on(table.acao),
  ]
);

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
```

## 📊 Schema 4: storage_metrics

**Arquivo**: `libs/shared/database/src/schema/storage-metrics.ts`

```typescript
export const storageMetrics = pgTable(
  'storage_metric',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Snapshot diário
    data: date('data').notNull(),

    // Métricas de uso
    totalArquivos: integer('total_arquivos').notNull().default(0),
    totalBytes: bigint('total_bytes', { mode: 'number' }).notNull().default(0),

    // Breakdown por tipo
    totalBytesCotacoes: bigint('total_bytes_cotacoes', { mode: 'number' })
      .notNull()
      .default(0),
    totalBytesDocumentos: bigint('total_bytes_documentos', { mode: 'number' })
      .notNull()
      .default(0),
    totalBytesChat: bigint('total_bytes_chat', { mode: 'number' })
      .notNull()
      .default(0),

    // Crescimento (delta desde último snapshot)
    arquivosAdicionados: integer('arquivos_adicionados').notNull().default(0),
    arquivosRemovidos: integer('arquivos_removidos').notNull().default(0),
    bytesAdicionados: bigint('bytes_adicionados', { mode: 'number' })
      .notNull()
      .default(0),
    bytesRemovidos: bigint('bytes_removidos', { mode: 'number' })
      .notNull()
      .default(0),

    // Custos estimados (R2 pricing)
    custoEstimadoMensal: decimal('custo_estimado_mensal', {
      precision: 10,
      scale: 2,
    }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('unq_storage_metric_data').on(table.corretoraId, table.data),
    index('idx_storage_metric_corretora').on(table.corretoraId),
    index('idx_storage_metric_data').on(table.data),
  ]
);

export type StorageMetric = typeof storageMetrics.$inferSelect;
```

### Cálculo de Custos

```typescript
// R2 Pricing (2024)
const R2_PRICING = {
  STORAGE_PER_GB: 0.015, // $/GB/month
  CLASS_A_PER_MILLION: 4.5, // write operations
  CLASS_B_PER_MILLION: 0.36, // read operations
  EGRESS: 0, // FREE!
};

function calculateMonthlyCost(totalBytes: number): number {
  const gb = totalBytes / (1024 * 1024 * 1024);
  return gb * R2_PRICING.STORAGE_PER_GB;
}
```

## ⚖️ Schema 5: storage_limits

**Arquivo**: `libs/shared/database/src/schema/storage-metrics.ts` (mesmo arquivo)

```typescript
export const storageLimits = pgTable(
  'storage_limit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .unique()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Limites configuráveis
    limiteBytes: bigint('limite_bytes', { mode: 'number' })
      .notNull()
      .default(5 * 1024 * 1024 * 1024), // 5GB default
    limiteArquivos: integer('limite_arquivos').notNull().default(10000),

    // Thresholds de alerta (percentual)
    alertarEm: decimal('alertar_em', { precision: 5, scale: 2 })
      .notNull()
      .default('80.00'), // 80%
    bloquearUploadEm: decimal('bloquear_upload_em', { precision: 5, scale: 2 })
      .notNull()
      .default('95.00'), // 95%

    // Contatos para alertas
    emailsAlerta: jsonb('emails_alerta').default([]),
    // Ex: ['admin@corretora.com', 'tech@corretora.com']

    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    updatedPorId: uuid('updated_por_id').references(() => admins.id),
  },
  (table) => [index('idx_storage_limit_corretora').on(table.corretoraId)]
);

export type StorageLimit = typeof storageLimits.$inferSelect;
```

## 💾 Schema 6: backups

**Arquivo**: `libs/shared/database/src/schema/backup.ts`

```typescript
export const tipoBackupEnum = pgEnum('tipo_backup', [
  'incremental',
  'completo',
]);

export const statusBackupEnum = pgEnum('status_backup', [
  'em_progresso',
  'concluido',
  'falhou',
]);

export const backups = pgTable(
  'backup',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    tipo: tipoBackupEnum('tipo').notNull(),

    // Escopo (null = backup global de todas as corretoras)
    corretoraId: uuid('corretora_id').references(() => corretoras.id, {
      onDelete: 'set null',
    }),

    // Status
    status: statusBackupEnum('status').notNull().default('em_progresso'),

    // Metadados
    totalArquivos: integer('total_arquivos').default(0),
    totalBytes: bigint('total_bytes', { mode: 'number' }).default(0),
    arquivosNovos: integer('arquivos_novos').default(0), // Para incrementais
    arquivosModificados: integer('arquivos_modificados').default(0),

    // Storage do backup
    backupBucket: varchar('backup_bucket', { length: 100 })
      .notNull()
      .default('ecotech-backups'),
    backupPrefix: varchar('backup_prefix', { length: 512 }).notNull(),
    // Ex: 'full/corretoraId/1234567890'

    // Verificação de integridade
    checksumMD5: varchar('checksum_md5', { length: 32 }),
    verificado: boolean('verificado').default(false),
    verificadoEm: timestamp('verificado_em', { withTimezone: true }),

    // Metadados de execução
    iniciadoEm: timestamp('iniciado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
    finalizadoEm: timestamp('finalizado_em', { withTimezone: true }),
    duracaoSegundos: integer('duracao_segundos'),

    iniciadoPorId: uuid('iniciado_por_id').references(() => admins.id),

    // Logs e erros
    logs: jsonb('logs').default([]),
    erro: text('erro'),
  },
  (table) => [
    index('idx_backup_corretora').on(table.corretoraId, table.tipo, table.status),
    index('idx_backup_iniciado').on(table.iniciadoEm),
    index('idx_backup_status').on(table.status),
  ]
);

export type Backup = typeof backups.$inferSelect;
```

## 📅 Schema 7: backup_schedules

**Arquivo**: `libs/shared/database/src/schema/backup.ts` (mesmo arquivo)

```typescript
export const backupSchedules = pgTable(
  'backup_schedule',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Escopo (null = todas as corretoras)
    corretoraId: uuid('corretora_id').references(() => corretoras.id, {
      onDelete: 'cascade',
    }),

    tipo: tipoBackupEnum('tipo').notNull(),

    // Cron expression (formato: minuto hora dia mês dia-semana)
    cronExpression: varchar('cron_expression', { length: 100 }).notNull(),
    // Ex: '0 2 * * *' = 02:00 todo dia
    // Ex: '0 3 * * 0' = 03:00 todo domingo

    ativo: boolean('ativo').default(true),

    // Tracking de execuções
    proximaExecucao: timestamp('proxima_execucao', { withTimezone: true }),
    ultimaExecucao: timestamp('ultima_execucao', { withTimezone: true }),
    ultimoBackupId: uuid('ultimo_backup_id').references(() => backups.id),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    createdPorId: uuid('created_por_id').references(() => admins.id),
  },
  (table) => [
    index('idx_backup_schedule_corretora').on(table.corretoraId),
    index('idx_backup_schedule_proxima').on(table.proximaExecucao),
    index('idx_backup_schedule_ativo').on(table.ativo),
  ]
);

export type BackupSchedule = typeof backupSchedules.$inferSelect;
```

### Exemplos de Cron Expressions

```typescript
const CRON_EXAMPLES = {
  DAILY_2AM: '0 2 * * *', // Backup incremental diário
  WEEKLY_SUNDAY_3AM: '0 3 * * 0', // Backup completo semanal
  HOURLY: '0 * * * *', // A cada hora
  EVERY_6_HOURS: '0 */6 * * *', // A cada 6 horas
};
```

## 🔗 Relacionamentos Entre Schemas

```
corretoras
    ├── anexos (1:N)
    ├── storage_metrics (1:N)
    ├── storage_limits (1:1)
    ├── backups (1:N)
    └── backup_schedules (1:N)

anexos
    └── arquivoAnteriorId → anexos (self-reference para versionamento)

admins
    ├── admin_audit_logs (1:N)
    ├── backups (1:N) via iniciadoPorId
    └── backup_schedules (1:N) via createdPorId

usuarios
    └── anexos (1:N) via uploadPorId
```

## 📏 Tamanhos e Limites

### Limites de Campos

| Campo              | Limite   | Motivo                          |
| ------------------ | -------- | ------------------------------- |
| nomeOriginal       | 256 char | Limite comum de filesystems     |
| r2Key              | 512 char | Path completo no R2             |
| urlPublica         | 1024 char| URLs assinadas podem ser longas |
| email              | 255 char | RFC 5321                        |
| mimeType           | 100 char | Tipos MIME são curtos           |

### Limites Padrão por Tenant

| Recurso           | Limite Padrão | Configurável |
| ----------------- | ------------- | ------------ |
| Storage           | 5 GB          | ✅ Sim       |
| Arquivos          | 10,000        | ✅ Sim       |
| Tamanho arquivo   | 10 MB         | ✅ Sim       |
| Alerta            | 80%           | ✅ Sim       |
| Bloqueio          | 95%           | ✅ Sim       |

## 📝 Próximo Documento

Continue com **[03-STORAGE-SERVICE.md](./03-STORAGE-SERVICE.md)** para ver a implementação do service layer.
