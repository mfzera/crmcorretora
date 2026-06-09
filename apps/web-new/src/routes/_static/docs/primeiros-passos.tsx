import { createFileRoute } from '@tanstack/react-router';
import {
  CheckCircle2,
  User,
  Building2,
  Users,
  FileText,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_static/docs/primeiros-passos')({
  head: () => ({
    meta: [
      { title: 'Primeiros Passos - Guia de Início - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Aprenda a criar sua conta, configurar sua corretora e começar a usar o Ecotech CRM em minutos. Guia completo para novos usuários.',
      },
      { property: 'og:title', content: 'Primeiros Passos - Guia de Início - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Guia completo para novos usuários do Ecotech CRM. Configure sua conta e comece em minutos.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/docs/primeiros-passos' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/docs/primeiros-passos' }],
  }),
  component: PrimeirosPassosPage,
});


const steps = [
  {
    icon: User,
    title: 'Crie sua Conta',
    description:
      'Acesse a página de cadastro e preencha suas informações pessoais.',
    details: [
      'Utilize um email corporativo válido',
      'Crie uma senha forte (mínimo 8 caracteres)',
      'Confirme seu email através do link enviado',
    ],
    action: { text: 'Ir para Cadastro', href: '/cadastro' },
  },
  {
    icon: Building2,
    title: 'Configure sua Corretora',
    description:
      'Preencha os dados da sua corretora para personalizar o sistema.',
    details: [
      'Adicione o nome fantasia e razão social',
      'Informe o CNPJ e dados de contato',
      'Configure preferências de comissão',
      'Faça upload do logotipo da sua empresa',
    ],
  },
  {
    icon: Users,
    title: 'Convide sua Equipe',
    description: 'Adicione membros da equipe e defina permissões de acesso.',
    details: [
      'Convide usuários por email',
      'Atribua cargos (Admin, Gestor, Vendedor)',
      'Defina permissões por cargo',
      'Organize equipes por setores',
    ],
    action: { text: 'Gerenciar Usuários', href: '/users' },
  },
  {
    icon: FileText,
    title: 'Cadastre seus Clientes',
    description: 'Importe ou cadastre seus clientes no sistema.',
    details: [
      'Cadastre clientes PF (Pessoa Física) ou PJ (Pessoa Jurídica)',
      'Importe clientes via planilha Excel/CSV',
      'Atribua vendedores responsáveis',
      'Organize por categorias e tags',
    ],
    action: { text: 'Cadastrar Clientes', href: '/clients' },
  },
];

const tips = [
  {
    title: 'Explore o Dashboard',
    description:
      'O dashboard apresenta métricas em tempo real do seu negócio. Acompanhe vendas, propostas e renovações.',
  },
  {
    title: 'Configure Notificações',
    description:
      'Ative alertas para não perder prazos importantes como vencimentos de apólices e follow-ups.',
  },
  {
    title: 'Utilize o Chat',
    description:
      'Colabore com sua equipe em tempo real através do chat integrado. Compartilhe arquivos e informações.',
  },
  {
    title: 'Gerencie Renovações',
    description:
      'O sistema detecta automaticamente apólices próximas do vencimento. Configure alertas com 45 dias de antecedência.',
  },
];

function PrimeirosPassosPage() {
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
        <div
          className="absolute left-6 sm:left-8 top-0 bottom-0 w-px opacity-40 dark:opacity-40"
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
          className="absolute right-6 sm:right-8 top-0 bottom-0 w-px opacity-40 dark:opacity-40"
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
        <div>page.docs.primeiros-passos</div>
        <div>getting.started.guide</div>
      </div>

      <main id="main-content" className="relative py-24 z-10">
        <div className="mx-auto max-w-5xl px-6 sm:px-8">
          {/* Navegação de volta */}
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
              GETTING_STARTED
            </div>

            <div
              className="relative w-16 h-16 mb-6 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30"
              aria-hidden="true"
            >
              <CheckCircle2 className="w-8 h-8 text-primary" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
            </div>

            <div className="relative inline-block mb-6" aria-hidden="true">
              <span className="font-inter text-primary text-sm font-semibold uppercase tracking-widest">
                GUIA DE INÍCIO
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Primeiros Passos
            </h1>
            <p className="font-inter text-lg text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              Configure sua conta e comece a usar o ecotech em
              minutos. Siga este guia passo a passo para configurar
              completamente sua corretora.
            </p>
          </header>

          {/* Steps */}
          <section aria-labelledby="steps-heading">
            <h2 id="steps-heading" className="sr-only">
              Passos para configuração
            </h2>
            <ol className="space-y-8 mb-16" role="list">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={index}
                    className="relative rounded-2xl p-8 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    {/* Número do passo */}
                    <div
                      className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center font-inter font-bold text-lg border-4 border-white dark:border-black"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </div>

                    {/* Decorações */}
                    <div
                      className="absolute -top-3 left-12 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                      aria-hidden="true"
                    >
                      STEP_{String(index + 1).padStart(2, '0')}
                    </div>
                    <div
                      className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-gray-300 dark:border-white/20"
                      aria-hidden="true"
                    />

                    <div className="flex flex-col md:flex-row gap-6">
                      <div
                        className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10 flex-shrink-0"
                        aria-hidden="true"
                      >
                        <Icon className="w-6 h-6 text-primary" />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-inter text-2xl font-semibold text-black dark:text-white mb-3">
                          <span className="sr-only">Passo {index + 1}: </span>
                          {step.title}
                        </h3>
                        <p className="font-inter text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                          {step.description}
                        </p>

                        <ul className="space-y-2 mb-6" role="list">
                          {step.details.map((detail, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-3 text-gray-500 dark:text-gray-400 text-sm"
                            >
                              <CheckCircle2
                                className="w-4 h-4 text-primary mt-0.5 flex-shrink-0"
                                aria-hidden="true"
                              />
                              <span className="font-inter">{detail}</span>
                            </li>
                          ))}
                        </ul>

                        {step.action && (
                          <Link
                            to={step.action.href}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black font-inter font-medium hover:bg-primary/90 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
                          >
                            {step.action.text}
                            <ArrowRight
                              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                              aria-hidden="true"
                            />
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Dicas */}
          <section
            aria-labelledby="tips-heading"
            className="relative rounded-2xl p-8 border border-primary/30 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black mb-12"
          >
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              HELPFUL_TIPS
            </div>
            <div
              className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/60"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30"
                aria-hidden="true"
              >
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2
                  id="tips-heading"
                  className="font-inter text-2xl font-semibold text-black dark:text-white mb-2"
                >
                  Dicas Úteis
                </h2>
                <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed">
                  Aproveite ao máximo o sistema com estas recomendações.
                </p>
              </div>
            </div>

            <ul className="grid md:grid-cols-2 gap-4" role="list">
              {tips.map((tip, index) => (
                <li
                  key={index}
                  className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                >
                  <h3 className="font-inter font-semibold text-black dark:text-white mb-2">
                    {tip.title}
                  </h3>
                  <p className="font-inter text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {tip.description}
                  </p>
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
              Próximos Passos
            </h2>
            <p className="font-inter text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
              Agora que você configurou sua conta, explore outros recursos:
            </p>
            <ul className="flex flex-wrap gap-3" role="list">
              <li>
                <Link
                  to="/docs/clientes"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Gestão de Clientes
                  <ArrowRight
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </li>
              <li>
                <Link
                  to="/docs/cotacoes"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Criar Cotações
                  <ArrowRight
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </li>
              <li>
                <Link
                  to="/docs/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Explorar Dashboard
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
