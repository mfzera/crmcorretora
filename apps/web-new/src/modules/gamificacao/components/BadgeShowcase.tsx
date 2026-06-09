
import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { badgeIconMap as iconMap, Trophy } from '../utils/badge-icon-map';
import { cn } from '@/core/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/core/ui/tooltip';
import {
  getRaridadeBadge,
  getCategoriaBadge,
  CATEGORIA_LABEL,
  RARIDADE_CLASSES,
  RARIDADE_LABEL,
  RARIDADE_ORDER,
  type BadgeCategoria,
} from '../utils/badge-meta';

interface BadgeTipo {
  id: string;
  slug: string;
  nome: string;
  descricao?: string | null;
  icone: string;
  cor: string;
}

interface UsuarioBadge {
  id: string;
  badgeTipoId: string;
  observacao?: string | null;
  createdAt?: string;
  badgeTipo?: BadgeTipo | null;
}

interface BadgeShowcaseProps {
  catalogo: BadgeTipo[];
  conquistados: UsuarioBadge[];
}


const corText: Record<string, string> = {
  gold: 'text-yellow-600 dark:text-yellow-400',
  silver: 'text-gray-500 dark:text-gray-300',
  blue: 'text-blue-600 dark:text-blue-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  orange: 'text-orange-600 dark:text-orange-400',
  green: 'text-green-600 dark:text-green-400',
  purple: 'text-purple-600 dark:text-purple-400',
};

const corBg: Record<string, string> = {
  gold: 'bg-yellow-100 dark:bg-yellow-950',
  silver: 'bg-gray-100 dark:bg-gray-800',
  blue: 'bg-blue-100 dark:bg-blue-950',
  yellow: 'bg-yellow-100 dark:bg-yellow-950',
  orange: 'bg-orange-100 dark:bg-orange-950',
  green: 'bg-green-100 dark:bg-green-950',
  purple: 'bg-purple-100 dark:bg-purple-950',
};

const CATEGORIA_ORDER: BadgeCategoria[] = [
  'volume_seguros',
  'volume_renovacoes',
  'volume_cotacoes',
  'streak',
  'conversao',
  'pos_venda',
  'marcos',
  'geral',
];

