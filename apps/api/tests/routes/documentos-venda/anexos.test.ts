import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import { documentosVenda, clientes, produtos, anexos } from '@ecotech/shared/database';
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

async function createTestDocumentoVenda(
  corretoraId: string,
  vendedorId: string,
  clienteId: string,
  produtoId: string,
) {
  const ts = Date.now();
  const [doc] = await db
    .insert(documentosVenda)
    .values({
      corretoraId,
      vendedorId,
      clienteId,
      produtoId,
      tipoDocumento: 'COTACAO_DIRETA',
      numeroDocumento: `DOC-${ts}`,
      status: 'EM_NEGOCIACAO',
      vigenciaInicio: '2026-01-01',
      vigenciaFim: '2027-01-01',
      premioLiquido: '1000.00',
      percentualComissao: '10',
      valorComissao: '100',
    } as any)
    .returning();
  return doc;
}

async function createTestAnexoDocumento(
  corretoraId: string,
  uploadPorId: string,
  documentoId: string,
) {
  const ts = Date.now();
  const [anexo] = await db
    .insert(anexos)
    .values({
      corretoraId,
      uploadPorId,
      entidadeId: documentoId,
      entidadeTipo: 'documento_venda',
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

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('/api/documentos-venda anexos routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let cargoId: string;
  let adminToken: string;
  let documentoId: string;

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
      isVendedor: true,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });

    const produto = await createTestProduto(corretoraId);
    const cliente = await createTestCliente(corretoraId, usuarioId);
    const documento = await createTestDocumentoVenda(
      corretoraId,
      usuarioId,
      cliente.id,
      produto.id,
    );
    documentoId = documento.id;
  });

  // ── POST /api/documentos-venda/:id/anexos/upload ───────────────────────────

  describe('POST /api/documentos-venda/:id/anexos/upload', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post(`/api/documentos-venda/${documentoId}/anexos/upload`)
        .attach('file', Buffer.from('test'), 'test.pdf')
        .expect(401);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/anexos/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.pdf')
        .expect(404);
    });

    it('retorna 400 quando nenhum arquivo é enviado', async () => {
      const res = await request(app.server)
        .post(`/api/documentos-venda/${documentoId}/anexos/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('dummy', 'value')
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('faz upload de arquivo com sucesso', async () => {
      const fileContent = Buffer.from('conteudo do arquivo teste');

      const res = await request(app.server)
        .post(`/api/documentos-venda/${documentoId}/anexos/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', fileContent, {
          filename: 'documento.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body).toBeDefined();
    });

    it('retorna 400 quando storage lança erro "não permitido"', async () => {
      const { StorageService } = await import('@ecotech/shared/storage');
      // Patch uploadFile on ALL StorageService instances created so far
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
        .post(`/api/documentos-venda/${documentoId}/anexos/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('test'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);

      expect(res.body.error).toBeDefined();

      // Restore
      for (const { inst, saved } of savedImpls) {
        if (inst) inst.uploadFile = saved;
      }
    });

    it('retorna 413 quando storage lança erro "muito grande"', async () => {
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
        .post(`/api/documentos-venda/${documentoId}/anexos/upload`)
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

  // ── GET /api/documentos-venda/:id/anexos ──────────────────────────────────

  describe('GET /api/documentos-venda/:id/anexos', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(`/api/documentos-venda/${documentoId}/anexos`)
        .expect(401);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .get('/api/documentos-venda/00000000-0000-0000-0000-000000000000/anexos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna lista vazia quando documento não tem anexos', async () => {
      const produto = await createTestProduto(corretoraId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const docSemAnexos = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      const res = await request(app.server)
        .get(`/api/documentos-venda/${docSemAnexos.id}/anexos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('lista anexos existentes do documento', async () => {
      const produto = await createTestProduto(corretoraId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );
      await createTestAnexoDocumento(corretoraId, usuarioId, doc.id);
      await createTestAnexoDocumento(corretoraId, usuarioId, doc.id);

      const res = await request(app.server)
        .get(`/api/documentos-venda/${doc.id}/anexos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      for (const a of res.body) {
        expect(a.entidadeId).toBe(doc.id);
        expect(a.entidadeTipo).toBe('documento_venda');
        expect(a).toHaveProperty('urlAssinada');
      }
    });

    it('não retorna anexos de outra corretora (tenant isolation)', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const produto2 = await createTestProduto(corretora2.id);
      const cliente2 = await createTestCliente(corretora2.id, usuario2.id);
      const doc2 = await createTestDocumentoVenda(
        corretora2.id,
        usuario2.id,
        cliente2.id,
        produto2.id,
      );

      await request(app.server)
        .get(`/api/documentos-venda/${doc2.id}/anexos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('não retorna anexos deletados', async () => {
      const produto = await createTestProduto(corretoraId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      const ts = Date.now();
      await db.insert(anexos).values({
        corretoraId,
        uploadPorId: usuarioId,
        entidadeId: doc.id,
        entidadeTipo: 'documento_venda',
        nomeOriginal: `deletado-${ts}.pdf`,
        nomeArquivo: `deletado-${ts}.pdf`,
        mimeType: 'application/pdf',
        tamanho: 512,
        r2Key: `${corretoraId}/deletado-${ts}.pdf`,
        r2Bucket: 'ecotech-storage',
        versao: 1,
        deletedAt: new Date(),
      });

      const res = await request(app.server)
        .get(`/api/documentos-venda/${doc.id}/anexos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(0);
    });
  });

  // ── DELETE /api/documentos-venda/:documentoId/anexos/:anexoId ─────────────

  describe('DELETE /api/documentos-venda/:documentoId/anexos/:anexoId', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete(
          `/api/documentos-venda/${documentoId}/anexos/00000000-0000-0000-0000-000000000000`,
        )
        .expect(401);
    });

    it('retorna 404 quando documento não existe', async () => {
      await request(app.server)
        .delete(
          '/api/documentos-venda/00000000-0000-0000-0000-000000000000/anexos/00000000-0000-0000-0000-000000000001',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 quando anexo não existe', async () => {
      await request(app.server)
        .delete(
          `/api/documentos-venda/${documentoId}/anexos/00000000-0000-0000-0000-000000000000`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 quando anexo pertence a outro documento', async () => {
      const produto = await createTestProduto(corretoraId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const outroDoc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );
      const anexoOutroDoc = await createTestAnexoDocumento(
        corretoraId,
        usuarioId,
        outroDoc.id,
      );

      await request(app.server)
        .delete(`/api/documentos-venda/${documentoId}/anexos/${anexoOutroDoc.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('deleta anexo do documento com sucesso', async () => {
      const produto = await createTestProduto(corretoraId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );
      const anexo = await createTestAnexoDocumento(corretoraId, usuarioId, doc.id);

      await request(app.server)
        .delete(`/api/documentos-venda/${doc.id}/anexos/${anexo.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });
});
