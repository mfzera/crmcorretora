/**
 * Purge Expired Data Job — LGPD Compliance
 *
 * Removes or anonymizes data that exceeded its retention period:
 * - audit_log: anonymizes IP + nome + email after 90 days
 * - password_reset_token: deletes expired tokens
 * - portal_segurado_token: deletes expired tokens
 *
 * Runs: Daily at 02:00 AM
 */

import { db } from '@ecotech/shared/database';
import { auditLogs, passwordResetTokens, portalSeguradoTokens } from '@ecotech/shared/database';
import { lt, isNotNull, isNull, or } from 'drizzle-orm';
import { logger } from '@ecotech/shared/utils/logger';
import { todayInSP, addCalendarDays } from '@ecotech/shared/utils';

export interface PurgeExpiredDataJobData {
  auditLogRetentionDays?: number; // default: 90
}

export interface PurgeExpiredDataJobResult {
  auditLogsAnonymized: number;
  passwordResetTokensDeleted: number;
  portalTokensDeleted: number;
  executedAt: Date;
}

export async function purgeExpiredDataJob(
  data: PurgeExpiredDataJobData = {},
): Promise<PurgeExpiredDataJobResult> {
  const retentionDays = data.auditLogRetentionDays ?? 90;

  logger.info({ retentionDays }, 'Starting purge expired data job (LGPD)');

  const result: PurgeExpiredDataJobResult = {
    auditLogsAnonymized: 0,
    passwordResetTokensDeleted: 0,
    portalTokensDeleted: 0,
    executedAt: new Date(),
  };

  // Cutoff = início (UTC midnight) do dia (hoje SP - retentionDays)
  const cutoffDate = addCalendarDays(todayInSP(), -retentionDays) + 'T00:00:00Z';

  // 1. Anonymize audit_log entries older than retention period
  // Preserva a estrutura do log (ação, entidade) mas remove PII
  try {
    const { sql } = await import('drizzle-orm');

    const anonymized = await db
      .update(auditLogs)
      .set({
        usuarioNome: null,
        usuarioEmail: null,
        ipAddress: null,
        userAgent: null,
        dadosAnteriores: null,
        dadosNovos: null,
      })
      .where(
        sql`${auditLogs.createdAt} < ${cutoffDate} AND (${auditLogs.ipAddress} IS NOT NULL OR ${auditLogs.usuarioNome} IS NOT NULL)`,
      )
      .returning({ id: auditLogs.id });

    result.auditLogsAnonymized = anonymized.length;
    logger.info({ count: anonymized.length }, 'Audit logs anonymized');
  } catch (error) {
    logger.error({ err: error }, 'Failed to anonymize audit logs');
  }

  // 2. Delete expired password_reset_tokens
  try {
    const { sql } = await import('drizzle-orm');
    const now = new Date().toISOString();

    const deleted = await db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < ${now}`)
      .returning({ id: passwordResetTokens.id });

    result.passwordResetTokensDeleted = deleted.length;
    logger.info(
      { count: deleted.length },
      'Expired password reset tokens deleted',
    );
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete expired password reset tokens');
  }

  // 3. Delete expired portal_segurado_tokens
  try {
    const { sql } = await import('drizzle-orm');
    const now = new Date().toISOString();

    const deleted = await db
      .delete(portalSeguradoTokens)
      .where(sql`${portalSeguradoTokens.expiresAt} < ${now}`)
      .returning({ id: portalSeguradoTokens.id });

    result.portalTokensDeleted = deleted.length;
    logger.info(
      { count: deleted.length },
      'Expired portal segurado tokens deleted',
    );
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete expired portal tokens');
  }

  logger.info(result, 'Purge expired data job completed');

  return result;
}
