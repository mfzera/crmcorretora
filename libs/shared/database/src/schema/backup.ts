import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { admins } from './admin';

// Enums
export const tipoBackupEnum = pgEnum('tipo_backup', ['incremental', 'completo']);
export const statusBackupEnum = pgEnum('status_backup', [
  'em_progresso',
  'concluido',
  'falhou',
]);

// Tabela de backups
export const backups = pgTable(
  'backup',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Tipo e escopo
    tipo: tipoBackupEnum('tipo').notNull(),
    corretoraId: uuid('corretora_id').references(() => corretoras.id, {
      onDelete: 'set null',
    }),
    // NULL = backup global de todas as corretoras

    // Status
    status: statusBackupEnum('status').notNull().default('em_progresso'),

    // Metadados
    totalArquivos: integer('total_arquivos').default(0),
    totalBytes: bigint('total_bytes', { mode: 'number' }).default(0),
    arquivosNovos: integer('arquivos_novos').default(0),
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

    iniciadoPorId: uuid('iniciado_por_id').references(() => admins.id, {
      onDelete: 'set null',
    }),

    // Logs e erros
    logs: jsonb('logs').default('[]'),
    erro: text('erro'),
  },
  (table) => [
    index('idx_backup_corretora').on(table.corretoraId, table.tipo, table.status),
    index('idx_backup_iniciado').on(table.iniciadoEm),
    index('idx_backup_status').on(table.status),
    index('idx_backup_tipo').on(table.tipo),
  ],
);

// Tabela de agendamentos de backup
export const backupSchedules = pgTable(
  'backup_schedule',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Escopo
    corretoraId: uuid('corretora_id').references(() => corretoras.id, {
      onDelete: 'cascade',
    }),
    // NULL = todas as corretoras

    // Tipo e configuração
    tipo: tipoBackupEnum('tipo').notNull(),
    cronExpression: varchar('cron_expression', { length: 100 }).notNull(),
    ativo: boolean('ativo').default(true),

    // Tracking de execuções
    proximaExecucao: timestamp('proxima_execucao', { withTimezone: true }),
    ultimaExecucao: timestamp('ultima_execucao', { withTimezone: true }),
    ultimoBackupId: uuid('ultimo_backup_id').references(() => backups.id, {
      onDelete: 'set null',
    }),

    // Auditoria
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdPorId: uuid('created_por_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    index('idx_backup_schedule_corretora').on(table.corretoraId),
    index('idx_backup_schedule_proxima').on(table.proximaExecucao),
    index('idx_backup_schedule_ativo').on(table.ativo),
  ],
);

// Relations
export const backupsRelations = relations(backups, ({ one, many }) => ({
  corretora: one(corretoras, {
    fields: [backups.corretoraId],
    references: [corretoras.id],
  }),
  iniciadoPor: one(admins, {
    fields: [backups.iniciadoPorId],
    references: [admins.id],
  }),
  schedules: many(backupSchedules),
}));

export const backupSchedulesRelations = relations(
  backupSchedules,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [backupSchedules.corretoraId],
      references: [corretoras.id],
    }),
    ultimoBackup: one(backups, {
      fields: [backupSchedules.ultimoBackupId],
      references: [backups.id],
    }),
    createdPor: one(admins, {
      fields: [backupSchedules.createdPorId],
      references: [admins.id],
    }),
  }),
);

// Types
export type Backup = typeof backups.$inferSelect;
export type NewBackup = typeof backups.$inferInsert;
export type BackupSchedule = typeof backupSchedules.$inferSelect;
export type NewBackupSchedule = typeof backupSchedules.$inferInsert;

// Constantes
export const CRON_EXAMPLES = {
  DAILY_2AM: '0 2 * * *',
  WEEKLY_SUNDAY_3AM: '0 3 * * 0',
  HOURLY: '0 * * * *',
  EVERY_6_HOURS: '0 */6 * * *',
} as const;
