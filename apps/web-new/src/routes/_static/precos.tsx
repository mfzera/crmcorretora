import { createFileRoute } from '@tanstack/react-router';

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';
import { motion } from 'framer-motion';
import {
  Check,
  Users,
  Shield,
  HeadphonesIcon,
  TrendingUp,
  Calculator,
  FileText,
  RefreshCw,
  MessageSquare,
  Kanban,
  ShieldAlert,
  Trophy,
} from 'lucide-react';
import {
  PRICING_CONFIG,
  PLAN_CONFIGS,
  type PlanCycle,
  calculatePlanBill,
  calculateTotalBill,
  calculateModulesBill,
  MODULE_PRICING_CONFIG,
  MODULO_LABELS,
  type ModuloSlug,
  formatBRL,
} from '@ecotech/shared/utils';

export const Route = createFileRoute('/_static/precos')({
  head: () => ({
    meta: [
      { title: 'Preços e Planos - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Preço modular por usuário ativo. CRM incluído, adicione Sinistros e Gamificação conforme sua necessidade. 7 dias grátis, sem cartão.',
      },
      { property: 'og:title', content: 'Preços e Planos - Ecotech CRM' },
      {
        property: 'og:description',
        content: 'Modelo modular por usuário ativo. 7 dias grátis.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/precos' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/precos' }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Ecotech CRM',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description: 'Sistema CRM modular para corretoras de seguros.',
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'BRL',
            offerCount: '4',
            description: 'Plano mensal, semestral, anual ou trienal por usuário ativo.',
          },
        }),
      },
    ],
  }),
  component: PrecosPage,
});

const crmFeatures = [
  {
    icon: Users,
    title: 'Gestão de Clientes',
    description: 'CRM para clientes PF e PJ com controle total',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    icon: FileText,
    title: 'Documentos de Venda',
    description: 'Cotações, propostas e documentos organizados',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: TrendingUp,
    title: 'Dashboard e Métricas',
    description: 'Acompanhe KPIs e performance em tempo real',
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400',
  },
  {
    icon: RefreshCw,
    title: 'Renovações Inteligentes',
    description: 'Alertas automáticos e gestão de renovações',
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
  },
  {
    icon: MessageSquare,
    title: 'Chat e Colaboração',
    description: 'Comunicação em tempo real com sua equipe',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    icon: Shield,
    title: 'Controle de Permissões',
    description: 'Segurança e controle de acesso granular',
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
  },
  {
    icon: Kanban,
    title: 'Pipeline de Oportunidades',
    description: 'Board Kanban para gestão de leads',
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-400',
  },
  {
    icon: HeadphonesIcon,
    title: 'Suporte Prioritário',
    description: 'Atendimento dedicado via email e chat',
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-400',
  },
];

const addonModules = [
  {
    slug: 'sinistros' as ModuloSlug,
    icon: ShieldAlert,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    features: [
      'Abertura e acompanhamento de sinistros',
      'Kanban por status (análise, aprovado, pago…)',
      'Histórico e timeline completos',
      'Aprovação com valor e motivo de recusa',
    ],
  },
  {
    slug: 'gamificacao' as ModuloSlug,
    icon: Trophy,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    features: [
      'Metas individuais e por equipe',
      'Missões com prazo e badges de conclusão',
      'Campanhas vinculadas a seguradoras',
      'Ranking e reconhecimento de top vendedores',
    ],
  },
];

const pricingExamples = [
  { users: 1, label: '1 usuário' },
  { users: 3, label: '3 usuários', highlight: true },
  { users: 5, label: '5 usuários' },
  { users: 10, label: '10 usuários' },
  { users: 20, label: '20 usuários' },
];

