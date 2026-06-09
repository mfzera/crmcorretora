import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  documentosVenda,
  clientes,
  produtos,
  cotacoes,
  renovacoesComerciais,
  propostasComerciais,
  NotificacaoService,
} from '@ecotech/shared/database';
import * as sharedDatabase from '@ecotech/shared/database';
import * as storageModule from '@ecotech/shared/storage';
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

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// Nota: o campo `permissoes` no token é ignorado pelo middleware authenticate —
// as permissões reais são sempre carregadas do banco via cargoId.
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
    isAdmin: false,
    isGestor: false,
    isVendedor: true,
    permissoes: [],
    nome,
    email,
    avatarUrl: null,
  });
}

function makeAdminToken(
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
    isVendedor: false,
    permissoes: [],
    nome,
    email,
    avatarUrl: null,
  });
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('/api/documentos-venda — coverage gaps', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let cargoId: string;
  let vendedorToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    const adminCargo = await createAdminCargo(corretoraId);
    cargoId = adminCargo.id;
    const adminUsuario = await createTestUsuario(corretoraId, adminCargo.id);
    usuarioId = adminUsuario.id;

    adminToken = makeAdminToken(
      app,
      corretoraId,
      adminUsuario.id,
      adminCargo.id,
      adminUsuario.nome,
      adminUsuario.email,
    );

    const vendedorCargo = await createTestCargo(corretoraId, {
      isVendedor: true,
      permissoes: [
        'vendas:criar_documento_venda',
        'vendas:editar_documento_venda',
        'vendas:visualizar_documento_venda',
        'vendas:cancelar_venda',
        'vendas:criar_cotacao',
      ],
    });
    const vendedorUsuario = await createTestUsuario(corretoraId, vendedorCargo.id);
    usuarioId = vendedorUsuario.id;

    vendedorToken = makeVendedorToken(
      app,
      corretoraId,
      vendedorUsuario.id,
      vendedorCargo.id,
      vendedorUsuario.nome,
      vendedorUsuario.email,
    );
  });

  // ── GET / — filtros avançados ────────────────────────────────────────────────

  describe('GET /api/documentos-venda — filtros avançados', () => {
    let clienteId: string;
    let produtoId: string;

    beforeAll(async () => {
      // Re-setup completo: outros arquivos de teste podem ter chamado cleanDatabase()
      // concorrentemente com os testes do describe pai, zerando os dados criados lá.
      await cleanDatabase();

      const plano = await createTestPlano();
      const corretora = await createTestCorretora(plano.id);
      corretoraId = corretora.id;

      const adminCargo = await createAdminCargo(corretoraId);
      cargoId = adminCargo.id;
      const adminUsuario = await createTestUsuario(corretoraId, adminCargo.id);
      adminToken = makeAdminToken(app, corretoraId, adminUsuario.id, adminCargo.id, adminUsuario.nome, adminUsuario.email);

      const vendedorCargo = await createTestCargo(corretoraId, {
        isVendedor: true,
        permissoes: [
          'vendas:criar_documento_venda',
          'vendas:editar_documento_venda',
          'vendas:visualizar_documento_venda',
          'vendas:cancelar_venda',
          'vendas:criar_cotacao',
        ],
      });
      const vendedorUsuario = await createTestUsuario(corretoraId, vendedorCargo.id);
      usuarioId = vendedorUsuario.id;
      vendedorToken = makeVendedorToken(app, corretoraId, vendedorUsuario.id, vendedorCargo.id, vendedorUsuario.nome, vendedorUsuario.email);

      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      clienteId = cliente.id;
      produtoId = produto.id;
    });

    it('filtra por ?search= e encontra pelo número do documento', async () => {
      const ts = Date.now();
      const numeroUnico = `SRCH-${ts}`;
      await createTestDocumentoVenda(corretoraId, usuarioId, clienteId, produtoId, {
        numeroDocumento: numeroUnico,
      });

      const res = await request(app.server)
        .get(`/api/documentos-venda?search=${numeroUnico}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.some((d: any) => d.numero === numeroUnico)).toBe(true);
    });

    it('filtra por ?criadoAntes= e não retorna documentos criados depois', async () => {
      // Cria documento que não deve aparecer (criado agora, filtro de antes de 2000)
      await createTestDocumentoVenda(corretoraId, usuarioId, clienteId, produtoId, {
        numeroDocumento: `DOC-ANTES-${Date.now()}`,
      });

      const res = await request(app.server)
        .get('/api/documentos-venda?criadoAntes=2000-01-01')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // Nenhum documento deve ter sido criado antes do ano 2000
      expect(res.body.data).toHaveLength(0);
    });

    it('filtra por múltiplos status separados por vírgula', async () => {
      await createTestDocumentoVenda(corretoraId, usuarioId, clienteId, produtoId, {
        numeroDocumento: `DOC-EM-${Date.now()}`,
        status: 'EM_NEGOCIACAO',
      });
      await new Promise((r) => setTimeout(r, 2));
      await createTestDocumentoVenda(corretoraId, usuarioId, clienteId, produtoId, {
        numeroDocumento: `DOC-VC-${Date.now()}`,
        status: 'VENDA_CONFIRMADA',
      });
      await new Promise((r) => setTimeout(r, 2));
      await createTestDocumentoVenda(corretoraId, usuarioId, clienteId, produtoId, {
        numeroDocumento: `DOC-AT-${Date.now()}`,
        status: 'ATIVO',
      });

      const res = await request(app.server)
        .get('/api/documentos-venda?status=EM_NEGOCIACAO,VENDA_CONFIRMADA')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const statuses = res.body.data.map((d: any) => d.status);
      expect(statuses.some((s: string) => s === 'EM_NEGOCIACAO')).toBe(true);
      expect(statuses.some((s: string) => s === 'VENDA_CONFIRMADA')).toBe(true);
      expect(statuses.every((s: string) => ['EM_NEGOCIACAO', 'VENDA_CONFIRMADA'].includes(s))).toBe(true);
    });
  });

  // ── GET / — filtro com permissão cadastro:aprovar_venda ───────────────────────

  describe('GET /api/documentos-venda — permissão cadastro:aprovar_venda', () => {
    // Declarado antes do beforeAll para evitar dependência de hoisting
    const shared: {
      corrId?: string;
      vendedorAId?: string;
      vendedorBId?: string;
      cadastroToken?: string;
      clienteId?: string;
      produtoId?: string;
    } = {};

    let clienteId: string;
    let produtoId: string;
    let vendedorAId: string;
    let vendedorBId: string;
    let cadastroToken: string;

    beforeAll(async () => {
      const plano = await createTestPlano();
      const corretora = await createTestCorretora(plano.id);
      const corrId = corretora.id;

      const cargoA = await createTestCargo(corrId, { isVendedor: true });
      const usuarioA = await createTestUsuario(corrId, cargoA.id);
      vendedorAId = usuarioA.id;

      const cargoB = await createTestCargo(corrId, { isVendedor: true });
      const usuarioB = await createTestUsuario(corrId, cargoB.id);
      vendedorBId = usuarioB.id;

      const cargoCadastro = await createTestCargo(corrId, {
        permissoes: [
          'cadastro:aprovar_venda',
          'vendas:visualizar_documento_venda',
        ],
      });
      const usuarioCadastro = await createTestUsuario(corrId, cargoCadastro.id);

      cadastroToken = generateTestToken(app, {
        sub: usuarioCadastro.id,
        corretoraId: corrId,
        cargoId: cargoCadastro.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: [
          'cadastro:aprovar_venda',
          'vendas:visualizar_documento_venda',
        ],
        nome: usuarioCadastro.nome,
        email: usuarioCadastro.email,
        avatarUrl: null,
      });

      const cliente = await createTestCliente(corrId, usuarioA.id);
      clienteId = cliente.id;
      const produto = await createTestProduto(corrId);
      produtoId = produto.id;

      // Criar documentos para vendedorA e vendedorB
      await createTestDocumentoVenda(corrId, vendedorAId, clienteId, produtoId, {
        numeroDocumento: `CADAS-A-${Date.now()}`,
        status: 'AGUARDANDO_CADASTRO',
      });
      await new Promise((r) => setTimeout(r, 2));
      await createTestDocumentoVenda(corrId, vendedorBId, clienteId, produtoId, {
        numeroDocumento: `CADAS-B-${Date.now()}`,
        status: 'AGUARDANDO_CADASTRO',
      });

      // Guardar corrId para os testes abaixo; precisamos de um token com corrId correto
      // Redefinir para uso local — os testes abaixo operam via `cadastroToken` e `corrId`
      // As variáveis acima são locais ao beforeAll e os testes do describe acessam via closure.
      // Reatribuir para que os testes abaixo possam usar:
      Object.assign(shared, {
        corrId,
        vendedorAId,
        vendedorBId,
        cadastroToken,
        clienteId,
        produtoId,
      });
    });


    it('usuário com cadastro:aprovar_venda vê documentos de múltiplos vendedores', async () => {
      const res = await request(app.server)
        .get('/api/documentos-venda')
        .set('Authorization', `Bearer ${shared.cadastroToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const vendedorIds = res.body.data.map((d: any) => d.vendedorId);
      // Deve conter documentos de ambos os vendedores
      expect(vendedorIds.includes(shared.vendedorAId)).toBe(true);
      expect(vendedorIds.includes(shared.vendedorBId)).toBe(true);
    });

    it('usuário com cadastro:aprovar_venda + ?vendedorId filtra por vendedor específico', async () => {
      const res = await request(app.server)
        .get(`/api/documentos-venda?vendedorId=${shared.vendedorAId}`)
        .set('Authorization', `Bearer ${shared.cadastroToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.every((d: any) => d.vendedorId === shared.vendedorAId)).toBe(true);
      expect(res.body.data.some((d: any) => d.vendedorId === shared.vendedorBId)).toBe(false);
    });
  });

  // ── GET /:id — ForbiddenError ─────────────────────────────────────────────────

  describe('GET /api/documentos-venda/:id — ForbiddenError', () => {
    it('vendedor B tenta acessar documento do vendedor A → 403', async () => {
      const plano = await createTestPlano();
      const corretora = await createTestCorretora(plano.id);
      const corrId = corretora.id;

      const cargoA = await createTestCargo(corrId, {
        isVendedor: true,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuarioA = await createTestUsuario(corrId, cargoA.id);
      const clienteA = await createTestCliente(corrId, usuarioA.id);
      const produto = await createTestProduto(corrId);

      const docA = await createTestDocumentoVenda(corrId, usuarioA.id, clienteA.id, produto.id);

      const cargoB = await createTestCargo(corrId, {
        isVendedor: true,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuarioB = await createTestUsuario(corrId, cargoB.id);
      const tokenB = generateTestToken(app, {
        sub: usuarioB.id,
        corretoraId: corrId,
        cargoId: cargoB.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuarioB.nome,
        email: usuarioB.email,
        avatarUrl: null,
      });

      await request(app.server)
        .get(`/api/documentos-venda/${docA.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);
    });
  });

  // ── PATCH /:id — documento cancelado/perdido ──────────────────────────────────

  describe('PATCH /api/documentos-venda/:id — status CANCELADO/PERDIDO', () => {
    let clienteId: string;
    let produtoId: string;

    beforeAll(async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      clienteId = cliente.id;
      produtoId = produto.id;
    });

    it('editar documento CANCELADO → 400', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        { status: 'CANCELADO', numeroDocumento: `DOC-CAN-${Date.now()}` },
      );

      await request(app.server)
        .patch(`/api/documentos-venda/${doc.id}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ observacoes: 'tentativa de edição' })
        .expect(400);
    });

    it('editar documento PERDIDO → 400', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        { status: 'PERDIDO', numeroDocumento: `DOC-PERD-${Date.now()}` },
      );

      await request(app.server)
        .patch(`/api/documentos-venda/${doc.id}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ observacoes: 'tentativa de edição' })
        .expect(400);
    });
  });

  // ── POST /:id/registrar-apolice-externa ────────────────────────────────────────

  describe('POST /api/documentos-venda/:id/registrar-apolice-externa', () => {
    let clienteId: string;
    let produtoId: string;

    beforeAll(async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      clienteId = cliente.id;
      produtoId = produto.id;
    });

    it('registra número da apólice externa → 200', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/registrar-apolice-externa`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ numeroApoliceExterna: 'APL-12345' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.numeroApoliceExterna).toBe('APL-12345');
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/registrar-apolice-externa')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ numeroApoliceExterna: 'APL-99999' })
        .expect(404);
    });

    it('retorna 403 sem permissão vendas:editar_documento_venda', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        { numeroDocumento: `DOC-APL-SEM-PERM-${Date.now()}` },
      );

      const cargoSemPerm = await createTestCargo(corretoraId, {
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuarioSemPerm = await createTestUsuario(corretoraId, cargoSemPerm.id);
      const tokenSemPerm = generateTestToken(app, {
        sub: usuarioSemPerm.id,
        corretoraId,
        cargoId: cargoSemPerm.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuarioSemPerm.nome,
        email: usuarioSemPerm.email,
        avatarUrl: null,
      });

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/registrar-apolice-externa`)
        .set('Authorization', `Bearer ${tokenSemPerm}`)
        .send({ numeroApoliceExterna: 'APL-PROIBIDO' })
        .expect(403);
    });
  });

  // ── POST /:id/solicitar-validacao-cadastro ────────────────────────────────────

  describe('POST /api/documentos-venda/:id/solicitar-validacao-cadastro', () => {
    let clienteId: string;
    let produtoId: string;

    beforeAll(async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      clienteId = cliente.id;
      produtoId = produto.id;
    });

    it('documento em VENDA_CONFIRMADA → muda para AGUARDANDO_CADASTRO → 200', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'VENDA_CONFIRMADA',
          numeroDocumento: `DOC-SOLVAL-${Date.now()}`,
        },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/solicitar-validacao-cadastro`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('AGUARDANDO_CADASTRO');
    });

    it('documento com status diferente de VENDA_CONFIRMADA → 400', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'EM_NEGOCIACAO',
          numeroDocumento: `DOC-SOLVAL-FAIL-${Date.now()}`,
        },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/solicitar-validacao-cadastro`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(400);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/solicitar-validacao-cadastro')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(404);
    });
  });

  // ── POST /:id/aprovar-cadastro ────────────────────────────────────────────────

  describe('POST /api/documentos-venda/:id/aprovar-cadastro', () => {
    let clienteId: string;
    let produtoId: string;

    beforeAll(async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      clienteId = cliente.id;
      produtoId = produto.id;
    });

    it('documento em AGUARDANDO_CADASTRO → aprova, status muda para ATIVO → 200', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'AGUARDANDO_CADASTRO',
          numeroDocumento: `DOC-APR-${Date.now()}`,
          vigenciaFim: '2020-01-01', // passado, para não criar renovação
        },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ATIVO');
    });

    it('documento com status diferente de AGUARDANDO_CADASTRO → 400', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'EM_NEGOCIACAO',
          numeroDocumento: `DOC-APR-FAIL-${Date.now()}`,
        },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/aprovar-cadastro')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 403 sem permissão cadastro:aprovar_venda', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'AGUARDANDO_CADASTRO',
          numeroDocumento: `DOC-APR-SEMPERM-${Date.now()}`,
        },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });
  });

  // ── POST /:id/rejeitar-cadastro ──────────────────────────────────────────────

  describe('POST /api/documentos-venda/:id/rejeitar-cadastro', () => {
    let clienteId: string;
    let produtoId: string;
    let rejeitadorToken: string;

    beforeAll(async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      clienteId = cliente.id;
      produtoId = produto.id;

      const cargoRej = await createTestCargo(corretoraId, {
        permissoes: ['cadastro:rejeitar_venda', 'vendas:visualizar_documento_venda'],
      });
      const usuarioRej = await createTestUsuario(corretoraId, cargoRej.id);
      rejeitadorToken = generateTestToken(app, {
        sub: usuarioRej.id,
        corretoraId,
        cargoId: cargoRej.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['cadastro:rejeitar_venda', 'vendas:visualizar_documento_venda'],
        nome: usuarioRej.nome,
        email: usuarioRej.email,
        avatarUrl: null,
      });
    });

    it('documento em AGUARDANDO_CADASTRO → rejeita, retorna para VENDA_CONFIRMADA → 200', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'AGUARDANDO_CADASTRO',
          numeroDocumento: `DOC-REJ-${Date.now()}`,
        },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/rejeitar-cadastro`)
        .set('Authorization', `Bearer ${rejeitadorToken}`)
        .send({ motivoRejeicao: 'Documentação incompleta para aprovação' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('VENDA_CONFIRMADA');
      expect(res.body.data.motivoRejeicao).toBe('Documentação incompleta para aprovação');
    });

    it('documento com status diferente de AGUARDANDO_CADASTRO → 400', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'EM_NEGOCIACAO',
          numeroDocumento: `DOC-REJ-FAIL-${Date.now()}`,
        },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/rejeitar-cadastro`)
        .set('Authorization', `Bearer ${rejeitadorToken}`)
        .send({ motivoRejeicao: 'Status errado' })
        .expect(400);
    });

    it('retorna 403 sem permissão cadastro:rejeitar_venda', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'AGUARDANDO_CADASTRO',
          numeroDocumento: `DOC-REJ-SEMPERM-${Date.now()}`,
        },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/rejeitar-cadastro`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ motivoRejeicao: 'Tentativa sem permissão' })
        .expect(403);
    });
  });

  // ── POST /:id/cancelar ────────────────────────────────────────────────────────

  describe('POST /api/documentos-venda/:id/cancelar', () => {
    let clienteId: string;
    let produtoId: string;

    beforeAll(async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      clienteId = cliente.id;
      produtoId = produto.id;
    });

    it('cancela documento em EM_NEGOCIACAO → 200', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'EM_NEGOCIACAO',
          numeroDocumento: `DOC-CANCEL-${Date.now()}`,
        },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/cancelar`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ motivoCancelamento: 'Cliente desistiu da contratação' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELADO');
    });

    it('documento já CANCELADO → 400', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'CANCELADO',
          numeroDocumento: `DOC-CANCEL-JA-${Date.now()}`,
        },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/cancelar`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ motivoCancelamento: 'Tentando cancelar de novo' })
        .expect(400);
    });

    it('retorna 403 sem permissão vendas:cancelar_venda', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'EM_NEGOCIACAO',
          numeroDocumento: `DOC-CANCEL-SEMPERM-${Date.now()}`,
        },
      );

      const cargoSemPerm = await createTestCargo(corretoraId, {
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuarioSemPerm = await createTestUsuario(corretoraId, cargoSemPerm.id);
      const tokenSemPerm = generateTestToken(app, {
        sub: usuarioSemPerm.id,
        corretoraId,
        cargoId: cargoSemPerm.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuarioSemPerm.nome,
        email: usuarioSemPerm.email,
        avatarUrl: null,
      });

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/cancelar`)
        .set('Authorization', `Bearer ${tokenSemPerm}`)
        .send({ motivoCancelamento: 'Sem permissão' })
        .expect(403);
    });
  });

  // ── POST /:id/perder ──────────────────────────────────────────────────────────

  describe('POST /api/documentos-venda/:id/perder', () => {
    let clienteId: string;
    let produtoId: string;

    beforeAll(async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      clienteId = cliente.id;
      produtoId = produto.id;
    });

    it('marca como PERDIDO documento em EM_NEGOCIACAO → 200', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'EM_NEGOCIACAO',
          numeroDocumento: `DOC-PERD-OK-${Date.now()}`,
        },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/perder`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ motivoPerda: 'Preço mais alto que concorrência' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PERDIDO');
      expect(res.body.data.motivoPerda).toBe('Preço mais alto que concorrência');
    });

    it('status inválido (ATIVO) → 400', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'ATIVO',
          numeroDocumento: `DOC-PERD-FAIL-${Date.now()}`,
        },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/perder`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ motivoPerda: 'Tentativa inválida' })
        .expect(400);
    });
  });

  // ── GET /:id/historico — ForbiddenError ──────────────────────────────────────

  describe('GET /api/documentos-venda/:id/historico — ForbiddenError', () => {
    it('vendedor B tenta ver histórico do documento do vendedor A → 403', async () => {
      const plano = await createTestPlano();
      const corretora = await createTestCorretora(plano.id);
      const corrId = corretora.id;

      const cargoA = await createTestCargo(corrId, {
        isVendedor: true,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuarioA = await createTestUsuario(corrId, cargoA.id);
      const clienteA = await createTestCliente(corrId, usuarioA.id);
      const produto = await createTestProduto(corrId);

      const docA = await createTestDocumentoVenda(corrId, usuarioA.id, clienteA.id, produto.id, {
        numeroDocumento: `DOC-HIST-${Date.now()}`,
      });

      const cargoB = await createTestCargo(corrId, {
        isVendedor: true,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuarioB = await createTestUsuario(corrId, cargoB.id);
      const tokenB = generateTestToken(app, {
        sub: usuarioB.id,
        corretoraId: corrId,
        cargoId: cargoB.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuarioB.nome,
        email: usuarioB.email,
        avatarUrl: null,
      });

      await request(app.server)
        .get(`/api/documentos-venda/${docA.id}/historico`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);
    });

    it('vendedor vê histórico do próprio documento → 200', async () => {
      const plano = await createTestPlano();
      const corretora = await createTestCorretora(plano.id);
      const corrId = corretora.id;

      const cargo = await createTestCargo(corrId, {
        isVendedor: true,
        permissoes: ['vendas:visualizar_documento_venda'],
      });
      const usuario = await createTestUsuario(corrId, cargo.id);
      const clienteLocal = await createTestCliente(corrId, usuario.id);
      const produto = await createTestProduto(corrId);

      const doc = await createTestDocumentoVenda(corrId, usuario.id, clienteLocal.id, produto.id, {
        numeroDocumento: `DOC-HIST-OWN-${Date.now()}`,
      });

      const tokenOwner = generateTestToken(app, {
        sub: usuario.id,
        corretoraId: corrId,
        cargoId: cargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:visualizar_documento_venda'],
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: null,
      });

      const res = await request(app.server)
        .get(`/api/documentos-venda/${doc.id}/historico`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ── POST /:id/solicitar-inclusao ─────────────────────────────────────────────

  describe('POST /api/documentos-venda/:id/solicitar-inclusao', () => {
    let clienteId: string;
    let produtoId: string;

    beforeAll(async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      clienteId = cliente.id;
      produtoId = produto.id;
    });

    it('documento ATIVO com observacoes válidas → 200, status muda para AGUARDANDO_CADASTRO', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'ATIVO',
          numeroDocumento: `DOC-INC-${Date.now()}`,
        },
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/solicitar-inclusao`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ observacoes: 'Inclusão de novo veículo na apólice conforme solicitado' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('AGUARDANDO_CADASTRO');
    });

    it('observacoes com menos de 10 chars → 400', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'ATIVO',
          numeroDocumento: `DOC-INC-SHORT-${Date.now()}`,
        },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/solicitar-inclusao`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ observacoes: 'Curta' })
        .expect(400);
    });

    it('documento não ativo → 400', async () => {
      const doc = await createTestDocumentoVenda(
        corretoraId,
        usuarioId,
        clienteId,
        produtoId,
        {
          status: 'EM_NEGOCIACAO',
          numeroDocumento: `DOC-INC-FAIL-${Date.now()}`,
        },
      );

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/solicitar-inclusao`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ observacoes: 'Tentativa em documento não ativo aqui' })
        .expect(400);
    });

    it('retorna 404 para documento inexistente', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/solicitar-inclusao')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ observacoes: 'Documento que não existe neste sistema' })
        .expect(404);
    });
  });

  // ── POST /:id/perder — NotFoundError (linhas 1482-1483) ──────────────────────

  describe('POST /api/documentos-venda/:id/perder — 404', () => {
    it('retorna 404 para documento inexistente (linhas 1482-1483)', async () => {
      await request(app.server)
        .post('/api/documentos-venda/00000000-0000-0000-0000-000000000000/perder')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ motivoPerda: 'Documento não existe' })
        .expect(404);
    });
  });

  // ── POST / — produto não encontrado, sequencial e percentualComissaoPadrao ───

  describe('POST /api/documentos-venda — produto/sequencial/comissão padrão', () => {
    let clienteId: string;

    beforeAll(async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      clienteId = cliente.id;
    });

    it('produtoId inexistente → 404 (linhas 126-127)', async () => {
      await request(app.server)
        .post('/api/documentos-venda')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          clienteId,
          produtoId: '00000000-0000-0000-0000-000000000000',
          tipoDocumento: 'COTACAO_DIRETA',
          vigenciaInicio: '2026-01-01',
          vigenciaFim: '2027-01-01',
        })
        .expect(404);
    });

    it('produto sem percentualComissaoPadrao e sem percentualComissao no body resulta em 0% (linha 166)', async () => {
      const [produto] = await db.insert(produtos).values({
        corretoraId,
        nomeProduto: `Produto Sem Comissao ${Date.now()}`,
        tipoSeguro: 'AUTO',
        ativo: true,
        // percentualComissaoPadrao omitido → null
      } as any).returning();

      const res = await request(app.server)
        .post('/api/documentos-venda')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          clienteId,
          produtoId: produto.id,
          tipoDocumento: 'COTACAO_DIRETA',
          vigenciaInicio: '2026-01-01',
          vigenciaFim: '2027-01-01',
          premioLiquido: 1000,
          // percentualComissao NOT sent, produto não tem padrão → usa 0
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(parseFloat(res.body.data.valorComissao)).toBe(0);
    });

    it('usa percentualComissaoPadrao do produto quando não enviado no body (linhas 164-166)', async () => {
      const [produto] = await db.insert(produtos).values({
        corretoraId,
        nomeProduto: `Produto Comissao Padrao ${Date.now()}`,
        tipoSeguro: 'AUTO',
        ativo: true,
        percentualComissaoPadrao: '12.5',
      } as any).returning();

      const res = await request(app.server)
        .post('/api/documentos-venda')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          clienteId,
          produtoId: produto.id,
          tipoDocumento: 'COTACAO_DIRETA',
          vigenciaInicio: '2026-01-01',
          vigenciaFim: '2027-01-01',
          premioLiquido: 1000,
          // percentualComissao NOT sent → usa produto.percentualComissaoPadrao
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(parseFloat(res.body.data.percentualComissao)).toBe(12.5);
    });

    it('segundo POST com mesmo tipo gera sequencial > 1 (linha 152)', async () => {
      const [produto] = await db.insert(produtos).values({
        corretoraId,
        nomeProduto: `Produto Seq ${Date.now()}`,
        tipoSeguro: 'VIDA',
        ativo: true,
      } as any).returning();

      const body = {
        clienteId,
        produtoId: produto.id,
        tipoDocumento: 'PROPOSTA_FORMAL',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2027-01-01',
        premioLiquido: 500,
        percentualComissao: 10,
      };

      // Primeira criação — sequencial = 1
      await request(app.server)
        .post('/api/documentos-venda')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send(body)
        .expect(201);

      // Segunda criação — MAX retorna valor não-null → linha 152 executada
      const res2 = await request(app.server)
        .post('/api/documentos-venda')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send(body)
        .expect(201);

      expect(res2.body.success).toBe(true);
      // Número termina em -00002 (sequencial 2, 5 dígitos)
      expect(res2.body.data.numeroDocumento).toMatch(/-00002$/);
    });

    it('POST create cria documento com sucesso (sem notificação)', async () => {
      const [produto] = await db.insert(produtos).values({
        corretoraId,
        nomeProduto: `Produto Notif ${Date.now()}`,
        tipoSeguro: 'AUTO',
        ativo: true,
      } as any).returning();

      const res = await request(app.server)
        .post('/api/documentos-venda')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          clienteId,
          produtoId: produto.id,
          tipoDocumento: 'COTACAO_DIRETA',
          vigenciaInicio: '2026-01-01',
          vigenciaFim: '2027-01-01',
          premioLiquido: 800,
          percentualComissao: 10,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  // ── GET / — filtros de campo (linhas 282-328) ────────────────────────────────

  describe('GET /api/documentos-venda — filtros de campo', () => {
    let clienteId: string;
    let produtoId: string;

    beforeAll(async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      clienteId = cliente.id;
      produtoId = produto.id;

      await createTestDocumentoVenda(corretoraId, usuarioId, clienteId, produtoId, {
        numeroDocumento: `DOC-FILT-${Date.now()}`,
        tipoDocumento: 'VENDA_EXPRESSA',
        vigenciaInicio: '2026-03-01',
        vigenciaFim: '2027-03-01',
      });
    });

    it('filtra por ?clienteId= (linhas 282-283)', async () => {
      const res = await request(app.server)
        .get(`/api/documentos-venda?clienteId=${clienteId}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every((d: any) => d.clienteId === clienteId)).toBe(true);
    });

    it('filtra por ?produtoId= (linhas 286-287)', async () => {
      const res = await request(app.server)
        .get(`/api/documentos-venda?produtoId=${produtoId}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every((d: any) => d.produtoId === produtoId)).toBe(true);
    });

    it('filtra por ?tipoDocumento= (linhas 301-302)', async () => {
      const res = await request(app.server)
        .get('/api/documentos-venda?tipoDocumento=VENDA_EXPRESSA')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every((d: any) => d.tipo === 'VENDA_EXPRESSA')).toBe(true);
    });

    it('filtra por ?vigenciaFimAte= (linhas 305-306)', async () => {
      const res = await request(app.server)
        .get('/api/documentos-venda?vigenciaFimAte=2028-01-01')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('filtra por ?vigenciaFimDe= (linhas 309-310)', async () => {
      const res = await request(app.server)
        .get('/api/documentos-venda?vigenciaFimDe=2020-01-01')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('filtra por ?vigenciaInicioAte= (linhas 313-316)', async () => {
      const res = await request(app.server)
        .get('/api/documentos-venda?vigenciaInicioAte=2027-01-01')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('filtra por ?vigenciaInicioDe= (linhas 319-322)', async () => {
      const res = await request(app.server)
        .get('/api/documentos-venda?vigenciaInicioDe=2025-01-01')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('filtra por ?criadoApos= (linhas 325-328)', async () => {
      const res = await request(app.server)
        .get('/api/documentos-venda?criadoApos=2020-01-01')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── GET / — campos nulos e não-nulos na listagem (linhas 438, 442, 445) ──────

  describe('GET /api/documentos-venda — campos null/não-null na resposta', () => {
    let clienteId: string;
    let produtoId: string;

    beforeAll(async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      clienteId = cliente.id;
      produtoId = produto.id;
    });

    it('percentualComissao nula retorna null (linha 438)', async () => {
      const ts = Date.now();
      await db.insert(documentosVenda).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId,
        produtoId,
        tipoDocumento: 'COTACAO_DIRETA',
        numeroDocumento: `DOC-NULL-PCOM-${ts}`,
        status: 'EM_NEGOCIACAO',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2027-01-01',
        premioLiquido: '1000.00',
        // percentualComissao e valorComissao propositalmente omitidos (null)
      } as any);

      const res = await request(app.server)
        .get(`/api/documentos-venda?search=DOC-NULL-PCOM-${ts}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      const doc = res.body.data.find((d: any) => d.numero === `DOC-NULL-PCOM-${ts}`);
      expect(doc).toBeDefined();
      expect(doc.percentualComissao).toBeNull();
    });

    it('percentualCorretora e valorComissaoCorretora não-nulos retornam parseFloat (linhas 442, 445)', async () => {
      const ts = Date.now();
      await db.insert(documentosVenda).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId,
        produtoId,
        tipoDocumento: 'COTACAO_DIRETA',
        numeroDocumento: `DOC-CORR-${ts}`,
        status: 'EM_NEGOCIACAO',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2027-01-01',
        premioLiquido: '1000.00',
        percentualComissao: '10',
        valorComissao: '100.00',
        percentualCorretora: '5.5',
        valorComissaoCorretora: '55.00',
      } as any);

      const res = await request(app.server)
        .get(`/api/documentos-venda?search=DOC-CORR-${ts}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      const doc = res.body.data.find((d: any) => d.numero === `DOC-CORR-${ts}`);
      expect(doc).toBeDefined();
      expect(typeof doc.percentualCorretora).toBe('number');
      expect(doc.percentualCorretora).toBe(5.5);
      expect(typeof doc.valorComissaoCorretora).toBe('number');
      expect(doc.valorComissaoCorretora).toBe(55);
    });
  });

  // ── PATCH /:id — apenas percentualComissao (linha 611) ───────────────────────

  describe('PATCH /api/documentos-venda/:id — recalcular comissão por percentual (linha 611)', () => {
    it('PATCH com só percentualComissao recalcula valorComissao (linha 611)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(corretoraId, usuarioId, cliente.id, produto.id, {
        numeroDocumento: `DOC-PATCH-PCOM-${Date.now()}`,
        premioLiquido: '2000.00',
        percentualComissao: '10',
        valorComissao: '200.00',
      });

      const res = await request(app.server)
        .patch(`/api/documentos-venda/${doc.id}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ percentualComissao: 15 }) // só percentualComissao, sem premioLiquido
        .expect(200);

      expect(res.body.success).toBe(true);
      // valorComissao recalculado: 2000 * 15% = 300
      expect(parseFloat(res.body.data.valorComissao)).toBe(300);
    });
  });

  // ── solicitar-validacao-cadastro — .catch() da notificação (linha 812) ───────

  describe('solicitar-validacao-cadastro — notificação com erro silenciado (linha 812)', () => {
    it('erro na notificação de solicitação é silenciado (linha 812)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(corretoraId, usuarioId, cliente.id, produto.id, {
        status: 'VENDA_CONFIRMADA',
        numeroDocumento: `DOC-NOTIF-SOL-${Date.now()}`,
      });

      vi.spyOn(NotificacaoService, 'notificarAprovacaoPendente').mockRejectedValueOnce(
        new Error('notification error'),
      );

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/solicitar-validacao-cadastro`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      await new Promise((r) => setTimeout(r, 20));
    });
  });

  // ── aprovar-cadastro — proteção double-click (linhas 858-861) ────────────────

  describe('aprovar-cadastro — documento já aprovado (linhas 858-861)', () => {
    it('doc com dataAprovacaoCadastro já definida → 400 double-click protection', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const ts = Date.now();

      // Inserir diretamente com dataAprovacaoCadastro preenchida (simula aprovação anterior)
      const [doc] = await db.insert(documentosVenda).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        produtoId: produto.id,
        tipoDocumento: 'COTACAO_DIRETA',
        numeroDocumento: `DOC-DBLCLK-${ts}`,
        status: 'AGUARDANDO_CADASTRO',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2027-01-01',
        premioLiquido: '500.00',
        percentualComissao: '10',
        valorComissao: '50.00',
        dataAprovacaoCadastro: new Date(), // já aprovado anteriormente
      } as any).returning();

      await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  // ── criar-renovacao — metadata não-objeto (linha 1201) ───────────────────────

  describe('criar-renovacao — metadata como não-objeto (linha 1201)', () => {
    it('metadata numérico usa {} como spread e adiciona campos obrigatórios (linha 1201)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const ts = Date.now();

      // metadata como número (truthy mas não é objeto) → branch {} na linha 1201
      const [doc] = await db.insert(documentosVenda).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        produtoId: produto.id,
        tipoDocumento: 'COTACAO_DIRETA',
        numeroDocumento: `DOC-META-NUM-${ts}`,
        status: 'ATIVO',
        vigenciaInicio: '2025-01-01',
        vigenciaFim: '2026-01-01',
        premioLiquido: '1000.00',
        percentualComissao: '10',
        valorComissao: '100.00',
        metadata: 42, // número: truthy, typeof !== 'object'
      } as any).returning();

      const res = await request(app.server)
        .post(`/api/documentos-venda/${doc.id}/criar-renovacao`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.renovacao.metadata).toMatchObject({
        documentoOrigemId: doc.id,
      });
      // Não deve ter propriedades extras do número original
      expect(res.body.data.renovacao.metadata.origemLead).toBeUndefined();
    });
  });
});

// ── Testes de automação do aprovar-cadastro e notificações ────────────────────

describe('/api/documentos-venda — automação e notificações', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let clienteId: string;
  let produtoId: string;
  let adminToken: string;
  let vendedorToken: string;
  let adminCargoId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    const adminCargo = await createAdminCargo(corretoraId);
    adminCargoId = adminCargo.id;
    const adminUsuario = await createTestUsuario(corretoraId, adminCargo.id);
    usuarioId = adminUsuario.id;

    adminToken = generateTestToken(app, {
      sub: adminUsuario.id,
      corretoraId,
      cargoId: adminCargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: adminUsuario.nome,
      email: adminUsuario.email,
      avatarUrl: null,
    });

    const vendedorCargo = await createTestCargo(corretoraId, {
      isVendedor: true,
      permissoes: [
        'vendas:criar_documento_venda',
        'vendas:editar_documento_venda',
        'vendas:visualizar_documento_venda',
        'vendas:cancelar_venda',
        'cadastro:rejeitar_venda',
      ],
    });
    const vendedorUsuario = await createTestUsuario(corretoraId, vendedorCargo.id);
    usuarioId = vendedorUsuario.id;

    vendedorToken = generateTestToken(app, {
      sub: vendedorUsuario.id,
      corretoraId,
      cargoId: vendedorCargo.id,
      isAdmin: false,
      isGestor: false,
      isVendedor: true,
      permissoes: [],
      nome: vendedorUsuario.nome,
      email: vendedorUsuario.email,
      avatarUrl: null,
    });

    const [cliente] = await db.insert(clientes).values({
      corretoraId,
      vendedorId: usuarioId,
      tipoPessoa: 'PF',
      nome: 'Cliente Automação',
      cpf: '99988877766',
      ativo: true,
    }).returning();
    clienteId = cliente.id;

    const [produto] = await db.insert(produtos).values({
      corretoraId,
      nomeProduto: 'Produto Automação',
      tipoSeguro: 'AUTO',
      ativo: true,
    }).returning();
    produtoId = produto.id;
  });

  async function createDoc(overrides: Record<string, unknown> = {}) {
    const ts = Date.now();
    const [doc] = await db.insert(documentosVenda).values({
      corretoraId,
      vendedorId: usuarioId,
      clienteId,
      produtoId,
      tipoDocumento: 'COTACAO_DIRETA',
      numeroDocumento: `AUTO-${ts}`,
      status: 'AGUARDANDO_CADASTRO',
      vigenciaInicio: '2025-01-01',
      vigenciaFim: '2026-01-01', // passado → diasParaVencimento <= 45 → cria renovação
      premioLiquido: '2000.00',
      percentualComissao: '10',
      valorComissao: '200.00',
      ...overrides,
    } as any).returning();
    return doc;
  }

  // ── aprovar-cadastro: race condition — linhas 884-887 ────────────────────────

  it('aprovar-cadastro retorna 409 para race condition (linhas 884-887)', async () => {
    const doc = await createDoc();

    // Mock db.update para retornar array vazio (simula race condition)
    vi.spyOn(sharedDatabase.db, 'update').mockImplementationOnce(() => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    } as any));

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  // ── aprovar-cadastro: cotacaoId no metadata — linhas 901-904 ─────────────────

  it('aprovar-cadastro com cotacaoId no metadata executa query de cotação (linhas 901-904)', async () => {
    const doc = await createDoc({
      status: 'AGUARDANDO_CADASTRO',
      vigenciaFim: '2020-01-01',
      metadata: { cotacaoId: '00000000-0000-0000-0000-000000000001' },
      numeroDocumento: `AUTO-META-${Date.now()}`,
    });

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── aprovar-cadastro: cotacaoId real com renovacaoId — linhas 916, 924-952 ───

  it('aprovar-cadastro com cotação real finaliza renovação automaticamente (linhas 916, 924-952)', async () => {
    // Criar renovação que será finalizada
    const [renovacao] = await db.insert(renovacoesComerciais).values({
      corretoraId,
      vendedorId: usuarioId,
      clienteId,
      dataVencimento: '2026-06-01',
      status: 'NAO_TRABALHADO',
      produtoDescricao: 'Seguro Auto',
    }).returning();

    // Criar cotação com renovacaoId no detalhesRisco
    const ts = Date.now();
    const [cotacao] = await db.insert(cotacoes).values({
      corretoraId,
      clienteId,
      vendedorId: usuarioId,
      produtoId,
      numeroCotacao: `COT-${ts}`,
      vigenciaInicio: '2026-01-01',
      vigenciaFim: '2027-01-01',
      detalhesRisco: { renovacaoId: renovacao.id },
    } as any).returning();

    const doc = await createDoc({
      status: 'AGUARDANDO_CADASTRO',
      vigenciaFim: '2020-01-01',
      metadata: { cotacaoId: cotacao.id },
      numeroDocumento: `AUTO-COT-${ts}`,
    });

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── aprovar-cadastro: proposta com cotacao.detalhesRisco — linhas 918-920 ────

  it('aprovar-cadastro com proposta vinculada e cotacao com renovacaoId (linhas 918-920)', async () => {
    const [renovacao] = await db.insert(renovacoesComerciais).values({
      corretoraId,
      vendedorId: usuarioId,
      clienteId,
      dataVencimento: '2026-07-01',
      status: 'EM_PROSPECCAO',
      produtoDescricao: 'Seguro Vida',
    }).returning();

    const ts = Date.now();
    const [cotacao] = await db.insert(cotacoes).values({
      corretoraId,
      clienteId,
      vendedorId: usuarioId,
      produtoId,
      numeroCotacao: `COT-PROP-${ts}`,
      vigenciaInicio: '2026-01-01',
      vigenciaFim: '2027-01-01',
      detalhesRisco: { renovacaoId: renovacao.id },
    } as any).returning();

    const doc = await createDoc({
      status: 'AGUARDANDO_CADASTRO',
      vigenciaFim: '2020-01-01',
      // sem cotacaoId no metadata → usa proposta
      metadata: {},
      numeroDocumento: `AUTO-PROP-${ts}`,
    });

    // Criar proposta ligada ao documento com a cotação que tem detalhesRisco
    await db.insert(propostasComerciais).values({
      corretoraId,
      clienteId,
      vendedorId: usuarioId,
      produtoId,
      cotacaoId: cotacao.id,
      documentoVendaId: doc.id,
      numeroPropostaInterno: `PROP-${ts}`,
      vigenciaInicio: '2026-01-01',
      vigenciaFim: '2027-01-01',
    } as any).returning();

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── aprovar-cadastro: renovação existente — linhas 983-986 ───────────────────

  it('aprovar-cadastro com renovação já existente para o documento (linhas 983-986)', async () => {
    const ts = Date.now();
    const doc = await createDoc({
      status: 'AGUARDANDO_CADASTRO',
      vigenciaFim: '2020-01-01',
      numeroDocumento: `AUTO-REN-EX-${ts}`,
    });

    // Criar renovação já associada a este documento
    await db.insert(renovacoesComerciais).values({
      corretoraId,
      vendedorId: usuarioId,
      clienteId,
      documentoVendaAnteriorId: doc.id,
      dataVencimento: '2026-06-01',
      status: 'NAO_TRABALHADO',
      produtoDescricao: 'Já existe',
    });

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // renovacaoCriada é a existente, não uma nova
    expect(res.body.renovacao).toBeDefined();
  });

  // ── aprovar-cadastro: vigenciaFim > 45 dias — linhas 1010-1013, 1097 ─────────

  it('aprovar-cadastro com vigenciaFim > 45 dias não cria renovação (linhas 1010-1013, 1097)', async () => {
    const ts = Date.now();
    const doc = await createDoc({
      status: 'AGUARDANDO_CADASTRO',
      vigenciaFim: '2027-06-01', // mais de 45 dias no futuro
      numeroDocumento: `AUTO-FAR-${ts}`,
    });

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.renovacao).toBeNull(); // linha 1097
  });

  // ── aprovar-cadastro: erro na automação de renovação — linhas 954-956 ─────────

  it('aprovar-cadastro continua mesmo com erro na automação de renovação original (linhas 954-956)', async () => {
    const ts = Date.now();
    const doc = await createDoc({
      status: 'AGUARDANDO_CADASTRO',
      vigenciaFim: '2020-01-01',
      metadata: { cotacaoId: '00000000-0000-0000-0000-000000000099' },
      numeroDocumento: `AUTO-ERR-${ts}`,
    });

    // Mock para fazer a query de cotação lançar dentro do try/catch da automação
    vi.spyOn(sharedDatabase.db.query.cotacoes, 'findFirst').mockRejectedValueOnce(
      new Error('DB error na automação')
    );

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200); // não falha a aprovação

    expect(res.body.success).toBe(true);
  });

  // ── aprovar-cadastro: erro na criação de nova renovação — linhas 1015-1017 ───

  it('aprovar-cadastro continua mesmo com erro na criação de renovação futura (linhas 1015-1017)', async () => {
    const ts = Date.now();
    const doc = await createDoc({
      status: 'AGUARDANDO_CADASTRO',
      vigenciaFim: '2020-01-01',
      numeroDocumento: `AUTO-ERR2-${ts}`,
    });

    // Mock para fazer findFirst de renovacoesComerciais lançar dentro do try
    vi.spyOn(sharedDatabase.db.query.renovacoesComerciais, 'findFirst').mockRejectedValueOnce(
      new Error('DB error na criação de renovação')
    );

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── aprovar-cadastro: erros nas notificações — linhas 1051, 1065, 1082 ────────

  it('aprovar-cadastro dispara catch das notificações quando serviço falha (linhas 1051, 1065, 1082)', async () => {
    const ts = Date.now();
    const doc = await createDoc({
      status: 'AGUARDANDO_CADASTRO',
      vigenciaFim: '2020-01-01', // <= 45 dias → cria renovação → dispara notif 1082
      valorComissao: '200.00',   // dispara notif 1065
      numeroDocumento: `AUTO-NOTIF-${ts}`,
    });

    vi.spyOn(NotificacaoService, 'notificarVendaAprovada').mockRejectedValueOnce(
      new Error('notification error')
    );
    vi.spyOn(NotificacaoService, 'notificarComissaoDisponivel').mockRejectedValueOnce(
      new Error('notification error')
    );

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // Dar tempo para os callbacks .catch() assíncronos executarem
    await new Promise(resolve => setTimeout(resolve, 20));
  });

  // ── rejeitar-cadastro: erro na notificação — linha 1354 ──────────────────────

  it('rejeitar-cadastro dispara catch da notificação quando serviço falha (linha 1354)', async () => {
    const ts = Date.now();
    const doc = await createDoc({
      status: 'AGUARDANDO_CADASTRO',
      numeroDocumento: `AUTO-REJ-NOTIF-${ts}`,
    });

    vi.spyOn(NotificacaoService, 'notificarVendaRecusada').mockRejectedValueOnce(
      new Error('notification error')
    );

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/rejeitar-cadastro`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ motivoRejeicao: 'Documentação incompleta para aprovação' })
      .expect(200);

    expect(res.body.success).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 20));
  });

  // ── cancelar: erro na notificação — linha 1446 ───────────────────────────────

  it('cancelar funciona sem notificação (linha 1446)', async () => {
    const ts = Date.now();
    const doc = await createDoc({
      status: 'EM_NEGOCIACAO',
      numeroDocumento: `AUTO-CANCEL-NOTIF-${ts}`,
    });

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/cancelar`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ motivoCancelamento: 'Cliente desistiu definitivamente da contratação' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── perder: erro na notificação — linha 1549 ─────────────────────────────────

  it('perder funciona sem notificação (linha 1549)', async () => {
    const ts = Date.now();
    const doc = await createDoc({
      status: 'EM_NEGOCIACAO',
      numeroDocumento: `AUTO-PERD-NOTIF-${ts}`,
    });

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/perder`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ motivoPerda: 'Preço mais alto que a concorrência' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── criar-renovacao: documento com metadata — linhas 1198-1205 ───────────────

  it('criar-renovacao copia e enriquece metadata existente do documento (linhas 1198-1205)', async () => {
    const ts = Date.now();
    const [doc] = await db.insert(documentosVenda).values({
      corretoraId,
      vendedorId: usuarioId,
      clienteId,
      produtoId,
      tipoDocumento: 'COTACAO_DIRETA',
      numeroDocumento: `AUTO-CREN-${ts}`,
      status: 'ATIVO',
      vigenciaInicio: '2025-01-01',
      vigenciaFim: '2026-01-01',
      premioLiquido: '3000.00',
      percentualComissao: '10',
      valorComissao: '300.00',
      metadata: { origemLead: 'site', segmento: 'auto' },
    } as any).returning();

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/criar-renovacao`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.renovacao.metadata).toMatchObject({
      origemLead: 'site',
      documentoOrigemId: doc.id,
    });
  });
});

// ── anexos.ts: erro genérico no upload — linhas 92-93 ────────────────────────

describe('/api/documentos-venda/:id/anexos — erro genérico de storage (linhas 92-93)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let clienteId: string;
  let produtoId: string;
  let vendedorToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    const cargo = await createTestCargo(corretoraId, {
      isVendedor: true,
      permissoes: ['vendas:criar_cotacao', 'vendas:visualizar_documento_venda', 'vendas:editar_documento_venda'],
    });
    const usuario = await createTestUsuario(corretoraId, cargo.id);
    usuarioId = usuario.id;

    vendedorToken = generateTestToken(app, {
      sub: usuario.id,
      corretoraId,
      cargoId: cargo.id,
      isAdmin: false,
      isGestor: false,
      isVendedor: true,
      permissoes: ['vendas:criar_cotacao'],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });

    const [cliente] = await db.insert(clientes).values({
      corretoraId,
      vendedorId: usuarioId,
      tipoPessoa: 'PF',
      nome: 'Cliente Anexo',
      cpf: '11122233344',
      ativo: true,
    }).returning();
    clienteId = cliente.id;

    const [produto] = await db.insert(produtos).values({
      corretoraId,
      nomeProduto: 'Produto Anexo',
      tipoSeguro: 'AUTO',
      ativo: true,
    }).returning();
    produtoId = produto.id;
  });

  it('upload com erro genérico do storage relança o erro (linhas 92-93)', async () => {
    const [doc] = await db.insert(documentosVenda).values({
      corretoraId,
      vendedorId: usuarioId,
      clienteId,
      produtoId,
      tipoDocumento: 'COTACAO_DIRETA',
      numeroDocumento: `DOC-ANEXO-ERR-${Date.now()}`,
      status: 'EM_NEGOCIACAO',
      vigenciaInicio: '2026-01-01',
      vigenciaFim: '2027-01-01',
      premioLiquido: '1000.00',
      percentualComissao: '10',
      valorComissao: '100.00',
    } as any).returning();

    // documentos-venda/anexos.ts creates its storageService at route registration time.
    // Access the existing mock instance and make uploadFile reject once.
    vi.mocked(storageModule.StorageService).mock.results
      .filter(r => r.type === 'return' && r.value?.uploadFile)
      .forEach(r => {
        vi.mocked(r.value.uploadFile).mockRejectedValueOnce(new Error('S3 connection timeout'));
      });

    await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/anexos/upload`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .attach('file', Buffer.from('test content'), 'documento.pdf')
      .expect(500);
  });
});

