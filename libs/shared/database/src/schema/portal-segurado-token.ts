import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientes } from './cliente';
import { corretoras } from './corretora';

export const portalSeguradoTokens = pgTable(
  'portal_segurado_token',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'cascade' }),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_portal_segurado_token').on(table.token),
    index('idx_portal_segurado_cliente').on(table.clienteId),
    index('idx_portal_segurado_corretora').on(table.corretoraId),
  ],
);

export const portalSeguradoTokensRelations = relations(
  portalSeguradoTokens,
  ({ one }) => ({
    cliente: one(clientes, {
      fields: [portalSeguradoTokens.clienteId],
      references: [clientes.id],
    }),
    corretora: one(corretoras, {
      fields: [portalSeguradoTokens.corretoraId],
      references: [corretoras.id],
    }),
  }),
);

export type PortalSeguradoToken = typeof portalSeguradoTokens.$inferSelect;
export type NewPortalSeguradoToken = typeof portalSeguradoTokens.$inferInsert;
