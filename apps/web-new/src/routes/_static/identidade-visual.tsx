import { createFileRoute } from '@tanstack/react-router';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export const Route = createFileRoute('/_static/identidade-visual')({
  component: IdentidadeVisualPage,
});


function IdentidadeVisualPage() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(label);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const colors = {
    brand: {
      title: 'Brand Colors',
      colors: [
        {
          name: 'Emerald Primary',
          hex: 'var(--color-primary)',
          rgb: '0, 255, 135',
          usage: 'Primary accent, CTAs, highlights',
        },
        {
          name: 'Emerald 80',
          hex: '#33ff9f',
          rgb: '51, 255, 159',
          usage: 'Hover states, lighter accents',
        },
        {
          name: 'Emerald 60',
          hex: '#66ffb7',
          rgb: '102, 255, 183',
          usage: 'Subtle backgrounds',
        },
        {
          name: 'Emerald 40',
          hex: '#99ffcf',
          rgb: '153, 255, 207',
          usage: 'Very light accents',
        },
        {
          name: 'Emerald 20',
          hex: '#ccffe7',
          rgb: '204, 255, 231',
          usage: 'Minimal tint',
        },
      ],
    },
    base: {
      title: 'Base Colors',
      colors: [
        {
          name: 'Pure Black',
          hex: '#000000',
          rgb: '0, 0, 0',
          usage: 'Primary background',
        },
        {
          name: 'Pure White',
          hex: '#ffffff',
          rgb: '255, 255, 255',
          usage: 'Primary text, buttons',
        },
        {
          name: 'Near Black',
          hex: '#0a0a0b',
          rgb: '10, 10, 11',
          usage: 'Dark surfaces',
        },
        {
          name: 'Zinc 900',
          hex: '#18181b',
          rgb: '24, 24, 27',
          usage: 'Cards, dropdowns',
        },
      ],
    },
    grays: {
      title: 'Grayscale Palette',
      colors: [
        {
          name: 'Gray 100',
          hex: '#f5f5f5',
          rgb: '245, 245, 245',
          usage: 'Light backgrounds',
        },
        {
          name: 'Gray 200',
          hex: '#e5e5e5',
          rgb: '229, 229, 229',
          usage: 'Borders, dividers',
        },
        {
          name: 'Gray 300',
          hex: '#d4d4d4',
          rgb: '212, 212, 212',
          usage: 'Secondary text',
        },
        {
          name: 'Gray 400',
          hex: '#a3a3a3',
          rgb: '163, 163, 163',
          usage: 'Tertiary text',
        },
        {
          name: 'Gray 600',
          hex: '#525252',
          rgb: '82, 82, 82',
          usage: 'Dark text on light',
        },
        {
          name: 'Gray 800',
          hex: '#262626',
          rgb: '38, 38, 38',
          usage: 'Dark surfaces',
        },
      ],
    },
    semantic: {
      title: 'Semantic Colors',
      colors: [
        {
          name: 'Success',
          hex: '#22c55e',
          rgb: '34, 197, 94',
          usage: 'Success states',
        },
        {
          name: 'Warning',
          hex: '#f59e0b',
          rgb: '245, 158, 11',
          usage: 'Warning states',
        },
        {
          name: 'Info',
          hex: '#3b82f6',
          rgb: '59, 130, 246',
          usage: 'Info states',
        },
        {
          name: 'Destructive',
          hex: '#dc2626',
          rgb: '220, 38, 38',
          usage: 'Error states',
        },
      ],
    },
  };

  const typography = {
    display: [
      {
        name: 'Display XL',
        class: 'text-7xl',
        size: '72px',
        weight: '400',
        lineHeight: '1.1',
        usage: 'Hero headlines',
      },
      {
        name: 'Display L',
        class: 'text-6xl',
        size: '60px',
        weight: '400',
        lineHeight: '1.1',
        usage: 'Section headlines',
      },
      {
        name: 'Display M',
        class: 'text-5xl',
        size: '48px',
        weight: '400',
        lineHeight: '1.1',
        usage: 'Sub-headlines',
      },
    ],
    body: [
      {
        name: 'Body L',
        class: 'text-lg',
        size: '18px',
        weight: '400',
        lineHeight: '1.625',
        usage: 'Large body text',
      },
      {
        name: 'Body M',
        class: 'text-base',
        size: '16px',
        weight: '400',
        lineHeight: '1.5',
        usage: 'Standard body',
      },
      {
        name: 'Body S',
        class: 'text-sm',
        size: '14px',
        weight: '400',
        lineHeight: '1.5',
        usage: 'Small text, labels',
      },
    ],
    technical: [
      {
        name: 'Mono M',
        class: 'text-[10px]',
        size: '10px',
        weight: '400',
        lineHeight: '1.4',
        usage: 'Technical labels',
      },
      {
        name: 'Mono S',
        class: 'text-[8px]',
        size: '8px',
        weight: '400',
        lineHeight: '1.4',
        usage: 'Annotations',
      },
    ],
  };

  const spacing = [
    { name: '1', value: '4px', usage: 'Tight spacing, icon gaps' },
    { name: '2', value: '8px', usage: 'Compact elements' },
    { name: '4', value: '16px', usage: 'Standard gap, margins' },
    { name: '6', value: '24px', usage: 'Section spacing' },
    { name: '8', value: '32px', usage: 'Component separation' },
    { name: '12', value: '48px', usage: 'Large gaps' },
    { name: '16', value: '64px', usage: 'Section padding' },
    { name: '24', value: '96px', usage: 'Major section spacing' },
    { name: '32', value: '128px', usage: 'Hero padding' },
  ];

  return (
    <main className="min-h-screen bg-black text-white pt-16">
      {/* Dense grid background */}
      <div
        className="fixed inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <div className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
              DESIGN_SYSTEM_V1
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] mb-8">
              Identidade Visual
            </h1>
            <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-6">
              SECTION_01 / INTRODUCTION
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.1] mb-6">
              Um sistema de design técnico e minimalista
            </h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              Nossa identidade visual é construída sobre princípios de precisão
              técnica, contraste extremo e uma estética de grid que revela a
              estrutura por trás do design. Cada elemento é medido, cada espaço
              é intencional.
            </p>
          </motion.div>
        </section>

        {/* Color Palette Section */}
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 relative">
          <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-8">
            SECTION_02 / COLOR_SYSTEM
          </div>
          <h3 className="text-3xl sm:text-4xl font-normal mb-12">
            Paleta de Cores
          </h3>

          <div className="space-y-16">
            {Object.entries(colors).map(([key, group], groupIndex) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: groupIndex * 0.1 }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <h4 className="text-xl font-medium text-white">
                    {group.title}
                  </h4>
                  <div className="flex-1 h-px bg-white/10" />
                  <div className="text-[8px] font-mono text-white/25">
                    {group.colors.length} colors
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.colors.map((color, index) => (
                    <motion.div
                      key={color.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className="border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-colors group"
                    >
                      {/* Color swatch */}
                      <div
                        className="h-32 relative"
                        style={{ backgroundColor: color.hex }}
                      >
                        <div className="absolute top-2 left-2 text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                            {color.hex.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Color info */}
                      <div className="p-4 bg-zinc-900 relative">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="text-sm font-medium">{color.name}</h5>
                          <button
                            onClick={() =>
                              copyToClipboard(color.hex, color.name)
                            }
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            {copiedColor === color.name ? (
                              <Check className="w-3 h-3 text-primary" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 space-y-1">
                          <div>HEX: {color.hex.toUpperCase()}</div>
                          <div>RGB: {color.rgb}</div>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-2 border-t border-white/5 pt-2">
                          {color.usage}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Typography Section */}
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 relative">
          <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-8">
            SECTION_03 / TYPOGRAPHY_SCALE
          </div>
          <h3 className="text-3xl sm:text-4xl font-normal mb-12">Tipografia</h3>

          <div className="space-y-12">
            {/* Display */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-4 mb-6">
                <h4 className="text-xl font-medium">Display</h4>
                <div className="flex-1 h-px bg-white/10" />
                <div className="text-[8px] font-mono text-white/25">
                  Inter / Normal
                </div>
              </div>
              <div className="space-y-6">
                {typography.display.map((type, index) => (
                  <div
                    key={type.name}
                    className="border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="text-[10px] font-mono text-gray-400 mb-2">
                          {type.name}
                        </div>
                        <div
                          className={`${type.class} font-normal leading-tight`}
                        >
                          Gestão completa
                        </div>
                      </div>
                      <div className="text-[9px] font-mono text-gray-500 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <div>{type.size}</div>
                        <div className="mt-1">weight: {type.weight}</div>
                        <div>line-height: {type.lineHeight}</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 border-t border-white/5 pt-3">
                      {type.usage}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Body */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="flex items-center gap-4 mb-6">
                <h4 className="text-xl font-medium">Body</h4>
                <div className="flex-1 h-px bg-white/10" />
                <div className="text-[8px] font-mono text-white/25">
                  Inter / Regular
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {typography.body.map((type) => (
                  <div
                    key={type.name}
                    className="border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors"
                  >
                    <div className="text-[10px] font-mono text-gray-400 mb-3">
                      {type.name}
                    </div>
                    <div className={`${type.class} text-gray-300 mb-4`}>
                      Sistema inteligente que simplifica cotações, propostas e
                      renovações.
                    </div>
                    <div className="text-[9px] font-mono text-gray-500 space-y-1">
                      <div>
                        {type.size} / {type.weight}
                      </div>
                      <div>line-height: {type.lineHeight}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Technical */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center gap-4 mb-6">
                <h4 className="text-xl font-medium">Technical</h4>
                <div className="flex-1 h-px bg-white/10" />
                <div className="text-[8px] font-mono text-white/25">
                  Geist Mono / Monospace
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {typography.technical.map((type) => (
                  <div
                    key={type.name}
                    className="border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors bg-zinc-900"
                  >
                    <div className="text-[10px] font-mono text-gray-400 mb-3">
                      {type.name}
                    </div>
                    <div
                      className={`${type.class} font-mono text-white/25 mb-4`}
                    >
                      SECTION_LABEL_01 / component.max-w-7xl.mx-auto
                    </div>
                    <div className="text-[9px] font-mono text-gray-500">
                      {type.size} / Usage: {type.usage}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Spacing System */}
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 relative">
          <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-8">
            SECTION_04 / SPACING_RHYTHM
          </div>
          <h3 className="text-3xl sm:text-4xl font-normal mb-12">
            Sistema de Espaçamento
          </h3>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="border border-white/10 rounded-lg overflow-hidden"
          >
            <div className="bg-zinc-900 p-4 border-b border-white/10">
              <div className="text-[10px] font-mono text-gray-400">
                Tailwind Spacing Scale
              </div>
            </div>
            <div className="divide-y divide-white/10">
              {spacing.map((space, index) => (
                <motion.div
                  key={space.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="p-4 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 text-right">
                      <div className="text-sm font-mono text-white">
                        {space.name}
                      </div>
                      <div className="text-[10px] font-mono text-gray-500">
                        {space.value}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div
                        className="h-8 bg-primary rounded relative"
                        style={{ width: space.value }}
                      >
                        <div className="absolute -top-6 left-0 text-[8px] font-mono text-white/25 opacity-0 group-hover:opacity-100 transition-opacity">
                          {space.value}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 w-48">
                      {space.usage}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Grid Philosophy - NEW EXPANDED SECTION */}
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 relative">
          <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-8">
            SECTION_05 / GRID_PHILOSOPHY
          </div>
          <h3 className="text-3xl sm:text-4xl font-normal mb-6">
            O Grid: O Detalhe que Define o Design
          </h3>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mb-20"
          >
            <p className="text-lg text-gray-300 leading-relaxed mb-6">
              O sistema de grid não é apenas uma ferramenta de alinhamento — é a
              alma visual da nossa identidade. Ele revela a estrutura, celebra a
              precisão técnica e transforma o vazio em algo intencional.
            </p>
            <p className="text-base text-gray-400 leading-relaxed">
              Enquanto a maioria dos designs esconde sua estrutura, nós a
              expomos. O grid é visível, presente, pulsante. Ele comunica ordem,
              transparência e atenção aos detalhes antes mesmo que o usuário
              leia uma palavra.
            </p>
          </motion.div>

          {/* The Three Layers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-20"
          >
            <h4 className="text-2xl font-normal mb-12">
              As Três Camadas Fundamentais
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Layer 1 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="border border-white/10 rounded-lg overflow-hidden group hover:border-primary/50 transition-colors"
              >
                <div className="bg-zinc-900 p-4 border-b border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-mono text-primary">
                      LAYER_01
                    </div>
                    <div className="text-[10px] font-mono text-white/25">
                      BASE
                    </div>
                  </div>
                  <h5 className="text-lg font-medium">Dotted Foundation</h5>
                </div>
                <div className="relative h-64 bg-black">
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                    }}
                  />
                  {/* Zoom detail indicator */}
                  <div className="absolute bottom-4 right-4 border border-white/20 rounded p-2 bg-black/80 backdrop-blur-sm">
                    <div
                      className="w-16 h-16 opacity-60"
                      style={{
                        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 2px, transparent 2px)`,
                        backgroundSize: '12px 12px',
                      }}
                    />
                    <div className="text-[8px] font-mono text-white/40 mt-1 text-center">
                      zoom 2x
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/50 space-y-3">
                  <div>
                    <div className="text-[10px] font-mono text-gray-400 mb-2">
                      ESPECIFICAÇÕES TÉCNICAS
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="border border-white/5 rounded p-2">
                        <div className="text-white/50 mb-1">Tamanho</div>
                        <div className="text-white font-mono">24×24px</div>
                      </div>
                      <div className="border border-white/5 rounded p-2">
                        <div className="text-white/50 mb-1">Dot</div>
                        <div className="text-white font-mono">1px</div>
                      </div>
                      <div className="border border-white/5 rounded p-2">
                        <div className="text-white/50 mb-1">Opacidade</div>
                        <div className="text-white font-mono">15-50%</div>
                      </div>
                      <div className="border border-white/5 rounded p-2">
                        <div className="text-white/50 mb-1">Cor</div>
                        <div className="text-white font-mono">white</div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <div className="text-[10px] font-mono text-gray-400 mb-2">
                      FUNÇÃO
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      A base sutil que cria textura e profundidade sem competir
                      com o conteúdo. Presente mas nunca dominante. Estabelece a
                      menor unidade do sistema (24px = spacing-6).
                    </p>
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <div className="text-[10px] font-mono text-gray-400 mb-2">
                      QUANDO USAR
                    </div>
                    <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                      <li>Fundos de páginas e seções</li>
                      <li>Áreas de conteúdo extenso</li>
                      <li>Sempre presente em toda a UI</li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* Layer 2 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="border border-white/10 rounded-lg overflow-hidden group hover:border-primary/50 transition-colors"
              >
                <div className="bg-zinc-900 p-4 border-b border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-mono text-primary">
                      LAYER_02
                    </div>
                    <div className="text-[10px] font-mono text-white/25">
                      STRUCTURE
                    </div>
                  </div>
                  <h5 className="text-lg font-medium">Fine Line Grid</h5>
                </div>
                <div className="relative h-64 bg-black">
                  {/* Base dots for context */}
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                    }}
                  />
                  {/* Grid lines */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: '48px 48px',
                    }}
                  />
                  {/* Measurement indicators */}
                  <div className="absolute top-4 left-4">
                    <div className="flex items-center gap-2 text-[8px] font-mono text-white/40">
                      <div className="w-12 h-px bg-white/40" />
                      <span>48px</span>
                      <div className="w-12 h-px bg-white/40" />
                    </div>
                  </div>
                  <div className="absolute top-4 left-4">
                    <div className="flex flex-col items-start gap-2 text-[8px] font-mono text-white/40">
                      <div className="h-12 w-px bg-white/40 ml-6" />
                      <span className="-ml-1">48px</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/50 space-y-3">
                  <div>
                    <div className="text-[10px] font-mono text-gray-400 mb-2">
                      ESPECIFICAÇÕES TÉCNICAS
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="border border-white/5 rounded p-2">
                        <div className="text-white/50 mb-1">Tamanho</div>
                        <div className="text-white font-mono">48×48px</div>
                      </div>
                      <div className="border border-white/5 rounded p-2">
                        <div className="text-white/50 mb-1">Linha</div>
                        <div className="text-white font-mono">1px</div>
                      </div>
                      <div className="border border-white/5 rounded p-2">
                        <div className="text-white/50 mb-1">Opacidade</div>
                        <div className="text-white font-mono">10-20%</div>
                      </div>
                      <div className="border border-white/5 rounded p-2">
                        <div className="text-white/50 mb-1">Tipo</div>
                        <div className="text-white font-mono">linear</div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <div className="text-[10px] font-mono text-gray-400 mb-2">
                      FUNÇÃO
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      A estrutura ortogonal que organiza e subdivide o espaço.
                      Define zonas sem barreiras visuais rígidas. Múltiplo de 2×
                      do dot grid (48px = spacing-12).
                    </p>
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <div className="text-[10px] font-mono text-gray-400 mb-2">
                      QUANDO USAR
                    </div>
                    <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                      <li>Hero sections com grande impacto</li>
                      <li>Áreas de layout complexo</li>
                      <li>Combinado com Layer 1 para densidade</li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* Layer 3 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="border border-white/10 rounded-lg overflow-hidden group hover:border-primary/50 transition-colors"
              >
                <div className="bg-zinc-900 p-4 border-b border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-mono text-primary">
                      LAYER_03
                    </div>
                    <div className="text-[10px] font-mono text-white/25">
                      GUIDES
                    </div>
                  </div>
                  <h5 className="text-lg font-medium">Dashed Guides</h5>
                </div>
                <div className="relative h-64 bg-black">
                  {/* Base grid for context */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                    }}
                  />
                  {/* Vertical guides */}
                  <div
                    className="absolute left-12 top-0 bottom-0 w-px opacity-50"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(0deg, rgba(var(--primary-rgb), 0.6), rgba(var(--primary-rgb), 0.6) 8px, transparent 8px, transparent 16px)',
                    }}
                  />
                  <div
                    className="absolute right-12 top-0 bottom-0 w-px opacity-50"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(0deg, rgba(var(--primary-rgb), 0.6), rgba(var(--primary-rgb), 0.6) 8px, transparent 8px, transparent 16px)',
                    }}
                  />
                  <div
                    className="absolute left-1/2 top-0 bottom-0 w-px opacity-30"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)',
                    }}
                  />
                  {/* Horizontal guide */}
                  <div
                    className="absolute top-8 left-0 right-0 h-px opacity-40"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.5) 8px, transparent 8px, transparent 16px)',
                    }}
                  />
                  {/* Labels */}
                  <div className="absolute top-2 left-12 text-[8px] font-mono text-primary">
                    edge
                  </div>
                  <div className="absolute top-2 right-12 text-[8px] font-mono text-primary">
                    edge
                  </div>
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-mono text-white/40">
                    center
                  </div>
                  {/* Dash detail zoom */}
                  <div className="absolute bottom-4 right-4 border border-white/20 rounded p-2 bg-black/80 backdrop-blur-sm">
                    <div className="flex items-center gap-px">
                      <div className="w-3 h-6 bg-primary/60" />
                      <div className="w-3 h-6 bg-transparent" />
                      <div className="w-3 h-6 bg-primary/60" />
                      <div className="w-3 h-6 bg-transparent" />
                    </div>
                    <div className="text-[8px] font-mono text-white/40 mt-1 text-center">
                      8px / 16px
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/50 space-y-3">
                  <div>
                    <div className="text-[10px] font-mono text-gray-400 mb-2">
                      ESPECIFICAÇÕES TÉCNICAS
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="border border-white/5 rounded p-2">
                        <div className="text-white/50 mb-1">Dash</div>
                        <div className="text-white font-mono">8px</div>
                      </div>
                      <div className="border border-white/5 rounded p-2">
                        <div className="text-white/50 mb-1">Gap</div>
                        <div className="text-white font-mono">16px</div>
                      </div>
                      <div className="border border-white/5 rounded p-2">
                        <div className="text-white/50 mb-1">Opacidade</div>
                        <div className="text-white font-mono">20-50%</div>
                      </div>
                      <div className="border border-white/5 rounded p-2">
                        <div className="text-white/50 mb-1">Largura</div>
                        <div className="text-white font-mono">1px</div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <div className="text-[10px] font-mono text-gray-400 mb-2">
                      FUNÇÃO
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      As linhas-guia que demarcam áreas críticas: bordas de
                      container, seções, pontos de alinhamento principais. Guias
                      podem ser destacadas em emerald (var(--color-primary)) para ênfase.
                    </p>
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <div className="text-[10px] font-mono text-gray-400 mb-2">
                      QUANDO USAR
                    </div>
                    <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                      <li>Container edges (left/right padding)</li>
                      <li>Divisões de seção (1/2, 1/3, 1/4)</li>
                      <li>Pontos de ancoragem de conteúdo</li>
                      <li>Destacar em verde áreas principais</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Grid Density Strategy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-20"
          >
            <h4 className="text-2xl font-normal mb-8">Densidade Estratégica</h4>
            <p className="text-base text-gray-400 leading-relaxed mb-12 max-w-3xl">
              O grid não é uniforme — ele se adapta ao contexto. Em momentos de
              ação (hero, CTAs), o grid é denso, criando tensão visual. Em áreas
              de leitura, ele recua, permitindo foco no conteúdo.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Dense Grid */}
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="bg-zinc-900 p-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h5 className="text-lg font-medium">High Density</h5>
                    <div className="text-[10px] font-mono text-primary">
                      HERO / CTA
                    </div>
                  </div>
                </div>
                <div className="relative h-64 bg-black">
                  {/* All layers combined */}
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: '48px 48px',
                    }}
                  />
                  {/* Multiple vertical guides */}
                  {[16.67, 33.33, 50, 66.67, 83.33].map((pos, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px opacity-20"
                      style={{
                        left: `${pos}%`,
                        backgroundImage:
                          'repeating-linear-gradient(0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 6px, transparent 6px, transparent 12px)',
                      }}
                    />
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-normal mb-2">
                        Máxima Tensão
                      </div>
                      <div className="text-[10px] font-mono text-white/40">
                        Dots + Lines + Guides (6-12 cols)
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/50">
                  <p className="text-sm text-gray-400">
                    Grid denso cria energia, movimento e precisão técnica. Usado
                    para capturar atenção e comunicar sofisticação.
                  </p>
                </div>
              </div>

              {/* Light Grid */}
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="bg-zinc-900 p-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h5 className="text-lg font-medium">Low Density</h5>
                    <div className="text-[10px] font-mono text-primary">
                      CONTENT
                    </div>
                  </div>
                </div>
                <div className="relative h-64 bg-black">
                  {/* Only base dots */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                    }}
                  />
                  {/* Just edge guides */}
                  <div
                    className="absolute left-8 top-0 bottom-0 w-px opacity-25"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 8px, transparent 8px, transparent 16px)',
                    }}
                  />
                  <div
                    className="absolute right-8 top-0 bottom-0 w-px opacity-25"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 8px, transparent 8px, transparent 16px)',
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center px-12">
                    <div className="text-center">
                      <div className="text-lg text-gray-300 mb-4 leading-relaxed">
                        Grid sutil permite que o conteúdo respire. Apenas a
                        estrutura essencial permanece visível, mantendo
                        coerência sem distração.
                      </div>
                      <div className="text-[10px] font-mono text-white/40">
                        Dots + Edge guides only
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/50">
                  <p className="text-sm text-gray-400">
                    Grid recuado para áreas de leitura, mantendo estrutura mas
                    priorizando legibilidade e conforto visual.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Grid in Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-20"
          >
            <h4 className="text-2xl font-normal mb-8">
              Grid em Ação: Exemplos Reais
            </h4>

            <div className="space-y-8">
              {/* Hero Example */}
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="bg-zinc-900 p-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h5 className="text-lg font-medium">Hero Section</h5>
                    <div className="text-[10px] font-mono text-gray-400">
                      Container: max-w-7xl / Guides: edges + quarters + eighths
                    </div>
                  </div>
                </div>
                <div className="relative h-96 bg-black overflow-hidden">
                  {/* Full grid system */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: '48px 48px',
                    }}
                  />

                  {/* Container guides */}
                  <div className="absolute inset-0 max-w-7xl mx-auto px-12">
                    <div
                      className="absolute left-12 top-0 bottom-0 w-px opacity-40"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(0deg, rgba(var(--primary-rgb), 0.4), rgba(var(--primary-rgb), 0.4) 8px, transparent 8px, transparent 16px)',
                      }}
                    />
                    <div
                      className="absolute right-12 top-0 bottom-0 w-px opacity-40"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(0deg, rgba(var(--primary-rgb), 0.4), rgba(var(--primary-rgb), 0.4) 8px, transparent 8px, transparent 16px)',
                      }}
                    />
                    <div
                      className="absolute left-1/4 top-0 bottom-0 w-px opacity-20"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(0deg, rgba(255,255,255,0.2), rgba(255,255,255,0.2) 8px, transparent 8px, transparent 16px)',
                      }}
                    />
                    <div
                      className="absolute left-1/2 top-0 bottom-0 w-px opacity-25"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 8px, transparent 8px, transparent 16px)',
                      }}
                    />
                    <div
                      className="absolute left-3/4 top-0 bottom-0 w-px opacity-20"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(0deg, rgba(255,255,255,0.2), rgba(255,255,255,0.2) 8px, transparent 8px, transparent 16px)',
                      }}
                    />
                  </div>

                  {/* Simulated content */}
                  <div className="relative z-10 max-w-7xl mx-auto px-12 h-full flex items-center">
                    <div className="max-w-3xl">
                      <div className="text-[10px] font-mono text-primary mb-4 uppercase tracking-wider">
                        CRM
                      </div>
                      <div className="text-5xl lg:text-6xl font-normal leading-tight mb-6">
                        Gestão completa para sua corretora de seguros
                      </div>
                      <p className="text-lg text-gray-300 mb-8 max-w-2xl">
                        Sistema inteligente que simplifica cotações, propostas,
                        renovações e muito mais.
                      </p>
                      <div className="flex gap-4">
                        <div className="px-8 h-12 bg-white text-black rounded-md flex items-center text-base font-medium">
                          Começar teste grátis
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Annotations */}
                  <div className="absolute top-4 left-4 text-[8px] font-mono text-white/30">
                    Grid: Dense / Edges highlighted in green
                  </div>
                  <div className="absolute bottom-4 right-4 text-[8px] font-mono text-white/30">
                    Content: max-w-3xl / Aligned to left guide
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/50">
                  <p className="text-sm text-gray-400">
                    <strong className="text-white">Observação:</strong> As
                    linhas verdes (emerald) marcam as bordas do container. O
                    conteúdo se alinha à esquerda respeitando o guide, enquanto
                    os guides de subdivisão criam ritmo visual no espaço vazio.
                  </p>
                </div>
              </div>

              {/* Card Grid Example */}
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="bg-zinc-900 p-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h5 className="text-lg font-medium">Card Grid Layout</h5>
                    <div className="text-[10px] font-mono text-gray-400">
                      3-column / Gap-4 (16px) / Aligned to grid
                    </div>
                  </div>
                </div>
                <div className="relative h-80 bg-black overflow-hidden">
                  {/* Subtle grid */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                      backgroundSize: '24px 24px',
                    }}
                  />

                  {/* 3-column guides */}
                  <div className="absolute inset-0 max-w-7xl mx-auto px-12">
                    {[0, 33.33, 66.67, 100].map((pos, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 w-px opacity-30"
                        style={{
                          left: `calc(${pos}% ${pos !== 0 && pos !== 100 ? '- 8px' : ''})`,
                          backgroundImage:
                            'repeating-linear-gradient(0deg, rgba(var(--primary-rgb), 0.3), rgba(var(--primary-rgb), 0.3) 8px, transparent 8px, transparent 16px)',
                        }}
                      />
                    ))}
                  </div>

                  {/* Cards */}
                  <div className="relative z-10 max-w-7xl mx-auto px-12 h-full flex items-center">
                    <div className="grid grid-cols-3 gap-4 w-full">
                      {[1, 2, 3].map((num) => (
                        <div
                          key={num}
                          className="border border-white/10 rounded-lg p-6 bg-zinc-900/50"
                        >
                          <div className="text-sm font-medium mb-2">
                            Card {num}
                          </div>
                          <div className="text-xs text-gray-400">
                            Cards se alinham perfeitamente às colunas do grid,
                            mantendo hierarquia visual.
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 text-[8px] font-mono text-white/30">
                    Grid: 3-col / Cards aligned to column guides
                  </div>
                </div>
                <div className="p-4 bg-zinc-900/50">
                  <p className="text-sm text-gray-400">
                    <strong className="text-white">Observação:</strong> Cards
                    não flutuam livremente — eles se ancoram nas colunas do
                    grid. Gaps de 16px (gap-4) criam respiração consistente.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Technical Specifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h4 className="text-2xl font-normal mb-8">
              Especificações Técnicas
            </h4>

            <div className="border border-white/10 rounded-lg overflow-hidden">
              <div className="bg-zinc-900 p-4 border-b border-white/10">
                <div className="text-[10px] font-mono text-gray-400">
                  CSS IMPLEMENTATION
                </div>
              </div>
              <div className="p-6 bg-zinc-900/30 font-mono text-[11px] space-y-6">
                <div>
                  <div className="text-white/50 mb-2">
                    /* Dotted Grid Pattern */
                  </div>
                  <div className="text-primary">background-image: </div>
                  <div className="pl-4 text-gray-300">
                    radial-gradient(circle, rgba(255,255,255,0.15) 1px,
                    transparent 1px);
                  </div>
                  <div className="text-primary">background-size: </div>
                  <div className="pl-4 text-gray-300">24px 24px;</div>
                  <div className="text-primary">opacity: </div>
                  <div className="pl-4 text-gray-300">
                    0.2 - 0.5;{' '}
                    <span className="text-white/40">
                      /* Context dependent */
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-white/50 mb-2">/* Fine Line Grid */</div>
                  <div className="text-primary">background-image: </div>
                  <div className="pl-4 text-gray-300">
                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  </div>
                  <div className="pl-4 text-gray-300">
                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px,
                    transparent 1px);
                  </div>
                  <div className="text-primary">background-size: </div>
                  <div className="pl-4 text-gray-300">48px 48px;</div>
                  <div className="text-primary">opacity: </div>
                  <div className="pl-4 text-gray-300">0.15;</div>
                </div>

                <div>
                  <div className="text-white/50 mb-2">
                    /* Dashed Guide Lines */
                  </div>
                  <div className="text-primary">background-image: </div>
                  <div className="pl-4 text-gray-300">
                    repeating-linear-gradient(
                  </div>
                  <div className="pl-8 text-gray-300">
                    0deg, <span className="text-white/40">/* Vertical */</span>
                  </div>
                  <div className="pl-8 text-gray-300">
                    rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px,
                  </div>
                  <div className="pl-8 text-gray-300">
                    transparent 8px, transparent 16px
                  </div>
                  <div className="pl-4 text-gray-300">);</div>
                  <div className="text-primary">width: </div>
                  <div className="pl-4 text-gray-300">1px;</div>
                  <div className="text-primary">opacity: </div>
                  <div className="pl-4 text-gray-300">
                    0.2 - 0.5;{' '}
                    <span className="text-white/40">
                      /* Hierarchy dependent */
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 text-white/40">
                  <div>// Position guides at:</div>
                  <div>
                    // - Container edges (left-6, right-6 or left-12, right-12)
                  </div>
                  <div>// - Center (left-1/2)</div>
                  <div>// - Quarters (left-1/4, left-3/4)</div>
                  <div>// - Eighths (left-[12.5%], left-[37.5%], etc.)</div>
                  <div>// - Custom n-column grids for specific sections</div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Original Grid Visualization - simplified now */}
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 relative">
          <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-8">
            SECTION_06 / GRID_VARIATIONS
          </div>
          <h3 className="text-3xl sm:text-4xl font-normal mb-12">
            Variações de Grid
          </h3>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Dotted Pattern */}
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <div className="bg-zinc-900 p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Dotted Grid Pattern</div>
                  <div className="text-[10px] font-mono text-gray-400">
                    24×24px / opacity: 15-50%
                  </div>
                </div>
              </div>
              <div className="relative h-48 bg-black">
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-[10px] font-mono text-white/50 text-center">
                    <div>radial-gradient pattern</div>
                    <div className="mt-1">1px dots / 24px spacing</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Grid */}
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <div className="bg-zinc-900 p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Fine Line Grid</div>
                  <div className="text-[10px] font-mono text-gray-400">
                    48×48px / opacity: 15%
                  </div>
                </div>
              </div>
              <div className="relative h-48 bg-black">
                <div
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '48px 48px',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-[10px] font-mono text-white/50 text-center">
                    <div>linear-gradient pattern</div>
                    <div className="mt-1">1px lines / 48px spacing</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashed Guides */}
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <div className="bg-zinc-900 p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Dashed Guide Lines</div>
                  <div className="text-[10px] font-mono text-gray-400">
                    8px dash / 16px gap / opacity: 20-50%
                  </div>
                </div>
              </div>
              <div className="relative h-48 bg-black">
                {/* Vertical guides */}
                <div
                  className="absolute left-12 top-0 bottom-0 w-px opacity-40"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)',
                  }}
                />
                <div
                  className="absolute right-12 top-0 bottom-0 w-px opacity-40"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)',
                  }}
                />
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px opacity-25"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 8px, transparent 8px, transparent 16px)',
                  }}
                />

                {/* Horizontal guides */}
                <div
                  className="absolute top-0 left-0 right-0 h-px opacity-50"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.5) 8px, transparent 8px, transparent 16px)',
                  }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 h-px opacity-50"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.5) 8px, transparent 8px, transparent 16px)',
                  }}
                />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-[10px] font-mono text-white/50 text-center">
                    <div>repeating-linear-gradient guides</div>
                    <div className="mt-1">
                      container edges + center + subdivisions
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Component Anatomy */}
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 pb-32 relative">
          <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-8">
            SECTION_07 / COMPONENT_ANATOMY
          </div>
          <h3 className="text-3xl sm:text-4xl font-normal mb-12">
            Anatomia de Componentes
          </h3>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Button Anatomy */}
            <div className="border border-white/10 rounded-lg p-8 bg-zinc-900/50">
              <div className="flex items-center gap-4 mb-8">
                <h4 className="text-xl font-medium">Button (Large)</h4>
                <div className="flex-1 h-px bg-white/10" />
                <div className="text-[10px] font-mono text-gray-400">
                  Primary Variant
                </div>
              </div>

              <div className="flex flex-col items-center gap-8">
                <div className="relative">
                  <button className="font-inter text-base px-8 h-12 bg-white hover:bg-gray-100 text-black font-medium rounded-md transition-colors">
                    Começar teste grátis
                  </button>

                  {/* Annotations */}
                  <div className="absolute -top-8 left-0 text-[8px] font-mono text-white/50">
                    height: 48px (h-12)
                  </div>
                  <div className="absolute -bottom-8 left-0 text-[8px] font-mono text-white/50">
                    padding-x: 32px (px-8)
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 -left-24 text-[8px] font-mono text-white/50 text-right w-20">
                    bg-white
                    <br />
                    text-black
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 -right-28 text-[8px] font-mono text-white/50 w-24">
                    font-medium
                    <br />
                    text-base (16px)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full text-[10px] font-mono text-gray-400">
                  <div className="p-3 border border-white/10 rounded">
                    <div className="text-white mb-1">Height</div>
                    <div>48px (h-12)</div>
                  </div>
                  <div className="p-3 border border-white/10 rounded">
                    <div className="text-white mb-1">Padding X</div>
                    <div>32px (px-8)</div>
                  </div>
                  <div className="p-3 border border-white/10 rounded">
                    <div className="text-white mb-1">Font Size</div>
                    <div>16px (text-base)</div>
                  </div>
                  <div className="p-3 border border-white/10 rounded">
                    <div className="text-white mb-1">Border Radius</div>
                    <div>10px (rounded-md)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Anatomy */}
            <div className="border border-white/10 rounded-lg p-8 bg-zinc-900/50">
              <div className="flex items-center gap-4 mb-8">
                <h4 className="text-xl font-medium">Card Component</h4>
                <div className="flex-1 h-px bg-white/10" />
                <div className="text-[10px] font-mono text-gray-400">
                  Standard Card
                </div>
              </div>

              <div className="flex flex-col items-center gap-8">
                <div className="relative w-full max-w-md">
                  <div className="border border-white/10 rounded-lg p-6 bg-zinc-900">
                    <div className="text-sm font-medium text-white mb-2">
                      Card Title
                    </div>
                    <p className="text-sm text-gray-400">
                      Card content with description and additional information
                      displayed here.
                    </p>
                  </div>

                  {/* Annotations */}
                  <div className="absolute -top-8 left-0 text-[8px] font-mono text-white/50">
                    border: 1px solid white/10
                  </div>
                  <div className="absolute -bottom-8 right-0 text-[8px] font-mono text-white/50">
                    padding: 24px (p-6)
                  </div>
                  <div className="absolute top-0 -right-32 text-[8px] font-mono text-white/50 w-28">
                    bg-zinc-900
                    <br />
                    rounded-lg (10px)
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 w-full text-[10px] font-mono text-gray-400">
                  <div className="p-3 border border-white/10 rounded">
                    <div className="text-white mb-1">Padding</div>
                    <div>24px (p-6)</div>
                  </div>
                  <div className="p-3 border border-white/10 rounded">
                    <div className="text-white mb-1">Border</div>
                    <div>1px / white/10</div>
                  </div>
                  <div className="p-3 border border-white/10 rounded">
                    <div className="text-white mb-1">Radius</div>
                    <div>10px (rounded-lg)</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-white/10 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-400">
              © 2026 ecotech. Design System v1.0
            </div>
            <div className="text-[10px] font-mono text-white/25">
              BUILT_WITH_PRECISION
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
