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

describe('PATCH /api/usuarios/:id', () => {
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

  it('atualiza nome do usuário', async () => {
    const res = await request(app.server)
      .patch(`/api/usuarios/${outroUsuarioId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'Nome Atualizado' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.nome).toBe('Nome Atualizado');
  });

  it('retorna 4xx para usuário inexistente', async () => {
    const res = await request(app.server)
      .patch('/api/usuarios/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nome: 'X' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .patch(`/api/usuarios/${outroUsuarioId}`)
      .send({ nome: 'X' })
      .expect(401);
  });
});
