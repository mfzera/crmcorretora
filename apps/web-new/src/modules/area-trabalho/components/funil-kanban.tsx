import { useCallback } from 'react';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/ui/tooltip';
import { KanbanBoardCore, KanbanConfigDialog, useKanbanConfig, useUpdateKanbanColumn, useUpdateCustomColumn } from '@/core/kanban';
import type { KanbanColumnDef, KanbanDefaultColumn } from '@/core/kanban';
import { handleApiError } from '@/core/utils/handle-api-error';
import { cn } from '@/core/utils';
import { useUpdateCotacaoEtapa } from '../http';
import type { MembroEquipe } from '../http';
import { FunilCard } from './funil-card';
import type { Cotacao, EtapaCotacao } from '@/types/area-trabalho';

const BOARD_TYPE = 'funil-cotacoes';

const FUNIL_DEFAULT_COLUMNS: KanbanDefaultColumn[] = [
  {
    id: 'LEVANTANDO_DADOS',
    title: 'Levantando Dados',
    color: 'bg-slate-500',
    headerBg: 'bg-gradient-to-r from-slate-600 to-slate-500',
  },
  {
    id: 'PROPOSTA_ENVIADA',
    title: 'Proposta Enviada',
    color: 'bg-blue-500',
    headerBg: 'bg-gradient-to-r from-blue-600 to-blue-500',
  },
  {
    id: 'EM_NEGOCIACAO',
    title: 'Em Negociação',
    color: 'bg-amber-500',
    headerBg: 'bg-gradient-to-r from-amber-600 to-amber-500',
  },
  {
    id: 'AGUARDANDO_RETORNO',
    title: 'Aguardando Retorno',
    color: 'bg-violet-500',
    headerBg: 'bg-gradient-to-r from-violet-600 to-violet-500',
  },
  {
    id: 'CONVERTIDA',
    title: 'Convertida',
    color: 'bg-emerald-500',
    headerBg: 'bg-gradient-to-r from-emerald-600 to-emerald-500',
    isTerminal: true,
  },
  {
    id: 'PERDIDA',
    title: 'Perdida',
    color: 'bg-red-500',
    headerBg: 'bg-gradient-to-r from-red-600 to-red-500',
    isTerminal: true,
  },
];

const ETAPA_VALUES = new Set<string>([
  'LEVANTANDO_DADOS',
  'PROPOSTA_ENVIADA',
  'EM_NEGOCIACAO',
  'AGUARDANDO_RETORNO',
]);

interface FunilKanbanProps {
  cotacoes: Cotacao[];
  onVisualizar: (cotacao: Cotacao) => void;
  onEditar: (cotacao: Cotacao) => void;
  onMarcarPerdida: (cotacao: Cotacao) => void;
  onConfirmarVenda: (cotacao: Cotacao) => void;
  vendedores?: MembroEquipe[];
  membrosFiltro?: Set<string>;
  onToggleMembro?: (id: string) => void;
  onClearMembros?: () => void;
  currentUserId?: string;
}

