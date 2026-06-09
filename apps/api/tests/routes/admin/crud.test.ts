import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { admins } from '@ecotech/shared/database';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('/api/admin', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
  });

  // ── POST /api/admin/auth/create-first-admin ───────────────────────────────

  describe('POST /api/admin/auth/create-first-admin', () => {
    beforeEach(async () => {
      await db.delete(admins);
    });

    it('cria o primeiro admin quando não existe nenhum', async () => {
      const res = await request(app.server)
        .post('/api/admin/auth/create-first-admin')
        .send({
          email: 'admin@ecotech.com',
          nome: 'Admin Teste',
          senha: 'senha12345',
        })
        .expect(201);

      expect(res.body.admin).toBeDefined();
      expect(res.body.admin.email).toBe('admin@ecotech.com');
      expect(res.body.admin.nome).toBe('Admin Teste');
    });

    it('retorna 403 quando já existe um admin', async () => {
      // Criar primeiro admin
      await request(app.server)
        .post('/api/admin/auth/create-first-admin')
        .send({
          email: 'admin@ecotech.com',
          nome: 'Admin Primeiro',
          senha: 'senha12345',
        })
        .expect(201);

      // Tentar criar segundo
      await request(app.server)
        .post('/api/admin/auth/create-first-admin')
        .send({
          email: 'admin2@ecotech.com',
          nome: 'Admin Segundo',
          senha: 'senha12345',
        })
        .expect(403);
    });

    it('retorna 400 para senha muito curta', async () => {
      await request(app.server)
        .post('/api/admin/auth/create-first-admin')
        .send({
          email: 'admin@ecotech.com',
          nome: 'Admin Teste',
          senha: '123',
        })
        .expect(400);
    });

    it('retorna 400 para nome muito curto', async () => {
      await request(app.server)
        .post('/api/admin/auth/create-first-admin')
        .send({
          email: 'admin@ecotech.com',
          nome: 'A',
          senha: 'senha12345',
        })
        .expect(400);
    });
  });

  // ── POST /api/admin/auth/login ────────────────────────────────────────────

  describe('POST /api/admin/auth/login', () => {
    let adminEmail: string;
    let adminSenha: string;

    beforeEach(async () => {
      await db.delete(admins);
      adminEmail = 'admin@ecotech.com';
      adminSenha = 'senha12345';

      await request(app.server)
        .post('/api/admin/auth/create-first-admin')
        .send({
          email: adminEmail,
          nome: 'Admin Teste',
          senha: adminSenha,
        });
    });

    it('faz login com credenciais corretas', async () => {
      const res = await request(app.server)
        .post('/api/admin/auth/login')
        .send({ email: adminEmail, senha: adminSenha })
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(res.body.admin).toBeDefined();
      expect(res.body.admin.email).toBe(adminEmail);
    });

    it('retorna 401 com senha incorreta', async () => {
      await request(app.server)
        .post('/api/admin/auth/login')
        .send({ email: adminEmail, senha: 'senhaerrada' })
        .expect(401);
    });

    it('retorna 401 com email inexistente', async () => {
      await request(app.server)
        .post('/api/admin/auth/login')
        .send({ email: 'naoexiste@ecotech.com', senha: adminSenha })
        .expect(401);
    });

    it('retorna 400 para email inválido', async () => {
      await request(app.server)
        .post('/api/admin/auth/login')
        .send({ email: 'nao-e-email', senha: adminSenha })
        .expect(400);
    });
  });

  // ── GET /api/admin/auth/me ────────────────────────────────────────────────

  describe('GET /api/admin/auth/me', () => {
    let adminToken: string;

    beforeEach(async () => {
      await db.delete(admins);
      await request(app.server)
        .post('/api/admin/auth/create-first-admin')
        .send({
          email: 'admin@ecotech.com',
          nome: 'Admin Teste',
          senha: 'senha12345',
        });

      const loginRes = await request(app.server)
        .post('/api/admin/auth/login')
        .send({ email: 'admin@ecotech.com', senha: 'senha12345' });

      adminToken = loginRes.body.token;
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/admin/auth/me').expect(401);
    });

    it('retorna dados do admin autenticado', async () => {
      const res = await request(app.server)
        .get('/api/admin/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.email).toBe('admin@ecotech.com');
      expect(res.body.nome).toBe('Admin Teste');
      expect(res.body.ativo).toBe(true);
    });
  });

  // ── GET /api/admin/stats ──────────────────────────────────────────────────

  describe('GET /api/admin/stats', () => {
    let adminToken: string;

    beforeEach(async () => {
      await db.delete(admins);
      await request(app.server)
        .post('/api/admin/auth/create-first-admin')
        .send({
          email: 'admin@ecotech.com',
          nome: 'Admin Stats',
          senha: 'senha12345',
        });

      const loginRes = await request(app.server)
        .post('/api/admin/auth/login')
        .send({ email: 'admin@ecotech.com', senha: 'senha12345' });

      adminToken = loginRes.body.token;
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/admin/stats').expect(401);
    });

    it('retorna estatísticas globais', async () => {
      const res = await request(app.server)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totalTenants).toBeDefined();
      expect(res.body.totalUsers).toBeDefined();
      expect(res.body.totalClientes).toBeDefined();
      expect(res.body.totalArquivos).toBeDefined();
      expect(typeof res.body.totalTenants).toBe('number');
      expect(typeof res.body.totalUsers).toBe('number');
    });
  });

  // ── GET /api/admin/stats/usage ────────────────────────────────────────────

  describe('GET /api/admin/stats/usage', () => {
    let adminToken: string;

    beforeEach(async () => {
      await db.delete(admins);
      await request(app.server)
        .post('/api/admin/auth/create-first-admin')
        .send({
          email: 'admin@ecotech.com',
          nome: 'Admin Usage',
          senha: 'senha12345',
        });

      const loginRes = await request(app.server)
        .post('/api/admin/auth/login')
        .send({ email: 'admin@ecotech.com', senha: 'senha12345' });

      adminToken = loginRes.body.token;
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/admin/stats/usage').expect(401);
    });

    it('retorna histórico de uso', async () => {
      const res = await request(app.server)
        .get('/api/admin/stats/usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('aceita parâmetro days', async () => {
      const res = await request(app.server)
        .get('/api/admin/stats/usage?days=7')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── POST /api/admin/auth/logout ───────────────────────────────────────────

  describe('POST /api/admin/auth/logout', () => {
    let adminToken: string;

    beforeEach(async () => {
      await db.delete(admins);
      await request(app.server)
        .post('/api/admin/auth/create-first-admin')
        .send({
          email: 'admin@ecotech.com',
          nome: 'Admin Logout',
          senha: 'senha12345',
        });

      const loginRes = await request(app.server)
        .post('/api/admin/auth/login')
        .send({ email: 'admin@ecotech.com', senha: 'senha12345' });

      adminToken = loginRes.body.token;
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).post('/api/admin/auth/logout').expect(401);
    });

    it('faz logout com sucesso', async () => {
      const res = await request(app.server)
        .post('/api/admin/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toBeDefined();
    });
  });
});
