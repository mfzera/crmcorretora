
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/core/ui/sheet';
import { useHistoricoOportunidade } from '../http';
import { dayjs } from '@/core/utils/date-utils';
import { Loader2, Plus, ArrowRight, Trophy, XCircle, Info } from 'lucide-react';
import type { Oportunidade, OportunidadeHistorico } from '@/types/kanban';
import { cn } from '@/core/utils';

interface HistoricoOportunidadeSheetProps {
  oportunidade: Oportunidade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  contato_inicial: 'Contato Inicial',
  negociacao: 'Negociação',
  ganha: 'Ganha',
  perdida: 'Perdida',
  arquivada: 'Arquivada',
};

function getTipoConfig(evento: OportunidadeHistorico) {
  switch (evento.tipo) {
    case 'criacao':
      return {
        icon: Plus,
        iconClass: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
        label: 'Oportunidade criada',
        detail: evento.statusNovo ? `Status inicial: ${STATUS_LABELS[evento.statusNovo] ?? evento.statusNovo}` : null,
      };
    case 'mudanca_status':
      return {
        icon: ArrowRight,
        iconClass: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
        label: 'Mudança de coluna',
        detail:
          evento.statusAnterior && evento.statusNovo
            ? `${STATUS_LABELS[evento.statusAnterior] ?? evento.statusAnterior} → ${STATUS_LABELS[evento.statusNovo] ?? evento.statusNovo}`
            : null,
      };
    case 'fechamento':
      return {
        icon: Trophy,
        iconClass: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
        label: 'Marcada como ganha',
        detail: evento.statusAnterior
          ? `Era: ${STATUS_LABELS[evento.statusAnterior] ?? evento.statusAnterior}`
          : null,
      };
    case 'perda':
      return {
        icon: XCircle,
        iconClass: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
        label: 'Marcada como perdida',
        detail: evento.descricao ? `Motivo: ${evento.descricao}` : null,
      };
    default:
      return {
        icon: Info,
        iconClass: 'bg-muted text-muted-foreground',
        label: evento.tipo,
        detail: null,
      };
  }
}

export function HistoricoOportunidadeSheet({
  oportunidade,
  open,
  onOpenChange,
}: HistoricoOportunidadeSheetProps) {
  const { data: historico = [], isLoading } = useHistoricoOportunidade(
    open ? oportunidade?.id ?? null : null,
  );

  if (!oportunidade) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="px-6 w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Histórico</SheetTitle>
          <SheetDescription className="truncate">
            {oportunidade.nomeCliente}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum evento registrado ainda.
            </p>
          ) : (
            <ol className="relative border-l border-border ml-3">
              {historico.map((evento, index) => {
                const config = getTipoConfig(evento);
                const Icon = config.icon;
                return (
                  <li key={evento.id} className={cn('mb-6 ml-6', index === historico.length - 1 && 'mb-0')}>
                    <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background">
                      <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', config.iconClass)}>
                        <Icon className="h-3 w-3" />
                      </span>
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium leading-tight">
                        {config.label}
                      </p>
                      {config.detail && (
                        <p className="text-xs text-muted-foreground">
                          {config.detail}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        {evento.usuario && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {evento.usuario.nome}
                          </span>
                        )}
                        {evento.usuario && (
                          <span className="text-muted-foreground/40 text-xs">·</span>
                        )}
                        <time className="text-xs text-muted-foreground">
                          {dayjs(evento.createdAt).format('DD/MM/YYYY [às] HH:mm')}
                        </time>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
