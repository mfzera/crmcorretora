import { createFileRoute } from '@tanstack/react-router';
import {
  Columns3,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Flame,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Phone,
  Handshake,
  UserPlus,
  ArrowLeftRight,
  Target,
  Shield,
  Info,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/_static/docs/kanban')({
  head: () => ({
    meta: [
      { title: 'Kanban de Oportunidades - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Como usar o board Kanban do Ecotech CRM para gerenciar seu pipeline de vendas. Da prospecção ao fechamento.',
      },
      { property: 'og:title', content: 'Kanban de Oportunidades - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Gerencie seu pipeline de vendas com o board Kanban do Ecotech CRM.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/docs/kanban' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/docs/kanban' }],
  }),
  component: KanbanDocsPage,
});


const colunas = [
  {
    status: 'lead',
    label: 'Lead',
    description: 'Prospect identificado. Ainda não houve nenhum contato direto com o cliente.',
    iconBg: 'bg-gray-500/20',
    iconBorder: 'border-gray-500/30',
    iconColor: 'text-gray-400',
    icon: UserPlus,
  },
  {
    status: 'contato_inicial',
    label: 'Contato Inicial',
    description: 'Primeiro contato realizado. Aguardando resposta ou agendamento.',
    iconBg: 'bg-blue-500/20',
    iconBorder: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    icon: Phone,
  },
  {
    status: 'negociacao',
    label: 'Negociação',
    description: 'Em negociação ativa. Cotações sendo comparadas e condições discutidas.',
    iconBg: 'bg-orange-500/20',
    iconBorder: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    icon: Handshake,
  },
  {
    status: 'ganha',
    label: 'Ganha',
    description: 'Negócio fechado com sucesso. Valor e data de fechamento registrados.',
    iconBg: 'bg-green-500/20',
    iconBorder: 'border-green-500/30',
    iconColor: 'text-green-400',
    icon: CheckCircle2,
  },
  {
    status: 'perdida',
    label: 'Perdida',
    description: 'Oportunidade perdida. Motivo da perda registrado para análise futura.',
    iconBg: 'bg-red-500/20',
    iconBorder: 'border-red-500/30',
    iconColor: 'text-red-400',
    icon: XCircle,
  },
];

const temperaturas = [
  {
    label: 'Frio',
    description: 'Cliente com pouco interesse ou contato recente. Requer nutrição.',
    colorClass: 'bg-blue-500',
  },
  {
    label: 'Morno',
    description: 'Cliente demonstrou interesse. Acompanhamento regular necessário.',
    colorClass: 'bg-yellow-500',
  },
  {
    label: 'Quente',
    description: 'Cliente pronto para fechar. Alta probabilidade de conversão.',
    colorClass: 'bg-red-500',
  },
];

const prioridades = [
  { label: 'Baixa', description: 'Sem urgência. Pode ser trabalhada no fluxo normal.' },
  { label: 'Média', description: 'Atenção moderada. Acompanhamento semanal recomendado.' },
  { label: 'Alta', description: 'Requer atenção prioritária. Acompanhamento diário.' },
  { label: 'Urgente', description: 'Ação imediata necessária. Risco de perda iminente.' },
];

const funcionalidades = [
  {
    icon: GripVertical,
    title: 'Arrastar e Soltar',
    description: 'Mova oportunidades entre colunas arrastando os cards. O sistema atualiza o status automaticamente e reordena dentro da coluna.',
    tip: 'Use o teclado para acessibilidade: selecione o card e use as setas para mover.',
  },
  {
    icon: Flame,
    title: 'Temperatura do Lead',
    description: 'Classifique cada oportunidade como Frio, Morno ou Quente para priorizar o atendimento e identificar quais leads estão prontos para fechar.',
    tip: 'Atualize a temperatura após cada interação com o cliente.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Transferência entre Vendedores',
    description: 'Transfira oportunidades para outro vendedor com registro completo de auditoria. O vendedor original permanece registrado.',
    tip: 'O histórico de transferências fica disponível em cada oportunidade.',
  },
  {
    icon: Target,
    title: 'Fechamento e Perda',
    description: 'Ao fechar um negócio, registre o valor final. Ao perder, registre o motivo. Ambos alimentam as estatísticas de conversão.',
    tip: 'Motivos de perda ajudam a identificar padrões e melhorar o processo.',
  },
];

const workflow = [
  { step: '1', title: 'Criar Oportunidade', description: 'Clique em "Nova Oportunidade" e preencha: nome do cliente, vendedor, seguradora, temperatura e prêmio estimado.' },
  { step: '2', title: 'Lead', description: 'A oportunidade inicia na coluna Lead. Pesquise o cliente e planeje o primeiro contato.' },
  { step: '3', title: 'Contato Inicial', description: 'Arraste para Contato Inicial após o primeiro contato. Registre observações sobre a conversa.' },
  { step: '4', title: 'Negociação', description: 'Mova para Negociação quando houver interesse real. Crie cotações e compare seguradoras.' },
  { step: '5', title: 'Fechamento', description: 'Arraste para Ganha e registre o valor fechado, ou para Perdida com o motivo da perda.' },
];

const permissoes = [
  { permissao: 'kanban:acessar', descricao: 'Acessar o quadro Kanban' },
  { permissao: 'kanban:visualizar', descricao: 'Ver suas próprias oportunidades' },
  { permissao: 'kanban:visualizar_todas', descricao: 'Ver todas as oportunidades da corretora' },
  { permissao: 'kanban:criar', descricao: 'Criar novas oportunidades' },
  { permissao: 'kanban:editar', descricao: 'Editar e mover oportunidades' },
  { permissao: 'kanban:fechar', descricao: 'Marcar como ganha' },
  { permissao: 'kanban:perder', descricao: 'Marcar como perdida' },
  { permissao: 'kanban:deletar', descricao: 'Excluir oportunidades' },
];

const gestaoCRM = [
  { titulo: 'Dashboard de Vendedores', descricao: 'Veja a performance de cada vendedor: total de oportunidades, leads, negociações ativas, ganhas, perdidas, valor total e taxa de conversão.' },
  { titulo: 'Reatribuição', descricao: 'Gestores podem reatribuir oportunidades de um vendedor para outro diretamente pelo painel de gestão.' },
  { titulo: 'Estatísticas Consolidadas', descricao: 'Total por status, valores em pipeline, taxa de conversão geral e distribuição por prioridade e temperatura.' },
  { titulo: 'Prioridade Automática', descricao: 'Configure regras para ajustar a prioridade automaticamente com base nos dias sem contato com o cliente.' },
];

function KanbanDocsPage() {
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
      <div className="absolute inset-0 opacity-30 dark:opacity-30" aria-hidden="true">
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>
      <div className="absolute inset-0 opacity-15 dark:opacity-15" aria-hidden="true">
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      {/* Linhas verticais */}
      <div className="absolute inset-0 max-w-6xl mx-auto px-6 sm:px-8" aria-hidden="true">
        <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px opacity-40">
          <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 8px, transparent 8px, transparent 16px)' }} />
          <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)' }} />
        </div>
        <div className="absolute right-6 sm:right-8 top-0 bottom-0 w-px opacity-40">
          <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 8px, transparent 8px, transparent 16px)' }} />
          <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)' }} />
        </div>
      </div>

      {/* Anotações técnicas */}
      <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1 z-10" aria-hidden="true">
        <div>page.docs.kanban</div>
        <div>pipeline.crm.guide</div>
      </div>

      <main id="main-content" className="relative py-24 z-10">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          {/* Navegação */}
          <nav aria-label="Breadcrumb">
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors mb-8 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
              Voltar para Documentação
            </Link>
          </nav>

          {/* Header */}
          <header className="mb-16 relative">
            <div className="absolute -top-12 left-0 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider" aria-hidden="true">
              KANBAN_PIPELINE
            </div>

            <div className="relative w-16 h-16 mb-6 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30" aria-hidden="true">
              <Columns3 className="w-8 h-8 text-primary" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
            </div>

            <div className="relative inline-block mb-6" aria-hidden="true">
              <span className="font-inter text-primary text-sm font-semibold uppercase tracking-widest">
                PIPELINE DE VENDAS
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Kanban de Oportunidades
            </h1>
            <p className="font-inter text-lg text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              Gerencie seu funil de vendas com um quadro Kanban visual. Arraste oportunidades entre as etapas, acompanhe a temperatura de cada lead e monitore sua taxa de conversão.
            </p>

            <div className="mt-6">
              <Link
                to="/dashboard/kanban"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black font-inter font-medium text-sm hover:bg-primary/90 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
              >
                Abrir Kanban
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>
          </header>

          {/* Colunas do Pipeline */}
          <section
            aria-labelledby="pipeline-heading"
            className="relative rounded-2xl p-8 border border-primary/30 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black mb-16"
          >
            <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1" aria-hidden="true">
              PIPELINE_STAGES
            </div>
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/60" aria-hidden="true" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

            <h2 id="pipeline-heading" className="font-inter text-2xl font-semibold text-black dark:text-white mb-2">
              Etapas do Pipeline
            </h2>
            <p className="font-inter text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
              Cada oportunidade percorre 5 etapas, da prospecção ao fechamento. As colunas Ganha e Perdida são finais.
            </p>

            <ol className="space-y-3" role="list">
              {colunas.map((col, index) => {
                const Icon = col.icon;
                return (
                  <li
                    key={col.status}
                    className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                  >
                    <div className={`w-10 h-10 rounded-lg ${col.iconBg} flex items-center justify-center border ${col.iconBorder} flex-shrink-0`} aria-hidden="true">
                      <Icon className={`w-5 h-5 ${col.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-inter font-semibold text-black dark:text-white text-sm">
                          <span className="sr-only">Etapa {index + 1}: </span>
                          {col.label}
                        </h3>
                        <code className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded" aria-hidden="true">
                          {col.status}
                        </code>
                      </div>
                      <p className="font-inter text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {col.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Temperatura e Prioridade */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {/* Temperatura */}
            <section
              aria-labelledby="temperature-heading"
              className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
            >
              <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1" aria-hidden="true">
                TEMPERATURE
              </div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

              <div className="flex items-center gap-3 mb-4">
                <Flame className="w-5 h-5 text-orange-400" aria-hidden="true" />
                <h2 id="temperature-heading" className="font-inter text-lg font-semibold text-black dark:text-white">
                  Temperatura do Lead
                </h2>
              </div>

              <ul className="space-y-3" role="list">
                {temperaturas.map((temp) => (
                  <li key={temp.label} className="flex items-start gap-3">
                    <span className={`w-3 h-3 rounded-full ${temp.colorClass} mt-1 flex-shrink-0`} aria-hidden="true" />
                    <div>
                      <h3 className="font-inter font-semibold text-black dark:text-white text-sm">
                        {temp.label}
                      </h3>
                      <p className="font-inter text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {temp.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Prioridade */}
            <section
              aria-labelledby="priority-heading"
              className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
            >
              <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1" aria-hidden="true">
                PRIORITY
              </div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-500" aria-hidden="true" />
                <h2 id="priority-heading" className="font-inter text-lg font-semibold text-black dark:text-white">
                  Níveis de Prioridade
                </h2>
              </div>

              <ol className="space-y-3" role="list">
                {prioridades.map((p, index) => (
                  <li key={p.label} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded bg-gray-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                      <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 font-bold">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-inter font-semibold text-black dark:text-white text-sm">
                        {p.label}
                      </h3>
                      <p className="font-inter text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {p.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Workflow */}
          <section
            aria-labelledby="workflow-heading"
            className="relative rounded-2xl p-8 border border-primary/30 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black mb-16"
          >
            <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1" aria-hidden="true">
              OPPORTUNITY_WORKFLOW
            </div>
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/60" aria-hidden="true" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

            <h2 id="workflow-heading" className="font-inter text-2xl font-semibold text-black dark:text-white mb-6">
              Como Usar o Kanban
            </h2>

            <ol className="space-y-4" role="list">
              {workflow.map((s, index) => (
                <li
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                >
                  <div className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-inter font-bold flex-shrink-0" aria-hidden="true">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-inter font-semibold text-black dark:text-white mb-1">
                      <span className="sr-only">Passo {s.step}: </span>
                      {s.title}
                    </h3>
                    <p className="font-inter text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Funcionalidades */}
          <section aria-labelledby="features-heading" className="mb-16">
            <div className="relative mb-8">
              <div className="absolute -top-6 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20" aria-hidden="true">
                KEY_FEATURES
              </div>
              <h2 id="features-heading" className="font-inter text-3xl font-semibold text-black dark:text-white mb-2">
                Funcionalidades
              </h2>
              <p className="font-inter text-gray-500 dark:text-gray-400 leading-relaxed">
                Recursos disponíveis no quadro Kanban.
              </p>
            </div>

            <ul className="grid md:grid-cols-2 gap-6" role="list">
              {funcionalidades.map((feat, index) => {
                const Icon = feat.icon;
                return (
                  <li
                    key={index}
                    className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
                  >
                    <div className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1" aria-hidden="true">
                      FEAT_{String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20" aria-hidden="true" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/10" aria-hidden="true">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-inter font-semibold text-black dark:text-white mb-1">
                          {feat.title}
                        </h3>
                        <p className="font-inter text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                          {feat.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20" role="note">
                      <Info className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <p className="font-inter text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        <span className="sr-only">Dica: </span>
                        {feat.tip}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Gestão CRM (Gestores) */}
          <section
            aria-labelledby="crm-heading"
            className="relative rounded-2xl p-8 border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-gray-50 to-gray-50 dark:from-orange-500/10 dark:via-black dark:to-black mb-16"
          >
            <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1" aria-hidden="true">
              CRM_MANAGEMENT
            </div>
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500/60" aria-hidden="true" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

            <h2 id="crm-heading" className="font-inter text-2xl font-semibold text-black dark:text-white mb-2">
              Gestão CRM (para Gestores)
            </h2>
            <p className="font-inter text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
              Gestores e admins têm acesso a um painel exclusivo com visão consolidada de todas as oportunidades e performance dos vendedores.
            </p>

            <ul className="grid md:grid-cols-2 gap-4" role="list">
              {gestaoCRM.map((item, index) => (
                <li
                  key={index}
                  className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                >
                  <h3 className="font-inter font-semibold text-black dark:text-white mb-1.5 text-sm">
                    {item.titulo}
                  </h3>
                  <p className="font-inter text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {item.descricao}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Permissões */}
          <section
            aria-labelledby="permissions-heading"
            className="relative rounded-xl p-6 mb-12 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
          >
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20" aria-hidden="true" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 id="permissions-heading" className="font-inter text-lg font-semibold text-black dark:text-white">
                Permissões
              </h2>
            </div>

            <p className="font-inter text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              O acesso ao Kanban é controlado por permissões granulares configuráveis por cargo.
            </p>

            <ul className="space-y-2" role="list">
              {permissoes.map((p) => (
                <li
                  key={p.permissao}
                  className="flex items-center justify-between py-2 px-3 rounded border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.01]"
                >
                  <code className="font-mono text-xs text-primary bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                    {p.permissao}
                  </code>
                  <span className="font-inter text-xs text-gray-500 dark:text-gray-400">
                    {p.descricao}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Próximos Passos */}
          <nav
            aria-labelledby="next-steps-heading"
            className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
          >
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 dark:border-white/20" aria-hidden="true" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gray-300 dark:border-white/20" aria-hidden="true" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

            <h2 id="next-steps-heading" className="font-inter font-semibold text-black dark:text-white mb-3">
              Veja também
            </h2>
            <p className="font-inter text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
              Explore outros módulos relacionados:
            </p>
            <ul className="flex flex-wrap gap-3" role="list">
              <li>
                <Link
                  to="/docs/clientes"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Gestão de Clientes
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link
                  to="/docs/cotacoes"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/20 text-black dark:text-white hover:border-primary hover:text-primary transition-colors group text-sm font-inter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Cotações
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/kanban"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors group text-sm font-inter font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
                >
                  Abrir Kanban
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </main>
    </div>
  );
}