export function FunilKanban({
  cotacoes,
  onVisualizar,
  onEditar,
  onMarcarPerdida,
  onConfirmarVenda,
  vendedores = [],
  membrosFiltro = new Set(),
  onToggleMembro,
  onClearMembros,
  currentUserId,
}: FunilKanbanProps) {
  const { columns, allColumns } = useKanbanConfig(BOARD_TYPE, FUNIL_DEFAULT_COLUMNS);
  const updateEtapa = useUpdateCotacaoEtapa();
  const updateKanbanColumn = useUpdateKanbanColumn(BOARD_TYPE);
  const updateCustomColumn = useUpdateCustomColumn(BOARD_TYPE);

  const getItemId = useCallback((c: Cotacao) => c.id, []);

  const getItemColumnKey = useCallback((c: Cotacao) => {
    return c.etapa ?? 'LEVANTANDO_DADOS';
  }, []);

  const getItemValue = useCallback((c: Cotacao) => {
    return c.premioLiquido ? Number(c.premioLiquido) : 0;
  }, []);

  const handleMove = useCallback(
    (itemId: string, toColumnId: string, rollback: () => void) => {
      if (!ETAPA_VALUES.has(toColumnId)) return;
      updateEtapa.mutate(
        { cotacaoId: itemId, etapa: toColumnId as EtapaCotacao },
        {
          onError: (err) => {
            rollback();
            toast.error(handleApiError(err, 'Erro ao mover cotação'));
          },
        },
      );
    },
    [updateEtapa],
  );

  const handleMoveBlocked = useCallback(
    (item: Cotacao, toColumnId: string) => {
      if (toColumnId === 'CONVERTIDA') {
        onConfirmarVenda(item);
      } else if (toColumnId === 'PERDIDA') {
        onMarcarPerdida(item);
      }
    },
    [onConfirmarVenda, onMarcarPerdida],
  );

  const handleReorderColumns = useCallback(
    (newColumns: KanbanColumnDef[]) => {
      newColumns.forEach((col, idx) => {
        if (col.isCustom) {
          updateCustomColumn.mutate({ id: col.id, data: { ordem: idx } });
        } else {
          updateKanbanColumn.mutate({ columnId: col.id, data: { ordem: idx } });
        }
      });
    },
    [updateKanbanColumn, updateCustomColumn],
  );

  const renderCard = useCallback(
    (cotacao: Cotacao) => (
      <FunilCard
        cotacao={cotacao}
        onVisualizar={onVisualizar}
        onEditar={onEditar}
        onMarcarPerdida={onMarcarPerdida}
      />
    ),
    [onVisualizar, onEditar, onMarcarPerdida],
  );

  return (
    <div className="space-y-2">
      {/* Second toolbar row: vendors + config */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {vendedores.length > 1 && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onClearMembros?.()}
                    className={cn(
                      'size-7 rounded-full flex items-center justify-center border-2 transition-all',
                      membrosFiltro.size === 0
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
                        : 'border-border hover:border-muted-foreground opacity-60 hover:opacity-100',
                    )}
                  >
                    <Users className="size-3.5 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Todos</TooltipContent>
              </Tooltip>
              {vendedores.map((m) => {
                const selecionado = membrosFiltro.has(m.id);
                const initials = m.nome
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase();
                return (
                  <Tooltip key={m.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onToggleMembro?.(m.id)}
                        className={cn(
                          'rounded-full transition-all',
                          selecionado
                            ? 'ring-2 ring-primary ring-offset-1 scale-110'
                            : membrosFiltro.size > 0
                              ? 'opacity-40 hover:opacity-80'
                              : 'opacity-60 hover:opacity-100',
                        )}
                      >
                        <Avatar className="size-7">
                          <AvatarImage src={m.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {m.id === currentUserId ? `${m.nome} (Você)` : m.nome}
                      {selecionado ? ' · selecionado' : ''}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </>
          )}
        </div>
        <KanbanConfigDialog
          boardType={BOARD_TYPE}
          columns={columns}
          allColumns={allColumns}
        />
      </div>

      <KanbanBoardCore
        boardType={BOARD_TYPE}
        items={cotacoes}
        getItemId={getItemId}
        getItemColumnKey={getItemColumnKey}
        getItemValue={getItemValue}
        columns={columns}
        renderCard={renderCard}
        onMove={handleMove}
        onReorderColumns={handleReorderColumns}
        blockedColumnIds={['CONVERTIDA', 'PERDIDA']}
        onMoveBlocked={handleMoveBlocked}
        gridColsClass="xl:grid-cols-6"
        emptyMessages={{
          LEVANTANDO_DADOS: 'Nenhuma cotação levantando dados',
          PROPOSTA_ENVIADA: 'Nenhuma proposta enviada',
          EM_NEGOCIACAO: 'Nenhuma cotação em negociação',
          AGUARDANDO_RETORNO: 'Nenhuma cotação aguardando retorno',
          CONVERTIDA: 'Nenhuma cotação convertida',
          PERDIDA: 'Nenhuma cotação perdida',
        }}
      />
    </div>
  );
}
