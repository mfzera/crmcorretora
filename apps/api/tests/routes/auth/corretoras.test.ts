import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import { usuarioCorretora } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
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

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('/api/auth corretoras routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
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
    const usuario = await createTestUsuario(corretoraId, cargo.id);
    usuarioId = usuario.id;

    adminToken = generateTestToken(app, {
      sub: usuarioId,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });
  });

  // ── GET /api/auth/corretoras ───────────────────────────────────────────────

  describe('GET /api/auth/corretoras', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/auth/corretoras').expect(401);
    });

    it('retorna lista de corretoras do usuário', async () => {
      const res = await request(app.server)
        .get('/api/auth/corretoras')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const corretora = res.body.data.find((c: any) => c.id === corretoraId);
      expect(corretora).toBeDefined();
      expect(corretora.razaoSocial).toBeDefined();
      expect(corretora.cnpj).toBeDefined();
    });

    it('inclui informações de cargo quando o usuário tem cargo', async () => {
      const res = await request(app.server)
        .get('/api/auth/corretoras')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const corretora = res.body.data.find((c: any) => c.id === corretoraId);
      expect(corretora).toBeDefined();
      expect(corretora.cargo).toBeDefined();
      expect(corretora.cargo.id).toBe(cargoId);
      expect(corretora.cargo.isAdmin).toBe(true);
    });

    it('marca corretora ativa corretamente', async () => {
      const res = await request(app.server)
        .get('/api/auth/corretoras')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ativas = res.body.data.filter((c: any) => c.ativa === true);
      // Pode haver 0 ou 1 corretora ativa dependendo de corretoraAtivaId
      expect(ativas.length).toBeLessThanOrEqual(1);
    });

    it('retorna apenas vínculos ativos', async () => {
      // Criar segunda corretora e usuário vinculado (inativo)
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);

      // Inserir vínculo inativo
      await db.insert(usuarioCorretora).values({
        usuarioId,
        corretoraId: corretora2.id,
        cargoId: cargo2.id,
        ativo: false,
      });

      const res = await request(app.server)
        .get('/api/auth/corretoras')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ids = res.body.data.map((c: any) => c.id);
      expect(ids).not.toContain(corretora2.id);

      // Cleanup
      await db
        .update(usuarioCorretora)
        .set({ ativo: false })
        .where(
          eq(usuarioCorretora.corretoraId, corretora2.id),
        );
    });

    it('inclui dataVinculo na resposta', async () => {
      const res = await request(app.server)
        .get('/api/auth/corretoras')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const corretora = res.body.data.find((c: any) => c.id === corretoraId);
      expect(corretora).toBeDefined();
      expect(corretora.dataVinculo).toBeDefined();
    });
  });

  // ── POST /api/auth/corretoras/switch ──────────────────────────────────────

  describe('POST /api/auth/corretoras/switch', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/auth/corretoras/switch')
        .send({ corretoraId: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });

    it('retorna 404 para corretora sem vínculo ativo', async () => {
      await request(app.server)
        .post('/api/auth/corretoras/switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ corretoraId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('troca corretora ativa com sucesso e retorna novo token', async () => {
      const res = await request(app.server)
        .post('/api/auth/corretoras/switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ corretoraId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.message).toBeDefined();
    });

    it('retorna dados do usuário e corretora ativa no switch', async () => {
      const res = await request(app.server)
        .post('/api/auth/corretoras/switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ corretoraId })
        .expect(200);

      const { usuario } = res.body.data;
      expect(usuario.id).toBe(usuarioId);
      expect(usuario.corretoraId).toBe(corretoraId);
      expect(usuario.corretoraAtiva).toBeDefined();
      expect(usuario.corretoraAtiva.id).toBe(corretoraId);
    });

    it('retorna dados do cargo no switch quando há cargo', async () => {
      const res = await request(app.server)
        .post('/api/auth/corretoras/switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ corretoraId })
        .expect(200);

      const { usuario } = res.body.data;
      expect(usuario.cargo).toBeDefined();
      expect(usuario.cargo.id).toBe(cargoId);
      expect(usuario.cargo.isAdmin).toBe(true);
    });

    it('switch para corretora com vínculo inativo retorna 404', async () => {
      const plano3 = await createTestPlano();
      const corretora3 = await createTestCorretora(plano3.id);
      const cargo3 = await createAdminCargo(corretora3.id);

      // Inserir vínculo inativo
      await db.insert(usuarioCorretora).values({
        usuarioId,
        corretoraId: corretora3.id,
        cargoId: cargo3.id,
        ativo: false,
      });

      await request(app.server)
        .post('/api/auth/corretoras/switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ corretoraId: corretora3.id })
        .expect(404);
    });

    it('switch para segunda corretora vinculada ativa', async () => {
      const plano4 = await createTestPlano();
      const corretora4 = await createTestCorretora(plano4.id);
      const cargo4 = await createAdminCargo(corretora4.id);

      // Inserir vínculo ativo
      await db.insert(usuarioCorretora).values({
        usuarioId,
        corretoraId: corretora4.id,
        cargoId: cargo4.id,
        ativo: true,
      });

      const res = await request(app.server)
        .post('/api/auth/corretoras/switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ corretoraId: corretora4.id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.usuario.corretoraId).toBe(corretora4.id);
    });

    it('switch retorna cargo null quando vínculo não tem cargoId', async () => {
      const plano5 = await createTestPlano();
      const corretora5 = await createTestCorretora(plano5.id);

      // Inserir vínculo ativo SEM cargoId
      await db.insert(usuarioCorretora).values({
        usuarioId,
        corretoraId: corretora5.id,
        cargoId: null,
        ativo: true,
      });

      const res = await request(app.server)
        .post('/api/auth/corretoras/switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ corretoraId: corretora5.id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.usuario.cargo).toBeNull();
    });
  });

  // ── POST /api/auth/corretoras/switch - error branches ────────────────────

  describe('POST /api/auth/corretoras/switch - error branches', () => {
    it('retorna 404 quando usuário não existe mais no banco após update', async () => {
      // The switch handler does two db.select() calls:
      //   1. db.select().from(usuarioCorretora) → find vinculo
      //   2. db.select().from(usuarios) → find usuario after update
      // We let the first pass (to get vinculo), and mock the second to return [].
      const originalSelect = db.select.bind(db);
      let callCount = 0;
      const selectSpy = vi.spyOn(db, 'select').mockImplementation((...args: any[]) => {
        callCount++;
        if (callCount === 2) {
          return {
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([]),
              }),
            }),
          } as any;
        }
        return originalSelect(...args);
      });

      const res = await request(app.server)
        .post('/api/auth/corretoras/switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ corretoraId })
        .expect(404);

      expect(res.body.success).toBe(false);
      selectSpy.mockRestore();
    });

    it('retorna corretoraAtiva null quando corretora não existe mais no banco', async () => {
      // tenantIsolationPlugin also calls db.query.corretoras.findFirst as a preHandler.
      // We let the first call (tenant resolution) go through, and mock the second (route handler).
      const originalFindFirst = db.query.corretoras.findFirst.bind(db.query.corretoras);
      let callCount = 0;
      const findFirstSpy = vi
        .spyOn(db.query.corretoras, 'findFirst')
        .mockImplementation((...args: any[]) => {
          callCount++;
          if (callCount === 2) {
            return Promise.resolve(undefined) as any;
          }
          return originalFindFirst(...args);
        });

      const res = await request(app.server)
        .post('/api/auth/corretoras/switch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ corretoraId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.usuario.corretoraAtiva).toBeNull();
      findFirstSpy.mockRestore();
    });
  });

  // ── GET /api/auth/corretoras - vínculo sem cargo ───────────────────────────

  describe('GET /api/auth/corretoras - vínculo sem cargoId', () => {
    it('retorna cargo null quando vínculo não tem cargoId', async () => {
      const plano6 = await createTestPlano();
      const corretora6 = await createTestCorretora(plano6.id);

      // Inserir vínculo ativo SEM cargoId
      await db.insert(usuarioCorretora).values({
        usuarioId,
        corretoraId: corretora6.id,
        cargoId: null,
        ativo: true,
      });

      const res = await request(app.server)
        .get('/api/auth/corretoras')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const vincSemCargo = res.body.data.find((c: any) => c.id === corretora6.id);
      expect(vincSemCargo).toBeDefined();
      expect(vincSemCargo.cargo).toBeNull();
    });
  });
});
