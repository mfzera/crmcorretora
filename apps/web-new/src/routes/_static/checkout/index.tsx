import { createFileRoute } from '@tanstack/react-router';

import { useState, useEffect, Suspense } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Building2,
  Check,
  ArrowLeft,
  ArrowRight,
  FileText,
  Loader2,
  Package,
} from 'lucide-react';
import {
  formatBRL,
  calculateMonthlyBill,
  PLAN_CONFIGS,
  type PlanCycle,
  calculatePlanBill,
  calculatePlanTotal,
  calculateModulesBill,
  calculateTotalBill,
  PRICING_CONFIG,
  MODULE_PRICING_CONFIG,
  MODULO_LABELS,
  type ModuloSlug,
} from '@ecotech/shared/utils';

export const Route = createFileRoute('/_static/checkout/')({
  head: () => ({
    meta: [
      { title: 'Criar Conta - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Comece seu teste gratuito de 7 dias no Ecotech CRM. Configure sua conta e comece a gerenciar sua corretora de seguros agora.',
      },
      { property: 'og:title', content: 'Criar Conta - Ecotech CRM' },
      {
        property: 'og:description',
        content: '7 dias grátis, sem cartão de crédito. Configure sua corretora no Ecotech CRM.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/checkout' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/checkout' }],
  }),
  validateSearch: (search) => ({
    users: (search.users as string) ?? undefined,
  }),
  component: CheckoutPage,
});

type BillingType = 'BOLETO' | 'CREDIT_CARD';

function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 50);
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
        {[...Array(11)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px opacity-10"
            style={{ left: `${((i + 1) / 12) * 100}%` }}
          >
            <div
              className="absolute inset-0 dark:hidden"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2) 6px, transparent 6px, transparent 12px)',
              }}
            />
            <div
              className="absolute inset-0 hidden dark:block"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(255,255,255,0.2), rgba(255,255,255,0.2) 6px, transparent 6px, transparent 12px)',
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function FieldCard({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="font-inter text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

const BILLING_OPTIONS: {
  type: BillingType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    type: 'BOLETO',
    label: 'Boleto bancário',
    description: 'Compensação em até 2 dias úteis',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    type: 'CREDIT_CARD',
    label: 'Cartão de crédito',
    description: 'Visa, Mastercard, Elo, Amex',
    icon: <CreditCard className="w-5 h-5" />,
  },
];

function CheckoutPageContent() {
  const navigate = useNavigate();
  const { users: usersParam } = Route.useSearch();
  const users = parseInt(usersParam ?? '3');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'info' | 'modules' | 'payment'>('info');
  const [selectedBilling, setSelectedBilling] = useState<BillingType>('BOLETO');
  const [selectedPlan, setSelectedPlan] = useState<PlanCycle>('TRIENAL');
  const [selectedModulos, setSelectedModulos] = useState<Set<ModuloSlug>>(new Set(['crm']));

  const toggleModulo = (modulo: ModuloSlug) => {
    if (modulo === 'crm') return; // CRM é obrigatório
    setSelectedModulos((prev) => {
      const next = new Set(prev);
      if (next.has(modulo)) next.delete(modulo);
      else next.add(modulo);
      return next;
    });
  };

  const STORAGE_KEY = 'checkout_form';

  const [formData, setFormData] = useState({
    razaoSocial: '',
    cnpj: '',
    email: '',
    telefone: '',
    subdominio: '',
    nomeResponsavel: '',
    emailResponsavel: '',
    telefoneResponsavel: '',
    senha: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setFormData((prev) => ({ ...prev, ...JSON.parse(saved), senha: '' }));
      }
    } catch {}
  }, []);

  const [cardData, setCardData] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
  });

  const modulosList = Array.from(selectedModulos);
  const addonsMonthly = calculateModulesBill(users, selectedPlan, modulosList);
  const monthlyTotal = calculateTotalBill(users, selectedPlan, modulosList);
  const periodTotal = parseFloat((monthlyTotal * PLAN_CONFIGS[selectedPlan].billingMonths).toFixed(2));
  const additionalSeats = Math.max(0, users - PRICING_CONFIG.INCLUDED_SEATS);
  const planCfg = PLAN_CONFIGS[selectedPlan];

  const [subdominioManual, setSubdominioManual] = useState(false);
  const [subdominioStatus, setSubdominioStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  useEffect(() => {
    const slug = formData.subdominio;
    if (!slug || slug.length < 3) { setSubdominioStatus('idle'); return; }
    setSubdominioStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const res = await fetch(`${apiBase}/asaas/check-subdominio?subdominio=${slug}`, {
          headers: { 'ngrok-skip-browser-warning': '1' },
        });
        const data = await res.json();
        setSubdominioStatus(data.available ? 'available' : 'taken');
      } catch {
        setSubdominioStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.subdominio]);

  const set =
    (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData((prev) => {
        const value = e.target.value;
        const next: typeof prev = { ...prev, [key]: value };
        if (key === 'razaoSocial' && !subdominioManual) {
          next.subdominio = toSlug(value);
        }
        if (key === 'subdominio') {
          next.subdominio = toSlug(value);
          setSubdominioManual(value.length > 0);
        }
        try {
          const { senha: _, ...toSave } = next;
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch {}
        return next;
      });

  const setCard =
    (key: keyof typeof cardData) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setCardData((prev) => ({ ...prev, [key]: e.target.value }));

  const handleCepBlur = async () => {
    if (formData.cep.replace(/\D/g, '').length === 8) {
      try {
        const response = await fetch(
          `/api/cep/${formData.cep.replace(/\D/g, '')}`,
        );
        const data = await response.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf,
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('modules');
  };

  const ERROR_MESSAGES: Record<string, string> = {
    'CNPJ inválido': 'O CNPJ informado não é válido. Verifique e tente novamente.',
    'CNPJ já cadastrado': 'Este CNPJ já possui uma conta cadastrada. Acesse com seu login.',
    'CNPJ ou email já cadastrado': 'Este CNPJ ou email já possui uma conta cadastrada. Acesse com seu login.',
    'Senha deve ter no mínimo 8 caracteres': 'A senha precisa ter pelo menos 8 caracteres.',
    'Nenhum plano disponível': 'Nenhum plano está disponível no momento. Entre em contato com o suporte.',
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const payload: Record<string, unknown> = {
        ...formData,
        users,
        planCycle: selectedPlan,
        billingType: selectedBilling,
        modulosAtivos: modulosList,
      };

      if (selectedBilling === 'CREDIT_CARD') {
        payload.creditCard = {
          ...cardData,
          number: cardData.number.replace(/\D/g, ''),
        };
      }

      const response = await fetch(`${apiBase}/asaas/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const rawError = data.error;
        const raw = typeof rawError === 'string'
          ? rawError
          : rawError?.description ?? rawError?.message ?? 'Erro ao processar cadastro';
        setError(ERROR_MESSAGES[raw] ?? raw);
        return;
      }

      sessionStorage.removeItem(STORAGE_KEY);
      if (data.data?.paymentInfo) {
        try {
          sessionStorage.setItem('checkout_payment_info', JSON.stringify(data.data.paymentInfo));
        } catch {}
      }
      navigate({ to: `/checkout/sucesso?metodo=${selectedBilling}` });
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'font-inter bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/15 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus-visible:ring-primary/40 focus-visible:border-primary/50 rounded-md';

  return (
    <div className="relative bg-white dark:bg-black min-h-screen py-16 overflow-hidden">
      <GridBackground />

      <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1 z-10">
        <div>section.checkout</div>
        <div>multi-step.form</div>
      </div>
      <div className="absolute top-4 right-4 text-[9px] font-mono text-gray-400 dark:text-white/25 text-right leading-tight z-10">
        <div>step: {step}</div>
        <div>users: {users}</div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
        <div className="absolute -top-4 left-6 sm:left-8 lg:left-12 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">
          CHECKOUT_01
        </div>

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-10"
        >
          {step === 'info' ? (
            <Link
              to="/precos"
              className="inline-flex items-center gap-2 font-inter text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para preços
            </Link>
          ) : step === 'modules' ? (
            <button
              onClick={() => setStep('info')}
              className="inline-flex items-center gap-2 font-inter text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para informações
            </button>
          ) : (
            <button
              onClick={() => setStep('modules')}
              className="inline-flex items-center gap-2 font-inter text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para módulos
            </button>
          )}
        </motion.div>

        {/* Step indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-12"
        >
          <div
            className={`flex items-center gap-2 font-inter text-sm font-medium ${step === 'info' ? 'text-primary' : 'text-gray-400 dark:text-white/40'}`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${step === 'info' ? 'border-primary text-primary' : 'border-gray-300 dark:border-white/20'}`}
            >
              {step !== 'info' ? <Check className="w-3 h-3 text-primary" /> : '1'}
            </div>
            Informações
          </div>
          <div className="flex-1 h-px bg-gray-200 dark:bg-white/15 max-w-16">
            <div
              className="h-px bg-primary/50 transition-all duration-500"
              style={{ width: step !== 'info' ? '100%' : '0%' }}
            />
          </div>
          <div
            className={`flex items-center gap-2 font-inter text-sm font-medium ${step === 'modules' ? 'text-primary' : 'text-gray-400 dark:text-white/40'}`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${step === 'modules' ? 'border-primary text-primary' : step === 'payment' ? 'border-primary' : 'border-gray-300 dark:border-white/20'}`}
            >
              {step === 'payment' ? <Check className="w-3 h-3 text-primary" /> : '2'}
            </div>
            Módulos
          </div>
          <div className="flex-1 h-px bg-gray-200 dark:bg-white/15 max-w-16">
            <div
              className="h-px bg-primary/50 transition-all duration-500"
              style={{ width: step === 'payment' ? '100%' : '0%' }}
            />
          </div>
          <div
            className={`flex items-center gap-2 font-inter text-sm font-medium ${step === 'payment' ? 'text-primary' : 'text-gray-400 dark:text-white/40'}`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${step === 'payment' ? 'border-primary text-primary' : 'border-gray-300 dark:border-white/20'}`}
            >
              3
            </div>
            Pagamento
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── FORM ────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative p-8 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]"
            >
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40 rounded-tl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-gray-300 dark:border-white/20 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-gray-300 dark:border-white/20 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-gray-300 dark:border-white/20 rounded-br" />
              <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
                {step === 'info' ? 'FORM_INFO' : step === 'modules' ? 'FORM_MODULES' : 'FORM_PAYMENT'}
              </div>

              {/* Form header */}
              <div className="flex items-center gap-3 mb-8">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${step === 'info' ? 'bg-purple-500/20' : step === 'modules' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}
                >
                  {step === 'info' ? (
                    <Building2 className="w-5 h-5 text-purple-400" />
                  ) : step === 'modules' ? (
                    <Package className="w-5 h-5 text-green-400" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <div>
                  <h2 className="font-inter text-xl font-normal text-black dark:text-white">
                    {step === 'info' ? 'Informações da Empresa' : step === 'modules' ? 'Módulos' : 'Pagamento'}
                  </h2>
                  <p className="font-inter text-xs text-gray-500 dark:text-gray-400">
                    {step === 'info'
                      ? 'Preencha os dados da sua corretora'
                      : step === 'modules'
                      ? 'Escolha os módulos que deseja ativar'
                      : 'Escolha sua forma de pagamento'}
                  </p>
                </div>
              </div>

              {step === 'modules' && (
                <div className="space-y-4">
                  {(['crm', 'sinistros', 'gamificacao'] as ModuloSlug[]).map((modulo) => {
                    const cfg = MODULE_PRICING_CONFIG[modulo][selectedPlan];
                    const label = MODULO_LABELS[modulo];
                    const isSelected = selectedModulos.has(modulo);
                    const isRequired = modulo === 'crm';
                    return (
                      <button
                        key={modulo}
                        type="button"
                        onClick={() => toggleModulo(modulo)}
                        disabled={isRequired}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                        } ${isRequired ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded flex items-center justify-center border ${
                                isSelected
                                  ? 'bg-primary border-primary'
                                  : 'border-gray-300 dark:border-white/20'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-inter text-sm font-medium text-black dark:text-white">
                                  {label.nome}
                                </span>
                                {isRequired && (
                                  <span className="font-inter text-[10px] font-mono text-primary uppercase tracking-widest">
                                    incluso
                                  </span>
                                )}
                              </div>
                              <p className="font-inter text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {label.descricao}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <span className="font-inter text-sm font-medium text-black dark:text-white">
                              {isRequired ? formatBRL(planCfg.basePrice) : formatBRL(cfg.base?.gross ?? cfg.seat.gross)}
                            </span>
                            <span className="font-inter text-xs text-gray-400">/mês</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => setStep('payment')}
                      className="font-inter text-base px-8 h-12 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black rounded-md transition-all duration-200 hover:scale-105"
                    >
                      Continuar para Pagamento
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 'info' ? (
                <form onSubmit={handleInfoSubmit} className="space-y-8">
                  {/* Dados da Corretora */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-inter text-[10px] font-mono text-primary uppercase tracking-widest">
                        Dados da Corretora
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                    </div>

                    <FieldCard label="Razão Social *" id="razaoSocial">
                      <Input
                        id="razaoSocial"
                        required
                        value={formData.razaoSocial}
                        onChange={set('razaoSocial')}
                        placeholder="Nome da empresa"
                        className={inputClass}
                      />
                    </FieldCard>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FieldCard label="CNPJ *" id="cnpj">
                        <Input
                          id="cnpj"
                          required
                          value={formData.cnpj}
                          onChange={(e) => setFormData((prev) => ({ ...prev, cnpj: maskCNPJ(e.target.value) }))}
                          placeholder="00.000.000/0000-00"
                          maxLength={18}
                          className={inputClass}
                        />
                      </FieldCard>
                      <FieldCard label="Email da Empresa *" id="email">
                        <Input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={set('email')}
                          placeholder="contato@empresa.com"
                          className={inputClass}
                        />
                      </FieldCard>
                    </div>

                    <FieldCard label="Telefone" id="telefone">
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, telefone: maskPhone(e.target.value) }))}
                        placeholder="(00) 00000-0000"
                        className={inputClass}
                      />
                    </FieldCard>

                    <FieldCard label="Subdomínio *" id="subdominio">
                      <div className="relative">
                        <Input
                          id="subdominio"
                          required
                          value={formData.subdominio}
                          onChange={set('subdominio')}
                          placeholder="minha-corretora"
                          className={inputClass}
                        />
                        {subdominioStatus !== 'idle' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-inter text-xs font-mono">
                            {subdominioStatus === 'checking' && <span className="text-gray-400">...</span>}
                            {subdominioStatus === 'available' && <span className="text-primary">disponível</span>}
                            {subdominioStatus === 'taken' && <span className="text-red-400">indisponível</span>}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 font-inter text-xs text-gray-500 dark:text-gray-400">
                        Portal do segurado:{' '}
                        <span className="font-mono text-primary">
                          /portal/{formData.subdominio || 'minha-corretora'}
                        </span>
                      </p>
                    </FieldCard>
                  </div>

                  {/* Responsável */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-inter text-[10px] font-mono text-primary uppercase tracking-widest">
                        Responsável pela Conta
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                    </div>

                    <FieldCard label="Nome Completo *" id="nomeResponsavel">
                      <Input
                        id="nomeResponsavel"
                        required
                        value={formData.nomeResponsavel}
                        onChange={set('nomeResponsavel')}
                        placeholder="Seu nome completo"
                        className={inputClass}
                      />
                    </FieldCard>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FieldCard label="Email *" id="emailResponsavel">
                        <Input
                          id="emailResponsavel"
                          type="email"
                          required
                          value={formData.emailResponsavel}
                          onChange={set('emailResponsavel')}
                          placeholder="seu@email.com"
                          className={inputClass}
                        />
                      </FieldCard>
                      <FieldCard label="Telefone" id="telefoneResponsavel">
                        <Input
                          id="telefoneResponsavel"
                          value={formData.telefoneResponsavel}
                          onChange={(e) => setFormData((prev) => ({ ...prev, telefoneResponsavel: maskPhone(e.target.value) }))}
                          placeholder="(00) 00000-0000"
                          className={inputClass}
                        />
                      </FieldCard>
                    </div>

                    <FieldCard label="Senha de acesso *" id="senha">
                      <Input
                        id="senha"
                        type="password"
                        required
                        minLength={8}
                        value={formData.senha}
                        onChange={set('senha')}
                        placeholder="Mínimo 8 caracteres"
                        className={inputClass}
                      />
                    </FieldCard>
                  </div>

                  {/* Endereço */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-inter text-[10px] font-mono text-primary uppercase tracking-widest">
                        Endereço
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <FieldCard label="CEP *" id="cep">
                        <Input
                          id="cep"
                          required
                          value={formData.cep}
                          onChange={(e) => setFormData((prev) => ({ ...prev, cep: maskCEP(e.target.value) }))}
                          onBlur={handleCepBlur}
                          placeholder="00000-000"
                          maxLength={9}
                          className={inputClass}
                        />
                      </FieldCard>
                      <div className="md:col-span-2">
                        <FieldCard label="Logradouro *" id="logradouro">
                          <Input
                            id="logradouro"
                            required
                            value={formData.logradouro}
                            onChange={set('logradouro')}
                            placeholder="Rua, Avenida, etc"
                            className={inputClass}
                          />
                        </FieldCard>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <FieldCard label="Número *" id="numero">
                        <Input
                          id="numero"
                          required
                          value={formData.numero}
                          onChange={set('numero')}
                          placeholder="123"
                          className={inputClass}
                        />
                      </FieldCard>
                      <div className="md:col-span-2">
                        <FieldCard label="Complemento" id="complemento">
                          <Input
                            id="complemento"
                            value={formData.complemento}
                            onChange={set('complemento')}
                            placeholder="Sala, Andar, etc"
                            className={inputClass}
                          />
                        </FieldCard>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <FieldCard label="Bairro *" id="bairro">
                        <Input
                          id="bairro"
                          required
                          value={formData.bairro}
                          onChange={set('bairro')}
                          placeholder="Bairro"
                          className={inputClass}
                        />
                      </FieldCard>
                      <FieldCard label="Cidade *" id="cidade">
                        <Input
                          id="cidade"
                          required
                          value={formData.cidade}
                          onChange={set('cidade')}
                          placeholder="Cidade"
                          className={inputClass}
                        />
                      </FieldCard>
                      <FieldCard label="UF *" id="uf">
                        <Input
                          id="uf"
                          required
                          value={formData.uf}
                          onChange={set('uf')}
                          placeholder="SP"
                          maxLength={2}
                          className={inputClass}
                        />
                      </FieldCard>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={subdominioStatus === 'taken' || subdominioStatus === 'checking'}
                      className="font-inter text-base px-8 h-12 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black rounded-md transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      Continuar para Pagamento
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handlePaymentSubmit} className="space-y-8">
                  {/* Seleção de plano */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-inter text-[10px] font-mono text-primary uppercase tracking-widest">
                        Período de Contrato
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(['MENSAL', 'SEMESTRAL', 'ANUAL', 'TRIENAL'] as PlanCycle[]).map((cycle) => {
                        const cfg = PLAN_CONFIGS[cycle];
                        return (
                          <button
                            key={cycle}
                            type="button"
                            onClick={() => setSelectedPlan(cycle)}
                            className={`relative flex flex-col items-center gap-1 p-4 rounded-lg border text-center transition-all duration-150 ${
                              selectedPlan === cycle
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/25'
                            }`}
                          >
                            {cfg.badge && (
                              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-semibold text-black dark:text-black bg-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                                {cfg.badge}
                              </span>
                            )}
                            <span className="font-inter text-sm font-semibold text-black dark:text-white">
                              {cfg.label}
                            </span>
                            <span className="font-inter text-xs text-gray-500 dark:text-gray-400">
                              {cfg.shortLabel}
                            </span>
                            <span className="font-inter text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                              {cfg.billingLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Seleção de forma de pagamento */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-inter text-[10px] font-mono text-primary uppercase tracking-widest">
                        Forma de Pagamento
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                    </div>

                    {BILLING_OPTIONS.map((option) => (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => setSelectedBilling(option.type)}
                        className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all duration-150 ${
                          selectedBilling === option.type
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/25'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                            selectedBilling === option.type
                              ? 'bg-primary/20 text-primary'
                              : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {option.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-inter text-sm font-medium text-black dark:text-white">
                            {option.label}
                          </p>
                          <p className="font-inter text-xs text-gray-500 dark:text-gray-400">
                            {option.description}
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                            selectedBilling === option.type
                              ? 'border-primary bg-primary'
                              : 'border-gray-300 dark:border-white/30'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Campos de cartão (apenas quando selecionado) */}
                  {selectedBilling === 'CREDIT_CARD' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-inter text-[10px] font-mono text-primary uppercase tracking-widest">
                          Dados do Cartão
                        </span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                      </div>

                      <FieldCard label="Nome no Cartão *" id="holderName">
                        <Input
                          id="holderName"
                          required={selectedBilling === 'CREDIT_CARD'}
                          value={cardData.holderName}
                          onChange={setCard('holderName')}
                          placeholder="Como está no cartão"
                          className={inputClass}
                        />
                      </FieldCard>

                      <FieldCard label="Número do Cartão *" id="cardNumber">
                        <Input
                          id="cardNumber"
                          required={selectedBilling === 'CREDIT_CARD'}
                          value={cardData.number}
                          onChange={(e) =>
                            setCardData((prev) => ({ ...prev, number: maskCardNumber(e.target.value) }))
                          }
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className={inputClass}
                        />
                      </FieldCard>

                      <div className="grid grid-cols-3 gap-4">
                        <FieldCard label="Mês *" id="expiryMonth">
                          <Input
                            id="expiryMonth"
                            required={selectedBilling === 'CREDIT_CARD'}
                            value={cardData.expiryMonth}
                            onChange={setCard('expiryMonth')}
                            placeholder="MM"
                            maxLength={2}
                            className={inputClass}
                          />
                        </FieldCard>
                        <FieldCard label="Ano *" id="expiryYear">
                          <Input
                            id="expiryYear"
                            required={selectedBilling === 'CREDIT_CARD'}
                            value={cardData.expiryYear}
                            onChange={setCard('expiryYear')}
                            placeholder="AAAA"
                            maxLength={4}
                            className={inputClass}
                          />
                        </FieldCard>
                        <FieldCard label="CVV *" id="ccv">
                          <Input
                            id="ccv"
                            required={selectedBilling === 'CREDIT_CARD'}
                            value={cardData.ccv}
                            onChange={setCard('ccv')}
                            placeholder="000"
                            maxLength={4}
                            className={inputClass}
                          />
                        </FieldCard>
                      </div>
                    </div>
                  )}

                  {/* Info para Boleto */}
                  {selectedBilling === 'BOLETO' && (
                    <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
                      <p className="font-inter text-sm text-gray-600 dark:text-gray-400">
                        Após confirmar, o boleto será gerado e enviado para seu email. Seu acesso será liberado em até 2 dias úteis após o pagamento.
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
                      <span className="font-inter text-xs font-mono text-red-500 dark:text-red-400 shrink-0 mt-0.5">ERR</span>
                      <p className="font-inter text-sm text-red-700 dark:text-red-300 leading-relaxed">
                        {error}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep('info')}
                      disabled={loading}
                      className="flex items-center gap-1 font-inter text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors disabled:opacity-40"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={loading}
                      className="font-inter text-base px-8 h-12 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black rounded-md transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          Confirmar Assinatura
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>

          {/* ── SUMMARY SIDEBAR ─────────────────────────────────── */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="relative p-6 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] sticky top-24"
            >
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40 rounded-tl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-gray-300 dark:border-white/20 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-gray-300 dark:border-white/20 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-gray-300 dark:border-white/20 rounded-br" />
              <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
                ORDER_SUMMARY
              </div>

              <h3 className="font-inter text-sm font-semibold text-black dark:text-white uppercase tracking-widest mb-6">
                Resumo do Pedido
              </h3>

              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="font-inter text-[10px] font-mono text-gray-400 dark:text-white/30 uppercase tracking-widest">
                    Plano
                  </p>
                  <p className="font-inter text-sm text-black dark:text-white">
                    Profissional · {planCfg.label}
                  </p>
                  <p className="font-inter text-[11px] text-gray-400 dark:text-white/30">
                    {planCfg.billingLabel}
                  </p>
                </div>

                <div className="h-px bg-gray-200 dark:bg-white/10" />

                <div className="space-y-1">
                  <p className="font-inter text-[10px] font-mono text-gray-400 dark:text-white/30 uppercase tracking-widest">
                    Usuários
                  </p>
                  <p className="font-inter text-sm text-black dark:text-white">
                    {users} usuário{users > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="h-px bg-gray-200 dark:bg-white/10" />

                <div className="space-y-2">
                  <div className="flex justify-between font-inter text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      CRM base (3 usuários)
                    </span>
                    <span className="text-black dark:text-white">
                      {formatBRL(planCfg.basePrice)}/mês
                    </span>
                  </div>
                  {additionalSeats > 0 && (
                    <div className="flex justify-between font-inter text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {additionalSeats} seat{additionalSeats > 1 ? 's' : ''} CRM × {formatBRL(MODULE_PRICING_CONFIG.crm[selectedPlan].seat.gross)}
                      </span>
                      <span className="text-black dark:text-white">
                        {formatBRL(additionalSeats * MODULE_PRICING_CONFIG.crm[selectedPlan].seat.gross)}/mês
                      </span>
                    </div>
                  )}
                  {(['sinistros', 'gamificacao'] as ModuloSlug[]).filter((m) => selectedModulos.has(m)).flatMap((m) => {
                    const mCfg = MODULE_PRICING_CONFIG[m][selectedPlan];
                    const rows = [
                      <div key={`${m}-base`} className="flex justify-between font-inter text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {MODULO_LABELS[m].nome} base (3 usuários)
                        </span>
                        <span className="text-black dark:text-white">
                          {formatBRL(mCfg.base!.gross)}/mês
                        </span>
                      </div>,
                    ];
                    if (additionalSeats > 0) {
                      rows.push(
                        <div key={`${m}-seat`} className="flex justify-between font-inter text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            {MODULO_LABELS[m].nome} × {additionalSeats} adicional{additionalSeats > 1 ? 's' : ''}
                          </span>
                          <span className="text-black dark:text-white">
                            {formatBRL(mCfg.seat.gross * additionalSeats)}/mês
                          </span>
                        </div>,
                      );
                    }
                    return rows;
                  })}
                </div>

                <div className="h-px bg-gray-200 dark:bg-white/10" />

                <div className="space-y-1">
                  {planCfg.billingMonths > 1 && (
                    <div className="flex justify-between items-baseline">
                      <span className="font-inter text-sm text-gray-500 dark:text-gray-400">
                        Equivale a
                      </span>
                      <span className="font-inter text-lg font-normal text-black dark:text-white">
                        {formatBRL(monthlyTotal)}<span className="text-xs text-gray-400">/mês</span>
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline">
                    <span className="font-inter text-sm text-black dark:text-white font-medium">
                      {planCfg.billingMonths === 1 ? 'Total mensal' : planCfg.billingMonths === 6 ? 'Total semestral' : planCfg.billingMonths === 12 ? 'Total anual' : 'Total trienal'}
                    </span>
                    <span className="font-inter text-2xl font-normal text-primary">
                      {formatBRL(periodTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guarantees */}
              <div className="mt-6 p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] space-y-2.5">
                <div className="absolute -top-2 left-4 text-[7px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">
                  guarantees
                </div>
                {[
                  '7 dias de teste grátis',
                  'Sem compromisso',
                  'Cancele quando quiser',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="font-inter text-sm text-gray-600 dark:text-gray-400">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <p className="font-inter text-[11px] text-gray-400 dark:text-white/30 mt-4 leading-relaxed">
                Ao continuar, você concorda com nossos{' '}
                <Link
                  to="/termos"
                  className="text-gray-600 dark:text-white/50 hover:text-black dark:hover:text-white underline transition-colors"
                >
                  Termos de Serviço
                </Link>{' '}
                e{' '}
                <Link
                  to="/privacidade"
                  className="text-gray-600 dark:text-white/50 hover:text-black dark:hover:text-white underline transition-colors"
                >
                  Política de Privacidade
                </Link>
                .
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="relative bg-white dark:bg-black min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
