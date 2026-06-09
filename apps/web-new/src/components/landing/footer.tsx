import { Link } from '@tanstack/react-router';

const footerLinks = {
  produto: {
    title: 'Produto',
    links: [
      { label: 'Funcionalidades', href: '/funcionalidades' },
      { label: 'Atualizações', href: '/changelog' },
      { label: 'Roadmap', href: '/roadmap' },
    ],
  },
  recursos: {
    title: 'Recursos',
    links: [{ label: 'Documentação', href: '/docs' }],
  },
  empresa: {
    title: 'Empresa',
    links: [
      { label: 'Sobre Nós', href: '/sobre' },
      { label: 'Contato', href: '/contato' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Termos de Uso', href: '/termos' },
      { label: 'Privacidade', href: '/privacidade' },
      { label: 'Cookies', href: '/cookies' },
      { label: 'LGPD', href: '/lgpd' },
    ],
  },
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-black relative overflow-hidden">
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

      {/* Top dashed border */}
      <div className="absolute top-0 left-0 right-0 h-px">
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2) 8px, transparent 8px, transparent 16px)',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.2) 8px, transparent 8px, transparent 16px)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
        {/* Main footer */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2 relative">
            {/* Corner accent */}
            <div className="absolute -top-4 -left-4 w-6 h-6 border-t border-l border-primary/20" />

            <Link to="/" className="inline-block mb-4">
              <img
                src="/logo.svg"
                alt="Ecosistema Seguros"
                width={121}
                height={32}
                loading="lazy"
                decoding="async"
                className="h-8 w-auto invert dark:invert-0"
              />
            </Link>
            <p className="font-inter text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-xs leading-relaxed">
              Plataforma em desenvolvimento para corretoras de seguros. Estamos
              construindo algo especial!
            </p>
            {/* Social links */}
            <div className="flex gap-4">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn da Ecosistema Seguros (abre em nova aba)"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 rounded"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram da Ecosistema Seguros (abre em nova aba)"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 rounded"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube da Ecosistema Seguros (abre em nova aba)"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 rounded"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links with grid structure */}
          {Object.values(footerLinks).map((section, index) => (
            <div key={section.title} className="relative">
              {/* Subtle grid number */}
              <div className="absolute -top-3 left-0 text-[9px] font-mono text-gray-400 dark:text-white/20">
                {String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="font-inter text-black dark:text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="font-inter text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors inline-flex items-center group"
                    >
                      <span className="w-1 h-1 bg-gray-300 dark:bg-white/20 rounded-full mr-2 group-hover:bg-primary transition-colors" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="py-6 flex flex-col md:flex-row justify-between items-center gap-4 relative">
          <div className="absolute top-0 left-0 right-0 h-px">
            <div
              className="absolute inset-0 dark:hidden"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, rgba(0,0,0,0.1), rgba(0,0,0,0.1) 6px, transparent 6px, transparent 12px)',
              }}
            />
            <div
              className="absolute inset-0 hidden dark:block"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.15) 6px, transparent 6px, transparent 12px)',
              }}
            />
          </div>

          <p className="font-inter text-sm text-gray-600 dark:text-gray-400">
            © {currentYear} Ecosistema Seguros. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-inter flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="font-mono text-xs">STATUS: OPERATIONAL</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
