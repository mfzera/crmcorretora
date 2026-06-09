# 16 - Guia de Testes

**Navegação**: [← 13. Alertas](./13-ALERTAS.md) | [Índice](./00-INDICE.md) | [17. Custos →](./17-CUSTOS.md)

---

## 🎯 Visão Geral

Estratégia completa de testes para garantir qualidade e confiabilidade do sistema:

1. **Testes Unitários**: Services, utils, componentes isolados
2. **Testes de Integração**: API routes, database, R2
3. **Testes E2E**: Fluxos completos no frontend
4. **Testes de Performance**: Load testing, stress testing
5. **Testes de Segurança**: Validações, autenticação, autorização

## 📁 Estrutura de Testes

```
apps/api/
├── src/
│   └── tests/
│       ├── unit/
│       │   ├── storage-service.test.ts
│       │   ├── metrics-service.test.ts
│       │   ├── backup-service.test.ts
│       │   └── alert-service.test.ts
│       ├── integration/
│       │   ├── anexos.test.ts
│       │   ├── backups.test.ts
│       │   ├── admin.test.ts
│       │   └── metrics.test.ts
│       └── e2e/
│           ├── upload-flow.test.ts
│           └── backup-restore.test.ts
└── vitest.config.ts

apps/web/
├── src/
│   └── tests/
│       ├── unit/
│       │   └── components/
│       │       ├── file-upload.test.tsx
│       │       └── file-list.test.tsx
│       └── e2e/
│           ├── upload.spec.ts
│           ├── download.spec.ts
│           └── version-history.spec.ts
└── playwright.config.ts

apps/admin/
├── src/
│   └── tests/
│       └── e2e/
│           ├── dashboard.spec.ts
│           ├── tenants.spec.ts
│           └── backups.spec.ts
└── playwright.config.ts
```

## 🔧 Configuração de Testes

### Vitest (Backend)

```typescript
// apps/api/vitest.config.ts

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// apps/api/src/tests/setup.ts

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { db } from '@ecotech/database';
import { S3Client } from '@aws-sdk/client-s3';

// Variáveis globais para testes
export const testCorretoraId = 'test-corretora-id';
export const testUserId = 'test-user-id';
export const testAdminId = 'test-admin-id';

beforeAll(async () => {
  // Setup inicial: criar dados de teste no banco
  console.log('Setting up test environment...');
  
  // Criar corretora de teste
  await db.insert(corretoras).values({
    id: testCorretoraId,
    nomeFantasia: 'Corretora Teste',
    cnpj: '00000000000000',
    email: 'teste@teste.com',
  });

  // Criar usuário de teste
  await db.insert(usuarios).values({
    id: testUserId,
    corretoraId: testCorretoraId,
    nome: 'Usuário Teste',
    email: 'usuario@teste.com',
    senha: 'hash',
  });
});

afterAll(async () => {
  // Cleanup: remover dados de teste
  console.log('Cleaning up test environment...');
  
  await db.delete(anexos).where(eq(anexos.corretoraId, testCorretoraId));
  await db.delete(usuarios).where(eq(usuarios.id, testUserId));
  await db.delete(corretoras).where(eq(corretoras.id, testCorretoraId));
});

beforeEach(() => {
  // Reset antes de cada teste
});

afterEach(() => {
  // Cleanup após cada teste
});
```

### Playwright (Frontend E2E)

```typescript
// apps/web/playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 🧪 Testes Unitários

### Storage Service

```typescript
// apps/api/src/tests/unit/storage-service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from '@ecotech/storage';
import { S3Client } from '@aws-sdk/client-s3';

// Mock do S3Client
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

