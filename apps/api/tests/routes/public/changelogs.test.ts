import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { changelogs, changelogItems } from '@ecotech/shared/database';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import { sql } from 'drizzle-orm';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createChangelog(overrides: Record<string, unknown> = {}) {
  const [changelog] = await db
    .insert(changelogs)
    .values({
      version: `v${Date.now()}`,
      title: 'Release Teste',
      releaseDate: new Date('2026-01-01'),
      isPublished: true,
      publishedAt: new Date(),
      ...overrides,
    })
    .returning();
  return changelog;
}

async function createChangelogItem(changelogId: string) {
  const [item] = await db
    .insert(changelogItems)
    .values({
      changelogId,
      type: 'feature',
      title: 'Nova Funcionalidade',
      description: 'Descrição da nova funcionalidade',
      order: '1',
    })
    .returning();
  return item;
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('/api/public', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeAll(async () => {
    await cleanDatabase();
    // changelogs/changelog_items are not truncated by cleanDatabase (reference data),
    // so we truncate them manually here
    await db.execute(sql`TRUNCATE TABLE changelog_items, changelogs RESTART IDENTITY CASCADE`);
  });

  // ── GET /api/public/changelogs ────────────────────────────────────────────

  describe('GET /api/public/changelogs', () => {
    beforeEach(async () => {
      await db.execute(sql`TRUNCATE TABLE changelog_items, changelogs RESTART IDENTITY CASCADE`);
    });

    it('é acessível sem autenticação', async () => {
      const res = await request(app.server)
        .get('/api/public/changelogs')
        .expect(200);

      expect(res.body.changelogs).toBeDefined();
      expect(Array.isArray(res.body.changelogs)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    });

    it('retorna lista vazia quando não há changelogs publicados', async () => {
      const res = await request(app.server)
        .get('/api/public/changelogs')
        .expect(200);

      expect(res.body.changelogs).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('retorna apenas changelogs publicados', async () => {
      await createChangelog({ isPublished: true });
      await createChangelog({
        isPublished: false,
        version: `v-draft-${Date.now()}`,
      });

      const res = await request(app.server)
        .get('/api/public/changelogs')
        .expect(200);

      expect(res.body.changelogs).toHaveLength(1);
      expect(res.body.total).toBe(1);
    });

    it('retorna changelog com seus items', async () => {
      const changelog = await createChangelog();
      await createChangelogItem(changelog.id);

      const res = await request(app.server)
        .get('/api/public/changelogs')
        .expect(200);

      expect(res.body.changelogs).toHaveLength(1);
      const cl = res.body.changelogs[0];
      expect(cl.id).toBe(changelog.id);
      expect(cl.version).toBe(changelog.version);
      expect(cl.items).toHaveLength(1);
      expect(cl.items[0].type).toBe('feature');
      expect(cl.items[0].title).toBe('Nova Funcionalidade');
    });

    it('retorna múltiplos changelogs ordenados por data de lançamento', async () => {
      await createChangelog({
        version: 'v1.0.0',
        releaseDate: new Date('2025-01-01'),
        publishedAt: new Date('2025-01-01'),
      });
      await createChangelog({
        version: 'v2.0.0',
        releaseDate: new Date('2026-01-01'),
        publishedAt: new Date('2026-01-01'),
      });

      const res = await request(app.server)
        .get('/api/public/changelogs')
        .expect(200);

      expect(res.body.changelogs).toHaveLength(2);
      // Mais recente primeiro
      expect(res.body.changelogs[0].version).toBe('v2.0.0');
      expect(res.body.changelogs[1].version).toBe('v1.0.0');
    });

    it('não retorna changelogs deletados', async () => {
      await createChangelog({ deletedAt: new Date() });

      const res = await request(app.server)
        .get('/api/public/changelogs')
        .expect(200);

      expect(res.body.changelogs).toHaveLength(0);
    });

    it('estrutura correta do changelog', async () => {
      const changelog = await createChangelog({
        description: 'Descrição da versão',
      });

      const res = await request(app.server)
        .get('/api/public/changelogs')
        .expect(200);

      const cl = res.body.changelogs[0];
      expect(cl).toHaveProperty('id');
      expect(cl).toHaveProperty('version');
      expect(cl).toHaveProperty('title');
      expect(cl).toHaveProperty('description');
      expect(cl).toHaveProperty('releaseDate');
      expect(cl).toHaveProperty('publishedAt');
      expect(cl).toHaveProperty('items');
      expect(Array.isArray(cl.items)).toBe(true);
    });
  });
});
