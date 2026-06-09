import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { buildTestApp } from '../helpers/app.helper';

describe('GET /health', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  it('retorna 200 com status ok', async () => {
    const res = await request(app.server).get('/health').expect(200);

    expect(res.body).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
    });
  });

  it('retorna 404 para rotas desconhecidas', async () => {
    const res = await request(app.server).get('/rota-inexistente').expect(404);

    expect(res.body.success).toBe(false);
  });
});
