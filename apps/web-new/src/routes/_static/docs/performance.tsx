import { createFileRoute } from '@tanstack/react-router';
import {
  Trophy,
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Target,
  TrendingUp,
  Users,
  Crown,
  Medal,
  Calendar,
  Maximize2,
  Info,
  Shield,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_static/docs/performance')({
  head: () => ({
    meta: [
      { title: 'Performance de Vendedores - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Como analisar a performance individual dos vendedores no Ecotech CRM. Rankings, metas e relatórios por consultor.',
      },
      { property: 'og:title', content: 'Performance de Vendedores - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Rankings, metas e relatórios de performance por vendedor no Ecotech CRM.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/docs/performance' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/docs/performance' }],
  }),
  component: PerformanceDocsPage,
});


const kpis = [
  {
    icon: DollarSign,
    title: 'Total em Prêmios',
    description:
      'Soma de todos os prêmios líquidos das vendas aprovadas no período selecionado.',
    iconBg: 'bg-green-500/20',
    iconBorder: 'border-green-500/30',
    iconColor: 'text-green-400',
  },
  {
    icon: Target,
    title: 'Total de Vendas',
    description:
      'Quantidade total de documentos de venda registrados no período.',
    iconBg: 'bg-blue-500/20',
    iconBorder: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    icon: TrendingUp,
    title: 'Ticket Médio',
    description:
      'Valor médio por venda, calculado dividindo o total de prêmios pelo número de vendas.',
    iconBg: 'bg-purple-500/20',
    iconBorder: 'border-purple-500/30',
    iconColor: 'text-purple-400',
  },
  {
    icon: Users,
    title: 'Vendedores Ativos',
    description:
      'Quantidade de vendedores que realizaram ao menos uma venda no período.',
    iconBg: 'bg-orange-500/20',
    iconBorder: 'border-orange-500/30',
    iconColor: 'text-orange-400',
  },
];

const medalhas = [
  {
    posicao: '1.º lugar',
    icon: Crown,
    cor: 'Dourado',
    description:
      'Coroa dourada. Destaque visual com fundo gradiente amarelo e borda dourada.',
    iconColor: 'text-yellow-500',
    bgClass:
      'bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-950/30 dark:to-black',
    borderClass: 'border-yellow-300 dark:border-yellow-500/30',
  },
  {
    posicao: '2.º lugar',
    icon: Medal,
    cor: 'Prata',
    description:
      'Medalha prateada. Fundo gradiente cinza e borda prateada.',
    iconColor: 'text-gray-400',
    bgClass:
      'bg-gradient-to-r from-slate-50 to-white dark:from-slate-950/30 dark:to-black',
    borderClass: 'border-slate-300 dark:border-slate-500/30',
  },
  {
    posicao: '3.º lugar',
    icon: Medal,
    cor: 'Bronze',
    description:
      'Medalha bronze. Fundo gradiente âmbar e borda bronze.',
    iconColor: 'text-amber-600',
    bgClass:
      'bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/30 dark:to-black',
    borderClass: 'border-amber-300 dark:border-amber-500/30',
  },
];

const periodos = [
  {
    title: 'Mês Atual',
    description: 'Do primeiro ao último dia do mês corrente.',
  },
  {
    title: 'Últimos 3 Meses',
    description: 'Abrange os 3 meses mais recentes, incluindo o atual.',
  },
  {
    title: 'Últimos 6 Meses',
    description: 'Abrange os 6 meses mais recentes, incluindo o atual.',
  },
  {
    title: 'Últimos 12 Meses',
    description: 'Abrange o ano inteiro a partir do mês atual.',
  },
  {
    title: 'Personalizado',
    description:
      'Escolha datas de início e fim manualmente com o calendário.',
  },
];

function PerformanceDocsPage() {
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
      <div
        className="absolute inset-0 opacity-30 dark:opacity-30"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>
      <div
        className="absolute inset-0 opacity-15 dark:opacity-15"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Linhas verticais */}
      <div
        className="absolute inset-0 max-w-6xl mx-auto px-6 sm:px-8"
        aria-hidden="true"
      >
        <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px opacity-40">
          <div
            className="absolute inset-0 dark:hidden"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 8px, transparent 8px, transparent 16px)',
            }}
          />
          <div
            className="absolute inset-0 hidden dark:block"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)',
            }}
          />
        </div>
        <div className="absolute right-6 sm:right-8 top-0 bottom-0 w-px opacity-40">
          <div
            className="absolute inset-0 dark:hidden"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 8px, transparent 8px, transparent 16px)',
            }}
          />
          <div
            className="absolute inset-0 hidden dark:block"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)',
            }}
          />
        </div>
      </div>

      {/* Anotações técnicas */}
      <div
        className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1 z-10"
        aria-hidden="true"
      >
        <div>page.docs.performance</div>
        <div>ranking.leaderboard.guide</div>
      </div>

      <main id="main-content" className="relative py-24 z-10">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          {/* Navegação */}
          <nav aria-label="Breadcrumb">
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors mb-8 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              <ArrowLeft
                className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
                aria-hidden="true"
              />
              Voltar para Documentação
            </Link>
          </nav>

          {/* Header */}
          <header className="mb-16 relative">
            <div
              className="absolute -top-12 left-0 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider"
              aria-hidden="true"
            >
              PERFORMANCE_RANKING
            </div>

            <div
              className="relative w-16 h-16 mb-6 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30"
              aria-hidden="true"
            >
              <Trophy className="w-8 h-8 text-primary" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
            </div>

            <div className="relative inline-block mb-6" aria-hidden="true">
              <span className="font-inter text-primary text-sm font-semibold uppercase tracking-widest">
                RANKING
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Performance de Vendedores
            </h1>
            <p className="font-inter text-lg text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              Painel de ranking que classifica os vendedores pelo total de
              prêmios produzidos. Acompanhe quem lidera em vendas, compare
              tickets médios e veja a comissão de cada membro da equipe.
            </p>

            <div className="mt-6">
              <Link
                to="/performance"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black font-inter font-medium text-sm hover:bg-primary/90 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
              >
                Abrir Performance
                <ArrowRight
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </header>

          {/* KPIs */}
          <section
            aria-labelledby="kpis-heading"
            className="relative rounded-2xl p-8 border border-primary/30 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black mb-16"
          >
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              KPI_CARDS
            </div>
            <div
              className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/60"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <h2
              id="kpis-heading"
              className="font-inter text-2xl font-semibold text-black dark:text-white mb-2"
            >
              Indicadores Principais
            </h2>
            <p className="font-inter text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
              Quatro cards no topo da página resumem os números gerais da equipe
              no período selecionado.
            </p>

            <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" role="list">
              {kpis.map((kpi, index) => {
                const Icon = kpi.icon;
                return (
                  <li
                    key={index}
                    className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className={`w-8 h-8 rounded-lg ${kpi.iconBg} flex items-center justify-center border ${kpi.iconBorder} flex-shrink-0`}
                        aria-hidden="true"
                      >
                        <Icon className={`w-4 h-4 ${kpi.iconColor}`} />
                      </div>
                      <h3 className="font-inter font-semibold text-black dark:text-white text-sm mt-1">
                        {kpi.title}
                      </h3>
                    </div>
                    <p className="font-inter text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {kpi.description}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Ranking e Medalhas */}
          <section aria-labelledby="ranking-heading" className="mb-16">
            <div className="relative mb-8">
              <div
                className="absolute -top-6 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20"
                aria-hidden="true"
              >
                LEADERBOARD
              </div>
              <div className="flex items-center gap-3">
                <Trophy
                  className="w-5 h-5 text-primary"
                  aria-hidden="true"
                />
                <h2
                  id="ranking-heading"
                  className="font-inter text-2xl font-semibold text-black dark:text-white"
                >
                  Sistema de Ranking
                </h2>
              </div>
              <p className="font-inter text-gray-500 dark:text-gray-400 leading-relaxed mt-2">
                Os vendedores são ordenados pelo total de prêmios líquidos
                produzidos, do maior para o menor. Os três primeiros recebem
                destaque visual com medalhas.
              </p>
            </div>

            {/* Medalhas */}
            <div className="mb-8">
              <h3 className="font-inter font-semibold text-black dark:text-white mb-4 text-lg">
                Destaques do Pódio
              </h3>
              <ul className="space-y-3" role="list">
                {medalhas.map((m, index) => {
                  const Icon = m.icon;
                  return (
                    <li
                      key={index}
                      className={`relative rounded-xl p-5 border ${m.borderClass} ${m.bgClass}`}
                    >
                      <div
                        className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20"
                        aria-hidden="true"
                      />
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center border border-gray-200 dark:border-white/10 flex-shrink-0"
                          aria-hidden="true"
                        >
                          <Icon className={`w-5 h-5 ${m.iconColor}`} />
                        </div>
                        <div>
                          <p className="font-inter font-semibold text-black dark:text-white">
                            {m.posicao}{' '}
                            <span className="text-gray-500 dark:text-gray-400 font-normal">
                              — {m.cor}
                            </span>
                          </p>
                          <p className="font-inter text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            {m.description}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Métricas por vendedor */}
            <div
              className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
              role="note"
            >
              <div
                className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20"
                aria-hidden="true"
              />
              <div
                className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
                aria-hidden="true"
              />

              <h3 className="font-inter font-semibold text-black dark:text-white mb-3">
                Métricas por Vendedor
              </h3>
              <p className="font-inter text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                Cada linha do ranking exibe as seguintes informações do
                vendedor:
              </p>
              <ul className="space-y-2" role="list">
                {[
                  'Prêmios — total de prêmios líquidos produzidos (métrica principal, em verde).',
                  'Vendas — quantidade de documentos de venda no período.',
                  'Ticket Médio — prêmio médio por venda (visível em telas médias e grandes).',
                  'Comissão Média — percentual médio de comissão (visível apenas em telas grandes).',
                ].map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5"
                      aria-hidden="true"
                    />
                    <span className="font-inter leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Seleção de período */}
          <section
            aria-labelledby="periods-heading"
            className="relative rounded-2xl p-8 border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-gray-50 to-gray-50 dark:from-blue-500/10 dark:via-black dark:to-black mb-16"
          >
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              PERIOD_FILTER
            </div>
            <div
              className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-500/60"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <div className="flex items-center gap-3 mb-6">
              <Calendar
                className="w-5 h-5 text-blue-400"
                aria-hidden="true"
              />
              <h2
                id="periods-heading"
                className="font-inter text-2xl font-semibold text-black dark:text-white"
              >
                Seleção de Período
              </h2>
            </div>
            <p className="font-inter text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
              Use o painel de filtros no topo da página para escolher o intervalo
              de datas. O painel pode ser recolhido e exibe o período ativo quando
              fechado.
            </p>

            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
              {periodos.map((p, index) => (
                <li
                  key={index}
                  className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                >
                  <h3 className="font-inter font-semibold text-black dark:text-white mb-1.5 text-sm">
                    {p.title}
                  </h3>
                  <p className="font-inter text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {p.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Tela Cheia */}
          <section
            aria-labelledby="fullscreen-heading"
            className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] mb-16"
          >
            <div
              className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <div className="flex items-center gap-3 mb-4">
              <Maximize2
                className="w-5 h-5 text-primary"
                aria-hidden="true"
              />
              <h2
                id="fullscreen-heading"
                className="font-inter font-semibold text-black dark:text-white"
              >
                Modo Tela Cheia
              </h2>
            </div>
            <p className="font-inter text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Ideal para apresentações e reuniões de equipe. Clique em
              &ldquo;Tela Cheia&rdquo; no canto superior direito para expandir o
              ranking para toda a tela.
            </p>
            <ul className="space-y-2" role="list">
              {[
                'A barra lateral e os filtros são ocultados automaticamente.',
                'O ranking ocupa 100% da tela para melhor visualização.',
                'Pressione Esc ou clique em "Sair Tela Cheia" para voltar ao modo normal.',
              ].map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5"
                    aria-hidden="true"
                  />
                  <span className="font-inter leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Dicas */}
          <section
            aria-labelledby="tips-heading"
            className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] mb-12"
          >
            <div
              className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <div className="flex items-center gap-3 mb-4">
              <Info
                className="w-5 h-5 text-primary"
                aria-hidden="true"
              />
              <h2
                id="tips-heading"
                className="font-inter font-semibold text-black dark:text-white"
              >
                Dicas de Uso
              </h2>
            </div>
            <ul className="grid md:grid-cols-2 gap-3" role="list">
              {[
                'Compare períodos diferentes para identificar tendências de crescimento da equipe.',
                'Use o modo tela cheia em reuniões para motivar a equipe com o ranking visível.',
                'Acompanhe o ticket médio para avaliar a qualidade das vendas, não só a quantidade.',
                'Cruze os dados de performance com as métricas detalhadas para análises mais profundas.',
              ].map((tip, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400"
                >
                  <div
                    className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    <span className="text-[10px] font-mono text-primary font-bold">
                      {index + 1}
                    </span>
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
            <div
              className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <div className="flex items-center gap-3 mb-4">
              <Shield
                className="w-5 h-5 text-primary"
                aria-hidden="true"
              />
              <h2
                id="permissions-heading"
                className="font-inter font-semibold text-black dark:text-white"
              >
                Permissões
              </h2>
            </div>
            <p className="font-inter text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              O acesso ao ranking requer a permissão{' '}
              <code className="font-mono text-xs bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 text-black dark:text-white">
                performance:acessar
              </code>
              . A visibilidade no menu lateral é controlada pela permissão{' '}
              <code className="font-mono text-xs bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 text-black dark:text-white">
                performance:visualizar
              </code>
              .
            </p>
            <ul className="space-y-2" role="list">
              {[
                'Gerentes e admins têm acesso total ao ranking de toda a equipe.',
                'Vendedores com a permissão podem visualizar o ranking e comparar sua posição.',
                'O perfil "Cadastro" não possui acesso à página de performance por padrão.',
              ].map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5"
                    aria-hidden="true"
                  />
                  <span className="font-inter leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Próximos Passos */}
          <nav
            aria-labelledby="next-steps-heading"
            className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
          >
            <div
              className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <h2
              id="next-steps-heading"
              className="font-inter font-semibold text-black dark:text-white mb-3"
            >
              Veja também
            </h2>
            <ul className="flex flex-wrap gap-3" role="list">
              <li>
                <Link
                  to="/docs/metricas"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Métricas e Relatórios
                  <ArrowRight
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </li>
              <li>
                <Link
                  to="/docs/kanban"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Kanban de Oportunidades
                  <ArrowRight
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </li>
              <li>
                <Link
                  to="/performance"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors group text-sm font-inter font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
                >
                  Abrir Performance
                  <ArrowRight
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </main>
    </div>
  );
}
