import {
  useState,
  useMemo,
  useTransition,
  useDeferredValue,
  useCallback,
  useRef,
} from 'react';
import { Kanban, LayoutList, Sheet, Search, Tag, UserCheck, X } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Badge } from '@/core/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/core/ui/tooltip';
import { cn } from '@/core/utils';
import { CotacoesAtivasTable } from './cotacoes-ativas-table';
import { FunilKanban } from './funil-kanban';
import { FunilPlanilha } from './funil-planilha';
import { CotacaoTagManagerDialog } from './cotacao-tag-manager';
import type { Cotacao, CotacaoTag } from '@/types/area-trabalho';
import type { MembroEquipe } from '../http';
import { useCotacoesFinalizadas } from '../http';

type ViewMode = 'kanban' | 'lista' | 'planilha';

interface FunilBoardProps {
  cotacoes: Cotacao[];
  onVisualizar: (c: Cotacao) => void;
  onEditar: (c: Cotacao) => void;
  onMarcarPerdida: (c: Cotacao) => void;
  onConfirmarVenda: (c: Cotacao) => void;
  membros?: MembroEquipe[];
  currentUserId?: string;
  isAdmin?: boolean;
}

function getNomeCliente(cotacao: Cotacao): string {
  const cl = cotacao.cliente;
  return (cl?.tipoPessoa === 'PF'
    ? cl?.nome
    : cl?.nomeFantasia || cl?.razaoSocial) ?? '';
}

