import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticateAdmin: (request: FastifyRequest, reply: any) => Promise<void>;
    authorizeAdmin: (permissions: string[]) => (request: FastifyRequest, reply: any) => Promise<void>;
    adminJwtSign: (payload: any) => string;
    adminJwtVerify: (token: string) => any;
    createAdminTempToken: (adminId: string) => string;
    verifyAdminTempToken: (token: string) => string;
    verifyAdminPassword: (email: string, senha: string) => Promise<any>;
    createAdminToken: (admin: { id: string; email: string; nome: string; permissoes: string[] }) => string;
    hashAdminPassword: (senha: string) => Promise<string>;

    auditService: {
      log: (params: {
        adminId: string;
        acao: string;
        entidadeTipo?: string;
        entidadeId?: string;
        detalhes?: Record<string, any>;
        request?: any;
      }) => Promise<void>;
      logUpdateStorageLimit: (
        adminId: string,
        adminEmail: string,
        tenantId: string,
        tenantName: string,
        payload: {
          limiteArquivos: number | null;
          limiteBytes: number | null;
          limiteBytesCotacoes: number | null;
          limiteBytesDocumentos: number | null;
          limiteBytesChat: number | null;
          alertasAtivos: boolean;
        },
        request?: any,
      ) => Promise<void>;
      logViewTenant: (
        adminId: string,
        adminEmail: string,
        tenantId: string,
        tenantName: string,
        request?: any,
      ) => Promise<void>;
      logViewTenantMetrics: (
        adminId: string,
        adminEmail: string,
        tenantId: string,
        tenantName: string,
        request?: any,
      ) => Promise<void>;
      logViewGlobalMetrics: (
        adminId: string,
        adminEmail: string,
        request?: any,
      ) => Promise<void>;
      logViewTenantList: (
        adminId: string,
        adminEmail: string,
        request?: any,
      ) => Promise<void>;
      logViewBackupList: (
        adminId: string,
        adminEmail: string,
        request?: any,
      ) => Promise<void>;
      logBackupCreated: (
        adminId: string,
        adminEmail: string,
        backupId: string,
        tipo: 'incremental' | 'completo',
        corretoraId: string | null,
        request?: any,
      ) => Promise<void>;
      logBackupVerified: (
        adminId: string,
        adminEmail: string,
        backupId: string,
        success: boolean,
        request?: any,
      ) => Promise<void>;
      logBackupRestored: (
        adminId: string,
        backupId: string,
        corretoraId: string | undefined,
        request?: any,
      ) => Promise<void>;
      logBackupDeleted: (
        adminId: string,
        adminEmail: string,
        backupId: string,
        request?: any,
      ) => Promise<void>;
      logLogin: (adminId: string, adminEmail: string, request?: any) => Promise<void>;
      logLogout: (adminId: string, request?: any) => Promise<void>;
      logAdminManagement: (
        adminId: string,
        targetAdminId: string,
        action: 'created' | 'updated' | 'deleted',
        changes?: Record<string, any>,
        request?: any,
      ) => Promise<void>;
      logSubscriptionCourtesySeats: (
        adminId: string,
        corretoraId: string,
        corretoraNome: string,
        seatsBefore: number,
        seatsAfter: number,
        reason?: string,
        request?: any,
      ) => Promise<void>;
      logSubscriptionPaused: (
        adminId: string,
        corretoraId: string,
        corretoraNome: string,
        request?: any,
      ) => Promise<void>;
      logSubscriptionResumed: (
        adminId: string,
        corretoraId: string,
        corretoraNome: string,
        request?: any,
      ) => Promise<void>;
      logSubscriptionCancelled: (
        adminId: string,
        corretoraId: string,
        corretoraNome: string,
        immediately: boolean,
        request?: any,
      ) => Promise<void>;
      logSubscriptionPlanOverridden: (
        adminId: string,
        corretoraId: string,
        corretoraNome: string,
        changes: { planCycle?: string; newValue?: number; reason?: string },
        request?: any,
      ) => Promise<void>;
      logSubscriptionTrialExtended: (
        adminId: string,
        corretoraId: string,
        corretoraNome: string,
        newTrialEnd: string,
        request?: any,
      ) => Promise<void>;
      logCleanup: (
        adminId: string,
        deletedCount: number,
        deletedBytes: number,
        request?: any,
      ) => Promise<void>;
    };
  }

  interface FastifyRequest {
    adminId?: string;
    admin?: {
      id: string;
      email: string;
      nome?: string;
      permissoes?: string[];
    };
    requestId: string;
  }
}
