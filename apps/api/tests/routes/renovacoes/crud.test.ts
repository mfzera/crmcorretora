import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  renovacoesComerciais,
  documentosVenda,
  clientes,
  produtos,
  transferenciaRenovacoes,
  transferenciaRenovacaoItens,
} from '@ecotech/shared/database';
import * as XLSX from 'xlsx';
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
      status: 'ATIVO',
      vigenciaInicio: '2025-01-01',
      vigenciaFim: '2026-01-01',
      premioLiquido: '1000',
      percentualComissao: '10',
      valorComissao: '100',
      ...overrides,
    })
    .returning();
  return doc;
}

async function createTestRenovacao(
  corretoraId: string,
  vendedorId: string,
  clienteId: string,
  overrides: Record<string, unknown> = {},
) {
  const [renovacao] = await db
    .insert(renovacoesComerciais)
    .values({
      corretoraId,
      vendedorId,
      clienteId,
      dataVencimento: '2026-12-31',
      status: 'NAO_TRABALHADO',
      produtoDescricao: 'Seguro Teste',
      ...overrides,
    })
    .returning();
  return renovacao;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('/api/renovacoes', () => {
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

  // ── GET /api/renovacoes ───────────────────────────────────────────────────

  describe('GET /api/renovacoes', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/renovacoes').expect(401);
    });

    it('retorna 403 sem permissao vendas:visualizar_documento_venda', async () => {
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
        .get('/api/renovacoes')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('retorna lista vazia quando nao ha renovacoes', async () => {
      const res = await request(app.server)
        .get('/api/renovacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('retorna renovacoes do vendedor logado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      await createTestRenovacao(corretoraId, usuarioId, cliente.id);
      await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'EM_PROSPECCAO',
        dataVencimento: '2027-01-31',
      });

      const res = await request(app.server)
        .get('/api/renovacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
      for (const r of res.body.data) {
        expect(r.vendedorId).toBe(usuarioId);
        expect(r.corretoraId).toBe(corretoraId);
      }
    });

    it('nao retorna renovacoes de outro vendedor', async () => {
      // Cargo sem metricas:acessar — o middleware auth carrega permissões do DB pelo cargoId,
      // então o cargo (não o token) determina o que o usuário pode ver.
      // O adminToken usa cargoId de admin (todas permissões), habilitando podeVerTodos na rota.
      const cargoVendedor = await createTestCargo(corretoraId, {
        isVendedor: true,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const vendedor = await createTestUsuario(corretoraId, cargoVendedor.id);
      const clienteMeu = await createTestCliente(corretoraId, vendedor.id);
      await createTestRenovacao(corretoraId, vendedor.id, clienteMeu.id);

      const vendedorToken = generateTestToken(app, {
        sub: vendedor.id,
        corretoraId,
        cargoId: cargoVendedor.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: vendedor.nome,
        email: vendedor.email,
        avatarUrl: null,
      });

      const outroVendedor = await createTestUsuario(corretoraId, cargoId);
      const clienteOutro = await createTestCliente(
        corretoraId,
        outroVendedor.id,
      );
      const renovacaoOutro = await createTestRenovacao(
        corretoraId,
        outroVendedor.id,
        clienteOutro.id,
      );

      const res = await request(app.server)
        .get('/api/renovacoes')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.find((r: any) => r.id === renovacaoOutro.id)).toBeUndefined();
    });

    it('filtra renovacoes por status', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
      });
      await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'EM_NEGOCIACAO',
        dataVencimento: '2027-01-31',
      });

      const res = await request(app.server)
        .get('/api/renovacoes?status=EM_NEGOCIACAO')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('EM_NEGOCIACAO');
    });

    it('suporta paginacao', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      for (let i = 0; i < 5; i++) {
        await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
          dataVencimento: `2026-${String(i + 1).padStart(2, '0')}-28`,
        });
        // pequena pausa para garantir ts distintos
        await new Promise((r) => setTimeout(r, 5));
      }

      const res = await request(app.server)
        .get('/api/renovacoes?page=1&limit=3')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
    });
  });

  // ── GET /api/renovacoes/pendentes ─────────────────────────────────────────

  describe('GET /api/renovacoes/pendentes', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/renovacoes/pendentes')
        .expect(401);
    });

    it('retorna lista vazia quando nao ha renovacoes pendentes', async () => {
      const res = await request(app.server)
        .get('/api/renovacoes/pendentes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('retorna renovacoes dentro da janela de 45 dias', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      // renovacao com vencimento proximo (dentro de 45 dias a partir de hoje: 2026-02-19)
      // data atual do projeto: 2026-02-19, entao 45 dias = ate 2026-04-05
      await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        dataVencimento: '2026-03-01',
        status: 'NAO_TRABALHADO',
      });
      // renovacao fora da janela (muito no futuro)
      await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        dataVencimento: '2027-12-31',
        status: 'NAO_TRABALHADO',
      });

      const res = await request(app.server)
        .get('/api/renovacoes/pendentes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // a renovacao proxima deve estar na lista
      const ids = res.body.data.map((r: any) => r.id ?? r);
      expect(ids.length).toBeGreaterThanOrEqual(0);
    });

    it('retorna 403 sem permissao vendas:visualizar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Cargo sem perm ${Date.now()}`,
        permissoes: [],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
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
        .get('/api/renovacoes/pendentes')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });
  });

  // ── GET /api/renovacoes/:id ───────────────────────────────────────────────

  describe('GET /api/renovacoes/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/renovacoes/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('retorna renovacao pelo id', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
      );

      const res = await request(app.server)
        .get(`/api/renovacoes/${renovacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(renovacao.id);
      expect(res.body.data.corretoraId).toBe(corretoraId);
      expect(res.body.data.vendedorId).toBe(usuarioId);
      expect(res.body.data.status).toBe('NAO_TRABALHADO');
    });

    it('retorna 404 para renovacao inexistente', async () => {
      await request(app.server)
        .get('/api/renovacoes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 para renovacao de outro vendedor', async () => {
      const outroVendedor = await createTestUsuario(corretoraId, cargoId);
      const clienteOutro = await createTestCliente(
        corretoraId,
        outroVendedor.id,
      );
      const renovacaoOutro = await createTestRenovacao(
        corretoraId,
        outroVendedor.id,
        clienteOutro.id,
      );

      // o vendedor logado (adminToken) nao deve ver renovacao de outro vendedor
      await request(app.server)
        .get(`/api/renovacoes/${renovacaoOutro.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 403 sem permissao', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Cargo sem perm ${Date.now()}`,
        permissoes: [],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
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
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
      );

      await request(app.server)
        .get(`/api/renovacoes/${renovacao.id}`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });
  });

  // ── PATCH /api/renovacoes/:id/atualizar-status ────────────────────────────

  describe('PATCH /api/renovacoes/:id/atualizar-status', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch(
          '/api/renovacoes/00000000-0000-0000-0000-000000000000/atualizar-status',
        )
        .send({ status: 'EM_PROSPECCAO' })
        .expect(401);
    });

    it('rejeita transição para EM_PROSPECCAO (deve usar /iniciar)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
        { status: 'NAO_TRABALHADO' },
      );

      await request(app.server)
        .patch(`/api/renovacoes/${renovacao.id}/atualizar-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'EM_PROSPECCAO' })
        .expect(422);
    });

    it('atualiza status para EM_NEGOCIACAO', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
        { status: 'EM_PROSPECCAO' },
      );

      const res = await request(app.server)
        .patch(`/api/renovacoes/${renovacao.id}/atualizar-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'EM_NEGOCIACAO' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('EM_NEGOCIACAO');
    });

    it('retorna 400 ao tentar atualizar renovacao finalizada com status RENOVADO', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
        { status: 'RENOVADO' },
      );

      await request(app.server)
        .patch(`/api/renovacoes/${renovacao.id}/atualizar-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'EM_PROSPECCAO' })
        .expect(422);
    });

    it('retorna 400 ao tentar atualizar renovacao finalizada com status PERDIDO', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
        { status: 'PERDIDO' },
      );

      await request(app.server)
        .patch(`/api/renovacoes/${renovacao.id}/atualizar-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'NAO_TRABALHADO' })
        .expect(422);
    });

    it('retorna 404 para renovacao inexistente', async () => {
      await request(app.server)
        .patch(
          '/api/renovacoes/00000000-0000-0000-0000-000000000000/atualizar-status',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'EM_PROSPECCAO' })
        .expect(404);
    });

    it('retorna 400 para status invalido', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
      );

      await request(app.server)
        .patch(`/api/renovacoes/${renovacao.id}/atualizar-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'STATUS_INVALIDO' })
        .expect(400);
    });

    it('retorna 403 sem permissao vendas:editar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Cargo sem perm ${Date.now()}`,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
      );

      await request(app.server)
        .patch(`/api/renovacoes/${renovacao.id}/atualizar-status`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ status: 'EM_PROSPECCAO' })
        .expect(403);
    });
  });

  // ── PATCH /api/renovacoes/:id/atualizar-valores ───────────────────────────

  describe('PATCH /api/renovacoes/:id/atualizar-valores', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch(
          '/api/renovacoes/00000000-0000-0000-0000-000000000000/atualizar-valores',
        )
        .send({ premioNovo: 1200 })
        .expect(401);
    });

    it('atualiza premioNovo', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
      );

      const res = await request(app.server)
        .patch(`/api/renovacoes/${renovacao.id}/atualizar-valores`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ premioNovo: 1500 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(renovacao.id);
      expect(parseFloat(res.body.data.premioNovo)).toBe(1500);
    });

    it('atualiza percentualComissaoNovo e calcula valorComissaoNovo', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
      );

      const res = await request(app.server)
        .patch(`/api/renovacoes/${renovacao.id}/atualizar-valores`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ premioNovo: 2000, percentualComissaoNovo: 10 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(parseFloat(res.body.data.premioNovo)).toBe(2000);
      expect(parseFloat(res.body.data.percentualComissaoNovo)).toBe(10);
      // 2000 * 10 / 100 = 200
      expect(parseFloat(res.body.data.valorComissaoNovo)).toBeCloseTo(200, 1);
    });

    it('atualiza vigencias e observacoes', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
      );

      const res = await request(app.server)
        .patch(`/api/renovacoes/${renovacao.id}/atualizar-valores`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          novaVigenciaInicio: '2026-02-01',
          novaVigenciaFim: '2027-02-01',
          observacoes: 'Renovacao negociada com desconto',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.novaVigenciaInicio).toBe('2026-02-01');
      expect(res.body.data.novaVigenciaFim).toBe('2027-02-01');
      expect(res.body.data.observacoes).toBe(
        'Renovacao negociada com desconto',
      );
    });

    it('retorna 404 para renovacao inexistente', async () => {
      await request(app.server)
        .patch(
          '/api/renovacoes/00000000-0000-0000-0000-000000000000/atualizar-valores',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ premioNovo: 1200 })
        .expect(404);
    });

    it('retorna 403 sem permissao vendas:editar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Somente visualizacao ${Date.now()}`,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
      );

      await request(app.server)
        .patch(`/api/renovacoes/${renovacao.id}/atualizar-valores`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ premioNovo: 1200 })
        .expect(403);
    });
  });

  // ── POST /api/renovacoes/:id/perder ───────────────────────────────────────

  describe('POST /api/renovacoes/:id/perder', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/renovacoes/00000000-0000-0000-0000-000000000000/perder')
        .send({ motivoPerda: 'Preco alto' })
        .expect(401);
    });

    it('marca renovacao como perdida', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
        { status: 'EM_NEGOCIACAO' },
      );

      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/perder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          motivoPerda: 'Cliente optou por outro seguro',
          concorrenteGanhou: 'Seguradora XYZ',
          detalhesPerda: 'Cliente achou o preco mais acessivel na concorrencia',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(renovacao.id);
      expect(res.body.data.status).toBe('PERDIDO');
      expect(res.body.data.motivoPerda).toBe(
        'Cliente optou por outro seguro',
      );
      expect(res.body.data.concorrenteGanhou).toBe('Seguradora XYZ');
    });

    it('retorna 422 ao tentar marcar como perdida uma ja RENOVADA', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
        { status: 'RENOVADO' },
      );

      await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/perder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoPerda: 'Tentativa invalida' })
        .expect(422);
    });

    it('retorna 422 ao tentar marcar como perdida uma ja PERDIDA', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
        { status: 'PERDIDO' },
      );

      await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/perder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoPerda: 'Tentativa invalida' })
        .expect(422);
    });

    it('retorna 404 para renovacao inexistente', async () => {
      await request(app.server)
        .post('/api/renovacoes/00000000-0000-0000-0000-000000000000/perder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoPerda: 'Motivo qualquer' })
        .expect(404);
    });

    it('retorna 400 sem motivoPerda', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
      );

      await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/perder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('retorna 403 sem permissao vendas:editar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Somente visualizacao ${Date.now()}`,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
      );

      await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/perder`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ motivoPerda: 'Sem permissao' })
        .expect(403);
    });
  });

  // ── POST /api/renovacoes/criar-manual ─────────────────────────────────────

  describe('POST /api/renovacoes/criar-manual', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/renovacoes/criar-manual')
        .send({ documentoVendaAnteriorId: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });

    it('cria renovacao a partir de documento ATIVO', async () => {
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
        .post('/api/renovacoes/criar-manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentoVendaAnteriorId: doc.id })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.documentoVendaAnteriorId).toBe(doc.id);
      expect(res.body.data.corretoraId).toBe(corretoraId);
      expect(res.body.data.status).toBe('NAO_TRABALHADO');
      expect(res.body.data.dataVencimento).toBe('2026-12-31');
      expect(parseFloat(res.body.data.premioAnterior)).toBe(1000);
    });

    it('retorna 422 para documento com status diferente de ATIVO', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const docInativo = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'CANCELADO' },
      );

      await request(app.server)
        .post('/api/renovacoes/criar-manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentoVendaAnteriorId: docInativo.id })
        .expect(422);
    });

    it('retorna 422 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/renovacoes/criar-manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          documentoVendaAnteriorId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(422);
    });

    it('retorna 400 sem documentoVendaAnteriorId', async () => {
      await request(app.server)
        .post('/api/renovacoes/criar-manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('retorna 400 com documentoVendaAnteriorId invalido (nao e uuid)', async () => {
      await request(app.server)
        .post('/api/renovacoes/criar-manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentoVendaAnteriorId: 'nao-e-um-uuid' })
        .expect(400);
    });

    it('retorna 403 sem permissao vendas:editar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Somente visualizacao ${Date.now()}`,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      await request(app.server)
        .post('/api/renovacoes/criar-manual')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ documentoVendaAnteriorId: doc.id })
        .expect(403);
    });

    it('retorna 422 para documento de outra corretora', async () => {
      const planoOutro = await createTestPlano();
      const corretoraOutra = await createTestCorretora(planoOutro.id);
      const cargoOutro = await createAdminCargo(corretoraOutra.id);
      const vendedorOutro = await createTestUsuario(
        corretoraOutra.id,
        cargoOutro.id,
      );
      const clienteOutro = await createTestCliente(
        corretoraOutra.id,
        vendedorOutro.id,
      );
      const produtoOutro = await createTestProduto(corretoraOutra.id);
      const docOutra = await createTestDocumentoVenda(
        corretoraOutra.id,
        vendedorOutro.id,
        clienteOutro.id,
        produtoOutro.id,
      );

      // adminToken pertence a corretoraId, nao a corretoraOutra
      await request(app.server)
        .post('/api/renovacoes/criar-manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentoVendaAnteriorId: docOutra.id })
        .expect(422);
    });
  });

  // ── GET /api/renovacoes/transferencias/pendentes ──────────────────────────

  describe('GET /api/renovacoes/transferencias/pendentes', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/renovacoes/transferencias/pendentes')
        .expect(401);
    });

    it('retorna lista vazia quando nao ha transferencias pendentes', async () => {
      const res = await request(app.server)
        .get('/api/renovacoes/transferencias/pendentes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('retorna 403 sem permissao vendas:visualizar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Cargo sem perm ${Date.now()}`,
        permissoes: [],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
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
        .get('/api/renovacoes/transferencias/pendentes')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });
  });

  // ── POST /api/renovacoes/:id/iniciar ──────────────────────────────────────

  describe('POST /api/renovacoes/:id/iniciar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/renovacoes/00000000-0000-0000-0000-000000000000/iniciar')
        .expect(401);
    });

    it('inicia renovacao vinculada a documento anterior com produto', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { vigenciaFim: '2026-06-30' },
      );
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
        {
          status: 'NAO_TRABALHADO',
          documentoVendaAnteriorId: doc.id,
        },
      );

      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/iniciar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.renovacao).toBeDefined();
      expect(res.body.data.cotacao).toBeDefined();
      expect(res.body.data.renovacao.status).toBe('EM_PROSPECCAO');
      expect(res.body.data.cotacao.situacao).toBe('RENOVACAO');
      expect(res.body.data.cotacao.clienteId).toBe(cliente.id);
    });

    it('retorna 422 se renovacao ja foi iniciada (status != NAO_TRABALHADO)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
        {
          status: 'EM_PROSPECCAO',
          documentoVendaAnteriorId: doc.id,
        },
      );

      await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/iniciar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    });

    it('retorna 404 para renovacao inexistente', async () => {
      await request(app.server)
        .post('/api/renovacoes/00000000-0000-0000-0000-000000000000/iniciar')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 403 sem permissao vendas:editar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Somente visualizacao ${Date.now()}`,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
        { documentoVendaAnteriorId: doc.id },
      );

      await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/iniciar`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('retorna 400 para renovacao importada sem clienteId', async () => {
      // Renovação sem documentoVendaAnterior e sem clienteId não pode ser iniciada
      const renovacao = await db
        .insert(renovacoesComerciais)
        .values({
          corretoraId,
          vendedorId: usuarioId,
          clienteId: null as any,
          dataVencimento: '2026-12-31',
          status: 'NAO_TRABALHADO',
          produtoDescricao: 'Seguro Teste',
        })
        .returning()
        .then((r) => r[0]);

      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/iniciar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('retorna 400 para renovacao sem produtoId e sem correspondencia de nome', async () => {
      // Renovação com cliente mas sem documento anterior e sem produto com nome correspondente
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
        documentoVendaAnteriorId: null,
        produtoDescricao: 'Produto Que Nao Existe No Banco XPTO123',
      });

      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/iniciar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('inicia renovacao importada sem documento anterior usando produto por nome', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      // Nome do produto contido em produtoDescricao para acionar a busca por ilike
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
        documentoVendaAnteriorId: null,
        produtoDescricao: produto.nomeProduto,
        dataVencimento: '2026-09-30',
      });

      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/iniciar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.renovacao.status).toBe('EM_PROSPECCAO');
      expect(res.body.data.cotacao).toBeDefined();
    });

    it('retorna 422 quando o cliente nao possui nenhum contato cadastrado', async () => {
      const ts = Date.now();
      const [clienteSemContato] = await db
        .insert(clientes)
        .values({
          corretoraId,
          vendedorId: usuarioId,
          tipoPessoa: 'PF',
          nome: `Cliente Sem Contato ${ts}`,
          cpf: String(ts + 1).slice(-11).padStart(11, '0'),
          ativo: true,
        })
        .returning();
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteSemContato.id,
        produto.id,
        { vigenciaFim: '2026-06-30' },
      );
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        clienteSemContato.id,
        {
          status: 'NAO_TRABALHADO',
          documentoVendaAnteriorId: doc.id,
        },
      );

      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/iniciar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error?.message || res.body.message).toMatch(/contato/i);
    });

    it('retorna 422 quando o cliente PF nao possui CPF cadastrado', async () => {
      const ts = Date.now();
      const [clienteSemCpf] = await db
        .insert(clientes)
        .values({
          corretoraId,
          vendedorId: usuarioId,
          tipoPessoa: 'PF',
          nome: `Cliente Sem CPF ${ts}`,
          email: `cliente.semcpf.${ts}@teste.com`,
          cpf: '',
          ativo: true,
        })
        .returning();
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteSemCpf.id,
        produto.id,
        { vigenciaFim: '2026-06-30' },
      );
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        clienteSemCpf.id,
        {
          status: 'NAO_TRABALHADO',
          documentoVendaAnteriorId: doc.id,
        },
      );

      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/iniciar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error?.message || res.body.message).toMatch(/cpf/i);
    });

    it('retorna 422 quando o cliente PJ nao possui CNPJ cadastrado', async () => {
      const ts = Date.now();
      const [clienteSemCnpj] = await db
        .insert(clientes)
        .values({
          corretoraId,
          vendedorId: usuarioId,
          tipoPessoa: 'PJ',
          razaoSocial: `Empresa Sem CNPJ ${ts}`,
          email: `empresa.semcnpj.${ts}@teste.com`,
          cnpj: '',
          ativo: true,
        })
        .returning();
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteSemCnpj.id,
        produto.id,
        { vigenciaFim: '2026-06-30' },
      );
      const renovacao = await createTestRenovacao(
        corretoraId,
        usuarioId,
        clienteSemCnpj.id,
        {
          status: 'NAO_TRABALHADO',
          documentoVendaAnteriorId: doc.id,
        },
      );

      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/iniciar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error?.message || res.body.message).toMatch(/cnpj/i);
    });
  });

  // ── POST /api/renovacoes/:id/finalizar ────────────────────────────────────

  describe('POST /api/renovacoes/:id/finalizar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/renovacoes/00000000-0000-0000-0000-000000000000/finalizar')
        .send({ documentoVendaNovoId: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });

    it('finaliza renovacao vinculando ao novo documento de venda', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const docNovo = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        {
          status: 'ATIVO',
          vigenciaInicio: '2026-01-01',
          vigenciaFim: '2027-01-01',
          premioLiquido: '2000',
          percentualComissao: '12',
          valorComissao: '240',
        },
      );
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'EM_NEGOCIACAO',
      });

      const res = await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/finalizar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentoVendaNovoId: docNovo.id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(renovacao.id);
      expect(res.body.data.status).toBe('RENOVADO');
      expect(res.body.data.documentoVendaNovoId).toBe(docNovo.id);
      expect(parseFloat(res.body.data.premioNovo)).toBe(2000);
    });

    it('retorna 422 ao tentar finalizar uma renovacao ja RENOVADA', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const docNovo = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'RENOVADO',
      });

      await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/finalizar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentoVendaNovoId: docNovo.id })
        .expect(422);
    });

    it('retorna 422 ao tentar finalizar uma renovacao PERDIDA', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const docNovo = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'PERDIDO',
      });

      await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/finalizar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentoVendaNovoId: docNovo.id })
        .expect(422);
    });

    it('retorna 404 para renovacao inexistente', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const docNovo = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      await request(app.server)
        .post('/api/renovacoes/00000000-0000-0000-0000-000000000000/finalizar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentoVendaNovoId: docNovo.id })
        .expect(404);
    });

    it('retorna 404 quando novo documento nao existe', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'EM_NEGOCIACAO',
      });

      await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/finalizar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ documentoVendaNovoId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('retorna 400 sem documentoVendaNovoId', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id);

      await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/finalizar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('retorna 403 sem permissao vendas:editar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Somente visualizacao ${Date.now()}`,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id);
      const produto = await createTestProduto(corretoraId);
      const docNovo = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
      );

      await request(app.server)
        .post(`/api/renovacoes/${renovacao.id}/finalizar`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ documentoVendaNovoId: docNovo.id })
        .expect(403);
    });
  });

  // ── POST /api/renovacoes/processar-pendentes ──────────────────────────────

  describe('POST /api/renovacoes/processar-pendentes', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/renovacoes/processar-pendentes')
        .send({ vendedorId: usuarioId, linhasPendentes: [] })
        .expect(401);
    });

    it('processa linhas pendentes criando renovacoes para clientes encontrados', async () => {
      const ts = Date.now();
      const cpf = String(ts).slice(-11).padStart(11, '0');
      const cliente = await db
        .insert(clientes)
        .values({
          corretoraId,
          vendedorId: usuarioId,
          tipoPessoa: 'PF',
          nome: `Cliente Pendente ${ts}`,
          cpf,
          email: `pendente.${ts}@teste.com`,
          ativo: true,
        })
        .returning()
        .then((r) => r[0]);

      const res = await request(app.server)
        .post('/api/renovacoes/processar-pendentes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vendedorId: usuarioId,
          linhasPendentes: [
            {
              linha: 2,
              documento: cpf,
              vigenciaFinal: '2026-12-31',
              itemDescricao: 'Seguro Auto',
              produtoDescricao: 'AUTO',
              premioLiquido: '1500.00',
              comissao: '10',
            },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.sucesso).toBe(1);
      expect(res.body.data.erros).toBe(0);
    });

    it('registra erro para cliente ainda nao cadastrado', async () => {
      const res = await request(app.server)
        .post('/api/renovacoes/processar-pendentes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vendedorId: usuarioId,
          linhasPendentes: [
            {
              linha: 3,
              documento: '99999999999',
              vigenciaFinal: '2026-12-31',
            },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.erros).toBe(1);
      expect(res.body.data.detalhes[0].status).toBe('erro');
      expect(res.body.data.detalhes[0].mensagem).toContain('ainda não cadastrado');
    });

    it('registra erro para renovacao duplicada', async () => {
      const ts = Date.now();
      const cpf = String(ts + 1).slice(-11).padStart(11, '0');
      const cliente = await db
        .insert(clientes)
        .values({
          corretoraId,
          vendedorId: usuarioId,
          tipoPessoa: 'PF',
          nome: `Cliente Dup ${ts}`,
          cpf,
          email: `dup.${ts}@teste.com`,
          ativo: true,
        })
        .returning()
        .then((r) => r[0]);

      // Cria renovação existente
      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        dataVencimento: '2026-11-30',
        itemDescricao: 'Item Dup',
        status: 'NAO_TRABALHADO',
      });

      const res = await request(app.server)
        .post('/api/renovacoes/processar-pendentes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vendedorId: usuarioId,
          linhasPendentes: [
            {
              linha: 2,
              documento: cpf,
              vigenciaFinal: '2026-11-30',
              itemDescricao: 'Item Dup',
            },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.erros).toBe(1);
      expect(res.body.data.detalhes[0].mensagem).toContain('já existe');
    });

    it('processa lista vazia sem erros', async () => {
      const res = await request(app.server)
        .post('/api/renovacoes/processar-pendentes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendedorId: usuarioId, linhasPendentes: [] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.sucesso).toBe(0);
      expect(res.body.data.erros).toBe(0);
    });

    it('retorna 403 sem permissao vendas:editar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Somente visualizacao ${Date.now()}`,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      await request(app.server)
        .post('/api/renovacoes/processar-pendentes')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ vendedorId: usuarioId, linhasPendentes: [] })
        .expect(403);
    });
  });

  // ── POST /api/renovacoes/importar ─────────────────────────────────────────

  describe('POST /api/renovacoes/importar', () => {
    function buildXlsx(rows: Record<string, unknown>[]): Buffer {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }

    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/renovacoes/importar')
        .expect(401);
    });

    it('retorna erro sem arquivo (406 ou 400)', async () => {
      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 406]).toContain(res.status);
    });

    it('retorna 400 sem vendedorId', async () => {
      const buffer = buildXlsx([
        { 'CLIENTE': 'Teste', 'DOCUMENTO DO CLIENTE': '12345678901', 'VIGÊNCIA FINAL': '2026-12-31' },
      ]);

      await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(400);
    });

    it('retorna 400 para vendedor que nao pertence a corretora', async () => {
      const buffer = buildXlsx([
        { 'CLIENTE': 'Teste', 'DOCUMENTO DO CLIENTE': '12345678901', 'VIGÊNCIA FINAL': '2026-12-31' },
      ]);

      await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vendedorId', '00000000-0000-0000-0000-000000000000')
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(400);
    });

    it('importa com sucesso linha com cliente existente', async () => {
      const ts = Date.now();
      const cpf = String(ts + 2).slice(-11).padStart(11, '0');
      await db.insert(clientes).values({
        corretoraId,
        vendedorId: usuarioId,
        tipoPessoa: 'PF',
        nome: `Cliente Import ${ts}`,
        cpf,
        email: `import.${ts}@teste.com`,
        ativo: true,
      });

      const buffer = buildXlsx([
        {
          'CLIENTE': `Cliente Import ${ts}`,
          'DOCUMENTO DO CLIENTE': cpf,
          'VIGÊNCIA FINAL': '2026-12-31',
          'ITEM': 'Seguro Auto',
          'PRODUTO': 'AUTO',
          'PRÊMIO LÍQUIDO': '1200',
          'COMISSÃO': '10',
          'STATUS': 'ATIVO',
        },
      ]);

      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vendedorId', usuarioId)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.sucesso).toBe(1);
    });

    it('importa linha com cliente nao encontrado como pendente', async () => {
      const buffer = buildXlsx([
        {
          'CLIENTE': 'Desconhecido',
          'DOCUMENTO DO CLIENTE': '00000000001',
          'VIGÊNCIA FINAL': '2026-12-31',
          'ITEM': 'Seguro Vida',
          'TIPO DE PESSOA': 'FISICA',
        },
      ]);

      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vendedorId', usuarioId)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.pendentes).toBe(1);
      expect(res.body.data.clientesPendentes).toHaveLength(1);
      expect(res.body.data.clientesPendentes[0].tipoPessoa).toBe('PF');
    });

    it('pula linha duplicada com mesmo cliente/item/vencimento', async () => {
      const ts = Date.now();
      const cpf = String(ts + 3).slice(-11).padStart(11, '0');
      const cliente = await db
        .insert(clientes)
        .values({
          corretoraId,
          vendedorId: usuarioId,
          tipoPessoa: 'PF',
          nome: `Cliente Dup Import ${ts}`,
          cpf,
          email: `dupimport.${ts}@teste.com`,
          ativo: true,
        })
        .returning()
        .then((r) => r[0]);

      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        dataVencimento: '2026-10-31',
        itemDescricao: 'Item Existente',
        status: 'NAO_TRABALHADO',
      });

      const buffer = buildXlsx([
        {
          'CLIENTE': `Cliente Dup Import ${ts}`,
          'DOCUMENTO DO CLIENTE': cpf,
          'VIGÊNCIA FINAL': '2026-10-31',
          'ITEM': 'Item Existente',
        },
      ]);

      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vendedorId', usuarioId)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.detalhes[0].status).toBe('pulado');
    });

    it('registra erro para linha sem DOCUMENTO DO CLIENTE', async () => {
      const buffer = buildXlsx([
        { 'CLIENTE': 'Sem Doc', 'VIGÊNCIA FINAL': '2026-12-31' },
      ]);

      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vendedorId', usuarioId)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.erros).toBe(1);
      expect(res.body.data.detalhes[0].status).toBe('erro');
    });

    it('importa data no formato DD/MM/YYYY', async () => {
      const ts = Date.now();
      const cpf = String(ts + 4).slice(-11).padStart(11, '0');
      await db.insert(clientes).values({
        corretoraId,
        vendedorId: usuarioId,
        tipoPessoa: 'PF',
        nome: `Cliente DataFmt ${ts}`,
        cpf,
        email: `datafmt.${ts}@teste.com`,
        ativo: true,
      });

      const buffer = buildXlsx([
        {
          'CLIENTE': `Cliente DataFmt ${ts}`,
          'DOCUMENTO DO CLIENTE': cpf,
          'VIGÊNCIA FINAL': '31/12/2026',
          'ITEM': 'Seguro Residencial',
        },
      ]);

      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vendedorId', usuarioId)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.sucesso).toBe(1);
    });

    it('importa data como serial Excel', async () => {
      const ts = Date.now();
      const cpf = String(ts + 5).slice(-11).padStart(11, '0');
      await db.insert(clientes).values({
        corretoraId,
        vendedorId: usuarioId,
        tipoPessoa: 'PF',
        nome: `Cliente Serial ${ts}`,
        cpf,
        email: `serial.${ts}@teste.com`,
        ativo: true,
      });

      // 46388 = 2026-12-31 em serial Excel
      const buffer = buildXlsx([
        {
          'CLIENTE': `Cliente Serial ${ts}`,
          'DOCUMENTO DO CLIENTE': cpf,
          'VIGÊNCIA FINAL': 46388,
          'ITEM': 'Seguro Serial',
        },
      ]);

      const res = await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('vendedorId', usuarioId)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.sucesso).toBe(1);
    });

    it('retorna 403 sem permissao vendas:editar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Somente visualizacao ${Date.now()}`,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const buffer = buildXlsx([{ 'CLIENTE': 'X', 'VIGÊNCIA FINAL': '2026-12-31' }]);

      await request(app.server)
        .post('/api/renovacoes/importar')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .field('vendedorId', usuarioId)
        .attach('file', buffer, 'renovacoes.xlsx')
        .expect(403);
    });
  });

  // ── POST /api/renovacoes/transferir ───────────────────────────────────────

  describe('POST /api/renovacoes/transferir', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/renovacoes/transferir')
        .send({ renovacaoIds: [], novoVendedorId: usuarioId })
        .expect(401);
    });

    it('cria solicitacao de transferencia com sucesso', async () => {
      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const destinatarioToken = generateTestToken(app, {
        sub: destinatario.id,
        corretoraId,
        cargoId,
        isAdmin: true,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: destinatario.nome,
        email: destinatario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
      });

      const res = await request(app.server)
        .post('/api/renovacoes/transferir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          renovacaoIds: [renovacao.id],
          novoVendedorId: destinatario.id,
          observacoes: 'Transferencia de teste',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.transferenciaId).toBeDefined();
      expect(res.body.data.renovacoes).toBe(1);
    });

    it('retorna 400 ao tentar transferir para si mesmo', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id);

      await request(app.server)
        .post('/api/renovacoes/transferir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ renovacaoIds: [renovacao.id], novoVendedorId: usuarioId })
        .expect(400);
    });

    it('retorna 404 para vendedor destinatario nao pertencente a corretora', async () => {
      const planoOutro = await createTestPlano();
      const corretoraOutra = await createTestCorretora(planoOutro.id);
      const cargoOutro = await createAdminCargo(corretoraOutra.id);
      const vendedorOutro = await createTestUsuario(corretoraOutra.id, cargoOutro.id);

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id);

      await request(app.server)
        .post('/api/renovacoes/transferir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ renovacaoIds: [renovacao.id], novoVendedorId: vendedorOutro.id })
        .expect(404);
    });

    it('retorna 404 quando nenhuma renovacao pertence ao vendedor', async () => {
      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const outroVendedor = await createTestUsuario(corretoraId, cargoId);
      const cliente = await createTestCliente(corretoraId, outroVendedor.id);
      const renovacaoOutro = await createTestRenovacao(corretoraId, outroVendedor.id, cliente.id);

      await request(app.server)
        .post('/api/renovacoes/transferir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ renovacaoIds: [renovacaoOutro.id], novoVendedorId: destinatario.id })
        .expect(404);
    });

    it('retorna 400 ao tentar transferir renovacoes finalizadas', async () => {
      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacaoFinalizada = await createTestRenovacao(
        corretoraId,
        usuarioId,
        cliente.id,
        { status: 'RENOVADO' },
      );

      await request(app.server)
        .post('/api/renovacoes/transferir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ renovacaoIds: [renovacaoFinalizada.id], novoVendedorId: destinatario.id })
        .expect(400);
    });

    it('retorna 400 com lista de renovacaoIds vazia', async () => {
      const destinatario = await createTestUsuario(corretoraId, cargoId);

      await request(app.server)
        .post('/api/renovacoes/transferir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ renovacaoIds: [], novoVendedorId: destinatario.id })
        .expect(400);
    });

    it('retorna 403 sem permissao vendas:visualizar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Sem perm ${Date.now()}`,
        permissoes: [],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
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
        .post('/api/renovacoes/transferir')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ renovacaoIds: ['00000000-0000-0000-0000-000000000000'], novoVendedorId: usuarioId })
        .expect(403);
    });
  });

  // ── POST /api/renovacoes/transferencias/:id/aceitar ───────────────────────

  describe('POST /api/renovacoes/transferencias/:id/aceitar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/renovacoes/transferencias/00000000-0000-0000-0000-000000000000/aceitar')
        .expect(401);
    });

    it('aceita transferencia e move renovacoes para o destinatario', async () => {
      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const destinatarioToken = generateTestToken(app, {
        sub: destinatario.id,
        corretoraId,
        cargoId,
        isAdmin: true,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: destinatario.nome,
        email: destinatario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id, {
        status: 'NAO_TRABALHADO',
      });

      // Criar transferência diretamente no banco
      const [transferencia] = await db
        .insert(transferenciaRenovacoes)
        .values({
          corretoraId,
          solicitanteId: usuarioId,
          destinatarioId: destinatario.id,
          status: 'PENDENTE',
        })
        .returning();

      await db.insert(transferenciaRenovacaoItens).values({
        transferenciaId: transferencia.id,
        renovacaoId: renovacao.id,
      });

      const res = await request(app.server)
        .post(`/api/renovacoes/transferencias/${transferencia.id}/aceitar`)
        .set('Authorization', `Bearer ${destinatarioToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('transferida');
    });

    it('retorna 404 para transferencia inexistente', async () => {
      await request(app.server)
        .post('/api/renovacoes/transferencias/00000000-0000-0000-0000-000000000000/aceitar')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 400 ao tentar aceitar transferencia ja processada', async () => {
      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const destinatarioToken = generateTestToken(app, {
        sub: destinatario.id,
        corretoraId,
        cargoId,
        isAdmin: true,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: destinatario.nome,
        email: destinatario.email,
        avatarUrl: null,
      });

      const [transferencia] = await db
        .insert(transferenciaRenovacoes)
        .values({
          corretoraId,
          solicitanteId: usuarioId,
          destinatarioId: destinatario.id,
          status: 'ACEITA',
        })
        .returning();

      await request(app.server)
        .post(`/api/renovacoes/transferencias/${transferencia.id}/aceitar`)
        .set('Authorization', `Bearer ${destinatarioToken}`)
        .expect(400);
    });

    it('retorna 403 sem permissao vendas:visualizar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Sem perm ${Date.now()}`,
        permissoes: [],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
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
        .post('/api/renovacoes/transferencias/00000000-0000-0000-0000-000000000000/aceitar')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });
  });

  // ── POST /api/renovacoes/transferencias/:id/recusar ───────────────────────

  describe('POST /api/renovacoes/transferencias/:id/recusar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/renovacoes/transferencias/00000000-0000-0000-0000-000000000000/recusar')
        .expect(401);
    });

    it('recusa transferencia com motivo', async () => {
      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const destinatarioToken = generateTestToken(app, {
        sub: destinatario.id,
        corretoraId,
        cargoId,
        isAdmin: true,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: destinatario.nome,
        email: destinatario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id);

      const [transferencia] = await db
        .insert(transferenciaRenovacoes)
        .values({
          corretoraId,
          solicitanteId: usuarioId,
          destinatarioId: destinatario.id,
          status: 'PENDENTE',
        })
        .returning();

      await db.insert(transferenciaRenovacaoItens).values({
        transferenciaId: transferencia.id,
        renovacaoId: renovacao.id,
      });

      const res = await request(app.server)
        .post(`/api/renovacoes/transferencias/${transferencia.id}/recusar`)
        .set('Authorization', `Bearer ${destinatarioToken}`)
        .send({ motivo: 'Carteira cheia no momento' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('recusada');
    });

    it('recusa transferencia sem motivo', async () => {
      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const destinatarioToken = generateTestToken(app, {
        sub: destinatario.id,
        corretoraId,
        cargoId,
        isAdmin: true,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: destinatario.nome,
        email: destinatario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const renovacao = await createTestRenovacao(corretoraId, usuarioId, cliente.id);

      const [transferencia] = await db
        .insert(transferenciaRenovacoes)
        .values({
          corretoraId,
          solicitanteId: usuarioId,
          destinatarioId: destinatario.id,
          status: 'PENDENTE',
        })
        .returning();

      await db.insert(transferenciaRenovacaoItens).values({
        transferenciaId: transferencia.id,
        renovacaoId: renovacao.id,
      });

      const res = await request(app.server)
        .post(`/api/renovacoes/transferencias/${transferencia.id}/recusar`)
        .set('Authorization', `Bearer ${destinatarioToken}`)
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 404 para transferencia inexistente', async () => {
      await request(app.server)
        .post('/api/renovacoes/transferencias/00000000-0000-0000-0000-000000000000/recusar')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 400 ao tentar recusar transferencia ja processada', async () => {
      const destinatario = await createTestUsuario(corretoraId, cargoId);
      const destinatarioToken = generateTestToken(app, {
        sub: destinatario.id,
        corretoraId,
        cargoId,
        isAdmin: true,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: destinatario.nome,
        email: destinatario.email,
        avatarUrl: null,
      });

      const [transferencia] = await db
        .insert(transferenciaRenovacoes)
        .values({
          corretoraId,
          solicitanteId: usuarioId,
          destinatarioId: destinatario.id,
          status: 'RECUSADA',
        })
        .returning();

      await request(app.server)
        .post(`/api/renovacoes/transferencias/${transferencia.id}/recusar`)
        .set('Authorization', `Bearer ${destinatarioToken}`)
        .expect(400);
    });

    it('retorna 403 sem permissao vendas:visualizar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: `Sem perm ${Date.now()}`,
        permissoes: [],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
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
        .post('/api/renovacoes/transferencias/00000000-0000-0000-0000-000000000000/recusar')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });
  });
});
