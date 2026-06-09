import { createFileRoute } from '@tanstack/react-router';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export const Route = createFileRoute('/_static/branding')({
  component: BrandingPage,
});


function BrandingPage() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(label);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const PRIMARY = '#2563EB';
  const PRIMARY_RGB = '37, 99, 235';

  const colors = {
    brand: {
      title: 'Brand Colors',
      colors: [
        {
          name: 'Blue Primary',
          hex: '#2563EB',
          rgb: '37, 99, 235',
          usage: 'Cor primária, CTAs, destaques',
        },
        {
          name: 'Blue 700',
          hex: '#1D4ED8',
          rgb: '29, 78, 216',
          usage: 'Hover, pressed states',
        },
        {
          name: 'Blue 500',
          hex: '#3B82F6',
          rgb: '59, 130, 246',
          usage: 'Variação clara, ícones',
        },
        {
          name: 'Blue 300',
          hex: '#93C5FD',
          rgb: '147, 197, 253',
          usage: 'Fundos sutis, badges',
        },
        {
          name: 'Blue 100',
          hex: '#DBEAFE',
          rgb: '219, 234, 254',
          usage: 'Tint mínimo, highlights',
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
          usage: 'Fundo principal (dark)',
        },
        {
          name: 'Pure White',
          hex: '#ffffff',
          rgb: '255, 255, 255',
          usage: 'Texto primário, botões',
        },
        {
          name: 'Near Black',
          hex: '#0a0a0b',
          rgb: '10, 10, 11',
          usage: 'Superfícies escuras',
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
          usage: 'Fundos claros',
        },
        {
          name: 'Gray 200',
          hex: '#e5e5e5',
          rgb: '229, 229, 229',
          usage: 'Bordas, divisores',
        },
        {
          name: 'Gray 300',
          hex: '#d4d4d4',
          rgb: '212, 212, 212',
          usage: 'Texto secundário',
        },
        {
          name: 'Gray 400',
          hex: '#a3a3a3',
          rgb: '163, 163, 163',
          usage: 'Texto terciário',
        },
        {
          name: 'Gray 600',
          hex: '#525252',
          rgb: '82, 82, 82',
          usage: 'Texto escuro sobre claro',
        },
        {
          name: 'Gray 800',
          hex: '#262626',
          rgb: '38, 38, 38',
          usage: 'Superfícies escuras',
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
          usage: 'Estados de sucesso',
        },
        {
          name: 'Warning',
          hex: '#f59e0b',
          rgb: '245, 158, 11',
          usage: 'Estados de atenção',
        },
        {
          name: 'Info',
          hex: '#3b82f6',
          rgb: '59, 130, 246',
          usage: 'Estados informativos',
        },
        {
          name: 'Destructive',
          hex: '#dc2626',
          rgb: '220, 38, 38',
          usage: 'Estados de erro',
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
        usage: 'Títulos de seção',
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
        usage: 'Texto longo',
      },
      {
        name: 'Body M',
        class: 'text-base',
        size: '16px',
        weight: '400',
        lineHeight: '1.5',
        usage: 'Corpo padrão',
      },
      {
        name: 'Body S',
        class: 'text-sm',
        size: '14px',
        weight: '400',
        lineHeight: '1.5',
        usage: 'Texto pequeno, labels',
      },
    ],
    technical: [
      {
        name: 'Mono M',
        class: 'text-[10px]',
        size: '10px',
        weight: '400',
        lineHeight: '1.4',
        usage: 'Labels técnicas',
      },
      {
        name: 'Mono S',
        class: 'text-[8px]',
        size: '8px',
        weight: '400',
        lineHeight: '1.4',
        usage: 'Anotações',
      },
    ],
  };

  const spacing = [
    { name: '1', value: '4px', usage: 'Gaps de ícones' },
    { name: '2', value: '8px', usage: 'Elementos compactos' },
    { name: '4', value: '16px', usage: 'Gap padrão, margens' },
    { name: '6', value: '24px', usage: 'Espaçamento de seção' },
    { name: '8', value: '32px', usage: 'Separação de componentes' },
    { name: '12', value: '48px', usage: 'Gaps grandes' },
    { name: '16', value: '64px', usage: 'Padding de seção' },
    { name: '24', value: '96px', usage: 'Espaçamento maior' },
    { name: '32', value: '128px', usage: 'Padding de hero' },
  ];

  return (
    <main className="min-h-screen bg-black text-white pt-16">
      {/* Dot grid background */}
      <div
        className="fixed inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(37,99,235,0.25) 1px, transparent 1px)`,
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
            <div
              className="text-[10px] font-mono uppercase tracking-wider mb-3"
              style={{ color: PRIMARY }}
            >
              DESIGN_SYSTEM_V2
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] mb-8">
              Branding
            </h1>
            <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-6">
              SECTION_01 / INTRODUCTION
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.1] mb-6">
              Identidade Visual EcoTech
            </h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              Nossa identidade é construída sobre confiança, clareza e tecnologia.
              O azul primário <span className="font-mono" style={{ color: PRIMARY }}>#2563EB</span> comunica
              profissionalismo e inovação. Cada elemento é deliberado, cada espaço é intencional.
            </p>
          </motion.div>
        </section>

        {/* Logo Section */}
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 relative">
          <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-8">
            SECTION_02 / LOGO_SYSTEM
          </div>
          <h3 className="text-3xl sm:text-4xl font-normal mb-12">Logo</h3>

          {/* 2x2 logo grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-[#1a1a1a] rounded-xl p-3 sm:p-4"
          >
            <div className="grid grid-cols-2 gap-[3px] overflow-hidden rounded-lg">
              {/* Blue bg / white logo */}
              <div
                className="flex items-center justify-center px-10 py-12 sm:px-16 sm:py-16"
                style={{ backgroundColor: PRIMARY }}
              >
                <img
                  src="/ecotech.svg"
                  alt="EcoTech logo branco sobre azul"
                  width={240}
                  height={64}
                  className="object-contain w-full max-w-[160px] sm:max-w-[240px]"
                />
              </div>

              {/* White bg / black logo */}
              <div className="flex items-center justify-center px-10 py-12 sm:px-16 sm:py-16 bg-white">
                <img
                  src="/ecotech.svg"
                  alt="EcoTech logo preto sobre branco"
                  width={240}
                  height={64}
                  className="object-contain w-full max-w-[160px] sm:max-w-[240px]"
                  style={{ filter: 'invert(1)' }}
                />
              </div>

              {/* White bg / blue logo */}
              <div className="flex items-center justify-center px-10 py-12 sm:px-16 sm:py-16 bg-white">
                <img
                  src="/ecotech.svg"
                  alt="EcoTech logo azul sobre branco"
                  width={240}
                  height={64}
                  className="object-contain w-full max-w-[160px] sm:max-w-[240px]"
                  style={{
                    filter:
                      'brightness(0) saturate(100%) invert(27%) sepia(89%) saturate(1500%) hue-rotate(213deg) brightness(100%) contrast(97%)',
                  }}
                />
              </div>

              {/* Black bg / white logo */}
              <div className="flex items-center justify-center px-10 py-12 sm:px-16 sm:py-16 bg-black">
                <img
                  src="/ecotech.svg"
                  alt="EcoTech logo branco sobre preto"
                  width={240}
                  height={64}
                  className="object-contain w-full max-w-[160px] sm:max-w-[240px]"
                />
              </div>
            </div>
          </motion.div>

          {/* 2x2 icon grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-[#1a1a1a] rounded-xl p-3 sm:p-4 mt-4"
          >
            <div className="grid grid-cols-2 gap-[3px] overflow-hidden rounded-lg">
              {/* Blue bg / white icon */}
              <div
                className="flex items-center justify-center py-10 sm:py-14"
                style={{ backgroundColor: PRIMARY }}
              >
                <img
                  src="/logoecotech.svg"
                  alt="EcoTech ícone branco sobre azul"
                  width={64}
                  height={42}
                  className="object-contain"
                />
              </div>

              {/* White bg / black icon */}
              <div className="flex items-center justify-center py-10 sm:py-14 bg-white">
                <img
                  src="/logoecotech.svg"
                  alt="EcoTech ícone preto sobre branco"
                  width={64}
                  height={42}
                  className="object-contain"
                  style={{ filter: 'invert(1)' }}
                />
              </div>

              {/* White bg / blue icon */}
              <div className="flex items-center justify-center py-10 sm:py-14 bg-white">
                <img
                  src="/logoecotech.svg"
                  alt="EcoTech ícone azul sobre branco"
                  width={64}
                  height={42}
                  className="object-contain"
                  style={{
                    filter:
                      'brightness(0) saturate(100%) invert(27%) sepia(89%) saturate(1500%) hue-rotate(213deg) brightness(100%) contrast(97%)',
                  }}
                />
              </div>

              {/* Black bg / white icon */}
              <div className="flex items-center justify-center py-10 sm:py-14 bg-black">
                <img
                  src="/logoecotech.svg"
                  alt="EcoTech ícone branco sobre preto"
                  width={64}
                  height={42}
                  className="object-contain"
                />
              </div>
            </div>
          </motion.div>
        </section>

        {/* Color Palette Section */}
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 relative">
          <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-8">
            SECTION_03 / COLOR_SYSTEM
          </div>
          <h3 className="text-3xl sm:text-4xl font-normal mb-12">Paleta de Cores</h3>

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
                  <h4 className="text-xl font-medium text-white">{group.title}</h4>
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
                      <div
                        className="h-32 relative"
                        style={{ backgroundColor: color.hex }}
                      >
                        <div className="absolute top-2 left-2 text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                            {color.hex.toUpperCase()}
                          </div>
                        </div>
                        {color.hex === PRIMARY && (
                          <div
                            className="absolute bottom-2 right-2 text-[8px] font-mono px-2 py-1 rounded bg-white/20 text-white"
                          >
                            PRIMARY
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-zinc-900 relative">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="text-sm font-medium">{color.name}</h5>
                          <button
                            onClick={() => copyToClipboard(color.hex, color.name)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            {copiedColor === color.name ? (
                              <Check className="w-3 h-3" style={{ color: PRIMARY }} />
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
            SECTION_04 / TYPOGRAPHY_SCALE
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
                <div className="text-[8px] font-mono text-white/25">Inter / Normal</div>
              </div>
              <div className="space-y-6">
                {typography.display.map((type) => (
                  <div
                    key={type.name}
                    className="border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="text-[10px] font-mono text-gray-400 mb-2">
                          {type.name}
                        </div>
                        <div className={`${type.class} font-normal leading-tight`}>
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
                <div className="text-[8px] font-mono text-white/25">Inter / Regular</div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {typography.body.map((type) => (
                  <div
                    key={type.name}
                    className="border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors"
                  >
                    <div className="text-[10px] font-mono text-gray-400 mb-3">{type.name}</div>
                    <div className={`${type.class} text-gray-300 mb-4`}>
                      Sistema inteligente que simplifica cotações, propostas e renovações.
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
                <div className="text-[8px] font-mono text-white/25">Geist Mono / Monospace</div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {typography.technical.map((type) => (
                  <div
                    key={type.name}
                    className="border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors bg-zinc-900"
                  >
                    <div className="text-[10px] font-mono text-gray-400 mb-3">{type.name}</div>
                    <div className={`${type.class} font-mono text-white/25 mb-4`}>
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
            SECTION_05 / SPACING_RHYTHM
          </div>
          <h3 className="text-3xl sm:text-4xl font-normal mb-12">Sistema de Espaçamento</h3>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="border border-white/10 rounded-lg overflow-hidden"
          >
            <div className="bg-zinc-900 p-4 border-b border-white/10">
              <div className="text-[10px] font-mono text-gray-400">Tailwind Spacing Scale</div>
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
                      <div className="text-sm font-mono text-white">{space.name}</div>
                      <div className="text-[10px] font-mono text-gray-500">{space.value}</div>
                    </div>
                    <div className="flex-1">
                      <div
                        className="h-8 rounded relative"
                        style={{ width: space.value, backgroundColor: PRIMARY }}
                      >
                        <div className="absolute -top-6 left-0 text-[8px] font-mono text-white/25 opacity-0 group-hover:opacity-100 transition-opacity">
                          {space.value}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 w-48">{space.usage}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Grid Philosophy */}
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 relative">
          <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-8">
            SECTION_06 / GRID_PHILOSOPHY
          </div>
          <h3 className="text-3xl sm:text-4xl font-normal mb-6">
            O Grid: A Estrutura que Define o Design
          </h3>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mb-20"
          >
            <p className="text-lg text-gray-300 leading-relaxed mb-6">
              O sistema de grid não é apenas uma ferramenta de alinhamento — é a alma visual da
              nossa identidade. Ele revela a estrutura, celebra a precisão técnica e transforma o
              vazio em algo intencional.
            </p>
            <p className="text-base text-gray-400 leading-relaxed">
              Enquanto a maioria dos designs esconde sua estrutura, nós a expomos. O grid é
              visível, presente, consistente. Ele comunica ordem, transparência e atenção aos
              detalhes antes mesmo que o usuário leia uma palavra.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Layer 1 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="border border-white/10 rounded-lg overflow-hidden group hover:border-blue-500/50 transition-colors"
            >
              <div className="bg-zinc-900 p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-mono" style={{ color: PRIMARY }}>
                    LAYER_01
                  </div>
                  <div className="text-[10px] font-mono text-white/25">BASE</div>
                </div>
                <h5 className="text-lg font-medium">Dotted Foundation</h5>
              </div>
              <div className="relative h-48 bg-black">
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(37,99,235,0.4) 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                  }}
                />
              </div>
              <div className="p-4 bg-zinc-900/50">
                <div className="text-[10px] font-mono text-gray-400 mb-2">ESPECIFICAÇÕES</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="border border-white/5 rounded p-2">
                    <div className="text-white/50 mb-1">Tamanho</div>
                    <div className="text-white font-mono">24×24px</div>
                  </div>
                  <div className="border border-white/5 rounded p-2">
                    <div className="text-white/50 mb-1">Dot</div>
                    <div className="text-white font-mono">1px</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Layer 2 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="border border-white/10 rounded-lg overflow-hidden group hover:border-blue-500/50 transition-colors"
            >
              <div className="bg-zinc-900 p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-mono" style={{ color: PRIMARY }}>
                    LAYER_02
                  </div>
                  <div className="text-[10px] font-mono text-white/25">STRUCTURE</div>
                </div>
                <h5 className="text-lg font-medium">Fine Line Grid</h5>
              </div>
              <div className="relative h-48 bg-black">
                <div
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(37,99,235,0.4) 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                  }}
                />
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(37,99,235,0.2) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(37,99,235,0.2) 1px, transparent 1px)
                    `,
                    backgroundSize: '48px 48px',
                  }}
                />
              </div>
              <div className="p-4 bg-zinc-900/50 space-y-4">
                <div>
                  <div className="text-[10px] font-mono text-gray-400 mb-2">ESPECIFICAÇÕES TÉCNICAS</div>
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
                <div>
                  <div className="text-[10px] font-mono text-gray-400 mb-2">FUNÇÃO</div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    A estrutura ortogonal que organiza e subdivide o espaço. Define zonas sem barreiras visuais rígidas. Múltiplo de 2× do dot grid (48px = spacing-12).
                  </p>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-400 mb-2">QUANDO USAR</div>
                  <ul className="text-[11px] text-white/60 space-y-1">
                    <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">•</span>Hero sections com grande impacto</li>
                    <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">•</span>Áreas de layout complexo</li>
                    <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">•</span>Combinado com Layer 1 para densidade</li>
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
              className="border border-white/10 rounded-lg overflow-hidden group hover:border-blue-500/50 transition-colors"
            >
              <div className="bg-zinc-900 p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-mono" style={{ color: PRIMARY }}>
                    LAYER_03
                  </div>
                  <div className="text-[10px] font-mono text-white/25">GUIDES</div>
                </div>
                <h5 className="text-lg font-medium">Dashed Guides</h5>
              </div>
              <div className="relative h-48 bg-black">
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(37,99,235,0.4) 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                  }}
                />
                <div
                  className="absolute left-12 top-0 bottom-0 w-px opacity-50"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(37,99,235,0.8), rgba(37,99,235,0.8) 8px, transparent 8px, transparent 16px)',
                  }}
                />
                <div
                  className="absolute right-12 top-0 bottom-0 w-px opacity-50"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(37,99,235,0.8), rgba(37,99,235,0.8) 8px, transparent 8px, transparent 16px)',
                  }}
                />
                <div
                  className="absolute left-1/2 top-0 bottom-0 w-px opacity-30"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 8px, transparent 8px, transparent 16px)',
                  }}
                />
                <div className="absolute top-2 left-12 text-[8px] font-mono" style={{ color: PRIMARY }}>
                  edge
                </div>
                <div className="absolute top-2 right-12 text-[8px] font-mono" style={{ color: PRIMARY }}>
                  edge
                </div>
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-mono text-white/40">
                  center
                </div>
              </div>
              <div className="p-4 bg-zinc-900/50 space-y-4">
                <div>
                  <div className="text-[10px] font-mono text-gray-400 mb-2">ESPECIFICAÇÕES TÉCNICAS</div>
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
                <div>
                  <div className="text-[10px] font-mono text-gray-400 mb-2">FUNÇÃO</div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    As linhas-guia que demarcam áreas críticas: bordas de container, seções, pontos de alinhamento principais. Guias podem ser destacadas em emerald (var(--color-primary)) para ênfase.
                  </p>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-400 mb-2">QUANDO USAR</div>
                  <ul className="text-[11px] text-white/60 space-y-1">
                    <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">•</span>Container edges (left/right padding)</li>
                    <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">•</span>Divisões de seção (1/2, 1/3, 1/4)</li>
                    <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">•</span>Pontos de ancoragem de conteúdo</li>
                    <li className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">•</span>Destacar em verde áreas principais</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 relative">
          <div className="border border-white/10 rounded-lg p-12 text-center relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(37,99,235,0.5) 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
            <div className="relative z-10">
              <div
                className="text-[10px] font-mono uppercase tracking-wider mb-4"
                style={{ color: PRIMARY }}
              >
                DESIGN_SYSTEM_V2 / END
              </div>
              <h3 className="text-3xl font-normal mb-4">EcoTech Brand Guidelines</h3>
              <p className="text-gray-400 max-w-md mx-auto text-sm">
                Este guia é um documento vivo. Mantenha-o atualizado conforme a identidade
                evolui.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
