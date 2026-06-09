import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { oportunidades } from '@ecotech/shared/database';
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

async function createTestOportunidade(
  corretoraId: string,
  vendedorId: string,
  overrides: Record<string, unknown> = {},
) {
  const [opp] = await db
    .insert(oportunidades)
    .values({
      corretoraId,
      vendedorId,
      vendedorOriginalId: vendedorId,
      nomeCliente: 'Cliente Teste',
      status: 'lead',
      prioridade: 'baixa',
      temperatura: 'morno',
      ordem: 1,
      ...overrides,
    })
    .returning();
  return opp;
}

describe('/api/gestao-crm', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let cargoId: string;
  let gestorToken: string;
  let vendedorToken: string;

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

    // Gestor token (isAdmin=true qualifica como gestor)
    gestorToken = generateTestToken(app, {
      sub: usuarioId,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: true,
      isVendedor: false,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });

    // Token sem gestor (apenas vendedor)
    vendedorToken = generateTestToken(app, {
      sub: usuarioId,
      corretoraId,
      cargoId,
      isAdmin: false,
      isGestor: false,
      isVendedor: true,
      permissoes: ['kanban:visualizar'],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });
  });

  describe('GET /api/gestao-crm/overview', () => {
    beforeEach(async () => {
      await db.delete(oportunidades);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/gestao-crm/overview').expect(401);
    });

    it('retorna 403 para não-gestor', async () => {
      await request(app.server)
        .get('/api/gestao-crm/overview')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });

    it('retorna visão geral de oportunidades para gestor', async () => {
      const res = await request(app.server)
        .get('/api/gestao-crm/overview')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('inclui oportunidades de todos vendedores', async () => {
      await createTestOportunidade(corretoraId, usuarioId, {
        nomeCliente: 'Lead 1',
        status: 'lead',
      });
      await createTestOportunidade(corretoraId, usuarioId, {
        nomeCliente: 'Negociacao 1',
        status: 'negociacao',
        ordem: 2,
      });

      const res = await request(app.server)
        .get('/api/gestao-crm/overview')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
    });

    it('filtra por vendedorId quando fornecido', async () => {
      const outroVendedor = await createTestUsuario(corretoraId, cargoId);
      await createTestOportunidade(corretoraId, usuarioId, {
        nomeCliente: 'Lead Meu',
      });
      await createTestOportunidade(corretoraId, outroVendedor.id, {
        nomeCliente: 'Lead Outro',
        ordem: 2,
      });

      const res = await request(app.server)
        .get(`/api/gestao-crm/overview?vendedorId=${usuarioId}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].nomeCliente).toBe('Lead Meu');
    });

    it('filtra por status quando fornecido', async () => {
      await createTestOportunidade(corretoraId, usuarioId, {
        status: 'lead',
        nomeCliente: 'Lead',
      });
      await createTestOportunidade(corretoraId, usuarioId, {
        status: 'negociacao',
        nomeCliente: 'Negociação',
        ordem: 2,
      });

      const res = await request(app.server)
        .get('/api/gestao-crm/overview?status=lead')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('lead');
    });
  });

  describe('GET /api/gestao-crm/vendedores', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/gestao-crm/vendedores').expect(401);
    });

    it('retorna 403 para não-gestor', async () => {
      await request(app.server)
        .get('/api/gestao-crm/vendedores')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });

    it('retorna lista de vendedores com stats para gestor', async () => {
      const res = await request(app.server)
        .get('/api/gestao-crm/vendedores')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/gestao-crm/estatisticas', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/gestao-crm/estatisticas')
        .expect(401);
    });

    it('retorna 403 para não-gestor', async () => {
      await request(app.server)
        .get('/api/gestao-crm/estatisticas')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });

    it('retorna estatísticas do CRM para gestor', async () => {
      const res = await request(app.server)
        .get('/api/gestao-crm/estatisticas')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/gestao-crm/config', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/gestao-crm/config').expect(401);
    });

    it('retorna configurações do CRM para gestor', async () => {
      const res = await request(app.server)
        .get('/api/gestao-crm/config')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
