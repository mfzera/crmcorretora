
import { Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { useThemeStore } from '@/infra/providers/theme-provider';
import * as m from 'framer-motion/m';

const navLinks = [
  { label: 'Funcionalidades', href: '/funcionalidades' },
  { label: 'Treinamentos', href: '/treinamentos' },
  { label: 'Preços', href: '/precos' },
  { label: 'Sobre', href: '/sobre' },
];

export function Header() {
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)]">
      {/* Background — CSS transition, no JS scroll tracking */}
      <div
        className={`absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 h-px bg-black/8 dark:bg-white/8 transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
      />

      <nav className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/logo.svg"
              alt="EcoTech"
              width={121}
              height={32}
              className="h-8 w-auto invert dark:invert-0"
              fetchPriority="high"
              decoding="async"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex md:items-center md:gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-inter text-sm text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex md:items-center md:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Toggle theme"
            >
              {!mounted ? (
                <div className="h-5 w-5" />
              ) : theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            <Button
              className="font-inter text-sm px-5 h-9 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-white/90 font-medium rounded-md transition-all duration-200 hover:scale-105 shadow-sm"
              asChild
            >
              <Link to="/login" search={{ redirect: '' }} className="flex items-center gap-1.5">
                Entrar
                <span className="text-black/40 text-xs">→</span>
              </Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <m.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden py-4 border-t border-black/8 dark:border-white/8 bg-white/95 dark:bg-black/95 backdrop-blur-md -mx-6 sm:-mx-8 lg:-mx-12 px-6 sm:px-8 lg:px-12"
          >
            <div className="space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="font-inter block px-3 py-2 text-base text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-black/8 dark:border-white/8 space-y-3">
              <button
                onClick={toggleTheme}
                className="font-inter w-full flex items-center justify-between px-3 py-2 text-base text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white border border-black/10 dark:border-white/10 rounded-md transition-colors"
              >
                <span>
                  Tema: {!mounted ? '...' : theme === 'dark' ? 'Escuro' : 'Claro'}
                </span>
                {!mounted ? (
                  <div className="h-5 w-5" />
                ) : theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              <Button
                className="font-inter w-full text-sm bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-white/90 text-white dark:text-black font-medium rounded-md"
                asChild
              >
                <Link to="/login" search={{ redirect: '' }}>Entrar</Link>
              </Button>
            </div>
          </m.div>
        )}
      </nav>
    </header>
  );
}
