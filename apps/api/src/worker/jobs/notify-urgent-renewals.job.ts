/**
 * Notify Urgent Renewals Job
 *
 * Sends notifications to salespeople about renewals expiring in the next 30 days.
 * Priority is determined by days remaining: ≤7 = urgente, ≤15 = alta, ≤30 = media.
 *
 * Runs: Every hour during business hours (9 AM - 6 PM)
 */

import { RenovacaoService } from '@ecotech/shared/domain';
import {
  RenovacaoRepository,
  DocumentoVendaRepository,
  CotacaoRepository,
  db,
  NotificacaoService,
  usuarios,
} from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import { logger } from '@ecotech/shared/utils/logger';
import type {
  NotifyUrgentRenewalsJobData,
  NotifyUrgentRenewalsJobResult,
} from './types';

export async function notifyUrgentRenewalsJob(
  data: NotifyUrgentRenewalsJobData = {},
): Promise<NotifyUrgentRenewalsJobResult> {
  const daysThreshold = data.daysThreshold || 30;

  logger.info(
    { tenantId: data.tenantId, daysThreshold },
    'Starting notify urgent renewals job',
  );

  const renovacaoRepo = new RenovacaoRepository(db);
  const documentoRepo = new DocumentoVendaRepository(db);
  const cotacaoRepo = new CotacaoRepository(db);
  const renovacaoService = new RenovacaoService(
    renovacaoRepo,
    documentoRepo,
    cotacaoRepo,
  );

  const result: NotifyUrgentRenewalsJobResult = {
    totalNotificationsSent: 0,
    vendedoresNotified: 0,
    urgentRenewals: 0,
    totalRenewalsChecked: 0,
    notificationsSent: 0,
    errors: 0,
    results: [],
    executedAt: new Date(),
  };

  try {
    const tenantIds = data.tenantId ? [data.tenantId] : await getTenantIds();

    for (const tenantId of tenantIds) {
      const tenantResult = {
        tenantId,
        urgentCount: 0,
        notificationsSent: 0,
        errors: [] as string[],
      };

      try {
        const renovacoesPendentes =
          await renovacaoService.getRenovacoesPendentes(tenantId, daysThreshold);

        result.totalRenewalsChecked += renovacoesPendentes.length;

        const paraNotificar = renovacoesPendentes.filter(
          (r) => r.diasParaVencimento <= daysThreshold,
        );

        tenantResult.urgentCount = paraNotificar.length;
        result.urgentRenewals += paraNotificar.length;

        logger.info(
          { tenantId, total: renovacoesPendentes.length, paraNotificar: paraNotificar.length },
          'Found renewals to notify',
        );

        for (const renovacao of paraNotificar) {
          try {
            const vendedorId = (renovacao as any).vendedorId
              || (renovacao as any).documentoVendaAnterior?.vendedorId;

            if (!vendedorId) {
              logger.warn({ renovacaoId: renovacao.id }, 'Renovação sem vendedorId, pulando');
              continue;
            }

            const vendedor = await db.query.usuarios.findFirst({
              where: eq(usuarios.id, vendedorId),
              columns: { gestorId: true },
            });

            const clienteNome =
              (renovacao as any).cliente?.nome ||
              (renovacao as any).cliente?.razaoSocial ||
              (renovacao as any).documentoVendaAnterior?.cliente?.nome ||
              (renovacao as any).documentoVendaAnterior?.cliente?.razaoSocial ||
              'Cliente';

            await NotificacaoService.notificarRenovacaoExpirando({
              corretoraId: tenantId,
              renovacaoId: renovacao.id,
              clienteNome,
              dataVencimento: renovacao.dataVencimento,
              diasRestantes: renovacao.diasParaVencimento,
              vendedorId,
              gestorId: vendedor?.gestorId,
            });

            tenantResult.notificationsSent++;
            result.notificationsSent++;
            result.totalNotificationsSent++;
            result.vendedoresNotified++;

            logger.info(
              { tenantId, renovacaoId: renovacao.id, vendedorId, diasRestantes: renovacao.diasParaVencimento },
              'Notification sent for renewal',
            );
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            tenantResult.errors.push(errorMsg);
            result.errors++;
            logger.error(
              { tenantId, renovacaoId: renovacao.id, error: errorMsg },
              'Failed to send renewal notification',
            );
          }
        }
      } catch (error) {
        logger.error(
          { tenantId, error: error instanceof Error ? error.message : String(error) },
          'Failed to process tenant notifications',
        );
        result.errors++;
      }

      result.results.push(tenantResult);
    }

    logger.info(
      {
        totalChecked: result.totalRenewalsChecked,
        notificationsSent: result.notificationsSent,
        errors: result.errors,
      },
      'Notify urgent renewals job completed',
    );

    return result;
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Notify urgent renewals job failed',
    );
    throw error;
  }
}

async function getTenantIds(): Promise<string[]> {
  const { corretoras } = await import('@ecotech/shared/database');
  const result = await db.select({ id: corretoras.id }).from(corretoras);
  return result.map((r) => r.id);
}
