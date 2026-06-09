
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/core/ui/tooltip';
import {
  Trophy,
  Loader2,
  Medal,
  Crown,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { dayjs } from '@/core/utils/date-utils';
import { cn } from '@/core/utils';
import { getIniciais, formatCurrency, formatCurrencyCompact } from './metricas-utils';

type VendedorEnriquecido = {
  vendedorId: string;
  vendedorNome: string;
  totalPremio: number;
  totalComissao: number;
  count: number;
  equipeNome?: string | null;
  avatarUrl: string | null;
  renovacoesTotal?: number;
  renovacoesFechadas?: number;
};

type CotacaoParadaVendedor = {
  vendedorId: string;
  vendedorNome: string | null;
  count: number;
};

export function RankingVendedores({
  vendedores,
  cotacoesParadasPorVendedor,
  renovacoesVencidasPorVendedor,
  isLoading,
  dataInicio,
  dataFim,
  onVendedorClick,
}: {
  vendedores: VendedorEnriquecido[];
  cotacoesParadasPorVendedor: CotacaoParadaVendedor[];
  renovacoesVencidasPorVendedor: CotacaoParadaVendedor[];
  isLoading: boolean;
  dataInicio: string;
  dataFim: string;
  onVendedorClick: (vendedorId: string, vendedorNome: string) => void;
}) {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(vendedores.length / PAGE_SIZE);
  const paginatedVendedores = vendedores.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold">
              Ranking de Vendedores
            </CardTitle>
            <Badge variant="outline" className="font-normal">
              {dayjs(dataInicio).format('MMM YYYY') === dayjs(dataFim).format('MMM YYYY')
                ? dayjs(dataInicio).format('MMMM [de] YYYY')
                : `${dayjs(dataInicio).format('MMM YYYY')} - ${dayjs(dataFim).format('MMM YYYY')}`}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            Clique para ver detalhes <Info className="size-3" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : vendedores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="size-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">
              Nenhuma venda encontrada no período selecionado
            </p>
          </div>
        ) : (
          <>
          {/* Mobile: card-stack (sm e abaixo) */}
          <div className="sm:hidden space-y-2">
            {paginatedVendedores.map((vendedor, index) => {
              const posicao = page * PAGE_SIZE + index + 1;
              const cotParadas = cotacoesParadasPorVendedor.find((c) => c.vendedorId === vendedor.vendedorId)?.count ?? 0;
              const renVencidas = renovacoesVencidasPorVendedor.find((r) => r.vendedorId === vendedor.vendedorId)?.count ?? 0;
              return (
                <div
                  key={vendedor.vendedorId}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onVendedorClick(vendedor.vendedorId, vendedor.vendedorNome)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-center">
                      {posicao === 1 ? <Crown className="size-4 text-yellow-500 mx-auto" /> :
                       posicao === 2 ? <Medal className="size-4 text-gray-400 mx-auto" /> :
                       posicao === 3 ? <Medal className="size-4 text-amber-600 mx-auto" /> :
                       <span className="text-xs font-bold text-muted-foreground">{posicao}</span>}
                    </div>
                    <Avatar className="size-8">
                      {vendedor.avatarUrl && <AvatarImage src={vendedor.avatarUrl} alt={vendedor.vendedorNome} />}
                      <AvatarFallback className="text-xs font-semibold">{getIniciais(vendedor.vendedorNome)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm leading-tight">{vendedor.vendedorNome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {renVencidas > 0 && (
                          <span className="text-[10px] text-red-600 flex items-center gap-0.5">
                            <AlertTriangle className="size-3" />{renVencidas} ren.
                          </span>
                        )}
                        {cotParadas > 0 && (
                          <span className="text-[10px] text-amber-600">{cotParadas} cot. paradas</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrencyCompact(vendedor.totalPremio)}</p>
                    <p className="text-[10px] text-muted-foreground">{vendedor.count} docs</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: tabela (sm e acima) */}
          <div className="hidden sm:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>VENDEDOR</TableHead>
                  <TableHead className="text-right">PRÊMIO</TableHead>
                  <TableHead className="text-center hidden md:table-cell">COTAÇÕES</TableHead>
                  <TableHead className="text-center hidden md:table-cell">RENOVAÇÕES</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">CONVERSÃO</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">COMISSÃO</TableHead>
                  <TableHead className="text-center hidden xl:table-cell">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVendedores.map((vendedor, index) => {
                  const posicao = page * PAGE_SIZE + index + 1;
                  const cotParadas =
                    cotacoesParadasPorVendedor.find((c) => c.vendedorId === vendedor.vendedorId)
                      ?.count ?? 0;
                  const renVencidas =
                    renovacoesVencidasPorVendedor.find((r) => r.vendedorId === vendedor.vendedorId)
                      ?.count ?? 0;
                  const comissaoPercent =
                    vendedor.totalPremio > 0
                      ? (vendedor.totalComissao / vendedor.totalPremio) * 100
                      : 0;

                  const renovacoesTotal = vendedor.renovacoesTotal ?? 0;
                  const renovacoesFechadas = vendedor.renovacoesFechadas ?? 0;
                  const taxaConversao = renovacoesTotal > 0
                    ? (renovacoesFechadas / renovacoesTotal) * 100
                    : null;

                  let statusLabel = 'Bom';
                  let statusColor = 'text-blue-600 bg-blue-50 dark:bg-blue-950/50';
                  if (comissaoPercent >= 20) {
                    statusLabel = 'Ótimo';
                    statusColor = 'text-green-600 bg-green-50 dark:bg-green-950/50';
                  }
                  if (cotParadas > 3 || renVencidas > 3) {
                    statusLabel = 'Atenção';
                    statusColor = 'text-red-600 bg-red-50 dark:bg-red-950/50';
                  } else if (cotParadas > 0 || renVencidas > 0) {
                    statusLabel = 'Regular';
                    statusColor = 'text-amber-600 bg-amber-50 dark:bg-amber-950/50';
                  }

                  return (
                    <TableRow
                      key={vendedor.vendedorId}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onVendedorClick(vendedor.vendedorId, vendedor.vendedorNome)}
                    >
                      <TableCell className="text-center">
                        {posicao === 1 ? (
                          <Crown className="size-5 text-yellow-500 mx-auto" />
                        ) : posicao === 2 ? (
                          <Medal className="size-5 text-gray-400 mx-auto" />
                        ) : posicao === 3 ? (
                          <Medal className="size-5 text-amber-600 mx-auto" />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">
                            {posicao}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            {vendedor.avatarUrl && (
                              <AvatarImage src={vendedor.avatarUrl} alt={vendedor.vendedorNome} />
                            )}
                            <AvatarFallback
                              className={cn(
                                'text-xs font-semibold',
                                posicao === 1 &&
                                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                                posicao === 2 &&
                                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                                posicao === 3 &&
                                  'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                              )}
                            >
                              {getIniciais(vendedor.vendedorNome)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{vendedor.vendedorNome}</p>
                            {vendedor.equipeNome && (
                              <p className="text-xs text-muted-foreground">
                                {vendedor.equipeNome}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-bold text-sm cursor-default underline decoration-dotted underline-offset-2 decoration-muted-foreground/50">
                              {formatCurrencyCompact(vendedor.totalPremio)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="space-y-1 text-xs">
                            <p className="font-semibold">{formatCurrency(vendedor.totalPremio)}</p>
                            <p className="text-muted-foreground">{vendedor.count} documentos</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm cursor-default underline decoration-dotted underline-offset-2 decoration-muted-foreground/50">
                              {vendedor.count}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p>{vendedor.count} cotações no período</p>
                            {cotParadas > 0 && (
                              <p className="text-amber-400">{cotParadas} paradas há mais de 7 dias</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">
                              {renVencidas > 0 ? (
                                <span className="text-sm text-red-600 dark:text-red-400 font-medium flex items-center justify-center gap-1 underline decoration-dotted underline-offset-2 decoration-red-400/50">
                                  {renVencidas} <AlertTriangle className="size-3" />
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {renVencidas > 0 ? (
                              <p className="text-red-400">{renVencidas} renovações com prazo vencido</p>
                            ) : (
                              <p>Nenhuma renovação vencida</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn(
                              'text-sm font-medium cursor-default underline decoration-dotted underline-offset-2 decoration-muted-foreground/50',
                              taxaConversao !== null && taxaConversao >= 75
                                ? 'text-green-600 dark:text-green-400'
                                : taxaConversao !== null && taxaConversao >= 50
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : taxaConversao !== null
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-muted-foreground',
                            )}>
                              {taxaConversao !== null ? `${taxaConversao.toFixed(0)}%` : '-'}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {taxaConversao !== null
                              ? <p>{renovacoesFechadas} renovadas de {renovacoesTotal} no período</p>
                              : <p>Sem renovações no período</p>
                            }
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn(
                              'text-sm font-medium cursor-default underline decoration-dotted underline-offset-2 decoration-muted-foreground/50',
                              comissaoPercent >= 18
                                ? 'text-green-600 dark:text-green-400'
                                : comissaoPercent >= 12
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-muted-foreground',
                            )}>
                              {comissaoPercent.toFixed(1)}%
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p>Total: {formatCurrency(vendedor.totalComissao)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center hidden xl:table-cell">
                        <Badge
                          variant="outline"
                          className={cn('text-xs font-medium', statusColor)}
                        >
                          {statusLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages} &mdash; {vendedores.length} vendedores
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
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
  );
}
