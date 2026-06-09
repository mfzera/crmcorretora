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
import { createTestCargo } from '../../helpers/factories/cargo.factory';

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

describe('/api/oportunidades', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let cargoId: string;
  let token: string;

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

    token = generateTestToken(app, {
      sub: usuarioId,
      corretoraId,
      cargoId: cargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: true,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });
  });

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
});
