import { MiniLeaderboard } from './MiniLeaderboard';
import { type RankingItem } from '@/modules/gamificacao/http';
import { type VendedorMetricas, type TipoRanking } from './LeaderboardTable';

const COLUMNS: TipoRanking[] = ['premio', 'comissao', 'quantidade', 'ticketMedio'];

interface RankingClassicViewProps {
  rankingsByMetric: Record<TipoRanking, RankingItem[]>;
  vendedorMetricas: Record<string, VendedorMetricas>;
  usuariosMap: Record<string, { avatarUrl: string | null; cargo: string | null }>;
  isLoading: boolean;
  showBackground: boolean;
}

export function RankingClassicView({
  rankingsByMetric,
  vendedorMetricas,
  usuariosMap,
  isLoading,
  showBackground,
}: RankingClassicViewProps) {
  return (
    <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
      {/* Fundo decorativo */}
      {showBackground && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(20,60,35,0.5) 0%, transparent 65%), ' +
              'radial-gradient(ellipse 70% 50% at 85% 110%, rgba(15,25,60,0.4) 0%, transparent 65%), ' +
              'radial-gradient(ellipse 50% 40% at 10% 80%, rgba(40,20,60,0.25) 0%, transparent 60%)',
          }}
        />
      )}

      {/* Grid de 4 colunas */}
      <div className="relative z-10 grid grid-cols-4 flex-1 min-h-0 divide-x divide-white/5">
        {COLUMNS.map((tipo) => (
          <MiniLeaderboard
            key={tipo}
            tipoRanking={tipo}
            ranking={rankingsByMetric[tipo]}
            vendedorMetricas={vendedorMetricas}
            usuariosMap={usuariosMap}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
