import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { seguradorasParceiras, produtos } from '@ecotech/shared/database';
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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createTestSeguradora(
  corretoraId: string,
  overrides: Record<string, unknown> = {},
) {
  const ts = Date.now();
  const cnpj = String(ts).slice(-14).padStart(14, '0');
  const [seguradora] = await db
    .insert(seguradorasParceiras)
    .values({
      corretoraId,
      cnpj,
      razaoSocial: `Seguradora Teste ${ts}`,
      nomeFantasia: `Seg Teste ${ts}`,
      status: 'ATIVA',
      ...overrides,
    })
    .returning();
  return seguradora;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('/api/seguradoras-parceiras', () => {
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

  // ── POST / ──────────────────────────────────────────────────────────────────

  describe('POST /api/seguradoras-parceiras', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/seguradoras-parceiras')
        .send({})
        .expect(401);
    });

    it('retorna 403 sem permissão config:gerenciar_seguradoras_parceiras', async () => {
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
        .post('/api/seguradoras-parceiras')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({
          cnpj: '12345678000100',
          razaoSocial: 'Seguradora XYZ',
        })
        .expect(403);
    });

    it('cria seguradora parceira com dados mínimos', async () => {
      const res = await request(app.server)
        .post('/api/seguradoras-parceiras')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cnpj: '12345678000100',
          razaoSocial: 'Porto Seguro S.A.',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.cnpj).toBe('12345678000100');
      expect(res.body.data.razaoSocial).toBe('Porto Seguro S.A.');
      expect(res.body.data.status).toBe('ATIVA');
    });

    it('cria seguradora parceira com todos os campos', async () => {
      const res = await request(app.server)
        .post('/api/seguradoras-parceiras')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cnpj: '98765432000199',
          razaoSocial: 'Bradesco Seguros S.A.',
          nomeFantasia: 'Bradesco Seguros',
          telefone: '11999999999',
          email: 'contato@bradesco.com',
          status: 'ATIVA',
        })
        .expect(201);

      expect(res.body.data.nomeFantasia).toBe('Bradesco Seguros');
      expect(res.body.data.email).toBe('contato@bradesco.com');
    });

    it('retorna 409 quando CNPJ já existe para a corretora', async () => {
      await createTestSeguradora(corretoraId, { cnpj: '11111111000100' });

      await request(app.server)
        .post('/api/seguradoras-parceiras')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cnpj: '11111111000100',
          razaoSocial: 'Outra Seguradora',
        })
        .expect(409);
    });

    it('retorna 400 sem razaoSocial', async () => {
      await request(app.server)
        .post('/api/seguradoras-parceiras')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cnpj: '12345678000100' })
        .expect(400);
    });
  });

  // ── GET / ───────────────────────────────────────────────────────────────────

  describe('GET /api/seguradoras-parceiras', () => {
    beforeEach(async () => {
      await db.delete(seguradorasParceiras);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/seguradoras-parceiras')
        .expect(401);
    });

    it('retorna lista vazia quando não há seguradoras', async () => {
      const res = await request(app.server)
        .get('/api/seguradoras-parceiras')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toEqual([]);
      expect(res.body.data.pagination.total).toBe(0);
    });

    it('lista seguradoras da corretora', async () => {
      const seg1 = await createTestSeguradora(corretoraId);
      const seg2 = await createTestSeguradora(corretoraId);

      const res = await request(app.server)
        .get('/api/seguradoras-parceiras')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.data.find((s: any) => s.id === seg1.id)).toBeDefined();
      expect(res.body.data.data.find((s: any) => s.id === seg2.id)).toBeDefined();
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('filtra por status ATIVA', async () => {
      const segAtiva = await createTestSeguradora(corretoraId, { status: 'ATIVA' });
      const segInativa = await createTestSeguradora(corretoraId, { status: 'INATIVA' });

      const resAtiva = await request(app.server)
        .get('/api/seguradoras-parceiras?status=ATIVA')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(resAtiva.body.data.data.find((s: any) => s.id === segAtiva.id)).toBeDefined();
      expect(resAtiva.body.data.data.find((s: any) => s.id === segInativa.id)).toBeUndefined();
      expect(resAtiva.body.data.data.every((s: any) => s.status === 'ATIVA')).toBe(true);
    });

    it('não retorna seguradoras deletadas', async () => {
      const segDeletada = await createTestSeguradora(corretoraId, { deletedAt: new Date() });

      const res = await request(app.server)
        .get('/api/seguradoras-parceiras')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.data.find((s: any) => s.id === segDeletada.id)).toBeUndefined();
    });

    it('não retorna seguradoras de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const segOutra = await createTestSeguradora(corretora2.id);

      const res = await request(app.server)
        .get('/api/seguradoras-parceiras')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.data.find((s: any) => s.id === segOutra.id)).toBeUndefined();
    });

    it('filtra por search (razaoSocial)', async () => {
      const seguradora = await createTestSeguradora(corretoraId, {
        razaoSocial: 'Seguradora Especial de Busca',
        nomeFantasia: 'Seg Especial',
      });

      const res = await request(app.server)
        .get('/api/seguradoras-parceiras?search=Especial de Busca')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.data.find((s: any) => s.id === seguradora.id)).toBeDefined();
    });
  });

  // ── GET /:id ────────────────────────────────────────────────────────────────

  describe('GET /api/seguradoras-parceiras/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/seguradoras-parceiras/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('retorna seguradora por ID', async () => {
      const seguradora = await createTestSeguradora(corretoraId);

      const res = await request(app.server)
        .get(`/api/seguradoras-parceiras/${seguradora.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(seguradora.id);
    });

    it('retorna 404 para seguradora inexistente', async () => {
      await request(app.server)
        .get('/api/seguradoras-parceiras/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 para seguradora de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const segOutra = await createTestSeguradora(corretora2.id);

      await request(app.server)
        .get(`/api/seguradoras-parceiras/${segOutra.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── PATCH /:id ──────────────────────────────────────────────────────────────

  describe('PATCH /api/seguradoras-parceiras/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch(
          '/api/seguradoras-parceiras/00000000-0000-0000-0000-000000000000',
        )
        .send({})
        .expect(401);
    });

    it('retorna 403 sem permissão config:gerenciar_seguradoras_parceiras', async () => {
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

      const seguradora = await createTestSeguradora(corretoraId);

      await request(app.server)
        .patch(`/api/seguradoras-parceiras/${seguradora.id}`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ nomeFantasia: 'Novo nome' })
        .expect(403);
    });

    it('atualiza seguradora parceira', async () => {
      const seguradora = await createTestSeguradora(corretoraId);

      const res = await request(app.server)
        .patch(`/api/seguradoras-parceiras/${seguradora.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeFantasia: 'Nome Atualizado', status: 'INATIVA' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.nomeFantasia).toBe('Nome Atualizado');
      expect(res.body.data.status).toBe('INATIVA');
    });

    it('retorna 409 ao renomear para CNPJ já existente', async () => {
      await createTestSeguradora(corretoraId, { cnpj: '22222222000100' });
      const seguradora = await createTestSeguradora(corretoraId, {
        cnpj: '33333333000100',
      });

      await request(app.server)
        .patch(`/api/seguradoras-parceiras/${seguradora.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cnpj: '22222222000100' })
        .expect(409);
    });

    it('retorna 404 para seguradora inexistente', async () => {
      await request(app.server)
        .patch(
          '/api/seguradoras-parceiras/00000000-0000-0000-0000-000000000000',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeFantasia: 'Qualquer' })
        .expect(404);
    });
  });

  // ── DELETE /:id ─────────────────────────────────────────────────────────────

  describe('DELETE /api/seguradoras-parceiras/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete(
          '/api/seguradoras-parceiras/00000000-0000-0000-0000-000000000000',
        )
        .expect(401);
    });

    it('retorna 403 sem permissão config:gerenciar_seguradoras_parceiras', async () => {
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

      const seguradora = await createTestSeguradora(corretoraId);

      await request(app.server)
        .delete(`/api/seguradoras-parceiras/${seguradora.id}`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('exclui seguradora sem produtos vinculados (soft delete)', async () => {
      const seguradora = await createTestSeguradora(corretoraId);

      const res = await request(app.server)
        .delete(`/api/seguradoras-parceiras/${seguradora.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Não deve aparecer mais na listagem
      await request(app.server)
        .get(`/api/seguradoras-parceiras/${seguradora.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 409 ao tentar excluir seguradora com produtos vinculados', async () => {
      const seguradora = await createTestSeguradora(corretoraId);

      // Vincular um produto à seguradora
      await db.insert(produtos).values({
        corretoraId,
        seguradoraParceiraId: seguradora.id,
        nomeProduto: `Produto Vinculado ${Date.now()}`,
        tipoSeguro: 'AUTO',
        ativo: true,
      });

      await request(app.server)
        .delete(`/api/seguradoras-parceiras/${seguradora.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });

    it('retorna 404 para seguradora inexistente', async () => {
      await request(app.server)
        .delete(
          '/api/seguradoras-parceiras/00000000-0000-0000-0000-000000000000',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
