import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import { roadmapPhases, roadmapItems, corretoras, changelogs, admins } from '@ecotech/shared/database';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import {
  createTestPlano,
  createTestCorretora,
} from '../../helpers/factories/corretora.factory';

describe('Public routes — coverage', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let subdominio: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    subdominio = corretora.subdominio;
  });

  // ── GET /api/public/corretora ──────────────────────────────────────────────

  describe('GET /api/public/corretora', () => {
    it('retorna dados da corretora por subdominio', async () => {
      const res = await request(app.server)
        .get(`/api/public/corretora?subdominio=${subdominio}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.razaoSocial).toBeDefined();
    });

    it('retorna 404 para subdominio inexistente', async () => {
      const res = await request(app.server)
        .get('/api/public/corretora?subdominio=naoexiste999')
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('retorna 404 para corretora inativa', async () => {
      const { eq } = await import('drizzle-orm');
      const plano = await createTestPlano();
      const corretoraInativa = await createTestCorretora(plano.id);

      await db
        .update(corretoras)
        .set({ status: 'INATIVO' })
        .where(eq(corretoras.id, corretoraInativa.id));

      const res = await request(app.server)
        .get(`/api/public/corretora?subdominio=${corretoraInativa.subdominio}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/public/roadmap/phases ─────────────────────────────────────────

  describe('GET /api/public/roadmap/phases', () => {
    it('retorna lista vazia quando nao ha fases publicadas', async () => {
      const res = await request(app.server)
        .get('/api/public/roadmap/phases')
        .expect(200);

      expect(res.body.phases).toBeDefined();
      expect(res.body.total).toBeDefined();
    });

    it('retorna fases publicadas com itens', async () => {
      const [phase] = await db
        .insert(roadmapPhases)
        .values({
          name: 'Phase Teste',
          estimatedDate: '2026-06',
          isPublished: true,
          publishedAt: new Date(),
          order: '1',
        })
        .returning();

      await db.insert(roadmapItems).values({
        phaseId: phase.id,
        title: 'Item Teste',
        description: 'Descricao teste',
        status: 'planned',
        order: '1',
      });

      const res = await request(app.server)
        .get('/api/public/roadmap/phases')
        .expect(200);

      expect(res.body.phases.length).toBeGreaterThanOrEqual(1);
      const found = res.body.phases.find((p: any) => p.id === phase.id);
      expect(found).toBeDefined();
      expect(found.items.length).toBeGreaterThanOrEqual(1);
    });

    it('não retorna fases não publicadas', async () => {
      const [unpublished] = await db
        .insert(roadmapPhases)
        .values({
          name: 'Phase Nao Publicada',
          estimatedDate: '2026-07',
          isPublished: false,
          order: '2',
        })
        .returning();

      const res = await request(app.server)
        .get('/api/public/roadmap/phases')
        .expect(200);

      const found = res.body.phases.find((p: any) => p.id === unpublished.id);
      expect(found).toBeUndefined();
    });
  });

  // ── GET /api/public/changelogs — branch publishedById (linhas 83-87) ───────

  describe('GET /api/public/changelogs — branch publishedById', () => {
    it('retorna publishedBy com nome do admin quando publishedById está definido (linhas 83-87)', async () => {
      // Criar um admin para usar como publishedById
      const [admin] = await db
        .insert(admins)
        .values({
          email: `public-changelog-admin-${Date.now()}@ecotech.com`,
          senha: '$2b$10$hashedpassword',
          nome: 'Admin Publicador',
        })
        .returning();

      const version = `999.${Date.now()}.0`;

      await db.insert(changelogs).values({
        version,
        title: 'Changelog Público com Publicador',
        releaseDate: new Date(),
        isPublished: true,
        publishedAt: new Date(),
        publishedById: admin.id,
      });

      const res = await request(app.server)
        .get('/api/public/changelogs')
        .expect(200);

      const found = res.body.changelogs.find((c: any) => c.version === version);
      expect(found).toBeDefined();
      // publishedBy deve ser o nome do admin (branch db.select() executado)
      expect(found.publishedBy).toBe('Admin Publicador');
    });
  });
});
