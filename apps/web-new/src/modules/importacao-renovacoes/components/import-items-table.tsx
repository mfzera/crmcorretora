
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Checkbox } from '@/core/ui/checkbox';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Skeleton } from '@/core/ui/skeleton';
import { ChevronDown, ChevronRight, RotateCcw, RefreshCw, ExternalLink, Search, X } from 'lucide-react';
import { ItemStatusBadge, ItemStatusIcon } from './import-status-badge';
import type { ImportacaoItem } from '../http';

interface ImportItemsTableProps {
  itens: ImportacaoItem[];
  total: number;
  page: number;
  totalPages: number;
  isLoading?: boolean;
  statusFilter: string;
  busca: string;
  selectedIds: string[];
  onStatusFilterChange: (status: string) => void;
  onBuscaChange: (busca: string) => void;
  onPageChange: (page: number) => void;
  onSelectionChange: (ids: string[]) => void;
  totalSucesso: number;
  totalErros: number;
  totalPendentes: number;
  totalPulados: number;
  totalRevertidos: number;
}

export function ImportItemsTable({
  itens,
  total,
  page,
  totalPages,
  isLoading,
  statusFilter,
  busca,
  selectedIds,
  onStatusFilterChange,
  onBuscaChange,
  onPageChange,
  onSelectionChange,
  totalSucesso,
  totalErros,
  totalPendentes,
  totalPulados,
  totalRevertidos,
}: ImportItemsTableProps) {
  
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const successItems = itens.filter((i) => i.status === 'SUCESSO');
  const allSuccessSelected =
    successItems.length > 0 &&
    successItems.every((i) => selectedIds.includes(i.id));

  const toggleSelectAllSuccess = () => {
    if (allSuccessSelected) {
      onSelectionChange(selectedIds.filter((id) => !successItems.find((i) => i.id === id)));
    } else {
      const newIds = new Set([...selectedIds, ...successItems.map((i) => i.id)]);
      onSelectionChange([...newIds]);
    }
  };

  const toggleSelectItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const tabs = [
    { value: '', label: 'Todos', count: total },
    { value: 'SUCESSO', label: 'Sucesso', count: totalSucesso },
    { value: 'ERRO', label: 'Erros', count: totalErros },
    { value: 'PENDENTE', label: 'Pendentes', count: totalPendentes },
    { value: 'PULADO', label: 'Pulados', count: totalPulados },
    ...(totalRevertidos > 0 ? [{ value: 'REVERTIDO', label: 'Revertidos', count: totalRevertidos }] : []),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={statusFilter} onValueChange={onStatusFilterChange}>
          <TabsList className="flex-wrap h-auto gap-1">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                {tab.label}
                <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums min-w-[20px]">
                  {tab.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por cliente..."
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {busca && (
            <button
              onClick={() => onBuscaChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Select all success (for rollback) */}
      {(statusFilter === '' || statusFilter === 'SUCESSO') && successItems.length > 0 && (
        <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          <Checkbox
            checked={allSuccessSelected}
            onCheckedChange={toggleSelectAllSuccess}
            id="select-all-success"
          />
          <label htmlFor="select-all-success" className="cursor-pointer">
            Selecionar todos os itens com sucesso para rollback
          </label>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground border rounded-lg">
          Nenhum item encontrado neste filtro
        </div>
      ) : (
        <div className="space-y-1.5">
          {itens.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            const isSelected = selectedIds.includes(item.id);
            const canSelect = item.status === 'SUCESSO';
            const hasDetails = !!item.erroDetalhes || (item.dadosLinha && Object.keys(item.dadosLinha).length > 0);

            const isPulado = item.status === 'PULADO';
            const pulaoHref = isPulado && (item.renovacaoId || item.documentoVendaId)
              ? item.renovacaoId
                ? '/workspace2'
                : `/clients${item.documentoCliente ? `?search=${item.documentoCliente}` : ''}`
              : null;
            const canExpandPulado = isPulado && (pulaoHref || (item.dadosLinha && Object.keys(item.dadosLinha).length > 0));

            return (
              <div
                key={item.id}
                className={`border rounded-lg overflow-hidden transition-colors ${
                  item.status === 'SUCESSO'
                    ? 'border-green-200 dark:border-green-900'
                    : item.status === 'ERRO'
                      ? 'border-red-200 dark:border-red-900'
                      : item.status === 'PENDENTE'
                        ? 'border-blue-200 dark:border-blue-900'
                        : item.status === 'REVERTIDO'
                          ? 'border-gray-200 dark:border-gray-700'
                          : 'border-yellow-200 dark:border-yellow-900'
                } ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              >
                <div className="flex items-start gap-3 p-3">
                  {canSelect && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectItem(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5"
                    />
                  )}
                  {!canSelect && <div className="w-4" />}

                  <ItemStatusIcon status={item.status} className="mt-0.5" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <Badge variant="outline" className="text-xs">
                        Linha {item.linhaNumero}
                      </Badge>
                      <ItemStatusBadge status={item.status} />
                      {item.nomeCliente && (
                        <span className="text-sm font-medium truncate">
                          {item.nomeCliente}
                        </span>
                      )}
                      {item.documentoCliente && (
                        <span className="text-xs text-muted-foreground">
                          {item.documentoCliente}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{item.mensagem}</p>
                    {item.produto && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Produto: {item.produto}
                      </p>
                    )}
                  </div>

                  {(hasDetails || canExpandPulado) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {isExpanded && isPulado && (
                  <div className="border-t px-3 py-2.5 bg-yellow-50/50 dark:bg-yellow-950/10 space-y-2">
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                      Registro ignorado — já existe uma renovação ou apólice ativa para este cliente/produto/vigência.
                    </p>
                    {pulaoHref && (
                      <a
                        href={pulaoHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-400 underline underline-offset-2 hover:text-yellow-900 dark:hover:text-yellow-200"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {item.renovacaoId ? 'Ver na área de trabalho' : 'Ver cliente'}
                      </a>
                    )}
                    {item.dadosLinha && Object.keys(item.dadosLinha).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Dados da linha:</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                          {Object.entries(item.dadosLinha).map(([key, value]) => (
                            value !== null && value !== undefined && String(value).trim() !== '' && (
                              <div key={key} className="flex gap-1 text-xs min-w-0">
                                <span className="text-muted-foreground shrink-0">{key}:</span>
                                <span className="font-medium truncate">{String(value)}</span>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isExpanded && item.erroDetalhes && (
                  <div className="border-t px-3 py-2 bg-muted/50">
                    <p className="text-xs font-medium mb-1 text-muted-foreground">
                      Detalhes técnicos:
                    </p>
                    <pre className="text-xs text-destructive whitespace-pre-wrap break-all font-mono">
                      {item.erroDetalhes}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} · {total} itens
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
