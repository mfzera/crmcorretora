import { createFileRoute } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Users,
  FileText,
  RefreshCw,
  BarChart3,
  Calendar,
  MessageSquare,
  Shield,
  Building2,
  Package,
  TrendingUp,
  Bell,
  ArrowRight,
  ArrowLeft,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_static/docs/overview')({
  head: () => ({
    meta: [
      { title: 'Overview do Sistema - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Conheça todos os módulos e funcionalidades do Ecotech CRM. Visão geral completa do sistema de gestão para corretoras de seguros.',
      },
      { property: 'og:title', content: 'Overview do Sistema - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Visão geral completa do Ecotech CRM: clientes, cotações, pipeline, métricas e muito mais.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/docs/overview' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/docs/overview' }],
  }),
  component: OverviewPage,
});


const modules = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    slug: 'dashboard',
    description:
      'Visão geral do negócio com métricas em tempo real: clientes ativos, cotações abertas, renovações pendentes, prêmio e comissão do mês.',
    features: [
      'Cards de estatísticas principais',
      'Gráfico Renovações x Convertidos',
      'Alertas de follow-up (cotações paradas há mais de 5 dias)',
      'Tarefas e lembretes rápidos',
      'Renovações urgentes e atividades recentes',
    ],
    href: '/docs/dashboard',
    hasDocs: true,
  },
  {
    icon: Calendar,
    slug: 'agenda',
    title: 'Agenda',
    description:
      'Calendário integrado que consolida tarefas, renovações e documentos em uma única visão temporal.',
    features: [
      'Visualização mensal com marcadores por categoria',
      'Filtros por tipo: Tarefas, Renovações, Documentos',
      'Sidebar com mini-calendário e lista do dia',
      'Detalhe do dia com todos os eventos',
    ],
    href: '/docs/agenda',
    hasDocs: true,
  },
  {
    icon: Users,
    slug: 'clientes',
    title: 'Clientes',
    description:
      'Cadastro e gestão completa de clientes PF e PJ, com busca, filtros, importação em massa e atribuição de vendedores.',
    features: [
      'Cadastro PF (CPF) e PJ (CNPJ) com validação',
      'Importação via planilha Excel/CSV',
      'Busca e filtros avançados',
      'Atribuição de vendedor responsável',
    ],
    href: '/docs/clientes',
    hasDocs: true,
  },
  {
    icon: FileText,
    slug: 'cotacoes',
    title: 'Cotações',
    description:
      'Criação e acompanhamento de cotações com fluxo de status, desde elaboração até emissão ou recusa.',
    features: [
      'Fluxo de status: Elaboração → Enviada → Aprovada/Recusada',
      'Vinculação com cliente e produto',
      'Cálculo de prêmio e comissão',
      'Histórico de movimentações',
    ],
    href: '/docs/cotacoes',
    hasDocs: true,
  },
  {
    icon: RefreshCw,
    slug: 'renovacoes',
    title: 'Renovações',
    description:
      'Controle de apólices próximas ao vencimento, importação de renovações e acompanhamento de conversão.',
    features: [
      'Alerta automático com 45 dias de antecedência',
      'Importação via planilha',
      'Acompanhamento de status de conversão',
      'Integração com o Dashboard',
    ],
    href: null,
    hasDocs: false,
  },
  {
    icon: BarChart3,
    slug: 'metricas',
    title: 'Métricas',
    description:
      'Relatórios e análises detalhadas de produção, comissões e performance da corretora por período.',
    features: [
      'Gráficos de produção mensal',
      'Comparativo por produto e seguradora',
      'Performance individual por vendedor',
      'Exportação de relatórios',
    ],
    href: null,
    hasDocs: false,
  },
  {
    icon: TrendingUp,
    slug: 'performance',
    title: 'Performance',
    description:
      'Ranking e acompanhamento individual dos vendedores com metas, conversões e comissões.',
    features: [
      'Ranking de vendedores',
      'Metas mensais e atingimento',
      'Taxa de conversão por vendedor',
      'Histórico de performance',
    ],
    href: null,
    hasDocs: false,
  },
  {
    icon: MessageSquare,
    slug: 'chat',
    title: 'Chat',
    description:
      'Comunicação interna em tempo real entre os membros da corretora, com canais e troca de arquivos.',
    features: [
      'Mensagens diretas entre usuários',
      'Canais de equipe',
      'Compartilhamento de arquivos',
      'Notificações em tempo real',
    ],
    href: null,
    hasDocs: false,
  },
  {
    icon: Package,
    slug: 'produtos',
    title: 'Produtos',
    description:
      'Cadastro dos produtos de seguro comercializados pela corretora, com categorias e coberturas.',
    features: [
      'Catálogo de produtos por ramo',
      'Vinculação com seguradoras',
      'Coberturas e valores mínimos',
      'Ativação/desativação de produtos',
    ],
    href: null,
    hasDocs: false,
  },
  {
    icon: Shield,
    slug: 'seguradoras',
    title: 'Seguradoras Parceiras',
    description:
      'Gerenciamento das seguradoras com as quais a corretora trabalha, incluindo dados de contato e comissões.',
    features: [
      'Cadastro de seguradoras',
      'Percentuais de comissão por produto',
      'Dados de contato e representantes',
      'Status ativo/inativo',
    ],
    href: null,
    hasDocs: false,
  },
  {
    icon: Building2,
    slug: 'gestao-crm',
    title: 'Gestão CRM',
    description:
      'Pipeline de negócios estilo kanban para acompanhar prospecções e oportunidades em cada etapa do funil.',
    features: [
      'Kanban com etapas customizáveis',
      'Cards de negócios com valor e cliente',
      'Histórico de interações',
      'Relatório de pipeline',
    ],
    href: null,
    hasDocs: false,
  },
  {
    icon: Bell,
    slug: 'notificacoes',
    title: 'Notificações',
    description:
      'Central de notificações do sistema para alertas de vencimentos, follow-ups e atividades da equipe.',
    features: [
      'Notificações em tempo real',
      'Filtro por tipo e status',
      'Marcação como lida em massa',
      'Configuração de preferências',
    ],
    href: null,
    hasDocs: false,
  },
];

