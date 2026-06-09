import { createFileRoute } from '@tanstack/react-router';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/core/ui/button';

export const Route = createFileRoute('/_static/privacidade')({
  head: () => ({
    meta: [
      { title: 'Política de Privacidade - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Como a Ecotech trata seus dados pessoais em conformidade com a LGPD. Política de privacidade completa e transparente.',
      },
      { property: 'og:title', content: 'Política de Privacidade - Ecotech CRM' },
      { property: 'og:url', content: 'https://ecotechts.com.br/privacidade' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/privacidade' }],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  const navigate = useNavigate();

  const sections = [
    {
      index: '01',
      label: 'SECTION_01',
      title: '1. Introducao',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          A ecotech respeita sua privacidade e esta comprometida em proteger seus
          dados pessoais. Esta politica descreve como coletamos, usamos e
          protegemos suas informacoes quando voce usa nosso servico.
        </p>
      ),
    },
    {
      index: '02',
      label: 'SECTION_02',
      title: '2. Dados que Coletamos',
      content: (
        <div className="space-y-3">
          <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
            Coletamos os seguintes tipos de informacoes:
          </p>
          <ul className="space-y-2 pl-4">
            {[
              { label: 'Dados de cadastro:', text: 'nome, email, telefone, dados da empresa' },
              { label: 'Dados de uso:', text: 'paginas visitadas, funcionalidades utilizadas, tempo de sessao' },
              { label: 'Dados de clientes:', text: 'informacoes que voce cadastra sobre seus clientes no sistema' },
              { label: 'Dados tecnicos:', text: 'endereco IP, tipo de navegador, sistema operacional' },
            ].map((item, i) => (
              <li key={i} className="font-inter text-gray-600 dark:text-gray-300 flex items-start gap-2">
                <span className="font-mono text-[10px] text-primary mt-1 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <strong className="text-black dark:text-white">{item.label}</strong> {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      index: '03',
      label: 'SECTION_03',
      title: '3. Como Usamos seus Dados',
      content: (
        <div className="space-y-3">
          <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
            Utilizamos suas informacoes para:
          </p>
          <ul className="space-y-2 pl-4">
            {[
              'Fornecer e manter o servico',
              'Melhorar e personalizar sua experiencia',
              'Enviar comunicacoes sobre o servico',
              'Fornecer suporte ao cliente',
              'Detectar e prevenir fraudes ou abusos',
              'Cumprir obrigacoes legais',
            ].map((item, i) => (
              <li key={i} className="font-inter text-gray-600 dark:text-gray-300 flex items-start gap-2">
                <span className="font-mono text-[10px] text-primary mt-1 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      index: '04',
      label: 'SECTION_04',
      title: '4. Compartilhamento de Dados',
      content: (
        <div className="space-y-3">
          <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
            Nao vendemos seus dados pessoais. Podemos compartilhar informacoes
            apenas nas seguintes situacoes:
          </p>
          <ul className="space-y-2 pl-4">
            {[
              'Com prestadores de servicos que nos auxiliam a operar o sistema',
              'Quando exigido por lei ou ordem judicial',
              'Para proteger nossos direitos ou seguranca',
              'Com seu consentimento expresso',
            ].map((item, i) => (
              <li key={i} className="font-inter text-gray-600 dark:text-gray-300 flex items-start gap-2">
                <span className="font-mono text-[10px] text-primary mt-1 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      index: '05',
      label: 'SECTION_05',
      title: '5. Seguranca dos Dados',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          Implementamos medidas de seguranca tecnicas e organizacionais para
          proteger seus dados, incluindo criptografia, controle de acesso e
          monitoramento de seguranca. No entanto, nenhum metodo de transmissao
          pela internet e 100% seguro.
        </p>
      ),
    },
    {
      index: '06',
      label: 'SECTION_06',
      title: '6. Retencao de Dados',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          Mantemos seus dados enquanto sua conta estiver ativa ou conforme
          necessario para fornecer os servicos. Apos o encerramento da conta,
          seus dados serao excluidos em ate 90 dias, exceto quando a retencao
          for necessaria para cumprir obrigacoes legais.
        </p>
      ),
    },
    {
      index: '07',
      label: 'SECTION_07',
      title: '7. Seus Direitos',
      content: (
        <div className="space-y-3">
          <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
            Voce tem direito a:
          </p>
          <ul className="space-y-2 pl-4">
            {[
              'Acessar seus dados pessoais',
              'Corrigir dados incorretos',
              'Solicitar a exclusao de seus dados',
              'Exportar seus dados em formato portavel',
              'Revogar consentimentos concedidos',
              'Solicitar informacoes sobre o tratamento de seus dados',
            ].map((item, i) => (
              <li key={i} className="font-inter text-gray-600 dark:text-gray-300 flex items-start gap-2">
                <span className="font-mono text-[10px] text-primary mt-1 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      index: '08',
      label: 'SECTION_08',
      title: '8. Cookies',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          Utilizamos cookies para melhorar sua experiencia. Consulte nossa{' '}
          <a
            href="/cookies"
            className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            Politica de Cookies
          </a>{' '}
          para mais detalhes.
        </p>
      ),
    },
    {
      index: '09',
      label: 'SECTION_09',
      title: '9. Alteracoes nesta Politica',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          Podemos atualizar esta politica periodicamente. Notificaremos sobre
          alteracoes significativas por email ou atraves do servico.
        </p>
      ),
    },
    {
      index: '10',
      label: 'SECTION_10',
      title: '10. Contato',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          Para exercer seus direitos ou esclarecer duvidas sobre esta politica,
          entre em contato em{' '}
          <a
            href="mailto:privacidade@ecotechts.com.br"
            className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            privacidade@ecotechts.com.br
          </a>
          .
        </p>
      ),
    },
  ];

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
        <div>page.privacidade</div>
        <div>sections.10</div>
      </div>

      <div className="relative py-24 z-10">
        <div className="mx-auto max-w-4xl px-6 sm:px-8">
          {/* Back button */}
          <div className="mb-10">
            <Button
              variant="ghost"
              onClick={() => navigate({ to: -1 as any })}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
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
              <div>LEGAL_PAGE</div>
            </div>

            <div className="relative inline-block mb-6">
              <span className="font-inter text-primary dark:text-primary text-sm font-semibold uppercase tracking-widest">
                PRIVACIDADE
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary dark:bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Politica de Privacidade
            </h1>
            <p className="font-inter text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Ultima atualizacao: 15 de Janeiro de 2025
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map((section) => (
              <div
                key={section.index}
                className="relative p-8 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
              >
                {/* Technical label */}
                <div
                  className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                  aria-hidden="true"
                >
                  {section.label}
                </div>

                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" aria-hidden="true" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" aria-hidden="true" />

                {/* Section index */}
                <div
                  className="absolute bottom-3 right-4 text-[10px] font-mono text-gray-400 dark:text-white/20"
                  aria-hidden="true"
                >
                  {section.index}
                </div>

                <h2 className="font-inter text-xl font-semibold text-black dark:text-white mb-4">
                  {section.title}
                </h2>
                {section.content}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