export function BadgeShowcase({ catalogo, conquistados }: BadgeShowcaseProps) {
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');

  const conquistadoIds = new Set(conquistados.map((b) => b.badgeTipoId));
  const dataConquistaPorTipo = new Map<string, string>();
  conquistados.forEach((b) => {
    if (b.createdAt && !dataConquistaPorTipo.has(b.badgeTipoId)) {
      dataConquistaPorTipo.set(b.badgeTipoId, b.createdAt);
    }
  });

  const categoriasPraExibir = useMemo(() => {
    const cats = new Set(catalogo.map((b) => getCategoriaBadge(b.slug)));
    return CATEGORIA_ORDER.filter((c) => cats.has(c));
  }, [catalogo]);

  const badgesFiltrados = useMemo(() => {
    if (filtroCategoria === 'todas') return catalogo;
    return catalogo.filter((b) => getCategoriaBadge(b.slug) === filtroCategoria);
  }, [catalogo, filtroCategoria]);

  // Sort: conquistados first, then by rarity desc
  const badgesOrdenados = useMemo(() => {
    const raridadeIdx = (slug: string) => RARIDADE_ORDER.indexOf(getRaridadeBadge(slug));
    return [...badgesFiltrados].sort((a, b) => {
      const aConq = conquistadoIds.has(a.id) ? 1 : 0;
      const bConq = conquistadoIds.has(b.id) ? 1 : 0;
      if (bConq !== aConq) return bConq - aConq;
      return raridadeIdx(b.slug) - raridadeIdx(a.slug);
    });
  }, [badgesFiltrados, conquistadoIds]);

  const conquistadosCount = useMemo(
    () => badgesOrdenados.filter((b) => conquistadoIds.has(b.id)).length,
    [badgesOrdenados, conquistadoIds],
  );

  if (catalogo.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Nenhum badge disponível no catálogo.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtro de categoria */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFiltroCategoria('todas')}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
            filtroCategoria === 'todas'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-muted',
          )}
        >
          Todas ({catalogo.length})
        </button>
        {categoriasPraExibir.map((cat) => {
          const count = catalogo.filter((b) => getCategoriaBadge(b.slug) === cat).length;
          const conquistados = catalogo.filter((b) => getCategoriaBadge(b.slug) === cat && conquistadoIds.has(b.id)).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFiltroCategoria(cat)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                filtroCategoria === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {CATEGORIA_LABEL[cat]} ({conquistados}/{count})
            </button>
          );
        })}
      </div>

      {/* Progresso da categoria/total */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{conquistadosCount}</span> de{' '}
          <span className="font-semibold text-foreground">{badgesOrdenados.length}</span> conquistados
          {filtroCategoria !== 'todas' && ` em ${CATEGORIA_LABEL[filtroCategoria as BadgeCategoria]}`}
        </span>
        <div className="flex items-center gap-2">
          {RARIDADE_ORDER.slice().reverse().map((r) => {
            const rc = RARIDADE_CLASSES[r];
            const total = badgesOrdenados.filter((b) => getRaridadeBadge(b.slug) === r).length;
            if (total === 0) return null;
            return (
              <div key={r} className="flex items-center gap-1">
                <span className={cn('h-2 w-2 rounded-full', rc.dot)} />
                <span className={cn('text-[10px]', rc.label)}>{RARIDADE_LABEL[r]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <TooltipProvider>
        <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          {badgesOrdenados.map((tipo) => {
            const conquistado = conquistadoIds.has(tipo.id);
            const dataConquista = dataConquistaPorTipo.get(tipo.id);
            const IconComponent = iconMap[tipo.icone] ?? Trophy;
            const raridade = getRaridadeBadge(tipo.slug);
            const rc = RARIDADE_CLASSES[raridade];

            return (
              <Tooltip key={tipo.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'relative flex flex-col items-center gap-2 rounded-xl p-3 cursor-default transition-all',
                      conquistado
                        ? cn(
                            'ring-1 hover:scale-105',
                            raridade !== 'comum' ? 'shadow-md' : '',
                            rc.glow,
                            'bg-card',
                          )
                        : 'bg-muted/30 ring-1 ring-border/30 grayscale opacity-50 hover:opacity-70',
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-full p-3 ring-2',
                        conquistado ? (corBg[tipo.cor] ?? corBg.gold) : 'bg-muted',
                        conquistado ? rc.ring : 'ring-muted-foreground/20',
                      )}
                    >
                      <IconComponent
                        className={cn(
                          'h-6 w-6',
                          conquistado ? (corText[tipo.cor] ?? corText.gold) : 'text-muted-foreground/40',
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium text-center leading-tight line-clamp-2',
                        !conquistado && 'text-muted-foreground/60',
                      )}
                    >
                      {tipo.nome}
                    </span>
                    {conquistado && (
                      <div className="flex items-center gap-1">
                        <span className={cn('h-1.5 w-1.5 rounded-full', rc.dot)} />
                        <span className={cn('text-[10px] font-medium', rc.label)}>
                          {RARIDADE_LABEL[raridade]}
                        </span>
                      </div>
                    )}
                    {!conquistado && (
                      <Lock className="absolute top-1.5 right-1.5 h-3 w-3 text-muted-foreground/40" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center max-w-[200px]">
                    <p className="font-semibold">{tipo.nome}</p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className={cn('h-1.5 w-1.5 rounded-full', rc.dot)} />
                      <span className={cn('text-[10px]', rc.label)}>{RARIDADE_LABEL[raridade]}</span>
                    </div>
                    {tipo.descricao && (
                      <p className="text-xs text-muted-foreground mt-1">{tipo.descricao}</p>
                    )}
                    {conquistado && dataConquista ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Conquistado em {new Date(dataConquista).toLocaleDateString('pt-BR')}
                      </p>
                    ) : (
                      <p className="text-xs italic mt-1 text-muted-foreground">
                        Ainda não conquistado
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
