import { createFileRoute } from '@tanstack/react-router';
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  Bell,
  Target,
  ArrowLeft,
  ArrowRight,
  Activity,
  Zap,
  Eye,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_static/docs/dashboard')({
  head: () => ({
    meta: [
      { title: 'Dashboard e Análises - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Guia completo do Dashboard do Ecotech CRM. Visão em tempo real de pipeline, renovações, tarefas e indicadores da corretora.',
      },
      { property: 'og:title', content: 'Dashboard e Análises - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Visão em tempo real de pipeline, renovações e indicadores da sua corretora.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/docs/dashboard' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/docs/dashboard' }],
  }),
  component: DashboardPage,
});


const metrics = [
  {
    icon: Users,
    title: 'Clientes Ativos',
    description: 'Número total de clientes com status ativo no sistema.',
    iconBg: 'bg-blue-500/20',
    iconBorder: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    usage: 'Use para monitorar o crescimento da base de clientes.',
  },
  {
    icon: FileText,
    title: 'Propostas Ativas',
    description: 'Propostas em andamento aguardando aprovação ou análise.',
    iconBg: 'bg-purple-500/20',
    iconBorder: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    usage: 'Acompanhe propostas que precisam de atenção.',
  },
  {
    icon: DollarSign,
    title: 'Vendas do Mês',
    description: 'Total de vendas confirmadas no mês corrente.',
    iconBg: 'bg-green-500/20',
    iconBorder: 'border-green-500/30',
    iconColor: 'text-green-400',
    usage: 'Compare com metas mensais estabelecidas.',
  },
  {
    icon: DollarSign,
    title: 'Comissões Totais',
    description: 'Soma de todas as comissões geradas.',
    iconBg: 'bg-emerald-500/20',
    iconBorder: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    usage: 'Monitore a receita gerada pela equipe.',
  },
  {
    icon: Bell,
    title: 'Renovações Urgentes',
    description: 'Apólices próximas do vencimento (45 dias ou menos).',
    iconBg: 'bg-red-500/20',
    iconBorder: 'border-red-500/30',
    iconColor: 'text-red-400',
    usage: 'Priorize contatos com clientes para renovação.',
  },
  {
    icon: TrendingUp,
    title: 'Taxa de Conversão',
    description: 'Percentual de cotações convertidas em vendas.',
    iconBg: 'bg-orange-500/20',
    iconBorder: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    usage: 'Avalie eficiência do processo comercial.',
  },
];

const sections = [
  {
    icon: Activity,
    title: 'Visão Geral',
    description: 'Cards com métricas principais (KPIs)',
    details: [
      'Clientes ativos',
      'Propostas em andamento',
      'Vendas do mês',
      'Comissões totais',
      'Renovações urgentes',
      'Taxa de conversão',
    ],
    tip: 'Personalize quais métricas aparecem nas configurações.',
  },
  {
    icon: BarChart3,
    title: 'Gráficos e Análises',
    description: 'Visualizações interativas de dados',
    details: [
      'Vendas por mês (linha do tempo)',
      'Vendas por vendedor (barras)',
      'Distribuição por produto (pizza)',
      'Performance por seguradora',
      'Funil de conversão',
      'Comissões por período',
    ],
    tip: 'Clique nos gráficos para ver detalhes específicos.',
  },
  {
    icon: Bell,
    title: 'Alertas e Notificações',
    description: 'Avisos importantes que requerem ação',
    details: [
      'Renovações próximas do vencimento',
      'Propostas aguardando resposta',
      'Documentos pendentes',
      'Tarefas atrasadas',
      'Aniversários de clientes',
      'Metas próximas de serem atingidas',
    ],
    tip: 'Configure preferências de notificação no seu perfil.',
  },
  {
    icon: Target,
    title: 'Metas e Objetivos',
    description: 'Acompanhamento de metas estabelecidas',
    details: [
      'Metas mensais de vendas',
      'Metas trimestrais',
      'Performance individual',
      'Performance por equipe',
      'Progresso em tempo real',
      'Histórico de metas atingidas',
    ],
    tip: 'Defina metas realistas baseadas em histórico.',
  },
];

const customization = [
  {
    title: 'Período de Visualização',
    description:
      'Escolha o período dos dados exibidos: hoje, semana, mês, trimestre ou ano.',
  },
  {
    title: 'Filtros por Vendedor',
    description:
      'Gestores podem filtrar dados por vendedor específico ou visualizar toda a equipe.',
  },
  {
    title: 'Filtros por Seguradora',
    description:
      'Analise performance por seguradora parceira para identificar os melhores parceiros.',
  },
  {
    title: 'Filtros por Produto',
    description:
      'Veja quais produtos estão vendendo mais e onde focar esforços comerciais.',
  },
  {
    title: 'Exportação de Relatórios',
    description:
      'Exporte dados em Excel ou PDF para análises externas ou apresentações.',
  },
  {
    title: 'Layout Personalizável',
    description:
      'Reorganize cards e seções conforme sua preferência de visualização.',
  },
];

