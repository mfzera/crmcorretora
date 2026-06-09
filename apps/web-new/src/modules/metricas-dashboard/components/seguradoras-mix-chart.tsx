import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/core/ui/chart';
import { Skeleton } from '@/core/ui/skeleton';
import { formatCurrencyShort, formatCurrency } from '@/core/utils/format-currency';
import { Tooltip as RadixTooltip, TooltipContent, TooltipTrigger } from '@/core/ui/tooltip';

const chartConfig = {
  premio: { label: 'Prêmio', color: 'var(--chart-1)' },
  comissao: { label: 'Comissão', color: 'var(--chart-3)' },
} satisfies ChartConfig;

type SeguradoraMetrica = {
  seguradoraParceiraId: string | null;
  seguradoraNome: string | null;
  totalPremio: number | string;
  totalComissao: number | string;
  mediaComissao?: number | string;
  countDocumentos: number;
  countClientes?: number;
};

type Props = {
  data: SeguradoraMetrica[];
  isLoading: boolean;
};

function truncate(str: string, max: number) {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { nomeCompleto: string; apolices: number } }> }) {
  if (!active || !payload?.length) return null;
  const seg = payload[0].payload;
  return (
    <div className="border border-border bg-background rounded-lg px-3 py-2 text-xs shadow-xl space-y-1 min-w-[160px]">
      <p className="font-semibold text-foreground">{seg.nomeCompleto}</p>
      <p className="text-muted-foreground">{seg.apolices} apólice{seg.apolices !== 1 ? 's' : ''}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-3">
          <span className="text-muted-foreground">{p.name === 'premio' ? 'Prêmio' : 'Comissão'}</span>
          <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function SeguradorasMixChart({ data, isLoading }: Props) {
  const sorted = [...data].sort((a, b) => Number(b.totalPremio) - Number(a.totalPremio)).slice(0, 5);

  const chartData = sorted.map((s) => ({
    nome: truncate(s.seguradoraNome ?? 'N/A', 14),
    nomeCompleto: s.seguradoraNome ?? 'N/A',
    premio: Number(s.totalPremio),
    comissao: Number(s.totalComissao),
    apolices: s.countDocumentos,
  }));

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="px-3 py-2.5 border-b flex items-center justify-between">
          <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="p-3">
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card flex flex-col">
      {/* Header */}
      <div className="px-3 py-2.5 border-b flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Mix de Seguradoras
        </h3>
        <span className="text-[10px] text-muted-foreground shrink-0">
          top {Math.min(sorted.length, 5)} de {data.length}
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-1 min-h-[200px] items-center justify-center text-xs text-muted-foreground">
          Sem dados de seguradoras no período.
        </div>
      ) : (
        <>
          <div className="p-3">
            <ChartContainer config={chartConfig} className="h-[180px] w-full" role="img" aria-label="Mix de prêmio por seguradora">
              <BarChart
                accessibilityLayer
                layout="vertical"
                data={chartData}
                margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-muted/40" />
                <YAxis
                  type="category"
                  dataKey="nome"
                  tickLine={false}
                  axisLine={false}
                  width={96}
                  tick={{ fontSize: 11 }}
                />
                <XAxis type="number" hide />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                  content={<CustomTooltip />}
                />
                <Bar dataKey="premio" fill="var(--color-premio)" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="comissao" fill="var(--color-comissao)" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Legenda com totais */}
          <div className="border-t px-3 py-2 space-y-1">
            {sorted.map((s) => (
              <div key={s.seguradoraParceiraId ?? s.seguradoraNome} className="flex items-center justify-between gap-2">
                <RadixTooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[120px] cursor-default">
                      {s.seguradoraNome ?? 'N/A'}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {s.seguradoraNome}
                  </TooltipContent>
                </RadixTooltip>
                <span className="text-[11px] tabular-nums font-medium text-foreground shrink-0">
                  {formatCurrencyShort(Number(s.totalPremio))}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
