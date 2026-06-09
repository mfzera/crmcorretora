import { db } from '@ecotech/shared/database';
import { documentosVenda } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import { generateCommissionEntries } from './comissao-lancamentos.js';

/**
 * Calcula automaticamente as comissões quando um documento é aprovado/emitido
 * e em seguida gera os lançamentos de comissão parcelados.
 */
export async function calculateCommissions(
  documentoVendaId: string,
  corretoraId: string,
) {
  try {
    const documento = await db.query.documentosVenda.findFirst({
      where: eq(documentosVenda.id, documentoVendaId),
    });

    if (!documento) {
      console.warn(`Documento ${documentoVendaId} não encontrado`);
      return null;
    }

    // Se já tem comissão calculada, apenas garantir que lançamentos existam
    const jaCalculado =
      documento.valorComissao && parseFloat(documento.valorComissao) > 0;

    if (!jaCalculado) {
      const premioTotal = parseFloat(documento.premioLiquido || '0');
      const percentualComissao = parseFloat(documento.percentualComissao || '0');

      if (premioTotal === 0 || percentualComissao === 0) {
        console.log(
          `Documento ${documentoVendaId} sem prêmio ou percentual de comissão definido`,
        );
        return documento;
      }

      const valorComissao = (premioTotal * percentualComissao) / 100;
      const updateData: any = {
        valorComissao: valorComissao.toFixed(2),
        updatedAt: new Date(),
      };

      if (documento.negocioCorretora && documento.percentualCorretora) {
        const percentualCorretora = parseFloat(documento.percentualCorretora);
        const valorComissaoCorretora =
          (valorComissao * percentualCorretora) / 100;
        const valorComissaoVendedor = valorComissao - valorComissaoCorretora;

        updateData.valorComissaoCorretora = valorComissaoCorretora.toFixed(2);
        updateData.valorComissaoVendedor = valorComissaoVendedor.toFixed(2);

        console.log(
          `💰 Comissão split — Total: R$ ${valorComissao.toFixed(2)} | Corretora: R$ ${valorComissaoCorretora.toFixed(2)} | Vendedor: R$ ${valorComissaoVendedor.toFixed(2)}`,
        );
      } else {
        console.log(`💰 Comissão — Total: R$ ${valorComissao.toFixed(2)}`);
      }

      const [updated] = await db
        .update(documentosVenda)
        .set(updateData)
        .where(eq(documentosVenda.id, documentoVendaId))
        .returning();

      // Gerar lançamentos com base no documento atualizado
      await _generateEntries(updated, corretoraId);

      console.log(
        `✅ Comissões calculadas para documento ${documentoVendaId}`,
      );

      return updated;
    }

    // Comissão já calculada — apenas garantir lançamentos
    await _generateEntries(documento, corretoraId);
    return documento;
  } catch (error) {
    console.error('❌ Erro ao calcular comissões:', error);
    return null;
  }
}

async function _generateEntries(documento: any, corretoraId: string) {
  const valorComissao = parseFloat(documento.valorComissao || '0');
  if (valorComissao <= 0) return;

  await generateCommissionEntries({
    documentoVendaId: documento.id,
    corretoraId,
    numeroParcelas: documento.numeroParcelas ?? 1,
    valorComissaoTotal: valorComissao,
    valorComissaoVendedor: documento.valorComissaoVendedor
      ? parseFloat(documento.valorComissaoVendedor)
      : null,
    valorComissaoCorretora: documento.valorComissaoCorretora
      ? parseFloat(documento.valorComissaoCorretora)
      : null,
    percentualComissao: documento.percentualComissao
      ? parseFloat(documento.percentualComissao)
      : null,
    valorPremioTotal: documento.premioLiquido
      ? parseFloat(documento.premioLiquido)
      : null,
    vigenciaInicio: documento.vigenciaInicio,
    modalidadePagamentoVendedor: documento.modalidadePagamentoVendedor ?? 'AVISTA',
  });
}
