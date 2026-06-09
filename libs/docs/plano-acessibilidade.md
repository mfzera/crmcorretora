# Plano de Acessibilidade — EcoTech Sys

**Referência:** [W3C WAI — Introduction to Web Accessibility](https://www.w3.org/WAI/fundamentals/accessibility-intro/)

## Contexto

Acessibilidade web garante que pessoas com deficiências (visuais, auditivas, motoras, cognitivas e neurológicas) possam perceber, entender, navegar e interagir com o sistema. Além de ser um requisito legal em muitos contextos, a acessibilidade beneficia todos os usuários: dispositivos móveis, usuários idosos, deficiências temporárias, conexões lentas.

O EcoTech Sys já tem uma base sólida com Radix UI, shadcn/ui, ARIA attributes e focus-visible. O objetivo é identificar lacunas e implementar melhorias seguindo WCAG 2.1.

---

## Estado Atual — O que já existe

- Radix UI como base (keyboard nav, ARIA roles automáticos em dialogs, selects, menus)
- `aria-invalid` + `aria-describedby` em form fields via React Hook Form
- `sr-only` em botões de fechar dialogs
- `focus-visible:ring` em todos os controles interativos
- Labels associadas via `htmlFor` / `FormLabel`
- Suporte a dark mode

---

## Lacunas Identificadas

### 1. Navegação por teclado em componentes customizados
- Tabelas com ações (editar, excluir) podem não ter ordem de foco lógica
- Kanban board e cards de arrastar/soltar precisam de alternativa de teclado
- Filtros e buscas: verificar se Enter e Escape funcionam corretamente

### 2. Textos alternativos e conteúdo não-textual
- Avatares de usuários/clientes podem estar sem `alt` descritivo
- Gráficos e charts (Recharts) sem descrição acessível ou alternativa textual
- Ícones Lucide sem contexto — muitos podem estar sem `aria-label` ou `sr-only`

### 3. Anúncios dinâmicos (Live Regions)
- Toasts (Sonner) precisam de `role="status"` ou `aria-live` para screen readers
- Loading states e skeleton screens sem indicação para leitores de tela
- Erros de formulário devem ser anunciados quando aparecem dinamicamente

### 4. Estrutura semântica e headings
- Hierarquia de headings (h1→h2→h3) nas páginas precisa ser verificada
- Landmarks semânticos: `<main>`, `<nav>`, `<aside>` devem estar presentes
- Skip link ("Pular para o conteúdo") ausente

### 5. Contraste de cores
- Verificar se os tokens de cor do tema (claro e escuro) atendem ao ratio mínimo WCAG AA (4.5:1 para texto normal, 3:1 para texto grande)
- Badges e status indicators precisam de verificação

### 6. Formulários e validação
- Mensagens de erro devem ser anunciadas via `aria-live` além do visual
- Campos obrigatórios devem ter `aria-required="true"` ou indicação textual além do `*`

### 7. Tabelas de dados
- Tabelas de clientes, produtos, cotações precisam de `<caption>` ou `aria-label`
- Colunas de ação ("Editar", "Excluir") sem header de coluna semântico

---

## Plano de Implementação

### Fase 1 — Fundação (Alta prioridade)

**1.1 Skip Link**
- Adicionar `<a href="#main-content">` no topo do layout, visível apenas no foco
- Arquivo: `apps/web/src/app/(app)/layout.tsx`

**1.2 Estrutura de Landmarks**
- Garantir `<main id="main-content">`, `<nav>`, `<aside>` no layout principal
- Verificar hierarquia de headings nas páginas principais

**1.3 Live Regions para feedback dinâmico**
- Wrapper em torno do Sonner com `aria-live="polite"`
- Adicionar `role="status"` em loading states globais

### Fase 2 — Componentes (Média prioridade)

**2.1 Ícones e elementos visuais**
- Ícones Lucide decorativos: `aria-hidden="true"`
- Ícones semânticos (sem texto ao lado): `aria-label` descritivo
- Avatares: garantir `alt` com nome do usuário/cliente

**2.2 Charts acessíveis**
- Adicionar `aria-label` descritivo nos containers de gráficos (Recharts)
- Fornecer resumo textual dos dados principais abaixo de cada chart

**2.3 Tabelas**
- Adicionar `aria-label` ou `<caption>` nas tabelas de dados
- Garantir `<th scope="col">` nas colunas de ação

**2.4 Formulários**
- Adicionar `aria-required="true"` em campos obrigatórios
- Garantir que `FormMessage` (erros) seja anunciado com `aria-live="assertive"`

### Fase 3 — Teclado e Contraste (Baixa prioridade)

**3.1 Kanban**
- Implementar atalhos de teclado para mover cards entre colunas
- Documentar atalhos disponíveis visualmente

**3.2 Contraste**
- Auditar tokens de cor com axe-core ou Colour Contrast Analyser
- Corrigir valores que não atingem WCAG AA

**3.3 Focus management em dialogs customizados**
- Confirmar que ao fechar um dialog o foco retorna ao elemento que o abriu

---

## Arquivos Críticos

| Arquivo | O que alterar |
|---|---|
| `apps/web/src/app/(app)/layout.tsx` | Skip link, landmarks `<main>`, `<nav>` |
| `apps/web/src/app/layout.tsx` | Sonner live region wrapper |
| `apps/web/src/components/ui/form.tsx` | `aria-live` em FormMessage |
| `apps/web/src/components/ui/input.tsx` | `aria-required` suporte |
| `apps/web/src/components/ui/table.tsx` | `<caption>` suporte |
| `apps/web/src/components/ui/avatar.tsx` | `alt` obrigatório |
| `apps/web/src/components/ui/button.tsx` | `aria-label` quando sem texto |
| `apps/web/src/app/(app)/dashboard/page.tsx` | headings, chart descriptions |
| `apps/web/src/components/kanban/` | keyboard navigation |

---

## Verificação

1. **axe DevTools** (browser extension): rodar nas páginas principais
2. **Lighthouse Accessibility**: Chrome DevTools → meta score ≥ 90
3. **Navegação por teclado manual**: Tab, Shift+Tab, Enter, Escape, Arrows nos fluxos login → dashboard → clientes → cotações
4. **ORCA** (Linux): testar fluxos principais com leitor de tela
5. **Contrast checker**: verificar tokens de cor do tema claro e escuro

---

## Referências

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [W3C WAI — Introduction to Web Accessibility](https://www.w3.org/WAI/fundamentals/accessibility-intro/)
- [axe-core](https://github.com/dequelabs/axe-core)
