
import { Trophy, Target, FileText, RefreshCw, Flame, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Skeleton } from '@/core/ui/skeleton';
import { Progress } from '@/core/ui/progress';
import { cn } from '@/core/utils';
import {
  useBadgeTipos,
  useReconhecimento,
  type NivelMetrica,
  type ReconhecimentoResponse,
} from '@/modules/gamificacao/http';
import { BadgeDisplay } from './BadgeDisplay';

const metricaConfig: Record<
  keyof Pick<ReconhecimentoResponse, 'novos_seguros' | 'renovacoes' | 'cotacoes'>,
  { label: string; icon: React.ComponentType<any>; accent: string; accentBg: string }
> = {
  novos_seguros: {
    label: 'Novos seguros',
    icon: Target,
    accent: 'text-blue-600 dark:text-blue-400',
    accentBg: 'bg-blue-100 dark:bg-blue-950',
  },
  renovacoes: {
    label: 'Renovações',
    icon: RefreshCw,
    accent: 'text-emerald-600 dark:text-emerald-400',
    accentBg: 'bg-emerald-100 dark:bg-emerald-950',
  },
  cotacoes: {
    label: 'Cotações',
    icon: FileText,
    accent: 'text-purple-600 dark:text-purple-400',
    accentBg: 'bg-purple-100 dark:bg-purple-950',
  },
};

export function ReconhecimentoCard() {
  const { data, isLoading } = useReconhecimento();
  const { data: catalogo = [] } = useBadgeTipos();

  const findTipo = (slug?: string | null) =>
    slug ? catalogo.find((b: any) => b.slug === slug) : null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Reconhecimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !data ? (
          <ReconhecimentoSkeleton />
        ) : (
          <>
            {(['novos_seguros', 'renovacoes', 'cotacoes'] as const).map((m) => (
              <NivelLinha
                key={m}
                metrica={data[m]}
                cfg={metricaConfig[m]}
                badgeAtual={findTipo(data[m].atual?.slug)}
                badgeProximo={findTipo(data[m].proximo?.slug)}
              />
            ))}

            <StreakLinha streak={data.streak} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NivelLinha({
  metrica,
  cfg,
  badgeAtual,
  badgeProximo,
}: {
  metrica: NivelMetrica;
  cfg: (typeof metricaConfig)[keyof typeof metricaConfig];
  badgeAtual: any;
  badgeProximo: any;
}) {
  const Icon = cfg.icon;
  const inicio = metrica.atual?.limiar ?? 0;
  const fim = metrica.proximo?.limiar ?? metrica.atual?.limiar ?? 1;
  const restante = Math.max(0, fim - metrica.total);
  const span = Math.max(1, fim - inicio);
  const progresso = metrica.proximo
    ? Math.min(100, Math.round(((metrica.total - inicio) / span) * 100))
    : 100;

  return (
    <div className="rounded-lg border border-border/50 p-3">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn('rounded-lg p-2 ring-1 ring-black/5 shrink-0', cfg.accentBg)}>
          <Icon className={cn('h-4 w-4', cfg.accent)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{cfg.label}</p>
          <p className="text-xs text-muted-foreground">
            {metrica.total.toLocaleString('pt-BR')}{' '}
            {metrica.atual ? (
              <>
                · nível atual:{' '}
                <span className="font-semibold text-foreground">
                  {badgeAtual?.nome ?? metrica.atual.slug}
                </span>
              </>
            ) : (
              '· sem nível ainda'
            )}
          </p>
        </div>
        {badgeAtual && (
          <BadgeDisplay
            badge={{ id: badgeAtual.slug, badgeTipo: badgeAtual }}
            size="sm"
            showRarity
          />
        )}
      </div>

      {metrica.proximo ? (
        <>
          <Progress value={progresso} className="h-1.5" />
          <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
            <span>
              Faltam <span className="font-semibold text-foreground">{restante}</span> para{' '}
              <span className="text-foreground">{badgeProximo?.nome ?? metrica.proximo.slug}</span>
            </span>
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> {metrica.proximo.limiar}
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          Nível máximo conquistado 🎉
        </p>
      )}
    </div>
  );
}

function StreakLinha({ streak }: { streak: ReconhecimentoResponse['streak'] }) {
  const proximo = streak.proximo;
  const inicio = proximo
    ? streak.tiers.filter((t) => streak.atual >= t.limiar).slice(-1)[0]?.limiar ?? 0
    : 0;
  const fim = proximo?.limiar ?? streak.atual;
  const span = Math.max(1, fim - inicio);
  const progresso = proximo
    ? Math.min(100, Math.round(((streak.atual - inicio) / span) * 100))
    : 100;

  return (
    <div className="rounded-lg border border-orange-200/60 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/40 to-transparent dark:from-orange-950/20 p-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-lg p-2 ring-1 ring-black/5 bg-orange-100 dark:bg-orange-950 shrink-0">
          <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Streak de cotações</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {streak.atual}
            </span>{' '}
            dia{streak.atual !== 1 ? 's' : ''} úteis seguido
            {streak.atual !== 1 ? 's' : ''}
            {streak.atual === 0 && ' · crie uma cotação hoje pra começar'}
          </p>
        </div>
      </div>
      {proximo ? (
        <>
          <Progress value={progresso} className="h-1.5" />
          <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
            <span>
              Faltam <span className="font-semibold text-foreground">{Math.max(0, proximo.limiar - streak.atual)}</span> dias úteis
            </span>
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> {proximo.limiar}
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
          Streak máximo alcançado 🔥
        </p>
      )}
      <p className="text-[10px] text-muted-foreground mt-1.5">
        Sábado e domingo não contam.
      </p>
    </div>
  );
}

function ReconhecimentoSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border/50 p-3 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}
