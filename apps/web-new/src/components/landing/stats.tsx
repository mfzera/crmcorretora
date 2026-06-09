
import { useRef, useEffect } from 'react';
import * as m from 'framer-motion/m';
import { useInView, animate } from 'framer-motion';

function Counter({
  from,
  to,
  suffix = '',
}: {
  from: number;
  to: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null!);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(from, to, {
      duration: 2.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(v) {
        if (ref.current) {
          ref.current.textContent =
            Math.round(v).toLocaleString('pt-BR') + suffix;
        }
      },
    });
    return controls.stop;
  }, [inView, from, to, suffix]);

  return (
    <span ref={ref}>
      {from}
      {suffix}
    </span>
  );
}

const stats = [
  {
    value: 3000,
    suffix: '+',
    label: 'Clientes ativos',
    sub: 'corretoras confiam no workspace',
    color: 'var(--color-primary)',
  },
  {
    value: 98,
    suffix: '%',
    label: 'Satisfação',
    sub: 'NPS acima de 90 pontos',
    color: '#00e5ff',
  },
  {
    value: 2,
    suffix: 'M+',
    label: 'Em seguros / mês',
    sub: 'gerenciados na plataforma',
    color: '#bf87ff',
  },
];

export function Stats() {
  return (
    <section className="relative bg-black py-24 overflow-hidden">
      {/* Border top/bottom */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[900px] h-[300px] rounded-full blur-[130px]"
          style={{ background: 'rgba(var(--primary-rgb), 0.025)' }}
        />
      </div>

      {/* Dotted foundation grid — Layer 1 */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Fine line grid — Layer 2 */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Dashed vertical guides — Layer 3 */}
      <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pointer-events-none">
        <div
          className="absolute left-6 sm:left-8 lg:left-12 top-0 bottom-0 w-px opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 6px, transparent 6px, transparent 14px)',
          }}
        />
        <div
          className="absolute right-6 sm:right-8 lg:right-12 top-0 bottom-0 w-px opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 6px, transparent 6px, transparent 14px)',
          }}
        />
        <div
          className="absolute left-1/2 top-0 bottom-0 w-px opacity-[0.10]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 8px, transparent 8px, transparent 16px)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/8">
          {stats.map((stat, index) => (
            <m.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{
                duration: 0.7,
                delay: index * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="px-8 py-12 text-center group"
            >
              <div
                className="text-6xl sm:text-7xl font-semibold font-inter tabular-nums mb-3 transition-colors duration-300"
                style={{ color: stat.color }}
              >
                <Counter from={0} to={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-white font-semibold text-lg font-inter mb-1">
                {stat.label}
              </div>
              <div className="text-white/35 text-sm font-inter">{stat.sub}</div>

              {/* Bottom glow line on hover */}
              <m.div
                className="mx-auto mt-4 h-px w-0 group-hover:w-16 transition-all duration-500 rounded-full"
                style={{ background: stat.color }}
              />
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}
