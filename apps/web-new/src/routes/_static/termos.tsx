import { createFileRoute } from '@tanstack/react-router';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, FileText, Scale } from 'lucide-react';
import { Button } from '@/core/ui/button';

export const Route = createFileRoute('/_static/termos')({
  head: () => ({
    meta: [
      { title: 'Termos de Serviço - Ecotech CRM' },
      { name: 'description', content: 'Leia os termos de uso da plataforma Ecotech CRM.' },
      { property: 'og:title', content: 'Termos de Serviço - Ecotech CRM' },
      { property: 'og:url', content: 'https://ecotechts.com.br/termos' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/termos' }],
  }),
  component: TermosPage,
});

function TermosPage() {
  const navigate = useNavigate();

  const sections = [
    {
      index: '01',
      label: 'SECTION_01',
      title: '1. Aceitacao dos Termos',
      icon: Scale,
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          Ao acessar e usar o ecotech, voce concorda em cumprir e estar vinculado
          a estes Termos de Uso. Se voce nao concordar com qualquer parte destes
          termos, nao devera usar nossos servicos.
        </p>
      ),
    },
    {
      index: '02',
      label: 'SECTION_02',
      title: '2. Descricao do Servico',
      icon: FileText,
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          O ecotech e uma plataforma de gestao para corretoras de seguros que
          permite o gerenciamento de clientes, cotacoes, propostas e renovacoes.
          O servico esta atualmente em fase de desenvolvimento e novas
          funcionalidades sao adicionadas regularmente.
        </p>
      ),
    },
    {
      index: '03',
      label: 'SECTION_03',
      title: '3. Cadastro e Conta',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          Para usar o ecotech, voce devera criar uma conta fornecendo informacoes
          precisas e completas. Voce e responsavel por manter a confidencialidade
          de sua senha e por todas as atividades que ocorram em sua conta.
        </p>
      ),
    },
    {
      index: '04',
      label: 'SECTION_04',
      title: '4. Uso Aceitavel',
      content: (
        <div className="space-y-3">
          <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
            Voce concorda em usar o servico apenas para fins legais e de acordo
            com estes termos. Voce nao devera:
          </p>
          <ul className="space-y-2 pl-4">
            {[
              'Violar qualquer lei ou regulamento aplicavel',
              'Infringir direitos de propriedade intelectual de terceiros',
              'Transmitir virus ou codigo malicioso',
              'Tentar acessar sistemas ou dados sem autorizacao',
              'Usar o servico para enviar spam ou comunicacoes nao solicitadas',
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
      title: '5. Propriedade Intelectual',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          O ecotech e todo o seu conteudo, recursos e funcionalidades sao de
          propriedade da empresa e estao protegidos por leis de direitos autorais,
          marcas registradas e outras leis de propriedade intelectual.
        </p>
      ),
    },
    {
      index: '06',
      label: 'SECTION_06',
      title: '6. Privacidade',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          Sua privacidade e importante para nos. Por favor, consulte nossa{' '}
          <a
            href="/privacidade"
            className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            Politica de Privacidade
          </a>{' '}
          para entender como coletamos, usamos e protegemos suas informacoes.
        </p>
      ),
    },
    {
      index: '07',
      label: 'SECTION_07',
      title: '7. Limitacao de Responsabilidade',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          O servico e fornecido "como esta" e "conforme disponivel". Nao
          garantimos que o servico sera ininterrupto, seguro ou livre de erros.
          Em nenhuma circunstancia seremos responsaveis por danos indiretos,
          incidentais ou consequenciais.
        </p>
      ),
    },
    {
      index: '08',
      label: 'SECTION_08',
      title: '8. Modificacoes',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          Reservamo-nos o direito de modificar estes termos a qualquer momento.
          As alteracoes entrarao em vigor imediatamente apos a publicacao. O uso
          continuado do servico apos as alteracoes constitui aceitacao dos novos
          termos.
        </p>
      ),
    },
    {
      index: '09',
      label: 'SECTION_09',
      title: '9. Rescisao',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          Podemos encerrar ou suspender seu acesso ao servico imediatamente, sem
          aviso previo, por qualquer motivo, incluindo violacao destes termos.
        </p>
      ),
    },
    {
      index: '10',
      label: 'SECTION_10',
      title: '10. Contato',
      content: (
        <p className="font-inter leading-relaxed text-gray-600 dark:text-gray-300">
          Se voce tiver duvidas sobre estes Termos de Uso, entre em contato
          conosco em{' '}
          <a
            href="mailto:suporte@ecotechts.com.br"
            className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            suporte@ecotechts.com.br
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
        <div>page.termos</div>
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
                TERMOS DE USO
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary dark:bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Termos de Uso
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
