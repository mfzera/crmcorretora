
import {
  FileText,
  Users,
  TrendingUp,
  RefreshCw,
  FileEdit,
  MessageSquare,
  BarChart3,
  Shield,
} from 'lucide-react';
import * as m from 'framer-motion/m';
import { useScroll, useTransform, MotionValue } from 'framer-motion';
import { useRef } from 'react';

const features = [
  {
    icon: FileText,
    title: 'Gestão de Documentos',
    description:
      'Cotações, propostas e documentos com controle de status, comissões e histórico completo de alterações.',
    accent: 'var(--color-primary)',
    bg: 'rgba(var(--primary-rgb), 0.08)',
    border: 'rgba(var(--primary-rgb), 0.2)',
  },
  {
    icon: Users,
    title: 'CRM de Clientes PF e PJ',
    description:
      'Cadastro completo com CPF/CNPJ, vendedores responsáveis e transferências entre equipes.',
    accent: '#a855f7',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.2)',
  },
  {
    icon: TrendingUp,
    title: 'Pipeline Kanban',
    description:
      'Board interativo para leads e oportunidades. Funil de vendas desde o contato até o fechamento.',
    accent: 'var(--color-primary)',
    bg: 'rgba(var(--primary-rgb), 0.06)',
    border: 'rgba(var(--primary-rgb), 0.2)',
  },
  {
    icon: RefreshCw,
    title: 'Renovações Inteligentes',
    description:
      'Alertas automáticos antes do vencimento. Nunca perca uma renovação de apólice.',
    accent: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.2)',
  },
  {
    icon: FileEdit,
    title: 'Endossos e Alterações',
    description:
      'Workflow de aprovação para endossos. Controle inclusões, exclusões e impacto em prêmios.',
    accent: '#6366f1',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.2)',
  },
  {
    icon: MessageSquare,
    title: 'Chat e Colaboração',
    description:
      'Comunicação em tempo real por contexto. Comentários em cotações, tarefas e clientes.',
    accent: '#06b6d4',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.2)',
  },
  {
    icon: BarChart3,
    title: 'Dashboard e Métricas',
    description:
      'KPIs em tempo real: vendas, comissões, propostas pendentes. Performance individual e da equipe.',
    accent: '#ec4899',
    bg: 'rgba(236,72,153,0.08)',
    border: 'rgba(236,72,153,0.2)',
  },
  {
    icon: Shield,
    title: 'Controle de Permissões',
    description:
      'Cargos e permissões granulares. Multi-tenant com isolamento completo por funcionalidade.',
    accent: '#eab308',
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.2)',
  },
];

