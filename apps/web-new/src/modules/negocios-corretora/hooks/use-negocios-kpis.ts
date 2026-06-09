import { useMemo } from 'react';
import { formatCurrencyBR } from '@/core/utils/format-currency';

export function useNegociosKpis(documentos: any[]) {
  return useMemo(() => {
    let totalPremioLiquido = 0;
    let totalValorComissaoCorretora = 0;
    let somaPercentualComissao = 0;
    let countComissao = 0;

    for (const doc of documentos) {
      const premio = parseFloat(doc.premioLiquido ?? '0') || 0;
      totalPremioLiquido += premio;

      const comissaoCorretora = parseFloat(doc.valorComissaoCorretora ?? '0') || 0;
      totalValorComissaoCorretora += comissaoCorretora;

      if (premio > 0 && comissaoCorretora > 0) {
        somaPercentualComissao += (comissaoCorretora / premio) * 100;
        countComissao++;
      }
    }

    const mediaComissaoPercentual = countComissao > 0 ? somaPercentualComissao / countComissao : 0;

    const sparkline = documentos
      .slice(0, 6)
      .map((d) => parseFloat(d.premioLiquido ?? '0') || 0)
      .filter((v) => v > 0);

    return {
      totalPremioLiquido,
      totalValorComissaoCorretora,
      mediaComissaoPercentual,
      totalNegocios: documentos.length,
      sparkline,
      totalPremioFormatado: formatCurrencyBR(totalPremioLiquido),
      mediaComissaoFormatada: `${mediaComissaoPercentual.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`,
      totalCorretorFormatado: formatCurrencyBR(totalValorComissaoCorretora),
    };
  }, [documentos]);
}
