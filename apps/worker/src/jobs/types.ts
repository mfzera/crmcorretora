/**
 * Shared types for worker jobs.
 * Re-exported from individual job files for convenience.
 */

export interface DetectRenewalsJobData {
  tenantId?: string;
  daysAhead?: number;
}

export interface DetectRenewalsJobResult {
  totalDocuments: number;
  renewalsCreated: number;
  renewalsAlreadyExisted: number;
  errors: number;
  details: {
    tenantId: string;
    created: number;
    existing: number;
    failed: number;
  }[];
}

export interface NotifyUrgentRenewalsJobData {
  tenantId?: string;
  daysThreshold?: number;
}

export interface NotifyUrgentRenewalsJobResult {
  totalRenewalsChecked: number;
  notificationsSent: number;
  errors: number;
  details: {
    tenantId: string;
    urgentCount: number;
    notificationsSent: number;
  }[];
}

export interface BackupJobData {
  tipo: 'incremental' | 'completo';
  includeDatabase?: boolean; // Cria branch Neon (snapshot do banco)
  cleanup?: boolean;         // Remove backups antigos após concluir
  retentionDays?: number;    // Dias de retenção para limpeza (padrão: 30 incremental, 90 completo)
}

export interface BackupJobResult {
  filesBackupId?: string;
  filesTotal: number;
  filesBytesTotal: number;
  durationSeconds: number;
  neonBranchId?: string;
  neonBranchName?: string;
  cleanedBackups: number;
  cleanedNeonBranches: number;
}
