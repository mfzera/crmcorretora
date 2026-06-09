import { useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Settings } from 'lucide-react';
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
import { Checkbox } from '@/core/ui/checkbox';
import { Calendar } from 'lucide-react';
import { dayjs } from '@/core/utils/date-utils';
import { formatCurrencyBR } from '@/core/utils/format-currency';
import { getStatusLabel, getStatusBadgeVariant } from '@/core/utils/status-config';
import { useVirtualizer } from '@tanstack/react-virtual';

interface SortableHeadProps {
  column: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onToggle: (col: string) => void;
  children: React.ReactNode;
  className?: string;
}

function SortableHead({ column, sortBy, sortDir, onToggle, children, className }: SortableHeadProps) {
  const active = sortBy === column;
  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 font-medium text-xs"
        onClick={() => onToggle(column)}
      >
        {children}
        {active ? (
          sortDir === 'asc'
            ? <ArrowUp className="size-3" />
            : <ArrowDown className="size-3" />
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </Button>
    </TableHead>
  );
}

interface NegociosTableProps {
  documentos: any[];
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onToggleSort: (col: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onVerDetalhes: (doc: any) => void;
  onConfigComissao: (doc: any) => void;
}

export function NegociosTable({
  documentos,
  sortBy,
  sortDir,
  onToggleSort,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onVerDetalhes,
  onConfigComissao,
}: NegociosTableProps) {
  const allSelected = documentos.length > 0 && selectedIds.size === documentos.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < documentos.length;

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: documentos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  });

  // Scroll to top when data changes (page navigation)
  useEffect(() => {
    parentRef.current?.scrollTo({ top: 0 });
  }, [documentos]);

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0
    ? totalSize - (virtualItems[virtualItems.length - 1].end)
    : 0;

  return (
    <div
      ref={parentRef}
      className="rounded-md border overflow-auto"
      style={{ maxHeight: 'calc(100vh - 380px)', minHeight: '200px' }}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                onCheckedChange={onToggleSelectAll}
                aria-label="Selecionar todos"
              />
            </TableHead>
            <SortableHead column="numeroDocumento" sortBy={sortBy} sortDir={sortDir} onToggle={onToggleSort}>
              Número/Apólice
            </SortableHead>
            <SortableHead column="cliente" sortBy={sortBy} sortDir={sortDir} onToggle={onToggleSort}>
              Cliente
            </SortableHead>
            <TableHead className="hidden lg:table-cell">Produto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Neg. Corretora</TableHead>
            <SortableHead column="dataAprovacaoCadastro" sortBy={sortBy} sortDir={sortDir} onToggle={onToggleSort} className="hidden md:table-cell">
              Data Aprovação
            </SortableHead>
            <TableHead className="hidden md:table-cell">Vendedor</TableHead>
            <SortableHead column="premioLiquido" sortBy={sortBy} sortDir={sortDir} onToggle={onToggleSort}>
              Prêmio Líquido
            </SortableHead>
            <TableHead className="text-center w-20">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paddingTop > 0 && (
            <TableRow>
              <TableCell colSpan={10} style={{ height: paddingTop, padding: 0 }} />
            </TableRow>
          )}
          {virtualItems.map((virtualRow) => {
            const documento = documentos[virtualRow.index];
            const nomeCliente =
              documento.cliente?.tipoPessoa === 'PF'
                ? documento.cliente?.nome
                : documento.cliente?.razaoSocial;

            const dataAprovacao = documento.dataAprovacaoCadastro
              ? dayjs(documento.dataAprovacaoCadastro)
              : documento.createdAt
                ? dayjs(documento.createdAt)
                : null;

            const selected = selectedIds.has(documento.id);

            return (
              <TableRow
                key={documento.id}
                data-index={virtualRow.index}
                data-state={selected ? 'selected' : undefined}
                className="cursor-pointer"
                onClick={() => onVerDetalhes(documento)}
              >
                <TableCell onClick={(e) => { e.stopPropagation(); onToggleSelect(documento.id); }}>
                  <Checkbox
                    checked={selected}
                    aria-label={`Selecionar ${nomeCliente}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div>
                    <p>{documento.numeroDocumento || documento.numeroApoliceExterna || '—'}</p>
                    {documento.numeroDocumento && documento.numeroApoliceExterna && (
                      <p className="text-xs text-muted-foreground">Ext: {documento.numeroApoliceExterna}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{nomeCliente || 'Sem cliente'}</p>
                    <p className="text-xs text-muted-foreground">
                      {documento.cliente?.tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div>
                    <p className="font-medium">{documento.produto?.nomeProduto || '—'}</p>
                    <p className="text-xs text-muted-foreground">{documento.produto?.tipoSeguro || '—'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(documento.status)}>
                    {getStatusLabel(documento.status)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant={documento.negocioCorretora ? 'default' : 'secondary'}>
                    {documento.negocioCorretora ? 'Sim' : 'Não'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {dataAprovacao ? (
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3 text-muted-foreground" />
                      <span className="text-sm">{dataAprovacao.format('DD/MM/YYYY')}</span>
                    </div>
                  ) : '—'}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {documento.vendedor?.nome || 'Não atribuído'}
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">
                    {documento.premioLiquido ? formatCurrencyBR(parseFloat(documento.premioLiquido)) : '—'}
                  </span>
                </TableCell>
                <TableCell
                  className="text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => onConfigComissao(documento)}
                    title="Configurar comissão"
                  >
                    <Settings className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {paddingBottom > 0 && (
            <TableRow>
              <TableCell colSpan={10} style={{ height: paddingBottom, padding: 0 }} />
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
