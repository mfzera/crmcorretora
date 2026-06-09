
import * as m from 'framer-motion/m';
import { useScroll, useTransform, useMotionTemplate } from 'framer-motion';
import { useRef } from 'react';
import { UserPlus, LayoutDashboard, TrendingUp } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Cadastre sua corretora',
    description:
      'Crie sua conta em minutos. Configure sua equipe, cargos e permissões. Sem burocracia, sem cartão de crédito.',
    accent: 'var(--color-primary)',
    tag: 'ONBOARDING',
  },
  {
    number: '02',
    icon: LayoutDashboard,
    title: 'Centralize tudo',
    description:
      'Importe seus clientes, apólices e histórico. Gerencie cotações, propostas e renovações em um único lugar.',
    accent: 'var(--color-primary)',
    tag: 'OPERAÇÃO',
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Cresça com dados',
    description:
      'Dashboard em tempo real. Acompanhe KPIs, comissões, funil de vendas e performance da sua equipe.',
    accent: '#a855f7',
    tag: 'CRESCIMENTO',
  },
];

// ─── Desktop: horizontal camera pan ──────────────────────────────────────────

function DesktopHowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // 4 panels × 100vw: translate 0 → -300vw as scrollYProgress 0 → 1
  const xVw = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const x = useMotionTemplate`${xVw}vw`;

  // Cross-panel neon line — fill follows scroll 1:1
  const lineProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // Dot opacity — lights up as fill reaches each panel
  const m0 = useTransform(lineProgress, [0, 0.05], [0, 1]);
  const m1 = useTransform(lineProgress, [0.28, 0.38], [0, 1]);
  const m2 = useTransform(lineProgress, [0.61, 0.71], [0, 1]);
  const m3 = useTransform(lineProgress, [0.93, 1], [0, 1]);

  // SVG path — crazy curves, 4000 viewBox units = 400vw, y centered at 100 (of 200)
  const neonPath =
    'M 0 100 C 250 10, 600 190, 800 30 C 900 5, 970 120, 1000 100 C 1080 70, 1350 190, 1600 10 C 1750 5, 1950 140, 2000 100 C 2080 60, 2300 190, 2650 5 C 2800 10, 2970 130, 3000 100 C 3060 70, 3250 10, 3600 190 C 3750 155, 3950 20, 4000 100';

  return (
    // Tall section — provides scroll travel for the horizontal pan
    <section
      ref={sectionRef}
      className="relative bg-white dark:bg-black"
      style={{ height: '240vh' }}
    >
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen overflow-hidden" style={{ contain: 'layout style' }}>
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

        {/* Top divider */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/8 dark:via-white/8 to-transparent" />

        {/* Technical annotation */}
        <div className="absolute top-4 left-4 text-[9px] font-mono text-black/15 dark:text-white/15 leading-tight space-y-1 pointer-events-none z-10">
          <div>HOW_IT_WORKS_01</div>
          <div>horizontal-pan.scroll</div>
        </div>


        {/* Horizontal track — 400vw wide */}
        <m.div
          style={{ x, willChange: 'transform' }}
          className="relative flex h-full"
          initial={false}
        >
          {/* ── Cross-panel neon line ───────────────────────────────────── */}
          <div
            className="absolute left-0 pointer-events-none z-10"
            style={{ bottom: 100, width: '400vw', height: 200 }}
          >
            <svg
              width="400vw"
              height="200"
              viewBox="0 0 4000 200"
              preserveAspectRatio="none"
              fill="none"
              style={{ contain: 'strict' }}
            >
              <defs>
                <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--color-primary)" />
                  <stop offset="50%" stopColor="var(--color-primary)" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>

              {/* Background track */}
              <path d={neonPath} stroke="white" strokeWidth="1" strokeOpacity="0.08" />

              {/* Soft halo — thick + faint, no filter */}
              <m.path
                d={neonPath}
                stroke="url(#neonGrad)"
                strokeWidth="5"
                strokeOpacity="0.15"
                fill="none"
                style={{ pathLength: lineProgress }}
              />

              {/* Core line */}
              <m.path
                d={neonPath}
                stroke="url(#neonGrad)"
                strokeWidth="1.5"
                fill="none"
                style={{ pathLength: lineProgress }}
              />

              {/* Dots */}
              <m.circle cx="0"    cy="100" r="5" fill="var(--color-primary)" style={{ opacity: m0 }} />
              <m.circle cx="1000" cy="100" r="5" fill="var(--color-primary)" style={{ opacity: m1 }} />
              <m.circle cx="2000" cy="100" r="5" fill="var(--color-primary)" style={{ opacity: m2 }} />
              <m.circle cx="3000" cy="100" r="5" fill="#a855f7" style={{ opacity: m3 }} />
            </svg>

            {/* Labels — HTML (não esticado pelo preserveAspectRatio) */}
            <m.span
              className="absolute font-mono text-[10px] tracking-widest text-primary"
              style={{ left: '25%', top: 108, opacity: m1, transform: 'translateX(-50%)' }}
            >01</m.span>
            <m.span
              className="absolute font-mono text-[10px] tracking-widest text-primary"
              style={{ left: '50%', top: 108, opacity: m2, transform: 'translateX(-50%)' }}
            >02</m.span>
            <m.span
              className="absolute font-mono text-[10px] tracking-widest text-[#a855f7]"
              style={{ left: '75%', top: 108, opacity: m3, transform: 'translateX(-50%)' }}
            >03</m.span>
          </div>

          {/* ── Panel 0: Intro ─────────────────────────────────────────── */}
          <div className="w-screen flex-shrink-0 h-full flex items-center">
            <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 w-full">
              <div className="max-w-lg">
                <div className="inline-flex items-center gap-2 mb-6">
                  <div className="h-px w-8 bg-primary/60" />
                  <span className="font-inter text-primary text-xs font-semibold uppercase tracking-widest">
                    Como funciona
                  </span>
                </div>

                <div className="overflow-hidden mb-2">
                  <h2 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-gray-900 dark:text-white">
                    Do zero ao
                  </h2>
                </div>
                <div className="overflow-hidden mb-8">
                  <h2 className="font-inter text-4xl sm:text-5xl font-normal leading-[1.1] text-gray-400 dark:text-white/35">
                    crescimento em 3 passos
                  </h2>
                </div>

                <p className="font-inter text-base text-gray-500 dark:text-white/40 leading-relaxed max-w-sm mb-10">
                  Configure, opere e cresça — tudo dentro do workspace. Sem
                  planilhas, sem ferramentas espalhadas.
                </p>

                {/* Hint to scroll */}
                <div className="flex items-center gap-3 text-black/30 dark:text-white/30">
                  <span className="text-xs font-mono tracking-widest uppercase">role para ver os passos</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-current" />
                    <div className="w-1 h-1 rounded-full bg-current" />
                    <div className="w-1 h-1 rounded-full bg-current" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Panels 1–3: Steps ─────────────────────────────────────── */}
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="w-screen flex-shrink-0 h-full flex items-center"
            >
              <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 w-full">
                {/* Dashed vertical guides for each panel */}
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

                <div className="max-w-lg">
                  {/* Tag + number */}
                  <div className="flex items-center gap-3 mb-10">
                    <span className="text-[10px] font-mono text-black/25 dark:text-white/25 tracking-widest">
                      {step.tag}
                    </span>
                    <div className="h-px w-8 bg-black/10 dark:bg-white/10" />
                    <span className="text-[10px] font-mono" style={{ color: step.accent + '80' }}>
                      {step.number}
                    </span>
                  </div>

                  {/* Icon */}
                  <div
                    className="w-16 h-16 rounded-2xl border flex items-center justify-center mb-8"
                    style={{
                      background: step.accent + '10',
                      borderColor: step.accent + '30',
                    }}
                  >
                    <step.icon className="w-7 h-7" style={{ color: step.accent }} />
                  </div>

                  {/* Title */}
                  <h3 className="font-inter text-4xl sm:text-5xl font-normal text-gray-900 dark:text-white mb-4 leading-[1.1]">
                    {step.title}
                  </h3>
                  <p className="font-inter text-base text-gray-500 dark:text-white/45 leading-relaxed max-w-sm">
                    {step.description}
                  </p>

                  {/* Accent line */}
                  <div
                    className="mt-10 h-px w-16"
                    style={{ background: `linear-gradient(90deg, ${step.accent}60, transparent)` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </m.div>
      </div>
    </section>
  );
}

