import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { oportunidades, produtos, tarefas, clientes } from '@ecotech/shared/database';
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
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { createTestClientePF } from '../../helpers/factories/cliente.factory';

// ── Helpers locais ────────────────────────────────────────────────────────────

async function createTestProduto(corretoraId: string) {
  const ts = Date.now();
  const [produto] = await db
    .insert(produtos)
    .values({
      corretoraId,
      nomeProduto: `Produto Teste ${ts}`,
      tipoSeguro: 'AUTO',
      ativo: true,
    })
    .returning();
  return produto;
}

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

// ─────────────────────────────────────────────────────────────────────────────

describe('/api/oportunidades', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminId: string;
  let adminToken: string;
  let usuarioId: string;
  let cargoId: string;
  let token: string;
  let vendedorId: string;
  let vendedorToken: string;
  let vendedor2Id: string;
  let produtoId: string;
  let clienteId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    const adminCargo = await createAdminCargo(corretoraId);
    cargoId = adminCargo.id;
    const admin = await createTestUsuario(corretoraId, adminCargo.id);
    adminId = admin.id;
    usuarioId = admin.id;

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: adminCargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: true,
      permissoes: [
        'kanban:acessar',
        'kanban:visualizar',
        'kanban:visualizar_todas',
        'kanban:criar',
        'kanban:editar',
        'kanban:deletar',
        'kanban:perder',
        'kanban:fechar',
      ],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    // token alias for crud tests
    token = adminToken;

    const vendedorCargo = await createTestCargo(corretoraId, {
      nomeCargo: 'Vendedor',
      isVendedor: true,
      permissoes: [
        'kanban:acessar',
        'kanban:visualizar',
        'kanban:criar',
        'kanban:editar',
        'kanban:deletar',
        'kanban:perder',
        'kanban:fechar',
      ],
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
      permissoes: [
        'kanban:acessar',
        'kanban:visualizar',
        'kanban:criar',
        'kanban:editar',
        'kanban:deletar',
        'kanban:perder',
        'kanban:fechar',
      ],
      nome: vendedor.nome,
      email: vendedor.email,
      avatarUrl: null,
    });

    const vendedor2 = await createTestUsuario(corretoraId, vendedorCargo.id);
    vendedor2Id = vendedor2.id;

    const produto = await createTestProduto(corretoraId);
    produtoId = produto.id;

    const cliente = await createTestClientePF(corretoraId, adminId);
    clienteId = cliente.id;
  });

  // ── GET /api/oportunidades ─────────────────────────────────────────────────

  describe('GET /api/oportunidades', () => {
    beforeEach(async () => {
      await db.delete(oportunidades);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/oportunidades').expect(401);
    });

    it('retorna 403 sem permissão kanban:visualizar', async () => {
      const restrictedCargo = await createTestCargo(corretoraId, {
        permissoes: [],
      });
      const restrictedUser = await createTestUsuario(
        corretoraId,
        restrictedCargo.id,
      );
      const restrictedToken = generateTestToken(app, {
        sub: restrictedUser.id,
        corretoraId,
        cargoId: restrictedCargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: restrictedUser.nome,
        email: restrictedUser.email,
        avatarUrl: null,
      });

      await request(app.server)
        .get('/api/oportunidades')
        .set('Authorization', `Bearer ${restrictedToken}`)
        .expect(403);
    });

    it('retorna lista vazia', async () => {
      const res = await request(app.server)
        .get('/api/oportunidades')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('lista oportunidades do usuário', async () => {
      await createTestOportunidade(corretoraId, usuarioId, {
        nomeCliente: 'A',
        ordem: 1,
      });
      await createTestOportunidade(corretoraId, usuarioId, {
        nomeCliente: 'B',
        ordem: 2,
      });

      const res = await request(app.server)
        .get('/api/oportunidades')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
    });

    it('filtra por status', async () => {
      await createTestOportunidade(corretoraId, usuarioId, {
        status: 'lead',
        ordem: 1,
      });
      await createTestOportunidade(corretoraId, usuarioId, {
        status: 'negociacao',
        ordem: 2,
      });

      const res = await request(app.server)
        .get('/api/oportunidades?status=lead')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('lead');
    });

    it('não retorna oportunidades deletadas', async () => {
      await createTestOportunidade(corretoraId, usuarioId, {
        deletedAt: new Date(),
      });

      const res = await request(app.server)
        .get('/api/oportunidades')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });

    it('vendedor sem visualizar_todas só vê suas oportunidades', async () => {
      const vendedorCargo = await createTestCargo(corretoraId, {
        permissoes: ['kanban:visualizar'],
      });
      const vendedor = await createTestUsuario(corretoraId, vendedorCargo.id);
      const vendedorToken = generateTestToken(app, {
        sub: vendedor.id,
        corretoraId,
        cargoId: vendedorCargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['kanban:visualizar'],
        nome: vendedor.nome,
        email: vendedor.email,
        avatarUrl: null,
      });

      // Oportunidade de outro vendedor
      await createTestOportunidade(corretoraId, usuarioId);
      // Oportunidade do vendedor
      await createTestOportunidade(corretoraId, vendedor.id, { ordem: 2 });

      const res = await request(app.server)
        .get('/api/oportunidades')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].vendedorId).toBe(vendedor.id);
    });

    it('tenant isolation entre corretoras', async () => {
      await createTestOportunidade(corretoraId, usuarioId);

      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const token2 = generateTestToken(app, {
        sub: usuario2.id,
        corretoraId: corretora2.id,
        cargoId: cargo2.id,
        isAdmin: true,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: usuario2.nome,
        email: usuario2.email,
        avatarUrl: null,
      });

      const res = await request(app.server)
        .get('/api/oportunidades')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });

  // ── GET /api/oportunidades/:id ─────────────────────────────────────────────

  describe('GET /api/oportunidades/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/oportunidades/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('retorna oportunidade por ID', async () => {
      const opp = await createTestOportunidade(corretoraId, usuarioId, {
        nomeCliente: 'Detalhes',
      });

      const res = await request(app.server)
        .get(`/api/oportunidades/${opp.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(opp.id);
      expect(res.body.data.nomeCliente).toBe('Detalhes');
    });

    it('retorna 404 para inexistente', async () => {
      await request(app.server)
        .get('/api/oportunidades/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ── POST /api/oportunidades ────────────────────────────────────────────────

  describe('POST /api/oportunidades', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/oportunidades')
        .send({ nomeCliente: 'Test' })
        .expect(401);
    });

    it('retorna 403 sem permissão kanban:criar', async () => {
      const restrictedCargo = await createTestCargo(corretoraId, {
        permissoes: ['kanban:visualizar'],
      });
      const restrictedUser = await createTestUsuario(
        corretoraId,
        restrictedCargo.id,
      );
      const restrictedToken = generateTestToken(app, {
        sub: restrictedUser.id,
        corretoraId,
        cargoId: restrictedCargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['kanban:visualizar'],
        nome: restrictedUser.nome,
        email: restrictedUser.email,
        avatarUrl: null,
      });

      await request(app.server)
        .post('/api/oportunidades')
        .set('Authorization', `Bearer ${restrictedToken}`)
        .send({ nomeCliente: 'Test' })
        .expect(403);
    });

    it('cria oportunidade com dados mínimos', async () => {
      const res = await request(app.server)
        .post('/api/oportunidades')
        .set('Authorization', `Bearer ${token}`)
        .send({ nomeCliente: 'Novo Lead' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.nomeCliente).toBe('Novo Lead');
      expect(res.body.data.status).toBe('lead');
      expect(res.body.data.vendedorId).toBe(usuarioId);
    });

    it('cria oportunidade com todos os campos', async () => {
      const res = await request(app.server)
        .post('/api/oportunidades')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nomeCliente: 'Lead Completo',
          emailCliente: 'lead@test.com',
          telefoneCliente: '11999999999',
          status: 'contato_inicial',
          temperatura: 'quente',
          premioEstimado: '5000.00',
          observacoes: 'Observações de teste',
          tags: ['tag1', 'tag2'],
          origem: 'indicacao',
        })
        .expect(201);

      expect(res.body.data.nomeCliente).toBe('Lead Completo');
      expect(res.body.data.status).toBe('contato_inicial');
      expect(res.body.data.temperatura).toBe('quente');
    });
  });

  // ── PATCH /api/oportunidades/:id ──────────────────────────────────────────

  describe('PATCH /api/oportunidades/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/oportunidades/00000000-0000-0000-0000-000000000000')
        .send({ nomeCliente: 'X' })
        .expect(401);
    });

    it('atualiza oportunidade', async () => {
      const opp = await createTestOportunidade(corretoraId, usuarioId);

      const res = await request(app.server)
        .patch(`/api/oportunidades/${opp.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nomeCliente: 'Atualizado',
          temperatura: 'quente',
          premioEstimado: '10000.00',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.nomeCliente).toBe('Atualizado');
      expect(res.body.data.temperatura).toBe('quente');
    });

    it('retorna 404 para inexistente', async () => {
      await request(app.server)
        .patch('/api/oportunidades/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ nomeCliente: 'X' })
        .expect(404);
    });
  });

  // ── PATCH /api/oportunidades/:id/mover ────────────────────────────────────

  describe('PATCH /api/oportunidades/:id/mover', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/oportunidades/00000000-0000-0000-0000-000000000000/mover')
        .send({ novoStatus: 'negociacao', novaOrdem: 0 })
        .expect(401);
    });

    it('move oportunidade entre colunas', async () => {
      const opp = await createTestOportunidade(corretoraId, usuarioId, {
        status: 'lead',
        ordem: 1,
      });

      const res = await request(app.server)
        .patch(`/api/oportunidades/${opp.id}/mover`)
        .set('Authorization', `Bearer ${token}`)
        .send({ novoStatus: 'negociacao', novaOrdem: 0 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('negociacao');
      expect(res.body.data.ordem).toBe(0);
    });

    it('retorna 404 para inexistente', async () => {
      await request(app.server)
        .patch('/api/oportunidades/00000000-0000-0000-0000-000000000000/mover')
        .set('Authorization', `Bearer ${token}`)
        .send({ novoStatus: 'negociacao', novaOrdem: 0 })
        .expect(404);
    });
  });

  // ── POST /api/oportunidades/:id/fechar ────────────────────────────────────

  describe('POST /api/oportunidades/:id/fechar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/oportunidades/00000000-0000-0000-0000-000000000000/fechar')
        .send({})
        .expect(401);
    });

    it('fecha oportunidade como ganha', async () => {
      const opp = await createTestOportunidade(corretoraId, usuarioId, {
        status: 'negociacao',
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/fechar`)
        .set('Authorization', `Bearer ${token}`)
        .send({ valorFechado: '15000.00', observacoes: 'Fechou!' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ganha');
      expect(res.body.data.valorFechado).toBe('15000.00');
      expect(res.body.data.dataFechamento).toBeDefined();
    });

    it('retorna 404 para inexistente', async () => {
      await request(app.server)
        .post('/api/oportunidades/00000000-0000-0000-0000-000000000000/fechar')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(404);
    });
  });

  // ── POST /api/oportunidades/:id/perder ────────────────────────────────────

  describe('POST /api/oportunidades/:id/perder', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/oportunidades/00000000-0000-0000-0000-000000000000/perder')
        .send({})
        .expect(401);
    });

    it('marca oportunidade como perdida', async () => {
      const opp = await createTestOportunidade(corretoraId, usuarioId, {
        status: 'negociacao',
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/perder`)
        .set('Authorization', `Bearer ${token}`)
        .send({ motivoPerda: 'Preço', detalhesPerda: 'Concorrente mais barato' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('perdida');
      expect(res.body.data.motivoPerda).toBe('Preço');
    });

    it('retorna 404 para inexistente', async () => {
      await request(app.server)
        .post('/api/oportunidades/00000000-0000-0000-0000-000000000000/perder')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(404);
    });
  });

  // ── DELETE /api/oportunidades/:id ─────────────────────────────────────────

  describe('DELETE /api/oportunidades/:id', () => {
    beforeEach(async () => {
      await db.delete(oportunidades);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete('/api/oportunidades/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('soft delete da oportunidade', async () => {
      const opp = await createTestOportunidade(corretoraId, usuarioId);

      await request(app.server)
        .delete(`/api/oportunidades/${opp.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Não deve aparecer na listagem
      const listRes = await request(app.server)
        .get('/api/oportunidades')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(listRes.body.data).toHaveLength(0);
    });

    it('retorna 404 para inexistente', async () => {
      await request(app.server)
        .delete('/api/oportunidades/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ── POST /api/oportunidades/:id/transferir ────────────────────────────────

  describe('POST /api/oportunidades/:id/transferir', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post(
          '/api/oportunidades/00000000-0000-0000-0000-000000000000/transferir',
        )
        .send({ vendedorDestinoId: '00000000-0000-0000-0000-000000000001' })
        .expect(401);
    });

    it('transfere oportunidade para outro vendedor', async () => {
      const outroVendedor = await createTestUsuario(corretoraId, cargoId);
      const opp = await createTestOportunidade(corretoraId, usuarioId);

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/transferir`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendedorDestinoId: outroVendedor.id,
          motivo: 'Melhor fit',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.vendedorId).toBe(outroVendedor.id);
    });

    it('retorna 400 para transferência para mesmo vendedor', async () => {
      const opp = await createTestOportunidade(corretoraId, usuarioId);

      await request(app.server)
        .post(`/api/oportunidades/${opp.id}/transferir`)
        .set('Authorization', `Bearer ${token}`)
        .send({ vendedorDestinoId: usuarioId })
        .expect(400);
    });

    it('retorna 400 sem vendedorDestinoId', async () => {
      const opp = await createTestOportunidade(corretoraId, usuarioId);

      await request(app.server)
        .post(`/api/oportunidades/${opp.id}/transferir`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('retorna 404 para oportunidade inexistente', async () => {
      const outroVendedor = await createTestUsuario(corretoraId, cargoId);

      await request(app.server)
        .post(
          '/api/oportunidades/00000000-0000-0000-0000-000000000000/transferir',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ vendedorDestinoId: outroVendedor.id })
        .expect(404);
    });
  });

  // ── GET /api/oportunidades/:id/historico-transferencias ───────────────────

  describe('GET /api/oportunidades/:id/historico-transferencias', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(
          '/api/oportunidades/00000000-0000-0000-0000-000000000000/historico-transferencias',
        )
        .expect(401);
    });

    it('retorna histórico vazio', async () => {
      const opp = await createTestOportunidade(corretoraId, usuarioId);

      const res = await request(app.server)
        .get(`/api/oportunidades/${opp.id}/historico-transferencias`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('retorna histórico após transferência', async () => {
      const outroVendedor = await createTestUsuario(corretoraId, cargoId);
      const opp = await createTestOportunidade(corretoraId, usuarioId);

      // Transferir
      await request(app.server)
        .post(`/api/oportunidades/${opp.id}/transferir`)
        .set('Authorization', `Bearer ${token}`)
        .send({ vendedorDestinoId: outroVendedor.id, motivo: 'Test' });

      const res = await request(app.server)
        .get(`/api/oportunidades/${opp.id}/historico-transferencias`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].vendedorOrigem.id).toBe(usuarioId);
      expect(res.body.data[0].vendedorDestino.id).toBe(outroVendedor.id);
      expect(res.body.data[0].motivo).toBe('Test');
    });

    it('retorna 404 para oportunidade inexistente', async () => {
      await request(app.server)
        .get(
          '/api/oportunidades/00000000-0000-0000-0000-000000000000/historico-transferencias',
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ── GET /api/oportunidades?produtoId= ─────────────────────────────────────

  describe('GET /api/oportunidades?produtoId=', () => {
    it('filtra oportunidades pelo produtoId', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        produtoId,
        nomeCliente: 'Cliente com Produto',
        ordem: 99,
      });

      const res = await request(app.server)
        .get(`/api/oportunidades?produtoId=${produtoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((o: { id: string }) => o.id);
      expect(ids).toContain(opp.id);
    });

    it('não retorna oportunidades de outro produto', async () => {
      const outroProduto = await createTestProduto(corretoraId);
      await createTestOportunidade(corretoraId, adminId, {
        produtoId: outroProduto.id,
        nomeCliente: 'Cliente Outro Produto',
        ordem: 100,
      });

      const res = await request(app.server)
        .get(`/api/oportunidades?produtoId=${produtoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      for (const item of res.body.data) {
        expect(item.produtoId).toBe(produtoId);
      }
    });
  });

  // ── GET /api/oportunidades?vendedorId= (com kanban:visualizar_todas) ──────

  describe('GET /api/oportunidades?vendedorId= (com kanban:visualizar_todas)', () => {
    it('filtra por vendedorId quando usuário tem kanban:visualizar_todas', async () => {
      const opp = await createTestOportunidade(corretoraId, vendedorId, {
        nomeCliente: 'Cliente Vendedor Filtro',
        ordem: 101,
      });

      const res = await request(app.server)
        .get(`/api/oportunidades?vendedorId=${vendedorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((o: { id: string }) => o.id);
      expect(ids).toContain(opp.id);
    });

    it('vendedorId sem kanban:visualizar_todas não filtra por vendedor', async () => {
      // Mesmo passando vendedorId, o filtro é ignorado quando não tem a permissão
      const res = await request(app.server)
        .get(`/api/oportunidades?vendedorId=${adminId}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // Deve retornar apenas as do próprio vendedor, não filtrar por adminId
      for (const item of res.body.data) {
        const isOwn =
          item.vendedorId === vendedorId || item.vendedorOriginalId === vendedorId;
        expect(isOwn).toBe(true);
      }
    });
  });

  // ── GET /api/oportunidades — enriquecimento com dataRecontato ─────────────

  describe('GET /api/oportunidades — enriquecimento com dataRecontato', () => {
    it('inclui dataRecontato quando há tarefa de recontato pendente vinculada', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Cliente Recontato',
        ordem: 102,
      });

      await db.insert(tarefas).values({
        corretoraId,
        usuarioId: adminId,
        titulo: `Recontato: ${opp.nomeCliente}`,
        prioridade: 'media',
        dataVencimento: new Date('2025-06-15T09:00:00.000Z'),
        entidadeTipo: 'oportunidade',
        entidadeId: opp.id,
        concluida: false,
      });

      const res = await request(app.server)
        .get('/api/oportunidades')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const found = res.body.data.find((o: { id: string }) => o.id === opp.id);
      expect(found).toBeDefined();
      expect(found.dataRecontato).toBe('2025-06-15');
    });
  });

  // ── GET /api/oportunidades/:id — sem kanban:visualizar_todas ──────────────

  describe('GET /api/oportunidades/:id — sem kanban:visualizar_todas', () => {
    it('vendedor vê sua própria oportunidade (como vendedorOriginalId)', async () => {
      const opp = await createTestOportunidade(corretoraId, vendedorId, {
        nomeCliente: 'Opp Própria Vendedor',
        ordem: 103,
      });

      const res = await request(app.server)
        .get(`/api/oportunidades/${opp.id}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(opp.id);
    });

    it('vendedor não vê oportunidade de outro vendedor (404)', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Admin Não Visível',
        ordem: 104,
        vendedorOriginalId: adminId,
      });

      await request(app.server)
        .get(`/api/oportunidades/${opp.id}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(404);
    });
  });

  // ── POST /api/oportunidades — com dataVencimento ──────────────────────────

  describe('POST /api/oportunidades — com dataVencimento', () => {
    it('cria oportunidade com dataVencimento', async () => {
      const res = await request(app.server)
        .post('/api/oportunidades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nomeCliente: 'Cliente Data Vencimento',
          status: 'lead',
          temperatura: 'morno',
          dataVencimento: '2025-12-31',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.dataVencimento).toBeTruthy();
    });
  });

  // ── PATCH /api/oportunidades/:id/status — reativação de perdida ───────────

  describe('PATCH /api/oportunidades/:id/status — reativação de perdida', () => {
    it('ao mover de perdida para lead, conclui tarefas de recontato pendentes', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        status: 'perdida',
        nomeCliente: 'Cliente Perdida Reativar',
        ordem: 105,
      });

      await db.insert(tarefas).values({
        corretoraId,
        usuarioId: adminId,
        titulo: `Recontato: ${opp.nomeCliente}`,
        prioridade: 'media',
        dataVencimento: new Date('2025-08-01T09:00:00.000Z'),
        entidadeTipo: 'oportunidade',
        entidadeId: opp.id,
        concluida: false,
      });

      const res = await request(app.server)
        .patch(`/api/oportunidades/${opp.id}/mover`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ novoStatus: 'lead', novaOrdem: 1 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('lead');

      // Verificar que a tarefa foi concluída
      const [tarefa] = await db
        .select()
        .from(tarefas)
        .where(
          // @ts-ignore
          (await import('drizzle-orm')).and(
            (await import('drizzle-orm')).eq(tarefas.entidadeId, opp.id),
            (await import('drizzle-orm')).eq(tarefas.entidadeTipo, 'oportunidade'),
          ),
        );
      expect(tarefa.concluida).toBe(true);
    });
  });

  // ── POST /api/oportunidades/:id/fechar — sem clienteId ───────────────────

  describe('POST /api/oportunidades/:id/fechar — sem clienteId', () => {
    it('salva pendenteCadastroCliente no metadata quando produtoId+datas fornecidos mas opp não tem clienteId', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Sem Cliente Para Fechar',
        status: 'negociacao',
        ordem: 106,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/fechar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          valorFechado: '1500.00',
          produtoId,
          dataVigenciaInicio: '2025-01-01',
          dataVigenciaFim: '2025-12-31',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.metadata?.pendenteCadastroCliente?.produtoId).toBe(produtoId);
      expect(res.body.data.metadata?.pendenteCadastroCliente?.dataVigenciaInicio).toBe('2025-01-01');
      expect(res.body.data.metadata?.pendenteCadastroCliente?.dataVigenciaFim).toBe('2025-12-31');
    });
  });

  // ── POST /api/oportunidades/:id/fechar — com clienteId cria cotação ───────

  describe('POST /api/oportunidades/:id/fechar — com clienteId cria cotação', () => {
    it('cria cotação automaticamente ao fechar com clienteId + produtoId + datas', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Cliente Com Cotação',
        status: 'negociacao',
        clienteId,
        ordem: 107,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/fechar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          valorFechado: '1500.00',
          produtoId,
          dataVigenciaInicio: '2025-01-01',
          dataVigenciaFim: '2025-12-31',
          premioFinal: '1500.00',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ganha');
      expect(res.body.data.cotacaoId).toBeTruthy();
      expect(res.body.data.documentoVendaId).toBeNull();
    });
  });

  // ── POST /api/oportunidades/:id/fechar — gerarDocumento: true ────────────

  describe('POST /api/oportunidades/:id/fechar — gerarDocumento: true', () => {
    it('cria DocumentoVenda ao fechar com gerarDocumento: true', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Cliente Gerar Documento',
        status: 'negociacao',
        clienteId,
        ordem: 108,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/fechar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          valorFechado: '2000.00',
          produtoId,
          dataVigenciaInicio: '2025-01-01',
          dataVigenciaFim: '2025-12-31',
          premioFinal: '2000.00',
          gerarDocumento: true,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ganha');
      expect(res.body.data.documentoVendaId).toBeTruthy();
      expect(res.body.data.cotacaoId).toBeTruthy();
    });

    it('cria DocumentoVenda + RenovacaoComercial com criarRenovacao: true (852-867)', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Cliente Renovacao',
        status: 'negociacao',
        clienteId,
        ordem: 109,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/fechar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          valorFechado: '2500.00',
          produtoId,
          dataVigenciaInicio: '2025-01-01',
          dataVigenciaFim: '2025-12-31',
          premioFinal: '2500.00',
          gerarDocumento: true,
          criarRenovacao: true,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.documentoVendaId).toBeTruthy();
      expect(res.body.data.renovacaoId).toBeTruthy();
    });
  });

  // ── POST /api/oportunidades/:id/fechar — sem gerarDocumento, cotacaoId no metadata

  describe('POST /api/oportunidades/:id/fechar — sem gerarDocumento, cotacaoId no metadata', () => {
    it('salva cotacaoId no metadata quando gerarDocumento é false', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Cliente Sem Documento',
        status: 'negociacao',
        clienteId,
        ordem: 110,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/fechar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          valorFechado: '1200.00',
          produtoId,
          dataVigenciaInicio: '2025-01-01',
          dataVigenciaFim: '2025-12-31',
          premioFinal: '1200.00',
          gerarDocumento: false,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.cotacaoId).toBeTruthy();
      expect(res.body.data.documentoVendaId).toBeNull();
      // metadata deve conter cotacaoId
      expect(res.body.data.metadata?.cotacaoId).toBeTruthy();
    });
  });

  // ── POST /api/oportunidades/:id/perder — com dataRecontato ───────────────

  describe('POST /api/oportunidades/:id/perder — com dataRecontato', () => {
    it('cria tarefa de recontato ao perder com dataRecontato', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Cliente Recontato Perda',
        status: 'negociacao',
        ordem: 111,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/perder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          motivoPerda: 'Preço alto',
          dataRecontato: '2025-09-01',
          observacaoRecontato: 'Tentar novamente no próximo ciclo',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('perdida');

      // Verificar que a tarefa de recontato foi criada
      const [tarefa] = await db
        .select()
        .from(tarefas)
        .where(
          // @ts-ignore
          (await import('drizzle-orm')).and(
            (await import('drizzle-orm')).eq(tarefas.entidadeId, opp.id),
            (await import('drizzle-orm')).eq(tarefas.entidadeTipo, 'oportunidade'),
          ),
        );
      expect(tarefa).toBeDefined();
      expect(tarefa.concluida).toBe(false);
    });
  });

  // ── GET /api/oportunidades/:id/historico — sem kanban:visualizar_todas ────

  describe('GET /api/oportunidades/:id/historico — sem kanban:visualizar_todas', () => {
    it('vendedor vê histórico da própria oportunidade', async () => {
      const opp = await createTestOportunidade(corretoraId, vendedorId, {
        nomeCliente: 'Opp Historico Vendedor',
        status: 'lead',
        ordem: 112,
      });

      const res = await request(app.server)
        .get(`/api/oportunidades/${opp.id}/historico`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('vendedor recebe 404 ao tentar ver histórico de opp de outro (1161-1165)', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Admin Historico',
        status: 'lead',
        ordem: 113,
        vendedorOriginalId: adminId,
      });

      await request(app.server)
        .get(`/api/oportunidades/${opp.id}/historico`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(404);
    });
  });

  // ── POST /api/oportunidades/:id/vincular-cliente ──────────────────────────

  describe('POST /api/oportunidades/:id/vincular-cliente', () => {
    it('vincula um cliente existente à oportunidade', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Para Vincular',
        status: 'lead',
        ordem: 114,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/vincular-cliente`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ clienteId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.clienteId).toBe(clienteId);
    });

    it('retorna 404 quando cliente não encontrado', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Cliente Inexistente',
        status: 'lead',
        ordem: 115,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/vincular-cliente`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ clienteId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Cliente');
    });
  });

  // ── POST /api/oportunidades/:id/transferir — sem vendedorDestinoId ─────────

  describe('POST /api/oportunidades/:id/transferir — sem vendedorDestinoId', () => {
    it('retorna 400 quando vendedorDestinoId não é fornecido', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Transferir Sem Destino',
        status: 'lead',
        ordem: 116,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/transferir`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: 'Sem destino' })
        .expect(400);

      expect(res.body.success).toBe(false);
      // error pode ser objeto ou string de validação — apenas confirma a falha
      expect(res.body.success).toBe(false);
    });

    it('transfere oportunidade para outro vendedor com sucesso', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Para Transferir',
        status: 'lead',
        ordem: 117,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/transferir`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendedorDestinoId: vendedor2Id, motivo: 'Redistribuição' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.vendedorId).toBe(vendedor2Id);
    });
  });

  // ── GET /api/oportunidades/:id/historico-transferencias — sem kanban:visualizar_todas

  describe('GET /api/oportunidades/:id/historico-transferencias — sem kanban:visualizar_todas', () => {
    it('vendedor vê histórico de transferências da própria oportunidade', async () => {
      const opp = await createTestOportunidade(corretoraId, vendedorId, {
        nomeCliente: 'Opp Transferencia Historico',
        status: 'lead',
        ordem: 118,
      });

      const res = await request(app.server)
        .get(`/api/oportunidades/${opp.id}/historico-transferencias`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('vendedor recebe 404 ao tentar ver histórico de transferências de opp alheia', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Admin Transferencia',
        status: 'lead',
        ordem: 119,
        vendedorOriginalId: adminId,
      });

      await request(app.server)
        .get(`/api/oportunidades/${opp.id}/historico-transferencias`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(404);
    });
  });
});
