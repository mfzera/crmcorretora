import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '@ecotech/shared/database';
import { subscriptions, corretoras, planos, invoices } from '@ecotech/shared/database';
import { eq, desc } from 'drizzle-orm';
import {
  getActiveSubscription,
  countActiveUsers,
  setCourtesySeats,
  cancelSubscription,
  resumeSubscription,
  overrideSubscriptionPlan,
  extendTrial,
  getAsaasSubscription,
  getAsaasCustomer,
  listAsaasPayments,
} from '@ecotech/shared/domain';
import { AdminAuditService } from '@ecotech/plugins/admin-auth';
import type { PlanCycle } from '@ecotech/shared/utils';

const corretoraIdParams = z.object({ corretoraId: z.string().uuid() });

const subscriptionsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // GET /api/admin/subscriptions — listar todas as assinaturas
  fastify.get(
    '/subscriptions',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Listar todas as assinaturas',
        description: 'Retorna todas as assinaturas da plataforma com dados de corretora, plano, ciclo, seats e datas, ordenadas por criação decrescente.',
        response: {
          200: z.unknown(),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_tenants']),
    },
    async (_request, _reply) => {
      const rows = await db
        .select({
          id: subscriptions.id,
          corretoraId: subscriptions.corretoraId,
          corretoraRazaoSocial: corretoras.razaoSocial,
          corretoraCnpj: corretoras.cnpj,
          planoNome: planos.nomePlano,
          planCycle: subscriptions.planCycle,
          status: subscriptions.status,
          asaasCustomerId: subscriptions.asaasCustomerId,
          asaasSubscriptionId: subscriptions.asaasSubscriptionId,
          asaasPaymentId: subscriptions.asaasPaymentId,
          seatsIncluded: subscriptions.seatsIncluded,
          seatsUsed: subscriptions.seatsUsed,
          seatsAdditional: subscriptions.seatsAdditional,
          seatsCourtesy: subscriptions.seatsCourtesy,
          basePrice: subscriptions.basePrice,
          pricePerSeat: subscriptions.pricePerSeat,
          totalMonthly: subscriptions.totalMonthly,
          currentPeriodStart: subscriptions.currentPeriodStart,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          trialStart: subscriptions.trialStart,
          trialEnd: subscriptions.trialEnd,
          cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
          canceledAt: subscriptions.canceledAt,
          createdAt: subscriptions.createdAt,
          updatedAt: subscriptions.updatedAt,
        })
        .from(subscriptions)
        .innerJoin(corretoras, eq(subscriptions.corretoraId, corretoras.id))
        .innerJoin(planos, eq(subscriptions.planoId, planos.id))
        .orderBy(desc(subscriptions.createdAt));

      return { success: true, data: { subscriptions: rows, total: rows.length } };
    },
  );

  // GET /api/admin/subscriptions/:corretoraId — detalhe + dados Asaas ao vivo
  fastify.get(
    '/subscriptions/:corretoraId',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Detalhes de assinatura por corretora',
        description: 'Retorna a assinatura ativa da corretora com dados ao vivo do Asaas (assinatura, cliente e contagem de usuários ativos).',
        params: corretoraIdParams,
        response: {
          200: z.unknown(),
          404: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_tenants']),
    },
    async (request, reply) => {
      const { corretoraId } = request.params;

      const subscription = await getActiveSubscription(corretoraId);
      if (!subscription) {
        return reply.status(404).send({ success: false, error: 'Assinatura não encontrada' });
      }

      const [currentActiveUsers, asaasSubscription, asaasCustomer] = await Promise.all([
        countActiveUsers(corretoraId),
        subscription.asaasSubscriptionId
          ? getAsaasSubscription(subscription.asaasSubscriptionId).catch(() => null)
          : Promise.resolve(null),
        subscription.asaasCustomerId
          ? getAsaasCustomer(subscription.asaasCustomerId).catch(() => null)
          : Promise.resolve(null),
      ]);

      return {
        success: true,
        data: { subscription, asaasSubscription, asaasCustomer, currentActiveUsers },
      };
    },
  );

  // GET /api/admin/subscriptions/:corretoraId/invoices — faturas merged
  fastify.get(
    '/subscriptions/:corretoraId/invoices',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Faturas da corretora',
        description: 'Retorna faturas locais mescladas com pagamentos do Asaas, deduplicadas por asaasPaymentId.',
        params: corretoraIdParams,
        querystring: z.object({
          limit: z.coerce.number().int().min(1).default(20).optional(),
          offset: z.coerce.number().int().min(0).default(0).optional(),
        }),
        response: {
          200: z.unknown(),
          404: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_tenants']),
    },
    async (request, reply) => {
      const { corretoraId } = request.params;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;

      const subscription = await getActiveSubscription(corretoraId);
      if (!subscription) {
        return reply.status(404).send({ success: false, error: 'Assinatura não encontrada' });
      }

      const localInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.corretoraId, corretoraId))
        .orderBy(desc(invoices.createdAt))
        .limit(limit)
        .offset(offset);

      let asaasPayments: any[] = [];
      if (subscription.asaasCustomerId) {
        const result = await listAsaasPayments({
          customerId: subscription.asaasCustomerId,
          limit,
          offset,
        }).catch(() => ({ data: [] }));
        asaasPayments = (result as any).data ?? [];
      }

      const localIds = new Set(localInvoices.map((i) => i.asaasPaymentId).filter(Boolean));
      const mergedAsaas = asaasPayments
        .filter((p: any) => !localIds.has(p.id))
        .map((p: any) => ({
          id: p.id,
          source: 'asaas' as const,
          asaasPaymentId: p.id,
          status: p.status,
          total: String(p.value),
          dueDate: p.dueDate ?? null,
          paidAt: p.paymentDate ? new Date(p.paymentDate).toISOString() : null,
          invoicePdfUrl: p.bankSlipUrl ?? p.invoiceUrl ?? null,
        }));

      const mergedLocal = localInvoices.map((i) => ({ ...i, source: 'local' as const }));
      const merged = [...mergedLocal, ...mergedAsaas];

      return { success: true, data: { invoices: merged, total: merged.length } };
    },
  );

  // PATCH /api/admin/subscriptions/:corretoraId/courtesy-seats
  fastify.patch(
    '/subscriptions/:corretoraId/courtesy-seats',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Definir seats de cortesia',
        description: 'Define a quantidade de seats de cortesia (gratuitos) para a corretora. A ação é registrada no audit log.',
        params: corretoraIdParams,
        body: z.object({
          courtesySeats: z.number().int().min(0),
          reason: z.string().optional(),
        }),
        response: {
          200: z.unknown(),
          404: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_billing']),
    },
    async (request, reply) => {
      const { corretoraId } = request.params;
      const { courtesySeats, reason } = request.body;

      const subscription = await getActiveSubscription(corretoraId);
      if (!subscription) {
        return reply.status(404).send({ success: false, error: 'Assinatura não encontrada' });
      }

      const seatsBefore = subscription.seatsCourtesy ?? 0;
      const result = await setCourtesySeats({
        corretoraId,
        courtesySeats,
        adminId: request.admin!.id,
        reason,
      });

      await AdminAuditService.logSubscriptionCourtesySeats(
        request.admin!.id,
        corretoraId,
        subscription.corretora?.razaoSocial ?? corretoraId,
        seatsBefore,
        courtesySeats,
        reason,
        request,
      );

      return { success: true, data: result };
    },
  );

  // POST /api/admin/subscriptions/:corretoraId/pause
  fastify.post(
    '/subscriptions/:corretoraId/pause',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Pausar assinatura',
        description: 'Define cancelAtPeriodEnd=true: a assinatura continua ativa até o fim do período corrente e não renova.',
        params: corretoraIdParams,
        response: {
          200: z.object({ success: z.literal(true) }),
          404: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_billing']),
    },
    async (request, reply) => {
      const { corretoraId } = request.params;

      const subscription = await getActiveSubscription(corretoraId);
      if (!subscription) {
        return reply.status(404).send({ success: false, error: 'Assinatura não encontrada' });
      }

      await cancelSubscription({ corretoraId, cancelAtPeriodEnd: true });

      await AdminAuditService.logSubscriptionPaused(
        request.admin!.id,
        corretoraId,
        subscription.corretora?.razaoSocial ?? corretoraId,
        request,
      );

      return { success: true as const };
    },
  );

  // POST /api/admin/subscriptions/:corretoraId/resume
  fastify.post(
    '/subscriptions/:corretoraId/resume',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Retomar assinatura pausada',
        description: 'Remove o cancelAtPeriodEnd, retomando a renovação automática da assinatura.',
        params: corretoraIdParams,
        response: {
          200: z.object({ success: z.literal(true) }),
          404: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_billing']),
    },
    async (request, reply) => {
      const { corretoraId } = request.params;

      const subscription = await getActiveSubscription(corretoraId);
      if (!subscription) {
        return reply.status(404).send({ success: false, error: 'Assinatura não encontrada' });
      }

      await resumeSubscription(corretoraId);

      await AdminAuditService.logSubscriptionResumed(
        request.admin!.id,
        corretoraId,
        subscription.corretora?.razaoSocial ?? corretoraId,
        request,
      );

      return { success: true as const };
    },
  );

  // POST /api/admin/subscriptions/:corretoraId/cancel
  fastify.post(
    '/subscriptions/:corretoraId/cancel',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Cancelar assinatura',
        description: 'Cancela a assinatura imediatamente ou ao fim do período corrente. Use immediately=true para cancelamento imediato.',
        params: corretoraIdParams,
        body: z.object({
          immediately: z.boolean().optional(),
        }),
        response: {
          200: z.object({ success: z.literal(true) }),
          404: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_billing']),
    },
    async (request, reply) => {
      const { corretoraId } = request.params;
      const immediately = request.body?.immediately ?? false;

      const subscription = await getActiveSubscription(corretoraId);
      if (!subscription) {
        return reply.status(404).send({ success: false, error: 'Assinatura não encontrada' });
      }

      await cancelSubscription({ corretoraId, cancelAtPeriodEnd: !immediately });

      await AdminAuditService.logSubscriptionCancelled(
        request.admin!.id,
        corretoraId,
        subscription.corretora?.razaoSocial ?? corretoraId,
        immediately,
        request,
      );

      return { success: true as const };
    },
  );

  // PATCH /api/admin/subscriptions/:corretoraId/override-plan
  fastify.patch(
    '/subscriptions/:corretoraId/override-plan',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Sobrescrever plano/preço da assinatura',
        description: 'Permite ao admin alterar manualmente o ciclo do plano e/ou o valor cobrado, registrando o motivo no audit log.',
        params: corretoraIdParams,
        body: z.object({
          planCycle: z.enum(['TRIENAL', 'ANUAL', 'SEMESTRAL', 'MENSAL']).optional(),
          newValue: z.number().min(0).optional(),
          reason: z.string().optional(),
        }),
        response: {
          200: z.unknown(),
          404: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_billing']),
    },
    async (request, reply) => {
      const { corretoraId } = request.params;
      const { planCycle, newValue, reason } = request.body;

      const subscription = await getActiveSubscription(corretoraId);
      if (!subscription) {
        return reply.status(404).send({ success: false, error: 'Assinatura não encontrada' });
      }

      const updated = await overrideSubscriptionPlan({
        corretoraId,
        planCycle: planCycle as unknown as PlanCycle | undefined,
        newValue,
        adminId: request.admin!.id,
        reason,
      });

      await AdminAuditService.logSubscriptionPlanOverridden(
        request.admin!.id,
        corretoraId,
        subscription.corretora?.razaoSocial ?? corretoraId,
        { planCycle, newValue, reason },
        request,
      );

      return { success: true, data: updated };
    },
  );

  // PATCH /api/admin/subscriptions/:corretoraId/extend-trial
  fastify.patch(
    '/subscriptions/:corretoraId/extend-trial',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Estender período de trial',
        description: 'Define uma nova data de fim do trial para a corretora. A ação é registrada no audit log.',
        params: corretoraIdParams,
        body: z.object({
          trialEndDate: z.string().date(),
        }),
        response: {
          200: z.object({ success: z.literal(true) }),
          404: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      onRequest: [fastify.authenticateAdmin],
      preHandler: fastify.authorizeAdmin(['manage_billing']),
    },
    async (request, reply) => {
      const { corretoraId } = request.params;
      const { trialEndDate } = request.body;

      const subscription = await getActiveSubscription(corretoraId);
      if (!subscription) {
        return reply.status(404).send({ success: false, error: 'Assinatura não encontrada' });
      }

      await extendTrial({
        corretoraId,
        newTrialEnd: new Date(trialEndDate),
        adminId: request.admin!.id,
      });

      await AdminAuditService.logSubscriptionTrialExtended(
        request.admin!.id,
        corretoraId,
        subscription.corretora?.razaoSocial ?? corretoraId,
        trialEndDate,
        request,
      );

      return { success: true as const };
    },
  );
};

export default subscriptionsRoutes;
