
import { Link } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';
import { ArrowRight } from 'lucide-react';
import * as m from 'framer-motion/m';
import { useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

const orbs = [
  { x: '15%', y: '20%', size: 300, color: 'var(--color-primary)', delay: 0 },
  { x: '75%', y: '60%', size: 250, color: 'var(--color-primary)', delay: 0.5 },
  { x: '50%', y: '80%', size: 200, color: '#a855f7', delay: 1 },
];

export function CTA() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 0.95]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.15, 0.85, 1],
    [0, 1, 1, 0.6],
  );

  return (
    <section
      ref={ref}
      className="relative bg-white dark:bg-black py-24 sm:py-32 overflow-hidden"
    >
      {/* Animated orbs */}
      {orbs.map((orb, i) => (
        <m.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, delay: orb.delay, ease: 'easeOut' }}
          className="absolute pointer-events-none"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            transform: 'translate(-50%, -50%)',
            background: orb.color,
            borderRadius: '50%',
            filter: `blur(${orb.size * 0.45}px)`,
            opacity: 0.04,
          }}
        />
      ))}

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

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/8 dark:via-white/8 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
        <m.div style={{ scale, opacity }} className="max-w-3xl">
          {/* Badge */}
          <m.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 mb-8"
          >
            <div className="h-px w-8 bg-primary/60" />
            <span className="font-inter text-primary text-xs font-semibold uppercase tracking-widest">
              Comece hoje
            </span>
          </m.div>

          {/* Headline with stagger */}
          <div className="overflow-hidden mb-4">
            <m.h2
              initial={{ y: 80, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="font-inter text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] text-gray-900 dark:text-white"
            >
              Quer fazer parte?
            </m.h2>
          </div>

          <m.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-inter text-base sm:text-lg leading-relaxed text-gray-500 dark:text-white/45 mb-10 max-w-xl"
          >
            Estamos no início dessa jornada e adoraríamos ter você conosco. Crie
            sua conta e comece a explorar — 7 dias grátis, sem cartão.
          </m.p>

          {/* Buttons */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.7,
              delay: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex flex-col sm:flex-row gap-4 mb-12"
          >
            <Button
              size="lg"
              className="font-inter text-base px-8 h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-md transition-all duration-200 group"
              asChild
            >
              <Link to="/login" search={{ redirect: '' }}>
                <span className="flex items-center">
                  Criar minha conta
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform duration-200" />
                </span>
              </Link>
            </Button>

            <Button
              size="lg"
              variant="ghost"
              className="font-inter text-base px-8 h-12 text-gray-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/8 border border-black/15 dark:border-white/15 hover:border-black/25 dark:hover:border-white/30 rounded-md transition-all duration-200"
              asChild
            >
              <Link to="/contato">Falar conosco</Link>
            </Button>
          </m.div>

          {/* Trust indicators */}
          <m.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center gap-6 font-inter text-sm text-black/30 dark:text-white/30"
          >
            {[
              '7 dias grátis',
              'Sem cartão de crédito',
              'Cancele quando quiser',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                <span>{item}</span>
              </div>
            ))}
          </m.div>
        </m.div>
      </div>
    </section>
  );
}
