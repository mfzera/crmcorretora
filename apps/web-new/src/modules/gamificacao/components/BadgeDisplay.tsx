
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
  RARIDADE_CLASSES,
  RARIDADE_LABEL,
} from '../utils/badge-meta';

interface BadgeDisplayProps {
  badge: {
    id: string;
    badgeTipo?: {
      slug: string;
      nome: string;
      descricao?: string;
      icone: string;
      cor: string;
    } | null;
    observacao?: string;
    createdAt?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showRarity?: boolean;
}


const corClasses: Record<string, { bg: string; text: string }> = {
  gold: {
    bg: 'bg-yellow-100 dark:bg-yellow-950',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  silver: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-300',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-950',
    text: 'text-blue-600 dark:text-blue-400',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-950',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-950',
    text: 'text-orange-600 dark:text-orange-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-950',
    text: 'text-green-600 dark:text-green-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-950',
    text: 'text-purple-600 dark:text-purple-400',
  },
};

const sizeClasses = {
  sm: { container: 'p-1.5', icon: 'h-4 w-4', label: 'text-xs', dot: 'h-1.5 w-1.5' },
  md: { container: 'p-2', icon: 'h-5 w-5', label: 'text-sm', dot: 'h-2 w-2' },
  lg: { container: 'p-3', icon: 'h-6 w-6', label: 'text-base', dot: 'h-2.5 w-2.5' },
};

export function BadgeDisplay({ badge, size = 'md', showLabel = false, showRarity = false }: BadgeDisplayProps) {
  const tipo = badge.badgeTipo;
  if (!tipo) return null;

  const IconComponent = iconMap[tipo.icone] ?? Trophy;
  const cores = corClasses[tipo.cor] ?? corClasses.gold;
  const sizes = sizeClasses[size];
  const raridade = getRaridadeBadge(tipo.slug);
  const raridadeClasses = RARIDADE_CLASSES[raridade];

  const content = (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'rounded-full ring-2 transition-shadow',
          cores.bg,
          raridadeClasses.ring,
          raridade !== 'comum' && 'shadow-md',
          raridadeClasses.glow,
          sizes.container,
        )}
      >
        <IconComponent className={cn(sizes.icon, cores.text)} />
      </div>
      {showLabel && (
        <span className={cn('font-medium text-center leading-tight', sizes.label)}>
          {tipo.nome}
        </span>
      )}
      {showRarity && (
        <div className="flex items-center gap-1">
          <span className={cn('h-1.5 w-1.5 rounded-full', raridadeClasses.dot)} />
          <span className={cn('text-[10px] font-medium', raridadeClasses.label)}>
            {RARIDADE_LABEL[raridade]}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-default">{content}</div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center max-w-[180px]">
            <p className="font-semibold">{tipo.nome}</p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', raridadeClasses.dot)} />
              <span className={cn('text-[10px]', raridadeClasses.label)}>
                {RARIDADE_LABEL[raridade]}
              </span>
            </div>
            {tipo.descricao && (
              <p className="text-xs text-muted-foreground mt-1">{tipo.descricao}</p>
            )}
            {badge.observacao && (
              <p className="text-xs italic mt-0.5 text-muted-foreground">{badge.observacao}</p>
            )}
            {badge.createdAt && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(badge.createdAt).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
