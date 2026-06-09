# Stripe Payment Strategy - Per-Seat Pricing Model

## Executive Summary

This document outlines the strategy for implementing Stripe-based per-seat pricing for the EcoTech SaaS platform. The system is currently **70% ready** for per-seat pricing implementation, with existing multi-tenant architecture and quota tracking infrastructure already in place.

---

## Table of Contents

1. [Current State & Architecture](#current-state--architecture)
2. [Recommended Pricing Strategy](#recommended-pricing-strategy)
3. [Pricing Model Comparison](#pricing-model-comparison)
4. [Implementation in Stripe](#implementation-in-stripe)
5. [Database Schema Changes](#database-schema-changes)
6. [Key Business Decisions](#key-business-decisions)
7. [Cost Calculation Examples](#cost-calculation-examples)
8. [Stripe Webhook Implementation](#stripe-webhook-implementation)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Next Steps](#next-steps)

---

## Current State & Architecture

### What's Already Built

✅ **Infrastructure Ready:**
- Multi-tenant architecture (corretora-based with subdomain isolation)
- Quota tracking infrastructure (`usuariosAtivos`, `vendedoresAtivos` counters)
- User management with role-based access (`cargo` system)
- Plan structure (currently fixed-price in `planos` table)
- Admin management system
- Storage limits and metrics tracking

❌ **What's Missing:**
- Stripe/payment gateway integration
- Subscription lifecycle management
- Usage-based billing automation
- Invoice generation and history
- Payment webhook handling
- Billing UI in frontend

### System Architecture Overview

```
┌──────────────┐
│   ADMIN      │ <- Super-user managing all tenants
│ (admins)     │
└──────────────┘
       ↓
┌──────────────┐     ┌──────────────┐
│  CORRETORA   │────→│   PLANO      │ Current: Fixed plan with limits
│ (tenant)     │     │ (plan)       │ Needed: Add per-seat pricing model
└──────────────┘     └──────────────┘
       ↓                      
┌──────────────┐     ┌──────────────┐
│  USUARIO     │────→│   CARGO      │
│ (user)       │     │ (role)       │
└──────────────┘     └──────────────┘
       ↓ (active user)
┌──────────────┐
│ Billed as    │ <- PER-SEAT PRICING point
│ "seat"       │
└──────────────┘
```

### Key Files Reference

| Component | File | Purpose |
|-----------|------|---------|
| **Tenant/Organization** | `libs/shared/database/src/schema/corretora.ts` | Multi-tenant isolation |
| **User Management** | `libs/shared/database/src/schema/usuario.ts` | User accounts |
| **Plans** | `libs/shared/database/src/schema/plano.ts` | Pricing plans (needs update) |
| **Roles** | `libs/shared/database/src/schema/cargo.ts` | User roles |
| **Permissions** | `libs/shared/database/src/schema/permissao.ts` | Role-based access |
| **Quotas** | `libs/plugins/quota-validator/src/index.ts` | Current quota system |
| **Admin** | `libs/shared/database/src/schema/admin.ts` | Super-user management |
| **Storage** | `libs/shared/database/src/schema/storage-metrics.ts` | Resource limits |
| **Auth Routes** | `apps/api/src/routes/auth/index.ts` | Registration & login |
| **User Routes** | `apps/api/src/routes/usuarios/index.ts` | User CRUD with quota checks |

---

## Recommended Pricing Strategy

### **Model: Hybrid (Base + Per-Seat)** ✨ RECOMMENDED

```
Plan Structure:
├── Base Price: R$ 50/month
│   └── Includes: 3 seats (users)
└── Additional Seats: R$ 25/seat/month
    └── Charged for 4th, 5th, 6th... users

Example Pricing:
- 3 users  = R$ 50 (base only)
- 5 users  = R$ 100 (R$50 base + 2 × R$25)
- 10 users = R$ 225 (R$50 base + 7 × R$25)
```

**Why This Model?**
- ✅ Predictable minimum revenue (R$50)
- ✅ Easy to understand for customers
- ✅ Low barrier to entry for small teams
- ✅ Natural upselling path
- ✅ Common in SaaS industry (similar to Slack, GitHub, etc.)

---

## Pricing Model Comparison

### Option 1: Base + Per-Seat (RECOMMENDED)

```
Structure: R$ 50 base + R$ 25/additional seat
Includes: 3 seats in base price

Pricing Examples:
- 1 user:  R$ 50
- 3 users: R$ 50
- 5 users: R$ 100
- 10 users: R$ 225
```

**Pros:**
- Predictable minimum revenue
- Easy to understand
- Incentivizes starting small
- Natural upselling path

**Cons:**
- Slightly more complex billing logic
- Need to define "included seats"

---

### Option 2: Pure Per-Seat

```
Structure: R$ 25/seat (no base price)

Pricing Examples:
- 1 user:  R$ 25
- 3 users: R$ 75
- 5 users: R$ 125
- 10 users: R$ 250
```

**Pros:**
- Simplest to implement
- Most fair (pay only what you use)
- Easy Stripe configuration

**Cons:**
- Lower minimum revenue
- Less predictable for financial forecasting

---

### Option 3: Tiered Per-Seat

```
Structure:
- Tier 1: 1-5 users   → R$ 30/user/month
- Tier 2: 6-15 users  → R$ 25/user/month (all users)
- Tier 3: 16+ users   → R$ 20/user/month (all users)
```

**Pros:**
- Volume discounts encourage growth
- Competitive for larger teams

**Cons:**
- Complex billing logic
- Sudden price drops can confuse customers
- Harder to predict revenue

---

## Implementation in Stripe

### 1. Create Products in Stripe

```typescript
// Base subscription product
const baseProduct = await stripe.products.create({
  name: 'EcoTech - Plano Base',
  description: 'Inclui até 3 usuários',
});

const basePrice = await stripe.prices.create({
  product: baseProduct.id,
  unit_amount: 5000, // R$ 50.00 in centavos
  currency: 'brl',
  recurring: { interval: 'month' },
});

// Per-seat addon product
const seatProduct = await stripe.products.create({
  name: 'EcoTech - Usuário Adicional',
  description: 'Usuário adicional acima dos 3 incluídos',
});

const seatPrice = await stripe.prices.create({
  product: seatProduct.id,
  unit_amount: 2500, // R$ 25.00
  currency: 'brl',
  recurring: { interval: 'month' },
});
```

### 2. Create Subscription with Metered Billing

```typescript
// When corretora signs up
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [
    {
      price: basePrice.id, // Fixed base price
      quantity: 1,
    },
    {
      price: seatPrice.id, // Variable seat price
      quantity: Math.max(0, currentUsers - 3), // Only charge for users beyond 3
    },
  ],
  payment_behavior: 'default_incomplete',
  payment_settings: { save_default_payment_method: 'on_subscription' },
  expand: ['latest_invoice.payment_intent'],
  trial_period_days: 30, // Optional 30-day trial
});
```

### 3. Update Seats in Real-Time

```typescript
// When a new user is added
async function onUserCreated(corretoraId: string) {
  const subscription = await getActiveSubscription(corretoraId);
  const currentUsers = await countActiveUsers(corretoraId);
  
  // Calculate additional seats (only if > 3)
  const additionalSeats = Math.max(0, currentUsers - 3);
  
  // Update Stripe subscription
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    items: [
      {
        id: subscription.stripeSeatItemId,
        quantity: additionalSeats,
      },
    ],
    proration_behavior: 'always_invoice', // Charge immediately (prorated)
  });
  
  // Update local database
  await db.update(subscriptions)
    .set({
      seatsUsed: currentUsers,
      seatsAdditional: additionalSeats,
      totalMonthly: calculateTotalCost(currentUsers),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.corretoraId, corretoraId));
}

// When a user is deleted/deactivated
async function onUserDeleted(corretoraId: string) {
  const subscription = await getActiveSubscription(corretoraId);
  const currentUsers = await countActiveUsers(corretoraId);
  
  const additionalSeats = Math.max(0, currentUsers - 3);
  
  // Update Stripe (will create credit for removed seat)
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    items: [
      {
        id: subscription.stripeSeatItemId,
        quantity: additionalSeats,
      },
    ],
    proration_behavior: 'always_invoice',
  });
  
  // Update local database
  await db.update(subscriptions)
    .set({
      seatsUsed: currentUsers,
      seatsAdditional: additionalSeats,
      totalMonthly: calculateTotalCost(currentUsers),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.corretoraId, corretoraId));
}
```

---

## Database Schema Changes

### 1. New Subscriptions Table

```typescript
export const subscriptions = pgTable('subscription', {
  id: uuid('id').primaryKey().defaultRandom(),
  corretoraId: uuid('corretora_id')
    .notNull()
    .unique()
    .references(() => corretoras.id, { onDelete: 'cascade' }),
  
  planoId: uuid('plano_id')
    .notNull()
    .references(() => planos.id),
  
  // Stripe integration
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique(),
  stripeBaseItemId: varchar('stripe_base_item_id', { length: 255 }), // Base price item
  stripeSeatItemId: varchar('stripe_seat_item_id', { length: 255 }), // Per-seat item
  
  // Subscription status
  status: varchar('status', { length: 50 }).notNull(), 
  // 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'UNPAID'
  
  // Seat tracking
  seatsIncluded: integer('seats_included').default(3), // From base price
  seatsUsed: integer('seats_used').default(0), // Current active users
  seatsAdditional: integer('seats_additional').default(0), // Paid extra seats
  
  // Pricing
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  pricePerSeat: decimal('price_per_seat', { precision: 10, scale: 2 }).notNull(),
  totalMonthly: decimal('total_monthly', { precision: 15, scale: 2 }),
  
  // Billing periods
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  
  // Trial
  trialStart: timestamp('trial_start', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

### 2. Invoice History Table

```typescript
export const invoices = pgTable('invoice', {
  id: uuid('id').primaryKey().defaultRandom(),
  corretoraId: uuid('corretora_id')
    .notNull()
    .references(() => corretoras.id),
  subscriptionId: uuid('subscription_id')
    .references(() => subscriptions.id),
  
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }).unique(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  
  // Invoice details
  numero: varchar('numero', { length: 50 }), // Invoice number for display
  status: varchar('status', { length: 50 }).notNull(), 
  // 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE'
  
  // Amounts
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }),
  desconto: decimal('desconto', { precision: 15, scale: 2 }).default('0'),
  total: decimal('total', { precision: 15, scale: 2 }).notNull(),
  
  // Seat breakdown
  seatsIncluded: integer('seats_included'),
  seatsAdditional: integer('seats_additional'),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }),
  seatPrice: decimal('seat_price', { precision: 10, scale: 2 }),
  
  // Dates
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  dueDate: date('due_date'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  
  // Files
  invoicePdfUrl: text('invoice_pdf_url'), // Stripe hosted invoice
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

### 3. Seat Usage History Table

```typescript
export const seatUsageHistory = pgTable('seat_usage_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  corretoraId: uuid('corretora_id')
    .notNull()
    .references(() => corretoras.id),
  subscriptionId: uuid('subscription_id')
    .references(() => subscriptions.id),
  
  // Change tracking
  eventType: varchar('event_type', { length: 50 }).notNull(),
  // 'SEAT_ADDED' | 'SEAT_REMOVED' | 'USER_ACTIVATED' | 'USER_DEACTIVATED'
  
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  usuarioEmail: varchar('usuario_email', { length: 255 }),
  
  // Before/after snapshot
  seatsUsedBefore: integer('seats_used_before'),
  seatsUsedAfter: integer('seats_used_after'),
  monthlyCostBefore: decimal('monthly_cost_before', { precision: 15, scale: 2 }),
  monthlyCostAfter: decimal('monthly_cost_after', { precision: 15, scale: 2 }),
  
  // Metadata
  registeredBy: uuid('registered_by'), // Admin who made the change
  notes: text('notes'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

### 4. Update Existing Planos Table

Add these fields to support per-seat pricing:

```typescript
export const planos = pgTable('plano', {
  // ... existing fields ...
  
  // NEW FIELDS:
  modeloPrecificacao: varchar('modelo_precificacao', { length: 50 })
    .default('FIXED'), // 'FIXED' | 'PER_SEAT' | 'HYBRID'
  
  // For hybrid model (base + per-seat)
  valorBase: decimal('valor_base', { precision: 10, scale: 2 }), // R$ 50
  seatsInclusos: integer('seats_inclusos').default(3), // 3 included seats
  valorPorSeat: decimal('valor_por_seat', { precision: 10, scale: 2 }), // R$ 25/seat
  
  // Stripe product IDs
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripeBasePriceId: varchar('stripe_base_price_id', { length: 255 }),
  stripeSeatPriceId: varchar('stripe_seat_price_id', { length: 255 }),
});
```

---

## Key Business Decisions

### Decision 1: Who Counts as a "Seat"?

Your system has different user types via `cargo` (role) with flags:
- `isAdmin` - Administrator
- `isGestor` - Manager
- `isVendedor` - Seller

**Option A: All Active Users = 1 Seat** ✨ RECOMMENDED

```typescript
// Any user with ativo = true counts
seatsUsed = COUNT(*) WHERE ativo = true
```

**Pros:**
- Simplest to understand
- Easiest to implement
- Most fair (all users have access)
- Common industry standard

**Cons:**
- No differentiation by role

---

**Option B: Different Pricing Per Role**

```typescript
// Different rates by role
- Admins (isAdmin=true):    R$ 40/month
- Gestores (isGestor=true): R$ 30/month
- Vendedores (isVendedor=true): R$ 25/month
- Viewers (no flags):       R$ 15/month
```

**Pros:**
- More granular pricing
- Can incentivize specific roles

**Cons:**
- Complex to explain
- Complex to implement
- May confuse customers

---

**Option C: Only Certain Roles Count**

```typescript
// Only sellers count as seats
seatsUsed = COUNT(*) WHERE isVendedor = true AND ativo = true
// Admins/managers are free or included in base
```

**Pros:**
- Can offer "free" admin users
- Focuses billing on revenue-generating roles

**Cons:**
- May leave money on the table
- Complex to explain

---

### Decision 2: When to Charge for Seats?

**Option A: Immediate Proration** ✨ RECOMMENDED

```typescript
proration_behavior: 'always_invoice'
```

- Add user → Charge immediately (prorated for remaining days)
- Remove user → Credit immediately (prorated)

**Example:**
```
User added on day 15 of 30-day cycle
Seat cost: R$ 25/month
Days remaining: 15
Prorated charge: R$ 25 × (15/30) = R$ 12.50
```

**Pros:**
- Fair and accurate
- No surprises
- Industry standard

**Cons:**
- May create frequent small invoices

---

**Option B: Next Billing Cycle**

```typescript
proration_behavior: 'none'
```

- Add user → Charge at next monthly invoice
- Remove user → Credit at next monthly invoice

**Pros:**
- Predictable billing dates
- Fewer invoices

**Cons:**
- Can lead to large unexpected bills
- Feels less fair to customers

---

### Decision 3: Trial Strategy

Your current system has 30-day trials. Recommended approach:

```typescript
// During trial (first 30 days)
status: 'TRIAL'
seatsLimit: null // or generous limit like 100
requiresPayment: false
allFeaturesEnabled: true

// When trial ends (day 31)
- Prompt to add payment method
- Convert to paid subscription
- Enforce seat limits based on plan
- If no payment → downgrade or suspend access

// Grace period option
- Allow 3-7 days grace period after trial
- Show warning banners
- Restrict certain features
- Then suspend if still no payment
```

**Trial Best Practices:**
1. Require credit card upfront (reduces churn, increases conversion)
2. Send reminder emails at: 7 days, 3 days, 1 day before trial ends
3. Make it easy to cancel during trial (builds trust)
4. Auto-convert to paid if card is on file

---

### Decision 4: Future Pricing Tiers

Consider offering multiple plans:

```typescript
const pricingTiers = {
  starter: {
    name: 'Starter',
    basePrice: 50,
    seatsIncluded: 3,
    pricePerSeat: 25,
    maxSeats: 10,
    features: ['basic_crm', 'email_support', 'basic_reports'],
  },
  
  professional: {
    name: 'Professional',
    basePrice: 150,
    seatsIncluded: 10,
    pricePerSeat: 20,
    maxSeats: 50,
    features: ['advanced_crm', 'priority_support', 'advanced_reports', 'api_access'],
  },
  
  enterprise: {
    name: 'Enterprise',
    basePrice: 500,
    seatsIncluded: 50,
    pricePerSeat: 15,
    maxSeats: null, // Unlimited
    features: ['full_crm', 'dedicated_support', 'custom_reports', 'white_label', 'sso'],
  },
};
```

---

## Cost Calculation Examples

### Calculation Function

```typescript
function calculateMonthlyBill(activeUsers: number): number {
  const BASE_PRICE = 50;
  const INCLUDED_SEATS = 3;
  const PRICE_PER_ADDITIONAL_SEAT = 25;
  
  if (activeUsers <= INCLUDED_SEATS) {
    return BASE_PRICE;
  }
  
  const additionalSeats = activeUsers - INCLUDED_SEATS;
  const total = BASE_PRICE + (additionalSeats * PRICE_PER_ADDITIONAL_SEAT);
  
  return total;
}
```

### Pricing Examples

| Users | Calculation | Monthly Cost |
|-------|-------------|--------------|
| 1 | R$ 50 (base only) | R$ 50 |
| 2 | R$ 50 (base only) | R$ 50 |
| 3 | R$ 50 (base only) | R$ 50 |
| 4 | R$ 50 + (1 × R$ 25) | R$ 75 |
| 5 | R$ 50 + (2 × R$ 25) | R$ 100 |
| 10 | R$ 50 + (7 × R$ 25) | R$ 225 |
| 15 | R$ 50 + (12 × R$ 25) | R$ 350 |
| 20 | R$ 50 + (17 × R$ 25) | R$ 475 |
| 50 | R$ 50 + (47 × R$ 25) | R$ 1,225 |
| 100 | R$ 50 + (97 × R$ 25) | R$ 2,475 |

### Proration Examples

**Scenario 1: Add User Mid-Cycle**
```
Billing cycle: Jan 1 - Jan 31 (30 days)
User added: Jan 15
Days remaining: 16
Seat cost: R$ 25/month

Prorated charge: R$ 25 × (16/30) = R$ 13.33
Next invoice: Full R$ 25/month starting Feb 1
```

**Scenario 2: Remove User Mid-Cycle**
```
Billing cycle: Jan 1 - Jan 31 (30 days)
User removed: Jan 20
Days used: 20
Days remaining: 10
Seat cost: R$ 25/month

Prorated credit: R$ 25 × (10/30) = R$ 8.33 credit applied
```

**Scenario 3: Multiple Changes in One Cycle**
```
Feb 1: Start with 5 users (R$ 100/month)
Feb 10: Add 2 users → charge R$ 35.00 prorated (21 days × 2 seats)
Feb 20: Remove 1 user → credit R$ 8.93 (10 days)
March 1: Next invoice for 6 users = R$ 125
```

---

## Stripe Webhook Implementation

### Critical Webhooks to Handle

Create file: `apps/api/src/routes/webhooks/stripe.ts`

```typescript
import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export default async function stripeWebhooks(fastify: FastifyInstance) {
  // Stripe requires raw body for signature verification
  fastify.post('/stripe', {
    config: { 
      rawBody: true,
    },
    handler: async (request, reply) => {
      const sig = request.headers['stripe-signature'] as string;
      
      if (!sig) {
        return reply.code(400).send({ error: 'Missing stripe-signature header' });
      }
      
      let event: Stripe.Event;
      
      try {
        event = stripe.webhooks.constructEvent(
          request.rawBody as Buffer,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
      } catch (err) {
        fastify.log.error('Webhook signature verification failed:', err);
        return reply.code(400).send({ error: 'Webhook signature verification failed' });
      }
      
      fastify.log.info(`Received Stripe webhook: ${event.type}`);
      
      try {
        switch (event.type) {
          // When subscription is created
          case 'customer.subscription.created':
            await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
            break;
          
          // When subscription is updated (seats changed, plan changed)
          case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
            break;
          
          // When subscription is canceled
          case 'customer.subscription.deleted':
            await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
            break;
          
          // When payment succeeds
          case 'invoice.payment_succeeded':
            await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
            break;
          
          // When payment fails
          case 'invoice.payment_failed':
            await handlePaymentFailed(event.data.object as Stripe.Invoice);
            break;
          
          // 3 days before trial ends
          case 'customer.subscription.trial_will_end':
            await handleTrialWillEnd(event.data.object as Stripe.Subscription);
            break;
          
          // When payment method is attached
          case 'payment_method.attached':
            await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
            break;
          
          default:
            fastify.log.warn(`Unhandled webhook event type: ${event.type}`);
        }
        
        return reply.send({ received: true });
      } catch (err) {
        fastify.log.error('Error processing webhook:', err);
        return reply.code(500).send({ error: 'Webhook processing failed' });
      }
    },
  });
}

// Handler implementations
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  // Store subscription in database
  // Update corretora status to ACTIVE
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Sync subscription status and seat counts
  // Update local database
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  // Mark subscription as CANCELLED
  // Schedule data retention/deletion
  // Send cancellation confirmation email
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Create invoice record in database
  // Send receipt email
  // Update subscription status to ACTIVE if was PAST_DUE
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Update subscription status to PAST_DUE
  // Send payment failed email
  // Start dunning process (retry logic)
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  // Send reminder email to add payment method
  // Show in-app notification
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  // Update customer's default payment method
  // Enable auto-renewal if was disabled
}
```

### Webhook Testing

Use Stripe CLI for local testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3333/webhooks/stripe

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
stripe trigger payment_intent.payment_failed
```

---

## Implementation Roadmap

### Phase 1: Database Foundation (Days 1-2)

**Tasks:**
- [ ] Create migration for `subscriptions` table
- [ ] Create migration for `invoices` table
- [ ] Create migration for `seatUsageHistory` table
- [ ] Update `planos` table migration with per-seat fields
- [ ] Run migrations in development
- [ ] Create Drizzle relations
- [ ] Test queries and constraints

**Files to Create:**
- `libs/shared/database/migrations/XXXX_create_subscriptions.sql`
- `libs/shared/database/migrations/XXXX_create_invoices.sql`
- `libs/shared/database/migrations/XXXX_create_seat_usage_history.sql`
- `libs/shared/database/migrations/XXXX_update_planos_per_seat.sql`
- `libs/shared/database/src/schema/subscription.ts`
- `libs/shared/database/src/schema/invoice.ts`

---

### Phase 2: Stripe Setup (Days 3-4)

**Tasks:**
- [ ] Create Stripe account (or use existing)
- [ ] Get API keys (test + production)
- [ ] Create products in Stripe dashboard:
  - Base subscription product
  - Per-seat addon product
- [ ] Install dependencies: `npm install stripe`
- [ ] Create environment variables
- [ ] Create Stripe service layer
- [ ] Test subscription creation manually in Stripe dashboard

**Files to Create:**
- `libs/shared/services/src/stripe.ts` - Stripe client initialization
- `apps/api/src/services/subscription-service.ts` - Business logic
- `.env.example` - Update with Stripe keys

**Environment Variables:**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASE_PRICE_ID=price_...
STRIPE_SEAT_PRICE_ID=price_...
```

---

### Phase 3: API Integration (Days 5-7)

**Tasks:**
- [ ] Create webhook endpoint (`/webhooks/stripe`)
- [ ] Implement webhook handlers for all events
- [ ] Modify user creation route to update seats
- [ ] Modify user deletion/deactivation to update seats
- [ ] Add subscription status checks to auth middleware
- [ ] Create subscription management endpoints:
  - `GET /subscriptions/current` - Get current subscription
  - `POST /subscriptions` - Create subscription
  - `PUT /subscriptions/cancel` - Cancel subscription
  - `PUT /subscriptions/resume` - Resume canceled subscription
  - `GET /invoices` - Get invoice history
- [ ] Update quota validator to check subscription status
- [ ] Add seat limit enforcement

**Files to Modify:**
- `apps/api/src/routes/usuarios/index.ts` - Add seat tracking
- `apps/api/src/routes/auth/index.ts` - Check subscription on login
- `libs/plugins/quota-validator/src/index.ts` - Add subscription checks

**Files to Create:**
- `apps/api/src/routes/webhooks/stripe.ts`
- `apps/api/src/routes/subscriptions/index.ts`
- `apps/api/src/routes/invoices/index.ts`

---

### Phase 4: Frontend Integration (Days 8-10)

**Tasks:**
- [ ] Install Stripe.js: `npm install @stripe/stripe-js`
- [ ] Create billing dashboard page
- [ ] Add payment method collection form
- [ ] Show current seat usage and costs
- [ ] Display billing history / invoices
- [ ] Create upgrade/downgrade plan flows
- [ ] Add trial countdown banner
- [ ] Create subscription management UI
- [ ] Add invoice download buttons
- [ ] Show payment failed notifications

**Pages to Create:**
- `apps/web/src/app/(dashboard)/billing/page.tsx` - Main billing page
- `apps/web/src/app/(dashboard)/billing/payment-method/page.tsx` - Update card
- `apps/web/src/app/(dashboard)/billing/invoices/page.tsx` - Invoice history
- `apps/web/src/app/(dashboard)/billing/upgrade/page.tsx` - Plan upgrade

**Components to Create:**
- `apps/web/src/components/billing/current-plan.tsx`
- `apps/web/src/components/billing/seat-usage.tsx`
- `apps/web/src/components/billing/payment-method-form.tsx`
- `apps/web/src/components/billing/invoice-list.tsx`
- `apps/web/src/components/billing/trial-banner.tsx`

---

### Phase 5: Testing & Launch (Days 11-14)

**Tasks:**
- [ ] Write unit tests for subscription logic
- [ ] Write integration tests for webhooks
- [ ] Test proration calculations
- [ ] Test seat addition/removal flows
- [ ] Test payment failures and recovery
- [ ] Test trial expiration
- [ ] Manual end-to-end testing
- [ ] Load testing with Stripe test mode
- [ ] Document API endpoints
- [ ] Create internal admin documentation
- [ ] Set up monitoring and alerts
- [ ] Deploy to staging environment
- [ ] Final production deployment

---

## Next Steps

### Immediate Actions (Choose One)

**Option 1: Start with Database Schema**
- Create the migration files for new tables
- Update existing planos table
- Set up relations in Drizzle

**Option 2: Set Up Stripe Account**
- Create Stripe account (if not exists)
- Create test products and prices
- Get API keys and configure environment

**Option 3: Build Payment Calculator**
- Create a simulator/calculator tool
- Test different pricing scenarios
- Validate business logic before implementation

**Option 4: Plan Detailed Implementation**
- Break down each phase into specific tasks
- Assign time estimates
- Create GitHub issues/project board

---

## Additional Considerations

### Security

- [ ] Never log Stripe API keys
- [ ] Always verify webhook signatures
- [ ] Use HTTPS in production
- [ ] Implement rate limiting on webhook endpoint
- [ ] Store sensitive data encrypted
- [ ] Follow PCI compliance guidelines (Stripe handles most of this)

### Performance

- [ ] Cache subscription data (invalidate on webhook)
- [ ] Use database indexes on foreign keys
- [ ] Implement retry logic for failed Stripe calls
- [ ] Monitor webhook processing times
- [ ] Use background jobs for heavy operations

### User Experience

- [ ] Clear pricing page with calculator
- [ ] Transparent cost breakdown
- [ ] Email notifications for all billing events
- [ ] Grace period before suspending access
- [ ] Easy cancellation process
- [ ] Self-service billing management

### Legal & Compliance

- [ ] Terms of Service updates for billing
- [ ] Privacy Policy updates for payment data
- [ ] Refund policy documentation
- [ ] Tax compliance (Stripe Tax can help)
- [ ] Invoice requirements (NFe if in Brazil)

### Monitoring & Analytics

- [ ] Track MRR (Monthly Recurring Revenue)
- [ ] Track churn rate
- [ ] Monitor payment success/failure rates
- [ ] Track seat usage trends
- [ ] Set up alerts for failed payments
- [ ] Dashboard for finance team

---

## Recommended Reading

- [Stripe Documentation - Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Documentation - Usage-based billing](https://stripe.com/docs/billing/subscriptions/usage-based)
- [Stripe Documentation - Webhooks](https://stripe.com/docs/webhooks)
- [Stripe API Reference](https://stripe.com/docs/api)
- [SaaS Pricing Best Practices](https://www.priceintelligently.com/blog)

---

## Contact & Support

For questions about this implementation:
1. Review Stripe documentation
2. Test in Stripe test mode first
3. Use Stripe CLI for local webhook testing
4. Check Stripe Dashboard logs for debugging

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-03  
**Author:** EcoTech Development Team
