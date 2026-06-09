import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  documentosVenda,
  clientes,
  produtos,
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
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { invalidateDocumentosVendaCache } from '../../../src/utils/cache.js';

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
  overrides: Record<string, unknown> = {},
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
      ...overrides,
    } as any)
    .returning();
  return doc;
}

// Token com permissão de criar/editar documentos
function makeVendedorToken(
  app: any,
  corretoraId: string,
  usuarioId: string,
  cargoId: string,
  nome: string,
  email: string,
) {
  return generateTestToken(app, {
    sub: usuarioId,
    corretoraId,
    cargoId,
    isAdmin: true,
    isGestor: false,
    isVendedor: true,
    permissoes: [],
    nome,
    email,
    avatarUrl: null,
  });
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('/api/documentos-venda', () => {
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

    adminToken = makeVendedorToken(
      app,
      corretoraId,
      usuarioId,
      cargo.id,
      usuario.nome,
      usuario.email,
    );
  });

  // ── POST /api/documentos-venda ─────────────────────────────────────────────

  describe('POST /api/documentos-venda', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/documentos-venda')
        .send({})
        .expect(401);
    });

    it('retorna 403 sem permissão vendas:criar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['clientes:visualizar'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPerm = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['clientes:visualizar'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      await request(app.server)
        .post('/api/documentos-venda')
        .set('Authorization', `Bearer ${tokenSemPerm}`)
        .send({ tipoDocumento: 'COTACAO_DIRETA' })
        .expect(403);
    });

    it('retorna 404 para cliente inexistente', async () => {
      const produto = await createTestProduto(corretoraId);

      await request(app.server)
        .post('/api/documentos-venda')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: '00000000-0000-0000-0000-000000000000',
          produtoId: produto.id,
          tipoDocumento: 'COTACAO_DIRETA',
          vigenciaInicio: '2026-01-01',
          vigenciaFim: '2027-01-01',
        })
        .expect(404);
    });

    it('cria documento de venda com sucesso', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const res = await request(app.server)
        .post('/api/documentos-venda')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          tipoDocumento: 'COTACAO_DIRETA',
          vigenciaInicio: '2026-01-01',
          vigenciaFim: '2027-01-01',
          premioLiquido: 1500,
          percentualComissao: 10,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('EM_NEGOCIACAO');
      expect(res.body.data.vendedorId).toBe(usuarioId);
      expect(res.body.data.corretoraId).toBe(corretoraId);
    });
  });

  // ── GET /api/documentos-venda ──────────────────────────────────────────────

  describe('GET /api/documentos-venda', () => {

    beforeAll(async () => {
      await cleanDatabase();
      const plano = await createTestPlano();
      const corretora = await createTestCorretora(plano.id);
      corretoraId = corretora.id;
      const cargo = await createAdminCargo(corretoraId);
      cargoId = cargo.id;
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      usuarioId = usuario.id;
      adminToken = makeVendedorToken(app, corretoraId, usuarioId, cargo.id, usuario.nome, usuario.email);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/documentos-venda').expect(401);
    });

    it('retorna 403 sem permissão vendas:visualizar_documento_venda', async () => {
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

      await request(app.server)
        .get('/api/documentos-venda')
        .set('Authorization', `Bearer ${tokenSemPerm}`)
        .expect(403);
    });

    it('retorna lista vazia quando não há documentos', async () => {
      const res = await request(app.server)
        .get('/api/documentos-venda')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('retorna documentos do vendedor logado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );
      // Insert direto no DB não passa pelo handler que invalida o cache automaticamente.
      await invalidateDocumentosVendaCache(corretoraId);

      const res = await request(app.server)
        .get('/api/documentos-venda')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.find((d: any) => d.id === doc.id)).toBeDefined();
      expect(res.body.data.find((d: any) => d.id === doc.id).vendedorId).toBe(usuarioId);
    });

    it('filtra por status', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const docNegociacao = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'EM_NEGOCIACAO' },
      );
      await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'ATIVO', numeroDocumento: `DOC-${Date.now() + 1}` },
      );

      const res = await request(app.server)
        .get('/api/documentos-venda?status=EM_NEGOCIACAO')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.find((d: any) => d.id === docNegociacao.id)).toBeDefined();
      expect(res.body.data.every((d: any) => d.status === 'EM_NEGOCIACAO')).toBe(true);
    });

    it('suporta paginação', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      for (let i = 0; i < 5; i++) {
        await createTestDocumentoVenda(
          corretoraId,
          usuarioId,
          cliente.id,
          produto.id,
          { numeroDocumento: `DOC-${Date.now()}-${i}` },
        );
        await new Promise((r) => setTimeout(r, 2));
      }

      const res = await request(app.server)
        .get('/api/documentos-venda?page=1&limit=3')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(3);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
    });

    it('tenant isolation — não retorna documentos de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const cliente2 = await createTestCliente(corretora2.id, usuario2.id);
      const produto2 = await createTestProduto(corretora2.id);
      const docOutra = await createTestDocumentoVenda(
        corretora2.id,
        usuario2.id,
        cliente2.id,
        produto2.id,
      );

      const res = await request(app.server)
        .get('/api/documentos-venda')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.find((d: any) => d.id === docOutra.id)).toBeUndefined();
    });
  });

  // ── GET /api/documentos-venda/:id ─────────────────────────────────────────

  describe('GET /api/documentos-venda/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/documentos-venda/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .get('/api/documentos-venda/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna documento pelo ID', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      const res = await request(app.server)
        .get(`/api/documentos-venda/${doc.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(doc.id);
    });
  });

  // ── PATCH /api/documentos-venda/:id ──────────────────────────────────────

  describe('PATCH /api/documentos-venda/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/documentos-venda/00000000-0000-0000-0000-000000000000')
        .send({ premioLiquido: 2000 })
        .expect(401);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .patch('/api/documentos-venda/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ premioLiquido: 2000 })
        .expect(404);
    });

    it('atualiza documento com sucesso', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      const res = await request(app.server)
        .patch(`/api/documentos-venda/${doc.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ premioLiquido: 2000, observacoes: 'Atualizado' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(parseFloat(res.body.data.premioLiquido)).toBe(2000);
    });

    it('retorna 400 ao tentar editar documento cancelado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'CANCELADO' },
      );

      await request(app.server)
        .patch(`/api/documentos-venda/${doc.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ premioLiquido: 2000 })
        .expect(400);
    });
  });

  // ── POST /api/documentos-venda/:id/cancelar ───────────────────────────────

  describe('POST /api/documentos-venda/:id/cancelar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/cancelar')
        .send({ motivoCancelamento: 'Teste' })
        .expect(401);
    });

    it('cancela documento com sucesso', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'EM_NEGOCIACAO' },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/cancelar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoCancelamento: 'Cliente desistiu' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELADO');
    });

    it('retorna 400 ao cancelar documento já cancelado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'CANCELADO' },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/cancelar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoCancelamento: 'Novo motivo' })
        .expect(400);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/cancelar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoCancelamento: 'Teste' })
        .expect(404);
    });
  });

  // ── POST /api/documentos-venda/:id/perder ────────────────────────────────

  describe('POST /api/documentos-venda/:id/perder', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/perder')
        .send({ motivoPerda: 'Teste' })
        .expect(401);
    });

    it('registra perda de venda em negociação', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'EM_NEGOCIACAO' },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/perder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          motivoPerda: 'Preço elevado',
          concorrenteGanhou: 'Seguradora XYZ',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PERDIDO');
      expect(res.body.data.motivoPerda).toBe('Preço elevado');
    });

    it('retorna 400 para documento ativo (não pode marcar como perdido)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'ATIVO' },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/perder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoPerda: 'Teste' })
        .expect(400);
    });
  });

  // ── POST /api/documentos-venda/:id/adicionar-anotacao ────────────────────

  describe('POST /api/documentos-venda/:id/adicionar-anotacao', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post(
          '/api/documentos-venda/00000000-0000-0000-0000-000000000000/adicionar-anotacao',
        )
        .send({ descricao: 'Anotação' })
        .expect(401);
    });

    it('adiciona anotação ao documento', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/adicionar-anotacao`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ descricao: 'Cliente ligou confirmando interesse' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post(
          '/api/documentos-venda/00000000-0000-0000-0000-000000000000/adicionar-anotacao',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ descricao: 'Anotação' })
        .expect(404);
    });
  });

  // ── GET /api/documentos-venda/:id/historico ───────────────────────────────

  describe('GET /api/documentos-venda/:id/historico', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(
          '/api/documentos-venda/00000000-0000-0000-0000-000000000000/historico',
        )
        .expect(401);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .get(
          '/api/documentos-venda/00000000-0000-0000-0000-000000000000/historico',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna histórico do documento', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      const res = await request(app.server)
        .get(`/api/documentos-venda/${doc.id}/historico`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ── GET /api/documentos-venda/:id/lock-status ─────────────────────────────

  describe('GET /api/documentos-venda/:id/lock-status', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get(
          '/api/documentos-venda/00000000-0000-0000-0000-000000000000/lock-status',
        )
        .expect(401);
    });

    it('retorna status de bloqueio do documento', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      const res = await request(app.server)
        .get(`/api/documentos-venda/${doc.id}/lock-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isLocked).toBe(false);
    });
  });

  // ── POST /api/documentos-venda/:id/lock ──────────────────────────────────

  describe('POST /api/documentos-venda/:id/lock', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post(
          '/api/documentos-venda/00000000-0000-0000-0000-000000000000/lock',
        )
        .expect(401);
    });

    it('bloqueia documento para edição', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('renova bloqueio quando mesmo usuário tenta bloquear novamente', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      // Bloquear uma primeira vez
      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Bloquear novamente com o mesmo usuário → deve renovar o lock
      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('renovado');
    });

    it('retorna 423 quando outro usuário tenta bloquear documento já bloqueado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      // Bloquear com adminToken (usuarioId)
      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Outro usuário tenta bloquear
      const outroCargo = await createTestCargo(corretoraId, {
        permissoes: ['vendas:editar_documento_venda'],
      });
      const outroUsuario = await createTestUsuario(corretoraId, outroCargo.id);
      const outroToken = generateTestToken(app, {
        sub: outroUsuario.id,
        corretoraId,
        cargoId: outroCargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:editar_documento_venda'],
        nome: outroUsuario.nome,
        email: outroUsuario.email,
        avatarUrl: null,
      });

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/lock`)
        .set('Authorization', `Bearer ${outroToken}`)
        .expect(423);

      expect(res.body.error).toBe('DOCUMENT_LOCKED');
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/lock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── POST /api/documentos-venda/:id/unlock ────────────────────────────────

  describe('POST /api/documentos-venda/:id/unlock', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/unlock')
        .expect(401);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/unlock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna sucesso quando documento já está desbloqueado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/unlock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('desbloqueado');
    });

    it('desbloqueia documento bloqueado pelo próprio usuário', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      // Bloquear primeiro
      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Desbloquear
      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/unlock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.lockedById).toBeNull();
    });

    it('retorna 403 quando outro usuário sem permissão tenta desbloquear', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      // Bloquear com adminToken
      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Outro usuário sem permissão vendas:gerenciar_locks tenta desbloquear
      const outroCargo = await createTestCargo(corretoraId, {
        permissoes: ['vendas:editar_documento_venda'],
      });
      const outroUsuario = await createTestUsuario(corretoraId, outroCargo.id);
      const outroToken = generateTestToken(app, {
        sub: outroUsuario.id,
        corretoraId,
        cargoId: outroCargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:editar_documento_venda'],
        nome: outroUsuario.nome,
        email: outroUsuario.email,
        avatarUrl: null,
      });

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/unlock`)
        .set('Authorization', `Bearer ${outroToken}`)
        .expect(403);
    });
  });

  // ── GET /api/documentos-venda/:id/lock-status (locked) ───────────────────

  describe('GET /api/documentos-venda/:id/lock-status - documento bloqueado', () => {
    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .get('/api/documentos-venda/00000000-0000-0000-0000-000000000000/lock-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna isLocked true quando documento está bloqueado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      // Bloquear o documento
      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.server)
        .get(`/api/documentos-venda/${doc.id}/lock-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isLocked).toBe(true);
      expect(res.body.data.isLockedByCurrentUser).toBe(true);
      expect(res.body.data.lockExpiresAt).toBeDefined();
    });
  });

  // ── POST /api/documentos-venda/:id/arquivar ───────────────────────────────

  describe('POST /api/documentos-venda/:id/arquivar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/arquivar')
        .expect(401);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/arquivar')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('arquiva documento ativo com sucesso', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'ATIVO' },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/arquivar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ARQUIVADO');
    });

    it('retorna 400 ao tentar arquivar documento não ativo', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'EM_NEGOCIACAO' },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/arquivar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  // ── POST /api/documentos-venda/:id/rejeitar-cadastro ─────────────────────

  describe('POST /api/documentos-venda/:id/rejeitar-cadastro', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/rejeitar-cadastro')
        .send({ motivoRejeicao: 'Teste' })
        .expect(401);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/rejeitar-cadastro')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoRejeicao: 'Documento não encontrado' })
        .expect(404);
    });

    it('rejeita cadastro de documento aguardando aprovação', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'AGUARDANDO_CADASTRO' },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/rejeitar-cadastro`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoRejeicao: 'Documentação incompleta' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('VENDA_CONFIRMADA');
    });

    it('retorna 400 quando documento não está aguardando cadastro', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'EM_NEGOCIACAO' },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/rejeitar-cadastro`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoRejeicao: 'Teste' })
        .expect(400);
    });
  });

  // ── POST /api/documentos-venda/:id/confirmar-perda ────────────────────────

  describe('POST /api/documentos-venda/:id/confirmar-perda', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/confirmar-perda')
        .expect(401);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/confirmar-perda')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('confirma perda de documento com status PERDIDO', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'PERDIDO', motivoPerda: 'Cliente optou por concorrente' },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/confirmar-perda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('confirmada');
    });

    it('retorna 400 quando documento não está com status PERDIDO', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'EM_NEGOCIACAO' },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/confirmar-perda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  // ── POST /api/documentos-venda/:id/rejeitar-perda ────────────────────────

  describe('POST /api/documentos-venda/:id/rejeitar-perda', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/rejeitar-perda')
        .expect(401);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/rejeitar-perda')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('rejeita perda de documento e retorna para AGUARDANDO_CADASTRO', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'PERDIDO', motivoPerda: 'Preço elevado' },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/rejeitar-perda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('AGUARDANDO_CADASTRO');
      expect(res.body.data.motivoPerda).toBeNull();
    });

    it('retorna 400 quando documento não está com status PERDIDO', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'EM_NEGOCIACAO' },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/rejeitar-perda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  // ── POST /api/documentos-venda/:id/criar-renovacao ────────────────────────

  describe('POST /api/documentos-venda/:id/criar-renovacao', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/criar-renovacao')
        .expect(401);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/criar-renovacao')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('cria renovação para documento ativo', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'ATIVO', vigenciaFim: '2026-12-31' },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/criar-renovacao`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.renovacao).toBeDefined();
      expect(res.body.data.renovacao.status).toBe('ATIVO');
      expect(res.body.data.renovacaoComercial).toBeDefined();
    });

    it('retorna 400 quando documento não é ativo', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'EM_NEGOCIACAO' },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/criar-renovacao`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('retorna 400 quando renovação já existe para o documento', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'ATIVO', vigenciaFim: '2026-12-31' },
      );

      // Criar primeira renovação
      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/criar-renovacao`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Tentar criar segunda renovação → deve falhar
      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/criar-renovacao`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  // ── Notification error handling ───────────────────────────────────────────

  describe('Notificações - linhas cancelar/perder', () => {
    it('cancelar documento dispara notificação (linha de erro não obstrui resposta)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'EM_NEGOCIACAO' },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/cancelar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoCancelamento: 'Teste de notificação' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('registrar perda dispara notificação (linha de erro não obstrui resposta)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'AGUARDANDO_CADASTRO' },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/perder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoPerda: 'Cliente cancelou' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
