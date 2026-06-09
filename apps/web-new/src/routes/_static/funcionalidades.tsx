import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  FileText,
  Users,
  BarChart3,
  RefreshCw,
  Shield,
  Kanban,
  MessageSquare,
  FileEdit,
  UserCog,
  Building2,
  Check,
  Package,
  ArrowLeft,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';

export const Route = createFileRoute('/_static/funcionalidades')({
  head: () => ({
    meta: [
      { title: 'Funcionalidades - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Gestão de clientes PF e PJ, cotações, propostas, renovações automáticas, kanban de oportunidades, sinistros, chat e muito mais. Conheça todas as funcionalidades.',
      },
      { property: 'og:title', content: 'Funcionalidades - Ecotech CRM' },
      {
        property: 'og:description',
        content:
          'CRM completo para corretoras: clientes, cotações, renovações, kanban, métricas e chat em uma única plataforma.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/funcionalidades' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/funcionalidades' }],
  }),
  component: FuncionalidadesPage,
});


const funcionalidades = [
  {
    icon: FileText,
    title: 'Gestao de Documentos de Venda',
    description:
      'Sistema completo para gerenciar cotacoes, propostas comerciais e documentos de venda com controle de status, comissoes e anexos.',
    features: [
      'Cotacoes diretas e perdidas',
      'Propostas formais com workflow',
      'Controle de status detalhado',
      'Comissoes compartilhadas',
      'Anexos e documentacao',
      'Historico de alteracoes',
    ],
    color: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: Users,
    title: 'CRM de Clientes PF e PJ',
    description:
      'Cadastro e gestao completa de clientes individuais (CPF) e empresas (CNPJ) com controle de vendedores e equipes.',
    features: [
      'Cadastro PF com CPF',
      'Cadastro PJ com CNPJ',
      'Vendedor responsavel',
      'Transferencia entre vendedores',
      'Status ativo/inativo',
      'Controle de dados de contato',
    ],
    color: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    icon: Kanban,
    title: 'Pipeline de Oportunidades',
    description:
      'Board Kanban interativo para gerenciar leads e oportunidades desde o contato inicial ate o fechamento da venda.',
    features: [
      'Board visual tipo Kanban',
      'Status: Lead, Contato, Negociacao',
      'Priorizacao e temperatura',
      'Reordenacao por drag-and-drop',
      'Controle de valores estimados',
      'Motivo de perda',
    ],
    color: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    icon: RefreshCw,
    title: 'Renovacoes Inteligentes',
    description:
      'Deteccao automatica de renovacoes com importacao de planilhas, alertas urgentes e gestao de comissoes.',
    features: [
      'Deteccao automatica',
      'Importacao XLSX/CSV',
      'Alertas de urgencia (45 dias)',
      'Status de acompanhamento',
      'Comissoes compartilhadas',
      'Comparativo de premios',
    ],
    color: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
  },
  {
    icon: FileEdit,
    title: 'Endossos e Alteracoes',
    description:
      'Gerencie endossos de apolices ativas com workflow de aprovacao e controle de impacto em premios e comissoes.',
    features: [
      'Tipos de endosso variados',
      'Workflow de aprovacao',
      'Impacto em premio/comissao',
      'Numeros externos de endosso',
      'Controle de alteracoes',
      'Status detalhado',
    ],
    color: 'bg-rose-500/20',
    iconColor: 'text-rose-400',
  },
  {
    icon: MessageSquare,
    title: 'Chat e Colaboracao',
    description:
      'Sistema de mensagens em tempo real com canais de equipe, conversas diretas e compartilhamento de arquivos.',
    features: [
      'Canais de equipe',
      'Mensagens diretas (DM)',
      'Compartilhamento de arquivos',
      'Mensagens nao lidas',
      'Historico completo',
      'Tempo real (WebSocket)',
    ],
    color: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    icon: BarChart3,
    title: 'Dashboard e Metricas',
    description:
      'Acompanhe KPIs em tempo real: clientes ativos, vendas, comissoes, propostas pendentes e renovacoes urgentes.',
    features: [
      'Metricas em tempo real',
      'Clientes e propostas ativas',
      'Total de vendas mensais',
      'Total de comissoes',
      'Renovacoes urgentes',
      'Performance por vendedor',
    ],
    color: 'bg-indigo-500/20',
    iconColor: 'text-indigo-400',
  },
  {
    icon: Shield,
    title: 'Controle de Permissoes',
    description:
      'Sistema robusto de cargos e permissoes granulares com isolamento multi-tenant e controle por funcionalidade.',
    features: [
      'Cargos personalizaveis',
      'Permissoes granulares',
      'Admin, Gestor, Vendedor',
      'Multi-tenant isolado',
      'Controle por modulo',
      'Auditoria de acoes',
    ],
    color: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
  {
    icon: UserCog,
    title: 'Gestao de Usuarios',
    description:
      'Administre usuarios com controle de cargos, equipes, hierarquia e status. Avatar e perfil completo.',
    features: [
      'Criacao e edicao de usuarios',
      'Atribuicao de cargos',
      'Estrutura hierarquica',
      'Gerenciamento de equipes',
      'Status ativo/inativo',
      'Upload de avatar',
    ],
    color: 'bg-violet-500/20',
    iconColor: 'text-violet-400',
  },
  {
    icon: Building2,
    title: 'Seguradoras Parceiras',
    description:
      'Cadastro e gestao de seguradoras parceiras para associacao com produtos e documentos de venda.',
    features: [
      'Cadastro de parceiras',
      'Controle ativo/inativo',
      'Catalogo de produtos',
      'Associacao com vendas',
      'Gestao de relacionamento',
    ],
    color: 'bg-sky-500/20',
    iconColor: 'text-sky-400',
  },
  {
    icon: Package,
    title: 'Gestao de Produtos',
    description:
      'Configure produtos de seguros com tipos, comissoes padrao e personalizadas, faixas de premio e seguradoras.',
    features: [
      'Cadastro de produtos',
      'Tipos de seguro',
      'Comissao padrao e custom',
      'Faixas de premio',
      'Vinculo com seguradoras',
      'Status ativo/inativo',
    ],
    color: 'bg-lime-500/20',
    iconColor: 'text-lime-400',
  },
  {
    icon: FileText,
    title: 'Sistema de Notificacoes',
    description:
      'Alertas inteligentes sobre cotacoes, renovacoes, endossos e eventos do sistema com controle de leitura.',
    features: [
      'Notificacoes por tipo',
      'Links de acao rapida',
      'Status lido/nao lido',
      'Metadata contextual',
      'Alertas urgentes',
      'Central de notificacoes',
    ],
    color: 'bg-pink-500/20',
    iconColor: 'text-pink-400',
  },
];

function FuncionalidadesPage() {
  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-black min-h-screen relative overflow-hidden">
      {/* Dense dotted grid background pattern */}
      <div className="absolute inset-0 opacity-30 dark:opacity-30">
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Additional fine grid overlay */}
      <div className="absolute inset-0 opacity-15 dark:opacity-15">
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

      {/* Vertical guide lines */}
      <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="absolute left-6 sm:left-8 lg:left-12 top-0 bottom-0 w-px opacity-40 dark:opacity-40">
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
        <div className="absolute right-6 sm:right-8 lg:right-12 top-0 bottom-0 w-px opacity-40 dark:opacity-40">
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

      {/* Technical annotations */}
      <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1 z-10">
        <div>page.funcionalidades</div>
        <div>grid-cols-2.gap-8</div>
      </div>

      <div className="relative py-24 z-10">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="mb-8">
            <Button variant="ghost" onClick={() => navigate({ to: -1 as any })} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
          {/* Header */}
          <div className="text-center mb-16 relative">
            {/* Section label */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">
              <div>FEATURES_PAGE</div>
            </div>

            <div className="relative inline-block mb-6">
              <span className="font-inter text-primary dark:text-primary text-sm font-semibold uppercase tracking-widest">
                FUNCIONALIDADES
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary dark:bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Funcionalidades Completas
            </h1>
            <p className="font-inter text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Sistema completo de gestao para corretoras de seguros. Controle
              documentos, clientes, renovacoes, equipes e muito mais em uma
              unica plataforma.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {funcionalidades.map((func, index) => (
              <div
                key={func.title}
                className="group relative p-6 rounded-lg border border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/25 transition-all bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04]"
              >
                {/* Technical label */}
                <div className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
                  FEATURE_{String(index + 1).padStart(2, '0')}
                </div>

                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30 rounded-tl" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gray-300 dark:border-white/20 rounded-tr" />

                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${func.color} dark:${func.color} flex items-center justify-center flex-shrink-0`}
                  >
                    <func.icon
                      className={`w-6 h-6 ${func.iconColor} dark:${func.iconColor}`}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-inter text-xl font-semibold text-black dark:text-white mb-2">
                      {func.title}
                    </h3>
                    <p className="font-inter text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                      {func.description}
                    </p>
                    <ul className="space-y-2">
                      {func.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                        >
                          <Check className="w-4 h-4 text-primary dark:text-primary flex-shrink-0" />
                          <span className="font-inter">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Index number */}
                <div className="absolute bottom-2 right-2 text-[10px] font-mono text-gray-400 dark:text-white/20">
                  {String(index + 1).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="relative text-center rounded-2xl p-12 border border-gray-200 dark:border-white/15 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/40" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gray-300 dark:border-white/20" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gray-300 dark:border-white/20" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gray-300 dark:border-white/20" />

            <h2 className="font-inter text-3xl sm:text-4xl font-normal text-black dark:text-white mb-4">
              Pronto para transformar sua corretora?
            </h2>
            <p className="font-inter text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto text-lg leading-relaxed">
              Entre em contato para conhecer o EcoTech e descobrir como podemos
              ajudar sua equipe a gerenciar seguros de forma mais eficiente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="font-inter bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black font-medium px-8 h-12"
              >
                <Link to="/login" search={{ redirect: '' }}>Acessar Sistema</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="font-inter text-black dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-300 dark:border-white/20 px-8 h-12"
              >
                <Link to="/contato">Entre em Contato</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
