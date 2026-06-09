
import { dayjs } from '@/core/utils/date-utils';
import {
  CheckSquare,
  RefreshCw,
  FileText,
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
  Calendar,
  ExternalLink,
  Video,
} from 'lucide-react';
import { Button } from '@/core/ui/button';
import { cn } from '@/core/utils';
import { CATEGORIAS } from './constants';
import type { CalendarioEvento, EventoTipo } from './types';

interface CalendarioDayDetailProps {
  date: Date;
  eventos: Record<string, CalendarioEvento[]> | undefined;
  activeCategories: EventoTipo[];
  onAddEvento?: () => void;
}

const tipoIcons: Record<EventoTipo, React.ComponentType<{ className?: string }>> = {
  tarefa: CheckSquare,
  renovacao: RefreshCw,
  documento: FileText,
  oportunidade: TrendingUp,
  google: Calendar,
};

function PrioridadeBadge({ prioridade }: { prioridade?: string }) {
  if (!prioridade || prioridade === 'baixa') return null;
  return (
    <span
      className={cn(
        'text-xs px-1.5 py-0.5 rounded font-medium',
        prioridade === 'alta'
          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
      )}
    >
      {prioridade === 'alta' ? 'Alta' : 'Média'}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const labels: Record<string, string> = {
    NAO_TRABALHADO: 'Não trabalhado',
    EM_PROSPECCAO: 'Em prospecção',
    EM_NEGOCIACAO: 'Em negociação',
    AGUARDANDO_CLIENTE: 'Aguardando cliente',
  };
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
      {labels[status] || status}
    </span>
  );
}

function EventoItem({ evento }: { evento: CalendarioEvento }) {
  const cat = CATEGORIAS.find((c) => c.id === evento.tipo);
  const Icon = tipoIcons[evento.tipo];
  const isOverdue =
    evento.tipo === 'tarefa' &&
    !evento.meta.concluida &&
    new Date(evento.data) < new Date(new Date().toISOString().split('T')[0]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
        isOverdue
          ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20'
          : 'border-border/50 hover:bg-muted/30',
        evento.meta.concluida && 'opacity-60',
      )}
    >
      <div
        className={cn(
          'mt-0.5 rounded-md p-1.5',
          cat?.bgClass,
        )}
      >
        <Icon className={cn('size-4', cat?.textClass)} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-sm font-medium truncate',
              evento.meta.concluida && 'line-through',
            )}
          >
            {evento.titulo}
          </p>
          {isOverdue && (
            <AlertCircle className="size-3.5 text-red-500 shrink-0" />
          )}
        </div>
        {evento.meta.clienteNome && (
          <p className="text-xs text-muted-foreground truncate">
            {evento.meta.clienteNome}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <PrioridadeBadge prioridade={evento.meta.prioridade} />
          <StatusBadge status={evento.meta.status} />
          {evento.meta.premioAnterior != null && (
            <span className="text-xs text-muted-foreground">
              {evento.meta.premioAnterior.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
          )}
          {evento.meta.numeroDocumento && (
            <span className="text-xs text-muted-foreground">
              {evento.meta.numeroDocumento}
            </span>
          )}
          {evento.tipo === 'google' && evento.meta.horaInicio && (
            <span className="text-xs text-muted-foreground">
              {new Date(evento.meta.horaInicio as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {evento.meta.horaFim && ` – ${new Date(evento.meta.horaFim as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          )}
          {evento.tipo === 'google' && evento.meta.hangoutLink && (
            <a
              href={evento.meta.hangoutLink as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
            >
              <Video className="size-3" />
              Meet
            </a>
          )}
          {evento.tipo === 'google' && evento.meta.htmlLink && (
            <a
              href={evento.meta.htmlLink as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3" />
              Abrir
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function CalendarioDayDetail({
  date,
  eventos,
  activeCategories,
  onAddEvento,
}: CalendarioDayDetailProps) {
  const dateStr = dayjs(date).format('YYYY-MM-DD');
  const dayEvents = (eventos?.[dateStr] || []).filter((e) =>
    activeCategories.includes(e.tipo),
  );

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">
          {dayjs(date).format('DD [de] MMMM [de] YYYY')}
        </h3>
        {dayEvents.length > 0 && (
          <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {dayEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum evento para este dia
        </p>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((evento) => (
            <EventoItem key={`${evento.tipo}-${evento.id}`} evento={evento} />
          ))}
        </div>
      )}

      {onAddEvento && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 border-dashed text-muted-foreground hover:text-foreground"
          onClick={onAddEvento}
        >
          <Plus className="size-3.5" />
          Adicionar evento
        </Button>
      )}
    </div>
  );
}
