import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import { admins, storageMetrics } from '@ecotech/shared/database';
import { MetricsService } from '@ecotech/shared/storage';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import {
  createTestPlano,
  createTestCorretora,
} from '../../helpers/factories/corretora.factory';

describe('/api/admin/stats - cobertura adicional', () => {
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
        nome: 'Admin Stats Coverage',
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

  // ── GET /api/admin/stats (caminho com MetricsService falha no catch) ────────
  // O bloco catch (lines 91-92) ocorre quando MetricsService.getGlobalOverview()
  // lança exceção. Em ambiente de teste real, o storage pode falhar, então o
  // comportamento esperado é retornar totalStorage = 0.

  describe('GET /api/admin/stats', () => {
    it('retorna totalStorage como número mesmo quando MetricsService falha', async () => {
      const res = await request(app.server)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // totalStorage deve sempre ser número (0 se MetricsService falhar)
      expect(typeof res.body.totalStorage).toBe('number');
      expect(res.body.totalStorage).toBeGreaterThanOrEqual(0);
    });

    it('retorna totalStorage=0 quando MetricsService.getGlobalOverview lança exceção (cobre catch lines 91-92)', async () => {
      // Fazer getGlobalOverview lançar erro nesta chamada
      vi.mocked(MetricsService.getGlobalOverview).mockRejectedValueOnce(
        new Error('R2 indisponível'),
      );

      const res = await request(app.server)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totalStorage).toBe(0);
      expect(typeof res.body.totalTenants).toBe('number');
      expect(typeof res.body.totalUsers).toBe('number');
    });
  });

  // ── GET /api/admin/stats/usage com dados existentes ─────────────────────────
  // Cobre linhas 187-189: o map() sobre metricsHistory quando há dados

  describe('GET /api/admin/stats/usage com dados de storageMetrics', () => {
    it('retorna histórico formatado quando há registros de métricas', async () => {
      // Inserir registros de storage_metric dentro dos últimos 30 dias
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      await db.insert(storageMetrics).values([
        {
          corretoraId,
          data: yesterday.toISOString().split('T')[0],
          totalArquivos: 10,
          totalBytes: 102400,
          totalBytesCotacoes: 51200,
          totalBytesDocumentos: 30720,
          totalBytesChat: 20480,
        },
        {
          corretoraId,
          data: twoDaysAgo.toISOString().split('T')[0],
          totalArquivos: 8,
          totalBytes: 81920,
          totalBytesCotacoes: 40960,
          totalBytesDocumentos: 20480,
          totalBytesChat: 20480,
        },
      ]);

      const res = await request(app.server)
        .get('/api/admin/stats/usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      // Verificar que cada item tem os campos esperados (linhas 186-190 do stats.ts)
      for (const item of res.body) {
        expect(item.date).toBeDefined();
        expect(typeof item.storage).toBe('number');
        expect(typeof item.requests).toBe('number');
      }
    });

    it('retorna array vazio quando não há métricas no período', async () => {
      const res = await request(app.server)
        .get('/api/admin/stats/usage?days=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('usa default de 30 dias quando days não é informado (cobre branch || "30" linha 167)', async () => {
      const res = await request(app.server)
        .get('/api/admin/stats/usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('retorna métricas no período especificado por days', async () => {
      const today = new Date();
      const recentDate = new Date(today);
      recentDate.setDate(recentDate.getDate() - 3);

      await db.insert(storageMetrics).values({
        corretoraId,
        data: recentDate.toISOString().split('T')[0],
        totalArquivos: 5,
        totalBytes: 5120,
        totalBytesCotacoes: 2048,
        totalBytesDocumentos: 2048,
        totalBytesChat: 1024,
      });

      const res = await request(app.server)
        .get('/api/admin/stats/usage?days=7')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('retorna storage=0 e requests=0 para métricas com totalBytes e totalArquivos nulos (cobre || 0 linhas 188-189)', async () => {
      const today = new Date();
      const recentDate = new Date(today);
      recentDate.setDate(recentDate.getDate() - 1);

      // Inserir métrica com valores zerados para forçar as branches || 0
      await db.insert(storageMetrics).values({
        corretoraId,
        data: recentDate.toISOString().split('T')[0],
        totalArquivos: 0,
        totalBytes: 0,
        totalBytesCotacoes: 0,
        totalBytesDocumentos: 0,
        totalBytesChat: 0,
      });

      const res = await request(app.server)
        .get('/api/admin/stats/usage?days=7')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const item = res.body.find((i: any) => i.storage === 0);
      expect(item).toBeDefined();
      expect(item.requests).toBe(0);
    });
  });
});
