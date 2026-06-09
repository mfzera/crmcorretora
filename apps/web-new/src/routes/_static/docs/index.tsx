import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Book,
  Rocket,
  Settings,
  Users,
  FileText,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Layers,
  CalendarDays,
  Columns3,
  PieChart,
  Trophy,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';

export const Route = createFileRoute('/_static/docs/')({
  head: () => ({
    meta: [
      { title: 'Documentação - Central de Ajuda - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Central de ajuda e documentação da Ecotech CRM. Guias de primeiros passos, tutoriais de clientes, cotações, kanban, métricas e muito mais.',
      },
      { property: 'og:title', content: 'Documentação - Central de Ajuda - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Guias e tutoriais para aproveitar ao máximo o Ecotech CRM.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/docs' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/docs' }],
  }),
  component: DocsPage,
});


const guias = [
  {
    icon: Rocket,
    title: 'Primeiros Passos',
    description: 'Aprenda a configurar sua conta e começar a usar o sistema.',
    href: '/docs/primeiros-passos',
  },
  {
    icon: Layers,
    title: 'Overview do Sistema',
    description: 'Conheça todos os módulos e funcionalidades da plataforma.',
    href: '/docs/overview',
  },
  {
    icon: CalendarDays,
    title: 'Agenda',
    description: 'Calendário integrado com tarefas, renovações e vencimentos.',
    href: '/docs/agenda',
  },
  {
    icon: Users,
    title: 'Gestão de Clientes',
    description: 'Como cadastrar e gerenciar seus clientes na plataforma.',
    href: '/docs/clientes',
  },
  {
    icon: FileText,
    title: 'Cotações',
    description: 'Crie e gerencie cotações de forma rápida e eficiente.',
    href: '/docs/cotacoes',
  },
  {
    icon: Columns3,
    title: 'Kanban de Oportunidades',
    description:
      'Pipeline de vendas com quadro visual para gerenciar seu funil.',
    href: '/docs/kanban',
  },
  {
    icon: PieChart,
    title: 'Métricas e Relatórios',
    description:
      'Indicadores consolidados com gráficos, filtros e 9 categorias de análise.',
    href: '/docs/metricas',
  },
  {
    icon: Trophy,
    title: 'Performance de Vendedores',
    description:
      'Ranking da equipe com medalhas, KPIs e modo tela cheia para apresentações.',
    href: '/docs/performance',
  },
  {
    icon: BarChart3,
    title: 'Dashboard',
    description: 'Entenda as métricas e relatórios disponíveis.',
    href: '/docs/dashboard',
  },
  {
    icon: Settings,
    title: 'Configurações',
    description: 'Personalize o sistema de acordo com suas necessidades.',
    href: '/docs/configuracoes',
  },
];

const quickStartSteps = [
  'Crie sua conta em /cadastro',
  'Complete seu perfil com os dados da corretora',
  'Cadastre seus primeiros clientes',
  'Crie sua primeira cotação',
];

function DocsPage() {
  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-black min-h-screen relative overflow-hidden">
      {/* Skip to main content - acessibilidade */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-black focus:rounded-lg focus:font-medium"
      >
        Pular para o conteúdo principal
      </a>

      {/* Backgrounds decorativos - ocultos de leitores de tela */}
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

      {/* Linhas verticais guia - decorativas */}
      <div
        className="absolute inset-0 max-w-4xl mx-auto px-6 sm:px-8"
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

      {/* Anotações técnicas - decorativas, ocultas de leitores de tela */}
      <div
        className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1 z-10"
        aria-hidden="true"
      >
        <div>page.docs</div>
        <div>documentation.guides</div>
      </div>

      <main id="main-content" className="relative py-24 z-10">
        <div className="mx-auto max-w-4xl px-6 sm:px-8">
          {/* Back button */}
          <div className="mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/' })}
              className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Voltar
            </Button>
          </div>

          {/* Header */}
          <header className="text-center mb-16 relative">
            {/* Label decorativo */}
            <div
              className="absolute -top-12 left-1/2 -translate-x-1/2 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider"
              aria-hidden="true"
            >
              <div>DOCS_PAGE</div>
            </div>

            <div
              className="relative w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/20 dark:bg-primary/20 flex items-center justify-center border border-primary/30 dark:border-primary/30"
              aria-hidden="true"
            >
              <Book className="w-8 h-8 text-primary dark:text-primary" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
            </div>

            <div className="relative inline-block mb-6" aria-hidden="true">
              <span className="font-inter text-primary dark:text-primary text-sm font-semibold uppercase tracking-widest">
                DOCUMENTAÇÃO
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary dark:bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Documentação
            </h1>
            <p className="font-inter text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Guias e tutoriais para ajudar você a aproveitar ao máximo o
              ecotech.
            </p>
          </header>

          {/* Quick Start */}
          <section
            aria-labelledby="quick-start-heading"
            className="relative rounded-2xl p-8 mb-12 border border-primary/30 dark:border-primary/30 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black"
          >
            {/* Decorações */}
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              QUICK_START
            </div>
            <div
              className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/60"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <h2
              id="quick-start-heading"
              className="font-inter text-2xl font-semibold text-black dark:text-white mb-4"
            >
              Começando
            </h2>
            <p className="font-inter text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Novo no ecotech? Siga estes passos para configurar sua
              conta:
            </p>
            <ol className="space-y-3" role="list">
              {quickStartSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-3 group">
                  <span
                    className="font-inter w-6 h-6 rounded-full bg-primary dark:bg-primary text-black dark:text-black text-sm flex items-center justify-center flex-shrink-0 font-semibold group-hover:scale-110 transition-transform"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="font-inter text-gray-600 dark:text-gray-300 pt-0.5">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* Guias */}
          <section aria-labelledby="guides-heading" className="mb-12 relative">
            <h2 id="guides-heading" className="sr-only">
              Guias disponíveis
            </h2>

            {/* Label decorativo */}
            <div
              className="absolute -top-8 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20"
              aria-hidden="true"
            >
              grid.md:grid-cols-2.gap-6
            </div>

            <nav aria-label="Guias de documentação">
              <ul className="grid md:grid-cols-2 gap-6" role="list">
                {guias.map((guia, index) => {
                  const Icon = guia.icon;
                  return (
                    <li key={guia.title}>
                      <Link
                        to={guia.href}
                        className="group relative block p-6 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/25 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
                        aria-label={`${guia.title} — ${guia.description}`}
                      >
                        {/* Decorações */}
                        <div
                          className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                          aria-hidden="true"
                        >
                          GUIDE_{String(index + 1).padStart(2, '0')}
                        </div>
                        <div
                          className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30 rounded-tl opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-hidden="true"
                        />
                        <div
                          className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gray-300 dark:border-white/20 rounded-tr"
                          aria-hidden="true"
                        />

                        <div className="flex items-start gap-4">
                          <div
                            className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/20 dark:group-hover:bg-primary/20 transition-colors border border-gray-200 dark:border-white/10 group-hover:border-primary/30 dark:group-hover:border-primary/30"
                            aria-hidden="true"
                          >
                            <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-inter font-semibold text-black dark:text-white group-hover:text-primary dark:group-hover:text-primary transition-colors">
                                {guia.title}
                              </h3>
                              <ArrowRight
                                className="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-primary dark:group-hover:text-primary group-hover:translate-x-1 transition-all"
                                aria-hidden="true"
                              />
                            </div>
                            <p className="font-inter text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                              {guia.description}
                            </p>
                          </div>
                        </div>

                        {/* Índice decorativo */}
                        <div
                          className="absolute bottom-2 right-2 text-[10px] font-mono text-gray-400 dark:text-white/20"
                          aria-hidden="true"
                        >
                          {String(index + 1).padStart(2, '0')}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </section>

          {/* Ajuda */}
          <section
            aria-labelledby="help-heading"
            className="relative text-center p-8 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
          >
            {/* Decorações */}
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
              id="help-heading"
              className="font-inter font-semibold text-black dark:text-white mb-2 text-lg"
            >
              Não encontrou o que procurava?
            </h2>
            <p className="font-inter text-gray-600 dark:text-gray-400 text-sm mb-4 leading-relaxed">
              Nossa documentação ainda está em construção. Se precisar de ajuda,
              entre em contato conosco.
            </p>
            <Link
              to="/contato"
              className="inline-flex items-center gap-2 font-inter text-primary dark:text-primary font-medium hover:underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded"
            >
              Falar com suporte
              <ArrowRight
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
