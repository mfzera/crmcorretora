
import {
  DollarSign,
  Percent,
  Kanban,
  Users,
  RefreshCw,
  FileEdit,
  Trophy,
  Building2,
  Handshake,
  TrendingUp,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { MetricaCard } from './metrica-card';
import { MetricasGraficos } from './metricas-graficos';
import { type MetricasResumo } from '../http';
import { cn } from '@/core/utils';

type Props = {
  metricas: MetricasResumo | undefined;
  isLoading: boolean;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-3.5 rounded-full bg-primary" />
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </h3>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="rounded-xl border border-dashed p-4">
        <Icon className="size-5 text-muted-foreground/40" />
      </div>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

const TABS = [
  { value: 'vendas', label: 'Vendas', icon: DollarSign },
  { value: 'comissoes', label: 'Comissões', icon: Percent },
  { value: 'pipeline', label: 'Pipeline', icon: Kanban },
  { value: 'clientes', label: 'Clientes', icon: Users },
  { value: 'renovacoes', label: 'Renovações', icon: RefreshCw },
  { value: 'endossos', label: 'Endossos', icon: FileEdit },
  { value: 'seguradoras', label: 'Seguradoras', icon: Building2 },
  { value: 'negocio-corretora', label: 'N. Corretora', icon: Handshake },
  { value: 'ranking', label: 'Ranking', icon: Trophy },
];

const TH = 'text-left px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground';
const TH_RIGHT = 'text-right px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground';

export function MetricasTabs({ metricas, isLoading }: Props) {
  return (
    <Tabs defaultValue="vendas" className="space-y-0">
      <div className="border-b overflow-x-auto scrollbar-none">
        <TabsList className="h-9 rounded-none bg-transparent p-0 gap-0 w-max min-w-full">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'h-full px-4 rounded-none border-b-2 border-transparent',
                'text-xs font-medium gap-1.5 whitespace-nowrap',
                'text-muted-foreground hover:text-foreground',
                'data-[state=active]:border-primary data-[state=active]:text-foreground',
                'data-[state=active]:bg-transparent transition-none',
              )}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Vendas */}
      <TabsContent value="vendas" className="space-y-6 pt-6">
        <div>
          <SectionTitle>Prêmio Líquido</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricaCard
              titulo="Total em Prêmios"
              valor={metricas ? formatCurrency(metricas.premioLiquido.resumo.total) : 'R$ 0,00'}
              subtitulo={`${metricas?.premioLiquido.resumo.count || 0} documentos`}
              icone={DollarSign}
              corIcone="text-green-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Prêmio Médio"
              valor={metricas ? formatCurrency(metricas.premioLiquido.resumo.media) : 'R$ 0,00'}
              subtitulo="Por documento"
              icone={TrendingUp}
              corIcone="text-blue-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Maior Prêmio"
              valor={metricas ? formatCurrency(metricas.premioLiquido.resumo.maior) : 'R$ 0,00'}
              icone={DollarSign}
              corIcone="text-emerald-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Menor Prêmio"
              valor={metricas ? formatCurrency(metricas.premioLiquido.resumo.menor) : 'R$ 0,00'}
              icone={DollarSign}
              corIcone="text-gray-600"
              isLoading={isLoading}
            />
          </div>
        </div>
        {metricas?.premioLiquido.porStatus && (
          <div>
            <SectionTitle>Prêmio por Status</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              {metricas.premioLiquido.porStatus.map((status) => (
                <MetricaCard
                  key={status.status}
                  titulo={formatEnumLabel(status.status)}
                  valor={formatCurrency(Number(status.total))}
                  subtitulo={`${status.count} documentos`}
                  icone={DollarSign}
                  corIcone={
                    status.status === 'ATIVO'
                      ? 'text-green-600'
                      : status.status === 'CANCELADO'
                        ? 'text-red-600'
                        : 'text-gray-600'
                  }
                  isLoading={isLoading}
                />
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* Comissões */}
      <TabsContent value="comissoes" className="space-y-6 pt-6">
        <div>
          <SectionTitle>Comissões</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricaCard
              titulo="Total em Comissões"
              valor={metricas ? formatCurrency(metricas.comissao.resumo.totalComissao) : 'R$ 0,00'}
              icone={Percent}
              corIcone="text-purple-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Comissão Média"
              valor={metricas ? formatCurrency(metricas.comissao.resumo.mediaComissao) : 'R$ 0,00'}
              subtitulo="Por documento"
              icone={Percent}
              corIcone="text-indigo-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Negócios Corretora"
              valor={metricas ? formatCurrency(metricas.comissao.resumo.totalCorretora) : 'R$ 0,00'}
              subtitulo={`${metricas?.comissao.resumo.countNegocioCorretora || 0} documentos compartilhados`}
              icone={Handshake}
              corIcone="text-orange-600"
              isLoading={isLoading}
            />
          </div>
        </div>
      </TabsContent>

      {/* Pipeline */}
      <TabsContent value="pipeline" className="space-y-6 pt-6">
        <div>
          <SectionTitle>Pipeline de Oportunidades</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <MetricaCard
              titulo="Total de Oportunidades"
              valor={
                metricas
                  ? metricas.kanban.porStatus.reduce((acc, s) => acc + Number(s.count), 0)
                  : 0
              }
              subtitulo={`Prêmio estimado: ${
                metricas
                  ? formatCurrency(metricas.kanban.porStatus.reduce((acc, s) => acc + Number(s.premioEstimado), 0))
                  : 'R$ 0,00'
              }`}
              icone={Kanban}
              corIcone="text-cyan-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Fechado em Ganho"
              valor={metricas?.kanban.porStatus.find((s) => s.status === 'ganha')?.count || 0}
              subtitulo={`Valor fechado: ${
                metricas
                  ? formatCurrency(Number(metricas.kanban.porStatus.find((s) => s.status === 'ganha')?.valorFechado ?? 0))
                  : 'R$ 0,00'
              }`}
              icone={Trophy}
              corIcone="text-green-500"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Urgentes"
              valor={metricas?.kanban.porPrioridade.find((p) => p.prioridade === 'urgente')?.count || 0}
              subtitulo="Prioridade urgente"
              icone={Kanban}
              corIcone="text-red-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Leads Quentes"
              valor={metricas?.kanban.porTemperatura.find((t) => t.temperatura === 'quente')?.count || 0}
              subtitulo="Alta chance de conversão"
              icone={Kanban}
              corIcone="text-orange-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Leads Frios"
              valor={metricas?.kanban.porTemperatura.find((t) => t.temperatura === 'frio')?.count || 0}
              subtitulo="Requerem atenção"
              icone={Kanban}
              corIcone="text-blue-400"
              isLoading={isLoading}
            />
          </div>
        </div>
        <div>
          <SectionTitle>Visualizações</SectionTitle>
          <MetricasGraficos metricas={metricas} isLoading={isLoading} />
        </div>
      </TabsContent>

      {/* Clientes */}
      <TabsContent value="clientes" className="space-y-6 pt-6">
        <div>
          <SectionTitle>Cadastros de Clientes</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricaCard
              titulo="Total de Clientes"
              valor={metricas?.cadastro.totalClientes || 0}
              icone={Users}
              corIcone="text-teal-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Clientes Ativos"
              valor={metricas?.cadastro.clientesAtivos || 0}
              subtitulo={`${
                metricas
                  ? ((metricas.cadastro.clientesAtivos / (metricas.cadastro.totalClientes || 1)) * 100).toFixed(1)
                  : 0
              }% do total`}
              icone={Users}
              corIcone="text-green-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Pessoa Física"
              valor={metricas?.cadastro.clientesPF || 0}
              subtitulo="Clientes PF"
              icone={Users}
              corIcone="text-blue-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Pessoa Jurídica"
              valor={metricas?.cadastro.clientesPJ || 0}
              subtitulo="Clientes PJ"
              icone={Users}
              corIcone="text-purple-600"
              isLoading={isLoading}
            />
          </div>
        </div>
      </TabsContent>

      {/* Renovações */}
      <TabsContent value="renovacoes" className="space-y-6 pt-6">
        <div>
          <SectionTitle>Renovações</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricaCard
              titulo="Total de Renovações"
              valor={metricas?.renovacao.resumo.total || 0}
              icone={RefreshCw}
              corIcone="text-violet-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Renovadas"
              valor={metricas?.renovacao.resumo.renovados || 0}
              subtitulo={`Taxa: ${
                metricas
                  ? ((metricas.renovacao.resumo.renovados / (metricas.renovacao.resumo.total || 1)) * 100).toFixed(1)
                  : 0
              }%`}
              icone={RefreshCw}
              corIcone="text-green-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Em Andamento"
              valor={metricas?.renovacao.resumo.emAndamento || 0}
              subtitulo="Requerem ação"
              icone={RefreshCw}
              corIcone="text-yellow-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Perdidas"
              valor={metricas?.renovacao.resumo.perdidos || 0}
              subtitulo="Não renovadas"
              icone={RefreshCw}
              corIcone="text-red-600"
              isLoading={isLoading}
            />
          </div>
        </div>
        {metricas?.renovacao.detalhado && (
          <div>
            <SectionTitle>Por Status</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              {metricas.renovacao.detalhado.map((status) => (
                <MetricaCard
                  key={status.status}
                  titulo={formatEnumLabel(status.status)}
                  valor={Number(status.count)}
                  subtitulo={`Prêmio novo: ${formatCurrency(Number(status.premioNovo))}`}
                  icone={RefreshCw}
                  corIcone="text-violet-600"
                  isLoading={isLoading}
                />
              ))}
            </div>
          </div>
        )}
        {metricas?.renovacao.porProduto && metricas.renovacao.porProduto.length > 0 && (
          <div>
            <SectionTitle>Prevista a Renovar por Produto</SectionTitle>
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className={TH}>Produto</th>
                    <th className={TH_RIGHT}>Quantidade</th>
                    <th className={TH_RIGHT}>Prêmio Anterior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metricas.renovacao.porProduto.map((item, index) => (
                    <tr
                      key={`${item.produto}-${index}`}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium">
                        {item.produto || 'Não informado'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                        {Number(item.count)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(Number(item.premioAnterior))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/10">
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Total
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold">
                      {metricas.renovacao.porProduto.reduce((acc, i) => acc + Number(i.count), 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                      {formatCurrency(
                        metricas.renovacao.porProduto.reduce((acc, i) => acc + Number(i.premioAnterior), 0),
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </TabsContent>

      {/* Endossos */}
      <TabsContent value="endossos" className="space-y-6 pt-6">
        <div>
          <SectionTitle>Endossos</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricaCard
              titulo="Total de Endossos"
              valor={metricas?.endosso.resumo.total || 0}
              icone={FileEdit}
              corIcone="text-amber-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Aprovados"
              valor={metricas?.endosso.resumo.aprovados || 0}
              subtitulo={`Taxa: ${
                metricas
                  ? ((metricas.endosso.resumo.aprovados / (metricas.endosso.resumo.total || 1)) * 100).toFixed(1)
                  : 0
              }%`}
              icone={FileEdit}
              corIcone="text-green-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Aguardando"
              valor={metricas?.endosso.resumo.solicitados || 0}
              subtitulo="Pendentes"
              icone={FileEdit}
              corIcone="text-yellow-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Recusados"
              valor={metricas?.endosso.resumo.recusados || 0}
              icone={FileEdit}
              corIcone="text-red-600"
              isLoading={isLoading}
            />
          </div>
        </div>
        {metricas?.endosso.detalhado && (
          <div>
            <SectionTitle>Por Tipo e Status</SectionTitle>
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className={TH}>Tipo</th>
                    <th className={TH}>Status</th>
                    <th className={TH_RIGHT}>Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metricas.endosso.detalhado.map((item, index) => (
                    <tr
                      key={`${item.tipo}-${item.status}-${index}`}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5">{item.tipo ? formatEnumLabel(item.tipo) : 'N/A'}</td>
                      <td className="px-4 py-2.5">{formatEnumLabel(item.status)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">{Number(item.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </TabsContent>

      {/* Seguradoras */}
      <TabsContent value="seguradoras" className="space-y-6 pt-6">
        <div>
          <SectionTitle>Métricas por Seguradora Parceira</SectionTitle>
          {metricas?.seguradoras.metricas && metricas.seguradoras.metricas.length > 0 ? (
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className={TH}>Seguradora</th>
                    <th className={TH_RIGHT}>Prêmio Total</th>
                    <th className={TH_RIGHT}>Comissão Total</th>
                    <th className={TH_RIGHT}>Comissão Média</th>
                    <th className={TH_RIGHT}>Documentos</th>
                    <th className={TH_RIGHT}>Clientes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metricas.seguradoras.metricas.map((seg) => (
                    <tr
                      key={seg.seguradoraParceiraId}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium">{seg.seguradoraNome || 'Sem Seguradora'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(Number(seg.totalPremio))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(Number(seg.totalComissao))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(Number(seg.mediaComissao))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{Number(seg.countDocumentos)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{Number(seg.countClientes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Building2} message="Nenhum dado de seguradoras disponível no período selecionado" />
          )}
        </div>
        {metricas?.seguradoras.clientes && metricas.seguradoras.clientes.length > 0 && (
          <div>
            <SectionTitle>Clientes por Seguradora</SectionTitle>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {metricas.seguradoras.clientes.map((seg) => (
                <MetricaCard
                  key={seg.seguradoraParceiraId}
                  titulo={seg.seguradoraNome || 'Sem Seguradora'}
                  valor={Number(seg.countClientes)}
                  subtitulo={`PF: ${seg.countClientesPF} | PJ: ${seg.countClientesPJ}`}
                  icone={Building2}
                  corIcone="text-blue-600"
                  isLoading={isLoading}
                />
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* Negócio Corretora */}
      <TabsContent value="negocio-corretora" className="space-y-6 pt-6">
        <div>
          <SectionTitle>Resumo Negócio Corretora</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <MetricaCard
              titulo="Total de Documentos"
              valor={metricas?.negocioCorretora.resumo.totalDocumentos || 0}
              icone={Handshake}
              corIcone="text-purple-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Prêmio Total"
              valor={metricas ? formatCurrency(metricas.negocioCorretora.resumo.totalPremio) : 'R$ 0,00'}
              icone={DollarSign}
              corIcone="text-green-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Comissão Vendedor"
              valor={metricas ? formatCurrency(metricas.negocioCorretora.resumo.totalComissaoVendedor) : 'R$ 0,00'}
              icone={Percent}
              corIcone="text-blue-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="Comissão Corretora"
              valor={metricas ? formatCurrency(metricas.negocioCorretora.resumo.totalComissaoCorretora) : 'R$ 0,00'}
              icone={Percent}
              corIcone="text-orange-600"
              isLoading={isLoading}
            />
            <MetricaCard
              titulo="% Médio Corretora"
              valor={
                metricas
                  ? `${Number(metricas.negocioCorretora.resumo.mediaPercentualCorretora).toFixed(2)}%`
                  : '0%'
              }
              subtitulo="Percentual médio"
              icone={TrendingUp}
              corIcone="text-indigo-600"
              isLoading={isLoading}
            />
          </div>
        </div>
        {metricas?.negocioCorretora.porSeguradora && metricas.negocioCorretora.porSeguradora.length > 0 && (
          <div>
            <SectionTitle>Negócio Corretora por Seguradora</SectionTitle>
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className={TH}>Seguradora</th>
                    <th className={TH_RIGHT}>Documentos</th>
                    <th className={TH_RIGHT}>Prêmio Total</th>
                    <th className={TH_RIGHT}>Comissão Corretora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metricas.negocioCorretora.porSeguradora.map((seg) => (
                    <tr
                      key={seg.seguradoraParceiraId}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium">{seg.seguradoraNome || 'Sem Seguradora'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{Number(seg.countDocumentos)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(Number(seg.totalPremio))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(Number(seg.totalComissaoCorretora))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </TabsContent>

      {/* Ranking */}
      <TabsContent value="ranking" className="space-y-6 pt-6">
        {metricas?.topVendedores && metricas.topVendedores.length > 0 ? (
          <div>
            <SectionTitle>Top 10 Vendedores</SectionTitle>
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground w-10">#</th>
                    <th className={TH}>Vendedor</th>
                    <th className={TH_RIGHT}>Prêmio Total</th>
                    <th className={TH_RIGHT}>Comissão Total</th>
                    <th className={TH_RIGHT}>Documentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metricas.topVendedores.map((vendedor, index) => (
                    <tr
                      key={vendedor.vendedorId}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold tabular-nums',
                            index === 0 && 'bg-amber-400/20 text-amber-600',
                            index === 1 && 'bg-slate-400/20 text-slate-500',
                            index === 2 && 'bg-orange-500/20 text-orange-600',
                            index >= 3 && 'text-muted-foreground/50',
                          )}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium">{vendedor.vendedorNome}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(Number(vendedor.totalPremio))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(Number(vendedor.totalComissao))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{Number(vendedor.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState icon={Trophy} message="Nenhum dado de vendedores disponível no período selecionado" />
        )}
      </TabsContent>
    </Tabs>
  );
}
