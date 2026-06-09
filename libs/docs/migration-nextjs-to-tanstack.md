# Plano de Migração: Next.js → TanStack Start + Cloudflare Pages

**Data de criação:** 2026-04-30  
**Motivação:** Migrar hosting de Vercel para Cloudflare Pages. Next.js não tem suporte nativo ao runtime Cloudflare Workers; TanStack Start (via Nitro/Vinxi) tem deploy nativo.

---

## Visão Geral

| Item | Atual | Destino |
|------|-------|---------|
| Framework | Next.js 16 (App Router) | TanStack Start |
| Hosting | Vercel | Cloudflare Pages |
| Roteamento | App Router (convenção de arquivo) | TanStack Router (file-based) |
| SSR | Server Components (não usados) | Client-side (status quo mantido) |
| API Routes | 3 rotas mínimas | TanStack Start API routes / Worker |
| Build | `next build` standalone | `wrangler pages deploy` |

**O projeto já é ~100% client-side** (250+ arquivos com `'use client'`). Não há Server Components em uso real, sem `generateStaticParams`, sem `revalidatePath`. Isso simplifica muito a migração.

**Estimativa total:** 2–3 semanas para um dev dedicado.

---

## Índice de Fases

1. [Preparação e Setup do Ambiente](#fase-1-preparação-e-setup-do-ambiente)
2. [Criação do Projeto TanStack Start](#fase-2-criação-do-projeto-tanstack-start)
3. [Infraestrutura Base](#fase-3-infraestrutura-base)
4. [Migração de Rotas](#fase-4-migração-de-rotas)
5. [Migração das API Routes](#fase-5-migração-das-api-routes)
6. [Cloudflare: CSP, Headers e Segurança](#fase-6-cloudflare-csp-headers-e-segurança)
7. [Build e Deploy para Cloudflare Pages](#fase-7-build-e-deploy-para-cloudflare-pages)
8. [QA e Validação](#fase-8-qa-e-validação)
9. [Cutover (go-live)](#fase-9-cutover-go-live)

---

## Fase 1: Preparação e Setup do Ambiente

### 1.1 Instalar dependências de build

```bash
pnpm add -g wrangler
pnpm add -D @cloudflare/workers-types
```

### 1.2 Criar branch de migração

```bash
git checkout -b feat/tanstack-start-migration
```

### 1.3 Backup mental do que precisa ser migrado

| Categoria | Quantidade | Complexidade |
|-----------|-----------|--------------|
| Rotas (páginas) | ~110 arquivos | Média (rename + sintaxe) |
| Layouts | 45 arquivos | Média |
| `next/link` | 47 arquivos | Baixa (busca/substitui) |
| `next/navigation` hooks | 44 arquivos | Média |
| `next/image` | 2 arquivos | Baixa |
| `next-themes` | configuração global | Baixa |
| API Routes | 3 arquivos | Média |
| `@vercel/analytics` | 1 arquivo (root layout) | Baixa (remover) |
| `@vercel/speed-insights` | 1 arquivo (root layout) | Baixa (remover) |
| Middleware / CSP (`proxy.ts`) | 1 arquivo | Alta → mover para Cloudflare |

---

## Fase 2: Criação do Projeto TanStack Start

### 2.1 Criar `apps/web-new` no monorepo

```bash
# No root do monorepo
pnpm create tanstack-app@latest apps/web-new
# Escolher: TypeScript, Cloudflare Pages, TailwindCSS, React Query, file-based routing
```

### 2.2 `package.json` do novo app

Copiar dependências do `apps/web/package.json` e adicionar as do TanStack Start:

```json
{
  "dependencies": {
    "@tanstack/react-router": "^1.x",
    "@tanstack/start": "^1.x",
    "@tanstack/react-query": "^5.100.0",
    "vinxi": "latest"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "latest",
    "wrangler": "^3.x"
  }
}
```

**Remover do `package.json`:**
- `next`
- `@vercel/analytics`
- `@vercel/speed-insights`
- `next-themes` → substituir por `@tanstack/router-theme` ou implementação manual

**Manter sem alteração:**
- Todos os `@radix-ui/*`
- `@tanstack/react-query`
- `zustand`, `react-hook-form`, `@hookform/resolvers`
- `recharts`, `lucide-react`, `sonner`
- `tailwindcss`, `clsx`, `tailwind-merge`, `class-variance-authority`
- `dayjs`, `js-cookie`, `zod`
- `@dnd-kit/*`, `framer-motion`, `gsap`

### 2.3 Atualizar `nx.json` / `workspace.json`

Adicionar `apps/web-new` ao workspace Nx e mapear os mesmos targets (`dev`, `build`, `lint`).

### 2.4 Atualizar path aliases no `tsconfig.json` do novo app

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/core/*": ["./src/core/*"],
      "@/infra/*": ["./src/infra/*"],
      "@/modules/*": ["./src/modules/*"],
      "@ecotech/shared/types": ["../../libs/shared/types/src"],
      "@ecotech/shared/utils": ["../../libs/shared/utils/src"],
      "@ecotech/shared/config": ["../../libs/shared/config/src"],
      "@ecotech/ui": ["../../libs/shared/ui/src"]
    }
  }
}
```

---

## Fase 3: Infraestrutura Base

Esta fase migra os arquivos de `src/infra/` que **não mudam** e reconfigura os que dependem do Next.js.

### 3.1 Copiar sem alteração

Estes arquivos são agnósticos de framework — copiar diretamente:

```
src/infra/auth/auth-store.ts           ✅ cópia direta (Zustand puro)
src/infra/auth/portal-auth-store.ts    ✅ cópia direta
src/infra/http/api.ts                  ✅ cópia direta (fetch puro)
src/infra/providers/query-provider.tsx ✅ cópia direta (TanStack Query)
src/modules/                           ✅ cópia direta (UI components)
src/core/                              ✅ cópia direta
```

### 3.2 Root layout (`app/layout.tsx` → `src/routes/__root.tsx`)

**Antes (Next.js):**
```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider>
          <QueryClientProvider>
            <TooltipProvider>
              {children}
              <Toaster />
              <Analytics />
              <SpeedInsights />
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Depois (TanStack Start):**
```tsx
// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/infra/providers/query-client';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Outlet />
              <Toaster />
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 3.3 Theme Provider

`next-themes` usa APIs do Next.js internamente. Substituir por:

**Opção A:** `@tanstack/router-theme` (se disponível)  
**Opção B:** Implementação manual com Zustand + `localStorage` (recomendada — já temos Zustand):

```tsx
// src/infra/providers/theme-provider.tsx
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

const useThemeStore = create(persist<{ theme: Theme; setTheme: (t: Theme) => void }>(
  (set) => ({ theme: 'system', setTheme: (theme) => set({ theme }) }),
  { name: 'theme-storage' }
));

export function ThemeProvider({ children }) {
  const { theme } = useThemeStore();
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
  }, [theme]);
  return <>{children}</>;
}
```

### 3.4 AuthGuard

**Antes:** Usa `useRouter` e `usePathname` do Next.js  
**Depois:** Usa `useNavigate` e `useLocation` do TanStack Router

```tsx
// src/infra/auth/auth-guard.tsx
import { useNavigate, useLocation } from '@tanstack/react-router';

export function AuthGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !user) {
      navigate({
        to: '/login',
        search: { redirect: location.pathname },
        replace: true,
      });
    }
  }, [isLoading, isAuthenticated, user]);

  return <>{children}</>;
}
```

---

## Fase 4: Migração de Rotas

### 4.1 Convenção de arquivos: Next.js → TanStack Router

| Next.js | TanStack Router |
|---------|-----------------|
| `app/page.tsx` | `src/routes/index.tsx` |
| `app/login/page.tsx` | `src/routes/login.tsx` |
| `app/(app)/dashboard/page.tsx` | `src/routes/_app/dashboard.tsx` |
| `app/(app)/equipe/[id]/page.tsx` | `src/routes/_app/equipe/$id.tsx` |
| `app/(admin)/admin/page.tsx` | `src/routes/_admin/admin/index.tsx` |
| `app/(portal)/portal/[subdominio]/page.tsx` | `src/routes/_portal/portal/$subdominio.tsx` |
| `app/layout.tsx` | `src/routes/__root.tsx` |
| `app/(app)/layout.tsx` | `src/routes/_app.tsx` (layout route) |
| `app/not-found.tsx` | `src/routes/404.tsx` |
| `app/error.tsx` | `src/routes/__root.tsx` (errorComponent) |

### 4.2 Estrutura de arquivos de destino

```
src/routes/
├── __root.tsx                          ← root layout
├── index.tsx                           ← landing page
├── embed/
│   └── particles.tsx
│
├── _auth.tsx                           ← layout group auth
├── _auth/
│   ├── login.tsx
│   ├── recuperar-senha.tsx
│   └── reset-senha.tsx
│
├── _app.tsx                            ← layout group app (AppLayout + AuthGuard)
├── _app/
│   ├── agenda.tsx
│   ├── cadastro.tsx
│   ├── chat.tsx
│   ├── clientes.tsx
│   ├── configuracoes/
│   │   ├── cargos.tsx
│   │   ├── comissoes.tsx
│   │   └── corretora.tsx
│   ├── dashboard/
│   │   ├── index.tsx
│   │   └── kanban.tsx
│   ├── dashboard-equipe.tsx
│   ├── equipe/
│   │   └── $id.tsx
│   ├── gestao.tsx
│   ├── gestao-crm.tsx
│   ├── importar-renovacoes/
│   │   ├── index.tsx
│   │   ├── $importacaoId.tsx
│   │   └── historico.tsx
│   ├── marketing.tsx
│   ├── metricas/
│   │   ├── index.tsx
│   │   ├── renovacoes.tsx
│   │   └── vendedor/
│   │       └── $vendedorId.tsx
│   ├── metricas-dashboard.tsx
│   ├── meu-desempenho.tsx
│   ├── negocios-corretora.tsx
│   ├── notificacoes.tsx
│   ├── performance.tsx
│   ├── perfil.tsx
│   ├── produtos.tsx
│   ├── ranking.tsx
│   ├── seguradoras-parceiras.tsx
│   ├── sem-permissao.tsx
│   ├── sinistro/
│   │   ├── index.tsx
│   │   └── kanban.tsx
│   ├── usuarios.tsx
│   └── workspace/
│       ├── index.tsx
│       └── planilha.tsx
│
├── _admin.tsx                          ← layout group admin
├── _admin/
│   ├── admin/
│   │   ├── audit-logs.tsx
│   │   ├── backups.tsx
│   │   ├── changelogs.tsx
│   │   ├── dashboard.tsx
│   │   ├── login.tsx
│   │   ├── perfil.tsx
│   │   ├── pricing.tsx
│   │   ├── roadmap.tsx
│   │   ├── subscriptions.tsx
│   │   └── treinamentos/
│   │       ├── index.tsx
│   │       └── $cursoId.tsx
│
├── _portal.tsx                         ← layout group portal
├── _portal/
│   └── portal/
│       └── $subdominio/
│           ├── index.tsx
│           ├── login.tsx
│           ├── perfil.tsx
│           ├── produtos.tsx
│           ├── vencimentos.tsx
│           └── apolices/
│               ├── index.tsx
│               └── $id.tsx
│
├── _static.tsx                         ← layout group static
└── _static/
    ├── sobre.tsx
    ├── funcionalidades.tsx
    ├── roadmap.tsx
    ├── contato.tsx
    ├── termos.tsx
    ├── privacidade.tsx
    ├── cookies.tsx
    ├── lgpd.tsx
    ├── changelog.tsx
    ├── precos.tsx
    ├── checkout/
    │   ├── index.tsx
    │   └── sucesso.tsx
    ├── identidade-visual.tsx
    ├── branding.tsx
    ├── certificado-preview.tsx
    ├── treinamentos.tsx
    └── docs/
        ├── index.tsx
        ├── overview.tsx
        ├── primeiros-passos.tsx
        ├── dashboard.tsx
        ├── kanban.tsx
        ├── metricas.tsx
        ├── performance.tsx
        ├── agenda.tsx
        ├── configuracoes.tsx
        ├── clientes.tsx
        └── cotacoes.tsx
```

### 4.3 Estrutura de uma rota simples

**Antes (Next.js `page.tsx`):**
```tsx
// app/(app)/clientes/page.tsx
'use client';

export default function ClientesPage() {
  return <ClientesView />;
}
```

**Depois (TanStack Start):**
```tsx
// src/routes/_app/clientes.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ClientesView } from '@/modules/clientes/views/clientes-view';

export const Route = createFileRoute('/_app/clientes')({
  component: ClientesPage,
});

function ClientesPage() {
  return <ClientesView />;
}
```

### 4.4 Layout route (substituto do `layout.tsx`)

**Antes (Next.js `layout.tsx`):**
```tsx
// app/(app)/layout.tsx
export default function AppLayout({ children }) {
  return <AuthGuard><AppShell>{children}</AppShell></AuthGuard>;
}
```

**Depois (TanStack Start `_app.tsx`):**
```tsx
// src/routes/_app.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthGuard>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthGuard>
  );
}
```

### 4.5 Substituições de hooks — busca/substitui global

| Next.js | TanStack Router | Notas |
|---------|-----------------|-------|
| `import { useRouter } from 'next/navigation'` | `import { useNavigate } from '@tanstack/react-router'` | `router.push(x)` → `navigate({ to: x })` |
| `import { usePathname } from 'next/navigation'` | `import { useLocation } from '@tanstack/react-router'` | `pathname` → `location.pathname` |
| `import { useSearchParams } from 'next/navigation'` | `import { useSearch } from '@tanstack/react-router'` | ver seção 4.6 |
| `import { useParams } from 'next/navigation'` | `import { useParams } from '@tanstack/react-router'` | mesma API |
| `import Link from 'next/link'` | `import { Link } from '@tanstack/react-router'` | `href` → `to` |
| `import Image from 'next/image'` | `<img>` nativo ou `<picture>` | 2 arquivos apenas |
| `router.push('/path')` | `navigate({ to: '/path' })` | |
| `router.replace('/path')` | `navigate({ to: '/path', replace: true })` | |
| `router.refresh()` | `router.invalidate()` | para recarregar dados |
| `router.back()` | `history.back()` | |

### 4.6 SearchParams tipados (mudança de paradigma)

O TanStack Router valida search params via Zod. Isso é mais poderoso que o Next.js.

**Antes:**
```tsx
const searchParams = useSearchParams();
const redirect = searchParams?.get('redirect');
```

**Depois — definir no Route:**
```tsx
// src/routes/_auth/login.tsx
import { z } from 'zod';

export const Route = createFileRoute('/_auth/login')({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  // ...
}
```

### 4.7 Rota dinâmica com parâmetros

**Antes:**
```tsx
// app/(app)/equipe/[id]/page.tsx
import { useParams } from 'next/navigation';
const params = useParams();
const id = params.id;
```

**Depois:**
```tsx
// src/routes/_app/equipe/$id.tsx
export const Route = createFileRoute('/_app/equipe/$id')({
  component: EquipeMembro,
});

function EquipeMembro() {
  const { id } = Route.useParams();
  // ...
}
```

### 4.8 Catch-all route (`/api/treinamentos/[...path]`)

```tsx
// src/routes/api/treinamentos/$.tsx  (ou via API route handler)
export const Route = createFileRoute('/api/treinamentos/$')({
  // ...
});
```

### 4.9 Error boundaries

**Antes:** `app/(app)/error.tsx` e `app/(app)/workspace/error.tsx`

**Depois:** definidos no `createFileRoute` como `errorComponent`:
```tsx
export const Route = createFileRoute('/_app')({
  errorComponent: AppErrorBoundary,
  component: AppLayout,
});
```

---

## Fase 5: Migração das API Routes

### 5.1 `/api/cep/[cep]` → API handler TanStack Start

```tsx
// src/routes/api/cep/$cep.ts
import { createAPIFileRoute } from '@tanstack/start/api';

export const APIRoute = createAPIFileRoute('/api/cep/$cep')({
  GET: async ({ params }) => {
    const res = await fetch(`https://viacep.com.br/ws/${params.cep}/json/`);
    const data = await res.json();
    return Response.json(data);
  },
});
```

### 5.2 `/api/storage/proxy-upload` → API handler

```tsx
// src/routes/api/storage/proxy-upload.ts
import { createAPIFileRoute } from '@tanstack/start/api';

export const APIRoute = createAPIFileRoute('/api/storage/proxy-upload')({
  PUT: async ({ request }) => {
    const url = new URL(request.url).searchParams.get('url');
    if (!url) return Response.json({ error: 'url required' }, { status: 400 });

    const body = await request.arrayBuffer();
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': request.headers.get('Content-Type') ?? 'application/octet-stream',
        'Content-Length': String(body.byteLength),
      },
      body,
    });

    if (!res.ok) return Response.json({ error: 'upload failed' }, { status: res.status });
    return Response.json({ ok: true });
  },
});
```

> **Nota:** O Cloudflare Workers tem limite de 100MB por request no plano gratuito e 500MB no pago. Para uploads de vídeo grandes (2GB como configurado no Next.js), avaliar usar **presigned URL direto do browser para R2** sem proxy — elimina o problema de limite.

### 5.3 `/api/treinamentos/[...path]` → API handler

```tsx
// src/routes/api/treinamentos/$.ts
import { createAPIFileRoute } from '@tanstack/start/api';

export const APIRoute = createAPIFileRoute('/api/treinamentos/$')({
  GET: async ({ request, params }) => {
    // implementação atual do catch-all
  },
});
```

---

## Fase 6: Cloudflare — CSP, Headers e Segurança

### 6.1 Substituir `src/proxy.ts` por `_headers` + Workers

O `proxy.ts` atual gera um nonce por request para o CSP. No Cloudflare Pages, isso é feito via:

**Opção A (mais simples):** Arquivo `public/_headers` com CSP estático

```
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://cdn.vercel-insights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://api.seudominio.com.br wss://api.seudominio.com.br https://storage.seudominio.com.br; frame-src https://www.google.com/recaptcha/; font-src 'self' data:;
```

**Opção B (com nonce, mais segura):** Cloudflare Worker como middleware

```ts
// functions/_middleware.ts (Cloudflare Pages Functions)
export async function onRequest(context: EventContext<any, any, any>) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const response = await context.next();
  const newResponse = new Response(response.body, response);
  
  newResponse.headers.set('Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; ...`
  );
  newResponse.headers.set('X-Frame-Options', 'SAMEORIGIN');
  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  
  return newResponse;
}
```

> **Recomendação:** Começar com Opção A (mais rápida) e evoluir para B depois se necessário.

### 6.2 `wrangler.toml`

```toml
name = "ecotech-web"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".output/public"

[vars]
NEXT_PUBLIC_API_URL = "https://api.seudominio.com.br/api"
NEXT_PUBLIC_APP_URL = "https://app.seudominio.com.br"
NEXT_PUBLIC_STORAGE_URL = "https://storage.seudominio.com.br"

# Secrets (via wrangler secret put):
# NEXT_PUBLIC_RECAPTCHA_SITE_KEY
```

### 6.3 Variáveis de ambiente

No TanStack Start + Vite, `NEXT_PUBLIC_*` vira `VITE_*`:

| Next.js | TanStack Start / Vite |
|---------|----------------------|
| `NEXT_PUBLIC_API_URL` | `VITE_API_URL` |
| `NEXT_PUBLIC_APP_URL` | `VITE_APP_URL` |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | `VITE_RECAPTCHA_SITE_KEY` |
| `NEXT_PUBLIC_STORAGE_URL` | `VITE_STORAGE_URL` |

Atualizar todos os `process.env.NEXT_PUBLIC_*` para `import.meta.env.VITE_*` no código.

**Busca/substitui (44 ocorrências estimadas):**
```
process.env.NEXT_PUBLIC_API_URL  →  import.meta.env.VITE_API_URL
process.env.NEXT_PUBLIC_APP_URL  →  import.meta.env.VITE_APP_URL
process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY  →  import.meta.env.VITE_RECAPTCHA_SITE_KEY
process.env.NEXT_PUBLIC_STORAGE_URL  →  import.meta.env.VITE_STORAGE_URL
```

---

## Fase 7: Build e Deploy para Cloudflare Pages

### 7.1 `app.config.ts` (Vinxi/TanStack Start)

```ts
// apps/web/app.config.ts
import { defineConfig } from '@tanstack/start/config';

export default defineConfig({
  server: {
    preset: 'cloudflare-pages',
  },
  tsr: {
    appDirectory: 'src',
    routesDirectory: 'src/routes',
    generatedRouteTree: 'src/routeTree.gen.ts',
  },
  vite: {
    optimizeDeps: {
      include: ['lucide-react', 'recharts', 'react-hook-form'],
    },
  },
});
```

### 7.2 Scripts `package.json`

```json
{
  "scripts": {
    "dev": "vinxi dev",
    "build": "vinxi build",
    "deploy": "wrangler pages deploy .output/public --project-name=ecotech-web"
  }
}
```

### 7.3 CI/CD (GitHub Actions ou Cloudflare Pages Git integration)

**Opção recomendada:** Conectar repositório diretamente no Cloudflare Pages dashboard:
- Build command: `pnpm build --filter=web`
- Build output: `apps/web/.output/public`
- Root directory: `/` (raiz do monorepo)

---

## Fase 8: QA e Validação

### 8.1 Checklist de rotas críticas

- [ ] Landing page (`/`) renderiza corretamente
- [ ] Login funciona e redireciona com `?redirect=`
- [ ] Recuperação de senha funciona
- [ ] Dashboard carrega após login
- [ ] Rotas protegidas redirecionam para `/login` se não autenticado
- [ ] Portal do cliente (`/portal/[subdominio]`) abre corretamente
- [ ] Admin login e dashboard funcionam
- [ ] Upload de arquivo funciona (proxy-upload)
- [ ] Busca de CEP funciona (`/api/cep/[cep]`)
- [ ] Treinamentos (`/treinamentos`) abre conteúdo
- [ ] Dark mode persiste entre navegações

### 8.2 Checklist de auth

- [ ] JWT é injetado nas requests
- [ ] 401 dispara `triggerSessionExpired()`
- [ ] Permission manifest carrega e gates funcionam
- [ ] Logout limpa Zustand + localStorage
- [ ] Refresh token funciona
- [ ] Admin auth separado funciona

### 8.3 Checklist de infraestrutura Cloudflare

- [ ] Headers de segurança presentes (verificar via DevTools → Network)
- [ ] CSP não bloqueia scripts legítimos (verificar console por erros CSP)
- [ ] reCAPTCHA carrega no login
- [ ] WebSocket conecta (`wss://api.*`)
- [ ] Uploads para R2 funcionam
- [ ] CORS entre frontend Cloudflare e API Fastify configurado

---

## Fase 9: Cutover (go-live)

### 9.1 Pré-cutover

1. Validar QA completo em ambiente de staging (Cloudflare Pages preview)
2. Notificar time sobre janela de deploy
3. Fazer backup do DNS atual

### 9.2 Cutover DNS

1. Apontar domínio principal para Cloudflare Pages (CNAME)
2. Remover project do Vercel (ou manter como backup por 7 dias)
3. Remover `@vercel/analytics` e `@vercel/speed-insights` das dependências (já feito na Fase 2)

### 9.3 Pós-cutover imediato

1. Monitorar logs do Cloudflare por erros 5xx
2. Verificar que CSP não está bloqueando nada
3. Testar login em produção

### 9.4 Pós-cutover (1 semana)

1. Remover `apps/web` (Next.js) do monorepo ou renomear para `apps/web-legacy`
2. Renomear `apps/web-new` para `apps/web`
3. Atualizar scripts no root `package.json`
4. Remover `next.config.js` e dependências do Next.js

---

## Resumo de Risco

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| CSP bloqueando scripts | Alta | Testar em staging antes; começar com `unsafe-inline` e apertar depois |
| Upload de vídeo (2GB) falhar no Worker | Alta | Usar presigned URL direto browser→R2 sem proxy |
| `next-themes` sem substituto equivalente | Baixa | Implementação manual com Zustand (30 linhas) |
| WebSocket não funcionar no Cloudflare Pages | Média | API (Fastify) é separada; só o frontend muda |
| Rotas com SearchParams quebrando | Média | TanStack Router exige Zod schema; cobrir em QA |
| Monorepo `transpilePackages` do Next.js | Baixa | Vite resolve automaticamente com `optimizeDeps` |

---

## Referências

- [TanStack Start Docs](https://tanstack.com/start/latest)
- [TanStack Router File-based Routing](https://tanstack.com/router/latest/docs/framework/react/routing/file-based-routing)
- [Cloudflare Pages + Nitro](https://nitro.unjs.io/deploy/providers/cloudflare)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Pages Headers](https://developers.cloudflare.com/pages/configuration/headers/)
