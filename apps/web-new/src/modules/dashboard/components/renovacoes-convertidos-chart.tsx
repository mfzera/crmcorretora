
import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/core/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { getRenovacoesChartData } from '@/modules/dashboard/http';

const chartConfig = {
  renovacoes: {
    label: 'Renovações',
    color: 'var(--chart-1)',
  },
  convertidos: {
    label: 'Convertidos',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

const periodLabels: Record<string, string> = {
  semana: 'por semana',
  mes: 'por mês',
  trimestre: 'por trimestre',
};

export function RenovacoesConvertidosChart() {
  const [periodo, setPeriodo] = React.useState<
    'semana' | 'mes' | 'trimestre'
  >('mes');

  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ['dashboard-renovacoes-chart', periodo],
    queryFn: () => getRenovacoesChartData(periodo),
  });

  const formatDate = (value: string) => {
    const date = new Date(value + 'T12:00:00Z');
    if (periodo === 'trimestre') {
      const q = Math.ceil((date.getMonth() + 1) / 3);
      return `T${q} ${date.getFullYear()}`;
    }
    return date.toLocaleDateString('pt-BR', {
      month: 'short',
      year: '2-digit',
    });
  };

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-4 sm:flex-row">
        <div className="grid flex-1 gap-0.5">
          <CardTitle className="text-base">
            Renovações x Convertidos
          </CardTitle>
          <CardDescription>
            Acompanhamento {periodLabels[periodo]}
          </CardDescription>
        </div>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as typeof periodo)}>
          <SelectTrigger
            className="hidden w-[140px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Selecione o período"
          >
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="semana" className="rounded-lg">
              Semana
            </SelectItem>
            <SelectItem value="mes" className="rounded-lg">
              Mês
            </SelectItem>
            <SelectItem value="trimestre" className="rounded-lg">
              Trimestre
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Sem dados para o período selecionado
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[200px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="fillRenovacoes"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-renovacoes)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-renovacoes)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient
                  id="fillConvertidos"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-convertidos)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-convertidos)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={formatDate}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={formatDate}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="convertidos"
                type="natural"
                fill="url(#fillConvertidos)"
                stroke="var(--color-convertidos)"
              />
              <Area
                dataKey="renovacoes"
                type="natural"
                fill="url(#fillRenovacoes)"
                stroke="var(--color-renovacoes)"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
