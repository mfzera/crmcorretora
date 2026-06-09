import { cn } from '@/core/utils';

type Props = {
  taxaRenovacao: number;
  cotacoesParadas: number;
  taxaAtividadeClientes: number;
  isLoading: boolean;
};

function calcScore(taxa: number, paradas: number, atividade: number) {
  const renovScore = Math.min(100, Math.max(0, taxa));
  const cotacoesScore = Math.max(0, 100 - Math.min(paradas, 20) * 5);
  const ativosScore = Math.min(100, Math.max(0, atividade));
  return Math.round(renovScore * 0.4 + cotacoesScore * 0.3 + ativosScore * 0.3);
}

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const size = 96;
  const r = 34;
  const c = 2 * Math.PI * r;
  const arcRatio = 240 / 360;
  const arcLen = c * arcRatio;
  const progressLen = (Math.max(0, Math.min(100, score)) / 100) * arcLen;
  const cx = size / 2;
  const cy = size / 2;
  // SVG circles start at 3 o'clock; rotate 150° clockwise to start at ~8 o'clock
  const rotation = 150;

  return (
    <svg
      width={size}
      height={size * 0.72}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`Health score: ${score}`}
      role="img"
    >
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${arcLen} ${c}`}
        transform={`rotate(${rotation}, ${cx}, ${cy})`}
      />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${progressLen} ${c}`}
        transform={`rotate(${rotation}, ${cx}, ${cy})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill="currentColor"
        className="tabular-num-display"
      >
        {score}
      </text>
    </svg>
  );
}

type ChipProps = { label: string; value: string; status: 'good' | 'warn' | 'bad' };

function SubfactorChip({ label, value, status }: ChipProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full',
          status === 'good' && 'bg-status-positive text-status-positive',
          status === 'warn' && 'bg-status-alert text-status-alert',
          status === 'bad' && 'bg-status-negative text-status-negative',
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function HealthScoreCard({ taxaRenovacao, cotacoesParadas, taxaAtividadeClientes, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card min-h-[220px]">
        <div className="px-3 py-2.5 border-b">
          <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-3 px-4 py-4">
          <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
          <div className="w-full space-y-2 pt-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-3 w-10 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const score = calcScore(taxaRenovacao, cotacoesParadas, taxaAtividadeClientes);
  const scoreColor =
    score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel =
    score >= 70 ? 'Saudável' : score >= 50 ? 'Atenção' : 'Crítico';
  const scoreLabelClass =
    score >= 70
      ? 'text-status-positive'
      : score >= 50
        ? 'text-status-alert'
        : 'text-status-negative';

  const renovStatus: ChipProps['status'] =
    taxaRenovacao >= 70 ? 'good' : taxaRenovacao >= 50 ? 'warn' : 'bad';
  const cotacoesScore = Math.max(0, 100 - Math.min(cotacoesParadas, 20) * 5);
  const cotacoesStatus: ChipProps['status'] =
    cotacoesParadas === 0 ? 'good' : cotacoesParadas <= 5 ? 'warn' : 'bad';
  const ativStatus: ChipProps['status'] =
    taxaAtividadeClientes >= 70 ? 'good' : taxaAtividadeClientes >= 50 ? 'warn' : 'bad';

  return (
    <div className="rounded-lg border bg-card min-h-[220px] flex flex-col">
      <div className="px-3 py-2.5 border-b">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Saúde da Operação
        </h3>
      </div>

      <div className="flex flex-col items-center px-4 py-3 flex-1 gap-1">
        <ScoreGauge score={score} color={scoreColor} />
        <span className={cn('text-xs font-semibold -mt-1', scoreLabelClass)}>
          {scoreLabel}
        </span>
        <p className="text-[10px] text-muted-foreground/60 text-center mb-1">
          índice ponderado de operação
        </p>

        <div className="w-full space-y-1.5 mt-auto">
          <SubfactorChip
            label="Renovação (40%)"
            value={`${taxaRenovacao.toFixed(0)}%`}
            status={renovStatus}
          />
          <SubfactorChip
            label="Cotações paradas (30%)"
            value={cotacoesParadas === 0 ? '0 paradas' : `${cotacoesParadas} paradas`}
            status={cotacoesStatus}
          />
          <SubfactorChip
            label="Clientes ativos (30%)"
            value={`${taxaAtividadeClientes.toFixed(0)}%`}
            status={ativStatus}
          />
        </div>
      </div>
    </div>
  );
}
