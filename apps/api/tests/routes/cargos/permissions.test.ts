import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import { permissoesGlobais } from '@ecotech/shared/database';
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
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('GET /api/cargos/:id', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminCargoId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    adminCargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, adminCargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: adminCargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  it('retorna detalhes do cargo com permissões', async () => {
    const res = await request(app.server)
      .get(`/api/cargos/${adminCargoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(adminCargoId);
    expect(res.body.data.permissoes).toBeInstanceOf(Array);
  });

  it('retorna 404 para cargo inexistente', async () => {
    await request(app.server)
      .get('/api/cargos/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .get(`/api/cargos/${adminCargoId}`)
      .expect(401);
  });
});

describe('PATCH /api/cargos/:id', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminCargoId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    adminCargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, adminCargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: adminCargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  it('atualiza cargo não-admin', async () => {
    const cargo = await createTestCargo(corretoraId, { nomeCargo: 'Cargo Editável' });

    const res = await request(app.server)
      .patch(`/api/cargos/${cargo.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nomeCargo: 'Cargo Renomeado', isVendedor: true })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.nomeCargo).toBe('Cargo Renomeado');
  });

  it('retorna 400 ao tentar editar cargo admin', async () => {
    await request(app.server)
      .patch(`/api/cargos/${adminCargoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nomeCargo: 'Tentativa' })
      .expect(400);
  });

  it('retorna 409 ao renomear para nome já existente', async () => {
    await createTestCargo(corretoraId, { nomeCargo: 'Nome Existente' });
    const cargo2 = await createTestCargo(corretoraId, { nomeCargo: 'Outro Cargo' });

    await request(app.server)
      .patch(`/api/cargos/${cargo2.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nomeCargo: 'Nome Existente' })
      .expect(409);
  });

  it('retorna 404 para cargo inexistente', async () => {
    await request(app.server)
      .patch('/api/cargos/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nomeCargo: 'XX' })
      .expect(404);
  });
});

describe('PATCH /api/cargos/:id/cor', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminCargoId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    adminCargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, adminCargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: adminCargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  it('atualiza cor do cargo (incluso admin)', async () => {
    const res = await request(app.server)
      .patch(`/api/cargos/${adminCargoId}/cor`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cor: '#FF5733' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.cor).toBe('#FF5733');
  });
});

describe('POST /api/cargos/:id/permissoes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminCargoId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    adminCargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, adminCargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: adminCargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  it('atribui permissões ao cargo', async () => {
    const cargo = await createTestCargo(corretoraId, { nomeCargo: 'Cargo Permissoes' });
    const perms = await db.select().from(permissoesGlobais).limit(3);
    const permissaoIds = perms.map((p) => p.id);

    const res = await request(app.server)
      .post(`/api/cargos/${cargo.id}/permissoes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permissaoIds })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('retorna 400 ao tentar modificar permissões do admin', async () => {
    // A verificação de isAdmin ocorre antes da validação de permissões,
    // então podemos enviar array vazio e ainda assim receber 400
    await request(app.server)
      .post(`/api/cargos/${adminCargoId}/permissoes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permissaoIds: [] })
      .expect(400);
  });

  it('retorna 404 para cargo inexistente', async () => {
    await request(app.server)
      .post('/api/cargos/00000000-0000-0000-0000-000000000000/permissoes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permissaoIds: [] })
      .expect(404);
  });
});

describe('GET /api/cargos/permissoes/disponiveis', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    const cargo = await createAdminCargo(corretora.id);
    const admin = await createTestUsuario(corretora.id, cargo.id);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId: corretora.id,
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

  it('lista permissões disponíveis agrupadas', async () => {
    const res = await request(app.server)
      .get('/api/cargos/permissoes/disponiveis')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    // Should be an object with groups as keys
    expect(typeof res.body.data).toBe('object');
  });
});

describe('GET /api/cargos/templates', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    const cargo = await createAdminCargo(corretora.id);
    const admin = await createTestUsuario(corretora.id, cargo.id);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId: corretora.id,
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

  it('lista templates de cargo', async () => {
    const res = await request(app.server)
      .get('/api/cargos/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .get('/api/cargos/templates')
      .expect(401);
  });
});

describe('POST /api/cargos/:id/duplicate', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminCargoId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    adminCargoId = cargo.id;
    const admin = await createTestUsuario(corretoraId, adminCargoId);

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: adminCargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  it('duplica cargo com novo nome', async () => {
    const cargo = await createTestCargo(corretoraId, {
      nomeCargo: 'Original',
      permissoes: ['clientes:visualizar'],
    });

    const res = await request(app.server)
      .post(`/api/cargos/${cargo.id}/duplicate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nomeCargo: 'Cópia do Original' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.nomeCargo).toBe('Cópia do Original');
  });

  it('retorna 400 ao tentar duplicar cargo admin', async () => {
    await request(app.server)
      .post(`/api/cargos/${adminCargoId}/duplicate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nomeCargo: 'Cópia Admin' })
      .expect(400);
  });

  it('retorna 409 para nome já existente', async () => {
    const cargo = await createTestCargo(corretoraId, { nomeCargo: 'Para Duplicar' });
    await createTestCargo(corretoraId, { nomeCargo: 'Nome Conflito' });

    await request(app.server)
      .post(`/api/cargos/${cargo.id}/duplicate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nomeCargo: 'Nome Conflito' })
      .expect(409);
  });
});