export function FunilBoard({
  cotacoes,
  onVisualizar,
  onEditar,
  onMarcarPerdida,
  onConfirmarVenda,
  membros = [],
  currentUserId,
  isAdmin,
}: FunilBoardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [, startTransition] = useTransition();
  const buscaRef = useRef<HTMLInputElement>(null);

  const { data: cotacoesFinalizadas = [] } = useCotacoesFinalizadas({ enabled: viewMode === 'planilha' });

  // Filters
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroProduto, setFiltroProduto] = useState<string>('todos');
  const [filtroNegCorretora, setFiltroNegCorretora] = useState<string>('todos');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todos');
  const [filtroTags, setFiltroTags] = useState<Set<string>>(new Set());
  const [membrosFiltro, setMembrosFiltro] = useState<Set<string>>(new Set());
  const [apenasMinhas, setApenasMinhas] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('cotacoes:apenasMinhas') === 'true';
  });

  const deferredBusca = useDeferredValue(busca);
  const deferredMembros = useDeferredValue(membrosFiltro);

  // Unique products for filter
  const produtosUnicos = useMemo(() => {
    const map = new Map<string, string>();
    cotacoes.forEach((c) => {
      if (c.produto?.id && c.produto?.nomeProduto) {
        map.set(c.produto.id, c.produto.nomeProduto);
      }
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [cotacoes]);

  // Unique tags for filter (derived from visible cotacoes)
  const tagsUnicas = useMemo(() => {
    const map = new Map<string, CotacaoTag>();
    cotacoes.forEach((c) => {
      (c.tags ?? []).forEach((t) => {
        if (!map.has(t.id)) map.set(t.id, t);
      });
    });
    return Array.from(map.values());
  }, [cotacoes]);

  // Unique vendors from cotacoes (for teams without formal membros list)
  const vendedoresUnicos = useMemo(() => {
    if (membros.length > 1) return membros;
    const map = new Map<string, MembroEquipe>();
    cotacoes.forEach((c) => {
      const v = c.vendedor;
      if (v && !map.has(v.id)) {
        map.set(v.id, { id: v.id, nome: v.nome, avatarUrl: null });
      }
    });
    return Array.from(map.values());
  }, [cotacoes, membros]);

  const toggleMembro = useCallback((id: string) => {
    setMembrosFiltro((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearMembros = useCallback(() => {
    setMembrosFiltro(new Set());
  }, []);

  const toggleTag = useCallback((id: string) => {
    setFiltroTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const limparFiltros = () => {
    if (buscaRef.current) buscaRef.current.value = '';
    startTransition(() => {
      setBusca('');
      setFiltroStatus('todos');
      setFiltroProduto('todos');
      setFiltroNegCorretora('todos');
      setFiltroOrigem('todos');
      setFiltroTags(new Set());
      setMembrosFiltro(new Set());
    });
  };

  const temFiltroAtivo =
    busca ||
    filtroStatus !== 'todos' ||
    filtroProduto !== 'todos' ||
    filtroNegCorretora !== 'todos' ||
    filtroOrigem !== 'todos' ||
    filtroTags.size > 0 ||
    membrosFiltro.size > 0;

  const cotacoesFiltradas = useMemo(() => {
    let lista = cotacoes;

    if (isAdmin && apenasMinhas && currentUserId) {
      lista = lista.filter(
        (c: any) =>
          c.vendedorId === currentUserId || c.atuanteId === currentUserId,
      );
      if (!lista.length) return lista;
    }

    if (deferredMembros.size > 0) {
      lista = lista.filter(
        (c: any) =>
          deferredMembros.has(c.vendedorId) ||
          deferredMembros.has(c.atuanteId),
      );
      if (!lista.length) return lista;
    }

    if (deferredBusca) {
      const q = deferredBusca.toLowerCase();
      lista = lista.filter((c) => getNomeCliente(c).toLowerCase().includes(q));
      if (!lista.length) return lista;
    }

    if (filtroStatus !== 'todos') {
      lista = lista.filter((c) => c.status === filtroStatus);
      if (!lista.length) return lista;
    }

    if (filtroProduto !== 'todos') {
      lista = lista.filter((c) => c.produto?.id === filtroProduto);
      if (!lista.length) return lista;
    }

    if (filtroNegCorretora === 'sim') {
      lista = lista.filter((c) => c.negocioCorretora === true);
      if (!lista.length) return lista;
    } else if (filtroNegCorretora === 'nao') {
      lista = lista.filter((c) => !c.negocioCorretora);
      if (!lista.length) return lista;
    }

    if (filtroOrigem !== 'todos') {
      lista = lista.filter(
        (c) => (c.origem ?? 'MANUAL') === filtroOrigem,
      );
      if (!lista.length) return lista;
    }

    if (filtroTags.size > 0) {
      lista = lista.filter((c) =>
        (c.tags ?? []).some((t) => filtroTags.has(t.id)),
      );
    }

    return lista;
  }, [
    cotacoes,
    isAdmin,
    apenasMinhas,
    currentUserId,
    deferredMembros,
    deferredBusca,
    filtroStatus,
    filtroProduto,
    filtroNegCorretora,
    filtroOrigem,
    filtroTags,
  ]);

  // Para a planilha, mescla cotações EM_ELABORACAO com finalizadas (PERDIDA/CONVERTIDA)
  const cotacoesPlanilha = useMemo(() => {
    let finalizadas: Cotacao[] = Array.isArray(cotacoesFinalizadas) ? (cotacoesFinalizadas as Cotacao[]) : [];

    if (isAdmin && apenasMinhas && currentUserId) {
      finalizadas = finalizadas.filter(
        (c: any) => c.vendedorId === currentUserId || c.atuanteId === currentUserId,
      );
    }
    if (deferredMembros.size > 0) {
      finalizadas = finalizadas.filter(
        (c: any) => deferredMembros.has(c.vendedorId) || deferredMembros.has(c.atuanteId),
      );
    }
    if (deferredBusca) {
      const q = deferredBusca.toLowerCase();
      finalizadas = finalizadas.filter((c) => getNomeCliente(c).toLowerCase().includes(q));
    }
    if (filtroProduto !== 'todos') {
      finalizadas = finalizadas.filter((c) => c.produto?.id === filtroProduto);
    }
    if (filtroNegCorretora === 'sim') {
      finalizadas = finalizadas.filter((c) => c.negocioCorretora === true);
    } else if (filtroNegCorretora === 'nao') {
      finalizadas = finalizadas.filter((c) => !c.negocioCorretora);
    }
    if (filtroOrigem !== 'todos') {
      finalizadas = finalizadas.filter((c) => (c.origem ?? 'MANUAL') === filtroOrigem);
    }
    if (filtroTags.size > 0) {
      finalizadas = finalizadas.filter((c) => (c.tags ?? []).some((t: any) => filtroTags.has(t.id)));
    }

    if (filtroStatus === 'EM_ELABORACAO') return cotacoesFiltradas;
    if (filtroStatus === 'PERDIDA') return finalizadas.filter((c) => c.status === 'PERDIDA');
    if (filtroStatus === 'CONVERTIDA') return finalizadas.filter((c) => c.status === 'CONVERTIDA');
    return [...cotacoesFiltradas, ...finalizadas];
  }, [
    cotacoesFinalizadas,
    cotacoesFiltradas,
    isAdmin,
    apenasMinhas,
    currentUserId,
    deferredMembros,
    deferredBusca,
    filtroStatus,
    filtroProduto,
    filtroNegCorretora,
    filtroOrigem,
    filtroTags,
  ]);

  return (
    <div className="space-y-3">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View toggle */}
        <div className="flex items-center rounded-md border p-0.5 gap-0.5">
          <Button
            size="sm"
            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
            className="h-7 px-2 gap-1.5"
            onClick={() => setViewMode('kanban')}
          >
            <Kanban className="size-3.5" />
            <span className="hidden sm:inline text-xs">Kanban</span>
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'lista' ? 'secondary' : 'ghost'}
            className="h-7 px-2 gap-1.5"
            onClick={() => setViewMode('lista')}
          >
            <LayoutList className="size-3.5" />
            <span className="hidden sm:inline text-xs">Lista</span>
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'planilha' ? 'secondary' : 'ghost'}
            className="h-7 px-2 gap-1.5"
            onClick={() => setViewMode('planilha')}
          >
            <Sheet className="size-3.5" />
            <span className="hidden sm:inline text-xs">Planilha</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            ref={buscaRef}
            placeholder="Buscar cliente..."
            defaultValue=""
            onChange={(e) =>
              startTransition(() => setBusca(e.target.value))
            }
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Status */}
        <Select value={filtroStatus} onValueChange={(v) => startTransition(() => setFiltroStatus(v))}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="EM_ELABORACAO">Em Elaboração</SelectItem>
            <SelectItem value="PERDIDA">Perdida</SelectItem>
            <SelectItem value="EXPIRADA">Expirada</SelectItem>
            <SelectItem value="CONVERTIDA">Convertida</SelectItem>
          </SelectContent>
        </Select>

        {/* Product */}
        {produtosUnicos.length > 0 && (
          <Select
            value={filtroProduto}
            onValueChange={(v) => startTransition(() => setFiltroProduto(v))}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos produtos</SelectItem>
              {produtosUnicos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Neg. Corretora */}
        <Select
          value={filtroNegCorretora}
          onValueChange={(v) =>
            startTransition(() => setFiltroNegCorretora(v))
          }
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Neg. Corretora" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Neg. Corretora</SelectItem>
            <SelectItem value="sim">Sim</SelectItem>
            <SelectItem value="nao">Não</SelectItem>
          </SelectContent>
        </Select>

        {/* Origem */}
        <Select
          value={filtroOrigem}
          onValueChange={(v) => startTransition(() => setFiltroOrigem(v))}
        >
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas origens</SelectItem>
            <SelectItem value="MANUAL">Manual</SelectItem>
            <SelectItem value="RENOVACAO_PENDENTE">Renovação</SelectItem>
          </SelectContent>
        </Select>

        {/* Tags filter */}
        {tagsUnicas.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 gap-1.5 text-xs',
                  filtroTags.size > 0 && 'border-primary text-primary',
                )}
              >
                <Tag className="size-3.5" />
                Tags
                {filtroTags.size > 0 && (
                  <Badge className="h-4 px-1 text-[10px]" variant="secondary">
                    {filtroTags.size}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <p className="text-xs font-medium text-muted-foreground px-2 mb-1.5">Filtrar por tag</p>
              <div className="space-y-0.5">
                {tagsUnicas.map((tag) => {
                  const selected = filtroTags.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted transition-colors',
                        selected && 'bg-muted',
                      )}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.cor }} />
                      <span className="flex-1 text-left truncate text-xs">{tag.nome}</span>
                      {selected && (
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-primary flex items-center justify-center">
                          <X className="h-2 w-2 text-primary-foreground" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Apenas minhas (admin/gestor) */}
        {isAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() =>
                  startTransition(() => {
                    const next = !apenasMinhas;
                    setApenasMinhas(next);
                    localStorage.setItem(
                      'cotacoes:apenasMinhas',
                      String(next),
                    );
                  })
                }
                className={cn(
                  'h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs border transition-all',
                  apenasMinhas
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground',
                )}
              >
                <UserCheck className="size-3.5" />
                <span className="hidden sm:inline">Minhas</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {apenasMinhas
                ? 'Mostrando apenas suas cotações'
                : 'Mostrando cotações de todos'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Clear + count + tag manager */}
        <div className="ml-auto flex items-center gap-2">
          {temFiltroAtivo && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={limparFiltros}
            >
              <X className="size-3.5" />
              Limpar
            </Button>
          )}
          <Badge variant="secondary" className="text-xs tabular-nums">
            {viewMode === 'planilha' ? cotacoesPlanilha.length : cotacoesFiltradas.length}
            {viewMode !== 'planilha' && cotacoesFiltradas.length !== cotacoes.length &&
              ` / ${cotacoes.length}`}
          </Badge>
          <CotacaoTagManagerDialog />
        </div>
      </div>

      {/* ── Board / List / Planilha ──────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <FunilKanban
          cotacoes={cotacoesFiltradas}
          onVisualizar={onVisualizar}
          onEditar={onEditar}
          onMarcarPerdida={onMarcarPerdida}
          onConfirmarVenda={onConfirmarVenda}
          vendedores={vendedoresUnicos}
          membrosFiltro={membrosFiltro}
          onToggleMembro={toggleMembro}
          onClearMembros={clearMembros}
          currentUserId={currentUserId}
        />
      )}
      {viewMode === 'lista' && (
        <CotacoesAtivasTable
          cotacoes={cotacoesFiltradas}
          onVisualizar={onVisualizar}
          onEditar={onEditar}
          onRecusar={onMarcarPerdida}
          membros={membros}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      )}
      {viewMode === 'planilha' && (
        <FunilPlanilha
          cotacoes={cotacoesPlanilha}
          membros={vendedoresUnicos}
          onVisualizar={onVisualizar}
          onEditar={onEditar}
          onMarcarPerdida={onMarcarPerdida}
          onConfirmarVenda={onConfirmarVenda}
        />
      )}
    </div>
  );
}
