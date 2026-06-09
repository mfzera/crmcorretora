
import { Link } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';
import {
  ArrowRight,
  Users,
  TrendingUp,
  RefreshCw,
  FileText,
  BarChart3,
  Globe,
  Zap,
  FileCheck,
  MessageSquare,
  Shield,
  FileEdit,
  X,
  Check,
} from 'lucide-react';
import * as m from 'framer-motion/m';
import {
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from 'framer-motion';
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  PLAN_CONFIGS,
  type PlanCycle,
  calculatePlanBill,
  calculatePlanTotal,
  formatBRL,
} from '@ecotech/shared/utils';

const PLAN_ORDER: PlanCycle[] = ['MENSAL', 'SEMESTRAL', 'ANUAL', 'TRIENAL'];

type Highlight = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  desc: string;
  accent: string;
  bg: string;
  border: string;
  details: string[];
};

const highlights: Highlight[] = [
  {
    icon: TrendingUp,
    title: 'Pipeline Kanban',
    desc: 'Funil visual do lead ao fechamento',
    accent: 'var(--color-primary)',
    bg: 'rgba(var(--primary-rgb), 0.10)',
    border: 'rgba(var(--primary-rgb), 0.22)',
    details: [
      'Board drag & drop com etapas personalizáveis',
      'Estágios: Contato → Qualificação → Proposta → Negociação → Fechamento',
      'Métricas de conversão por etapa em tempo real',
      'Histórico completo de movimentações e responsáveis',
      'Filtros por vendedor, período e status',
      'Alertas de oportunidades paradas há mais de X dias',
    ],
  },
  {
    icon: FileText,
    title: 'Cotações',
    desc: 'Propostas ilimitadas com histórico',
    accent: '#60a5fa',
    bg: 'rgba(96,165,250,0.10)',
    border: 'rgba(96,165,250,0.22)',
    details: [
      'Geração de cotações em menos de 2 minutos',
      'Templates personalizáveis por seguradora',
      'Versionamento automático com histórico de alterações',
      'Exportação para PDF com logo da corretora',
      'Aprovação digital pelo cliente via link',
      'Controle de status: rascunho, enviada, aprovada, recusada',
    ],
  },
  {
    icon: RefreshCw,
    title: 'Renovações',
    desc: 'Alertas automáticos de vencimento',
    accent: '#fb923c',
    bg: 'rgba(251,146,60,0.10)',
    border: 'rgba(251,146,60,0.22)',
    details: [
      'Alertas automáticos X dias antes do vencimento',
      'Dashboard centralizado com todos os vencimentos do mês',
      'Renovação em 1 clique aproveitando dados da apólice anterior',
      'Histórico completo de todas as renovações por cliente',
      'Relatório de apólices em risco de churn',
      'Notificações por e-mail e dentro do sistema',
    ],
  },
  {
    icon: BarChart3,
    title: 'Dashboard',
    desc: 'KPIs e comissões em tempo real',
    accent: '#f472b6',
    bg: 'rgba(244,114,182,0.10)',
    border: 'rgba(244,114,182,0.22)',
    details: [
      'KPIs de vendas, comissões e propostas em tempo real',
      'Performance individual e ranking da equipe',
      'Gráficos por período: dia, semana, mês e ano',
      'Taxa de conversão do funil por vendedor',
      'Relatório de comissões prontas para exportar',
      'Metas por usuário com indicador de progresso',
    ],
  },
  {
    icon: Users,
    title: 'CRM Clientes',
    desc: 'Cadastro completo PF e PJ',
    accent: '#a78bfa',
    bg: 'rgba(167,139,250,0.10)',
    border: 'rgba(167,139,250,0.22)',
    details: [
      'Cadastro completo com CPF/CNPJ e validação automática',
      'Múltiplos contatos e endereços por cliente',
      'Histórico de todas as interações, cotações e apólices',
      'Documentos anexos por cliente (CNH, contrato, etc.)',
      'Transferência de carteira entre vendedores',
      'Segmentação por tags e filtros avançados',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Chat',
    desc: 'Colaboração em tempo real',
    accent: '#22d3ee',
    bg: 'rgba(34,211,238,0.10)',
    border: 'rgba(34,211,238,0.22)',
    details: [
      'Chat por contexto: cotação, cliente ou tarefa específica',
      'Menções com @nome para notificar colegas',
      'Histórico completo de conversas por negócio',
      'Notificações em tempo real no sistema',
      'Anexo de arquivos e imagens nas conversas',
      'Indicador de leitura e status online da equipe',
    ],
  },
  {
    icon: FileEdit,
    title: 'Endossos',
    desc: 'Workflow de aprovação',
    accent: '#818cf8',
    bg: 'rgba(129,140,248,0.10)',
    border: 'rgba(129,140,248,0.22)',
    details: [
      'Workflow de aprovação com múltiplos níveis',
      'Tipos: inclusão, exclusão, alteração de dados e suspensão',
      'Cálculo automático de impacto no prêmio',
      'Histórico de todas as alterações com responsável',
      'Integração com a apólice original para rastreabilidade',
      'Notificação ao segurado após aprovação',
    ],
  },
  {
    icon: Shield,
    title: 'Permissões',
    desc: 'Controle granular por cargo',
    accent: '#fbbf24',
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.22)',
    details: [
      'Cargos customizáveis com permissões por módulo',
      'Controle granular: visualizar, criar, editar e excluir',
      'Isolamento total entre corretoras (multi-tenant)',
      'Audit log completo de todas as ações do sistema',
      'Restrição de acesso por carteira de clientes',
      'Relatório de acessos e atividades por usuário',
    ],
  },
];

