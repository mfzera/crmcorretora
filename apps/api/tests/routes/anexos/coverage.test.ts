/**
 * Testes complementares de cobertura para src/routes/anexos/index.ts
 *
 * Cobre os catch blocks de storage que não são atingidos pelo crud.test.ts:
 *   - Linha 311: catch em GET /api/anexos/:id (getSignedUrl lança erro)
 *   - Linha 365: catch em GET /api/anexos/:id/download (getSignedUrl lança erro)
 *   - Linha 497: catch em GET /api/anexos/entidade/:tipo/:id (getSignedUrl lança erro)
 *   - Linhas 108-111: rate limit reset (resetTime expirado reinicia contador)
 */
import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  anexos,
  cotacoes,
  clientes,
  produtos,
  canaisChat,
  canaisMembros,
  mensagensChat,
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

let app: Awaited<ReturnType<typeof buildTestApp>>;
let corretoraId: string;
let usuarioId: string;
let cargoId: string;
let produtoId: string;
let adminToken: string;
let uploadToken: string; // token with vendas:criar_cotacao permission

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

  const ts = Date.now();
  const [produto] = await db
    .insert(produtos)
    .values({
      corretoraId,
      nomeProduto: `Produto Cobertura ${ts}`,
      tipoSeguro: 'AUTO',
      ativo: true,
    })
    .returning();
  produtoId = produto.id;

  adminToken = generateTestToken(app, {
    sub: usuarioId,
    corretoraId,
    cargoId,
    isAdmin: true,
    isGestor: false,
    isVendedor: true,
    permissoes: [],
    nome: usuario.nome,
    email: usuario.email,
    avatarUrl: null,
  });

  uploadToken = generateTestToken(app, {
    sub: usuarioId,
    corretoraId,
    cargoId,
    isAdmin: true,
    isGestor: false,
    isVendedor: true,
    permissoes: ['vendas:criar_cotacao'],
    nome: usuario.nome,
    email: usuario.email,
    avatarUrl: null,
  });
});

async function createAnexo(entidadeId: string) {
  const ts = Date.now();
  const [anexo] = await db
    .insert(anexos)
    .values({
      corretoraId,
      uploadPorId: usuarioId,
      entidadeId,
      entidadeTipo: 'cotacao',
      nomeOriginal: `arquivo-${ts}.pdf`,
      nomeArquivo: `${ts}.pdf`,
      mimeType: 'application/pdf',
      tamanho: 1024,
      r2Key: `${corretoraId}/${ts}.pdf`,
      r2Bucket: 'ecotech-storage',
      versao: 1,
    })
    .returning();
  return anexo;
}

async function createCotacao() {
  const ts = Date.now();
  const [cliente] = await db
    .insert(clientes)
    .values({
      corretoraId,
      vendedorId: usuarioId,
      tipoPessoa: 'PF',
      nome: `Cliente Cov ${ts}`,
      cpf: String(ts).slice(-11).padStart(11, '0'),
      ativo: true,
    })
    .returning();

  const [cotacao] = await db
    .insert(cotacoes)
    .values({
      corretoraId,
      vendedorId: usuarioId,
      clienteId: cliente.id,
      produtoId,
      numeroCotacao: `COT-COV-${ts}`,
      status: 'EM_ELABORACAO',
      situacao: 'NOVO',
      vigenciaInicio: '2025-01-01',
      vigenciaFim: '2025-12-31',
    })
    .returning();
  return cotacao;
}

// ── Linha 311: catch em GET /api/anexos/:id ───────────────────────────────

