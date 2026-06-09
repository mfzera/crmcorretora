import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  clientes,
  produtos,
  documentosVenda,
  endossos,
} from '@ecotech/shared/database';
import { eq, and } from 'drizzle-orm';
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
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { generateTestToken } from '../../helpers/auth.helper';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createTestCliente(corretoraId: string, vendedorId: string) {
  const ts = Date.now();
  const [cliente] = await db
    .insert(clientes)
    .values({
      corretoraId,
      vendedorId,
      tipoPessoa: 'PF',
      nome: `Cliente Teste ${ts}`,
      cpf: String(ts).slice(-11).padStart(11, '0'),
      email: `cliente.${ts}@teste.com`,
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
      nomeProduto: `Produto Teste ${ts}`,
      tipoSeguro: 'AUTO',
      ativo: true,
    })
    .returning();
  return produto;
}

async function createTestDocumentoVenda(
  corretoraId: string,
  clienteId: string,
  vendedorId: string,
  produtoId: string,
  overrides: Record<string, unknown> = {},
) {
  const ts = Date.now();
  const [doc] = await db
    .insert(documentosVenda)
    .values({
      corretoraId,
      clienteId,
      vendedorId,
      produtoId,
      numeroDocumento: `DOC-${ts}`,
      tipoDocumento: 'COTACAO_DIRETA',
      status: 'ATIVO',
      vigenciaInicio: '2025-01-01',
      vigenciaFim: '2025-12-31',
      moeda: 'BRL',
      premioLiquido: '1000',
      percentualComissao: '10',
      valorComissao: '100',
      ...overrides,
    })
    .returning();
  return doc;
}

