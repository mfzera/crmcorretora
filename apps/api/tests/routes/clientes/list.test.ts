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
import { createTestClientePF } from '../../helpers/factories/cliente.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('GET /api/clientes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminId: string;
  let adminToken: string;

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
      permissoes: ['clientes:visualizar_todos'],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  it('retorna clientes da corretora paginados', async () => {
    await createTestClientePF(corretoraId, adminId);
    await createTestClientePF(corretoraId, adminId);

    const res = await request(app.server)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('não expõe clientes do tenant A para token do tenant B', async () => {
    const clienteA = await createTestClientePF(corretoraId, adminId);

    // Tenant B — totalmente separado
    const planoB = await createTestPlano();
    const corretoraB = await createTestCorretora(planoB.id);
    const cargoB = await createAdminCargo(corretoraB.id);
    const userB = await createTestUsuario(corretoraB.id, cargoB.id);
    const tokenB = generateTestToken(app, {
      sub: userB.id,
      corretoraId: corretoraB.id,
      cargoId: cargoB.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: ['clientes:visualizar_todos'],
      nome: userB.nome,
      email: userB.email,
      avatarUrl: null,
    });

    const res = await request(app.server)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const ids = res.body.data.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(clienteA.id);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server).get('/api/clientes').expect(401);
  });
});
