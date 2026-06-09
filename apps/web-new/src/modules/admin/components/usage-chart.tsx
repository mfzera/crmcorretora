
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/core/ui/chart';
import { Skeleton } from '@/core/ui/skeleton';
import { adminApi } from '@/infra/http/admin-api';

const chartConfig = {
  views: {
    label: 'Visualizações',
  },
  storage: {
    label: 'Armazenamento (GB)',
    color: 'hsl(var(--chart-1))',
  },
  requests: {
    label: 'Requisições',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function UsageChart() {
  const { data: usageData, isLoading } = useQuery({
    queryKey: ['admin', 'usage'],
    queryFn: () => adminApi.getUsageHistory(30),
  });

  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>('storage');

  const chartData = React.useMemo(() => {
    if (!usageData) return [];

    return usageData
      .map((item) => ({
        date: item.date,
        storage: Number((item.storage / 1024 ** 3).toFixed(2)),
        requests: item.requests,
      }))
      .reverse(); // Inverter para mostrar do mais antigo ao mais recente
  }, [usageData]);

  const total = React.useMemo(() => {
    if (!chartData.length) return { storage: 0, requests: 0 };

    return {
      storage: chartData.reduce((acc, curr) => acc + curr.storage, 0),
      requests: chartData.reduce((acc, curr) => acc + curr.requests, 0),
    };
  }, [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uso nos Últimos 30 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-6">
          <CardTitle>Uso nos Últimos 30 Dias</CardTitle>
          <CardDescription>
            Armazenamento e volume de requisições do sistema
          </CardDescription>
        </div>
        <div className="flex">
          {['storage', 'requests'].map((key) => {
            const chart = key as keyof typeof chartConfig;
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-muted-foreground text-xs">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {activeChart === 'storage'
                    ? total.storage.toFixed(2)
                    : total.requests.toLocaleString()}
                  {activeChart === 'storage' && ' GB'}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('pt-BR', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString('pt-BR', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                  }}
                />
              }
            />
            <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
