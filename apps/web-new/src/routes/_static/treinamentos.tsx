import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import {
  PlayCircle,
  BookOpen,
  ClipboardCheck,
  Award,
  TrendingUp,
  ShieldCheck,
  Settings,
  Link2,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/core/ui/button';

export const Route = createFileRoute('/_static/treinamentos')({
  head: () => ({
    meta: [
      { title: 'Treinamentos - Plataforma de Capacitação - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Plataforma de e-learning integrada ao Ecotech CRM. Treine sua equipe com vídeos, quizzes e certificados digitais. Login único com sua conta Ecotech.',
      },
      { property: 'og:title', content: 'Treinamentos - Plataforma de Capacitação - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Capacite sua equipe com cursos em vídeo, quizzes e certificados digitais integrados ao Ecotech CRM.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/treinamentos' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/treinamentos' }],
  }),
  component: TreinamentosPage,
});


function GridBackground() {
  return (
    <>
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
      <div className="absolute inset-0 opacity-15 dark:opacity-15">
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>
      <div className="absolute top-0 left-0 right-0 h-px opacity-50">
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) 8px, transparent 8px, transparent 16px)',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.5) 8px, transparent 8px, transparent 16px)',
          }}
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px opacity-50">
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) 8px, transparent 8px, transparent 16px)',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.5) 8px, transparent 8px, transparent 16px)',
          }}
        />
      </div>
      <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="absolute left-6 sm:left-8 lg:left-12 top-0 bottom-0 w-px opacity-40">
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
        <div className="absolute right-6 sm:right-8 lg:right-12 top-0 bottom-0 w-px opacity-40">
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
    </>
  );
}

const features = [
  {
    icon: PlayCircle,
    title: 'Cursos em Vídeo',
    description: 'Aulas em streaming HLS com retomada automática do ponto onde parou.',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    icon: BookOpen,
    title: 'Módulos Estruturados',
    description: 'Conteúdo organizado em módulos e aulas para progressão lógica do aprendizado.',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: ClipboardCheck,
    title: 'Quizzes de Avaliação',
    description: 'Avaliações ao final de cada aula para consolidar o conhecimento adquirido.',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    icon: Award,
    title: 'Certificados Digitais',
    description: 'Emissão automática de certificados ao concluir cursos, em PDF.',
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
  },
  {
    icon: TrendingUp,
    title: 'Progresso em Tempo Real',
    description: 'Acompanhe o avanço individual e da equipe com métricas detalhadas.',
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
  },
  {
    icon: ShieldCheck,
    title: 'Verificação Pública',
    description: 'Cada certificado tem um link único e verificável publicamente.',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    icon: Settings,
    title: 'Gestão pelo Admin',
    description: 'Painel administrativo para criar, editar e publicar cursos, módulos e aulas.',
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-400',
  },
  {
    icon: Link2,
    title: 'Login Integrado',
    description: 'Acesso com as mesmas credenciais do EcoTech — sem conta separada.',
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-400',
  },
];

const steps = [
  {
    number: '01',
    title: 'Acesse',
    description:
      'Entre com suas credenciais do EcoTech. Sem criar uma nova conta ou gerenciar outra senha.',
  },
  {
    number: '02',
    title: 'Aprenda',
    description:
      'Assista às aulas em vídeo, complete os módulos no seu ritmo e responda os quizzes de fixação.',
  },
  {
    number: '03',
    title: 'Certifique-se',
    description:
      'Conclua o curso, receba o certificado em PDF e compartilhe via link de verificação pública.',
  },
];

const videoHighlights = [
  'Streaming HLS de alta qualidade',
  'Retoma do ponto onde parou',
  'Sessões de visualização rastreadas',
  'Percentual de conclusão por aula',
  'Suporte a múltiplos formatos',
];

const certHighlights = [
  'Geração automática ao concluir',
  'PDF com dados do aluno e do curso',
  'Link único de verificação pública',
  'Armazenamento seguro em nuvem',
  'Histórico de certificados no perfil',
];

