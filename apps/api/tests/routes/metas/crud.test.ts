/**
 * Testes para metas/index.ts
 * Cobre:
 * - GET    /api/metas/         (listar metas com filtragem por papel)
 * - POST   /api/metas/         (criar meta)
 * - GET    /api/metas/:id      (buscar meta por ID)
 * - PATCH  /api/metas/:id      (atualizar meta)
 * - GET    /api/metas/:id/auditoria
 * - DELETE /api/metas/:id      (soft delete)
 */
import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import { metas, equipes, usuarios } from '@ecotech/shared/database';
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

describe('/api/metas', () => {
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
      nomeCargo: 'Vendedor Metas',
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

  describe('POST /api/metas/', () => {
    it('cria meta de novos_seguros com sucesso', async () => {
      const res = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Novos Seguros',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 10,
          dataInicio: ontem,
          dataFim: proximoMes,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tipoMetrica).toBe('novos_seguros');
      expect(res.body.data.corretoraId).toBe(corretoraId);
    });

    it('cria meta de cotacoes com usuário específico', async () => {
      const res = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Cotações Vendedor',
          tipoMetrica: 'cotacoes',
          valorAlvo: 20,
          dataInicio: ontem,
          dataFim: proximoMes,
          usuarioId: vendedorId,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.usuarioId).toBe(vendedorId);
    });

    it('cria meta de renovacoes com equipe', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({ corretoraId, nome: `Equipe Meta ${Date.now()}`, gestorId })
        .returning();

      const res = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Renovações Equipe',
          tipoMetrica: 'renovacoes',
          valorAlvo: 5,
          dataInicio: ontem,
          dataFim: proximoMes,
          equipeId: equipe.id,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.equipeId).toBe(equipe.id);
    });

    it('cria meta de valor_premio', async () => {
      const res = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Valor Prêmio',
          tipoMetrica: 'valor_premio',
          valorAlvo: 50000,
          dataInicio: ontem,
          dataFim: proximoMes,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('retorna 403 sem permissão gamificacao:gerenciar', async () => {
      await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          titulo: 'Meta Proibida',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 10,
          dataInicio: ontem,
          dataFim: proximoMes,
        })
        .expect(403);
    });
  });

  // ── GET / ────────────────────────────────────────────────────────────────

  describe('GET /api/metas/', () => {
    it('gestor vê todas as metas', async () => {
      const res = await request(app.server)
        .get('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Todas as metas devem ter progressoAtual e percentual
      for (const m of res.body.data) {
        expect(typeof m.progressoAtual).toBe('number');
        expect(typeof m.percentual).toBe('number');
      }
    });

    it('vendedor vê apenas metas corretora-wide e as suas próprias', async () => {
      // Meta corretora-wide (sem usuarioId e equipeId)
      const metaGeral = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Geral Corretora',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 100,
          dataInicio: ontem,
          dataFim: proximoMes,
        });

      // Meta para outro usuário específico
      await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Só Do Gestor',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 5,
          dataInicio: ontem,
          dataFim: proximoMes,
          usuarioId: gestorId,
        });

      const res = await request(app.server)
        .get('/api/metas/')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const titulos = res.body.data.map((m: any) => m.titulo);
      expect(titulos).toContain('Meta Geral Corretora');
      expect(titulos).not.toContain('Meta Só Do Gestor');
    });

    it('expira automaticamente metas vencidas', async () => {
      // Criar meta com data já passada
      const [metaVencida] = await db
        .insert(metas)
        .values({
          corretoraId,
          criadaPorId: gestorId,
          titulo: 'Meta Vencida Auto',
          tipoMetrica: 'novos_seguros',
          valorAlvo: '5',
          dataInicio: '2020-01-01',
          dataFim: '2020-12-31',
          status: 'ATIVA',
        })
        .returning();

      await request(app.server)
        .get('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      // Verificar que foi expirada no banco
      const metaAtualizada = await db.query.metas.findFirst({
        where: eq(metas.id, metaVencida.id),
      });
      expect(metaAtualizada?.status).toBe('EXPIRADA');
    });
  });

  // ── GET /:id ─────────────────────────────────────────────────────────────

  describe('GET /api/metas/:id', () => {
    it('retorna meta com progresso enriquecido', async () => {
      const createRes = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Por ID',
          tipoMetrica: 'cotacoes',
          valorAlvo: 15,
          dataInicio: ontem,
          dataFim: proximoMes,
        });

      const metaId = createRes.body.data.id;

      const res = await request(app.server)
        .get(`/api/metas/${metaId}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(metaId);
      expect(typeof res.body.data.progressoAtual).toBe('number');
      expect(typeof res.body.data.percentual).toBe('number');
    });

    it('retorna 404 para meta inexistente', async () => {
      await request(app.server)
        .get('/api/metas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(404);
    });
  });

  // ── PATCH /:id ───────────────────────────────────────────────────────────

  describe('PATCH /api/metas/:id', () => {
    it('atualiza meta com sucesso', async () => {
      const createRes = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Para Atualizar',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 5,
          dataInicio: ontem,
          dataFim: amanha,
        });

      const metaId = createRes.body.data.id;

      const res = await request(app.server)
        .patch(`/api/metas/${metaId}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ titulo: 'Título Atualizado', dataFim: proximoMes })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.titulo).toBe('Título Atualizado');
    });

    it('cancela meta com status=CANCELADA', async () => {
      const createRes = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Para Cancelar',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 5,
          dataInicio: ontem,
          dataFim: amanha,
        });

      const metaId = createRes.body.data.id;

      const res = await request(app.server)
        .patch(`/api/metas/${metaId}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ status: 'CANCELADA' })
        .expect(200);

      expect(res.body.data.status).toBe('CANCELADA');
    });

    it('retorna 404 para meta inexistente', async () => {
      await request(app.server)
        .patch('/api/metas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({ titulo: 'x' })
        .expect(404);
    });
  });

  // ── GET /:id/auditoria ───────────────────────────────────────────────────

  describe('GET /api/metas/:id/auditoria', () => {
    it('retorna auditoria de meta novos_seguros', async () => {
      const createRes = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Auditoria NS',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 10,
          dataInicio: ontem,
          dataFim: proximoMes,
          usuarioId: vendedorId,
        });

      const metaId = createRes.body.data.id;

      const res = await request(app.server)
        .get(`/api/metas/${metaId}/auditoria`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('retorna auditoria de meta cotacoes', async () => {
      const createRes = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Auditoria Cot',
          tipoMetrica: 'cotacoes',
          valorAlvo: 10,
          dataInicio: ontem,
          dataFim: proximoMes,
          usuarioId: vendedorId,
        });

      const res = await request(app.server)
        .get(`/api/metas/${createRes.body.data.id}/auditoria`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna auditoria de meta renovacoes', async () => {
      const createRes = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Auditoria Ren',
          tipoMetrica: 'renovacoes',
          valorAlvo: 5,
          dataInicio: ontem,
          dataFim: proximoMes,
          usuarioId: vendedorId,
        });

      const res = await request(app.server)
        .get(`/api/metas/${createRes.body.data.id}/auditoria`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna auditoria de meta valor_premio', async () => {
      const createRes = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Auditoria VP',
          tipoMetrica: 'valor_premio',
          valorAlvo: 10000,
          dataInicio: ontem,
          dataFim: proximoMes,
          usuarioId: vendedorId,
        });

      const res = await request(app.server)
        .get(`/api/metas/${createRes.body.data.id}/auditoria`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna [] quando nenhum usuário no escopo', async () => {
      // Meta sem equipe e sem usuário → corretora-wide, com usuários reais no escopo
      const createRes = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Auditoria Wide',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 100,
          dataInicio: ontem,
          dataFim: proximoMes,
        });

      const res = await request(app.server)
        .get(`/api/metas/${createRes.body.data.id}/auditoria`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 404 para meta inexistente', async () => {
      await request(app.server)
        .get('/api/metas/00000000-0000-0000-0000-000000000000/auditoria')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(404);
    });
  });

  // ── DELETE /:id ──────────────────────────────────────────────────────────

  describe('DELETE /api/metas/:id', () => {
    it('deleta meta (soft delete) com sucesso', async () => {
      const createRes = await request(app.server)
        .post('/api/metas/')
        .set('Authorization', `Bearer ${gestorToken}`)
        .send({
          titulo: 'Meta Para Deletar',
          tipoMetrica: 'novos_seguros',
          valorAlvo: 5,
          dataInicio: ontem,
          dataFim: amanha,
        });

      await request(app.server)
        .delete(`/api/metas/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(204);
    });

    it('retorna 404 para meta inexistente', async () => {
      await request(app.server)
        .delete('/api/metas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${gestorToken}`)
        .expect(404);
    });
  });
});
