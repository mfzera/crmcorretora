import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useMemo } from 'react';
import { KanbanSquare } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { dayjs } from '@/core/utils/date-utils';
import { formatCurrency } from '@/core/utils/format-currency';
import { useSegurosAtivos } from '@/modules/pos-vendas/http';
import { CrossSellingFilters, type CrossSellingFiltersState } from '@/modules/pos-vendas/components/cross-selling-filters';
import { EnviarKanbanDialog } from '@/modules/pos-vendas/components/enviar-kanban-dialog';
import { useProdutos } from '@/modules/produtos/http';
import { useVendedores } from '@/modules/usuarios/http';
import { useSeguradorasParceiras } from '@/modules/seguradoras-parceiras/http';
import { Checkbox } from '@/core/ui/checkbox';
import { Button } from '@/core/ui/button';
import { Skeleton } from '@/core/ui/skeleton';
import { PageGuard } from '@/modules/auth/components/page-guard';
import type { DocumentoVenda } from '@/types/documento-venda';

export const Route = createFileRoute('/_app/pos-vendas/cross-selling')({
  component: CrossSellingPage,
});

const LIMIT = 20;

const EMPTY_FILTERS: CrossSellingFiltersState = {
  search: '',
  produtoId: '',
  seguradoraId: '',
  vendedorId: '',
  vigenciaInicioRange: undefined,
  vigenciaFimRange: undefined,
  dataAprovacaoRange: undefined,
};

function countActiveFilters(f: CrossSellingFiltersState): number {
  let n = 0;
  if (f.search) n++;
  if (f.produtoId) n++;
  if (f.seguradoraId) n++;
  if (f.vendedorId) n++;
  if (f.vigenciaInicioRange?.from) n++;
  if (f.vigenciaFimRange?.from) n++;
  if (f.dataAprovacaoRange?.from) n++;
  return n;
}

function CrossSellingPage() {
  return (
    <PageGuard permission="kanban:acessar">
      <CrossSellingContent />
    </PageGuard>
  );
}

