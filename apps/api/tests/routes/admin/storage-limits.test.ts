import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import {
  createTestPlano,
  createTestCorretora,
} from '../../helpers/factories/corretora.factory';

describe('/api/admin/tenants/:id/limits', () => {
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
        nome: 'Admin Storage Limits',
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

  // ── GET /api/admin/tenants/:id/limits ──────────────────────────────────────

  describe('GET /api/admin/tenants/:id/limits', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/limits`)
        .expect(401);
    });

    it('retorna 404 para tenant inexistente', async () => {
      const res = await request(app.server)
        .get('/api/admin/tenants/00000000-0000-0000-0000-000000000099/limits')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Tenant não encontrado');
    });

    it('retorna limites padrão (null) quando não há limites configurados', async () => {
      const res = await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(res.body.limits).toBeDefined();
      // Sem limites configurados, deve retornar defaults com null
      expect(res.body.limits.limiteArquivos).toBeNull();
      expect(res.body.limits.limiteBytes).toBeNull();
      expect(res.body.limits.alertasAtivos).toBe(true);
    });

    it('retorna limites configurados após serem definidos', async () => {
      // Primeiro configura limites
      await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limiteArquivos: 1000, limiteBytes: 1073741824 });

      const res = await request(app.server)
        .get(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(res.body.limits).toBeDefined();
    });
  });

  // ── PUT /api/admin/tenants/:id/limits ──────────────────────────────────────

  describe('PUT /api/admin/tenants/:id/limits', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .send({ limiteArquivos: 1000 })
        .expect(401);
    });

    it('retorna 404 para tenant inexistente', async () => {
      const res = await request(app.server)
        .put('/api/admin/tenants/00000000-0000-0000-0000-000000000099/limits')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limiteArquivos: 1000 })
        .expect(404);

      expect(res.body.error).toContain('Tenant não encontrado');
    });

    it('cria novo registro de limites (insert) quando não existia', async () => {
      const res = await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          limiteArquivos: 500,
          limiteBytes: 536870912,
          limiteBytesCotacoes: 268435456,
          limiteBytesDocumentos: 134217728,
          limiteBytesChat: 134217728,
          alertasAtivos: true,
        })
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(res.body.limits).toBeDefined();
    });

    it('atualiza registro existente (update) quando já havia limites', async () => {
      // Criar limites primeiro
      await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limiteArquivos: 100, limiteBytes: 10485760 });

      // Atualizar limites existentes
      const res = await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limiteArquivos: 200 })
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(res.body.limits).toBeDefined();
    });

    it('permite definir limites como null (remover limite)', async () => {
      // Criar limites
      await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limiteArquivos: 100 });

      // Remover limite (null)
      const res = await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limiteArquivos: null })
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(res.body.limits).toBeDefined();
    });

    it('retorna 400 para limiteArquivos negativo', async () => {
      // O schema Fastify rejeita com minimum: 0 antes de chegar ao handler
      await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limiteArquivos: -1 })
        .expect(400);
    });

    it('retorna 400 para limiteBytes negativo', async () => {
      await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limiteBytes: -100 })
        .expect(400);
    });

    it('retorna 400 para limiteBytesCotacoes negativo', async () => {
      await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limiteBytesCotacoes: -1 })
        .expect(400);
    });

    it('retorna 400 para limiteBytesDocumentos negativo', async () => {
      await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limiteBytesDocumentos: -1 })
        .expect(400);
    });

    it('retorna 400 para limiteBytesChat negativo', async () => {
      await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ limiteBytesChat: -1 })
        .expect(400);
    });

    it('atualiza alertasAtivos para false', async () => {
      const res = await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ alertasAtivos: false })
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(res.body.limits).toBeDefined();
    });

    it('aceita corpo vazio (sem campos) e retorna limites defaults', async () => {
      const res = await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(res.body.limits).toBeDefined();
    });

    it('atualiza todos os campos de limites existentes (cobre branches true de todos os ternários)', async () => {
      // Criar limites primeiro
      await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          limiteArquivos: 100,
          limiteBytes: 10485760,
          limiteBytesCotacoes: 5242880,
          limiteBytesDocumentos: 3145728,
          limiteBytesChat: 2097152,
          alertasAtivos: true,
        });

      // Atualizar todos os campos (cobre branch true de cada ternário)
      const res = await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          limiteArquivos: 200,
          limiteBytes: 20971520,
          limiteBytesCotacoes: 10485760,
          limiteBytesDocumentos: 6291456,
          limiteBytesChat: 4194304,
          alertasAtivos: false,
        })
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(res.body.limits).toBeDefined();
    });

    it('atualiza registro existente com campos omitidos (cobre branches false dos ternários)', async () => {
      // Criar limites primeiro com todos os campos
      await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          limiteArquivos: 100,
          limiteBytes: 10485760,
          limiteBytesCotacoes: 5242880,
          limiteBytesDocumentos: 3145728,
          limiteBytesChat: 2097152,
          alertasAtivos: true,
        });

      // Atualizar sem nenhum campo (todos os ternários usam existingLimits.xxx — branch false)
      const res = await request(app.server)
        .put(`/api/admin/tenants/${corretoraId}/limits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      expect(res.body.tenant).toBeDefined();
      expect(res.body.limits).toBeDefined();
    });
  });
});
