import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import { anexos } from '@ecotech/shared/database';
import { storageClient } from '@ecotech/shared/storage';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import {
  createTestPlano,
  createTestCorretora,
} from '../../helpers/factories/corretora.factory';
import { createTestUsuario } from '../../helpers/factories/usuario.factory';
import { generateTestToken } from '../../helpers/auth.helper';

describe('/api/admin/migrar-anexos', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let tokenAdmin: string;
  let tokenSemPermissao: string;
  let corretoraId: string;
  let usuarioId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    const usuario = await createTestUsuario(corretoraId, null);
    usuarioId = usuario.id;

    // Token com permissão admin:gerenciar_sistema
    tokenAdmin = generateTestToken(app, {
      sub: usuarioId,
      corretoraId,
      cargoId: null,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: ['admin:gerenciar_sistema'],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });

    // Token sem a permissão necessária
    tokenSemPermissao = generateTestToken(app, {
      sub: usuarioId,
      corretoraId,
      cargoId: null,
      isAdmin: false,
      isGestor: false,
      isVendedor: true,
      permissoes: ['cotacoes:visualizar'],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });
  });

  // ── GET /api/admin/migrar-anexos/verificar ─────────────────────────────────

  describe('GET /api/admin/migrar-anexos/verificar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/admin/migrar-anexos/verificar')
        .expect(401);
    });

    it('retorna 403 para usuário sem permissão admin:gerenciar_sistema', async () => {
      const res = await request(app.server)
        .get('/api/admin/migrar-anexos/verificar')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Acesso negado');
    });

    it('retorna lista vazia quando não há anexos para migrar', async () => {
      const res = await request(app.server)
        .get('/api/admin/migrar-anexos/verificar')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(0);
      expect(Array.isArray(res.body.anexos)).toBe(true);
    });

    it('retorna anexos que precisam migração (documento_venda em pasta cotacaos)', async () => {
      // Inserir um anexo de documento_venda com r2Key no formato errado (pasta cotacaos)
      await db.insert(anexos).values({
        corretoraId,
        uploadPorId: usuarioId,
        entidadeId: '00000000-0000-0000-0000-000000000001',
        entidadeTipo: 'documento_venda',
        nomeOriginal: 'contrato.pdf',
        nomeArquivo: 'contrato.pdf',
        r2Key: `cotacaos/${corretoraId}/abc/contrato.pdf`,
        r2Bucket: 'ecotech-dev',
        mimeType: 'application/pdf',
        tamanho: 1024,
      });

      const res = await request(app.server)
        .get('/api/admin/migrar-anexos/verificar')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.anexos.length).toBeGreaterThanOrEqual(1);

      const anexo = res.body.anexos[0];
      expect(anexo.id).toBeDefined();
      expect(anexo.nomeOriginal).toBe('contrato.pdf');
      expect(anexo.r2KeyAtual).toContain('cotacaos/');
      expect(anexo.r2KeyNovo).toContain('documento_vendas/');
    });

    it('não retorna anexos de cotacao (apenas documento_venda)', async () => {
      // Inserir anexo de cotacao com r2Key em pasta cotacaos (não deve ser retornado)
      await db.insert(anexos).values({
        corretoraId,
        uploadPorId: usuarioId,
        entidadeId: '00000000-0000-0000-0000-000000000002',
        entidadeTipo: 'cotacao',
        nomeOriginal: 'orcamento.pdf',
        nomeArquivo: 'orcamento.pdf',
        r2Key: `cotacaos/${corretoraId}/xyz/orcamento.pdf`,
        r2Bucket: 'ecotech-dev',
        mimeType: 'application/pdf',
        tamanho: 512,
      });

      const res = await request(app.server)
        .get('/api/admin/migrar-anexos/verificar')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(0);
    });
  });

  // ── POST /api/admin/migrar-anexos/executar ─────────────────────────────────

  describe('POST /api/admin/migrar-anexos/executar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/admin/migrar-anexos/executar')
        .expect(401);
    });

    it('retorna 403 para usuário sem permissão admin:gerenciar_sistema', async () => {
      const res = await request(app.server)
        .post('/api/admin/migrar-anexos/executar')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Acesso negado');
    });

    it('retorna sucesso quando não há anexos para migrar', async () => {
      const res = await request(app.server)
        .post('/api/admin/migrar-anexos/executar')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Nenhum anexo precisa ser migrado');
    });

    it('executa migração e reporta erro quando arquivo não existe no storage', async () => {
      // Inserir anexo de documento_venda em pasta errada
      await db.insert(anexos).values({
        corretoraId,
        uploadPorId: usuarioId,
        entidadeId: '00000000-0000-0000-0000-000000000001',
        entidadeTipo: 'documento_venda',
        nomeOriginal: 'contrato.pdf',
        nomeArquivo: 'contrato.pdf',
        r2Key: `cotacaos/${corretoraId}/abc/contrato.pdf`,
        r2Bucket: 'ecotech-dev',
        mimeType: 'application/pdf',
        tamanho: 1024,
      });

      const res = await request(app.server)
        .post('/api/admin/migrar-anexos/executar')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.resultados).toBeDefined();
      expect(res.body.resultados.total).toBeGreaterThanOrEqual(1);
      // O arquivo não existe no storage de teste, deve registrar erro
      expect(res.body.resultados.erros + res.body.resultados.sucessos).toBe(
        res.body.resultados.total,
      );
      expect(Array.isArray(res.body.resultados.detalhes)).toBe(true);
    });

    it('executa migração para múltiplos anexos e retorna detalhes completos', async () => {
      // Inserir dois anexos que precisam de migração
      await db.insert(anexos).values([
        {
          corretoraId,
          uploadPorId: usuarioId,
          entidadeId: '00000000-0000-0000-0000-000000000002',
          entidadeTipo: 'documento_venda',
          nomeOriginal: 'apólice.pdf',
          nomeArquivo: 'apolice.pdf',
          r2Key: `cotacaos/${corretoraId}/xyz/apolice.pdf`,
          r2Bucket: 'ecotech-dev',
          mimeType: 'application/pdf',
          tamanho: 2048,
        },
        {
          corretoraId,
          uploadPorId: usuarioId,
          entidadeId: '00000000-0000-0000-0000-000000000003',
          entidadeTipo: 'documento_venda',
          nomeOriginal: 'sinistro.pdf',
          nomeArquivo: 'sinistro.pdf',
          r2Key: `cotacaos/${corretoraId}/abc/sinistro.pdf`,
          r2Bucket: 'ecotech-dev',
          mimeType: 'application/pdf',
          tamanho: 4096,
        },
      ]);

      const res = await request(app.server)
        .post('/api/admin/migrar-anexos/executar')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.resultados.total).toBeGreaterThanOrEqual(2);
      expect(res.body.resultados.detalhes).toBeDefined();
      expect(Array.isArray(res.body.resultados.detalhes)).toBe(true);
      // erros + sucessos = total
      expect(res.body.resultados.erros + res.body.resultados.sucessos).toBe(
        res.body.resultados.total,
      );
    });

    it('migra com sucesso quando arquivo existe no storage (caminho de sucesso)', async () => {
      // Inserir anexo que precisa de migração
      await db.insert(anexos).values({
        corretoraId,
        uploadPorId: usuarioId,
        entidadeId: '00000000-0000-0000-0000-000000000004',
        entidadeTipo: 'documento_venda',
        nomeOriginal: 'contrato-sucesso.pdf',
        nomeArquivo: 'contrato-sucesso.pdf',
        r2Key: `cotacaos/${corretoraId}/abc/contrato-sucesso.pdf`,
        r2Bucket: 'ecotech-dev',
        mimeType: 'application/pdf',
        tamanho: 1024,
      });

      // Simular que o arquivo existe no storage
      vi.mocked(storageClient.exists).mockResolvedValueOnce(true);
      vi.mocked(storageClient.move).mockResolvedValueOnce(undefined);

      const res = await request(app.server)
        .post('/api/admin/migrar-anexos/executar')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.resultados.total).toBeGreaterThanOrEqual(1);
      expect(res.body.resultados.sucessos).toBeGreaterThanOrEqual(1);
      const detalhe = res.body.resultados.detalhes.find(
        (d: any) => d.status === 'sucesso',
      );
      expect(detalhe).toBeDefined();
      expect(detalhe.id).toBeDefined();
      expect(detalhe.nome).toBe('contrato-sucesso.pdf');
    });

    it('registra erro no detalhe quando storageClient.move lança exceção', async () => {
      // Inserir anexo que precisa de migração
      await db.insert(anexos).values({
        corretoraId,
        uploadPorId: usuarioId,
        entidadeId: '00000000-0000-0000-0000-000000000005',
        entidadeTipo: 'documento_venda',
        nomeOriginal: 'contrato-erro.pdf',
        nomeArquivo: 'contrato-erro.pdf',
        r2Key: `cotacaos/${corretoraId}/abc/contrato-erro.pdf`,
        r2Bucket: 'ecotech-dev',
        mimeType: 'application/pdf',
        tamanho: 1024,
      });

      // Simular que o arquivo existe mas move lança erro
      vi.mocked(storageClient.exists).mockResolvedValueOnce(true);
      vi.mocked(storageClient.move).mockRejectedValueOnce(
        new Error('Falha ao mover arquivo no R2'),
      );

      const res = await request(app.server)
        .post('/api/admin/migrar-anexos/executar')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.resultados.total).toBeGreaterThanOrEqual(1);
      expect(res.body.resultados.erros).toBeGreaterThanOrEqual(1);
      const detalhe = res.body.resultados.detalhes.find(
        (d: any) => d.status === 'erro' && d.mensagem?.includes('Falha'),
      );
      expect(detalhe).toBeDefined();
    });
  });
});
