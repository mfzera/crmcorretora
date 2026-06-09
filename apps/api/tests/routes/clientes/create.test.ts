import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { clientes } from '@ecotech/shared/database';
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

describe('POST /api/clientes', () => {
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
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  beforeEach(async () => {
    await db.delete(clientes);
  });

  it('cria cliente PF com CPF válido', async () => {
    const res = await request(app.server)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipoPessoa: 'PF',
        nome: 'João da Silva',
        cpf: '52998224725', // CPF válido sem formatação (11 dígitos)
        email: 'joao@exemplo.com',
        vendedorId: adminId,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.nome).toBe('João da Silva');
  });

  it('retorna 400 para CPF inválido', async () => {
    await request(app.server)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipoPessoa: 'PF',
        nome: 'Inválido',
        cpf: '00000000000', // CPF com dígitos inválidos
        vendedorId: adminId,
      })
      .expect(400);
  });

  it('retorna 409 para CPF duplicado na corretora', async () => {
    const cpf = '52998224725'; // CPF válido sem formatação

    await request(app.server)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tipoPessoa: 'PF', nome: 'Primeiro', cpf, vendedorId: adminId })
      .expect(201);

    await request(app.server)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tipoPessoa: 'PF', nome: 'Segundo', cpf, vendedorId: adminId })
      .expect(409);
  });

  it('cria cliente PJ com CNPJ válido', async () => {
    const res = await request(app.server)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipoPessoa: 'PJ',
        razaoSocial: 'Empresa LTDA',
        cnpj: '11222333000181', // CNPJ válido sem formatação (14 dígitos)
        vendedorId: adminId,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.razaoSocial).toBe('Empresa LTDA');
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .post('/api/clientes')
      .send({ tipoPessoa: 'PF', nome: 'X', cpf: '000', vendedorId: adminId })
      .expect(401);
  });
});
