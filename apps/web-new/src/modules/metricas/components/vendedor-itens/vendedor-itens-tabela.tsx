
import { Eye, ChevronLeft, ChevronRight, FileX } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Skeleton } from '@/core/ui/skeleton';
import { Card, CardContent } from '@/core/ui/card';
import { formatCurrency, getStatusBadgeVariant } from '../metricas-utils';
import { dayjs } from '@/core/utils/date-utils';
import type { DocumentoVenda } from '@/types/documento-venda';
import { getStatusLabel } from '@/core/utils/status-config';

function getStatusBadge(status: string) {
  const variant = getStatusBadgeVariant(status);
  return <Badge variant={variant}>{getStatusLabel(status)}</Badge>;
}

interface VendedorItensTabelaProps {
  items: DocumentoVenda[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onItemClick: (item: DocumentoVenda) => void;
  emptyMessage?: string;
}

export function VendedorItensTabela({
  items,
  isLoading,
  page,
  totalPages,
  total,
  onPageChange,
  onItemClick,
  emptyMessage = 'Nenhum item encontrado.',
}: VendedorItensTabelaProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <FileX className="size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const nomeCliente = (item: DocumentoVenda) =>
    item.cliente.tipoPessoa === 'PF'
      ? item.cliente.nome
      : item.cliente.razaoSocial;

  const numeroDisplay = (item: DocumentoVenda) =>
    item.numeroApoliceExterna ?? item.numero;

  return (
    <div className="flex flex-col gap-3">
      {/* Desktop table */}
      <div className="hidden sm:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold">Número / Apólice</TableHead>
              <TableHead className="font-semibold">Cliente</TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">Produto</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">Vigência</TableHead>
              <TableHead className="font-semibold text-right">Prêmio Líquido</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => onItemClick(item)}
              >
                <TableCell className="font-mono text-sm">
                  <div>{item.numero}</div>
                  {item.numeroApoliceExterna && (
                    <div className="text-xs text-muted-foreground">
                      {item.numeroApoliceExterna}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{nomeCliente(item)}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.cliente.tipoPessoa === 'PF'
                      ? 'Pessoa Física'
                      : 'Pessoa Jurídica'}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div>{item.produto.nomeProduto}</div>
                  {item.produto.tipoSeguro && (
                    <div className="text-xs text-muted-foreground">
                      {item.produto.tipoSeguro}
                    </div>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {item.vigenciaInicio && item.vigenciaFim ? (
                    <>
                      <div>{dayjs(item.vigenciaInicio).format('DD/MM/YYYY')}</div>
                      <div className="text-xs">
                        até {dayjs(item.vigenciaFim).format('DD/MM/YYYY')}
                      </div>
                    </>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {item.premioLiquido != null
                    ? formatCurrency(item.premioLiquido)
                    : '—'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(item);
                    }}
                  >
                    <Eye className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 sm:hidden">
        {items.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => onItemClick(item)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">
                    {numeroDisplay(item)}
                  </p>
                  <p className="font-medium text-sm truncate">{nomeCliente(item)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.produto.nomeProduto}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {getStatusBadge(item.status)}
                  <p className="text-sm font-semibold tabular-nums">
                    {item.premioLiquido != null
                      ? formatCurrency(item.premioLiquido)
                      : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString('pt-BR')} itens no total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
