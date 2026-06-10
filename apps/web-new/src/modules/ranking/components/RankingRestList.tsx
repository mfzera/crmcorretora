import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { cn } from '@/core/utils';
import { type RankingItem } from '@/modules/gamificacao/http';
import { getCategoryDisplay, CATEGORY_STYLE } from './RankingPodium';
import { type VendedorMetricas, type TipoRanking } from './LeaderboardTable';

function initials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

interface RankingRestListProps {
  items: RankingItem[];
  activeCategory: TipoRanking;
  vendedorMetricas: Record<string, VendedorMetricas>;
  usuariosMap: Record<string, { avatarUrl: string | null; cargo: string | null }>;
}

export function RankingRestList({
  items,
  activeCategory,
  vendedorMetricas,
  usuariosMap,
}: RankingRestListProps) {
  const catStyle = CATEGORY_STYLE[activeCategory];

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col shrink-0 max-h-[45%] min-h-0 overflow-hidden border-t border-white/8">
      {/* Cabeçalho */}
      <div className="shrink-0 px-4 sm:px-8 py-1 bg-[#0d0d0d]">
        <span className={cn('text-[9px] font-bold uppercase tracking-widest opacity-40', catStyle.colorClass)}>
          Demais colocados
        </span>
      </div>

      {/* Linhas com scroll */}
      <div className="overflow-y-auto">
        {items.map((item) => {
          const metricas = vendedorMetricas[item.usuarioId] ?? null;
          const { value, unit } = getCategoryDisplay(activeCategory, item, metricas);
          const avatarUrl = usuariosMap[item.usuarioId]?.avatarUrl ?? item.avatarUrl;

          return (
            <div
              key={item.usuarioId}
              className="grid grid-cols-[32px_1fr_auto] sm:grid-cols-[40px_1fr_auto] items-center gap-2 sm:gap-3 px-4 sm:px-8 py-1.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-sm font-bold text-white/20 tabular-nums text-center">
                #{item.posicao}
              </span>
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={item.nome} />}
                  <AvatarFallback className="text-[9px] font-bold bg-white/8 text-white/55">
                    {initials(item.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-white/85 text-xs sm:text-sm font-medium truncate leading-tight">
                    {item.nome}
                  </p>
                  {item.equipeNome && (
                    <p className="text-white/25 text-[9px] truncate">{item.equipeNome}</p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={cn('text-sm font-bold tabular-nums', catStyle.colorClass)}>
                  {value}
                </span>
                {unit && (
                  <span className={cn('text-[10px] ml-0.5 opacity-50', catStyle.colorClass)}>
                    {unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