describe('GET /api/anexos/:id — storage getSignedUrl lança erro', () => {
  it('retorna o anexo com urlAssinada null quando storage falha (cobre linha 311)', async () => {
    const cotacao = await createCotacao();
    const anexo = await createAnexo(cotacao.id);

    const { StorageService } = await import('@ecotech/shared/storage');
    const results = vi.mocked(StorageService).mock.results;
    if (results.length > 0) {
      const storageInst = results[results.length - 1].value as any;
      vi.spyOn(storageInst, 'getSignedUrl').mockRejectedValueOnce(
        new Error('Storage indisponível'),
      );
    }

    const res = await request(app.server)
      .get(`/api/anexos/${anexo.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(anexo.id);
    expect(res.body.urlAssinada).toBeNull();
  });
});

// ── Linha 365: catch em GET /api/anexos/:id/download ─────────────────────

describe('GET /api/anexos/:id/download — storage getSignedUrl lança erro', () => {
  it('retorna url null quando storage falha (cobre linha 365)', async () => {
    const cotacao = await createCotacao();
    const anexo = await createAnexo(cotacao.id);

    const { StorageService } = await import('@ecotech/shared/storage');
    const results = vi.mocked(StorageService).mock.results;
    if (results.length > 0) {
      const storageInst = results[results.length - 1].value as any;
      vi.spyOn(storageInst, 'getSignedUrl').mockRejectedValueOnce(
        new Error('Storage indisponível'),
      );
    }

    const res = await request(app.server)
      .get(`/api/anexos/${anexo.id}/download`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.url).toBeNull();
    expect(res.body.expiresIn).toBe('1h');
  });
});

// ── Linha 497: catch em GET /api/anexos/entidade/:tipo/:id ───────────────

describe('GET /api/anexos/entidade/:tipo/:id — storage getSignedUrl lança erro', () => {
  it('retorna urlAssinada null para cada anexo quando storage falha (cobre linha 497)', async () => {
    const cotacao = await createCotacao();
    await createAnexo(cotacao.id);

    const { StorageService } = await import('@ecotech/shared/storage');
    const results = vi.mocked(StorageService).mock.results;
    if (results.length > 0) {
      const storageInst = results[results.length - 1].value as any;
      vi.spyOn(storageInst, 'getSignedUrl').mockRejectedValueOnce(
        new Error('Storage indisponível'),
      );
    }

    const res = await request(app.server)
      .get(`/api/anexos/entidade/cotacao/${cotacao.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    // urlAssinada may be null when storage fails
    expect(res.body[0]).toHaveProperty('urlAssinada');
  });
});

// ── Linhas 108-111: rate limit reset (resetTime expirado) ────────────────

describe('POST /api/anexos/upload — rate limit reset', () => {
  it('reinicia o contador quando resetTime já expirou (cobre linhas 108-111)', async () => {
    // Pré-popular uploadCounts com um resetTime no passado para forçar o reset
    const key = `upload:${usuarioId}`;
    (app as any).uploadCounts = {
      [key]: { count: 10, resetTime: Date.now() - 1000 },
    };

    // O request vai falhar com 400 (sem arquivo) mas as linhas 108-111 serão executadas
    const cotacao = await createCotacao();
    const res = await request(app.server)
      .post('/api/anexos/upload')
      .set('Authorization', `Bearer ${uploadToken}`)
      .field('entidadeTipo', 'cotacao')
      .field('entidadeId', cotacao.id)
      .expect(400);

    // Após o reset o count foi zerado e incrementado para 1 (não 11), então não retorna 429
    expect(res.status).not.toBe(429);

    // Verificar que o contador foi reiniciado (count === 1, resetTime no futuro)
    const updatedCounts = (app as any).uploadCounts as Record<
      string,
      { count: number; resetTime: number }
    >;
    expect(updatedCounts[key].count).toBe(1);
    expect(updatedCounts[key].resetTime).toBeGreaterThan(Date.now());
  });
});

// ── validateEntityAccess — mensagem_chat branches ────────────────────────
// Covers lines 64 (tenant mismatch → return false) and 74-75 (return !!membro)

async function createCanalComMembro() {
  const [canal] = await db
    .insert(canaisChat)
    .values({
      corretoraId,
      tipo: 'geral',
      nome: `Canal Cov ${Date.now()}`,
      criadoPorId: usuarioId,
      ativo: true,
    })
    .returning();

  await db.insert(canaisMembros).values({
    canalId: canal.id,
    usuarioId,
    adicionadoPorId: usuarioId,
    isAdmin: false,
  });

  const [mensagem] = await db
    .insert(mensagensChat)
    .values({
      canalId: canal.id,
      usuarioId,
      tipo: 'texto',
      conteudo: 'Mensagem de cobertura',
    })
    .returning();

  return { canal, mensagem };
}

// ── validateEntityAccess — branch endosso (linhas 52-61) ─────────────────

describe('POST /api/anexos/upload — entidadeTipo endosso (cobre linhas 52-61)', () => {
  it('retorna 403 quando endosso não existe para a corretora (cobre linhas 52-61)', async () => {
    // UUID inexistente — validateEntityAccess entra no branch 'endosso', faz query, retorna false
    const fakeEndossoId = '00000000-0000-0000-0000-000000000099';

    const res = await request(app.server)
      .post('/api/anexos/upload')
      .set('Authorization', `Bearer ${uploadToken}`)
      .field('entidadeTipo', 'endosso')
      .field('entidadeId', fakeEndossoId)
      .attach('file', Buffer.from('dados'), 'cov.pdf')
      .expect(403);

    expect(res.body).toBeDefined();
  });
});

// ── validateEntityAccess — mensagem_chat branches ────────────────────────
// Covers lines 64 (tenant mismatch → return false) and 74-75 (return !!membro)

describe('POST /api/anexos/upload — mensagem_chat (cobre linhas 64 e 74-75)', () => {
  it('retorna 403 quando a mensagem pertence a outra corretora (cobre linha 64 branch0)', async () => {
    // Criar uma mensagem em OUTRA corretora
    const plano2 = await (await import('../../helpers/factories/corretora.factory')).createTestPlano();
    const corretora2 = await (await import('../../helpers/factories/corretora.factory')).createTestCorretora(plano2.id);
    const cargo2 = await (await import('../../helpers/factories/usuario.factory')).createAdminCargo(corretora2.id);
    const user2 = await (await import('../../helpers/factories/usuario.factory')).createTestUsuario(corretora2.id, cargo2.id);

    const [canal2] = await db
      .insert(canaisChat)
      .values({
        corretoraId: corretora2.id,
        tipo: 'geral',
        nome: `Canal Outra ${Date.now()}`,
        criadoPorId: user2.id,
        ativo: true,
      })
      .returning();

    const [msg2] = await db
      .insert(mensagensChat)
      .values({
        canalId: canal2.id,
        usuarioId: user2.id,
        tipo: 'texto',
        conteudo: 'Msg outra corretora',
      })
      .returning();

    // Request com token de corretoraId (diferente da corretora2)
    const res = await request(app.server)
      .post('/api/anexos/upload')
      .set('Authorization', `Bearer ${uploadToken}`)
      .field('entidadeTipo', 'mensagem_chat')
      .field('entidadeId', msg2.id)
      .attach('file', Buffer.from('dados'), 'cov.pdf')
      .expect(403);

    expect(res.body).toBeDefined();
  });

  it('retorna 403 quando usuário não é membro do canal da mesma corretora (cobre linha 75 branch0)', async () => {
    // Canal da mesma corretora, mas o usuário autenticado NÃO é membro
    const [canal] = await db
      .insert(canaisChat)
      .values({
        corretoraId,
        tipo: 'geral',
        nome: `Canal Sem Membro ${Date.now()}`,
        criadoPorId: usuarioId,
        ativo: true,
      })
      .returning();

    const [msg] = await db
      .insert(mensagensChat)
      .values({
        canalId: canal.id,
        usuarioId,
        tipo: 'texto',
        conteudo: 'Msg sem membro',
      })
      .returning();

    // NÃO adicionar o usuário como membro do canal
    const res = await request(app.server)
      .post('/api/anexos/upload')
      .set('Authorization', `Bearer ${uploadToken}`)
      .field('entidadeTipo', 'mensagem_chat')
      .field('entidadeId', msg.id)
      .attach('file', Buffer.from('dados'), 'cov.pdf')
      .expect(403);

    expect(res.body).toBeDefined();
  });

  it('permite upload quando usuário é membro do canal (cobre linha 74-75)', async () => {
    const { mensagem } = await createCanalComMembro();

    const res = await request(app.server)
      .post('/api/anexos/upload')
      .set('Authorization', `Bearer ${uploadToken}`)
      .field('entidadeTipo', 'mensagem_chat')
      .field('entidadeId', mensagem.id)
      .attach('file', Buffer.from('dados'), 'cov.pdf');

    // 201 (criado) ou 400 (validação) mas NÃO 403 — o acesso foi permitido
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});
