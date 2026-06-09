import { createFileRoute } from '@tanstack/react-router';
import { ModuloGuard } from '@/core/components/shared/modulo-guard';

import { useMemo } from 'react';
import {
  Trophy,
  Target,
  Swords,
  Megaphone,
  Sparkles,
  TrendingUp,
  Calendar,
  Award,
} from 'lucide-react';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Skeleton } from '@/core/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Progress } from '@/core/ui/progress';
import { EmptyState } from '@/core/components/shared';
import { useAuthStore } from '@/infra/auth/auth-store';
import { cn } from '@/core/utils';
import {
  useMetasAtivas,
  useMissoesAtivas,
  useCampanhasAtivas,
  useMeusBadges,
  useBadgeTipos,
} from '@/modules/gamificacao/http';
import { BadgeShowcase } from '@/modules/gamificacao/components/BadgeShowcase';
import { BadgeDisplay } from '@/modules/gamificacao/components/BadgeDisplay';
import { MetaProgressCard } from '@/modules/gamificacao/components/MetaProgressCard';
import { MissaoCard } from '@/modules/gamificacao/components/MissaoCard';
import { CampanhaCard } from '@/modules/gamificacao/components/CampanhaCard';
import { ReconhecimentoCard } from '@/modules/gamificacao/components/ReconhecimentoCard';

export const Route = createFileRoute('/_app/meu-desempenho')({
  component: () => <ModuloGuard modulo="gamificacao"><MeuDesempenhoPage /></ModuloGuard>,
});


function MeuDesempenhoPage() {
  return (
    <PageGuard permission="workspace:acessar">
      <MeuDesempenhoContent />
    </PageGuard>
  );
}

