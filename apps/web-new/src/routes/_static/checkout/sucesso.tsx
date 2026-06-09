import { createFileRoute } from '@tanstack/react-router';

import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Suspense } from 'react';
import { Button } from '@/core/ui/button';
import { CheckCircle, ArrowRight, Mail, QrCode, FileText, Copy, Check, ExternalLink } from 'lucide-react';

export const Route = createFileRoute('/_static/checkout/sucesso')({
  validateSearch: (search) => ({
    metodo: (search.metodo as string) ?? undefined,
  }),
  component: CheckoutSuccessPage,
});


interface PaymentInfo {
  billingType: string;
  bankSlipUrl?: string;
  pixEncodedImage?: string;
  pixPayload?: string;
}

function GridBackground() {
  return (
    <>
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
      <div className="absolute inset-0 opacity-15 dark:opacity-15">
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>
      <div className="absolute top-0 left-0 right-0 h-px opacity-50">
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) 8px, transparent 8px, transparent 16px)',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.5) 8px, transparent 8px, transparent 16px)',
          }}
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px opacity-50">
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) 8px, transparent 8px, transparent 16px)',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.5) 8px, transparent 8px, transparent 16px)',
          }}
        />
      </div>
      <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="absolute left-6 sm:left-8 lg:left-12 top-0 bottom-0 w-px opacity-40">
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
        <div className="absolute right-6 sm:right-8 lg:right-12 top-0 bottom-0 w-px opacity-40">
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
    </>
  );
}

const steps = [
  'Faça login na plataforma e configure sua corretora',
  'Adicione seus usuários e comece a usar todas as funcionalidades',
  'Após 7 dias, a cobrança será automática se você continuar usando',
];

const PAYMENT_INFO_CONFIG: Record<string, { label: string; descricao: string; icon: React.ReactNode }> = {
  PIX: {
    label: 'PIX',
    descricao: 'Escaneie o QR code abaixo para pagar. Seu acesso fica ativo durante o trial de 7 dias.',
    icon: <QrCode className="w-4 h-4 text-green-400" />,
  },
  BOLETO: {
    label: 'Boleto bancário',
    descricao: 'Clique no botão abaixo para abrir o boleto. Seu acesso fica ativo durante o trial de 7 dias.',
    icon: <FileText className="w-4 h-4 text-yellow-400" />,
  },
  CREDIT_CARD: {
    label: 'Cartão de crédito',
    descricao: 'Pagamento processado com sucesso. A cobrança começa após o trial de 7 dias.',
    icon: <CheckCircle className="w-4 h-4 text-blue-400" />,
  },
};

function PixQrCode({ encodedImage, payload }: { encodedImage: string; payload: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-center">
        <div className="p-3 rounded-lg border border-gray-200 dark:border-white/15 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${encodedImage}`}
            alt="QR Code PIX"
            width={180}
            height={180}
            className="block"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/[0.02] font-inter text-sm text-black dark:text-white hover:border-primary/50 hover:bg-primary/5 transition-all duration-150"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-primary" />
            <span className="text-primary">Código copiado!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copiar código PIX
          </>
        )}
      </button>
    </div>
  );
}

function BoletoLink({ url }: { url: string }) {
  return (
    <div className="mt-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 font-inter text-sm text-yellow-800 dark:text-yellow-300 hover:border-yellow-300 dark:hover:border-yellow-500/50 transition-all duration-150"
      >
        <ExternalLink className="w-4 h-4" />
        Abrir boleto bancário
      </a>
    </div>
  );
}

function CheckoutSuccessContent() {
  const { metodo: metodoRaw } = Route.useSearch();
  const metodo = (metodoRaw ?? 'CREDIT_CARD').toUpperCase();
  const paymentConfig = PAYMENT_INFO_CONFIG[metodo] || PAYMENT_INFO_CONFIG.CREDIT_CARD;

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('checkout_payment_info');
      if (stored) {
        setPaymentInfo(JSON.parse(stored));
        sessionStorage.removeItem('checkout_payment_info');
      }
    } catch {}
  }, []);

  return (
    <div className="relative bg-white dark:bg-black min-h-screen flex items-center justify-center py-16 px-4 overflow-hidden">
      <GridBackground />

      <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight z-10">
        <div>section.sucesso</div>
        <div>checkout.complete</div>
      </div>
      <div className="absolute top-4 right-4 text-[9px] font-mono text-gray-400 dark:text-white/25 text-right z-10">
        <div>status: success</div>
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <div className="absolute -top-6 left-0 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">
          SUCCESS_01
        </div>

        {/* Main card */}
        <div className="relative p-8 sm:p-10 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60 rounded-tl" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-gray-300 dark:border-white/20 rounded-tr" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-gray-300 dark:border-white/20 rounded-bl" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-gray-300 dark:border-white/20 rounded-br" />
          <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
            CARD_SUCCESS
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary/40 rounded-tl-full" />
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4 relative">
              <span className="font-inter text-primary text-xs font-semibold uppercase tracking-widest">
                Conta criada
              </span>
              <div className="absolute -bottom-2 left-0 h-px w-full bg-primary opacity-50" />
            </div>
            <h1 className="font-inter text-4xl sm:text-5xl font-normal text-black dark:text-white leading-[1.1] mt-4">
              Bem-vindo ao EcoTech!
            </h1>
            <p className="font-inter text-base text-gray-600 dark:text-gray-300 mt-4 leading-relaxed">
              Sua conta foi criada com sucesso e seu teste gratuito de 7 dias já começou.
            </p>
          </div>

          {/* Payment status */}
          <div className="relative p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                {paymentConfig.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-inter text-xs font-semibold text-black dark:text-white mb-1">
                  Pagamento via {paymentConfig.label}
                </p>
                <p className="font-inter text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {paymentConfig.descricao}
                </p>
              </div>
            </div>

            {metodo === 'PIX' && paymentInfo?.pixEncodedImage && paymentInfo.pixPayload && (
              <PixQrCode
                encodedImage={paymentInfo.pixEncodedImage}
                payload={paymentInfo.pixPayload}
              />
            )}

            {metodo === 'BOLETO' && paymentInfo?.bankSlipUrl && (
              <BoletoLink url={paymentInfo.bankSlipUrl} />
            )}
          </div>

          {/* Next steps */}
          <div className="relative p-6 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] mb-8">
            <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
              NEXT_STEPS
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <span className="font-inter text-sm font-semibold text-black dark:text-white">
                Próximos passos
              </span>
            </div>
            <ol className="space-y-3">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="font-inter text-xs font-mono text-primary font-bold mt-0.5 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-inter text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full font-inter text-base h-12 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black rounded-md transition-all duration-200 hover:scale-105"
              asChild
            >
              <Link to="/login" search={{ redirect: '' }}>
                Acessar minha conta
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="w-full font-inter text-base h-12 text-black dark:text-white border border-gray-300 dark:border-white/20 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200 hover:scale-105"
              asChild
            >
              <Link to="/docs">Ver documentação</Link>
            </Button>
          </div>

          <p className="font-inter text-center text-[11px] text-gray-400 dark:text-white/30 mt-6">
            Precisa de ajuda?{' '}
            <a
              href="mailto:suporte@ecotech.com.br"
              className="text-gray-600 dark:text-white/50 hover:text-black dark:hover:text-white underline transition-colors"
            >
              suporte@ecotech.com.br
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="relative bg-white dark:bg-black min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
