import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { useState } from 'react';
import { Mail, MessageSquare, Send, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Textarea } from '@/core/ui/textarea';
import { Label } from '@/core/ui/label';

export const Route = createFileRoute('/_static/contato')({
  head: () => ({
    meta: [
      { title: 'Contato - Fale com a Ecotech CRM' },
      {
        name: 'description',
        content:
          'Entre em contato com o time da Ecotech CRM. Suporte por email e WhatsApp, atendimento de segunda a sexta das 9h às 18h.',
      },
      { property: 'og:title', content: 'Contato - Fale com a Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Entre em contato com nosso time de suporte e vendas. Estamos prontos para ajudar sua corretora.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/contato' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/contato' }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: 'Contato - Ecotech CRM',
          url: 'https://ecotechts.com.br/contato',
          description: 'Entre em contato com o time da Ecotech CRM.',
          mainEntity: {
            '@type': 'Organization',
            name: 'Ecotech CRM',
            email: 'suporte@ecotechts.com.br',
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer service',
              availableLanguage: 'Portuguese',
              hoursAvailable: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                opens: '09:00',
                closes: '18:00',
              },
            },
          },
        }),
      },
    ],
  }),
  component: ContatoPage,
});


function ContatoPage() {
  const [enviado, setEnviado] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
  };

  return (
    <div className="bg-white dark:bg-black min-h-screen relative overflow-hidden">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-black focus:rounded-lg focus:font-medium"
      >
        Pular para o conteúdo principal
      </a>

      {/* Grid de pontos */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-30"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Grid de linhas */}
      <div
        className="absolute inset-0 opacity-15 dark:opacity-15"
        aria-hidden="true"
      >
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

      {/* Linhas verticais guia */}
      <div
        className="absolute inset-0 max-w-4xl mx-auto px-6 sm:px-8"
        aria-hidden="true"
      >
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

      {/* Anotações técnicas */}
      <div
        className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1 z-10"
        aria-hidden="true"
      >
        <div>page.contato</div>
        <div>contact.form</div>
      </div>

      <main id="main-content" className="relative py-24 z-10">
        <div className="mx-auto max-w-4xl px-6 sm:px-8">
          {/* Botão voltar */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate({ to: '/' })}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>

          {/* Header */}
          <header className="text-center mb-16 relative">
            <div
              className="absolute -top-12 left-1/2 -translate-x-1/2 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider"
              aria-hidden="true"
            >
              CONTATO_PAGE
            </div>

            <div
              className="relative w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/20 dark:bg-primary/20 flex items-center justify-center border border-primary/30 dark:border-primary/30"
              aria-hidden="true"
            >
              <Mail className="w-8 h-8 text-primary dark:text-primary" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
            </div>

            <div className="relative inline-block mb-6" aria-hidden="true">
              <span className="font-inter text-primary dark:text-primary text-sm font-semibold uppercase tracking-widest">
                CONTATO
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary dark:bg-primary opacity-50" />
            </div>

            <h1 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-6">
              Entre em Contato
            </h1>
            <p className="font-inter text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Tem alguma dúvida, sugestão ou quer saber mais sobre o Ecosistema
              Seguros? Fale conosco!
            </p>
          </header>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Informações de contato */}
            <div className="space-y-6">
              <div
                className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1 hidden"
                aria-hidden="true"
              >
                CONTACT_INFO
              </div>

              <h2 className="font-inter text-xl font-semibold text-black dark:text-white mb-6">
                Outras formas de contato
              </h2>

              {/* Email */}
              <div className="group relative flex items-start gap-4 p-5 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/25 transition-all">
                <div
                  className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                  aria-hidden="true"
                >
                  CONTACT_01
                </div>
                <div
                  className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30 rounded-tl opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                />
                <div
                  className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/20 dark:group-hover:bg-primary/20 transition-colors border border-gray-200 dark:border-white/10 group-hover:border-primary/30 dark:group-hover:border-primary/30 flex-shrink-0"
                  aria-hidden="true"
                >
                  <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="font-inter font-semibold text-black dark:text-white group-hover:text-primary dark:group-hover:text-primary transition-colors">
                    Email
                  </h3>
                  <p className="font-inter text-gray-600 dark:text-gray-400 text-sm">
                    suporte@ecotechts.com.br
                  </p>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="group relative flex items-start gap-4 p-5 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/25 transition-all">
                <div
                  className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                  aria-hidden="true"
                >
                  CONTACT_02
                </div>
                <div
                  className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30 rounded-tl opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                />
                <div
                  className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/20 dark:group-hover:bg-primary/20 transition-colors border border-gray-200 dark:border-white/10 group-hover:border-primary/30 dark:group-hover:border-primary/30 flex-shrink-0"
                  aria-hidden="true"
                >
                  <MessageSquare className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="font-inter font-semibold text-black dark:text-white group-hover:text-primary dark:group-hover:text-primary transition-colors">
                    WhatsApp
                  </h3>
                  <p className="font-inter text-gray-600 dark:text-gray-400 text-sm">
                    (11) 99999-9999
                  </p>
                </div>
              </div>

              {/* Horário */}
              <div className="relative p-6 rounded-xl border border-primary/30 dark:border-primary/30 bg-gradient-to-br from-primary/10 via-gray-50 to-gray-50 dark:from-primary/10 dark:via-black dark:to-black">
                <div
                  className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                  aria-hidden="true"
                >
                  HORARIO
                </div>
                <div
                  className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary/60"
                  aria-hidden="true"
                />
                <div
                  className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
                  aria-hidden="true"
                />
                <div
                  className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-gray-300 dark:border-white/20"
                  aria-hidden="true"
                />
                <div
                  className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-gray-300 dark:border-white/20"
                  aria-hidden="true"
                />
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30"
                    aria-hidden="true"
                  >
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-inter font-semibold text-black dark:text-white">
                    Horário de Atendimento
                  </h3>
                </div>
                <p className="font-inter text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Segunda a Sexta: 9h às 18h
                  <br />
                  Sábado: 9h às 12h
                </p>
              </div>
            </div>

            {/* Formulário */}
            <div className="relative rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] p-8">
              <div
                className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1"
                aria-hidden="true"
              >
                FORM_CONTATO
              </div>
              <div
                className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60"
                aria-hidden="true"
              />
              <div
                className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 dark:border-white/20"
                aria-hidden="true"
              />
              <div
                className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gray-300 dark:border-white/20"
                aria-hidden="true"
              />
              <div
                className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gray-300 dark:border-white/20"
                aria-hidden="true"
              />

              {enviado ? (
                <div className="text-center py-8">
                  <div
                    className="relative w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30"
                    aria-hidden="true"
                  >
                    <Send className="w-8 h-8 text-primary" />
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
                  </div>
                  <h3 className="font-inter text-xl font-semibold text-black dark:text-white mb-2">
                    Mensagem enviada!
                  </h3>
                  <p className="font-inter text-gray-600 dark:text-gray-400 text-sm">
                    Obrigado pelo contato. Responderemos em breve.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label
                      htmlFor="nome"
                      className="font-inter text-sm font-medium text-black dark:text-white"
                    >
                      Nome
                    </Label>
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Seu nome"
                      required
                      className="mt-1.5 bg-white dark:bg-black border-gray-200 dark:border-white/15 focus:border-primary dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="email"
                      className="font-inter text-sm font-medium text-black dark:text-white"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      required
                      className="mt-1.5 bg-white dark:bg-black border-gray-200 dark:border-white/15 focus:border-primary dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="assunto"
                      className="font-inter text-sm font-medium text-black dark:text-white"
                    >
                      Assunto
                    </Label>
                    <Input
                      id="assunto"
                      type="text"
                      placeholder="Sobre o que gostaria de falar?"
                      required
                      className="mt-1.5 bg-white dark:bg-black border-gray-200 dark:border-white/15 focus:border-primary dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="mensagem"
                      className="font-inter text-sm font-medium text-black dark:text-white"
                    >
                      Mensagem
                    </Label>
                    <Textarea
                      id="mensagem"
                      placeholder="Sua mensagem..."
                      rows={4}
                      required
                      className="mt-1.5 bg-white dark:bg-black border-gray-200 dark:border-white/15 focus:border-primary dark:focus:border-primary resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full font-inter bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black rounded-md transition-all duration-200 hover:scale-[1.02]"
                  >
                    Enviar mensagem
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
