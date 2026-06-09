import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import { createTestPlano, createTestCorretora } from '../../helpers/factories/corretora.factory';
import { createAdminCargo, createTestUsuario, TEST_PASSWORD } from '../../helpers/factories/usuario.factory';

describe('POST /api/auth/login', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminEmail: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    const cargo = await createAdminCargo(corretora.id);
    const usuario = await createTestUsuario(corretora.id, cargo.id);
    adminEmail = usuario.email;
  });

  it('retorna token com credenciais válidas', async () => {
    const res = await request(app.server)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: TEST_PASSWORD })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    expect(res.body.data.usuario.email).toBe(adminEmail);
  });

  it('retorna 401 com senha incorreta', async () => {
    const res = await request(app.server)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'senha-errada' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('retorna 401 para email inexistente', async () => {
    await request(app.server)
      .post('/api/auth/login')
      .send({ email: 'ninguem@inexistente.com', password: TEST_PASSWORD })
      .expect(401);
  });

  it('retorna 401 para usuário inativo', async () => {
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    const cargo = await createAdminCargo(corretora.id);
    const inativo = await createTestUsuario(corretora.id, cargo.id, { ativo: false });

    await request(app.server)
      .post('/api/auth/login')
      .send({ email: inativo.email, password: TEST_PASSWORD })
      .expect(401);
  });

  it('retorna 400 quando recaptchaToken é fornecido mas falha na verificação', async () => {
    const originalKey = process.env['RECAPTCHA_SECRET_KEY'];
    process.env['RECAPTCHA_SECRET_KEY'] = 'test-secret-key';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: false }),
    } as Response);

    try {
      const res = await request(app.server)
        .post('/api/auth/login')
        .send({ email: adminEmail, password: TEST_PASSWORD, recaptchaToken: 'invalid-token' })
        .expect(400);

      expect(res.body.error).toContain('Verificação de segurança');
    } finally {
      process.env['RECAPTCHA_SECRET_KEY'] = originalKey;
      fetchSpy.mockRestore();
    }
  });
});
