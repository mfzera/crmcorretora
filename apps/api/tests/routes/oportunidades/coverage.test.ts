import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import { oportunidades, produtos, tarefas, clientes } from '@ecotech/shared/database';
import { buildTestApp } from '../../helpers/app.helper';
import { cleanDatabase } from '../../setup/test-setup';
import { createTestPlano, createTestCorretora } from '../../helpers/factories/corretora.factory';
import { createAdminCargo, createTestUsuario } from '../../helpers/factories/usuario.factory';
import { createTestCargo } from '../../helpers/factories/cargo.factory';
import { generateTestToken } from '../../helpers/auth.helper';
import { createTestClientePF } from '../../helpers/factories/cliente.factory';

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

async function createTestOportunidade(
  corretoraId: string,
  vendedorId: string,
  overrides: Record<string, unknown> = {},
) {
  const [opp] = await db
    .insert(oportunidades)
    .values({
      corretoraId,
      vendedorId,
      vendedorOriginalId: vendedorId,
      nomeCliente: 'Cliente Teste',
      status: 'lead',
      prioridade: 'baixa',
      temperatura: 'morno',
      ordem: 1,
      ...overrides,
    })
    .returning();
  return opp;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Oportunidades — cobertura de lacunas', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminId: string;
  let adminToken: string;
  let vendedorId: string;
  let vendedorToken: string;
  let vendedor2Id: string;
  let produtoId: string;
  let clienteId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    const adminCargo = await createAdminCargo(corretoraId);
    const admin = await createTestUsuario(corretoraId, adminCargo.id);
    adminId = admin.id;

    adminToken = generateTestToken(app, {
      sub: admin.id,
      corretoraId,
      cargoId: adminCargo.id,
      isAdmin: true,
      isGestor: false,
      isVendedor: true,
      permissoes: [
        'kanban:acessar',
        'kanban:visualizar',
        'kanban:visualizar_todas',
        'kanban:criar',
        'kanban:editar',
        'kanban:deletar',
        'kanban:perder',
        'kanban:fechar',
      ],
      nome: admin.nome,
      email: admin.email,
      avatarUrl: null,
    });

    const vendedorCargo = await createTestCargo(corretoraId, {
      nomeCargo: 'Vendedor',
      isVendedor: true,
      permissoes: [
        'kanban:acessar',
        'kanban:visualizar',
        'kanban:criar',
        'kanban:editar',
        'kanban:deletar',
        'kanban:perder',
        'kanban:fechar',
      ],
    });
    const vendedor = await createTestUsuario(corretoraId, vendedorCargo.id);
    vendedorId = vendedor.id;

    vendedorToken = generateTestToken(app, {
      sub: vendedor.id,
      corretoraId,
      cargoId: vendedorCargo.id,
      isAdmin: false,
      isGestor: false,
      isVendedor: true,
      permissoes: [
        'kanban:acessar',
        'kanban:visualizar',
        'kanban:criar',
        'kanban:editar',
        'kanban:deletar',
        'kanban:perder',
        'kanban:fechar',
      ],
      nome: vendedor.nome,
      email: vendedor.email,
      avatarUrl: null,
    });

    const vendedor2 = await createTestUsuario(corretoraId, vendedorCargo.id);
    vendedor2Id = vendedor2.id;

    const produto = await createTestProduto(corretoraId);
    produtoId = produto.id;

    const cliente = await createTestClientePF(corretoraId, adminId);
    clienteId = cliente.id;
  });

  // ── GET / — filtro por produtoId (linhas 92-94) ───────────────────────────

  describe('GET /api/oportunidades?produtoId=', () => {
    it('filtra oportunidades pelo produtoId', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        produtoId,
        nomeCliente: 'Cliente com Produto',
        ordem: 99,
      });

      const res = await request(app.server)
        .get(`/api/oportunidades?produtoId=${produtoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((o: { id: string }) => o.id);
      expect(ids).toContain(opp.id);
    });

    it('não retorna oportunidades de outro produto', async () => {
      const outroProduto = await createTestProduto(corretoraId);
      await createTestOportunidade(corretoraId, adminId, {
        produtoId: outroProduto.id,
        nomeCliente: 'Cliente Outro Produto',
        ordem: 100,
      });

      const res = await request(app.server)
        .get(`/api/oportunidades?produtoId=${produtoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      for (const item of res.body.data) {
        expect(item.produtoId).toBe(produtoId);
      }
    });
  });

  // ── GET / — filtro por vendedorId com kanban:visualizar_todas (98-99) ─────

  describe('GET /api/oportunidades?vendedorId= (com kanban:visualizar_todas)', () => {
    it('filtra por vendedorId quando usuário tem kanban:visualizar_todas', async () => {
      const opp = await createTestOportunidade(corretoraId, vendedorId, {
        nomeCliente: 'Cliente Vendedor Filtro',
        ordem: 101,
      });

      const res = await request(app.server)
        .get(`/api/oportunidades?vendedorId=${vendedorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((o: { id: string }) => o.id);
      expect(ids).toContain(opp.id);
    });

    it('vendedorId sem kanban:visualizar_todas não filtra por vendedor', async () => {
      // Mesmo passando vendedorId, o filtro é ignorado quando não tem a permissão
      const res = await request(app.server)
        .get(`/api/oportunidades?vendedorId=${adminId}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // Deve retornar apenas as do próprio vendedor, não filtrar por adminId
      for (const item of res.body.data) {
        const isOwn =
          item.vendedorId === vendedorId || item.vendedorOriginalId === vendedorId;
        expect(isOwn).toBe(true);
      }
    });
  });

  // ── GET / — recontatos vinculados a oportunidades (158-159) ───────────────

  describe('GET /api/oportunidades — enriquecimento com dataRecontato', () => {
    it('inclui dataRecontato quando há tarefa de recontato pendente vinculada', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Cliente Recontato',
        ordem: 102,
      });

      await db.insert(tarefas).values({
        corretoraId,
        usuarioId: adminId,
        titulo: `Recontato: ${opp.nomeCliente}`,
        prioridade: 'media',
        dataVencimento: new Date('2025-06-15T09:00:00.000Z'),
        entidadeTipo: 'oportunidade',
        entidadeId: opp.id,
        concluida: false,
      });

      const res = await request(app.server)
        .get('/api/oportunidades')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const found = res.body.data.find((o: { id: string }) => o.id === opp.id);
      expect(found).toBeDefined();
      expect(found.dataRecontato).toBe('2025-06-15');
    });
  });

  // ── GET /:id — usuário sem kanban:visualizar_todas (204-210) ──────────────

  describe('GET /api/oportunidades/:id — sem kanban:visualizar_todas', () => {
    it('vendedor vê sua própria oportunidade (como vendedorOriginalId)', async () => {
      const opp = await createTestOportunidade(corretoraId, vendedorId, {
        nomeCliente: 'Opp Própria Vendedor',
        ordem: 103,
      });

      const res = await request(app.server)
        .get(`/api/oportunidades/${opp.id}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(opp.id);
    });

    it('vendedor não vê oportunidade de outro vendedor (404)', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Admin Não Visível',
        ordem: 104,
        vendedorOriginalId: adminId,
      });

      await request(app.server)
        .get(`/api/oportunidades/${opp.id}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(404);
    });
  });

  // ── POST / — com dataVencimento (linha 321) ───────────────────────────────

  describe('POST /api/oportunidades — com dataVencimento', () => {
    it('cria oportunidade com dataVencimento', async () => {
      const res = await request(app.server)
        .post('/api/oportunidades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nomeCliente: 'Cliente Data Vencimento',
          status: 'lead',
          temperatura: 'morno',
          dataVencimento: '2025-12-31',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.dataVencimento).toBeTruthy();
    });
  });

  // ── PATCH /:id/status — perdida → lead (limpa tarefas de recontato, 576-587)

  describe('PATCH /api/oportunidades/:id/status — reativação de perdida', () => {
    it('ao mover de perdida para lead, conclui tarefas de recontato pendentes', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        status: 'perdida',
        nomeCliente: 'Cliente Perdida Reativar',
        ordem: 105,
      });

      await db.insert(tarefas).values({
        corretoraId,
        usuarioId: adminId,
        titulo: `Recontato: ${opp.nomeCliente}`,
        prioridade: 'media',
        dataVencimento: new Date('2025-08-01T09:00:00.000Z'),
        entidadeTipo: 'oportunidade',
        entidadeId: opp.id,
        concluida: false,
      });

      const res = await request(app.server)
        .patch(`/api/oportunidades/${opp.id}/mover`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ novoStatus: 'lead', novaOrdem: 1 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('lead');

      // Verificar que a tarefa foi concluída
      const [tarefa] = await db
        .select()
        .from(tarefas)
        .where(
          // @ts-ignore
          (await import('drizzle-orm')).and(
            (await import('drizzle-orm')).eq(tarefas.entidadeId, opp.id),
            (await import('drizzle-orm')).eq(tarefas.entidadeTipo, 'oportunidade'),
          ),
        );
      expect(tarefa.concluida).toBe(true);
    });
  });

  // ── POST /:id/fechar — sem clienteId mas com produtoId + datas (741-745) ──

  describe('POST /api/oportunidades/:id/fechar — sem clienteId', () => {
    it('salva pendenteCadastroCliente no metadata quando produtoId+datas fornecidos mas opp não tem clienteId', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Sem Cliente Para Fechar',
        status: 'negociacao',
        ordem: 106,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/fechar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          valorFechado: '1500.00',
          produtoId,
          dataVigenciaInicio: '2025-01-01',
          dataVigenciaFim: '2025-12-31',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.metadata?.pendenteCadastroCliente?.produtoId).toBe(produtoId);
      expect(res.body.data.metadata?.pendenteCadastroCliente?.dataVigenciaInicio).toBe('2025-01-01');
      expect(res.body.data.metadata?.pendenteCadastroCliente?.dataVigenciaFim).toBe('2025-12-31');
    });
  });

  // ── POST /:id/fechar — com clienteId + produtoId + datas (774-814) ─────────

  describe('POST /api/oportunidades/:id/fechar — com clienteId cria cotação', () => {
    it('cria cotação automaticamente ao fechar com clienteId + produtoId + datas', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Cliente Com Cotação',
        status: 'negociacao',
        clienteId,
        ordem: 107,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/fechar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          valorFechado: '1500.00',
          produtoId,
          dataVigenciaInicio: '2025-01-01',
          dataVigenciaFim: '2025-12-31',
          premioFinal: '1500.00',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ganha');
      expect(res.body.data.cotacaoId).toBeTruthy();
      expect(res.body.data.documentoVendaId).toBeNull();
    });
  });

  // ── POST /:id/fechar — gerarDocumento: true (817-882) ────────────────────

  describe('POST /api/oportunidades/:id/fechar — gerarDocumento: true', () => {
    it('cria DocumentoVenda ao fechar com gerarDocumento: true', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Cliente Gerar Documento',
        status: 'negociacao',
        clienteId,
        ordem: 108,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/fechar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          valorFechado: '2000.00',
          produtoId,
          dataVigenciaInicio: '2025-01-01',
          dataVigenciaFim: '2025-12-31',
          premioFinal: '2000.00',
          gerarDocumento: true,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ganha');
      expect(res.body.data.documentoVendaId).toBeTruthy();
      expect(res.body.data.cotacaoId).toBeTruthy();
    });

    it('cria DocumentoVenda + RenovacaoComercial com criarRenovacao: true (852-867)', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Cliente Renovacao',
        status: 'negociacao',
        clienteId,
        ordem: 109,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/fechar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          valorFechado: '2500.00',
          produtoId,
          dataVigenciaInicio: '2025-01-01',
          dataVigenciaFim: '2025-12-31',
          premioFinal: '2500.00',
          gerarDocumento: true,
          criarRenovacao: true,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.documentoVendaId).toBeTruthy();
      expect(res.body.data.renovacaoId).toBeTruthy();
    });
  });

  // ── POST /:id/fechar — gerarDocumento: false, cotacaoId salvo (884-895) ───

  describe('POST /api/oportunidades/:id/fechar — sem gerarDocumento, cotacaoId no metadata', () => {
    it('salva cotacaoId no metadata quando gerarDocumento é false', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Cliente Sem Documento',
        status: 'negociacao',
        clienteId,
        ordem: 110,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/fechar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          valorFechado: '1200.00',
          produtoId,
          dataVigenciaInicio: '2025-01-01',
          dataVigenciaFim: '2025-12-31',
          premioFinal: '1200.00',
          gerarDocumento: false,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.cotacaoId).toBeTruthy();
      expect(res.body.data.documentoVendaId).toBeNull();
      // metadata deve conter cotacaoId
      expect(res.body.data.metadata?.cotacaoId).toBeTruthy();
    });
  });

  // ── POST /:id/perder — com dataRecontato (1039-1049) ─────────────────────

  describe('POST /api/oportunidades/:id/perder — com dataRecontato', () => {
    it('cria tarefa de recontato ao perder com dataRecontato', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Cliente Recontato Perda',
        status: 'negociacao',
        ordem: 111,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/perder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          motivoPerda: 'Preço alto',
          dataRecontato: '2025-09-01',
          observacaoRecontato: 'Tentar novamente no próximo ciclo',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('perdida');

      // Verificar que a tarefa de recontato foi criada
      const [tarefa] = await db
        .select()
        .from(tarefas)
        .where(
          // @ts-ignore
          (await import('drizzle-orm')).and(
            (await import('drizzle-orm')).eq(tarefas.entidadeId, opp.id),
            (await import('drizzle-orm')).eq(tarefas.entidadeTipo, 'oportunidade'),
          ),
        );
      expect(tarefa).toBeDefined();
      expect(tarefa.concluida).toBe(false);
    });
  });

  // ── GET /:id/historico — usuário sem kanban:visualizar_todas (1137-1186) ──

  describe('GET /api/oportunidades/:id/historico — sem kanban:visualizar_todas', () => {
    it('vendedor vê histórico da própria oportunidade', async () => {
      const opp = await createTestOportunidade(corretoraId, vendedorId, {
        nomeCliente: 'Opp Historico Vendedor',
        status: 'lead',
        ordem: 112,
      });

      const res = await request(app.server)
        .get(`/api/oportunidades/${opp.id}/historico`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('vendedor recebe 404 ao tentar ver histórico de opp de outro (1161-1165)', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Admin Historico',
        status: 'lead',
        ordem: 113,
        vendedorOriginalId: adminId,
      });

      await request(app.server)
        .get(`/api/oportunidades/${opp.id}/historico`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(404);
    });
  });

  // ── POST /:id/vincular-cliente (1200-1223) ────────────────────────────────

  describe('POST /api/oportunidades/:id/vincular-cliente', () => {
    it('vincula um cliente existente à oportunidade', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Para Vincular',
        status: 'lead',
        ordem: 114,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/vincular-cliente`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ clienteId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.clienteId).toBe(clienteId);
    });

    it('retorna 404 quando cliente não encontrado', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Cliente Inexistente',
        status: 'lead',
        ordem: 115,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/vincular-cliente`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ clienteId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Cliente');
    });
  });

  // ── POST /:id/transferir — sem vendedorDestinoId (1297-1301) ─────────────

  describe('POST /api/oportunidades/:id/transferir — sem vendedorDestinoId', () => {
    it('retorna 400 quando vendedorDestinoId não é fornecido', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Transferir Sem Destino',
        status: 'lead',
        ordem: 116,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/transferir`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: 'Sem destino' })
        .expect(400);

      expect(res.body.success).toBe(false);
      // error pode ser objeto ou string de validação — apenas confirma a falha
      expect(res.body.success).toBe(false);
    });

    it('transfere oportunidade para outro vendedor com sucesso', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Para Transferir',
        status: 'lead',
        ordem: 117,
      });

      const res = await request(app.server)
        .post(`/api/oportunidades/${opp.id}/transferir`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendedorDestinoId: vendedor2Id, motivo: 'Redistribuição' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.vendedorId).toBe(vendedor2Id);
    });
  });

  // ── GET /:id/historico-transferencias — sem kanban:visualizar_todas (1453-1459)

  describe('GET /api/oportunidades/:id/historico-transferencias — sem kanban:visualizar_todas', () => {
    it('vendedor vê histórico de transferências da própria oportunidade', async () => {
      const opp = await createTestOportunidade(corretoraId, vendedorId, {
        nomeCliente: 'Opp Transferencia Historico',
        status: 'lead',
        ordem: 118,
      });

      const res = await request(app.server)
        .get(`/api/oportunidades/${opp.id}/historico-transferencias`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('vendedor recebe 404 ao tentar ver histórico de transferências de opp alheia', async () => {
      const opp = await createTestOportunidade(corretoraId, adminId, {
        nomeCliente: 'Opp Admin Transferencia',
        status: 'lead',
        ordem: 119,
        vendedorOriginalId: adminId,
      });

      await request(app.server)
        .get(`/api/oportunidades/${opp.id}/historico-transferencias`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(404);
    });
  });
});
