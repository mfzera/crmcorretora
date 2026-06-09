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

describe('/api/metricas', () => {
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

  describe('GET /api/metricas', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/metricas').expect(401);
    });

    it('retorna métricas gerais zeradas', async () => {
      const res = await request(app.server)
        .get('/api/metricas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('aceita filtros de período', async () => {
      await request(app.server)
        .get('/api/metricas?dataInicio=2026-01-01&dataFim=2026-01-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('aceita filtro por vendedorId', async () => {
      await request(app.server)
        .get(`/api/metricas?vendedorId=${usuarioId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /api/metricas/detalhes', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/metricas/detalhes').expect(401);
    });

    it('retorna 400 sem categoria obrigatória', async () => {
      await request(app.server)
        .get('/api/metricas/detalhes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('retorna detalhes com categoria válida', async () => {
      await request(app.server)
        .get('/api/metricas/detalhes?categoria=premio_liquido')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /api/metricas/vendedores', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/metricas/vendedores').expect(401);
    });

    it('retorna métricas por vendedor', async () => {
      const res = await request(app.server)
        .get('/api/metricas/vendedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });
});
