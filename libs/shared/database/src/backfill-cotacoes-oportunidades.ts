/**
 * Backfill de cotações para oportunidades ganhas que ficaram sem cotação.
 *
 * Contexto: antes da correção no endpoint `confirm-client`, oportunidades ganhas
 * direto no kanban (sem `metadata.pendenteCadastroCliente`) vinculavam o cliente
 * mas NÃO geravam a cotação, apesar de o card "Aguardando Cadastro de Cliente"
 * prometer "gerar a cotação". Este script recria essas cotações faltantes.
 *
 * Seguro para produção:
 *  - Idempotente: só age em oportunidades sem cotação (NOT EXISTS); rodar de novo é no-op.
 *  - Não toca em `cliente_id` (nada de janela sem cliente, ao contrário do hack manual).
 *  - Uma transação por oportunidade — falha em uma não derruba as outras.
 *  - Multi-tenant: varre todas as corretoras; numeração sequencial por corretora/mês.
 *  - Respeita `metadata.pendenteCadastroCliente` quando existir (produto/vigência/prêmio
 *    intencionais); senão usa os campos da própria oportunidade + vigência padrão de 1 ano.
 *
 * Uso:
 *   DRY_RUN=1 tsx libs/shared/database/src/backfill-cotacoes-oportunidades.ts   # só relata
 *   tsx libs/shared/database/src/backfill-cotacoes-oportunidades.ts             # aplica
 */
import 'dotenv/config';
import { and, eq, isNull, isNotNull, like, sql } from 'drizzle-orm';
import { db } from './connection.js';
import {
  cotacoes,
  cotacaoVendedores,
  oportunidades,
  oportunidadesHistorico,
} from './schema/index.js';

const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');

// Helpers inline (sem dependência de @ecotech/shared/utils para rodar standalone via tsx).
const SP_OFFSET_MS = -3 * 60 * 60 * 1000; // America/Sao_Paulo fixo desde 2019
function todayInSP(): string {
  return new Date(Date.now() + SP_OFFSET_MS).toISOString().slice(0, 10);
}
function addCalendarDays(date: string, days: number): string {
  const ms = new Date(date + 'T12:00:00Z').getTime() + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}
function generateNumeroCotacao(sequencial: number): string {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  return `COT-${ano}${mes}-${String(sequencial).padStart(5, '0')}`;
}