function GridBackground() {
  return (
    <>
      <div className="absolute inset-0 opacity-30 dark:opacity-30">
        <div
          className="absolute inset-0 dark:hidden"
          style={{ backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)`, backgroundSize: '24px 24px' }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`, backgroundSize: '24px 24px' }}
        />
      </div>
      <div className="absolute inset-0 opacity-15 dark:opacity-15">
        <div
          className="absolute inset-0 dark:hidden"
          style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`, backgroundSize: '48px 48px' }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '48px 48px' }}
        />
      </div>
      <div className="absolute top-0 left-0 right-0 h-px opacity-50 dark:opacity-50">
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) 8px, transparent 8px, transparent 16px)' }} />
        <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.5) 8px, transparent 8px, transparent 16px)' }} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px opacity-50 dark:opacity-50">
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0.5) 8px, transparent 8px, transparent 16px)' }} />
        <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.5) 8px, transparent 8px, transparent 16px)' }} />
      </div>
      <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="absolute left-6 sm:left-8 lg:left-12 top-0 bottom-0 w-px opacity-40">
          <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 8px, transparent 8px, transparent 16px)' }} />
          <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)' }} />
        </div>
        <div className="absolute right-6 sm:right-8 lg:right-12 top-0 bottom-0 w-px opacity-40">
          <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4) 8px, transparent 8px, transparent 16px)' }} />
          <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)' }} />
        </div>
      </div>
    </>
  );
}

function PrecosPage() {
  const [selectedUsers, setSelectedUsers] = useState(3);
  const [selectedPlan, setSelectedPlan] = useState<PlanCycle>('TRIENAL');
  const [selectedModulos, setSelectedModulos] = useState<Set<ModuloSlug>>(new Set(['crm']));

  const toggleModulo = (modulo: ModuloSlug) => {
    if (modulo === 'crm') return;
    setSelectedModulos((prev) => {
      const next = new Set(prev);
      if (next.has(modulo)) next.delete(modulo);
      else next.add(modulo);
      return next;
    });
  };

  const planCfg = PLAN_CONFIGS[selectedPlan];
  const modulosList = Array.from(selectedModulos);
  const additionalSeats = Math.max(0, selectedUsers - PRICING_CONFIG.INCLUDED_SEATS);
  const crmMonthly = calculatePlanBill(selectedUsers, selectedPlan);
  const addonsMonthly = calculateModulesBill(selectedUsers, selectedPlan, modulosList);
  const monthlyTotal = calculateTotalBill(selectedUsers, selectedPlan, modulosList);
  const periodTotal = parseFloat((monthlyTotal * planCfg.billingMonths).toFixed(2));

  return (
    <div className="bg-white dark:bg-black min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative bg-white dark:bg-black py-24 sm:py-32 overflow-hidden">
        <GridBackground />
        <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1">
          <div>section.precos</div>
          <div>pricing.hero</div>
        </div>
        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
          <div className="absolute -top-8 left-6 sm:left-8 lg:left-12 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">PRICING_HERO_01</div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="inline-flex items-center gap-2 mb-8 relative group">
            <Calculator className="w-3.5 h-3.5 text-primary" />
            <span className="font-inter text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">Preços Transparentes</span>
            <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
          </motion.div>

          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="font-inter text-4xl sm:text-6xl lg:text-7xl font-normal leading-[1.1] text-black dark:text-white mb-6">
            Pague só pelo que <span className="text-primary">usar</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="font-inter text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300 max-w-2xl">
            CRM completo na base, com módulos de Sinistros e Gamificação como add-ons opcionais. Tudo cobrado por usuário ativo, no ciclo que fizer sentido para sua corretora.
          </motion.p>
        </div>
      </section>

      {/* ── CALCULATOR ──────────────────────────────────────────── */}
      <section className="relative bg-white dark:bg-black py-24 overflow-hidden">
        <GridBackground />
        <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1">
          <div>section.plans</div>
          <div>interactive.calculator</div>
        </div>

        <div className="relative mx-auto max-w-5xl px-6 sm:px-8 lg:px-12 z-10 space-y-10">
          <div className="absolute -top-8 left-6 sm:left-8 lg:left-12 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">PRICING_PLANS_01</div>

          {/* Cycle selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {(['MENSAL', 'SEMESTRAL', 'ANUAL', 'TRIENAL'] as PlanCycle[]).map((cycle) => {
              const cfg = PLAN_CONFIGS[cycle];
              const crmSeat = MODULE_PRICING_CONFIG.crm[cycle].seat.gross;
              return (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setSelectedPlan(cycle)}
                  className={`relative flex flex-col gap-2 p-5 rounded-lg border text-left transition-all duration-150 hover:-translate-y-0.5 ${
                    selectedPlan === cycle
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/25'
                  }`}
                >
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30 rounded-tl" />
                  {cfg.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono font-semibold text-black bg-primary px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      {cfg.badge}
                    </span>
                  )}
                  <div>
                    <p className="font-inter text-sm font-semibold text-black dark:text-white">{cfg.label}</p>
                    <p className="font-inter text-xs text-gray-500 dark:text-gray-400">{cfg.shortLabel}</p>
                  </div>
                  <div className="mt-1">
                    <span className="font-inter text-xl font-semibold text-black dark:text-white">{formatBRL(cfg.basePrice)}</span>
                    <span className="font-inter text-xs text-gray-500 dark:text-gray-400">/mês</span>
                  </div>
                  <p className="font-inter text-[11px] text-gray-400 dark:text-gray-500">
                    3 usuários CRM · {cfg.billingLabel}
                  </p>
                  <p className="font-inter text-[11px] text-gray-400 dark:text-gray-500">
                    +{formatBRL(crmSeat)}/usuário extra
                  </p>
                  {selectedPlan === cycle && <div className="w-full h-0.5 bg-primary/40 rounded-full mt-1" />}
                </button>
              );
            })}
          </div>

          {/* Calculator card */}
          <div className="relative p-8 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/[0.02]">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40 rounded-tl" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-gray-300 dark:border-white/20 rounded-tr" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-gray-300 dark:border-white/20 rounded-bl" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-gray-300 dark:border-white/20 rounded-br" />
            <div className="absolute -top-3 left-4 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">CARD_CALCULATOR</div>

            <div className="mb-8">
              <h2 className="font-inter text-2xl font-normal text-black dark:text-white">
                Simulador de Preço · {planCfg.label}
              </h2>
              <p className="font-inter text-sm text-gray-500 dark:text-gray-400 mt-1">
                Selecione os módulos e arraste para ver o valor exato
              </p>
            </div>

            {/* Price display */}
            <div className="text-center py-8 mb-8 relative rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03]">
              <div className="absolute top-2 left-2 text-[7px] font-mono text-gray-400 dark:text-white/20">price.display</div>
              <div className="font-inter text-4xl sm:text-5xl font-normal text-black dark:text-white mb-1 break-words">
                {formatBRL(monthlyTotal)}
                <span className="text-xl sm:text-2xl text-gray-500 dark:text-gray-400">/mês</span>
              </div>
              <p className="font-inter text-sm text-gray-500 dark:text-gray-400 mb-1">
                {selectedUsers} {selectedUsers === 1 ? 'usuário' : 'usuários'} · {modulosList.length} módulo{modulosList.length !== 1 ? 's' : ''}
              </p>
              {planCfg.billingMonths > 1 && (
                <p className="font-inter text-base font-medium text-primary">
                  Total {planCfg.billingMonths === 6 ? 'semestral' : planCfg.billingMonths === 12 ? 'anual' : 'trienal'}: {formatBRL(periodTotal)}
                </p>
              )}
            </div>

            {/* Users slider */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between">
                <label className="font-inter text-sm text-gray-600 dark:text-gray-400">Quantos usuários você precisa?</label>
                <span className="font-inter text-2xl font-normal text-primary">{selectedUsers}</span>
              </div>
              <input
                type="range"
                value={selectedUsers}
                onChange={(e) => setSelectedUsers(Number(e.target.value))}
                min={1}
                max={50}
                step={1}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] font-mono text-gray-400 dark:text-white/30">
                <span>1 usuário</span>
                <span>50+ usuários</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {pricingExamples.map((example) => (
                  <button
                    key={example.users}
                    type="button"
                    onClick={() => setSelectedUsers(example.users)}
                    className={`font-inter text-xs px-3 py-1 rounded-full border transition-all duration-150 ${
                      selectedUsers === example.users
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 dark:border-white/15 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/25'
                    }`}
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Module toggles */}
            <div className="mb-8">
              <p className="font-inter text-[10px] font-mono text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3">
                Módulos
              </p>
              <div className="space-y-2">
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
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                      } ${isRequired ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-gray-300 dark:border-white/20'}`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-inter text-sm font-medium text-black dark:text-white">{label.nome}</span>
                            {isRequired && <span className="font-inter text-[9px] font-mono text-primary uppercase tracking-widest">incluso</span>}
                          </div>
                          <p className="font-inter text-xs text-gray-500 dark:text-gray-400">{label.descricao}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-inter text-sm font-medium text-black dark:text-white">
                          {isRequired ? formatBRL(planCfg.basePrice) : `+${formatBRL(cfg.base?.gross ?? cfg.seat.gross)}`}
                        </span>
                        <span className="font-inter text-[11px] text-gray-400">
                          /mês
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="border-t border-gray-200 dark:border-white/10 pt-6 space-y-3 mb-8">
              <div className="flex justify-between font-inter text-sm">
                <span className="text-gray-500 dark:text-gray-400">CRM base (3 usuários incluídos)</span>
                <span className="text-black dark:text-white">{formatBRL(planCfg.basePrice)}/mês</span>
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
              <div className="flex justify-between font-inter text-sm border-t border-gray-200 dark:border-white/10 pt-3">
                <span className="text-black dark:text-white">Equivale a /mês</span>
                <span className="text-black dark:text-white">{formatBRL(monthlyTotal)}</span>
              </div>
              <div className="flex justify-between font-inter text-lg">
                <span className="text-black dark:text-white">
                  Total cobrado ({planCfg.billingMonths === 1 ? 'mensal' : planCfg.billingMonths === 6 ? 'semestral' : planCfg.billingMonths === 12 ? 'anual' : 'trienal'})
                </span>
                <span className="text-primary">{formatBRL(periodTotal)}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="flex-1 font-inter text-base h-12 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black rounded-md transition-all duration-200 hover:scale-105" asChild>
                <Link to={`/checkout?users=${selectedUsers}&plan=${selectedPlan}` as any}>Começar teste grátis</Link>
              </Button>
              <Button size="lg" variant="ghost" className="flex-1 font-inter text-base h-12 text-black dark:text-white border border-gray-300 dark:border-white/20 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200 hover:scale-105" asChild>
                <Link to="/contato">Falar com vendas</Link>
              </Button>
            </div>
            <p className="font-inter text-center text-xs text-gray-400 dark:text-white/30 mt-4">
              7 dias de teste grátis • Sem cartão de crédito • Cancele quando quiser
            </p>
          </div>
        </div>
      </section>

      {/* ── O QUE ESTÁ INCLUÍDO ──────────────────────────────────── */}
      <section className="relative bg-white dark:bg-black py-24 sm:py-32 overflow-hidden">
        <GridBackground />
        <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight space-y-1">
          <div>section.features</div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
          <div className="absolute -top-8 left-6 sm:left-8 lg:left-12 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">FEATURES_GRID_01</div>

          {/* CRM base */}
          <div className="max-w-3xl mb-12">
            <div className="relative inline-block mb-6 group">
              <span className="font-inter text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">CRM — Base</span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>
            <h2 className="font-inter mt-6 text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] text-black dark:text-white">
              Tudo incluído desde o primeiro dia
            </h2>
            <p className="font-inter mt-6 text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300 max-w-2xl">
              O módulo CRM é a base da plataforma. Sem tier de recursos — acesso completo a todas as funcionalidades de vendas e gestão.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-24">
            {crmFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative p-6 rounded-lg border border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 bg-gray-50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:-translate-y-1"
              >
                <div className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">CARD_{String(index + 1).padStart(2, '0')}</div>
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30 rounded-tl" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gray-300 dark:border-white/20 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-gray-300 dark:border-white/20 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-gray-300 dark:border-white/20 rounded-br" />
                <div className={`w-12 h-12 rounded-lg ${feature.iconBg} flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="font-inter text-lg font-semibold text-black dark:text-white mb-3 leading-tight">{feature.title}</h3>
                <p className="font-inter text-sm leading-relaxed text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Add-on modules */}
          <div className="max-w-3xl mb-12">
            <div className="relative inline-block mb-6 group">
              <span className="font-inter text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">Módulos Add-on</span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>
            <h2 className="font-inter mt-6 text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white">
              Expanda quando precisar
            </h2>
            <p className="font-inter mt-6 text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300 max-w-2xl">
              Ative apenas os módulos que fazem sentido para sua operação. Você pode habilitar ou desabilitar a qualquer momento.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {addonModules.map((addon) => {
              const label = MODULO_LABELS[addon.slug];
              const trienal = MODULE_PRICING_CONFIG[addon.slug].TRIENAL.base?.gross ?? MODULE_PRICING_CONFIG[addon.slug].TRIENAL.seat.gross;
              return (
                <div
                  key={addon.slug}
                  className="group relative p-8 rounded-lg border border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 bg-gray-50 dark:bg-white/[0.02]"
                >
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/40 rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-gray-300 dark:border-white/20 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-gray-300 dark:border-white/20 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-gray-300 dark:border-white/20 rounded-br" />

                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-lg ${addon.iconBg} flex items-center justify-center shrink-0`}>
                      <addon.icon className={`w-6 h-6 ${addon.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-inter text-xl font-semibold text-black dark:text-white">{label.nome}</h3>
                      <p className="font-inter text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label.descricao}</p>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-8">
                    {addon.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 font-inter text-sm text-gray-600 dark:text-gray-400">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-gray-200 dark:border-white/10 pt-4 flex items-baseline gap-1">
                    <span className="font-inter text-2xl font-normal text-primary">+{formatBRL(trienal)}</span>
                    <span className="font-inter text-sm text-gray-500 dark:text-gray-400">/usuário/mês (plano 3 anos)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="relative bg-white dark:bg-black py-24 sm:py-32 overflow-hidden">
        <GridBackground />
        <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight">
          <div>section.faq</div>
        </div>
        <div className="relative mx-auto max-w-3xl px-6 sm:px-8 lg:px-12 z-10">
          <div className="absolute -top-8 left-6 sm:left-8 lg:left-12 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">FAQ_01</div>

          <div className="relative inline-block mb-6 group">
            <span className="font-inter text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">FAQ</span>
            <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
          </div>
          <h2 className="font-inter mt-6 text-4xl sm:text-5xl font-normal leading-[1.1] text-black dark:text-white mb-16">Perguntas frequentes</h2>

          <div className="space-y-4">
            {[
              {
                q: 'Como funciona a precificação modular?',
                a: `O plano CRM custa ${formatBRL(PRICING_CONFIG.BASE_PRICE)}/mês e inclui até ${PRICING_CONFIG.INCLUDED_SEATS} usuários. Usuários adicionais no CRM custam ${formatBRL(MODULE_PRICING_CONFIG.crm.TRIENAL.seat.gross)}/usuário/mês (plano 3 anos). Os módulos de Sinistros (+${formatBRL(MODULE_PRICING_CONFIG.sinistros.TRIENAL.base?.gross ?? MODULE_PRICING_CONFIG.sinistros.TRIENAL.seat.gross)}/usu./mês) e Gamificação (+${formatBRL(MODULE_PRICING_CONFIG.gamificacao.TRIENAL.base?.gross ?? MODULE_PRICING_CONFIG.gamificacao.TRIENAL.seat.gross)}/usu./mês) são cobrados sobre todos os usuários ativos quando habilitados.`,
              },
              {
                q: 'Posso ativar ou desativar módulos a qualquer momento?',
                a: 'Sim. Módulos add-on podem ser habilitados no momento da assinatura ou solicitados ao suporte a qualquer momento. O ajuste no valor é feito proporcionalmente no próximo ciclo de cobrança.',
              },
              {
                q: 'O que conta como um usuário ativo?',
                a: 'Qualquer usuário com status ativo no sistema conta como uma licença. Você pode desativar usuários a qualquer momento e o valor será ajustado proporcionalmente no próximo ciclo.',
              },
              {
                q: 'Posso cancelar a qualquer momento?',
                a: 'Sim, você pode cancelar sua assinatura a qualquer momento através do painel de configurações. Não há multas ou taxas de cancelamento.',
              },
              {
                q: 'Qual a diferença entre os períodos de contrato?',
                a: `Oferecemos 4 períodos: Mensal, Semestral (6 meses), Anual (12 meses) e 3 Anos. Quanto maior o comprometimento, menor o preço mensal equivalente — o plano de 3 anos é 34% mais barato que o mensal. O desconto se aplica tanto ao CRM quanto aos módulos add-on.`,
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-lg border border-gray-200 dark:border-white/15 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 bg-gray-50 dark:bg-white/[0.02]"
              >
                <div className="absolute -top-3 left-2 text-[8px] font-mono text-gray-400 dark:text-white/20 bg-white dark:bg-black px-1">FAQ_{String(index + 1).padStart(2, '0')}</div>
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30 rounded-tl" />
                <h3 className="font-inter text-lg font-semibold text-black dark:text-white mb-3">{faq.q}</h3>
                <p className="font-inter text-sm leading-relaxed text-gray-600 dark:text-gray-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section className="relative bg-white dark:bg-black py-24 sm:py-32 overflow-hidden">
        <GridBackground />
        <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-400 dark:text-white/25 leading-tight">
          <div>section.cta</div>
        </div>
        <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
          <div className="absolute -top-8 left-6 sm:left-8 lg:left-12 text-[10px] font-mono text-gray-400 dark:text-white/20 tracking-wider">CTA_FINAL_01</div>
          <div className="max-w-2xl">
            <div className="absolute -top-4 -left-2 w-12 h-12">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary/40" />
            </div>
            <div className="relative inline-block mb-8 group">
              <span className="font-inter text-primary text-xs sm:text-sm font-semibold uppercase tracking-widest">Comece agora</span>
              <div className="absolute -bottom-2 left-0 h-px w-12 bg-primary opacity-50" />
            </div>
            <h2 className="font-inter text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] text-black dark:text-white mb-6">Pronto para começar?</h2>
            <p className="font-inter text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300 mb-10 max-w-xl">
              Comece seu teste gratuito de 7 dias agora e descubra como o Ecotech pode transformar a gestão da sua corretora de seguros.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12 relative">
              <div className="absolute -left-8 top-0 h-full w-px opacity-30 bg-gradient-to-b from-primary/30 to-transparent" />
              <Button size="lg" className="font-inter text-base px-8 h-12 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-black rounded-md transition-all duration-200 hover:scale-105" asChild>
                <Link to={`/checkout?users=${selectedUsers}&plan=${selectedPlan}` as any}>Começar teste grátis</Link>
              </Button>
              <Button size="lg" variant="ghost" className="font-inter text-base px-8 h-12 text-black dark:text-white border border-gray-300 dark:border-white/20 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200 hover:scale-105" asChild>
                <Link to="/funcionalidades">Ver funcionalidades</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-6 font-inter text-sm text-gray-600 dark:text-gray-400 relative">
              <div className="absolute -top-8 left-0 right-0 h-px bg-gray-200 dark:bg-white/15" />
              {['7 dias grátis', 'Sem cartão de crédito', 'Cancele quando quiser'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
