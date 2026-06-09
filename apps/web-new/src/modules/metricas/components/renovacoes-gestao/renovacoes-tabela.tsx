
import { useEffect, useRef } from 'react';
import { Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { cn } from '@/core/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import { Checkbox } from '@/core/ui/checkbox';
import { Badge } from '@/core/ui/badge';
import { DataTablePagination } from '@/core/ui/data-table-pagination';
import { dayjs } from '@/core/utils/date-utils';
import { formatCurrency, getStatusBadgeVariant, getStatusLabel } from '../metricas-utils';
import type { RenovacaoGestao } from '@/modules/renovacoes/http';

function getNomeCliente(r: RenovacaoGestao): string {
  const c = r.cliente ?? r.documentoVendaAnterior?.cliente ?? null;
  if (!c) return 'Sem cliente';
  return c.tipoPessoa === 'PF'
    ? c.nome ?? 'Sem cliente'
    : c.razaoSocial ?? 'Sem cliente';
}

export function RenovacoesTabela({
  items,
  isLoading,
  isFetching,
  selecionados,
  onToggleItem,
  onToggleAll,
  onItemClick,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  items: RenovacaoGestao[];
  isLoading: boolean;
  isFetching?: boolean;
  selecionados: string[];
  onToggleItem: (id: string) => void;
  onToggleAll: () => void;
  onItemClick: (item: RenovacaoGestao) => void;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if ((e.target as HTMLElement).isContentEditable) return;
      if (e.key === 'ArrowLeft' && page > 1) onPageChange(page - 1);
      if (e.key === 'ArrowRight' && page < totalPages) onPageChange(page + 1);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [page, totalPages, onPageChange]);

  const todosNaPaginaSelecionados =
    items.length > 0 && items.every((r) => selecionados.includes(r.id));
  const algunsSelecionados =
    items.some((r) => selecionados.includes(r.id)) && !todosNaPaginaSelecionados;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <RefreshCcw className="size-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Nenhuma renovação encontrada</p>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <div className={cn('rounded-md border overflow-x-auto transition-opacity duration-150', isFetching && !isLoading && 'opacity-60')}>
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-3">
                <Checkbox
                  checked={todosNaPaginaSelecionados}
                  ref={(el) => {
                    if (el) (el as any).indeterminate = algunsSelecionados;
                  }}
                  onCheckedChange={onToggleAll}
                />
              </TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Vendedor</TableHead>
              <TableHead className="hidden lg:table-cell">Produto</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Prêmio</TableHead>
              <TableHead className="text-center w-[120px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((renovacao) => {
              const dias = dayjs(renovacao.dataVencimento).diff(dayjs(), 'day');
              const vencida = dias < 0;
              const urgente = dias >= 0 && dias <= 7;
              const isSelecionado = selecionados.includes(renovacao.id);

              return (
                <TableRow
                  key={renovacao.id}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isSelecionado && 'bg-muted/30',
                  )}
                  onClick={() => onItemClick(renovacao)}
                >
                  <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelecionado}
                      onCheckedChange={() => onToggleItem(renovacao.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm truncate max-w-[180px]">
                      {getNomeCliente(renovacao)}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p className="text-sm text-muted-foreground">
                      {renovacao.vendedor?.nome ?? '-'}
                    </p>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <p className="text-sm text-muted-foreground truncate max-w-[160px]">
                      {renovacao.produtoDescricao ?? renovacao.itemDescricao ?? '-'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          vencida && 'text-red-600 dark:text-red-400',
                          urgente && 'text-amber-600 dark:text-amber-400',
                        )}
                      >
                        {dayjs(renovacao.dataVencimento).format('DD/MM/YYYY')}
                      </span>
                      {(vencida || urgente) && (
                        <AlertTriangle className={cn('size-3.5', vencida ? 'text-red-500' : 'text-amber-500')} />
                      )}
                    </div>
                    <p className={cn(
                      'text-xs',
                      vencida ? 'text-red-500' : urgente ? 'text-amber-500' : 'text-muted-foreground',
                    )}>
                      {vencida ? `Venceu há ${Math.abs(dias)} dias` : `${dias} dias`}
                    </p>
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    <span className="text-sm font-semibold">
                      {renovacao.premioAnterior
                        ? formatCurrency(renovacao.premioAnterior)
                        : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={getStatusBadgeVariant(renovacao.status)}
                      className="text-[11px] whitespace-nowrap"
                    >
                      {getStatusLabel(renovacao.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {selecionados.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2 px-1">
          {selecionados.length} selecionado{selecionados.length > 1 ? 's' : ''}
        </p>
      )}
      <DataTablePagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={[10, 20, 30, 50, 100]}
      />
    </div>
  );
}
