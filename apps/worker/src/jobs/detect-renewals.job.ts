/**
 * Detect Renewals Job
 *
 * Automatically creates renewal records for active policies
 * that are entering the 45-day renewal window.
 *
 * Runs: Daily at 3:00 AM
 */

import { RenovacaoService } from '@ecotech/shared/domain';
import {
  RenovacaoRepository,
  DocumentoVendaRepository,
  CotacaoRepository,
  db,
} from '@ecotech/shared/database';
import { logger } from '@ecotech/shared/utils/logger';
import type { DetectRenewalsJobData, DetectRenewalsJobResult } from './types';

export type { DetectRenewalsJobData, DetectRenewalsJobResult };

/**
 * Detect and create renewals for expiring policies
 */
export async function detectRenewalsJob(
  data: DetectRenewalsJobData = {},
): Promise<DetectRenewalsJobResult> {
  const daysAhead = data.daysAhead || 60;

  logger.info(
    { tenantId: data.tenantId, daysAhead },
    'Starting detect renewals job',
  );

  // Initialize repositories and service
  const renovacaoRepo = new RenovacaoRepository(db);
  const documentoRepo = new DocumentoVendaRepository(db);
  const cotacaoRepo = new CotacaoRepository(db);
  const renovacaoService = new RenovacaoService(
    renovacaoRepo,
    documentoRepo,
    cotacaoRepo,
  );

  const result: DetectRenewalsJobResult = {
    totalDocuments: 0,
    renewalsCreated: 0,
    renewalsAlreadyExisted: 0,
    errors: 0,
    details: [],
  };

  try {
    // Get all active tenants (or single tenant if specified)
    const tenantIds = data.tenantId ? [data.tenantId] : await getTenantIds();

    for (const tenantId of tenantIds) {
      const tenantResult = {
        tenantId,
        created: 0,
        existing: 0,
        failed: 0,
      };

      try {
        // Find documents expiring in the next N days
        const documentosExpirando = await documentoRepo.findExpiringInDays(
          tenantId,
          daysAhead,
        );

        logger.info(
          { tenantId, count: documentosExpirando.length },
          `Found ${documentosExpirando.length} expiring documents`,
        );

        result.totalDocuments += documentosExpirando.length;

        // Create renewal for each expiring document
        for (const documento of documentosExpirando) {
          try {
            // Use service (automatically checks if renewal exists)
            const renovacao = await renovacaoService.criarRenovacaoAutomatica(
              documento.id,
              tenantId,
            );

            // Check if it was newly created or already existed
            const createdAt = renovacao.createdAt
              ? new Date(renovacao.createdAt).getTime()
              : 0;
            const wasCreated = createdAt > Date.now() - 60000; // Created in last minute

            if (wasCreated) {
              tenantResult.created++;
              result.renewalsCreated++;

              logger.info(
                {
                  tenantId,
                  renovacaoId: renovacao.id,
                  documentoId: documento.id,
                  numeroDocumento: documento.numeroDocumento,
                  dataVencimento: renovacao.dataVencimento,
                },
                'Renewal created automatically',
              );
            } else {
              tenantResult.existing++;
              result.renewalsAlreadyExisted++;

              logger.debug(
                {
                  tenantId,
                  renovacaoId: renovacao.id,
                  documentoId: documento.id,
                },
                'Renewal already exists',
              );
            }
          } catch (error) {
            tenantResult.failed++;
            result.errors++;

            logger.error(
              {
                tenantId,
                documentoId: documento.id,
                error: error instanceof Error ? error.message : String(error),
              },
              'Failed to create renewal',
            );
          }
        }
      } catch (error) {
        logger.error(
          {
            tenantId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to process tenant',
        );
        result.errors++;
      }

      result.details.push(tenantResult);
    }

    logger.info(
      {
        totalDocuments: result.totalDocuments,
        renewalsCreated: result.renewalsCreated,
        renewalsAlreadyExisted: result.renewalsAlreadyExisted,
        errors: result.errors,
      },
      'Detect renewals job completed',
    );

    return result;
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Detect renewals job failed',
    );
    throw error;
  }
}

/**
 * Get all active tenant IDs
 * TODO: Implement actual tenant query when multi-tenancy is fully implemented
 */
async function getTenantIds(): Promise<string[]> {
  // For now, get from corretoras table
  const corretoras = await db.query.corretoras.findMany({
    columns: { id: true },
  });

  return corretoras.map((s) => s.id);
}
