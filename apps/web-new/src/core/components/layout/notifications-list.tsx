
import { useState } from 'react';
import { dayjs } from '@/core/utils/date-utils';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  ClipboardCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';
import { ScrollArea } from '@/core/ui/scroll-area';
import { Separator } from '@/core/ui/separator';
import { Badge } from '@/core/ui/badge';
import { Skeleton } from '@/core/ui/skeleton';
import type { Notificacao } from '@/types/notificacao';
import {
  useNotificacoes,
  useNotificacoesNaoLidas,
  useMarcarNotificacaoComoLida,
  useMarcarTodasComoLidas,
  useDeleteNotification,
} from '@/modules/notificacoes/http';
import { useNotificationSound } from '@/core/hooks/use-notification-sound';
import { cn } from '@/core/utils';

type FilterType = 'nao-lidas' | 'todos' | 'lidas';

type DateGroupKey = 'hoje' | 'ontem' | 'esta-semana' | 'anteriores';

const GROUP_ORDER: DateGroupKey[] = ['hoje', 'ontem', 'esta-semana', 'anteriores'];
const GROUP_LABELS: Record<DateGroupKey, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  'esta-semana': 'Esta semana',
  anteriores: 'Anteriores',
};

function getGroupKey(date: Date | string): DateGroupKey {
  const d = dayjs(date);
  const now = dayjs();
  if (d.isToday()) return 'hoje';
  if (d.isSame(now.subtract(1, 'day'), 'day')) return 'ontem';
  if (d.isAfter(now.subtract(7, 'day'))) return 'esta-semana';
  return 'anteriores';
}

function groupNotificacoes(items: Notificacao[]) {
  const grouped = new Map<DateGroupKey, Notificacao[]>();
  for (const n of items) {
    const key = getGroupKey(n.createdAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(n);
  }
  return GROUP_ORDER.filter((k) => grouped.has(k)).map((k) => ({
    key: k,
    label: GROUP_LABELS[k],
    items: grouped.get(k)!,
  }));
}

function formatarMensagem(mensagem: string): string {
  return mensagem
    .replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
    .replace(/@\{([^|]+)\|[^}]+\}/g, '@$1');
}

function getIconeNotificacao(tipo: string, prioridade?: string) {
  const map: Record<string, React.ReactNode> = {
    venda_recusada:      <XCircle className="h-4 w-4 text-red-500" />,
    renovacao_expirando: prioridade === 'urgente'
                           ? <Clock className="h-4 w-4 text-red-500" />
                           : <Clock className="h-4 w-4 text-orange-500" />,
    aprovacao_pendente:  <ClipboardCheck className="h-4 w-4 text-blue-500" />,
    venda_aprovada:      <CheckCircle className="h-4 w-4 text-green-500" />,
    endosso_solicitado:  <AlertCircle className="h-4 w-4 text-orange-500" />,
    endosso_recusado:    <XCircle className="h-4 w-4 text-red-500" />,
    cotacao_atribuida:   <FileText className="h-4 w-4 text-blue-500" />,
    comissao_disponivel: <DollarSign className="h-4 w-4 text-green-500" />,
  };
  return map[tipo] ?? <Bell className="h-4 w-4" />;
}

const PRIORITY_BORDER: Record<string, string> = {
  urgente: 'border-l-destructive',
  alta: 'border-l-orange-500',
  media: 'border-l-primary',
  baixa: 'border-l-border',
};

