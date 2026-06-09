import { createFileRoute } from '@tanstack/react-router';

import { useState, useMemo, useDeferredValue, startTransition, useEffect } from 'react';
import {
  Search,
  Loader2,
  CheckCircle2,
  Users,
  History,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Card, CardContent } from '@/core/ui/card';
import { Checkbox } from '@/core/ui/checkbox';
import { Label } from '@/core/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/core/ui/tooltip';
import { DataTablePagination } from '@/core/ui/data-table-pagination';
import { useDocumentosVendaCadastro } from '@/modules/documentos-venda/http';
import { VendasPendentesTable } from '@/modules/cadastro/components/vendas-pendentes-table';
import { VendasPerdidasTable } from '@/modules/cadastro/components/vendas-perdidas-table';
import { InclusoesPendentesTable } from '@/modules/cadastro/components/inclusoes-pendentes-table';
import { EndossosPendentesTable } from '@/modules/area-trabalho/components/endossos-pendentes-table';
import { useEndossosPendentes, useCadastroLogs } from '@/modules/area-trabalho/http';
import { usePagination } from '@/core/hooks/use-pagination';
import type { DocumentoVenda } from '@/types/documento-venda';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { usePermissions } from '@/core/hooks/use-permissions';

export const Route = createFileRoute('/_app/cadastro')({
  component: CadastroPage,
});

function normalizar(s?: string | null) {
  return (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function TabCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-foreground/10 px-1.5 py-px text-[10px] font-semibold leading-tight tabular-nums text-foreground/70">
      {count}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-muted-foreground">Erro ao carregar dados.</p>
    </div>
  );
}

function CadastroPage() {
  return (
    <PageGuard>
      <CadastroPageContent />
    </PageGuard>
  );
}

