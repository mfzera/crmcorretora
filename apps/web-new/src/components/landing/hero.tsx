
import { Link } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';
import { ArrowRight } from 'lucide-react';
import * as m from 'framer-motion/m';
import { useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// Evaluated once at module load — safe for SPA (no SSR).
// When true, the CSS animation handles parallax; useScroll is never instantiated.
const cssScrollDrivenSupported =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('animation-timeline', 'scroll()');

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

function TextReveal({
  children,
  delay = 0,
  className,
  lcp = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  lcp?: boolean;
}) {
  if (lcp) {
    // LCP element: rendered fully visible on first paint so Chrome registers LCP
    // immediately. opacity:0 initial state prevents LCP from being recorded.
    return <div className={className}>{children}</div>;
  }
  return (
    <div className="overflow-hidden">
      <m.div
        initial={{ y: '110%', opacity: 0 }}
        animate={{ y: '0%', opacity: 1 }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        className={className}
      >
        {children}
      </m.div>
    </div>
  );
}

// ── Inner hero content — no scroll dependencies, safe to render anywhere ──────
function HeroBody() {
  return (
    <div className="max-w-3xl">
      {/* workspace badge */}
      <m.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="inline-flex items-center gap-3 mb-8"
      >
        <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-primary font-inter text-xs font-semibold tracking-widest uppercase">
            workspace CRM
          </span>
        </div>
        <div className="h-px w-16 bg-gradient-to-r from-primary/40 to-transparent" />
      </m.div>

      {/* Headline */}
      <h1 className="sr-only">CRM completo para sua corretora de seguros</h1>
      <div className="mb-6" aria-hidden="true">
        <TextReveal lcp delay={0.05} className="font-inter text-4xl sm:text-6xl lg:text-7xl font-normal leading-[1.08] text-gray-900 dark:text-white">
          CRM completo para
        </TextReveal>
        <TextReveal lcp delay={0.15} className="font-inter text-4xl sm:text-6xl lg:text-7xl font-normal leading-[1.08] text-gray-900 dark:text-white">
          sua{' '}
          <span className="relative inline-block">
            <span className="text-primary">corretora</span>
            <m.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -bottom-1 left-0 right-0 h-px bg-primary/50 origin-left"
            />
          </span>
        </TextReveal>
        <TextReveal lcp delay={0.25} className="font-inter text-4xl sm:text-6xl lg:text-7xl font-normal leading-[1.08] text-gray-900 dark:text-white">
          de seguros
        </TextReveal>
      </div>

      {/* Subheadline */}
      <TextReveal delay={0.45}>
        <p className="font-inter text-base sm:text-lg leading-relaxed text-gray-500 dark:text-white/50 mb-10 max-w-xl">
          Sistema inteligente que simplifica cotações, propostas, renovações
          e muito mais. Comece gratuitamente e pague apenas pelos usuários
          ativos.
        </p>
      </TextReveal>

      {/* CTA buttons */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row gap-4 mb-12"
      >
        <MagneticButton>
          <Button
            size="lg"
            className="font-inter text-base px-8 h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-md transition-all duration-200 group"
            asChild
          >
            <Link to="/login" search={{ redirect: '' }}>
              Começar teste grátis
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </Button>
        </MagneticButton>

        <MagneticButton>
          <Button
            size="lg"
            variant="ghost"
            className="font-inter text-base px-8 h-12 text-gray-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/8 border border-black/15 dark:border-white/15 hover:border-black/25 dark:hover:border-white/30 rounded-md transition-all duration-200"
            asChild
          >
            <Link to="/precos">Ver Preços</Link>
          </Button>
        </MagneticButton>
      </m.div>

      {/* Trust badges */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="flex flex-wrap items-center gap-6 font-inter text-sm text-gray-500 dark:text-white/35"
      >
        {['7 dias grátis', 'Sem cartão de crédito', 'Cancele quando quiser'].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
            <span>{item}</span>
          </div>
        ))}
      </m.div>
    </div>
  );
}

// ── Parallax via Framer Motion — only mounts on desktop, so useScroll never
//   runs on mobile (eliminates the scroll-listener reflow on small screens). ──
function HeroParallaxJS({
  sectionRef,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
}) {
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  return (
    <m.div
      style={{ y, opacity, willChange: 'transform, opacity' }}
      className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-24 sm:py-32 z-10 w-full"
    >
      <HeroBody />
    </m.div>
  );
}

const CONTENT_CLASS =
  'relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-24 sm:py-32 z-10 w-full';

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const isDesktop = useIsDesktop();
  const prefersReducedMotion = useReducedMotion();
  const applyParallax = isDesktop && !prefersReducedMotion;

  return (
    <section
      ref={sectionRef}
      className="relative bg-white dark:bg-black min-h-screen flex items-center overflow-hidden"
    >
      {/* Three.js particle network — isolated in iframe so unsafe-eval fica restrito a /embed/particles */}
      {isDesktop && (
        <iframe
          src="/embed/particles"
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            pointerEvents: 'none',
            background: 'transparent',
          }}
        />
      )}

      {/* Radial gradient spotlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 30% 50%, rgba(var(--primary-rgb), 0.04) 0%, transparent 70%)',
        }}
      />

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
        className="absolute inset-0 opacity-[0.03]"
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

      {/* Technical annotations */}
      <div className="absolute top-4 left-4 text-[9px] font-mono text-black/20 dark:text-white/20 leading-tight space-y-1 pointer-events-none z-10">
        <div>HERO_SECTION_01</div>
        <div>min-h-screen.particles</div>
      </div>
      <div className="hidden md:block absolute top-4 right-4 text-[9px] font-mono text-black/20 dark:text-white/20 text-right leading-tight space-y-1 pointer-events-none z-10">
        <div>three.js / @react-three/fiber</div>
        <div>90 particles · N² connections</div>
      </div>

      {/* Content — three rendering paths:
          1. Desktop + CSS scroll-driven supported → GPU-native parallax, zero JS reflow
          2. Desktop + no CSS support             → Framer Motion (JS fallback)
          3. Mobile                               → plain div, useScroll never instantiated */}
      {applyParallax ? (
        cssScrollDrivenSupported ? (
          <div className={`hero-parallax-layer ${CONTENT_CLASS}`}>
            <HeroBody />
          </div>
        ) : (
          <HeroParallaxJS sectionRef={sectionRef} />
        )
      ) : (
        <div className={CONTENT_CLASS}>
          <HeroBody />
        </div>
      )}

      {/* Scroll indicator — CSS animation, no JS loop */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
      >
        <span className="text-[10px] font-mono text-black/30 dark:text-white/25 tracking-widest uppercase">scroll</span>
        <div
          className="w-px h-8 bg-gradient-to-b from-black/20 dark:from-white/20 to-transparent"
          style={{ animation: 'scroll-bob 1.5s ease-in-out infinite' }}
        />
      </m.div>
    </section>
  );
}

function MagneticButton({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);

  const handleMouseEnter = () => {
    if (!ref.current) return;
    // Read layout once on enter — avoids getBoundingClientRect() on every mousemove (forced reflow)
    rectRef.current = ref.current.getBoundingClientRect();
    ref.current.style.transition = 'transform 0.1s linear';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || !rectRef.current) return;
    const rect = rectRef.current;
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    ref.current.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    rectRef.current = null;
    ref.current.style.transform = 'translate(0, 0)';
    ref.current.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </div>
  );
}
