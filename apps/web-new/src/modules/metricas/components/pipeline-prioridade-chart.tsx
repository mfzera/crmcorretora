
import * as React from 'react';
import { ChartBarActive, BarActiveChartData } from './chart-bar-active';
import { type ChartConfig } from '@/core/ui/chart';

type PipelinePrioridadeData = {
  prioridade: string;
  count: number;
};

type PipelinePrioridadeChartProps = {
  data: PipelinePrioridadeData[];
};

const prioridadeLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

const prioridadeColors: Record<string, string> = {
  baixa: 'var(--chart-1)',
  media: 'var(--chart-3)',
  alta: 'var(--chart-4)',
  urgente: 'var(--chart-5)',
};

// Ordem de prioridade para garantir que apareçam nessa sequência
const prioridadeOrder: Record<string, number> = {
  baixa: 1,
  media: 2,
  alta: 3,
  urgente: 4,
};

export function PipelinePrioridadeChart({
  data,
}: PipelinePrioridadeChartProps) {
  // Ordenar por ordem de prioridade
  const sortedData = [...data].sort(
    (a, b) =>
      (prioridadeOrder[a.prioridade] || 0) -
      (prioridadeOrder[b.prioridade] || 0),
  );

  const chartData: BarActiveChartData[] = sortedData.map((item) => ({
    name: item.prioridade,
    value: Number(item.count),
    fill: prioridadeColors[item.prioridade] || 'var(--chart-1)',
  }));

  const chartConfig: ChartConfig = sortedData.reduce(
    (acc, item) => {
      const key = item.prioridade;
      acc[key] = {
        label: prioridadeLabels[item.prioridade] || item.prioridade,
        color: prioridadeColors[item.prioridade] || 'var(--chart-1)',
      };
      return acc;
    },
    {
      value: {
        label: 'Oportunidades',
      },
    } as ChartConfig,
  );

  const totalOportunidades = data.reduce(
    (acc, item) => acc + Number(item.count),
    0,
  );
  const urgentes =
    data.find((item) => item.prioridade === 'urgente')?.count || 0;
  const percentualUrgentes =
    totalOportunidades > 0
      ? ((urgentes / totalOportunidades) * 100).toFixed(1)
      : '0';

  // Destacar as urgentes (último índice após ordenação)
  const urgenteIndex = chartData.findIndex((item) => item.name === 'urgente');

  return (
    <ChartBarActive
      data={chartData}
      title="Pipeline - Prioridade"
      description="Distribuição por nível de prioridade"
      trendText={`${percentualUrgentes}% são urgentes`}
      footerText={`${urgentes} oportunidades requerem atenção imediata`}
      config={chartConfig}
      activeIndex={urgenteIndex >= 0 ? urgenteIndex : undefined}
    />
  );
}
