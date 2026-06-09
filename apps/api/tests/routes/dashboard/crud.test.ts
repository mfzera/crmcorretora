import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  documentosVenda,
  clientes,
  produtos,
  renovacoesComerciais,
  cotacoes,
  usuarios,
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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createTestCliente(corretoraId: string, vendedorId: string) {
  const ts = Date.now();
  const [cliente] = await db
    .insert(clientes)
    .values({
      corretoraId,
      vendedorId,
      tipoPessoa: 'PF',
      nome: `Cliente Dash ${ts}`,
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
      nomeProduto: `Produto Dash ${ts}`,
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
      numeroDocumento: `DASHDOC-${ts}`,
      status: 'ATIVO',
      vigenciaInicio: '2026-01-01',
      vigenciaFim: '2027-01-01',
      premioLiquido: '5000.00',
      percentualComissao: '10',
      valorComissao: '500',
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
});
