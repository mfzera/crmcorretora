
import * as React from 'react';
import { ChartBarActive, BarActiveChartData } from './chart-bar-active';
import { type ChartConfig } from '@/core/ui/chart';

type PipelineTemperaturaData = {
  temperatura: string;
  count: number;
};

type PipelineTemperaturaChartProps = {
  data: PipelineTemperaturaData[];
};

const temperaturaLabels: Record<string, string> = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
};

const temperaturaColors: Record<string, string> = {
  frio: 'var(--chart-1)',
  morno: 'var(--chart-3)',
  quente: 'var(--chart-5)',
};

// Ordem de temperatura para garantir que apareçam nessa sequência
const temperaturaOrder: Record<string, number> = {
  frio: 1,
  morno: 2,
  quente: 3,
};

export function PipelineTemperaturaChart({
  data,
}: PipelineTemperaturaChartProps) {
  // Ordenar por ordem de temperatura
  const sortedData = [...data].sort(
    (a, b) =>
      (temperaturaOrder[a.temperatura] || 0) -
      (temperaturaOrder[b.temperatura] || 0),
  );

  const chartData: BarActiveChartData[] = sortedData.map((item) => ({
    name: item.temperatura,
    value: Number(item.count),
    fill: temperaturaColors[item.temperatura] || 'var(--chart-1)',
  }));

  const chartConfig: ChartConfig = sortedData.reduce(
    (acc, item) => {
      const key = item.temperatura;
      acc[key] = {
        label: temperaturaLabels[item.temperatura] || item.temperatura,
        color: temperaturaColors[item.temperatura] || 'var(--chart-1)',
      };
      return acc;
    },
    {
      value: {
        label: 'Oportunidades',
      },
    } as ChartConfig,
  );

  const quentes =
    data.find((item) => item.temperatura === 'quente')?.count || 0;
  const totalOportunidades = data.reduce(
    (acc, item) => acc + Number(item.count),
    0,
  );
  const percentualQuentes =
    totalOportunidades > 0
      ? ((quentes / totalOportunidades) * 100).toFixed(1)
      : '0';

  // Destacar os leads quentes (último índice após ordenação)
  const quenteIndex = chartData.findIndex((item) => item.name === 'quente');

  return (
    <ChartBarActive
      data={chartData}
      title="Pipeline - Temperatura"
      description="Distribuição por temperatura do lead"
      trendText={`${percentualQuentes}% dos leads estão quentes`}
      footerText={`${quentes} leads com alta chance de conversão`}
      config={chartConfig}
      activeIndex={quenteIndex >= 0 ? quenteIndex : undefined}
    />
  );
}
