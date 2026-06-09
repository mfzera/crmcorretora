import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Users, Target, Heart, ArrowLeft } from 'lucide-react';
import { Button } from '@/core/ui/button';

export const Route = createFileRoute('/_static/sobre')({
  head: () => ({
    meta: [
      { title: 'Sobre a Ecotech - Nossa História e Missão' },
      {
        name: 'description',
        content:
          'Conheça a Ecotech e nossa missão de modernizar a gestão de corretoras de seguros no Brasil com tecnologia simples e eficiente.',
      },
      { property: 'og:title', content: 'Sobre a Ecotech - Nossa História e Missão' },
      {
        property: 'og:description',
        content: 'Conheça a Ecotech e nossa missão de modernizar a gestão de corretoras de seguros no Brasil.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/sobre' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/sobre' }],
  }),
  component: SobrePage,
});


function SobrePage() {
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
      <div className="absolute inset-0 max-w-4xl mx-auto px-6 sm:px-8">
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

      {/* Technical annotations */}
      <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1 z-10">
        <div>page.sobre</div>
        <div>grid-cols-3</div>
      </div>

      <div className="relative py-24 z-10">
        <div className="mx-auto max-w-4xl px-6 sm:px-8">
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
              <div>ABOUT_PAGE</div>
            </div>

            <div className="relative inline-block mb-6">
              <span className="font-inter text-primary dark:text-primary text-sm font-semibold uppercase tracking-widest">
                SOBRE NÓS
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary dark:bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Sobre a Ecotech
            </h1>
            <p className="font-inter text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Estamos construindo uma plataforma para transformar a gestao de
              corretoras de seguros no Brasil.
            </p>
          </div>

          {/* Story */}
          <div className="relative mb-16 p-8 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]">
            {/* Technical label */}
            <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
              STORY_SECTION
            </div>

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" />

            <h2 className="font-inter text-2xl sm:text-3xl font-semibold text-black dark:text-white mb-6">
              Nossa Historia
            </h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p className="font-inter leading-relaxed">
                A Ecotech nasceu da necessidade real de simplificar o
                dia a dia das corretoras de seguros. Conhecemos de perto os
                desafios enfrentados por corretores que precisam gerenciar
                cotacoes, clientes e renovacoes em multiplas plataformas
                diferentes.
              </p>
              <p className="font-inter leading-relaxed">
                Nossa missao e criar uma ferramenta unica que centralize todas
                essas operacoes, permitindo que corretores foquem no que
                realmente importa: atender bem seus clientes e fazer seus
                negocios crescerem.
              </p>
            </div>
          </div>

          {/* Values */}
          <div className="grid md:grid-cols-3 gap-8 mb-16 relative">
            {/* Grid label */}
            <div className="absolute -top-8 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20">
              grid.md:grid-cols-3.gap-8
            </div>

            {[
              {
                icon: Target,
                title: 'Simplicidade',
                description:
                  'Acreditamos que ferramentas devem ser simples e intuitivas, sem curva de aprendizado complexa.',
                color: 'emerald',
                index: 1,
              },
              {
                icon: Users,
                title: 'Parceria',
                description:
                  'Construimos junto com nossos usuarios. Seu feedback molda diretamente o futuro da plataforma.',
                color: 'blue',
                index: 2,
              },
              {
                icon: Heart,
                title: 'Transparencia',
                description:
                  'Somos abertos sobre nosso progresso, desafios e proximos passos. Sem surpresas.',
                color: 'purple',
                index: 3,
              },
            ].map((value, index) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="group relative text-center p-6 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/20 transition-all"
                >
                  {/* Technical label */}
                  <div className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
                    VALUE_{String(value.index).padStart(2, '0')}
                  </div>

                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30 rounded-tl" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gray-300 dark:border-white/20 rounded-tr" />

                  <div
                    className={`w-12 h-12 mx-auto mb-4 rounded-xl bg-${value.color}-500/20 flex items-center justify-center border border-${value.color}-500/30`}
                  >
                    <Icon className={`w-6 h-6 text-${value.color}-400`} />
                  </div>
                  <h3 className="font-inter text-lg font-semibold text-black dark:text-white mb-2">
                    {value.title}
                  </h3>
                  <p className="font-inter text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {value.description}
                  </p>

                  {/* Index */}
                  <div className="absolute bottom-2 right-2 text-[10px] font-mono text-gray-400 dark:text-white/20">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status */}
          <div className="relative rounded-2xl p-12 text-center border border-gray-200 dark:border-white/15 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/40" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gray-300 dark:border-white/20" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gray-300 dark:border-white/20" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gray-300 dark:border-white/20" />

            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-2 h-2 bg-primary dark:bg-primary rounded-full animate-pulse" />
              <span className="font-mono text-xs text-primary dark:text-primary uppercase tracking-wider">
                Em Desenvolvimento
              </span>
            </div>

            <h2 className="font-inter text-3xl sm:text-4xl font-normal text-black dark:text-white mb-4">
              Estamos em Desenvolvimento
            </h2>
            <p className="font-inter text-gray-600 dark:text-gray-300 max-w-xl mx-auto text-lg leading-relaxed">
              A Ecotech ainda esta em fase de desenvolvimento ativo.
              Estamos adicionando novas funcionalidades constantemente e
              adorariamos ter voce junto nessa jornada!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
