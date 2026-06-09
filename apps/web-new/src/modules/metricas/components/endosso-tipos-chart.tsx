
import * as React from 'react';
import { ChartBarMixed, BarChartData } from './chart-bar-mixed';
import { type ChartConfig } from '@/core/ui/chart';

type EndossoTipoData = {
  status: string;
  tipo: string;
  count: number;
};

type EndossoTiposChartProps = {
  data: EndossoTipoData[];
};

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const statusColors: Record<string, string> = {
  APROVADO: 'var(--chart-4)',
  RECUSADO: 'var(--chart-5)',
  SOLICITADO: 'var(--chart-3)',
  PENDENTE: 'var(--chart-2)',
  EM_ANALISE: 'var(--chart-1)',
};

export function EndossoTiposChart({ data }: EndossoTiposChartProps) {
  // Agrupar por tipo e somar os counts
  const groupedByType = data.reduce(
    (acc, item) => {
      const tipo = item.tipo || 'OUTROS';
      if (!acc[tipo]) {
        acc[tipo] = {
          tipo,
          total: 0,
          aprovados: 0,
          recusados: 0,
          solicitados: 0,
        };
      }
      acc[tipo].total += Number(item.count);

      if (item.status === 'APROVADO') {
        acc[tipo].aprovados += Number(item.count);
      } else if (item.status === 'RECUSADO') {
        acc[tipo].recusados += Number(item.count);
      } else if (item.status === 'SOLICITADO') {
        acc[tipo].solicitados += Number(item.count);
      }

      return acc;
    },
    {} as Record<
      string,
      {
        tipo: string;
        total: number;
        aprovados: number;
        recusados: number;
        solicitados: number;
      }
    >,
  );

  const aggregatedData = Object.values(groupedByType)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8); // Top 8 tipos de endosso

  const chartData: BarChartData[] = aggregatedData.map((item, index) => {
    // Determinar cor baseada no status predominante
    let color = 'var(--chart-1)';
    if (item.aprovados > item.recusados && item.aprovados > item.solicitados) {
      color = statusColors.APROVADO;
    } else if (
      item.recusados > item.aprovados &&
      item.recusados > item.solicitados
    ) {
      color = statusColors.RECUSADO;
    } else if (item.solicitados > 0) {
      color = statusColors.SOLICITADO;
    }

    return {
      name: formatEnumLabel(item.tipo),
      value: item.total,
      fill: color,
    };
  });

  const chartConfig: ChartConfig = aggregatedData.reduce(
    (acc, item) => {
      const key = formatEnumLabel(item.tipo);
      acc[key] = {
        label: formatEnumLabel(item.tipo),
        color: 'var(--chart-1)',
      };
      return acc;
    },
    {
      value: {
        label: 'Quantidade',
      },
    } as ChartConfig,
  );

  const totalEndossos = data.reduce((acc, item) => acc + Number(item.count), 0);
  const aprovados = data
    .filter((item) => item.status === 'APROVADO')
    .reduce((acc, item) => acc + Number(item.count), 0);
  const taxaAprovacao =
    totalEndossos > 0 ? ((aprovados / totalEndossos) * 100).toFixed(1) : '0';

  return (
    <ChartBarMixed
      data={chartData}
      title="Tipos de Endosso"
      description="Distribuição por tipo de endosso"
      trendText={`Taxa de aprovação: ${taxaAprovacao}%`}
      footerText={`${totalEndossos} endossos processados`}
      config={chartConfig}
    />
  );
}
