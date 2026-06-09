
import { useState, useMemo, useTransition, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Eye, Edit, Flag, Users, MessageSquare, Building2, ChevronUp, ChevronDown, ChevronsUpDown, Search, X, RefreshCw, UserCheck, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/core/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/core/ui/context-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { DataTablePagination } from '@/core/ui/data-table-pagination';
import { usePagination } from '@/core/hooks/use-pagination';
import { useComentariosCotacao, useAdicionarComentarioCotacao, areaTrabalhoKeys } from '../http';
import { api } from '@/infra/http/api';
import { ComentariosPanel } from './comentarios-panel';
import type { Cotacao } from '@/types/area-trabalho';

interface CotacoesAtivasTableProps {
  cotacoes: Cotacao[];
  onVisualizar: (cotacao: Cotacao) => void;
  onEditar: (cotacao: Cotacao) => void;
  onRecusar: (cotacao: Cotacao) => void;
  membros?: { id: string; nome: string }[];
  currentUserId?: string;
  isAdmin?: boolean;
}

function QuickCommentDialog({ cotacaoId, nomeCliente, onClose }: { cotacaoId: string; nomeCliente: string; onClose: () => void }) {
  const [texto, setTexto] = useState('');
  const { mutate, isPending } = useAdicionarComentarioCotacao();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = () => {
    if (!texto.trim() || isPending) return;
    mutate({ cotacaoId, texto: texto.trim() }, { onSuccess: onClose });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-4">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="size-4" />
            Comentar — {nomeCliente}
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Digite um comentário e pressione Enter..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
              if (e.key === 'Escape') { e.preventDefault(); onClose(); }
            }}
            maxLength={2000}
            disabled={isPending}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!texto.trim() || isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ComentariosCell({ cotacaoId, initialCount = 0, onQuickComment }: { cotacaoId: string; initialCount?: number; onQuickComment?: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: comentarios = [], isLoading } = useComentariosCotacao(open ? cotacaoId : null);
  const { mutate: adicionarComentario, isPending: enviandoComentario } = useAdicionarComentarioCotacao();

  const loadedTotal = comentarios.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);
  const displayCount = open ? loadedTotal : initialCount;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuickComment?.();
          }}
        >
          <MessageSquare className="size-4" />
          {displayCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5 font-medium">
              {displayCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-4" align="end">
        <ComentariosPanel
          comentarios={comentarios}
          isLoading={isLoading}
          canAdd={true}
          onAdd={(texto, parentId) => adicionarComentario({ cotacaoId, texto, parentId })}
          isSending={enviandoComentario}
        />
      </PopoverContent>
    </Popover>
  );
}

const getStatusBadge = (status: string) => {
  const variants: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    EM_ELABORACAO: 'secondary',
    PERDIDA: 'destructive',
    EXPIRADA: 'destructive',
    CONVERTIDA: 'default',
  };

  const labels: Record<string, string> = {
    EM_ELABORACAO: 'Em Elaboração',
    PERDIDA: 'Perdida',
    EXPIRADA: 'Expirada',
    CONVERTIDA: 'Convertida',
  };

  return (
    <Badge variant={variants[status] || 'default'} className="text-xs px-2 py-0.5">
      {labels[status] || status}
    </Badge>
  );
};

type SortKey = 'vigencia' | 'cliente' | 'premio' | 'comissao' | null;
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="size-3 opacity-40" />;
  return sortDir === 'asc'
    ? <ChevronUp className="size-3" />
    : <ChevronDown className="size-3" />;
}

function SortableHead({ children, col, sortKey, sortDir, onSort, className }: {
  children: React.ReactNode;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
  className?: string;
}) {
  return (
    <TableHead
      className={`py-2 px-3 text-xs cursor-pointer select-none hover:text-foreground transition-colors ${className ?? ''}`}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </div>
    </TableHead>
  );
}

function getNomeCliente(cotacao: Cotacao): string {
  return (cotacao.cliente?.tipoPessoa === 'PF'
    ? cotacao.cliente?.nome
    : cotacao.cliente?.nomeFantasia || cotacao.cliente?.razaoSocial) ?? '';
}

