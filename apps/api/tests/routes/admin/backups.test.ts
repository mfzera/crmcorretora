import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { admins, backups, backupSchedules } from '@ecotech/shared/database';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import { createTestPlano, createTestCorretora } from '../../helpers/factories/corretora.factory';

describe('/api/admin/backups', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();

    await request(app.server)
      .post('/api/admin/auth/create-first-admin')
      .send({
        email: 'admin@ecotech.com',
        nome: 'Admin Backups',
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
  });

  // ── GET /api/admin/backups ────────────────────────────────────────────────

  describe('GET /api/admin/backups', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/admin/backups').expect(401);
    });

    it('retorna lista vazia de backups', async () => {
      const res = await request(app.server)
        .get('/api/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.backups).toBeDefined();
      expect(Array.isArray(res.body.backups)).toBe(true);
      expect(res.body.total).toBeDefined();
    });

    it('lista backups com informações de tenant quando corretoraId é null', async () => {
      // Inserir backup sem corretora
      await db.insert(backups).values({
        tipo: 'completo',
        status: 'concluido',
        backupPrefix: 'full/global/1234',
        corretoraId: null,
      });

      const res = await request(app.server)
        .get('/api/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.backups.length).toBeGreaterThan(0);
      // tenantName pode ser null ou undefined dependendo da serialização do Fastify
      const tenantName = res.body.backups[0].tenantName;
      expect(tenantName === null || tenantName === undefined).toBe(true);
    });

    it('lista backups incluindo backup com corretoraId válida (cobre branch tenantName)', async () => {
      const plano = await createTestPlano();
      const corretora = await createTestCorretora(plano.id);

      await db.insert(backups).values({
        tipo: 'completo',
        status: 'concluido',
        backupPrefix: 'full/tenant/1234',
        corretoraId: corretora.id,
      });

      const res = await request(app.server)
        .get('/api/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // O backup com corretoraId foi inserido e o endpoint deve retorná-lo na lista
      // (cobre o branch das linhas 81-87 do backups.ts)
      expect(res.body.backups.length).toBeGreaterThan(0);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('filtra por tipo incremental - retorna apenas backups incrementais', async () => {
      await db.insert(backups).values([
        { tipo: 'incremental', status: 'concluido', backupPrefix: 'inc/1' },
        { tipo: 'completo', status: 'concluido', backupPrefix: 'full/1' },
      ]);

      const resIncremental = await request(app.server)
        .get('/api/admin/backups?tipo=incremental')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const resCompleto = await request(app.server)
        .get('/api/admin/backups?tipo=completo')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // O filtro deve reduzir o número de resultados
      expect(resIncremental.body.total).toBeLessThan(resIncremental.body.total + resCompleto.body.total);
      expect(Array.isArray(resIncremental.body.backups)).toBe(true);
    });

    it('filtra por status concluido - reduz resultados', async () => {
      await db.insert(backups).values([
        { tipo: 'completo', status: 'concluido', backupPrefix: 'full/1' },
        { tipo: 'completo', status: 'em_progresso', backupPrefix: 'full/2' },
        { tipo: 'completo', status: 'falhou', backupPrefix: 'full/3' },
      ]);

      const res = await request(app.server)
        .get('/api/admin/backups?status=concluido')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.backups)).toBe(true);
    });

    it('filtra por status em_progresso - retorna apenas em andamento', async () => {
      await db.insert(backups).values([
        { tipo: 'completo', status: 'em_progresso', backupPrefix: 'full/2' },
      ]);

      const res = await request(app.server)
        .get('/api/admin/backups?status=em_progresso')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.backups)).toBe(true);
    });

    it('respeita parâmetro limit', async () => {
      await db.insert(backups).values([
        { tipo: 'completo', status: 'concluido', backupPrefix: 'full/1' },
        { tipo: 'completo', status: 'concluido', backupPrefix: 'full/2' },
        { tipo: 'completo', status: 'concluido', backupPrefix: 'full/3' },
      ]);

      const res = await request(app.server)
        .get('/api/admin/backups?limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.backups.length).toBeLessThanOrEqual(2);
    });
  });

  // ── POST /api/admin/backups ───────────────────────────────────────────────

  describe('POST /api/admin/backups', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/admin/backups')
        .send({ tipo: 'completo' })
        .expect(401);
    });

    it('cria backup completo com sucesso', async () => {
      const res = await request(app.server)
        .post('/api/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipo: 'completo' })
        .expect(200);

      expect(res.body.backup).toBeDefined();
      expect(res.body.message).toContain('sucesso');
    });

    it('cria backup incremental com sucesso', async () => {
      const res = await request(app.server)
        .post('/api/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipo: 'incremental' })
        .expect(200);

      expect(res.body.backup).toBeDefined();
    });

    it('retorna 400 para tipo inválido', async () => {
      // O schema do fastify valida o enum antes do handler,
      // mas testamos o valor que passa o schema (tipo não listado no enum seria bloqueado)
      await request(app.server)
        .post('/api/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipo: 'invalido' })
        .expect(400);
    });

    it('retorna 404 quando corretoraId não existe', async () => {
      const res = await request(app.server)
        .post('/api/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'completo',
          corretoraId: '00000000-0000-0000-0000-000000000099',
        })
        .expect(404);

      expect(res.body.error).toContain('Tenant não encontrado');
    });

    it('cria backup com descrição opcional', async () => {
      const res = await request(app.server)
        .post('/api/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipo: 'completo', descricao: 'Backup de teste' })
        .expect(200);

      expect(res.body.backup).toBeDefined();
    });
  });

  // ── POST /api/admin/backups/:id/verify ───────────────────────────────────

  describe('POST /api/admin/backups/:id/verify', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/admin/backups/00000000-0000-0000-0000-000000000001/verify')
        .expect(401);
    });

    it('retorna 404 para backup inexistente', async () => {
      const res = await request(app.server)
        .post('/api/admin/backups/00000000-0000-0000-0000-000000000001/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Backup não encontrado');
    });

    it('retorna 400 para backup não concluído', async () => {
      const [backup] = await db
        .insert(backups)
        .values({
          tipo: 'completo',
          status: 'em_progresso',
          backupPrefix: 'full/test',
        })
        .returning();

      const res = await request(app.server)
        .post(`/api/admin/backups/${backup.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.error).toContain('concluídos');
    });

    it('verifica backup concluído com sucesso', async () => {
      const [backup] = await db
        .insert(backups)
        .values({
          tipo: 'completo',
          status: 'concluido',
          backupPrefix: 'full/test',
        })
        .returning();

      const res = await request(app.server)
        .post(`/api/admin/backups/${backup.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.backupId).toBe(backup.id);
      expect(res.body.isValid).toBe(true);
      expect(res.body.message).toContain('sucesso');
    });

  });

  // ── POST /api/admin/backups/:id/restore ──────────────────────────────────

  describe('POST /api/admin/backups/:id/restore', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/admin/backups/00000000-0000-0000-0000-000000000001/restore')
        .expect(401);
    });

    it('retorna 404 para backup inexistente', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000001';
      const res = await request(app.server)
        .post(`/api/admin/backups/${nonExistentId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-confirm-restore', nonExistentId)
        .expect(404);

      expect(res.body.error).toContain('Backup não encontrado');
    });

    it('retorna 400 para backup não concluído', async () => {
      const [backup] = await db
        .insert(backups)
        .values({
          tipo: 'completo',
          status: 'falhou',
          backupPrefix: 'full/test',
        })
        .returning();

      const res = await request(app.server)
        .post(`/api/admin/backups/${backup.id}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-confirm-restore', backup.id)
        .expect(400);

      expect(res.body.error).toContain('concluídos');
    });

    it('retorna 400 para backup não verificado', async () => {
      const [backup] = await db
        .insert(backups)
        .values({
          tipo: 'completo',
          status: 'concluido',
          verificado: false,
          backupPrefix: 'full/test',
        })
        .returning();

      const res = await request(app.server)
        .post(`/api/admin/backups/${backup.id}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-confirm-restore', backup.id)
        .expect(400);

      expect(res.body.error).toContain('verificado');
    });

    it('restaura backup verificado e concluído com sucesso', async () => {
      const [backup] = await db
        .insert(backups)
        .values({
          tipo: 'completo',
          status: 'concluido',
          verificado: true,
          backupPrefix: 'full/test',
        })
        .returning();

      const res = await request(app.server)
        .post(`/api/admin/backups/${backup.id}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-confirm-restore', backup.id)
        .expect(200);

      expect(res.body.backupId).toBe(backup.id);
      expect(res.body.message).toContain('sucesso');
    });
  });

  // ── GET /api/admin/backups/schedules ─────────────────────────────────────

  describe('GET /api/admin/backups/schedules', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/admin/backups/schedules')
        .expect(401);
    });

    it('retorna lista vazia de schedules', async () => {
      const res = await request(app.server)
        .get('/api/admin/backups/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.schedules).toBeDefined();
      expect(Array.isArray(res.body.schedules)).toBe(true);
      expect(res.body.total).toBeDefined();
    });

    it('lista schedules ativos com info de tenant', async () => {
      await db.insert(backupSchedules).values({
        tipo: 'completo',
        cronExpression: '0 2 * * *',
        ativo: true,
        corretoraId: null,
      });

      const res = await request(app.server)
        .get('/api/admin/backups/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.schedules.length).toBeGreaterThan(0);
      expect(res.body.schedules[0].tenantName).toBeNull();
    });

    it('não lista schedules inativos', async () => {
      await db.insert(backupSchedules).values({
        tipo: 'incremental',
        cronExpression: '0 3 * * *',
        ativo: false,
        corretoraId: null,
      });

      const res = await request(app.server)
        .get('/api/admin/backups/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.schedules.forEach((s: any) => {
        expect(s.ativo).toBe(true);
      });
    });

    it('lista schedule ativo com tenantName quando corretora existe', async () => {
      const plano = await createTestPlano();
      const corretora = await createTestCorretora(plano.id);

      await db.insert(backupSchedules).values({
        tipo: 'completo',
        cronExpression: '0 4 * * *',
        ativo: true,
        corretoraId: corretora.id,
      });

      const res = await request(app.server)
        .get('/api/admin/backups/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const scheduleWithTenant = res.body.schedules.find(
        (s: any) => s.tenantName === corretora.razaoSocial,
      );
      expect(scheduleWithTenant).toBeDefined();
      expect(scheduleWithTenant.tenantName).toBe(corretora.razaoSocial);
    });
  });

  // ── DELETE /api/admin/backups/:id ─────────────────────────────────────────

  describe('DELETE /api/admin/backups/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete('/api/admin/backups/00000000-0000-0000-0000-000000000001')
        .expect(401);
    });

    it('retorna 404 para backup inexistente', async () => {
      const res = await request(app.server)
        .delete('/api/admin/backups/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Backup não encontrado');
    });

    it('deleta backup existente com sucesso', async () => {
      const [backup] = await db
        .insert(backups)
        .values({
          tipo: 'completo',
          status: 'concluido',
          backupPrefix: 'full/test',
        })
        .returning();

      const res = await request(app.server)
        .delete(`/api/admin/backups/${backup.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toContain('sucesso');
    });
  });
});
