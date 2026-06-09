import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import { equipes } from '@ecotech/shared/database';
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

describe('/api/equipes — coverage', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminId: string;
  let adminToken: string;
  let vendedorToken: string;
  let vendedorId: string;

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
      isGestor: true,
      isVendedor: false,
      permissoes: ['equipes:visualizar'],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    const cargoVendedor = await createTestCargo(corretoraId, {
      isVendedor: true,
      permissoes: ['equipes:visualizar'],
    });
    const vendedor = await createTestUsuario(corretoraId, cargoVendedor.id);
    vendedorId = vendedor.id;

    vendedorToken = generateTestToken(app, {
      sub: vendedor.id,
      corretoraId,
      cargoId: cargoVendedor.id,
      isAdmin: false,
      isGestor: false,
      isVendedor: true,
      permissoes: [],
      nome: vendedor.nome,
      email: vendedor.email,
      avatarUrl: null,
    });
  });

  // ── POST /api/equipes ─────────────────────────────────────────────────────

  describe('POST /api/equipes', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/equipes')
        .send({ nome: 'Equipe Teste' })
        .expect(401);
    });

    it('retorna 403 para nao-admin', async () => {
      await request(app.server)
        .post('/api/equipes')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ nome: 'Equipe Teste' })
        .expect(403);
    });

    it('cria equipe sem gestor', async () => {
      const res = await request(app.server)
        .post('/api/equipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Equipe Sem Gestor' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.nome).toBe('Equipe Sem Gestor');
    });

    it('cria equipe com gestor', async () => {
      const res = await request(app.server)
        .post('/api/equipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Equipe Com Gestor', gestorId: adminId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.gestorId).toBe(adminId);
    });

    it('retorna 400 para gestor inexistente', async () => {
      const res = await request(app.server)
        .post('/api/equipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Equipe Invalida', gestorId: '00000000-0000-0000-0000-000000000000' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/equipes ──────────────────────────────────────────────────────

  describe('GET /api/equipes', () => {
    it('retorna lista de equipes', async () => {
      const res = await request(app.server)
        .get('/api/equipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('filtra por search', async () => {
      const res = await request(app.server)
        .get('/api/equipes?search=Sem Gestor')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('filtra por ativo', async () => {
      const res = await request(app.server)
        .get('/api/equipes?ativo=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('usuario nao-admin/nao-gestor só vê equipes onde é gestor (scope filter)', async () => {
      // Criar um usuário regular (não admin, não gestor)
      const cargoRegular = await createTestCargo(corretoraId, {
        isVendedor: true,
        permissoes: ['equipes:visualizar'],
      });
      const regularUser = await createTestUsuario(corretoraId, cargoRegular.id);
      const regularUserId = regularUser.id;

      const regularToken = generateTestToken(app, {
        sub: regularUserId,
        corretoraId,
        cargoId: cargoRegular.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['equipes:visualizar'],
        nome: regularUser.nome,
        email: regularUser.email,
        avatarUrl: null,
      });

      // Criar equipe onde regularUser é o gestor
      const [equipeDoUsuario] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Equipe Do Regular', gestorId: regularUserId })
        .returning();

      // Criar outra equipe com gestor diferente (admin)
      const [equipeDeOutro] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Equipe De Outro Gestor', gestorId: adminId })
        .returning();

      const res = await request(app.server)
        .get('/api/equipes')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((e: any) => e.id);
      expect(ids).toContain(equipeDoUsuario.id);
      expect(ids).not.toContain(equipeDeOutro.id);
    });

    it('retorna avatarUrl no gestor quando membro tem avatarR2Key', async () => {
      // Criar usuário com avatarR2Key definido
      const cargoGestor = await createTestCargo(corretoraId, {
        isVendedor: true,
        permissoes: ['equipes:visualizar'],
      });
      const gestorComAvatar = await createTestUsuario(corretoraId, cargoGestor.id, {
        avatarR2Key: 'avatars/gestor-avatar.jpg',
      });

      // Criar equipe onde gestorComAvatar é o gestor e também membro
      const [equipeComAvatar] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Equipe Com Avatar Gestor', gestorId: gestorComAvatar.id })
        .returning();

      const res = await request(app.server)
        .get('/api/equipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const equipe = res.body.data.find((e: any) => e.id === equipeComAvatar.id);
      expect(equipe).toBeDefined();
      // gestor deve estar presente com a propriedade avatarUrl (pode ser null pois storage está mockado)
      expect(equipe.gestor).toBeDefined();
      expect(equipe.gestor).toHaveProperty('avatarUrl');
    });
  });

  // ── GET /api/equipes/:id ──────────────────────────────────────────────────

  describe('GET /api/equipes/:id', () => {
    it('retorna detalhe da equipe com membros', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({
          corretoraId,
          nome: 'Equipe Detalhe',
          gestorId: adminId,
        })
        .returning();

      const res = await request(app.server)
        .get(`/api/equipes/${equipe.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(equipe.id);
      expect(res.body.data.membros).toBeDefined();
    });

    it('retorna 404 para equipe inexistente', async () => {
      await request(app.server)
        .get('/api/equipes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── PATCH /api/equipes/:id ────────────────────────────────────────────────

  describe('PATCH /api/equipes/:id', () => {
    it('edita nome da equipe', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Para Editar' })
        .returning();

      const res = await request(app.server)
        .patch(`/api/equipes/${equipe.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Editada' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.nome).toBe('Editada');
    });

    it('retorna 404 para equipe inexistente', async () => {
      await request(app.server)
        .patch('/api/equipes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Nope' })
        .expect(404);
    });

    it('retorna 400 para gestor inexistente ao editar', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Para Editar Gestor' })
        .returning();

      const res = await request(app.server)
        .patch(`/api/equipes/${equipe.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ gestorId: '00000000-0000-0000-0000-000000000000' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ── DELETE /api/equipes/:id ───────────────────────────────────────────────

  describe('DELETE /api/equipes/:id', () => {
    it('exclui equipe com soft delete', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Para Deletar' })
        .returning();

      const res = await request(app.server)
        .delete(`/api/equipes/${equipe.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 404 para equipe inexistente', async () => {
      await request(app.server)
        .delete('/api/equipes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── POST /api/equipes/:id/atribuir-lider ──────────────────────────────────

  describe('POST /api/equipes/:id/atribuir-lider', () => {
    it('atribui lider a equipe', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Para Atribuir Lider' })
        .returning();

      const res = await request(app.server)
        .post(`/api/equipes/${equipe.id}/atribuir-lider`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ gestorId: adminId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.gestorId).toBe(adminId);
    });

    it('remove lider (null)', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Remover Lider', gestorId: adminId })
        .returning();

      const res = await request(app.server)
        .post(`/api/equipes/${equipe.id}/atribuir-lider`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ gestorId: null })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.gestorId).toBeNull();
    });

    it('retorna 404 para equipe inexistente', async () => {
      await request(app.server)
        .post('/api/equipes/00000000-0000-0000-0000-000000000000/atribuir-lider')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ gestorId: adminId })
        .expect(404);
    });

    it('retorna 400 para lider inexistente', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Lider Invalido' })
        .returning();

      const res = await request(app.server)
        .post(`/api/equipes/${equipe.id}/atribuir-lider`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ gestorId: '00000000-0000-0000-0000-000000000000' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /api/equipes/:id/membros ─────────────────────────────────────────

  describe('POST /api/equipes/:id/membros', () => {
    it('adiciona membro a equipe', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Para Adicionar Membro', gestorId: adminId })
        .returning();

      const res = await request(app.server)
        .post(`/api/equipes/${equipe.id}/membros`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usuarioId: vendedorId })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 404 para equipe inexistente', async () => {
      await request(app.server)
        .post('/api/equipes/00000000-0000-0000-0000-000000000000/membros')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usuarioId: vendedorId })
        .expect(404);
    });

    it('retorna 404 para usuario inexistente', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Membro Invalido', gestorId: adminId })
        .returning();

      await request(app.server)
        .post(`/api/equipes/${equipe.id}/membros`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usuarioId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });
  });

  // ── DELETE /api/equipes/:id/membros/:usuarioId ────────────────────────────

  describe('DELETE /api/equipes/:id/membros/:usuarioId', () => {
    it('remove membro da equipe', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Para Remover Membro', gestorId: adminId })
        .returning();

      // Adicionar membro primeiro
      await request(app.server)
        .post(`/api/equipes/${equipe.id}/membros`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usuarioId: vendedorId })
        .expect(200);

      const res = await request(app.server)
        .delete(`/api/equipes/${equipe.id}/membros/${vendedorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 404 para membro nao encontrado', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({ corretoraId, nome: 'Sem Membro', gestorId: adminId })
        .returning();

      await request(app.server)
        .delete(`/api/equipes/${equipe.id}/membros/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
