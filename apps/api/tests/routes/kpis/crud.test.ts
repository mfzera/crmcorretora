import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  oportunidades,
  documentosVenda,
  renovacoesComerciais,
  clientes,
  produtos,
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

describe('/api/kpis', () => {
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

  describe('GET /api/kpis', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/kpis').expect(401);
    });

    it('retorna KPIs zerados sem dados', async () => {
      const res = await request(app.server)
        .get('/api/kpis')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.taxaConversao.valor).toBe(0);
      expect(res.body.data.taxaConversao.total).toBe(0);
      expect(res.body.data.taxaConversao.ganhas).toBe(0);
      expect(res.body.data.valorMedioPremio.valor).toBe(0);
      expect(res.body.data.valorMedioPremio.totalVendas).toBe(0);
      expect(res.body.data.taxaRenovacao.valor).toBe(0);
    });

    it('retorna taxaConversao correta', async () => {
      // 2 oportunidades: 1 ganha, 1 lead = 50%
      await db.insert(oportunidades).values([
        {
          corretoraId,
          vendedorId: usuarioId,
          vendedorOriginalId: usuarioId,
          nomeCliente: 'Cliente A',
          status: 'ganha',
          prioridade: 'baixa',
          temperatura: 'morno',
          ordem: 1,
        },
        {
          corretoraId,
          vendedorId: usuarioId,
          vendedorOriginalId: usuarioId,
          nomeCliente: 'Cliente B',
          status: 'lead',
          prioridade: 'baixa',
          temperatura: 'morno',
          ordem: 2,
        },
      ]);

      const res = await request(app.server)
        .get('/api/kpis')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.taxaConversao.total).toBe(2);
      expect(res.body.data.taxaConversao.ganhas).toBe(1);
      expect(res.body.data.taxaConversao.valor).toBe(50);
    });

    it('retorna valorMedioPremio correto', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const ts = Date.now();
      const [produto] = await db
        .insert(produtos)
        .values({ corretoraId, nomeProduto: `Produto ${ts}`, tipoSeguro: 'AUTO', ativo: true })
        .returning();

      await db.insert(documentosVenda).values([
        {
          corretoraId,
          vendedorId: usuarioId,
          clienteId: cliente.id,
          produtoId: produto.id,
          numeroDocumento: `DOC-${ts}-1`,
          status: 'ATIVO',
          tipoDocumento: 'COTACAO_DIRETA',
          premioLiquido: '1000.00',
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2026-01-01',
        },
        {
          corretoraId,
          vendedorId: usuarioId,
          clienteId: cliente.id,
          produtoId: produto.id,
          numeroDocumento: `DOC-${ts}-2`,
          status: 'ATIVO',
          tipoDocumento: 'COTACAO_DIRETA',
          premioLiquido: '2000.00',
          vigenciaInicio: '2025-06-01',
          vigenciaFim: '2026-06-01',
        },
      ]);

      const res = await request(app.server)
        .get('/api/kpis')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.valorMedioPremio.totalVendas).toBe(2);
      expect(res.body.data.valorMedioPremio.valor).toBe(1500);
      expect(res.body.data.valorMedioPremio.totalPremio).toBe(3000);
    });

    it('retorna taxaRenovacao correta', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const hoje = new Date();
      const dataRecente = new Date(hoje);
      dataRecente.setDate(dataRecente.getDate() - 30);
      const dataRecenteStr = dataRecente.toISOString().split('T')[0];

      await db.insert(renovacoesComerciais).values([
        {
          corretoraId,
          vendedorId: usuarioId,
          clienteId: cliente.id,
          dataVencimento: dataRecenteStr,
          status: 'RENOVADO',
          produtoDescricao: 'Seguro Auto',
        },
        {
          corretoraId,
          vendedorId: usuarioId,
          clienteId: cliente.id,
          dataVencimento: dataRecenteStr,
          status: 'NAO_TRABALHADO',
          produtoDescricao: 'Seguro Vida',
        },
      ]);

      const res = await request(app.server)
        .get('/api/kpis')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.taxaRenovacao.total).toBe(2);
      expect(res.body.data.taxaRenovacao.concluidas).toBe(1);
      expect(res.body.data.taxaRenovacao.valor).toBe(50);
    });
  });

  describe('GET /api/kpis/kanban', () => {
    beforeEach(async () => {
      await db.delete(oportunidades);
      await db.delete(documentosVenda);
      await db.delete(renovacoesComerciais);
    });

    it('retorna 401 sem token', async () => {
      await request(app.server).get('/api/kpis/kanban').expect(401);
    });

    it('retorna KPIs kanban zerados sem dados', async () => {
      const res = await request(app.server)
        .get('/api/kpis/kanban')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.premioMedio.count).toBe(0);
      expect(res.body.data.clientesUrgencia.count).toBe(0);
      expect(res.body.data.leadsFrios.count).toBe(0);
    });

    it('retorna premioMedio correto', async () => {
      await db.insert(oportunidades).values([
        {
          corretoraId,
          vendedorId: usuarioId,
          vendedorOriginalId: usuarioId,
          nomeCliente: 'A',
          status: 'lead',
          prioridade: 'baixa',
          temperatura: 'morno',
          ordem: 1,
          premioEstimado: '1000.00',
        },
        {
          corretoraId,
          vendedorId: usuarioId,
          vendedorOriginalId: usuarioId,
          nomeCliente: 'B',
          status: 'negociacao',
          prioridade: 'baixa',
          temperatura: 'morno',
          ordem: 2,
          premioEstimado: '3000.00',
        },
      ]);

      const res = await request(app.server)
        .get('/api/kpis/kanban')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.premioMedio.count).toBe(2);
      expect(res.body.data.premioMedio.valor).toBe(2000);
    });

    it('retorna clientesUrgencia correto', async () => {
      await db.insert(oportunidades).values([
        {
          corretoraId,
          vendedorId: usuarioId,
          vendedorOriginalId: usuarioId,
          nomeCliente: 'Urgente',
          status: 'lead',
          prioridade: 'urgente',
          temperatura: 'quente',
          ordem: 1,
        },
        {
          corretoraId,
          vendedorId: usuarioId,
          vendedorOriginalId: usuarioId,
          nomeCliente: 'Normal',
          status: 'lead',
          prioridade: 'baixa',
          temperatura: 'morno',
          ordem: 2,
        },
      ]);

      const res = await request(app.server)
        .get('/api/kpis/kanban')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.clientesUrgencia.count).toBe(1);
      expect(res.body.data.clientesUrgencia.total).toBe(2);
    });

    it('retorna leadsFrios correto', async () => {
      await db.insert(oportunidades).values([
        {
          corretoraId,
          vendedorId: usuarioId,
          vendedorOriginalId: usuarioId,
          nomeCliente: 'Frio',
          status: 'contato_inicial',
          prioridade: 'baixa',
          temperatura: 'frio',
          ordem: 1,
        },
        {
          corretoraId,
          vendedorId: usuarioId,
          vendedorOriginalId: usuarioId,
          nomeCliente: 'Quente',
          status: 'negociacao',
          prioridade: 'baixa',
          temperatura: 'quente',
          ordem: 2,
        },
      ]);

      const res = await request(app.server)
        .get('/api/kpis/kanban')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.leadsFrios.count).toBe(1);
    });

    it('filtra por vendedor quando sem permissão kanban:visualizar_todas', async () => {
      const restrictedCargo = await createTestCargo(corretoraId, {
        permissoes: ['kanban:visualizar'],
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
        permissoes: ['kanban:visualizar'],
        nome: restrictedUser.nome,
        email: restrictedUser.email,
        avatarUrl: null,
      });

      // Oportunidade de outro vendedor
      await db.insert(oportunidades).values({
        corretoraId,
        vendedorId: usuarioId,
        vendedorOriginalId: usuarioId,
        nomeCliente: 'Outro vendedor',
        status: 'lead',
        prioridade: 'baixa',
        temperatura: 'morno',
        ordem: 1,
      });

      const res = await request(app.server)
        .get('/api/kpis/kanban')
        .set('Authorization', `Bearer ${restrictedToken}`)
        .expect(200);

      // Não deve ver oportunidade de outro vendedor
      expect(res.body.data.premioMedio.count).toBe(0);
    });
  });
});