function CadastroPageContent() {
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [sortKey, setSortKey] = useState('data-desc');
  const [mostrarPerdidosConfirmados, setMostrarPerdidosConfirmados] =
    useState(false);
  const [vendedorFiltro, setVendedorFiltro] = useState<string | null>(null);
  const { data: todosDocumentos = [], isLoading, isError } =
    useDocumentosVendaCadastro();

  const vendas = useMemo(
    () => todosDocumentos.filter((v: DocumentoVenda) =>
      v.status === 'AGUARDANDO_CADASTRO' || v.status === 'ATIVO',
    ),
    [todosDocumentos],
  );
  const vendasPerdidas = useMemo(
    () => todosDocumentos.filter((v: DocumentoVenda) => v.status === 'PERDIDO'),
    [todosDocumentos],
  );

  const [logsPage, setLogsPage] = useState(1);
  useEffect(() => { setLogsPage(1); }, [deferredSearchTerm]);
  const { data: endossos = [] } = useEndossosPendentes();
  const { data: logsResult, isLoading: loadingLogs } = useCadastroLogs(logsPage, 20, deferredSearchTerm);
  const logs = logsResult?.data ?? [];
  const logsTotalPages = logsResult?.totalPages ?? 1;
  const logsTotal = logsResult?.total ?? 0;

  const { vendasPendentes, vendasInclusoes, vendasConfirmadas, vendasPerdidasConfirmadas } =
    useMemo(() => {
      const todasPendentes = vendas.filter(
        (v: DocumentoVenda) => v.status === 'AGUARDANDO_CADASTRO',
      );
      const pendentes = todasPendentes.filter((v: DocumentoVenda) => {
        const meta = v.metadata as any;
        return !meta?.inclusoes?.length;
      });
      const inclusoes = todasPendentes.filter((v: DocumentoVenda) => {
        const meta = v.metadata as any;
        return meta?.inclusoes?.length > 0;
      });
      const confirmadas = vendas.filter(
        (v: DocumentoVenda) => v.status === 'ATIVO',
      );
      const perdidasConfirmadas = vendasPerdidas.filter((v: DocumentoVenda) => {
        const metadata = v.metadata as any;
        return metadata?.aguardandoAprovacaoPerda === false;
      });
      return {
        vendasPendentes: pendentes,
        vendasInclusoes: inclusoes,
        vendasConfirmadas: confirmadas,
        vendasPerdidasConfirmadas: perdidasConfirmadas,
      };
    }, [vendas, vendasPerdidas]);

  const sortVendas = useMemo(() => (list: DocumentoVenda[]) => {
    const sorted = [...list];
    switch (sortKey) {
      case 'data-asc':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'data-desc':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'cliente-asc':
        return sorted.sort((a, b) => {
          const nA = a.cliente.tipoPessoa === 'PF' ? a.cliente.nome ?? '' : a.cliente.razaoSocial ?? '';
          const nB = b.cliente.tipoPessoa === 'PF' ? b.cliente.nome ?? '' : b.cliente.razaoSocial ?? '';
          return nA.localeCompare(nB, 'pt-BR');
        });
      case 'cliente-desc':
        return sorted.sort((a, b) => {
          const nA = a.cliente.tipoPessoa === 'PF' ? a.cliente.nome ?? '' : a.cliente.razaoSocial ?? '';
          const nB = b.cliente.tipoPessoa === 'PF' ? b.cliente.nome ?? '' : b.cliente.razaoSocial ?? '';
          return nB.localeCompare(nA, 'pt-BR');
        });
      case 'premio-desc':
        return sorted.sort((a, b) => (b.premioLiquido ?? 0) - (a.premioLiquido ?? 0));
      case 'premio-asc':
        return sorted.sort((a, b) => (a.premioLiquido ?? 0) - (b.premioLiquido ?? 0));
      default:
        return sorted;
    }
  }, [sortKey]);

  const vendasPendentesFiltradas = useMemo(() => {
    const termo = normalizar(deferredSearchTerm);
    const filtradas = !deferredSearchTerm
      ? vendasPendentes
      : vendasPendentes.filter((venda: DocumentoVenda) => {
          const nomeCliente =
            venda.cliente.tipoPessoa === 'PF'
              ? venda.cliente.nome
              : venda.cliente.razaoSocial;
          return (
            normalizar(venda.numero).includes(termo) ||
            normalizar(nomeCliente).includes(termo) ||
            normalizar(venda.produto?.nomeProduto).includes(termo)
          );
        });
    return sortVendas(filtradas);
  }, [vendasPendentes, deferredSearchTerm, sortVendas]);

  const vendasInclusoesFiltradas = useMemo(() => {
    const termo = normalizar(deferredSearchTerm);
    const filtradas = !deferredSearchTerm
      ? vendasInclusoes
      : vendasInclusoes.filter((venda: DocumentoVenda) => {
          const nomeCliente =
            venda.cliente.tipoPessoa === 'PF'
              ? venda.cliente.nome
              : venda.cliente.razaoSocial;
          const meta = venda.metadata as any;
          const ultimaInclusao = meta?.inclusoes?.at(-1);
          return (
            normalizar(venda.numero).includes(termo) ||
            normalizar(nomeCliente).includes(termo) ||
            normalizar(venda.produto?.nomeProduto).includes(termo) ||
            normalizar(ultimaInclusao?.itemDescricao).includes(termo) ||
            normalizar(ultimaInclusao?.observacoes).includes(termo)
          );
        });
    return sortVendas(filtradas);
  }, [vendasInclusoes, deferredSearchTerm, sortVendas]);

  const vendedoresUnicos = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; avatarUrl?: string | null }>();
    const todas = [...vendasConfirmadas, ...vendasPerdidasConfirmadas];
    todas.forEach((v) => {
      if (v.vendedor?.id && !map.has(v.vendedor.id)) {
        map.set(v.vendedor.id, {
          id: v.vendedor.id,
          nome: v.vendedor.nome,
          avatarUrl: v.vendedor.avatarUrl,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [vendasConfirmadas, vendasPerdidasConfirmadas]);

  const vendasConfirmadasFiltradas = useMemo(() => {
    let vendasParaMostrar = mostrarPerdidosConfirmados
      ? vendasPerdidasConfirmadas
      : vendasConfirmadas;
    if (vendedorFiltro) {
      vendasParaMostrar = vendasParaMostrar.filter(
        (v: DocumentoVenda) => v.vendedorId === vendedorFiltro,
      );
    }
    const termo = normalizar(deferredSearchTerm);
    const filtradas = !deferredSearchTerm
      ? vendasParaMostrar
      : vendasParaMostrar.filter((venda: DocumentoVenda) => {
          const nomeCliente =
            venda.cliente.tipoPessoa === 'PF'
              ? venda.cliente.nome
              : venda.cliente.razaoSocial;
          return (
            normalizar(venda.numero).includes(termo) ||
            normalizar(nomeCliente).includes(termo) ||
            normalizar(venda.produto?.nomeProduto).includes(termo) ||
            normalizar(venda.motivoPerda).includes(termo)
          );
        });
    return sortVendas(filtradas);
  }, [
    vendasConfirmadas,
    vendasPerdidasConfirmadas,
    mostrarPerdidosConfirmados,
    vendedorFiltro,
    deferredSearchTerm,
    sortVendas,
  ]);

  const vendasPerdidasFiltradas = useMemo(() => {
    const perdidasPendentes = vendasPerdidas.filter((venda: DocumentoVenda) => {
      const metadata = venda.metadata as any;
      return metadata?.aguardandoAprovacaoPerda !== false;
    });
    const termo = normalizar(deferredSearchTerm);
    const filtradas = !deferredSearchTerm
      ? perdidasPendentes
      : perdidasPendentes.filter((venda: DocumentoVenda) => {
          const nomeCliente =
            venda.cliente.tipoPessoa === 'PF'
              ? venda.cliente.nome
              : venda.cliente.razaoSocial;
          return (
            normalizar(venda.numero).includes(termo) ||
            normalizar(nomeCliente).includes(termo) ||
            normalizar(venda.produto?.nomeProduto).includes(termo) ||
            normalizar(venda.motivoPerda).includes(termo)
          );
        });
    return sortVendas(filtradas);
  }, [vendasPerdidas, deferredSearchTerm, sortVendas]);

  const confirmadasPagination = usePagination({
    data: vendasConfirmadasFiltradas,
    initialPageSize: 20,
  });

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-6 md:p-8">
      {/* Header + Toolbar inline */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Cadastro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vendas aguardando cadastro de apólice e finalização
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, número ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={sortKey} onValueChange={(val) => startTransition(() => setSortKey(val))}>
            <SelectTrigger className="h-9 w-40 shrink-0 sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="data-desc">Mais recente</SelectItem>
              <SelectItem value="data-asc">Mais antigo</SelectItem>
              <SelectItem value="cliente-asc">Cliente A→Z</SelectItem>
              <SelectItem value="cliente-desc">Cliente Z→A</SelectItem>
              <SelectItem value="premio-desc">Maior prêmio</SelectItem>
              <SelectItem value="premio-asc">Menor prêmio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pendentes" className="w-full">
        <div className="overflow-x-auto pb-px">
          <TabsList className="inline-flex h-10 min-w-full">
            <TabsTrigger value="pendentes" className="flex-1 gap-1.5 text-xs sm:text-sm">
              Aguardando
              <TabCount count={vendasPendentesFiltradas.length} />
            </TabsTrigger>
            <TabsTrigger value="inclusoes" className="flex-1 gap-1.5 text-xs sm:text-sm">
              Inclusões
              <TabCount count={vendasInclusoesFiltradas.length} />
            </TabsTrigger>
            <TabsTrigger value="endossos" className="flex-1 gap-1.5 text-xs sm:text-sm">
              Endossos
              <TabCount count={endossos.length} />
            </TabsTrigger>
            <TabsTrigger value="confirmadas" className="flex-1 gap-1.5 text-xs sm:text-sm">
              Confirmadas
              <TabCount count={vendasConfirmadasFiltradas.length} />
            </TabsTrigger>
            <TabsTrigger value="perdidas" className="flex-1 gap-1.5 text-xs sm:text-sm">
              Perdidas
              <TabCount count={vendasPerdidasFiltradas.length} />
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex-1 gap-1.5 text-xs sm:text-sm">
              <History className="size-3.5 shrink-0" />
              Logs
              <TabCount count={logsTotal} />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pendentes" className="mt-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              {isLoading ? (
                <LoadingState />
              ) : isError ? (
                <ErrorState />
              ) : (
                <VendasPendentesTable vendas={vendasPendentesFiltradas} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inclusoes" className="mt-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              {isLoading ? (
                <LoadingState />
              ) : isError ? (
                <ErrorState />
              ) : (
                <InclusoesPendentesTable vendas={vendasInclusoesFiltradas} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endossos" className="mt-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              {isLoading ? (
                <LoadingState />
              ) : (
                <EndossosPendentesTable enabled={hasPermission('cadastro:acessar')} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confirmadas" className="mt-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              {/* Filtros inline */}
              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/50 pb-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="mostrar-perdidos"
                    checked={mostrarPerdidosConfirmados}
                    onCheckedChange={(checked) =>
                      setMostrarPerdidosConfirmados(checked === true)
                    }
                  />
                  <Label
                    htmlFor="mostrar-perdidos"
                    className="cursor-pointer whitespace-nowrap text-sm font-normal"
                  >
                    Perdidos confirmados ({vendasPerdidasConfirmadas.length})
                  </Label>
                </div>
                {vendedoresUnicos.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Vendedor:</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setVendedorFiltro(null)}
                          className={`flex size-7 items-center justify-center rounded-full border-2 transition-all ${
                            vendedorFiltro === null
                              ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                              : 'border-border opacity-60 hover:border-muted-foreground hover:opacity-100'
                          }`}
                        >
                          <Users className="size-3.5 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Todos</TooltipContent>
                    </Tooltip>
                    {vendedoresUnicos.map((v) => {
                      const initials = v.nome
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase();
                      return (
                        <Tooltip key={v.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() =>
                                setVendedorFiltro(vendedorFiltro === v.id ? null : v.id)
                              }
                              className={`rounded-full transition-all ${
                                vendedorFiltro === v.id
                                  ? 'scale-110 ring-2 ring-primary ring-offset-1'
                                  : 'opacity-60 hover:opacity-100'
                              }`}
                            >
                              <Avatar className="size-7">
                                <AvatarImage src={v.avatarUrl ?? undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{v.nome}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
              </div>

              {isLoading ? (
                <LoadingState />
              ) : isError ? (
                <ErrorState />
              ) : vendasConfirmadasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="mb-3 size-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma venda confirmada ainda
                  </p>
                </div>
              ) : (
                <>
                  <VendasPendentesTable vendas={confirmadasPagination.paginatedData} />
                  <DataTablePagination
                    currentPage={confirmadasPagination.currentPage}
                    totalPages={confirmadasPagination.totalPages}
                    pageSize={confirmadasPagination.pageSize}
                    totalItems={vendasConfirmadasFiltradas.length}
                    onPageChange={confirmadasPagination.setCurrentPage}
                    onPageSizeChange={confirmadasPagination.setPageSize}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perdidas" className="mt-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              {isLoading ? (
                <LoadingState />
              ) : isError ? (
                <ErrorState />
              ) : vendasPerdidasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="mb-3 size-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma venda perdida pendente
                  </p>
                </div>
              ) : (
                <VendasPerdidasTable vendas={vendasPerdidasFiltradas} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              {loadingLogs ? (
                <LoadingState />
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <History className="mb-3 size-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhum registro ainda</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {logs.map((evento: any) => {
                      const aprovado = evento.tipoEvento === 'APROVACAO_CADASTRO';
                      const data = evento.createdAt
                        ? new Date(evento.createdAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—';
                      return (
                        <div key={evento.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                          <div
                            className={`mt-0.5 shrink-0 rounded-full p-1.5 ${
                              aprovado ? 'bg-emerald-500/10' : 'bg-red-500/10'
                            }`}
                          >
                            {aprovado ? (
                              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <XCircle className="size-3.5 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium leading-tight">
                                  {evento.clienteNome || '—'}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {evento.produtoNome || '—'}
                                  {evento.documentoNumero && (
                                    <span className="ml-1.5 font-mono">
                                      {evento.documentoNumero}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                                {data}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-medium ${
                                  aprovado
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {aprovado ? 'Confirmado' : 'Recusado'}
                              </span>
                              {evento.usuarioNome && (
                                <span className="text-xs text-muted-foreground">
                                  por {evento.usuarioNome}
                                </span>
                              )}
                            </div>
                            {!aprovado && evento.motivoRejeicao && (
                              <p className="mt-1 text-xs leading-relaxed text-red-600 dark:text-red-400">
                                {evento.motivoRejeicao}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {logsTotalPages > 1 && (
                    <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-4">
                      <p className="text-xs text-muted-foreground">
                        Página {logsPage} de {logsTotalPages}
                      </p>
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={logsPage <= 1}
                          onClick={() => setLogsPage((p) => p - 1)}
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={logsPage >= logsTotalPages}
                          onClick={() => setLogsPage((p) => p + 1)}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
