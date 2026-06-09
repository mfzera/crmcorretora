import { createFileRoute } from '@tanstack/react-router';
import {
  BarChart3,
  ArrowLeft,
  ArrowRight,
  DollarSign,
  PieChart,
  Users,
  RefreshCw,
  FileCheck,
  Building2,
  Trophy,
  Filter,
  Calendar,
  Info,
  Shield,
  Download,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_static/docs/metricas')({
  head: () => ({
    meta: [
      { title: 'Métricas e Relatórios - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Guia do módulo de métricas do Ecotech CRM. Acompanhe KPIs de vendas, conversão, receita e performance da sua corretora.',
      },
      { property: 'og:title', content: 'Métricas e Relatórios - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Acompanhe KPIs de vendas, receita e performance da sua corretora no Ecotech CRM.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/docs/metricas' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/docs/metricas' }],
  }),
  component: MetricasDocsPage,
});


const abas = [
  {
    icon: DollarSign,
    title: 'Vendas (Prêmio Líquido)',
    description: 'Total, média, maior e menor prêmio. Detalhamento por status (ativo, cancelado, etc.).',
    iconBg: 'bg-green-500/20',
    iconBorder: 'border-green-500/30',
    iconColor: 'text-green-400',
  },
  {
    icon: DollarSign,
    title: 'Comissões',
    description: 'Total de comissões geradas, comissão média e valores de negócio corretora.',
    iconBg: 'bg-emerald-500/20',
    iconBorder: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    icon: PieChart,
    title: 'Pipeline (Kanban)',
    description: 'Oportunidades por status, prioridade e temperatura. Gráficos de rosca interativos.',
    iconBg: 'bg-orange-500/20',
    iconBorder: 'border-orange-500/30',
    iconColor: 'text-orange-400',
  },
  {
    icon: Users,
    title: 'Clientes',
    description: 'Total de clientes cadastrados, ativos, e distribuição entre Pessoa Física e Jurídica.',
    iconBg: 'bg-blue-500/20',
    iconBorder: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    icon: RefreshCw,
    title: 'Renovações',
    description: 'Resumo de renovações por status: renovadas, perdidas e em andamento. Gráfico de barras.',
    iconBg: 'bg-purple-500/20',
    iconBorder: 'border-purple-500/30',
    iconColor: 'text-purple-400',
  },
  {
    icon: FileCheck,
    title: 'Endossos',
    description: 'Endossos por tipo e status: aprovados, solicitados e recusados.',
    iconBg: 'bg-indigo-500/20',
    iconBorder: 'border-indigo-500/30',
    iconColor: 'text-indigo-400',
  },
  {
    icon: Building2,
    title: 'Seguradoras',
    description: 'Métricas por seguradora parceira: prêmio, comissão, quantidade de documentos e clientes.',
    iconBg: 'bg-pink-500/20',
    iconBorder: 'border-pink-500/30',
    iconColor: 'text-pink-400',
  },
  {
    icon: DollarSign,
    title: 'Negócio Corretora',
    description: 'Receita da corretora por seguradora: documentos, prêmios e comissões do vendedor e da corretora.',
    iconBg: 'bg-amber-500/20',
    iconBorder: 'border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  {
    icon: Trophy,
    title: 'Ranking',
    description: 'Top 10 vendedores por prêmio total. Medalhas de ouro, prata e bronze para os três primeiros.',
    iconBg: 'bg-yellow-500/20',
    iconBorder: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
  },
];

const filtros = [
  { icon: Calendar, title: 'Período', description: 'Filtre por intervalo de datas personalizado ou use atalhos rápidos (este mês, trimestre, ano).' },
  { icon: Users, title: 'Vendedor', description: 'Visualize métricas de um vendedor específico ou de toda a equipe.' },
  { icon: Building2, title: 'Seguradora', description: 'Filtre por seguradora parceira para comparar performance entre parceiros.' },
];

const graficos = [
  { title: 'Status do Pipeline', description: 'Gráfico de rosca mostrando a distribuição de oportunidades por etapa (lead, contato, negociação, ganha, perdida).' },
  { title: 'Prioridade do Pipeline', description: 'Gráfico de rosca com a distribuição por prioridade (baixa, média, alta, urgente).' },
  { title: 'Temperatura do Pipeline', description: 'Gráfico de rosca com a distribuição por temperatura (frio, morno, quente).' },
  { title: 'Prêmio por Status', description: 'Gráfico de barras mostrando o valor de prêmio por status de venda.' },
  { title: 'Renovações por Status', description: 'Gráfico de barras com a quantidade de renovações por status.' },
  { title: 'Endossos por Tipo', description: 'Gráfico de barras com a distribuição de endossos por tipo.' },
];

function MetricasDocsPage() {
  return (
    <div className="bg-white dark:bg-black min-h-screen relative overflow-hidden">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-black focus:rounded-lg focus:font-medium"
      >
        Pular para o conteúdo principal
      </a>

      {/* Background decorativo */}
      <div className="absolute inset-0 opacity-30 dark:opacity-30" aria-hidden="true">
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>
      <div className="absolute inset-0 opacity-15 dark:opacity-15" aria-hidden="true">
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      {/* Linhas verticais */}
      <div className="absolute inset-0 max-w-6xl mx-auto px-6 sm:px-8" aria-hidden="true">
        <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px opacity-40">
          <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 8px, transparent 8px, transparent 16px)' }} />
          <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)' }} />
        </div>
        <div className="absolute right-6 sm:right-8 top-0 bottom-0 w-px opacity-40">
          <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 8px, transparent 8px, transparent 16px)' }} />
          <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)' }} />
        </div>
      </div>

      {/* Anotações técnicas */}
      <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1 z-10" aria-hidden="true">
        <div>page.docs.metricas</div>
        <div>analytics.reports.guide</div>
      </div>

      <main id="main-content" className="relative py-24 z-10">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          {/* Navegação */}
          <nav aria-label="Breadcrumb">
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors mb-8 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
              Voltar para Documentação
            </Link>
          </nav>

          {/* Header */}
          <header className="mb-16 relative">
            <div className="absolute -top-12 left-0 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider" aria-hidden="true">
              ANALYTICS_REPORTS
            </div>

            <div className="relative w-16 h-16 mb-6 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30" aria-hidden="true">
              <BarChart3 className="w-8 h-8 text-primary" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
            </div>

            <div className="relative inline-block mb-6" aria-hidden="true">
              <span className="font-inter text-primary text-sm font-semibold uppercase tracking-widest">
                RELATÓRIOS
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Métricas e Relatórios
            </h1>
            <p className="font-inter text-lg text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              Painel consolidado com todos os indicadores do seu negócio. Filtre por período, vendedor ou seguradora e visualize dados em cards, tabelas e gráficos interativos.
            </p>

            <div className="mt-6">
              <Link
                to="/painel"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black font-inter font-medium text-sm hover:bg-primary/90 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
              >
                Abrir Métricas
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>
          </header>

          {/* Abas disponíveis */}
          <section
            aria-labelledby="tabs-heading"
            className="relative rounded-2xl p-8 border border-primary/30 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black mb-16"
          >
            <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1" aria-hidden="true">
              METRIC_TABS
            </div>
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/60" aria-hidden="true" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

            <h2 id="tabs-heading" className="font-inter text-2xl font-semibold text-black dark:text-white mb-2">
              Categorias de Métricas
            </h2>
            <p className="font-inter text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
              A página é organizada em 9 abas. Clique em cada uma para alternar entre as categorias.
            </p>

            <ul className="grid md:grid-cols-3 gap-4" role="list">
              {abas.map((aba, index) => {
                const Icon = aba.icon;
                return (
                  <li
                    key={index}
                    className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-lg ${aba.iconBg} flex items-center justify-center border ${aba.iconBorder} flex-shrink-0`} aria-hidden="true">
                        <Icon className={`w-4 h-4 ${aba.iconColor}`} />
                      </div>
                      <h3 className="font-inter font-semibold text-black dark:text-white text-sm mt-1">
                        {aba.title}
                      </h3>
                    </div>
                    <p className="font-inter text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {aba.description}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Filtros */}
          <section aria-labelledby="filters-heading" className="mb-16">
            <div className="relative mb-8">
              <div className="absolute -top-6 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20" aria-hidden="true">
                FILTERS
              </div>
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-primary" aria-hidden="true" />
                <h2 id="filters-heading" className="font-inter text-2xl font-semibold text-black dark:text-white">
                  Filtros Disponíveis
                </h2>
              </div>
              <p className="font-inter text-gray-500 dark:text-gray-400 leading-relaxed mt-2">
                Refine os dados exibidos para focar no que importa.
              </p>
            </div>

            <ul className="grid md:grid-cols-3 gap-6" role="list">
              {filtros.map((filtro, index) => {
                const Icon = filtro.icon;
                return (
                  <li
                    key={index}
                    className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
                  >
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10 mb-4" aria-hidden="true">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-inter font-semibold text-black dark:text-white mb-2">
                      {filtro.title}
                    </h3>
                    <p className="font-inter text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {filtro.description}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Gráficos */}
          <section
            aria-labelledby="charts-heading"
            className="relative rounded-2xl p-8 border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-gray-50 to-gray-50 dark:from-orange-500/10 dark:via-black dark:to-black mb-16"
          >
            <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1" aria-hidden="true">
              CHART_TYPES
            </div>
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500/60" aria-hidden="true" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

            <div className="flex items-center gap-3 mb-6">
              <PieChart className="w-5 h-5 text-orange-400" aria-hidden="true" />
              <h2 id="charts-heading" className="font-inter text-2xl font-semibold text-black dark:text-white">
                Gráficos Disponíveis
              </h2>
            </div>

            <ul className="grid md:grid-cols-2 gap-4" role="list">
              {graficos.map((g, index) => (
                <li
                  key={index}
                  className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                >
                  <h3 className="font-inter font-semibold text-black dark:text-white mb-1.5 text-sm">
                    {g.title}
                  </h3>
                  <p className="font-inter text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {g.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Dicas */}
          <section
            aria-labelledby="tips-heading"
            className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] mb-12"
          >
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20" aria-hidden="true" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gray-300 dark:border-white/20" aria-hidden="true" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

            <div className="flex items-center gap-3 mb-4">
              <Info className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 id="tips-heading" className="font-inter font-semibold text-black dark:text-white">
                Dicas de Uso
              </h2>
            </div>
            <ul className="grid md:grid-cols-2 gap-3" role="list">
              {[
                'Compare períodos diferentes para identificar tendências de crescimento.',
                'Use o filtro de vendedor para avaliar desempenho individual.',
                'Acompanhe a aba de Ranking mensalmente para premiar os melhores.',
                'Filtre por seguradora para descobrir quais parcerias são mais rentáveis.',
                'Cruze dados de Renovações com Comissões para entender receita recorrente.',
                'Exporte relatórios para apresentações em reuniões de equipe.',
              ].map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                    <span className="text-[10px] font-mono text-primary font-bold">{index + 1}</span>
                  </div>
                  <span className="font-inter leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Permissões */}
          <section
            aria-labelledby="permissions-heading"
            className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] mb-12"
          >
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20" aria-hidden="true" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 id="permissions-heading" className="font-inter font-semibold text-black dark:text-white">
                Permissões
              </h2>
            </div>
            <p className="font-inter text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              O acesso à página de métricas requer a permissão <code className="font-mono text-xs bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 text-black dark:text-white">metricas:acessar</code>. Vendedores veem apenas seus próprios dados. Gestores e admins com <code className="font-mono text-xs bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 text-black dark:text-white">relatorios:vendas</code> veem dados de toda a equipe.
            </p>
          </section>

          {/* Próximos Passos */}
          <nav
            aria-labelledby="next-steps-heading"
            className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
          >
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20" aria-hidden="true" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gray-300 dark:border-white/20" aria-hidden="true" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

            <h2 id="next-steps-heading" className="font-inter font-semibold text-black dark:text-white mb-3">
              Veja também
            </h2>
            <ul className="flex flex-wrap gap-3" role="list">
              <li>
                <Link
                  to="/docs/performance"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Performance de Vendedores
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link
                  to="/docs/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link
                  to="/painel"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors group text-sm font-inter font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
                >
                  Abrir Métricas
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </main>
    </div>
  );
}
