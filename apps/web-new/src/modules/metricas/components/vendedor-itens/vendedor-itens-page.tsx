
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { Tabs, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Badge } from '@/core/ui/badge';
import { Card, CardContent, CardHeader } from '@/core/ui/card';
import { Separator } from '@/core/ui/separator';
import {
  useDocumentosVendaVendedor,
  type FiltrosVendedorItens,
} from '@/modules/documentos-venda/http';
import { DetalhesCotacaoDialog } from '@/modules/negocios-corretora/components/detalhes-cotacao-dialog';
import { VendedorItensHeader } from './vendedor-itens-header';
import { VendedorItensKpis } from './vendedor-itens-kpis';
import { VendedorItensFiltros } from './vendedor-itens-filtros';
import { VendedorItensTabela } from './vendedor-itens-tabela';
import { dayjs } from '@/core/utils/date-utils';
import type { DocumentoVenda } from '@/types/documento-venda';

// ─── Status groups ────────────────────────────────────────────────────────────
const GROUPS = [
  {
    key: 'todos',
    label: 'Todos',
    statuses: [] as string[],
    emptyMessage: 'Nenhum item encontrado para este vendedor.',
  },
  {
    key: 'produzidos',
    label: 'Produzidos',
    statuses: ['ATIVO', 'VENDA_CONFIRMADA'],
    emptyMessage: 'Nenhum negócio produzido no período.',
  },
  {
    key: 'em_andamento',
    label: 'Em Andamento',
    statuses: ['EM_NEGOCIACAO', 'AGUARDANDO_CADASTRO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_CLIENTE'],
    emptyMessage: 'Nenhum item em andamento no momento.',
  },
  {
    key: 'perdidos',
    label: 'Perdidos',
    statuses: ['PERDIDO', 'CANCELADO', 'ARQUIVADO'],
    emptyMessage: 'Nenhum item perdido no período.',
  },
] as const;

type GroupKey = (typeof GROUPS)[number]['key'];