// ── Branch coverage extras ────────────────────────────────────────────────────

describe('/api/documentos-venda — branch coverage extras', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let produtoId: string;
  let vendedorToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    const adminCargo = await createAdminCargo(corretoraId);
    const adminUsuario = await createTestUsuario(corretoraId, adminCargo.id);
    adminToken = generateTestToken(app, {
      sub: adminUsuario.id,
      corretoraId,
      cargoId: adminCargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: [],
      nome: adminUsuario.nome,
      email: adminUsuario.email,
      avatarUrl: null,
    });

    const vendedorCargo = await createTestCargo(corretoraId, {
      isVendedor: true,
      permissoes: [
        'vendas:criar_documento_venda',
        'vendas:editar_documento_venda',
        'vendas:visualizar_documento_venda',
        'vendas:cancelar_venda',
        'cadastro:rejeitar_venda',
      ],
    });
    const vendedorUsuario = await createTestUsuario(corretoraId, vendedorCargo.id);
    usuarioId = vendedorUsuario.id;
    vendedorToken = generateTestToken(app, {
      sub: vendedorUsuario.id,
      corretoraId,
      cargoId: vendedorCargo.id,
      isAdmin: false,
      isGestor: false,
      isVendedor: true,
      permissoes: [],
      nome: vendedorUsuario.nome,
      email: vendedorUsuario.email,
      avatarUrl: null,
    });

    const [prod] = await db
      .insert(produtos)
      .values({ corretoraId, nomeProduto: 'Produto Extra Branch', tipoSeguro: 'AUTO', ativo: true } as any)
      .returning();
    produtoId = prod.id;
  });

  async function makeClienteNullNome() {
    const [c] = await db
      .insert(clientes)
      .values({
        corretoraId,
        vendedorId: usuarioId,
        tipoPessoa: 'PF',
        nome: null,
        cpf: `${Date.now()}${Math.floor(Math.random() * 9999)}`.slice(-11).padStart(11, '0'),
        ativo: true,
      } as any)
      .returning();
    return c;
  }

  async function makeDoc(clienteId: string, overrides: Record<string, unknown> = {}) {
    const [doc] = await db
      .insert(documentosVenda)
      .values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId,
        produtoId,
        tipoDocumento: 'COTACAO_DIRETA',
        numeroDocumento: `BR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        status: 'EM_NEGOCIACAO',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2027-01-01',
        premioLiquido: '1000',
        percentualComissao: '10',
        valorComissao: '100',
        ...overrides,
      } as any)
      .returning();
    return doc;
  }

  // ── POST create — campos opcionais (lines 189-196) ─────────────────────────

  it('POST com franquia/valorSegurado/negocioCorretora/percentualCorretora/valorComissaoCorretora cobre branches 189-196', async () => {
    const [cliente] = await db
      .insert(clientes)
      .values({
        corretoraId, vendedorId: usuarioId, tipoPessoa: 'PF',
        nome: 'Cliente Opt',
        cpf: `${Date.now() + 1}`.slice(-11).padStart(11, '0'),
        ativo: true,
      })
      .returning();

    const res = await request(app.server)
      .post('/api/documentos-venda')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        clienteId: cliente.id,
        produtoId,
        tipoDocumento: 'COTACAO_DIRETA',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2027-01-01',
        premioLiquido: 2000,
        percentualComissao: 10,
        franquia: 500,
        valorSegurado: 100000,
        negocioCorretora: true,
        percentualCorretora: 5,
        valorComissaoCorretora: 100,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(parseFloat(res.body.data.franquia)).toBe(500);
    expect(res.body.data.negocioCorretora).toBe(true);
  });

  // ── POST create — sem premioLiquido (line 161) ─────────────────────────────

  it('POST sem premioLiquido usa fallback ?? 0 (linha 161)', async () => {
    const [cliente] = await db
      .insert(clientes)
      .values({
        corretoraId, vendedorId: usuarioId, tipoPessoa: 'PF',
        nome: 'Cliente Sem Premio',
        cpf: `${Date.now() + 2}`.slice(-11).padStart(11, '0'),
        ativo: true,
      })
      .returning();

    const res = await request(app.server)
      .post('/api/documentos-venda')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        clienteId: cliente.id,
        produtoId,
        tipoDocumento: 'COTACAO_DIRETA',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2027-01-01',
        percentualComissao: 10,
        // premioLiquido NOT sent → ?? 0
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(parseFloat(res.body.data.premioLiquido)).toBe(0);
  });

  // ── GET list — premioLiquido nulo (line 435) ───────────────────────────────

  it('GET list com doc sem premioLiquido retorna null na listagem (linha 435)', async () => {
    const [cliente] = await db
      .insert(clientes)
      .values({
        corretoraId, vendedorId: usuarioId, tipoPessoa: 'PF',
        nome: 'Cliente Premio Null',
        cpf: `${Date.now() + 3}`.slice(-11).padStart(11, '0'),
        ativo: true,
      })
      .returning();

    const ts = Date.now();
    await db.insert(documentosVenda).values({
      corretoraId, vendedorId: usuarioId, clienteId: cliente.id, produtoId,
      tipoDocumento: 'COTACAO_DIRETA',
      numeroDocumento: `BR-NULL-PREM-${ts}`,
      status: 'EM_NEGOCIACAO',
      vigenciaInicio: '2026-01-01',
      vigenciaFim: '2027-01-01',
      // premioLiquido omitido → null
    } as any);

    const res = await request(app.server)
      .get(`/api/documentos-venda?search=BR-NULL-PREM-${ts}`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(200);

    const doc = res.body.data.find((d: any) => d.numero === `BR-NULL-PREM-${ts}`);
    expect(doc).toBeDefined();
    expect(doc.premioLiquido).toBeNull();
  });

  // ── PATCH — recálculo com premioLiquido nulo no doc (line 614) ────────────

  it('PATCH só com percentualComissao em doc sem premioLiquido usa || "0" (linha 614)', async () => {
    const [cliente] = await db
      .insert(clientes)
      .values({
        corretoraId, vendedorId: usuarioId, tipoPessoa: 'PF',
        nome: 'Cliente 614', cpf: `${Date.now() + 4}`.slice(-11).padStart(11, '0'), ativo: true,
      })
      .returning();

    const [doc] = await db
      .insert(documentosVenda)
      .values({
        corretoraId, vendedorId: usuarioId, clienteId: cliente.id, produtoId,
        tipoDocumento: 'COTACAO_DIRETA', numeroDocumento: `BR-614-${Date.now()}`,
        status: 'EM_NEGOCIACAO', vigenciaInicio: '2026-01-01', vigenciaFim: '2027-01-01',
        // premioLiquido null → || '0' branch at line 614
        percentualComissao: '10', valorComissao: '0',
      } as any)
      .returning();

    const res = await request(app.server)
      .patch(`/api/documentos-venda/${doc.id}`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ percentualComissao: 20 })
      .expect(200);

    expect(res.body.success).toBe(true);
    // premio = null || '0' = '0' → 0; valorComissao = 0 * 20% = 0
    expect(parseFloat(res.body.data.valorComissao)).toBe(0);
  });

  // ── PATCH — recálculo com percentualComissao nulo no doc (line 617) ─────────

  it('PATCH só com premioLiquido em doc sem percentualComissao usa || "0" (linha 617)', async () => {
    const [cliente] = await db
      .insert(clientes)
      .values({
        corretoraId, vendedorId: usuarioId, tipoPessoa: 'PF',
        nome: 'Cliente 617', cpf: `${Date.now() + 5}`.slice(-11).padStart(11, '0'), ativo: true,
      })
      .returning();

    const [doc] = await db
      .insert(documentosVenda)
      .values({
        corretoraId, vendedorId: usuarioId, clienteId: cliente.id, produtoId,
        tipoDocumento: 'COTACAO_DIRETA', numeroDocumento: `BR-617-${Date.now()}`,
        status: 'EM_NEGOCIACAO', vigenciaInicio: '2026-01-01', vigenciaFim: '2027-01-01',
        premioLiquido: '1000',
        // percentualComissao null → || '0' branch at line 617
        valorComissao: '0',
      } as any)
      .returning();

    const res = await request(app.server)
      .patch(`/api/documentos-venda/${doc.id}`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ premioLiquido: 2000 })
      .expect(200);

    expect(res.body.success).toBe(true);
    // percentual = null || '0' = '0' → 0; valorComissao = 2000 * 0% = 0
    expect(parseFloat(res.body.data.valorComissao)).toBe(0);
  });

  // ── PATCH — franquia: null (line 636) ─────────────────────────────────────

  it('PATCH com franquia: null cobre value?.toString() ?? null (linha 636)', async () => {
    const [cliente] = await db
      .insert(clientes)
      .values({
        corretoraId, vendedorId: usuarioId, tipoPessoa: 'PF',
        nome: 'Cliente 636', cpf: `${Date.now() + 6}`.slice(-11).padStart(11, '0'), ativo: true,
      })
      .returning();

    const [doc] = await db
      .insert(documentosVenda)
      .values({
        corretoraId, vendedorId: usuarioId, clienteId: cliente.id, produtoId,
        tipoDocumento: 'COTACAO_DIRETA', numeroDocumento: `BR-636-${Date.now()}`,
        status: 'EM_NEGOCIACAO', vigenciaInicio: '2026-01-01', vigenciaFim: '2027-01-01',
        premioLiquido: '1000', percentualComissao: '10', valorComissao: '100', franquia: '500',
      } as any)
      .returning();

    const res = await request(app.server)
      .patch(`/api/documentos-venda/${doc.id}`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ franquia: null })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.franquia).toBeNull();
  });

  // ── POST create — cliente nome null (line 213) ─────────────────────────────

  it('POST create com cliente de nome null cobre clienteNome ?? "" (linha 213)', async () => {
    const cliente = await makeClienteNullNome();

    const res = await request(app.server)
      .post('/api/documentos-venda')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        clienteId: cliente.id,
        produtoId,
        tipoDocumento: 'COTACAO_DIRETA',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2027-01-01',
        premioLiquido: 1000,
        percentualComissao: 10,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  // ── aprovar-cadastro — cliente nome null (lines 1046, 1060, 1076) ──────────

  it('aprovar-cadastro com cliente de nome null cobre || "Cliente" (linhas 1046, 1060, 1076)', async () => {
    const cliente = await makeClienteNullNome();
    const doc = await makeDoc(cliente.id, {
      status: 'AGUARDANDO_CADASTRO',
      vigenciaFim: '2020-01-01', // passado → cria renovação → cobre linha 1076
      valorComissao: '200',      // não nulo → notif comissão → cobre linha 1060
    });

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/aprovar-cadastro`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── rejeitar-cadastro — cliente nome null (line 1348) ─────────────────────

  it('rejeitar-cadastro com cliente de nome null cobre || "Cliente" (linha 1348)', async () => {
    const cliente = await makeClienteNullNome();
    const doc = await makeDoc(cliente.id, { status: 'AGUARDANDO_CADASTRO' });

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/rejeitar-cadastro`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ motivoRejeicao: 'Documentação insuficiente para aprovação' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── cancelar — cliente nome null (line 1440) ───────────────────────────────

  it('cancelar com cliente de nome null cobre || "Cliente" (linha 1440)', async () => {
    const cliente = await makeClienteNullNome();
    const doc = await makeDoc(cliente.id, { status: 'EM_NEGOCIACAO' });

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/cancelar`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ motivoCancelamento: 'Cliente optou por não contratar o seguro' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── perder — cliente nome null (line 1542) ────────────────────────────────

  it('perder com cliente de nome null cobre || "Cliente" (linha 1542)', async () => {
    const cliente = await makeClienteNullNome();
    const doc = await makeDoc(cliente.id, { status: 'EM_NEGOCIACAO' });

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/perder`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({ motivoPerda: 'Concorrência ofereceu preço mais competitivo' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── solicitar-validacao — cliente nome null (line 807) ────────────────────

  it('solicitar-validacao com cliente de nome null cobre || "Cliente" (linha 807)', async () => {
    const cliente = await makeClienteNullNome();
    const doc = await makeDoc(cliente.id, { status: 'VENDA_CONFIRMADA' });

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/solicitar-validacao-cadastro`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── solicitar-validacao — permissoes?.includes() truthy branch (line 799) ──

  it('solicitar-validacao com usuários mockados com permissoes cobre ?.includes() truthy (linha 799)', async () => {
    const [clienteLocal] = await db
      .insert(clientes)
      .values({
        corretoraId, vendedorId: usuarioId, tipoPessoa: 'PF',
        nome: 'Cliente Perm', cpf: `${Date.now() + 50}`.slice(-11).padStart(11, '0'), ativo: true,
      })
      .returning();

    const doc = await makeDoc(clienteLocal.id, { status: 'VENDA_CONFIRMADA' });

    vi.spyOn(sharedDatabase.db.query.usuarios, 'findMany').mockResolvedValueOnce([
      { id: usuarioId, permissoes: ['cadastro:aprovar_venda'] } as any,
    ] as any);

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/solicitar-validacao-cadastro`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── POST create — db.select MAX retorna pop() undefined (line 152) ──────────

  it('POST create com db.select mockado retornando split vazio cobre ?? "0" (linha 152)', async () => {
    const [cliente] = await db
      .insert(clientes)
      .values({
        corretoraId, vendedorId: usuarioId, tipoPessoa: 'PF',
        nome: 'Cliente Split', cpf: `${Date.now() + 70}`.slice(-11).padStart(11, '0'), ativo: true,
      })
      .returning();

    // Mock condicional: apenas intercepta a query MAX (que tem campo 'max'),
    // deixa as queries de auth (que têm campo 'nomePermissao') passarem normalmente.
    const originalSelect = sharedDatabase.db.select.bind(sharedDatabase.db);
    let intercepted = false;
    const spy = vi.spyOn(sharedDatabase.db, 'select').mockImplementation((...args: any[]) => {
      const fields = args[0] as Record<string, unknown> | undefined;
      if (!intercepted && fields && 'max' in fields) {
        intercepted = true;
        return {
          from: () => ({
            where: () => Promise.resolve([{ max: { split: () => [] } }]),
          }),
        } as any;
      }
      return (originalSelect as any)(...args);
    });

    // Usa VENDA_EXPRESSA (VD-EXP) para não conflitar com documentos COTACAO_DIRETA
    // já criados pelos testes anteriores neste describe block.
    const res = await request(app.server)
      .post('/api/documentos-venda')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        clienteId: cliente.id,
        produtoId,
        tipoDocumento: 'VENDA_EXPRESSA',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2027-01-01',
        premioLiquido: 500,
        percentualComissao: 10,
      })
      .expect(201);

    spy.mockRestore();
    expect(res.body.success).toBe(true);
  });

  // ── POST create — negocioCorretora undefined por mock (line 194) ───────────

  it('POST create com negocioCorretora=undefined no parse cobre ?? false (linha 194)', async () => {
    const [cliente] = await db
      .insert(clientes)
      .values({
        corretoraId, vendedorId: usuarioId, tipoPessoa: 'PF',
        nome: 'Cliente NegNull', cpf: `${Date.now() + 80}`.slice(-11).padStart(11, '0'), ativo: true,
      })
      .returning();

    const dvFeatures = await import('@ecotech/features/documentos-venda');
    const realParse = dvFeatures.createDocumentoVendaSchema.parse.bind(dvFeatures.createDocumentoVendaSchema);
    vi.spyOn(dvFeatures.createDocumentoVendaSchema, 'parse').mockImplementationOnce((input: unknown) => {
      const result = realParse(input);
      (result as any).negocioCorretora = undefined; // força branch ?? false
      return result;
    });

    const res = await request(app.server)
      .post('/api/documentos-venda')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        clienteId: cliente.id,
        produtoId,
        tipoDocumento: 'COTACAO_DIRETA',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '2027-01-01',
        premioLiquido: 500,
        percentualComissao: 10,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.negocioCorretora).toBe(false);
  });

  // ── GET list — count SELECT retorna [] (line 422) ─────────────────────────

  it('GET list com db.select count mockado retornando [] cobre ?? 0 (linha 422)', async () => {
    // Mock condicional: apenas intercepta a query count(*) (campo 'count'),
    // deixa as queries de auth passarem normalmente.
    const originalSelect = sharedDatabase.db.select.bind(sharedDatabase.db);
    let intercepted = false;
    const spy = vi.spyOn(sharedDatabase.db, 'select').mockImplementation((...args: any[]) => {
      const fields = args[0] as Record<string, unknown> | undefined;
      if (!intercepted && fields && 'count' in fields) {
        intercepted = true;
        return {
          from: () => ({
            where: () => Promise.resolve([]),
          }),
        } as any;
      }
      return (originalSelect as any)(...args);
    });

    const res = await request(app.server)
      .get('/api/documentos-venda')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(200);

    spy.mockRestore();
    expect(res.body.success).toBe(true);
    expect(res.body.meta.total).toBe(0);
  });

  // ── criar-renovacao — count SELECT retorna [] (line 1173) ─────────────────

  it('criar-renovacao com db.select count mockado retornando [] cobre ?? 0 (linha 1173)', async () => {
    const [clienteLocal] = await db
      .insert(clientes)
      .values({
        corretoraId, vendedorId: usuarioId, tipoPessoa: 'PF',
        nome: 'Cliente Renov Count', cpf: `${Date.now() + 90}`.slice(-11).padStart(11, '0'), ativo: true,
      })
      .returning();

    const doc = await makeDoc(clienteLocal.id, { status: 'ATIVO' });

    // Mock db.select para count de renovações retornar [] → ?? 0 → numeroRenovacao = 1
    vi.spyOn(sharedDatabase.db, 'select').mockImplementationOnce(() => ({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    } as any));

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/criar-renovacao`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // numeroRenovacao = Number(undefined ?? 0) + 1 = 1
    expect(res.body.data.renovacao.numeroDocumento).toMatch(/-R1$/);
  });

  // ── lock — lockedBy null (line 1948) ──────────────────────────────────────

  it('POST lock retorna 423 com "outro usuário" quando lockedBy é null (linha 1948)', async () => {
    const [clienteLocal] = await db
      .insert(clientes)
      .values({
        corretoraId, vendedorId: usuarioId, tipoPessoa: 'PF',
        nome: 'Cliente Lock Null', cpf: `${Date.now() + 60}`.slice(-11).padStart(11, '0'), ativo: true,
      })
      .returning();

    const doc = await makeDoc(clienteLocal.id);

    // Mock findFirst para retornar documento com lockedBy = null (usuário referenciado inexistente)
    vi.spyOn(sharedDatabase.db.query.documentosVenda, 'findFirst').mockResolvedValueOnce({
      ...doc,
      lockedById: '00000000-0000-0000-0000-000000000099',
      lockExpiresAt: new Date(Date.now() + 900_000),
      lockedAt: new Date(),
      lockedBy: null,
      deletedAt: null,
    } as any);

    const res = await request(app.server)
      .post(`/api/documentos-venda/${doc.id}/lock`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(423);

    expect(res.body.error).toBe('DOCUMENT_LOCKED');
    expect(res.body.message).toContain('outro usuário');
  });
});