describe('StorageService', () => {
  let storageService: StorageService;

  beforeEach(() => {
    storageService = new StorageService();
  });

  describe('upload', () => {
    it('deve fazer upload de arquivo com sucesso', async () => {
      const file = {
        filename: 'test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test content'),
      };

      const result = await storageService.upload(
        file,
        'test-corretora-id',
        'cotacao',
        'cotacao-123',
        'test-user-id'
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('r2Key');
      expect(result.nomeOriginal).toBe('test.pdf');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('deve rejeitar MIME type não permitido', async () => {
      const file = {
        filename: 'test.exe',
        mimetype: 'application/x-msdownload',
        buffer: Buffer.from('test'),
      };

      await expect(
        storageService.upload(file, 'test-corretora-id', 'cotacao', 'cotacao-123', 'test-user-id')
      ).rejects.toThrow('MIME type não permitido');
    });

    it('deve rejeitar arquivo muito grande', async () => {
      const file = {
        filename: 'large.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.alloc(15 * 1024 * 1024), // 15MB
      };

      await expect(
        storageService.upload(file, 'test-corretora-id', 'cotacao', 'cotacao-123', 'test-user-id')
      ).rejects.toThrow('Arquivo muito grande');
    });
  });

  describe('download', () => {
    it('deve gerar URL assinada válida', async () => {
      const url = await storageService.getSignedUrl('test-key.pdf');
      
      expect(url).toContain('https://');
      expect(url).toContain('X-Amz-Signature');
    });

    it('deve gerar URL com expiração customizada', async () => {
      const url = await storageService.getSignedUrl('test-key.pdf', 3600);
      
      expect(url).toContain('X-Amz-Expires=3600');
    });
  });

  describe('delete', () => {
    it('deve fazer soft delete de arquivo', async () => {
      const anexoId = 'test-anexo-id';
      
      await storageService.softDelete(anexoId, 'test-user-id');
      
      const anexo = await db.query.anexos.findFirst({
        where: eq(anexos.id, anexoId),
      });

      expect(anexo?.deletedAt).not.toBeNull();
      expect(anexo?.deletedBy).toBe('test-user-id');
    });
  });
});
```

### Metrics Service

```typescript
// apps/api/src/tests/unit/metrics-service.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { StorageMetricsService } from '@ecotech/storage';
import { testCorretoraId } from '../setup';

describe('StorageMetricsService', () => {
  let metricsService: StorageMetricsService;

  beforeEach(() => {
    metricsService = new StorageMetricsService();
  });

  describe('calculateUsage', () => {
    it('deve calcular uso total de storage', async () => {
      const usage = await metricsService.calculateUsage(testCorretoraId);

      expect(usage).toHaveProperty('totalArquivos');
      expect(usage).toHaveProperty('totalBytes');
      expect(usage).toHaveProperty('byType');
      expect(usage.byType).toHaveProperty('cotacoes');
      expect(usage.byType).toHaveProperty('documentos');
      expect(usage.byType).toHaveProperty('chat');
    });

    it('deve agrupar corretamente por MIME type', async () => {
      const usage = await metricsService.calculateUsage(testCorretoraId);

      expect(usage.byMimeType).toHaveProperty('application/pdf');
      expect(usage.byMimeType['application/pdf']).toHaveProperty('count');
      expect(usage.byMimeType['application/pdf']).toHaveProperty('bytes');
    });
  });

  describe('checkLimits', () => {
    it('deve detectar quando próximo do limite', async () => {
      const limitStatus = await metricsService.checkLimits(testCorretoraId);

      expect(limitStatus).toHaveProperty('ok');
      expect(limitStatus).toHaveProperty('shouldAlert');
      expect(limitStatus).toHaveProperty('percentUsed');
    });

    it('deve retornar OK quando sem limites configurados', async () => {
      const limitStatus = await metricsService.checkLimits('corretora-sem-limites');

      expect(limitStatus.ok).toBe(true);
      expect(limitStatus.shouldAlert).toBe(false);
    });
  });

  describe('createDailySnapshot', () => {
    it('deve criar snapshot de métricas', async () => {
      await metricsService.createDailySnapshot();

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const snapshot = await db.query.storageMetrics.findFirst({
        where: and(
          eq(storageMetrics.corretoraId, testCorretoraId),
          eq(storageMetrics.data, hoje)
        ),
      });

      expect(snapshot).not.toBeNull();
      expect(snapshot?.totalArquivos).toBeGreaterThanOrEqual(0);
    });
  });
});
```

### Backup Service

```typescript
// apps/api/src/tests/unit/backup-service.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { BackupService } from '@ecotech/storage';
import { testCorretoraId } from '../setup';

describe('BackupService', () => {
  let backupService: BackupService;

  beforeEach(() => {
    backupService = new BackupService();
  });

  describe('createIncrementalBackup', () => {
    it('deve criar backup incremental', async () => {
      const result = await backupService.createIncrementalBackup(testCorretoraId);

      expect(result.status).toBe('concluido');
      expect(result.tipo).toBe('incremental');
      expect(result).toHaveProperty('backupId');
      expect(result).toHaveProperty('totalArquivos');
      expect(result).toHaveProperty('totalBytes');
    });
  });

  describe('createFullBackup', () => {
    it('deve criar backup completo', async () => {
      const result = await backupService.createFullBackup(testCorretoraId);

      expect(result.status).toBe('concluido');
      expect(result.tipo).toBe('completo');
      expect(result.totalArquivos).toBeGreaterThanOrEqual(0);
    });
  });

  describe('verifyBackup', () => {
    it('deve verificar integridade de backup', async () => {
      // Primeiro criar um backup
      const backup = await backupService.createIncrementalBackup(testCorretoraId);

      // Depois verificar
      const verification = await backupService.verifyBackup(backup.backupId);

      expect(verification).toHaveProperty('valid');
      expect(verification).toHaveProperty('totalArquivos');
      expect(verification).toHaveProperty('arquivosVerificados');
    });
  });

  describe('restoreBackup', () => {
    it('deve restaurar backup (dry run)', async () => {
      const backup = await backupService.createIncrementalBackup(testCorretoraId);

      const result = await backupService.restoreBackup(backup.backupId, {
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('arquivosRestaurados');
    });
  });
});
```

## 🔗 Testes de Integração

### API Anexos

```typescript
// apps/api/src/tests/integration/anexos.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import { build } from '../../app';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

describe('POST /api/anexos/upload', () => {
  let app: any;
  let token: string;

  beforeAll(async () => {
    app = await build();
    
    // Fazer login para obter token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'usuario@teste.com',
        senha: 'senha123',
      },
    });

    token = loginResponse.json().data.token;
  });

  it('deve fazer upload de PDF', async () => {
    const form = new FormData();
    form.append('file', fs.createReadStream(path.join(__dirname, 'fixtures', 'test.pdf')));
    form.append('entidadeTipo', 'cotacao');
    form.append('entidadeId', 'cotacao-123');

    const response = await app.inject({
      method: 'POST',
      url: '/api/anexos/upload',
      headers: {
        ...form.getHeaders(),
        authorization: `Bearer ${token}`,
      },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('data.anexo');
    expect(response.json()).toHaveProperty('data.urlAssinada');
  });

  it('deve rejeitar upload sem autenticação', async () => {
    const form = new FormData();
    form.append('file', fs.createReadStream(path.join(__dirname, 'fixtures', 'test.pdf')));

    const response = await app.inject({
      method: 'POST',
      url: '/api/anexos/upload',
      headers: form.getHeaders(),
      payload: form,
    });

    expect(response.statusCode).toBe(401);
  });

  it('deve rejeitar MIME type inválido', async () => {
    const form = new FormData();
    form.append('file', Buffer.from('test'), {
      filename: 'test.exe',
      contentType: 'application/x-msdownload',
    });
    form.append('entidadeTipo', 'cotacao');
    form.append('entidadeId', 'cotacao-123');

    const response = await app.inject({
      method: 'POST',
      url: '/api/anexos/upload',
      headers: {
        ...form.getHeaders(),
        authorization: `Bearer ${token}`,
      },
      payload: form,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain('MIME type');
  });
});

describe('GET /api/anexos/:id', () => {
  let app: any;
  let token: string;
  let anexoId: string;

  beforeAll(async () => {
    app = await build();
    
    // Login e criar anexo de teste
    // ...
  });

  it('deve retornar URL assinada para download', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/anexos/${anexoId}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('data.urlAssinada');
    expect(response.json().data.urlAssinada).toContain('X-Amz-Signature');
  });

  it('deve retornar 404 para anexo inexistente', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/anexos/inexistente-id',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('DELETE /api/anexos/:id', () => {
  let app: any;
  let token: string;
  let anexoId: string;

  beforeAll(async () => {
    app = await build();
    // Setup...
  });

  it('deve fazer soft delete de anexo', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/anexos/${anexoId}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);

    // Verificar que foi soft delete
    const anexo = await db.query.anexos.findFirst({
      where: eq(anexos.id, anexoId),
    });

    expect(anexo?.deletedAt).not.toBeNull();
  });
});
```

### API Admin

```typescript
// apps/api/src/tests/integration/admin.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import { build } from '../../app';

describe('Admin API', () => {
  let app: any;
  let adminToken: string;

  beforeAll(async () => {
    app = await build();

    // Login admin
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {
        email: 'admin@ecotech.com',
        senha: 'senha-admin',
      },
    });

    adminToken = response.json().data.token;
  });

  describe('GET /api/admin/dashboard/stats', () => {
    it('deve retornar estatísticas globais', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/dashboard/stats',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data).toHaveProperty('totalCorretoras');
      expect(response.json().data).toHaveProperty('totalArquivos');
      expect(response.json().data).toHaveProperty('totalBytes');
      expect(response.json().data).toHaveProperty('custoEstimadoMensal');
    });
  });

  describe('GET /api/admin/tenants', () => {
    it('deve listar todos os tenants', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/tenants',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.json().data)).toBe(true);
    });
  });

  describe('POST /api/admin/backups', () => {
    it('deve criar backup manual', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/backups',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          corretoraId: 'test-corretora-id',
          tipo: 'completo',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data).toHaveProperty('backupId');
    });
  });
});
```

## 🎭 Testes E2E (Frontend)

### Upload Flow

```typescript
// apps/web/src/tests/e2e/upload.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Upload de Arquivos', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'usuario@teste.com');
    await page.fill('input[name="senha"]', 'senha123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('deve fazer upload de PDF', async ({ page }) => {
    // Ir para cotações
    await page.goto('/cotacoes/123');

    // Clicar em upload
    await page.click('button:has-text("Adicionar Anexo")');

    // Selecionar arquivo
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/test.pdf');

    // Aguardar upload
    await expect(page.locator('text=Upload concluído')).toBeVisible();

    // Verificar arquivo na lista
    await expect(page.locator('text=test.pdf')).toBeVisible();
  });

  test('deve mostrar progresso de upload', async ({ page }) => {
    await page.goto('/cotacoes/123');
    
    await page.click('button:has-text("Adicionar Anexo")');
    
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/large-file.pdf');

    // Verificar barra de progresso
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
  });

  test('deve mostrar erro para arquivo muito grande', async ({ page }) => {
    await page.goto('/cotacoes/123');
    
    await page.click('button:has-text("Adicionar Anexo")');
    
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/huge-file.pdf');

    await expect(page.locator('text=Arquivo muito grande')).toBeVisible();
  });
});
```

### Download Flow

```typescript
// apps/web/src/tests/e2e/download.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Download de Arquivos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'usuario@teste.com');
    await page.fill('input[name="senha"]', 'senha123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('deve fazer download de arquivo', async ({ page }) => {
    await page.goto('/cotacoes/123');

    // Clicar no botão de download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download")');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('deve visualizar PDF no navegador', async ({ page, context }) => {
    await page.goto('/cotacoes/123');

    // Clicar em visualizar
    const newPagePromise = context.waitForEvent('page');
    await page.click('button:has-text("Visualizar")');
    const newPage = await newPagePromise;

    // Verificar que abriu URL do R2
    expect(newPage.url()).toContain('r2.cloudflarestorage.com');
  });
});
```

## ⚡ Testes de Performance

### Load Testing com k6

```javascript
// tests/performance/upload-load.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp-up
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% das requests < 2s
    http_req_failed: ['rate<0.1'],     // Menos de 10% de falhas
  },
};