// Each card tracks its own scroll-driven visibility
function ScrollFeatureCard({
  feature,
  index,
  scrollYProgress,
}: {
  feature: (typeof features)[number];
  index: number;
  scrollYProgress: MotionValue<number>;
}) {
  // Distribute cards across 15%–90% of the scroll range
  const start = 0.15 + (index / features.length) * 0.7;
  const end = start + 0.07;

  const opacity = useTransform(scrollYProgress, [start, end], [0, 1]);
  const y = useTransform(scrollYProgress, [start, end], [56, 0]);
  const scale = useTransform(scrollYProgress, [start, end], [0.94, 1]);

  return (
    // Outer: scroll-driven fade/slide/scale
    <m.div style={{ opacity, y, scale }}>
      {/* Inner: hover lift + card styles */}
      <m.div
        whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' } }}
        className="group relative p-6 rounded-xl border cursor-default"
        style={{ background: feature.bg, borderColor: feature.border }}
      >
        {/* Corner accent */}
        <div
          className="absolute top-0 left-0 w-3 h-3 border-t border-l rounded-tl-xl"
          style={{ borderColor: feature.accent + '60' }}
        />

        {/* Index */}
        <div className="absolute top-3 right-3 text-[10px] font-mono text-black/20 dark:text-white/20">
          {String(index + 1).padStart(2, '0')}
        </div>

        {/* Hover glow */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${feature.accent}14 0%, transparent 70%)`,
          }}
        />

        {/* Icon — CSS animation, no JS loop */}
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center mb-5"
          style={{
            background: feature.bg,
            border: `1px solid ${feature.border}`,
            animation: `icon-float ${3 + (index % 4) * 0.3}s ease-in-out infinite`,
            animationDelay: `${(index % 4) * 0.2}s`,
          }}
        >
          <feature.icon className="w-5 h-5" style={{ color: feature.accent }} />
        </div>

        <h3 className="font-inter text-base font-semibold text-gray-900 dark:text-white mb-2 leading-snug">
          {feature.title}
        </h3>
        <p className="font-inter text-sm leading-relaxed text-gray-500 dark:text-white/45">
          {feature.description}
        </p>

        {/* Bottom accent line on hover */}
        <div
          className="absolute bottom-0 left-4 right-4 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full"
          style={{ background: `linear-gradient(90deg, ${feature.accent}80, transparent)` }}
        />
      </m.div>
    </m.div>
  );
}

// Static card for mobile (whileInView animations)
function StaticFeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[number];
  index: number;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: 0.7,
        delay: (index % 4) * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' } }}
      className="group relative p-6 rounded-xl border cursor-default"
      style={{
        background: feature.bg,
        borderColor: feature.border,
      }}
    >
      <div
        className="absolute top-0 left-0 w-3 h-3 border-t border-l rounded-tl-xl"
        style={{ borderColor: feature.accent + '60' }}
      />
      <div className="absolute top-3 right-3 text-[10px] font-mono text-black/20 dark:text-white/20">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${feature.accent}14 0%, transparent 70%)`,
        }}
      />
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center mb-5"
        style={{
          background: feature.bg,
          border: `1px solid ${feature.border}`,
          animation: `icon-float ${3 + (index % 4) * 0.3}s ease-in-out infinite`,
          animationDelay: `${(index % 4) * 0.2}s`,
        }}
      >
        <feature.icon className="w-5 h-5" style={{ color: feature.accent }} />
      </div>
      <h3 className="font-inter text-base font-semibold text-gray-900 dark:text-white mb-2 leading-snug">
        {feature.title}
      </h3>
      <p className="font-inter text-sm leading-relaxed text-gray-500 dark:text-white/45">
        {feature.description}
      </p>
      <div
        className="absolute bottom-0 left-4 right-4 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full"
        style={{ background: `linear-gradient(90deg, ${feature.accent}80, transparent)` }}
      />
    </m.div>
  );
}

// ─── Desktop: sticky scroll-reveal ────────────────────────────────────────────

