import { createFileRoute } from '@tanstack/react-router';
import { useNavigate } from '@tanstack/react-router';
import { Shield, Eye, Trash2, Download, Lock, ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';

export const Route = createFileRoute('/_static/lgpd')({
  head: () => ({
    meta: [
      { title: 'LGPD - Lei Geral de Proteção de Dados - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Saiba como a Ecotech CRM cumpre a Lei Geral de Proteção de Dados (Lei n. 13.709/2018). Seus direitos e como exercê-los.',
      },
      { property: 'og:title', content: 'LGPD - Lei Geral de Proteção de Dados - Ecotech CRM' },
      { property: 'og:url', content: 'https://ecotechts.com.br/lgpd' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/lgpd' }],
  }),
  component: LGPDPage,
});


function LGPDPage() {
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
        <div>page.lgpd</div>
        <div>legal.compliance</div>
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
              <div>LGPD_PAGE</div>
            </div>

            <div className="relative inline-block mb-6">
              <span className="font-inter text-primary dark:text-primary text-sm font-semibold uppercase tracking-widest">
                LGPD
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary dark:bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Lei Geral de Proteção de Dados
            </h1>
            <p className="font-inter text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Conheça seus direitos e como exercê-los
            </p>
            <p
              className="mt-4 text-xs font-mono text-gray-400 dark:text-white/25"
              aria-hidden="true"
            >
              Última atualização: 15 de Janeiro de 2025
            </p>
          </div>

          {/* Prose sections */}
          <div className="space-y-8 mb-16">
            {/* Nosso Compromisso */}
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
                Nosso Compromisso
              </h2>
              <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed">
                A ecotech está comprometida em cumprir a Lei Geral de Proteção
                de Dados (Lei n. 13.709/2018). Esta página explica como
                tratamos seus dados pessoais e quais são seus direitos como
                titular de dados.
              </p>
            </div>

            {/* Base Legal */}
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
                Base Legal para Tratamento
              </h2>
              <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                Tratamos seus dados pessoais com base nas seguintes hipóteses
                legais previstas na LGPD:
              </p>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                {[
                  {
                    label: 'Execução de contrato',
                    desc: 'Para fornecer nossos serviços conforme acordado',
                  },
                  {
                    label: 'Consentimento',
                    desc: 'Quando você autoriza expressamente o tratamento',
                  },
                  {
                    label: 'Legítimo interesse',
                    desc: 'Para melhorar nossos serviços e sua experiência',
                  },
                  {
                    label: 'Obrigação legal',
                    desc: 'Para cumprir exigências legais e regulatórias',
                  },
                ].map((item) => (
                  <li key={item.label} className="flex gap-3">
                    <span className="font-mono text-[10px] text-primary mt-1 shrink-0">▸</span>
                    <span>
                      <strong className="text-black dark:text-white font-medium">
                        {item.label}:
                      </strong>{' '}
                      {item.desc}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dados Tratados */}
            <div className="relative p-8 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]">
              <div
                className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                aria-hidden="true"
              >
                SECTION_03
              </div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20" />

              <h2 className="font-inter text-xl font-semibold text-black dark:text-white mb-4">
                Dados Tratados
              </h2>
              <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed">
                Coletamos e tratamos dados necessários para a prestação de
                nossos serviços, conforme detalhado em nossa{' '}
                <a
                  href="/privacidade"
                  className="text-primary underline underline-offset-2 hover:opacity-80"
                >
                  Política de Privacidade
                </a>
                .
              </p>
            </div>
          </div>

          {/* Rights Cards */}
          <div className="mb-16 relative">
            <div
              className="absolute -top-8 left-0 text-[8px] font-mono text-gray-400 dark:text-white/20"
              aria-hidden="true"
            >
              grid.sm:grid-cols-2.gap-4
            </div>
            <h2 className="font-inter text-2xl font-semibold text-black dark:text-white mb-6">
              Seus Direitos
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: Eye,
                  title: 'Acesso',
                  desc: 'Solicitar acesso aos seus dados pessoais que tratamos.',
                  color: 'blue',
                  index: '01',
                },
                {
                  icon: Shield,
                  title: 'Correção',
                  desc: 'Solicitar a correção de dados incompletos ou incorretos.',
                  color: 'emerald',
                  index: '02',
                },
                {
                  icon: Trash2,
                  title: 'Eliminação',
                  desc: 'Solicitar a exclusão de seus dados pessoais.',
                  color: 'red',
                  index: '03',
                },
                {
                  icon: Download,
                  title: 'Portabilidade',
                  desc: 'Receber seus dados em formato estruturado e portável.',
                  color: 'purple',
                  index: '04',
                },
                {
                  icon: Lock,
                  title: 'Revogação',
                  desc: 'Revogar consentimentos concedidos anteriormente.',
                  color: 'orange',
                  index: '05',
                },
              ].map((right) => {
                const Icon = right.icon;
                return (
                  <div
                    key={right.title}
                    className="relative p-6 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
                  >
                    <div
                      className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                      aria-hidden="true"
                    >
                      RIGHT_{right.index}
                    </div>
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30 rounded-tl" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gray-300 dark:border-white/20 rounded-tr" />

                    <div
                      className={`w-10 h-10 rounded-lg bg-${right.color}-100 dark:bg-${right.color}-900/30 flex items-center justify-center mb-4`}
                    >
                      <Icon
                        className={`w-5 h-5 text-${right.color}-600 dark:text-${right.color}-400`}
                      />
                    </div>
                    <h3 className="font-inter font-semibold text-black dark:text-white mb-2">
                      {right.title}
                    </h3>
                    <p className="font-inter text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {right.desc}
                    </p>

                    <div
                      className="absolute bottom-2 right-2 text-[10px] font-mono text-gray-400 dark:text-white/20"
                      aria-hidden="true"
                    >
                      {right.index}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DPO Contact */}
          <div className="relative rounded-2xl p-10 border border-gray-200 dark:border-white/15 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/40" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gray-300 dark:border-white/20" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gray-300 dark:border-white/20" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gray-300 dark:border-white/20" />

            <div
              className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
              aria-hidden="true"
            >
              DPO_CONTACT
            </div>

            <h2 className="font-inter text-2xl font-semibold text-black dark:text-white mb-4">
              Encarregado de Dados (DPO)
            </h2>
            <p className="font-inter text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Para exercer seus direitos ou esclarecer dúvidas sobre o
              tratamento de seus dados pessoais, entre em contato com nosso
              Encarregado de Proteção de Dados:
            </p>
            <p className="font-inter text-black dark:text-white mb-6">
              <span className="font-medium">Email:</span>{' '}
              <a
                href="mailto:dpo@ecotechts.com.br"
                className="font-mono text-sm text-primary hover:underline"
              >
                dpo@ecotechts.com.br
              </a>
            </p>
            <Button asChild>
              <Link to="/contato">Fazer uma solicitação</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
