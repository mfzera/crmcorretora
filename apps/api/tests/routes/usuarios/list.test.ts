import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import {
  createTestPlano,
  createTestCorretora,
} from '../../helpers/factories/corretora.factory';
import {
  createAdminCargo,
  createTestUsuario,
} from '../../helpers/factories/usuario.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('GET /api/usuarios', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    const admin = await createTestUsuario(corretoraId, cargo.id);
    adminId = admin.id;

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  it('retorna lista paginada de usuários da corretora', async () => {
    const res = await request(app.server)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    const ids = res.body.data.map((u: { id: string }) => u.id);
    expect(ids).toContain(adminId);
  });

  it('não retorna usuários de outra corretora', async () => {
    const plano2 = await createTestPlano();
    const corretora2 = await createTestCorretora(plano2.id);
    const cargo2 = await createAdminCargo(corretora2.id);
    const outroUsuario = await createTestUsuario(corretora2.id, cargo2.id);

    const res = await request(app.server)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const ids = res.body.data.map((u: { id: string }) => u.id);
    expect(ids).not.toContain(outroUsuario.id);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server).get('/api/usuarios').expect(401);
  });
});
