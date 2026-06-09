
import { Link } from '@tanstack/react-router';
import { Trophy, Target, Sparkles, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/core/ui/card';
import { Skeleton } from '@/core/ui/skeleton';
import { Progress } from '@/core/ui/progress';
import { usePermissions } from '@/core/hooks/use-permissions';
import { useAuthStore } from '@/infra/auth/auth-store';
import {
  useMeusBadges,
  useMetasAtivas,
  useMissoesAtivas,
  useRankingGamificacao,
} from '@/modules/gamificacao/http';
import { BadgeDisplay } from './BadgeDisplay';

export function MinhaJornadaWidget() {
  const { hasPermission } = usePermissions();
  const { user } = useAuthStore();
  const podeVer = hasPermission('workspace:acessar');

  const { data: badges = [], isLoading: loadingBadges } = useMeusBadges();
  const { data: metas = [], isLoading: loadingMetas } = useMetasAtivas();
  const { data: missoes = [], isLoading: loadingMissoes } = useMissoesAtivas();
  const { data: rankingData, isLoading: loadingRanking } = useRankingGamificacao();

  if (!podeVer) return null;

  const isLoading =
    loadingBadges || loadingMetas || loadingMissoes || loadingRanking;

  const ultimoBadge = badges[0];
  const todasAtivas = [
    ...metas.filter((m: any) => m.status === 'ATIVA'),
    ...missoes.filter(
      (m: any) => m.status === 'PENDENTE' || m.status === 'EM_ANDAMENTO',
    ),
  ];
  const melhorProgresso = todasAtivas
    .filter((item: any) => (item.percentual ?? 0) > 0 && (item.percentual ?? 0) < 100)
    .sort((a: any, b: any) => (b.percentual ?? 0) - (a.percentual ?? 0))[0];

  const minhaPosicao = rankingData?.ranking.find(
    (r) => r.usuarioId === user?.sub,
  );

  return (
    <Link to="/meu-desempenho" className="block group">
      <Card className="border-border/50 transition-all hover:shadow-md hover:border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold">Sua jornada</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {/* Último badge */}
              <div className="flex flex-col items-center justify-center rounded-lg bg-card/60 border border-border/50 p-2 text-center">
                {ultimoBadge ? (
                  <>
                    <BadgeDisplay badge={ultimoBadge} size="sm" />
                    <p className="text-[10px] text-muted-foreground mt-1 truncate w-full">
                      Último badge
                    </p>
                  </>
                ) : (
                  <>
                    <Trophy className="h-5 w-5 text-muted-foreground/40" />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Sem badges
                    </p>
                  </>
                )}
              </div>

              {/* Melhor progresso */}
              <div className="flex flex-col justify-center rounded-lg bg-card/60 border border-border/50 p-2">
                {melhorProgresso ? (
                  <>
                    <p className="text-xs font-medium truncate">
                      {melhorProgresso.titulo}
                    </p>
                    <Progress
                      value={melhorProgresso.percentual}
                      className="h-1.5 mt-1"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {melhorProgresso.percentual}%
                    </p>
                  </>
                ) : (
                  <div className="text-center">
                    <Target className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Sem ativas
                    </p>
                  </div>
                )}
              </div>

              {/* Posição no ranking */}
              <div className="flex flex-col items-center justify-center rounded-lg bg-card/60 border border-border/50 p-2 text-center">
                {minhaPosicao ? (
                  <>
                    <p className="text-xl font-bold tabular-nums">
                      #{minhaPosicao.posicao}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {minhaPosicao.pontos} pts no mês
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold tabular-nums text-muted-foreground/40">
                      —
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Sem posição
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
