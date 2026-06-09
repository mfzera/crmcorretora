import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';

export const consentLogs = pgTable(
  'consent_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Quem consentiu (pode ser null para usuários não autenticados no cadastro)
    usuarioId: uuid('usuario_id').references(() => usuarios.id, {
      onDelete: 'set null',
    }),

    // Corretora à qual o consentimento pertence
    corretoraId: uuid('corretora_id').references(() => corretoras.id, {
      onDelete: 'cascade',
    }),

    // Tipo de consentimento: 'termos_uso', 'privacidade', 'cookies'
    tipo: varchar('tipo', { length: 50 }).notNull(),

    // Versão do documento aceito (ex: '1.0', '2024-01')
    versao: varchar('versao', { length: 20 }).notNull(),

    // IP do titular no momento do aceite
    ipAddress: varchar('ip_address', { length: 45 }),

    // Se aceitou (false = revogou)
    aceito: boolean('aceito').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_consent_log_usuario').on(table.usuarioId),
    index('idx_consent_log_corretora').on(table.corretoraId),
    index('idx_consent_log_tipo').on(table.tipo),
    index('idx_consent_log_created_at').on(table.createdAt),
  ],
);

export const consentLogsRelations = relations(consentLogs, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [consentLogs.usuarioId],
    references: [usuarios.id],
  }),
  corretora: one(corretoras, {
    fields: [consentLogs.corretoraId],
    references: [corretoras.id],
  }),
}));

export type ConsentLog = typeof consentLogs.$inferSelect;
export type NewConsentLog = typeof consentLogs.$inferInsert;
