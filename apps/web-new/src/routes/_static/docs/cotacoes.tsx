import { createFileRoute } from '@tanstack/react-router';
import {
  FileText,
  Calculator,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  FileCheck,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_static/docs/cotacoes')({
  head: () => ({
    meta: [
      { title: 'Gestão de Cotações - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Aprenda a criar e gerenciar cotações, propostas e documentos de venda no Ecotech CRM. Controle completo do processo comercial.',
      },
      { property: 'og:title', content: 'Gestão de Cotações - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Como criar e gerenciar cotações e propostas de seguros no Ecotech CRM.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/docs/cotacoes' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/docs/cotacoes' }],
  }),
  component: CotacoesPage,
});


const statuses = [
  {
    status: 'EM_ELABORACAO',
    label: 'Em Elaboração',
    icon: Clock,
    iconBg: 'bg-gray-500/20',
    iconBorder: 'border-gray-500/30',
    iconColor: 'text-gray-400',
    description: 'Cotação está sendo criada e ainda não foi enviada.',
  },
  {
    status: 'ENVIADA_CLIENTE',
    label: 'Enviada ao Cliente',
    icon: Send,
    iconBg: 'bg-blue-500/20',
    iconBorder: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    description: 'Cotação foi enviada e aguarda resposta do cliente.',
  },
  {
    status: 'APROVADA_CLIENTE',
    label: 'Aprovada',
    icon: CheckCircle2,
    iconBg: 'bg-green-500/20',
    iconBorder: 'border-green-500/30',
    iconColor: 'text-green-400',
    description: 'Cliente aprovou a cotação. Próximo passo: criar proposta.',
  },
  {
    status: 'RECUSADA_CLIENTE',
    label: 'Recusada',
    icon: XCircle,
    iconBg: 'bg-red-500/20',
    iconBorder: 'border-red-500/30',
    iconColor: 'text-red-400',
    description: 'Cliente recusou a cotação.',
  },
  {
    status: 'EXPIRADA',
    label: 'Expirada',
    icon: AlertCircle,
    iconBg: 'bg-orange-500/20',
    iconBorder: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    description: 'Cotação passou da data de validade.',
  },
  {
    status: 'CONVERTIDA',
    label: 'Convertida',
    icon: TrendingUp,
    iconBg: 'bg-emerald-500/20',
    iconBorder: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    description: 'Cotação foi convertida em proposta ou venda.',
  },
];

const workflow = [
  {
    step: '1',
    title: 'Criar Cotação',
    description: 'Acesse o menu Cotações e clique em "Nova Cotação".',
    action: 'Preencha dados básicos: cliente, produto, seguradora.',
  },
  {
    step: '2',
    title: 'Calcular Valores',
    description: 'Insira o valor do prêmio e calcule comissões.',
    action: 'O sistema calcula automaticamente comissões e valores.',
  },
  {
    step: '3',
    title: 'Adicionar Detalhes',
    description: 'Complete coberturas, franquias e observações.',
    action: 'Quanto mais detalhes, melhor para o cliente decidir.',
  },
  {
    step: '4',
    title: 'Enviar ao Cliente',
    description: 'Revise e envie a cotação por email.',
    action: 'Status muda para "Enviada ao Cliente" automaticamente.',
  },
  {
    step: '5',
    title: 'Acompanhar Resposta',
    description: 'Aguarde feedback e atualize o status.',
    action: 'Aprove, recuse ou crie uma nova versão.',
  },
  {
    step: '6',
    title: 'Converter em Proposta',
    description: 'Se aprovada, converta em proposta comercial.',
    action: 'Próxima etapa: formalizar a venda.',
  },
];

const features = [
  {
    icon: Calculator,
    title: 'Cálculo Automático',
    description: 'Comissões e valores calculados automaticamente.',
    bullets: [
      'Cálculo de comissão baseado no produto',
      'Comissões compartilhadas entre vendedores',
      'Ajustes manuais quando necessário',
      'Histórico de alterações',
    ],
  },
  {
    icon: FileCheck,
    title: 'Múltiplas Versões',
    description: 'Crie versões diferentes da mesma cotação.',
    bullets: [
      'Compare diferentes seguradoras',
      'Teste variações de cobertura',
      'Histórico completo de versões',
      'Fácil comparação lado a lado',
    ],
  },
  {
    icon: Send,
    title: 'Envio por Email',
    description: 'Envie cotações diretamente por email.',
    bullets: [
      'Template profissional automático',
      'Anexe arquivos e documentos',
      'Rastreamento de abertura',
      'Respostas centralizadas',
    ],
  },
  {
    icon: RefreshCw,
    title: 'Conversão Inteligente',
    description: 'Converta cotações em propostas e vendas.',
    bullets: [
      'Um clique para converter',
      'Dados transferidos automaticamente',
      'Histórico de conversões',
      'Pipeline de vendas integrado',
    ],
  },
];

const bestPractices = [
  {
    title: 'Seja Detalhado',
    description:
      'Quanto mais informações você adicionar sobre coberturas e condições, mais fácil será para o cliente tomar uma decisão informada.',
  },
  {
    title: 'Defina Validade',
    description:
      'Sempre configure uma data de validade para criar senso de urgência e evitar cotações desatualizadas.',
  },
  {
    title: 'Compare Seguradoras',
    description:
      'Crie múltiplas versões com diferentes seguradoras para oferecer opções ao cliente.',
  },
  {
    title: 'Acompanhe o Status',
    description:
      'Atualize o status regularmente e configure lembretes para follow-up com clientes.',
  },
  {
    title: 'Use Observações',
    description:
      'Adicione observações internas para registrar contexto importante sobre a cotação.',
  },
  {
    title: 'Anexe Documentos',
    description:
      'Anexe propostas, contratos e documentação adicional para referência futura.',
  },
];

function CotacoesPage() {
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
        <div>page.docs.cotacoes</div>
        <div>quotes.management.guide</div>
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
              QUOTES_MANAGEMENT
            </div>

            <div
              className="relative w-16 h-16 mb-6 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30"
              aria-hidden="true"
            >
              <FileText className="w-8 h-8 text-purple-400" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500/60" />
            </div>

            <div className="relative inline-block mb-6" aria-hidden="true">
              <span className="font-inter text-purple-400 text-sm font-semibold uppercase tracking-widest">
                COTAÇÕES
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-purple-400 opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Gestão de Cotações
            </h1>
            <p className="font-inter text-lg text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              Crie, envie e gerencie cotações de forma rápida e profissional.
              Acompanhe todo o ciclo desde a elaboração até a conversão em
              venda.
            </p>
          </header>

          {/* Ciclo de vida */}
          <section
            aria-labelledby="status-flow-heading"
            className="relative rounded-2xl p-8 border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-gray-50 to-gray-50 dark:from-purple-500/10 dark:via-black dark:to-black mb-16"
          >
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              STATUS_FLOW
            </div>
            <div
              className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-purple-500/60"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <h2
              id="status-flow-heading"
              className="font-inter text-2xl font-semibold text-black dark:text-white mb-6"
            >
              Ciclo de Vida da Cotação
            </h2>

            <ol
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
              role="list"
            >
              {statuses.map((s, index) => {
                const Icon = s.icon;
                return (
                  <li
                    key={s.status}
                    className="relative p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                  >
                    <div
                      className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-white dark:bg-black border-2 border-gray-200 dark:border-white/20 flex items-center justify-center text-[10px] font-mono text-gray-400 dark:text-white/40"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </div>

                    <div className="flex items-start gap-3 mb-2">
                      <div
                        className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center border ${s.iconBorder} flex-shrink-0`}
                        aria-hidden="true"
                      >
                        <Icon className={`w-4 h-4 ${s.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <div
                          className="text-[10px] font-mono text-gray-500 dark:text-gray-500 mb-0.5"
                          aria-hidden="true"
                        >
                          {s.status}
                        </div>
                        <h3 className="font-inter font-semibold text-black dark:text-white text-sm">
                          <span className="sr-only">Etapa {index + 1}: </span>
                          {s.label}
                        </h3>
                      </div>
                    </div>
                    <p className="font-inter text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {s.description}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Workflow */}
          <section aria-labelledby="creation-heading" className="mb-16">
            <div className="relative mb-8">
              <div
                className="absolute -top-6 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20"
                aria-hidden="true"
              >
                CREATION_WORKFLOW
              </div>
              <h2
                id="creation-heading"
                className="font-inter text-3xl font-semibold text-black dark:text-white mb-2"
              >
                Como Criar uma Cotação
              </h2>
              <p className="font-inter text-gray-500 dark:text-gray-400 leading-relaxed">
                Processo completo do início ao fim.
              </p>
            </div>

            <ol
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              role="list"
            >
              {workflow.map((s, index) => (
                <li
                  key={index}
                  className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
                >
                  <div
                    className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                    aria-hidden="true"
                  >
                    STEP_{s.step}
                  </div>
                  <div
                    className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gray-200 dark:border-white/20 rounded-tr"
                    aria-hidden="true"
                  />

                  <div
                    className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center font-inter font-bold text-lg mb-4"
                    aria-hidden="true"
                  >
                    {s.step}
                  </div>

                  <h3 className="font-inter font-semibold text-black dark:text-white mb-2">
                    <span className="sr-only">Passo {s.step}: </span>
                    {s.title}
                  </h3>
                  <p className="font-inter text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                    {s.description}
                  </p>
                  <div
                    className="p-2 rounded border border-primary/20 bg-primary/5"
                    role="note"
                  >
                    <p className="font-inter text-xs text-primary">
                      {s.action}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Recursos principais */}
          <section aria-labelledby="key-features-heading" className="mb-16">
            <div className="relative mb-8">
              <div
                className="absolute -top-6 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20"
                aria-hidden="true"
              >
                KEY_FEATURES
              </div>
              <h2
                id="key-features-heading"
                className="font-inter text-3xl font-semibold text-black dark:text-white mb-2"
              >
                Recursos Principais
              </h2>
              <p className="font-inter text-gray-500 dark:text-gray-400 leading-relaxed">
                Ferramentas que tornam o processo mais eficiente.
              </p>
            </div>

            <ul className="grid md:grid-cols-2 gap-6" role="list">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <li
                    key={index}
                    className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
                  >
                    <div
                      className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                      aria-hidden="true"
                    >
                      FEATURE_{String(index + 1).padStart(2, '0')}
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
                          {feature.title}
                        </h3>
                        <p className="font-inter text-sm text-gray-500 dark:text-gray-400">
                          {feature.description}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-1.5" role="list">
                      {feature.bullets.map((bullet, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-500"
                        >
                          <div
                            className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0"
                            aria-hidden="true"
                          />
                          <span className="font-inter">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Boas Práticas */}
          <section
            aria-labelledby="best-practices-heading"
            className="relative rounded-2xl p-8 border border-primary/30 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black mb-12"
          >
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              BEST_PRACTICES
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
              id="best-practices-heading"
              className="font-inter text-2xl font-semibold text-black dark:text-white mb-6"
            >
              Boas Práticas
            </h2>

            <ol className="grid md:grid-cols-2 gap-4" role="list">
              {bestPractices.map((practice, index) => (
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
                        {practice.title}
                      </h3>
                      <p className="font-inter text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {practice.description}
                      </p>
                    </div>
                  </div>
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
              Continue aprendendo sobre o sistema:
            </p>
            <ul className="flex flex-wrap gap-3" role="list">
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
              <li>
                <Link
                  to={"/cotacoes" as any}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors group text-sm font-inter font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
                >
                  Criar Cotação
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
