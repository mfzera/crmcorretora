
import { useState, useTransition, useMemo, useEffect, useCallback, useDeferredValue } from 'react';
import { useDebounce } from '@/core/hooks/use-debounce';
import { cn } from '@/core/utils';
import { useNavigate } from '@tanstack/react-router';
import {
  Calendar,
  AlertCircle,
  TrendingUp,
  Building2,
  User,
  Users,
  Clock,
  ArrowRight,
  Trash2,
  Search,
  UserCircle2,
  Undo2,
  FileWarning,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Checkbox } from '@/core/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { DataTablePagination } from '@/core/ui/data-table-pagination';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/core/ui/tooltip';
import type { RenovacaoPendente } from '@/types/area-trabalho';
import { EmptyState } from '@/core/components/shared';
import { TransferirRenovacoesDialog } from './transferir-renovacoes-dialog';
import { SolicitarExclusaoRenovacaoDialog } from './solicitar-exclusao-renovacao-dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/core/ui/context-menu';
import { useAuthStore } from '@/infra/auth/auth-store';
import { usePermissions } from '@/core/hooks/use-permissions';

interface RenovacoesPendentesCardProps {
  renovacoes: RenovacaoPendente[];
  renovacoesVencidas?: RenovacaoPendente[];
  onIniciarRenovacao: (renovacao: RenovacaoPendente) => void;
  onDesfazerInicioRenovacao: (renovacao: RenovacaoPendente) => void;
  vencidas?: boolean;
  membros?: { id: string; nome: string; avatarUrl?: string | null }[];
  currentUserId?: string;
}

const getStatusAndamentoLabel = (renovacao: RenovacaoPendente): { label: string; variant: 'destructive' | 'secondary' | 'outline'; tooltip?: string } => {
  const doc = renovacao.documentoVendaNovo;

  if (doc) {
    if (doc.status === 'AGUARDANDO_CADASTRO') {
      return { label: 'No Cadastro', variant: 'secondary', tooltip: `Documento ${doc.numeroDocumento} aguardando aprovação do cadastro` };
    }
    if (doc.status === 'VENDA_CONFIRMADA' && doc.motivoRejeicao) {
      return { label: 'Rejeitado', variant: 'destructive', tooltip: `Rejeitado: ${doc.motivoRejeicao}` };
    }
    if (doc.status === 'VENDA_CONFIRMADA') {
      return { label: 'Aguardando Envio', variant: 'outline', tooltip: `Documento ${doc.numeroDocumento} aguardando envio ao cadastro` };
    }
  }

  return { label: 'Em Andamento', variant: 'secondary', tooltip: 'Cotação em elaboração' };
};

const getUrgenciaBadge = (dias: number) => {
  if (dias < 0) {
    const diasVencido = Math.abs(dias);
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-400 whitespace-nowrap">
        <AlertCircle className="size-3" />
        Venceu há {diasVencido} {diasVencido === 1 ? 'dia' : 'dias'}
      </span>
    );
  }
  if (dias <= 7) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-400 whitespace-nowrap">
        <AlertCircle className="size-3" />
        Vence em {dias} {dias === 1 ? 'dia' : 'dias'}
      </span>
    );
  }
  if (dias <= 30) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 whitespace-nowrap">
        <Clock className="size-3" />
        Vence em {dias} dias
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
      <Calendar className="size-3" />
      Vence em {dias} dias
    </span>
  );
};

const getUrgencyBorderClass = (dias: number): string => {
  if (dias <= 7) return 'border-l-red-500';
  if (dias <= 30) return 'border-l-amber-500';
  return 'border-l-border';
};

const getPrioridadeDot = (p: 'ALTA' | 'MEDIA' | 'BAIXA'): string => {
  if (p === 'ALTA') return 'text-red-500';
  if (p === 'MEDIA') return 'text-amber-500';
  return 'text-muted-foreground/40';
};

