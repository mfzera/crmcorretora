import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  clientes,
  produtos,
  documentosVenda,
  endossos,
  cotacoes,
  propostasComerciais,
  renovacoesComerciais,
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
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { generateTestToken } from '../../helpers/auth.helper';

// ── Inline helpers ────────────────────────────────────────────────────────────

async function createTestCliente(corretoraId: string, vendedorId: string) {
  const ts = Date.now();
  const [cliente] = await db
    .insert(clientes)
    .values({
      corretoraId,
      vendedorId,
      tipoPessoa: 'PF',
      nome: `Cliente WS ${ts}`,
      cpf: String(ts).slice(-11).padStart(11, '0'),
      email: `ws.${ts}@teste.com`,
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
      nomeProduto: `Produto WS ${ts}`,
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
      numeroDocumento: `WS-DOC-${ts}`,
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
      numeroEndosso: `WS-END-${ts}`,
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

describe('/api/area-trabalho — coverage gaps', () => {
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

  // ── GET /resumo — with data (lines 251–263) ───────────────────────────────

  describe('GET /api/area-trabalho/resumo — com dados reais', () => {
    it('retorna estatísticas com valores > 0 quando há dados no mês', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const now = new Date();
      const vigenciaFim = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        .toISOString()
        .slice(0, 10);

      // Cotação ativa do vendedor logado
      await db.insert(cotacoes).values({
        corretoraId,
        clienteId: cliente.id,
        vendedorId: usuarioId,
        produtoId: produto.id,
        numeroCotacao: `WS-COT-${Date.now()}`,
        status: 'EM_ELABORACAO',
        vigenciaInicio: '2025-01-01',
        vigenciaFim,
        premioLiquido: '800',
        percentualComissao: '10',
        valorComissao: '80',
      });

      // Proposta ativa do vendedor logado
      await db.insert(propostasComerciais).values({
        corretoraId,
        clienteId: cliente.id,
        vendedorId: usuarioId,
        produtoId: produto.id,
        numeroPropostaInterno: `WS-PROP-${Date.now()}`,
        status: 'AGUARDANDO_ENVIO',
        vigenciaInicio: '2025-01-01',
        vigenciaFim,
        premioLiquido: '900',
        percentualComissao: '10',
        valorComissao: '90',
      });

      // Renovação pendente do vendedor logado
      const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const dataVencimento = expiryDate.toISOString().slice(0, 10);

      const docAnterior = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { numeroDocumento: `WS-REN-BASE-${Date.now()}` },
      );

      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        documentoVendaAnteriorId: docAnterior.id,
        dataVencimento,
        status: 'NAO_TRABALHADO',
      });

      // Documento cancelado no mês atual
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const docCancelado = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        {
          numeroDocumento: `WS-CANC-${Date.now()}`,
          status: 'CANCELADO',
          dataCancelamento: startOfMonth,
        },
      );

      // Endosso pendente (para totalEndossosPendentes > 0)
      await createTestEndosso(corretoraId, docAnterior.id, usuarioId);

      const res = await request(app.server)
        .get('/api/area-trabalho/resumo')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const est = res.body.data.estatisticas;
      expect(est.totalCotacoesAtivas).toBeGreaterThan(0);
      expect(est.totalPropostasAtivas).toBeGreaterThan(0);
      expect(est.totalRenovacoesPendentes).toBeGreaterThan(0);
      expect(est.totalEndossosPendentes).toBeGreaterThan(0);
      expect(est.totalCanceladosMes).toBeGreaterThan(0);
      expect(est.metaMensal).toBe(50000);
      expect(typeof est.vendidoMes).toBe('number');
    });

    it('retorna cotacoes, propostas e renovacoes nas listas de dados', async () => {
      const res = await request(app.server)
        .get('/api/area-trabalho/resumo')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.cotacoes)).toBe(true);
      expect(Array.isArray(res.body.data.propostas)).toBe(true);
      expect(Array.isArray(res.body.data.renovacoes)).toBe(true);
      expect(res.body.data.cotacoes.length).toBeGreaterThan(0);
      expect(res.body.data.propostas.length).toBeGreaterThan(0);
      expect(res.body.data.renovacoes.length).toBeGreaterThan(0);
    });

    it('metaMensal sempre retorna 50000 (valor fixo)', async () => {
      const res = await request(app.server)
        .get('/api/area-trabalho/resumo')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.estatisticas.metaMensal).toBe(50000);
    });
  });

  // ── GET /endossos — podVerTodos branch (line 306) ────────────────────────

  describe('GET /api/area-trabalho/endossos — branch podVerTodos', () => {
    it('usuário COM vendas:aprovar_endosso vê todos os endossos SOLICITADOS da corretora', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      // Segundo vendedor
      const cargoVendedor = await createTestCargo(corretoraId, {
        nomeCargo: `Vendedor-WS-${Date.now()}`,
        permissoes: ['vendas:criar_endosso'],
      });
      const vendedor2 = await createTestUsuario(corretoraId, cargoVendedor.id);

      // Documento e endosso do vendedor2
      const docVendedor2 = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        vendedor2.id,
        produto.id,
        { numeroDocumento: `WS-V2-DOC-${Date.now()}` },
      );
      const endossoVendedor2 = await createTestEndosso(
        corretoraId,
        docVendedor2.id,
        vendedor2.id,
        { numeroEndosso: `WS-V2-END-${Date.now()}` },
      );

      // Documento e endosso do admin (usuarioId)
      const docAdmin = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { numeroDocumento: `WS-ADM-DOC-${Date.now()}` },
      );
      const endossoAdmin = await createTestEndosso(
        corretoraId,
        docAdmin.id,
        usuarioId,
        { numeroEndosso: `WS-ADM-END-${Date.now()}` },
      );

      // Aprovador com vendas:aprovar_endosso + workspace:acessar
      const cargoAprovador = await createTestCargo(corretoraId, {
        nomeCargo: `Aprovador-WS-${Date.now()}`,
        permissoes: ['vendas:aprovar_endosso', 'workspace:acessar'],
      });
      const aprovador = await createTestUsuario(corretoraId, cargoAprovador.id);
      const tokenAprovador = generateTestToken(app, {
        sub: aprovador.id,
        corretoraId,
        cargoId: cargoAprovador.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:aprovar_endosso', 'workspace:acessar'],
        nome: aprovador.nome,
        email: aprovador.email,
        avatarUrl: null,
      });

      const res = await request(app.server)
        .get('/api/area-trabalho/endossos')
        .set('Authorization', `Bearer ${tokenAprovador}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((e: any) => e.id);
      expect(ids).toContain(endossoVendedor2.id);
      expect(ids).toContain(endossoAdmin.id);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('usuário SEM vendas:aprovar_endosso vê apenas seus próprios endossos', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      // Terceiro vendedor
      const cargoVendedor = await createTestCargo(corretoraId, {
        nomeCargo: `Vendedor-Proprio-${Date.now()}`,
        permissoes: ['vendas:criar_endosso', 'workspace:acessar'],
      });
      const vendedor3 = await createTestUsuario(corretoraId, cargoVendedor.id);
      const tokenVendedor3 = generateTestToken(app, {
        sub: vendedor3.id,
        corretoraId,
        cargoId: cargoVendedor.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:criar_endosso', 'workspace:acessar'],
        nome: vendedor3.nome,
        email: vendedor3.email,
        avatarUrl: null,
      });

      // Endosso do admin (não deve aparecer para vendedor3)
      const docOutro = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { numeroDocumento: `WS-OUTRO-DOC-${Date.now()}` },
      );
      const endossoOutro = await createTestEndosso(
        corretoraId,
        docOutro.id,
        usuarioId,
        { numeroEndosso: `WS-OUTRO-END-${Date.now()}` },
      );

      // Endosso do vendedor3 (deve aparecer)
      const docProprio = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        vendedor3.id,
        produto.id,
        { numeroDocumento: `WS-PROP-DOC-${Date.now()}` },
      );
      const endossoProprio = await createTestEndosso(
        corretoraId,
        docProprio.id,
        vendedor3.id,
        { numeroEndosso: `WS-PROP-END-${Date.now()}` },
      );

      const res = await request(app.server)
        .get('/api/area-trabalho/endossos')
        .set('Authorization', `Bearer ${tokenVendedor3}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((e: any) => e.id);
      expect(ids).toContain(endossoProprio.id);
      expect(ids).not.toContain(endossoOutro.id);
    });

    it('retorna total correto no meta quando há endossos (line 353)', async () => {
      const res = await request(app.server)
        .get('/api/area-trabalho/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(typeof res.body.meta.total).toBe('number');
      expect(res.body.meta.total).toBeGreaterThan(0);
    });
  });

  // ── GET /cancelados — with data (line 423) ────────────────────────────────

  describe('GET /api/area-trabalho/cancelados — com dados reais', () => {
    it('retorna documentos cancelados nos últimos 30 dias', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const docCancelado = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        {
          numeroDocumento: `WS-CANC2-${Date.now()}`,
          status: 'CANCELADO',
          dataCancelamento: new Date(),
        },
      );

      const res = await request(app.server)
        .get('/api/area-trabalho/cancelados')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.meta.total).toBeGreaterThan(0);

      const ids = res.body.data.map((d: any) => d.id);
      expect(ids).toContain(docCancelado.id);
    });

    it('documento cancelado inclui dados do cliente e produto', async () => {
      const res = await request(app.server)
        .get('/api/area-trabalho/cancelados')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const doc = res.body.data[0];
      expect(doc).toHaveProperty('id');
      expect(doc.cliente).toBeDefined();
      expect(doc.produto).toBeDefined();
    });

    it('não retorna documentos cancelados há mais de 30 dias', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const maisde30Dias = new Date();
      maisde30Dias.setDate(maisde30Dias.getDate() - 31);

      const docAntigo = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        {
          numeroDocumento: `WS-CANC-OLD-${Date.now()}`,
          status: 'CANCELADO',
          dataCancelamento: maisde30Dias,
        },
      );

      const res = await request(app.server)
        .get('/api/area-trabalho/cancelados')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ids = res.body.data.map((d: any) => d.id);
      expect(ids).not.toContain(docAntigo.id);
    });

    it('retorna total correto no meta (line 423)', async () => {
      const res = await request(app.server)
        .get('/api/area-trabalho/cancelados')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(typeof res.body.meta.total).toBe('number');
      expect(res.body.meta.total).toBeGreaterThan(0);
    });
  });
});
