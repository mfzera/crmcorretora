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
  TEST_PASSWORD,
} from '../../helpers/factories/usuario.factory';
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('GET /api/usuarios/:id', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminId: string;
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
    adminId = admin.id;

    adminToken = generateTestToken(app, {
      sub: adminId,
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

  it('retorna detalhes do usuário por ID', async () => {
    const res = await request(app.server)
      .get(`/api/usuarios/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(adminId);
    expect(res.body.data.nome).toBeDefined();
    expect(res.body.data.email).toBeDefined();
  });

  it('retorna 404 para usuário inexistente', async () => {
    await request(app.server)
      .get('/api/usuarios/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .get(`/api/usuarios/${adminId}`)
      .expect(401);
  });
});

describe('GET /api/usuarios/vendedores', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    const admin = await createTestUsuario(corretoraId, cargo.id);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: ['usuarios:visualizar'],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  it('lista vendedores ativos', async () => {
    const res = await request(app.server)
      .get('/api/usuarios/vendedores')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .get('/api/usuarios/vendedores')
      .expect(401);
  });
});

describe('POST /api/usuarios/:id/atribuir-cargo', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminToken: string;
  let outroUsuarioId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, cargoId);
    const outro = await createTestUsuario(corretoraId, cargoId);
    outroUsuarioId = outro.id;

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

  it('atribui cargo ao usuário', async () => {
    const novoCargo = await createTestCargo(corretoraId, { nomeCargo: 'Vendedor Junior' });

    const res = await request(app.server)
      .post(`/api/usuarios/${outroUsuarioId}/atribuir-cargo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cargoId: novoCargo.id })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('retorna 404 para cargo inexistente', async () => {
    await request(app.server)
      .post(`/api/usuarios/${outroUsuarioId}/atribuir-cargo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cargoId: '00000000-0000-0000-0000-000000000000' })
      .expect(404);
  });

  it('retorna 404 para usuário inexistente', async () => {
    await request(app.server)
      .post('/api/usuarios/00000000-0000-0000-0000-000000000000/atribuir-cargo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cargoId })
      .expect(404);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .post(`/api/usuarios/${outroUsuarioId}/atribuir-cargo`)
      .send({ cargoId })
      .expect(401);
  });
});

describe('POST /api/usuarios/:id/resetar-senha', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminToken: string;
  let outroUsuarioId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    cargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, cargoId);
    const outro = await createTestUsuario(corretoraId, cargoId);
    outroUsuarioId = outro.id;

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

  it('reseta senha do usuário', async () => {
    const res = await request(app.server)
      .post(`/api/usuarios/${outroUsuarioId}/resetar-senha`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ novaSenha: 'NovaSenha@456' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('retorna 404 para usuário inexistente', async () => {
    await request(app.server)
      .post('/api/usuarios/00000000-0000-0000-0000-000000000000/resetar-senha')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ novaSenha: 'NovaSenha@456' })
      .expect(404);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .post(`/api/usuarios/${outroUsuarioId}/resetar-senha`)
      .send({ novaSenha: 'NovaSenha@456' })
      .expect(401);
  });
});
