import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
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

async function createCanalGeral(corretoraId: string, criadoPorId: string) {
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
  await db
    .insert(canaisMembros)
    .values({ canalId, usuarioId, adicionadoPorId, isAdmin });
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('POST /api/chat/upload', () => {
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

  it('retorna 401 sem token', async () => {
    await request(app.server)
      .post('/api/chat/upload?canalId=00000000-0000-0000-0000-000000000000')
      .attach('file', Buffer.from('test'), 'test.pdf')
      .expect(401);
  });

  it('retorna 404 para canal inexistente', async () => {
    await request(app.server)
      .post('/api/chat/upload?canalId=00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('test'), 'test.pdf')
      .expect(404);
  });

  it('retorna 403 quando usuário não é membro do canal', async () => {
    const outroUsuario = await createTestUsuario(corretoraId, cargoId);
    const canal = await createCanalGeral(corretoraId, outroUsuario.id);
    await addMembro(canal.id, outroUsuario.id, outroUsuario.id, true);

    await request(app.server)
      .post(`/api/chat/upload?canalId=${canal.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('test'), 'test.pdf')
      .expect(403);
  });

  it('retorna 400 quando nenhum arquivo é enviado', async () => {
    const canal = await createCanalGeral(corretoraId, usuarioId);
    await addMembro(canal.id, usuarioId, usuarioId, true);

    const res = await request(app.server)
      .post(`/api/chat/upload?canalId=${canal.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('mensagem', 'sem arquivo')
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  it('faz upload de arquivo com sucesso e retorna mensagem', async () => {
    const canal = await createCanalGeral(corretoraId, usuarioId);
    await addMembro(canal.id, usuarioId, usuarioId, true);

    const res = await request(app.server)
      .post(`/api/chat/upload?canalId=${canal.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('conteudo do arquivo de chat'), {
        filename: 'documento.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('faz upload com legenda via query string', async () => {
    const canal = await createCanalGeral(corretoraId, usuarioId);
    await addMembro(canal.id, usuarioId, usuarioId, true);

    const res = await request(app.server)
      .post(`/api/chat/upload?canalId=${canal.id}&legenda=veja+este+arquivo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('conteudo'), {
        filename: 'doc.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  it('retorna 400 quando chatService lança erro "não permitido"', async () => {
    const canal = await createCanalGeral(corretoraId, usuarioId);
    await addMembro(canal.id, usuarioId, usuarioId, true);

    // Patch all StorageService instances so sendFileMessage's internal upload throws
    const { StorageService } = await import('@ecotech/shared/storage');
    const savedImpls = vi.mocked(StorageService).mock.results.map((r) => {
      const inst = r.value as any;
      const saved = inst?.uploadFile;
      if (inst) {
        inst.uploadFile = vi
          .fn()
          .mockRejectedValueOnce(new Error('Tipo não permitido'))
          .mockResolvedValue({
            anexo: { id: '00000000-0000-0000-0000-000000000099', nomeOriginal: 'test.pdf' },
            urlAssinada: 'https://mock-r2.com/signed',
          });
      }
      return { inst, saved };
    });

    const res = await request(app.server)
      .post(`/api/chat/upload?canalId=${canal.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('test'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);

    expect(res.body.error).toBeDefined();

    for (const { inst, saved } of savedImpls) {
      if (inst) inst.uploadFile = saved;
    }
  });

  it('retorna 413 quando chatService lança erro "muito grande"', async () => {
    const canal = await createCanalGeral(corretoraId, usuarioId);
    await addMembro(canal.id, usuarioId, usuarioId, true);

    const { StorageService } = await import('@ecotech/shared/storage');
    const savedImpls = vi.mocked(StorageService).mock.results.map((r) => {
      const inst = r.value as any;
      const saved = inst?.uploadFile;
      if (inst) {
        inst.uploadFile = vi
          .fn()
          .mockRejectedValueOnce(new Error('Arquivo muito grande'))
          .mockResolvedValue({
            anexo: { id: '00000000-0000-0000-0000-000000000099', nomeOriginal: 'test.pdf' },
            urlAssinada: 'https://mock-r2.com/signed',
          });
      }
      return { inst, saved };
    });

    await request(app.server)
      .post(`/api/chat/upload?canalId=${canal.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('test'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
      .expect(413);

    for (const { inst, saved } of savedImpls) {
      if (inst) inst.uploadFile = saved;
    }
  });
});
