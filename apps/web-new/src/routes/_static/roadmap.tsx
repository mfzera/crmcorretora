import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Check, Clock, Circle, ArrowLeft } from 'lucide-react';
import { Button } from '@/core/ui/button';

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: 'done' | 'in_progress' | 'planned';
  order: string;
}

interface RoadmapPhase {
  id: string;
  name: string;
  estimatedDate: string;
  order: string;
  items: RoadmapItem[];
}

export const Route = createFileRoute('/_static/roadmap')({
  head: () => ({
    meta: [
      { title: 'Roadmap - Próximas Funcionalidades - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Acompanhe o que está por vir na Ecotech CRM. Veja nossas prioridades de desenvolvimento e as funcionalidades planejadas para os próximos meses.',
      },
      { property: 'og:title', content: 'Roadmap - Próximas Funcionalidades - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Acompanhe o que está por vir na Ecotech CRM. Veja nossas prioridades e funcionalidades planejadas.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/roadmap' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/roadmap' }],
  }),
  loader: async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    try {
      const res = await fetch(`${apiUrl}/public/roadmap/phases`);
      if (!res.ok) return { phases: [] as RoadmapPhase[] };
      const data = await res.json();
      return { phases: (data.phases ?? []) as RoadmapPhase[] };
    } catch {
      return { phases: [] as RoadmapPhase[] };
    }
  },
  component: RoadmapPage,
});

const statusConfig = {
  done: {
    icon: Check,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
  },
  in_progress: {
    icon: Clock,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
  },
  planned: {
    icon: Circle,
    color: 'text-gray-400',
    bg: 'bg-white/5',
    border: 'border-white/10',
  },
};

function formatEstimatedDate(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function RoadmapPage() {
  const { phases } = Route.useLoaderData();
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-black min-h-screen relative overflow-hidden">
      {/* Dense dotted grid background pattern */}
      <div className="absolute inset-0 opacity-30">
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
      <div className="absolute inset-0 opacity-15">
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
        <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px opacity-40">
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
        <div className="absolute right-6 sm:right-8 top-0 bottom-0 w-px opacity-40">
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
        <div>page.roadmap</div>
        <div>timeline.quarterly</div>
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
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">
              <div>ROADMAP_PAGE</div>
            </div>

            <div className="relative inline-block mb-6">
              <span className="font-inter text-primary text-sm font-semibold uppercase tracking-widest">
                PLANEJAMENTO
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Roadmap
            </h1>
            <p className="font-inter text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Nossos planos para o futuro da ecotech. Este roadmap é
              atualizado conforme avancamos.
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-6 mb-12 relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[8px] font-mono text-gray-400 dark:text-white/20">
              LEGEND
            </div>

            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="font-inter text-sm text-gray-500 dark:text-gray-400">
                Concluido
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="font-inter text-sm text-gray-500 dark:text-gray-400">
                Em progresso
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-gray-400" />
              <span className="font-inter text-sm text-gray-500 dark:text-gray-400">
                Planejado
              </span>
            </div>
          </div>

          {/* Timeline */}
          {phases.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="font-inter text-lg">Nenhuma fase publicada ainda.</p>
            </div>
          ) : (
            <div className="space-y-8 relative">
              {/* Main timeline vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-px opacity-30">
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

              {phases.map((phase, index) => {
                const hasInProgress = phase.items.some(
                  (item) => item.status === 'in_progress',
                );
                const allDone =
                  phase.items.length > 0 &&
                  phase.items.every((item) => item.status === 'done');
                const phaseStatusKey = allDone
                  ? 'done'
                  : hasInProgress
                    ? 'in_progress'
                    : 'planned';
                const phaseStatus = statusConfig[phaseStatusKey];
                const PhaseIcon = phaseStatus.icon;

                return (
                  <div key={phase.id} className="relative pl-16 pb-8 last:pb-0">
                    {/* Phase indicator dot */}
                    <div
                      className={`absolute left-3 top-0 w-6 h-6 rounded-full ${phaseStatus.bg} border ${phaseStatus.border} flex items-center justify-center`}
                    >
                      <PhaseIcon className={`w-3 h-3 ${phaseStatus.color}`} />
                    </div>

                    {/* Technical label */}
                    <div className="absolute -top-3 left-16 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    {/* Phase content */}
                    <div className="relative rounded-xl p-6 border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/20 transition-all">
                      {/* Corner accents */}
                      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30 rounded-tl" />
                      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gray-300 dark:border-white/20 rounded-tr" />

                      <div className="flex items-center gap-3 mb-4">
                        <span
                          className={`px-3 py-1 rounded-full ${phaseStatus.bg} ${phaseStatus.color} text-sm font-medium font-inter border ${phaseStatus.border}`}
                        >
                          {formatEstimatedDate(phase.estimatedDate)}
                        </span>
                        <h2 className="font-inter text-xl font-semibold text-black dark:text-white">
                          {phase.name}
                        </h2>
                      </div>

                      {phase.items.length > 0 ? (
                        <ul className="space-y-3">
                          {phase.items.map((item, itemIndex) => {
                            const itemStatusKey =
                              item.status in statusConfig
                                ? item.status
                                : 'planned';
                            const itemStatus = statusConfig[itemStatusKey];
                            const ItemIcon = itemStatus.icon;

                            return (
                              <li
                                key={item.id}
                                className="flex items-start gap-3 group/item"
                              >
                                <div className="text-[8px] font-mono text-gray-400 dark:text-white/20 w-4 mt-1">
                                  {String(itemIndex + 1).padStart(2, '0')}
                                </div>
                                <ItemIcon
                                  className={`w-4 h-4 ${itemStatus.color} flex-shrink-0 mt-0.5`}
                                />
                                <div>
                                  <span
                                    className={`font-inter ${
                                      item.status === 'done'
                                        ? 'text-gray-400 line-through'
                                        : 'text-gray-600 dark:text-gray-300'
                                    }`}
                                  >
                                    {item.title}
                                  </span>
                                  {item.description && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm font-inter italic">
                          Nenhum item nesta fase ainda.
                        </p>
                      )}

                      {/* Card index */}
                      <div className="absolute bottom-2 right-2 text-[10px] font-mono text-gray-400 dark:text-white/20">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Note */}
          <div className="relative mt-12 p-6 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500/40" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500/40" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500/40" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500/40" />

            <p className="font-inter text-amber-700 dark:text-amber-200 text-sm leading-relaxed">
              Este roadmap pode mudar conforme recebemos feedback dos usuarios e
              priorizamos funcionalidades. Tem alguma sugestao?{' '}
              <a
                href="/contato"
                className="underline font-medium hover:text-primary transition-colors"
              >
                Entre em contato!
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