async function backfill() {
  console.log(`🚀 Backfill de cotações${DRY_RUN ? ' (DRY RUN — nada será gravado)' : ''}`);

  // Vítimas: ganha + cliente + produto + SEM cotação ativa vinculada.
  const vitimas = await db
    .select({
      id: oportunidades.id,
      corretoraId: oportunidades.corretoraId,
      clienteId: oportunidades.clienteId,
      vendedorId: oportunidades.vendedorId,
      produtoId: oportunidades.produtoId,
      valorFechado: oportunidades.valorFechado,
      premioEstimado: oportunidades.premioEstimado,
      metadata: oportunidades.metadata,
      nomeCliente: oportunidades.nomeCliente,
    })
    .from(oportunidades)
    .where(
      and(
        eq(oportunidades.status, 'ganha'),
        isNull(oportunidades.deletedAt),
        isNotNull(oportunidades.clienteId),
        isNotNull(oportunidades.produtoId),
        sql`NOT EXISTS (
          SELECT 1 FROM ${cotacoes} c
          WHERE c.oportunidade_id = ${oportunidades.id} AND c.deleted_at IS NULL
        )`,
      ),
    );

  console.log(`🔎 ${vitimas.length} oportunidade(s) sem cotação encontradas.\n`);

  let criadas = 0;
  let puladas = 0;
  const erros: { id: string; erro: string }[] = [];

  for (const opp of vitimas) {
    const pendente = (opp.metadata as any)?.pendenteCadastroCliente as any;

    // Mesma regra do confirm-client corrigido: usa o pendente quando completo,
    // senão deriva dos campos da própria oportunidade.
    const usarPendente = !!(
      pendente?.produtoId &&
      pendente?.dataVigenciaInicio &&
      pendente?.dataVigenciaFim
    );
    const produtoId = usarPendente ? pendente.produtoId : opp.produtoId!;
    const vigenciaInicio = usarPendente ? pendente.dataVigenciaInicio : todayInSP();
    const vigenciaFim = usarPendente
      ? pendente.dataVigenciaFim
      : addCalendarDays(vigenciaInicio, 365);
    const premio = usarPendente
      ? pendente.premioFinal ?? null
      : opp.valorFechado ?? opp.premioEstimado ?? null;
    const situacao = usarPendente ? pendente.situacao || 'NOVO' : 'NOVO';
    const seguradoraParceiraId = usarPendente ? pendente.seguradoraParceiraId || null : null;

    if (DRY_RUN) {
      console.log(
        `  • [DRY] ${opp.nomeCliente ?? opp.id} → produto=${produtoId} vig=${vigenciaInicio}..${vigenciaFim} premio=${premio ?? '—'} (${usarPendente ? 'metadata' : 'fallback'})`,
      );
      criadas++;
      continue;
    }

    try {
      const numeroCotacao = await db.transaction(async (tx) => {
        // Numeração via MAX(sufixo)+1 (não count): resiste a buracos na sequência
        // — deletar/perder uma cotação no meio do mês não causa colisão no UNIQUE
        // (corretora_id, numero_cotacao). Em script single-thread isso já garante
        // unicidade (MAX+1 é sempre > qualquer sufixo existente).
        const now = new Date();
        const prefixo = `COT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;

        const [{ maxSeq }] = await tx
          .select({
            maxSeq: sql<number>`COALESCE(MAX((regexp_match(${cotacoes.numeroCotacao}, '(\\d+)$'))[1]::int), 0)`,
          })
          .from(cotacoes)
          .where(
            and(
              eq(cotacoes.corretoraId, opp.corretoraId),
              like(cotacoes.numeroCotacao, `${prefixo}%`),
            ),
          );
        const numero = generateNumeroCotacao(Number(maxSeq ?? 0) + 1);

        const [nova] = await tx
          .insert(cotacoes)
          .values({
            corretoraId: opp.corretoraId,
            clienteId: opp.clienteId!,
            vendedorId: opp.vendedorId,
            produtoId,
            seguradoraParceiraId,
            numeroCotacao: numero,
            status: 'EM_ELABORACAO',
            situacao,
            vigenciaInicio,
            vigenciaFim,
            premioLiquido: premio,
            oportunidadeId: opp.id,
          })
          .returning();

        await tx.insert(cotacaoVendedores).values({
          cotacaoId: nova.id,
          vendedorId: opp.vendedorId,
          atribuidoPor: opp.vendedorId,
          ativo: true,
        });

        await tx
          .update(oportunidades)
          .set({
            metadata: {
              ...((opp.metadata as any) ?? {}),
              pendenteCadastroCliente: null,
              cotacaoId: nova.id,
            },
            updatedAt: new Date(),
          })
          .where(eq(oportunidades.id, opp.id));

        await tx.insert(oportunidadesHistorico).values({
          oportunidadeId: opp.id,
          usuarioId: opp.vendedorId,
          tipo: 'mudanca_status',
          statusAnterior: 'ganha',
          statusNovo: 'ganha',
          descricao: 'Cotação criada (backfill)',
        });

        return numero;
      });
      console.log(`  ✓ ${opp.nomeCliente ?? opp.id} → ${numeroCotacao}`);
      criadas++;
    } catch (e: any) {
      erros.push({ id: opp.id, erro: e?.cause?.message ?? e?.message ?? String(e) });
      console.error(`  ✗ ${opp.nomeCliente ?? opp.id}: ${e?.cause?.message ?? e?.message ?? e}`);
    }
  }

  console.log(
    `\n📊 Resumo: ${criadas} cotação(ões) ${DRY_RUN ? 'que seriam criadas' : 'criadas'}, ${puladas} puladas, ${erros.length} erro(s).`,
  );
  if (erros.length) process.exitCode = 1;
}

backfill()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error('❌ Falha no backfill:', e);
    process.exit(1);
  });