function OverviewPage() {
  const modulesWithDocs = modules.filter((m) => m.hasDocs);
  const modulesWithoutDocs = modules.filter((m) => !m.hasDocs);

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
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Linhas verticais */}
      <div
        className="absolute inset-0 max-w-5xl mx-auto px-6 sm:px-8"
        aria-hidden="true"
      >
        <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px opacity-40 dark:opacity-40">
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
        <div className="absolute right-6 sm:right-8 top-0 bottom-0 w-px opacity-40 dark:opacity-40">
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

      <main id="main-content" className="relative py-24 z-10">
        <div className="mx-auto max-w-5xl px-6 sm:px-8">
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
              className="absolute -top-10 left-0 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider"
              aria-hidden="true"
            >
              SYSTEM_OVERVIEW
            </div>

            <div
              className="relative w-16 h-16 mb-6 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30"
              aria-hidden="true"
            >
              <Layers className="w-8 h-8 text-primary" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
            </div>

            <div className="relative inline-block mb-6" aria-hidden="true">
              <span className="font-inter text-primary text-sm font-semibold uppercase tracking-widest">
                VISÃO GERAL
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Overview do Sistema
            </h1>
            <p className="font-inter text-lg text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              A ecotech é uma plataforma completa para corretoras de
              seguros. Conheça todos os módulos disponíveis e o que cada um
              oferece.
            </p>
          </header>

          {/* Estatísticas */}
          <section
            aria-labelledby="stats-heading"
            className="relative grid grid-cols-3 gap-4 mb-16 p-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:via-black dark:to-black"
          >
            <h2 id="stats-heading" className="sr-only">
              Estatísticas do sistema
            </h2>
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              SYSTEM_STATS
            </div>
            <div
              className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/60"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            {[
              { label: 'Módulos', value: `${modules.length}` },
              { label: 'Com documentação', value: `${modulesWithDocs.length}` },
              { label: 'Em breve', value: `${modulesWithoutDocs.length}` },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="font-inter text-3xl font-bold text-black dark:text-white"
                  aria-label={`${stat.value} ${stat.label}`}
                >
                  {stat.value}
                </div>
                <div className="font-inter text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </section>

          {/* Módulos com documentação */}
          <section
            aria-labelledby="documented-modules-heading"
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2
                className="w-5 h-5 text-primary"
                aria-hidden="true"
              />
              <h2
                id="documented-modules-heading"
                className="font-inter text-xl font-semibold text-black dark:text-white"
              >
                Módulos com documentação
              </h2>
            </div>

            <ul className="space-y-4" role="list">
              {modulesWithDocs.map((mod, index) => {
                const Icon = mod.icon;
                return (
                  <li key={mod.slug}>
                    <Link
                      to={mod.href!}
                      className="group relative flex flex-col md:flex-row gap-6 p-6 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] hover:border-primary/50 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
                      aria-label={`${mod.title} — ${mod.description}`}
                    >
                      <div
                        className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-hidden="true"
                      >
                        MODULE_{String(index + 1).padStart(2, '0')}
                      </div>
                      <div
                        className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-hidden="true"
                      />

                      <div
                        className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 group-hover:border-primary/30 group-hover:bg-primary/10 flex items-center justify-center flex-shrink-0 transition-colors"
                        aria-hidden="true"
                      >
                        <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary transition-colors" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-inter font-semibold text-black dark:text-white group-hover:text-primary transition-colors">
                            {mod.title}
                          </h3>
                          <ArrowRight
                            className="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 ml-4"
                            aria-hidden="true"
                          />
                        </div>
                        <p className="font-inter text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                          {mod.description}
                        </p>
                        <ul
                          className="flex flex-wrap gap-2"
                          role="list"
                          aria-label={`Funcionalidades do módulo ${mod.title}`}
                        >
                          {mod.features.map((feat) => (
                            <li
                              key={feat}
                              className="font-inter text-xs px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-500 bg-white dark:bg-white/5"
                            >
                              {feat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Módulos em breve */}
          <section aria-labelledby="upcoming-modules-heading" className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-white/20"
                aria-hidden="true"
              />
              <h2
                id="upcoming-modules-heading"
                className="font-inter text-xl font-semibold text-black dark:text-white"
              >
                Em breve
              </h2>
              <span className="font-inter text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                Documentação em construção
              </span>
            </div>

            <ul className="grid sm:grid-cols-2 gap-4" role="list">
              {modulesWithoutDocs.map((mod) => {
                const Icon = mod.icon;
                return (
                  <li
                    key={mod.slug}
                    className="relative flex items-start gap-4 p-5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01] opacity-70"
                  >
                    <div
                      className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center flex-shrink-0"
                      aria-hidden="true"
                    >
                      <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-inter font-semibold text-gray-700 dark:text-gray-300 text-sm mb-1">
                        {mod.title}
                      </h3>
                      <p className="font-inter text-xs text-gray-500 dark:text-gray-500 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* CTA Final */}
          <nav
            aria-labelledby="cta-heading"
            className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] text-center"
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
              id="cta-heading"
              className="font-inter font-semibold text-black dark:text-white mb-2"
            >
              Pronto para começar?
            </h2>
            <p className="font-inter text-sm text-gray-500 dark:text-gray-400 mb-4">
              Siga o guia de primeiros passos para configurar sua conta.
            </p>
            <Link
              to="/docs/primeiros-passos"
              className="inline-flex items-center gap-2 font-inter text-sm font-medium text-primary hover:underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Ver Primeiros Passos
              <ArrowRight
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
