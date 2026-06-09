import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
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

async function createTestCotacao(
  corretoraId: string,
  clienteId: string,
  vendedorId: string,
  produtoId: string,
  overrides: Record<string, unknown> = {},
) {
  const ts = Date.now();
  const [cotacao] = await db
    .insert(cotacoes)
    .values({
      corretoraId,
      clienteId,
      vendedorId,
      produtoId,
      numeroCotacao: `COT-${ts}`,
      status: 'EM_ELABORACAO',
      situacao: 'NOVO',
      vigenciaInicio: '2025-01-01',
      vigenciaFim: '2025-12-31',
      ...overrides,
    })
    .returning();
  return cotacao;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('/api/cotacoes', () => {
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

  describe('POST /api/cotacoes', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/cotacoes')
        .send({})
        .expect(401);
    });

    it('retorna 403 sem permissão vendas:criar_cotacao', async () => {
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

      await request(app.server)
        .post('/api/cotacoes')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
        })
        .expect(403);
    });

    it('cria cotação com dados mínimos', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const res = await request(app.server)
        .post('/api/cotacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.numeroCotacao).toBeDefined();
      expect(res.body.data.status).toBe('EM_ELABORACAO');
      expect(res.body.data.clienteId).toBe(cliente.id);
      expect(res.body.data.produtoId).toBe(produto.id);
      expect(res.body.data.vendedorId).toBe(usuarioId);
    });

    it('cria cotação com campos opcionais', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const res = await request(app.server)
        .post('/api/cotacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: 1500,
          percentualComissao: 10,
          situacao: 'NOVO',
          itemDescricao: 'Veículo: Toyota Corolla 2023',
        })
        .expect(201);

      expect(res.body.data.premioLiquido).toBeDefined();
      expect(res.body.data.itemDescricao).toBe('Veículo: Toyota Corolla 2023');
    });

    it('retorna 404 para cliente inexistente', async () => {
      const produto = await createTestProduto(corretoraId);

      await request(app.server)
        .post('/api/cotacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: '00000000-0000-0000-0000-000000000000',
          produtoId: produto.id,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
        })
        .expect(404);
    });

    it('retorna 404 para produto inexistente', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);

      await request(app.server)
        .post('/api/cotacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: '00000000-0000-0000-0000-000000000000',
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
        })
        .expect(404);
    });

    it('retorna 404 para cliente de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const clienteOutraCorretora = await createTestCliente(corretora2.id, usuario2.id);
      const produto = await createTestProduto(corretoraId);

      await request(app.server)
        .post('/api/cotacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: clienteOutraCorretora.id,
          produtoId: produto.id,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
        })
        .expect(404);
    });

    it('retorna 400 com dados inválidos (sem clienteId)', async () => {
      const produto = await createTestProduto(corretoraId);

      await request(app.server)
        .post('/api/cotacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          produtoId: produto.id,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
        })
        .expect(400);
    });
  });

  // ── GET / ───────────────────────────────────────────────────────────────────

  describe('GET /api/cotacoes', () => {
    beforeEach(async () => {
      await db.delete(cotacoes);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/cotacoes').expect(401);
    });

    it('retorna 403 sem permissão vendas:visualizar_cotacao', async () => {
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
        .get('/api/cotacoes')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('retorna lista vazia quando não há cotações', async () => {
      const res = await request(app.server)
        .get('/api/cotacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('lista cotações do vendedor logado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      await createTestCotacao(corretoraId, cliente.id, usuarioId, produto.id);
      await createTestCotacao(corretoraId, cliente.id, usuarioId, produto.id);

      const res = await request(app.server)
        .get('/api/cotacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('não lista cotações de outro vendedor (usuário sem visualizar_todos_documentos)', async () => {
      // Cria dois vendedores (sem permissão de ver tudo)
      const cargoVendedor = await createTestCargo(corretoraId, {
        permissoes: ['vendas:criar_cotacao', 'vendas:visualizar_cotacao'],
      });
      const vendedorA = await createTestUsuario(corretoraId, cargoVendedor.id);
      const vendedorB = await createTestUsuario(corretoraId, cargoVendedor.id);

      const tokenVendedorA = generateTestToken(app, {
        sub: vendedorA.id,
        corretoraId,
        cargoId: cargoVendedor.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:criar_cotacao', 'vendas:visualizar_cotacao'],
        nome: vendedorA.nome,
        email: vendedorA.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, vendedorA.id);
      const produto = await createTestProduto(corretoraId);

      // Cotação do vendedor B — vendedorA não deveria ver
      const cotacaoOutroVendedor = await createTestCotacao(corretoraId, cliente.id, vendedorB.id, produto.id);

      const res = await request(app.server)
        .get('/api/cotacoes')
        .set('Authorization', `Bearer ${tokenVendedorA}`)
        .expect(200);

      expect(res.body.data.find((c: any) => c.id === cotacaoOutroVendedor.id)).toBeUndefined();
    });

    it('filtra por status', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      await createTestCotacao(corretoraId, cliente.id, usuarioId, produto.id, {
        status: 'EM_ELABORACAO',
      });
      await createTestCotacao(corretoraId, cliente.id, usuarioId, produto.id, {
        status: 'PERDIDA',
        numeroCotacao: `COT-PERDIDA-${Date.now()}`,
      });

      const res = await request(app.server)
        .get('/api/cotacoes?status=EM_ELABORACAO')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('EM_ELABORACAO');
    });

    it('filtra por clienteId', async () => {
      const cliente1 = await createTestCliente(corretoraId, usuarioId);
      const cliente2 = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      await createTestCotacao(corretoraId, cliente1.id, usuarioId, produto.id);
      await createTestCotacao(corretoraId, cliente2.id, usuarioId, produto.id, {
        numeroCotacao: `COT-C2-${Date.now()}`,
      });

      const res = await request(app.server)
        .get(`/api/cotacoes?clienteId=${cliente1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].clienteId).toBe(cliente1.id);
    });

    it('não retorna cotações deletadas', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacaoDeletada = await createTestCotacao(corretoraId, cliente.id, usuarioId, produto.id, {
        deletedAt: new Date(),
      });

      const res = await request(app.server)
        .get('/api/cotacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.find((c: any) => c.id === cotacaoDeletada.id)).toBeUndefined();
    });

    it('não retorna cotações de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const cliente2 = await createTestCliente(corretora2.id, usuario2.id);
      const produto2 = await createTestProduto(corretora2.id);
      const cotacaoOutraCorretora = await createTestCotacao(corretora2.id, cliente2.id, usuario2.id, produto2.id);

      const res = await request(app.server)
        .get('/api/cotacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.find((c: any) => c.id === cotacaoOutraCorretora.id)).toBeUndefined();
    });
  });

  // ── GET /:id ────────────────────────────────────────────────────────────────

  describe('GET /api/cotacoes/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/cotacoes/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('retorna cotação por ID', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      const res = await request(app.server)
        .get(`/api/cotacoes/${cotacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(cotacao.id);
      expect(res.body.data.status).toBe('EM_ELABORACAO');
      expect(res.body.data.cliente).toBeDefined();
      expect(res.body.data.produto).toBeDefined();
    });

    it('retorna 404 para cotação inexistente', async () => {
      await request(app.server)
        .get('/api/cotacoes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 para cotação de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const cliente2 = await createTestCliente(corretora2.id, usuario2.id);
      const produto2 = await createTestProduto(corretora2.id);
      const cotacaoOutra = await createTestCotacao(
        corretora2.id,
        cliente2.id,
        usuario2.id,
        produto2.id,
      );

      await request(app.server)
        .get(`/api/cotacoes/${cotacaoOutra.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 403 quando outro vendedor tenta acessar sem permissão total', async () => {
      const cargo2 = await createTestCargo(corretoraId, {
        permissoes: ['vendas:visualizar_cotacao'],
      });
      const outroVendedor = await createTestUsuario(corretoraId, cargo2.id);
      const tokenOutroVendedor = generateTestToken(app, {
        sub: outroVendedor.id,
        corretoraId,
        cargoId: cargo2.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:visualizar_cotacao'],
        nome: outroVendedor.nome,
        email: outroVendedor.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      await request(app.server)
        .get(`/api/cotacoes/${cotacao.id}`)
        .set('Authorization', `Bearer ${tokenOutroVendedor}`)
        .expect(403);
    });
  });

  // ── PATCH /:id ──────────────────────────────────────────────────────────────

  describe('PATCH /api/cotacoes/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/cotacoes/00000000-0000-0000-0000-000000000000')
        .send({})
        .expect(401);
    });

    it('retorna 403 sem permissão vendas:editar_cotacao', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['vendas:visualizar_cotacao'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:visualizar_cotacao'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      await request(app.server)
        .patch(`/api/cotacoes/${cotacao.id}`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ premioLiquido: 999 })
        .expect(403);
    });

    it('atualiza cotação em elaboração', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      const res = await request(app.server)
        .patch(`/api/cotacoes/${cotacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ premioLiquido: 2000 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.premioLiquido).toBe('2000.00');
    });

    it('retorna 404 para cotação inexistente', async () => {
      await request(app.server)
        .patch('/api/cotacoes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ premioLiquido: 1000 })
        .expect(404);
    });

    it('retorna 403 ao tentar editar cotação de outro vendedor', async () => {
      const cargo2 = await createTestCargo(corretoraId, {
        permissoes: ['vendas:editar_cotacao', 'vendas:visualizar_cotacao'],
      });
      const outroVendedor = await createTestUsuario(corretoraId, cargo2.id);
      const tokenOutroVendedor = generateTestToken(app, {
        sub: outroVendedor.id,
        corretoraId,
        cargoId: cargo2.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:editar_cotacao', 'vendas:visualizar_cotacao'],
        nome: outroVendedor.nome,
        email: outroVendedor.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      await request(app.server)
        .patch(`/api/cotacoes/${cotacao.id}`)
        .set('Authorization', `Bearer ${tokenOutroVendedor}`)
        .send({ premioLiquido: 1000 })
        .expect(403);
    });

    it('retorna 422 ao tentar editar cotação não em elaboração', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'PERDIDA' },
      );

      await request(app.server)
        .patch(`/api/cotacoes/${cotacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ premioLiquido: 1000 })
        .expect(422);
    });
  });

  // ── DELETE /:id ─────────────────────────────────────────────────────────────

  describe('DELETE /api/cotacoes/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .delete('/api/cotacoes/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('retorna 403 sem permissão vendas:excluir_cotacao', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['vendas:visualizar_cotacao'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:visualizar_cotacao'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      await request(app.server)
        .delete(`/api/cotacoes/${cotacao.id}`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('exclui cotação em elaboração (soft delete)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      const res = await request(app.server)
        .delete(`/api/cotacoes/${cotacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Não deve aparecer mais
      await request(app.server)
        .get(`/api/cotacoes/${cotacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 para cotação inexistente', async () => {
      await request(app.server)
        .delete('/api/cotacoes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 422 ao tentar excluir cotação não em elaboração', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'PERDIDA' },
      );

      await request(app.server)
        .delete(`/api/cotacoes/${cotacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    });
  });

  // ── POST /:id/marcar-perdida ─────────────────────────────────────────────────

  describe('POST /api/cotacoes/:id/marcar-perdida', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/cotacoes/00000000-0000-0000-0000-000000000000/marcar-perdida')
        .send({ motivoPerda: 'Preço' })
        .expect(401);
    });

    it('marca cotação como perdida', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      const res = await request(app.server)
        .post(`/api/cotacoes/${cotacao.id}/marcar-perdida`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          motivoPerda: 'Preço acima do mercado',
          detalhesPerda: 'Cliente optou por outra seguradora',
          concorrenteGanhou: 'Porto Seguro',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.cotacao.status).toBe('PERDIDA');
      expect(res.body.data.documentoVenda).toBeDefined();
      expect(res.body.data.documentoVenda.status).toBe('PERDIDO');
    });

    it('retorna 400 sem motivoPerda', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      await request(app.server)
        .post(`/api/cotacoes/${cotacao.id}/marcar-perdida`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('retorna 404 para cotação inexistente', async () => {
      await request(app.server)
        .post('/api/cotacoes/00000000-0000-0000-0000-000000000000/marcar-perdida')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoPerda: 'Preço' })
        .expect(404);
    });

    it('retorna 422 ao tentar marcar como perdida cotação já perdida', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'PERDIDA' },
      );

      await request(app.server)
        .post(`/api/cotacoes/${cotacao.id}/marcar-perdida`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoPerda: 'Preço' })
        .expect(422);
    });
  });

  // ── POST /:id/vendedores ─────────────────────────────────────────────────────

  describe('POST /api/cotacoes/:id/vendedores', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/cotacoes/00000000-0000-0000-0000-000000000000/vendedores')
        .send({ vendedorId: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });

    it('troca vendedor da cotação', async () => {
      const cargo2 = await createTestCargo(corretoraId, {
        permissoes: ['vendas:criar_cotacao'],
      });
      const novoVendedor = await createTestUsuario(corretoraId, cargo2.id);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      const res = await request(app.server)
        .post(`/api/cotacoes/${cotacao.id}/vendedores`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendedorId: novoVendedor.id })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 404 para cotação inexistente', async () => {
      await request(app.server)
        .post('/api/cotacoes/00000000-0000-0000-0000-000000000000/vendedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendedorId: usuarioId })
        .expect(404);
    });

    it('retorna 404 para vendedor inexistente', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      await request(app.server)
        .post(`/api/cotacoes/${cotacao.id}/vendedores`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendedorId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });
  });

  // ── GET /:id/vendedores ──────────────────────────────────────────────────────

  describe('GET /api/cotacoes/:id/vendedores', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/cotacoes/00000000-0000-0000-0000-000000000000/vendedores')
        .expect(401);
    });

    it('retorna histórico de vendedores', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      const res = await request(app.server)
        .get(`/api/cotacoes/${cotacao.id}/vendedores`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('retorna 404 para cotação inexistente', async () => {
      await request(app.server)
        .get('/api/cotacoes/00000000-0000-0000-0000-000000000000/vendedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── POST /:id/confirmar-venda ────────────────────────────────────────────────

  describe('POST /api/cotacoes/:id/confirmar-venda', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/cotacoes/00000000-0000-0000-0000-000000000000/confirmar-venda')
        .expect(401);
    });

    it('retorna 403 sem permissão vendas:criar_documento_venda', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['vendas:visualizar_cotacao'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:visualizar_cotacao'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      await request(app.server)
        .post(`/api/cotacoes/${cotacao.id}/confirmar-venda`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('retorna 422 sem anexos', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      await request(app.server)
        .post(`/api/cotacoes/${cotacao.id}/confirmar-venda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    });

    it('confirma venda quando há anexos', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      // Inserir um anexo diretamente no banco para simular upload
      await db.insert(anexos).values({
        corretoraId,
        entidadeTipo: 'cotacao',
        entidadeId: cotacao.id,
        nomeOriginal: 'proposta.pdf',
        nomeArquivo: 'proposta.pdf',
        r2Key: `${corretoraId}/cotacaos/${cotacao.id}/proposta.pdf`,
        r2Bucket: 'ecotech-dev',
        mimeType: 'application/pdf',
        tamanho: 1024,
        uploadPorId: usuarioId,
      });

      const res = await request(app.server)
        .post(`/api/cotacoes/${cotacao.id}/confirmar-venda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('AGUARDANDO_CADASTRO');
    });

    it('retorna 404 para cotação inexistente', async () => {
      await request(app.server)
        .post('/api/cotacoes/00000000-0000-0000-0000-000000000000/confirmar-venda')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 422 ao tentar confirmar cotação já convertida', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const cotacao = await createTestCotacao(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'CONVERTIDA' },
      );

      await request(app.server)
        .post(`/api/cotacoes/${cotacao.id}/confirmar-venda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    });
  });
});
