import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  seguradorasParceiras,
  produtos,
  portalCotacaoSolicitacoes,
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
import {
  createTestClientePF,
} from '../../helpers/factories/cliente.factory';
import { generateTestToken } from '../../helpers/auth.helper';

async function createTestSeguradora(corretoraId: string) {
  const ts = Date.now();
  const [seg] = await db
    .insert(seguradorasParceiras)
    .values({
      corretoraId,
      cnpj: String(ts).slice(-14).padStart(14, '0'),
      razaoSocial: `Seguradora Teste ${ts}`,
      nomeFantasia: `Seg Fantasia ${ts}`,
      status: 'ATIVA',
    })
    .returning();
  return seg;
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

describe('/api/marketing — coverage', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let corretoraId: string;
  let adminToken: string;
  let adminId: string;

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
  });

  // ── GET /api/marketing/seguradoras-suporte ─────────────────────────────────

  describe('GET /api/marketing/seguradoras-suporte', () => {
    it('retorna 401 sem token', async () => {
      await request(app.server)
        .get('/api/marketing/seguradoras-suporte')
        .expect(401);
    });

    it('retorna lista de seguradoras ativas', async () => {
      await createTestSeguradora(corretoraId);

      const res = await request(app.server)
        .get('/api/marketing/seguradoras-suporte')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── PATCH /api/marketing/seguradoras-suporte/:id ───────────────────────────

  describe('PATCH /api/marketing/seguradoras-suporte/:id', () => {
    it('atualiza campos 24h da seguradora', async () => {
      const seg = await createTestSeguradora(corretoraId);

      const res = await request(app.server)
        .patch(`/api/marketing/seguradoras-suporte/${seg.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          telefone24h: '0800123456',
          whatsapp24h: '11999990000',
          horarioAtendimento24h: '24h',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.telefone24h).toBe('0800123456');
    });

    it('define campos 24h como null quando não fornecidos', async () => {
      const seg = await createTestSeguradora(corretoraId);

      const res = await request(app.server)
        .patch(`/api/marketing/seguradoras-suporte/${seg.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.telefone24h).toBeNull();
      expect(res.body.data.whatsapp24h).toBeNull();
      expect(res.body.data.horarioAtendimento24h).toBeNull();
    });

    it('retorna 404 para seguradora inexistente', async () => {
      await request(app.server)
        .patch('/api/marketing/seguradoras-suporte/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ telefone24h: '0800000000' })
        .expect(404);
    });
  });

  // ── GET /api/marketing/vendedores ──────────────────────────────────────────

  describe('GET /api/marketing/vendedores', () => {
    it('retorna lista de vendedores ativos', async () => {
      const res = await request(app.server)
        .get('/api/marketing/vendedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── GET /api/marketing/produtos-routing ────────────────────────────────────

  describe('GET /api/marketing/produtos-routing', () => {
    it('retorna produtos com vendedor portal configurado', async () => {
      await createTestProduto(corretoraId);

      const res = await request(app.server)
        .get('/api/marketing/produtos-routing')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── PATCH /api/marketing/produtos-routing/:id ──────────────────────────────

  describe('PATCH /api/marketing/produtos-routing/:id', () => {
    it('define vendedor para produto', async () => {
      const produto = await createTestProduto(corretoraId);

      const res = await request(app.server)
        .patch(`/api/marketing/produtos-routing/${produto.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendedorPortalId: adminId })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('remove vendedor do produto (null)', async () => {
      const produto = await createTestProduto(corretoraId);

      const res = await request(app.server)
        .patch(`/api/marketing/produtos-routing/${produto.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendedorPortalId: null })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 404 para produto inexistente', async () => {
      await request(app.server)
        .patch('/api/marketing/produtos-routing/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendedorPortalId: adminId })
        .expect(404);
    });

    it('retorna 404 para vendedor inexistente', async () => {
      const produto = await createTestProduto(corretoraId);

      await request(app.server)
        .patch(`/api/marketing/produtos-routing/${produto.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ vendedorPortalId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });
  });

  // ── GET /api/marketing/cotacoes ────────────────────────────────────────────

  describe('GET /api/marketing/cotacoes', () => {
    it('retorna lista de solicitacoes de cotacao', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);
      const produto = await createTestProduto(corretoraId);

      await db.insert(portalCotacaoSolicitacoes).values({
        corretoraId,
        clienteId: cliente.id,
        produtoId: produto.id,
        vendedorId: adminId,
        mensagem: 'Quero cotar',
        status: 'PENDENTE',
      });

      const res = await request(app.server)
        .get('/api/marketing/cotacoes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('filtra por status', async () => {
      const res = await request(app.server)
        .get('/api/marketing/cotacoes?status=PENDENTE')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      for (const item of res.body.data) {
        expect(item.status).toBe('PENDENTE');
      }
    });

    it('retorna todas quando status=TODAS', async () => {
      const res = await request(app.server)
        .get('/api/marketing/cotacoes?status=TODAS')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // ── PATCH /api/marketing/cotacoes/:id ──────────────────────────────────────

  describe('PATCH /api/marketing/cotacoes/:id', () => {
    it('atualiza status da solicitacao', async () => {
      const cliente = await createTestClientePF(corretoraId, adminId);

      const [solicitacao] = await db
        .insert(portalCotacaoSolicitacoes)
        .values({
          corretoraId,
          clienteId: cliente.id,
          status: 'PENDENTE',
        })
        .returning();

      const res = await request(app.server)
        .patch(`/api/marketing/cotacoes/${solicitacao.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ATENDIDO', vendedorId: adminId })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('retorna 404 para solicitacao inexistente', async () => {
      await request(app.server)
        .patch('/api/marketing/cotacoes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ATENDIDO' })
        .expect(404);
    });
  });
});