function MeuDesempenhoContent() {
  const { user } = useAuthStore();
  const { data: metas = [], isLoading: loadingMetas } = useMetasAtivas();
  const { data: missoes = [], isLoading: loadingMissoes } = useMissoesAtivas();
  const { data: campanhas = [], isLoading: loadingCampanhas } = useCampanhasAtivas();
  const { data: badges = [], isLoading: loadingBadges } = useMeusBadges();
  const { data: catalogo = [], isLoading: loadingCatalogo } = useBadgeTipos();

  const metasAtivas = useMemo(
    () => metas.filter((m: any) => m.status === 'ATIVA'),
    [metas],
  );
  const missoesAtivas = useMemo(
    () => missoes.filter((m: any) => m.status === 'PENDENTE' || m.status === 'EM_ANDAMENTO'),
    [missoes],
  );
  const campanhasAtivas = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    return campanhas.filter(
      (c: any) => c.ativa && c.dataInicio <= hoje && c.dataFim >= hoje,
    );
  }, [campanhas]);

  const conquistasRecentes = useMemo(
    () => badges.slice(0, 8),
    [badges],
  );

  const stats = useMemo(() => {
    const totalBadges = badges.length;
    const totalCatalogo = catalogo.length;
    const progressoBadges =
      totalCatalogo > 0 ? Math.round((totalBadges / totalCatalogo) * 100) : 0;

    const todasAtivas = [...metasAtivas, ...missoesAtivas];
    const melhorPercentual = todasAtivas.reduce(
      (max, item: any) => Math.max(max, item.percentual ?? 0),
      0,
    );

    const proximaConclusao = todasAtivas
      .filter((item: any) => (item.percentual ?? 0) > 0 && (item.percentual ?? 0) < 100)
      .sort((a: any, b: any) => (b.percentual ?? 0) - (a.percentual ?? 0))[0];

    return {
      totalBadges,
      totalCatalogo,
      progressoBadges,
      ativasCount: todasAtivas.length,
      melhorPercentual,
      proximaConclusao,
    };
  }, [badges, catalogo, metasAtivas, missoesAtivas]);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isLoadingHero = loadingBadges || loadingCatalogo || loadingMetas || loadingMissoes;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-5 md:p-6">
      {/* Hero */}
      <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-primary/5 via-primary/0 to-transparent">
        <CardContent className="p-4 sm:p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-5">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <Avatar className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 ring-2 ring-primary/20">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.nome} />}
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {user ? getInitials(user.nome) : '..'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Sua jornada
                </p>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
                  {user?.nome ?? '...'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground break-all sm:truncate">
                  {user?.email ?? ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:ml-auto md:flex-1 md:max-w-2xl">
              <HeroStat
                icon={Trophy}
                label="Badges"
                value={
                  isLoadingHero ? '—' : `${stats.totalBadges}/${stats.totalCatalogo}`
                }
                accent="text-yellow-600 dark:text-yellow-400"
                accentBg="bg-yellow-100 dark:bg-yellow-950"
              />
              <HeroStat
                icon={Target}
                label="Em andamento"
                value={isLoadingHero ? '—' : String(stats.ativasCount)}
                accent="text-blue-600 dark:text-blue-400"
                accentBg="bg-blue-100 dark:bg-blue-950"
              />
              <HeroStat
                icon={TrendingUp}
                label="Melhor progresso"
                value={isLoadingHero ? '—' : `${stats.melhorPercentual}%`}
                accent="text-emerald-600 dark:text-emerald-400"
                accentBg="bg-emerald-100 dark:bg-emerald-950"
              />
              <HeroStat
                icon={Sparkles}
                label="Coleção"
                value={isLoadingHero ? '—' : `${stats.progressoBadges}%`}
                accent="text-purple-600 dark:text-purple-400"
                accentBg="bg-purple-100 dark:bg-purple-950"
              />
            </div>
          </div>

          {stats.proximaConclusao && !isLoadingHero && (
            <div className="mt-5 pt-5 border-t border-border/50">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Mais perto de bater:</span>
                  <span className="font-medium truncate">
                    {stats.proximaConclusao.titulo}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {stats.proximaConclusao.percentual}%
                </span>
              </div>
              <Progress value={stats.proximaConclusao.percentual} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconhecimento (níveis vitalícios + streak) */}
      <ReconhecimentoCard />

      {/* Progresso ativo: Metas + Missões */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-blue-500" />
              Minhas metas
              {!loadingMetas && metasAtivas.length > 0 && (
                <span className="ml-auto text-xs font-normal bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                  {metasAtivas.length} ativa{metasAtivas.length !== 1 ? 's' : ''}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingMetas ? (
              <CardListSkeleton items={2} />
            ) : metasAtivas.length === 0 ? (
              <EmptyState icon={Target} description="Nenhuma meta ativa para você." />
            ) : (
              metasAtivas.map((meta: any) => (
                <MetaProgressCard key={meta.id} meta={meta} />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Swords className="h-5 w-5 text-orange-500" />
              Minhas missões
              {!loadingMissoes && missoesAtivas.length > 0 && (
                <span className="ml-auto text-xs font-normal bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                  {missoesAtivas.length} ativa{missoesAtivas.length !== 1 ? 's' : ''}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingMissoes ? (
              <CardListSkeleton items={2} />
            ) : missoesAtivas.length === 0 ? (
              <EmptyState icon={Swords} description="Nenhuma missão em andamento." />
            ) : (
              missoesAtivas.map((missao: any) => (
                <MissaoCard key={missao.id} missao={missao} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coleção de badges */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-yellow-500" />
            Coleção de badges
            {!loadingBadges && !loadingCatalogo && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {stats.totalBadges} de {stats.totalCatalogo} conquistados
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBadges || loadingCatalogo ? (
            <BadgeShowcaseSkeleton />
          ) : (
            <BadgeShowcase catalogo={catalogo} conquistados={badges} />
          )}
        </CardContent>
      </Card>

      {/* Conquistas recentes + Campanhas */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Conquistas recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBadges ? (
              <TimelineSkeleton items={3} />
            ) : conquistasRecentes.length === 0 ? (
              <EmptyState
                icon={Trophy}
                description="Bata uma meta ou cumpra uma missão para ganhar seu primeiro badge."
              />
            ) : (
              <ol className="space-y-3">
                {conquistasRecentes.map((badge: any, index: number) => (
                  <li
                    key={badge.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/30',
                    )}
                  >
                    <div className="shrink-0">
                      <BadgeDisplay badge={badge} size="md" showRarity />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {badge.badgeTipo?.nome ?? 'Badge'}
                      </p>
                      {badge.observacao ? (
                        <p className="text-xs text-muted-foreground truncate italic">
                          {badge.observacao}
                        </p>
                      ) : badge.badgeTipo?.descricao ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {badge.badgeTipo.descricao}
                        </p>
                      ) : null}
                    </div>
                    {badge.createdAt && (
                      <div className="hidden md:flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(badge.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    {index === 0 && (
                      <span className="hidden md:inline shrink-0 text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Mais recente
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="h-5 w-5 text-emerald-500" />
              Campanhas ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCampanhas ? (
              <CardListSkeleton items={2} />
            ) : campanhasAtivas.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                description="Sem campanhas ativas no momento."
              />
            ) : (
              <div className="space-y-3">
                {campanhasAtivas.map((campanha: any) => (
                  <div key={campanha.id} className="w-full">
                    <CampanhaCard campanha={campanha} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface HeroStatProps {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  accent: string;
  accentBg: string;
}

function HeroStat({ icon: Icon, label, value, accent, accentBg }: HeroStatProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 rounded-lg border border-border/50 bg-card/60 p-2 sm:p-3 min-w-0">
      <div className={cn('rounded-lg p-1.5 sm:p-2 ring-1 ring-black/5 shrink-0', accentBg)}>
        <Icon className={cn('h-4 w-4', accent)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground font-medium truncate">
          {label}
        </p>
        <p className="text-base sm:text-lg font-bold tabular-nums truncate">{value}</p>
      </div>
    </div>
  );
}

function CardListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border/50 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BadgeShowcaseSkeleton() {
  return (
    <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2 rounded-xl bg-muted/30 p-3"
        >
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function TimelineSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg p-2">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
