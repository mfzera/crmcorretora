/**
 * Mock do módulo @ecotech/shared/storage.
 * Usar como: vi.mock('@ecotech/shared/storage', () => storageMock)
 *
 * Vitest hoista vi.mock(), interceptando tanto imports estáticos quanto
 * dinâmicos (await import(...)) do mesmo módulo.
 */
export const storageMock = {
  storageClient: {
    upload: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getSignedDownloadUrl: vi.fn().mockResolvedValue(null),
  },
  StorageService: vi.fn().mockImplementation(() => ({
    uploadFile: vi.fn().mockResolvedValue({
      anexo: { id: '00000000-0000-0000-0000-000000000099', nomeOriginal: 'test.pdf' },
      urlAssinada: 'https://mock-r2.com/signed',
    }),
    getSignedUrl: vi.fn().mockResolvedValue('https://mock-r2.com/signed'),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  })),
  MetricsService: {
    checkLimits: vi.fn().mockResolvedValue({
      shouldBlock: false,
      percentUsed: 0,
      bytesUsed: 0,
      bytesLimit: 1_000_000_000,
    }),
  },
  R2Client: vi.fn().mockImplementation(() => ({
    upload: vi.fn().mockResolvedValue(undefined),
    download: vi.fn().mockResolvedValue(Buffer.from('')),
    delete: vi.fn().mockResolvedValue(undefined),
    getSignedDownloadUrl: vi.fn().mockResolvedValue(null),
  })),
  PdfExtractor: vi.fn(),
  BackupService: vi.fn(),
};
