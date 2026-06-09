# LGPD — C5 + Frontend Sprint 2

> Documento de planejamento técnico para implementação.

---

## C5 — Migrar JWT de localStorage para httpOnly Cookies

### Problema

Tokens JWT armazenados em `localStorage` são acessíveis via JavaScript, tornando-os vulneráveis a ataques XSS. Um script injetado pode ler `auth-storage` e exfiltrar o token. Cookies `httpOnly` são inacessíveis ao JavaScript — o browser os envia automaticamente a cada request sem que o JS possa lê-los.

### Estratégia de Domínio

O maior obstáculo de cookies cross-origin é resolvido com **Next.js rewrites**: o browser sempre fala com `ecotech.com`, e o Vercel faz proxy silencioso para o Railway. Nenhuma mudança de DNS necessária.

```ts
// next.config.ts
rewrites: async () => [
  {
    source: '/api/:path*',
    destination: `${process.env.API_URL}/:path*`,
  },
],
```

Com isso, `SameSite=Strict` funciona sem CSRF token adicional.

### Cookies Definidos

| Cookie | Conteúdo | Flags | Path |
|--------|----------|-------|------|
| `et-token` | Access JWT (8h) | `httpOnly; Secure; SameSite=Strict` | `/api` |
| `et-refresh` | Refresh JWT (7d) | `httpOnly; Secure; SameSite=Strict` | `/api/auth/refresh` |
| `et-portal-token` | Portal JWT (8h) | `httpOnly; Secure; SameSite=Strict` | `/api/portal` |

Em desenvolvimento: `Secure=false` (sem HTTPS local), `SameSite=Lax`.

---

## Sprint A — Backend

### A1. Instalar e registrar `@fastify/cookie`

```bash
pnpm add @fastify/cookie --filter @ecotech/api
```

```ts
// apps/api/src/app.ts
import cookie from '@fastify/cookie';

await app.register(cookie, {
  secret: env.COOKIE_SECRET, // nova env var ≥ 32 chars
});
```

Adicionar `COOKIE_SECRET` ao `env.ts` (zod schema) e ao Railway.

### A2. Fixar `origin` no CORS

`origin: true` não funciona com cookies. Trocar para domínio exato:

```ts
// apps/api/src/app.ts
await app.register(cors, {
  origin: env.FRONTEND_URL, // ex: https://ecotech.com.br
  credentials: true,
  ...
});
```

Adicionar `FRONTEND_URL` ao `env.ts` e Railway.

### A3. Plugin `libs/plugins/auth` — aceitar cookie como fallback

**Arquivo:** `libs/plugins/auth/src/index.ts`

O decorator `authenticate` lê apenas `Authorization: Bearer`. Adicionar fallback para cookie `et-token`:

```ts
fastify.decorate('authenticate', async (request, reply) => {
  try {
    // Tenta header primeiro (compatibilidade com MCP/API keys)
    if (request.headers.authorization) {
      await request.jwtVerify();
    } else {
      // Fallback: cookie httpOnly
      const token = request.cookies?.['et-token'];
      if (!token) throw new Error('No token');
      request.user = fastify.jwt.verify(token) as JwtPayload;
    }
    // ... resto da lógica (loadUserRuntimeData, resolveTenant)
  } catch {
    throw new UnauthorizedError('Token inválido ou ausente');
  }
});
```

### A4. `POST /auth/login` — retornar cookie, não token no body

**Arquivo:** `apps/api/src/routes/auth/index.ts`

```ts
// ANTES
return reply.send({ success: true, data: { token, refreshToken, usuario, ... } });

// DEPOIS
const cookieOpts = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

return reply
  .setCookie('et-token', token, {
    ...cookieOpts,
    path: '/api',
    maxAge: 8 * 60 * 60,
  })
  .setCookie('et-refresh', refreshToken, {
    ...cookieOpts,
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60,
  })
  .send({
    success: true,
    data: {
      // NÃO inclui token nem refreshToken
      usuario,
      corretora,
      corretoras,
      permissoes,
    },
  });
```

### A5. `POST /auth/refresh` — ler e retornar cookie

