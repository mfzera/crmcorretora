/**
 * Testes complementares para cobrir linhas específicas de admin/changelogs.ts:
 * - Linhas 75-79: branch publishedById na listagem GET /changelogs (consulta nome do admin)
 * - Linhas 172-176: branch publishedById em GET /changelogs/:id
 * - Linhas 275-279: catch de erro 23505 (versão duplicada) em POST /changelogs
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import { changelogs, admins } from '@ecotech/shared/database';
import * as sharedDatabase from '@ecotech/shared/database';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';

describe('/api/admin/changelogs — cobertura complementar', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminToken: string;
  let adminId: string;
  let versionCounter = 900;

  function nextVersion() {
    versionCounter++;
    return `${versionCounter}.0.0`;
  }

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();

    const createRes = await request(app.server)
      .post('/api/admin/auth/create-first-admin')
      .send({
        email: 'changelog-cov@ecotech.com',
        nome: 'Admin Changelog Cov',
        senha: 'senha12345',
      });

    adminId = createRes.body.admin.id;

    const loginRes = await request(app.server)
      .post('/api/admin/auth/login')
      .send({ email: 'changelog-cov@ecotech.com', senha: 'senha12345' });

    adminToken = loginRes.body.token;
  });

  // Linhas 75-79: publishedById definido na listagem — consulta o nome do admin no DB
  it('GET /changelogs inclui publishedBy quando publishedById está definido (linhas 75-79)', async () => {
    const version = nextVersion();

    // Inserir changelog com publishedById apontando para o admin real
    await db.insert(changelogs).values({
      version,
      title: 'Changelog com publicador',
      releaseDate: new Date(),
      isPublished: true,
      publishedAt: new Date(),
      publishedById: adminId,
    });

    const res = await request(app.server)
      .get('/api/admin/changelogs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const found = res.body.changelogs.find((c: any) => c.version === version);
    expect(found).toBeDefined();
    // publishedBy deve ser o nome do admin (branch db.select() executado)
    expect(found.publishedBy).toBe('Admin Changelog Cov');
  });

  // Linhas 172-176: publishedById definido em GET /changelogs/:id
  it('GET /changelogs/:id inclui publishedBy quando publishedById está definido (linhas 172-176)', async () => {
    const version = nextVersion();

    const [changelog] = await db
      .insert(changelogs)
      .values({
        version,
        title: 'Changelog único com publicador',
        releaseDate: new Date(),
        isPublished: true,
        publishedAt: new Date(),
        publishedById: adminId,
      })
      .returning();

    const res = await request(app.server)
      .get(`/api/admin/changelogs/${changelog.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(changelog.id);
    // publishedBy deve ser o nome do admin (branch db.select() executado)
    expect(res.body.publishedBy).toBe('Admin Changelog Cov');
  });

  // Linhas 275-279: catch de erro 23505 — versão duplicada no POST /changelogs
  it('POST /changelogs retorna 400 para versão duplicada (linhas 275-279)', async () => {
    const version = nextVersion();

    // Criar o primeiro changelog com essa versão
    await request(app.server)
      .post('/api/admin/changelogs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version, title: 'Primeiro', releaseDate: new Date().toISOString() })
      .expect(201);

    // Tentar criar outro changelog com a mesma versão — deve retornar 400
    const res = await request(app.server)
      .post('/api/admin/changelogs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version, title: 'Duplicado', releaseDate: new Date().toISOString() })
      .expect(400);

    expect(res.body.error).toContain(version);
  });

  // Linhas 278-279: throw err para erros não-23505 no POST /changelogs
  it('POST /changelogs relança erros não-23505 (linhas 278-279)', async () => {
    const version = nextVersion();

    const dbSpy = vi.spyOn(sharedDatabase.db, 'insert').mockImplementationOnce(() => {
      throw new Error('DB connection error');
    });

    const res = await request(app.server)
      .post('/api/admin/changelogs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version, title: 'Erro genérico', releaseDate: new Date().toISOString() })
      .expect(500);

    expect(res.body).toBeDefined();
    dbSpy.mockRestore();
  });
});
