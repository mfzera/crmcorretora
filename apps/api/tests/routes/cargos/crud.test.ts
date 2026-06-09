import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import { createTestPlano, createTestCorretora } from '../../helpers/factories/corretora.factory';
import { createAdminCargo, createTestUsuario } from '../../helpers/factories/usuario.factory';
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('CRUD /api/cargos', () => {
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

  describe('POST /api/cargos', () => {
    it('cria cargo com sucesso', async () => {
      const res = await request(app.server)
        .post('/api/cargos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeCargo: 'Vendedor Sênior', isGestor: false, isVendedor: true })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.nomeCargo).toBe('Vendedor Sênior');
      expect(res.body.data.isVendedor).toBe(true);
    });

    it('retorna 409 para nome de cargo duplicado', async () => {
      await request(app.server)
        .post('/api/cargos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeCargo: 'Duplicado', isGestor: false, isVendedor: false })
        .expect(201);

      await request(app.server)
        .post('/api/cargos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeCargo: 'Duplicado', isGestor: false, isVendedor: false })
        .expect(409);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/cargos')
        .send({ nomeCargo: 'X' })
        .expect(401);
    });
  });

  describe('GET /api/cargos', () => {
    it('lista cargos da corretora', async () => {
      const res = await request(app.server)
        .get('/api/cargos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      const nomes = res.body.data.map((c: { nomeCargo: string }) => c.nomeCargo);
      expect(nomes).toContain('Administrador');
    });

    it('não expõe cargos de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargoOutra = await createTestCargo(corretora2.id, { nomeCargo: 'Exclusivo Outra' });

      const res = await request(app.server)
        .get('/api/cargos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const nomes = res.body.data.map((c: { nomeCargo: string }) => c.nomeCargo);
      expect(nomes).not.toContain(cargoOutra.nomeCargo);
    });
  });

  describe('DELETE /api/cargos/:id', () => {
    it('exclui cargo sem usuários vinculados', async () => {
      const cargo = await createTestCargo(corretoraId, { nomeCargo: 'Para Excluir' });

      const res = await request(app.server)
        .delete(`/api/cargos/${cargo.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('impede exclusão do cargo admin', async () => {
      await request(app.server)
        .delete(`/api/cargos/${adminCargoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('impede exclusão de cargo com usuários vinculados', async () => {
      const cargo = await createTestCargo(corretoraId, { nomeCargo: 'Com Usuário' });
      await createTestUsuario(corretoraId, cargo.id);

      await request(app.server)
        .delete(`/api/cargos/${cargo.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('retorna 404 para cargo inexistente', async () => {
      await request(app.server)
        .delete('/api/cargos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
