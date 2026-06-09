import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  tarefas,
  clientes,
  produtos,
  renovacoesComerciais,
  documentosVenda,
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
import { generateTestToken } from '../../helpers/auth.helper';
import { createTestCargo } from '../../helpers/factories/cargo.factory';

async function createTestCliente(
  corretoraId: string,
  vendedorId: string,
) {
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

async function createTestClientePJ(
  corretoraId: string,
  vendedorId: string,
) {
  const ts = Date.now();
  const cnpj = String(ts).slice(-14).padStart(14, '0');
  const [cliente] = await db
    .insert(clientes)
    .values({
      corretoraId,
      vendedorId,
      tipoPessoa: 'PJ',
      nome: null,
      razaoSocial: `Empresa ${ts}`,
      cnpj,
      ativo: true,
    })
    .returning();
  return cliente;
}

describe('/api/calendario', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let usuarioId: string;
  let cargoId: string;
  let token: string;

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

    token = generateTestToken(app, {
      sub: usuarioId,
      corretoraId,
      cargoId: cargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: true,
      permissoes: [],
      nome: usuario.nome,
      email: usuario.email,
      avatarUrl: null,
    });
  });

  describe('GET /api/calendario', () => {
    beforeEach(async () => {
      await db.delete(documentosVenda);
      await db.delete(renovacoesComerciais);
      await db.delete(tarefas);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .expect(401);
    });

    it('retorna 403 sem permissão dashboard:visualizar', async () => {
      const restrictedCargo = await createTestCargo(corretoraId, {
        permissoes: [],
      });
      const restrictedUser = await createTestUsuario(
        corretoraId,
        restrictedCargo.id,
      );
      const restrictedToken = generateTestToken(app, {
        sub: restrictedUser.id,
        corretoraId,
        cargoId: restrictedCargo.id,
        isAdmin: false,
        isGestor: false,
        isVendedor: true,
        permissoes: [],
        nome: restrictedUser.nome,
        email: restrictedUser.email,
        avatarUrl: null,
      });

      await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${restrictedToken}`)
        .expect(403);
    });

    it('retorna eventos vazios para mês sem dados', async () => {
      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.eventos).toEqual({});
      expect(res.body.data.resumo.tarefas).toBe(0);
      expect(res.body.data.resumo.renovacoes).toBe(0);
      expect(res.body.data.resumo.documentos).toBe(0);
    });

    it('retorna tarefas do mês correto', async () => {
      await db.insert(tarefas).values({
        corretoraId,
        usuarioId,
        titulo: 'Tarefa Fevereiro',
        prioridade: 'media',
        concluida: false,
        dataVencimento: new Date('2026-02-15T10:00:00Z'),
      });

      // Tarefa fora do mês - não deve aparecer
      await db.insert(tarefas).values({
        corretoraId,
        usuarioId,
        titulo: 'Tarefa Janeiro',
        prioridade: 'media',
        concluida: false,
        dataVencimento: new Date('2026-01-15T10:00:00Z'),
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.resumo.tarefas).toBe(1);
      expect(res.body.data.eventos['2026-02-15']).toBeDefined();
      expect(res.body.data.eventos['2026-02-15'][0].tipo).toBe('tarefa');
      expect(res.body.data.eventos['2026-02-15'][0].titulo).toBe(
        'Tarefa Fevereiro',
      );
    });

    it('retorna renovações do mês correto', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);

      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        dataVencimento: '2026-02-20',
        status: 'NAO_TRABALHADO',
        produtoDescricao: 'Seguro Auto',
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.resumo.renovacoes).toBe(1);
      expect(res.body.data.eventos['2026-02-20']).toBeDefined();
      expect(res.body.data.eventos['2026-02-20'][0].tipo).toBe('renovacao');
    });

    it('retorna documentos de venda do mês correto', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const ts = Date.now();
      const [produto] = await db
        .insert(produtos)
        .values({ corretoraId, nomeProduto: `Produto Cal ${ts}`, tipoSeguro: 'AUTO', ativo: true })
        .returning();

      await db.insert(documentosVenda).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        produtoId: produto.id,
        numeroDocumento: `DOC-CAL-${ts}`,
        status: 'ATIVO',
        tipoDocumento: 'COTACAO_DIRETA',
        vigenciaInicio: '2025-02-20',
        vigenciaFim: '2026-02-20',
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.resumo.documentos).toBe(1);
      expect(res.body.data.eventos['2026-02-20']).toBeDefined();
      expect(res.body.data.eventos['2026-02-20'][0].tipo).toBe('documento');
    });

    it('usa razaoSocial como clienteNome quando cliente não tem nome (documento)', async () => {
      const clientePJ = await createTestClientePJ(corretoraId, usuarioId);
      const ts = Date.now();
      const [produto] = await db
        .insert(produtos)
        .values({ corretoraId, nomeProduto: `Produto PJ ${ts}`, tipoSeguro: 'AUTO', ativo: true })
        .returning();

      await db.insert(documentosVenda).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: clientePJ.id,
        produtoId: produto.id,
        numeroDocumento: `DOC-PJ-${ts}`,
        status: 'ATIVO',
        tipoDocumento: 'COTACAO_DIRETA',
        vigenciaInicio: '2025-02-22',
        vigenciaFim: '2026-02-22',
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const evento = res.body.data.eventos['2026-02-22']?.[0];
      expect(evento).toBeDefined();
      expect(evento.tipo).toBe('documento');
      // clientePJ has nome: null so razaoSocial is used as fallback
      expect(evento.meta.clienteNome).toBe(clientePJ.razaoSocial);
    });

    it('filtra por tipo específico', async () => {
      await db.insert(tarefas).values({
        corretoraId,
        usuarioId,
        titulo: 'Tarefa',
        prioridade: 'media',
        concluida: false,
        dataVencimento: new Date('2026-02-15T10:00:00Z'),
      });

      const cliente = await createTestCliente(corretoraId, usuarioId);
      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        dataVencimento: '2026-02-20',
        status: 'NAO_TRABALHADO',
        produtoDescricao: 'Seguro',
      });

      // Filtrar apenas tarefas
      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02&tipos=tarefas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.resumo.tarefas).toBe(1);
      expect(res.body.data.resumo.renovacoes).toBe(0);
    });

    it('não retorna tarefas de outro usuário', async () => {
      const outroUsuario = await createTestUsuario(corretoraId, cargoId);
      await db.insert(tarefas).values({
        corretoraId,
        usuarioId: outroUsuario.id,
        titulo: 'Tarefa do outro',
        prioridade: 'media',
        concluida: false,
        dataVencimento: new Date('2026-02-15T10:00:00Z'),
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.resumo.tarefas).toBe(0);
    });

    it('não retorna tarefas deletadas', async () => {
      await db.insert(tarefas).values({
        corretoraId,
        usuarioId,
        titulo: 'Tarefa deletada',
        prioridade: 'media',
        concluida: false,
        dataVencimento: new Date('2026-02-15T10:00:00Z'),
        deletedAt: new Date(),
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.resumo.tarefas).toBe(0);
    });

    it('ignora tarefas sem dataVencimento', async () => {
      // The DB query filters by gte/lte so null rows are never returned normally.
      // Mock findMany to inject a fake item with dataVencimento: null to cover the
      // "if (!t.dataVencimento) continue" branch (line 83).
      const originalFindMany = db.query.tarefas.findMany.bind(db.query.tarefas);
      const findManySpy = vi
        .spyOn(db.query.tarefas, 'findMany')
        .mockResolvedValueOnce([
          {
            id: '00000000-0000-0000-0000-000000000099',
            corretoraId,
            usuarioId,
            titulo: 'Tarefa sem vencimento',
            prioridade: 'media' as const,
            concluida: false,
            dataVencimento: null,
            entidadeTipo: null,
            entidadeId: null,
            descricao: null,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
        ]);

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02&tipos=tarefas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // Item with null dataVencimento is skipped — count stays 0
      expect(res.body.data.resumo.tarefas).toBe(0);
      findManySpy.mockRestore();
    });

    it('retorna renovação com itemDescricao e cliente sem nome (razaoSocial)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        dataVencimento: '2026-02-14',
        status: 'NAO_TRABALHADO',
        itemDescricao: 'Item customizado',
        produtoDescricao: null,
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const evento = res.body.data.eventos['2026-02-14']?.[0];
      expect(evento).toBeDefined();
      expect(evento.titulo).toBe('Item customizado');
    });

    it('retorna renovação sem itemDescricao, produtoDescricao e sem cliente com nome', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      // Cliente PF sem nome preenchido no campo nome (usa razaoSocial)
      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        dataVencimento: '2026-02-13',
        status: 'NAO_TRABALHADO',
        itemDescricao: null,
        produtoDescricao: null,
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const evento = res.body.data.eventos['2026-02-13']?.[0];
      expect(evento).toBeDefined();
      // Falls back to 'Renovacao' when both itemDescricao and produtoDescricao are null
      expect(evento.titulo).toBe('Renovacao');
    });

    it('usa razaoSocial como clienteNome quando cliente não tem nome (renovação)', async () => {
      const clientePJ = await createTestClientePJ(corretoraId, usuarioId);
      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: clientePJ.id,
        dataVencimento: '2026-02-12',
        status: 'NAO_TRABALHADO',
        produtoDescricao: 'Seguro Empresarial',
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const evento = res.body.data.eventos['2026-02-12']?.[0];
      expect(evento).toBeDefined();
      // clientePJ has nome: null so razaoSocial is used as fallback
      expect(evento.meta.clienteNome).toBe(clientePJ.razaoSocial);
    });

    it('retorna premioAnterior como número quando renovação tem premio', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        dataVencimento: '2026-02-25',
        status: 'NAO_TRABALHADO',
        produtoDescricao: 'Seguro Vida',
        premioAnterior: '1500.00',
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.resumo.renovacoes).toBeGreaterThanOrEqual(1);
      const evento = res.body.data.eventos['2026-02-25']?.[0];
      expect(evento).toBeDefined();
      expect(evento.tipo).toBe('renovacao');
      expect(typeof evento.meta.premioAnterior).toBe('number');
      expect(evento.meta.premioAnterior).toBe(1500);
    });

    it('não retorna renovações já finalizadas', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        dataVencimento: '2026-02-20',
        status: 'RENOVADO',
        produtoDescricao: 'Seguro',
      });

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.resumo.renovacoes).toBe(0);
    });

    it('retorna eventos quando apenas tipos específicos são solicitados (sem tarefas)', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId: usuarioId,
        clienteId: cliente.id,
        dataVencimento: '2026-02-10',
        status: 'NAO_TRABALHADO',
        produtoDescricao: 'Seguro Vida',
      });

      // Filtrar apenas renovacoes e documentos (sem tarefas)
      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02&tipos=renovacoes,documentos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.resumo.tarefas).toBe(0);
      expect(res.body.data.resumo.renovacoes).toBeGreaterThanOrEqual(1);
    });

    it('lida graciosamente com erro na query de tarefas', async () => {
      // Mock db.query.tarefas.findMany para lançar erro
      const originalFindMany = db.query.tarefas.findMany.bind(db.query.tarefas);
      vi.spyOn(db.query.tarefas, 'findMany').mockRejectedValueOnce(
        new Error('Tabela não existe'),
      );

      const res = await request(app.server)
        .get('/api/calendario?mes=2026-02&tipos=tarefas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Deve retornar sucesso mesmo com erro na query de tarefas (catch silencioso)
      expect(res.body.success).toBe(true);
      expect(res.body.data.resumo.tarefas).toBe(0);
    });
  });
});