// ─── Mobile: vertical stagger ─────────────────────────────────────────────────

function MobileHowItWorks() {
  return (
    <section className="relative bg-white dark:bg-black py-24 sm:py-32 overflow-hidden">
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
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/8 dark:via-white/8 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 z-10">
        {/* Header */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="h-px w-8 bg-primary/60" />
            <span className="font-inter text-primary text-xs font-semibold uppercase tracking-widest">
              Como funciona
            </span>
          </div>
          <h2 className="font-inter text-4xl font-normal leading-[1.1] text-gray-900 dark:text-white mb-1">
            Do zero ao
          </h2>
          <h2 className="font-inter text-4xl font-normal leading-[1.1] text-gray-400 dark:text-white/35">
            crescimento em 3 passos
          </h2>
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {steps.map((step, index) => (
            <m.div
              key={step.number}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="flex gap-6 items-start group"
            >
              <div className="flex-shrink-0 relative">
                <div
                  className="w-14 h-14 rounded-2xl border flex items-center justify-center"
                  style={{ background: step.accent + '10', borderColor: step.accent + '30' }}
                >
                  <step.icon className="w-6 h-6" style={{ color: step.accent }} />
                </div>
                {index < steps.length - 1 && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-px h-14"
                    style={{ background: `linear-gradient(to bottom, ${step.accent}40, transparent)` }}
                  />
                )}
              </div>

              <div className="pb-14">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-mono text-black/25 dark:text-white/25 tracking-widest">
                    {step.tag}
                  </span>
                  <div className="h-px w-6 bg-black/10 dark:bg-white/10" />
                  <span className="text-[10px] font-mono" style={{ color: step.accent + '80' }}>
                    {step.number}
                  </span>
                </div>
                <h3 className="font-inter text-2xl font-normal text-gray-900 dark:text-white mb-2 leading-snug">
                  {step.title}
                </h3>
                <p className="font-inter text-sm text-gray-500 dark:text-white/45 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function HowItWorks() {
  return (
    <>
      <div className="md:hidden">
        <MobileHowItWorks />
      </div>
      <div className="hidden md:block">
        <DesktopHowItWorks />
      </div>
    </>
  );
}