async function createTestEndosso(
  corretoraId: string,
  documentoVendaId: string,
  vendedorId: string,
  overrides: Record<string, unknown> = {},
) {
  const ts = Date.now();
  const [endosso] = await db
    .insert(endossos)
    .values({
      corretoraId,
      documentoVendaId,
      vendedorId,
      tipoEndosso: 'ALTERACAO_VALOR',
      numeroEndosso: `END-${ts}`,
      status: 'SOLICITADO',
      descricao: 'Alteração de valor do prêmio',
      premioAnterior: '1000',
      premioNovo: '1200',
      diferencaPremio: '200',
      percentualComissaoAnterior: '10',
      percentualComissaoNovo: '10',
      diferencaComissao: '20',
      dataVigenciaEndosso: '2025-06-01',
      dataSolicitacao: new Date(),
      ...overrides,
    })
    .returning();
  return endosso;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('/api/endossos', () => {
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
      isVendedor: true,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });
  });

  // ── POST / ──────────────────────────────────────────────────────────────────

  describe('POST /api/endossos', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).post('/api/endossos').send({}).expect(401);
    });

    it('retorna 403 sem permissão vendas:criar_endosso', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['clientes:visualizar'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
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

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      await request(app.server)
        .post('/api/endossos')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({
          documentoVendaId: doc.id,
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Alteração de prêmio',
          dataVigenciaEndosso: '2025-06-01',
        })
        .expect(403);
    });

    it('cria endosso para documento ativo', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      const res = await request(app.server)
        .post('/api/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          documentoVendaId: doc.id,
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Alteração de prêmio para 1200',
          premioNovo: 1200,
          dataVigenciaEndosso: '2025-06-01',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.numeroEndosso).toBeDefined();
      expect(res.body.data.status).toBe('SOLICITADO');
      expect(res.body.data.tipoEndosso).toBe('ALTERACAO_VALOR');
      expect(res.body.data.documentoVendaId).toBe(doc.id);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          documentoVendaId: '00000000-0000-0000-0000-000000000000',
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Alteração',
          dataVigenciaEndosso: '2025-06-01',
        })
        .expect(404);
    });

    it('retorna 422 para documento não ativo', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'AGUARDANDO_CADASTRO' },
      );

      await request(app.server)
        .post('/api/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          documentoVendaId: doc.id,
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Alteração',
          dataVigenciaEndosso: '2025-06-01',
        })
        .expect(422);
    });

    it('retorna 400 sem campos obrigatórios', async () => {
      await request(app.server)
        .post('/api/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipoEndosso: 'ALTERACAO_VALOR' })
        .expect(400);
    });

    it('cria endosso com todos os campos opcionais preenchidos', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      const res = await request(app.server)
        .post('/api/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          documentoVendaId: doc.id,
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Alteração completa com campos opcionais',
          premioNovo: 1500,
          percentualComissaoNovo: 12,
          motivoEndosso: 'Reajuste contratual anual',
          observacoes: 'Aprovado em reunião de diretoria',
          alteracoes: { coberturaAdicional: 'danos-terceiros', limiteNovo: 50000 },
          dataVigenciaEndosso: '2025-07-01',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SOLICITADO');
      expect(res.body.data.tipoEndosso).toBe('ALTERACAO_VALOR');
      // Numeric fields are stored as strings (decimal columns)
      expect(parseFloat(res.body.data.premioNovo)).toBe(1500);
      expect(parseFloat(res.body.data.percentualComissaoNovo)).toBe(12);
      expect(res.body.data.motivoEndosso).toBe('Reajuste contratual anual');
      expect(res.body.data.observacoes).toBe('Aprovado em reunião de diretoria');
      expect(res.body.data.alteracoes).toMatchObject({
        coberturaAdicional: 'danos-terceiros',
        limiteNovo: 50000,
      });
    });

    it('retorna 400 para tipoEndosso inválido', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      await request(app.server)
        .post('/api/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          documentoVendaId: doc.id,
          tipoEndosso: 'TIPO_INEXISTENTE',
          descricao: 'Teste com tipo inválido',
          dataVigenciaEndosso: '2025-06-01',
        })
        .expect(400);
    });

    it('não cria endosso para documento de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const cliente2 = await createTestCliente(corretora2.id, usuario2.id);
      const produto2 = await createTestProduto(corretora2.id);
      const docOutraCorretora = await createTestDocumentoVenda(
        corretora2.id,
        cliente2.id,
        usuario2.id,
        produto2.id,
      );

      // adminToken pertence à corretoraId (primeira), não à corretora2
      await request(app.server)
        .post('/api/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          documentoVendaId: docOutraCorretora.id,
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Tentativa cross-corretora',
          dataVigenciaEndosso: '2025-06-01',
        })
        .expect(404);
    });
  });

  // ── GET / ───────────────────────────────────────────────────────────────────

  describe('GET /api/endossos', () => {

    beforeAll(async () => {
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

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/endossos').expect(401);
    });

    it('retorna 403 sem permissão vendas:criar_endosso', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['clientes:visualizar'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
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
        .get('/api/endossos')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('retorna lista vazia quando não há endossos', async () => {
      const res = await request(app.server)
        .get('/api/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('lista endossos do vendedor logado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso1 = await createTestEndosso(corretoraId, doc.id, usuarioId);
      const endosso2 = await createTestEndosso(corretoraId, doc.id, usuarioId, {
        numeroEndosso: `END-${Date.now()}-2`,
      });

      const res = await request(app.server)
        .get('/api/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.find((e: any) => e.id === endosso1.id)).toBeDefined();
      expect(res.body.data.find((e: any) => e.id === endosso2.id)).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('não lista endossos de outro vendedor (sem permissão aprovar)', async () => {
      const cargo2 = await createTestCargo(corretoraId, {
        permissoes: ['vendas:criar_endosso'],
      });
      const outroVendedor = await createTestUsuario(corretoraId, cargo2.id);
      const tokenOutroVendedor = generateTestToken(app, {
        sub: outroVendedor.id,
        corretoraId,
        cargoId: cargo2.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:criar_endosso'],
        nome: outroVendedor.nome,
        email: outroVendedor.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      // Endosso pertence ao usuarioId (não ao outroVendedor)
      const endossoDeOutro = await createTestEndosso(corretoraId, doc.id, usuarioId);

      const res = await request(app.server)
        .get('/api/endossos')
        .set('Authorization', `Bearer ${tokenOutroVendedor}`)
        .expect(200);

      expect(res.body.data.find((e: any) => e.id === endossoDeOutro.id)).toBeUndefined();
    });

    it('filtra por status', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      await createTestEndosso(corretoraId, doc.id, usuarioId, {
        status: 'SOLICITADO',
      });
      await createTestEndosso(corretoraId, doc.id, usuarioId, {
        status: 'APROVADO',
        numeroEndosso: `END-${Date.now()}-2`,
      });

      const res = await request(app.server)
        .get('/api/endossos?status=SOLICITADO')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.every((e: any) => e.status === 'SOLICITADO')).toBe(true);
    });

    it('não retorna endossos de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const cliente2 = await createTestCliente(corretora2.id, usuario2.id);
      const produto2 = await createTestProduto(corretora2.id);
      const doc2 = await createTestDocumentoVenda(
        corretora2.id,
        cliente2.id,
        usuario2.id,
        produto2.id,
      );
      const endossoOutro = await createTestEndosso(corretora2.id, doc2.id, usuario2.id);

      const res = await request(app.server)
        .get('/api/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.find((e: any) => e.id === endossoOutro.id)).toBeUndefined();
    });

    it('filtra por tipoEndosso', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      await createTestEndosso(corretoraId, doc.id, usuarioId, {
        tipoEndosso: 'ALTERACAO_VALOR',
        numeroEndosso: `END-${Date.now()}-av`,
      });
      await createTestEndosso(corretoraId, doc.id, usuarioId, {
        tipoEndosso: 'ALTERACAO_DADOS',
        numeroEndosso: `END-${Date.now()}-ad`,
      });

      const res = await request(app.server)
        .get('/api/endossos?tipoEndosso=ALTERACAO_DADOS')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].tipoEndosso).toBe('ALTERACAO_DADOS');
    });

    it('filtra por documentoVendaId', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc1 = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { numeroDocumento: `DOC-A-${Date.now()}` },
      );
      const doc2 = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { numeroDocumento: `DOC-B-${Date.now()}` },
      );
      await createTestEndosso(corretoraId, doc1.id, usuarioId, {
        numeroEndosso: `END-${Date.now()}-1`,
      });
      await createTestEndosso(corretoraId, doc2.id, usuarioId, {
        numeroEndosso: `END-${Date.now()}-2`,
      });

      const res = await request(app.server)
        .get(`/api/endossos?documentoVendaId=${doc1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].documentoVendaId).toBe(doc1.id);
    });

    it('admin com vendas:aprovar_endosso vê endossos de todos os vendedores', async () => {
      // Cria um segundo vendedor na mesma corretora
      const cargo2 = await createTestCargo(corretoraId, {
        permissoes: ['vendas:criar_endosso'],
      });
      const outroVendedor = await createTestUsuario(corretoraId, cargo2.id);

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc1 = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { numeroDocumento: `DOC-V1-${Date.now()}` },
      );
      const doc2 = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        outroVendedor.id,
        produto.id,
        { numeroDocumento: `DOC-V2-${Date.now()}` },
      );
      await createTestEndosso(corretoraId, doc1.id, usuarioId, {
        numeroEndosso: `END-V1-${Date.now()}`,
      });
      await createTestEndosso(corretoraId, doc2.id, outroVendedor.id, {
        numeroEndosso: `END-V2-${Date.now()}`,
      });

      // Token com permissão de aprovar (vê todos)
      const cargoAprovador = await createTestCargo(corretoraId, {
        nomeCargo: `Aprovador-${Date.now()}`,
        permissoes: ['vendas:aprovar_endosso'],
      });
      const usuarioAprovador = await createTestUsuario(corretoraId, cargoAprovador.id);
      const tokenAprovador = generateTestToken(app, {
        sub: usuarioAprovador.id,
        corretoraId,
        cargoId: cargoAprovador.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:aprovar_endosso'],
        nome: usuarioAprovador.nome,
        email: usuarioAprovador.email,
        avatarUrl: null,
      });

      const res = await request(app.server)
        .get('/api/endossos')
        .set('Authorization', `Bearer ${tokenAprovador}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('suporta paginação com page e limit', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      // Cria 3 endossos
      for (let i = 0; i < 3; i++) {
        await createTestEndosso(corretoraId, doc.id, usuarioId, {
          numeroEndosso: `END-PAG-${Date.now()}-${i}`,
        });
      }

      const resPage1 = await request(app.server)
        .get('/api/endossos?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(resPage1.body.data).toHaveLength(2);
      expect(resPage1.body.meta.total).toBeGreaterThanOrEqual(3);
      expect(resPage1.body.meta.page).toBe(1);

      const resPage2 = await request(app.server)
        .get('/api/endossos?page=2&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(resPage2.body.data.length).toBeGreaterThanOrEqual(1);
      expect(resPage2.body.meta.page).toBe(2);
    });
  });

  // ── GET /:id ────────────────────────────────────────────────────────────────

  describe('GET /api/endossos/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/endossos/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('retorna endosso por ID', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId);

      const res = await request(app.server)
        .get(`/api/endossos/${endosso.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(endosso.id);
      expect(res.body.data.status).toBe('SOLICITADO');
    });

    it('retorna 404 para endosso inexistente', async () => {
      await request(app.server)
        .get('/api/endossos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 para endosso de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const cliente2 = await createTestCliente(corretora2.id, usuario2.id);
      const produto2 = await createTestProduto(corretora2.id);
      const doc2 = await createTestDocumentoVenda(
        corretora2.id,
        cliente2.id,
        usuario2.id,
        produto2.id,
      );
      const endossoOutro = await createTestEndosso(
        corretora2.id,
        doc2.id,
        usuario2.id,
      );

      await request(app.server)
        .get(`/api/endossos/${endossoOutro.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 403 quando outro vendedor tenta acessar sem permissão de aprovação', async () => {
      const cargo2 = await createTestCargo(corretoraId, {
        permissoes: ['vendas:criar_endosso'],
      });
      const outroVendedor = await createTestUsuario(corretoraId, cargo2.id);
      const tokenOutroVendedor = generateTestToken(app, {
        sub: outroVendedor.id,
        corretoraId,
        cargoId: cargo2.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:criar_endosso'],
        nome: outroVendedor.nome,
        email: outroVendedor.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId);

      await request(app.server)
        .get(`/api/endossos/${endosso.id}`)
        .set('Authorization', `Bearer ${tokenOutroVendedor}`)
        .expect(403);
    });

    it('admin com vendas:aprovar_endosso pode acessar endosso de outro vendedor', async () => {
      // Cria endosso pertencente ao usuarioId principal
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId);

      // Cria um segundo usuário com permissão de aprovação mas diferente do dono
      const cargoAprovador = await createTestCargo(corretoraId, {
        nomeCargo: `Aprovador-${Date.now()}`,
        permissoes: ['vendas:aprovar_endosso'],
      });
      const usuarioAprovador = await createTestUsuario(corretoraId, cargoAprovador.id);
      const tokenAprovador = generateTestToken(app, {
        sub: usuarioAprovador.id,
        corretoraId,
        cargoId: cargoAprovador.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:aprovar_endosso'],
        nome: usuarioAprovador.nome,
        email: usuarioAprovador.email,
        avatarUrl: null,
      });

      const res = await request(app.server)
        .get(`/api/endossos/${endosso.id}`)
        .set('Authorization', `Bearer ${tokenAprovador}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(endosso.id);
    });
  });

  // ── POST /:id/aprovar ────────────────────────────────────────────────────────

  describe('POST /api/endossos/:id/aprovar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/endossos/00000000-0000-0000-0000-000000000000/aprovar')
        .expect(401);
    });

    it('retorna 403 sem permissão cadastro:aprovar_endosso', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['vendas:criar_endosso'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:criar_endosso'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId);

      await request(app.server)
        .post(`/api/endossos/${endosso.id}/aprovar`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('aprova endosso solicitado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId);

      const res = await request(app.server)
        .post(`/api/endossos/${endosso.id}/aprovar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APROVADO');
    });

    it('retorna 422 ao tentar aprovar endosso não solicitado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId, {
        status: 'APROVADO',
      });

      await request(app.server)
        .post(`/api/endossos/${endosso.id}/aprovar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    });

    it('retorna 404 para endosso inexistente', async () => {
      await request(app.server)
        .post('/api/endossos/00000000-0000-0000-0000-000000000000/aprovar')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('aprova endosso com numeroEndossoExterno opcional no body', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId);

      const res = await request(app.server)
        .post(`/api/endossos/${endosso.id}/aprovar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ numeroEndossoExterno: 'EXT-2025-9999' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APROVADO');
      expect(res.body.data.numeroEndossoExterno).toBe('EXT-2025-9999');
    });

    it('atualiza valores do documento após aprovação', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      // Documento com prêmio 1000 e comissão 10%
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { premioLiquido: '1000', percentualComissao: '10', valorComissao: '100' },
      );

      // Endosso propõe prêmio 1500 e comissão 12%
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId, {
        premioAnterior: '1000',
        premioNovo: '1500',
        diferencaPremio: '500',
        percentualComissaoAnterior: '10',
        percentualComissaoNovo: '12',
        diferencaComissao: '80',
      });

      await request(app.server)
        .post(`/api/endossos/${endosso.id}/aprovar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verifica que o documento foi atualizado no banco
      const [docAtualizado] = await db
        .select()
        .from(documentosVenda)
        .where(eq(documentosVenda.id, doc.id));

      expect(parseFloat(docAtualizado.premioLiquido!)).toBe(1500);
      expect(parseFloat(docAtualizado.percentualComissao!)).toBe(12);
      // valorComissao = 1500 * 12 / 100 = 180
      expect(parseFloat(docAtualizado.valorComissao!)).toBeCloseTo(180, 1);
    });
  });

  // ── POST /:id/recusar ────────────────────────────────────────────────────────

  describe('POST /api/endossos/:id/recusar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/endossos/00000000-0000-0000-0000-000000000000/recusar')
        .send({ motivoRecusa: 'Inválido' })
        .expect(401);
    });

    it('recusa endosso solicitado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId);

      const res = await request(app.server)
        .post(`/api/endossos/${endosso.id}/recusar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoRecusa: 'Documentação insuficiente' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RECUSADO');
    });

    it('retorna 422 ao tentar recusar endosso não solicitado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId, {
        status: 'APROVADO',
      });

      await request(app.server)
        .post(`/api/endossos/${endosso.id}/recusar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoRecusa: 'Motivo' })
        .expect(422);
    });

    it('retorna 404 para endosso inexistente', async () => {
      await request(app.server)
        .post('/api/endossos/00000000-0000-0000-0000-000000000000/recusar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoRecusa: 'Motivo' })
        .expect(404);
    });

    it('retorna 403 quando usuário sem cadastro:aprovar_endosso tenta recusar', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: 'Apenas criador',
        permissoes: ['vendas:criar_endosso'],
      });
      const usuarioCriador = await createTestUsuario(corretoraId, cargo.id);
      const tokenCriador = generateTestToken(app, {
        sub: usuarioCriador.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:criar_endosso'],
        nome: usuarioCriador.nome,
        email: usuarioCriador.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId);

      await request(app.server)
        .post(`/api/endossos/${endosso.id}/recusar`)
        .set('Authorization', `Bearer ${tokenCriador}`)
        .send({ motivoRecusa: 'Tentativa não autorizada' })
        .expect(403);
    });
  });

  // ── POST /:id/cancelar ───────────────────────────────────────────────────────

  describe('POST /api/endossos/:id/cancelar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/endossos/00000000-0000-0000-0000-000000000000/cancelar')
        .expect(401);
    });

    it('cancela endosso solicitado pelo próprio vendedor', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId);

      const res = await request(app.server)
        .post(`/api/endossos/${endosso.id}/cancelar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELADO');
    });

    it('retorna 403 quando outro vendedor tenta cancelar', async () => {
      const cargo2 = await createTestCargo(corretoraId, {
        permissoes: ['vendas:criar_endosso'],
      });
      const outroVendedor = await createTestUsuario(corretoraId, cargo2.id);
      const tokenOutroVendedor = generateTestToken(app, {
        sub: outroVendedor.id,
        corretoraId,
        cargoId: cargo2.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:criar_endosso'],
        nome: outroVendedor.nome,
        email: outroVendedor.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      // Endosso pertence ao usuarioId principal
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId);

      await request(app.server)
        .post(`/api/endossos/${endosso.id}/cancelar`)
        .set('Authorization', `Bearer ${tokenOutroVendedor}`)
        .expect(403);
    });

    it('retorna 422 ao tentar cancelar endosso não solicitado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId, {
        status: 'APROVADO',
      });

      await request(app.server)
        .post(`/api/endossos/${endosso.id}/cancelar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    });

    it('retorna 404 para endosso inexistente', async () => {
      await request(app.server)
        .post('/api/endossos/00000000-0000-0000-0000-000000000000/cancelar')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('usuário com cadastro:aprovar_endosso pode cancelar endosso de outro vendedor', async () => {
      // Endosso pertence ao usuarioId (vendedor principal)
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );
      const endosso = await createTestEndosso(corretoraId, doc.id, usuarioId);

      // Cria um usuário aprovador que NÃO é dono do endosso
      const cargoAprovador = await createTestCargo(corretoraId, {
        nomeCargo: 'Aprovador Cancelador',
        permissoes: ['vendas:criar_endosso', 'cadastro:aprovar_endosso'],
      });
      const usuarioAprovador = await createTestUsuario(corretoraId, cargoAprovador.id);
      const tokenAprovador = generateTestToken(app, {
        sub: usuarioAprovador.id,
        corretoraId,
        cargoId: cargoAprovador.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:criar_endosso', 'cadastro:aprovar_endosso'],
        nome: usuarioAprovador.nome,
        email: usuarioAprovador.email,
        avatarUrl: null,
      });

      const res = await request(app.server)
        .post(`/api/endossos/${endosso.id}/cancelar`)
        .set('Authorization', `Bearer ${tokenAprovador}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELADO');
    });
  });
});
