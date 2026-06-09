import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import { cotacoes, clientes, produtos, anexos } from '@ecotech/shared/database';
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

async function createTestAnexoCotacao(
  corretoraId: string,
  uploadPorId: string,
  cotacaoId: string,
) {
  const ts = Date.now();
  const [anexo] = await db
    .insert(anexos)
    .values({
      corretoraId,
      uploadPorId,
      entidadeId: cotacaoId,
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

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('/api/cotacoes anexos routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let cargoId: string;
  let adminToken: string;
  let cotacaoId: string;

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
    const cotacao = await createTestCotacao(
      corretoraId,
      usuarioId,
      cliente.id,
      produto.id,
    );
    cotacaoId = cotacao.id;
  });

  // ── POST /api/cotacoes/:id/anexos/upload ───────────────────────────────────

  describe('POST /api/cotacoes/:id/anexos/upload', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post(`/api/cotacoes/${cotacaoId}/anexos/upload`)
        .attach('file', Buffer.from('test'), 'test.pdf')
        .expect(401);
    });

    it('retorna 404 para cotação inexistente', async () => {
      await request(app.server)
        .post('/api/cotacoes/00000000-0000-0000-0000-000000000000/anexos/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('test'), 'test.pdf')
        .expect(404);
    });

    it('retorna 400 quando nenhum arquivo é enviado', async () => {
      const res = await request(app.server)
        .post(`/api/cotacoes/${cotacaoId}/anexos/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('dummy', 'value')
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('faz upload de arquivo com sucesso', async () => {
      const fileContent = Buffer.from('conteudo do arquivo teste');

      const res = await request(app.server)
        .post(`/api/cotacoes/${cotacaoId}/anexos/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', fileContent, {
          filename: 'documento.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      // O mock retorna { anexo: {...}, urlAssinada: ... }
      expect(res.body).toBeDefined();
    });
  });

  // ── GET /api/cotacoes/:id/anexos ───────────────────────────────────────────

  describe('GET /api/cotacoes/:id/anexos', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(`/api/cotacoes/${cotacaoId}/anexos`)
        .expect(401);
    });

    it('retorna 404 para cotação inexistente', async () => {
      await request(app.server)
        .get('/api/cotacoes/00000000-0000-0000-0000-000000000000/anexos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna lista vazia quando cotação não tem anexos', async () => {
      const produto = await createTestProduto(corretoraId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacaoSemAnexos = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      const res = await request(app.server)
        .get(`/api/cotacoes/${cotacaoSemAnexos.id}/anexos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('lista anexos existentes da cotação', async () => {
      const produto = await createTestProduto(corretoraId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );
      await createTestAnexoCotacao(corretoraId, usuarioId, cotacao.id);
      await createTestAnexoCotacao(corretoraId, usuarioId, cotacao.id);

      const res = await request(app.server)
        .get(`/api/cotacoes/${cotacao.id}/anexos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      for (const a of res.body) {
        expect(a.entidadeId).toBe(cotacao.id);
        expect(a.entidadeTipo).toBe('cotacao');
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
      const cotacao2 = await createTestCotacao(
        corretora2.id,
        usuario2.id,
        cliente2.id,
        produto2.id,
      );

      // Tentar acessar cotação de outra corretora
      await request(app.server)
        .get(`/api/cotacoes/${cotacao2.id}/anexos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('não retorna anexos deletados', async () => {
      const produto = await createTestProduto(corretoraId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      const ts = Date.now();
      await db.insert(anexos).values({
        corretoraId,
        uploadPorId: usuarioId,
        entidadeId: cotacao.id,
        entidadeTipo: 'cotacao',
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
        .get(`/api/cotacoes/${cotacao.id}/anexos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(0);
    });
  });

  // ── DELETE /api/cotacoes/:cotacaoId/anexos/:anexoId ───────────────────────

  describe('DELETE /api/cotacoes/:cotacaoId/anexos/:anexoId', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete(
          `/api/cotacoes/${cotacaoId}/anexos/00000000-0000-0000-0000-000000000000`,
        )
        .expect(401);
    });

    it('retorna 404 quando cotação não existe', async () => {
      await request(app.server)
        .delete(
          '/api/cotacoes/00000000-0000-0000-0000-000000000000/anexos/00000000-0000-0000-0000-000000000001',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 quando anexo não existe', async () => {
      await request(app.server)
        .delete(
          `/api/cotacoes/${cotacaoId}/anexos/00000000-0000-0000-0000-000000000000`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 quando anexo pertence a outra cotação', async () => {
      const produto = await createTestProduto(corretoraId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const outraCotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );
      const anexoOutraCotacao = await createTestAnexoCotacao(
        corretoraId,
        usuarioId,
        outraCotacao.id,
      );

      // Tentar deletar anexo de outra cotação
      await request(app.server)
        .delete(`/api/cotacoes/${cotacaoId}/anexos/${anexoOutraCotacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('deleta anexo da cotação com sucesso', async () => {
      const produto = await createTestProduto(corretoraId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const cotacao = await createTestCotacao(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );
      const anexo = await createTestAnexoCotacao(
        corretoraId,
        usuarioId,
        cotacao.id,
      );

      await request(app.server)
        .delete(`/api/cotacoes/${cotacao.id}/anexos/${anexo.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });
});
