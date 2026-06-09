import {
  anexos,
  canaisChat,
  canaisMembros,
  clientes,
  cotacoes,
  db,
  documentosVenda,
  mensagensChat,
  produtos,
} from '@ecotech/shared/database';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { validateEntityAccess } from '../../../src/routes/attachments/index.js';
import { buildTestApp } from '../../helpers/app.helper';
import { generateTestToken } from '../../helpers/auth.helper';
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import {
  createTestCorretora,
  createTestPlano,
} from '../../helpers/factories/corretora.factory';
import {
  createAdminCargo,
  createTestUsuario,
} from '../../helpers/factories/usuario.factory';
import { cleanDatabase } from '../../setup/test-setup';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createTestProduto(corretoraId: string) {
  const ts = Date.now();
  const [produto] = await db
    .insert(produtos)
    .values({
      corretoraId,
      nomeProduto: `Produto ${ts}`,
      tipoSeguro: 'AUTO',
      ativo: true,
    })
    .returning();
  return produto;
}

async function createTestCliente(corretoraId: string, vendedorId: string) {
  const ts = Date.now();
  const [cliente] = await db
    .insert(clientes)
    .values({
      corretoraId,
      vendedorId,
      tipoPessoa: 'PF',
      nome: `Cliente ${ts}`,
      cpf: String(ts).slice(-11).padStart(11, '0'),
      ativo: true,
    })
    .returning();
  return cliente;
}

async function createTestCotacao(
  corretoraId: string,
  vendedorId: string,
  clienteId: string,
  produtoId: string,
) {
  const ts = Date.now();
  const [cotacao] = await db
    .insert(cotacoes)
    .values({
      corretoraId,
      vendedorId,
      clienteId,
      produtoId,
      numeroCotacao: `COT-${ts}`,
      status: 'EM_ELABORACAO',
      situacao: 'NOVO',
      vigenciaInicio: '2025-01-01',
      vigenciaFim: '2025-12-31',
    })
    .returning();
  return cotacao;
}

