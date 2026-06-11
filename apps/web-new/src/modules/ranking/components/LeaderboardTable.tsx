import { useMemo } from 'react';
import { Crown, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Skeleton } from '@/core/ui/skeleton';
import { cn } from '@/core/utils';
import { type RankingItem } from '@/modules/gamificacao/http';
import { MIN_VENDAS_MEDIA } from '../hooks/useRankingData';

type Periodo = 'mes_atual' | 'mes_anterior' | 'trimestre' | 'ano';
export type TipoDoc = 'todos' | 'novo' | 'renovacao';
export type TipoRanking = 'pontos' | 'premio' | 'comissao' | 'quantidade' | 'ticketMedio';

const periodoLabels: Record<Periodo, string> = {
  mes_atual: 'Mês atual',
  mes_anterior: 'Mês ant.',
  trimestre: '3 meses',
  ano: 'Ano',
};

const tipoRankingLabels: Record<TipoRanking, string> = {
  pontos: 'Pontos',
  premio: 'Prêmio Líquido',
  comissao: 'Comissão Média',
  quantidade: 'Qtd. Vendas',
  ticketMedio: 'Ticket Médio',
};

const tipoDocLabels: Record<TipoDoc, string> = {
  todos: 'Todos',
  novo: 'Novo',
  renovacao: 'Renovação',
};

export interface VendedorMetricas {
  totalPremio: number;
  quantidadeVendas: number;
  ticketMedio: number;
  mediaComissao: number;
}

export interface RenovacaoData {
  metaAlvo: number | null;
  taxaByVendedor: Record<string, number>;
}

