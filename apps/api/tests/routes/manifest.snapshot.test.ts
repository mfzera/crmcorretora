/**
 * Snapshot test do manifesto de permissões.
 *
 * Qualquer mudança intencional de rota/permissão deve ser acompanhada de
 * uma atualização deste snapshot via `vitest --update-snapshots`.
 * Se o snapshot quebrar inesperadamente, revisar se alguma rota foi removida
 * ou se uma permissão foi alterada sem intenção.
 */

import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { buildTestApp } from '../helpers/app.helper';

describe('GET /api/_manifest/permissions', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  it('retorna 200 com estrutura correta', async () => {
    const res = await request(app.server)
      .get('/api/_manifest/permissions')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.routes)).toBe(true);
    expect(res.body.data.routes.length).toBeGreaterThan(0);

    // Valida shape de cada entrada
    for (const entry of res.body.data.routes) {
      expect(entry).toMatchObject({
        method: expect.any(String),
        path: expect.any(String),
        permissions: expect.any(Array),
        mode: expect.stringMatching(/^(all|any)$/),
      });
    }
  });

  it('snapshot das rotas protegidas — atualizar intencionalmente com --update-snapshots', async () => {
    const res = await request(app.server)
      .get('/api/_manifest/permissions')
      .expect(200);

    const routes = (res.body.data.routes as Array<{ method: string; path: string; permissions: string[]; mode: string }>)
      .sort((a, b) => `${a.method}${a.path}`.localeCompare(`${b.method}${b.path}`))
      .map(({ method, path, permissions, mode }) => ({ method, path, permissions: [...permissions].sort(), mode }));

    expect(routes).toMatchSnapshot();
  });

  it('suporta ETag — retorna 304 na segunda request com mesmo ETag', async () => {
    const first = await request(app.server)
      .get('/api/_manifest/permissions')
      .expect(200);

    const etag = first.headers['etag'];
    expect(etag).toBeTruthy();

    await request(app.server)
      .get('/api/_manifest/permissions')
      .set('If-None-Match', etag)
      .expect(304);
  });
});
