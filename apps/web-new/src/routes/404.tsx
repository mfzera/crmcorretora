import { createFileRoute } from '@tanstack/react-router';

import { Link } from '@tanstack/react-router';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

export const Route = createFileRoute('/404')({
  component: NotFound,
});


function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white dark:bg-black relative overflow-hidden flex items-center justify-center">
      {/* Dotted grid background pattern */}
      <div className="absolute inset-0 opacity-20 dark:opacity-20">
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

      {/* Vertical guide lines */}
      <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="absolute left-6 sm:left-8 lg:left-12 top-0 bottom-0 w-px opacity-20 dark:opacity-20">
          <div
            className="absolute inset-0 dark:hidden"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3) 8px, transparent 8px, transparent 16px)',
            }}
          />
          <div
            className="absolute inset-0 hidden dark:block"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 8px, transparent 8px, transparent 16px)',
            }}
          />
        </div>
        <div className="absolute right-6 sm:right-8 lg:right-12 top-0 bottom-0 w-px opacity-20 dark:opacity-20">
          <div
            className="absolute inset-0 dark:hidden"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3) 8px, transparent 8px, transparent 16px)',
            }}
          />
          <div
            className="absolute inset-0 hidden dark:block"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 8px, transparent 8px, transparent 16px)',
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-16">
        <div className="max-w-2xl mx-auto text-center relative">
          {/* Corner accents */}
          <div className="absolute -top-8 -left-8 w-12 h-12 border-t border-l border-primary/30" />
          <div className="absolute -top-8 -right-8 w-12 h-12 border-t border-r border-gray-200 dark:border-white/20" />
          <div className="absolute -bottom-8 -left-8 w-12 h-12 border-b border-l border-gray-200 dark:border-white/20" />
          <div className="absolute -bottom-8 -right-8 w-12 h-12 border-b border-r border-primary/30" />

          {/* Technical label */}
          <div className="absolute -top-12 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-2">
            ERROR_404_NOT_FOUND
          </div>

          {/* 404 Large Text */}
          <div className="mb-8 relative">
            <h1 className="font-inter text-9xl md:text-[12rem] font-bold text-black dark:text-white leading-none relative">
              404
              {/* Dashed underline */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-px mt-4">
                <div
                  className="absolute inset-0 dark:hidden"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3) 8px, transparent 8px, transparent 16px)',
                  }}
                />
                <div
                  className="absolute inset-0 hidden dark:block"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 8px, transparent 8px, transparent 16px)',
                  }}
                />
              </div>
            </h1>
            <div className="absolute -bottom-8 right-0 text-[9px] font-mono text-gray-400 dark:text-white/20">
              text-9xl.font-bold
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-12 relative">
            <h2 className="font-inter text-2xl md:text-3xl font-semibold text-black dark:text-white mb-4">
              Página não encontrada
            </h2>
            <p className="font-inter text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
              A página que você está procurando não existe ou foi movida para
              outro endereço.
            </p>
          </div>

          {/* Status Indicator */}
          <div className="mb-12 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
              STATUS: PAGE_NOT_FOUND
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              className="font-inter text-sm px-6 h-11 bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black font-medium rounded-md transition-colors relative overflow-hidden group w-full sm:w-auto"
              asChild
            >
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                <span className="relative z-10">Ir para Home</span>
                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/10 dark:border-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </Button>

            <Button
              variant="outline"
              className="font-inter text-sm px-6 h-11 bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-black dark:text-white font-medium rounded-md transition-colors border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 relative group w-full sm:w-auto"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="relative z-10">Voltar</span>
              {/* Corner accent */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>

          {/* Bottom technical note */}
          <div className="absolute -bottom-12 right-0 text-[8px] font-mono text-gray-400 dark:text-white/20">
            max-w-2xl.mx-auto.text-center
          </div>
        </div>
      </div>
    </div>
  );
}
