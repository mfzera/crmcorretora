import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  date,
  timestamp,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { subscriptions } from './subscription';

export const invoices = pgTable(
  'invoice',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id),

    asaasPaymentId: varchar('asaas_payment_id', { length: 255 }).unique(),

    // Invoice details
    numero: varchar('numero', { length: 50 }), // Invoice number for display
    // 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE'
    status: varchar('status', { length: 50 }).notNull(),

    // Amounts in BRL (centavos)
    subtotal: decimal('subtotal', { precision: 15, scale: 2 }),
    desconto: decimal('desconto', { precision: 15, scale: 2 }).default('0'),
    total: decimal('total', { precision: 15, scale: 2 }).notNull(),

    // Seat breakdown (snapshot at time of invoice)
    seatsIncluded: integer('seats_included'),
    seatsAdditional: integer('seats_additional'),
    basePrice: decimal('base_price', { precision: 10, scale: 2 }),
    seatPrice: decimal('seat_price', { precision: 10, scale: 2 }),

    // Dates
    periodStart: date('period_start'),
    periodEnd: date('period_end'),
    dueDate: date('due_date'),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    // Files / links
    invoicePdfUrl: text('invoice_pdf_url'), // URL do boleto ou comprovante Asaas

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_invoice_corretora').on(table.corretoraId),
    index('idx_invoice_subscription').on(table.subscriptionId),
    index('idx_invoice_status').on(table.status),
    index('idx_invoice_asaas_payment').on(table.asaasPaymentId),
    index('idx_invoice_due_date').on(table.dueDate),
  ],
);

export const invoicesRelations = relations(invoices, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [invoices.corretoraId],
    references: [corretoras.id],
  }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
