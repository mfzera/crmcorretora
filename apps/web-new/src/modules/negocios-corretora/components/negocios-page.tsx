import { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { Search, Settings, SlidersHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getStatusLabel } from '@/core/utils/status-config';
import { Input } from '@/core/ui/input';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { useNegocios } from '../http';
import { useNegociosFiltros } from '../hooks/use-negocios-filtros';
import { useNegociosKpis } from '../hooks/use-negocios-kpis';
import { NegociosKpiSection } from './negocios-kpi-section';
import { NegociosFilterBar } from './negocios-filter-bar';
import { NegociosFilterSheet } from './negocios-filter-sheet';
import { NegociosFilterChips } from './negocios-filter-chips';
import { NegociosTable } from './negocios-table';
import { NegociosTableSkeleton } from './negocios-table-skeleton';
import { NegociosEmptyState } from './negocios-empty-state';
import { NegocioCardMobile } from './negocio-card-mobile';
import { NegocioCardSkeleton } from './negocio-card-skeleton';
import { NegociosBulkActionBar } from './negocios-bulk-action-bar';
import { DataTablePagination } from '@/core/ui/data-table-pagination';
import type { Cotacao } from '@/types/area-trabalho';

const ConfigComissaoDialog = lazy(() =>
  import('./config-comissao-dialog').then((m) => ({ default: m.ConfigComissaoDialog })),
);
const ConfigComissaoPadraoDialog = lazy(() =>
  import('./config-comissao-padrao-dialog').then((m) => ({ default: m.ConfigComissaoPadraoDialog })),
);
const DetalhesCotacaoDialog = lazy(() =>
  import('./detalhes-cotacao-dialog').then((m) => ({ default: m.DetalhesCotacaoDialog })),
);
const NegocioDetalheSheet = lazy(() =>
  import('./negocio-detalhe-sheet').then((m) => ({ default: m.NegocioDetalheSheet })),
);

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export function NegociosPage() {
  const isMobile = useIsMobile();
  const filtros = useNegociosFiltros();

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [dialogConfigPadraoOpen, setDialogConfigPadraoOpen] = useState(false);
  const [cotacaoSelecionada, setCotacaoSelecionada] = useState<Cotacao | null>(null);
  const [dialogDetalhesOpen, setDialogDetalhesOpen] = useState(false);
  const [dialogConfigOpen, setDialogConfigOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching } = useNegocios(filtros.filtros, filtros.page, filtros.pageSize);

  const rawDocumentos = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 };

  // Client-side produto filter (server doesn't support filtering by product name)
  const documentos = useMemo(() => {
    if (filtros.filtros.produto === 'todos') return rawDocumentos;
    return rawDocumentos.filter((d: any) => d.produto?.nomeProduto === filtros.filtros.produto);
  }, [rawDocumentos, filtros.filtros.produto]);

  const kpis = useNegociosKpis(documentos);

  const produtosUnicos = useMemo(() => {
    const s = new Set<string>();
    rawDocumentos.forEach((d: any) => { if (d.produto?.nomeProduto) s.add(d.produto.nomeProduto); });
    return Array.from(s).sort();
  }, [rawDocumentos]);

  const vendedoresUnicos = useMemo(() => {
    const m = new Map<string, string>();
    rawDocumentos.forEach((d: any) => { if (d.vendedorId && d.vendedor?.nome) m.set(d.vendedorId, d.vendedor.nome); });
    return Array.from(m.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [rawDocumentos]);

  const statusUnicos = useMemo(() => {
    const s = new Set<string>();
    rawDocumentos.forEach((d: any) => { if (d.status) s.add(d.status); });
    return Array.from(s).sort();
  }, [rawDocumentos]);

  function buildFilterChips() {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (filtros.filtros.search) chips.push({ key: 'search', label: `"${filtros.filtros.search}"`, onRemove: () => filtros.setSearchInput('') });
    if (filtros.negocioCorretora !== 'todos') chips.push({ key: 'tipo', label: filtros.negocioCorretora === 'sim' ? 'Neg. Corretora' : 'Outros Negócios', onRemove: () => filtros.setNegocioCorretora('todos') });
    if (filtros.status !== 'todos') chips.push({ key: 'status', label: getStatusLabel(filtros.status), onRemove: () => filtros.setStatus('todos') });
    if (filtros.produto !== 'todos') chips.push({ key: 'produto', label: filtros.produto, onRemove: () => filtros.setProduto('todos') });
    if (filtros.vendedorId !== 'todos') {
      const v = vendedoresUnicos.find((x) => x.id === filtros.vendedorId);
      chips.push({ key: 'vendedor', label: v?.nome ?? 'Vendedor', onRemove: () => filtros.setVendedorId('todos') });
    }
    if (filtros.dataInicio || filtros.dataFim) {
      const label = [filtros.dataInicio, filtros.dataFim].filter(Boolean).join(' – ');
      chips.push({ key: 'periodo', label, onRemove: () => { filtros.setDataInicio(''); filtros.setDataFim(''); } });
    }
    return chips;
  }

  const filterChips = buildFilterChips();

  function handlePageChangeMobile(page: number) {
    filtros.setPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleVerDetalhes(doc: any) {
    setCotacaoSelecionada(doc);
    setDialogDetalhesOpen(true);
  }

  function handleConfigComissao(doc: any) {
    setCotacaoSelecionada(doc);
    setDialogConfigOpen(true);
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleToggleSelectAll() {
    if (selectedIds.size === documentos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documentos.map((d: any) => d.id)));
    }
  }

  const isEmpty = !isLoading && documentos.length === 0;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Negócios Corretora</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Todos os negócios cadastrados com controle de comissão
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setDialogConfigPadraoOpen(true)}
          className="gap-2 hidden sm:flex"
        >
          <Settings className="size-4" />
          Comissão Padrão
        </Button>
      </div>

      {/* KPIs */}
      <NegociosKpiSection kpis={kpis} isLoading={isLoading} />

      {/* Desktop filter bar */}
      <NegociosFilterBar
        filtros={filtros}
        produtosUnicos={produtosUnicos}
        vendedoresUnicos={vendedoresUnicos}
        statusUnicos={statusUnicos}
      />

      {/* Mobile sticky search + filter button */}
      <div className="sm:hidden sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-2 border-b flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              className="pl-8 pr-8 h-9 text-sm"
              placeholder="Buscar cliente ou número..."
              value={filtros.searchInput}
              onChange={(e) => filtros.setSearchInput(e.target.value)}
            />
            {filtros.searchInput && (
              <button
                type="button"
                onClick={() => filtros.setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Limpar busca"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 relative shrink-0"
            onClick={() => setFilterSheetOpen(true)}
          >
            <SlidersHorizontal className="size-3.5" />
            Filtros
            {filtros.activeFilterCount > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1.5 -right-1.5 size-4 p-0 flex items-center justify-center text-[10px] rounded-full"
              >
                {filtros.activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
        {!isLoading && (
          <p className="text-[11px] text-muted-foreground px-0.5">
            {meta.total} negócio{meta.total !== 1 ? 's' : ''} encontrado{meta.total !== 1 ? 's' : ''}
            {filtros.temFiltrosAtivos && (
              <button
                onClick={filtros.resetFiltros}
                className="ml-2 text-primary hover:underline"
              >
                limpar filtros
              </button>
            )}
          </p>
        )}
      </div>

      {/* Active filter chips */}
      {filterChips.length > 0 && (
        <NegociosFilterChips chips={filterChips} onClearAll={filtros.resetFiltros} />
      )}

      {/* Table card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Listagem de Negócios</CardTitle>
          <CardDescription>
            {isLoading ? 'Carregando...' : `${meta.total} negócio${meta.total !== 1 ? 's' : ''} no total`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:px-6 sm:pb-4">
          {/* Mobile card list */}
          <div className="sm:hidden px-4 pb-4">
            {isLoading ? (
              <NegocioCardSkeleton count={5} />
            ) : isEmpty ? (
              <NegociosEmptyState
                variant={filtros.temFiltrosAtivos ? 'no-results' : 'no-data'}
                onClearFilters={filtros.temFiltrosAtivos ? filtros.resetFiltros : undefined}
              />
            ) : (
              <div className={isFetching ? 'opacity-60 pointer-events-none' : undefined}>
                <div className="space-y-2">
                  {documentos.map((doc: any) => (
                    <NegocioCardMobile
                      key={doc.id}
                      documento={doc}
                      onVerDetalhes={handleVerDetalhes}
                      onConfigComissao={handleConfigComissao}
                    />
                  ))}
                </div>
                {meta.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Página {filtros.page} de {meta.totalPages}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                        disabled={filtros.page <= 1}
                        onClick={() => handlePageChangeMobile(filtros.page - 1)}
                      >
                        <ChevronLeft className="size-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                        disabled={filtros.page >= meta.totalPages}
                        onClick={() => handlePageChangeMobile(filtros.page + 1)}
                      >
                        Próxima
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            {isLoading ? (
              <NegociosTableSkeleton rows={filtros.pageSize} />
            ) : isEmpty ? (
              <NegociosEmptyState
                variant={filtros.temFiltrosAtivos ? 'no-results' : 'no-data'}
                onClearFilters={filtros.temFiltrosAtivos ? filtros.resetFiltros : undefined}
              />
            ) : (
              <>
                <NegociosTable
                  documentos={documentos}
                  sortBy={filtros.sortBy}
                  sortDir={filtros.sortDir}
                  onToggleSort={filtros.toggleSort}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                  onVerDetalhes={handleVerDetalhes}
                  onConfigComissao={handleConfigComissao}
                />
                <DataTablePagination
                  currentPage={filtros.page}
                  totalPages={meta.totalPages}
                  pageSize={filtros.pageSize}
                  totalItems={meta.total}
                  onPageChange={filtros.setPage}
                  onPageSizeChange={filtros.setPageSize}
                  pageSizeOptions={[10, 20, 50]}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar (desktop only) */}
      <NegociosBulkActionBar
        selectedIds={selectedIds}
        documentos={documentos}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* FAB for mobile config padrão */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg size-12 sm:hidden"
        onClick={() => setDialogConfigPadraoOpen(true)}
        title="Configurar comissão padrão"
      >
        <Settings className="size-5" />
      </Button>

      {/* Modals / Sheets */}
      <NegociosFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filtros={filtros}
        produtosUnicos={produtosUnicos}
        vendedoresUnicos={vendedoresUnicos}
        statusUnicos={statusUnicos}
      />

      <Suspense fallback={null}>
        <ConfigComissaoPadraoDialog
          open={dialogConfigPadraoOpen}
          onOpenChange={setDialogConfigPadraoOpen}
        />
      </Suspense>

      {cotacaoSelecionada && (
        <Suspense fallback={null}>
          {isMobile ? (
            <NegocioDetalheSheet
              open={dialogDetalhesOpen}
              onOpenChange={setDialogDetalhesOpen}
              cotacao={cotacaoSelecionada}
              onConfigComissao={() => setDialogConfigOpen(true)}
            />
          ) : (
            <DetalhesCotacaoDialog
              open={dialogDetalhesOpen}
              onOpenChange={setDialogDetalhesOpen}
              cotacao={cotacaoSelecionada}
            />
          )}
          <ConfigComissaoDialog
            open={dialogConfigOpen}
            onOpenChange={setDialogConfigOpen}
            cotacao={cotacaoSelecionada}
          />
        </Suspense>
      )}
    </div>
  );
}
