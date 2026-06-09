import { createFileRoute } from '@tanstack/react-router';
import {
  Settings,
  User,
  Building2,
  Bell,
  Shield,
  Database,
  CreditCard,
  Users,
  FileText,
  ArrowLeft,
  ArrowRight,
  Key,
  Webhook,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_static/docs/configuracoes')({
  head: () => ({
    meta: [
      { title: 'Configurações do Sistema - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Como configurar sua conta, equipe, permissões e preferências no Ecotech CRM. Guia completo de configurações do sistema.',
      },
      { property: 'og:title', content: 'Configurações do Sistema - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Configure conta, equipe, permissões e preferências no Ecotech CRM.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/docs/configuracoes' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/docs/configuracoes' }],
  }),
  component: ConfiguracoesPage,
});


const allSections = [
  {
    icon: User,
    title: 'Perfil Pessoal',
    description: 'Configurações da sua conta individual.',
    iconBg: 'bg-blue-500/20',
    iconBorder: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    settings: [
      { label: 'Nome e foto de perfil', path: '/perfil' },
      { label: 'Email e senha', path: '/perfil/seguranca' },
      { label: 'Preferências de idioma', path: '/perfil/preferencias' },
      { label: 'Fuso horário', path: '/perfil/preferencias' },
      { label: 'Notificações por email', path: '/perfil/notificacoes' },
    ],
  },
  {
    icon: Building2,
    title: 'Empresa/Corretora',
    description: 'Informações e configurações da organização.',
    iconBg: 'bg-purple-500/20',
    iconBorder: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    settings: [
      { label: 'Razão social e nome fantasia', path: '/workspace/empresa' },
      { label: 'CNPJ e dados fiscais', path: '/workspace/empresa' },
      { label: 'Endereço e contato', path: '/workspace/empresa' },
      { label: 'Logotipo da empresa', path: '/workspace/branding' },
      { label: 'Cores e identidade visual', path: '/workspace/branding' },
    ],
  },
  {
    icon: Users,
    title: 'Equipe e Permissões',
    description: 'Gerencie usuários, cargos e acessos.',
    iconBg: 'bg-green-500/20',
    iconBorder: 'border-green-500/30',
    iconColor: 'text-green-400',
    settings: [
      { label: 'Adicionar e remover usuários', path: '/users' },
      { label: 'Definir cargos e funções', path: '/roles' },
      { label: 'Configurar permissões por cargo', path: '/roles' },
      { label: 'Organizar equipes', path: '/users' },
      { label: 'Histórico de atividades', path: '/admin/logs' },
    ],
  },
  {
    icon: Bell,
    title: 'Notificações',
    description: 'Configure alertas e notificações do sistema.',
    iconBg: 'bg-orange-500/20',
    iconBorder: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    settings: [
      { label: 'Notificações push', path: '/perfil/notificacoes' },
      { label: 'Emails automáticos', path: '/workspace/notificacoes' },
      { label: 'Alertas de renovação', path: '/workspace/notificacoes' },
      { label: 'Lembretes de tarefas', path: '/perfil/notificacoes' },
      { label: 'Notificações de equipe', path: '/workspace/notificacoes' },
    ],
  },
  {
    icon: FileText,
    title: 'Produtos e Comissões',
    description: 'Gerencie catálogo de produtos e taxas.',
    iconBg: 'bg-emerald-500/20',
    iconBorder: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    settings: [
      { label: 'Cadastro de produtos', path: '/products' },
      { label: 'Comissões por produto', path: '/products' },
      { label: 'Faixas de prêmio', path: '/products' },
      { label: 'Seguradoras parceiras', path: '/partner-insurers' },
      { label: 'Tipos de endosso', path: '/admin/configuracoes' },
    ],
  },
  {
    icon: CreditCard,
    title: 'Assinatura e Cobrança',
    description: 'Gerencie plano, pagamento e faturas.',
    iconBg: 'bg-pink-500/20',
    iconBorder: 'border-pink-500/30',
    iconColor: 'text-pink-400',
    settings: [
      { label: 'Plano atual', path: '/workspace/assinatura' },
      { label: 'Forma de pagamento', path: '/workspace/assinatura' },
      { label: 'Histórico de faturas', path: '/workspace/faturas' },
      { label: 'Upgrade/Downgrade', path: '/workspace/assinatura' },
      { label: 'Cancelamento', path: '/workspace/assinatura' },
    ],
  },
  {
    icon: Shield,
    title: 'Segurança',
    description: 'Proteção e privacidade dos dados.',
    iconBg: 'bg-red-500/20',
    iconBorder: 'border-red-500/30',
    iconColor: 'text-red-400',
    settings: [
      {
        label: 'Autenticação de dois fatores (2FA)',
        path: '/perfil/seguranca',
      },
      { label: 'Histórico de acessos', path: '/perfil/seguranca' },
      { label: 'Sessões ativas', path: '/perfil/seguranca' },
      { label: 'Política de senhas', path: '/admin/seguranca' },
      { label: 'Backup de dados', path: '/admin/backup' },
    ],
  },
  {
    icon: Webhook,
    title: 'Integrações',
    description: 'Conecte com sistemas externos.',
    iconBg: 'bg-indigo-500/20',
    iconBorder: 'border-indigo-500/30',
    iconColor: 'text-indigo-400',
    settings: [
      { label: 'Webhooks', path: '/admin/webhooks' },
      { label: 'Integrações disponíveis', path: '/admin/integracoes' },
      { label: 'Logs de integrações', path: '/admin/logs' },
    ],
  },
];

const quickAccess = [
  {
    category: 'Mais Acessadas',
    items: [
      { icon: User, label: 'Editar Perfil', href: '/perfil' },
      { icon: Bell, label: 'Notificações', href: '/perfil/notificacoes' },
      { icon: Users, label: 'Gerenciar Equipe', href: '/users' },
      { icon: CreditCard, label: 'Assinatura', href: '/workspace/assinatura' },
    ],
  },
  {
    category: 'Administração',
    items: [
      {
        icon: Building2,
        label: 'Dados da Empresa',
        href: '/workspace/empresa',
      },
      { icon: FileText, label: 'Produtos', href: '/products' },
      { icon: Shield, label: 'Segurança', href: '/perfil/seguranca' },
      { icon: Database, label: 'Backup', href: '/admin/backup' },
    ],
  },
];

const securityTips = [
  {
    title: 'Ative a Autenticação de Dois Fatores',
    description: 'Adicione uma camada extra de segurança à sua conta com 2FA.',
  },
  {
    title: 'Use Senhas Fortes',
    description:
      'Senhas com no mínimo 8 caracteres, incluindo números e símbolos.',
  },
  {
    title: 'Revise Permissões Regularmente',
    description:
      'Audite permissões de usuários para garantir acesso apropriado.',
  },
  {
    title: 'Configure Backup Automático',
    description: 'Ative backups automáticos para proteger seus dados.',
  },
];

const roles = [
  {
    role: 'Vendedor',
    access: 'Acesso limitado às suas próprias configurações de perfil.',
  },
  {
    role: 'Gestor',
    access: 'Pode gerenciar equipe, produtos e notificações da corretora.',
  },
  {
    role: 'Admin',
    access: 'Acesso completo a todas as configurações do sistema.',
  },
];

function ConfiguracoesPage() {
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
        <div>page.docs.configuracoes</div>
        <div>system.settings.guide</div>
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
              SYSTEM_SETTINGS
            </div>

            <div
              className="relative w-16 h-16 mb-6 rounded-2xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30"
              aria-hidden="true"
            >
              <Settings className="w-8 h-8 text-pink-400" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-pink-500/60" />
            </div>

            <div className="relative inline-block mb-6" aria-hidden="true">
              <span className="font-inter text-pink-400 text-sm font-semibold uppercase tracking-widest">
                CONFIGURAÇÕES
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-pink-400 opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Configurações do Sistema
            </h1>
            <p className="font-inter text-lg text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              Personalize o sistema de acordo com as necessidades da sua
              corretora. Configure perfil, equipe, notificações, segurança e
              muito mais.
            </p>
          </header>

          {/* Acesso Rápido */}
          <section
            aria-labelledby="quick-access-heading"
            className="relative rounded-2xl p-8 border border-pink-500/30 bg-gradient-to-br from-pink-500/10 via-gray-50 to-gray-50 dark:from-pink-500/10 dark:via-black dark:to-black mb-16"
          >
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              QUICK_ACCESS
            </div>
            <div
              className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-pink-500/60"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <h2
              id="quick-access-heading"
              className="font-inter text-2xl font-semibold text-black dark:text-white mb-6"
            >
              Acesso Rápido
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {quickAccess.map((section, index) => (
                <div key={index}>
                  <h3 className="font-inter text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                    {section.category}
                  </h3>
                  <ul className="space-y-2" role="list">
                    {section.items.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <li key={idx}>
                          <Link
                            to={item.href}
                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:border-primary/30 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <div
                              className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10 group-hover:bg-primary/20 group-hover:border-primary/30 transition-colors"
                              aria-hidden="true"
                            >
                              <Icon className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                            </div>
                            <span className="font-inter text-sm text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                              {item.label}
                            </span>
                            <ArrowRight
                              className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary ml-auto group-hover:translate-x-1 transition-all"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Todas as configurações */}
          <section aria-labelledby="all-settings-heading" className="mb-16">
            <div className="relative mb-8">
              <div
                className="absolute -top-6 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20"
                aria-hidden="true"
              >
                SETTINGS_SECTIONS
              </div>
              <h2
                id="all-settings-heading"
                className="font-inter text-3xl font-semibold text-black dark:text-white mb-2"
              >
                Todas as Configurações
              </h2>
              <p className="font-inter text-gray-500 dark:text-gray-400 leading-relaxed">
                Explore todas as opções disponíveis.
              </p>
            </div>

            <ul className="grid md:grid-cols-2 gap-6" role="list">
              {allSections.map((section, index) => {
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
                      CONFIG_{String(index + 1).padStart(2, '0')}
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
                        className={`w-10 h-10 rounded-lg ${section.iconBg} flex items-center justify-center border ${section.iconBorder}`}
                        aria-hidden="true"
                      >
                        <Icon className={`w-5 h-5 ${section.iconColor}`} />
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

                    <ul
                      className="space-y-1.5"
                      role="list"
                      aria-label={`Configurações de ${section.title}`}
                    >
                      {section.settings.map((setting, idx) => (
                        <li key={idx}>
                          <Link
                            to={setting.path}
                            className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 hover:text-primary py-1.5 px-2 rounded hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <span className="font-inter">{setting.label}</span>
                            <ArrowRight
                              className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Dicas de Segurança */}
          <section
            aria-labelledby="security-tips-heading"
            className="relative rounded-2xl p-8 border border-red-500/30 bg-gradient-to-br from-red-500/10 via-gray-50 to-gray-50 dark:from-red-500/10 dark:via-black dark:to-black mb-16"
          >
            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              SECURITY_TIPS
            </div>
            <div
              className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-red-500/60"
              aria-hidden="true"
            />
            <div
              className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
              aria-hidden="true"
            />

            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/30"
                aria-hidden="true"
              >
                <Shield className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2
                  id="security-tips-heading"
                  className="font-inter text-2xl font-semibold text-black dark:text-white mb-2"
                >
                  Dicas de Segurança
                </h2>
                <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed">
                  Proteja sua conta e dados da corretora.
                </p>
              </div>
            </div>

            <ul className="grid md:grid-cols-2 gap-4" role="list">
              {securityTips.map((tip, index) => (
                <li
                  key={index}
                  className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center flex-shrink-0"
                      aria-hidden="true"
                    >
                      <Key className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-inter font-semibold text-black dark:text-white mb-1.5 text-sm">
                        {tip.title}
                      </h3>
                      <p className="font-inter text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {tip.description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Acesso por Função */}
          <section
            aria-labelledby="roles-heading"
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
              id="roles-heading"
              className="font-inter font-semibold text-black dark:text-white mb-4"
            >
              Acesso por Função
            </h2>
            <ul className="space-y-3" role="list">
              {roles.map((role, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 rounded border border-gray-100 dark:border-white/10 bg-white dark:bg-white/[0.01]"
                >
                  <div
                    className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <span className="text-xs font-mono text-primary font-bold">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-inter font-semibold text-black dark:text-white text-sm mb-1">
                      {role.role}
                    </h3>
                    <p className="font-inter text-xs text-gray-500 dark:text-gray-400">
                      {role.access}
                    </p>
                  </div>
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
              Pronto para Começar?
            </h2>
            <p className="font-inter text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
              Configure sua conta agora:
            </p>
            <ul className="flex flex-wrap gap-3" role="list">
              <li>
                <Link
                  to="/perfil"
                  search={{ tab: undefined, google: undefined }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Editar Perfil
                  <ArrowRight
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </li>
              <li>
                <Link
                  to={"/workspace/empresa" as any}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors group text-sm font-inter font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
                >
                  Configurar Empresa
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
