
import * as React from 'react';
import { ChartBarMixed, BarChartData } from './chart-bar-mixed';
import { type ChartConfig } from '@/core/ui/chart';

type PremioStatusData = {
  status: string;
  total: number;
  count: number;
};

type PremioStatusChartProps = {
  data: PremioStatusData[];
};

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const statusLabels: Record<string, string> = {
  ATIVO: 'Ativo',
  CANCELADO: 'Cancelado',
  SUSPENSO: 'Suspenso',
  EXPIRADO: 'Expirado',
  EM_ANALISE: 'Em Análise',
  PENDENTE: 'Pendente',
  ARQUIVADO: 'Arquivado',
  NAO_TRABALHADO: 'Não Trabalhado',
  EM_PROSPECCAO: 'Em Prospecção',
};

const statusColors: Record<string, string> = {
  ATIVO: 'var(--chart-4)',
  CANCELADO: 'var(--chart-5)',
  SUSPENSO: 'var(--chart-3)',
  EXPIRADO: 'var(--chart-2)',
  EM_ANALISE: 'var(--chart-1)',
  PENDENTE: 'var(--chart-1)',
};

export function PremioStatusChart({ data }: PremioStatusChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Ordenar por total decrescente
  const sortedData = [...data].sort(
    (a, b) => Number(b.total) - Number(a.total),
  );

  const chartData: BarChartData[] = sortedData.map((item, index) => ({
    name: item.status,
    value: Number(item.total),
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
        label: 'Prêmio',
      },
    } as ChartConfig,
  );

  const totalPremio = data.reduce((acc, item) => acc + Number(item.total), 0);
  const totalDocumentos = data.reduce(
    (acc, item) => acc + Number(item.count),
    0,
  );

  return (
    <ChartBarMixed
      data={chartData}
      title="Prêmio por Status"
      description="Distribuição de prêmios por status do documento"
      footerText={`${formatCurrency(totalPremio)} em ${totalDocumentos} documentos`}
      config={chartConfig}
      valueFormatter={formatCurrency}
    />
  );
}
