/**
 * Testes para campanhas/index.ts
 * Cobre:
 * - GET    /api/campanhas/         (listar campanhas)
 * - POST   /api/campanhas/         (criar campanha)
 * - PATCH  /api/campanhas/:id      (atualizar campanha)
 * - GET    /api/campanhas/:id/auditoria
 * - DELETE /api/campanhas/:id      (soft delete)
 */
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

const hoje = new Date().toISOString().split('T')[0];
const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

describe('/api/campanhas', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let gestorToken: string;
  let vendedorToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    // Gestor com gamificacao:gerenciar
    const gestorCargo = await createAdminCargo(corretoraId);
    const gestor = await createTestUsuario(corretoraId, gestorCargo.id);

    gestorToken = generateTestToken(app, {
      sub: gestor.id,
      corretoraId,
      cargoId: gestorCargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: gestor.nome,
      email: gestor.email,
      avatarUrl: null,
    });

    // Vendedor apenas com workspace:acessar
    const vendedorCargo = await createTestCargo(corretoraId, {
      nomeCargo: 'Vendedor Campanhas',
      isVendedor: true,
      permissoes: ['workspace:acessar'],
    });
    const vendedor = await createTestUsuario(corretoraId, vendedorCargo.id);

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

  // ── POST / ───────────────────────────────────────────────────────────────

  describe('POST /api/campanhas/', () => {
    it('cria campanha com sucesso', async () => {
      const res = await request(app.server)
        .post('/api/campanhas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Campanha de Verão',
          descricao: 'Meta de vendas do verão',
          dataInicio: ontem,
          dataFim: amanha,
          ativa: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.titulo).toBe('Campanha de Verão');
      expect(res.body.data.corretoraId).toBe(corretoraId);
    });

    it('retorna 403 sem permissão gamificacao:gerenciar', async () => {
      await request(app.server)
        .post('/api/campanhas/')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          titulo: 'Campanha Proibida',
          descricao: 'Não deve ser criada',
          dataInicio: ontem,
          dataFim: amanha,
        })
        .expect(403);
    });

    it('retorna 400 para dados inválidos', async () => {
      await request(app.server)
        .post('/api/campanhas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ titulo: '', descricao: 'x', dataInicio: 'invalido', dataFim: amanha })
        .expect(400);
    });
  });

  // ── GET / ────────────────────────────────────────────────────────────────

  describe('GET /api/campanhas/', () => {
    it('gestor vê todas as campanhas', async () => {
      const res = await request(app.server)
        .get('/api/campanhas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('vendedor vê apenas campanhas ativas no período atual', async () => {
      // Criar campanha expirada
      await request(app.server)
        .post('/api/campanhas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Campanha Expirada',
          descricao: 'Não deve aparecer para vendedor',
          dataInicio: '2020-01-01',
          dataFim: '2020-12-31',
          ativa: true,
        });

      const res = await request(app.server)
        .get('/api/campanhas/')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const titulos = res.body.data.map((c: any) => c.titulo);
      expect(titulos).not.toContain('Campanha Expirada');
    });

    it('gestor com ?todas=true vê campanhas expiradas também', async () => {
      const res = await request(app.server)
        .get('/api/campanhas/?todas=true')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const titulos = res.body.data.map((c: any) => c.titulo);
      expect(titulos).toContain('Campanha Expirada');
    });
  });

  // ── PATCH /:id ───────────────────────────────────────────────────────────

  describe('PATCH /api/campanhas/:id', () => {
    it('atualiza campanha com sucesso', async () => {
      const createRes = await request(app.server)
        .post('/api/campanhas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Campanha Para Atualizar',
          descricao: 'Descrição original',
          dataInicio: ontem,
          dataFim: amanha,
        });

      const campanhaId = createRes.body.data.id;

      const res = await request(app.server)
        .patch(`/api/campanhas/${campanhaId}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ titulo: 'Título Atualizado', ativa: false })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.titulo).toBe('Título Atualizado');
    });

    it('retorna 404 para campanha inexistente', async () => {
      await request(app.server)
        .patch('/api/campanhas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ titulo: 'Novo Título' })
        .expect(404);
    });
  });

  // ── GET /:id/auditoria ───────────────────────────────────────────────────

  describe('GET /api/campanhas/:id/auditoria', () => {
    it('retorna auditoria da campanha (lista vazia sem dados)', async () => {
      const createRes = await request(app.server)
        .post('/api/campanhas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Campanha Auditoria',
          descricao: 'Para auditoria',
          dataInicio: ontem,
          dataFim: amanha,
        });

      const campanhaId = createRes.body.data.id;

      const res = await request(app.server)
        .get(`/api/campanhas/${campanhaId}/auditoria`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('retorna 404 para campanha inexistente', async () => {
      await request(app.server)
        .get('/api/campanhas/00000000-0000-0000-0000-000000000000/auditoria')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(404);
    });
  });

  // ── DELETE /:id ──────────────────────────────────────────────────────────

  describe('DELETE /api/campanhas/:id', () => {
    it('deleta campanha (soft delete) com sucesso', async () => {
      const createRes = await request(app.server)
        .post('/api/campanhas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Campanha Para Deletar',
          descricao: 'Vai ser deletada',
          dataInicio: ontem,
          dataFim: amanha,
        });

      const campanhaId = createRes.body.data.id;

      await request(app.server)
        .delete(`/api/campanhas/${campanhaId}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(204);
    });

    it('retorna 404 para campanha inexistente', async () => {
      await request(app.server)
        .delete('/api/campanhas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(404);
    });

    it('retorna 404 para campanha já deletada', async () => {
      const createRes = await request(app.server)
        .post('/api/campanhas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Campanha Já Deletada',
          descricao: 'Já foi deletada',
          dataInicio: ontem,
          dataFim: amanha,
        });

      const campanhaId = createRes.body.data.id;

      await request(app.server)
        .delete(`/api/campanhas/${campanhaId}`)
        .set('Authorization', `Bearer ${gestorToken}`);

      await request(app.server)
        .delete(`/api/campanhas/${campanhaId}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(404);
    });
  });
});