const roles = [
  {
    role: 'Vendedor',
    access: [
      'Visualiza apenas seus próprios dados',
      'Métricas individuais de performance',
      'Suas propostas e cotações',
      'Seus clientes e renovações',
      'Metas pessoais',
    ],
  },
  {
    role: 'Gestor',
    access: [
      'Visualiza dados de toda a equipe',
      'Comparativo entre vendedores',
      'Performance geral da corretora',
      'Todas as propostas e cotações',
      'Relatórios consolidados',
    ],
  },
  {
    role: 'Admin',
    access: [
      'Acesso total a todos os dados',
      'Configuração de metas',
      'Gestão de KPIs exibidos',
      'Configuração de alertas',
      'Exportação de relatórios avançados',
    ],
  },
];

const tips = [
  'Acesse o dashboard diariamente para acompanhar o andamento do seu dia.',
  'Use filtros de período para identificar tendências sazonais.',
  'Configure alertas para não perder renovações importantes.',
  'Compare sua performance com metas estabelecidas.',
  'Exporte relatórios mensais para reuniões com a equipe.',
  'Identifique gargalos no funil de conversão e otimize processos.',
];

function DashboardPage() {
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
        <div
          className="absolute left-6 sm:left-8 top-0 bottom-0 w-px opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 8px, transparent 8px, transparent 16px)',
          }}
        />
        <div
          className="absolute left-6 sm:left-8 top-0 bottom-0 w-px opacity-40 hidden dark:block"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)',
          }}
        />
        <div
          className="absolute right-6 sm:right-8 top-0 bottom-0 w-px opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 8px, transparent 8px, transparent 16px)',
          }}
        />
        <div
          className="absolute right-6 sm:right-8 top-0 bottom-0 w-px opacity-40 hidden dark:block"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)',
          }}
        />
      </div>

      {/* Anotações técnicas */}
      <div
        className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1 z-10"
        aria-hidden="true"
      >
        <div>page.docs.dashboard</div>
        <div>analytics.metrics.guide</div>
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
              DASHBOARD_ANALYTICS
            </div>

            <div
              className="relative w-16 h-16 mb-6 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30"
              aria-hidden="true"
            >
              <BarChart3 className="w-8 h-8 text-orange-400" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-orange-500/60" />
            </div>

            <div className="relative inline-block mb-6" aria-hidden="true">
              <span className="font-inter text-orange-400 text-sm font-semibold uppercase tracking-widest">
                DASHBOARD & MÉTRICAS
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-orange-400 opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Dashboard e Análises
            </h1>
            <p className="font-inter text-lg text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              Acompanhe métricas em tempo real, analise performance e tome
              decisões baseadas em dados. O dashboard centraliza todas as
              informações importantes do seu negócio.
            </p>
          </header>

          {/* Métricas (KPIs) */}
          <section
            aria-labelledby="kpis-heading"
            className="relative rounded-2xl p-8 border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-gray-50 to-gray-50 dark:from-orange-500/10 dark:via-black dark:to-black mb-16"
          >
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              KEY_METRICS
            </div>
            <div
              className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500/60"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <h2
              id="kpis-heading"
              className="font-inter text-2xl font-semibold text-black dark:text-white mb-6"
            >
              Principais Métricas (KPIs)
            </h2>

            <ul
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
              role="list"
            >
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <li
                    key={index}
                    className="relative p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                  >
                    <div
                      className="absolute -top-2 -left-2 text-[10px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                      aria-hidden="true"
                    >
                      KPI_{String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`w-8 h-8 rounded-lg ${metric.iconBg} flex items-center justify-center border ${metric.iconBorder} flex-shrink-0`}
                        aria-hidden="true"
                      >
                        <Icon className={`w-4 h-4 ${metric.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-inter font-semibold text-black dark:text-white text-sm mb-1">
                          {metric.title}
                        </h3>
                        <p className="font-inter text-xs text-gray-500 dark:text-gray-400">
                          {metric.description}
                        </p>
                      </div>
                    </div>
                    <div
                      className="p-2 rounded border border-primary/20 bg-primary/5"
                      role="note"
                    >
                      <p className="font-inter text-[10px] text-primary leading-tight">
                        <Eye
                          className="w-3 h-3 inline mr-1"
                          aria-hidden="true"
                        />
                        <span className="sr-only">Dica de uso: </span>
                        {metric.usage}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Seções do Dashboard */}
          <section aria-labelledby="sections-heading" className="mb-16">
            <div className="relative mb-8">
              <div
                className="absolute -top-6 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20"
                aria-hidden="true"
              >
                DASHBOARD_SECTIONS
              </div>
              <h2
                id="sections-heading"
                className="font-inter text-3xl font-semibold text-black dark:text-white mb-2"
              >
                Seções do Dashboard
              </h2>
              <p className="font-inter text-gray-500 dark:text-gray-400 leading-relaxed">
                Entenda cada parte do painel de controle.
              </p>
            </div>

            <ul className="grid md:grid-cols-2 gap-6" role="list">
              {sections.map((section, index) => {
                const Icon = section.icon;
                return (
                  <li
                    key={index}
                    className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
                  >
                    <div
                      className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                      aria-hidden="true"
                    >
                      SECTION_{String(index + 1).padStart(2, '0')}
                    </div>
                    <div
                      className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gray-300 dark:border-white/20"
                      aria-hidden="true"
                    />

                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10"
                        aria-hidden="true"
                      >
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-inter font-semibold text-black dark:text-white mb-1">
                          {section.title}
                        </h3>
                        <p className="font-inter text-sm text-gray-500 dark:text-gray-400">
                          {section.description}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-1.5 mb-4" role="list">
                      {section.details.map((detail, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-500"
                        >
                          <div
                            className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <span className="font-inter">{detail}</span>
                        </li>
                      ))}
                    </ul>

                    <div
                      className="p-2.5 rounded border border-orange-500/20 bg-orange-500/5"
                      role="note"
                    >
                      <p className="font-inter text-[10px] text-orange-600 dark:text-orange-400 leading-tight flex items-start gap-1.5">
                        <Zap
                          className="w-3 h-3 flex-shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>
                          <span className="sr-only">Dica: </span>
                          {section.tip}
                        </span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Personalização */}
          <section
            aria-labelledby="customization-heading"
            className="relative rounded-2xl p-8 border border-primary/30 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black mb-16"
          >
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              CUSTOMIZATION_OPTIONS
            </div>
            <div
              className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/60"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <h2
              id="customization-heading"
              className="font-inter text-2xl font-semibold text-black dark:text-white mb-6"
            >
              Opções de Personalização
            </h2>

            <ol className="grid md:grid-cols-2 gap-4" role="list">
              {customization.map((option, index) => (
                <li
                  key={index}
                  className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center font-inter font-bold text-xs flex-shrink-0"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-inter font-semibold text-black dark:text-white mb-1.5">
                        {option.title}
                      </h3>
                      <p className="font-inter text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Acesso por função */}
          <section aria-labelledby="roles-heading" className="mb-16">
            <div className="relative mb-8">
              <div
                className="absolute -top-6 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20"
                aria-hidden="true"
              >
                ACCESS_CONTROL
              </div>
              <h2
                id="roles-heading"
                className="font-inter text-3xl font-semibold text-black dark:text-white mb-2"
              >
                Acesso por Função
              </h2>
              <p className="font-inter text-gray-500 dark:text-gray-400 leading-relaxed">
                O que cada tipo de usuário pode visualizar.
              </p>
            </div>

            <ul className="grid md:grid-cols-3 gap-6" role="list">
              {roles.map((roleData, index) => (
                <li
                  key={index}
                  className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
                >
                  <div
                    className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                    aria-hidden="true"
                  >
                    ROLE_{roleData.role.toUpperCase()}
                  </div>
                  <div
                    className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gray-200 dark:border-white/20 rounded-tr"
                    aria-hidden="true"
                  />

                  <h3 className="font-inter font-semibold text-black dark:text-white text-lg mb-4">
                    {roleData.role}
                  </h3>

                  <ul className="space-y-2" role="list">
                    {roleData.access.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span className="font-inter">{item}</span>
                      </li>
                    ))}
                  </ul>
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

            <h2
              id="tips-heading"
              className="font-inter font-semibold text-black dark:text-white mb-4"
            >
              Dicas para Aproveitar o Dashboard
            </h2>
            <ol className="grid md:grid-cols-2 gap-3" role="list">
              {tips.map((tip, index) => (
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
            </ol>
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
              Próximos Passos
            </h2>
            <p className="font-inter text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
              Continue explorando a documentação:
            </p>
            <ul className="flex flex-wrap gap-3" role="list">
              <li>
                <Link
                  to="/docs/configuracoes"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Configurações
                  <ArrowRight
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors group text-sm font-inter font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
                >
                  Acessar Dashboard
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
