import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';

export const auditLogs = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    usuarioId: uuid('usuario_id').references(() => usuarios.id),
    usuarioNome: varchar('usuario_nome', { length: 255 }),
    usuarioEmail: varchar('usuario_email', { length: 255 }),

    acao: varchar('acao', { length: 100 }).notNull(),
    entidade: varchar('entidade', { length: 100 }),
    entidadeId: uuid('entidade_id'),

    dadosAnteriores: jsonb('dados_anteriores'),
    dadosNovos: jsonb('dados_novos'),

    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),

    // Data de expiração para purge automático (LGPD: 90 dias para logs com PII)
    retencaoAte: timestamp('retencao_ate', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_audit_log_corretora').on(table.corretoraId),
    index('idx_audit_log_usuario').on(table.usuarioId),
    index('idx_audit_log_entidade').on(table.entidade, table.entidadeId),
    index('idx_audit_log_created_at').on(table.createdAt),
  ],
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [auditLogs.corretoraId],
    references: [corretoras.id],
  }),
  usuario: one(usuarios, {
    fields: [auditLogs.usuarioId],
    references: [usuarios.id],
  }),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
