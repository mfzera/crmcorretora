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

/**
 * Detect and create renewals for expiring policies
 */
export async function detectRenewalsJob(
  data: DetectRenewalsJobData = {},
): Promise<DetectRenewalsJobResult> {
  const daysAhead = data.daysAhead || 60;

  logger.info(
    {
      tenantId: data.tenantId,
      daysAhead,
    },
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
    totalRenewalsCreated: 0,
    tenantsProcessed: 0,
    totalDocuments: 0,
    renewalsCreated: 0,
    renewalsAlreadyExisted: 0,
    errors: 0,
    results: [],
    executedAt: new Date(),
  };

  try {
    // Get all active tenants (or single tenant if specified)
    const tenantIds = data.tenantId ? [data.tenantId] : await getTenantIds();

    for (const tenantId of tenantIds) {
      const tenantResult = {
        tenantId,
        documentsChecked: 0,
        created: 0,
        alreadyExisted: 0,
        errors: [] as string[],
      };

      try {
        // Find documents expiring in the next N days
        const documentosExpirando = await documentoRepo.findExpiringInDays(
          tenantId,
          daysAhead,
        );

        logger.info(
          {
            tenantId,
            count: documentosExpirando.length,
          },
          `Found ${documentosExpirando.length} expiring documents`,
        );

        result.totalDocuments += documentosExpirando.length;
        tenantResult.documentsChecked = documentosExpirando.length;

        // Create renewal for each expiring document
        for (const documento of documentosExpirando) {
          try {
            // Use service (automatically checks if renewal exists)
            const renovacao = await renovacaoService.criarRenovacaoAutomatica(
              documento.id,
              tenantId,
            );

            // Check if it was newly created or already existed
            const wasCreated = renovacao.createdAt
              ? new Date(renovacao.createdAt).getTime() > Date.now() - 60000
              : true; // Created in last minute

            if (wasCreated) {
              tenantResult.created++;
              result.renewalsCreated++;
              result.totalRenewalsCreated++;

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
              tenantResult.alreadyExisted++;
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
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            tenantResult.errors.push(errorMsg);
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

      result.results.push(tenantResult);
      result.tenantsProcessed++;
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
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'Detect renewals job failed',
    );
    throw error;
  }
}

/**
 * Get all active tenant (corretora) IDs
 */
async function getTenantIds(): Promise<string[]> {
  const { corretoras } = await import('@ecotech/shared/database');
  const result = await db.select({ id: corretoras.id }).from(corretoras);

  return result.map((r) => r.id);
}
