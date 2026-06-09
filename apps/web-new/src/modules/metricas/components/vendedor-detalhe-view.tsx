
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import {
  Loader2,
  Medal,
  Crown,
  AlertTriangle,
  ArrowLeft,
  CircleDot,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { dayjs } from '@/core/utils/date-utils';
import { cn } from '@/core/utils';
import { useMetricas, type FiltrosMetricas } from '../http';
import {
  type VendedorDetalhe,
  type PeriodoPreset,
  type TopVendedor,
  formatCurrency,
  formatCurrencyCompact,
  getIniciais,
  getStatusLabel,
  getStatusBadgeVariant,
  PERIODO_LABELS,
} from './metricas-utils';
import { CotacaoDetalheDialog, RenovacaoDetalheDialog } from './metricas-item-dialog';

const PAGE_SIZE = 10;
// Altura aproximada por linha (em px) para cada tipo de card
const ROW_HEIGHT_DEFAULT = 57; // 2 linhas de texto + padding
const ROW_HEIGHT_PARADAS = 73; // 3 linhas de texto + padding

export function VendedorDetalheView({
  vendedor,
  avatarUrl,
  filtros,
  periodoPreset,
  onVoltar,
  onVendedorChange,
  topVendedores,
}: {
  vendedor: VendedorDetalhe;
  avatarUrl: string | null;
  filtros: FiltrosMetricas;
  periodoPreset: PeriodoPreset | null;
  onVoltar: () => void;
  onVendedorChange?: (v: TopVendedor) => void;
  topVendedores: TopVendedor[];
}) {
  const currentIndex = topVendedores.findIndex((v) => v.vendedorId === vendedor.vendedorId);
  const posicao = currentIndex + 1;
  const vendedorMetricas = topVendedores[currentIndex];

  const filtrosVendedor: FiltrosMetricas = {
    ...filtros,
    vendedorId: vendedor.vendedorId,
  };

  const { data: metricasVendedor, isLoading } = useMetricas(filtrosVendedor);

  const { data: cotacoesRaw = [], isLoading: isLoadingCotacoes } = useQuery({
    queryKey: ['cotacoes-vendedor', vendedor.vendedorId, filtros.dataInicio, filtros.dataFim],
    queryFn: async () => {
      try {
        const response = await api.get('/quotes', {
          params: { vendedorId: vendedor.vendedorId, limit: 100 },
        });
        return Array.isArray(response) ? response : (response as any)?.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: renovacoesRaw = [], isLoading: isLoadingRenovacoes } = useQuery({
    queryKey: ['renovacoes-vendedor', vendedor.vendedorId],
    queryFn: async () => {
      try {
        const response = await api.get('/renewals', {
          params: { vendedorId: vendedor.vendedorId, limit: 100 },
        });
        return Array.isArray(response) ? response : (response as any)?.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const cotacoesAtivas = useMemo(() => {
    return cotacoesRaw.filter(
      (c: any) => c.status === 'EM_ELABORACAO' || c.status === 'ENVIADA_CLIENTE',
    );
  }, [cotacoesRaw]);

  const cotacoesParadas = useMemo(() => {
    const cincodiasAtras = dayjs().subtract(5, 'day');
    return cotacoesRaw.filter(
      (c: any) =>
        c.status === 'EM_ELABORACAO' && dayjs(c.updatedAt).isBefore(cincodiasAtras),
    );
  }, [cotacoesRaw]);

  const renovacoesPendentes = useMemo(() => {
    return renovacoesRaw.filter((r: any) =>
      ['NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE'].includes(r.status),
    );
  }, [renovacoesRaw]);

  const premioVendedor = vendedorMetricas?.totalPremio ?? 0;
  const comissaoVendedor = vendedorMetricas?.totalComissao ?? 0;
  const docsVendedor = vendedorMetricas?.count ?? 0;
  const comissaoPercent = premioVendedor > 0 ? (comissaoVendedor / premioVendedor) * 100 : 0;
  const clientesAtivos = metricasVendedor?.cadastro.clientesAtivos ?? 0;
  const ticketMedio = docsVendedor > 0 ? premioVendedor / docsVendedor : 0;

  const totalRenovacoesVendedor = metricasVendedor?.renovacao.resumo.total ?? 0;
  const renovadosVendedor = metricasVendedor?.renovacao.resumo.renovados ?? 0;

  const [selectedCotacaoItem, setSelectedCotacaoItem] = useState<any | null>(null);
  const [selectedRenovacaoItem, setSelectedRenovacaoItem] = useState<any | null>(null);

  const apolicesVencendo = renovacoesPendentes.filter((r: any) => {
    const vencimento = dayjs(r.dataVencimento);
    return vencimento.isAfter(dayjs()) && vencimento.isBefore(dayjs().add(30, 'day'));
  });

  const premioRiscoVendedor = renovacoesPendentes.reduce(
    (sum: number, r: any) => sum + (parseFloat(r.premioAnterior) || 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onVoltar} className="gap-2">
            <ArrowLeft className="size-4" />
            Voltar
          </Button>

          <Avatar className="size-12">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={vendedor.vendedorNome} />}
            <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
              {getIniciais(vendedor.vendedorNome)}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">{vendedor.vendedorNome}</h1>
              {posicao > 0 && posicao <= 3 && (
                <Badge
                  variant="outline"
                  className={cn(
                    'gap-1',
                    posicao === 1 && 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300',
                    posicao === 2 && 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-300',
                    posicao === 3 && 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
                  )}
                >
                  {posicao === 1 ? <Crown className="size-3" /> : <Medal className="size-3" />}
                  {posicao}° Lugar
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {vendedor.equipeNome ?? 'Sem equipe'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-2 shrink-0">
            <Link to={`/metricas/vendedor/${vendedor.vendedorId}` as any}>
              <ExternalLink className="size-4" />
              <span className="hidden sm:inline">Ver todos os itens</span>
            </Link>
          </Button>
          {onVendedorChange && topVendedores.length > 1 && (
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={currentIndex <= 0}
                onClick={() => topVendedores[currentIndex - 1] && onVendedorChange(topVendedores[currentIndex - 1])}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-1">
                {currentIndex + 1}/{topVendedores.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={currentIndex >= topVendedores.length - 1}
                onClick={() => topVendedores[currentIndex + 1] && onVendedorChange(topVendedores[currentIndex + 1])}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <span className="text-xs text-muted-foreground px-2">
              {periodoPreset ? PERIODO_LABELS[periodoPreset] : 'Período personalizado'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <VendedorKpiCard
          title="PRÊMIO LÍQUIDO"
          isLoading={isLoading}
          className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10"
        >
          <p className="text-lg font-bold leading-tight text-green-600 dark:text-green-400">
            {formatCurrency(premioVendedor)}
          </p>
        </VendedorKpiCard>

        <VendedorKpiCard title="TAXA DE CONVERSÃO" isLoading={isLoading}>
          <p className="text-lg font-bold leading-tight">
            {totalRenovacoesVendedor > 0
              ? ((renovadosVendedor / totalRenovacoesVendedor) * 100).toFixed(1)
              : '0.0'}
            %
          </p>
        </VendedorKpiCard>

        <VendedorKpiCard title="COMISSÃO TOTAL" isLoading={isLoading}>
          <p className="text-lg font-bold leading-tight">{formatCurrency(comissaoVendedor)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {comissaoPercent.toFixed(1)}% de comissão média
          </p>
        </VendedorKpiCard>

        <VendedorKpiCard title="CLIENTES ATIVOS" isLoading={isLoading}>
          <p className="text-lg font-bold leading-tight">{clientesAtivos}</p>
        </VendedorKpiCard>

        <VendedorKpiCard title="TICKET MÉDIO" isLoading={isLoading}>
          <p className="text-lg font-bold leading-tight">{formatCurrency(ticketMedio)}</p>
        </VendedorKpiCard>
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <VendedorKpiCard
          title="RENOVAÇÕES PENDENTES"
          isLoading={isLoadingRenovacoes}
          className={cn(
            renovacoesPendentes.length > 0 &&
              'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10',
          )}
        >
          <p className={cn('text-lg font-bold leading-tight', renovacoesPendentes.length > 0 && 'text-amber-600 dark:text-amber-400')}>
            {renovacoesPendentes.length}
          </p>
          {renovacoesPendentes.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {apolicesVencendo.length} vencem em 30 dias
            </p>
          )}
        </VendedorKpiCard>

        <VendedorKpiCard
          title="COTAÇÕES PARADAS"
          isLoading={isLoadingCotacoes}
          className={cn(
            cotacoesParadas.length > 0 &&
              'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10',
          )}
        >
          <p className={cn('text-lg font-bold leading-tight', cotacoesParadas.length > 0 && 'text-red-600 dark:text-red-400')}>
            {cotacoesParadas.length}
            <span className="text-sm font-normal text-muted-foreground">
              {' '}de {cotacoesRaw.length} cotações
            </span>
          </p>
          {cotacoesParadas.length > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Paradas há mais de 7 dias
            </p>
          )}
        </VendedorKpiCard>

        <VendedorKpiCard title="APÓLICES VENCENDO" isLoading={isLoadingRenovacoes}>
          <p className="text-lg font-bold leading-tight">
            {apolicesVencendo.length}
            <span className="text-sm font-normal text-muted-foreground"> próximos 30 dias</span>
          </p>
          {premioRiscoVendedor > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrencyCompact(premioRiscoVendedor)} em risco
            </p>
          )}
        </VendedorKpiCard>

        <VendedorKpiCard title="NOVOS CLIENTES" isLoading={isLoading}>
          <p className="text-lg font-bold leading-tight">
            {docsVendedor}
            <span className="text-sm font-normal text-muted-foreground"> negócios</span>
          </p>
        </VendedorKpiCard>

        <VendedorKpiCard title="TEMPO MÉDIO FECHAMENTO" isLoading={false}>
          <p className="text-lg font-bold leading-tight text-muted-foreground">-</p>
        </VendedorKpiCard>
      </div>

      {/* 3 Columns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <CotacoesAtivasCard
          items={cotacoesAtivas}
          isLoading={isLoadingCotacoes}
          onItemClick={setSelectedCotacaoItem}
        />
        <CotacoesParadasCard
          items={cotacoesParadas}
          isLoading={isLoadingCotacoes}
          onItemClick={setSelectedCotacaoItem}
        />
        <RenovacoesPendentesCard
          items={renovacoesPendentes}
          isLoading={isLoadingRenovacoes}
          onItemClick={setSelectedRenovacaoItem}
        />
      </div>

      <CotacaoDetalheDialog
        cotacao={selectedCotacaoItem}
        open={!!selectedCotacaoItem}
        onClose={() => setSelectedCotacaoItem(null)}
      />
      <RenovacaoDetalheDialog
        renovacao={selectedRenovacaoItem}
        open={!!selectedRenovacaoItem}
        onClose={() => setSelectedRenovacaoItem(null)}
      />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function VendedorKpiCard({
  title,
  isLoading,
  className,
  children,
}: {
  title: string;
  isLoading: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn('shadow-sm py-0 gap-0', className)}>
      <CardContent className="px-4 pt-3 pb-3">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
          {title}
        </p>
        {isLoading ? <div className="h-6 w-20 animate-pulse rounded bg-muted" /> : children}
      </CardContent>
    </Card>
  );
}

function getNomeCliente(item: any): string {
  return item.cliente?.tipoPessoa === 'PF'
    ? item.cliente?.nome || 'Sem cliente'
    : item.cliente?.razaoSocial || 'Sem cliente';
}

function CotacoesAtivasCard({
  items,
  isLoading,
  onItemClick,
}: {
  items: any[];
  isLoading: boolean;
  onItemClick: (item: any) => void;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Card className="py-0 gap-0 flex flex-col">
      <CardHeader className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleDot className="size-4 text-green-500" />
            <CardTitle className="text-base font-semibold">Cotações Ativas</CardTitle>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300">
            {items.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 flex flex-col flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma cotação ativa</p>
        ) : (
          <>
            <div className="space-y-0.5" style={{ minHeight: PAGE_SIZE * ROW_HEIGHT_DEFAULT }}>
              {pageItems.map((cotacao: any) => (
                <div
                  key={cotacao.id}
                  className="flex items-center justify-between px-2 py-2.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onItemClick(cotacao)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getNomeCliente(cotacao)}</p>
                    <p className="text-xs text-muted-foreground">
                      {cotacao.produto?.nomeProduto ?? cotacao.itemDescricao ?? '-'} ·{' '}
                      {dayjs(cotacao.updatedAt).fromNow()}
                    </p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-semibold">
                      {cotacao.premioLiquido ? formatCurrencyCompact(parseFloat(cotacao.premioLiquido)) : '-'}
                    </p>
                    <Badge variant={getStatusBadgeVariant(cotacao.status)} className="text-[10px]">
                      {getStatusLabel(cotacao.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 px-2 mt-auto border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  {page + 1} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-6" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-6" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CotacoesParadasCard({
  items,
  isLoading,
  onItemClick,
}: {
  items: any[];
  isLoading: boolean;
  onItemClick: (item: any) => void;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalRisco = items.reduce((sum: number, c: any) => sum + (parseFloat(c.premioLiquido) || 0), 0);

  return (
    <Card className={cn('py-0 gap-0 flex flex-col', items.length > 0 && 'border-red-200 dark:border-red-800')}>
      <CardHeader className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleDot className="size-4 text-red-500" />
            <CardTitle className="text-base font-semibold">Cotações Paradas</CardTitle>
          </div>
          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {items.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 flex flex-col flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma cotação parada</p>
        ) : (
          <>
            <div className="space-y-0.5" style={{ minHeight: PAGE_SIZE * ROW_HEIGHT_PARADAS }}>
              {pageItems.map((cotacao: any) => {
                const diasParada = dayjs().diff(dayjs(cotacao.updatedAt), 'day');
                return (
                  <div
                    key={cotacao.id}
                    className="flex items-center justify-between px-2 py-2.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onItemClick(cotacao)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getNomeCliente(cotacao)}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                        Parada há {diasParada} dias <AlertTriangle className="size-3" />
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {cotacao.produto?.nomeProduto ?? cotacao.itemDescricao ?? '-'}
                      </p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold">
                        {cotacao.premioLiquido ? formatCurrencyCompact(parseFloat(cotacao.premioLiquido)) : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cotacao.produto?.tipoSeguro ?? '-'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto pt-3 border-t border-border/50 px-2 space-y-2">
              {totalRisco > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Total em risco: {formatCurrency(totalRisco)}
                </p>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{page + 1} de {totalPages}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-6" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-6" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RenovacoesPendentesCard({
  items,
  isLoading,
  onItemClick,
}: {
  items: any[];
  isLoading: boolean;
  onItemClick: (item: any) => void;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Card className={cn('py-0 gap-0 flex flex-col', items.length > 0 && 'border-amber-200 dark:border-amber-800')}>
      <CardHeader className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleDot className="size-4 text-amber-500" />
            <CardTitle className="text-base font-semibold">Renovações Pendentes</CardTitle>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            {items.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 flex flex-col flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma renovação pendente</p>
        ) : (
          <>
            <div className="space-y-0.5" style={{ minHeight: PAGE_SIZE * ROW_HEIGHT_DEFAULT }}>
              {pageItems.map((renovacao: any) => {
                const nomeCliente =
                  renovacao.cliente?.tipoPessoa === 'PF'
                    ? renovacao.cliente?.nome
                    : renovacao.cliente?.razaoSocial;
                const diasVencimento = dayjs(renovacao.dataVencimento).diff(dayjs(), 'day');
                const vencida = diasVencimento < 0;
                return (
                  <div
                    key={renovacao.id}
                    className="flex items-center justify-between px-2 py-2.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onItemClick(renovacao)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {nomeCliente || renovacao.itemDescricao || 'Sem cliente'}
                      </p>
                      <p
                        className={cn(
                          'text-xs font-medium flex items-center gap-1',
                          vencida
                            ? 'text-red-600 dark:text-red-400'
                            : diasVencimento <= 7
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-muted-foreground',
                        )}
                      >
                        {(vencida || diasVencimento <= 7) && <AlertTriangle className="size-3" />}
                        {vencida
                          ? `Venceu há ${Math.abs(diasVencimento)} dias`
                          : `Vence em ${diasVencimento} dias`}
                      </p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold">
                        {renovacao.premioAnterior
                          ? formatCurrencyCompact(parseFloat(renovacao.premioAnterior))
                          : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[80px]">
                        {renovacao.produtoDescricao ?? renovacao.produto?.nomeProduto ?? '-'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50 px-2">
                <span className="text-xs text-muted-foreground">{page + 1} de {totalPages}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-6" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-6" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
