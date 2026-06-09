import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import { createTestPlano, createTestCorretora } from '../../helpers/factories/corretora.factory';
import { createAdminCargo, createTestUsuario, TEST_PASSWORD } from '../../helpers/factories/usuario.factory';
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('POST /api/usuarios', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, cargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  it('cria usuário com permissão usuarios:criar', async () => {
    const ts = Date.now();
    const res = await request(app.server)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nome: 'Novo Usuário',
        email: `novo.${ts}@corretora.com`,
        senha: TEST_PASSWORD,
        cargoId,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.email).toBe(`novo.${ts}@corretora.com`);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .post('/api/usuarios')
      .send({ nome: 'X', email: 'x@x.com', senha: TEST_PASSWORD })
      .expect(401);
  });

  it('retorna 403 sem permissão usuarios:criar', async () => {
    const cargo = await createTestCargo(corretoraId, {
      permissoes: ['clientes:visualizar'],
    });
    const usuario = await createTestUsuario(corretoraId, cargo.id);
    const tokenSemPermissao = generateTestToken(app, {
      sub: usuario.id,
      corretoraId,
      cargoId: cargo.id,
      isAdmin: false,
      isGestor: false,
      isVendedor: false,
      permissoes: ['clientes:visualizar'],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });

    await request(app.server)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenSemPermissao}`)
      .send({ nome: 'Y', email: 'y@y.com', senha: TEST_PASSWORD })
      .expect(403);
  });

  it('retorna 409 quando email já existe na corretora', async () => {
    const ts = Date.now();
    const email = `duplicado.${ts}@corretora.com`;
    await createTestUsuario(corretoraId, cargoId, { email });

    await request(app.server)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Dup', email, senha: TEST_PASSWORD, cargoId })
      .expect(409);
  });
});