export default function () {
  const url = 'http://localhost:3000/api/anexos/upload';
  
  const payload = {
    file: http.file(open('../fixtures/test.pdf', 'b'), 'test.pdf'),
    entidadeTipo: 'cotacao',
    entidadeId: 'cotacao-123',
  };

  const params = {
    headers: {
      'Authorization': 'Bearer YOUR_TEST_TOKEN',
    },
  };

  const response = http.post(url, payload, params);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'upload successful': (r) => r.json('success') === true,
  });

  sleep(1);
}
```

## 🔒 Testes de Segurança

### Autenticação e Autorização

```typescript
// apps/api/src/tests/security/auth.test.ts

import { describe, it, expect } from 'vitest';
import { build } from '../../app';

describe('Segurança - Autenticação', () => {
  let app: any;

  beforeAll(async () => {
    app = await build();
  });

  it('deve rejeitar request sem token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/anexos/123',
    });

    expect(response.statusCode).toBe(401);
  });

  it('deve rejeitar token inválido', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/anexos/123',
      headers: {
        authorization: 'Bearer token-invalido',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('deve rejeitar token expirado', async () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Token expirado

    const response = await app.inject({
      method: 'GET',
      url: '/api/anexos/123',
      headers: {
        authorization: `Bearer ${expiredToken}`,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('Segurança - Tenant Isolation', () => {
  let app: any;
  let corretoraAToken: string;
  let corretoraBToken: string;

  beforeAll(async () => {
    app = await build();
    // Setup: criar tokens para 2 corretoras diferentes
  });

  it('não deve acessar anexo de outra corretora', async () => {
    // Criar anexo com corretora A
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/anexos/upload',
      headers: { authorization: `Bearer ${corretoraAToken}` },
      // ... payload
    });

    const anexoId = createResponse.json().data.anexo.id;

    // Tentar acessar com corretora B
    const response = await app.inject({
      method: 'GET',
      url: `/api/anexos/${anexoId}`,
      headers: { authorization: `Bearer ${corretoraBToken}` },
    });

    expect(response.statusCode).toBe(404); // Ou 403
  });
});
```

## 📋 Checklist de Testes

### Testes Unitários
- [ ] StorageService (upload, download, delete)
- [ ] MetricsService (calculateUsage, checkLimits)
- [ ] BackupService (create, verify, restore)
- [ ] AlertService (todos os tipos de alertas)
- [ ] Utilitários (formatBytes, validations, etc.)

### Testes de Integração
- [ ] API Anexos (upload, download, list, delete)
- [ ] API Admin (dashboard, tenants, backups)
- [ ] API Metrics (usage, history, limits)
- [ ] API Backups (create, verify, restore)
- [ ] Jobs (metrics, backups, cleanup)

### Testes E2E
- [ ] Fluxo de upload completo
- [ ] Fluxo de download completo
- [ ] Histórico de versões
- [ ] Dashboard admin
- [ ] Gestão de backups

### Testes de Performance
- [ ] Load test de uploads
- [ ] Load test de downloads
- [ ] Stress test de API
- [ ] Performance de queries do DB

### Testes de Segurança
- [ ] Autenticação (token válido/inválido)
- [ ] Autorização (permissões)
- [ ] Tenant isolation
- [ ] Validações de input
- [ ] SQL injection (parametrized queries)
- [ ] XSS (sanitização de inputs)

## 📊 Coverage

### Executar Testes com Coverage

```bash
# Backend
cd apps/api
pnpm test --coverage

# Frontend
cd apps/web
pnpm test --coverage
```

### Metas de Coverage

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## 🚀 CI/CD Integration

```yaml
# .github/workflows/test.yml

name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run migrations
        run: pnpm db:migrate
      
      - name: Run unit tests
        run: pnpm test:unit
      
      - name: Run integration tests
        run: pnpm test:integration
      
      - name: Run E2E tests
        run: pnpm test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 📝 Próximo Documento

Continue com **[17-CUSTOS.md](./17-CUSTOS.md)** para análise de custos e otimizações.

---

**Navegação**: [← 13. Alertas](./13-ALERTAS.md) | [Índice](./00-INDICE.md) | [17. Custos →](./17-CUSTOS.md)
