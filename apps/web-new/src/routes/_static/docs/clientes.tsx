import { createFileRoute } from '@tanstack/react-router';
import {
  Users,
  UserPlus,
  Building2,
  Search,
  Upload,
  Edit3,
  Trash2,
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  Tag,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_static/docs/clientes')({
  head: () => ({
    meta: [
      { title: 'Gestão de Clientes - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Guia completo para gerenciar clientes PF e PJ no Ecotech CRM. Cadastro, pesquisa, controle de vendedores e histórico de seguros.',
      },
      { property: 'og:title', content: 'Gestão de Clientes - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Como cadastrar e gerenciar clientes PF e PJ no Ecotech CRM.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/docs/clientes' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/docs/clientes' }],
  }),
  component: ClientesPage,
});


const features = [
  {
    icon: UserPlus,
    title: 'Cadastro de Clientes',
    description:
      'Cadastre clientes PF (Pessoa Física) ou PJ (Pessoa Jurídica) com todos os dados necessários.',
    details: [
      'CPF ou CNPJ com validação automática',
      'Dados de contato: telefone, email, endereço',
      'Informações adicionais personalizáveis',
      'Status ativo/inativo para controle',
    ],
  },
  {
    icon: Upload,
    title: 'Importação em Massa',
    description: 'Importe clientes de planilhas Excel ou CSV de forma rápida.',
    details: [
      'Suporte para Excel (.xlsx) e CSV',
      'Validação automática dos dados',
      'Detecção de duplicatas',
      'Relatório de erros e sucessos',
    ],
  },
  {
    icon: Search,
    title: 'Busca Avançada',
    description: 'Encontre clientes rapidamente com filtros inteligentes.',
    details: [
      'Busca por nome, CPF/CNPJ ou email',
      'Filtros por vendedor responsável',
      'Filtros por status e tags',
      'Resultados em tempo real',
    ],
  },
  {
    icon: ArrowLeftRight,
    title: 'Transferência de Clientes',
    description: 'Transfira clientes entre vendedores mantendo histórico.',
    details: [
      'Transferência individual ou em lote',
      'Histórico de transferências',
      'Notificação automática aos envolvidos',
      'Manutenção de dados e documentos',
    ],
  },
  {
    icon: Tag,
    title: 'Organização com Tags',
    description: 'Organize e categorize seus clientes com tags personalizadas.',
    details: [
      'Crie tags customizadas',
      'Múltiplas tags por cliente',
      'Filtros por categorias',
      'Cores para identificação visual',
    ],
  },
  {
    icon: Edit3,
    title: 'Edição e Histórico',
    description: 'Edite informações e acompanhe o histórico completo.',
    details: [
      'Edição rápida de dados',
      'Histórico de alterações',
      'Controle de versões',
      'Auditoria de modificações',
    ],
  },
];

const clientTypes = [
  {
    type: 'PF',
    title: 'Pessoa Física',
    icon: Users,
    iconBg: 'bg-blue-500/20',
    iconBorder: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    fields: [
      { label: 'Nome Completo', required: true },
      { label: 'CPF', required: true },
      { label: 'Data de Nascimento', required: false },
      { label: 'RG', required: false },
      { label: 'Telefone', required: true },
      { label: 'Email', required: true },
      { label: 'Endereço Completo', required: false },
    ],
  },
  {
    type: 'PJ',
    title: 'Pessoa Jurídica',
    icon: Building2,
    iconBg: 'bg-purple-500/20',
    iconBorder: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    fields: [
      { label: 'Razão Social', required: true },
      { label: 'Nome Fantasia', required: false },
      { label: 'CNPJ', required: true },
      { label: 'Inscrição Estadual', required: false },
      { label: 'Responsável', required: false },
      { label: 'Telefone', required: true },
      { label: 'Email', required: true },
      { label: 'Endereço Completo', required: false },
    ],
  },
];

const workflows = [
  {
    step: '1',
    title: 'Acesse a Listagem',
    description: 'Navegue até o menu "Clientes" no painel lateral.',
  },
  {
    step: '2',
    title: 'Clique em Novo Cliente',
    description: 'Use o botão "Novo Cliente" no canto superior direito.',
  },
  {
    step: '3',
    title: 'Escolha o Tipo',
    description: 'Selecione Pessoa Física (PF) ou Pessoa Jurídica (PJ).',
  },
  {
    step: '4',
    title: 'Preencha os Dados',
    description: 'Complete o formulário com as informações do cliente.',
  },
  {
    step: '5',
    title: 'Atribua Vendedor',
    description: 'Selecione o vendedor responsável pelo cliente.',
  },
  {
    step: '6',
    title: 'Salve e Confirme',
    description: 'Clique em "Salvar" para concluir o cadastro.',
  },
];

function ClientesPage() {
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
        <div>page.docs.clientes</div>
        <div>client.management.guide</div>
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
              CLIENT_MANAGEMENT
            </div>

            <div
              className="relative w-16 h-16 mb-6 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30"
              aria-hidden="true"
            >
              <Users className="w-8 h-8 text-blue-400" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500/60" />
            </div>

            <div className="relative inline-block mb-6" aria-hidden="true">
              <span className="font-inter text-blue-400 text-sm font-semibold uppercase tracking-widest">
                GESTÃO DE CLIENTES
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-blue-400 opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Gestão de Clientes
            </h1>
            <p className="font-inter text-lg text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              Cadastre, organize e gerencie seus clientes de forma eficiente.
              Suporte completo para Pessoa Física e Pessoa Jurídica com
              importação em massa e transferência entre vendedores.
            </p>
          </header>

          {/* Tipos de cliente */}
          <section aria-labelledby="client-types-heading" className="mb-16">
            <h2 id="client-types-heading" className="sr-only">
              Tipos de cliente
            </h2>
            <ul className="grid md:grid-cols-2 gap-6" role="list">
              {clientTypes.map((clientType) => {
                const Icon = clientType.icon;
                return (
                  <li
                    key={clientType.type}
                    className="relative rounded-2xl p-8 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
                  >
                    <div
                      className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                      aria-hidden="true"
                    >
                      CLIENT_TYPE_{clientType.type}
                    </div>
                    <div
                      className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-gray-300 dark:border-white/20"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-gray-300 dark:border-white/20"
                      aria-hidden="true"
                    />

                    <div className="flex items-start gap-4 mb-6">
                      <div
                        className={`w-12 h-12 rounded-xl ${clientType.iconBg} flex items-center justify-center border ${clientType.iconBorder}`}
                        aria-hidden="true"
                      >
                        <Icon className={`w-6 h-6 ${clientType.iconColor}`} />
                      </div>
                      <div>
                        <div
                          className="text-xs font-mono text-gray-500 dark:text-gray-500 mb-1"
                          aria-hidden="true"
                        >
                          {clientType.type}
                        </div>
                        <h3 className="font-inter text-xl font-semibold text-black dark:text-white">
                          {clientType.title}
                        </h3>
                      </div>
                    </div>

                    <ul
                      className="space-y-2"
                      role="list"
                      aria-label={`Campos de ${clientType.title}`}
                    >
                      {clientType.fields.map((field, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between text-sm py-1.5 px-2 rounded border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.01]"
                        >
                          <span className="font-inter text-gray-700 dark:text-gray-300">
                            {field.label}
                          </span>
                          {field.required ? (
                            <span className="text-[10px] font-mono text-primary">
                              OBRIGATÓRIO
                            </span>
                          ) : (
                            <span className="sr-only">Opcional</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Workflow de cadastro */}
          <section
            aria-labelledby="workflow-heading"
            className="relative rounded-2xl p-8 border border-primary/30 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black mb-16"
          >
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              CADASTRO_WORKFLOW
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
              id="workflow-heading"
              className="font-inter text-2xl font-semibold text-black dark:text-white mb-6"
            >
              Como Cadastrar um Cliente
            </h2>

            <ol className="grid md:grid-cols-3 gap-4" role="list">
              {workflows.map((workflow, index) => (
                <li key={index} className="relative">
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] h-full">
                    <div
                      className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-inter font-bold mb-3"
                      aria-hidden="true"
                    >
                      {workflow.step}
                    </div>
                    <h3 className="font-inter font-semibold text-black dark:text-white mb-2">
                      <span className="sr-only">Passo {workflow.step}: </span>
                      {workflow.title}
                    </h3>
                    <p className="font-inter text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {workflow.description}
                    </p>
                  </div>
                  {index < workflows.length - 1 && (
                    <div
                      className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-primary/30"
                      aria-hidden="true"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* Funcionalidades */}
          <section aria-labelledby="features-heading" className="mb-16">
            <div className="relative mb-8">
              <div
                className="absolute -top-6 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20"
                aria-hidden="true"
              >
                FEATURES_GRID
              </div>
              <h2
                id="features-heading"
                className="font-inter text-3xl font-semibold text-black dark:text-white mb-2"
              >
                Funcionalidades
              </h2>
              <p className="font-inter text-gray-500 dark:text-gray-400 leading-relaxed">
                Todas as ferramentas que você precisa para gerenciar seus
                clientes.
              </p>
            </div>

            <ul
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              role="list"
            >
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <li
                    key={index}
                    className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <div
                      className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                      aria-hidden="true"
                    >
                      FEAT_{String(index + 1).padStart(2, '0')}
                    </div>
                    <div
                      className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gray-200 dark:border-white/20 rounded-tr"
                      aria-hidden="true"
                    />

                    <div
                      className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 border border-gray-200 dark:border-white/10"
                      aria-hidden="true"
                    >
                      <Icon className="w-5 h-5 text-primary" />
                    </div>

                    <h3 className="font-inter font-semibold text-black dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="font-inter text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                      {feature.description}
                    </p>

                    <ul className="space-y-1.5" role="list">
                      {feature.details.map((detail, idx) => (
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
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Boas Práticas */}
          <section
            aria-labelledby="practices-heading"
            className="relative rounded-xl p-8 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] mb-12"
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
              id="practices-heading"
              className="font-inter text-xl font-semibold text-black dark:text-white mb-4"
            >
              Boas Práticas
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <ul className="space-y-3" role="list">
                <li className="flex items-start gap-3">
                  <Phone
                    className="w-5 h-5 text-primary mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-inter font-semibold text-black dark:text-white text-sm mb-1">
                      Mantenha Contatos Atualizados
                    </h3>
                    <p className="font-inter text-sm text-gray-500 dark:text-gray-400">
                      Verifique e atualize telefones e emails regularmente para
                      garantir comunicação efetiva.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail
                    className="w-5 h-5 text-primary mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-inter font-semibold text-black dark:text-white text-sm mb-1">
                      Use Tags Organizadas
                    </h3>
                    <p className="font-inter text-sm text-gray-500 dark:text-gray-400">
                      Crie um sistema de tags consistente para facilitar buscas
                      e segmentação.
                    </p>
                  </div>
                </li>
              </ul>
              <ul className="space-y-3" role="list">
                <li className="flex items-start gap-3">
                  <MapPin
                    className="w-5 h-5 text-primary mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-inter font-semibold text-black dark:text-white text-sm mb-1">
                      Complete Endereços
                    </h3>
                    <p className="font-inter text-sm text-gray-500 dark:text-gray-400">
                      Endereços completos facilitam entregas de documentos e
                      visitas.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Trash2
                    className="w-5 h-5 text-primary mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-inter font-semibold text-black dark:text-white text-sm mb-1">
                      Inative ao Invés de Deletar
                    </h3>
                    <p className="font-inter text-sm text-gray-500 dark:text-gray-400">
                      Mantenha histórico de clientes inativos ao invés de
                      deletá-los.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
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
              Agora que você sabe gerenciar clientes, explore:
            </p>
            <ul className="flex flex-wrap gap-3" role="list">
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
                  to="/clientes"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors group text-sm font-inter font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
                >
                  Acessar Clientes
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
