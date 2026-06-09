import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  clientes,
  produtos,
  propostasComerciais,
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

async function createTestProposta(
  corretoraId: string,
  clienteId: string,
  vendedorId: string,
  produtoId: string,
  overrides: Record<string, unknown> = {},
) {
  const ts = Date.now();
  const [proposta] = await db
    .insert(propostasComerciais)
    .values({
      corretoraId,
      clienteId,
      vendedorId,
      produtoId,
      numeroPropostaInterno: `PROP-${ts}`,
      status: 'AGUARDANDO_ENVIO',
      vigenciaInicio: '2025-01-01',
      vigenciaFim: '2025-12-31',
      premioLiquido: '1000',
      percentualComissao: '10',
      valorComissao: '100',
      ...overrides,
    })
    .returning();
  return proposta;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('/api/propostas', () => {
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

  describe('POST /api/propostas', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).post('/api/propostas').send({}).expect(401);
    });

    it('retorna 403 sem permissão vendas:criar_proposta', async () => {
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
        .post('/api/propostas')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: 1000,
        })
        .expect(403);
    });

    it('cria proposta com dados mínimos', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const res = await request(app.server)
        .post('/api/propostas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: 1000,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.numeroPropostaInterno).toBeDefined();
      expect(res.body.data.status).toBe('AGUARDANDO_ENVIO');
      expect(res.body.data.clienteId).toBe(cliente.id);
      expect(res.body.data.produtoId).toBe(produto.id);
      expect(res.body.data.vendedorId).toBe(usuarioId);
    });

    it('cria proposta com campos opcionais (percentualComissao, observacoes, numeroPropostaExterno, vigencia)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const res = await request(app.server)
        .post('/api/propostas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          vigenciaInicio: '2025-03-01',
          vigenciaFim: '2026-02-28',
          premioLiquido: 2000,
          percentualComissao: 15,
          observacoes: 'Proposta com todos os campos opcionais preenchidos',
          numeroPropostaExterno: 'EXT-2025-001',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('AGUARDANDO_ENVIO');
      expect(res.body.data.vigenciaInicio).toBe('2025-03-01');
      expect(res.body.data.vigenciaFim).toBe('2026-02-28');
      expect(res.body.data.observacoes).toBe(
        'Proposta com todos os campos opcionais preenchidos',
      );
      expect(res.body.data.numeroPropostaExterno).toBe('EXT-2025-001');
      // percentualComissao 15% de 2000 = 300
      expect(parseFloat(res.body.data.percentualComissao)).toBe(15);
      expect(parseFloat(res.body.data.valorComissao)).toBe(300);
    });

    it('retorna 404 para cliente inexistente', async () => {
      const produto = await createTestProduto(corretoraId);

      await request(app.server)
        .post('/api/propostas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: '00000000-0000-0000-0000-000000000000',
          produtoId: produto.id,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: 1000,
        })
        .expect(404);
    });

    it('retorna 404 para produto inexistente', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);

      await request(app.server)
        .post('/api/propostas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: '00000000-0000-0000-0000-000000000000',
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: 1000,
        })
        .expect(404);
    });

    it('retorna 400 com dados inválidos (sem campos obrigatórios)', async () => {
      await request(app.server)
        .post('/api/propostas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ premioLiquido: 1000 })
        .expect(400);
    });
  });

  // ── GET / ───────────────────────────────────────────────────────────────────

  describe('GET /api/propostas', () => {
    beforeEach(async () => {
      await db.delete(propostasComerciais);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/propostas').expect(401);
    });

    it('retorna 403 sem permissão vendas:visualizar_proposta', async () => {
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
        .get('/api/propostas')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('retorna lista vazia quando não há propostas', async () => {
      const res = await request(app.server)
        .get('/api/propostas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('lista propostas do vendedor logado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      await createTestProposta(corretoraId, cliente.id, usuarioId, produto.id);
      await createTestProposta(corretoraId, cliente.id, usuarioId, produto.id, {
        numeroPropostaInterno: `PROP-${Date.now()}-2`,
      });

      const res = await request(app.server)
        .get('/api/propostas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('não lista propostas de outro vendedor', async () => {
      const cargo2 = await createTestCargo(corretoraId, {
        permissoes: ['vendas:visualizar_proposta'],
      });
      const outroVendedor = await createTestUsuario(corretoraId, cargo2.id);
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const propostaOutroVendedor = await createTestProposta(corretoraId, cliente.id, outroVendedor.id, produto.id);

      const res = await request(app.server)
        .get('/api/propostas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.find((p: any) => p.id === propostaOutroVendedor.id)).toBeUndefined();
    });

    it('filtra por status', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const propostaAguardando = await createTestProposta(corretoraId, cliente.id, usuarioId, produto.id, {
        status: 'AGUARDANDO_ENVIO',
      });
      await createTestProposta(corretoraId, cliente.id, usuarioId, produto.id, {
        status: 'APROVADA',
        numeroPropostaInterno: `PROP-${Date.now()}-2`,
      });

      const res = await request(app.server)
        .get('/api/propostas?status=AGUARDANDO_ENVIO')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.find((p: any) => p.id === propostaAguardando.id)).toBeDefined();
      expect(res.body.data.every((p: any) => p.status === 'AGUARDANDO_ENVIO')).toBe(true);
    });

    it('filtra por clienteId', async () => {
      const cliente1 = await createTestCliente(corretoraId, usuarioId);
      const cliente2 = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      await createTestProposta(corretoraId, cliente1.id, usuarioId, produto.id, {
        numeroPropostaInterno: `PROP-${Date.now()}-A`,
      });
      await createTestProposta(corretoraId, cliente2.id, usuarioId, produto.id, {
        numeroPropostaInterno: `PROP-${Date.now()}-B`,
      });

      const res = await request(app.server)
        .get(`/api/propostas?clienteId=${cliente1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].cliente.id).toBe(cliente1.id);
    });

    it('filtra por produtoId', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto1 = await createTestProduto(corretoraId);
      const produto2 = await createTestProduto(corretoraId);

      await createTestProposta(corretoraId, cliente.id, usuarioId, produto1.id, {
        numeroPropostaInterno: `PROP-${Date.now()}-P1`,
      });
      await createTestProposta(corretoraId, cliente.id, usuarioId, produto2.id, {
        numeroPropostaInterno: `PROP-${Date.now()}-P2`,
      });

      const res = await request(app.server)
        .get(`/api/propostas?produtoId=${produto2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].produto.id).toBe(produto2.id);
    });

    it('respeita paginação (page e limit)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      // Create 5 proposals
      for (let i = 0; i < 5; i++) {
        await createTestProposta(corretoraId, cliente.id, usuarioId, produto.id, {
          numeroPropostaInterno: `PROP-PAG-${Date.now()}-${i}`,
        });
      }

      const res = await request(app.server)
        .get('/api/propostas?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
    });

    it('não retorna propostas deletadas', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const propostaDeletada = await createTestProposta(corretoraId, cliente.id, usuarioId, produto.id, {
        deletedAt: new Date(),
      });

      const res = await request(app.server)
        .get('/api/propostas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.find((p: any) => p.id === propostaDeletada.id)).toBeUndefined();
    });

    it('não retorna propostas de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const cliente2 = await createTestCliente(corretora2.id, usuario2.id);
      const produto2 = await createTestProduto(corretora2.id);
      const propostaOutraCorretora = await createTestProposta(corretora2.id, cliente2.id, usuario2.id, produto2.id);

      const res = await request(app.server)
        .get('/api/propostas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.find((p: any) => p.id === propostaOutraCorretora.id)).toBeUndefined();
    });
  });

  // ── GET /:id ────────────────────────────────────────────────────────────────

  describe('GET /api/propostas/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/propostas/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('retorna proposta por ID', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      const res = await request(app.server)
        .get(`/api/propostas/${proposta.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(proposta.id);
      expect(res.body.data.status).toBe('AGUARDANDO_ENVIO');
    });

    it('retorna 404 para proposta inexistente', async () => {
      await request(app.server)
        .get('/api/propostas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 404 para proposta de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const cliente2 = await createTestCliente(corretora2.id, usuario2.id);
      const produto2 = await createTestProduto(corretora2.id);
      const propostaOutra = await createTestProposta(
        corretora2.id,
        cliente2.id,
        usuario2.id,
        produto2.id,
      );

      await request(app.server)
        .get(`/api/propostas/${propostaOutra.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 403 quando outro vendedor tenta acessar sem permissão total', async () => {
      const cargo2 = await createTestCargo(corretoraId, {
        permissoes: ['vendas:visualizar_proposta'],
      });
      const outroVendedor = await createTestUsuario(corretoraId, cargo2.id);
      const tokenOutroVendedor = generateTestToken(app, {
        sub: outroVendedor.id,
        corretoraId,
        cargoId: cargo2.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:visualizar_proposta'],
        nome: outroVendedor.nome,
        email: outroVendedor.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      await request(app.server)
        .get(`/api/propostas/${proposta.id}`)
        .set('Authorization', `Bearer ${tokenOutroVendedor}`)
        .expect(403);
    });

    it('admin com vendas:visualizar_todos_documentos acessa proposta de qualquer vendedor', async () => {
      // Proposal owned by usuarioId (the main test vendor)
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      // Create a second vendor who has vendas:visualizar_todos_documentos
      const cargo2 = await createTestCargo(corretoraId, {
        permissoes: [
          'vendas:visualizar_proposta',
          'vendas:visualizar_todos_documentos',
        ],
      });
      const gestor = await createTestUsuario(corretoraId, cargo2.id);
      const tokenGestor = generateTestToken(app, {
        sub: gestor.id,
        corretoraId,
        cargoId: cargo2.id,
        isAdmin: false,
        isGestor: true,
        isVendedor: false,
        permissoes: [
          'vendas:visualizar_proposta',
          'vendas:visualizar_todos_documentos',
        ],
        nome: gestor.nome,
        email: gestor.email,
        avatarUrl: null,
      });

      const res = await request(app.server)
        .get(`/api/propostas/${proposta.id}`)
        .set('Authorization', `Bearer ${tokenGestor}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(proposta.id);
    });
  });

  // ── PATCH /:id ──────────────────────────────────────────────────────────────

  describe('PATCH /api/propostas/:id', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .patch('/api/propostas/00000000-0000-0000-0000-000000000000')
        .send({})
        .expect(401);
    });

    it('retorna 403 sem permissão vendas:editar_proposta', async () => {
      const cargo = await createTestCargo(corretoraId, {
        permissoes: ['vendas:visualizar_proposta'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:visualizar_proposta'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      await request(app.server)
        .patch(`/api/propostas/${proposta.id}`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ observacoes: 'Atualizado' })
        .expect(403);
    });

    it('atualiza proposta em aguardando envio', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      const res = await request(app.server)
        .patch(`/api/propostas/${proposta.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ observacoes: 'Observação atualizada', premioLiquido: 2000 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.observacoes).toBe('Observação atualizada');
    });

    it('atualiza proposta em status ENVIADA', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'ENVIADA' },
      );

      const res = await request(app.server)
        .patch(`/api/propostas/${proposta.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ observacoes: 'Atualizado após envio' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.observacoes).toBe('Atualizado após envio');
      expect(res.body.data.status).toBe('ENVIADA');
    });

    it('atualiza proposta em status EM_ANALISE', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'EM_ANALISE' },
      );

      const res = await request(app.server)
        .patch(`/api/propostas/${proposta.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ observacoes: 'Em análise - complementando dados' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('EM_ANALISE');
    });

    it('atualiza proposta em status PENDENTE_DOCUMENTACAO', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'PENDENTE_DOCUMENTACAO' },
      );

      const res = await request(app.server)
        .patch(`/api/propostas/${proposta.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ observacoes: 'Documentação pendente enviada' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDENTE_DOCUMENTACAO');
    });

    it('recalcula valorComissao ao atualizar premioLiquido', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      // Start with premioLiquido=1000 and percentualComissao=10 => valorComissao=100
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        {
          premioLiquido: '1000',
          percentualComissao: '10',
          valorComissao: '100',
        },
      );

      const res = await request(app.server)
        .patch(`/api/propostas/${proposta.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ premioLiquido: 5000 })
        .expect(200);

      expect(res.body.success).toBe(true);
      // 5000 * 10% = 500
      expect(parseFloat(res.body.data.valorComissao)).toBe(500);
    });

    it('recalcula valorComissao ao atualizar percentualComissao', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        {
          premioLiquido: '2000',
          percentualComissao: '10',
          valorComissao: '200',
        },
      );

      const res = await request(app.server)
        .patch(`/api/propostas/${proposta.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ percentualComissao: 20 })
        .expect(200);

      expect(res.body.success).toBe(true);
      // 2000 * 20% = 400
      expect(parseFloat(res.body.data.valorComissao)).toBe(400);
    });

    it('retorna 404 para proposta inexistente', async () => {
      await request(app.server)
        .patch('/api/propostas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ observacoes: 'Teste' })
        .expect(404);
    });

    it('retorna 404 para proposta de outra corretora', async () => {
      const plano2 = await createTestPlano();
      const corretora2 = await createTestCorretora(plano2.id);
      const cargo2 = await createAdminCargo(corretora2.id);
      const usuario2 = await createTestUsuario(corretora2.id, cargo2.id);
      const cliente2 = await createTestCliente(corretora2.id, usuario2.id);
      const produto2 = await createTestProduto(corretora2.id);
      const propostaOutra = await createTestProposta(
        corretora2.id,
        cliente2.id,
        usuario2.id,
        produto2.id,
      );

      await request(app.server)
        .patch(`/api/propostas/${propostaOutra.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ observacoes: 'Cross-corretora' })
        .expect(404);
    });

    it('retorna 422 ao tentar editar proposta em status inválido', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'APROVADA' },
      );

      await request(app.server)
        .patch(`/api/propostas/${proposta.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ observacoes: 'Tentativa' })
        .expect(422);
    });
  });

  // ── POST /:id/enviar ─────────────────────────────────────────────────────────

  describe('POST /api/propostas/:id/enviar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/propostas/00000000-0000-0000-0000-000000000000/enviar')
        .expect(401);
    });

    it('retorna 403 sem permissão vendas:editar_proposta', async () => {
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: 'Somente visualizar',
        permissoes: ['vendas:visualizar_proposta'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:visualizar_proposta'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'AGUARDANDO_ENVIO' },
      );

      await request(app.server)
        .post(`/api/propostas/${proposta.id}/enviar`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('envia proposta aguardando envio', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'AGUARDANDO_ENVIO' },
      );

      const res = await request(app.server)
        .post(`/api/propostas/${proposta.id}/enviar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ENVIADA');
    });

    it('retorna 422 ao tentar enviar proposta já enviada', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'ENVIADA' },
      );

      await request(app.server)
        .post(`/api/propostas/${proposta.id}/enviar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    });

    it('retorna 404 para proposta inexistente', async () => {
      await request(app.server)
        .post('/api/propostas/00000000-0000-0000-0000-000000000000/enviar')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── POST /:id/aprovar ─────────────────────────────────────────────────────────

  describe('POST /api/propostas/:id/aprovar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/propostas/00000000-0000-0000-0000-000000000000/aprovar')
        .expect(401);
    });

    it('aprova proposta enviada', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'ENVIADA' },
      );

      const res = await request(app.server)
        .post(`/api/propostas/${proposta.id}/aprovar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APROVADA');
    });

    it('aprova proposta em status EM_ANALISE', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'EM_ANALISE' },
      );

      const res = await request(app.server)
        .post(`/api/propostas/${proposta.id}/aprovar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APROVADA');
    });

    it('aprova proposta em status PENDENTE_DOCUMENTACAO', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'PENDENTE_DOCUMENTACAO' },
      );

      const res = await request(app.server)
        .post(`/api/propostas/${proposta.id}/aprovar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APROVADA');
    });

    it('retorna 422 ao tentar aprovar proposta não enviada', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'AGUARDANDO_ENVIO' },
      );

      await request(app.server)
        .post(`/api/propostas/${proposta.id}/aprovar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    });

    it('retorna 404 para proposta inexistente', async () => {
      await request(app.server)
        .post('/api/propostas/00000000-0000-0000-0000-000000000000/aprovar')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── POST /:id/recusar ─────────────────────────────────────────────────────────

  describe('POST /api/propostas/:id/recusar', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/propostas/00000000-0000-0000-0000-000000000000/recusar')
        .send({ motivoRecusa: 'Preço' })
        .expect(401);
    });

    it('recusa proposta enviada', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'ENVIADA' },
      );

      const res = await request(app.server)
        .post(`/api/propostas/${proposta.id}/recusar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoRecusa: 'Preço acima do mercado' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RECUSADA');
    });

    it('recusa proposta com campo detalhesRecusa opcional', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'ENVIADA' },
      );

      const res = await request(app.server)
        .post(`/api/propostas/${proposta.id}/recusar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          motivoRecusa: 'Risco elevado',
          detalhesRecusa:
            'O perfil do cliente apresenta histórico de sinistros que inviabiliza a apólice nas condições propostas.',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RECUSADA');
      expect(res.body.data.motivoRecusa).toBe('Risco elevado');
      expect(res.body.data.detalhesRecusa).toBe(
        'O perfil do cliente apresenta histórico de sinistros que inviabiliza a apólice nas condições propostas.',
      );
    });

    it('retorna 422 ao tentar recusar proposta não enviada', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'AGUARDANDO_ENVIO' },
      );

      await request(app.server)
        .post(`/api/propostas/${proposta.id}/recusar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoRecusa: 'Preço' })
        .expect(422);
    });

    it('retorna 404 para proposta inexistente', async () => {
      await request(app.server)
        .post('/api/propostas/00000000-0000-0000-0000-000000000000/recusar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivoRecusa: 'Preço' })
        .expect(404);
    });
  });

  // ── POST /:id/confirmar-venda ────────────────────────────────────────────────

  describe('POST /api/propostas/:id/confirmar-venda', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post(
          '/api/propostas/00000000-0000-0000-0000-000000000000/confirmar-venda',
        )
        .expect(401);
    });

    it('retorna 403 sem permissão vendas:criar_documento_venda', async () => {
      // Token with editar_proposta but NOT criar_documento_venda
      const cargo = await createTestCargo(corretoraId, {
        nomeCargo: 'Vendedor sem criar_documento_venda',
        permissoes: ['vendas:editar_proposta', 'vendas:visualizar_proposta'],
      });
      const usuario = await createTestUsuario(corretoraId, cargo.id);
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuario.id,
        corretoraId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:editar_proposta', 'vendas:visualizar_proposta'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'APROVADA' },
      );

      await request(app.server)
        .post(`/api/propostas/${proposta.id}/confirmar-venda`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .expect(403);
    });

    it('confirma venda de proposta aprovada', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'APROVADA' },
      );

      const res = await request(app.server)
        .post(`/api/propostas/${proposta.id}/confirmar-venda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.propostaId).toBe(proposta.id);
      expect(res.body.data.clienteId).toBe(cliente.id);
    });

    it('retorna todos os campos esperados na resposta de confirmar-venda', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        {
          status: 'APROVADA',
          vigenciaInicio: '2025-06-01',
          vigenciaFim: '2026-05-31',
          premioLiquido: '3000',
          percentualComissao: '12',
          valorComissao: '360',
        },
      );

      const res = await request(app.server)
        .post(`/api/propostas/${proposta.id}/confirmar-venda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.propostaId).toBe(proposta.id);
      expect(data.clienteId).toBe(cliente.id);
      expect(data.produtoId).toBe(produto.id);
      expect(data.vendedorId).toBe(usuarioId);
      expect(data.vigenciaInicio).toBe('2025-06-01');
      expect(data.vigenciaFim).toBe('2026-05-31');
      expect(parseFloat(data.premioLiquido)).toBe(3000);
      expect(parseFloat(data.percentualComissao)).toBe(12);
      // coberturas is nullable — field must be present in response
      expect('coberturas' in data).toBe(true);
    });

    it('retorna 422 ao tentar confirmar venda de proposta não aprovada', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const proposta = await createTestProposta(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { status: 'ENVIADA' },
      );

      await request(app.server)
        .post(`/api/propostas/${proposta.id}/confirmar-venda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    });

    it('retorna 404 para proposta inexistente', async () => {
      await request(app.server)
        .post(
          '/api/propostas/00000000-0000-0000-0000-000000000000/confirmar-venda',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
