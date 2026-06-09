import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import { canaisChat, canaisMembros } from '@ecotech/shared/database';
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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createCanalGeral(
  corretoraId: string,
  criadoPorId: string,
  overrides: Record<string, unknown> = {},
) {
  const [canal] = await db
    .insert(canaisChat)
    .values({
      corretoraId,
      tipo: 'geral',
      nome: `Canal Teste ${Date.now()}`,
      criadoPorId,
      ativo: true,
      ...overrides,
    })
    .returning();
  return canal;
}

async function addMembro(
  canalId: string,
  usuarioId: string,
  adicionadoPorId: string,
  isAdmin = false,
) {
  const [membro] = await db
    .insert(canaisMembros)
    .values({ canalId, usuarioId, adicionadoPorId, isAdmin })
    .returning();
  return membro;
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('/api/chat', () => {
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

  // ── GET /api/chat ──────────────────────────────────────────────────────────

  describe('GET /api/chat', () => {
    beforeEach(async () => {
      await db.delete(canaisMembros);
      await db.delete(canaisChat);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/chat').expect(401);
    });

    it('retorna lista vazia quando não há canais', async () => {
      const res = await request(app.server)
        .get('/api/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.canais).toBeDefined();
      expect(Array.isArray(res.body.canais)).toBe(true);
      expect(res.body.canais).toHaveLength(0);
    });

    it('retorna canais em que o usuário é membro', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const res = await request(app.server)
        .get('/api/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.canais).toHaveLength(1);
      expect(res.body.canais[0].id).toBe(canal.id);
      expect(res.body.canais[0].tipo).toBe('geral');
    });

    it('não retorna canais em que o usuário não é membro', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const canal = await createCanalGeral(corretoraId, outroUsuario.id);
      await addMembro(canal.id, outroUsuario.id, outroUsuario.id, true);

      const res = await request(app.server)
        .get('/api/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.canais).toHaveLength(0);
    });

    it('retorna canal direto onde usuário é participante', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      await db.insert(canaisChat).values({
        corretoraId,
        tipo: 'direto',
        usuarioId1: usuarioId,
        usuarioId2: outroUsuario.id,
        criadoPorId: usuarioId,
        ativo: true,
      });

      const res = await request(app.server)
        .get('/api/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.canais).toHaveLength(1);
      expect(res.body.canais[0].tipo).toBe('direto');
    });
  });

  // ── POST /api/chat ─────────────────────────────────────────────────────────

  describe('POST /api/chat', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/chat')
        .send({ nome: 'Novo Canal', membrosIds: [] })
        .expect(401);
    });

    it('retorna 403 para não-admin', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const tokenNaoAdmin = generateTestToken(app, {
        sub: outroUsuario.id,
        corretoraId,
        cargoId,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: outroUsuario.nome,
        email: outroUsuario.email,
        avatarUrl: null,
      });

      await request(app.server)
        .post('/api/chat')
        .set('Authorization', `Bearer ${tokenNaoAdmin}`)
        .send({ nome: 'Canal do Vendedor', membrosIds: [usuarioId] })
        .expect(403);
    });

    it('admin cria canal geral com sucesso', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);

      const res = await request(app.server)
        .post('/api/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nome: 'Canal Geral',
          descricao: 'Descrição do canal',
          membrosIds: [outroUsuario.id],
        })
        .expect(201);

      expect(res.body.canal).toBeDefined();
      expect(res.body.canal.nome).toBe('Canal Geral');
      expect(res.body.canal.tipo).toBe('geral');
    });

    it('criador é automaticamente adicionado como admin do canal', async () => {
      const outroMembro = await createTestUsuario(corretoraId, cargoId);
      const res = await request(app.server)
        .post('/api/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Canal Admin', membrosIds: [outroMembro.id] })
        .expect(201);

      const canalId = res.body.canal.id;
      const membro = await db.query.canaisMembros.findFirst({
        where: (m, { and, eq }) =>
          and(eq(m.canalId, canalId), eq(m.usuarioId, usuarioId)),
      });

      expect(membro).toBeDefined();
      expect(membro?.isAdmin).toBe(true);
    });
  });

  // ── POST /api/chat/direto ──────────────────────────────────────────────────

  describe('POST /api/chat/direto', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/chat/direto')
        .send({ usuarioDestinoId: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });

    it('retorna 400 ao tentar criar DM consigo mesmo', async () => {
      await request(app.server)
        .post('/api/chat/direto')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usuarioDestinoId: usuarioId })
        .expect(400);
    });

    it('cria canal direto entre dois usuários', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);

      const res = await request(app.server)
        .post('/api/chat/direto')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usuarioDestinoId: outroUsuario.id })
        .expect(201);

      expect(res.body.canal).toBeDefined();
      expect(res.body.canal.tipo).toBe('direto');
      expect(res.body.created).toBe(true);
    });

    it('retorna canal existente se DM já existe', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);

      // Criar primeiro DM
      await request(app.server)
        .post('/api/chat/direto')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usuarioDestinoId: outroUsuario.id })
        .expect(201);

      // Tentar criar novamente - deve retornar o existente
      const res = await request(app.server)
        .post('/api/chat/direto')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usuarioDestinoId: outroUsuario.id })
        .expect(200);

      expect(res.body.created).toBe(false);
      expect(res.body.canal).toBeDefined();
    });
  });

  // ── GET /api/chat/:canalId/mensagens ──────────────────────────────────────

  describe('GET /api/chat/:canalId/mensagens', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/chat/00000000-0000-0000-0000-000000000000/mensagens')
        .expect(401);
    });

    it('retorna 404 para canal inexistente', async () => {
      await request(app.server)
        .get('/api/chat/00000000-0000-0000-0000-000000000000/mensagens')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 403 para canal em que não é membro', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const canal = await createCanalGeral(corretoraId, outroUsuario.id);
      await addMembro(canal.id, outroUsuario.id, outroUsuario.id, true);

      await request(app.server)
        .get(`/api/chat/${canal.id}/mensagens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('retorna mensagens do canal como membro', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const res = await request(app.server)
        .get(`/api/chat/${canal.id}/mensagens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.mensagens).toBeDefined();
      expect(Array.isArray(res.body.mensagens)).toBe(true);
    });

    it('membro de canal direto pode ver mensagens', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const [canalDireto] = await db
        .insert(canaisChat)
        .values({
          corretoraId,
          tipo: 'direto',
          usuarioId1: usuarioId,
          usuarioId2: outroUsuario.id,
          criadoPorId: usuarioId,
          ativo: true,
        })
        .returning();

      const res = await request(app.server)
        .get(`/api/chat/${canalDireto.id}/mensagens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.mensagens).toBeDefined();
    });
  });

  // ── POST /api/chat/:canalId/membros ───────────────────────────────────────

  describe('POST /api/chat/:canalId/membros', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/chat/00000000-0000-0000-0000-000000000000/membros')
        .send({ usuarioId: '00000000-0000-0000-0000-000000000001' })
        .expect(401);
    });

    it('retorna 404 para canal direto (apenas geral aceita membros)', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const [canalDireto] = await db
        .insert(canaisChat)
        .values({
          corretoraId,
          tipo: 'direto',
          usuarioId1: usuarioId,
          usuarioId2: outroUsuario.id,
          criadoPorId: usuarioId,
          ativo: true,
        })
        .returning();

      const terceiroUsuario = await createTestUsuario(corretoraId, cargoId);
      await request(app.server)
        .post(`/api/chat/${canalDireto.id}/membros`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usuarioId: terceiroUsuario.id })
        .expect(404);
    });

    it('retorna 403 quando não é admin do canal', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const canal = await createCanalGeral(corretoraId, outroUsuario.id);
      // Adicionar usuário como membro não-admin
      await addMembro(canal.id, usuarioId, outroUsuario.id, false);

      const terceiroUsuario = await createTestUsuario(corretoraId, cargoId);
      await request(app.server)
        .post(`/api/chat/${canal.id}/membros`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usuarioId: terceiroUsuario.id })
        .expect(403);
    });

    it('admin do canal adiciona membro com sucesso', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const novoMembro = await createTestUsuario(corretoraId, cargoId);
      const res = await request(app.server)
        .post(`/api/chat/${canal.id}/membros`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usuarioId: novoMembro.id })
        .expect(201);

      expect(res.body.message).toBeDefined();
    });
  });

  // ── GET /api/chat/:canalId/membros ────────────────────────────────────────

  describe('GET /api/chat/:canalId/membros', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/chat/00000000-0000-0000-0000-000000000000/membros')
        .expect(401);
    });

    it('retorna 404 para canal inexistente', async () => {
      await request(app.server)
        .get('/api/chat/00000000-0000-0000-0000-000000000000/membros')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna membros de canal geral', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const res = await request(app.server)
        .get(`/api/chat/${canal.id}/membros`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.membros).toBeDefined();
      expect(Array.isArray(res.body.membros)).toBe(true);
      expect(res.body.membros.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── DELETE /api/chat/:canalId/membros/:membroId ───────────────────────────

  describe('DELETE /api/chat/:canalId/membros/:membroId', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete(
          '/api/chat/00000000-0000-0000-0000-000000000000/membros/00000000-0000-0000-0000-000000000001',
        )
        .expect(401);
    });

    it('retorna 400 ao tentar remover a si mesmo', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      await request(app.server)
        .delete(`/api/chat/${canal.id}/membros/${usuarioId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('admin do canal remove membro', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      await addMembro(canal.id, outroUsuario.id, usuarioId, false);

      await request(app.server)
        .delete(`/api/chat/${canal.id}/membros/${outroUsuario.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ── POST /api/chat/:canalId/sair ──────────────────────────────────────────

  describe('POST /api/chat/:canalId/sair', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/chat/00000000-0000-0000-0000-000000000000/sair')
        .expect(401);
    });

    it('retorna 400 quando é o último admin e há outros membros', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      await addMembro(canal.id, outroUsuario.id, usuarioId, false);

      await request(app.server)
        .post(`/api/chat/${canal.id}/sair`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('membro sai do canal com sucesso', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, false);

      await request(app.server)
        .post(`/api/chat/${canal.id}/sair`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ── PATCH /api/chat/:canalId/configuracoes ────────────────────────────────

  describe('PATCH /api/chat/:canalId/configuracoes', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch(
          '/api/chat/00000000-0000-0000-0000-000000000000/configuracoes',
        )
        .send({ nome: 'Novo Nome' })
        .expect(401);
    });

    it('retorna 403 para não-admin do canal', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const canal = await createCanalGeral(corretoraId, outroUsuario.id);
      await addMembro(canal.id, usuarioId, outroUsuario.id, false);

      await request(app.server)
        .patch(`/api/chat/${canal.id}/configuracoes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Novo Nome' })
        .expect(403);
    });

    it('admin do canal atualiza nome e descrição', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const res = await request(app.server)
        .patch(`/api/chat/${canal.id}/configuracoes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Nome Atualizado', descricao: 'Nova descrição' })
        .expect(200);

      expect(res.body.message).toBeDefined();
    });
  });

  // ── GET /api/chat/usuarios/:usuarioId/perfil ──────────────────────────────

  describe('GET /api/chat/usuarios/:usuarioId/perfil', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(
          '/api/chat/usuarios/00000000-0000-0000-0000-000000000000/perfil',
        )
        .expect(401);
    });

    it('retorna 404 para usuário inexistente', async () => {
      await request(app.server)
        .get(
          '/api/chat/usuarios/00000000-0000-0000-0000-000000000000/perfil',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna perfil de usuário existente', async () => {
      const res = await request(app.server)
        .get(`/api/chat/usuarios/${usuarioId}/perfil`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.usuario).toBeDefined();
      expect(res.body.usuario.id).toBe(usuarioId);
    });
  });

  // ── GET /api/chat/:canalId/usuarios ───────────────────────────────────────

  describe('GET /api/chat/:canalId/usuarios', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/chat/00000000-0000-0000-0000-000000000000/usuarios')
        .expect(401);
    });

    it('retorna 404 para canal inexistente', async () => {
      await request(app.server)
        .get('/api/chat/00000000-0000-0000-0000-000000000000/usuarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna usuários do canal para menções', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      await addMembro(canal.id, outroUsuario.id, usuarioId, false);

      const res = await request(app.server)
        .get(`/api/chat/${canal.id}/usuarios`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      // Não inclui o próprio usuário
      const ids = res.body.data.map((u: any) => u.id);
      expect(ids).not.toContain(usuarioId);
    });
  });
});
