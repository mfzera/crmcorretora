/**
 * Testes para missoes/index.ts
 * Cobre:
 * - GET    /api/missoes/         (listar missões com filtragem por papel)
 * - POST   /api/missoes/         (criar missão)
 * - GET    /api/missoes/:id      (buscar missão por ID)
 * - PATCH  /api/missoes/:id      (atualizar missão)
 * - GET    /api/missoes/:id/auditoria
 * - DELETE /api/missoes/:id      (soft delete)
 */
import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import { missoes, badgeTipos } from '@ecotech/shared/database';
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
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { generateTestToken } from '../../helpers/auth.helper';

const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const proximoMes = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

async function createBadgeTipo(slug: string) {
  const [bt] = await db
    .insert(badgeTipos)
    .values({ slug, nome: `Badge ${slug}`, descricao: `Badge para ${slug}`, icone: 'star', cor: '#000000' })
    .returning();
  return bt;
}

describe('/api/missoes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let gestorToken: string;
  let gestorId: string;
  let vendedorToken: string;
  let vendedorId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    // Gestor/admin
    const gestorCargo = await createAdminCargo(corretoraId);
    const gestor = await createTestUsuario(corretoraId, gestorCargo.id);
    gestorId = gestor.id;

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

    // Vendedor
    const vendedorCargo = await createTestCargo(corretoraId, {
      nomeCargo: 'Vendedor Missoes',
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

  // ── POST / ───────────────────────────────────────────────────────────────

  describe('POST /api/missoes/', () => {
    it('cria missão de novos_seguros com sucesso', async () => {
      const res = await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Novos Seguros',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 5,
          dataInicio: ontem,
          prazo: proximoMes,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tipoMetrica).toBe('novos_seguros');
    });

    it('cria missão com badge associado', async () => {
      const bt = await createBadgeTipo(`missao-badge-${Date.now()}`);

      const res = await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Com Badge',
          tipoMetrica: 'cotacoes',
          valorAlvo: 10,
          dataInicio: ontem,
          prazo: proximoMes,
          badgeTipoId: bt.id,
          badgeObservacao: 'Parabéns por completar!',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.badgeTipoId).toBe(bt.id);
    });

    it('cria missão para usuário específico', async () => {
      const res = await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Para Vendedor',
          tipoMetrica: 'renovacoes',
          valorAlvo: 3,
          dataInicio: ontem,
          prazo: proximoMes,
          usuarioId: vendedorId,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.usuarioId).toBe(vendedorId);
    });

    it('retorna 403 sem permissão gamificacao:gerenciar', async () => {
      await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          titulo: 'Missão Proibida',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 5,
          dataInicio: ontem,
          prazo: proximoMes,
        })
        .expect(403);
    });
  });

  // ── GET / ────────────────────────────────────────────────────────────────

  describe('GET /api/missoes/', () => {
    it('gestor vê todas as missões com dados enriquecidos', async () => {
      const res = await request(app.server)
        .get('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const m of res.body.data) {
        expect(typeof m.progressoAtual).toBe('number');
        expect(typeof m.percentual).toBe('number');
      }
    });

    it('vendedor vê apenas missões atribuídas a ele', async () => {
      // Missão para gestorId (vendedor não deve ver)
      await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Só Do Gestor',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 5,
          dataInicio: ontem,
          prazo: proximoMes,
          usuarioId: gestorId,
        });

      // Missão para vendedorId
      await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Do Vendedor',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 5,
          dataInicio: ontem,
          prazo: proximoMes,
          usuarioId: vendedorId,
        });

      const res = await request(app.server)
        .get('/api/missoes/')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const titulos = res.body.data.map((m: any) => m.titulo);
      expect(titulos).toContain('Missão Do Vendedor');
      expect(titulos).not.toContain('Missão Só Do Gestor');
    });

    it('expira automaticamente missões vencidas', async () => {
      const [missaoVencida] = await db
        .insert(missoes)
        .values({
          corretoraId,
          criadaPorId: gestorId,
          titulo: 'Missão Vencida Auto',
          tipoMetrica: 'novos_seguros',
          valorAlvo: '5',
          dataInicio: '2020-01-01',
          prazo: '2020-12-31',
          status: 'PENDENTE',
        })
        .returning();

      await request(app.server)
        .get('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`);

      const missaoAtualizada = await db.query.missoes.findFirst({
        where: eq(missoes.id, missaoVencida.id),
      });
      expect(missaoAtualizada?.status).toBe('EXPIRADA');
    });
  });

  // ── GET /:id ─────────────────────────────────────────────────────────────

  describe('GET /api/missoes/:id', () => {
    it('retorna missão com progresso e badgeTipo', async () => {
      const bt = await createBadgeTipo(`get-id-badge-${Date.now()}`);

      const createRes = await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Por ID',
          tipoMetrica: 'cotacoes',
          valorAlvo: 8,
          dataInicio: ontem,
          prazo: proximoMes,
          badgeTipoId: bt.id,
        });

      const missaoId = createRes.body.data.id;

      const res = await request(app.server)
        .get(`/api/missoes/${missaoId}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(missaoId);
      expect(typeof res.body.data.progressoAtual).toBe('number');
    });

    it('retorna 404 para missão inexistente', async () => {
      await request(app.server)
        .get('/api/missoes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(404);
    });
  });

  // ── PATCH /:id ───────────────────────────────────────────────────────────

  describe('PATCH /api/missoes/:id', () => {
    it('atualiza missão com sucesso', async () => {
      const createRes = await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Para Atualizar',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 5,
          dataInicio: ontem,
          prazo: amanha,
        });

      const missaoId = createRes.body.data.id;

      const res = await request(app.server)
        .patch(`/api/missoes/${missaoId}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ titulo: 'Missão Atualizada', prazo: proximoMes })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.titulo).toBe('Missão Atualizada');
    });

    it('cancela missão com status=CANCELADA', async () => {
      const createRes = await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Para Cancelar',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 5,
          dataInicio: ontem,
          prazo: amanha,
        });

      const res = await request(app.server)
        .patch(`/api/missoes/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ status: 'CANCELADA' })
        .expect(200);

      expect(res.body.data.status).toBe('CANCELADA');
    });

    it('retorna 404 para missão inexistente', async () => {
      await request(app.server)
        .patch('/api/missoes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ titulo: 'x' })
        .expect(404);
    });
  });

  // ── GET /:id/auditoria ───────────────────────────────────────────────────

  describe('GET /api/missoes/:id/auditoria', () => {
    it('retorna auditoria de missão novos_seguros', async () => {
      const createRes = await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Auditoria NS',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 5,
          dataInicio: ontem,
          prazo: proximoMes,
          usuarioId: vendedorId,
        });

      const res = await request(app.server)
        .get(`/api/missoes/${createRes.body.data.id}/auditoria`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('retorna auditoria de missão cotacoes', async () => {
      const createRes = await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Auditoria Cot',
          tipoMetrica: 'cotacoes',
          valorAlvo: 10,
          dataInicio: ontem,
          prazo: proximoMes,
          usuarioId: vendedorId,
        });

      const res = await request(app.server)
        .get(`/api/missoes/${createRes.body.data.id}/auditoria`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna auditoria de missão renovacoes', async () => {
      const createRes = await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Auditoria Ren',
          tipoMetrica: 'renovacoes',
          valorAlvo: 5,
          dataInicio: ontem,
          prazo: proximoMes,
          usuarioId: vendedorId,
        });

      const res = await request(app.server)
        .get(`/api/missoes/${createRes.body.data.id}/auditoria`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna auditoria de missão valor_premio', async () => {
      const createRes = await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Auditoria VP',
          tipoMetrica: 'valor_premio',
          valorAlvo: 5000,
          dataInicio: ontem,
          prazo: proximoMes,
          usuarioId: vendedorId,
        });

      const res = await request(app.server)
        .get(`/api/missoes/${createRes.body.data.id}/auditoria`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 404 para missão inexistente', async () => {
      await request(app.server)
        .get('/api/missoes/00000000-0000-0000-0000-000000000000/auditoria')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(404);
    });
  });

  // ── DELETE /:id ──────────────────────────────────────────────────────────

  describe('DELETE /api/missoes/:id', () => {
    it('deleta missão (soft delete) com sucesso', async () => {
      const createRes = await request(app.server)
        .post('/api/missoes/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Missão Para Deletar',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 5,
          dataInicio: ontem,
          prazo: amanha,
        });

      await request(app.server)
        .delete(`/api/missoes/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(204);
    });

    it('retorna 404 para missão inexistente', async () => {
      await request(app.server)
        .delete('/api/missoes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(404);
    });
  });
});
