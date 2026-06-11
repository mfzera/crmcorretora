import { memo } from 'react';
import { Crown, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Skeleton } from '@/core/ui/skeleton';
import { cn } from '@/core/utils';
import { type RankingItem } from '@/modules/gamificacao/http';
import { type VendedorMetricas, type TipoRanking } from './LeaderboardTable';

function brlCompact(v: number): string {
  if (v >= 1_000_000)
    return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (v >= 1_000)
    return `R$ ${(v / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function brlFull(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

type SubtitleChip = { value: string; colorClass: string; position?: number };

function getSubtitleMetrics(
  tipoRanking: TipoRanking,
  m: VendedorMetricas | null,
  positions?: Partial<Record<TipoRanking, number>>,
): SubtitleChip[] {
  if (!m) return [];
  const chips: SubtitleChip[] = [];
  if (tipoRanking !== 'premio'     && m.totalPremio      > 0)
    chips.push({ value: brlCompact(m.totalPremio),        colorClass: CATEGORY_STYLE.premio.colorClass,     position: positions?.premio });
  if (tipoRanking !== 'comissao'   && m.mediaComissao    > 0)
    chips.push({ value: `${m.mediaComissao.toFixed(1)}%`, colorClass: CATEGORY_STYLE.comissao.colorClass,   position: positions?.comissao });
  if (tipoRanking !== 'quantidade' && m.quantidadeVendas > 0)
    chips.push({ value: `${m.quantidadeVendas} vnd`,      colorClass: CATEGORY_STYLE.quantidade.colorClass, position: positions?.quantidade });
  if (tipoRanking !== 'ticketMedio'&& m.ticketMedio      > 0)
    chips.push({ value: brlCompact(m.ticketMedio),        colorClass: CATEGORY_STYLE.ticketMedio.colorClass,position: positions?.ticketMedio });
  return chips;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function getCategoryDisplay(
  tipoRanking: TipoRanking,
  item: RankingItem,
  m: VendedorMetricas | null,
  full?: boolean,
): { value: string; unit: string } {
  switch (tipoRanking) {
    case 'pontos':
      return { value: item.pontos.toLocaleString('pt-BR'), unit: 'pts' };
    case 'premio':
      return {
        value: m && m.totalPremio > 0 ? (full ? brlFull(m.totalPremio) : brlCompact(m.totalPremio)) : '—',
        unit: '',
      };
    case 'comissao':
      return {
        value: m && m.mediaComissao > 0 ? m.mediaComissao.toFixed(1) : '—',
        unit: m && m.mediaComissao > 0 ? '%' : '',
      };
    case 'quantidade':
      return {
        value: m && m.quantidadeVendas > 0 ? m.quantidadeVendas.toLocaleString('pt-BR') : '—',
        unit: m && m.quantidadeVendas > 0 ? 'vnd' : '',
      };
    case 'ticketMedio':
      return { value: m && m.ticketMedio > 0 ? brlCompact(m.ticketMedio) : '—', unit: '' };
  }
}

type CatStyle = {
  colorClass: string;
  ringClass: string;
  bgClass: string;
  glowShadow: string;
  hex: string;
  label: string;
};

export const CATEGORY_STYLE: Record<TipoRanking, CatStyle> = {
  pontos: {
    colorClass: 'text-amber-400',
    ringClass: 'ring-amber-400/50',
    bgClass: 'bg-amber-400/[0.08]',
    glowShadow: '0 0 40px 4px rgba(245,158,11,0.18)',
    hex: '#f59e0b',
    label: 'Pontos',
  },
  premio: {
    colorClass: 'text-emerald-400',
    ringClass: 'ring-emerald-400/50',
    bgClass: 'bg-emerald-400/[0.08]',
    glowShadow: '0 0 40px 4px rgba(16,185,129,0.18)',
    hex: '#10b981',
    label: 'Prêmio Líquido',
  },
  comissao: {
    colorClass: 'text-violet-400',
    ringClass: 'ring-violet-400/50',
    bgClass: 'bg-violet-400/[0.08]',
    glowShadow: '0 0 40px 4px rgba(139,92,246,0.18)',
    hex: '#8b5cf6',
    label: 'Comissão Média',
  },
  quantidade: {
    colorClass: 'text-blue-400',
    ringClass: 'ring-blue-400/50',
    bgClass: 'bg-blue-400/[0.08]',
    glowShadow: '0 0 40px 4px rgba(59,130,246,0.18)',
    hex: '#3b82f6',
    label: 'Qtd. Vendas',
  },
  ticketMedio: {
    colorClass: 'text-cyan-300',
    ringClass: 'ring-cyan-300/45',
    bgClass: 'bg-cyan-400/[0.07]',
    glowShadow: '0 0 40px 4px rgba(34,211,238,0.16)',
    hex: '#22d3ee',
    label: 'Ticket Médio',
  },
};

const POSITION_STYLE = {
  1: { badge: 'bg-amber-400/[0.15] ring-amber-400/30 text-amber-300', fallback: 'bg-amber-400/[0.15] text-amber-300' },
  2: { badge: 'bg-white/[0.07] ring-white/[0.12] text-white/60',      fallback: 'bg-white/[0.07] text-white/60' },
  3: { badge: 'bg-amber-600/[0.12] ring-amber-500/[0.20] text-amber-400/80', fallback: 'bg-amber-600/[0.12] text-amber-400/80' },
} as const;

interface PodiumCardProps {
  position: 1 | 2 | 3;
  item: RankingItem | null;
  tipoRanking: TipoRanking;
  metricas: VendedorMetricas | null;
  avatarUrl?: string | null;
  isLoading: boolean;
  userPositions?: Partial<Record<TipoRanking, number>>;
}

function PodiumCard({ position, item, tipoRanking, metricas, avatarUrl, isLoading, userPositions }: PodiumCardProps) {
  const isFirst = position === 1;
  const catStyle = CATEGORY_STYLE[tipoRanking];
  const posStyle = POSITION_STYLE[position];
  const orderClass = position === 1 ? 'order-2' : position === 2 ? 'order-1' : 'order-3';

  // Proporcional: 1º ≈ 38%, 2º/3º ≈ 28% — preenche o container sem px fixo
  const widthClass = isFirst ? 'flex-[1.4] min-w-0' : 'flex-1 min-w-0';

  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center gap-3 self-end pb-2', orderClass, widthClass)}>
        <Skeleton className={cn('rounded-full bg-white/8', isFirst ? 'h-16 w-16' : 'h-12 w-12')} />
        <Skeleton className="h-3 w-3/4 bg-white/8" />
        <Skeleton className="h-5 w-1/2 bg-white/8" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className={cn(
        'flex items-center justify-center rounded-2xl border border-white/6 bg-white/[0.018] self-end py-6',
        orderClass, widthClass,
      )}>
        <span className="text-white/15 text-xs">—</span>
      </div>
    );
  }

  const { value, unit } = getCategoryDisplay(tipoRanking, item, metricas, tipoRanking === 'premio');
  const subtitle = getSubtitleMetrics(tipoRanking, metricas, userPositions);

  return (
    <div
      className={cn(
        // SEM overflow-hidden — evita corte do badge nos cantos rounded
        'flex flex-col items-center gap-2.5 rounded-2xl border self-end transition-all duration-500',
        // padding interno generoso para o badge não encostar no topo arredondado
        isFirst ? 'pt-5 pb-5 px-3 sm:px-4' : 'pt-4 pb-4 px-2 sm:px-3',
        orderClass,
        widthClass,
        isFirst
          ? cn('border-white/[0.07]', catStyle.bgClass)
          : 'border-white/[0.05] bg-white/[0.02]',
      )}
      style={isFirst ? { boxShadow: `${catStyle.glowShadow}, inset 0 1px 0 0 rgba(255,255,255,0.06)` } : undefined}
    >
      {/* Posição */}
      <div className={cn(
        'flex items-center justify-center rounded-full ring-1 shrink-0',
        posStyle.badge,
        isFirst ? 'h-8 w-8' : 'h-6 w-6',
      )}>
        {isFirst
          ? <Crown className={cn('h-4 w-4', posStyle.badge.split(' ')[2])} />
          : <Medal className={cn('h-3 w-3', posStyle.badge.split(' ')[2])} />
        }
      </div>

      {/* Avatar */}
      <Avatar className={cn(
        'ring-2 shadow-lg shrink-0',
        isFirst
          ? 'h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20'
          : 'h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14',
        isFirst ? catStyle.ringClass : 'ring-white/10',
      )}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={item.nome} />}
        <AvatarFallback className={cn('font-bold', isFirst ? 'text-sm lg:text-base' : 'text-xs sm:text-sm', posStyle.fallback)}>
          {getInitials(item.nome)}
        </AvatarFallback>
      </Avatar>

      {/* Nome */}
      <div className="text-center min-w-0 w-full">
        <p className={cn(
          'font-semibold truncate leading-tight',
          isFirst ? 'text-[13px] sm:text-[15px] text-white' : 'text-[11px] sm:text-[13px] text-white/80',
        )}>
          {item.nome}
        </p>
        {item.equipeNome && (
          <p className="text-white/25 text-[9px] sm:text-[10px] truncate mt-0.5">{item.equipeNome}</p>
        )}
      </div>

      {/* Valor principal + sub-métricas */}
      <div className="flex flex-col items-center gap-0.5 mt-0.5 w-full min-w-0">
        <div className="flex items-baseline gap-0.5">
          <span className={cn(
            'font-black tabular-nums leading-none',
            isFirst ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-lg sm:text-xl',
            catStyle.colorClass,
          )}>
            {value}
          </span>
          {unit && (
            <span className={cn('font-semibold text-[10px] sm:text-xs', catStyle.colorClass, 'opacity-55')}>
              {unit}
            </span>
          )}
        </div>

        {/* Sub-métricas — abaixo do valor principal */}
        {subtitle.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0 mt-0.5">
            {subtitle.map((chip, i) => (
              <span key={i} className={cn('flex flex-col items-center tabular-nums leading-tight opacity-50', chip.colorClass)}>
                {chip.position !== undefined && (
                  <span className="text-[8px] font-bold">#{chip.position}</span>
                )}
                <span className="text-[9px]">{chip.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface RankingPodiumProps {
  tipoRanking: TipoRanking;
  top3: RankingItem[];
  vendedorMetricas: Record<string, VendedorMetricas>;
  usuariosMap: Record<string, { avatarUrl: string | null; cargo: string | null }>;
  userPositionsMap: Record<string, Partial<Record<TipoRanking, number>>>;
  isLoading: boolean;
}

export const RankingPodium = memo(function RankingPodium({ tipoRanking, top3, vendedorMetricas, usuariosMap, userPositionsMap, isLoading }: RankingPodiumProps) {
  const [first, second, third] = top3;

  const avatarUrl = (item: RankingItem | undefined) =>
    item ? (usuariosMap[item.usuarioId]?.avatarUrl ?? item.avatarUrl) : null;

  return (
    <div className="flex flex-col h-full justify-center">
      <div className="flex justify-center px-4 pb-5 pt-4">
        <div className="flex items-end gap-3 sm:gap-4 lg:gap-5 w-full max-w-2xl">
          <PodiumCard position={2} item={second ?? null} tipoRanking={tipoRanking} metricas={second ? (vendedorMetricas[second.usuarioId] ?? null) : null} avatarUrl={avatarUrl(second)} isLoading={isLoading} userPositions={second ? userPositionsMap[second.usuarioId] : undefined} />
          <PodiumCard position={1} item={first  ?? null} tipoRanking={tipoRanking} metricas={first  ? (vendedorMetricas[first.usuarioId]  ?? null) : null} avatarUrl={avatarUrl(first)}  isLoading={isLoading} userPositions={first  ? userPositionsMap[first.usuarioId]  : undefined} />
          <PodiumCard position={3} item={third  ?? null} tipoRanking={tipoRanking} metricas={third  ? (vendedorMetricas[third.usuarioId]  ?? null) : null} avatarUrl={avatarUrl(third)}  isLoading={isLoading} userPositions={third  ? userPositionsMap[third.usuarioId]  : undefined} />
        </div>
      </div>
    </div>
  );
});
