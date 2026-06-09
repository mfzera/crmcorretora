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
import { createTestCargo } from '../../helpers/factories/cargo.factory';
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

describe('/api/gestao-crm — coverage', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let gestorId: string;
  let vendedorId: string;
  let cargoId: string;
  let gestorToken: string;
  let vendedorToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    const cargoGestor = await createAdminCargo(corretoraId);
    cargoId = cargoGestor.id;

    const gestor = await createTestUsuario(corretoraId, cargoGestor.id);
    gestorId = gestor.id;

    // Cargo exclusivo de vendedor — sem isAdmin, sem isGestor
    // Garante que loadUserRuntimeData não carregue permissões de admin
    const cargoVendedor = await createTestCargo(corretoraId, {
      isVendedor: true,
      permissoes: ['kanban:visualizar'],
    });
    const vendedor = await createTestUsuario(corretoraId, cargoVendedor.id);
    vendedorId = vendedor.id;

    gestorToken = generateTestToken(app, {
      sub: gestorId,
      corretoraId,
      cargoId,
      isAdmin: true,
      isGestor: true,
      isVendedor: false,
      permissoes: [],
      nome: gestor.nome,
      email: gestor.email,
      avatarUrl: null,
    });

    vendedorToken = generateTestToken(app, {
      sub: vendedorId,
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

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/gestao-crm/oportunidades — linhas 215–316
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/gestao-crm/oportunidades', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/gestao-crm/oportunidades')
        .send({ nomeCliente: 'Teste', vendedorId })
        .expect(401);
    });

    it('retorna 403 para não-gestor', async () => {
      await request(app.server)
        .post('/api/gestao-crm/oportunidades')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ nomeCliente: 'Teste', vendedorId })
        .expect(403);
    });

    it('retorna 400 quando vendedorId não é fornecido', async () => {
      const res = await request(app.server)
        .post('/api/gestao-crm/oportunidades')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ nomeCliente: 'Teste sem vendedor' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/vendedorId/i);
    });

    it('retorna 404 quando vendedorId não existe', async () => {
      const res = await request(app.server)
        .post('/api/gestao-crm/oportunidades')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          nomeCliente: 'Teste',
          vendedorId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/vendedor/i);
    });

    it('gestor cria oportunidade atribuída a vendedor → 201', async () => {
      const res = await request(app.server)
        .post('/api/gestao-crm/oportunidades')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          nomeCliente: 'Cliente Novo',
          vendedorId,
          status: 'lead',
          temperatura: 'quente',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.vendedorId).toBe(vendedorId);
      expect(res.body.data.nomeCliente).toBe('Cliente Novo');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PATCH /api/gestao-crm/oportunidades/:id/reatribuir — linhas 332–413
  // ─────────────────────────────────────────────────────────────────────────────

  describe('PATCH /api/gestao-crm/oportunidades/:id/reatribuir', () => {
    let oportunidadeId: string;

    beforeEach(async () => {
      await db.delete(oportunidades);
      const opp = await createTestOportunidade(corretoraId, gestorId);
      oportunidadeId = opp.id;
    });

    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch(`/api/gestao-crm/oportunidades/${oportunidadeId}/reatribuir`)
        .send({ novoVendedorId: vendedorId })
        .expect(401);
    });

    it('retorna 403 para não-gestor', async () => {
      await request(app.server)
        .patch(`/api/gestao-crm/oportunidades/${oportunidadeId}/reatribuir`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ novoVendedorId: vendedorId })
        .expect(403);
    });

    it('retorna 400 quando novoVendedorId não é fornecido', async () => {
      const res = await request(app.server)
        .patch(`/api/gestao-crm/oportunidades/${oportunidadeId}/reatribuir`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/novoVendedorId/i);
    });

    it('retorna 404 quando oportunidade não existe', async () => {
      const res = await request(app.server)
        .patch(
          '/api/gestao-crm/oportunidades/00000000-0000-0000-0000-000000000000/reatribuir',
        )
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ novoVendedorId: vendedorId })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/oportunidade/i);
    });

    it('retorna 404 quando novoVendedorId não existe', async () => {
      const res = await request(app.server)
        .patch(`/api/gestao-crm/oportunidades/${oportunidadeId}/reatribuir`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ novoVendedorId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/vendedor/i);
    });

    it('reatribui oportunidade a novo vendedor → 200', async () => {
      const res = await request(app.server)
        .patch(`/api/gestao-crm/oportunidades/${oportunidadeId}/reatribuir`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ novoVendedorId: vendedorId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.vendedorId).toBe(vendedorId);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/gestao-crm/estatisticas — linha 499 (taxaConversao = 0)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/gestao-crm/estatisticas — base limpa', () => {
    beforeEach(async () => {
      await db.delete(oportunidades);
    });

    it('retorna taxaConversao igual a 0 quando não há oportunidades', async () => {
      const res = await request(app.server)
        .get('/api/gestao-crm/estatisticas')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.geral.taxaConversao).toBe(0);
      expect(res.body.data.geral.totalOportunidades).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE /api/gestao-crm/oportunidades/:id — linhas 527–551
  // ─────────────────────────────────────────────────────────────────────────────

  describe('DELETE /api/gestao-crm/oportunidades/:id', () => {
    let oportunidadeId: string;

    beforeEach(async () => {
      await db.delete(oportunidades);
      const opp = await createTestOportunidade(corretoraId, vendedorId);
      oportunidadeId = opp.id;
    });

    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete(`/api/gestao-crm/oportunidades/${oportunidadeId}`)
        .expect(401);
    });

    it('retorna 403 para não-gestor', async () => {
      await request(app.server)
        .delete(`/api/gestao-crm/oportunidades/${oportunidadeId}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });

    it('retorna 404 quando oportunidade não existe', async () => {
      const res = await request(app.server)
        .delete(
          '/api/gestao-crm/oportunidades/00000000-0000-0000-0000-000000000000',
        )
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/oportunidade/i);
    });

    it('gestor deleta oportunidade existente → 204', async () => {
      await request(app.server)
        .delete(`/api/gestao-crm/oportunidades/${oportunidadeId}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(204);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PATCH /api/gestao-crm/config — linhas 605–665
  // ─────────────────────────────────────────────────────────────────────────────

  describe('PATCH /api/gestao-crm/config', () => {
    const configValida = {
      prioridadeAutomatica: {
        habilitado: true,
        diasBaixa: 2,
        diasMedia: 5,
        diasAlta: 10,
        diasUrgente: 15,
      },
    };

    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/gestao-crm/config')
        .send(configValida)
        .expect(401);
    });

    it('retorna 403 para não-gestor', async () => {
      await request(app.server)
        .patch('/api/gestao-crm/config')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send(configValida)
        .expect(403);
    });

    it('retorna 400 quando dias estão fora de ordem (baixa >= media)', async () => {
      const res = await request(app.server)
        .patch('/api/gestao-crm/config')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          prioridadeAutomatica: {
            habilitado: true,
            diasBaixa: 5,
            diasMedia: 5,
            diasAlta: 10,
            diasUrgente: 15,
          },
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/ordem crescente/i);
    });

    it('retorna 400 quando dias estão fora de ordem (media >= alta)', async () => {
      const res = await request(app.server)
        .patch('/api/gestao-crm/config')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          prioridadeAutomatica: {
            habilitado: true,
            diasBaixa: 2,
            diasMedia: 10,
            diasAlta: 5,
            diasUrgente: 15,
          },
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/ordem crescente/i);
    });

    it('retorna 400 quando algum dia tem valor zero ou negativo', async () => {
      const res = await request(app.server)
        .patch('/api/gestao-crm/config')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          prioridadeAutomatica: {
            habilitado: true,
            diasBaixa: 0,
            diasMedia: 5,
            diasAlta: 10,
            diasUrgente: 15,
          },
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/maiores que zero/i);
    });

    it('atualiza configurações do CRM com dados válidos → 200', async () => {
      const res = await request(app.server)
        .patch('/api/gestao-crm/config')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send(configValida)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.prioridadeAutomatica.habilitado).toBe(true);
      expect(res.body.data.prioridadeAutomatica.diasBaixa).toBe(2);
      expect(res.body.data.prioridadeAutomatica.diasMedia).toBe(5);
      expect(res.body.data.prioridadeAutomatica.diasAlta).toBe(10);
      expect(res.body.data.prioridadeAutomatica.diasUrgente).toBe(15);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/gestao-crm/atualizar-prioridades — linhas 681–703
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/gestao-crm/atualizar-prioridades', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/gestao-crm/atualizar-prioridades')
        .expect(401);
    });

    it('retorna 403 para não-gestor', async () => {
      await request(app.server)
        .post('/api/gestao-crm/atualizar-prioridades')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });

    it('executa atualização de prioridades → 200', async () => {
      const res = await request(app.server)
        .post('/api/gestao-crm/atualizar-prioridades')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('retorna skipped quando prioridade automática está desabilitada', async () => {
      // Desabilitar a automação
      await request(app.server)
        .patch('/api/gestao-crm/config')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ prioridadeAutomatica: { habilitado: false, diasBaixa: 2, diasMedia: 5, diasAlta: 10, diasUrgente: 15 } });

      const res = await request(app.server)
        .post('/api/gestao-crm/atualizar-prioridades')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.skipped).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/gestao-crm/oportunidades com automação habilitada — linhas 266-270
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/gestao-crm/oportunidades com prioridade automática habilitada', () => {
    it('cria oportunidade com dataVencimento e automação ativa', async () => {
      // Habilitar automação primeiro
      await request(app.server)
        .patch('/api/gestao-crm/config')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ prioridadeAutomatica: { habilitado: true, diasBaixa: 2, diasMedia: 5, diasAlta: 10, diasUrgente: 15 } });

      const res = await request(app.server)
        .post('/api/gestao-crm/oportunidades')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          nomeCliente: 'Cliente Automação',
          vendedorId,
          dataVencimento: '2026-12-31',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.nomeCliente).toBe('Cliente Automação');
    });
  });
});
