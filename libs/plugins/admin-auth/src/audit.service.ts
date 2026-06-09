import { db } from '@ecotech/shared/database';
import { adminAuditLogs } from '@ecotech/shared/database';

export interface AuditLogParams {
  adminId: string;
  acao: string;
  entidadeTipo?: string;
  entidadeId?: string;
  detalhes?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request?: any;
}

export class AdminAuditService {
  /**
   * Registrar ação admin no log de auditoria
   */
  static async log(params: AuditLogParams): Promise<void> {
    const { adminId, acao, entidadeTipo, entidadeId, detalhes, request } =
      params;

    // Extrair IP e User Agent do request se disponível
    let ip: string | undefined;
    let userAgent: string | undefined;

    if (request) {
      ip = request.ip || (request.headers['x-real-ip'] as string);
      userAgent = request.headers['user-agent'];
    }

    await db.insert(adminAuditLogs).values({
      adminId,
      acao,
      entidadeTipo,
      entidadeId,
      detalhes,
      ip,
      userAgent,
    });
  }

  /**
   * Registrar login de admin
   */
  static async logLogin(
    adminId: string,
    email: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'admin_login',
      detalhes: { email },
      request,
    });
  }

  /**
   * Registrar logout de admin
   */
  static async logLogout(
    adminId: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'admin_logout',
      request,
    });
  }

  /**
   * Registrar visualização de tenant
   */
  static async logViewTenant(
    adminId: string,
    email: string,
    corretoraId: string,
    tenantName: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'tenant_viewed',
      entidadeTipo: 'corretora',
      entidadeId: corretoraId,
      detalhes: { email, tenantName },
      request,
    });
  }

  /**
   * Registrar visualização de lista de tenants
   */
  static async logViewTenantList(
    adminId: string,
    email: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'tenant_list_viewed',
      detalhes: { email },
      request,
    });
  }

  /**
   * Registrar visualização de métricas de um tenant
   */
  static async logViewTenantMetrics(
    adminId: string,
    email: string,
    corretoraId: string,
    tenantName: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'tenant_metrics_viewed',
      entidadeTipo: 'corretora',
      entidadeId: corretoraId,
      detalhes: { email, tenantName },
      request,
    });
  }

  /**
   * Registrar visualização de métricas globais
   */
  static async logViewGlobalMetrics(
    adminId: string,
    email: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'global_metrics_viewed',
      detalhes: { email },
      request,
    });
  }

  /**
   * Registrar alteração de limite de storage
   */
  static async logUpdateStorageLimit(
    adminId: string,
    email: string,
    corretoraId: string,
    tenantName: string,
    changes: {
      limiteAnterior?: number;
      limiteNovo?: number;
      [key: string]: any;
    },
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'storage_limit_updated',
      entidadeTipo: 'corretora',
      entidadeId: corretoraId,
      detalhes: { email, tenantName, ...changes },
      request,
    });
  }

  /**
   * Registrar criação de backup
   */
  static async logBackupCreated(
    adminId: string,
    email: string,
    backupId: string,
    tipo: 'incremental' | 'completo',
    corretoraId: string | null,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'backup_created',
      entidadeTipo: 'backup',
      entidadeId: backupId,
      detalhes: {
        email,
        tipo,
        corretoraId: corretoraId || 'global',
      },
      request,
    });
  }

  /**
   * Registrar restore de backup
   */
  static async logBackupRestored(
    adminId: string,
    backupId: string,
    corretoraId?: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'backup_restored',
      entidadeTipo: 'backup',
      entidadeId: backupId,
      detalhes: {
        corretoraId: corretoraId || 'global',
      },
      request,
    });
  }

  /**
   * Registrar verificação de backup
   */
  static async logBackupVerified(
    adminId: string,
    email: string,
    backupId: string,
    success: boolean,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'backup_verified',
      entidadeTipo: 'backup',
      entidadeId: backupId,
      detalhes: { email, success },
      request,
    });
  }

  /**
   * Registrar deleção de backup
   */
  static async logBackupDeleted(
    adminId: string,
    email: string,
    backupId: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'backup_deleted',
      entidadeTipo: 'backup',
      entidadeId: backupId,
      detalhes: { email },
      request,
    });
  }

  /**
   * Registrar visualização de lista de backups
   */
  static async logViewBackupList(
    adminId: string,
    email: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'backup_list_viewed',
      detalhes: { email },
      request,
    });
  }

  /**
   * Registrar criação/edição de admin
   */
  static async logAdminManagement(
    adminId: string,
    targetAdminId: string,
    action: 'created' | 'updated' | 'deleted',
    changes?: Record<string, any>,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: `admin_${action}`,
      entidadeTipo: 'admin',
      entidadeId: targetAdminId,
      detalhes: changes,
      request,
    });
  }

  static async logSubscriptionCourtesySeats(
    adminId: string,
    corretoraId: string,
    corretoraNome: string,
    seatsBefore: number,
    seatsAfter: number,
    reason?: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'subscription_courtesy_seats_updated',
      entidadeTipo: 'subscription',
      entidadeId: corretoraId,
      detalhes: { corretoraNome, seatsBefore, seatsAfter, reason },
      request,
    });
  }

  static async logSubscriptionPaused(
    adminId: string,
    corretoraId: string,
    corretoraNome: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'subscription_paused',
      entidadeTipo: 'subscription',
      entidadeId: corretoraId,
      detalhes: { corretoraNome },
      request,
    });
  }

  static async logSubscriptionResumed(
    adminId: string,
    corretoraId: string,
    corretoraNome: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'subscription_resumed',
      entidadeTipo: 'subscription',
      entidadeId: corretoraId,
      detalhes: { corretoraNome },
      request,
    });
  }

  static async logSubscriptionCancelled(
    adminId: string,
    corretoraId: string,
    corretoraNome: string,
    immediately: boolean,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'subscription_cancelled',
      entidadeTipo: 'subscription',
      entidadeId: corretoraId,
      detalhes: { corretoraNome, immediately },
      request,
    });
  }

  static async logSubscriptionPlanOverridden(
    adminId: string,
    corretoraId: string,
    corretoraNome: string,
    changes: { planCycle?: string; newValue?: number; reason?: string },
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'subscription_plan_overridden',
      entidadeTipo: 'subscription',
      entidadeId: corretoraId,
      detalhes: { corretoraNome, ...changes },
      request,
    });
  }

  static async logSubscriptionTrialExtended(
    adminId: string,
    corretoraId: string,
    corretoraNome: string,
    newTrialEnd: string,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'subscription_trial_extended',
      entidadeTipo: 'subscription',
      entidadeId: corretoraId,
      detalhes: { corretoraNome, newTrialEnd },
      request,
    });
  }

  /**
   * Registrar limpeza de arquivos órfãos
   */
  static async logCleanup(
    adminId: string,
    deletedCount: number,
    deletedBytes: number,
    request?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      acao: 'files_cleanup',
      detalhes: {
        deletedCount,
        deletedBytes,
        deletedMB: (deletedBytes / (1024 * 1024)).toFixed(2),
      },
      request,
    });
  }
}
