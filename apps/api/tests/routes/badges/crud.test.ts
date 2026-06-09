/**
 * Testes para badges/index.ts
 * Cobre:
 * - GET  /api/badges/           (catálogo de tipos de badge)
 * - GET  /api/badges/meus       (badges do usuário logado)
 * - GET  /api/badges/usuario/:id (badges de usuário específico)
 * - POST /api/badges/conceder   (concessão manual de badge)
 */
import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import { badgeTipos, usuarioBadges } from '@ecotech/shared/database';
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

async function createTestBadgeTipo(slug: string) {
  const [bt] = await db
    .insert(badgeTipos)
    .values({
      slug,
      nome: `Badge ${slug}`,
      descricao: `Descrição do badge ${slug}`,
      icone: 'star',
      cor: '#000000',
    })
    .returning();
  return bt;
}

describe('/api/badges', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminToken: string;
  let adminId: string;
  let vendedorToken: string;
  let vendedorId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    // Admin com gamificacao:gerenciar
    const adminCargo = await createAdminCargo(corretoraId);
    const admin = await createTestUsuario(corretoraId, adminCargo.id);
    adminId = admin.id;

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: adminCargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    // Vendedor apenas com workspace:acessar
    const vendedorCargo = await createTestCargo(corretoraId, {
      nomeCargo: 'Vendedor Badges',
      isVendedor: true,
      permissoes: ['workspace:acessar'],
    });
    const vendedor = await createTestUsuario(corretoraId, vendedorCargo.id);
    vendedorId = vendedor.id;

    vendedorToken = generateTestToken(app, {
      sub: vendedor.id,
      corretoraId,
      cargoId: vendedorCargo.id,
      isAdmin: false,
      isGestor: false,
      isVendedor: true,
      permissoes: ['workspace:acessar'],
      nome: vendedor.nome,
      email: vendedor.email,
      avatarUrl: null,
    });
  });

  // ── GET / ────────────────────────────────────────────────────────────────

  describe('GET /api/badges/', () => {
    it('retorna catálogo de tipos de badge', async () => {
      const bt = await createTestBadgeTipo(`test-badge-${Date.now()}`);

      const res = await request(app.server)
        .get('/api/badges/')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('permite acesso com workspace:acessar', async () => {
      const res = await request(app.server)
        .get('/api/badges/')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/badges/').expect(401);
    });
  });

  // ── GET /meus ────────────────────────────────────────────────────────────

  describe('GET /api/badges/meus', () => {
    it('retorna badges do usuário logado (lista vazia inicialmente)', async () => {
      const res = await request(app.server)
        .get('/api/badges/meus')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('retorna badges após concessão', async () => {
      const bt = await createTestBadgeTipo(`meus-badge-${Date.now()}`);

      await db.insert(usuarioBadges).values({
        corretoraId,
        usuarioId: vendedorId,
        badgeTipoId: bt.id,
      });

      const res = await request(app.server)
        .get('/api/badges/meus')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((b: any) => b.badgeTipoId);
      expect(ids).toContain(bt.id);
    });
  });

  // ── GET /usuario/:id ─────────────────────────────────────────────────────

  describe('GET /api/badges/usuario/:id', () => {
    it('retorna badges de outro usuário com gamificacao:gerenciar', async () => {
      const res = await request(app.server)
        .get(`/api/badges/usuario/${vendedorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('retorna 403 sem permissão gamificacao:gerenciar', async () => {
      await request(app.server)
        .get(`/api/badges/usuario/${adminId}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });
  });

  // ── POST /conceder ───────────────────────────────────────────────────────

  describe('POST /api/badges/conceder', () => {
    it('concede badge manualmente com sucesso', async () => {
      const bt = await createTestBadgeTipo(`conceder-badge-${Date.now()}`);

      const res = await request(app.server)
        .post('/api/badges/conceder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          usuarioId: vendedorId,
          badgeTipoId: bt.id,
          observacao: 'Desempenho excelente',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('concedido com sucesso');
    });

    it('retorna 404 para usuário de outra corretora', async () => {
      const bt = await createTestBadgeTipo(`badge-outra-${Date.now()}`);

      // Criar usuário em outra corretora
      const outroplano = await createTestPlano();
      const outraCorretora = await createTestCorretora(outroplano.id);
      const outroCargo = await createAdminCargo(outraCorretora.id);
      const outroUsuario = await createTestUsuario(outraCorretora.id, outroCargo.id);

      const res = await request(app.server)
        .post('/api/badges/conceder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usuarioId: outroUsuario.id, badgeTipoId: bt.id })
        .expect(404);

      expect(res.body.error.message).toContain('não encontrado');
    });

    it('retorna 404 para badge_tipo inexistente', async () => {
      const res = await request(app.server)
        .post('/api/badges/conceder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          usuarioId: vendedorId,
          badgeTipoId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);

      expect(res.body.error.message).toContain('não encontrado');
    });

    it('retorna 403 sem permissão gamificacao:gerenciar', async () => {
      const bt = await createTestBadgeTipo(`badge-perm-${Date.now()}`);

      await request(app.server)
        .post('/api/badges/conceder')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ usuarioId: adminId, badgeTipoId: bt.id })
        .expect(403);
    });
  });
});
