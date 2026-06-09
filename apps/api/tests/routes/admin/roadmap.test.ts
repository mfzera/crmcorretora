import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { roadmapPhases, roadmapItems } from '@ecotech/shared/database';
import { sql } from 'drizzle-orm';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';

describe('/api/admin/roadmap', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    await request(app.server)
      .post('/api/admin/auth/create-first-admin')
      .send({
        email: 'admin@ecotech.com',
        nome: 'Admin Roadmap',
        senha: 'senha12345',
      });

    const loginRes = await request(app.server)
      .post('/api/admin/auth/login')
      .send({ email: 'admin@ecotech.com', senha: 'senha12345' });

    adminToken = loginRes.body.token;
  });

  // Limpa apenas tabelas de roadmap entre testes (evita deadlock do TRUNCATE CASCADE global)
  afterEach(async () => {
    await db.execute(sql`TRUNCATE TABLE roadmap_items, roadmap_phases RESTART IDENTITY CASCADE`);
  });

  async function seedPhase(overrides?: Partial<{
    name: string;
    estimatedDate: string;
    isPublished: boolean;
    publishedAt: Date | null;
    publishedBy: string | null;
    deletedAt: Date | null;
    order: string;
  }>) {
    const [phase] = await db
      .insert(roadmapPhases)
      .values({
        name: 'Fase Teste',
        estimatedDate: '2026-06',
        isPublished: false,
        ...overrides,
      })
      .returning();
    return phase;
  }

  async function seedItem(phaseId: string, overrides?: Partial<{
    title: string;
    description: string;
    status: 'done' | 'in_progress' | 'planned';
    order: string;
    deletedAt: Date | null;
  }>) {
    const [item] = await db
      .insert(roadmapItems)
      .values({
        phaseId,
        title: 'Item Teste',
        status: 'planned',
        ...overrides,
      })
      .returning();
    return item;
  }

  // ── GET /api/admin/roadmap/phases ──────────────────────────────────────────

  describe('GET /api/admin/roadmap/phases', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/admin/roadmap/phases').expect(401);
    });

    it('retorna lista vazia quando não há fases', async () => {
      const res = await request(app.server)
        .get('/api/admin/roadmap/phases')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.phases)).toBe(true);
      expect(res.body.total).toBeDefined();
    });

    it('lista fases com seus items', async () => {
      const phase = await seedPhase({ name: 'Fase com items' });
      await seedItem(phase.id, { title: 'Item da fase', status: 'done' });

      const res = await request(app.server)
        .get('/api/admin/roadmap/phases')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.phases.length).toBeGreaterThan(0);
      const found = res.body.phases.find((p: any) => p.id === phase.id);
      expect(found).toBeDefined();
      expect(Array.isArray(found.items)).toBe(true);
      expect(found.items.length).toBeGreaterThan(0);
    });

    it('não lista fases com soft delete', async () => {
      const phase = await seedPhase({ name: 'Fase deletada', deletedAt: new Date() });

      const res = await request(app.server)
        .get('/api/admin/roadmap/phases')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const found = res.body.phases.find((p: any) => p.id === phase.id);
      expect(found).toBeUndefined();
    });
  });

  // ── GET /api/admin/roadmap/phases/:id ─────────────────────────────────────

  describe('GET /api/admin/roadmap/phases/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/admin/roadmap/phases/00000000-0000-0000-0000-000000000001')
        .expect(401);
    });

    it('retorna 404 para fase inexistente', async () => {
      const res = await request(app.server)
        .get('/api/admin/roadmap/phases/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Fase não encontrada');
    });

    it('retorna fase com seus items', async () => {
      const phase = await seedPhase({ name: 'Fase Específica' });
      await seedItem(phase.id, { title: 'Item específico', status: 'in_progress' });

      const res = await request(app.server)
        .get(`/api/admin/roadmap/phases/${phase.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(phase.id);
      expect(res.body.name).toBe('Fase Específica');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it('retorna 404 para fase com soft delete', async () => {
      const phase = await seedPhase({ deletedAt: new Date() });

      await request(app.server)
        .get(`/api/admin/roadmap/phases/${phase.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── POST /api/admin/roadmap/phases ────────────────────────────────────────

  describe('POST /api/admin/roadmap/phases', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/admin/roadmap/phases')
        .send({ name: 'Fase A', estimatedDate: '2026-06' })
        .expect(401);
    });

    it('cria fase e retorna 201', async () => {
      const res = await request(app.server)
        .post('/api/admin/roadmap/phases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Nova Fase', estimatedDate: '2026-07' })
        .expect(201);

      expect(res.body.phase).toBeDefined();
      expect(res.body.phase.name).toBe('Nova Fase');
      expect(res.body.message).toContain('sucesso');
    });

    it('cria fase publicada quando isPublished=true', async () => {
      const res = await request(app.server)
        .post('/api/admin/roadmap/phases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Fase Publicada', estimatedDate: '2026-08', isPublished: true })
        .expect(201);

      expect(res.body.phase.isPublished).toBe(true);
      expect(res.body.phase.publishedAt).toBeDefined();
      expect(res.body.phase.publishedBy).toBe('admin@ecotech.com');
    });

    it('retorna 400 para formato de data inválido', async () => {
      await request(app.server)
        .post('/api/admin/roadmap/phases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Fase Inválida', estimatedDate: '2026/08' })
        .expect(400);
    });
  });

  // ── PATCH /api/admin/roadmap/phases/:id ───────────────────────────────────

  describe('PATCH /api/admin/roadmap/phases/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/admin/roadmap/phases/00000000-0000-0000-0000-000000000001')
        .send({ name: 'Novo nome' })
        .expect(401);
    });

    it('retorna 404 para fase inexistente', async () => {
      const res = await request(app.server)
        .patch('/api/admin/roadmap/phases/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Novo nome' })
        .expect(404);

      expect(res.body.error).toContain('Fase não encontrada');
    });

    it('atualiza fase e retorna 200', async () => {
      const phase = await seedPhase({ name: 'Nome original' });

      const res = await request(app.server)
        .patch(`/api/admin/roadmap/phases/${phase.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Nome atualizado', estimatedDate: '2026-09', order: '1' })
        .expect(200);

      expect(res.body.phase.name).toBe('Nome atualizado');
      expect(res.body.message).toContain('sucesso');
    });
  });

  // ── POST /api/admin/roadmap/phases/:id/publish ────────────────────────────

  describe('POST /api/admin/roadmap/phases/:id/publish', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/admin/roadmap/phases/00000000-0000-0000-0000-000000000001/publish')
        .expect(401);
    });

    it('retorna 404 para fase inexistente', async () => {
      const res = await request(app.server)
        .post('/api/admin/roadmap/phases/00000000-0000-0000-0000-000000000001/publish')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Fase não encontrada');
    });

    it('publica fase não publicada', async () => {
      const phase = await seedPhase({ isPublished: false });

      const res = await request(app.server)
        .post(`/api/admin/roadmap/phases/${phase.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.phase.isPublished).toBe(true);
      expect(res.body.message).toContain('sucesso');
    });

    it('retorna 400 ao tentar publicar fase já publicada', async () => {
      const phase = await seedPhase({
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: 'admin@ecotech.com',
      });

      const res = await request(app.server)
        .post(`/api/admin/roadmap/phases/${phase.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.error).toContain('já está publicada');
    });
  });

  // ── POST /api/admin/roadmap/phases/:id/unpublish ──────────────────────────

  describe('POST /api/admin/roadmap/phases/:id/unpublish', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/admin/roadmap/phases/00000000-0000-0000-0000-000000000001/unpublish')
        .expect(401);
    });

    it('retorna 404 para fase inexistente', async () => {
      const res = await request(app.server)
        .post('/api/admin/roadmap/phases/00000000-0000-0000-0000-000000000001/unpublish')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Fase não encontrada');
    });

    it('despublica fase publicada', async () => {
      const phase = await seedPhase({
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: 'admin@ecotech.com',
      });

      const res = await request(app.server)
        .post(`/api/admin/roadmap/phases/${phase.id}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.phase.isPublished).toBe(false);
      expect(res.body.message).toContain('sucesso');
    });

    it('retorna 400 ao tentar despublicar fase já despublicada', async () => {
      const phase = await seedPhase({ isPublished: false });

      const res = await request(app.server)
        .post(`/api/admin/roadmap/phases/${phase.id}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.error).toContain('já está despublicada');
    });
  });

  // ── DELETE /api/admin/roadmap/phases/:id ──────────────────────────────────

  describe('DELETE /api/admin/roadmap/phases/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete('/api/admin/roadmap/phases/00000000-0000-0000-0000-000000000001')
        .expect(401);
    });

    it('retorna 404 para fase inexistente', async () => {
      const res = await request(app.server)
        .delete('/api/admin/roadmap/phases/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Fase não encontrada');
    });

    it('deleta fase (soft delete) e seus items', async () => {
      const phase = await seedPhase({ name: 'Para deletar' });
      await seedItem(phase.id, { title: 'Item da fase' });

      const res = await request(app.server)
        .delete(`/api/admin/roadmap/phases/${phase.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toContain('sucesso');

      // Fase não deve aparecer mais na listagem
      const listRes = await request(app.server)
        .get('/api/admin/roadmap/phases')
        .set('Authorization', `Bearer ${adminToken}`);

      const found = listRes.body.phases.find((p: any) => p.id === phase.id);
      expect(found).toBeUndefined();
    });
  });

  // ── POST /api/admin/roadmap/phases/:id/items ──────────────────────────────

  describe('POST /api/admin/roadmap/phases/:id/items', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/admin/roadmap/phases/00000000-0000-0000-0000-000000000001/items')
        .send({ title: 'Item A' })
        .expect(401);
    });

    it('retorna 404 para fase inexistente', async () => {
      const res = await request(app.server)
        .post('/api/admin/roadmap/phases/00000000-0000-0000-0000-000000000001/items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Item A' })
        .expect(404);

      expect(res.body.error).toContain('Fase não encontrada');
    });

    it('cria item na fase e retorna 201', async () => {
      const phase = await seedPhase();

      const res = await request(app.server)
        .post(`/api/admin/roadmap/phases/${phase.id}/items`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Novo Item', description: 'Descrição do item', status: 'planned' })
        .expect(201);

      expect(res.body.item).toBeDefined();
      expect(res.body.item.title).toBe('Novo Item');
      expect(res.body.item.phaseId).toBe(phase.id);
      expect(res.body.message).toContain('sucesso');
    });

    it('cria item com todos os status suportados', async () => {
      const phase = await seedPhase();
      const statuses = ['done', 'in_progress', 'planned'] as const;

      for (const status of statuses) {
        const res = await request(app.server)
          .post(`/api/admin/roadmap/phases/${phase.id}/items`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: `Item ${status}`, status })
          .expect(201);

        expect(res.body.item.status).toBe(status);
      }
    });
  });

  // ── PATCH /api/admin/roadmap/items/:id ────────────────────────────────────

  describe('PATCH /api/admin/roadmap/items/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/admin/roadmap/items/00000000-0000-0000-0000-000000000001')
        .send({ title: 'Novo título' })
        .expect(401);
    });

    it('retorna 404 para item inexistente', async () => {
      const res = await request(app.server)
        .patch('/api/admin/roadmap/items/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Novo título' })
        .expect(404);

      expect(res.body.error).toContain('Item não encontrado');
    });

    it('atualiza item e retorna 200', async () => {
      const phase = await seedPhase();
      const item = await seedItem(phase.id, { title: 'Título original', status: 'planned' });

      const res = await request(app.server)
        .patch(`/api/admin/roadmap/items/${item.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Título atualizado', status: 'done', description: 'Nova desc', order: '2' })
        .expect(200);

      expect(res.body.item.title).toBe('Título atualizado');
      expect(res.body.item.status).toBe('done');
      expect(res.body.message).toContain('sucesso');
    });
  });

  // ── DELETE /api/admin/roadmap/items/:id ───────────────────────────────────

  describe('DELETE /api/admin/roadmap/items/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete('/api/admin/roadmap/items/00000000-0000-0000-0000-000000000001')
        .expect(401);
    });

    it('retorna 404 para item inexistente', async () => {
      const res = await request(app.server)
        .delete('/api/admin/roadmap/items/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Item não encontrado');
    });

    it('deleta item (soft delete) e não aparece mais na fase', async () => {
      const phase = await seedPhase();
      const item = await seedItem(phase.id, { title: 'Item para deletar' });

      const res = await request(app.server)
        .delete(`/api/admin/roadmap/items/${item.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toContain('sucesso');

      // Item não deve aparecer mais na fase
      const phaseRes = await request(app.server)
        .get(`/api/admin/roadmap/phases/${phase.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const found = phaseRes.body.items.find((i: any) => i.id === item.id);
      expect(found).toBeUndefined();
    });
  });
});