const valueStats = [
  { icon: Globe,     value: 'Acesso de qualquer lugar', label: 'web e mobile'           },
  { icon: FileCheck, value: '0 planilhas',               label: 'tudo centralizado'      },
  { icon: Zap,       value: '100%',                      label: 'rastreável e auditável' },
] as const;

const trustBadges = ['7 dias grátis', 'Sem cartão de crédito', 'Cancele quando quiser'] as const;

// ── Feature detail modal ──────────────────────────────────────────────────────

function FeatureModal({
  feature,
  onClose,
}: {
  feature: Highlight;
  onClose: () => void;
}) {
  return (
    <m.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(8px)' }} />

      {/* Modal */}
      <m.div
        className="relative w-full max-w-md rounded-2xl overflow-hidden z-10"
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: `0 0 60px ${feature.accent}18, 0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10)`,
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${feature.accent}60, transparent)` }}
        />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: feature.bg,
                  border: `1px solid ${feature.border}`,
                  boxShadow: `0 0 20px ${feature.accent}20`,
                }}
              >
                <feature.icon className="w-5 h-5" style={{ color: feature.accent }} />
              </div>
              <div>
                <h3 className="font-inter font-semibold text-white text-base leading-tight">
                  {feature.title}
                </h3>
                <p className="font-inter text-xs text-white/40 mt-0.5">{feature.desc}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <X className="w-3.5 h-3.5 text-white/50" />
            </button>
          </div>

          {/* Details list */}
          <ul className="space-y-3">
            {feature.details.map((detail, i) => (
              <m.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="flex items-start gap-3"
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: feature.bg, border: `1px solid ${feature.border}` }}
                >
                  <Check className="w-2.5 h-2.5" style={{ color: feature.accent }} strokeWidth={3} />
                </div>
                <span className="font-inter text-sm text-white/65 leading-relaxed">{detail}</span>
              </m.li>
            ))}
          </ul>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/[0.08]">
            <p className="font-inter text-xs text-white/30 text-center">
              Incluso em todos os planos a partir de{' '}
              <span className="text-white/50 font-medium">{formatBRL(PLAN_CONFIGS.TRIENAL.basePrice)}/mês (plano 3 anos)</span>
            </p>
          </div>
        </div>
      </m.div>
    </m.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

export function PricingPreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const isDesktop = useIsDesktop();
  const prefersReducedMotion = useReducedMotion();
  const enableTilt = isDesktop && !prefersReducedMotion;
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const orbY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), { stiffness: 180, damping: 22 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), { stiffness: 180, damping: 22 });

  const glowRef = useRef<HTMLDivElement>(null);
  const cardRectRef = useRef<DOMRect | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !cardRectRef.current) return;
    const rect = cardRectRef.current;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    mouseX.set(nx - 0.5);
    mouseY.set(ny - 0.5);
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(circle 380px at ${nx * 100}% ${ny * 100}%, rgba(255,255,255,0.06) 0%, transparent 70%)`;
    }
  }, [mouseX, mouseY, enableTilt]);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Read layout once on enter — avoids getBoundingClientRect() on every mousemove
    cardRectRef.current = e.currentTarget.getBoundingClientRect();
    if (glowRef.current) glowRef.current.style.opacity = '1';
  }, []);

  const handleMouseLeave = useCallback(() => {
    cardRectRef.current = null;
    mouseX.set(0);
    mouseY.set(0);
    if (glowRef.current) glowRef.current.style.opacity = '0';
  }, [mouseX, mouseY]);

  const [selectedFeature, setSelectedFeature] = useState<Highlight | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<PlanCycle>('TRIENAL');

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 overflow-hidden"
      style={{ background: '#000' }}
    >
      <style>{`
        @keyframes orb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-20px)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,40px)} }
        @keyframes orb3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-25px,-30px)} }
      `}</style>

      {/* Background orbs */}
      <m.div style={{ y: orbY }} className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[5%] right-[-5%] w-[900px] h-[900px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(var(--primary-rgb), 0.28) 0%, transparent 65%)', filter: 'blur(130px)', animation: 'orb1 16s ease-in-out infinite' }} />
        <div className="absolute top-[30%] left-[-10%] w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(var(--primary-rgb), 0.18) 0%, transparent 65%)', filter: 'blur(120px)', animation: 'orb2 20s ease-in-out infinite 3s' }} />
        <div className="absolute bottom-[-5%] right-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(var(--primary-rgb), 0.14) 0%, transparent 65%)', filter: 'blur(120px)', animation: 'orb3 24s ease-in-out infinite 6s' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 20%, rgba(0,0,0,0.65) 100%)' }} />
      </m.div>

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="absolute top-4 left-4 text-[9px] font-mono text-white/15 leading-tight space-y-1 pointer-events-none">
        <div>PRICING_SECTION_01</div>
        <div>per-seat.model</div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 z-10">

        {/* Section header */}
        <div className="max-w-2xl mb-12">
          <m.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="inline-flex items-center gap-2 mb-6">
            <div className="h-px w-8 bg-primary/70" />
            <span className="font-inter text-primary text-xs font-semibold uppercase tracking-widest">Preços simples e justos</span>
          </m.div>
          <div className="overflow-hidden mb-2">
            <m.h2 initial={{ y: 60, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="font-inter text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] text-white">
              Pague apenas pelos
            </m.h2>
          </div>
          <div className="overflow-hidden mb-6">
            <m.h2 initial={{ y: 60, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }} className="font-inter text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] text-white/40">
              usuários que usar
            </m.h2>
          </div>
          <m.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }} className="font-inter text-base sm:text-lg leading-relaxed text-white/50">
            A partir de {formatBRL(PLAN_CONFIGS.TRIENAL.basePrice)}/mês no plano 3 anos. Adicione usuários conforme sua equipe cresce.
          </m.p>
        </div>

        {/* Value stats */}
        <m.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex flex-wrap gap-2 sm:gap-3 mb-10">
          {valueStats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl min-w-0" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)' }}>
              <stat.icon className="w-4 h-4 text-primary/90 flex-shrink-0" />
              <span className="font-inter font-semibold text-white text-xs sm:text-sm">{stat.value}</span>
              <span className="font-inter text-white/50 text-xs sm:text-sm">{stat.label}</span>
            </div>
          ))}
        </m.div>

        {/* Pricing card */}
        <m.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="max-w-5xl" style={{ perspective: enableTilt ? '1200px' : undefined }}>
          <m.div
            style={enableTilt ? { rotateX, rotateY, transformStyle: 'preserve-3d', willChange: 'transform' } : undefined}
            onMouseMove={enableTilt ? handleMouseMove : undefined}
            onMouseEnter={enableTilt ? handleMouseEnter : undefined}
            onMouseLeave={enableTilt ? handleMouseLeave : undefined}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              <div ref={glowRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0, transition: 'opacity 0.3s ease' }} />

              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl-2xl pointer-events-none" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/15 rounded-tr-2xl pointer-events-none" />
              <div className="absolute top-3 right-3 text-[10px] font-mono text-white/20 pointer-events-none">PRICING-01</div>

              <div className="p-5 sm:p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-start">

                  {/* Left: pricing */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-2" style={{ background: 'rgba(var(--primary-rgb), 0.12)', border: '1px solid rgba(var(--primary-rgb), 0.30)', color: 'var(--color-primary)' }}>
                      <Users className="w-4 h-4" />
                      <span className="font-inter">Plano Profissional</span>
                    </div>
                    <p className="font-inter text-xs text-white/30 mb-4">Modelo por usuário · 4 períodos disponíveis</p>

                    {/* Cycle toggle */}
                    <div className="inline-flex rounded-lg p-0.5 mb-6 w-full sm:w-auto" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                      {(['TRIENAL', 'ANUAL', 'MENSAL'] as PlanCycle[]).map((cycle) => (
                        <button
                          key={cycle}
                          onClick={() => setSelectedCycle(cycle)}
                          className="relative flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-md font-inter text-xs font-medium transition-all duration-150"
                          style={selectedCycle === cycle
                            ? { background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--color-primary)', border: '1px solid rgba(var(--primary-rgb), 0.30)' }
                            : { color: 'rgba(255,255,255,0.40)', border: '1px solid transparent' }
                          }
                        >
                          {PLAN_CONFIGS[cycle].label}
                          {PLAN_CONFIGS[cycle].badge && selectedCycle !== cycle && (
                            <span className="hidden sm:inline ml-1.5 text-[9px] font-semibold" style={{ color: 'var(--color-primary)' }}>
                              {PLAN_CONFIGS[cycle].badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="mb-8">
                      <div className="flex items-baseline gap-1.5 sm:gap-2 mb-2 flex-wrap">
                        <span className="font-inter text-5xl sm:text-6xl md:text-7xl font-semibold text-white drop-shadow-lg leading-none">
                          {formatBRL(PLAN_CONFIGS[selectedCycle].basePrice)}
                        </span>
                        <span className="font-inter text-lg sm:text-xl text-white/50 whitespace-nowrap">/mês</span>
                      </div>
                      <p className="font-inter text-sm sm:text-base text-white/55 leading-relaxed">
                        Inclui <span className="font-semibold text-white">3 usuários</span> · {PLAN_CONFIGS[selectedCycle].billingLabel}
                        {PLAN_CONFIGS[selectedCycle].badge && (
                          <span className="ml-2 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>
                            {PLAN_CONFIGS[selectedCycle].badge}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="space-y-2 mb-8">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-inter text-2xl sm:text-3xl font-bold text-primary whitespace-nowrap">
                          +{formatBRL(PLAN_CONFIGS[selectedCycle].pricePerSeat)}
                        </span>
                        <span className="font-inter text-sm text-white/55">por usuário adicional</span>
                      </div>
                      <p className="font-inter text-sm text-white/35 pl-1">Adicione quantos usuários precisar</p>
                    </div>

                    <div className="flex items-start gap-3 p-3.5 rounded-xl mb-8" style={{ background: 'rgba(var(--primary-rgb), 0.07)', border: '1px solid rgba(var(--primary-rgb), 0.20)' }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <p className="font-inter text-sm text-white/60 leading-relaxed">
                        O sistema <span className="text-white font-medium">se paga no primeiro negócio fechado</span>. Sem taxas escondidas.
                      </p>
                    </div>

                    <Button size="lg" className="font-inter w-full md:w-auto bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-md transition-colors duration-200 group" asChild>
                      <Link to="/precos">
                        Ver detalhes completos
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform duration-200" />
                      </Link>
                    </Button>
                  </div>

                  {/* Right: feature tiles */}
                  <div>
                    <p className="font-inter text-xs text-white/40 uppercase tracking-widest font-mono mb-1">
                      Incluso no plano
                    </p>
                    <p className="font-inter text-[11px] text-white/25 mb-4">
                      Clique em qualquer funcionalidade para saber mais
                    </p>
                    <m.div className="grid grid-cols-2 gap-3" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
                      {highlights.map((h) => (
                        <button
                          key={h.title}
                          onClick={() => setSelectedFeature(h)}
                          className="group relative p-3 rounded-xl text-left overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
                        >
                          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${h.accent}18 0%, transparent 70%)` }} />
                          <div className="absolute bottom-0 left-2 right-2 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" style={{ background: `linear-gradient(90deg, ${h.accent}90, transparent)` }} />
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: h.bg, border: `1px solid ${h.border}` }}>
                            <h.icon className="w-3.5 h-3.5" style={{ color: h.accent }} />
                          </div>
                          <p className="font-inter text-xs font-semibold text-white mb-0.5">{h.title}</p>
                          <p className="font-inter text-[11px] text-white/40 leading-snug">{h.desc}</p>
                        </button>
                      ))}
                    </m.div>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="mt-8 pt-6 border-t border-white/[0.10]">
                  <div className="flex flex-wrap items-center gap-6 font-inter text-sm text-white/40">
                    {trustBadges.map((badge) => (
                      <div key={badge} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                        <span>{badge}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </m.div>

          {/* Planos */}
          <div className="mt-6">
            <p className="font-inter text-xs text-white/25 font-mono mb-4 tracking-widest uppercase text-center">Períodos de contrato</p>
            <m.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              {PLAN_ORDER.map((cycle) => {
                const cfg = PLAN_CONFIGS[cycle];
                const isBest = cycle === 'TRIENAL';
                return (
                  <div
                    key={cycle}
                    className="relative cursor-default rounded-xl overflow-hidden transition-transform duration-200 hover:-translate-y-1"
                    style={{ background: isBest ? 'rgba(var(--primary-rgb), 0.06)' : 'rgba(255,255,255,0.04)', border: isBest ? '1px solid rgba(var(--primary-rgb), 0.25)' : '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: isBest ? 'inset 0 1px 0 rgba(var(--primary-rgb), 0.12), 0 0 30px rgba(var(--primary-rgb), 0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
                  >
                    {isBest && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />}
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <span className="font-inter text-xs text-white/40 font-medium">{cfg.label}</span>
                        {cfg.badge && (
                          <span className="font-inter text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: 'rgba(var(--primary-rgb), 0.12)', border: '1px solid rgba(var(--primary-rgb), 0.25)', color: 'var(--color-primary)' }}>
                            {cfg.badge}
                          </span>
                        )}
                      </div>
                      <div className="mb-1 flex items-baseline flex-wrap gap-x-1">
                        <span className="font-inter text-xl sm:text-2xl font-semibold text-white leading-tight">{formatBRL(calculatePlanBill(3, cycle))}</span>
                        <span className="font-inter text-white/35 text-xs sm:text-sm whitespace-nowrap">/mês</span>
                      </div>
                      <p className="font-inter text-white/40 text-xs mb-3">{cfg.shortLabel} · 3 usuários</p>
                      <div className="pt-3 border-t border-white/[0.07] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                        <span className="font-inter text-[11px] text-white/35">{cfg.billingLabel}</span>
                        {cfg.billingMonths > 1 && (
                          <span className="font-inter text-xs font-semibold whitespace-nowrap" style={{ color: isBest ? 'var(--color-primary)' : 'rgba(255,255,255,0.5)' }}>
                            {formatBRL(calculatePlanTotal(3, cycle))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </m.div>
          </div>
        </m.div>
      </div>

      {/* Feature detail modal */}
      <AnimatePresence>
        {selectedFeature && (
          <FeatureModal feature={selectedFeature} onClose={() => setSelectedFeature(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
