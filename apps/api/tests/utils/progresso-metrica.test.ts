/**
 * Testes para utils/progresso-metrica.ts
 * Cobre:
 * - calcularProgresso (todos os tipos de métrica)
 * - resolverUsuarioIds (escopo individual, equipe, corretora-wide)
 * - concederBadge
 * - verificarMetasPendentes
 * - verificarMissoesPendentes
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@ecotech/shared/database';
import {
  metas,
  missoes,
  badgeTipos,
  usuarioBadges,
  notificacoes,
  equipes,
  usuarios,
  documentosVenda,
  cotacoes,
  renovacoesComerciais,
  produtos,
  clientes,
} from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import {
  calculateProgress,
  resolveUserIds,
  awardBadge,
  checkPendingGoals,
  checkPendingMissions,
} from '../../src/utils/progresso-metrica.js';
import { cleanDatabase } from '../setup/test-setup';
import {
  createTestPlano,
  createTestCorretora,
} from '../helpers/factories/corretora.factory';
import { createAdminCargo, createTestUsuario } from '../helpers/factories/usuario.factory';

describe('utils/progresso-metrica', () => {
  let corretoraId: string;
  let vendedorId: string;
  let gestorId: string;
  let produtoId: string;
  let clienteId: string;

  beforeAll(async () => {
    await cleanDatabase();

    const plano = await createTestPlano();
    const corretora = await createTestCorretora(plano.id);
    corretoraId = corretora.id;

    const cargo = await createAdminCargo(corretoraId);
    const gestor = await createTestUsuario(corretoraId, cargo.id);
    gestorId = gestor.id;

    const vendedor = await createTestUsuario(corretoraId, cargo.id, {
      nome: `Vendedor Progresso ${Date.now()}`,
      email: `vendedor.progresso.${Date.now()}@teste.com`,
    });
    vendedorId = vendedor.id;

    // Produto para documentos
    const [produto] = await db
      .insert(produtos)
      .values({ corretoraId, nomeProduto: 'Produto Progresso', tipoSeguro: 'AUTO', ativo: true })
      .returning();
    produtoId = produto.id;

    // Cliente para documentos
    const ts = Date.now();
    const [cliente] = await db
      .insert(clientes)
      .values({
        corretoraId,
        vendedorId,
        tipoPessoa: 'PF',
        nome: `Cliente Progresso ${ts}`,
        cpf: String(ts).slice(-11).padStart(11, '0'),
        email: `cliente.progresso.${ts}@teste.com`,
        ativo: true,
      })
      .returning();
    clienteId = cliente.id;
  });

  // ── calcularProgresso ─────────────────────────────────────────────────────

  describe('calcularProgresso', () => {
    it('retorna 0 quando usuarioIds está vazio', async () => {
      const result = await calculateProgress(corretoraId, 'novos_seguros', '2020-01-01', '2020-12-31', []);
      expect(result).toBe(0);
    });

    it('conta novos_seguros: documentos aprovados com cotação NOVO', async () => {
      const ts = Date.now();
      const dataAprovacao = new Date();

      // Criar cotação com situacao=NOVO
      const [cotacao] = await db
        .insert(cotacoes)
        .values({
          corretoraId,
          clienteId,
          vendedorId,
          produtoId,
          numeroCotacao: `COT-NS-${ts}`,
          situacao: 'NOVO',
          status: 'EM_ELABORACAO',
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          premioLiquido: '1000',
          percentualComissao: '10',
          valorComissao: '100',
        })
        .returning();

      // Criar documento de venda aprovado com referência à cotação
      const [doc] = await db
        .insert(documentosVenda)
        .values({
          corretoraId,
          clienteId,
          vendedorId,
          produtoId,
          numeroDocumento: `DOC-NS-${ts}`,
          tipoDocumento: 'COTACAO_DIRETA',
          status: 'ATIVO',
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          moeda: 'BRL',
          premioLiquido: '1000',
          percentualComissao: '10',
          valorComissao: '100',
          dataAprovacaoCadastro: dataAprovacao,
        })
        .returning();

      // Linkar cotação ao documento
      await db
        .update(cotacoes)
        .set({ documentoVendaId: doc.id })
        .where(eq(cotacoes.id, cotacao.id));

      const hoje = new Date().toISOString().split('T')[0];
      const result = await calculateProgress(corretoraId, 'novos_seguros', '2020-01-01', hoje, [vendedorId]);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('conta renovacoes: renovações com status RENOVADO', async () => {
      const ts = Date.now();
      const dataFin = new Date();

      const [docAnterior] = await db
        .insert(documentosVenda)
        .values({
          corretoraId,
          clienteId,
          vendedorId,
          produtoId,
          numeroDocumento: `DOC-REN-BASE-${ts}`,
          tipoDocumento: 'COTACAO_DIRETA',
          status: 'ATIVO',
          vigenciaInicio: '2025-01-01',
          vigenciaFim: '2025-12-31',
          moeda: 'BRL',
          premioLiquido: '1000',
          percentualComissao: '10',
          valorComissao: '100',
        })
        .returning();

      await db.insert(renovacoesComerciais).values({
        corretoraId,
        vendedorId,
        documentoVendaAnteriorId: docAnterior.id,
        clienteId,
        dataVencimento: '2025-12-31',
        status: 'RENOVADO',
        dataFinalizacao: dataFin,
      });

      const hoje = new Date().toISOString().split('T')[0];
      const result = await calculateProgress(corretoraId, 'renovacoes', '2020-01-01', hoje, [vendedorId]);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('conta cotacoes: cotações do período', async () => {
      const ts = Date.now();

      await db.insert(cotacoes).values({
        corretoraId,
        clienteId,
        vendedorId,
        produtoId,
        numeroCotacao: `COT-COUNT-${ts}`,
        situacao: 'NOVO',
        status: 'EM_ELABORACAO',
        vigenciaInicio: '2025-01-01',
        vigenciaFim: '2025-12-31',
        premioLiquido: '800',
        percentualComissao: '10',
        valorComissao: '80',
      });

      const hoje = new Date().toISOString().split('T')[0];
      const result = await calculateProgress(corretoraId, 'cotacoes', '2020-01-01', hoje, [vendedorId]);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('soma valor_premio: soma premioLiquido de documentos ativos/confirmados', async () => {
      const ts = Date.now();

      await db.insert(documentosVenda).values({
        corretoraId,
        clienteId,
        vendedorId,
        produtoId,
        numeroDocumento: `DOC-VP-${ts}`,
        tipoDocumento: 'COTACAO_DIRETA',
        status: 'VENDA_CONFIRMADA',
        vigenciaInicio: '2025-01-01',
        vigenciaFim: '2025-12-31',
        moeda: 'BRL',
        premioLiquido: '2500',
        percentualComissao: '10',
        valorComissao: '250',
      });

      const hoje = new Date().toISOString().split('T')[0];
      const result = await calculateProgress(corretoraId, 'valor_premio', '2020-01-01', hoje, [vendedorId]);
      expect(result).toBeGreaterThanOrEqual(2500);
    });

    it('retorna 0 para tipo de métrica desconhecido', async () => {
      const result = await calculateProgress(
        corretoraId,
        'tipo_invalido' as any,
        '2020-01-01',
        '2020-12-31',
        [vendedorId],
      );
      expect(result).toBe(0);
    });
  });

  // ── resolverUsuarioIds ────────────────────────────────────────────────────

  describe('resolverUsuarioIds', () => {
    it('retorna [usuarioId] quando usuarioId é fornecido', async () => {
      const ids = await resolveUserIds(corretoraId, null, vendedorId);
      expect(ids).toEqual([vendedorId]);
    });

    it('retorna membros da equipe quando equipeId é fornecido', async () => {
      const [equipe] = await db
        .insert(equipes)
        .values({ corretoraId, nome: `Equipe Progresso ${Date.now()}`, gestorId })
        .returning();

      // Associar vendedor à equipe
      await db.update(usuarios).set({ equipeId: equipe.id }).where(eq(usuarios.id, vendedorId));

      const ids = await resolveUserIds(corretoraId, equipe.id, null);
      expect(ids).toContain(vendedorId);

      // Limpar
      await db.update(usuarios).set({ equipeId: null }).where(eq(usuarios.id, vendedorId));
    });

    it('retorna equipe vazia quando nenhum membro na equipe', async () => {
      const [equipeVazia] = await db
        .insert(equipes)
        .values({ corretoraId, nome: `Equipe Vazia ${Date.now()}`, gestorId })
        .returning();

      const ids = await resolveUserIds(corretoraId, equipeVazia.id, null);
      expect(ids).toEqual([]);
    });

    it('retorna todos os usuários da corretora quando sem escopo', async () => {
      const ids = await resolveUserIds(corretoraId, null, null);
      expect(ids.length).toBeGreaterThanOrEqual(2); // pelo menos vendedorId e gestorId
      expect(ids).toContain(vendedorId);
      expect(ids).toContain(gestorId);
    });
  });

  // ── concederBadge ─────────────────────────────────────────────────────────

  describe('concederBadge', () => {
    it('concede badge e cria notificação quando badge_tipo existe', async () => {
      const slug = `test-slug-${Date.now()}`;
      const [bt] = await db
        .insert(badgeTipos)
        .values({ slug, nome: `Badge ${slug}`, descricao: 'Teste', icone: 'star', cor: '#000000' })
        .returning();

      await awardBadge({
        corretoraId,
        usuarioId: vendedorId,
        badgeSlug: slug,
        concedidoPorId: gestorId,
        observacao: 'Teste de badge',
      });

      const badge = await db.query.usuarioBadges.findFirst({
        where: eq(usuarioBadges.badgeTipoId, bt.id),
      });
      expect(badge).toBeDefined();
      expect(badge?.usuarioId).toBe(vendedorId);

      const notif = await db.query.notificacoes.findFirst({
        where: eq(notificacoes.usuarioId, vendedorId),
      });
      expect(notif).toBeDefined();
      expect(notif?.titulo).toContain(bt.nome);
    });

    it('não faz nada quando badge_tipo não existe', async () => {
      const contantesAntes = await db.select().from(usuarioBadges);

      await awardBadge({
        corretoraId,
        usuarioId: vendedorId,
        badgeSlug: 'slug-inexistente-99999',
      });

      const constantesDepois = await db.select().from(usuarioBadges);
      expect(constantesDepois.length).toBe(contantesAntes.length);
    });
  });

  // ── verificarMetasPendentes ───────────────────────────────────────────────

  describe('verificarMetasPendentes', () => {
    it('expira metas ativas com data vencida', async () => {
      const [meta] = await db
        .insert(metas)
        .values({
          corretoraId,
          criadaPorId: gestorId,
          titulo: 'Meta Expirar Auto',
          tipoMetrica: 'novos_seguros',
          valorAlvo: '100',
          dataInicio: '2020-01-01',
          dataFim: '2020-12-31',
          status: 'ATIVA',
        })
        .returning();

      await checkPendingGoals(corretoraId, vendedorId);

      const atualizada = await db.query.metas.findFirst({ where: eq(metas.id, meta.id) });
      expect(atualizada?.status).toBe('EXPIRADA');
    });

    it('conclui meta quando progresso atingiu alvo', async () => {
      // Meta com valorAlvo=0 → sempre concluída (progresso >= 0)
      const [meta] = await db
        .insert(metas)
        .values({
          corretoraId,
          criadaPorId: gestorId,
          titulo: 'Meta Concluir Auto',
          tipoMetrica: 'novos_seguros',
          valorAlvo: '0',
          dataInicio: '2020-01-01',
          dataFim: '2099-12-31',
          status: 'ATIVA',
          usuarioId: vendedorId,
        })
        .returning();

      await checkPendingGoals(corretoraId, vendedorId);

      const atualizada = await db.query.metas.findFirst({ where: eq(metas.id, meta.id) });
      expect(atualizada?.status).toBe('CONCLUIDA');
    });
  });

  // ── verificarMissoesPendentes ─────────────────────────────────────────────

  describe('verificarMissoesPendentes', () => {
    it('expira missões pendentes com prazo vencido', async () => {
      const [missao] = await db
        .insert(missoes)
        .values({
          corretoraId,
          criadaPorId: gestorId,
          titulo: 'Missão Expirar Auto',
          tipoMetrica: 'novos_seguros',
          valorAlvo: '100',
          dataInicio: '2020-01-01',
          prazo: '2020-12-31',
          status: 'PENDENTE',
        })
        .returning();

      await checkPendingMissions(corretoraId, vendedorId);

      const atualizada = await db.query.missoes.findFirst({ where: eq(missoes.id, missao.id) });
      expect(atualizada?.status).toBe('EXPIRADA');
    });

    it('conclui missão quando progresso atingiu alvo (sem badge específico)', async () => {
      // Garantir que badge "missao_cumprida" existe
      const existeBadge = await db.query.badgeTipos.findFirst({
        where: eq(badgeTipos.slug, 'missao_cumprida'),
      });
      if (!existeBadge) {
        await db.insert(badgeTipos).values({
          slug: 'missao_cumprida',
          nome: 'Missão Cumprida',
          descricao: 'Badge por completar missão',
          icone: 'star', cor: '#000000',
        });
      }

      const [missao] = await db
        .insert(missoes)
        .values({
          corretoraId,
          criadaPorId: gestorId,
          titulo: 'Missão Concluir Auto',
          tipoMetrica: 'novos_seguros',
          valorAlvo: '0',
          dataInicio: '2020-01-01',
          prazo: '2099-12-31',
          status: 'PENDENTE',
          usuarioId: vendedorId,
        })
        .returning();

      await checkPendingMissions(corretoraId, vendedorId);

      const atualizada = await db.query.missoes.findFirst({ where: eq(missoes.id, missao.id) });
      expect(atualizada?.status).toBe('CONCLUIDA');
    });

    it('conclui missão e concede badge específico quando badgeTipoId está configurado', async () => {
      const slug = `missao-badge-especifico-${Date.now()}`;
      const [bt] = await db
        .insert(badgeTipos)
        .values({ slug, nome: `Badge Missão ${slug}`, descricao: 'Específico', icone: 'star', cor: '#000000' })
        .returning();

      const [missao] = await db
        .insert(missoes)
        .values({
          corretoraId,
          criadaPorId: gestorId,
          titulo: 'Missão Com Badge Específico',
          tipoMetrica: 'novos_seguros',
          valorAlvo: '0',
          dataInicio: '2020-01-01',
          prazo: '2099-12-31',
          status: 'EM_ANDAMENTO',
          usuarioId: vendedorId,
          badgeTipoId: bt.id,
        })
        .returning();

      await checkPendingMissions(corretoraId, vendedorId);

      const atualizada = await db.query.missoes.findFirst({ where: eq(missoes.id, missao.id) });
      expect(atualizada?.status).toBe('CONCLUIDA');

      const badge = await db.query.usuarioBadges.findFirst({
        where: eq(usuarioBadges.badgeTipoId, bt.id),
      });
      expect(badge).toBeDefined();
    });
  });
});
