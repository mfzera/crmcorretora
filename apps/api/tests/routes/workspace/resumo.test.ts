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
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('/api/area-trabalho', () => {
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

  describe('GET /api/area-trabalho/resumo', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/area-trabalho/resumo').expect(401);
    });

    it('retorna 403 sem permissão dashboard:visualizar', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['clientes:visualizar'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['clientes:visualizar'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      await request(app.server)
        .get('/api/area-trabalho/resumo')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('retorna resumo com estatísticas zeradas quando não há dados', async () => {
      const res = await request(app.server)
        .get('/api/area-trabalho/resumo')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.estatisticas).toBeDefined();
      expect(res.body.data.estatisticas.totalRenovacoesPendentes).toBe(0);
      expect(res.body.data.estatisticas.totalCotacoesAtivas).toBe(0);
      expect(res.body.data.estatisticas.totalPropostasAtivas).toBe(0);
      expect(res.body.data.estatisticas.totalEndossosPendentes).toBe(0);
      expect(res.body.data.estatisticas.totalCanceladosMes).toBe(0);
      expect(res.body.data.estatisticas.vendidoMes).toBe(0);
      expect(res.body.data.renovacoes).toEqual([]);
      expect(res.body.data.cotacoes).toEqual([]);
      expect(res.body.data.propostas).toEqual([]);
    });

    it('retorna estrutura de paginação', async () => {
      const res = await request(app.server)
        .get('/api/area-trabalho/resumo')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.meta).toBeDefined();
      expect(res.body.data.meta.total).toBeTypeOf('number');
      expect(res.body.data.meta.page).toBeTypeOf('number');
    });
  });

  describe('GET /api/area-trabalho/endossos', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/area-trabalho/endossos').expect(401);
    });

    it('retorna 403 sem permissão cadastro:aprovar_endosso', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['clientes:visualizar'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['clientes:visualizar'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      await request(app.server)
        .get('/api/area-trabalho/endossos')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('retorna lista vazia de endossos pendentes', async () => {
      const res = await request(app.server)
        .get('/api/area-trabalho/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe('GET /api/area-trabalho/cancelados', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/area-trabalho/cancelados').expect(401);
    });

    it('retorna 403 sem permissão dashboard:visualizar', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['clientes:visualizar'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['clientes:visualizar'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      await request(app.server)
        .get('/api/area-trabalho/cancelados')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('retorna lista vazia de cancelados', async () => {
      const res = await request(app.server)
        .get('/api/area-trabalho/cancelados')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });
});
