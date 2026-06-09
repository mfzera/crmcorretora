import { createRootRouteWithContext, HeadContent, Outlet, Link } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { Providers } from '@/infra/providers';
import { AppErrorBoundary } from '@/core/components/app-error-boundary';
import { Button } from '@/core/ui/button';
import { ArrowLeft, Home, Wrench } from 'lucide-react';
import '@/styles/globals.css';

const IS_MAINTENANCE = import.meta.env.VITE_MAINTENANCE === 'true';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { title: 'Ecotech CRM - CRM Completo para Corretoras de Seguros' },
      {
        name: 'description',
        content:
          'Sistema CRM completo para corretoras de seguros. Gerencie cotações, propostas, renovações e sua equipe em um único lugar.',
      },
      { property: 'og:site_name', content: 'Ecotech CRM' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'Ecotech CRM - CRM Completo para Corretoras de Seguros' },
      {
        property: 'og:description',
        content:
          'Sistema CRM completo para corretoras de seguros. Gerencie cotações, propostas, renovações e sua equipe em um único lugar.',
      },
      { property: 'og:image', content: '/og-image.png' },
      { property: 'og:url', content: 'https://ecotechts.com.br' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  notFoundComponent: NotFoundPage,
  component: RootComponent,
});

function NotFoundPage() {
  return (
    <Providers>
      <div className="min-h-screen bg-white dark:bg-black relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 opacity-20">
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

        <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-16">
          <div className="max-w-2xl mx-auto text-center relative">
            <div className="absolute -top-8 -left-8 w-12 h-12 border-t border-l border-primary/30" />
            <div className="absolute -top-8 -right-8 w-12 h-12 border-t border-r border-gray-200 dark:border-white/20" />
            <div className="absolute -bottom-8 -left-8 w-12 h-12 border-b border-l border-gray-200 dark:border-white/20" />
            <div className="absolute -bottom-8 -right-8 w-12 h-12 border-b border-r border-primary/30" />

            <div className="absolute -top-12 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-2">
              ERROR_404_NOT_FOUND
            </div>

            <div className="mb-8 relative">
              <h1 className="font-inter text-9xl md:text-[12rem] font-bold text-black dark:text-white leading-none">
                404
              </h1>
            </div>

            <div className="mb-12">
              <h2 className="font-inter text-2xl md:text-3xl font-semibold text-black dark:text-white mb-4">
                Página não encontrada
              </h2>
              <p className="font-inter text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
                A página que você está procurando não existe ou foi movida para
                outro endereço.
              </p>
            </div>

            <div className="mb-12 flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                STATUS: PAGE_NOT_FOUND
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                className="font-inter text-sm px-6 h-11 bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black font-medium rounded-md transition-colors w-full sm:w-auto"
                asChild
              >
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Ir para Home
                </Link>
              </Button>

              <Button
                variant="outline"
                className="font-inter text-sm px-6 h-11 bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-black dark:text-white font-medium rounded-md transition-colors border border-gray-200 dark:border-white/10 w-full sm:w-auto"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Providers>
  );
}

function MaintenancePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 opacity-20">
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

      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-16">
        <div className="max-w-2xl mx-auto text-center relative">
          <div className="absolute -top-8 -left-8 w-12 h-12 border-t border-l border-primary/30" />
          <div className="absolute -top-8 -right-8 w-12 h-12 border-t border-r border-gray-200 dark:border-white/20" />
          <div className="absolute -bottom-8 -left-8 w-12 h-12 border-b border-l border-gray-200 dark:border-white/20" />
          <div className="absolute -bottom-8 -right-8 w-12 h-12 border-b border-r border-primary/30" />

          <div className="absolute -top-12 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-2">
            STATUS_MAINTENANCE
          </div>

          <div className="mb-8 flex justify-center">
            <Wrench className="w-24 h-24 text-black dark:text-white opacity-80" />
          </div>

          <div className="mb-12">
            <h2 className="font-inter text-2xl md:text-3xl font-semibold text-black dark:text-white mb-4">
              Sistema em manutenção
            </h2>
            <p className="font-inter text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
              Estamos realizando melhorias no sistema. Em breve estaremos de volta.
            </p>
          </div>

          <div className="mb-12 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
              EM MANUTENÇÃO
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RootComponent() {
  return (
    <Providers>
      <HeadContent />
      {IS_MAINTENANCE ? (
        <MaintenancePage />
      ) : (
        <AppErrorBoundary>
          <Outlet />
        </AppErrorBoundary>
      )}
    </Providers>
  );
}
