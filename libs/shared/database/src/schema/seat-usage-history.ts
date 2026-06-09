import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { subscriptions } from './subscription';
import { usuarios } from './usuario';

export const seatUsageHistory = pgTable(
  'seat_usage_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id),

    // Change tracking
    // 'SEAT_ADDED' | 'SEAT_REMOVED' | 'USER_ACTIVATED' | 'USER_DEACTIVATED'
    eventType: varchar('event_type', { length: 50 }).notNull(),

    usuarioId: uuid('usuario_id').references(() => usuarios.id),
    usuarioEmail: varchar('usuario_email', { length: 255 }),

    // Before/after snapshot
    seatsUsedBefore: integer('seats_used_before'),
    seatsUsedAfter: integer('seats_used_after'),
    monthlyCostBefore: decimal('monthly_cost_before', {
      precision: 15,
      scale: 2,
    }),
    monthlyCostAfter: decimal('monthly_cost_after', {
      precision: 15,
      scale: 2,
    }),

    // Metadata
    registeredBy: uuid('registered_by'), // Admin who made the change
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_seat_usage_corretora').on(table.corretoraId),
    index('idx_seat_usage_subscription').on(table.subscriptionId),
    index('idx_seat_usage_event_type').on(table.eventType),
    index('idx_seat_usage_usuario').on(table.usuarioId),
    index('idx_seat_usage_created').on(table.createdAt),
  ],
);

export const seatUsageHistoryRelations = relations(
  seatUsageHistory,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [seatUsageHistory.corretoraId],
      references: [corretoras.id],
    }),
    subscription: one(subscriptions, {
      fields: [seatUsageHistory.subscriptionId],
      references: [subscriptions.id],
    }),
    usuario: one(usuarios, {
      fields: [seatUsageHistory.usuarioId],
      references: [usuarios.id],
    }),
  }),
);

export type SeatUsageHistory = typeof seatUsageHistory.$inferSelect;
export type NewSeatUsageHistory = typeof seatUsageHistory.$inferInsert;
