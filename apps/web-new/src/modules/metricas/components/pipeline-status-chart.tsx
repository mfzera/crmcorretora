
import * as React from 'react';
import { ChartBarActive, BarActiveChartData } from './chart-bar-active';
import { type ChartConfig } from '@/core/ui/chart';

type PipelineStatusData = {
  status: string;
  count: number;
  premioEstimado: number;
};

type PipelineStatusChartProps = {
  data: PipelineStatusData[];
};

const statusLabels: Record<string, string> = {
  lead: 'Lead',
  contato_inicial: 'Contato Inicial',
  negociacao: 'Negociação',
  ganha: 'Ganha',
  perdida: 'Perdida',
  EM_NEGOCIACAO: 'Em Negociação',
  AGUARDANDO_CLIENTE: 'Aguardando Cliente',
  AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
  VENDA_CONFIRMADA: 'Venda Confirmada',
  AGUARDANDO_CADASTRO: 'Aguardando Cadastro',
  ATIVO: 'Ativo',
  ARQUIVADO: 'Arquivado',
  CANCELADO: 'Cancelado',
  PERDIDO: 'Perdido',
};

const statusColors: Record<string, string> = {
  lead: 'var(--chart-1)',
  contato_inicial: 'var(--chart-2)',
  negociacao: 'var(--chart-3)',
  ganha: 'var(--chart-4)',
  perdida: 'var(--chart-5)',
};

export function PipelineStatusChart({ data }: PipelineStatusChartProps) {
  const chartData: BarActiveChartData[] = data.map((item, index) => ({
    name: item.status,
    value: Number(item.count),
    fill: statusColors[item.status] || `var(--chart-${(index % 5) + 1})`,
  }));

  const chartConfig: ChartConfig = data.reduce(
    (acc, item) => {
      const key = item.status;
      acc[key] = {
        label: statusLabels[item.status] || item.status,
        color:
          statusColors[item.status] ||
          `var(--chart-${(Object.keys(acc).length % 5) + 1})`,
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
  const totalPremioEstimado = data.reduce(
    (acc, item) => acc + Number(item.premioEstimado),
    0,
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Encontrar o status com mais oportunidades
  const maxIndex = chartData.reduce(
    (maxIdx, curr, idx, arr) => (curr.value > arr[maxIdx].value ? idx : maxIdx),
    0,
  );

  return (
    <ChartBarActive
      data={chartData}
      title="Pipeline - Status"
      description="Distribuição de oportunidades por status"
      footerText={`${totalOportunidades} oportunidades · Prêmio estimado: ${formatCurrency(totalPremioEstimado)}`}
      config={chartConfig}
      activeIndex={maxIndex}
    />
  );
}