function DesktopFeatures() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const headerOpacity = useTransform(scrollYProgress, [0, 0.12], [0, 1]);
  const headerY = useTransform(scrollYProgress, [0, 0.12], [40, 0]);

  // Progress bar width
  const progressWidth = useTransform(scrollYProgress, [0.15, 0.9], ['0%', '100%']);

  return (
    // Tall section — provides scroll travel for the pin effect
    <section
      ref={sectionRef}
      className="relative bg-white dark:bg-black"
      style={{ height: '380vh' }}
    >
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
        {/* Dotted foundation grid — Layer 1 */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, var(--landing-grid) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Fine line grid — Layer 2 */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(var(--landing-grid) 1px, transparent 1px),
              linear-gradient(90deg, var(--landing-grid) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Dashed vertical guides — Layer 3 */}
        <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pointer-events-none">
          <div
            className="absolute left-6 sm:left-8 lg:left-12 top-0 bottom-0 w-px opacity-25"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, var(--landing-guide), var(--landing-guide) 6px, transparent 6px, transparent 14px)',
            }}
          />
          <div
            className="absolute right-6 sm:right-8 lg:right-12 top-0 bottom-0 w-px opacity-25"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, var(--landing-guide), var(--landing-guide) 6px, transparent 6px, transparent 14px)',
            }}
          />
          <div
            className="absolute left-1/2 top-0 bottom-0 w-px opacity-[0.12]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, var(--landing-guide), var(--landing-guide) 8px, transparent 8px, transparent 16px)',
            }}
          />
        </div>

        {/* Section glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[120px] pointer-events-none"
          style={{ background: 'rgba(var(--primary-rgb), 0.025)' }}
        />

        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/8 dark:via-white/8 to-transparent" />

        {/* Technical annotations */}
        <div className="absolute top-4 left-4 text-[9px] font-mono text-black/15 dark:text-white/15 leading-tight space-y-1 pointer-events-none">
          <div>FEATURES_GRID_01</div>
          <div>scroll-pin.stagger</div>
        </div>

        <div className="relative mx-auto max-w-7xl w-full px-6 sm:px-8 lg:px-12 z-10">
          {/* Section header */}
          <m.div style={{ opacity: headerOpacity, y: headerY }} className="max-w-2xl mb-10">
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="h-px w-8 bg-primary/60" />
              <span className="font-inter text-primary text-xs font-semibold uppercase tracking-widest">
                Funcionalidades
              </span>
            </div>

            <div className="overflow-hidden mb-1">
              <h2 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-gray-900 dark:text-white">
                Tudo que você precisa
              </h2>
            </div>
            <div className="overflow-hidden">
              <h2 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-gray-400 dark:text-white/40">
                na sua corretora
              </h2>
            </div>
          </m.div>

          {/* Features grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <ScrollFeatureCard
                key={feature.title}
                feature={feature}
                index={index}
                scrollYProgress={scrollYProgress}
              />
            ))}
          </div>

          {/* Scroll progress bar */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-black/8 dark:bg-white/8 relative overflow-hidden rounded-full">
              <m.div
                style={{ width: progressWidth }}
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary/60 to-primary/20 rounded-full"
              />
            </div>
            <span className="text-[10px] font-mono text-white/20 whitespace-nowrap">
              {features.length} funcionalidades
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Mobile: regular stagger-on-scroll ────────────────────────────────────────

function MobileFeatures() {
  return (
    <section className="relative bg-white dark:bg-black py-24 overflow-hidden">
      {/* Dotted foundation grid — Layer 1 */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, var(--landing-grid) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Fine line grid — Layer 2 */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(var(--landing-grid) 1px, transparent 1px),
            linear-gradient(90deg, var(--landing-grid) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Dashed vertical guides — Layer 3 */}
      <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pointer-events-none">
        <div
          className="absolute left-6 sm:left-8 lg:left-12 top-0 bottom-0 w-px opacity-25"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, var(--landing-guide), var(--landing-guide) 6px, transparent 6px, transparent 14px)',
          }}
        />
        <div
          className="absolute right-6 sm:right-8 lg:right-12 top-0 bottom-0 w-px opacity-25"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, var(--landing-guide), var(--landing-guide) 6px, transparent 6px, transparent 14px)',
          }}
        />
        <div
          className="absolute left-1/2 top-0 bottom-0 w-px opacity-[0.12]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, var(--landing-guide), var(--landing-guide) 8px, transparent 8px, transparent 16px)',
          }}
        />
      </div>

      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[120px] pointer-events-none"
        style={{ background: 'rgba(var(--primary-rgb), 0.025)' }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/8 dark:via-white/8 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
        <div className="max-w-2xl mb-16">
          <m.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 mb-6"
          >
            <div className="h-px w-8 bg-primary/60" />
            <span className="font-inter text-primary text-xs font-semibold uppercase tracking-widest">
              Funcionalidades
            </span>
          </m.div>

          <div className="overflow-hidden mb-4">
            <m.h2
              initial={{ y: 60, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-gray-900 dark:text-white"
            >
              Tudo que você precisa
            </m.h2>
          </div>
          <div className="overflow-hidden">
            <m.h2
              initial={{ y: 60, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-gray-400 dark:text-white/40"
            >
              na sua corretora
            </m.h2>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <StaticFeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Root export: CSS breakpoint, no JS detection ─────────────────────────────

export function Features() {
  return (
    <>
      {/* Desktop: sticky scroll-pin (lg+) */}
      <div className="hidden lg:block">
        <DesktopFeatures />
      </div>
      {/* Mobile/tablet: stagger-on-scroll (< lg) */}
      <div className="lg:hidden">
        <MobileFeatures />
      </div>
    </>
  );
}
