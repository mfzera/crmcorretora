
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/core/ui/chart';
import { Skeleton } from '@/core/ui/skeleton';
import { type EvolucaoItem, type Granularidade } from '@/modules/metricas/http';

const chartConfig = {
  totalPremio: {
    label: 'Prêmio',
    color: 'var(--chart-1)',
  },
  mediaPercentualComissao: {
    label: '% Comissão',
    color: 'var(--chart-4)',
  },
  totalPremioComp: {
    label: 'Prêmio (ant.)',
    color: 'var(--chart-3)',
  },
  mediaPercentualComissaoComp: {
    label: '% Comissão (ant.)',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig;

const MESES_PT: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function formatPeriodo(periodo: string, gran: Granularidade, anos?: Set<string>): string {
  const anoAtual = new Date().getFullYear().toString();

  if (gran === 'mes') {
    const [ano, mes] = periodo.split('-');
    const label = MESES_PT[mes] ?? mes;
    return ano !== anoAtual ? `${label}/${ano.slice(2)}` : label;
  }

  const parts = periodo.split('-');
  const dd = parts[2];
  const mm = parts[1];
  const aa = parts[0].slice(2);
  const multiAno = anos && anos.size > 1;
  return multiAno ? `${dd}/${mm}/${aa}` : `${dd}/${mm}`;
}

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return `R$ ${value.toFixed(0)}`;
}

type Props = {
  data: EvolucaoItem[];
  dataComparacao?: EvolucaoItem[];
  labelComparacao?: string;
  isLoading: boolean;
  granularidade: Granularidade;
};

export function PremioSeguradoraChart({ data, dataComparacao, labelComparacao, isLoading, granularidade }: Props) {
  const hasComp = !!dataComparacao && dataComparacao.length > 0;

  const anosPresentes = new Set(data.map((item) => item.periodo.split('-')[0]));

  const chartData = data.map((item, i) => {
    const pct = Number(item.mediaPercentualComissao);
    const compItem = dataComparacao?.[i];
    const compPct = compItem ? Number(compItem.mediaPercentualComissao) : undefined;

    return {
      periodo: formatPeriodo(item.periodo, granularidade, anosPresentes),
      totalPremio: Number(item.totalPremio) || 0,
      mediaPercentualComissao: isNaN(pct) ? 0 : pct,
      ...(compItem
        ? {
            totalPremioComp: Number(compItem.totalPremio) || 0,
            mediaPercentualComissaoComp: compPct !== undefined && !isNaN(compPct) ? compPct : 0,
          }
        : {}),
    };
  });

  const totalPremio = data.reduce((acc, i) => acc + Number(i.totalPremio), 0);

  return (
    <div className="rounded-lg border bg-card">
      {/* Header inline */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold">Prêmio e Comissão</h3>
          <p className="text-xs text-muted-foreground">
            {totalPremio > 0
              ? `Total: ${totalPremio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
              : 'Sem dados no período'}
            {hasComp && labelComparacao && (
              <span className="ml-2 text-muted-foreground/60">{labelComparacao}</span>
            )}
          </p>
        </div>
        {/* Legenda inline */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} />
            <span className="text-[10px] text-muted-foreground">Prêmio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--chart-4)' }} />
            <span className="text-[10px] text-muted-foreground">% Comissão</span>
          </div>
          {hasComp && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full border border-dashed border-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground">Período ant.</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pb-4">
        {isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            Sem dados para o período selecionado.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full" role="img" aria-label="Evolução de prêmio e comissão no período">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 0, right: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/40" />
              <XAxis
                dataKey="periodo"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="brl"
                orientation="left"
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => formatCurrencyShort(v)}
                width={60}
                domain={[0, 'auto']}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                hide
                domain={[0, 'auto']}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name) => {
                      const n = Number(value);
                      const isPremio = name === 'totalPremio' || name === 'totalPremioComp';
                      const isComp = name === 'totalPremioComp' || name === 'mediaPercentualComissaoComp';
                      const label = isPremio
                        ? isComp ? 'Prêmio (ant.)' : 'Prêmio'
                        : isComp ? '% Comissão (ant.)' : '% Comissão';
                      const colorKey = name as keyof typeof chartConfig;
                      const color = chartConfig[colorKey]?.color ?? 'currentColor';
                      const formatted = isPremio
                        ? (isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
                        : (isNaN(n) ? '—' : `${n.toFixed(2)}%`);
                      return (
                        <div className="flex w-full items-center gap-2">
                          <div
                            className="h-2.5 w-1 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-muted-foreground">{label}</span>
                          <span className="ml-auto font-mono font-medium tabular-nums">
                            {formatted}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <defs>
                <linearGradient id="fillPremio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-totalPremio)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-totalPremio)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillComissao" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-mediaPercentualComissao)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-mediaPercentualComissao)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillPremioComp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-totalPremioComp)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-totalPremioComp)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillComissaoComp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-mediaPercentualComissaoComp)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-mediaPercentualComissaoComp)" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              {/* Séries de comparação (atrás) */}
              {hasComp && (
                <Area
                  dataKey="mediaPercentualComissaoComp"
                  type="monotone"
                  fill="url(#fillComissaoComp)"
                  fillOpacity={0.3}
                  stroke="var(--color-mediaPercentualComissaoComp)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  yAxisId="pct"
                />
              )}
              {hasComp && (
                <Area
                  dataKey="totalPremioComp"
                  type="monotone"
                  fill="url(#fillPremioComp)"
                  fillOpacity={0.3}
                  stroke="var(--color-totalPremioComp)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  yAxisId="brl"
                />
              )}

              {/* Séries principais (na frente) */}
              <Area
                dataKey="mediaPercentualComissao"
                type="monotone"
                fill="url(#fillComissao)"
                fillOpacity={0.4}
                stroke="var(--color-mediaPercentualComissao)"
                strokeWidth={1.5}
                yAxisId="pct"
              />
              <Area
                dataKey="totalPremio"
                type="monotone"
                fill="url(#fillPremio)"
                fillOpacity={0.4}
                stroke="var(--color-totalPremio)"
                strokeWidth={1.5}
                yAxisId="brl"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
