import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  canaisChat,
  canaisMembros,
  mensagensChat,
  anexos,
} from '@ecotech/shared/database';
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
) {
  const [canal] = await db
    .insert(canaisChat)
    .values({
      corretoraId,
      tipo: 'geral',
      nome: `Canal Teste ${Date.now()}`,
      criadoPorId,
      ativo: true,
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

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('/api/chat anexos routes', () => {
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

  // ── POST /api/chat/canais/:canalId/anexos/upload ───────────────────────────

  describe('POST /api/chat/canais/:canalId/anexos/upload', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post(
          '/api/chat/canais/00000000-0000-0000-0000-000000000000/anexos/upload',
        )
        .attach('file', Buffer.from('test'), 'test.pdf')
        .expect(401);
    });

    it('retorna 404 para canal inexistente', async () => {
      await request(app.server)
        .post(
          '/api/chat/canais/00000000-0000-0000-0000-000000000000/anexos/upload',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.pdf')
        .expect(404);
    });

    it('retorna 403 quando usuário não é membro do canal', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const canal = await createCanalGeral(corretoraId, outroUsuario.id);
      await addMembro(canal.id, outroUsuario.id, outroUsuario.id, true);

      await request(app.server)
        .post(`/api/chat/canais/${canal.id}/anexos/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.pdf')
        .expect(403);
    });

    it('retorna 400 quando nenhum arquivo é enviado', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const res = await request(app.server)
        .post(`/api/chat/canais/${canal.id}/anexos/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('mensagem', 'sem arquivo')
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('processa upload de arquivo e retorna mensagem criada', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const fileContent = Buffer.from('conteudo do arquivo de chat');

      // O route guarda chatService em `if (chatService)`, então sem WebSocket
      // o broadcast é simplesmente ignorado e o upload retorna 200 normalmente.
      const res = await request(app.server)
        .post(`/api/chat/canais/${canal.id}/anexos/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', fileContent, {
          filename: 'documento.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.mensagem).toBeDefined();
      expect(res.body.mensagem.tipo).toBe('arquivo');
      expect(res.body.anexo).toBeDefined();
    });

    it('processa upload com legenda e retorna dados corretos', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const fileContent = Buffer.from('conteudo do arquivo');

      const res = await request(app.server)
        .post(`/api/chat/canais/${canal.id}/anexos/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('mensagem', 'veja este documento')
        .attach('file', fileContent, {
          filename: 'doc.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.mensagem).toBeDefined();
      expect(res.body.mensagem.conteudo).toBe('veja este documento');
      expect(res.body.anexo).toBeDefined();
    });
  });

  // ── GET /api/chat/canais/:canalId/anexos ──────────────────────────────────

  describe('GET /api/chat/canais/:canalId/anexos', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(
          '/api/chat/canais/00000000-0000-0000-0000-000000000000/anexos',
        )
        .expect(401);
    });

    it('retorna 404 para canal inexistente', async () => {
      await request(app.server)
        .get('/api/chat/canais/00000000-0000-0000-0000-000000000000/anexos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 403 quando usuário não é membro do canal', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const canal = await createCanalGeral(corretoraId, outroUsuario.id);
      await addMembro(canal.id, outroUsuario.id, outroUsuario.id, true);

      await request(app.server)
        .get(`/api/chat/canais/${canal.id}/anexos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('retorna lista vazia quando canal não tem arquivos', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const res = await request(app.server)
        .get(`/api/chat/canais/${canal.id}/anexos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('lista anexos do canal para membro', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      // Criar mensagem de arquivo diretamente no banco
      const ts = Date.now();
      const [mensagem] = await db
        .insert(mensagensChat)
        .values({
          canalId: canal.id,
          usuarioId,
          tipo: 'arquivo',
          conteudo: `Enviou: arquivo-${ts}.pdf`,
        })
        .returning();

      await db.insert(anexos).values({
        corretoraId,
        uploadPorId: usuarioId,
        entidadeId: mensagem.id,
        entidadeTipo: 'mensagem_chat',
        nomeOriginal: `arquivo-${ts}.pdf`,
        nomeArquivo: `${ts}.pdf`,
        mimeType: 'application/pdf',
        tamanho: 1024,
        r2Key: `${corretoraId}/${ts}.pdf`,
        r2Bucket: 'ecotech-storage',
        versao: 1,
      });

      const res = await request(app.server)
        .get(`/api/chat/canais/${canal.id}/anexos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      for (const a of res.body) {
        expect(a).toHaveProperty('urlAssinada');
        expect(a.entidadeTipo).toBe('mensagem_chat');
      }
    });
  });

  // ── GET /api/chat/mensagens/:mensagemId/anexo ─────────────────────────────

  describe('GET /api/chat/mensagens/:mensagemId/anexo', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(
          '/api/chat/mensagens/00000000-0000-0000-0000-000000000000/anexo',
        )
        .expect(401);
    });

    it('retorna 404 para mensagem inexistente', async () => {
      await request(app.server)
        .get('/api/chat/mensagens/00000000-0000-0000-0000-000000000000/anexo')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 403 quando usuário não é membro do canal da mensagem', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const canal = await createCanalGeral(corretoraId, outroUsuario.id);
      await addMembro(canal.id, outroUsuario.id, outroUsuario.id, true);

      // Criar mensagem no canal onde o usuário do adminToken não é membro
      const [mensagem] = await db
        .insert(mensagensChat)
        .values({
          canalId: canal.id,
          usuarioId: outroUsuario.id,
          tipo: 'arquivo',
          conteudo: 'Enviou: arquivo.pdf',
        })
        .returning();

      await request(app.server)
        .get(`/api/chat/mensagens/${mensagem.id}/anexo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('retorna 404 quando mensagem não tem anexo', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const [mensagem] = await db
        .insert(mensagensChat)
        .values({
          canalId: canal.id,
          usuarioId,
          tipo: 'arquivo',
          conteudo: 'Enviou: arquivo.pdf',
        })
        .returning();

      await request(app.server)
        .get(`/api/chat/mensagens/${mensagem.id}/anexo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna anexo da mensagem com URL assinada', async () => {
      const canal = await createCanalGeral(corretoraId, usuarioId);
      await addMembro(canal.id, usuarioId, usuarioId, true);

      const ts = Date.now();
      const [mensagem] = await db
        .insert(mensagensChat)
        .values({
          canalId: canal.id,
          usuarioId,
          tipo: 'arquivo',
          conteudo: `Enviou: arquivo-${ts}.pdf`,
        })
        .returning();

      await db.insert(anexos).values({
        corretoraId,
        uploadPorId: usuarioId,
        entidadeId: mensagem.id,
        entidadeTipo: 'mensagem_chat',
        nomeOriginal: `arquivo-${ts}.pdf`,
        nomeArquivo: `${ts}.pdf`,
        mimeType: 'application/pdf',
        tamanho: 1024,
        r2Key: `${corretoraId}/${ts}.pdf`,
        r2Bucket: 'ecotech-storage',
        versao: 1,
      });

      const res = await request(app.server)
        .get(`/api/chat/mensagens/${mensagem.id}/anexo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBeDefined();
      expect(res.body.entidadeTipo).toBe('mensagem_chat');
      expect(res.body.entidadeId).toBe(mensagem.id);
      expect(res.body).toHaveProperty('urlAssinada');
    });
  });
});