interface LeaderboardTableProps {
  ranking: RankingItem[];
  isLoading: boolean;
  periodo: Periodo;
  onPeriodoChange: (p: Periodo) => void;
  tipoDoc: TipoDoc;
  onTipoDocChange: (t: TipoDoc) => void;
  tipoRanking: TipoRanking;
  onTipoRankingChange: (t: TipoRanking) => void;
  vendedorMetricas: Record<string, VendedorMetricas>;
  usuariosMap?: Record<string, { avatarUrl: string | null; cargo: string | null }>;
  renovacaoData?: RenovacaoData;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function brlCompact(value: number): string {
  if (value >= 1_000_000)
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (value >= 1_000)
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function PositionBadge({ posicao }: { posicao: number }) {
  if (posicao === 1)
    return (
      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-yellow-500/20 ring-1 ring-yellow-500/40">
        <Crown className="h-3.5 w-3.5 text-yellow-400" />
      </div>
    );
  if (posicao === 2)
    return (
      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-500/20 ring-1 ring-slate-500/30">
        <Medal className="h-3.5 w-3.5 text-slate-300" />
      </div>
    );
  if (posicao === 3)
    return (
      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-700/20 ring-1 ring-amber-600/30">
        <Medal className="h-3.5 w-3.5 text-amber-500" />
      </div>
    );
  return (
    <div className="flex items-center justify-center h-7 w-7">
      <span className="text-[11px] font-bold text-white/30">#{posicao}</span>
    </div>
  );
}

// grid: pos | vendedor | pontos | prêmio | ticket | comissão
const GRID = 'grid-cols-[28px_1fr_64px] sm:grid-cols-[28px_1fr_64px_88px_80px_56px]';

export function LeaderboardTable({
  ranking,
  isLoading,
  periodo,
  onPeriodoChange,
  tipoDoc,
  onTipoDocChange,
  tipoRanking,
  onTipoRankingChange,
  vendedorMetricas,
  usuariosMap = {},
  renovacaoData,
}: LeaderboardTableProps) {
  const isRenovacao = tipoDoc === 'renovacao' && tipoRanking === 'pontos';

  // Ordem aleatória estável — embaralha quando muda de aba ou carrega novos dados
  const rankingRenovacao = useMemo(() => {
    if (!isRenovacao) return ranking;
    const arr = [...ranking];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRenovacao, ranking.length]);

  const rankingExibido = isRenovacao ? rankingRenovacao : ranking;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar — período */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 border-b border-white/8 shrink-0 gap-2">
        <h2 className="text-white font-semibold text-sm tracking-tight shrink-0">Leaderboard</h2>
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 overflow-x-auto shrink-0">
          {(Object.keys(periodoLabels) as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodoChange(p)}
              className={cn(
                'text-[10px] px-2 sm:px-2.5 py-1 rounded-md transition-colors font-medium whitespace-nowrap',
                periodo === p ? 'bg-white/15 text-white' : 'text-white/35 hover:text-white/60',
              )}
            >
              {periodoLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-header — tipo ranking */}
      <div className="flex items-center gap-1 px-3 sm:px-5 py-1.5 border-b border-white/8 shrink-0 overflow-x-auto">
        {(Object.keys(tipoRankingLabels) as TipoRanking[]).map((t) => (
          <button
            key={t}
            onClick={() => onTipoRankingChange(t)}
            className={cn(
              'text-[10px] px-2.5 py-0.5 rounded-full transition-colors font-medium whitespace-nowrap',
              tipoRanking === t
                ? t === 'premio'
                  ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30'
                  : t === 'comissao'
                  ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                  : t === 'quantidade'
                  ? 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30'
                  : 'bg-white/12 text-white'
                : 'text-white/30 hover:text-white/55',
            )}
          >
            {tipoRankingLabels[t]}
          </button>
        ))}
      </div>

      {/* Sub-header — tipo (Todos / Novo / Renovação) */}
      <div className="flex items-center gap-1 px-3 sm:px-5 py-1.5 border-b border-white/5 shrink-0">
        {(Object.keys(tipoDocLabels) as TipoDoc[]).map((t) => (
          <button
            key={t}
            onClick={() => onTipoDocChange(t)}
            className={cn(
              'text-[10px] px-2.5 py-0.5 rounded-full transition-colors font-medium whitespace-nowrap',
              tipoDoc === t
                ? t === 'renovacao'
                  ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                  : t === 'novo'
                  ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30'
                  : 'bg-white/12 text-white'
                : 'text-white/30 hover:text-white/55',
            )}
          >
            {tipoDocLabels[t]}
          </button>
        ))}
      </div>

      {/* Column headers */}
      {isRenovacao ? (
        <div className="grid grid-cols-[1fr_56px] sm:grid-cols-[1fr_64px_1fr] items-center gap-x-3 px-3 sm:px-5 py-2 border-b border-white/5 shrink-0">
          <span className="text-[9px] uppercase tracking-widest text-white/25 font-semibold">Vendedor</span>
          <span className="text-[9px] uppercase tracking-widest text-white/25 font-semibold text-right">Taxa</span>
          <span className="hidden sm:block text-[9px] uppercase tracking-widest text-white/25 font-semibold">
            {renovacaoData?.metaAlvo != null ? `Meta ${renovacaoData.metaAlvo}%` : 'Progresso'}
          </span>
        </div>
      ) : (
        <div className={cn('grid items-center gap-x-3 px-3 sm:px-5 py-2 border-b border-white/5 shrink-0', GRID)}>
          <span />
          <span className="text-[9px] uppercase tracking-widest text-white/25 font-semibold">Vendedor</span>
          <span className={cn(
            'text-[9px] uppercase tracking-widest font-semibold text-right',
            tipoRanking === 'pontos' ? 'text-white/50' : tipoRanking === 'premio' ? 'text-green-400/70' : tipoRanking === 'comissao' ? 'text-purple-400/70' : tipoRanking === 'ticketMedio' ? 'text-cyan-400/70' : 'text-orange-400/70',
          )}>
            {tipoRanking === 'pontos' ? 'Pontos' : tipoRanking === 'premio' ? 'Prêmio' : tipoRanking === 'comissao' ? 'Comis.' : tipoRanking === 'ticketMedio' ? 'Ticket' : 'Vendas'}
          </span>
          <span className={cn(
            'hidden sm:block text-[9px] uppercase tracking-widest font-semibold text-right',
            tipoRanking === 'premio' ? 'text-green-400/70' : 'text-white/25',
          )}>Prêmio</span>
          <span className="hidden sm:block text-[9px] uppercase tracking-widest text-white/25 font-semibold text-right">Ticket</span>
          <span className={cn(
            'hidden sm:block text-[9px] uppercase tracking-widest font-semibold text-right',
            tipoRanking === 'comissao' ? 'text-purple-400/70' : 'text-white/25',
          )}>Comis.</span>
        </div>
      )}

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn('grid items-center gap-x-3 px-3 sm:px-5 py-2.5', GRID)}>
                <Skeleton className="h-7 w-7 rounded-full bg-white/8" />
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-full bg-white/8 shrink-0" />
                  <Skeleton className="h-3.5 w-28 bg-white/8" />
                </div>
                <Skeleton className="h-3.5 w-10 bg-white/8 ml-auto" />
                <Skeleton className="hidden sm:block h-3.5 w-14 bg-white/8 ml-auto" />
                <Skeleton className="hidden sm:block h-3.5 w-12 bg-white/8 ml-auto" />
                <Skeleton className="hidden sm:block h-3.5 w-8 bg-white/8 ml-auto" />
              </div>
            ))}
          </div>
        ) : rankingExibido.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-white/20">
            <p className="text-sm">Sem dados no período</p>
          </div>
        ) : isRenovacao ? (
          <div>
            {rankingExibido.map((item) => (
              <RenovacaoRow
                key={item.usuarioId}
                item={item}
                taxa={renovacaoData?.taxaByVendedor[item.usuarioId] ?? 0}
                metaAlvo={renovacaoData?.metaAlvo ?? null}
                avatarUrl={usuariosMap[item.usuarioId]?.avatarUrl ?? item.avatarUrl}
              />
            ))}
          </div>
        ) : (
          <div>
            {rankingExibido.map((item) => (
              <LeaderboardRow
                key={item.usuarioId}
                item={item}
                metricas={vendedorMetricas[item.usuarioId] ?? null}
                avatarUrl={usuariosMap[item.usuarioId]?.avatarUrl ?? item.avatarUrl}
                tipoRanking={tipoRanking}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RenovacaoRow({
  item,
  taxa,
  metaAlvo,
  avatarUrl,
}: {
  item: RankingItem;
  taxa: number;
  metaAlvo: number | null;
  avatarUrl?: string | null;
}) {
  const atingiu = metaAlvo !== null && taxa >= metaAlvo;
  const progresso = metaAlvo ? Math.min((taxa / metaAlvo) * 100, 100) : null;

  const corTaxa =
    atingiu
      ? 'text-green-400'
      : metaAlvo && taxa >= metaAlvo * 0.75
      ? 'text-yellow-400'
      : 'text-white/60';

  const corBarra =
    atingiu ? 'bg-green-400' : metaAlvo && taxa >= metaAlvo * 0.75 ? 'bg-yellow-400' : 'bg-blue-400/60';

  return (
    <div className="grid grid-cols-[1fr_56px] sm:grid-cols-[1fr_64px_1fr] items-center gap-x-3 px-3 sm:px-5 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      {/* Vendedor */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="h-8 w-8 shrink-0">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={item.nome} />}
          <AvatarFallback className="text-[10px] font-bold bg-white/8 text-white/60">
            {getInitials(item.nome)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate leading-tight">{item.nome}</p>
          {item.equipeNome && (
            <p className="text-white/30 text-[10px] truncate">{item.equipeNome}</p>
          )}
        </div>
      </div>

      {/* Taxa % */}
      <div className="text-right">
        <span className={cn('text-sm font-bold tabular-nums', corTaxa)}>
          {taxa.toFixed(1)}
        </span>
        <span className="text-white/25 text-[9px] ml-0.5">%</span>
      </div>

      {/* Barra de progresso (desktop) */}
      <div className="hidden sm:flex items-center gap-2">
        {progresso !== null ? (
          <>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', corBarra)}
                style={{ width: `${progresso}%` }}
              />
            </div>
            <span className="text-white/30 text-[10px] shrink-0 tabular-nums w-8 text-right">
              {atingiu ? '✓' : `${Math.round(progresso)}%`}
            </span>
          </>
        ) : (
          <span className="text-white/15 text-xs">—</span>
        )}
      </div>
    </div>
  );
}

function LeaderboardRow({
  item,
  metricas,
  avatarUrl,
  tipoRanking,
}: {
  item: RankingItem;
  metricas: VendedorMetricas | null;
  avatarUrl?: string | null;
  tipoRanking: TipoRanking;
}) {
  const isTop3 = item.posicao <= 3;

  return (
    <div
      className={cn(
        'grid items-center gap-x-3 px-3 sm:px-5 py-2.5 border-b border-white/[0.04] transition-colors',
        GRID,
        isTop3 ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]',
      )}
    >
      {/* Pos */}
      <PositionBadge posicao={item.posicao} />

      {/* Vendedor */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="h-8 w-8 shrink-0">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={item.nome} />}
          <AvatarFallback
            className={cn(
              'text-[10px] font-bold',
              item.posicao === 1 && 'bg-yellow-500/20 text-yellow-300',
              item.posicao === 2 && 'bg-slate-500/20 text-slate-300',
              item.posicao === 3 && 'bg-amber-700/20 text-amber-400',
              item.posicao > 3 && 'bg-white/8 text-white/60',
            )}
          >
            {getInitials(item.nome)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate leading-tight">{item.nome}</p>
          {item.equipeNome && (
            <p className="text-white/30 text-[10px] truncate">{item.equipeNome}</p>
          )}
        </div>
      </div>

      {/* Métrica primária */}
      <div className="text-right">
        {tipoRanking === 'pontos' && (
          <>
            <span className={cn('text-sm font-bold tabular-nums', item.posicao === 1 ? 'text-yellow-400' : 'text-white')}>
              {item.pontos}
            </span>
            <span className="text-white/25 text-[9px] ml-0.5">pts</span>
          </>
        )}
        {tipoRanking === 'premio' && (
          metricas && metricas.totalPremio > 0 ? (
            <span className="text-green-400 text-sm font-bold tabular-nums">
              {brlCompact(metricas.totalPremio)}
            </span>
          ) : (
            <span className="text-white/15 text-xs">—</span>
          )
        )}
        {tipoRanking === 'comissao' && (
          metricas && metricas.mediaComissao > 0 && metricas.quantidadeVendas >= MIN_VENDAS_MEDIA ? (
            <>
              <span className="text-purple-400 text-sm font-bold tabular-nums">
                {metricas.mediaComissao.toFixed(1)}
              </span>
              <span className="text-white/25 text-[9px] ml-0.5">%</span>
            </>
          ) : (
            <span className="text-white/15 text-xs">—</span>
          )
        )}
        {tipoRanking === 'quantidade' && (
          metricas && metricas.quantidadeVendas > 0 ? (
            <>
              <span className="text-orange-400 text-sm font-bold tabular-nums">
                {metricas.quantidadeVendas}
              </span>
              <span className="text-white/25 text-[9px] ml-0.5">vnd</span>
            </>
          ) : (
            <span className="text-white/15 text-xs">—</span>
          )
        )}
        {tipoRanking === 'ticketMedio' && (
          metricas && metricas.ticketMedio > 0 && metricas.quantidadeVendas >= MIN_VENDAS_MEDIA ? (
            <span className="text-cyan-400 text-sm font-bold tabular-nums">
              {brlCompact(metricas.ticketMedio)}
            </span>
          ) : (
            <span className="text-white/15 text-xs">—</span>
          )
        )}
      </div>

      {/* Prêmio */}
      <div className="hidden sm:block text-right">
        {metricas && metricas.totalPremio > 0 ? (
          <span className="text-green-400 text-xs font-semibold tabular-nums">
            {brlCompact(metricas.totalPremio)}
          </span>
        ) : (
          <span className="text-white/15 text-xs">—</span>
        )}
      </div>

      {/* Ticket médio */}
      <div className="hidden sm:block text-right">
        {metricas && metricas.ticketMedio > 0 && metricas.quantidadeVendas >= MIN_VENDAS_MEDIA ? (
          <span className="text-white/60 text-xs tabular-nums">
            {brlCompact(metricas.ticketMedio)}
          </span>
        ) : (
          <span className="text-white/15 text-xs">—</span>
        )}
      </div>

      {/* Comissão média */}
      <div className="hidden sm:block text-right">
        {metricas && metricas.mediaComissao > 0 && metricas.quantidadeVendas >= MIN_VENDAS_MEDIA ? (
          <span className="text-purple-400 text-xs font-medium tabular-nums">
            {metricas.mediaComissao.toFixed(1)}%
          </span>
        ) : (
          <span className="text-white/15 text-xs">—</span>
        )}
      </div>
    </div>
  );
}
