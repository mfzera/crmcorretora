import { Trophy, TrendingUp, Percent, BarChart3, Ticket } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Skeleton } from '@/core/ui/skeleton';
import { cn } from '@/core/utils';
import { type RankingItem } from '@/modules/gamificacao/http';
import { type VendedorMetricas, type TipoRanking } from './LeaderboardTable';

function brlCompact(value: number): string {
  if (value >= 1_000_000)
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (value >= 1_000)
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

type CfgEntry = {
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  ringClass: string;
  firstBorderColor: string;
  firstGradient: string;
  firstRingColor: string;
  getValue: (item: RankingItem, m: VendedorMetricas | null) => { text: string; unit: string; isEmpty: boolean };
};

const rankingConfig: Record<TipoRanking, CfgEntry> = {
  pontos: {
    title: 'Pontos',
    Icon: Trophy,
    colorClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500/10',
    ringClass: 'ring-yellow-500/20',
    firstBorderColor: 'border-l-yellow-400/70',
    firstGradient: 'bg-gradient-to-r from-yellow-500/10 to-transparent',
    firstRingColor: 'ring-yellow-400/50',
    getValue: (item) => ({
      text: item.pontos.toLocaleString('pt-BR'),
      unit: 'pts',
      isEmpty: item.pontos === 0,
    }),
  },
  premio: {
    title: 'Prêmio Líquido',
    Icon: TrendingUp,
    colorClass: 'text-green-400',
    bgClass: 'bg-green-500/10',
    ringClass: 'ring-green-500/20',
    firstBorderColor: 'border-l-green-400/70',
    firstGradient: 'bg-gradient-to-r from-green-500/10 to-transparent',
    firstRingColor: 'ring-green-400/50',
    getValue: (_item, m) => ({
      text: m && m.totalPremio > 0 ? brlCompact(m.totalPremio) : '—',
      unit: '',
      isEmpty: !m || m.totalPremio === 0,
    }),
  },
  comissao: {
    title: 'Comissão Média',
    Icon: Percent,
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10',
    ringClass: 'ring-purple-500/20',
    firstBorderColor: 'border-l-purple-400/70',
    firstGradient: 'bg-gradient-to-r from-purple-500/10 to-transparent',
    firstRingColor: 'ring-purple-400/50',
    getValue: (_item, m) => ({
      text: m && m.mediaComissao > 0 ? m.mediaComissao.toFixed(1) : '—',
      unit: m && m.mediaComissao > 0 ? '%' : '',
      isEmpty: !m || m.mediaComissao === 0,
    }),
  },
  quantidade: {
    title: 'Qtd. Vendas',
    Icon: BarChart3,
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
    ringClass: 'ring-orange-500/20',
    firstBorderColor: 'border-l-orange-400/70',
    firstGradient: 'bg-gradient-to-r from-orange-500/10 to-transparent',
    firstRingColor: 'ring-orange-400/50',
    getValue: (_item, m) => ({
      text: m && m.quantidadeVendas > 0 ? m.quantidadeVendas.toLocaleString('pt-BR') : '—',
      unit: m && m.quantidadeVendas > 0 ? 'vnd' : '',
      isEmpty: !m || m.quantidadeVendas === 0,
    }),
  },
  ticketMedio: {
    title: 'Ticket Médio',
    Icon: Ticket,
    colorClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500/10',
    ringClass: 'ring-cyan-500/20',
    firstBorderColor: 'border-l-cyan-400/70',
    firstGradient: 'bg-gradient-to-r from-cyan-500/10 to-transparent',
    firstRingColor: 'ring-cyan-400/50',
    getValue: (_item, m) => ({
      text: m && m.ticketMedio > 0 ? brlCompact(m.ticketMedio) : '—',
      unit: '',
      isEmpty: !m || m.ticketMedio === 0,
    }),
  },
};

function PositionBadge({ posicao }: { posicao: number }) {
  const base = 'flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-black';
  if (posicao === 1)
    return <div className={cn(base, 'bg-yellow-500/20 ring-1 ring-yellow-500/40 text-yellow-400')}>1</div>;
  if (posicao === 2)
    return <div className={cn(base, 'bg-slate-500/20 ring-1 ring-slate-500/30 text-slate-300')}>2</div>;
  if (posicao === 3)
    return <div className={cn(base, 'bg-amber-700/20 ring-1 ring-amber-600/30 text-amber-500')}>3</div>;
  return (
    <div className="flex items-center justify-center h-6 w-6">
      <span className="text-[10px] font-bold text-white/25">#{posicao}</span>
    </div>
  );
}

interface MiniLeaderboardProps {
  tipoRanking: TipoRanking;
  ranking: RankingItem[];
  vendedorMetricas: Record<string, VendedorMetricas>;
  usuariosMap: Record<string, { avatarUrl: string | null; cargo: string | null }>;
  isLoading: boolean;
}

export function MiniLeaderboard({
  tipoRanking,
  ranking,
  vendedorMetricas,
  usuariosMap,
  isLoading,
}: MiniLeaderboardProps) {
  const { title, Icon, colorClass, bgClass, ringClass, firstBorderColor, firstGradient, firstRingColor, getValue } = rankingConfig[tipoRanking];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className={cn('flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-white/8 shrink-0', bgClass)}>
        <div className={cn('flex items-center justify-center h-6 w-6 rounded-md shrink-0', bgClass, 'ring-1', ringClass)}>
          <Icon className={cn('h-3.5 w-3.5', colorClass)} />
        </div>
        <h3 className="text-white/80 font-semibold text-xs tracking-tight truncate">{title}</h3>
        <span className="ml-auto text-[10px] text-white/25 shrink-0 tabular-nums">
          {!isLoading && `${ranking.length}`}
        </span>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-[24px_1fr_auto] items-center gap-2 px-3 sm:px-4 py-1 border-b border-white/5 shrink-0">
        <span />
        <span className="text-[9px] uppercase tracking-widest text-white/20 font-semibold">Vendedor</span>
        <span className={cn('text-[9px] uppercase tracking-widest font-semibold', colorClass, 'opacity-60')}>
          {tipoRanking === 'pontos' ? 'Pts' : tipoRanking === 'premio' ? 'R$' : tipoRanking === 'comissao' ? '%' : tipoRanking === 'ticketMedio' ? 'R$' : 'Qtd'}
        </span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-px pt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[24px_1fr_auto] items-center gap-2 px-3 sm:px-4 py-1.5">
                <Skeleton className="h-6 w-6 rounded-full bg-white/8" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-full bg-white/8 shrink-0" />
                  <Skeleton className="h-3 w-20 bg-white/8" />
                </div>
                <Skeleton className="h-3 w-12 bg-white/8" />
              </div>
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/20 text-xs">Sem dados no período</p>
          </div>
        ) : (
          <div>
            {ranking.map((item) => {
              const metricas = vendedorMetricas[item.usuarioId] ?? null;
              const { text, unit, isEmpty } = getValue(item, metricas);
              const avatarUrl = usuariosMap[item.usuarioId]?.avatarUrl ?? item.avatarUrl;
              const isTop3 = item.posicao <= 3;
              const isFirst = item.posicao === 1;

              return (
                <div
                  key={item.usuarioId}
                  className={cn(
                    'grid grid-cols-[24px_1fr_auto] items-center border-b transition-colors',
                    isFirst
                      ? cn('px-3 sm:px-4 py-3 gap-3 border-l-2 border-b-white/[0.06]', firstBorderColor, firstGradient)
                      : isTop3
                      ? 'px-3 sm:px-4 py-1.5 gap-2 border-white/[0.03] bg-white/[0.025]'
                      : 'px-3 sm:px-4 py-1.5 gap-2 border-white/[0.03] hover:bg-white/[0.015]',
                  )}
                >
                  <PositionBadge posicao={item.posicao} />

                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className={cn('shrink-0', isFirst ? 'h-9 w-9' : 'h-7 w-7', isFirst && cn('ring-2 shadow-lg', firstRingColor))}>
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={item.nome} />}
                      <AvatarFallback
                        className={cn(
                          'font-bold',
                          isFirst ? 'text-[11px]' : 'text-[9px]',
                          item.posicao === 1 && 'bg-yellow-500/20 text-yellow-300',
                          item.posicao === 2 && 'bg-slate-500/20 text-slate-300',
                          item.posicao === 3 && 'bg-amber-700/20 text-amber-400',
                          item.posicao > 3 && 'bg-white/8 text-white/50',
                        )}
                      >
                        {getInitials(item.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className={cn(
                        'font-semibold truncate leading-tight',
                        isFirst ? cn('text-sm', colorClass) : 'text-xs font-medium text-white/80',
                      )}>{item.nome}</p>
                      {item.equipeNome && (
                        <p className="text-white/25 text-[9px] truncate">{item.equipeNome}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isEmpty ? (
                      <span className="text-white/15 text-xs">—</span>
                    ) : (
                      <>
                        <span
                          className={cn(
                            'font-bold tabular-nums',
                            isFirst ? 'text-sm' : 'text-xs',
                            item.posicao === 1 ? colorClass : 'text-white/65',
                          )}
                        >
                          {text}
                        </span>
                        {unit && <span className="text-white/25 text-[9px] ml-0.5">{unit}</span>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
