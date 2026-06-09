import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { admins, storageMetrics } from '@ecotech/shared/database';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import {
  createTestPlano,
  createTestCorretora,
} from '../../helpers/factories/corretora.factory';

describe('/api/admin metrics routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminToken: string;
  let corretoraId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();

    await request(app.server)
      .post('/api/admin/auth/create-first-admin')
      .send({
        email: 'admin@ecotech.com',
        nome: 'Admin Metrics',
        senha: 'senha12345',
        permissoes: [
          'view_usage',
          'manage_limits',
          'view_all_tenants',
          'manage_backups',
          'view_backups',
          'manage_admins',
          'view_audit_logs',
          'cleanup_files',
          'view_changelogs',
          'manage_changelogs',
          'manage_tenants',
        ],
      });

    const loginRes = await request(app.server)
      .post('/api/admin/auth/login')
      .send({ email: 'admin@ecotech.com', senha: 'senha12345' });

    adminToken = loginRes.body.token;

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
  });

  // ── GET /api/admin/storage/overview ────────────────────────────────────────

  describe('GET /api/admin/storage/overview', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/admin/storage/overview')
        .expect(401);
    });

    it('retorna visão geral global de armazenamento', async () => {
      const res = await request(app.server)
        .get('/api/admin/storage/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  // ── GET /api/admin/tenants ──────────────────────────────────────────────────

  describe('GET /api/admin/tenants', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/admin/tenants').expect(401);
    });

    it('retorna lista de tenants com uso', async () => {
      const res = await request(app.server)
        .get('/api/admin/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.tenants).toBeDefined();
      expect(Array.isArray(res.body.tenants)).toBe(true);
      expect(res.body.totalTenants).toBeDefined();
      expect(typeof res.body.totalTenants).toBe('number');
    });

    it('retorna tenants com campos de uso e limites', async () => {
      const res = await request(app.server)
        .get('/api/admin/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totalTenants).toBeGreaterThanOrEqual(1);
      expect(res.body.tenants.length).toBeGreaterThanOrEqual(1);
      const tenant = res.body.tenants[0];
      expect(tenant).toBeDefined();
    });
  });

  // ── GET /api/admin/tenants/:id/usage ───────────────────────────────────────

  describe('GET /api/admin/tenants/:id/usage', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/usage`)
        .expect(401);
    });

    it('retorna 404 para tenant inexistente', async () => {
      const res = await request(app.server)
        .get('/api/admin/tenants/00000000-0000-0000-0000-000000000099/usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Tenant não encontrado');
    });

    it('retorna uso detalhado de um tenant existente', async () => {
      const res = await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/usage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(res.body.currentUsage).toBeDefined();
      expect(res.body.limits).toBeDefined();
    });
  });

  // ── GET /api/admin/tenants/:id/usage/history ───────────────────────────────

  describe('GET /api/admin/tenants/:id/usage/history', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/usage/history`)
        .expect(401);
    });

    it('retorna 404 para tenant inexistente', async () => {
      const res = await request(app.server)
        .get(
          '/api/admin/tenants/00000000-0000-0000-0000-000000000099/usage/history',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Tenant não encontrado');
    });

    it('retorna histórico de métricas de um tenant', async () => {
      const res = await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/usage/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(Array.isArray(res.body.history)).toBe(true);
    });

    it('aceita parâmetro days', async () => {
      const res = await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/usage/history?days=7`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.history)).toBe(true);
    });


    it('retorna histórico com dados quando há registros de métricas', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await db.insert(storageMetrics).values({
        corretoraId,
        data: yesterday.toISOString().split('T')[0],
        totalArquivos: 5,
        totalBytes: 10240,
        totalBytesCotacoes: 5120,
        totalBytesDocumentos: 3072,
        totalBytesChat: 2048,
      });

      const res = await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/usage/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.history)).toBe(true);
      expect(res.body.history.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── GET /api/admin/tenants/:id/largest-files ───────────────────────────────

  describe('GET /api/admin/tenants/:id/largest-files', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/largest-files`)
        .expect(401);
    });

    it('retorna 404 para tenant inexistente', async () => {
      const res = await request(app.server)
        .get(
          '/api/admin/tenants/00000000-0000-0000-0000-000000000099/largest-files',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Tenant não encontrado');
    });

    it('retorna lista dos maiores arquivos de um tenant', async () => {
      const res = await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/largest-files`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(Array.isArray(res.body.largestFiles)).toBe(true);
    });

    it('aceita parâmetro limit', async () => {
      const res = await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/largest-files?limit=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.largestFiles)).toBe(true);
    });

  });

  // ── GET /api/admin/tenants/:id/costs ───────────────────────────────────────

  describe('GET /api/admin/tenants/:id/costs', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/costs`)
        .expect(401);
    });

    it('retorna 404 para tenant inexistente', async () => {
      const res = await request(app.server)
        .get('/api/admin/tenants/00000000-0000-0000-0000-000000000099/costs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Tenant não encontrado');
    });

    it('retorna custos estimados de um tenant', async () => {
      const res = await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/costs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(res.body.costs).toBeDefined();
    });
  });

  // ── POST /api/admin/tenants/:id/snapshot ───────────────────────────────────

  describe('POST /api/admin/tenants/:id/snapshot', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post(`/api/admin/tenants/${corretoraId}/snapshot`)
        .expect(401);
    });

    it('retorna 404 para tenant inexistente', async () => {
      const res = await request(app.server)
        .post('/api/admin/tenants/00000000-0000-0000-0000-000000000099/snapshot')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Tenant não encontrado');
    });

    it('cria snapshot manual de um tenant existente', async () => {
      const res = await request(app.server)
        .post(`/api/admin/tenants/${corretoraId}/snapshot`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.snapshot).toBeDefined();
    });
  });

  // ── POST /api/admin/snapshot-all ───────────────────────────────────────────

  describe('POST /api/admin/snapshot-all', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).post('/api/admin/snapshot-all').expect(401);
    });

    it('cria snapshots para todos os tenants', async () => {
      const res = await request(app.server)
        .post('/api/admin/snapshot-all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.totalSnapshots).toBe('number');
      expect(Array.isArray(res.body.snapshots)).toBe(true);
    });
  });
});
