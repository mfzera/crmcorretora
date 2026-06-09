import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  Bug,
  Wrench,
  AlertTriangle,
  Shield,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { Skeleton } from '@/core/ui/skeleton';
import { Button } from '@/core/ui/button';

export const Route = createFileRoute('/_static/changelog')({
  head: () => ({
    meta: [
      { title: 'Changelog - Atualizações e Melhorias - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Acompanhe todas as novidades, correções e melhorias lançadas na plataforma Ecotech CRM. Histórico completo de versões.',
      },
      { property: 'og:title', content: 'Changelog - Atualizações e Melhorias - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Acompanhe todas as novidades e melhorias lançadas na plataforma Ecotech CRM.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/changelog' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/changelog' }],
  }),
  component: ChangelogPage,
});


interface ChangelogItem {
  id: string;
  type:
    | 'feature'
    | 'bugfix'
    | 'improvement'
    | 'breaking'
    | 'security'
    | 'documentation';
  title: string;
  description: string;
  metadata?: any;
  order: string;
}

interface Changelog {
  id: string;
  version: string;
  title: string;
  description?: string;
  releaseDate: string;
  publishedAt?: string;
  publishedBy?: string;
  items: ChangelogItem[];
}

const typeIcons = {
  feature: {
    icon: Sparkles,
    color: 'text-emerald-500 dark:text-emerald-400',
    label: 'Nova Funcionalidade',
  },
  bugfix: { icon: Bug, color: 'text-red-500 dark:text-red-400', label: 'Correção' },
  improvement: { icon: Wrench, color: 'text-blue-500 dark:text-blue-400', label: 'Melhoria' },
  breaking: {
    icon: AlertTriangle,
    color: 'text-orange-500 dark:text-orange-400',
    label: 'Breaking Change',
  },
  security: { icon: Shield, color: 'text-purple-500 dark:text-purple-400', label: 'Segurança' },
  documentation: {
    icon: FileText,
    color: 'text-green-500 dark:text-green-400',
    label: 'Documentação',
  },
};

function ChangelogPage() {
  const navigate = useNavigate();
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChangelogs = async () => {
      try {
        setLoading(true);
        const apiUrl =
          import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/public/changelogs`);

        if (!response.ok) {
          throw new Error('Falha ao carregar changelogs');
        }

        const data = await response.json();
        setChangelogs(data.changelogs || []);
      } catch (err) {
        console.error('Erro ao buscar changelogs:', err);
        setError(
          'Não foi possível carregar as atualizações. Tente novamente mais tarde.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchChangelogs();
  }, []);

  const formatDate = (dateStr: string): string => {
    const date = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T12:00:00Z`);
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

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
      <div className="absolute inset-0 max-w-3xl mx-auto px-6 sm:px-8">
        <div
          className="absolute left-6 sm:left-8 top-0 bottom-0 w-px opacity-40 dark:hidden"
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
          className="absolute right-6 sm:right-8 top-0 bottom-0 w-px opacity-40 dark:hidden"
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

      {/* Technical annotations */}
      <div className="absolute top-4 left-4 text-[9px] font-mono text-black/25 dark:text-white/25 leading-tight space-y-1 z-10">
        <div>page.changelog</div>
        <div>timeline.vertical</div>
      </div>

      <div className="relative py-24 z-10">
        <div className="mx-auto max-w-3xl px-6 sm:px-8">
          <div className="mb-8">
            <Button variant="ghost" onClick={() => navigate({ to: -1 as any })} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
          {/* Header */}
          <div className="text-center mb-16 relative">
            {/* Section label */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-[10px] font-mono text-black/20 dark:text-white/20 tracking-wider">
              <div>CHANGELOG_PAGE</div>
            </div>

            <div className="relative inline-block mb-6">
              <span className="font-inter text-[#00cc6a] dark:text-primary text-sm font-semibold uppercase tracking-widest">
                ATUALIZAÇÕES
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-[#00cc6a] dark:bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-gray-900 dark:text-white mb-6">
              Atualizações
            </h1>
            <p className="font-inter text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              Acompanhe as novidades e melhorias da ecotech.
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="space-y-12">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-8 w-24 bg-black/10 dark:bg-white/10" />
                    <Skeleton className="h-6 w-32 bg-black/10 dark:bg-white/10" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full bg-black/10 dark:bg-white/10" />
                    <Skeleton className="h-20 w-full bg-black/10 dark:bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4 border border-red-500/30">
                <Bug className="w-8 h-8 text-red-500 dark:text-red-400" />
              </div>
              <h3 className="font-inter text-lg font-medium text-gray-900 dark:text-white mb-2">
                Erro ao carregar
              </h3>
              <p className="font-inter text-gray-500 dark:text-gray-400">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && changelogs.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 mb-4 border border-black/10 dark:border-white/10">
                <Sparkles className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-inter text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhuma atualização ainda
              </h3>
              <p className="font-inter text-gray-500 dark:text-gray-400">
                Em breve teremos novidades por aqui!
              </p>
            </div>
          )}

          {/* Changelog List */}
          {!loading && !error && changelogs.length > 0 && (
            <div className="space-y-8">
              {changelogs.map((release, releaseIndex) => (
                <div key={release.id} className="relative">
                  {/* Technical label */}
                  <div className="absolute -top-3 left-4 text-[8px] font-mono text-black/20 dark:text-white/20 bg-white dark:bg-black px-1 z-10">
                    RELEASE_{String(releaseIndex + 1).padStart(2, '0')}
                  </div>

                  {/* Card */}
                  <div className="relative rounded-xl p-6 border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:border-black/20 dark:hover:border-white/20 transition-all">
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00cc6a]/30 dark:border-primary/30 rounded-tl" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-black/20 dark:border-white/20 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-black/10 dark:border-white/10 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-black/10 dark:border-white/10 rounded-br" />

                    {/* Version header */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-[#00cc6a]/20 dark:bg-primary/20 text-[#00aa55] dark:text-primary text-sm font-medium font-inter border border-[#00cc6a]/30 dark:border-primary/30">
                        v{release.version}
                      </span>
                      <span className="font-inter text-gray-500 dark:text-gray-400 text-sm">
                        {formatDate(release.releaseDate)}
                      </span>
                      {release.publishedBy && (
                        <span className="font-inter text-gray-400 dark:text-gray-500 text-xs font-mono ml-auto">
                          por {release.publishedBy}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    {release.title && (
                      <h2 className="font-inter text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                        {release.title}
                      </h2>
                    )}

                    {/* Description */}
                    {release.description && (
                      <p className="font-inter text-gray-500 dark:text-gray-400 mb-6 leading-relaxed whitespace-pre-line text-sm">
                        {release.description}
                      </p>
                    )}

                    {/* Changes */}
                    {release.items && release.items.length > 0 && (
                      <div className="space-y-3 pl-4 border-l border-black/10 dark:border-white/10 relative">
                        <div
                          className="absolute left-0 top-0 bottom-0 w-px opacity-30 dark:hidden"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(0deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3) 6px, transparent 6px, transparent 12px)',
                          }}
                        />
                        <div
                          className="absolute left-0 top-0 bottom-0 w-px opacity-30 hidden dark:block"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 6px, transparent 6px, transparent 12px)',
                          }}
                        />

                        {release.items.map((change, changeIndex) => {
                          const typeConfig = typeIcons[change.type];
                          const TypeIcon = typeConfig.icon;
                          const typeColor = typeConfig.color;

                          return (
                            <div key={change.id} className="relative pl-5">
                              {/* Dot indicator */}
                              <div className="absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-black border border-black/20 dark:border-white/20 flex items-center justify-center">
                                <TypeIcon className={`w-2 h-2 ${typeColor}`} />
                              </div>

                              <div className="text-[8px] font-mono text-black/20 dark:text-white/20 absolute -left-1.5 top-[18px]">
                                {String(changeIndex + 1).padStart(2, '0')}
                              </div>

                              <div className="p-2.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                                <div className="flex items-start gap-2 mb-1">
                                  <h3 className="font-inter font-medium text-gray-900 dark:text-white text-sm">
                                    {change.title}
                                  </h3>
                                  {change.type === 'breaking' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 shrink-0">
                                      Breaking
                                    </span>
                                  )}
                                </div>
                                <p className="font-inter text-gray-500 dark:text-gray-500 text-xs leading-relaxed whitespace-pre-line">
                                  {change.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Card index */}
                    <div className="absolute bottom-2 right-3 text-[10px] font-mono text-black/20 dark:text-white/20">
                      {String(releaseIndex + 1).padStart(2, '0')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