async function createTestAnexo(
  corretoraId: string,
  uploadPorId: string,
  entidadeId: string,
  entidadeTipo: 'cotacao' | 'documento_venda' | 'mensagem_chat' = 'cotacao',
) {
  const ts = Date.now();
  const [anexo] = await db
    .insert(anexos)
    .values({
      corretoraId,
      uploadPorId,
      entidadeId,
      entidadeTipo,
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

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('/api/anexos', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let cargoId: string;
  let produtoId: string;
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
    const produto = await createTestProduto(corretoraId);
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
  });

  // ── GET /api/anexos/:id ────────────────────────────────────────────────────

  describe('GET /api/anexos/:id', () => {
    beforeAll(async () => {
      const plano = await createTestPlano();
      const corretora = await createTestCorretora(plano.id);
      corretoraId = corretora.id;
      const cargo = await createAdminCargo(corretoraId);
      cargoId = cargo.id;
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      usuarioId = usuario.id;
      const produto = await createTestProduto(corretoraId);
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
    });

    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/anexos/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('retorna 404 para anexo inexistente', async () => {
      await request(app.server)
        .get('/api/anexos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna dados do anexo', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const anexo = await createTestAnexo(
        corretoraId,
        usuarioId,
        cotacao.id,
        'cotacao',
      );

      const res = await request(app.server)
        .get(`/api/anexos/${anexo.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(anexo.id);
      expect(res.body.nomeOriginal).toBe(anexo.nomeOriginal);
      // urlAssinada pode ser null em ambiente de teste sem storage configurado
      expect(res.body).toHaveProperty('urlAssinada');
    });

    it('não retorna anexo de outra corretora (tenant isolation)', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const produto2 = await createTestProduto(corretora2.id);
      const cliente2 = await createTestCliente(corretora2.id, usuario2.id);
      const cotacao2 = await createTestCotacao(
        corretora2.id,
        usuario2.id,
        cliente2.id,
        produto2.id,
      );
      const anexoOutra = await createTestAnexo(
        corretora2.id,
        usuario2.id,
        cotacao2.id,
      );

      await request(app.server)
        .get(`/api/anexos/${anexoOutra.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── GET /api/anexos/:id/download ──────────────────────────────────────────

  describe('GET /api/anexos/:id/download', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/anexos/00000000-0000-0000-0000-000000000000/download')
        .expect(401);
    });

    it('retorna 404 para anexo inexistente', async () => {
      await request(app.server)
        .get('/api/anexos/00000000-0000-0000-0000-000000000000/download')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna URL assinada para download', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const anexo = await createTestAnexo(corretoraId, usuarioId, cotacao.id);

      const res = await request(app.server)
        .get(`/api/anexos/${anexo.id}/download`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // url pode ser null em ambiente de teste sem storage configurado
      expect(res.body).toHaveProperty('url');
      expect(res.body.expiresIn).toBe('1h');
    });
  });

  // ── GET /api/anexos/entidade/:tipo/:id ────────────────────────────────────

  describe('GET /api/anexos/entidade/:tipo/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(
          '/api/anexos/entidade/cotacao/00000000-0000-0000-0000-000000000000',
        )
        .expect(401);
    });

    it('retorna lista vazia quando entidade não tem anexos', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );

      const res = await request(app.server)
        .get(`/api/anexos/entidade/cotacao/${cotacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('retorna anexos de uma cotação', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      await createTestAnexo(corretoraId, usuarioId, cotacao.id, 'cotacao');
      await createTestAnexo(corretoraId, usuarioId, cotacao.id, 'cotacao');

      const res = await request(app.server)
        .get(`/api/anexos/entidade/cotacao/${cotacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
      for (const a of res.body) {
        expect(a.entidadeId).toBe(cotacao.id);
        expect(a).toHaveProperty('urlAssinada');
      }
    });

    it('não retorna anexos deletados', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      await db.insert(anexos).values({
        corretoraId,
        uploadPorId: usuarioId,
        entidadeId: cotacao.id,
        entidadeTipo: 'cotacao',
        nomeOriginal: 'deletado.pdf',
        nomeArquivo: 'deletado.pdf',
        mimeType: 'application/pdf',
        tamanho: 1024,
        r2Key: `${corretoraId}/deletado.pdf`,
        r2Bucket: 'ecotech-storage',
        versao: 1,
        deletedAt: new Date(),
      });

      const res = await request(app.server)
        .get(`/api/anexos/entidade/cotacao/${cotacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(0);
    });
  });

  // ── DELETE /api/anexos/:id ────────────────────────────────────────────────

  describe('DELETE /api/anexos/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete('/api/anexos/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('retorna 403 sem permissão vendas:criar_cotacao', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: [],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPerm = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: [],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const anexo = await createTestAnexo(corretoraId, usuarioId, cotacao.id);

      await request(app.server)
        .delete(`/api/anexos/${anexo.id}`)
        .set('Authorization', `Bearer ${tokenSemPerm}`)
        .expect(403);
    });

    it('retorna 404 para anexo inexistente', async () => {
      await request(app.server)
        .delete('/api/anexos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('deleta anexo com sucesso (soft delete)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const anexo = await createTestAnexo(corretoraId, usuarioId, cotacao.id);

      const res = await request(app.server)
        .delete(`/api/anexos/${anexo.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // ── GET /api/anexos/:id/versions ──────────────────────────────────────────

  describe('GET /api/anexos/:id/versions', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/anexos/00000000-0000-0000-0000-000000000000/versions')
        .expect(401);
    });

    it('retorna 404 para anexo inexistente', async () => {
      await request(app.server)
        .get('/api/anexos/00000000-0000-0000-0000-000000000000/versions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna versões de um anexo', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const anexo = await createTestAnexo(corretoraId, usuarioId, cotacao.id);

      const res = await request(app.server)
        .get(`/api/anexos/${anexo.id}/versions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── POST /api/anexos/upload ────────────────────────────────────────────────

  describe('POST /api/anexos/upload', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/anexos/upload')
        .attach('file', Buffer.from('test'), 'test.pdf')
        .expect(401);
    });

    it('retorna 400 quando nenhum arquivo é enviado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );

      const res = await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('entidadeTipo', 'cotacao')
        .field('entidadeId', cotacao.id)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('retorna 403 quando entidade não existe ou não pertence ao tenant', async () => {
      const res = await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('entidadeTipo', 'cotacao')
        .field('entidadeId', '00000000-0000-0000-0000-000000000000')
        .attach('file', Buffer.from('test content'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(403);

      expect(res.body).toBeDefined();
    });

    it('faz upload com entidade cotação válida', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );

      const res = await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('entidadeTipo', 'cotacao')
        .field('entidadeId', cotacao.id)
        .attach('file', Buffer.from('conteudo do pdf'), {
          filename: 'documento.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('retorna 400 para tipo de entidade inválido', async () => {
      await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('entidadeTipo', 'tipo_invalido')
        .field('entidadeId', '00000000-0000-0000-0000-000000000000')
        .attach('file', Buffer.from('test'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
    });
  });

  // ── POST /api/anexos/:id/new-version ───────────────────────────────────────

  describe('POST /api/anexos/:id/new-version', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/anexos/00000000-0000-0000-0000-000000000000/new-version')
        .attach('file', Buffer.from('test'), 'test.pdf')
        .expect(401);
    });

    it('retorna 404 para anexo inexistente', async () => {
      await request(app.server)
        .post('/api/anexos/00000000-0000-0000-0000-000000000000/new-version')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('test'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(404);
    });

    it('retorna 400 quando nenhum arquivo é enviado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const anexo = await createTestAnexo(corretoraId, usuarioId, cotacao.id);

      const res = await request(app.server)
        .post(`/api/anexos/${anexo.id}/new-version`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('dummy', 'sem arquivo')
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('não aceita nova versão de anexo de outra corretora (tenant isolation)', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const produto2 = await createTestProduto(corretora2.id);
      const cliente2 = await createTestCliente(corretora2.id, usuario2.id);
      const cotacao2 = await createTestCotacao(
        corretora2.id,
        usuario2.id,
        cliente2.id,
        produto2.id,
      );
      const anexoOutra = await createTestAnexo(
        corretora2.id,
        usuario2.id,
        cotacao2.id,
      );

      await request(app.server)
        .post(`/api/anexos/${anexoOutra.id}/new-version`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('nova versao'), {
          filename: 'novo.pdf',
          contentType: 'application/pdf',
        })
        .expect(404);
    });
  });

  // ── POST /api/anexos/:id/extract-pdf ──────────────────────────────────────

  describe('POST /api/anexos/:id/extract-pdf', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/anexos/00000000-0000-0000-0000-000000000000/extract-pdf')
        .expect(401);
    });

    it('retorna 404 para anexo inexistente', async () => {
      await request(app.server)
        .post('/api/anexos/00000000-0000-0000-0000-000000000000/extract-pdf')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 400 para anexo que não é PDF', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const ts = Date.now();
      const [anexoImagem] = await db
        .insert(anexos)
        .values({
          corretoraId,
          uploadPorId: usuarioId,
          entidadeId: cotacao.id,
          entidadeTipo: 'cotacao',
          nomeOriginal: `imagem-${ts}.png`,
          nomeArquivo: `${ts}.png`,
          mimeType: 'image/png',
          tamanho: 1024,
          r2Key: `${corretoraId}/${ts}.png`,
          r2Bucket: 'ecotech-storage',
          versao: 1,
        })
        .returning();

      const res = await request(app.server)
        .post(`/api/anexos/${anexoImagem.id}/extract-pdf`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('PDF');
    });

    it('extrai texto de PDF com sucesso', async () => {
      const { StorageService, PdfExtractor } = await import(
        '@ecotech/shared/storage'
      );

      // The app is a singleton (buildTestApp caches it). Get the actual instances
      // created at plugin registration time via mock.results (return values).
      const storageResults = vi.mocked(StorageService).mock.results;
      const pdfResults = vi.mocked(PdfExtractor).mock.results;

      if (storageResults.length > 0) {
        const storageInst = storageResults[storageResults.length - 1]
          .value as any;
        storageInst.downloadFile = vi
          .fn()
          .mockResolvedValue(Buffer.from('%PDF-1.4 test'));
      }

      if (pdfResults.length > 0) {
        const pdfInst = pdfResults[pdfResults.length - 1].value as any;
        pdfInst.extract = vi
          .fn()
          .mockResolvedValue({ text: 'Texto extraído', metadata: {} });
        pdfInst.cleanText = vi.fn().mockReturnValue('Texto extraído');
      }

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const ts = Date.now();
      const [anexoPdf] = await db
        .insert(anexos)
        .values({
          corretoraId,
          uploadPorId: usuarioId,
          entidadeId: cotacao.id,
          entidadeTipo: 'cotacao',
          nomeOriginal: `doc-${ts}.pdf`,
          nomeArquivo: `${ts}.pdf`,
          mimeType: 'application/pdf',
          tamanho: 2048,
          r2Key: `${corretoraId}/${ts}.pdf`,
          r2Bucket: 'ecotech-storage',
          versao: 1,
        })
        .returning();

      const res = await request(app.server)
        .post(`/api/anexos/${anexoPdf.id}/extract-pdf`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  // ── validateEntityAccess - branches ───────────────────────────────────────

  describe('POST /api/anexos/upload - validateEntityAccess branches', () => {
    it('retorna 403 quando entidade documento_venda não existe', async () => {
      await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('entidadeTipo', 'documento_venda')
        .field('entidadeId', '00000000-0000-0000-0000-000000000000')
        .attach('file', Buffer.from('test content'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(403);
    });

    it('faz upload com entidade documento_venda válida', async () => {
      // Criar documento_venda
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const ts = Date.now();
      const [produto] = await db
        .insert(produtos)
        .values({
          corretoraId,
          nomeProduto: `Produto Doc ${ts}`,
          tipoSeguro: 'AUTO',
          ativo: true,
        })
        .returning();
      const [docVenda] = await db
        .insert(documentosVenda)
        .values({
          corretoraId,
          vendedorId: usuarioId,
          clienteId: cliente.id,
          produtoId: produto.id,
          numeroDocumento: `DOC-${ts}`,
          status: 'ATIVO',
          tipoDocumento: 'COTACAO_DIRETA',
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
        })
        .returning();

      const res = await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('entidadeTipo', 'documento_venda')
        .field('entidadeId', docVenda.id)
        .attach('file', Buffer.from('conteudo do pdf'), {
          filename: 'documento.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('retorna 403 para mensagem_chat inexistente', async () => {
      await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('entidadeTipo', 'mensagem_chat')
        .field('entidadeId', '00000000-0000-0000-0000-000000000000')
        .attach('file', Buffer.from('test content'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(403);
    });

    it('retorna 403 quando mensagem_chat pertence a canal de outra corretora', async () => {
      const planoOutro = await createTestPlano();
      const corretoraOutra = await createTestCorretora(planoOutro.id);
      const cargoOutro = await createAdminCargo(corretoraOutra.id);
      const usuarioOutro = await createTestUsuario(
        corretoraOutra.id,
        cargoOutro.id,
      );

      // Canal da OUTRA corretora
      const [canalOutro] = await db
        .insert(canaisChat)
        .values({
          corretoraId: corretoraOutra.id,
          tipo: 'geral',
          nome: `Canal Outro ${Date.now()}`,
          criadoPorId: usuarioOutro.id,
          ativo: true,
        })
        .returning();

      const [mensagemOutra] = await db
        .insert(mensagensChat)
        .values({
          canalId: canalOutro.id,
          usuarioId: usuarioOutro.id,
          tipo: 'texto',
          conteudo: 'Mensagem outra corretora',
        })
        .returning();

      await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('entidadeTipo', 'mensagem_chat')
        .field('entidadeId', mensagemOutra.id)
        .attach('file', Buffer.from('test content'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(403);
    });

    it('retorna 403 quando usuário não é membro do canal da mensagem_chat', async () => {
      // Criar canal com outro usuário sem o adminToken como membro
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      const [canal] = await db
        .insert(canaisChat)
        .values({
          corretoraId,
          tipo: 'geral',
          nome: `Canal ${Date.now()}`,
          criadoPorId: outroUsuario.id,
          ativo: true,
        })
        .returning();
      await db.insert(canaisMembros).values({
        canalId: canal.id,
        usuarioId: outroUsuario.id,
        adicionadoPorId: outroUsuario.id,
        isAdmin: true,
      });

      const [mensagem] = await db
        .insert(mensagensChat)
        .values({
          canalId: canal.id,
          usuarioId: outroUsuario.id,
          tipo: 'texto',
          conteudo: 'Mensagem teste',
        })
        .returning();

      await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('entidadeTipo', 'mensagem_chat')
        .field('entidadeId', mensagem.id)
        .attach('file', Buffer.from('test content'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(403);
    });

    it('faz upload com entidade mensagem_chat válida (membro do canal)', async () => {
      // Criar canal com o adminToken como membro
      const [canal] = await db
        .insert(canaisChat)
        .values({
          corretoraId,
          tipo: 'geral',
          nome: `Canal Membro ${Date.now()}`,
          criadoPorId: usuarioId,
          ativo: true,
        })
        .returning();
      await db.insert(canaisMembros).values({
        canalId: canal.id,
        usuarioId,
        adicionadoPorId: usuarioId,
        isAdmin: true,
      });

      const [mensagem] = await db
        .insert(mensagensChat)
        .values({
          canalId: canal.id,
          usuarioId,
          tipo: 'texto',
          conteudo: 'Mensagem para upload',
        })
        .returning();

      const res = await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('entidadeTipo', 'mensagem_chat')
        .field('entidadeId', mensagem.id)
        .attach('file', Buffer.from('conteudo'), {
          filename: 'arquivo.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  // ── POST /api/anexos/upload - error handling ───────────────────────────────

  describe('POST /api/anexos/upload - tratamento de erros', () => {
    // Use a dedicated user to avoid rate-limit interference from previous upload tests
    let errToken: string;
    let errCorretoraId: string;
    let errUserId: string;
    let errProdutoId: string;

    beforeAll(async () => {
      const plano = await createTestPlano();
      const corretora = await createTestCorretora(plano.id);
      errCorretoraId = corretora.id;
      const cargo = await createAdminCargo(errCorretoraId);
      const usuario = await createTestUsuario(errCorretoraId, cargo.id);
      errUserId = usuario.id;

      const ts = Date.now();
      const [produto] = await db
        .insert(produtos)
        .values({
          corretoraId: errCorretoraId,
          nomeProduto: `Prod Err ${ts}`,
          tipoSeguro: 'AUTO',
          ativo: true,
        })
        .returning();
      errProdutoId = produto.id;

      errToken = generateTestToken(app, {
        sub: errUserId,
        corretoraId: errCorretoraId,
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

    it('retorna 400 quando storage lança erro "não permitido"', async () => {
      const { StorageService } = await import('@ecotech/shared/storage');
      // The app is a singleton — get the instance returned at registration time
      const results = vi.mocked(StorageService).mock.results;
      const storageInst =
        results.length > 0 ? (results[results.length - 1].value as any) : null;

      const defaultImpl = vi.fn().mockResolvedValue({
        anexo: {
          id: '00000000-0000-0000-0000-000000000099',
          nomeOriginal: 'test.pdf',
        },
        urlAssinada: 'https://mock-r2.com/signed',
      });

      if (storageInst) {
        storageInst.uploadFile = vi
          .fn()
          .mockRejectedValueOnce(new Error('Tipo não permitido'))
          .mockImplementation(defaultImpl);
      }

      const cliente = await createTestCliente(errCorretoraId, errUserId);
      const cotacao = await createTestCotacao(
        errCorretoraId,
        errUserId,
        cliente.id,
        errProdutoId,
      );

      const res = await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${errToken}`)
        .field('entidadeTipo', 'cotacao')
        .field('entidadeId', cotacao.id)
        .attach('file', Buffer.from('test'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);

      expect(res.body.error).toBeDefined();

      // Restore
      if (storageInst) {
        storageInst.uploadFile = defaultImpl;
      }
    });

    it('retorna 413 quando storage lança erro "muito grande"', async () => {
      const { StorageService } = await import('@ecotech/shared/storage');
      const results = vi.mocked(StorageService).mock.results;
      const storageInst =
        results.length > 0 ? (results[results.length - 1].value as any) : null;

      const defaultImpl = vi.fn().mockResolvedValue({
        anexo: {
          id: '00000000-0000-0000-0000-000000000099',
          nomeOriginal: 'test.pdf',
        },
        urlAssinada: 'https://mock-r2.com/signed',
      });

      if (storageInst) {
        storageInst.uploadFile = vi
          .fn()
          .mockRejectedValueOnce(new Error('Arquivo muito grande'))
          .mockImplementation(defaultImpl);
      }

      const cliente = await createTestCliente(errCorretoraId, errUserId);
      const cotacao = await createTestCotacao(
        errCorretoraId,
        errUserId,
        cliente.id,
        errProdutoId,
      );

      await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${errToken}`)
        .field('entidadeTipo', 'cotacao')
        .field('entidadeId', cotacao.id)
        .attach('file', Buffer.from('test'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(413);

      // Restore
      if (storageInst) {
        storageInst.uploadFile = defaultImpl;
      }
    });
  });

  // ── POST /api/anexos/:id/new-version - success ─────────────────────────────

  describe('POST /api/anexos/:id/new-version - sucesso', () => {
    it('faz upload de nova versão com sucesso', async () => {
      const { StorageService } = await import('@ecotech/shared/storage');

      // The app is singleton — get the returned instance from mock.results
      const results = vi.mocked(StorageService).mock.results;
      if (results.length > 0) {
        const storageInst = results[results.length - 1].value as any;
        storageInst.uploadNewVersion = vi.fn().mockResolvedValue({
          id: '00000000-0000-0000-0000-000000000099',
          versao: 2,
        });
      }

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const anexo = await createTestAnexo(corretoraId, usuarioId, cotacao.id);

      const res = await request(app.server)
        .post(`/api/anexos/${anexo.id}/new-version`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('nova versao do arquivo'), {
          filename: 'nova-versao.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body).toBeDefined();
    });
  });

  // ── getSignedUrl error handling ───────────────────────────────────────────

  describe('getSignedUrl error handling', () => {
    it('GET /api/anexos/:id retorna urlAssinada null quando getSignedUrl lança erro', async () => {
      const { StorageService } = await import('@ecotech/shared/storage');
      const results = vi.mocked(StorageService).mock.results;
      const storageInst =
        results.length > 0 ? (results[results.length - 1].value as any) : null;

      if (storageInst) {
        storageInst.getSignedUrl = vi
          .fn()
          .mockRejectedValueOnce(new Error('Storage unavailable'));
      }

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const anexo = await createTestAnexo(corretoraId, usuarioId, cotacao.id);

      const res = await request(app.server)
        .get(`/api/anexos/${anexo.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('urlAssinada');
      expect(res.body.urlAssinada).toBeNull();

      // Restore
      if (storageInst) {
        storageInst.getSignedUrl = vi
          .fn()
          .mockResolvedValue('https://mock-r2.com/signed');
      }
    });

    it('GET /api/anexos/:id retorna urlAssinada null quando getSignedUrl retorna undefined', async () => {
      const { StorageService } = await import('@ecotech/shared/storage');
      const results = vi.mocked(StorageService).mock.results;
      const storageInst =
        results.length > 0 ? (results[results.length - 1].value as any) : null;

      if (storageInst) {
        storageInst.getSignedUrl = vi.fn().mockResolvedValueOnce(undefined);
      }

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const anexo = await createTestAnexo(corretoraId, usuarioId, cotacao.id);

      const res = await request(app.server)
        .get(`/api/anexos/${anexo.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.urlAssinada).toBeNull();

      // Restore
      if (storageInst) {
        storageInst.getSignedUrl = vi
          .fn()
          .mockResolvedValue('https://mock-r2.com/signed');
      }
    });

    it('GET /api/anexos/:id/download retorna url null quando getSignedUrl lança erro', async () => {
      const { StorageService } = await import('@ecotech/shared/storage');
      const results = vi.mocked(StorageService).mock.results;
      const storageInst =
        results.length > 0 ? (results[results.length - 1].value as any) : null;

      if (storageInst) {
        storageInst.getSignedUrl = vi
          .fn()
          .mockRejectedValueOnce(new Error('Storage unavailable'));
      }

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const anexo = await createTestAnexo(corretoraId, usuarioId, cotacao.id);

      const res = await request(app.server)
        .get(`/api/anexos/${anexo.id}/download`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('url');
      expect(res.body.url).toBeNull();

      // Restore
      if (storageInst) {
        storageInst.getSignedUrl = vi
          .fn()
          .mockResolvedValue('https://mock-r2.com/signed');
      }
    });

    it('GET /api/anexos/:id/download retorna url null quando getSignedUrl retorna undefined', async () => {
      const { StorageService } = await import('@ecotech/shared/storage');
      const results = vi.mocked(StorageService).mock.results;
      const storageInst =
        results.length > 0 ? (results[results.length - 1].value as any) : null;

      if (storageInst) {
        storageInst.getSignedUrl = vi.fn().mockResolvedValueOnce(undefined);
      }

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      const anexo = await createTestAnexo(corretoraId, usuarioId, cotacao.id);

      const res = await request(app.server)
        .get(`/api/anexos/${anexo.id}/download`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.url).toBeNull();

      // Restore
      if (storageInst) {
        storageInst.getSignedUrl = vi
          .fn()
          .mockResolvedValue('https://mock-r2.com/signed');
      }
    });

    it('GET /api/anexos/entidade/:tipo/:id retorna urlAssinada null quando getSignedUrl lança erro', async () => {
      const { StorageService } = await import('@ecotech/shared/storage');
      const results = vi.mocked(StorageService).mock.results;
      const storageInst =
        results.length > 0 ? (results[results.length - 1].value as any) : null;

      if (storageInst) {
        storageInst.getSignedUrl = vi
          .fn()
          .mockRejectedValue(new Error('Storage unavailable'));
      }

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      await createTestAnexo(corretoraId, usuarioId, cotacao.id);

      const res = await request(app.server)
        .get(`/api/anexos/entidade/cotacao/${cotacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const a of res.body) {
        expect(a.urlAssinada).toBeNull();
      }

      // Restore
      if (storageInst) {
        storageInst.getSignedUrl = vi
          .fn()
          .mockResolvedValue('https://mock-r2.com/signed');
      }
    });

    it('GET /api/anexos/entidade/:tipo/:id retorna urlAssinada null quando getSignedUrl retorna undefined', async () => {
      const { StorageService } = await import('@ecotech/shared/storage');
      const results = vi.mocked(StorageService).mock.results;
      const storageInst =
        results.length > 0 ? (results[results.length - 1].value as any) : null;

      if (storageInst) {
        storageInst.getSignedUrl = vi.fn().mockResolvedValue(undefined);
      }

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produtoId,
      );
      await createTestAnexo(corretoraId, usuarioId, cotacao.id);

      const res = await request(app.server)
        .get(`/api/anexos/entidade/cotacao/${cotacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const a of res.body) {
        expect(a.urlAssinada).toBeNull();
      }

      // Restore
      if (storageInst) {
        storageInst.getSignedUrl = vi
          .fn()
          .mockResolvedValue('https://mock-r2.com/signed');
      }
    });
  });

  // ── Rate limit (POST /api/anexos/upload) ──────────────────────────────────

  describe('POST /api/anexos/upload - rate limit', () => {
    it('retorna 429 após 10 uploads em 1 minuto', async () => {
      // Criar um usuário dedicado para este teste (não afeta outros)
      const planoRl = await createTestPlano();
      const corretoraRl = await createTestCorretora(planoRl.id);
      const cargoRl = await createAdminCargo(corretoraRl.id);
      const usuarioRl = await createTestUsuario(corretoraRl.id, cargoRl.id);

      const tokenRl = generateTestToken(app, {
        sub: usuarioRl.id,
        corretoraId: corretoraRl.id,
        cargoId: cargoRl.id,
        isAdmin: true,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: usuarioRl.nome,
        email: usuarioRl.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraRl.id, usuarioRl.id);
      const ts = Date.now();
      const [produtoRl] = await db
        .insert(produtos)
        .values({
          corretoraId: corretoraRl.id,
          nomeProduto: `Prod RL ${ts}`,
          tipoSeguro: 'AUTO',
          ativo: true,
        })
        .returning();
      const cotacao = await createTestCotacao(
        corretoraRl.id,
        usuarioRl.id,
        cliente.id,
        produtoRl.id,
      );

      // Fazer 10 uploads (todos devem passar)
      for (let i = 0; i < 10; i++) {
        await request(app.server)
          .post('/api/anexos/upload')
          .set('Authorization', `Bearer ${tokenRl}`)
          .field('entidadeTipo', 'cotacao')
          .field('entidadeId', cotacao.id)
          .attach('file', Buffer.from(`file ${i}`), {
            filename: `file${i}.pdf`,
            contentType: 'application/pdf',
          })
          .expect(201);
      }

      // O 11º upload deve retornar 429
      const res = await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${tokenRl}`)
        .field('entidadeTipo', 'cotacao')
        .field('entidadeId', cotacao.id)
        .attach('file', Buffer.from('file 11'), {
          filename: 'file11.pdf',
          contentType: 'application/pdf',
        })
        .expect(429);

      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('Limite de uploads excedido');
    });

    it('reseta contador de uploads após janela de 1 minuto expirar', async () => {
      // Criar usuário dedicado para este teste
      const planoReset = await createTestPlano();
      const corretoraReset = await createTestCorretora(planoReset.id);
      const cargoReset = await createAdminCargo(corretoraReset.id);
      const usuarioReset = await createTestUsuario(
        corretoraReset.id,
        cargoReset.id,
      );

      const tokenReset = generateTestToken(app, {
        sub: usuarioReset.id,
        corretoraId: corretoraReset.id,
        cargoId: cargoReset.id,
        isAdmin: true,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: usuarioReset.nome,
        email: usuarioReset.email,
        avatarUrl: null,
      });

      const clienteReset = await createTestCliente(
        corretoraReset.id,
        usuarioReset.id,
      );
      const ts = Date.now();
      const [produtoReset] = await db
        .insert(produtos)
        .values({
          corretoraId: corretoraReset.id,
          nomeProduto: `Prod Reset ${ts}`,
          tipoSeguro: 'AUTO',
          ativo: true,
        })
        .returning();
      const cotacaoReset = await createTestCotacao(
        corretoraReset.id,
        usuarioReset.id,
        clienteReset.id,
        produtoReset.id,
      );

      // Fazer 10 uploads para atingir o limite (todos devem passar)
      for (let i = 0; i < 10; i++) {
        await request(app.server)
          .post('/api/anexos/upload')
          .set('Authorization', `Bearer ${tokenReset}`)
          .field('entidadeTipo', 'cotacao')
          .field('entidadeId', cotacaoReset.id)
          .attach('file', Buffer.from(`file ${i}`), {
            filename: `filereset${i}.pdf`,
            contentType: 'application/pdf',
          })
          .expect(201);
      }

      // O 11º deve ser bloqueado (429)
      await request(app.server)
        .post('/api/anexos/upload')
        .set('Authorization', `Bearer ${tokenReset}`)
        .field('entidadeTipo', 'cotacao')
        .field('entidadeId', cotacaoReset.id)
        .attach('file', Buffer.from('file 11'), {
          filename: 'filereset11.pdf',
          contentType: 'application/pdf',
        })
        .expect(429);

      // Agora manipular o resetTime via Date.now para simular janela expirada
      // Fazemos mock de Date.now para retornar um valor no futuro (> resetTime)
      const futureTime = Date.now() + 120_000; // 2 minutos no futuro
      const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(futureTime);

      try {
        // Após janela expirar, o upload deve funcionar novamente
        const res = await request(app.server)
          .post('/api/anexos/upload')
          .set('Authorization', `Bearer ${tokenReset}`)
          .field('entidadeTipo', 'cotacao')
          .field('entidadeId', cotacaoReset.id)
          .attach('file', Buffer.from('file after reset'), {
            filename: 'filereset_after.pdf',
            contentType: 'application/pdf',
          })
          .expect(201);

        expect(res.body.success).toBe(true);
      } finally {
        dateSpy.mockRestore();
      }
    });
  });
});

// ── validateEntityAccess - default branch (unit test) ─────────────────────

describe('validateEntityAccess - default branch', () => {
  it('retorna false para entidadeTipo desconhecido', async () => {
    const result = await validateEntityAccess(
      'tipo_desconhecido',
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
    );
    expect(result).toBe(false);
  });
});
