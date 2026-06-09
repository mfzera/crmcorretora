# Ecosistema Seguros - Brand Manual

**Version:** 1.0  
**Last Updated:** February 4, 2026  
**Based on:** Homepage Design System

---

## Table of Contents

1. [Introduction](#introduction)
2. [Typography](#typography)
3. [Color Palette](#color-palette)
4. [Grid System](#grid-system)
5. [Spacing & Layout](#spacing--layout)
6. [Component Specifications](#component-specifications)
7. [Design Patterns](#design-patterns)
8. [Technical Annotations](#technical-annotations)

---

## Introduction

This brand manual defines the visual design system for Ecosistema Seguros based on the homepage implementation. The design emphasizes technical precision, minimalism, and a dark aesthetic with emerald green accents.

### Design Philosophy
- **Technical aesthetic**: Grid-based layouts with visible technical annotations
- **Minimalist approach**: Clean, functional design with purposeful elements
- **High contrast**: Black backgrounds with white text and emerald accents
- **Precision**: Dense grid systems and exact measurements

---

## Typography

### Primary Font Family

**Font:** Inter  
**CSS Implementation:** `font-inter`  
**Usage:** All text across the website

### Type Scale & Hierarchy

#### Display Headings (Hero)
- **Size:** `text-5xl sm:text-6xl lg:text-7xl` (mobile to desktop)
- **Pixel Equivalent:** ~48px / 60px / 72px
- **Weight:** `font-normal` (400)
- **Line Height:** `leading-[1.1]` (110%)
- **Color:** `text-white`
- **Max Width:** `max-w-3xl` (~672px)
- **Character Count:** ~42ch optimal width
- **Example:** "Gestão completa para sua corretora de seguros"

#### H2 Headings (CTA Section)
- **Size:** `text-4xl sm:text-5xl lg:text-6xl`
- **Pixel Equivalent:** ~36px / 48px / 60px
- **Weight:** `font-normal` (400)
- **Line Height:** `leading-[1.1]` (110%)
- **Color:** `text-white`
- **Example:** "Quer fazer parte?"

#### Label/Category Text
- **Size:** `text-sm` (~14px)
- **Weight:** `font-semibold` (600)
- **Transform:** `uppercase`
- **Tracking:** `tracking-wide`
- **Color:** `text-[#00ff87]` (Emerald Green)
- **Example:** "CRM"

#### Body Text (Large)
- **Size:** `text-base sm:text-lg` (16px / 18px)
- **Weight:** `font-normal` (400)
- **Line Height:** `leading-relaxed` (1.625)
- **Color:** `text-gray-300`
- **Max Width:** `max-w-2xl` (~640px)

#### Body Text (Base)
- **Size:** `text-sm` (~14px)
- **Weight:** `font-normal` (400)
- **Line Height:** Standard
- **Color:** `text-gray-300` or `text-gray-400`

#### Navigation Links
- **Size:** `text-sm` (~14px)
- **Weight:** `font-normal` (400)
- **Color:** `text-gray-300`
- **Hover:** `text-white`
- **Transition:** `transition-colors`

#### Button Text
- **Size:** `text-base` (16px) for large buttons, `text-sm` (14px) for regular
- **Weight:** `font-medium` (500)
- **Color:** Depends on button variant

#### Technical Annotations
- **Size:** `text-[8px]` to `text-[10px]`
- **Font:** `font-mono`
- **Color:** `text-white/20` or `text-white/25`
- **Transform:** Often `uppercase` for labels
- **Usage:** Grid measurements, component labels, Tailwind descriptors

#### Footer Text
- **Size:** `text-sm` (~14px)
- **Weight:** `font-normal` (400) or `font-semibold` (600) for headings
- **Color:** `text-gray-400`
- **Hover:** `text-white`

### Font Loading
- **Primary:** Geist Sans (var(--font-geist-sans))
- **Monospace:** Geist Mono (var(--font-geist-mono))

---

## Color Palette

### Primary Colors

#### Brand Emerald Green
- **Hex:** `#00ff87`
- **RGB:** `rgb(0, 255, 135)`
- **Usage:** Accent color, category labels, CTAs, decorative elements
- **Opacity Variants:**
  - `#00ff87` (100%) - Primary accent
  - `rgba(0, 255, 135, 0.5)` (50%) - Lines and borders
  - `rgba(0, 255, 135, 0.4)` (40%) - Corner brackets
  - `rgba(0, 255, 135, 0.3)` (30%) - Subtle accents
  - `rgba(0, 255, 135, 0.2)` (20%) - Background elements

#### Base Colors
- **Pure Black:** `#000000` - Main background
- **Pure White:** `#ffffff` - Primary text, button backgrounds
- **Near Black:** `#0a0a0b` - Dark mode background
- **Near White:** `#f5f5f6` - Dark mode foreground

### Grayscale Palette

#### Light Mode Grays
- **50:** `#fafafa`
- **100:** `#f5f5f5`
- **200:** `#e5e5e5`
- **300:** `#d4d4d4` - Used frequently for secondary text
- **400:** `#a3a3a3` - Secondary text, muted elements
- **500:** `#737373`
- **600:** `#525252`
- **700:** `#404040`
- **800:** `#262626`
- **900:** `#171717`
- **950:** `#0a0a0a`

### Semantic Colors

#### Background & Surfaces
- **Background:** `#ffffff` (light) / `#0a0a0b` (dark)
- **Card:** `#ffffff` (light) / `#18181b` (dark)
- **Popover:** `#ffffff` (light) / `#18181b` (dark)
- **Zinc-900:** `#18181b` - Dropdown backgrounds

#### Interactive Elements
- **Primary:** `#3fb353` (light) / `#22c55e` (dark)
- **Primary Foreground:** `#f7fdf0` (light) / `#000000` (dark)
- **Ring (Focus):** `#50c878`

#### Borders & Dividers
- **Border:** `#e6e6e8` (light) / `#27272a` (dark)
- **White Opacity Borders:**
  - `rgba(255, 255, 255, 0.2)` - Standard borders
  - `rgba(255, 255, 255, 0.15)` - Subtle lines
  - `rgba(255, 255, 255, 0.1)` - Very subtle dividers
  - `rgba(255, 255, 255, 0.05)` - Hover states

#### Status Colors
- **Success:** `#22c55e` / Foreground: `#f0fdf4`
- **Warning:** `#f59e0b` / Foreground: `#fffbeb`
- **Info:** `#3b82f6` / Foreground: `#eff6ff`
- **Destructive:** `#dc2626` (light) / `#ef4444` (dark)

### Text Colors (On Dark Backgrounds)
- **Primary:** `text-white` - Headings, important content
- **Secondary:** `text-gray-300` - Body text, navigation links
- **Tertiary:** `text-gray-400` - Muted text, descriptions
- **Accent:** `text-[#00ff87]` - Labels, highlights
- **Technical:** `text-white/20` to `text-white/25` - Annotations

---

## Grid System

### Base Grid Configuration

#### Dotted Background Pattern
```css
background-image: radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px);
background-size: 24px 24px;
```
- **Dot Size:** 1px
- **Dot Color:** `rgba(255, 255, 255, 0.15)`
- **Grid Spacing:** 24px × 24px
- **Opacity:** 20-50% depending on section

#### Fine Grid Overlay
```css
background-image: 
  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
background-size: 48px 48px;
```
- **Line Width:** 1px
- **Line Color:** `rgba(255, 255, 255, 0.1)`
- **Grid Spacing:** 48px × 48px
- **Opacity:** 15%

### Vertical Guide Lines

#### Primary Guides (Container Edges)
- **Position:** Left and right container edges
- **Pattern:** Dashed lines
- **Implementation:**
  ```css
  background-image: repeating-linear-gradient(
    0deg, 
    rgba(255,255,255,0.4), 
    rgba(255,255,255,0.4) 8px, 
    transparent 8px, 
    transparent 16px
  );
  ```
- **Dash Length:** 8px
- **Gap Length:** 8px
- **Opacity:** 40-50%

#### Center Guide
- **Position:** 50% (centered)
- **Opacity:** 25-30%
- **Dash Length:** 8px
- **Gap Length:** 8px

#### Quarter Guides
- **Positions:** 25%, 75%
- **Opacity:** 20%
- **Dash Length:** 8px
- **Gap Length:** 8px

#### Eighth Guides (Dense Grid Sections)
- **Positions:** 12.5%, 37.5%, 62.5%, 87.5%
- **Opacity:** 15%
- **Dash Length:** 6px
- **Gap Length:** 6px

#### 12-Column Grid (CTA Section)
- **Columns:** 12 equal columns
- **Gutter Width:** 1px
- **Column Lines:** Every 8.33% (1/12)
- **Opacity:** 15%

### Horizontal Guide Lines

#### Section Borders (Top/Bottom)
- **Position:** Section edges
- **Pattern:** Dashed lines
- **Implementation:**
  ```css
  background-image: repeating-linear-gradient(
    90deg, 
    rgba(255,255,255,0.5), 
    rgba(255,255,255,0.5) 8px, 
    transparent 8px, 
    transparent 16px
  );
  ```
- **Dash Length:** 8px
- **Gap Length:** 8px
- **Opacity:** 50%

#### Subdivision Lines
- **Positions:** 25%, 50%, 75% of section height
- **Dash Length:** 6px
- **Gap Length:** 6px
- **Opacity:** 20-30%

### Container System

#### Max Width Container
- **Class:** `max-w-7xl`
- **Width:** ~1280px
- **Centering:** `mx-auto`

#### Horizontal Padding (Responsive)
- **Mobile:** `px-6` (24px)
- **Small:** `sm:px-8` (32px)
- **Large:** `lg:px-12` (48px)

#### Content Max Widths
- **Hero Content:** `max-w-3xl` (~672px)
- **Body Text (Wide):** `max-w-2xl` (~640px)
- **Body Text (Standard):** `max-w-xl` (~576px)

---

## Spacing & Layout

### Spacing Scale (Tailwind Default)
- **px:** 1px
- **0.5:** 2px (0.125rem)
- **1:** 4px (0.25rem)
- **1.5:** 6px (0.375rem)
- **2:** 8px (0.5rem)
- **3:** 12px (0.75rem)
- **4:** 16px (1rem)
- **5:** 20px (1.25rem)
- **6:** 24px (1.5rem)
- **8:** 32px (2rem)
- **10:** 40px (2.5rem)
- **12:** 48px (3rem)
- **16:** 64px (4rem)
- **24:** 96px (6rem)
- **32:** 128px (8rem)

### Component Spacing

#### Section Vertical Padding
- **Hero:** `py-32` (128px)
- **CTA:** `py-24 sm:py-32` (96px / 128px)
- **Footer:** `py-16` (64px)
- **Header:** Fixed height `h-16` (64px)

#### Content Element Spacing
- **Heading to Body:** `mb-6` (24px)
- **Body to CTA:** `mb-10` (40px)
- **CTA Buttons (Internal):** `gap-4` (16px)
- **Trust Badges:** `gap-6` (24px)

#### Navigation Spacing
- **Desktop Nav Items:** `gap-8` (32px)
- **Mobile Menu Items:** `space-y-1` (4px)
- **Header CTA Distance:** Part of flex justify-between

#### Footer Grid
- **Grid:** `grid-cols-2 md:grid-cols-6`
- **Gap:** `gap-8` (32px)
- **Brand Column:** `col-span-2`

### Border Radius
- **Base:** `--radius: 0.65rem` (10.4px)
- **Small:** `calc(var(--radius) - 4px)` (~6px)
- **Medium:** `calc(var(--radius) - 2px)` (~8px)
- **Large:** `var(--radius)` (~10px)
- **Extra Large:** `calc(var(--radius) + 4px)` (~14px)

### Component-Specific Measurements

#### Buttons (Large)
- **Height:** `h-12` (48px)
- **Padding:** `px-8` (32px horizontal)
- **Font Size:** `text-base` (16px)
- **Border Radius:** `rounded-md` (~10px)

#### Buttons (Regular)
- **Height:** `h-10` (40px)
- **Padding:** `px-6` (24px horizontal)
- **Font Size:** `text-sm` (14px)
- **Border Radius:** `rounded-md` (~10px)

#### Logo
- **Height:** `h-8` (32px)
- **Width:** Auto (maintains aspect ratio)

#### Icons (Inline with Text)
- **Size:** `h-5 w-5` (20px) for large buttons
- **Size:** `h-4 w-4` (16px) for regular elements
- **Margin:** `ml-2` (8px) when trailing

#### Dropdown Menus
- **Width:** `w-80` (320px)
- **Padding:** `p-4` (16px)
- **Item Padding:** `p-3` (12px)
- **Border Radius:** `rounded-lg` (~10px)
- **Margin from Trigger:** `mt-2` (8px)

---

## Component Specifications

### Header (Navigation)

#### Structure
- **Position:** `fixed top-0 left-0 right-0 z-50`
- **Background:** `bg-black/80 backdrop-blur-md`
- **Height:** `h-16` (64px)
- **Container:** `max-w-7xl mx-auto px-6 sm:px-8 lg:px-12`

#### Elements
1. **Logo**: Left-aligned, `h-8`
2. **Navigation Links**: Desktop only (`hidden md:flex`), center area
3. **CTA Button**: Right-aligned, `px-6 h-10`
4. **Mobile Menu Toggle**: Mobile only (`md:hidden`), right-aligned

#### Borders
- **Bottom Border:** Dashed, `rgba(255,255,255,0.2)`, 8px dash / 16px gap

#### Dropdown Menus
- **Background:** `bg-zinc-900`
- **Border:** `border border-white/10`
- **Shadow:** `shadow-xl`
- **Width:** `w-80` (320px)
- **Padding:** `p-4` (16px)
- **Corner Accents:** Top-left green, top-right white

### Hero Section

#### Layout
- **Height:** `min-h-screen` (100vh minimum)
- **Display:** `flex items-center`
- **Background:** `bg-black`
- **Padding:** `py-32` (128px vertical)

#### Content Container
- **Max Width:** `max-w-3xl`
- **Relative Positioning** for absolute decorative elements

#### Elements Order
1. **Label** ("CRM"): `text-[#00ff87] text-sm font-semibold uppercase tracking-wide`
2. **Headline**: `text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.1]`
3. **Subheadline**: `text-base sm:text-lg leading-relaxed text-gray-300 max-w-2xl`
4. **CTA Buttons**: `flex flex-col sm:flex-row gap-4`
5. **Trust Badges**: `flex flex-wrap items-center gap-6`

#### Decorative Elements
- **Corner Brackets**: Top-left, 12×12px, green/white borders
- **Technical Labels**: Scattered, `text-[8px] to text-[10px] font-mono`
- **Measurement Lines**: Left side, gradient lines

#### Background Layers (Bottom to Top)
1. Dense dotted grid (24×24px)
2. Fine line grid (48×48px)
3. Vertical guide lines (container edges, center, quarters, eighths)
4. Horizontal guide lines (top, bottom, subdivisions)

### Call-to-Action (CTA) Section

#### Layout
- **Padding:** `py-24 sm:py-32`
- **Background:** `bg-black`
- **Content Max Width:** `max-w-3xl`

#### Structure
1. **Heading**: `text-4xl sm:text-5xl lg:text-6xl`
2. **Body Text**: `text-base sm:text-lg text-gray-300`
3. **Button Group**: Two buttons, primary + secondary

#### Grid System
- Uses 12-column grid overlay
- Dense vertical guides at every 1/12 position

### Footer

#### Layout
- **Background:** `bg-black`
- **Padding:** `py-16` (64px)
- **Grid:** `grid-cols-2 md:grid-cols-6 gap-8`

#### Sections
1. **Brand Column** (col-span-2): Logo, description, social links
2. **Link Columns** (4 columns): Product, Resources, Company, Legal

#### Bottom Bar
- **Padding:** `py-6` (24px)
- **Border Top:** `border-white/10` with dashed overlay
- **Layout:** `flex flex-col md:flex-row justify-between`

#### Elements
- **Section Titles**: `text-sm font-semibold uppercase tracking-wider text-white`
- **Links**: `text-sm text-gray-400 hover:text-white`
- **Link Bullets**: `w-1 h-1 bg-white/20 rounded-full`
- **Social Icons**: `w-4 h-4`, `border border-white/10 hover:border-white/20`

### Buttons

#### Primary Button (Light Background)
```css
bg-white hover:bg-gray-100 
text-black 
font-medium 
px-8 h-12 (large) or px-6 h-10 (regular)
rounded-md
```

#### Secondary Button (Ghost)
```css
variant-ghost
text-white 
hover:bg-white/10 
border border-white/20
font-normal
px-8 h-12 (large) or px-6 h-10 (regular)
rounded-md
```

#### Button with Icon
- Icon position: Right side
- Icon margin: `ml-2` (8px)
- Icon size: `h-5 w-5` (20px for large), `h-4 w-4` (16px for regular)

### Decorative Elements

#### Corner Brackets
- **Size:** 12×12px to 4×4px (nested)
- **Lines:** 2px borders on two adjacent sides
- **Colors:** 
  - Primary: `border-[#00ff87]/40`
  - Secondary: `border-white/20`

#### Measurement Lines
- **Gradient:** `from-[#00ff87]/30 via-[#00ff87]/20 to-[#00ff87]/10` or similar
- **Width:** `w-px` (1px)
- **Length:** Full height or custom

#### Technical Annotations
- **Font:** `font-mono`
- **Sizes:** `text-[7px]` to `text-[10px]`
- **Colors:** `text-white/20` to `text-white/25`
- **Positioning:** `absolute` with custom offsets
- **Visibility:** Often `opacity-0 group-hover:opacity-100`

#### Trust Badge Bullets
- **Size:** `w-1.5 h-1.5` (6px)
- **Shape:** `rounded-full`
- **Color:** `bg-[#00ff87]`

#### Status Indicator
- **Size:** `w-2 h-2` (8px)
- **Shape:** `rounded-full`
- **Color:** `bg-[#00ff87]`
- **Animation:** `animate-pulse`

---

## Design Patterns

### Animation & Motion

#### Framer Motion Settings

**Hero Elements:**
```javascript
initial={{ opacity: 0, y: 20-30 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6-0.8, delay: 0.4-1.3 }}
```

**Parallax Scrolling:**
```javascript
const { scrollYProgress } = useScroll({
  target: ref,
  offset: ['start start', 'end start']
});
const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0]);
```

**Line Animations:**
```javascript
initial={{ width: 0 }}
animate={{ width: 48 }}
transition={{ duration: 0.6, delay: 0.6 }}
```

#### CSS Transitions
- **Standard:** `transition-colors` or `transition-opacity`
- **Duration:** Default (~200ms) for hover states
- **Easing:** Default ease

### Hover States

#### Text Links
- Default: `text-gray-300` or `text-gray-400`
- Hover: `text-white`
- Transition: `transition-colors`

#### Buttons
- **Primary**: `bg-white hover:bg-gray-100`
- **Ghost**: `hover:bg-white/10`
- **Border**: `border-white/20 hover:border-white/20` (static in this case) or `border-white/10 hover:border-white/20`

#### Dropdown Items
- Default: transparent or `bg-transparent`
- Hover: `hover:bg-white/5 hover:border-white/10`

#### Technical Annotations
- Default: `opacity-0`
- Hover (on parent): `group-hover:opacity-100`
- Transition: `transition-opacity`

### Responsive Breakpoints

#### Tailwind Default Breakpoints
- **sm:** 640px
- **md:** 768px
- **lg:** 1024px
- **xl:** 1280px
- **2xl:** 1536px

#### Common Responsive Patterns

**Typography:**
- `text-5xl sm:text-6xl lg:text-7xl`
- `text-4xl sm:text-5xl lg:text-6xl`
- `text-base sm:text-lg`

**Spacing:**
- `px-6 sm:px-8 lg:px-12`
- `py-24 sm:py-32`
- `gap-4 sm:gap-6`

**Layout:**
- `flex-col sm:flex-row`
- `grid-cols-2 md:grid-cols-6`
- `hidden md:flex`
- `md:hidden`

### Layering & Z-Index

#### Z-Index Scale
- **Base Content:** `z-10`
- **Header:** `z-50`
- **Dropdown Content:** Natural stacking (no z-index needed in most cases)
- **Background Patterns:** No z-index (render before content)

#### Opacity Layers (Background to Foreground)
1. **Dotted Grid:** 20-50% opacity
2. **Fine Grid:** 15% opacity
3. **Guide Lines:** 15-50% opacity depending on prominence
4. **Technical Annotations:** 20-25% opacity
5. **Content:** 100% opacity

---

## Technical Annotations

### Purpose
Technical annotations provide a designer/developer aesthetic showing the underlying structure. They appear throughout the homepage as small monospace text.

### Types of Annotations

#### Component Labels
```
HERO_SECTION_01
HEADER_NAV_FIXED
DROPDOWN_PRODUTOS
CTA_SECTION_FINAL
```
- **Font:** `font-mono`
- **Size:** `text-[8px]` to `text-[10px]`
- **Color:** `text-white/20` to `text-white/25`
- **Transform:** `uppercase`
- **Position:** Above or beside components

#### CSS Class Descriptors
```
section.relative.bg-black
text-7xl.leading-tight.font-normal
flex.gap-4.sm:flex-row
```
- **Font:** `font-mono`
- **Size:** `text-[7px]` to `text-[9px]`
- **Color:** `text-white/20` to `text-white/25`
- **Format:** Dot-separated class names

#### Measurement Labels
```
viewport: 100vh | padding: py-32
w-[42ch] | max-w-3xl
h-16.fixed.z-50
```
- **Font:** `font-mono`
- **Size:** `text-[8px]`
- **Color:** `text-white/20`
- **Position:** Usually bottom or side of elements

#### Grid References
```
grid-template: 12-col
z-index: 10
container.max-w-7xl.mx-auto
```
- **Font:** `font-mono`
- **Size:** `text-[8px]` to `text-[9px]`
- **Color:** `text-white/20`

### Visibility Pattern
Most technical annotations use this pattern:
```css
opacity-0 group-hover:opacity-100 transition-opacity
```
They appear on hover to reduce visual clutter while maintaining the technical aesthetic.

### Positioning
- **Absolute positioning:** `absolute` with custom `top`, `bottom`, `left`, `right`
- **Common positions:**
  - `-top-3`, `-top-6` (above element)
  - `-bottom-6`, `-bottom-12` (below element)
  - `-left-16`, `-left-24` (left side)
  - `-right-8`, `-right-20` (right side)

---

## Brand Voice & Messaging

### Tone
- **Technical**: Professional, precise, data-driven
- **Accessible**: Clear, jargon-free when possible
- **Confident**: Direct statements about capabilities
- **Honest**: Transparent about development stage ("Estamos no início dessa jornada")

### Key Messaging Themes
1. **Simplification**: "simplifica cotações, propostas, renovações"
2. **Completeness**: "Gestão completa"
3. **Flexibility**: "Comece gratuitamente e pague apenas pelos usuários ativos"
4. **Transparency**: "Plataforma em desenvolvimento"
5. **Invitation**: "adoraríamos ter você conosco"

### Call-to-Action Language
- **Primary CTA**: "Começar teste grátis", "Criar minha conta"
- **Secondary CTA**: "Ver Preços", "Falar conosco"
- **Value Props**: "7 dias grátis", "sem cartão", "cancele quando quiser"

---

## Implementation Guidelines

### CSS Framework
- **Primary:** Tailwind CSS v4
- **Animations:** Framer Motion
- **Component Library:** Custom components built on Radix UI primitives

### Font Loading Strategy
- **Method:** Next.js Font Optimization
- **Fonts:** Geist Sans, Geist Mono
- **Loading:** Optimized, preloaded

### Performance Considerations
1. **Backdrop Blur**: Use sparingly (header only)
2. **Animations**: Debounce scroll events, use CSS transforms
3. **Grid Patterns**: Use CSS gradients (performant)
4. **Images**: Optimize logo as SVG

### Accessibility
1. **Color Contrast**: All text meets WCAG AA standards
   - White on black: 21:1 (AAA)
   - Gray-300 on black: 12.6:1 (AAA)
   - Gray-400 on black: 8.6:1 (AAA)
2. **Focus States**: Ring color `--ring: #50c878`
3. **Keyboard Navigation**: All interactive elements accessible
4. **Semantic HTML**: Proper heading hierarchy, nav elements, sections
5. **ARIA Labels**: Implemented on dropdowns, buttons

### Dark Mode
While the current homepage uses a black theme exclusively, the design system includes comprehensive dark mode definitions in `globals.css`. Dark mode can be activated using the `.dark` class.

---

## Asset Specifications

### Logo
- **Format:** SVG (preferred)
- **Height:** 32px (h-8) standard display
- **Color:** Maintains brand colors (likely includes #00ff87)
- **Path:** `/logo.svg`

### Icons
- **Library:** Lucide React
- **Common Icons:**
  - `ArrowRight`: CTA buttons
  - `ChevronDown`: Dropdowns
  - `Menu`, `X`: Mobile menu toggle
- **Sizes:** 16px (w-4 h-4) or 20px (w-5 h-5)

### Social Media Icons
- **Style:** Inline SVG paths
- **Size:** 16px (w-4 h-4)
- **Padding:** p-2 (8px) in bordered containers
- **Platforms:** LinkedIn, Instagram, YouTube

---

## Brand Manual Maintenance

### Version Control
- This document should be versioned alongside the codebase
- Update when significant design changes occur
- Reference git commits for design changes

### File References
All specifications in this manual are based on:
- `/apps/web/src/components/landing/hero.tsx`
- `/apps/web/src/components/landing/header.tsx`
- `/apps/web/src/components/landing/footer.tsx`
- `/apps/web/src/components/landing/cta.tsx`
- `/apps/web/src/styles/globals.css`

### Revision History
- **v1.0** (2026-02-04): Initial brand manual creation based on homepage design

---

## Quick Reference

### Essential Values
- **Primary Font:** Inter
- **Monospace Font:** Geist Mono
- **Brand Color:** #00ff87 (Emerald Green)
- **Background:** #000000 (Black)
- **Text:** #ffffff (White), #d4d4d4 (Gray-300)
- **Container Max Width:** 1280px (max-w-7xl)
- **Border Radius:** 0.65rem (~10px)
- **Grid Spacing:** 24px dots, 48px lines
- **Button Height (Large):** 48px (h-12)
- **Button Height (Regular):** 40px (h-10)

### Most Used Tailwind Classes
```
max-w-7xl mx-auto
px-6 sm:px-8 lg:px-12
text-5xl sm:text-6xl lg:text-7xl
font-inter font-normal
text-white text-gray-300 text-gray-400
bg-black bg-white
hover:bg-white/10 hover:text-white
transition-colors
flex flex-col sm:flex-row
gap-4 gap-6 gap-8
mb-6 mb-10
border-white/10 border-white/20
rounded-md
```

---

**End of Brand Manual**

For questions or updates, contact the development team or refer to the source files listed in this document.
