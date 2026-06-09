import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  documentosVenda,
  clientes,
  produtos,
  renovacoesComerciais,
  cotacoes,
  tarefas,
  propostasComerciais,
} from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createTestCliente(corretoraId: string, vendedorId: string) {
  const ts = Date.now();
  const [cliente] = await db
    .insert(clientes)
    .values({
      corretoraId,
      vendedorId,
      tipoPessoa: 'PF',
      nome: `Cliente Coverage ${ts}`,
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
      nomeProduto: `Produto Coverage ${ts}`,
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
      numeroDocumento: `COVDOC-${ts}`,
      status: 'ATIVO',
      vigenciaInicio: '2026-01-01',
      vigenciaFim: '2027-01-01',
      premioLiquido: '5000.00',
      percentualComissao: '10',
      valorComissao: '500.00',
      ...overrides,
    } as any)
    .returning();
  return doc;
}

describe('/api/dashboard', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let cargoId: string;
  let adminToken: string;
  let vendedorId: string;
  let vendedorToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    // Admin user
    const adminCargo = await createAdminCargo(corretoraId);
    cargoId = adminCargo.id;
    const admin = await createTestUsuario(corretoraId, adminCargo.id);
    usuarioId = admin.id;

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: adminCargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    // Vendedor user with dashboard:visualizar + relatorios:vendas
    const vendedorCargo = await createTestCargo(corretoraId, {
      isVendedor: true,
      permissoes: ['dashboard:visualizar', 'relatorios:vendas'],
    });
    const vendedor = await createTestUsuario(corretoraId, vendedorCargo.id);
    vendedorId = vendedor.id;

    vendedorToken = generateTestToken(app, {
      sub: vendedorId,
      corretoraId,
      cargoId: vendedorCargo.id,
      isAdmin: false,
      isGestor: false,
      isVendedor: true,
      permissoes: ['dashboard:visualizar', 'relatorios:vendas'],
      nome: vendedor.nome,
      email: vendedor.email,
      avatarUrl: null,
    });
  });

  describe('GET /api/dashboard', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/dashboard').expect(401);
    });

    it('retorna 403 sem permissão dashboard:visualizar', async () => {
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
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('retorna dados do dashboard com estatísticas zeradas', async () => {
      const res = await request(app.server)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.clientesAtivos).toBe(0);
      expect(res.body.data.stats.renovacoesPendentes).toBe(0);
      expect(res.body.data.stats.cotacoesAbertas).toBe(0);
    });
  });

  describe('GET /api/dashboard/vendas', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/dashboard/vendas').expect(401);
    });

    it('retorna 403 sem permissão relatorios:vendas', async () => {
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
        .get('/api/dashboard/vendas')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('retorna estatísticas de vendas zeradas', async () => {
      const res = await request(app.server)
        .get('/api/dashboard/vendas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.vendasNovas).toBeDefined();
      expect(res.body.data.vendasAtivas).toBeDefined();
    });

    it('aceita filtros de data', async () => {
      const res = await request(app.server)
        .get('/api/dashboard/vendas?dataInicio=2026-01-01&dataFim=2026-01-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/dashboard/renovacoes', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/dashboard/renovacoes').expect(401);
    });

    it('retorna estatísticas de renovações zeradas', async () => {
      const res = await request(app.server)
        .get('/api/dashboard/renovacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/dashboard/pipeline', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/dashboard/pipeline').expect(401);
    });

    it('retorna dados do pipeline de vendas', async () => {
      const res = await request(app.server)
        .get('/api/dashboard/pipeline')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/dashboard/renovacoes-chart', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/dashboard/renovacoes-chart')
        .expect(401);
    });

    it('retorna dados do gráfico de renovações', async () => {
      const res = await request(app.server)
        .get('/api/dashboard/renovacoes-chart')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna gráfico com período semana', async () => {
      const res = await request(app.server)
        .get('/api/dashboard/renovacoes-chart?periodo=semana')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna gráfico com período trimestre', async () => {
      const res = await request(app.server)
        .get('/api/dashboard/renovacoes-chart?periodo=trimestre')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna chartData com renovações quando há dados no período', async () => {
      // Insert a renovation so chartData.map produces non-empty output
      const cliente = await createTestCliente(corretoraId, usuarioId);
      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        dataVencimento: '2026-12-01',
        status: 'NAO_TRABALHADO',
        produtoDescricao: 'Seguro Chart',
      });

      const res = await request(app.server)
        .get('/api/dashboard/renovacoes-chart?periodo=mes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // May have data entries now
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/dashboard/equipe', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/dashboard/equipe')
        .expect(401);
    });

    it('retorna dados da equipe com vendedores', async () => {
      const res = await request(app.server)
        .get('/api/dashboard/equipe')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.vendedores).toBeDefined();
      expect(Array.isArray(res.body.data.vendedores)).toBe(true);
      expect(res.body.data.resumo).toBeDefined();
    });

    it('retorna equipe com métricas de vendas quando há documentos', async () => {
      // Create a vendedor user with cargo isVendedor = true
      const cargoVendedor = await createTestCargo(corretoraId, {
        permissoes: ['relatorios:vendas'],
        isVendedor: true,
      });
      const vendedor = await createTestUsuario(corretoraId, cargoVendedor.id);
      const cliente = await createTestCliente(corretoraId, vendedor.id);
      const produto = await createTestProduto(corretoraId);

      await createTestDocumentoVenda(corretoraId, vendedor.id, cliente.id, produto.id);

      const res = await request(app.server)
        .get('/api/dashboard/equipe')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.resumo.totalVendedores).toBeGreaterThanOrEqual(1);
    });

    it('aceita filtros de data', async () => {
      const res = await request(app.server)
        .get('/api/dashboard/equipe?dataInicio=2026-01-01&dataFim=2026-12-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/dashboard/relatorios/comissoes', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/dashboard/relatorios/comissoes')
        .expect(401);
    });

    it('retorna 403 sem permissão relatorios:comissoes', async () => {
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
        .get('/api/dashboard/relatorios/comissoes')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('retorna relatório de comissões vazio', async () => {
      const res = await request(app.server)
        .get('/api/dashboard/relatorios/comissoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.comissoes).toBeDefined();
      expect(Array.isArray(res.body.data.comissoes)).toBe(true);
      expect(res.body.data.totais).toBeDefined();
    });

    it('retorna comissões com dados quando há vendas ativas no período', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      await createTestDocumentoVenda(corretoraId, usuarioId, cliente.id, produto.id, {
        status: 'ATIVO',
        premioLiquido: '2000.00',
        valorComissao: '200.00',
      });

      const res = await request(app.server)
        .get('/api/dashboard/relatorios/comissoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.comissoes.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totais.totalComissao).toBeGreaterThan(0);
    });

    it('aceita filtro de vendedor', async () => {
      const res = await request(app.server)
        .get(`/api/dashboard/relatorios/comissoes?vendedorId=${usuarioId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('aceita filtros de data', async () => {
      const res = await request(app.server)
        .get('/api/dashboard/relatorios/comissoes?dataInicio=2026-01-01&dataFim=2026-12-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/dashboard/vendas - filtros de vendedor', () => {
    it('filtra por vendedorId quando não é admin', async () => {
      // Create non-admin non-gestor user with relatorios:vendas permission
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['relatorios:vendas'],
      });
      const vendedor = await createTestUsuario(corretoraId, cargo.id);
      const vendedorToken = generateTestToken(app, {
        sub: vendedor.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['relatorios:vendas'],
        nome: vendedor.nome,
        email: vendedor.email,
        avatarUrl: null,
      });

      const res = await request(app.server)
        .get('/api/dashboard/vendas')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // vendasPorStatus, cotacoes, propostas maps are exercised even with empty data
      expect(res.body.data.vendasPorStatus).toBeDefined();
      expect(res.body.data.cotacoes).toBeDefined();
      expect(res.body.data.propostas).toBeDefined();
    });

    it('filtra por vendedorId quando não é admin e query.vendedorId é fornecido', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['relatorios:vendas'],
      });
      const vendedor = await createTestUsuario(corretoraId, cargo.id);
      const vendedorToken = generateTestToken(app, {
        sub: vendedor.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['relatorios:vendas'],
        nome: vendedor.nome,
        email: vendedor.email,
        avatarUrl: null,
      });

      // Non-admin with vendedorId query param → takes the first branch (line 368-369)
      const res = await request(app.server)
        .get(`/api/dashboard/vendas?vendedorId=${vendedor.id}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna vendasPorStatus e cotacoes com dados reais', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      await createTestDocumentoVenda(corretoraId, usuarioId, cliente.id, produto.id, {
        status: 'ATIVO',
      });

      // Create a cotacao to exercise cotacoesStats.map
      await db.insert(cotacoes).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        produtoId: produto.id,
        numeroCotacao: `COT-DASH-${Date.now()}`,
        status: 'EM_ELABORACAO',
        situacao: 'NOVO',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
      });

      const res = await request(app.server)
        .get('/api/dashboard/vendas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // With real data, vendasPorStatus.map and cotacoes.map are exercised
      expect(Array.isArray(res.body.data.vendasPorStatus)).toBe(true);
      expect(Array.isArray(res.body.data.cotacoes)).toBe(true);
    });
  });

  describe('GET /api/dashboard/renovacoes - filtro vendedorId', () => {
    it('filtra renovações por vendedorId quando fornecido', async () => {
      const res = await request(app.server)
        .get(`/api/dashboard/renovacoes?vendedorId=${usuarioId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // porStatus.map is exercised with data
      expect(Array.isArray(res.body.data.porStatus)).toBe(true);
    });

    it('retorna porStatus com dados reais quando há renovações', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        dataVencimento: '2026-12-31',
        status: 'NAO_TRABALHADO',
        produtoDescricao: 'Seguro Renovacao',
        premioAnterior: '1000.00',
      });

      const res = await request(app.server)
        .get('/api/dashboard/renovacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.porStatus.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/dashboard/pipeline - filtros', () => {
    it('filtra pipeline por vendedorId', async () => {
      const res = await request(app.server)
        .get(`/api/dashboard/pipeline?vendedorId=${usuarioId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('filtra pipeline para usuário sem permissão visualizar_todos_documentos', async () => {
      // Non-admin without visualizar_todos_documentos permission → line 510-513
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['relatorios:vendas'],
      });
      const vendedor = await createTestUsuario(corretoraId, cargo.id);
      const vendedorToken = generateTestToken(app, {
        sub: vendedor.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['relatorios:vendas'],
        nome: vendedor.nome,
        email: vendedor.email,
        avatarUrl: null,
      });

      const res = await request(app.server)
        .get('/api/dashboard/pipeline')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('calcula taxa de conversão com cotações existentes', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      // Create a converted cotacao to exercise taxaConversaoCotacoes calculation (line 562-566)
      await db.insert(cotacoes).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        produtoId: produto.id,
        numeroCotacao: `COT-CONV-${Date.now()}`,
        status: 'CONVERTIDA',
        situacao: 'NOVO',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2026-12-31',
      });

      const res = await request(app.server)
        .get('/api/dashboard/pipeline')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.metricas.taxaConversaoCotacoes).toBe('number');
      expect(res.body.data.metricas.taxaConversaoCotacoes).toBeGreaterThan(0);
    });
  });

  describe('GET /api/dashboard — line 143: mediaComissaoPercent > 0', () => {
    it('calcula mediaComissaoPercent quando há doc ATIVO com premioLiquido e valorComissao', async () => {
      const cliente = await createTestCliente(corretoraId, vendedorId);
      const produto = await createTestProduto(corretoraId);

      // Create ATIVO document this month so it falls within startOfMonth filter
      await createTestDocumentoVenda(corretoraId, vendedorId, cliente.id, produto.id, {
        status: 'ATIVO',
        premioLiquido: '10000.00',
        valorComissao: '1000.00',
      });

      const res = await request(app.server)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.stats.mediaComissaoPercent).toBeGreaterThan(0);
      expect(res.body.data.stats.comissaoMes).toBeGreaterThan(0);
    });
  });

  describe('GET /api/dashboard — lines 269-285: renovacoesUrgentes.map()', () => {
    it('mapeia renovações urgentes com documentoVendaAnterior, cliente e produto', async () => {
      const cliente = await createTestCliente(corretoraId, vendedorId);
      const produto = await createTestProduto(corretoraId);

      // Create a documentoVenda so the renovacao has documentoVendaAnteriorId
      const doc = await createTestDocumentoVenda(
        corretoraId,
        vendedorId,
        cliente.id,
        produto.id,
      );

      // dataVencimento within 30 days from now
      const in29days = new Date();
      in29days.setDate(in29days.getDate() + 29);
      const dataVenc = in29days.toISOString().split('T')[0];

      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId,
        clienteId: cliente.id,
        documentoVendaAnteriorId: doc.id,
        dataVencimento: dataVenc,
        status: 'NAO_TRABALHADO',
        produtoDescricao: 'Seguro Urgente',
        premioAnterior: '2000.00',
      });

      const res = await request(app.server)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const urgentes = res.body.data.renovacoesUrgentes;
      expect(Array.isArray(urgentes)).toBe(true);
      expect(urgentes.length).toBeGreaterThanOrEqual(1);

      const urgente = urgentes[0];
      expect(urgente).toHaveProperty('id');
      expect(urgente).toHaveProperty('clienteNome');
      expect(urgente).toHaveProperty('dataVencimento');
      expect(urgente).toHaveProperty('diasRestantes');
      expect(urgente.diasRestantes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/dashboard — lines 288-291: atividadesRecentes.map()', () => {
    it('mapeia atividades recentes quando há documentosVenda do vendedor', async () => {
      // The documentoVenda created in previous test should already be present.
      // Make one more to be safe.
      const cliente = await createTestCliente(corretoraId, vendedorId);
      const produto = await createTestProduto(corretoraId);

      await createTestDocumentoVenda(corretoraId, vendedorId, cliente.id, produto.id);

      const res = await request(app.server)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const atividades = res.body.data.atividadesRecentes;
      expect(Array.isArray(atividades)).toBe(true);
      expect(atividades.length).toBeGreaterThanOrEqual(1);

      const atividade = atividades[0];
      expect(atividade).toHaveProperty('id');
      expect(atividade).toHaveProperty('tipo', 'venda');
      expect(atividade).toHaveProperty('descricao');
      expect(atividade).toHaveProperty('data');
    });
  });

  describe('GET /api/dashboard — lines 294-307: alertasFollowUp.map()', () => {
    it('mapeia alertas de follow-up para cotações sem movimento há mais de 5 dias', async () => {
      const cliente = await createTestCliente(corretoraId, vendedorId);
      const produto = await createTestProduto(corretoraId);

      const [cotacao] = await db
        .insert(cotacoes)
        .values({
          corretoraId,
          vendedorId,
          clienteId: cliente.id,
          produtoId: produto.id,
          numeroCotacao: `COT-FOLLOWUP-${Date.now()}`,
          status: 'EM_ELABORACAO',
          situacao: 'NOVO',
          vigenciaInicio: '2026-01-01',
          vigenciaFim: '2026-12-31',
        })
        .returning();

      // Set updatedAt to 10 days ago so the lt(cotacoes.updatedAt, cincosDiasAtras) filter matches
      await db
        .update(cotacoes)
        .set({ updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) })
        .where(eq(cotacoes.id, cotacao.id));

      const res = await request(app.server)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const alertas = res.body.data.alertasFollowUp;
      expect(Array.isArray(alertas)).toBe(true);
      expect(alertas.length).toBeGreaterThanOrEqual(1);

      const alerta = alertas[0];
      expect(alerta).toHaveProperty('id');
      expect(alerta).toHaveProperty('numeroCotacao');
      expect(alerta).toHaveProperty('clienteNome');
      expect(alerta).toHaveProperty('diasSemMovimento');
      expect(alerta.diasSemMovimento).toBeGreaterThanOrEqual(5);
    });
  });

  describe('GET /api/dashboard — lines 310-317: tarefasPendentes.map()', () => {
    it('mapeia tarefas pendentes do vendedor', async () => {
      await db.insert(tarefas).values({
        corretoraId,
        usuarioId: vendedorId,
        titulo: 'Tarefa Pendente Coverage',
        descricao: 'Descrição da tarefa de teste',
        prioridade: 'alta',
        concluida: false,
      });

      const res = await request(app.server)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const tarefasPend = res.body.data.tarefasPendentes;
      expect(Array.isArray(tarefasPend)).toBe(true);
      expect(tarefasPend.length).toBeGreaterThanOrEqual(1);

      const tarefa = tarefasPend[0];
      expect(tarefa).toHaveProperty('id');
      expect(tarefa).toHaveProperty('titulo', 'Tarefa Pendente Coverage');
      expect(tarefa).toHaveProperty('prioridade', 'alta');
      expect(tarefa).toHaveProperty('createdAt');
    });
  });

  describe('GET /api/dashboard/vendas — lines 474-475: propostasStats.map()', () => {
    it('mapeia propostas quando há propostasComerciais no período', async () => {
      const cliente = await createTestCliente(corretoraId, vendedorId);
      const produto = await createTestProduto(corretoraId);

      await db.insert(propostasComerciais).values({
        corretoraId,
        clienteId: cliente.id,
        vendedorId,
        produtoId: produto.id,
        numeroPropostaInterno: `PROP-COV-${Date.now()}`,
        status: 'AGUARDANDO_ENVIO',
        vigenciaInicio: new Date().toISOString().split('T')[0],
        vigenciaFim: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      });

      const res = await request(app.server)
        .get('/api/dashboard/vendas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const propostas = res.body.data.propostas;
      expect(Array.isArray(propostas)).toBe(true);
      expect(propostas.length).toBeGreaterThanOrEqual(1);

      const proposta = propostas[0];
      expect(proposta).toHaveProperty('status');
      expect(proposta).toHaveProperty('quantidade');
      expect(typeof proposta.quantidade).toBe('number');
    });
  });

  // ── GET /api/dashboard — lines 278-279: clienteNome fallbacks ────────────
  // linha 278: razaoSocial quando nome é null
  // linha 279: 'Cliente' quando ambos são null

  describe('GET /api/dashboard — lines 278-279: clienteNome fallbacks em renovacoesUrgentes', () => {
    it('linha 278: usa razaoSocial quando nome do cliente é null', async () => {
      // Cliente PJ com nome null e razaoSocial preenchida
      const ts = Date.now();
      const [clientePJ] = await db
        .insert(clientes)
        .values({
          corretoraId,
          vendedorId,
          tipoPessoa: 'PJ',
          nome: null,
          razaoSocial: `Empresa Fallback ${ts}`,
          cnpj: String(ts).slice(-14).padStart(14, '0'),
          ativo: true,
        } as any)
        .returning();

      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(corretoraId, vendedorId, clientePJ.id, produto.id);

      const in15days = new Date();
      in15days.setDate(in15days.getDate() + 15);
      const dataVenc = in15days.toISOString().split('T')[0];

      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId,
        clienteId: clientePJ.id,
        documentoVendaAnteriorId: doc.id,
        dataVencimento: dataVenc,
        status: 'NAO_TRABALHADO',
        premioAnterior: '3000.00',
      });

      const res = await request(app.server)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const urgentes = res.body.data.renovacoesUrgentes;
      expect(Array.isArray(urgentes)).toBe(true);

      // Deve encontrar pelo menos uma renovação usando razaoSocial
      const comRazaoSocial = urgentes.find(
        (u: any) => u.clienteNome === `Empresa Fallback ${ts}`,
      );
      expect(comRazaoSocial).toBeDefined();
    });

    it('linha 279: usa "Cliente" quando nome e razaoSocial são null', async () => {
      // Cliente com nome null e razaoSocial null
      const ts = Date.now();
      const [clienteSemNome] = await db
        .insert(clientes)
        .values({
          corretoraId,
          vendedorId,
          tipoPessoa: 'PJ',
          nome: null,
          razaoSocial: null,
          cnpj: String(ts + 1).slice(-14).padStart(14, '0'),
          ativo: true,
        } as any)
        .returning();

      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        vendedorId,
        clienteSemNome.id,
        produto.id,
      );

      const in20days = new Date();
      in20days.setDate(in20days.getDate() + 20);
      const dataVenc = in20days.toISOString().split('T')[0];

      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId,
        clienteId: clienteSemNome.id,
        documentoVendaAnteriorId: doc.id,
        dataVencimento: dataVenc,
        status: 'NAO_TRABALHADO',
        premioAnterior: '4000.00',
      });

      const res = await request(app.server)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const urgentes = res.body.data.renovacoesUrgentes;
      expect(Array.isArray(urgentes)).toBe(true);

      // Deve encontrar uma renovação com clienteNome = 'Cliente'
      const semNome = urgentes.find((u: any) => u.clienteNome === 'Cliente');
      expect(semNome).toBeDefined();
    });
  });

  // ── GET /api/dashboard — lines 322-336: catch block ────────────────────────

  describe('GET /api/dashboard — lines 322-336: catch block quando db.select lança', () => {
    let selectSpy: ReturnType<typeof vi.spyOn>;

    afterAll(() => {
      selectSpy?.mockRestore();
    });

    it('retorna erro quando db.select lança exceção no dashboard', async () => {
      // Espiar db.select para lançar um erro na primeira chamada
      selectSpy = vi.spyOn(db, 'select').mockImplementationOnce(() => {
        throw new Error('DB select error simulado');
      });

      const res = await request(app.server)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${vendedorToken}`);

      // O error handler da aplicação converte para 500
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
