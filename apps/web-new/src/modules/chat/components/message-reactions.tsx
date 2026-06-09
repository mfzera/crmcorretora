
import { cn } from '@/core/utils';
import { useAuthStore } from '@/infra/auth/auth-store';

type Reacao = {
  id: string;
  emoji: string;
  usuarioId: string;
  usuario: {
    id: string;
    nome: string;
  };
};

type MessageReactionsProps = {
  reacoes: Reacao[];
  onReactionClick: (emoji: string, isOwn: boolean) => void;
};

export function MessageReactions({
  reacoes,
  onReactionClick,
}: MessageReactionsProps) {
  const { user } = useAuthStore();

  if (!reacoes || reacoes.length === 0) return null;

  // Agrupar reações por emoji
  const groupedReactions = reacoes.reduce(
    (acc, reacao) => {
      if (!acc[reacao.emoji]) {
        acc[reacao.emoji] = [];
      }
      acc[reacao.emoji].push(reacao);
      return acc;
    },
    {} as Record<string, Reacao[]>,
  );

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(groupedReactions).map(([emoji, reactions]) => {
        const hasUserReacted = reactions.some((r) => r.usuarioId === user?.id);
        const count = reactions.length;
        const names = reactions
          .map((r) => r.usuario?.nome ?? 'Usuário')
          .join(', ');

        return (
          <button
            key={emoji}
            onClick={() => onReactionClick(emoji, hasUserReacted)}
            title={names}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm',
              'border transition-all hover:scale-110',
              hasUserReacted
                ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                : 'bg-muted/50 border-border hover:bg-muted',
            )}
          >
            <span>{emoji}</span>
            {count > 1 && <span className="text-xs font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
