import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import { notificacoes } from '@ecotech/shared/database';
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

async function createNotificacao(
  corretoraId: string,
  usuarioId: string,
  overrides: Record<string, unknown> = {},
) {
  const [notificacao] = await db
    .insert(notificacoes)
    .values({
      corretoraId,
      usuarioId,
      tipo: 'sistema',
      titulo: 'Teste de notificação',
      mensagem: 'Mensagem de teste',
      prioridade: 'media',
      lida: false,
      ...overrides,
    })
    .returning();
  return notificacao;
}

describe('/api/notificacoes', () => {
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
      isVendedor: false,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });
  });

  describe('GET /api/notificacoes', () => {

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/notificacoes').expect(401);
    });

    it('retorna lista vazia quando não há notificações', async () => {
      const res = await request(app.server)
        .get('/api/notificacoes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toEqual([]);
      expect(res.body.data.meta.total).toBe(0);
    });

    it('lista notificações do usuário logado', async () => {
      const notif1 = await createNotificacao(corretoraId, usuarioId, {
        titulo: 'Notificação 1',
      });
      const notif2 = await createNotificacao(corretoraId, usuarioId, {
        titulo: 'Notificação 2',
      });

      const res = await request(app.server)
        .get('/api/notificacoes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.data.find((n: any) => n.id === notif1.id)).toBeDefined();
      expect(res.body.data.data.find((n: any) => n.id === notif2.id)).toBeDefined();
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('filtra por lida=false', async () => {
      const notifNaoLida = await createNotificacao(corretoraId, usuarioId, { lida: false });
      const notifLida = await createNotificacao(corretoraId, usuarioId, { lida: true });

      const res = await request(app.server)
        .get('/api/notificacoes?lida=false')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.data.find((n: any) => n.id === notifNaoLida.id)).toBeDefined();
      expect(res.body.data.data.find((n: any) => n.id === notifLida.id)).toBeUndefined();
      expect(res.body.data.data.every((n: any) => n.lida === false)).toBe(true);
    });

    it('filtra por lida=true', async () => {
      const notifNaoLida = await createNotificacao(corretoraId, usuarioId, { lida: false });
      const notifLida = await createNotificacao(corretoraId, usuarioId, { lida: true });

      const res = await request(app.server)
        .get('/api/notificacoes?lida=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.data.find((n: any) => n.id === notifLida.id)).toBeDefined();
      expect(res.body.data.data.find((n: any) => n.id === notifNaoLida.id)).toBeUndefined();
      expect(res.body.data.data.every((n: any) => n.lida === true)).toBe(true);
    });

    it('filtra por tipo', async () => {
      const notifCotacao = await createNotificacao(corretoraId, usuarioId, { tipo: 'cotacao' });
      const notifSistema = await createNotificacao(corretoraId, usuarioId, { tipo: 'sistema' });

      const res = await request(app.server)
        .get('/api/notificacoes?tipo=cotacao')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.data.find((n: any) => n.id === notifCotacao.id)).toBeDefined();
      expect(res.body.data.data.find((n: any) => n.id === notifSistema.id)).toBeUndefined();
      expect(res.body.data.data.every((n: any) => n.tipo === 'cotacao')).toBe(true);
    });

    it('não retorna notificações de outro usuário (tenant isolation)', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const notifOutro = await createNotificacao(corretoraId, outroUsuario.id);

      const res = await request(app.server)
        .get('/api/notificacoes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.data.find((n: any) => n.id === notifOutro.id)).toBeUndefined();
    });

    it('não retorna notificações deletadas', async () => {
      const notifDeletada = await createNotificacao(corretoraId, usuarioId, {
        deletedAt: new Date(),
      });

      const res = await request(app.server)
        .get('/api/notificacoes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.data.find((n: any) => n.id === notifDeletada.id)).toBeUndefined();
    });
  });

  describe('GET /api/notificacoes/nao-lidas/count', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/notificacoes/nao-lidas/count')
        .expect(401);
    });

    it('retorna contagem de notificações não lidas', async () => {
      await createNotificacao(corretoraId, usuarioId, { lida: false });
      await createNotificacao(corretoraId, usuarioId, { lida: false });
      await createNotificacao(corretoraId, usuarioId, { lida: true });

      const res = await request(app.server)
        .get('/api/notificacoes/nao-lidas/count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBeGreaterThanOrEqual(2);
    });

    it('retorna 0 quando não há não lidas', async () => {
      // Marca todas as existentes como lidas antes de verificar
      await request(app.server)
        .patch('/api/notificacoes/marcar-todas-como-lidas')
        .set('Authorization', `Bearer ${token}`);

      await createNotificacao(corretoraId, usuarioId, { lida: true });

      const res = await request(app.server)
        .get('/api/notificacoes/nao-lidas/count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.count).toBe(0);
    });
  });

  describe('GET /api/notificacoes/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/notificacoes/qualquer-id')
        .expect(401);
    });

    it('retorna notificação por ID', async () => {
      const notificacao = await createNotificacao(corretoraId, usuarioId, {
        titulo: 'Minha notificação',
      });

      const res = await request(app.server)
        .get(`/api/notificacoes/${notificacao.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(notificacao.id);
      expect(res.body.data.titulo).toBe('Minha notificação');
    });

    it('retorna 404 para notificação inexistente', async () => {
      await request(app.server)
        .get('/api/notificacoes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('retorna 404 para notificação de outro usuário', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const notificacao = await createNotificacao(corretoraId, outroUsuario.id);

      await request(app.server)
        .get(`/api/notificacoes/${notificacao.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /api/notificacoes/:id/marcar-como-lida', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/notificacoes/qualquer-id/marcar-como-lida')
        .expect(401);
    });

    it('marca notificação como lida', async () => {
      const notificacao = await createNotificacao(corretoraId, usuarioId, {
        lida: false,
      });

      const res = await request(app.server)
        .patch(`/api/notificacoes/${notificacao.id}/marcar-como-lida`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.lida).toBe(true);
      expect(res.body.data.lidaEm).not.toBeNull();
    });

    it('retorna 404 para notificação inexistente', async () => {
      await request(app.server)
        .patch(
          '/api/notificacoes/00000000-0000-0000-0000-000000000000/marcar-como-lida',
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /api/notificacoes/marcar-todas-como-lidas', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/notificacoes/marcar-todas-como-lidas')
        .expect(401);
    });

    it('marca todas as notificações como lidas', async () => {
      await createNotificacao(corretoraId, usuarioId, { lida: false });
      await createNotificacao(corretoraId, usuarioId, { lida: false });
      await createNotificacao(corretoraId, usuarioId, { lida: false });

      const res = await request(app.server)
        .patch('/api/notificacoes/marcar-todas-como-lidas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verificar que count ficou 0
      const countRes = await request(app.server)
        .get('/api/notificacoes/nao-lidas/count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(countRes.body.data.count).toBe(0);
    });
  });

  describe('DELETE /api/notificacoes/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete('/api/notificacoes/qualquer-id')
        .expect(401);
    });

    it('exclui notificação (soft delete)', async () => {
      const notificacao = await createNotificacao(corretoraId, usuarioId);

      const res = await request(app.server)
        .delete(`/api/notificacoes/${notificacao.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Não deve aparecer na listagem
      const listRes = await request(app.server)
        .get('/api/notificacoes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(listRes.body.data.data.find((n: any) => n.id === notificacao.id)).toBeUndefined();
    });

    it('retorna 404 para notificação inexistente', async () => {
      await request(app.server)
        .delete('/api/notificacoes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('DELETE /api/notificacoes/lidas/excluir-todas', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete('/api/notificacoes/lidas/excluir-todas')
        .expect(401);
    });

    it('exclui todas as notificações lidas', async () => {
      const notifLida1 = await createNotificacao(corretoraId, usuarioId, { lida: true });
      const notifLida2 = await createNotificacao(corretoraId, usuarioId, { lida: true });
      const notifNaoLida = await createNotificacao(corretoraId, usuarioId, { lida: false });

      const res = await request(app.server)
        .delete('/api/notificacoes/lidas/excluir-todas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // As lidas não devem aparecer na listagem; a não lida deve permanecer
      const listRes = await request(app.server)
        .get('/api/notificacoes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(listRes.body.data.data.find((n: any) => n.id === notifLida1.id)).toBeUndefined();
      expect(listRes.body.data.data.find((n: any) => n.id === notifLida2.id)).toBeUndefined();
      expect(listRes.body.data.data.find((n: any) => n.id === notifNaoLida.id)).toBeDefined();
    });
  });
});
