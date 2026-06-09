/**
 * Type definitions for worker jobs
 */

// ===== Detect Renewals Job =====

export interface DetectRenewalsJobData {
  tenantId?: string; // Optional: se não fornecido, processa todos os tenants
  daysAhead?: number; // Quantos dias à frente buscar documentos expirando (default: 60)
}

export interface DetectRenewalsJobResult {
  totalRenewalsCreated: number;
  tenantsProcessed: number;
  totalDocuments: number;
  renewalsCreated: number;
  renewalsAlreadyExisted: number;
  errors: number;
  results: Array<{
    tenantId: string;
    documentsChecked: number;
    created: number;
    alreadyExisted: number;
    errors: string[];
  }>;
  executedAt: Date;
}

// ===== Purge Expired Data Job (LGPD) =====

export interface PurgeExpiredDataJobData {
  auditLogRetentionDays?: number;
}

export interface PurgeExpiredDataJobResult {
  auditLogsAnonymized: number;
  passwordResetTokensDeleted: number;
  portalTokensDeleted: number;
  executedAt: Date;
}

// ===== Notify Urgent Renewals Job =====

export interface NotifyUrgentRenewalsJobData {
  tenantId?: string; // Optional: se não fornecido, processa todos os tenants
  daysThreshold?: number; // Considera urgente se vencer em <= X dias (default: 15)
}

export interface NotifyUrgentRenewalsJobResult {
  totalNotificationsSent: number;
  vendedoresNotified: number;
  urgentRenewals: number;
  totalRenewalsChecked: number;
  notificationsSent: number;
  errors: number;
  results: Array<{
    tenantId: string;
    notificationsSent: number;
    urgentCount: number;
    errors: string[];
  }>;
  executedAt: Date;
}
