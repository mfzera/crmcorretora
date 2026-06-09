import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tabela de admins (super-users)
export const admins = pgTable(
  'admin',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    senha: varchar('senha', { length: 255 }).notNull(),
    nome: varchar('nome', { length: 255 }).notNull(),

    // Permissões granulares (JSON array)
    permissoes: jsonb('permissoes').notNull().default('[]'),

    // Foto de perfil (chave R2)
    avatarR2Key: varchar('avatar_r2_key', { length: 500 }),

    // 2FA TOTP
    totpSecret: varchar('totp_secret', { length: 255 }),
    totpEnabled: boolean('totp_enabled').default(false).notNull(),

    // Status
    ativo: boolean('ativo').default(true),
    ultimoLogin: timestamp('ultimo_login', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_admin_email').on(table.email)],
);

// Tabela de auditoria de ações admin
export const adminAuditLogs = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),

    // Ação realizada
    acao: varchar('acao', { length: 100 }).notNull(),

    // Entidade afetada
    entidadeTipo: varchar('entidade_tipo', { length: 50 }),
    entidadeId: uuid('entidade_id'),

    // Detalhes da ação (JSON)
    detalhes: jsonb('detalhes'),

    // Metadata de segurança
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),

    // Timestamp
    timestamp: timestamp('timestamp', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_audit_admin').on(table.adminId),
    index('idx_audit_timestamp').on(table.timestamp),
    index('idx_audit_acao').on(table.acao),
    index('idx_audit_entidade').on(table.entidadeTipo, table.entidadeId),
  ],
);

// Relations
export const adminsRelations = relations(admins, ({ many }) => ({
  auditLogs: many(adminAuditLogs),
}));

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  admin: one(admins, {
    fields: [adminAuditLogs.adminId],
    references: [admins.id],
  }),
}));

// Types
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;

// Constantes de permissões
export const ADMIN_PERMISSIONS = {
  VIEW_USAGE: 'view_usage',
  MANAGE_LIMITS: 'manage_limits',
  VIEW_ALL_TENANTS: 'view_all_tenants',
  MANAGE_BACKUPS: 'manage_backups',
  MANAGE_ADMINS: 'manage_admins',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  CLEANUP_FILES: 'cleanup_files',
  VIEW_CHANGELOGS: 'view_changelogs',
  MANAGE_CHANGELOGS: 'manage_changelogs',
  MANAGE_TENANTS: 'manage_tenants',
  MANAGE_BILLING: 'manage_billing',
} as const;
