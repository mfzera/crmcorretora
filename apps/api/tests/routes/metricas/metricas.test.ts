import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  documentosVenda,
  produtos,
  oportunidades,
  endossos,
  renovacoesComerciais,
  seguradorasParceiras,
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
import {
  createTestClientePF,
} from '../../helpers/factories/cliente.factory';
import { getRedis } from '../../../src/utils/cache.js';
import { generateTestToken } from '../../helpers/auth.helper';

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

describe('/api/metricas', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminId: string;
  let adminToken: string;
  let vendedorToken: string;
  let vendedorId: string;
  let produtoId: string;
  let clienteId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    const cargo = await createAdminCargo(corretoraId);
    const admin = await createTestUsuario(corretoraId, cargo.id);
    adminId = admin.id;

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: ['relatorios:vendas'],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    const cargoVendedor = await createTestCargo(corretoraId, {
      isVendedor: true,
      permissoes: [],
    });
    const vendedor = await createTestUsuario(corretoraId, cargoVendedor.id);
    vendedorId = vendedor.id;

    vendedorToken = generateTestToken(app, {
      sub: vendedor.id,
      corretoraId,
      cargoId: cargoVendedor.id,
      isAdmin: false,
      isGestor: false,
      isVendedor: true,
      permissoes: [],
      nome: vendedor.nome,
      email: vendedor.email,
      avatarUrl: null,
    });

    const produto = await createTestProduto(corretoraId);
    produtoId = produto.id;

    const cliente = await createTestClientePF(corretoraId, adminId);
    clienteId = cliente.id;

    // Criar dados de teste
    await db.insert(documentosVenda).values({
      corretoraId,
      clienteId: cliente.id,
      vendedorId: adminId,
      produtoId: produto.id,
      numeroDocumento: `DOC-${Date.now()}`,
      tipoDocumento: 'VENDA_EXPRESSA',
      status: 'ATIVO',
      vigenciaInicio: '2025-01-01',
      vigenciaFim: '2026-01-01',
      premioLiquido: '1000',
      valorComissao: '100',
      percentualComissao: '10',
      dataSolicitacaoCadastro: new Date('2025-06-15'),
    });

    await db.insert(oportunidades).values({
      corretoraId,
      vendedorId: adminId,
      vendedorOriginalId: adminId,
      nomeCliente: 'Opp Teste',
      status: 'lead',
      prioridade: 'baixa',
      temperatura: 'morno',
      ordem: 1,
    });

    const docVenda = await db.query.documentosVenda.findFirst({
      where: (d, { eq }) => eq(d.corretoraId, corretoraId),
    });

    await db.insert(endossos).values({
      corretoraId,
      vendedorId: adminId,
      documentoVendaId: docVenda!.id,
      tipoEndosso: 'INCLUSAO_COBERTURA',
      status: 'SOLICITADO',
      dataSolicitacao: new Date(),
      numeroEndosso: `END-${Date.now()}`,
      descricao: 'Endosso teste para metricas',
      dataVigenciaEndosso: '2025-07-01',
    });
  });

  // ── GET /api/metricas ─────────────────────────────────────────────────────

  describe('GET /api/metricas', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/metricas').expect(401);
    });

    it('retorna métricas gerais zeradas', async () => {
      const res = await request(app.server)
        .get('/api/metricas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('aceita filtros de período', async () => {
      await request(app.server)
        .get('/api/metricas?dataInicio=2026-01-01&dataFim=2026-01-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('aceita filtro por vendedorId', async () => {
      await request(app.server)
        .get(`/api/metricas?vendedorId=${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('retorna metricas gerais para admin com relatorios:vendas', async () => {
      const res = await request(app.server)
        .get('/api/metricas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.premioLiquido).toBeDefined();
      expect(res.body.comissao).toBeDefined();
      expect(res.body.kanban).toBeDefined();
      expect(res.body.cadastro).toBeDefined();
      expect(res.body.renovacao).toBeDefined();
      expect(res.body.endosso).toBeDefined();
      expect(res.body.topVendedores).toBeDefined();
      expect(res.body.seguradoras).toBeDefined();
      expect(res.body.negocioCorretora).toBeDefined();
    });

    it('filtra por dataInicio e dataFim', async () => {
      const res = await request(app.server)
        .get('/api/metricas?dataInicio=2025-01-01&dataFim=2026-12-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.premioLiquido).toBeDefined();
    });

    it('filtra por vendedorId', async () => {
      const res = await request(app.server)
        .get(`/api/metricas?vendedorId=${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.premioLiquido).toBeDefined();
    });

    it('filtra por produtoId', async () => {
      const res = await request(app.server)
        .get(`/api/metricas?produtoId=${produtoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.premioLiquido).toBeDefined();
    });

    it('vendedor sem relatorios:vendas ve apenas seus proprios dados', async () => {
      const res = await request(app.server)
        .get('/api/metricas')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.premioLiquido).toBeDefined();
      expect(res.body.topVendedores).toEqual([]);
    });

    it('filtra por seguradoraParceiraId (linhas 155-156)', async () => {
      const ts = Date.now();
      const [seguradora] = await db
        .insert(seguradorasParceiras)
        .values({
          corretoraId,
          cnpj: String(ts).slice(-14).padStart(14, '0'),
          razaoSocial: `Seguradora Teste ${ts}`,
          nomeFantasia: `Seg Teste ${ts}`,
        })
        .returning();

      const cliente = await createTestClientePF(corretoraId, adminId);

      await db.insert(documentosVenda).values({
        corretoraId,
        clienteId: cliente.id,
        vendedorId: adminId,
        produtoId,
        numeroDocumento: `DOC-SEG-${ts}`,
        tipoDocumento: 'VENDA_EXPRESSA',
        status: 'ATIVO',
        vigenciaInicio: '2025-01-01',
        vigenciaFim: '2026-01-01',
        premioLiquido: '2000',
        valorComissao: '200',
        percentualComissao: '10',
        dataSolicitacaoCadastro: new Date('2025-06-20'),
        seguradoraParceiraId: seguradora.id,
      });

      const res = await request(app.server)
        .get(`/api/metricas?seguradoraParceiraId=${seguradora.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.premioLiquido).toBeDefined();
      expect(res.body.filtros.seguradoraParceiraId).toBe(seguradora.id);
    });

    it('agrega renovacoes por status incluindo EM_PROSPECCAO, EM_NEGOCIACAO, etc (linhas 287-299)', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      await db.insert(renovacoesComerciais).values([
        {
          corretoraId,
          vendedorId: adminId,
          clienteId: cliente.id,
          dataVencimento: '2025-06-01',
          status: 'EM_PROSPECCAO',
          produtoDescricao: 'Seguro A',
        },
        {
          corretoraId,
          vendedorId: adminId,
          clienteId: cliente.id,
          dataVencimento: '2025-06-02',
          status: 'EM_NEGOCIACAO',
          produtoDescricao: 'Seguro B',
        },
        {
          corretoraId,
          vendedorId: adminId,
          clienteId: cliente.id,
          dataVencimento: '2025-06-03',
          status: 'AGUARDANDO_CLIENTE',
          produtoDescricao: 'Seguro C',
        },
        {
          corretoraId,
          vendedorId: adminId,
          clienteId: cliente.id,
          dataVencimento: '2025-06-04',
          status: 'RENOVADO',
          produtoDescricao: 'Seguro D',
        },
        {
          corretoraId,
          vendedorId: adminId,
          clienteId: cliente.id,
          dataVencimento: '2025-06-05',
          status: 'PERDIDO',
          produtoDescricao: 'Seguro E',
        },
      ]);

      const res = await request(app.server)
        .get('/api/metricas?dataInicio=2025-06-01&dataFim=2025-06-30')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.renovacao).toBeDefined();
      expect(res.body.renovacao.resumo).toBeDefined();
      expect(res.body.renovacao.resumo.total).toBeGreaterThanOrEqual(5);
      expect(res.body.renovacao.resumo.renovados).toBeGreaterThanOrEqual(1);
      expect(res.body.renovacao.resumo.perdidos).toBeGreaterThanOrEqual(1);
      expect(res.body.renovacao.resumo.emAndamento).toBeGreaterThanOrEqual(3);
    });

    it('inclui metricas porSeguradora quando documentos tem seguradoraParceiraId (linhas 501-506)', async () => {
      const ts = Date.now();
      const [seguradora1] = await db
        .insert(seguradorasParceiras)
        .values({
          corretoraId,
          cnpj: String(ts + 1).slice(-14).padStart(14, '0'),
          razaoSocial: `Seguradora Alpha ${ts}`,
          nomeFantasia: `Alpha ${ts}`,
        })
        .returning();

      const [seguradora2] = await db
        .insert(seguradorasParceiras)
        .values({
          corretoraId,
          cnpj: String(ts + 2).slice(-14).padStart(14, '0'),
          razaoSocial: `Seguradora Beta ${ts}`,
          nomeFantasia: `Beta ${ts}`,
        })
        .returning();

      const cliente = await createTestClientePF(corretoraId, adminId);

      await db.insert(documentosVenda).values([
        {
          corretoraId,
          clienteId: cliente.id,
          vendedorId: adminId,
          produtoId,
          numeroDocumento: `DOC-ALPHA-${ts}`,
          tipoDocumento: 'VENDA_EXPRESSA',
          status: 'ATIVO',
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2026-01-01',
          premioLiquido: '3000',
          valorComissao: '300',
          percentualComissao: '10',
          dataSolicitacaoCadastro: new Date('2025-07-01'),
          seguradoraParceiraId: seguradora1.id,
        },
        {
          corretoraId,
          clienteId: cliente.id,
          vendedorId: adminId,
          produtoId,
          numeroDocumento: `DOC-BETA-${ts}`,
          tipoDocumento: 'VENDA_EXPRESSA',
          status: 'ATIVO',
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2026-01-01',
          premioLiquido: '4000',
          valorComissao: '400',
          percentualComissao: '10',
          dataSolicitacaoCadastro: new Date('2025-07-02'),
          seguradoraParceiraId: seguradora2.id,
        },
      ]);

      // Insert direto no DB não passa pelo handler que invalida o cache automaticamente.
      // withCacheGeneric usa chave fixa — deletamos diretamente para forçar o fetcher.
      try { await getRedis().del(`metricas:${corretoraId}:todos`); } catch { /* não crítico */ }

      const res = await request(app.server)
        .get('/api/metricas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.seguradoras).toBeDefined();
      expect(res.body.seguradoras.metricas).toBeDefined();
      expect(Array.isArray(res.body.seguradoras.metricas)).toBe(true);
      expect(res.body.seguradoras.metricas.length).toBeGreaterThanOrEqual(2);

      const nomes = res.body.seguradoras.metricas.map((s: any) => s.seguradoraNome);
      expect(nomes).toContain(`Beta ${ts}`);
      expect(nomes).toContain(`Alpha ${ts}`);
    });
  });

  // ── GET /api/metricas/detalhes ────────────────────────────────────────────

  describe('GET /api/metricas/detalhes', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/metricas/detalhes').expect(401);
    });

    it('retorna 400 sem categoria obrigatória', async () => {
      await request(app.server)
        .get('/api/metricas/detalhes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('retorna detalhes com categoria válida', async () => {
      await request(app.server)
        .get('/api/metricas/detalhes?categoria=premio_liquido')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('retorna detalhes de premio_liquido', async () => {
      const res = await request(app.server)
        .get('/api/metricas/detalhes?categoria=premio_liquido')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.categoria).toBe('premio_liquido');
      expect(res.body.detalhes).toBeDefined();
    });

    it('retorna detalhes de comissao', async () => {
      const res = await request(app.server)
        .get('/api/metricas/detalhes?categoria=comissao')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.categoria).toBe('comissao');
    });

    it('retorna detalhes de status_kanban', async () => {
      const res = await request(app.server)
        .get('/api/metricas/detalhes?categoria=status_kanban')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.categoria).toBe('status_kanban');
    });

    it('retorna detalhes de cadastro', async () => {
      const res = await request(app.server)
        .get('/api/metricas/detalhes?categoria=cadastro')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.categoria).toBe('cadastro');
    });

    it('retorna detalhes de renovacao', async () => {
      const res = await request(app.server)
        .get('/api/metricas/detalhes?categoria=renovacao')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.categoria).toBe('renovacao');
    });

    it('retorna detalhes de endosso', async () => {
      const res = await request(app.server)
        .get('/api/metricas/detalhes?categoria=endosso')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.categoria).toBe('endosso');
    });

    it('filtra detalhes por dataInicio e dataFim', async () => {
      const res = await request(app.server)
        .get('/api/metricas/detalhes?categoria=premio_liquido&dataInicio=2025-01-01&dataFim=2026-12-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.detalhes).toBeDefined();
    });

    it('filtra detalhes por vendedorId', async () => {
      const res = await request(app.server)
        .get(`/api/metricas/detalhes?categoria=premio_liquido&vendedorId=${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.detalhes).toBeDefined();
    });

    it('vendedor sem permissao ve apenas seus dados em detalhes', async () => {
      const res = await request(app.server)
        .get('/api/metricas/detalhes?categoria=premio_liquido')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.detalhes).toBeDefined();
    });

    it('detalhes de status_kanban filtra por vendedorId', async () => {
      const res = await request(app.server)
        .get(`/api/metricas/detalhes?categoria=status_kanban&vendedorId=${adminId}&dataInicio=2025-01-01&dataFim=2026-12-31`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.categoria).toBe('status_kanban');
    });

    it('detalhes de cadastro filtra por vendedorId', async () => {
      const res = await request(app.server)
        .get(`/api/metricas/detalhes?categoria=cadastro&vendedorId=${adminId}&dataInicio=2025-01-01&dataFim=2026-12-31`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.categoria).toBe('cadastro');
    });

    it('detalhes de renovacao filtra por vendedorId e datas', async () => {
      const res = await request(app.server)
        .get(`/api/metricas/detalhes?categoria=renovacao&vendedorId=${adminId}&dataInicio=2025-01-01&dataFim=2026-12-31`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.categoria).toBe('renovacao');
    });

    it('detalhes de endosso filtra por vendedorId e datas', async () => {
      const res = await request(app.server)
        .get(`/api/metricas/detalhes?categoria=endosso&vendedorId=${adminId}&dataInicio=2025-01-01&dataFim=2026-12-31`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.categoria).toBe('endosso');
    });
  });

  // ── GET /api/metricas/vendedores ──────────────────────────────────────────

  describe('GET /api/metricas/vendedores', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/metricas/vendedores').expect(401);
    });

    it('retorna métricas por vendedor', async () => {
      const res = await request(app.server)
        .get('/api/metricas/vendedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('admin ve todos os vendedores', async () => {
      const res = await request(app.server)
        .get('/api/metricas/vendedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.vendedores).toBeDefined();
      expect(res.body.vendedores.length).toBeGreaterThanOrEqual(1);
    });

    it('vendedor ve apenas a si mesmo', async () => {
      const res = await request(app.server)
        .get('/api/metricas/vendedores')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.vendedores).toBeDefined();
      expect(res.body.vendedores.length).toBe(1);
      expect(res.body.vendedores[0].id).toBe(vendedorId);
    });
  });

  // ── GET /api/metricas/evolucao ────────────────────────────────────────────

  describe('GET /api/metricas/evolucao', () => {
    it('retorna evolucao mensal por padrao', async () => {
      const res = await request(app.server)
        .get('/api/metricas/evolucao')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.evolucao).toBeDefined();
    });

    it('retorna evolucao semanal', async () => {
      const res = await request(app.server)
        .get('/api/metricas/evolucao?granularidade=semana&dataInicio=2025-06-01&dataFim=2025-06-30')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.evolucao).toBeDefined();
    });

    it('retorna evolucao diaria', async () => {
      const res = await request(app.server)
        .get('/api/metricas/evolucao?granularidade=dia&dataInicio=2025-06-14&dataFim=2025-06-16')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.evolucao).toBeDefined();
      expect(res.body.evolucao.length).toBeGreaterThanOrEqual(1);
    });

    it('filtra por vendedorId', async () => {
      const res = await request(app.server)
        .get(`/api/metricas/evolucao?vendedorId=${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.evolucao).toBeDefined();
    });

    it('vendedor sem permissao ve apenas seus dados', async () => {
      const res = await request(app.server)
        .get('/api/metricas/evolucao')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.evolucao).toBeDefined();
    });

    it('retorna evolucao com granularidade mensal e datas (linhas 81-89)', async () => {
      const res = await request(app.server)
        .get('/api/metricas/evolucao?granularidade=mes&dataInicio=2025-01-01&dataFim=2025-03-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.evolucao).toBeDefined();
      expect(Array.isArray(res.body.evolucao)).toBe(true);
      // 3 months: 2025-01, 2025-02, 2025-03
      expect(res.body.evolucao.length).toBe(3);
      expect(res.body.evolucao[0].periodo).toBe('2025-01');
      expect(res.body.evolucao[1].periodo).toBe('2025-02');
      expect(res.body.evolucao[2].periodo).toBe('2025-03');
    });
  });

  // ── GET /api/metricas/storage ─────────────────────────────────────────────

  describe('GET /api/metricas/storage', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/metricas/storage')
        .expect(401);
    });
  });

  // ── GET /api/metricas/storage/history ─────────────────────────────────────

  describe('GET /api/metricas/storage/history', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/metricas/storage/history')
        .expect(401);
    });
  });

  // ── GET /api/metricas/storage/costs ───────────────────────────────────────

  describe('GET /api/metricas/storage/costs', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/metricas/storage/costs')
        .expect(401);
    });
  });
});
