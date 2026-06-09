import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usuarios } from './usuario';

export const googleCalendarTokens = pgTable(
  'google_calendar_token',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .unique()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('idx_google_calendar_token_usuario').on(table.usuarioId)],
);

export const googleCalendarTokensRelations = relations(
  googleCalendarTokens,
  ({ one }) => ({
    usuario: one(usuarios, {
      fields: [googleCalendarTokens.usuarioId],
      references: [usuarios.id],
    }),
  }),
);

export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type NewGoogleCalendarToken = typeof googleCalendarTokens.$inferInsert;
