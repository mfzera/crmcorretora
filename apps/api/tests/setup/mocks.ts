/**
 * Mocks globais aplicados automaticamente em todos os testes via setupFiles.
 * Ao contrário de vi.mock() dentro dos arquivos de teste, aqui os mocks são
 * registrados como side effects do setupFile, que roda antes de cada suite.
 *
 * Usando vi.mock() aqui, o Vitest os trata como mocks persistentes para
 * todos os módulos importados a seguir dentro de cada test file.
 */

vi.mock('@ecotech/shared/storage', () => ({
  storageClient: {
    upload: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getSignedDownloadUrl: vi.fn().mockResolvedValue(null),
    exists: vi.fn().mockResolvedValue(false),
    move: vi.fn().mockResolvedValue(undefined),
  },
  resolveStoredFileUrl: vi.fn().mockResolvedValue(null),
  StorageService: class MockStorageService {
    uploadFile = vi.fn().mockResolvedValue({
      anexo: { id: '00000000-0000-0000-0000-000000000099', nomeOriginal: 'test.pdf' },
      urlAssinada: 'https://mock-r2.com/signed',
    });
    getSignedUrl = vi.fn().mockResolvedValue('https://mock-r2.com/signed');
    deleteFile = vi.fn().mockResolvedValue(undefined);
    downloadFile = vi.fn().mockResolvedValue(Buffer.from(''));
    uploadNewVersion = vi.fn().mockResolvedValue({});
  },
  MetricsService: {
    checkLimits: vi.fn().mockResolvedValue({
      shouldBlock: false,
      percentUsed: 0,
      bytesUsed: 0,
      bytesLimit: 1_000_000_000,
    }),
    getGlobalOverview: vi.fn().mockResolvedValue({
      totalBytes: 0,
      totalFiles: 0,
      tenants: [],
    }),
    calculateCurrentUsage: vi.fn().mockResolvedValue({
      totalArquivos: 0,
      totalBytes: 0,
      byType: {
        cotacoes: 0,
        documentos: 0,
        chat: 0,
      },
    }),
    getLargestFiles: vi.fn().mockResolvedValue([]),
    calculateCosts: vi.fn().mockResolvedValue({ total: 0 }),
    createDailySnapshot: vi.fn().mockResolvedValue({}),
    createDailySnapshotsForAll: vi.fn().mockResolvedValue([]),
  },
  R2Client: vi.fn().mockImplementation(() => ({
    upload: vi.fn().mockResolvedValue(undefined),
    download: vi.fn().mockResolvedValue(Buffer.from('')),
    delete: vi.fn().mockResolvedValue(undefined),
    getSignedDownloadUrl: vi.fn().mockResolvedValue(null),
  })),
  PdfExtractor: vi.fn(),
  BackupService: {
    createBackup: async () => ({
      backupId: '00000000-0000-0000-0000-000000000099',
      tipo: 'completo',
      totalArquivos: 0,
      totalBytes: 0,
      duracaoSegundos: 1,
      backupPrefix: 'backup/mock',
    }),
    verifyBackup: async () => true,
    restoreBackup: async () => undefined,
    deleteBackup: async () => undefined,
  },
}));

vi.mock('@ecotech/plugins/quota-validator', async () => {
  const { default: fp } = await import('fastify-plugin');
  const plugin = fp(async (fastify: any) => {
    if (!fastify.hasDecorator('validateQuota')) {
      fastify.decorate('validateQuota', async () => {});
    }
    if (!fastify.hasDecorator('incrementQuota')) {
      fastify.decorate('incrementQuota', async () => {});
    }
    if (!fastify.hasDecorator('decrementQuota')) {
      fastify.decorate('decrementQuota', async () => {});
    }
  });
  return {
    default: plugin,
    quotaValidator: plugin,
  };
});

vi.mock('@ecotech/shared/utils/email.service', () => ({
  emailService: {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
    sendEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@ecotech/shared/domain/services/asaas.service.js', () => ({
  createAsaasCustomer: vi.fn().mockResolvedValue({ id: 'cus_asaas_mock_123' }),
  createAsaasSubscription: vi.fn().mockResolvedValue({
    id: 'sub_asaas_mock_123',
    status: 'ACTIVE',
  }),
  updateAsaasSubscription: vi.fn().mockResolvedValue({}),
  cancelAsaasSubscription: vi.fn().mockResolvedValue(undefined),
  listAsaasPayments: vi.fn().mockResolvedValue({ data: [], totalCount: 0 }),
  getAsaasPayment: vi.fn().mockResolvedValue(null),
  validateAsaasWebhook: vi.fn().mockReturnValue(true),
}));