export function RenovacoesPendentesCard({
  renovacoes,
  renovacoesVencidas = [],
  onIniciarRenovacao,
  onDesfazerInicioRenovacao,
  vencidas = false,
  membros,
  currentUserId,
}: RenovacoesPendentesCardProps) {
  const [, startTransition] = useTransition();
  const [selectedRenovacoes, setSelectedRenovacoes] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const buscaDebounced = useDebounce(busca, 300);
  const [membrosFiltro, setMembrosFiltro] = useState<Set<string>>(new Set());
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'iniciar' | 'em_andamento'>('todos');
  const [vencidasFiltro, setVencidasFiltro] = useState<'todas' | 'vencidas' | 'a_vencer'>('todas');
  const [dialogTransferirOpen, setDialogTransferirOpen] = useState(false);
  const [exclusaoDialog, setExclusaoDialog] = useState<{
    open: boolean;
    renovacaoIds: string[];
    nomeCliente?: string;
  }>({ open: false, renovacaoIds: [] });

  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { hasPermission } = usePermissions();
  const canSolicitarExclusao = hasPermission('vendas:editar_documento_venda');

  const getNomeCliente = (renovacao: RenovacaoPendente) => {
    if (!renovacao.cliente) return '';
    const c = renovacao.cliente;
    return c.tipoPessoa === 'PF'
      ? c.nome
      : c.nomeFantasia || c.razaoSocial || c.nome;
  };

  const semDocumento = (renovacao: RenovacaoPendente) => {
    if (!renovacao.importadoDePlanilha) return false;
    const c = renovacao.cliente;
    if (c.tipoPessoa === 'PF') return !c.cpf || c.cpf.replace(/\D/g, '').length !== 11;
    return !c.cnpj || c.cnpj.replace(/\D/g, '').length !== 14;
  };

  const DocWarningBadge = ({ renovacao }: { renovacao: RenovacaoPendente }) => {
    if (!semDocumento(renovacao)) return null;
    const label = renovacao.cliente.tipoPessoa === 'PF' ? 'CPF' : 'CNPJ';
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 cursor-default shrink-0">
            <FileWarning className="size-3 shrink-0" />
            Sem {label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {label} não informado na planilha — será solicitado ao iniciar a renovação
        </TooltipContent>
      </Tooltip>
    );
  };

  // Deriva vendedores únicos das renovações — cobre vendedores fora do membros formal
  const vendedoresUnicos = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; avatarUrl?: string | null }>();
    [...renovacoes, ...renovacoesVencidas].forEach((r) => {
      if (!map.has(r.vendedorId) && r.vendedor) {
        map.set(r.vendedorId, {
          id: r.vendedorId,
          nome: r.vendedor.nome,
          avatarUrl: (r.vendedor as any).avatarUrl ?? null,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [renovacoes, renovacoesVencidas]);

  // Valores deferidos: botões ficam ativos na hora, lista re-renderiza depois
  const deferredStatus = useDeferredValue(statusFiltro);
  const deferredVencidas = useDeferredValue(vencidasFiltro);
  const deferredMembros = useDeferredValue(membrosFiltro);

  const isFiltering =
    deferredStatus !== statusFiltro ||
    deferredVencidas !== vencidasFiltro ||
    deferredMembros !== membrosFiltro;

  const renovacoesOrdenadas = useMemo(() =>
    [...renovacoesVencidas, ...renovacoes]
      .sort((a, b) => a.diasParaVencimento - b.diasParaVencimento)
      .filter((r) => {
        if (deferredMembros.size > 0 && !deferredMembros.has(r.vendedorId)) return false;
        if (deferredStatus === 'iniciar' && r.status !== 'PENDENTE') return false;
        if (deferredStatus === 'em_andamento' && r.status === 'PENDENTE') return false;
        if (deferredVencidas === 'vencidas' && r.diasParaVencimento >= 0) return false;
        if (deferredVencidas === 'a_vencer' && r.diasParaVencimento < 0) return false;
        if (!buscaDebounced.trim()) return true;
        const termo = buscaDebounced.toLowerCase();
        const nome = getNomeCliente(r)?.toLowerCase() ?? '';
        return nome.includes(termo);
      }),
    [renovacoes, renovacoesVencidas, deferredMembros, deferredStatus, deferredVencidas, buscaDebounced],
  );

  useEffect(() => { setPagina(1); }, [buscaDebounced, deferredMembros, deferredStatus, deferredVencidas]);

  const totalPaginas = Math.max(1, Math.ceil(renovacoesOrdenadas.length / pageSize));
  const renovacoesPagina = renovacoesOrdenadas.slice((pagina - 1) * pageSize, pagina * pageSize);

  const handlePageChange = useCallback((p: number) => setPagina(p), []);
  const handlePageSizeChange = useCallback((s: number) => { setPageSize(s); setPagina(1); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if ((e.target as HTMLElement).isContentEditable) return;
      if (e.key === 'ArrowLeft') setPagina((p) => Math.max(1, p - 1));
      if (e.key === 'ArrowRight') setPagina((p) => Math.min(totalPaginas, p + 1));
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [totalPaginas]);

  const toggleRenovacao = (id: string) => {
    setSelectedRenovacoes((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selectedRenovacoes.length === renovacoesOrdenadas.length) {
      setSelectedRenovacoes([]);
    } else {
      setSelectedRenovacoes(renovacoesOrdenadas.map((r) => r.id));
    }
  };

  const totalRenovacoes = renovacoes.length + renovacoesVencidas.length;

  return (
    <Card className="h-full border-border/50 gap-0">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className={`rounded-lg p-2 ring-1 ${vencidas ? 'bg-destructive/10 ring-destructive/20' : 'bg-orange-500/10 ring-orange-500/20'}`}>
                <TrendingUp className={`size-4 ${vencidas ? 'text-destructive' : 'text-orange-600 dark:text-orange-500'}`} />
              </div>
              {vencidas ? 'Renovações Vencidas' : 'Renovações Pendentes'}
              {totalRenovacoes > 0 && (
                <Badge variant={vencidas ? 'destructive' : 'secondary'}>{totalRenovacoes}</Badge>
              )}
            </CardTitle>

            {selectedRenovacoes.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDialogTransferirOpen(true)}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Transferir ({selectedRenovacoes.length})
                </Button>
                {canSolicitarExclusao && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() =>
                      setExclusaoDialog({
                        open: true,
                        renovacaoIds: selectedRenovacoes,
                      })
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir ({selectedRenovacoes.length})
                  </Button>
                )}
              </div>
            )}
          </div>

          {totalRenovacoes > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro: status */}
              <div className="flex rounded-md border overflow-hidden text-xs h-7">
                {(['todos', 'iniciar', 'em_andamento'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setStatusFiltro(v)}
                    className={cn(
                      'px-2.5 h-full font-medium transition-colors',
                      statusFiltro === v
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground',
                    )}
                  >
                    {v === 'todos' ? 'Todos' : v === 'iniciar' ? 'Iniciar' : 'Em andamento'}
                  </button>
                ))}
              </div>

              {/* Filtro: vencidas */}
              <div className="flex rounded-md border overflow-hidden text-xs h-7">
                {(['todas', 'a_vencer', 'vencidas'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVencidasFiltro(v)}
                    className={cn(
                      'px-2.5 h-full font-medium transition-colors',
                      vencidasFiltro === v
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground',
                    )}
                  >
                    {v === 'todas' ? 'Todas' : v === 'a_vencer' ? 'A vencer' : 'Vencidas'}
                  </button>
                ))}
              </div>

              {/* Avatares — estilo cotações ativas */}
              {vendedoresUnicos.length > 1 && (
                <>
                  <div className="w-px h-5 bg-border" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setMembrosFiltro(new Set())}
                        className={`size-7 rounded-full flex items-center justify-center border-2 transition-all ${
                          membrosFiltro.size === 0
                            ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
                            : 'border-border hover:border-muted-foreground opacity-60 hover:opacity-100'
                        }`}
                      >
                        <Users className="size-3.5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Todos</TooltipContent>
                  </Tooltip>
                  {vendedoresUnicos.map((m) => {
                    const selecionado = membrosFiltro.has(m.id);
                    const initials = m.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
                    return (
                      <Tooltip key={m.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() =>
                              setMembrosFiltro((prev) => {
                                const next = new Set(prev);
                                if (next.has(m.id)) next.delete(m.id);
                                else next.add(m.id);
                                return next;
                              })
                            }
                            className={`rounded-full transition-all ${
                              selecionado
                                ? 'ring-2 ring-primary ring-offset-1 scale-110'
                                : membrosFiltro.size > 0
                                  ? 'opacity-40 hover:opacity-80'
                                  : 'opacity-60 hover:opacity-100'
                            }`}
                          >
                            <Avatar className="size-7">
                              <AvatarImage src={m.avatarUrl ?? undefined} />
                              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                            </Avatar>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {m.id === currentUserId ? `${m.nome} (Você)` : m.nome}
                          {selecionado ? ' · selecionado' : ''}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  <div className="w-px h-5 bg-border" />
                </>
              )}

              {/* Busca */}
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do cliente..."
                  defaultValue=""
                  onChange={(e) => startTransition(() => setBusca(e.target.value))}
                  className="pl-8 h-9"
                />
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn('pt-0 transition-opacity duration-150', isFiltering && 'opacity-50 pointer-events-none')}>
        {renovacoesOrdenadas.length === 0 ? (
          <EmptyState
            icon={Calendar}
            description={vencidas ? 'Nenhuma renovação vencida' : 'Nenhuma renovação pendente no momento'}
          />
        ) : (
          <div className="rounded-md border divide-y divide-border overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/30">
              <Checkbox
                checked={selectedRenovacoes.length === renovacoesOrdenadas.length && renovacoesOrdenadas.length > 0}
                onCheckedChange={toggleAll}
              />
              <span className="text-xs text-muted-foreground">
                Selecionar todos
                {totalPaginas > 1 && (
                  <span className="ml-1 opacity-60">({renovacoesOrdenadas.length} total)</span>
                )}
              </span>
            </div>

            {renovacoesPagina.map((renovacao) => {
              if (!renovacao.cliente || !renovacao.produto) return null;

              const nomeCliente = getNomeCliente(renovacao);
              const isPessoaFisica = renovacao.cliente.tipoPessoa === 'PF';
              const statusInfo = getStatusAndamentoLabel(renovacao);
              const borderClass = getUrgencyBorderClass(renovacao.diasParaVencimento);
              const prioridadeDotClass = getPrioridadeDot(renovacao.prioridade);

              return (
                <ContextMenu key={renovacao.id}>
                  <ContextMenuTrigger asChild>
                    <div className={`flex items-center gap-2 px-3 py-2.5 border-l-4 ${borderClass} hover:bg-muted/40 transition-colors`}>
                      <Checkbox
                        checked={selectedRenovacoes.includes(renovacao.id)}
                        onCheckedChange={() => toggleRenovacao(renovacao.id)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {isPessoaFisica
                          ? <User className="size-3 text-blue-500 shrink-0" />
                          : <Building2 className="size-3 text-purple-500 shrink-0" />
                        }
                        <span className={`text-xs ${prioridadeDotClass} shrink-0`} title={`Prioridade ${renovacao.prioridade.toLowerCase()}`}>●</span>
                        <span className="text-sm font-medium truncate">{nomeCliente}</span>
                        <DocWarningBadge renovacao={renovacao} />
                      </div>

                      <div className="hidden sm:flex flex-col min-w-0 w-36 shrink-0">
                        <span className="text-xs text-muted-foreground truncate">{renovacao.produto.nomeProduto}</span>
                        {renovacao.itemDescricao && (
                          <span className="text-xs text-muted-foreground/60 truncate italic">{renovacao.itemDescricao}</span>
                        )}
                      </div>

                      <div className="hidden md:block w-28 shrink-0">
                        <span className="font-mono text-xs text-muted-foreground truncate block">
                          {renovacao.numeroApolice ?? '—'}
                        </span>
                      </div>

                      <div className="hidden md:block w-24 text-right shrink-0">
                        {renovacao.premioAtual ? (
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                            {renovacao.premioAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      <div className="shrink-0">
                        {getUrgenciaBadge(renovacao.diasParaVencimento)}
                      </div>

                      {renovacao.status !== 'PENDENTE' && (
                        <div className="shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant={statusInfo.variant} className="text-xs cursor-help whitespace-nowrap">
                                {statusInfo.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{statusInfo.tooltip}</TooltipContent>
                          </Tooltip>
                        </div>
                      )}

                      {membros && membros.length > 1 && (renovacao as any).vendedor && (
                        <ContextMenu>
                          <ContextMenuTrigger>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="size-6 cursor-default shrink-0">
                                  <AvatarImage src={(renovacao as any).vendedor.avatarUrl ?? undefined} />
                                  <AvatarFallback className="text-[9px]">
                                    {(renovacao as any).vendedor.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                {(renovacao as any).vendedor.id === currentUserId
                                  ? `${(renovacao as any).vendedor.nome} (Você)`
                                  : (renovacao as any).vendedor.nome}
                              </TooltipContent>
                            </Tooltip>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => navigate({ to: '/equipe/$id', params: { id: (renovacao as any).vendedor.id } })}>
                              <UserCircle2 className="mr-2 size-4" />
                              Ver perfil de {(renovacao as any).vendedor.nome.split(' ')[0]}
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        {renovacao.status === 'PENDENTE' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={(e) => { e.stopPropagation(); onIniciarRenovacao(renovacao); }}
                          >
                            Iniciar
                          </Button>
                        )}
                        {renovacao.statusOriginal === 'EM_PROSPECCAO' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-1.5"
                                onClick={(e) => { e.stopPropagation(); onDesfazerInicioRenovacao(renovacao); }}
                              >
                                <Undo2 className="size-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Desfazer início</TooltipContent>
                          </Tooltip>
                        )}
                        {canSolicitarExclusao && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-1.5 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExclusaoDialog({ open: true, renovacaoIds: [renovacao.id], nomeCliente: nomeCliente });
                                }}
                                disabled={renovacao.solicitacaoExclusao?.status === 'PENDENTE'}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {renovacao.solicitacaoExclusao?.status === 'PENDENTE'
                                ? 'Solicitação de exclusão aguardando aprovação'
                                : renovacao.solicitacaoExclusao?.status === 'RECUSADA'
                                  ? 'Solicitar exclusão novamente (anterior recusada)'
                                  : 'Solicitar exclusão'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </ContextMenuTrigger>

                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => onIniciarRenovacao(renovacao)}
                      disabled={renovacao.status !== 'PENDENTE'}
                    >
                      <ArrowRight className="mr-2 size-4" />
                      {renovacao.status === 'PENDENTE' ? 'Iniciar Renovação' : statusInfo.label}
                    </ContextMenuItem>
                    {renovacao.statusOriginal === 'EM_PROSPECCAO' && (
                      <ContextMenuItem onClick={() => onDesfazerInicioRenovacao(renovacao)}>
                        <Undo2 className="mr-2 size-4" />
                        Desfazer início
                      </ContextMenuItem>
                    )}
                    <ContextMenuItem onClick={() => setDialogTransferirOpen(true)}>
                      <Users className="mr-2 size-4" />
                      Transferir
                    </ContextMenuItem>
                    {canSolicitarExclusao && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() =>
                            setExclusaoDialog({
                              open: true,
                              renovacaoIds: [renovacao.id],
                              nomeCliente: nomeCliente,
                            })
                          }
                          className="text-destructive focus:text-destructive"
                          disabled={renovacao.solicitacaoExclusao?.status === 'PENDENTE'}
                        >
                          <Trash2 className="mr-2 size-4" />
                          {renovacao.solicitacaoExclusao?.status === 'PENDENTE'
                            ? 'Exclusão aguardando aprovação'
                            : renovacao.solicitacaoExclusao?.status === 'RECUSADA'
                              ? 'Solicitar Exclusão Novamente'
                              : 'Solicitar Exclusão'}
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        )}

        <DataTablePagination
          currentPage={pagina}
          totalPages={totalPaginas}
          pageSize={pageSize}
          totalItems={renovacoesOrdenadas.length}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[10, 15, 20, 30, 50]}
        />
      </CardContent>

      <TransferirRenovacoesDialog
        open={dialogTransferirOpen}
        onOpenChange={setDialogTransferirOpen}
        renovacaoIds={selectedRenovacoes}
        vendedorAtualId={user?.id || ''}
        onSuccess={() => setSelectedRenovacoes([])}
      />

      <SolicitarExclusaoRenovacaoDialog
        open={exclusaoDialog.open}
        onOpenChange={(open) =>
          setExclusaoDialog((prev) => ({ ...prev, open }))
        }
        renovacaoIds={exclusaoDialog.renovacaoIds}
        nomeCliente={exclusaoDialog.nomeCliente}
        onSuccess={() => setSelectedRenovacoes([])}
      />
    </Card>
  );
}