const PRIORITY_ICON_BG: Record<string, string> = {
  urgente: 'bg-destructive/10',
  alta: 'bg-orange-500/10',
  media: 'bg-primary/10',
  baixa: 'bg-muted',
};

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  urgente: {
    label: 'Urgente',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  alta: {
    label: 'Alta',
    className: 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  media: {
    label: 'Média',
    className: 'border-primary/30 bg-primary/10 text-primary',
  },
};

function BadgePrioridade({ prioridade }: { prioridade?: string }) {
  if (!prioridade || prioridade === 'baixa') return null;
  const cfg = PRIORITY_BADGE[prioridade];
  if (!cfg) return null;
  return (
    <Badge
      variant="outline"
      className={cn('h-4 px-1.5 py-0 text-[10px] font-medium', cfg.className)}
    >
      {cfg.label}
    </Badge>
  );
}

function SkeletonList() {
  return (
    <div className="divide-y">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3 border-l-[3px] border-l-border">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 py-0.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterType }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
        <BellOff className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-foreground">
        {filter === 'nao-lidas' ? 'Tudo em dia!' : 'Nenhuma notificação'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {filter === 'nao-lidas'
          ? 'Você não tem notificações não lidas.'
          : filter === 'lidas'
          ? 'Nenhuma notificação lida encontrada.'
          : 'Nenhuma notificação por aqui.'}
      </p>
    </div>
  );
}

interface NotificationItemProps {
  notificacao: Notificacao;
}

function NotificationItem({ notificacao }: NotificationItemProps) {
  const marcarComoLida = useMarcarNotificacaoComoLida();
  const excluir = useDeleteNotification();

  const borderColor = PRIORITY_BORDER[notificacao.prioridade ?? 'baixa'] ?? 'border-l-border';
  const iconBg = PRIORITY_ICON_BG[notificacao.prioridade ?? 'baixa'] ?? 'bg-muted';

  const content = (
    <div
      className={cn(
        'group relative flex gap-3 px-4 py-3 border-l-[3px] transition-colors hover:bg-muted/40',
        borderColor,
        !notificacao.lida && 'bg-primary/[0.03] dark:bg-primary/[0.06]',
      )}
    >
      <div className="shrink-0 mt-0.5">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full',
            !notificacao.lida ? iconBg : 'bg-muted',
          )}
        >
          {getIconeNotificacao(notificacao.tipo, notificacao.prioridade)}
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-start gap-1.5">
          <p
            className={cn(
              'text-sm leading-snug flex-1 min-w-0',
              !notificacao.lida ? 'font-semibold' : 'font-medium text-muted-foreground',
            )}
          >
            {notificacao.titulo}
          </p>
          {!notificacao.lida && (
            <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {formatarMensagem(notificacao.mensagem)}
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <p className="text-[11px] text-muted-foreground/70">
            {dayjs(notificacao.createdAt).fromNow()}
          </p>
          <BadgePrioridade prioridade={notificacao.prioridade} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!notificacao.lida && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              marcarComoLida.mutate(notificacao.id);
            }}
            title="Marcar como lida"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            excluir.mutate(notificacao.id);
          }}
          title="Excluir"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  if (notificacao.linkAcao) {
    return (
      <Link to={notificacao.linkAcao} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

interface NotificationsPanelProps {
  onClose?: () => void;
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const [filter, setFilter] = useState<FilterType>('nao-lidas');
  const { enabled: soundEnabled, toggleSound } = useNotificationSound();

  const lidaParam =
    filter === 'todos' ? undefined : filter === 'nao-lidas' ? false : true;

  const { data: notificacoesData, isLoading } = useNotificacoes({
    limit: 30,
    lida: lidaParam,
  });
  const { data: countNaoLidas = 0 } = useNotificacoesNaoLidas();
  const marcarTodasComoLidas = useMarcarTodasComoLidas();

  const notificacoes = notificacoesData?.items ?? [];
  const groups = groupNotificacoes(notificacoes);

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'nao-lidas', label: 'Não lidas' },
    { key: 'todos', label: 'Todas' },
    { key: 'lidas', label: 'Lidas' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-3 pr-12">
        <Bell className="h-5 w-5 text-primary shrink-0" />
        <h2 className="font-semibold text-base flex-1">Notificações</h2>
        {countNaoLidas > 0 && (
          <Badge variant="destructive" className="text-[10px] h-5 px-1.5 shrink-0">
            {countNaoLidas > 99 ? '99+' : countNaoLidas}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={toggleSound}
          title={soundEnabled ? 'Silenciar notificações' : 'Ativar sons de notificação'}
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-4 pb-3">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
        {filter !== 'lidas' && countNaoLidas > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs text-muted-foreground gap-1 px-2"
            onClick={() => marcarTodasComoLidas.mutate()}
            disabled={marcarTodasComoLidas.isPending}
          >
            <CheckCheck className="h-3 w-3" />
            Marcar todas
          </Button>
        )}
      </div>

      <Separator />

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <SkeletonList />
        ) : notificacoes.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div>
            {groups.map((group) => (
              <div key={group.key}>
                <div className="sticky top-0 z-10 px-4 py-1.5 bg-muted/60 backdrop-blur-sm border-b border-border/40">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {group.label}
                  </p>
                </div>
                {group.items.map((notif) => (
                  <NotificationItem key={notif.id} notificacao={notif} />
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notificacoes.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Link to="/notificacoes" onClick={onClose}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground gap-1.5"
              >
                Ver todas as notificações
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// Keep legacy export for backwards compatibility
export { NotificationsPanel as NotificationsList };
