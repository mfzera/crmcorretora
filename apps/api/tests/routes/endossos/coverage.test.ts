import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  clientes,
  produtos,
  documentosVenda,
  endossos,
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
      nome: `Cliente Cov ${ts}`,
      cpf: String(ts).slice(-11).padStart(11, '0'),
      email: `cov.${ts}@teste.com`,
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
      nomeProduto: `Produto Cov ${ts}`,
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
      numeroDocumento: `COV-${ts}`,
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
      numeroEndosso: `COV-END-${ts}`,
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

describe('/api/endossos — coverage gaps', () => {
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

  // ── POST /externo (linhas 140–308) ──────────────────────────────────────────

  describe('POST /api/endossos/externo', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .post('/api/endossos/externo')
        .send({})
        .expect(401);
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

      await request(app.server)
        .post('/api/endossos/externo')
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          numeroPropostaExterna: 'EXT-001',
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: 1000,
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Endosso externo',
          dataVigenciaEndosso: '2025-06-01',
        })
        .expect(403);
    });

    it('cria endosso externo com campos válidos → 201 com documento e endosso', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const res = await request(app.server)
        .post('/api/endossos/externo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          numeroPropostaExterna: `EXT-${Date.now()}`,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: 1500,
          percentualComissao: 10,
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Endosso externo de teste',
          dataVigenciaEndosso: '2025-06-01',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('documento');
      expect(res.body.data).toHaveProperty('endosso');
    });

    it('documento criado tem status ATIVO', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const res = await request(app.server)
        .post('/api/endossos/externo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          numeroPropostaExterna: `EXT-ATIVO-${Date.now()}`,
          vigenciaInicio: '2025-02-01',
          vigenciaFim: '2026-01-31',
          premioLiquido: 2000,
          tipoEndosso: 'INCLUSAO_COBERTURA',
          descricao: 'Inclusão de cobertura externa',
          dataVigenciaEndosso: '2025-07-01',
        })
        .expect(201);

      expect(res.body.data.documento.status).toBe('ATIVO');
    });

    it('endosso criado tem status SOLICITADO', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const res = await request(app.server)
        .post('/api/endossos/externo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          numeroPropostaExterna: `EXT-SOL-${Date.now()}`,
          vigenciaInicio: '2025-03-01',
          vigenciaFim: '2026-02-28',
          premioLiquido: 3000,
          tipoEndosso: 'EXCLUSAO_COBERTURA',
          descricao: 'Exclusão de cobertura externa',
          dataVigenciaEndosso: '2025-08-01',
        })
        .expect(201);

      expect(res.body.data.endosso.status).toBe('SOLICITADO');
    });

    it('cria endosso externo com todos os campos opcionais preenchidos', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      const res = await request(app.server)
        .post('/api/endossos/externo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          numeroPropostaExterna: `EXT-FULL-${Date.now()}`,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: 5000,
          percentualComissao: 12,
          observacoesDocumento: 'Observação do documento',
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Endosso externo completo',
          motivoEndosso: 'Ajuste de cobertura',
          premioNovo: 5500,
          percentualComissaoNovo: 13,
          dataVigenciaEndosso: '2025-06-15',
          observacoesEndosso: 'Observação do endosso',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.documento.status).toBe('ATIVO');
      expect(res.body.data.endosso.status).toBe('SOLICITADO');
      expect(res.body.data.endosso.tipoEndosso).toBe('ALTERACAO_VALOR');
    });

    it('retorna 404 para clienteId inexistente', async () => {
      const produto = await createTestProduto(corretoraId);

      await request(app.server)
        .post('/api/endossos/externo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: '00000000-0000-0000-0000-000000000000',
          produtoId: produto.id,
          numeroPropostaExterna: `EXT-404C-${Date.now()}`,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: 1000,
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Teste cliente inexistente',
          dataVigenciaEndosso: '2025-06-01',
        })
        .expect(404);
    });

    it('retorna 404 para produtoId inexistente', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);

      await request(app.server)
        .post('/api/endossos/externo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: '00000000-0000-0000-0000-000000000000',
          numeroPropostaExterna: `EXT-404P-${Date.now()}`,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: 1000,
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Teste produto inexistente',
          dataVigenciaEndosso: '2025-06-01',
        })
        .expect(404);
    });

    it('retorna 400 sem campos obrigatórios', async () => {
      await request(app.server)
        .post('/api/endossos/externo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipoEndosso: 'ALTERACAO_VALOR' })
        .expect(400);
    });

    it('usa percentualComissaoPadrao do produto quando percentualComissao não é fornecido', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);

      // Criar produto com percentualComissaoPadrao definido
      const ts = Date.now();
      const [produtoComComissao] = await db
        .insert(produtos)
        .values({
          corretoraId,
          nomeProduto: `Produto ComissaoPadrao ${ts}`,
          tipoSeguro: 'AUTO',
          ativo: true,
          percentualComissaoPadrao: '5.00',
        })
        .returning();

      // Criar endosso externo SEM fornecer percentualComissao
      const res = await request(app.server)
        .post('/api/endossos/externo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: produtoComComissao.id,
          numeroPropostaExterna: `EXT-COMPADRAO-${ts}`,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: 2000,
          // percentualComissao omitido intencionalmente
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Endosso com comissão do produto',
          dataVigenciaEndosso: '2025-06-01',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('documento');
      expect(res.body.data).toHaveProperty('endosso');
      // A comissão deve ter sido calculada a partir do percentualComissaoPadrao (5%)
      expect(parseFloat(res.body.data.documento.percentualComissao)).toBe(5);
    });
  });

  // ── POST / — endosso duplicado pendente (linhas 356–359) ───────────────────

  describe('POST /api/endossos — endosso duplicado pendente', () => {
    it('retorna 422 ao criar segundo endosso SOLICITADO para o mesmo documento', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
      );

      // Primeiro endosso deve ser criado com sucesso
      await request(app.server)
        .post('/api/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          documentoVendaId: doc.id,
          tipoEndosso: 'ALTERACAO_VALOR',
          descricao: 'Primeiro endosso',
          premioNovo: 1100,
          dataVigenciaEndosso: '2025-06-01',
        })
        .expect(201);

      // Segundo endosso para o mesmo documento deve retornar 422
      const res = await request(app.server)
        .post('/api/endossos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          documentoVendaId: doc.id,
          tipoEndosso: 'ALTERACAO_DADOS',
          descricao: 'Segundo endosso para o mesmo documento',
          dataVigenciaEndosso: '2025-07-01',
        })
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/endosso pendente/i);
    });
  });

  // ── GET / — filtro ?vendedorId=X para aprovadores (linhas 484–485) ─────────

  describe('GET /api/endossos — filtro vendedorId para aprovadores', () => {
    it('aprovador com vendas:aprovar_endosso filtra endossos por vendedorId', async () => {
      // Criar segundo vendedor na mesma corretora
      const cargoVendedor = await createTestCargo(corretoraId, {
        nomeCargo: `Vendedor-Filtro-${Date.now()}`,
        permissoes: ['vendas:criar_endosso'],
      });
      const vendedor2 = await createTestUsuario(corretoraId, cargoVendedor.id);

      // Criar endosso para usuarioId (vendedor principal)
      const cliente1 = await createTestCliente(corretoraId, usuarioId);
      const produto1 = await createTestProduto(corretoraId);
      const doc1 = await createTestDocumentoVenda(
        corretoraId,
        cliente1.id,
        usuarioId,
        produto1.id,
        { numeroDocumento: `VF-DOC1-${Date.now()}` },
      );
      const endossoPrincipal = await createTestEndosso(
        corretoraId,
        doc1.id,
        usuarioId,
        { numeroEndosso: `VF-END1-${Date.now()}` },
      );

      // Criar endosso para vendedor2
      const cliente2 = await createTestCliente(corretoraId, vendedor2.id);
      const produto2 = await createTestProduto(corretoraId);
      const doc2 = await createTestDocumentoVenda(
        corretoraId,
        cliente2.id,
        vendedor2.id,
        produto2.id,
        { numeroDocumento: `VF-DOC2-${Date.now()}` },
      );
      const endossoVendedor2 = await createTestEndosso(
        corretoraId,
        doc2.id,
        vendedor2.id,
        { numeroEndosso: `VF-END2-${Date.now()}` },
      );

      // Criar aprovador
      const cargoAprovador = await createTestCargo(corretoraId, {
        nomeCargo: `Aprovador-VF-${Date.now()}`,
        permissoes: ['vendas:aprovar_endosso'],
      });
      const aprovador = await createTestUsuario(corretoraId, cargoAprovador.id);
      const tokenAprovador = generateTestToken(app, {
        sub: aprovador.id,
        corretoraId,
        cargoId: cargoAprovador.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: ['vendas:aprovar_endosso'],
        nome: aprovador.nome,
        email: aprovador.email,
        avatarUrl: null,
      });

      // Filtrar apenas endossos do vendedor2
      const res = await request(app.server)
        .get(`/api/endossos?vendedorId=${vendedor2.id}`)
        .set('Authorization', `Bearer ${tokenAprovador}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const ids = res.body.data.map((e: any) => e.id);
      expect(ids).toContain(endossoVendedor2.id);
      expect(ids).not.toContain(endossoPrincipal.id);

      // Todos os resultados devem pertencer ao vendedor2
      expect(
        res.body.data.every((e: any) => e.vendedorId === vendedor2.id),
      ).toBe(true);
    });

    it('vendedor sem permissão aprovar_endosso não pode usar filtro vendedorId', async () => {
      const cargoVendedor = await createTestCargo(corretoraId, {
        nomeCargo: `Vendedor-SemFiltro-${Date.now()}`,
        permissoes: ['vendas:criar_endosso'],
      });
      const vendedor = await createTestUsuario(corretoraId, cargoVendedor.id);
      const tokenVendedor = generateTestToken(app, {
        sub: vendedor.id,
        corretoraId,
        cargoId: cargoVendedor.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['vendas:criar_endosso'],
        nome: vendedor.nome,
        email: vendedor.email,
        avatarUrl: null,
      });

      // Criar endosso do usuarioId (não do vendedor acima)
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);
      const doc = await createTestDocumentoVenda(
        corretoraId,
        cliente.id,
        usuarioId,
        produto.id,
        { numeroDocumento: `SF-DOC-${Date.now()}` },
      );
      const endossoDeOutro = await createTestEndosso(
        corretoraId,
        doc.id,
        usuarioId,
        { numeroEndosso: `SF-END-${Date.now()}` },
      );

      // Vendedor sem aprovar_endosso tenta filtrar por outro vendedorId
      // O endpoint ignora o filtro e força a restrição ao próprio vendedorId
      const res = await request(app.server)
        .get(`/api/endossos?vendedorId=${usuarioId}`)
        .set('Authorization', `Bearer ${tokenVendedor}`)
        .expect(200);

      // Deve retornar apenas os endossos do próprio vendedor (não o de usuarioId)
      const ids = res.body.data.map((e: any) => e.id);
      expect(ids).not.toContain(endossoDeOutro.id);
    });
  });
});
