import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  usuarios,
  documentosVenda,
  produtos,
  clienteEnderecos,
  clienteContatos,
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
  createTestClientePJ,
} from '../../helpers/factories/cliente.factory';
import { generateTestToken } from '../../helpers/auth.helper';

// ── Helpers locais ────────────────────────────────────────────────────────────

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

async function createTestDocumentoVendaAtivo(
  corretoraId: string,
  clienteId: string,
  vendedorId: string,
  produtoId: string,
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
      tipoDocumento: 'VENDA_EXPRESSA',
      status: 'ATIVO',
      vigenciaInicio: '2025-01-01',
      vigenciaFim: '2026-01-01',
    })
    .returning();
  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Clientes — cobertura de lacunas', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminId: string;
  let adminToken: string;
  let adminTokenComVisualizarTodos: string;

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
      permissoes: [],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    adminTokenComVisualizarTodos = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: cargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: false,
      permissoes: ['clientes:visualizar_todos'],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });
  });

  // ── GET / — filtros não testados ──────────────────────────────────────────

  describe('GET /api/clientes — filtros avançados', () => {
    it('gestor sem clientes:visualizar_todos vê apenas clientes de sua equipe', async () => {
      const cargoGestor = await createTestCargo(corretoraId, {
        isGestor: true,
        permissoes: ['clientes:visualizar_todos'],
      });
      const gestor = await createTestUsuario(corretoraId, cargoGestor.id);

      const cargoVendedor = await createTestCargo(corretoraId, {
        isVendedor: true,
        permissoes: ['clientes:visualizar'],
      });
      // Vendedor da equipe do gestor (gestorId aponta para o gestor)
      const vendedorDaEquipe = await createTestUsuario(
        corretoraId,
        cargoVendedor.id,
        { gestorId: gestor.id },
      );

      // Vendedor fora da equipe
      const vendedorForaEquipe = await createTestUsuario(
        corretoraId,
        cargoVendedor.id,
      );

      const clienteDaEquipe = await createTestClientePF(
        corretoraId,
        vendedorDaEquipe.id,
        { nome: 'Cliente da Equipe' },
      );
      await createTestClientePF(corretoraId, vendedorForaEquipe.id, {
        nome: 'Cliente Fora da Equipe',
      });

      // Token de gestor SEM clientes:visualizar_todos — deve ver apenas sua equipe
      const tokenGestor = generateTestToken(app, {
        sub: gestor.id,
        corretoraId,
        cargoId: cargoGestor.id,
        isAdmin: false,
        isGestor: true,
        isVendedor: false,
        permissoes: [],
        nome: gestor.nome,
        email: gestor.email,
        avatarUrl: null,
      });

      const res = await request(app.server)
        .get('/api/clientes')
        .set('Authorization', `Bearer ${tokenGestor}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((c: { id: string }) => c.id);
      expect(ids).toContain(clienteDaEquipe.id);
    });

    it('admin com clientes:visualizar_todos + ?vendedorId filtra por vendedor', async () => {
      const cargoV = await createTestCargo(corretoraId, { isVendedor: true });
      const vendedor = await createTestUsuario(corretoraId, cargoV.id);
      const clienteDoVendedor = await createTestClientePF(
        corretoraId,
        vendedor.id,
        { nome: 'Cliente do Vendedor Filtrado' },
      );
      await createTestClientePF(corretoraId, adminId, {
        nome: 'Cliente do Admin',
      });

      const res = await request(app.server)
        .get(`/api/clientes?vendedorId=${vendedor.id}`)
        .set('Authorization', `Bearer ${adminTokenComVisualizarTodos}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((c: { id: string }) => c.id);
      expect(ids).toContain(clienteDoVendedor.id);
      // Não deve retornar clientes de outros vendedores
      for (const item of res.body.data) {
        expect(item.vendedor?.id ?? (item as any).vendedorId).toBe(vendedor.id);
      }
    });

    it('filtro ?search retorna clientes que batem com nome', async () => {
      await createTestClientePF(corretoraId, adminId, {
        nome: 'Fernanda Buscavel',
      });

      const res = await request(app.server)
        .get('/api/clientes?search=Buscavel')
        .set('Authorization', `Bearer ${adminTokenComVisualizarTodos}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const nomes = res.body.data.map((c: { nome: string }) => c.nome);
      expect(nomes.some((n: string) => n.includes('Buscavel'))).toBe(true);
    });

    it('filtro ?search retorna clientes que batem com razaoSocial', async () => {
      await createTestClientePJ(corretoraId, adminId, {
        razaoSocial: 'Empresa Buscavel LTDA',
      });

      const res = await request(app.server)
        .get('/api/clientes?search=Buscavel')
        .set('Authorization', `Bearer ${adminTokenComVisualizarTodos}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('filtro ?tipoPessoa=PJ retorna apenas pessoas jurídicas', async () => {
      await createTestClientePF(corretoraId, adminId);
      await createTestClientePJ(corretoraId, adminId);

      const res = await request(app.server)
        .get('/api/clientes?tipoPessoa=PJ')
        .set('Authorization', `Bearer ${adminTokenComVisualizarTodos}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      for (const c of res.body.data) {
        expect(c.tipoPessoa).toBe('PJ');
      }
    });

    it('filtro ?tipoPessoa=PF retorna apenas pessoas físicas', async () => {
      await createTestClientePF(corretoraId, adminId);
      await createTestClientePJ(corretoraId, adminId);

      const res = await request(app.server)
        .get('/api/clientes?tipoPessoa=PF')
        .set('Authorization', `Bearer ${adminTokenComVisualizarTodos}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      for (const c of res.body.data) {
        expect(c.tipoPessoa).toBe('PF');
      }
    });

    it('filtro ?ativo=false retorna apenas clientes inativos', async () => {
      const clienteInativo = await createTestClientePF(
        corretoraId,
        adminId,
        { ativo: false },
      );

      const res = await request(app.server)
        .get('/api/clientes?ativo=false')
        .set('Authorization', `Bearer ${adminTokenComVisualizarTodos}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((c: { id: string }) => c.id);
      expect(ids).toContain(clienteInativo.id);
      for (const c of res.body.data) {
        expect(c.ativo).toBe(false);
      }
    });
  });

  // ── DELETE /:id — casos de erro ───────────────────────────────────────────

  describe('DELETE /api/clientes/:id — casos de erro', () => {
    it('retorna 403 quando vendedor que não é dono tenta deletar', async () => {
      const cargoVendedor = await createTestCargo(corretoraId, {
        isVendedor: true,
        permissoes: ['clientes:excluir', 'clientes:visualizar'],
      });
      const vendedorA = await createTestUsuario(corretoraId, cargoVendedor.id);
      const vendedorB = await createTestUsuario(corretoraId, cargoVendedor.id);

      const tokenVendedorB = generateTestToken(app, {
        sub: vendedorB.id,
        corretoraId,
        cargoId: cargoVendedor.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['clientes:excluir', 'clientes:visualizar'],
        nome: vendedorB.nome,
        email: vendedorB.email,
        avatarUrl: null,
      });

      // Cliente pertence ao vendedorA
      const clienteDoA = await createTestClientePF(corretoraId, vendedorA.id);

      await request(app.server)
        .delete(`/api/clientes/${clienteDoA.id}`)
        .set('Authorization', `Bearer ${tokenVendedorB}`)
        .expect(403);
    });

    it('retorna 400 ao tentar deletar cliente com apólice ATIVA', async () => {
      const produto = await createTestProduto(corretoraId);
      const cliente = await createTestClientePF(corretoraId, adminId);

      await createTestDocumentoVendaAtivo(
        corretoraId,
        cliente.id,
        adminId,
        produto.id,
      );

      const res = await request(app.server)
        .delete(`/api/clientes/${cliente.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /:id/transferir-carteira ─────────────────────────────────────────

  describe('POST /api/clientes/:id/transferir-carteira', () => {
    let cargoComTransferencia: Awaited<ReturnType<typeof createTestCargo>>;
    let usuarioComTransferencia: Awaited<ReturnType<typeof createTestUsuario>>;
    let tokenComTransferencia: string;

    beforeAll(async () => {
      // Cargo com permissão específica de transferência (não admin)
      // loadUserRuntimeData carregará apenas clientes:transferir_carteira do banco
      cargoComTransferencia = await createTestCargo(corretoraId, {
        permissoes: ['clientes:transferir_carteira'],
      });
      usuarioComTransferencia = await createTestUsuario(
        corretoraId,
        cargoComTransferencia.id,
      );
      tokenComTransferencia = generateTestToken(app, {
        sub: usuarioComTransferencia.id,
        corretoraId,
        cargoId: cargoComTransferencia.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: [],
        nome: usuarioComTransferencia.nome,
        email: usuarioComTransferencia.email,
        avatarUrl: null,
      });
    });

    it('transfere cliente com sucesso e atualiza vendedorId', async () => {
      const cargoV = await createTestCargo(corretoraId, { isVendedor: true });
      const novoVendedor = await createTestUsuario(corretoraId, cargoV.id);
      const cliente = await createTestClientePF(corretoraId, adminId);

      const res = await request(app.server)
        .post(`/api/clientes/${cliente.id}/transferir-carteira`)
        .set('Authorization', `Bearer ${tokenComTransferencia}`)
        .send({ novoVendedorId: novoVendedor.id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/transferido/i);

      // Verificar no banco que vendedorId foi atualizado
      const clienteAtualizado = await db.query.clientes.findFirst({
        where: (c, { eq }) => eq(c.id, cliente.id),
      });
      expect(clienteAtualizado?.vendedorId).toBe(novoVendedor.id);
    });

    it('preenche vendedorOriginalId na primeira transferência', async () => {
      const cargoV = await createTestCargo(corretoraId, { isVendedor: true });
      const novoVendedor = await createTestUsuario(corretoraId, cargoV.id);
      const cliente = await createTestClientePF(corretoraId, adminId);

      // O cliente não tem vendedorOriginalId ainda
      expect(cliente.vendedorOriginalId).toBeNull();

      await request(app.server)
        .post(`/api/clientes/${cliente.id}/transferir-carteira`)
        .set('Authorization', `Bearer ${tokenComTransferencia}`)
        .send({ novoVendedorId: novoVendedor.id })
        .expect(200);

      const clienteAtualizado = await db.query.clientes.findFirst({
        where: (c, { eq }) => eq(c.id, cliente.id),
      });
      // Deve ter sido preenchido com o vendedor original (adminId)
      expect(clienteAtualizado?.vendedorOriginalId).toBe(adminId);
    });

    it('retorna 404 para cliente inexistente', async () => {
      const cargoV = await createTestCargo(corretoraId, { isVendedor: true });
      const novoVendedor = await createTestUsuario(corretoraId, cargoV.id);

      await request(app.server)
        .post('/api/clientes/00000000-0000-0000-0000-000000000000/transferir-carteira')
        .set('Authorization', `Bearer ${tokenComTransferencia}`)
        .send({ novoVendedorId: novoVendedor.id })
        .expect(404);
    });

    it('retorna 404 para novoVendedor inexistente', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      await request(app.server)
        .post(`/api/clientes/${cliente.id}/transferir-carteira`)
        .set('Authorization', `Bearer ${tokenComTransferencia}`)
        .send({ novoVendedorId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('retorna 403 sem permissão de transferir_carteira', async () => {
      const cargoSemPermissao = await createTestCargo(corretoraId, {
        permissoes: [],
      });
      const usuarioSemPermissao = await createTestUsuario(
        corretoraId,
        cargoSemPermissao.id,
      );
      const tokenSemPermissao = generateTestToken(app, {
        sub: usuarioSemPermissao.id,
        corretoraId,
        cargoId: cargoSemPermissao.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        permissoes: [],
        nome: usuarioSemPermissao.nome,
        email: usuarioSemPermissao.email,
        avatarUrl: null,
      });

      const cargoV = await createTestCargo(corretoraId, { isVendedor: true });
      const novoVendedor = await createTestUsuario(corretoraId, cargoV.id);
      const cliente = await createTestClientePF(corretoraId, adminId);

      await request(app.server)
        .post(`/api/clientes/${cliente.id}/transferir-carteira`)
        .set('Authorization', `Bearer ${tokenSemPermissao}`)
        .send({ novoVendedorId: novoVendedor.id })
        .expect(403);
    });
  });

  // ── POST /:id/enderecos — ForbiddenError ─────────────────────────────────

  describe('POST /api/clientes/:id/enderecos — acesso negado', () => {
    it('retorna 403 quando vendedor B tenta adicionar endereço em cliente do vendedor A', async () => {
      const cargoVendedor = await createTestCargo(corretoraId, {
        isVendedor: true,
        permissoes: ['clientes:editar', 'clientes:visualizar'],
      });
      const vendedorA = await createTestUsuario(corretoraId, cargoVendedor.id);
      const vendedorB = await createTestUsuario(corretoraId, cargoVendedor.id);

      const tokenVendedorB = generateTestToken(app, {
        sub: vendedorB.id,
        corretoraId,
        cargoId: cargoVendedor.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['clientes:editar', 'clientes:visualizar'],
        nome: vendedorB.nome,
        email: vendedorB.email,
        avatarUrl: null,
      });

      // Cliente pertence ao vendedorA
      const clienteDoA = await createTestClientePF(corretoraId, vendedorA.id);

      await request(app.server)
        .post(`/api/clientes/${clienteDoA.id}/enderecos`)
        .set('Authorization', `Bearer ${tokenVendedorB}`)
        .send({
          logradouro: 'Rua Proibida',
          numero: '1',
          bairro: 'Centro',
          cidade: 'SP',
          estado: 'SP',
          cep: '01001000',
          principal: false,
        })
        .expect(403);
    });
  });

  // ── POST /:id/contatos — ForbiddenError ──────────────────────────────────

  describe('POST /api/clientes/:id/contatos — acesso negado', () => {
    it('retorna 403 quando vendedor B tenta adicionar contato em cliente do vendedor A', async () => {
      const cargoVendedor = await createTestCargo(corretoraId, {
        isVendedor: true,
        permissoes: ['clientes:editar', 'clientes:visualizar'],
      });
      const vendedorA = await createTestUsuario(corretoraId, cargoVendedor.id);
      const vendedorB = await createTestUsuario(corretoraId, cargoVendedor.id);

      const tokenVendedorB = generateTestToken(app, {
        sub: vendedorB.id,
        corretoraId,
        cargoId: cargoVendedor.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: ['clientes:editar', 'clientes:visualizar'],
        nome: vendedorB.nome,
        email: vendedorB.email,
        avatarUrl: null,
      });

      // Cliente pertence ao vendedorA
      const clienteDoA = await createTestClientePF(corretoraId, vendedorA.id);

      await request(app.server)
        .post(`/api/clientes/${clienteDoA.id}/contatos`)
        .set('Authorization', `Bearer ${tokenVendedorB}`)
        .send({
          tipo: 'TELEFONE',
          valor: '11999990000',
          principal: false,
        })
        .expect(403);
    });
  });

  // ── DELETE /:id/enderecos/:enderecoId ────────────────────────────────────

  describe('DELETE /api/clientes/:id/enderecos/:enderecoId', () => {
    it('deleta endereço existente com sucesso', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      // Criar endereço via API
      const resEndereco = await request(app.server)
        .post(`/api/clientes/${cliente.id}/enderecos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          logradouro: 'Rua Para Deletar',
          numero: '42',
          bairro: 'Bairro',
          cidade: 'Cidade',
          estado: 'SP',
          cep: '01001000',
          principal: false,
        })
        .expect(201);

      const enderecoId = resEndereco.body.data.id;

      const res = await request(app.server)
        .delete(`/api/clientes/${cliente.id}/enderecos/${enderecoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 404 para cliente inexistente ao deletar endereço', async () => {
      await request(app.server)
        .delete(
          '/api/clientes/00000000-0000-0000-0000-000000000000/enderecos/00000000-0000-0000-0000-000000000001',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 401 sem token ao deletar endereço', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      // Inserir endereço diretamente no banco
      const [endereco] = await db
        .insert(clienteEnderecos)
        .values({
          clienteId: cliente.id,
          logradouro: 'Rua Qualquer',
          numero: '1',
          bairro: 'Centro',
          cidade: 'SP',
          uf: 'SP',
          cep: '01001000',
        })
        .returning();

      await request(app.server)
        .delete(`/api/clientes/${cliente.id}/enderecos/${endereco.id}`)
        .expect(401);
    });
  });

  // ── DELETE /:id/contatos/:contatoId ──────────────────────────────────────

  describe('DELETE /api/clientes/:id/contatos/:contatoId', () => {
    it('deleta contato existente com sucesso', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      // Criar contato via API
      const resContato = await request(app.server)
        .post(`/api/clientes/${cliente.id}/contatos`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'TELEFONE',
          valor: '11988880000',
          principal: false,
        })
        .expect(201);

      const contatoId = resContato.body.data.id;

      const res = await request(app.server)
        .delete(`/api/clientes/${cliente.id}/contatos/${contatoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 404 para cliente inexistente ao deletar contato', async () => {
      await request(app.server)
        .delete(
          '/api/clientes/00000000-0000-0000-0000-000000000000/contatos/00000000-0000-0000-0000-000000000001',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('retorna 401 sem token ao deletar contato', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      // Inserir contato diretamente no banco
      const [contato] = await db
        .insert(clienteContatos)
        .values({
          clienteId: cliente.id,
          tipo: 'EMAIL',
          valor: 'contato@teste.com',
        })
        .returning();

      await request(app.server)
        .delete(`/api/clientes/${cliente.id}/contatos/${contato.id}`)
        .expect(401);
    });
  });
});