// ─── Vendedor info query ──────────────────────────────────────────────────────
function useVendedorInfo(vendedorId: string) {
  return useQuery({
    queryKey: ['vendedor-info', vendedorId],
    queryFn: async () => {
      try {
        const resp = await api.get<any>(`/users/${vendedorId}`);
        return resp;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Group count query (lightweight — only fetches total) ─────────────────────
function useGroupCount(vendedorId: string, statuses: string[]) {
  return useQuery({
    queryKey: ['vendedor-itens-count', vendedorId, statuses.join(',')],
    queryFn: async () => {
      const resp = await api.get<any>('/sales-documents', {
        params: {
          vendedorId,
          limit: 1,
          page: 1,
          ...(statuses.length > 0 && { status: statuses.join(',') }),
        },
      });
      // api client retorna { data: [...], meta: { total, ... } }
      if (resp && typeof resp === 'object' && 'meta' in resp) {
        return typeof resp.meta?.total === 'number' ? resp.meta.total : 0;
      }
      // fallback: array direto
      return Array.isArray(resp) ? resp.length : 0;
    },
    staleTime: 60_000,
    enabled: !!vendedorId,
  });
}

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function VendedorItensPage({ vendedorId }: { vendedorId: string }) {
  const navigate = useNavigate();
  
  const location = useLocation();
  const pathname = location.pathname;
  const searchParams = new URLSearchParams(location.searchStr ?? '');

  // ── Read state from URL ──
  const groupKey = (searchParams.get('grupo') ?? 'todos') as GroupKey;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const search = searchParams.get('search') ?? '';
  const produtoId = searchParams.get('produto') ?? '';
  const dataInicioStr = searchParams.get('de') ?? '';
  const dataFimStr = searchParams.get('ate') ?? '';

  // Local state for search input (debounced before going into URL)
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounced(searchInput, 300);

  // Sync debounced search → URL
  useEffect(() => {
    if (debouncedSearch === search) return;
    setParam('search', debouncedSearch || null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const dataInicio = dataInicioStr ? new Date(dataInicioStr) : undefined;
  const dataFim = dataFimStr ? new Date(dataFimStr) : undefined;

  // ── URL helpers ──
  const setParam = useCallback(
    (key: string, value: string | null, resetPage = false) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (resetPage) params.delete('page');
      navigate({ to: `${pathname}?${params.toString()}`, replace: true });
    },
    [navigate, pathname, searchParams],
  );

  const handleGroupChange = (key: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (key === 'todos') {
      params.delete('grupo');
    } else {
      params.set('grupo', key);
    }
    params.delete('page');
    navigate({ to: `${pathname}?${params.toString()}`, replace: true });
  };

  const handlePageChange = (p: number) => setParam('page', String(p));
  const handleProdutoChange = (v: string) =>
    setParam('produto', v === 'todos' ? null : v, true);
  const handleDataInicioChange = (d: Date | undefined) =>
    setParam('de', d ? d.toISOString().split('T')[0] : null, true);
  const handleDataFimChange = (d: Date | undefined) =>
    setParam('ate', d ? d.toISOString().split('T')[0] : null, true);

  const handleClear = () => {
    const params = new URLSearchParams();
    if (groupKey !== 'todos') params.set('grupo', groupKey);
    setSearchInput('');
    navigate({ to: `${pathname}?${params.toString()}`, replace: true });
  };

  // ── Active group statuses ──
  const activeGroup = GROUPS.find((g) => g.key === groupKey) ?? GROUPS[0];
  const statusParam =
    activeGroup.statuses.length > 0
      ? activeGroup.statuses.join(',')
      : undefined;

  // ── Main data query ──
  const filters: FiltrosVendedorItens = {
    page,
    search: debouncedSearch || undefined,
    status: statusParam,
    produtoId: produtoId || undefined,
    criadoApos: dataInicioStr || undefined,
    criadoAntes: dataFimStr || undefined,
  };
  const { data, isLoading, isFetching } = useDocumentosVendaVendedor(
    vendedorId,
    filters,
  );

  const items = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  // ── Group counts (parallel lightweight queries) ──
  const countTodos = useGroupCount(vendedorId, []);
  const countProduzidos = useGroupCount(vendedorId, GROUPS[1].statuses as unknown as string[]);
  const countEmAndamento = useGroupCount(vendedorId, GROUPS[2].statuses as unknown as string[]);
  const countPerdidos = useGroupCount(vendedorId, GROUPS[3].statuses as unknown as string[]);

  const groupCounts: Record<GroupKey, number | undefined> = {
    todos: countTodos.data,
    produzidos: countProduzidos.data,
    em_andamento: countEmAndamento.data,
    perdidos: countPerdidos.data,
  };

  // ── Vendedor info ──
  const { data: vendedorInfo } = useVendedorInfo(vendedorId);

  // ── Products from current page for filter dropdown ──
  const produtos = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((d) => {
      if (d.produto?.id) map.set(d.produto.id, d.produto.nomeProduto);
    });
    return Array.from(map.entries())
      .map(([id, nomeProduto]) => ({ id, nomeProduto }))
      .sort((a, b) => a.nomeProduto.localeCompare(b.nomeProduto));
  }, [items]);

  const hasActiveFilters = !!(
    search ||
    produtoId ||
    dataInicioStr ||
    dataFimStr
  );

  // ── Detail dialog ──
  const [selectedItem, setSelectedItem] = useState<DocumentoVenda | null>(null);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <VendedorItensHeader
        vendedorNome={vendedorInfo?.nome ?? ''}
        equipeNome={vendedorInfo?.equipe?.nome ?? null}
        avatarUrl={vendedorInfo?.avatarUrl ?? null}
      />

      <Separator />

      {/* Tabs por grupo de status */}
      <Tabs value={groupKey} onValueChange={handleGroupChange}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/30 p-1 rounded-lg w-full sm:w-auto">
          {GROUPS.map((g) => {
            const count = groupCounts[g.key];
            return (
              <TabsTrigger
                key={g.key}
                value={g.key}
                className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {g.label}
                {count !== undefined && (
                  <Badge
                    variant="secondary"
                    className="h-4 min-w-4 px-1 text-[10px] leading-none"
                  >
                    {count > 999 ? '999+' : count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* KPI Cards */}
      <VendedorItensKpis
        items={items}
        total={total}
        isLoading={isLoading}
      />

      {/* Filtros + Tabela */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <VendedorItensFiltros
            produtos={produtos}
            search={searchInput}
            produtoId={produtoId}
            dataInicio={dataInicio}
            dataFim={dataFim}
            hasActiveFilters={hasActiveFilters}
            onSearchChange={(v) => setSearchInput(v)}
            onProdutoChange={handleProdutoChange}
            onDataInicioChange={handleDataInicioChange}
            onDataFimChange={handleDataFimChange}
            onClear={handleClear}
          />
        </CardHeader>
        <CardContent>
          <VendedorItensTabela
            items={items}
            isLoading={isLoading || isFetching}
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={handlePageChange}
            onItemClick={setSelectedItem}
            emptyMessage={activeGroup.emptyMessage}
          />
        </CardContent>
      </Card>

      {/* Detail dialog */}
      {selectedItem && (
        <DetalhesCotacaoDialog
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
          cotacao={selectedItem as any}
        />
      )}
    </div>
  );
}
