import { createFileRoute } from '@tanstack/react-router';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Award,
  Calendar,
  Loader2,
  Medal,
  Crown,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Calendar as CalendarComponent } from '@/core/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import { dayjs } from '@/core/utils/date-utils';
import { cn } from '@/core/utils';
import { useEquipes } from '@/modules/equipes/http';
import { PageGuard } from '@/modules/auth/components/page-guard';

export const Route = createFileRoute('/_app/performance')({
  component: PerformancePage,
});


type PeriodoPreset =
  | 'mes_atual'
  | '3_meses'
  | '6_meses'
  | '12_meses'
  | 'personalizado';

function PerformancePage() {
  const [, startTransition] = useTransition();
  const [periodoPreset, setPeriodoPreset] =
    useState<PeriodoPreset>('mes_atual');
  const [dataInicio, setDataInicio] = useState<Date>(dayjs().startOf('month').toDate());
  const [dataFim, setDataFim] = useState<Date>(dayjs().endOf('month').toDate());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFiltros, setShowFiltros] = useState(true);
  const [equipeIdFiltro, setEquipeIdFiltro] = useState<string>('todas');

  // Buscar avatares e equipeId dos usuários
  const { data: usuariosInfo = {} } = useQuery<Record<string, { avatarUrl: string | null; equipeId: string | null }>>({
    queryKey: ['usuarios-info'],
    queryFn: async () => {
      try {
        const response = await api.get<any[]>('/users');
        const lista = Array.isArray(response) ? response : (response as any)?.data ?? [];
        return Object.fromEntries(
          lista.map((u: any) => [u.id, { avatarUrl: u.avatarUrl ?? null, equipeId: u.equipe?.id ?? null }]),
        );
      } catch {
        return {};
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const avatarMap = useMemo(
    () => Object.fromEntries(Object.entries(usuariosInfo).map(([id, info]) => [id, info.avatarUrl])),
    [usuariosInfo],
  );

  const { data: equipesData } = useEquipes({ limit: 100 });

  // Buscar documentos de venda para calcular performance
  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['performance-vendedores', dataInicio, dataFim],
    queryFn: async () => {
      try {
        const response = await api.get('/sales-documents', {
          params: {
            criadoApos: dataInicio.toISOString(),
            criadoAntes: dataFim.toISOString(),
          },
        });

        return Array.isArray(response)
          ? response
          : (response as any)?.data || [];
      } catch (error) {
        return [];
      }
    },
    retry: false,
  });

  // Aplicar período preset
  const aplicarPeriodoPreset = (preset: PeriodoPreset) => {
    startTransition(() => {
      setPeriodoPreset(preset);
      const hoje = new Date();

      switch (preset) {
        case 'mes_atual':
          setDataInicio(dayjs(hoje).startOf('month').toDate());
          setDataFim(dayjs(hoje).endOf('month').toDate());
          break;
        case '3_meses':
          setDataInicio(dayjs(hoje).subtract(2, 'month').startOf('month').toDate());
          setDataFim(dayjs(hoje).endOf('month').toDate());
          break;
        case '6_meses':
          setDataInicio(dayjs(hoje).subtract(5, 'month').startOf('month').toDate());
          setDataFim(dayjs(hoje).endOf('month').toDate());
          break;
        case '12_meses':
          setDataInicio(dayjs(hoje).subtract(11, 'month').startOf('month').toDate());
          setDataFim(dayjs(hoje).endOf('month').toDate());
          break;
      }
    });
  };

  // Calcular métricas por vendedor
  const rankingVendedores = useMemo(() => {
    const equipeAtiva = equipeIdFiltro !== 'todas' ? equipeIdFiltro : null;
    const vendedoresMap = new Map<
      string,
      {
        id: string;
        nome: string;
        email?: string;
        totalPremio: number;
        quantidadeVendas: number;
        comissaoTotal: number;
        somaPercentualComissao: number;
        countComissao: number;
      }
    >();

    documentos.forEach((doc: any) => {
      if (!doc.vendedor?.id) return;
      if (equipeAtiva && usuariosInfo[doc.vendedor.id]?.equipeId !== equipeAtiva) return;

      const vendedorId = doc.vendedor.id;
      const premio = doc.premioLiquido ? parseFloat(doc.premioLiquido) : 0;
      const comissao = doc.valorComissao ? parseFloat(doc.valorComissao) : 0;
      const percentualComissao = doc.percentualComissao
        ? parseFloat(doc.percentualComissao)
        : 0;

      if (!vendedoresMap.has(vendedorId)) {
        vendedoresMap.set(vendedorId, {
          id: vendedorId,
          nome: doc.vendedor.nome || 'Sem nome',
          email: doc.vendedor.email,
          totalPremio: 0,
          quantidadeVendas: 0,
          comissaoTotal: 0,
          somaPercentualComissao: 0,
          countComissao: 0,
        });
      }

      const vendedor = vendedoresMap.get(vendedorId)!;
      vendedor.totalPremio += premio;
      vendedor.quantidadeVendas += 1;
      vendedor.comissaoTotal += comissao;

      if (percentualComissao > 0) {
        vendedor.somaPercentualComissao += percentualComissao;
        vendedor.countComissao += 1;
      }
    });

    // Ordenar por total de prêmio (decrescente)
    return Array.from(vendedoresMap.values()).sort(
      (a, b) => b.totalPremio - a.totalPremio,
    );
  }, [documentos, equipeIdFiltro, usuariosInfo]);

  // Calcular KPIs gerais
  const kpis = useMemo(() => {
    const totalPremio = rankingVendedores.reduce(
      (sum, v) => sum + v.totalPremio,
      0,
    );
    const totalVendas = rankingVendedores.reduce(
      (sum, v) => sum + v.quantidadeVendas,
      0,
    );
    const ticketMedio = totalVendas > 0 ? totalPremio / totalVendas : 0;
    const totalVendedores = rankingVendedores.length;

    return {
      totalPremio,
      totalVendas,
      ticketMedio,
      totalVendedores,
    };
  }, [rankingVendedores]);

  const getIniciais = (nome: string) => {
    const partes = nome.split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  const getMedalIcon = (posicao: number) => {
    if (posicao === 1) return <Crown className="size-6 text-yellow-500" />;
    if (posicao === 2) return <Medal className="size-6 text-gray-400" />;
    if (posicao === 3) return <Medal className="size-6 text-amber-600" />;
    return null;
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      // Adicionar classe ao body para esconder sidebar
      document.body.classList.add('hide-sidebar');
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
      // Remover classe do body
      document.body.classList.remove('hide-sidebar');
    }
  };

  // Detectar quando sai do fullscreen pelo ESC
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      // Sincronizar classe do body com estado de fullscreen
      if (isNowFullscreen) {
        document.body.classList.add('hide-sidebar');
      } else {
        document.body.classList.remove('hide-sidebar');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      // Limpar classe ao desmontar
      document.body.classList.remove('hide-sidebar');
    };
  }, []);

  return (
    <PageGuard permission="performance:visualizar">
    <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="size-6 sm:size-8 text-yellow-500 shrink-0" />
            <span className="truncate">Performance de Vendedores</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Ranking e métricas de desempenho da equipe
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="gap-2 w-full sm:w-auto"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="size-4" />
              Sair Tela Cheia
            </>
          ) : (
            <>
              <Maximize2 className="size-4" />
              Tela Cheia
            </>
          )}
        </Button>
      </div>

      {/* Filtros de Período - Oculto visualmente em tela cheia */}
      <Card className={cn(isFullscreen && 'hidden')}>
        <CardHeader
          className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg"
          onClick={() => setShowFiltros(!showFiltros)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Período de Análise
                {showFiltros ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </CardTitle>
              <CardDescription>
                {showFiltros
                  ? 'Selecione o período para visualizar a performance'
                  : `${dayjs(dataInicio).format('DD/MM/YYYY')} até ${dayjs(dataFim).format('DD/MM/YYYY')}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {showFiltros && (
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={periodoPreset === 'mes_atual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => aplicarPeriodoPreset('mes_atual')}
              >
                Mês Atual
              </Button>
              <Button
                variant={periodoPreset === '3_meses' ? 'default' : 'outline'}
                size="sm"
                onClick={() => aplicarPeriodoPreset('3_meses')}
              >
                Últimos 3 Meses
              </Button>
              <Button
                variant={periodoPreset === '6_meses' ? 'default' : 'outline'}
                size="sm"
                onClick={() => aplicarPeriodoPreset('6_meses')}
              >
                Últimos 6 Meses
              </Button>
              <Button
                variant={periodoPreset === '12_meses' ? 'default' : 'outline'}
                size="sm"
                onClick={() => aplicarPeriodoPreset('12_meses')}
              >
                Últimos 12 Meses
              </Button>
            </div>

            {/* Filtro por Equipe */}
            {equipesData && equipesData.data.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Equipe</label>
                <Select value={equipeIdFiltro} onValueChange={(v) => startTransition(() => setEquipeIdFiltro(v))}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Todas as equipes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as equipes</SelectItem>
                    {equipesData.data.filter((e) => e.ativo).map((equipe) => (
                      <SelectItem key={equipe.id} value={equipe.id}>
                        {equipe.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {/* Data Início */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Início</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dataInicio && 'text-muted-foreground',
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dataInicio ? (
                        dayjs(dataInicio).format('DD/MM/YYYY')
                      ) : (
                        <span>Selecione</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-32px)] sm:w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataInicio}
                      onSelect={(date) => {
                        if (date) startTransition(() => {
                          setDataInicio(date);
                          setPeriodoPreset('personalizado');
                        });
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Data Fim */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Fim</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dataFim && 'text-muted-foreground',
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dataFim ? (
                        dayjs(dataFim).format('DD/MM/YYYY')
                      ) : (
                        <span>Selecione</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-32px)] sm:w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataFim}
                      onSelect={(date) => {
                        if (date) startTransition(() => {
                          setDataFim(date);
                          setPeriodoPreset('personalizado');
                        });
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* KPIs Gerais - Compactos */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  Total em Prêmios
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400 truncate">
                  {kpis.totalPremio.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  Total de Vendas
                </p>
                <p className="text-xl font-bold truncate">{kpis.totalVendas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  Ticket Médio
                </p>
                <p className="text-xl font-bold truncate">
                  {kpis.ticketMedio.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  Vendedores Ativos
                </p>
                <p className="text-xl font-bold truncate">
                  {kpis.totalVendedores}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Vendedores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="size-5 text-yellow-500" />
            Ranking de Vendedores
          </CardTitle>
          <CardDescription>
            Top performers ordenados por total de prêmios produzidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : rankingVendedores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Trophy className="size-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                Nenhuma venda encontrada no período selecionado
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rankingVendedores.map((vendedor, index) => {
                const posicao = index + 1;
                const ticketMedio =
                  vendedor.totalPremio / vendedor.quantidadeVendas;
                const mediaComissao =
                  vendedor.countComissao > 0
                    ? vendedor.somaPercentualComissao / vendedor.countComissao
                    : 0;
                const medalIcon = getMedalIcon(posicao);
                const isTop3 = posicao <= 3;

                return (
                  <div
                    key={vendedor.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-all',
                      posicao === 1 &&
                        'bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-950/30 border-yellow-300 dark:border-yellow-700 shadow-sm',
                      posicao === 2 &&
                        'bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-950/30 border-slate-300 dark:border-slate-700',
                      posicao === 3 &&
                        'bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/30 border-amber-300 dark:border-amber-700',
                      posicao > 3 &&
                        'bg-card hover:bg-muted/30 border-border/50',
                    )}
                  >
                    {/* Posição */}
                    <div className="flex items-center justify-center w-10 shrink-0">
                      {medalIcon || (
                        <span className="text-lg font-bold text-muted-foreground/70">
                          #{posicao}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar
                      className={cn('shrink-0', isTop3 ? 'size-11' : 'size-9')}
                    >
                      {avatarMap[vendedor.id] && (
                        <AvatarImage src={avatarMap[vendedor.id]!} alt={vendedor.nome} />
                      )}
                      <AvatarFallback
                        className={cn(
                          'font-semibold',
                          isTop3 ? 'text-sm' : 'text-xs',
                          posicao === 1 &&
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                          posicao === 2 &&
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                          posicao === 3 &&
                            'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                        )}
                      >
                        {getIniciais(vendedor.nome)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Nome do Vendedor */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={cn(
                          'font-semibold truncate',
                          isTop3 ? 'text-base' : 'text-sm',
                        )}
                      >
                        {vendedor.nome}
                      </h3>
                    </div>

                    {/* Métricas - Layout responsivo */}
                    <div className="hidden sm:flex items-center gap-6 text-right">
                      <div className="min-w-[100px]">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                          Prêmios
                        </p>
                        <p
                          className={cn(
                            'font-bold text-green-600 dark:text-green-400',
                            isTop3 ? 'text-base' : 'text-sm',
                          )}
                        >
                          {vendedor.totalPremio.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                      <div className="min-w-[50px]">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                          Vendas
                        </p>
                        <p
                          className={cn(
                            'font-bold',
                            isTop3 ? 'text-base' : 'text-sm',
                          )}
                        >
                          {vendedor.quantidadeVendas}
                        </p>
                      </div>
                      <div className="min-w-[80px] hidden md:block">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                          Ticket
                        </p>
                        <p
                          className={cn(
                            'font-bold',
                            isTop3 ? 'text-base' : 'text-sm',
                          )}
                        >
                          {ticketMedio.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                      <div className="min-w-[60px] hidden lg:block">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                          Comissão
                        </p>
                        <p
                          className={cn(
                            'font-bold text-purple-600 dark:text-purple-400',
                            isTop3 ? 'text-base' : 'text-sm',
                          )}
                        >
                          {mediaComissao.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Valor principal em mobile */}
                    <div className="sm:hidden text-right">
                      <p className="font-bold text-green-600 dark:text-green-400 text-sm">
                        {vendedor.totalPremio.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          maximumFractionDigits: 0,
                        })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {vendedor.quantidadeVendas} vendas
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </PageGuard>
  );
}
