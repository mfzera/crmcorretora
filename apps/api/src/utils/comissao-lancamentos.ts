import { db, comissaoLancamentos, documentosVenda } from '@ecotech/shared/database';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import type { NewComissaoLancamento } from '@ecotech/shared/database';

type TxLike = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | TxLike;

/**
 * Adiciona N meses a uma data, preservando o dia (clampado ao último dia do mês).
 */
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Retorna o primeiro dia do mês de uma data ISO string.
 */
function firstOfMonth(dateStr: string): string {
  return dateStr.slice(0, 7) + '-01';
}

interface GerarLancamentosInput {
  documentoVendaId: string;
  corretoraId: string;
  numeroParcelas: number;
  valorComissaoTotal: number;
  valorComissaoVendedor: number | null;
  valorComissaoCorretora: number | null;
  percentualComissao: number | null;
  valorPremioTotal: number | null;
  vigenciaInicio: string; // YYYY-MM-DD
  modalidadePagamentoVendedor: 'AVISTA' | 'PARCELADO';
}

/**
 * Gera os lançamentos de comissão para um documento de venda.
 * Idempotente: não recria se já existirem lançamentos NORMAL para o documento.
 */
export async function generateCommissionEntries(
  input: GerarLancamentosInput,
): Promise<void> {
  const {
    documentoVendaId,
    corretoraId,
    numeroParcelas,
    valorComissaoTotal,
    valorComissaoVendedor,
    valorComissaoCorretora,
    percentualComissao,
    valorPremioTotal,
    vigenciaInicio,
    modalidadePagamentoVendedor,
  } = input;

  // Verificar se já existem lançamentos NORMAL para este documento
  const jaExistem = await db.query.comissaoLancamentos.findFirst({
    where: and(
      eq(comissaoLancamentos.documentoVendaId, documentoVendaId),
      eq(comissaoLancamentos.tipo, 'NORMAL'),
    ),
    columns: { id: true },
  });

  if (jaExistem) return;

  const n = Math.max(1, numeroParcelas);
  const valorPorParcela = valorComissaoTotal / n;
  const valorVendedorPorParcela =
    valorComissaoVendedor !== null ? valorComissaoVendedor / n : null;
  const valorCorretoraPorParcela =
    valorComissaoCorretora !== null ? valorComissaoCorretora / n : null;
  const premioPorParcela =
    valorPremioTotal !== null ? valorPremioTotal / n : null;

  const lancamentos: NewComissaoLancamento[] = [];

  for (let i = 0; i < n; i++) {
    const dataVencimento = addMonths(vigenciaInicio, i);
    const dataCompetencia = firstOfMonth(dataVencimento);

    // Na modalidade AVISTA com múltiplas parcelas:
    // o vendedor é pago na 1ª parcela com o total completo.
    // A corretora acompanha o recebimento parcelado da seguradora.
    const isAvista = modalidadePagamentoVendedor === 'AVISTA';
    const valorVendedorEfetivo =
      isAvista && n > 1
        ? i === 0
          ? valorComissaoVendedor !== null
            ? parseFloat(valorComissaoVendedor.toFixed(2))
            : null
          : 0
        : valorVendedorPorParcela !== null
          ? parseFloat(valorVendedorPorParcela.toFixed(2))
          : null;

    lancamentos.push({
      corretoraId,
      documentoVendaId,
      tipo: 'NORMAL',
      descricao:
        n === 1
          ? 'Comissão à vista'
          : `Parcela ${i + 1} de ${n}`,
      numeroParcela: i + 1,
      totalParcelas: n,
      valorPremioReferencia:
        premioPorParcela !== null
          ? parseFloat(premioPorParcela.toFixed(2)).toString()
          : null,
      percentualComissao:
        percentualComissao !== null
          ? percentualComissao.toString()
          : null,
      valorComissaoTotal: parseFloat(valorPorParcela.toFixed(2)).toString(),
      valorComissaoVendedor:
        valorVendedorEfetivo !== null
          ? valorVendedorEfetivo.toString()
          : null,
      valorComissaoCorretora:
        valorCorretoraPorParcela !== null
          ? parseFloat(valorCorretoraPorParcela.toFixed(2)).toString()
          : null,
      dataCompetencia,
      dataVencimento,
      statusRecebimentoSeguradora: 'AGUARDANDO',
      statusPagamentoVendedor:
        isAvista && i === 0 ? 'PENDENTE' : isAvista ? 'PENDENTE' : 'PENDENTE',
    });
  }

  if (lancamentos.length > 0) {
    await db.insert(comissaoLancamentos).values(lancamentos);
  }
}

