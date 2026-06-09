import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import { createTestPlano, createTestCorretora } from '../../helpers/factories/corretora.factory';
import { createAdminCargo, createTestUsuario } from '../../helpers/factories/usuario.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('DELETE /api/usuarios/:id', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let cargoId: string;
  let adminId: string;
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
    adminId = admin.id;
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

  it('realiza soft delete de outro usuário', async () => {
    const res = await request(app.server)
      .delete(`/api/usuarios/${outroUsuarioId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('impede que usuário exclua a si mesmo', async () => {
    await request(app.server)
      .delete(`/api/usuarios/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('retorna 404 para usuário inexistente', async () => {
    await request(app.server)
      .delete('/api/usuarios/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .delete(`/api/usuarios/${outroUsuarioId}`)
      .expect(401);
  });
});
