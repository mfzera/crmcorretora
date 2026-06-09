import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  index,
  text,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { planos } from './plano';

export const subscriptions = pgTable(
  'subscription',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .unique()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    planoId: uuid('plano_id')
      .notNull()
      .references(() => planos.id),

    // Plan cycle: 'SEMESTRAL' | 'ANUAL' | 'TRIENAL'
    planCycle: varchar('plan_cycle', { length: 20 }).default('TRIENAL'),

    // Asaas integration
    asaasCustomerId: varchar('asaas_customer_id', { length: 255 }),
    asaasSubscriptionId: varchar('asaas_subscription_id', {
      length: 255,
    }).unique(),
    // Usado para plano TRIENAL — cobrança avulsa (payment) no Asaas
    asaasPaymentId: varchar('asaas_payment_id', { length: 255 }).unique(),
    // Token retornado pelo Asaas ao criar assinatura com cartão — usado para
    // futuras atualizações sem precisar dos dados brutos do cartão (PCI-DSS)
    asaasCreditCardToken: varchar('asaas_credit_card_token', { length: 255 }),

    // Subscription status
    // 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'UNPAID'
    status: varchar('status', { length: 50 }).notNull(),

    // Seat tracking
    seatsIncluded: integer('seats_included').default(3), // From base price
    seatsUsed: integer('seats_used').default(0), // Current active users
    seatsAdditional: integer('seats_additional').default(0), // Paid extra seats
    seatsCourtesy: integer('seats_courtesy').default(0).notNull(), // Courtesy seats not billed

    // Pricing (store snapshot for audit)
    basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
    pricePerSeat: decimal('price_per_seat', { precision: 10, scale: 2 }).notNull(),
    totalMonthly: decimal('total_monthly', { precision: 15, scale: 2 }),

    // Billing periods
    currentPeriodStart: timestamp('current_period_start', {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),

    // Trial
    trialStart: timestamp('trial_start', { withTimezone: true }),
    trialEnd: timestamp('trial_end', { withTimezone: true }),

    // Módulos ativos: 'crm' sempre presente; 'sinistros' e 'gamificacao' são add-ons
    modulosAtivos: text('modulos_ativos').array().notNull().default(['crm']),

    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_subscription_corretora').on(table.corretoraId),
    index('idx_subscription_status').on(table.status),
    index('idx_subscription_asaas_customer').on(table.asaasCustomerId),
    index('idx_subscription_asaas_subscription').on(table.asaasSubscriptionId),
  ],
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [subscriptions.corretoraId],
    references: [corretoras.id],
  }),
  plano: one(planos, {
    fields: [subscriptions.planoId],
    references: [planos.id],
  }),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
