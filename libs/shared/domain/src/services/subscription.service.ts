/**
 * Subscription Service - Business logic for managing subscriptions
 *
 * This service handles:
 * - Subscription creation and lifecycle management
 * - Seat counting and billing calculations
 * - Seat usage history tracking
 * - Integration between database and Asaas
 */

import { db } from '@ecotech/shared/database';
import {
  subscriptions,
  invoices,
  seatUsageHistory,
  usuarios,
  corretoras,
} from '@ecotech/shared/database';
import { eq, and } from 'drizzle-orm';
import {
  calculateMonthlyBill,
  calculateAdditionalSeats,
  calculatePlanBill,
  PRICING_CONFIG,
  type PlanCycle,
} from '@ecotech/shared/utils';
import * as asaasService from './asaas.service.js';
import type { AsaasWebhookPayload } from './asaas.service.js';

/**
 * Count active users for a corretora
 */
export async function countActiveUsers(corretoraId: string): Promise<number> {
  const activeUsers = await db
    .select({ count: usuarios.id })
    .from(usuarios)
    .where(
      and(eq(usuarios.corretoraId, corretoraId), eq(usuarios.ativo, true)),
    );

  return activeUsers.length;
}

/**
 * Get active subscription for a corretora
 */
export async function getActiveSubscription(corretoraId: string) {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.corretoraId, corretoraId),
    with: {
      corretora: true,
    },
  });

  return subscription;
}

/**
 * Create a new subscription for a corretora
 */
export async function createSubscription(params: {
  corretoraId: string;
  planoId: string;
  asaasCustomerId: string;
  asaasSubscriptionId: string;
  trialEndDate?: Date;
}) {
  const corretora = await db.query.corretoras.findFirst({
    where: eq(corretoras.id, params.corretoraId),
  });

  if (!corretora) {
    throw new Error('Corretora not found');
  }

  const currentUsers = await countActiveUsers(params.corretoraId);
  const additionalSeats = calculateAdditionalSeats(currentUsers);
  const totalMonthly = calculateMonthlyBill(currentUsers);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const [newSubscription] = await db
    .insert(subscriptions)
    .values({
      corretoraId: params.corretoraId,
      planoId: params.planoId,
      asaasCustomerId: params.asaasCustomerId,
      asaasSubscriptionId: params.asaasSubscriptionId,
      status: params.trialEndDate ? 'TRIAL' : 'ACTIVE',
      seatsIncluded: PRICING_CONFIG.INCLUDED_SEATS,
      seatsUsed: currentUsers,
      seatsAdditional: additionalSeats,
      basePrice: PRICING_CONFIG.BASE_PRICE.toString(),
      pricePerSeat: PRICING_CONFIG.PRICE_PER_ADDITIONAL_SEAT.toString(),
      totalMonthly: totalMonthly.toString(),
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialStart: params.trialEndDate ? now : null,
      trialEnd: params.trialEndDate ?? null,
    })
    .returning();

  return newSubscription;
}

/**
 * Update seat count when a user is added or removed
 */