function TreinamentosPage() {
  return (
    <div className="bg-white dark:bg-black min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative bg-white dark:bg-black pt-32 pb-24 sm:pt-40 sm:pb-32 overflow-hidden">
        <GridBackground />

        <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1">
          <div>page.treinamentos</div>
          <div>hero.01</div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
          <div className="absolute -top-8 left-6 sm:left-8 lg:left-12 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">
            TRAINING_HERO_01
          </div>

          <div className="inline-flex items-center gap-2 mb-8 relative">
            <PlayCircle className="w-3.5 h-3.5 text-primary" />
            <span className="font-inter text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">
              Plataforma de Treinamentos
            </span>
            <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
          </div>

          <h1 className="font-inter text-4xl sm:text-6xl lg:text-7xl font-normal leading-[1.1] text-black dark:text-white mb-6 max-w-4xl">
            Capacite sua equipe com{' '}
            <span className="text-primary">treinamentos online</span>
          </h1>

          <p className="font-inter text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300 max-w-2xl mb-10">
            Uma plataforma de e-learning integrada ao EcoTech para treinar corretores,
            equipes de backoffice e novos colaboradores — com vídeos, quizzes e
            certificados digitais.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              className="font-inter text-base px-8 h-12 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black rounded-md transition-all duration-200 hover:scale-105"
              asChild
            >
              <Link to="/contato">Solicitar acesso</Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="font-inter text-base px-8 h-12 text-black dark:text-white border border-gray-300 dark:border-white/20 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200 hover:scale-105"
              asChild
            >
              <a href="#funcionalidades">
                Ver funcionalidades
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>

          {/* Stats row */}
          <div className="mt-16 pt-12 border-t border-gray-200 dark:border-white/10 grid grid-cols-3 gap-8 max-w-lg">
            {[
              { value: 'HLS', label: 'Streaming de vídeo' },
              { value: 'PDF', label: 'Certificados digitais' },
              { value: 'SSO', label: 'Login integrado' },
            ].map((stat) => (
              <div key={stat.label} className="relative">
                <div className="absolute -top-3 left-0 text-[7px] font-mono text-gray-400 dark:text-white/20">
                  STAT
                </div>
                <p className="font-inter text-2xl font-semibold text-primary mb-1">
                  {stat.value}
                </p>
                <p className="font-inter text-xs text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ───────────────────────────────────────── */}
      <section
        id="funcionalidades"
        className="relative bg-white dark:bg-black py-24 sm:py-32 overflow-hidden"
      >
        <GridBackground />

        <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1">
          <div>section.features</div>
          <div>grid.lg:4-cols</div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
          <div className="absolute -top-8 left-6 sm:left-8 lg:left-12 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">
            FEATURES_GRID_01
          </div>

          <div className="max-w-3xl mb-16">
            <div className="relative inline-block mb-6">
              <span className="font-inter text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">
                Funcionalidades
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>
            <h2 className="font-inter mt-6 text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] text-black dark:text-white">
              Tudo que sua equipe precisa para aprender
            </h2>
            <p className="font-inter mt-6 text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300">
              Da criação do conteúdo à emissão do certificado — uma plataforma
              completa, integrada ao seu ambiente EcoTech.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="absolute -top-6 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20">
              grid.sm:2.lg:4.gap-6
            </div>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative p-6 rounded-lg border border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:-translate-y-1"
                >
                  <div className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
                    FEAT_{String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30 rounded-tl" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gray-300 dark:border-white/20 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-gray-300 dark:border-white/20 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-gray-300 dark:border-white/20 rounded-br" />
                  <div className="absolute top-2 right-2 text-[10px] font-mono text-gray-400 dark:text-white/20">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <div
                    className={`w-12 h-12 rounded-lg ${feature.iconBg} flex items-center justify-center mb-5`}
                  >
                    <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                  </div>

                  <h3 className="font-inter text-base font-semibold text-black dark:text-white mb-2 leading-tight">
                    {feature.title}
                  </h3>
                  <p className="font-inter text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ───────────────────────────────────────── */}
      <section className="relative bg-white dark:bg-black py-24 sm:py-32 overflow-hidden">
        <GridBackground />

        <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1">
          <div>section.how-it-works</div>
          <div>steps.linear</div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
          <div className="absolute -top-8 left-6 sm:left-8 lg:left-12 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">
            HOW_IT_WORKS_01
          </div>

          <div className="max-w-3xl mb-16">
            <div className="relative inline-block mb-6">
              <span className="font-inter text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">
                Como funciona
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>
            <h2 className="font-inter mt-6 text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white">
              Simples do início ao certificado
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {steps.map((step, index) => (
              <div key={step.number} className="relative flex gap-6 md:flex-col md:gap-0">
                {/* connector line between steps (desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(100%+12px)] w-[calc(100%-24px)] h-px z-10">
                    <div
                      className="absolute inset-0 dark:hidden"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(90deg, rgba(0,0,0,0.25), rgba(0,0,0,0.25) 6px, transparent 6px, transparent 12px)',
                      }}
                    />
                    <div
                      className="absolute inset-0 hidden dark:block"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.2) 6px, transparent 6px, transparent 12px)',
                      }}
                    />
                  </div>
                )}

                <div className="group relative p-6 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-all duration-200 w-full">
                  <div className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
                    STEP_{step.number}
                  </div>
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary/40" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gray-300 dark:border-white/20 rounded-tr" />

                  <div className="font-mono text-4xl font-bold text-primary/20 dark:text-primary/15 mb-4 select-none">
                    {step.number}
                  </div>
                  <h3 className="font-inter text-xl font-semibold text-black dark:text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="font-inter text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESTAQUES TÉCNICOS — VÍDEO ───────────────────────────── */}
      <section className="relative bg-white dark:bg-black py-24 sm:py-32 overflow-hidden">
        <GridBackground />

        <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1">
          <div>section.detail</div>
          <div>feature.video</div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
          <div className="absolute -top-8 left-6 sm:left-8 lg:left-12 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">
            DETAIL_VIDEO_01
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Text side */}
            <div>
              <div className="relative inline-block mb-6">
                <span className="font-inter text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">
                  Experiência de aprendizado
                </span>
                <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
              </div>
              <h2 className="font-inter mt-6 text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
                Vídeos com rastreamento granular de progresso
              </h2>
              <p className="font-inter text-base leading-relaxed text-gray-600 dark:text-gray-300 mb-6">
                O player registra exatamente onde cada colaborador parou, quantos
                porcento assistiu e em quais sessões. Sem precisar recomeçar do zero.
              </p>
              <p className="font-inter text-base leading-relaxed text-gray-600 dark:text-gray-300">
                Conteúdo servido em HLS para qualidade adaptativa — funciona bem
                mesmo em conexões mais lentas.
              </p>
            </div>

            {/* Technical card */}
            <div className="relative p-8 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]">
              <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
                CARD_VIDEO_FEATURES
              </div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-gray-300 dark:border-white/20" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-gray-300 dark:border-white/20" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-gray-300 dark:border-white/20" />

              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-6">
                <PlayCircle className="w-6 h-6 text-emerald-400" />
              </div>

              <h3 className="font-inter text-lg font-semibold text-black dark:text-white mb-5">
                Player de vídeo
              </h3>

              <ul className="space-y-3">
                {videoHighlights.map((item, i) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="text-[9px] font-mono text-gray-400 dark:text-white/20 w-5 flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-inter text-sm text-gray-700 dark:text-gray-300">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── DESTAQUES TÉCNICOS — CERTIFICADOS ────────────────────── */}
      <section className="relative bg-white dark:bg-black py-24 sm:py-32 overflow-hidden">
        <GridBackground />

        <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1">
          <div>section.detail</div>
          <div>feature.certificado</div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
          <div className="absolute -top-8 left-6 sm:left-8 lg:left-12 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">
            DETAIL_CERT_01
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Technical card — esquerda desta vez */}
            <div className="relative p-8 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]">
              <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
                CARD_CERT_FEATURES
              </div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-gray-300 dark:border-white/20" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-gray-300 dark:border-white/20" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-gray-300 dark:border-white/20" />

              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-6">
                <Award className="w-6 h-6 text-yellow-400" />
              </div>

              <h3 className="font-inter text-lg font-semibold text-black dark:text-white mb-5">
                Certificado digital
              </h3>

              <ul className="space-y-3">
                {certHighlights.map((item, i) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="text-[9px] font-mono text-gray-400 dark:text-white/20 w-5 flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-inter text-sm text-gray-700 dark:text-gray-300">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Text side — direita */}
            <div>
              <div className="relative inline-block mb-6">
                <span className="font-inter text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">
                  Comprovação de aprendizado
                </span>
                <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
              </div>
              <h2 className="font-inter mt-6 text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
                Certificados com verificação pública
              </h2>
              <p className="font-inter text-base leading-relaxed text-gray-600 dark:text-gray-300 mb-6">
                Ao concluir um curso, o colaborador recebe um certificado em PDF
                gerado automaticamente com seus dados e o nome do curso.
              </p>
              <p className="font-inter text-base leading-relaxed text-gray-600 dark:text-gray-300">
                Cada certificado tem um link único e verificável publicamente —
                ideal para compartilhar no LinkedIn ou comprovar qualificação
                para clientes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────── */}
      <section className="relative bg-white dark:bg-black py-24 sm:py-32 overflow-hidden">
        <GridBackground />

        <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight">
          <div>section.cta</div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
          <div className="absolute -top-8 left-6 sm:left-8 lg:left-12 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">
            CTA_FINAL_01
          </div>

          <div className="max-w-2xl">
            <div className="absolute -top-4 -left-2 w-3 h-3 border-t-2 border-l-2 border-primary/40" />

            <div className="relative inline-block mb-8">
              <span className="font-inter text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">
                Comece agora
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>

            <h2 className="font-inter text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Pronto para capacitar sua equipe?
            </h2>
            <p className="font-inter text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300 mb-10 max-w-xl">
              Entre em contato e descubra como a plataforma de treinamentos do
              EcoTech pode reduzir o tempo de onboarding e manter sua equipe
              sempre atualizada.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12 relative">
              <div className="absolute -left-8 top-0 h-full w-px opacity-30 bg-gradient-to-b from-primary/30 to-transparent" />

              <Button
                size="lg"
                className="font-inter text-base px-8 h-12 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black rounded-md transition-all duration-200 hover:scale-105"
                asChild
              >
                <Link to="/contato">Solicitar acesso</Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="font-inter text-base px-8 h-12 text-black dark:text-white border border-gray-300 dark:border-white/20 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200 hover:scale-105"
                asChild
              >
                <Link to="/precos">Ver planos e preços</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 font-inter text-sm text-gray-600 dark:text-gray-400 relative">
              <div className="absolute -top-8 left-0 right-0 h-px bg-gray-200 dark:bg-white/15" />
              {[
                'Login com conta EcoTech',
                'Certificados digitais incluídos',
                'Suporte dedicado',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
