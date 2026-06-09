import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import { createTestPlano, createTestCorretora } from '../../helpers/factories/corretora.factory';
import { createAdminCargo, createTestUsuario } from '../../helpers/factories/usuario.factory';
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { createTestClientePF } from '../../helpers/factories/cliente.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('GET /api/clientes/:id', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminId: string;
  let adminToken: string;
  let clienteId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();
    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;
    const cargo = await createAdminCargo(corretoraId);
    const admin = await createTestUsuario(corretoraId, cargo.id);
    adminId = admin.id;

    const cliente = await createTestClientePF(corretoraId, adminId);
    clienteId = cliente.id;

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

  it('retorna detalhes do cliente pelo ID', async () => {
    const res = await request(app.server)
      .get(`/api/clientes/${clienteId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(clienteId);
    expect(res.body.data.enderecos).toBeInstanceOf(Array);
    expect(res.body.data.contatos).toBeInstanceOf(Array);
  });

  it('retorna 404 para cliente inexistente', async () => {
    await request(app.server)
      .get('/api/clientes/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('retorna 404 para cliente de outra corretora', async () => {
    const plano2 = await createTestPlano();
    const corretora2 = await createTestCorretora(plano2.id);
    const cargo2 = await createAdminCargo(corretora2.id);
    const user2 = await createTestUsuario(corretora2.id, cargo2.id);
    const clienteOutra = await createTestClientePF(corretora2.id, user2.id);

    // Token do tenant A tentando acessar cliente do tenant B
    await request(app.server)
      .get(`/api/clientes/${clienteOutra.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('retorna 403 quando vendedor tenta acessar cliente de outro vendedor', async () => {
    const cargoVendedor = await createTestCargo(corretoraId, {
      nomeCargo: 'Vendedor',
      isVendedor: true,
      permissoes: ['clientes:visualizar'],
    });
    const outroVendedor = await createTestUsuario(corretoraId, cargoVendedor.id);
    const clienteOutroVendedor = await createTestClientePF(corretoraId, outroVendedor.id);

    const tokenVendedor = generateTestToken(app, {
      sub: outroVendedor.id,
      corretoraId,
      cargoId: cargoVendedor.id,
      isAdmin: false,
      isGestor: false,
      isVendedor: true,
      permissoes: ['clientes:visualizar'],
      nome: outroVendedor.nome,
      email: outroVendedor.email,
      avatarUrl: null,
    });

    // Vendedor A tentando acessar cliente de vendedor B (mesmo tenant)
    const vendedorA = await createTestUsuario(corretoraId, cargoVendedor.id);
    const tokenVendedorA = generateTestToken(app, {
      sub: vendedorA.id,
      corretoraId,
      cargoId: cargoVendedor.id,
      isAdmin: false,
      isGestor: false,
      isVendedor: true,
      permissoes: ['clientes:visualizar'],
      nome: vendedorA.nome,
      email: vendedorA.email,
      avatarUrl: null,
    });

    await request(app.server)
      .get(`/api/clientes/${clienteOutroVendedor.id}`)
      .set('Authorization', `Bearer ${tokenVendedorA}`)
      .expect(403);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server).get(`/api/clientes/${clienteId}`).expect(401);
  });
});
