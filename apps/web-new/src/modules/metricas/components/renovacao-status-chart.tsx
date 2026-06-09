
import * as React from 'react';
import { ChartBarMixed, BarChartData } from './chart-bar-mixed';
import { type ChartConfig } from '@/core/ui/chart';

type RenovacaoStatusData = {
  status: string;
  count: number;
  premioAnterior: number;
  premioNovo: number;
};

type RenovacaoStatusChartProps = {
  data: RenovacaoStatusData[];
};

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const statusLabels: Record<string, string> = {
  RENOVADO: 'Renovado',
  PERDIDO: 'Perdido',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO_CLIENTE: 'Aguardando Cliente',
  EM_NEGOCIACAO: 'Em Negociação',
  CANCELADO: 'Cancelado',
  ARQUIVADO: 'Arquivado',
  NAO_TRABALHADO: 'Não Trabalhado',
  EM_PROSPECCAO: 'Em Prospecção',
  SOLICITADO: 'Solicitado',
  APROVADO: 'Aprovado',
  RECUSADO: 'Recusado',
};

const statusColors: Record<string, string> = {
  RENOVADO: 'var(--chart-4)',
  PERDIDO: 'var(--chart-5)',
  EM_ANDAMENTO: 'var(--chart-3)',
  AGUARDANDO_CLIENTE: 'var(--chart-2)',
  EM_NEGOCIACAO: 'var(--chart-1)',
  CANCELADO: 'var(--chart-5)',
};

export function RenovacaoStatusChart({ data }: RenovacaoStatusChartProps) {
  // Ordenar por count decrescente
  const sortedData = [...data].sort(
    (a, b) => Number(b.count) - Number(a.count),
  );

  const chartData: BarChartData[] = sortedData.map((item, index) => ({
    name: item.status,
    value: Number(item.count),
    fill: statusColors[item.status] || `var(--chart-${(index % 5) + 1})`,
  }));

  const chartConfig: ChartConfig = sortedData.reduce(
    (acc, item) => {
      const key = item.status;
      acc[key] = {
        label: statusLabels[item.status] || formatEnumLabel(item.status),
        color: statusColors[item.status] || 'var(--chart-1)',
      };
      return acc;
    },
    {
      value: {
        label: 'Quantidade',
      },
    } as ChartConfig,
  );

  const totalRenovacoes = data.reduce(
    (acc, item) => acc + Number(item.count),
    0,
  );
  const renovados = data.find((item) => item.status === 'RENOVADO')?.count || 0;
  const taxaRenovacao =
    totalRenovacoes > 0
      ? ((renovados / totalRenovacoes) * 100).toFixed(1)
      : '0';

  return (
    <ChartBarMixed
      data={chartData}
      title="Status de Renovações"
      description="Distribuição de renovações por status"
      trendText={`Taxa de renovação: ${taxaRenovacao}%`}
      footerText={`${renovados} de ${totalRenovacoes} renovações confirmadas`}
      config={chartConfig}
    />
  );
}
