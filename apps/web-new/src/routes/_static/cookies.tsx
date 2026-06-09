import { createFileRoute } from '@tanstack/react-router';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Cookie } from 'lucide-react';
import { Button } from '@/core/ui/button';

export const Route = createFileRoute('/_static/cookies')({
  head: () => ({
    meta: [
      { title: 'Política de Cookies - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Entenda como a Ecotech CRM utiliza cookies para melhorar sua experiência na plataforma. Quais cookies usamos e como gerenciá-los.',
      },
      { property: 'og:title', content: 'Política de Cookies - Ecotech CRM' },
      { property: 'og:url', content: 'https://ecotechts.com.br/cookies' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/cookies' }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
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
      <div
        className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1 z-10"
        aria-hidden="true"
      >
        <div>page.cookies</div>
        <div>legal.policy</div>
      </div>

      <div className="relative py-24 z-10">
        <div className="mx-auto max-w-4xl px-6 sm:px-8">
          {/* Back button */}
          <div className="mb-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: -1 as any })}
              className="gap-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>

          {/* Header */}
          <div className="text-center mb-16 relative">
            <div
              className="absolute -top-12 left-1/2 -translate-x-1/2 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider"
              aria-hidden="true"
            >
              <div>COOKIES_PAGE</div>
            </div>

            <div className="relative inline-flex items-center gap-3 mb-6">
              <Cookie className="w-4 h-4 text-primary" aria-hidden="true" />
              <span className="font-inter text-primary dark:text-primary text-sm font-semibold uppercase tracking-widest">
                COOKIES
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-full bg-primary dark:bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Política de Cookies
            </h1>
            <p className="font-inter text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Entenda como e por que utilizamos cookies para melhorar sua
              experiência na plataforma.
            </p>
            <p
              className="mt-4 text-xs font-mono text-gray-400 dark:text-white/25"
              aria-hidden="true"
            >
              Última atualização: 15 de Janeiro de 2025
            </p>
          </div>

          <div className="space-y-8">
            {/* O que são Cookies */}
            <div className="relative p-8 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]">
              <div
                className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                aria-hidden="true"
              >
                SECTION_01
              </div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" />

              <h2 className="font-inter text-xl font-semibold text-black dark:text-white mb-4">
                O que são Cookies?
              </h2>
              <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed">
                Cookies são pequenos arquivos de texto armazenados em seu
                dispositivo quando você visita um site. Eles são amplamente
                utilizados para fazer os sites funcionarem de forma mais
                eficiente e fornecer informações aos proprietários do site.
              </p>
            </div>

            {/* Como Usamos */}
            <div className="relative p-8 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]">
              <div
                className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                aria-hidden="true"
              >
                SECTION_02
              </div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" />

              <h2 className="font-inter text-xl font-semibold text-black dark:text-white mb-4">
                Como Usamos Cookies
              </h2>
              <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                A ecotech utiliza cookies para:
              </p>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex gap-3">
                  <span className="font-mono text-[10px] text-primary mt-1 shrink-0">▸</span>
                  <span>
                    <strong className="text-black dark:text-white font-medium">Cookies essenciais:</strong>{' '}
                    Necessários para o funcionamento do site, como manter você
                    logado e lembrar suas preferências.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-[10px] text-primary mt-1 shrink-0">▸</span>
                  <span>
                    <strong className="text-black dark:text-white font-medium">Cookies de desempenho:</strong>{' '}
                    Nos ajudam a entender como os visitantes interagem com o
                    site, coletando informações anônimas.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-[10px] text-primary mt-1 shrink-0">▸</span>
                  <span>
                    <strong className="text-black dark:text-white font-medium">Cookies funcionais:</strong>{' '}
                    Permitem que o site lembre de escolhas que você faz, como
                    idioma ou região.
                  </span>
                </li>
              </ul>
            </div>

            {/* Lista de Cookies */}
            <div className="relative p-8 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]">
              <div
                className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                aria-hidden="true"
              >
                SECTION_03
              </div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" />

              <h2 className="font-inter text-xl font-semibold text-black dark:text-white mb-6">
                Lista de Cookies
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left font-semibold text-black dark:text-white border border-gray-200 dark:border-white/10 px-4 py-3 bg-gray-100 dark:bg-white/[0.04]">
                        Cookie
                      </th>
                      <th className="text-left font-semibold text-black dark:text-white border border-gray-200 dark:border-white/10 px-4 py-3 bg-gray-100 dark:bg-white/[0.04]">
                        Tipo
                      </th>
                      <th className="text-left font-semibold text-black dark:text-white border border-gray-200 dark:border-white/10 px-4 py-3 bg-gray-100 dark:bg-white/[0.04]">
                        Finalidade
                      </th>
                      <th className="text-left font-semibold text-black dark:text-white border border-gray-200 dark:border-white/10 px-4 py-3 bg-gray-100 dark:bg-white/[0.04]">
                        Duração
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 dark:border-white/10 px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        session_id
                      </td>
                      <td className="border border-gray-200 dark:border-white/10 px-4 py-3 text-gray-600 dark:text-gray-400">
                        Essencial
                      </td>
                      <td className="border border-gray-200 dark:border-white/10 px-4 py-3 text-gray-600 dark:text-gray-400">
                        Manter sua sessão ativa
                      </td>
                      <td className="border border-gray-200 dark:border-white/10 px-4 py-3 text-gray-600 dark:text-gray-400">
                        Sessão
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 dark:border-white/10 px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        theme
                      </td>
                      <td className="border border-gray-200 dark:border-white/10 px-4 py-3 text-gray-600 dark:text-gray-400">
                        Funcional
                      </td>
                      <td className="border border-gray-200 dark:border-white/10 px-4 py-3 text-gray-600 dark:text-gray-400">
                        Lembrar preferência de tema (claro/escuro)
                      </td>
                      <td className="border border-gray-200 dark:border-white/10 px-4 py-3 text-gray-600 dark:text-gray-400">
                        1 ano
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 dark:border-white/10 px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        _analytics
                      </td>
                      <td className="border border-gray-200 dark:border-white/10 px-4 py-3 text-gray-600 dark:text-gray-400">
                        Desempenho
                      </td>
                      <td className="border border-gray-200 dark:border-white/10 px-4 py-3 text-gray-600 dark:text-gray-400">
                        Coletar dados de uso anônimos
                      </td>
                      <td className="border border-gray-200 dark:border-white/10 px-4 py-3 text-gray-600 dark:text-gray-400">
                        1 ano
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gerenciamento */}
            <div className="relative p-8 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]">
              <div
                className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                aria-hidden="true"
              >
                SECTION_04
              </div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" />

              <h2 className="font-inter text-xl font-semibold text-black dark:text-white mb-4">
                Gerenciamento
              </h2>
              <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                Você pode controlar e gerenciar cookies de várias maneiras. A
                maioria dos navegadores permite:
              </p>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                {[
                  'Ver quais cookies estão armazenados e excluir individualmente',
                  'Bloquear cookies de terceiros',
                  'Bloquear todos os cookies',
                  'Excluir todos os cookies ao fechar o navegador',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="font-mono text-[10px] text-primary mt-1 shrink-0">▸</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
                Note que desabilitar cookies pode afetar a funcionalidade do
                site e sua experiência de uso.
              </p>
            </div>

            {/* Cookies de Terceiros */}
            <div className="relative p-8 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]">
              <div
                className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                aria-hidden="true"
              >
                SECTION_05
              </div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" />

              <h2 className="font-inter text-xl font-semibold text-black dark:text-white mb-4">
                Cookies de Terceiros
              </h2>
              <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed">
                Podemos utilizar serviços de terceiros que também utilizam
                cookies, como ferramentas de análise. Esses cookies estão
                sujeitos às políticas de privacidade desses terceiros.
              </p>
            </div>

            {/* Atualizações */}
            <div className="relative p-8 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]">
              <div
                className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                aria-hidden="true"
              >
                SECTION_06
              </div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" />

              <h2 className="font-inter text-xl font-semibold text-black dark:text-white mb-4">
                Atualizações desta Política
              </h2>
              <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed">
                Podemos atualizar esta política de cookies periodicamente para
                refletir mudanças em nossas práticas ou por outras razões
                operacionais, legais ou regulatórias.
              </p>
            </div>

            {/* Contato */}
            <div className="relative rounded-2xl p-10 text-center border border-gray-200 dark:border-white/15 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/40" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gray-300 dark:border-white/20" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gray-300 dark:border-white/20" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gray-300 dark:border-white/20" />

              <h2 className="font-inter text-2xl font-semibold text-black dark:text-white mb-4">
                Contato
              </h2>
              <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                Se tiver dúvidas sobre nossa política de cookies, entre em
                contato conosco.
              </p>
              <a
                href="mailto:suporte@ecotechts.com.br"
                className="inline-flex items-center gap-2 font-mono text-sm text-primary hover:underline"
              >
                suporte@ecotechts.com.br
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
