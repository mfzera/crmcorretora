import {
  pgTable,
  uuid,
  varchar,
  integer,
  bigint,
  decimal,
  date,
  timestamp,
  jsonb,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { admins } from './admin';

// Tabela de métricas diárias
export const storageMetrics = pgTable(
  'storage_metric',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Snapshot diário
    data: date('data').notNull(),

    // Métricas gerais
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

    // Delta (crescimento desde último snapshot)
    arquivosAdicionados: integer('arquivos_adicionados').notNull().default(0),
    arquivosRemovidos: integer('arquivos_removidos').notNull().default(0),
    bytesAdicionados: bigint('bytes_adicionados', { mode: 'number' })
      .notNull()
      .default(0),
    bytesRemovidos: bigint('bytes_removidos', { mode: 'number' })
      .notNull()
      .default(0),

    // Custo estimado (R2 pricing)
    custoEstimadoMensal: decimal('custo_estimado_mensal', {
      precision: 10,
      scale: 2,
    }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('unq_storage_metric_data').on(table.corretoraId, table.data),
    index('idx_storage_metric_corretora').on(table.corretoraId),
    index('idx_storage_metric_data').on(table.data),
  ],
);

// Tabela de limites de storage
export const storageLimits = pgTable(
  'storage_limit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .unique()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Limites configuráveis
    limiteBytes: bigint('limite_bytes', { mode: 'number' }),
    limiteArquivos: integer('limite_arquivos'),

    // Limites por tipo de entidade
    limiteBytesCotacoes: bigint('limite_bytes_cotacoes', { mode: 'number' }),
    limiteBytesDocumentos: bigint('limite_bytes_documentos', {
      mode: 'number',
    }),
    limiteBytesChat: bigint('limite_bytes_chat', { mode: 'number' }),

    // Configuração de alertas
    alertasAtivos: boolean('alertas_ativos').notNull().default(true),

    // Thresholds de alerta (percentual)
    alertarEm: decimal('alertar_em', { precision: 5, scale: 2 })
      .notNull()
      .default('80.00'), // 80%
    bloquearUploadEm: decimal('bloquear_upload_em', { precision: 5, scale: 2 })
      .notNull()
      .default('95.00'), // 95%

    // Contatos para alertas
    emailsAlerta: jsonb('emails_alerta').default('[]'),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedPorId: uuid('updated_por_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [index('idx_storage_limit_corretora').on(table.corretoraId)],
);

// Relations
export const storageMetricsRelations = relations(storageMetrics, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [storageMetrics.corretoraId],
    references: [corretoras.id],
  }),
}));

export const storageLimitsRelations = relations(storageLimits, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [storageLimits.corretoraId],
    references: [corretoras.id],
  }),
  updatedPor: one(admins, {
    fields: [storageLimits.updatedPorId],
    references: [admins.id],
  }),
}));

// Types
export type StorageMetric = typeof storageMetrics.$inferSelect;
export type NewStorageMetric = typeof storageMetrics.$inferInsert;
export type StorageLimit = typeof storageLimits.$inferSelect;
export type NewStorageLimit = typeof storageLimits.$inferInsert;
