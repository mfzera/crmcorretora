import { createFileRoute } from '@tanstack/react-router';
import {
  CalendarDays,
  CheckSquare,
  RefreshCw,
  FileCheck,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Info,
  MousePointer,
  Layers,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_static/docs/agenda')({
  head: () => ({
    meta: [
      { title: 'Agenda - Calendário e Tarefas - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Guia do módulo de Agenda do Ecotech CRM. Gerencie tarefas, renovações e vencimentos em um calendário integrado.',
      },
      { property: 'og:title', content: 'Agenda - Calendário e Tarefas - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Calendário integrado com tarefas, renovações e vencimentos no Ecotech CRM.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/docs/agenda' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/docs/agenda' }],
  }),
  component: AgendaDocsPage,
});


const categorias = [
  {
    colorClass: 'bg-blue-500',
    label: 'Tarefas',
    icon: CheckSquare,
    description:
      'Lembretes e tarefas criadas manualmente no Dashboard ou na própria agenda. Aparecem no dia de vencimento.',
  },
  {
    colorClass: 'bg-orange-500',
    label: 'Renovações',
    icon: RefreshCw,
    description:
      'Apólices com vencimento no mês exibido. Geradas automaticamente pelo sistema com base nas datas de vencimento cadastradas.',
  },
  {
    colorClass: 'bg-purple-500',
    label: 'Vencimentos',
    icon: FileCheck,
    description:
      'Documentos e apólices com data de expiração. Inclui CNHs, certidões e demais documentos vinculados a clientes.',
  },
];

const features = [
  {
    icon: CalendarDays,
    title: 'Calendário mensal',
    description:
      'Grid com todos os dias do mês. Cada dia exibe pontos coloridos indicando quantos eventos existem naquela data, por categoria.',
    tip: 'Clique em qualquer dia para ver os detalhes dos eventos daquele dia no painel lateral.',
  },
  {
    icon: Filter,
    title: 'Filtros por categoria',
    description:
      'Ative ou desative a exibição de cada categoria individualmente. Por padrão, Tarefas, Renovações e Vencimentos estão todos ativos.',
    tip: 'Em dispositivos móveis, os filtros aparecem como chips acima do calendário.',
  },
  {
    icon: Layers,
    title: 'Sidebar com mini-calendário',
    description:
      'Na versão desktop, a sidebar exibe um mini-calendário para navegação rápida e a lista de eventos do dia selecionado logo abaixo.',
    tip: 'Use as setas do mini-calendário para ir a meses anteriores ou futuros sem mover o calendário principal.',
  },
  {
    icon: MousePointer,
    title: 'Detalhe do dia',
    description:
      'Ao selecionar um dia, o painel lateral (ou uma seção abaixo no mobile) lista todos os eventos com tipo, horário e descrição.',
    tip: 'Clique em um evento de renovação ou tarefa para ir diretamente ao registro correspondente.',
  },
];

const navigation = [
  {
    icon: ChevronLeft,
    label: 'Mês anterior',
    description: 'Seta esquerda no cabeçalho do calendário.',
  },
  {
    icon: ChevronRight,
    label: 'Próximo mês',
    description: 'Seta direita no cabeçalho do calendário.',
  },
];

function AgendaDocsPage() {
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
              MODULE.AGENDA
            </div>

            <div
              className="relative w-16 h-16 mb-6 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30"
              aria-hidden="true"
            >
              <CalendarDays className="w-8 h-8 text-primary" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
            </div>

            <div className="relative inline-block mb-6" aria-hidden="true">
              <span className="font-inter text-primary text-sm font-semibold uppercase tracking-widest">
                MÓDULO
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Agenda
            </h1>
            <p className="font-inter text-lg text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              Calendário integrado que consolida tarefas, renovações e
              vencimentos de documentos em uma única visão temporal. Navegue por
              meses, filtre por categoria e veja os detalhes de cada dia.
            </p>

            <div className="mt-6">
              <Link
                to="/agenda"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black font-inter font-medium text-sm hover:bg-primary/90 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
              >
                Abrir Agenda
                <ArrowRight
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </header>

          {/* Tipos de evento */}
          <section
            aria-labelledby="event-types-heading"
            className="relative rounded-2xl p-8 mb-12 border border-primary/30 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black"
          >
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              EVENT_TYPES
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
              id="event-types-heading"
              className="font-inter text-2xl font-semibold text-black dark:text-white mb-2"
            >
              Tipos de evento
            </h2>
            <p className="font-inter text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
              A agenda agrupa os eventos em três categorias, cada uma com uma
              cor diferente no calendário.
            </p>

            <ul className="grid md:grid-cols-3 gap-4" role="list">
              {categorias.map((cat) => {
                const Icon = cat.icon;
                return (
                  <li
                    key={cat.label}
                    className="p-5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${cat.colorClass}`}
                        aria-hidden="true"
                      />
                      <div
                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10"
                        aria-hidden="true"
                      >
                        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <h3 className="font-inter font-semibold text-black dark:text-white text-sm">
                        {cat.label}
                      </h3>
                    </div>
                    <p className="font-inter text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {cat.description}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Funcionalidades */}
          <section aria-labelledby="features-heading" className="mb-12">
            <h2
              id="features-heading"
              className="font-inter text-2xl font-semibold text-black dark:text-white mb-6"
            >
              Funcionalidades
            </h2>

            <ul className="space-y-4" role="list">
              {features.map((feat, index) => {
                const Icon = feat.icon;
                return (
                  <li
                    key={feat.title}
                    className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
                  >
                    <div
                      className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                      aria-hidden="true"
                    >
                      FEAT_{String(index + 1).padStart(2, '0')}
                    </div>
                    <div
                      className="absolute top-0 right-0 w-4 h-4 border-t border-r border-gray-200 dark:border-white/10"
                      aria-hidden="true"
                    />

                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center flex-shrink-0"
                        aria-hidden="true"
                      >
                        <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-inter font-semibold text-black dark:text-white mb-2">
                          {feat.title}
                        </h3>
                        <p className="font-inter text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                          {feat.description}
                        </p>
                        <div
                          className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20"
                          role="note"
                        >
                          <Info
                            className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <p className="font-inter text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                            <span className="sr-only">Dica: </span>
                            {feat.tip}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Navegação entre meses */}
          <section
            aria-labelledby="navigation-heading"
            className="relative rounded-xl p-6 mb-12 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
          >
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              NAVIGATION
            </div>
            <div
              className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <h2
              id="navigation-heading"
              className="font-inter text-lg font-semibold text-black dark:text-white mb-4"
            >
              Navegação entre meses
            </h2>
            <p className="font-inter text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Use as setas no cabeçalho do calendário para navegar entre os
              meses. Os eventos são carregados automaticamente ao mudar de mês.
            </p>
            <ul className="flex flex-wrap gap-3" role="list">
              {navigation.map((nav) => {
                const Icon = nav.icon;
                return (
                  <li
                    key={nav.label}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
                  >
                    <div
                      className="w-7 h-7 rounded-md bg-gray-100 dark:bg-white/5 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-inter text-sm font-medium text-black dark:text-white">
                        {nav.label}
                      </p>
                      <p className="font-inter text-xs text-gray-500 dark:text-gray-500">
                        {nav.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Permissões */}
          <section
            aria-labelledby="permissions-heading"
            className="relative rounded-xl p-6 mb-12 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
          >
            <div
              className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <h2
              id="permissions-heading"
              className="font-inter text-lg font-semibold text-black dark:text-white mb-3"
            >
              Permissões necessárias
            </h2>
            <p className="font-inter text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              O acesso à Agenda requer a permissão{' '}
              <code className="font-mono text-xs bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 text-black dark:text-white">
                dashboard:visualizar
              </code>
              . Usuários sem essa permissão são redirecionados automaticamente.
            </p>
            <p className="font-inter text-sm text-gray-500 dark:text-gray-500">
              Para configurar permissões de cargos, acesse{' '}
              <Link
                to="/configuracoes/cargos"
                className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                Configurações, Cargos
              </Link>
              .
            </p>
          </section>

          {/* Veja também */}
          <nav
            aria-labelledby="see-also-heading"
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
              id="see-also-heading"
              className="font-inter font-semibold text-black dark:text-white mb-3"
            >
              Veja também
            </h2>
            <ul className="flex flex-wrap gap-3" role="list">
              <li>
                <Link
                  to="/docs/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Dashboard
                  <ArrowRight
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </li>
              <li>
                <Link
                  to="/docs/overview"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Overview do Sistema
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
