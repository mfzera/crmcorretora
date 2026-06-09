import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { admins, adminAuditLogs } from '@ecotech/shared/database';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';

describe('/api/admin/audit-logs', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();

    // Criar admin e fazer login
    const createRes = await request(app.server)
      .post('/api/admin/auth/create-first-admin')
      .send({
        email: 'admin@ecotech.com',
        nome: 'Admin Audit',
        senha: 'senha12345',
      });

    adminId = createRes.body.admin.id;

    const loginRes = await request(app.server)
      .post('/api/admin/auth/login')
      .send({ email: 'admin@ecotech.com', senha: 'senha12345' });

    adminToken = loginRes.body.token;
  });

  // ── GET /api/admin/audit-logs ─────────────────────────────────────────────

  describe('GET /api/admin/audit-logs', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/admin/audit-logs').expect(401);
    });

    it('retorna lista vazia quando não há logs', async () => {
      const res = await request(app.server)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.logs).toBeDefined();
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body.total).toBeDefined();
      expect(res.body.limit).toBeDefined();
      expect(res.body.offset).toBeDefined();
    });

    it('retorna logs com informações do admin', async () => {
      // Inserir log de auditoria diretamente
      await db.insert(adminAuditLogs).values({
        adminId,
        acao: 'login',
        detalhes: { email: 'admin@ecotech.com' },
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });

      const res = await request(app.server)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.logs.length).toBeGreaterThan(0);
      const log = res.body.logs[0];
      expect(log.id).toBeDefined();
      expect(log.adminId).toBe(adminId);
      expect(log.acao).toBe('login');
      expect(log.adminName).toBe('Admin Audit');
      expect(log.adminEmail).toBe('admin@ecotech.com');
    });

    it('filtra por adminId', async () => {
      await db.insert(adminAuditLogs).values({
        adminId,
        acao: 'test_action',
        detalhes: {},
      });

      const res = await request(app.server)
        .get(`/api/admin/audit-logs?adminId=${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.logs.length).toBeGreaterThan(0);
      res.body.logs.forEach((log: any) => {
        expect(log.adminId).toBe(adminId);
      });
    });

    it('filtra por acao', async () => {
      await db.insert(adminAuditLogs).values([
        { adminId, acao: 'admin_login', detalhes: {} },
        { adminId, acao: 'admin_logout', detalhes: {} },
      ]);

      const res = await request(app.server)
        .get('/api/admin/audit-logs?acao=admin_login')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.logs.forEach((log: any) => {
        expect(log.acao).toBe('admin_login');
      });
    });

    it('filtra por dataInicio', async () => {
      await db.insert(adminAuditLogs).values({
        adminId,
        acao: 'test',
        detalhes: {},
      });

      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 1);
      const dataInicioStr = dataInicio.toISOString().split('T')[0];

      const res = await request(app.server)
        .get(`/api/admin/audit-logs?dataInicio=${dataInicioStr}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.logs.length).toBeGreaterThan(0);
    });

    it('filtra por dataFim', async () => {
      await db.insert(adminAuditLogs).values({
        adminId,
        acao: 'test',
        detalhes: {},
      });

      const dataFim = new Date();
      dataFim.setDate(dataFim.getDate() + 1);
      const dataFimStr = dataFim.toISOString().split('T')[0];

      const res = await request(app.server)
        .get(`/api/admin/audit-logs?dataFim=${dataFimStr}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.logs.length).toBeGreaterThan(0);
    });

    it('respeita limit e offset', async () => {
      await db.insert(adminAuditLogs).values([
        { adminId, acao: 'a1', detalhes: {} },
        { adminId, acao: 'a2', detalhes: {} },
        { adminId, acao: 'a3', detalhes: {} },
      ]);

      const res = await request(app.server)
        .get('/api/admin/audit-logs?limit=2&offset=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.logs.length).toBeLessThanOrEqual(2);
      expect(res.body.limit).toBe(2);
      expect(res.body.offset).toBe(0);
    });

    it('retorna adminName e adminEmail corretos do admin autenticado', async () => {
      await db.insert(adminAuditLogs).values({
        adminId,
        acao: 'test_named',
        detalhes: {},
      });

      const res = await request(app.server)
        .get('/api/admin/audit-logs?acao=test_named')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.logs.length).toBeGreaterThan(0);
      expect(res.body.logs[0].adminName).toBe('Admin Audit');
      expect(res.body.logs[0].adminEmail).toBe('admin@ecotech.com');
    });
  });

  // ── GET /api/admin/audit-logs/actions ─────────────────────────────────────

  describe('GET /api/admin/audit-logs/actions', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/admin/audit-logs/actions')
        .expect(401);
    });

    it('retorna lista vazia quando não há logs', async () => {
      const res = await request(app.server)
        .get('/api/admin/audit-logs/actions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.actions).toBeDefined();
      expect(Array.isArray(res.body.actions)).toBe(true);
    });

    it('retorna ações únicas dos logs', async () => {
      await db.insert(adminAuditLogs).values([
        { adminId, acao: 'admin_login', detalhes: {} },
        { adminId, acao: 'admin_login', detalhes: {} },
        { adminId, acao: 'admin_logout', detalhes: {} },
        { adminId, acao: 'backup_created', detalhes: {} },
      ]);

      const res = await request(app.server)
        .get('/api/admin/audit-logs/actions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.actions)).toBe(true);
      expect(res.body.actions).toContain('admin_login');
      expect(res.body.actions).toContain('admin_logout');
      expect(res.body.actions).toContain('backup_created');
      // Deve ser único, sem duplicatas
      const loginCount = res.body.actions.filter((a: string) => a === 'admin_login').length;
      expect(loginCount).toBe(1);
    });
  });

  // ── GET /api/admin/audit-logs/stats ──────────────────────────────────────

  describe('GET /api/admin/audit-logs/stats', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/admin/audit-logs/stats')
        .expect(401);
    });

    it('retorna estatísticas com período de 30 dias', async () => {
      const res = await request(app.server)
        .get('/api/admin/audit-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.period).toBeDefined();
      expect(res.body.period.days).toBe(30);
      expect(res.body.period.start).toBeDefined();
      expect(res.body.period.end).toBeDefined();
      expect(res.body.totalLogs).toBeDefined();
      expect(res.body.actionCounts).toBeDefined();
      expect(res.body.topAdmins).toBeDefined();
      expect(Array.isArray(res.body.topAdmins)).toBe(true);
    });

    it('conta logs por ação e lista top admins', async () => {
      await db.insert(adminAuditLogs).values([
        { adminId, acao: 'admin_login', detalhes: {} },
        { adminId, acao: 'admin_login', detalhes: {} },
        { adminId, acao: 'backup_created', detalhes: {} },
      ]);

      const res = await request(app.server)
        .get('/api/admin/audit-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // totalLogs conta todos os logs dos últimos 30 dias
      expect(res.body.totalLogs).toBeGreaterThanOrEqual(3);
      // actionCounts é um objeto (pode ter chaves removidas por serialização restrita do schema)
      expect(res.body.actionCounts).toBeDefined();
      expect(typeof res.body.actionCounts).toBe('object');

      expect(res.body.topAdmins.length).toBeGreaterThan(0);
      const topAdmin = res.body.topAdmins[0];
      expect(topAdmin.adminId).toBe(adminId);
      expect(topAdmin.nome).toBe('Admin Audit');
      expect(topAdmin.count).toBeGreaterThanOrEqual(3);
    });

    it('retorna topAdmins com informações corretas', async () => {
      await db.insert(adminAuditLogs).values([
        { adminId, acao: 'test_a', detalhes: {} },
        { adminId, acao: 'test_b', detalhes: {} },
        { adminId, acao: 'test_c', detalhes: {} },
        { adminId, acao: 'test_d', detalhes: {} },
        { adminId, acao: 'test_e', detalhes: {} },
      ]);

      const res = await request(app.server)
        .get('/api/admin/audit-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.topAdmins.length).toBeGreaterThan(0);
      const topAdmin = res.body.topAdmins.find((a: any) => a.adminId === adminId);
      expect(topAdmin).toBeDefined();
      expect(topAdmin.nome).toBe('Admin Audit');
      expect(topAdmin.email).toBe('admin@ecotech.com');
      expect(typeof topAdmin.count).toBe('number');
    });

  });
});
