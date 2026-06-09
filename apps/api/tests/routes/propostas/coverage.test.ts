import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  clientes,
  produtos,
  propostasComerciais,
  oportunidades,
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

// ── Helpers ────────────────────────────────────────────────────────────────────

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
      ativo: true,
    })
    .returning();
  return cliente;
}

async function createTestProduto(
  corretoraId: string,
  overrides: Record<string, unknown> = {},
) {
  const ts = Date.now();
  const [produto] = await db
    .insert(produtos)
    .values({
      corretoraId,
      nomeProduto: `Produto Cov ${ts}`,
      tipoSeguro: 'AUTO',
      ativo: true,
      ...overrides,
    } as any)
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
      numeroPropostaInterno: `PROP-COV-${ts}`,
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

async function createTestOportunidade(
  corretoraId: string,
  vendedorId: string,
  clienteId: string,
  produtoId: string,
  overrides: Record<string, unknown> = {},
) {
  const ts = Date.now();
  const [oportunidade] = await db
    .insert(oportunidades)
    .values({
      corretoraId,
      vendedorId,
      vendedorOriginalId: vendedorId,
      clienteId,
      produtoId,
      nomeCliente: `Cliente Oport ${ts}`,
      status: 'negociacao',
      prioridade: 'media',
      temperatura: 'morno',
      ordem: 0,
      ...overrides,
    } as any)
    .returning();
  return oportunidade;
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('/api/propostas — coverage gaps', () => {
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

  // ── POST / — comissão padrão do produto (linha 103) ───────────────────────────

  describe('POST /api/propostas — percentualComissaoPadrao do produto', () => {
    it('usa percentualComissaoPadrao do produto quando percentualComissao não é enviado', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId, {
        percentualComissaoPadrao: '5.00',
      });

      const res = await request(app.server)
        .post('/api/propostas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clienteId: cliente.id,
          produtoId: produto.id,
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: 2000,
          // percentualComissao deliberadamente omitido
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      // 5% de 2000 = 100
      expect(parseFloat(res.body.data.percentualComissao)).toBe(5);
      expect(parseFloat(res.body.data.valorComissao)).toBe(100);
    });
  });

  // ── PATCH /:id — proposta inexistente (linhas 337-338) ────────────────────────

  describe('PATCH /api/propostas/:id — proposta inexistente', () => {
    it('retorna 404 para proposta inexistente', async () => {
      const res = await request(app.server)
        .patch('/api/propostas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ observacoes: 'test' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /:id/aprovar — atualização automática de oportunidade (linhas 522-527) ─

  describe('POST /api/propostas/:id/aprovar — automação oportunidade', () => {
    it('move oportunidade relacionada para "ganha" ao aprovar proposta', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      // Criar oportunidade vinculada ao cliente
      const oportunidade = await createTestOportunidade(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'negociacao' },
      );

      // Criar proposta em status ENVIADA (válido para aprovação)
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

      // Verificar que a oportunidade foi movida para 'ganha'
      const oportunidadeAtualizada = await db.query.oportunidades.findFirst({
        where: (t, { eq }) => eq(t.id, oportunidade.id),
      });
      expect(oportunidadeAtualizada?.status).toBe('ganha');
    });
  });

  // ── POST /:id/recusar — atualização automática de oportunidade (linhas 639-645) ─

  describe('POST /api/propostas/:id/recusar — automação oportunidade', () => {
    it('move oportunidade relacionada para "perdida" ao recusar proposta', async () => {
      const cliente = await createTestCliente(corretoraId, usuarioId);
      const produto = await createTestProduto(corretoraId);

      // Criar oportunidade vinculada ao cliente
      const oportunidade = await createTestOportunidade(
        corretoraId,
        usuarioId,
        cliente.id,
        produto.id,
        { status: 'negociacao' },
      );

      // Criar proposta em status ENVIADA (válido para recusa)
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
        .send({ motivoRecusa: 'Preço fora do mercado' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RECUSADA');

      // Verificar que a oportunidade foi movida para 'perdida'
      const oportunidadeAtualizada = await db.query.oportunidades.findFirst({
        where: (t, { eq }) => eq(t.id, oportunidade.id),
      });
      expect(oportunidadeAtualizada?.status).toBe('perdida');
    });
  });
});
