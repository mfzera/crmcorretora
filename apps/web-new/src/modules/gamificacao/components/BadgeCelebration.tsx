
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Link } from '@tanstack/react-router';
import { Sparkles, X } from 'lucide-react';
import { badgeIconMap as iconMap, Trophy } from '../utils/badge-icon-map';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/core/utils';
import {
  useNotificacoes,
  useMarcarNotificacaoComoLida,
} from '@/modules/notificacoes/http';
import { gamificacaoKeys } from '@/modules/gamificacao/http';

interface BadgePayload {
  notificacaoId: string;
  badgeNome: string;
  badgeDescricao?: string | null;
  badgeIcone?: string;
  badgeCor?: string;
  observacao?: string;
}


const corClasses: Record<string, { bg: string; text: string; ring: string; glow: string }> = {
  gold: {
    bg: 'bg-yellow-100 dark:bg-yellow-950',
    text: 'text-yellow-600 dark:text-yellow-400',
    ring: 'ring-yellow-300 dark:ring-yellow-700',
    glow: 'shadow-[0_0_60px_rgba(234,179,8,0.5)]',
  },
  silver: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-300',
    ring: 'ring-gray-300 dark:ring-gray-600',
    glow: 'shadow-[0_0_60px_rgba(156,163,175,0.5)]',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-950',
    text: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-300 dark:ring-blue-700',
    glow: 'shadow-[0_0_60px_rgba(59,130,246,0.5)]',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-950',
    text: 'text-yellow-600 dark:text-yellow-400',
    ring: 'ring-yellow-300 dark:ring-yellow-700',
    glow: 'shadow-[0_0_60px_rgba(234,179,8,0.5)]',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-950',
    text: 'text-orange-600 dark:text-orange-400',
    ring: 'ring-orange-300 dark:ring-orange-700',
    glow: 'shadow-[0_0_60px_rgba(249,115,22,0.5)]',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-950',
    text: 'text-green-600 dark:text-green-400',
    ring: 'ring-green-300 dark:ring-green-700',
    glow: 'shadow-[0_0_60px_rgba(34,197,94,0.5)]',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-950',
    text: 'text-purple-600 dark:text-purple-400',
    ring: 'ring-purple-300 dark:ring-purple-700',
    glow: 'shadow-[0_0_60px_rgba(168,85,247,0.5)]',
  },
};

/**
 * Watches for new unread gamification notifications. When one appears,
 * shows a celebration overlay with the badge details and marks it read.
 * Mount once at the app root.
 */
export function BadgeCelebrationWatcher() {
  const { data } = useNotificacoes({ tipo: 'gamificacao', lida: false, limit: 1 });
  const lastSeenId = useRef<string | null>(null);
  const isFirstRun = useRef(true);
  const [active, setActive] = useState<BadgePayload | null>(null);
  const marcarLida = useMarcarNotificacaoComoLida();
  const queryClient = useQueryClient();

  useEffect(() => {
    const items = data?.items ?? [];
    const latest = items[0];

    if (isFirstRun.current) {
      isFirstRun.current = false;
      lastSeenId.current = latest?.id ?? null;
      return;
    }

    if (latest && latest.id !== lastSeenId.current) {
      lastSeenId.current = latest.id;
      const meta = latest.metadata ?? {};
      setActive({
        notificacaoId: latest.id,
        badgeNome: meta.badgeNome ?? latest.titulo,
        badgeDescricao: meta.badgeDescricao,
        badgeIcone: meta.badgeIcone,
        badgeCor: meta.badgeCor,
        observacao: latest.mensagem,
      });
    }
  }, [data]);

  const handleClose = () => {
    if (active) {
      marcarLida.mutate(active.notificacaoId);
      // Refresh badges and ranking caches so coleção/widget atualizem
      queryClient.invalidateQueries({ queryKey: gamificacaoKeys.meusBadges() });
      queryClient.invalidateQueries({ queryKey: gamificacaoKeys.all });
    }
    setActive(null);
  };

  if (!active) return null;

  return <BadgeCelebrationOverlay payload={active} onClose={handleClose} />;
}

function BadgeCelebrationOverlay({
  payload,
  onClose,
}: {
  payload: BadgePayload;
  onClose: () => void;
}) {
  const IconComponent: ComponentType<{ className?: string }> =
    (payload.badgeIcone ? iconMap[payload.badgeIcone] : undefined) ?? Trophy;
  const cores = corClasses[payload.badgeCor ?? 'gold'] ?? corClasses.gold;

  // Auto-close after 8s
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <span
            key={i}
            className="absolute block h-2 w-2 rounded-full bg-yellow-400 opacity-80"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `-10px`,
              animation: `badge-confetti-fall ${3 + (i % 4)}s linear ${i * 0.1}s infinite`,
              backgroundColor: ['#fbbf24', '#f87171', '#34d399', '#60a5fa', '#a78bfa'][i % 5],
            }}
          />
        ))}
      </div>

      <div
        className={cn(
          'relative bg-card border border-border rounded-2xl p-8 max-w-sm w-[90%] mx-4 text-center',
          'animate-in zoom-in-95 duration-500',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Conquista desbloqueada
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="flex justify-center mb-4">
          <div
            className={cn(
              'rounded-full p-6 ring-4 transition-transform',
              cores.bg,
              cores.ring,
              cores.glow,
              'animate-pulse',
            )}
          >
            <IconComponent className={cn('h-14 w-14', cores.text)} />
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-1">
          {payload.badgeNome}
        </h2>
        {payload.badgeDescricao && (
          <p className="text-sm text-muted-foreground mb-3">
            {payload.badgeDescricao}
          </p>
        )}
        {payload.observacao && (
          <p className="text-sm italic text-muted-foreground mb-4">
            {payload.observacao}
          </p>
        )}

        <Link
          to="/meu-desempenho"
          onClick={onClose}
          className="inline-flex items-center justify-center w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Ver minha coleção
        </Link>
      </div>

      <style>{`
        @keyframes badge-confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