```ts
// Ler do cookie em vez do body
const refreshToken = request.cookies?.['et-refresh'];
if (!refreshToken) throw new UnauthorizedError('Refresh token ausente');

// ... verificar, gerar novos tokens ...

return reply
  .setCookie('et-token', newToken, { ...cookieOpts, path: '/api', maxAge: 8 * 3600 })
  .setCookie('et-refresh', newRefreshToken, { ...cookieOpts, path: '/api/auth/refresh', maxAge: 7 * 86400 })
  .send({ success: true });
```

### A6. `POST /auth/logout` — limpar cookies

```ts
return reply
  .clearCookie('et-token', { path: '/api' })
  .clearCookie('et-refresh', { path: '/api/auth/refresh' })
  .send({ success: true, message: 'Logout realizado com sucesso' });
```

### A7. `POST /auth/corretoras/switch` — novo cookie na troca

Mesmo padrão do login: `setCookie('et-token', newToken, ...)` com novo payload de `corretoraId`.

### A8. Portal Segurado — cookie separado

**Arquivo:** `apps/api/src/routes/portal-segurado/auth.ts`

- Login: `setCookie('et-portal-token', token, { ...cookieOpts, path: '/api/portal', maxAge: 8 * 3600 })`
- Logout: `clearCookie('et-portal-token', { path: '/api/portal' })`

Plugin de auth do portal: lê `request.cookies?.['et-portal-token']` como fallback.

---

## Sprint B — Frontend

### B1. `next.config.ts` — rewrite proxy

```ts
// apps/web/next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL}/:path*`,
      },
    ];
  },
};
```

`API_URL` como variável de ambiente server-side no Vercel (não `NEXT_PUBLIC_`).

### B2. `apps/web/src/lib/api.ts` — remover leitura de token

```ts
// REMOVER toda a função getAuthToken() e o bloco:
// const token = await getAuthToken();
// if (token) headers['Authorization'] = `Bearer ${token}`;