export function CotacoesAtivasTable({
  cotacoes,
  onVisualizar,
  onEditar,
  onRecusar,
  membros,
  currentUserId,
  isAdmin,
}: CotacoesAtivasTableProps) {
  const [, startTransition] = useTransition();
  const buscaRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [quickCommentTarget, setQuickCommentTarget] = useState<{ id: string; nome: string } | null>(null);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefetchCotacao = useCallback((id: string) => {
    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: [...areaTrabalhoKeys.cotacoes(), id],
        queryFn: () => api.get(`/quotes/${id}`),
        staleTime: 30_000,
      });
    }, 150);
  }, [queryClient]);
  const [membroFiltro, setMembroFiltro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroProduto, setFiltroProduto] = useState<string>('todos');
  const [filtroNegCorretora, setFiltroNegCorretora] = useState<string>('todos');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todos');
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [apenasMinhas, setApenasMinhas] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('cotacoes:apenasMinhas') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('cotacoes:apenasMinhas', String(apenasMinhas));
  }, [apenasMinhas]);

  // Produtos únicos para o select
  const produtosUnicos = useMemo(() => {
    const set = new Map<string, string>();
    cotacoes.forEach((c) => {
      if (c.produto?.id && c.produto?.nomeProduto) {
        set.set(c.produto.id, c.produto.nomeProduto);
      }
    });
    return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
  }, [cotacoes]);

  const handleSort = (col: SortKey) => {
    startTransition(() => {
      if (sortKey === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(col);
        setSortDir('asc');
      }
    });
  };

  const temFiltroAtivo = busca || filtroStatus !== 'todos' || filtroProduto !== 'todos' || filtroNegCorretora !== 'todos' || filtroOrigem !== 'todos';

  const limparFiltros = () => {
    if (buscaRef.current) buscaRef.current.value = '';
    startTransition(() => {
      setBusca('');
      setFiltroStatus('todos');
      setFiltroProduto('todos');
      setFiltroNegCorretora('todos');
      setFiltroOrigem('todos');
    });
  };

  const cotacoesFiltradas = useMemo(() => {
    let lista = cotacoes;

    if (isAdmin && apenasMinhas && currentUserId) {
      lista = lista.filter((c: any) => c.vendedorId === currentUserId || c.atuanteId === currentUserId);
    }

    if (membroFiltro) {
      lista = lista.filter((c: any) => c.vendedorId === membroFiltro || c.atuanteId === membroFiltro);
    }

    if (busca) {
      const q = busca.toLowerCase();
      lista = lista.filter((c) => getNomeCliente(c).toLowerCase().includes(q));
    }

    if (filtroStatus !== 'todos') {
      lista = lista.filter((c) => c.status === filtroStatus);
    }

    if (filtroProduto !== 'todos') {
      lista = lista.filter((c) => c.produto?.id === filtroProduto);
    }

    if (filtroNegCorretora === 'sim') {
      lista = lista.filter((c) => c.negocioCorretora === true);
    } else if (filtroNegCorretora === 'nao') {
      lista = lista.filter((c) => !c.negocioCorretora);
    }

    if (filtroOrigem !== 'todos') {
      lista = lista.filter((c) => (c.origem ?? 'MANUAL') === filtroOrigem);
    }

    if (sortKey) {
      lista = [...lista].sort((a, b) => {
        let va: any, vb: any;
        if (sortKey === 'vigencia') {
          va = a.vigenciaInicio ?? '';
          vb = b.vigenciaInicio ?? '';
        } else if (sortKey === 'cliente') {
          va = getNomeCliente(a).toLowerCase();
          vb = getNomeCliente(b).toLowerCase();
        } else if (sortKey === 'premio') {
          va = Number(a.premioLiquido ?? 0);
          vb = Number(b.premioLiquido ?? 0);
        } else if (sortKey === 'comissao') {
          va = Number(a.percentualComissao ?? 0);
          vb = Number(b.percentualComissao ?? 0);
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return lista;
  }, [cotacoes, membroFiltro, busca, filtroStatus, filtroProduto, filtroNegCorretora, filtroOrigem, sortKey, sortDir]);

  const {
    currentPage,
    pageSize,
    totalPages,
    paginatedData,
    setCurrentPage,
    setPageSize,
  } = usePagination({
    data: cotacoesFiltradas,
    initialPageSize: 10,
  });

  return (
    <>
    {quickCommentTarget && (
      <QuickCommentDialog
        cotacaoId={quickCommentTarget.id}
        nomeCliente={quickCommentTarget.nome}
        onClose={() => setQuickCommentTarget(null)}
      />
    )}
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-2 px-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="rounded-md bg-blue-500/10 p-1.5 ring-1 ring-blue-500/20">
              <FileText className="size-3.5 text-blue-600 dark:text-blue-500" />
            </div>
            Cotações Ativas
            {cotacoes.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {cotacoesFiltradas.length !== cotacoes.length
                  ? `${cotacoesFiltradas.length} / ${cotacoes.length}`
                  : cotacoes.length}
              </Badge>
            )}
          </CardTitle>

          {/* Filtros + membros na mesma linha */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle apenas minhas (admin/gestor) */}
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => startTransition(() => setApenasMinhas((v) => !v))}
                    className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs border transition-all ${
                      apenasMinhas
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <UserCheck className="size-3.5" />
                    Minhas
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {apenasMinhas ? 'Mostrando apenas suas cotações' : 'Mostrando cotações de todos'}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Avatares da equipe */}
            {membros && membros.length > 1 && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => startTransition(() => setMembroFiltro(null))}
                      className={`size-7 rounded-full flex items-center justify-center border-2 transition-all ${
                        membroFiltro === null
                          ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
                          : 'border-border hover:border-muted-foreground opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Users className="size-3.5 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Todos</TooltipContent>
                </Tooltip>
                {membros.map((m) => {
                  const initials = m.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
                  return (
                    <Tooltip key={m.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => startTransition(() => setMembroFiltro(membroFiltro === m.id ? null : m.id))}
                          className={`rounded-full transition-all ${
                            membroFiltro === m.id
                              ? 'ring-2 ring-primary ring-offset-1 scale-110'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <Avatar className="size-7">
                            <AvatarImage src={(m as any).avatarUrl ?? undefined} />
                            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                          </Avatar>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {m.id === currentUserId ? `${m.nome} (Você)` : m.nome}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                <div className="w-px h-5 bg-border" />
              </>
            )}

            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                ref={buscaRef}
                placeholder="Buscar cliente..."
                defaultValue=""
                onChange={(e) => startTransition(() => { setBusca(e.target.value); setCurrentPage(1); })}
                className="h-9 pl-8"
              />
            </div>

            <Select value={filtroStatus} onValueChange={(v) => startTransition(() => { setFiltroStatus(v); setCurrentPage(1); })}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="EM_ELABORACAO">Em Elaboração</SelectItem>
                <SelectItem value="PERDIDA">Perdida</SelectItem>
                <SelectItem value="EXPIRADA">Expirada</SelectItem>
                <SelectItem value="CONVERTIDA">Convertida</SelectItem>
              </SelectContent>
            </Select>

            {produtosUnicos.length > 0 && (
              <Select value={filtroProduto} onValueChange={(v) => startTransition(() => { setFiltroProduto(v); setCurrentPage(1); })}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os produtos</SelectItem>
                  {produtosUnicos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={filtroNegCorretora} onValueChange={(v) => startTransition(() => { setFiltroNegCorretora(v); setCurrentPage(1); })}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Neg. Corretora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Neg. Corretora</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroOrigem} onValueChange={(v) => startTransition(() => { setFiltroOrigem(v); setCurrentPage(1); })}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as origens</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="RENOVACAO_PENDENTE">Renovação Pendente</SelectItem>
              </SelectContent>
            </Select>

            {temFiltroAtivo && (
              <Button variant="ghost" size="sm" onClick={limparFiltros}>
                <X className="size-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {cotacoesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {temFiltroAtivo ? 'Nenhuma cotação encontrada com os filtros aplicados' : 'Nenhuma cotação ativa no momento'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableHead col="vigencia" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>Vigência</SortableHead>
                    <SortableHead col="cliente" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>Cliente</SortableHead>
                    {membros && membros.length > 1 && <TableHead className="py-2 px-3 text-xs">Corretor</TableHead>}
                    <TableHead className="py-2 px-3 text-xs">Produto</TableHead>
                    <TableHead className="py-2 px-3 text-xs">Seguradora</TableHead>
                    <SortableHead col="premio" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>Prêmio Líq.</SortableHead>
                    <SortableHead col="comissao" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>% Comissão</SortableHead>
                    <TableHead className="py-2 px-3 text-xs">Status</TableHead>
                    <TableHead className="py-2 px-3 text-xs">Neg. Corretora</TableHead>
                    <TableHead className="py-2 px-3 text-right text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((cotacao) => {
                    const nomeCliente = getNomeCliente(cotacao);

                    const fmtDate = (d: string) =>
                      d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';

                    return (
                      <ContextMenu key={cotacao.id}>
                      <ContextMenuTrigger asChild>
                      <TableRow
                        className="group hover:bg-muted/30 transition-colors"
                        onMouseEnter={() => prefetchCotacao(cotacao.id)}
                        onMouseLeave={() => { if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current); }}
                      >
                        <TableCell className="py-2 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium tabular-nums">{fmtDate(cotacao.vigenciaInicio)}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{fmtDate(cotacao.vigenciaFim)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-3 text-sm font-medium max-w-[200px]">
                          <span className="block truncate" title={nomeCliente ?? undefined}>
                            {nomeCliente}
                          </span>
                        </TableCell>
                        {membros && membros.length > 1 && (
                          <TableCell className="py-2 px-3">
                            {(cotacao as any).vendedor ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Avatar className="size-7 cursor-default">
                                    <AvatarImage src={(cotacao as any).vendedor.avatarUrl ?? undefined} />
                                    <AvatarFallback className="text-[10px]">
                                      {((cotacao as any).vendedor.nome ?? '').split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {(cotacao as any).vendedor.id === currentUserId ? `${(cotacao as any).vendedor.nome} (Você)` : (cotacao as any).vendedor.nome}
                                </TooltipContent>
                              </Tooltip>
                            ) : '-'}
                          </TableCell>
                        )}
                        <TableCell className="py-2 px-3 text-sm text-muted-foreground">
                          {cotacao.produto?.nomeProduto || '-'}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-sm text-muted-foreground">
                          {cotacao.seguradoraParceira
                            ? cotacao.seguradoraParceira.nomeFantasia ||
                              cotacao.seguradoraParceira.razaoSocial
                            : '-'}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-sm font-semibold tabular-nums">
                          {cotacao.premioLiquido != null
                            ? Number(cotacao.premioLiquido).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : <span className="text-muted-foreground font-normal">R$ —</span>}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-sm tabular-nums">
                          {cotacao.percentualComissao != null
                            ? `${Number(cotacao.percentualComissao).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              {getStatusBadge(cotacao.status)}
                              {cotacao.documentoVenda?.motivoRejeicao && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                      Rejeitado
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="font-medium">Documento rejeitado pelo cadastro</p>
                                    <p className="text-xs mt-1">{cotacao.documentoVenda.motivoRejeicao}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {cotacao.origem === 'RENOVACAO_PENDENTE' && (
                              <span className="inline-flex items-center gap-1 w-fit rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20">
                                <RefreshCw className="size-2.5" />
                                Renovação
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          {cotacao.negocioCorretora ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20">
                                  <Building2 className="size-3" />
                                  Sim
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Negócio Corretora</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="flex justify-end items-center gap-0.5">
                            <ComentariosCell
                              cotacaoId={cotacao.id}
                              initialCount={cotacao.comentariosCount}
                              onQuickComment={() => setQuickCommentTarget({ id: cotacao.id, nome: nomeCliente })}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => onVisualizar(cotacao)}
                              title="Visualizar"
                            >
                              <Eye className="size-4" />
                            </Button>
                            {cotacao.status === 'EM_ELABORACAO' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => onEditar(cotacao)}
                                title="Editar"
                              >
                                <Edit className="size-4" />
                              </Button>
                            )}
                            {cotacao.status === 'EM_ELABORACAO' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => onRecusar(cotacao)}
                                title="Marcar como Perdida"
                              >
                                <Flag className="size-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => onVisualizar(cotacao)}>
                          <Eye className="mr-2 size-4" />
                          Visualizar
                        </ContextMenuItem>
                        {cotacao.status === 'EM_ELABORACAO' && (
                          <>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => onEditar(cotacao)}>
                              <Edit className="mr-2 size-4" />
                              Editar
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              onClick={() => onRecusar(cotacao)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Flag className="mr-2 size-4" />
                              Marcar como Perdida
                            </ContextMenuItem>
                          </>
                        )}
                      </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {cotacoesFiltradas.length > 10 && (
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={cotacoesFiltradas.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
    </>
  );
}