/**
 * Cancela todos os lançamentos AGUARDANDO/PENDENTE de um documento.
 * Chamado quando o documento é cancelado.
 * Retorna os lançamentos que já foram recebidos mas ainda não pagos ao vendedor
 * (para eventual estorno manual ou automático).
 */
export async function cancelDocumentEntries(
  documentoVendaId: string,
): Promise<{ lancamentosJaRecebidos: number }> {
  // 1. Cancelar lançamentos ainda não recebidos da seguradora
  await db
    .update(comissaoLancamentos)
    .set({
      statusPagamentoVendedor: 'CANCELADO',
      statusRecebimentoSeguradora: 'NAO_APLICAVEL',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(comissaoLancamentos.documentoVendaId, documentoVendaId),
        inArray(comissaoLancamentos.statusRecebimentoSeguradora, [
          'AGUARDANDO',
        ]),
        inArray(comissaoLancamentos.statusPagamentoVendedor, ['PENDENTE']),
      ),
    );

  // 2. Contar lançamentos já recebidos mas não pagos (para informar o usuário)
  const recebidosNaoPagos = await db.query.comissaoLancamentos.findMany({
    where: and(
      eq(comissaoLancamentos.documentoVendaId, documentoVendaId),
      eq(comissaoLancamentos.statusRecebimentoSeguradora, 'RECEBIDO'),
      eq(comissaoLancamentos.statusPagamentoVendedor, 'PENDENTE'),
    ),
    columns: { id: true },
  });

  return { lancamentosJaRecebidos: recebidosNaoPagos.length };
}

/**
 * Gera um lançamento de ajuste por endosso que alterou o prêmio/comissão.
 * Valor pode ser negativo (desconto) ou positivo (aumento).
 */
export async function generateEndorsementAdjustmentEntry(
  {
    documentoVendaId,
    corretoraId,
    endossoId,
    diferencaComissao,
    diferencaComissaoVendedor,
    diferencaComissaoCorretora,
    dataVigenciaEndosso,
    descricao,
  }: {
    documentoVendaId: string;
    corretoraId: string;
    endossoId: string;
    diferencaComissao: number;
    diferencaComissaoVendedor: number | null;
    diferencaComissaoCorretora: number | null;
    dataVigenciaEndosso: string;
    descricao: string;
  },
  executor: DbOrTx = db,
): Promise<void> {
  if (diferencaComissao === 0) return;

  await executor.insert(comissaoLancamentos).values({
    corretoraId,
    documentoVendaId,
    endossoId,
    tipo: 'AJUSTE_ENDOSSO',
    descricao,
    numeroParcela: 1,
    totalParcelas: 1,
    valorComissaoTotal: diferencaComissao.toFixed(2),
    valorComissaoVendedor:
      diferencaComissaoVendedor !== null
        ? diferencaComissaoVendedor.toFixed(2)
        : null,
    valorComissaoCorretora:
      diferencaComissaoCorretora !== null
        ? diferencaComissaoCorretora.toFixed(2)
        : null,
    dataCompetencia: firstOfMonth(dataVigenciaEndosso),
    dataVencimento: dataVigenciaEndosso,
    statusRecebimentoSeguradora:
      diferencaComissao > 0 ? 'AGUARDANDO' : 'NAO_APLICAVEL',
    statusPagamentoVendedor: 'PENDENTE',
  });
}