// MANTER apenas credentials: 'include'
const response = await fetch(url, {
  credentials: 'include', // envia cookies automaticamente
  headers,
  ...
});
```

O fetch para `/api/*` agora vai para o proxy Vercel → Railway com o cookie `et-token` incluído automaticamente pelo browser.

### B3. `apps/web/src/stores/auth-store.ts` — remover tokens do estado

```ts
// REMOVER dos campos persistidos:
// token: string | null
// refreshToken: string | null

// MANTER apenas dados não-sensíveis:
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  // token e refreshToken: REMOVIDOS
}

// persist partialize:
partialize: (state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
})
```

`setToken()` pode ser removido ou tornar-se no-op.

### B4. `apps/web/src/stores/portal-auth-store.ts`

Mesmo padrão: remover `token` do estado persistido.

### B5. `apps/web/src/lib/portal-api.ts`

Remover leitura manual de token. Adicionar `credentials: 'include'`.

### B6. Login page — decodificar JWT do body continua igual

O body ainda retorna `usuario`, `corretora`, `permissoes`. O decodificador manual de JWT pode ser removido pois os dados já vêm no body da resposta — não é mais necessário fazer `jwt.split('.')[1]` para extrair `sub`, `corretoraId`, etc. Esses campos podem vir diretamente no objeto `usuario` da resposta.

### B7. `apps/web/src/middleware.ts` — proteção de rotas via cookie

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/clientes', '/cotacoes', '/propostas'];
const PORTAL_PREFIXES = ['/portal'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
    const token = request.cookies.get('et-token');
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (PORTAL_PREFIXES.some((p) => path.startsWith(p)) && path !== '/portal/login') {
    const token = request.cookies.get('et-portal-token');
    if (!token) {
      return NextResponse.redirect(new URL('/portal/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
```

> **Nota:** O middleware apenas checa presença do cookie (não valida assinatura — isso fica na API). Tokens expirados serão rejeitados pela API com 401, que o frontend trata redirecionando para login.

### B8. Refresh automático — interceptor 401

Com cookies, o refresh é transparente. Adicionar em `api.ts`:

```ts
// Se receber 401, tentar refresh uma vez antes de expirar sessão
if (response.status === 401) {
  const refreshed = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });

  if (refreshed.ok) {
    // Cookie et-token foi renovado automaticamente pelo servidor
    // Retentar a requisição original
    return fetch(url, { credentials: 'include', ...options });
  } else {
    useAuthStore.getState().triggerSessionExpired();
  }
}
```

### B9. Multi-aba — sincronizar logout via BroadcastChannel

localStorage dispara `storage` event entre abas. Cookies não. Substituir por:

```ts
// No logout():
const channel = new BroadcastChannel('auth');
channel.postMessage({ type: 'logout' });

// Na inicialização do app (layout.tsx ou provider):
const channel = new BroadcastChannel('auth');
channel.onmessage = (e) => {
  if (e.data.type === 'logout') {
    useAuthStore.getState().logout();
    window.location.href = '/login';
  }
};
```

---

## Sprint C — Frontend Sprint 2 LGPD

### C1. Banner de Consentimento de Cookies

**Arquivo:** `apps/web/src/components/cookie-consent/index.tsx` (novo)

**Comportamento:**
- Exibido na primeira visita ao site (verificar cookie `et-consent-dismissed` ou localStorage simples)
- Dois botões: "Aceitar todos" e "Apenas essenciais"
- Ao aceitar: chamar `POST /api/lgpd/consentimentos` com `{ tipo: 'cookies', versao: '1.0', aceito: true }`
- Persiste escolha em cookie não-httpOnly `et-consent` (30 dias) para não reexibir
- Não bloqueia o uso do site

**Categorias a exibir:**

| Categoria | Exemplos | Obrigatório |
|-----------|----------|-------------|
| Essenciais | Sessão (`et-token`), preferências | Sim |
| Funcionais | Tema, idioma | Não |
| Analytics | Métricas anônimas | Não |

**Componente base:**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  const handleAccept = async (all: boolean) => {
    localStorage.setItem('cookie-consent', all ? 'all' : 'essential');
    setVisible(false);
    // Registrar no backend se autenticado
    try {
      await api.post('/lgpd/consentimentos', {
        tipo: 'cookies',
        versao: '1.0',
        aceito: true,
      });
    } catch {
      // Silencioso — usuário pode não estar autenticado ainda
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Usamos cookies essenciais para o funcionamento do sistema. Ao continuar,
          você concorda com nossa{' '}
          <a href="/cookies" className="underline">Política de Cookies</a>.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => handleAccept(false)}>
            Apenas essenciais
          </Button>
          <Button size="sm" onClick={() => handleAccept(true)}>
            Aceitar todos
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Integração:** Adicionar `<CookieConsent />` no `apps/web/src/app/layout.tsx`.

---

### C2. Tela "Meus Dados"

**Rota:** `/perfil/meus-dados`

**Arquivo:** `apps/web/src/app/(app)/perfil/meus-dados/page.tsx` (novo)

**Funcionalidades:**

1. **Visualizar dados pessoais** — chamar `GET /api/lgpd/meus-dados`
2. **Exportar dados (JSON)** — botão que faz download do JSON retornado
3. **Ver histórico de consentimentos** — lista de aceites com data e IP
4. **Solicitar exclusão de conta** — abre dialog de confirmação → chama `DELETE /api/usuarios/:id`

**Estrutura da página:**

```
Meus Dados Pessoais
├── Seção: Dados Cadastrais
│   ├── Nome, e-mail, telefone (somente leitura)
│   └── Botão: Editar perfil → /perfil
├── Seção: Consentimentos
│   ├── Tabela: tipo | versão | aceito | data | IP
│   └── (histórico, não editável)
├── Seção: Histórico de Acessos
│   ├── Tabela: ação | entidade | IP | data (últimas 500)
│   └── Nota: "Registros retidos por 90 dias conforme LGPD"
├── Seção: Exportar Dados
│   └── Botão: "Baixar meus dados (JSON)"
└── Zona de Perigo
    └── Botão: "Solicitar exclusão da conta" (destructive)
        └── AlertDialog com confirmação + aviso sobre dados relacionados
```

**Link de acesso:** Adicionar "Meus Dados (LGPD)" no menu de perfil do usuário (`/components/user-menu` ou similar).

---

### C3. Checkbox de Aceite no Cadastro

**Arquivo:** Tela de cadastro de corretora (`/cadastro` ou `/register`)

**Requisito LGPD:** checkbox não pode vir pré-marcado.

**Mudanças:**

1. Adicionar dois checkboxes no final do formulário:

```tsx
<FormField
  control={form.control}
  name="aceitaTermos"
  render={({ field }) => (
    <FormItem className="flex gap-2">
      <FormControl>
        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <FormLabel className="font-normal">
        Li e aceito os{' '}
        <a href="/termos" target="_blank" className="underline">Termos de Uso</a>
        {' '}e a{' '}
        <a href="/privacidade" target="_blank" className="underline">Política de Privacidade</a>
        {' '}*
      </FormLabel>
      <FormMessage />
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="aceitaCookies"
  render={({ field }) => (
    <FormItem className="flex gap-2">
      <FormControl>
        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <FormLabel className="font-normal">
        Aceito o uso de cookies conforme a{' '}
        <a href="/cookies" target="_blank" className="underline">Política de Cookies</a>
      </FormLabel>
      <FormMessage />
    </FormItem>
  )}
/>
```

2. Adicionar validação no schema Zod:

```ts
aceitaTermos: z.literal(true, {
  errorMap: () => ({ message: 'Você precisa aceitar os Termos de Uso para continuar' }),
}),
aceitaCookies: z.boolean().optional(),
```

3. Após cadastro bem-sucedido, registrar os consentimentos:

```ts
// No onSubmit, após criar conta:
await api.post('/lgpd/consentimentos', { tipo: 'termos_uso', versao: '1.0', aceito: true });
if (data.aceitaCookies) {
  await api.post('/lgpd/consentimentos', { tipo: 'cookies', versao: '1.0', aceito: true });
}
```

> Como o registro de consentimento precisa de `usuarioId` no backend (requer autenticação), esses POSTs devem ser feitos **depois** do login automático pós-cadastro.

---

## Ordem de Execução

```
Sprint A — Backend (C5 infra)
  A1. @fastify/cookie + env COOKIE_SECRET
  A2. CORS origin fixo + env FRONTEND_URL
  A3. Plugin auth: fallback para cookie
  A4. Login: set cookies
  A5. Refresh: ler/setar cookies
  A6. Logout: clear cookies
  A7. Switch corretora: set cookie
  A8. Portal: cookie et-portal-token

Sprint B — Frontend (C5 cliente)
  B1. next.config.ts rewrites
  B2. api.ts: remover getAuthToken, credentials:include
  B3. auth-store: remover token/refreshToken
  B4. portal-auth-store: remover token
  B5. portal-api.ts: credentials:include
  B6. Login page: remover decodificador manual de JWT
  B7. middleware.ts: proteção de rotas via cookie
  B8. api.ts: interceptor 401 → refresh automático
  B9. BroadcastChannel para logout multi-aba

Sprint C — Frontend LGPD Sprint 2
  C1. Banner de cookies (CookieConsent component + layout.tsx)
  C2. Tela /perfil/meus-dados
  C3. Checkboxes de aceite no cadastro + registro de consentimento
```

---

## Checklist de Testes

```
[ ] Login → inspecionar Cookies no DevTools (et-token, et-refresh visíveis, sem acesso via JS)
[ ] Abrir console → localStorage.getItem('auth-storage') não contém token
[ ] document.cookie não exibe et-token (httpOnly)
[ ] Reload da página → sessão mantida (cookie enviado automaticamente)
[ ] Expirar token manualmente → refresh automático funciona sem intervenção
[ ] Logout → cookies removidos → redirect para /login
[ ] Logout em aba 1 → aba 2 desconecta (BroadcastChannel)
[ ] Trocar corretora → novo et-token com corretoraId correto
[ ] Portal Segurado → cookie et-portal-token separado, não interfere com et-token
[ ] Rewrite proxy → requests para /api/* chegam na API com cookie correto
[ ] Banner de cookies exibido na primeira visita
[ ] Checkbox de aceite não vem pré-marcado
[ ] Tela Meus Dados → download JSON com dados corretos
[ ] Exclusão de conta via Meus Dados → anonimização + logout
```

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Rewrite proxy adiciona latência | Baixa (~10ms) | Baixo | Aceitável |
| Cookie não enviado em algum endpoint | Média | Alto | Testar todos os prefixes de path |
| Portal e app com cookies conflitantes | Baixa | Alto | Paths distintos (`/api` vs `/api/portal`) |
| Usuários com sessão existente perdida | Alta (deploy) | Médio | Aceitar: localStorage ainda existe no deploy, usuário faz login uma vez |
| Next.js middleware lento (edge) | Baixa | Baixo | Matcher restrito a rotas protegidas |