function CrossSellingContent() {
  const [filters, setFilters] = useState<CrossSellingFiltersState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: produtosResponse } = useProdutos({ ativo: true }, 1, 200);
  const produtosList = produtosResponse?.data ?? [];

  const { data: vendedores = [] } = useVendedores();
  const { data: seguradorasResponse } = useSeguradorasParceiras({ status: 'ATIVA', limit: 200 });
  const seguradorasList = seguradorasResponse?.data ?? [];

  const queryFilters = useMemo(() => ({
    search: filters.search || undefined,
    produtoId: filters.produtoId || undefined,
    seguradoraParceiraId: filters.seguradoraId || undefined,
    vendedorId: filters.vendedorId || undefined,
    vigenciaInicioDe: filters.vigenciaInicioRange?.from
      ? dayjs(filters.vigenciaInicioRange.from).format('YYYY-MM-DD')
      : undefined,
    vigenciaInicioAte: filters.vigenciaInicioRange?.to
      ? dayjs(filters.vigenciaInicioRange.to).format('YYYY-MM-DD')
      : filters.vigenciaInicioRange?.from
        ? dayjs(filters.vigenciaInicioRange.from).format('YYYY-MM-DD')
        : undefined,
    vigenciaFimDe: filters.vigenciaFimRange?.from
      ? dayjs(filters.vigenciaFimRange.from).format('YYYY-MM-DD')
      : undefined,
    vigenciaFimAte: filters.vigenciaFimRange?.to
      ? dayjs(filters.vigenciaFimRange.to).format('YYYY-MM-DD')
      : filters.vigenciaFimRange?.from
        ? dayjs(filters.vigenciaFimRange.from).format('YYYY-MM-DD')
        : undefined,
    dataAprovacaoDe: filters.dataAprovacaoRange?.from
      ? dayjs(filters.dataAprovacaoRange.from).format('YYYY-MM-DD')
      : undefined,
    dataAprovacaoAte: filters.dataAprovacaoRange?.to
      ? dayjs(filters.dataAprovacaoRange.to).format('YYYY-MM-DD')
      : filters.dataAprovacaoRange?.from
        ? dayjs(filters.dataAprovacaoRange.from).format('YYYY-MM-DD')
        : undefined,
    page,
    limit: LIMIT,
  }), [filters, page]);

  const { data, isLoading } = useSegurosAtivos(queryFilters);
  const documentos = data?.data ?? [];
  const meta = data?.meta;

  const handleFilterChange = useCallback((next: Partial<CrossSellingFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleClearAll = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const allPageIds = useMemo(() => documentos.map((d) => d.id), [documentos]);

  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected = allPageIds.some((id) => selectedIds.has(id));

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedDocumentos = useMemo(
    () => documentos.filter((d) => selectedIds.has(d.id)),
    [documentos, selectedIds],
  );

  const handleKanbanSuccess = () => {
    setSelectedIds(new Set());
  };

  const produtoOptions = produtosList.map((p) => ({ id: p.id, label: p.nomeProduto }));
  const seguradoraOptions = seguradorasList.map((s) => ({
    id: s.id,
    label: s.nomeFantasia || s.razaoSocial,
  }));
  const vendedorOptions = vendedores.map((v) => ({ id: v.id, label: v.nome }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Cross-Selling</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Seguros ativos disponíveis para oferta de novos produtos</p>
        </div>
        <Button
          disabled={selectedIds.size === 0}
          onClick={() => setDialogOpen(true)}
        >
          <KanbanSquare className="mr-2 h-4 w-4" />
          {selectedIds.size > 0
            ? `Enviar ${selectedIds.size} para o Kanban`
            : 'Enviar para o Kanban'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <CrossSellingFilters
            filters={filters}
            onChangeFilters={handleFilterChange}
            onClearAll={handleClearAll}
            produtos={produtoOptions}
            seguradoras={seguradoraOptions}
            vendedores={vendedorOptions}
            total={meta?.total ?? 0}
            activeFilterCount={countActiveFilters(filters)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    data-state={someSelected && !allSelected ? 'indeterminate' : undefined}
                    onCheckedChange={handleToggleAll}
                    aria-label="Selecionar tudo"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Produto</th>
                <th className="px-4 py-3 text-left font-medium">Seguradora</th>
                <th className="px-4 py-3 text-left font-medium">Vendedor</th>
                <th className="px-4 py-3 text-left font-medium">Atuante</th>
                <th className="px-4 py-3 text-left font-medium">Aprovado por</th>
                <th className="px-4 py-3 text-left font-medium">Dt. aprovação</th>
                <th className="px-4 py-3 text-left font-medium">Vigência</th>
                <th className="px-4 py-3 text-right font-medium">Prêmio</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    </tr>
                  ))
                : documentos.map((doc) => (
                    <DocumentoRow
                      key={doc.id}
                      doc={doc}
                      selected={selectedIds.has(doc.id)}
                      onToggle={() => handleToggleOne(doc.id)}
                    />
                  ))}
              {!isLoading && documentos.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    Nenhum seguro ativo encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <span className="text-xs text-muted-foreground">
              Página {meta.page} de {meta.totalPages} · {meta.total} registros
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasPrev}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      <EnviarKanbanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        documentos={selectedDocumentos}
        onSuccess={handleKanbanSuccess}
      />
    </div>
  );
}

function DocumentoRow({
  doc,
  selected,
  onToggle,
}: {
  doc: DocumentoVenda;
  selected: boolean;
  onToggle: () => void;
}) {
  const nomeCliente = doc.cliente?.nome || doc.cliente?.razaoSocial || '—';
  const vigenciaInicio = doc.vigenciaInicio ? dayjs(doc.vigenciaInicio).format('DD/MM/YYYY') : '—';
  const vigenciaFim = doc.vigenciaFim ? dayjs(doc.vigenciaFim).format('DD/MM/YYYY') : '—';

  return (
    <tr
      className={`border-b transition-colors cursor-pointer ${selected ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
      onClick={onToggle}
    >
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Selecionar ${nomeCliente}`}
        />
      </td>
      <td className="px-4 py-3">
        <p className="font-medium truncate max-w-[180px]">{nomeCliente}</p>
        {doc.numero && (
          <p className="text-xs text-muted-foreground">{doc.numero}</p>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground truncate max-w-[160px]">
        {doc.produto?.nomeProduto ?? '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground truncate max-w-[140px]">
        {doc.seguradoraParceira?.nomeFantasia || doc.seguradoraParceira?.razaoSocial || '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground truncate max-w-[120px]">
        {doc.vendedor?.nome ?? '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground truncate max-w-[120px]">
        {doc.atuante?.nome ?? '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground truncate max-w-[120px]">
        {doc.aprovadoPor?.nome ?? '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {doc.dataAprovacaoCadastro ? dayjs(doc.dataAprovacaoCadastro).format('DD/MM/YYYY') : '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {vigenciaInicio} → {vigenciaFim}
      </td>
      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
        {doc.premioLiquido != null ? formatCurrency(doc.premioLiquido) : '—'}
      </td>
    </tr>
  );
}
