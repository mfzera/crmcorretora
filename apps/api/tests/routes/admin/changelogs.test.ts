import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { changelogs, changelogItems } from '@ecotech/shared/database';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';

describe('/api/admin/changelogs', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminToken: string;
  let versionCounter = 100;

  // Gerar versão única para evitar violação de UNIQUE constraint
  function nextVersion() {
    versionCounter++;
    return `${versionCounter}.0.0`;
  }

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();

    await request(app.server)
      .post('/api/admin/auth/create-first-admin')
      .send({
        email: 'admin@ecotech.com',
        nome: 'Admin Changelogs',
        senha: 'senha12345',
      });

    const loginRes = await request(app.server)
      .post('/api/admin/auth/login')
      .send({ email: 'admin@ecotech.com', senha: 'senha12345' });

    adminToken = loginRes.body.token;
  });

  // Helper: insere changelog diretamente no DB, retornando registro completo com ID
  async function seedChangelog(overrides?: Partial<{
    version: string;
    title: string;
    releaseDate: Date;
    isPublished: boolean;
    description: string;
    publishedAt: Date | null;
    publishedBy: string | null;
    deletedAt: Date | null;
  }>) {
    const [changelog] = await db
      .insert(changelogs)
      .values({
        version: nextVersion(),
        title: 'Changelog Teste',
        releaseDate: new Date(),
        isPublished: false,
        ...overrides,
      })
      .returning();
    return changelog;
  }

  // Helper: insere item diretamente no DB
  async function seedItem(changelogId: string, overrides?: Partial<{
    type: string;
    title: string;
    description: string;
  }>) {
    const [item] = await db
      .insert(changelogItems)
      .values({
        changelogId,
        type: 'feature' as any,
        title: 'Item teste',
        description: 'Descrição teste',
        ...overrides,
      })
      .returning();
    return item;
  }

  // ── GET /api/admin/changelogs ─────────────────────────────────────────────

  describe('GET /api/admin/changelogs', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/admin/changelogs').expect(401);
    });

    it('retorna lista vazia quando não há changelogs', async () => {
      const res = await request(app.server)
        .get('/api/admin/changelogs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.changelogs).toBeDefined();
      expect(Array.isArray(res.body.changelogs)).toBe(true);
      expect(res.body.total).toBeDefined();
    });

    it('lista changelogs com seus items', async () => {
      const changelog = await seedChangelog({ title: 'v2' });
      await seedItem(changelog.id, { type: 'feature' as any, title: 'Nova feature', description: 'Desc' });

      const res = await request(app.server)
        .get('/api/admin/changelogs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.changelogs.length).toBeGreaterThan(0);
      const found = res.body.changelogs.find((c: any) => c.id === changelog.id);
      expect(found).toBeDefined();
      expect(Array.isArray(found.items)).toBe(true);
      expect(found.items.length).toBeGreaterThan(0);
    });

    it('não lista changelogs com soft delete', async () => {
      const changelog = await seedChangelog({ title: 'v3', deletedAt: new Date() });

      const res = await request(app.server)
        .get('/api/admin/changelogs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const found = res.body.changelogs.find((c: any) => c.id === changelog.id);
      expect(found).toBeUndefined();
    });
  });

  // ── GET /api/admin/changelogs/:id ─────────────────────────────────────────

  describe('GET /api/admin/changelogs/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/admin/changelogs/00000000-0000-0000-0000-000000000001')
        .expect(401);
    });

    it('retorna 404 para changelog inexistente', async () => {
      const res = await request(app.server)
        .get('/api/admin/changelogs/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Changelog não encontrado');
    });

    it('retorna changelog com seus items', async () => {
      const changelog = await seedChangelog({ title: 'v1.1' });
      await seedItem(changelog.id, { type: 'bugfix' as any, title: 'Correção de bug', description: 'Bug corrigido' });

      const res = await request(app.server)
        .get(`/api/admin/changelogs/${changelog.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(changelog.id);
      expect(res.body.version).toBe(changelog.version);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it('retorna 404 para changelog com soft delete', async () => {
      const changelog = await seedChangelog({ title: 'v1.2', deletedAt: new Date() });

      await request(app.server)
        .get(`/api/admin/changelogs/${changelog.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── POST /api/admin/changelogs ────────────────────────────────────────────

  describe('POST /api/admin/changelogs', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/admin/changelogs')
        .send({ version: '1.0.0', title: 'Test', releaseDate: new Date().toISOString() })
        .expect(401);
    });

    it('cria changelog e retorna 201 com mensagem', async () => {
      const res = await request(app.server)
        .post('/api/admin/changelogs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          version: nextVersion(),
          title: 'Primeira versão',
          releaseDate: new Date().toISOString(),
        })
        .expect(201);

      expect(res.body.changelog).toBeDefined();
      expect(res.body.message).toContain('sucesso');
    });

    it('cria changelog publicado quando isPublished=true', async () => {
      const res = await request(app.server)
        .post('/api/admin/changelogs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          version: nextVersion(),
          title: 'Segunda versão',
          releaseDate: new Date().toISOString(),
          isPublished: true,
        })
        .expect(201);

      expect(res.body.changelog).toBeDefined();
      expect(res.body.message).toContain('sucesso');
    });

    it('cria changelog com descrição', async () => {
      const res = await request(app.server)
        .post('/api/admin/changelogs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          version: nextVersion(),
          title: 'Terceira versão',
          description: 'Grandes mudanças',
          releaseDate: new Date().toISOString(),
        })
        .expect(201);

      expect(res.body.changelog).toBeDefined();
    });

    it('retorna 400 para versão com formato inválido', async () => {
      await request(app.server)
        .post('/api/admin/changelogs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          version: 'v1.0',
          title: 'Versão inválida',
          releaseDate: new Date().toISOString(),
        })
        .expect(400);
    });
  });

  // ── PATCH /api/admin/changelogs/:id ───────────────────────────────────────

  describe('PATCH /api/admin/changelogs/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/admin/changelogs/00000000-0000-0000-0000-000000000001')
        .send({ title: 'Novo título' })
        .expect(401);
    });

    it('retorna 404 para changelog inexistente', async () => {
      const res = await request(app.server)
        .patch('/api/admin/changelogs/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Novo título' })
        .expect(404);

      expect(res.body.error).toContain('Changelog não encontrado');
    });

    it('atualiza changelog e retorna 200 com mensagem', async () => {
      const changelog = await seedChangelog({ title: 'Título original' });

      const res = await request(app.server)
        .patch(`/api/admin/changelogs/${changelog.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Título atualizado' })
        .expect(200);

      expect(res.body.changelog).toBeDefined();
      expect(res.body.message).toContain('sucesso');
    });

    it('atualiza descrição e releaseDate', async () => {
      const changelog = await seedChangelog({ title: 'Test' });
      const novaData = new Date('2025-06-15T00:00:00Z').toISOString();

      const res = await request(app.server)
        .patch(`/api/admin/changelogs/${changelog.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Nova descrição', releaseDate: novaData })
        .expect(200);

      expect(res.body.changelog).toBeDefined();
      expect(res.body.message).toContain('sucesso');
    });
  });

  // ── POST /api/admin/changelogs/:id/publish ────────────────────────────────

  describe('POST /api/admin/changelogs/:id/publish', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/admin/changelogs/00000000-0000-0000-0000-000000000001/publish')
        .expect(401);
    });

    it('retorna 404 para changelog inexistente', async () => {
      const res = await request(app.server)
        .post('/api/admin/changelogs/00000000-0000-0000-0000-000000000001/publish')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Changelog não encontrado');
    });

    it('publica changelog não publicado', async () => {
      const changelog = await seedChangelog({ title: 'Test', isPublished: false });

      const res = await request(app.server)
        .post(`/api/admin/changelogs/${changelog.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.changelog).toBeDefined();
      expect(res.body.message).toContain('sucesso');
    });

    it('retorna 400 ao tentar publicar changelog já publicado', async () => {
      const changelog = await seedChangelog({
        title: 'Test',
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: 'admin@ecotech.com',
      });

      const res = await request(app.server)
        .post(`/api/admin/changelogs/${changelog.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.error).toContain('já está publicado');
    });
  });

  // ── POST /api/admin/changelogs/:id/unpublish ──────────────────────────────

  describe('POST /api/admin/changelogs/:id/unpublish', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/admin/changelogs/00000000-0000-0000-0000-000000000001/unpublish')
        .expect(401);
    });

    it('retorna 404 para changelog inexistente', async () => {
      const res = await request(app.server)
        .post('/api/admin/changelogs/00000000-0000-0000-0000-000000000001/unpublish')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Changelog não encontrado');
    });

    it('despublica changelog publicado', async () => {
      const changelog = await seedChangelog({
        title: 'Test',
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: 'admin@ecotech.com',
      });

      const res = await request(app.server)
        .post(`/api/admin/changelogs/${changelog.id}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.changelog).toBeDefined();
      expect(res.body.message).toContain('sucesso');
    });

    it('retorna 400 ao tentar despublicar changelog já despublicado', async () => {
      const changelog = await seedChangelog({ title: 'Test', isPublished: false });

      const res = await request(app.server)
        .post(`/api/admin/changelogs/${changelog.id}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.error).toContain('já está despublicado');
    });
  });

  // ── DELETE /api/admin/changelogs/:id ──────────────────────────────────────

  describe('DELETE /api/admin/changelogs/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete('/api/admin/changelogs/00000000-0000-0000-0000-000000000001')
        .expect(401);
    });

    it('retorna 404 para changelog inexistente', async () => {
      const res = await request(app.server)
        .delete('/api/admin/changelogs/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Changelog não encontrado');
    });

    it('deleta changelog (soft delete) e seus items', async () => {
      const changelog = await seedChangelog({ title: 'Para deletar' });
      await seedItem(changelog.id, { type: 'feature' as any, title: 'Item', description: 'Desc' });

      const res = await request(app.server)
        .delete(`/api/admin/changelogs/${changelog.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toContain('sucesso');

      // Verificar que o changelog não aparece mais na lista
      const listRes = await request(app.server)
        .get('/api/admin/changelogs')
        .set('Authorization', `Bearer ${adminToken}`);

      const found = listRes.body.changelogs.find((c: any) => c.id === changelog.id);
      expect(found).toBeUndefined();
    });
  });

  // ── POST /api/admin/changelogs/:id/items ──────────────────────────────────

  describe('POST /api/admin/changelogs/:id/items', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/admin/changelogs/00000000-0000-0000-0000-000000000001/items')
        .send({ type: 'feature', title: 'Test', description: 'Desc' })
        .expect(401);
    });

    it('retorna 404 para changelog inexistente', async () => {
      const res = await request(app.server)
        .post('/api/admin/changelogs/00000000-0000-0000-0000-000000000001/items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'feature', title: 'Test', description: 'Desc' })
        .expect(404);

      expect(res.body.error).toContain('Changelog não encontrado');
    });

    it('cria item do tipo feature e retorna 201', async () => {
      const changelog = await seedChangelog({ title: 'Test' });

      const res = await request(app.server)
        .post(`/api/admin/changelogs/${changelog.id}/items`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'feature',
          title: 'Nova funcionalidade',
          description: 'Detalhes da funcionalidade',
        })
        .expect(201);

      expect(res.body.item).toBeDefined();
      expect(res.body.message).toContain('sucesso');
    });

    it('cria item com todos os tipos suportados', async () => {
      const changelog = await seedChangelog({ title: 'Test' });
      const types = ['feature', 'bugfix', 'improvement', 'breaking', 'security', 'documentation'];

      for (const type of types) {
        const res = await request(app.server)
          .post(`/api/admin/changelogs/${changelog.id}/items`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ type, title: `Item ${type}`, description: 'Desc' })
          .expect(201);

        expect(res.body.item).toBeDefined();
      }
    });
  });

  // ── PATCH /api/admin/changelog-items/:id ──────────────────────────────────

  describe('PATCH /api/admin/changelog-items/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/admin/changelog-items/00000000-0000-0000-0000-000000000001')
        .send({ title: 'Novo título' })
        .expect(401);
    });

    it('retorna 404 para item inexistente', async () => {
      const res = await request(app.server)
        .patch('/api/admin/changelog-items/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Novo título' })
        .expect(404);

      expect(res.body.error).toContain('Item não encontrado');
    });

    it('atualiza item de changelog', async () => {
      const changelog = await seedChangelog({ title: 'Test' });
      const item = await seedItem(changelog.id, { type: 'feature' as any, title: 'Título original', description: 'Desc' });

      const res = await request(app.server)
        .patch(`/api/admin/changelog-items/${item.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Título atualizado', description: 'Nova desc' })
        .expect(200);

      expect(res.body.item).toBeDefined();
      expect(res.body.message).toContain('sucesso');
    });
  });

  // ── DELETE /api/admin/changelog-items/:id ─────────────────────────────────

  describe('DELETE /api/admin/changelog-items/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete('/api/admin/changelog-items/00000000-0000-0000-0000-000000000001')
        .expect(401);
    });

    it('retorna 404 para item inexistente', async () => {
      const res = await request(app.server)
        .delete('/api/admin/changelog-items/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toContain('Item não encontrado');
    });

    it('deleta item de changelog (soft delete)', async () => {
      const changelog = await seedChangelog({ title: 'Test' });
      const item = await seedItem(changelog.id, { type: 'bugfix' as any, title: 'Para deletar', description: 'Desc' });

      const res = await request(app.server)
        .delete(`/api/admin/changelog-items/${item.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toContain('sucesso');

      // Verificar que o item não aparece mais no changelog
      const clRes = await request(app.server)
        .get(`/api/admin/changelogs/${changelog.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const found = clRes.body.items.find((i: any) => i.id === item.id);
      expect(found).toBeUndefined();
    });
  });
});