export async function updateSubscriptionSeats(params: {
  corretoraId: string;
  eventType: 'USER_ACTIVATED' | 'USER_DEACTIVATED';
  usuarioId?: string;
  usuarioEmail?: string;
  registeredBy?: string;
  notes?: string;
}) {
  const subscription = await getActiveSubscription(params.corretoraId);

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  const currentUsers = await countActiveUsers(params.corretoraId);
  const courtesy = subscription.seatsCourtesy ?? 0;
  const cycle = (subscription.planCycle as PlanCycle) ?? 'TRIENAL';
  const billableUsers = Math.max(0, currentUsers - courtesy);
  const newAdditionalSeats = Math.max(0, billableUsers - PRICING_CONFIG.INCLUDED_SEATS);
  const newTotalMonthly = calculatePlanBill(currentUsers, cycle, courtesy);

  const costBefore = parseFloat(subscription.totalMonthly || '0');
  const seatsBefore = subscription.seatsUsed;

  // Atualizar valor da assinatura no Asaas
  if (subscription.asaasSubscriptionId) {
    await asaasService.updateAsaasSubscription(
      subscription.asaasSubscriptionId,
      { value: newTotalMonthly },
    );
  }

  await db
    .update(subscriptions)
    .set({
      seatsUsed: currentUsers,
      seatsAdditional: newAdditionalSeats,
      totalMonthly: newTotalMonthly.toString(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  await db.insert(seatUsageHistory).values({
    corretoraId: params.corretoraId,
    subscriptionId: subscription.id,
    eventType: params.eventType,
    usuarioId: params.usuarioId,
    usuarioEmail: params.usuarioEmail,
    seatsUsedBefore: seatsBefore,
    seatsUsedAfter: currentUsers,
    monthlyCostBefore: costBefore.toString(),
    monthlyCostAfter: newTotalMonthly.toString(),
    registeredBy: params.registeredBy,
    notes: params.notes,
  });

  return {
    seatsUsed: currentUsers,
    seatsAdditional: newAdditionalSeats,
    totalMonthly: newTotalMonthly,
    costChange: newTotalMonthly - costBefore,
  };
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(params: {
  corretoraId: string;
  cancelAtPeriodEnd?: boolean;
}) {
  const subscription = await getActiveSubscription(params.corretoraId);

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  if (subscription.asaasSubscriptionId && !params.cancelAtPeriodEnd) {
    await asaasService.cancelAsaasSubscription(subscription.asaasSubscriptionId);
  }

  if (subscription.asaasSubscriptionId && params.cancelAtPeriodEnd) {
    await asaasService.updateAsaasSubscription(subscription.asaasSubscriptionId, {
      status: 'INACTIVE',
    });
  }

  await db
    .update(subscriptions)
    .set({
      status: params.cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELLED',
      cancelAtPeriodEnd: params.cancelAtPeriodEnd || false,
      canceledAt: params.cancelAtPeriodEnd ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  return subscription;
}

/**
 * Resume a subscription scheduled for cancellation
 */
export async function resumeSubscription(corretoraId: string) {
  const subscription = await getActiveSubscription(corretoraId);

  if (!subscription) {
    throw new Error('No subscription found');
  }

  if (!subscription.cancelAtPeriodEnd) {
    throw new Error('Subscription is not scheduled for cancellation');
  }

  if (subscription.asaasSubscriptionId) {
    await asaasService.updateAsaasSubscription(subscription.asaasSubscriptionId, {
      status: 'ACTIVE',
    });
  }

  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  return subscription;
}

/**
 * Set courtesy seats for a corretora (admin action)
 * Courtesy seats reduce billing without removing users.
 */
export async function setCourtesySeats(params: {
  corretoraId: string;
  courtesySeats: number;
  adminId: string;
  reason?: string;
}) {
  const subscription = await getActiveSubscription(params.corretoraId);

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  const currentUsers = await countActiveUsers(params.corretoraId);
  const cycle = (subscription.planCycle as PlanCycle) ?? 'TRIENAL';
  const billableUsers = Math.max(0, currentUsers - params.courtesySeats);
  const newAdditionalSeats = Math.max(0, billableUsers - PRICING_CONFIG.INCLUDED_SEATS);
  const newTotalMonthly = calculatePlanBill(currentUsers, cycle, params.courtesySeats);

  const costBefore = parseFloat(subscription.totalMonthly || '0');

  if (subscription.asaasSubscriptionId) {
    await asaasService.updateAsaasSubscription(subscription.asaasSubscriptionId, {
      value: newTotalMonthly,
    });
  }

  await db
    .update(subscriptions)
    .set({
      seatsCourtesy: params.courtesySeats,
      seatsAdditional: newAdditionalSeats,
      totalMonthly: newTotalMonthly.toString(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  await db.insert(seatUsageHistory).values({
    corretoraId: params.corretoraId,
    subscriptionId: subscription.id,
    eventType: 'COURTESY_ADJUSTED',
    seatsUsedBefore: subscription.seatsUsed,
    seatsUsedAfter: currentUsers,
    monthlyCostBefore: costBefore.toString(),
    monthlyCostAfter: newTotalMonthly.toString(),
    registeredBy: params.adminId,
    notes: params.reason ?? null,
  });

  return { seatsCourtesy: params.courtesySeats, totalMonthly: newTotalMonthly };
}

/**
 * Override subscription plan cycle/value (admin action)
 */
export async function overrideSubscriptionPlan(params: {
  corretoraId: string;
  planCycle?: PlanCycle;
  newValue?: number;
  adminId: string;
  reason?: string;
}) {
  const subscription = await getActiveSubscription(params.corretoraId);

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  const newCycle = params.planCycle ?? (subscription.planCycle as PlanCycle) ?? 'TRIENAL';
  const currentUsers = await countActiveUsers(params.corretoraId);
  const courtesy = subscription.seatsCourtesy ?? 0;
  const newTotalMonthly =
    params.newValue ?? calculatePlanBill(currentUsers, newCycle, courtesy);

  if (subscription.asaasSubscriptionId) {
    await asaasService.updateAsaasSubscription(subscription.asaasSubscriptionId, {
      value: newTotalMonthly,
      ...(params.planCycle && {
        cycle: (
          {
            MENSAL: 'MONTHLY',
            SEMESTRAL: 'SEMIANNUALLY',
            ANUAL: 'YEARLY',
            TRIENAL: 'MONTHLY', // fallback — TRIENAL não tem cycle no Asaas
          } as const
        )[newCycle],
      }),
    });
  }

  const [updated] = await db
    .update(subscriptions)
    .set({
      planCycle: newCycle,
      totalMonthly: newTotalMonthly.toString(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id))
    .returning();

  return updated;
}

/**
 * Extend the trial period (admin action)
 */
export async function extendTrial(params: {
  corretoraId: string;
  newTrialEnd: Date;
  adminId: string;
}) {
  const subscription = await getActiveSubscription(params.corretoraId);

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  await db
    .update(subscriptions)
    .set({
      trialEnd: params.newTrialEnd,
      status: 'TRIAL',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));
}

/**
 * Sync subscription from Asaas webhook payload
 */
export async function syncSubscriptionFromAsaas(
  payload: AsaasWebhookPayload,
) {
  const asaasPayment = payload.payment;
  const asaasSub = payload.subscription;

  // Eventos de pagamento
  if (asaasPayment?.subscription) {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.asaasSubscriptionId, asaasPayment.subscription),
    });

    if (!subscription) {
      console.warn(`Subscription not found for Asaas ID: ${asaasPayment.subscription}`);
      return;
    }

    if (payload.event === 'PAYMENT_CONFIRMED' || payload.event === 'PAYMENT_RECEIVED') {
      // Registrar pagamento no banco (upsert para sincronizar estado mais recente)
      await db
        .insert(invoices)
        .values({
          corretoraId: subscription.corretoraId,
          subscriptionId: subscription.id,
          asaasPaymentId: asaasPayment.id,
          status: 'PAID',
          total: asaasPayment.value.toString(),
          subtotal: asaasPayment.value.toString(),
          invoicePdfUrl: asaasPayment.bankSlipUrl || asaasPayment.invoiceUrl || null,
          dueDate: asaasPayment.dueDate,
          paidAt: asaasPayment.paymentDate ? new Date(asaasPayment.paymentDate) : new Date(),
          seatsIncluded: subscription.seatsIncluded,
          seatsAdditional: subscription.seatsAdditional,
          basePrice: subscription.basePrice,
          seatPrice: subscription.pricePerSeat,
        })
        .onConflictDoUpdate({
          target: invoices.asaasPaymentId,
          set: {
            status: 'PAID',
            paidAt: asaasPayment.paymentDate ? new Date(asaasPayment.paymentDate) : new Date(),
            invoicePdfUrl: asaasPayment.bankSlipUrl || asaasPayment.invoiceUrl || null,
          },
        });

      // Ativar subscription se estava em trial ou past_due
      if (subscription.status === 'TRIAL' || subscription.status === 'PAST_DUE') {
        await db
          .update(subscriptions)
          .set({ status: 'ACTIVE', updatedAt: new Date() })
          .where(eq(subscriptions.id, subscription.id));
      }
    }

    if (payload.event === 'PAYMENT_OVERDUE') {
      await db
        .update(subscriptions)
        .set({ status: 'PAST_DUE', updatedAt: new Date() })
        .where(eq(subscriptions.id, subscription.id));
    }

    if (payload.event === 'PAYMENT_DELETED') {
      await db
        .update(subscriptions)
        .set({ status: 'CANCELLED', canceledAt: new Date(), updatedAt: new Date() })
        .where(eq(subscriptions.id, subscription.id));
    }

    if (payload.event === 'PAYMENT_REFUNDED') {
      // Marcar fatura como reembolsada e suspender acesso
      await db
        .update(invoices)
        .set({ status: 'VOID' })
        .where(eq(invoices.asaasPaymentId, asaasPayment.id));

      await db
        .update(subscriptions)
        .set({ status: 'CANCELLED', canceledAt: new Date(), updatedAt: new Date() })
        .where(eq(subscriptions.id, subscription.id));
    }
  }

  // Eventos de subscription
  if (asaasSub) {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.asaasSubscriptionId, asaasSub.id),
    });

    if (!subscription) return;

    if (payload.event === 'SUBSCRIPTION_DELETED') {
      await db
        .update(subscriptions)
        .set({ status: 'CANCELLED', canceledAt: new Date(), updatedAt: new Date() })
        .where(eq(subscriptions.id, subscription.id));
    }

    if (payload.event === 'SUBSCRIPTION_RENEWED') {
      const now = new Date();
      const nextPeriodEnd = new Date(now);
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

      await db
        .update(subscriptions)
        .set({
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: nextPeriodEnd,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, subscription.id));
    }
  }
}

/**
 * Get subscription with usage details
 */
export async function getSubscriptionDetails(corretoraId: string) {
  const subscription = await getActiveSubscription(corretoraId);

  if (!subscription) {
    return null;
  }

  const currentUsers = await countActiveUsers(corretoraId);

  return {
    ...subscription,
    currentActiveUsers: currentUsers,
    isOverLimit: currentUsers > (subscription.seatsUsed || 0),
  };
}
