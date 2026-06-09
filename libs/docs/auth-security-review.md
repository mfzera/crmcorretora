# Auth Security Review — EcoTech Sys

Análise do sistema de autenticação/autorização. Itens marcados com ✅ já foram corrigidos.

---

## Prioridade Alta

### 1. Sem invalidação de refresh token (sem blacklist)

**Arquivo:** `apps/api/src/routes/auth/index.ts` — endpoint `POST /auth/refresh`

O refresh token anterior não é invalidado quando um novo é gerado. Se um atacante obtiver um refresh token (via XSS, log leakage, etc.), ele continua válido até expirar mesmo depois de o usuário "rotacionar".

**Correção recomendada:** Criar tabela `refresh_tokens` com `jti`, `userId`, `expiresAt`, `revokedAt`. Ao usar um refresh token, marcar como usado e emitir novo. Detectar reuso (token já revogado = comprometimento) → invalidar todos os tokens do usuário.

Mínimo viável: adicionar campo `refreshTokenVersion` no usuário e incrementar ao revogar. O refresh token inclui a versão e o backend valida.

---

### 2. Tokens no localStorage (XSS)

**Arquivo:** `apps/web/src/stores/auth-store.ts` — `persist` com `name: 'auth-storage'`

`token` e `refreshToken` são persistidos no localStorage via Zustand. Qualquer XSS lê ambos com uma linha de JS.

**Correção recomendada:** Access token em memória apenas (sem persist). Refresh token em HttpOnly cookie — requer o backend fazer `Set-Cookie` no `/auth/refresh` e `/auth/login`. É a única proteção real contra XSS. Enquanto não implementado, ter CSP estrita (`script-src 'self'`) é o mínimo.

---

## Prioridade Média

### 3. `getAuthToken()` bypassa o Zustand store

**Arquivo:** `apps/web/src/lib/api.ts:34-50`

```ts
// atual — lê do disco a cada request
const stored = localStorage.getItem('auth-storage');
const token = parsed.state?.token || null;
```

O Zustand persist serializa de volta ao localStorage de forma assíncrona. Entre `setToken(newToken)` e a gravação no localStorage, requests paralelas leem o token antigo. Isso acontece exatamente no AppLayout: `setToken` → imediatamente `getMe()` → `getMe` pode pegar o token antigo.

**Correção:**
```ts
async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const { useAuthStore } = await import('@/stores/auth-store');
  return useAuthStore.getState().token;
}
```
Remove também o JSON.parse desnecessário a cada request.

---

### 4. Information disclosure no ForbiddenError

**Arquivo:** `libs/plugins/authorization/src/index.ts:52-55`

```ts
throw new ForbiddenError('Permissões insuficientes', {
  permissoesNecessarias: requiredPermissions,
  permissoesUsuario: user.permissoes,  // ← expõe ao cliente
});
```

Um usuário pode mapear sistematicamente quais permissões tem e quais cada endpoint exige, apenas lendo os 403.

**Correção:** Manter os detalhes apenas nos logs server-side, nunca no body da resposta:
```ts
// manter verbose nos logs
console.log('❌ Autorização negada:', { permissoesUsuario: user.permissoes, ... });

// resposta ao cliente: sem detalhes
throw new ForbiddenError('Permissões insuficientes');
```

---

### 5. reCAPTCHA opcional no login

**Arquivo:** `apps/api/src/routes/auth/index.ts:315`

```ts
if (recaptchaToken && !(await verifyRecaptcha(recaptchaToken))) {
```

A condição `recaptchaToken &&` faz o reCAPTCHA ser bypassado simplesmente não enviando o campo. Permite brute force de credenciais sem passar pela verificação.

**Correção:** Tornar obrigatório no schema Zod, ou ter rate limiting robusto por IP/email como substituto explícito.

---

### 6. ✅ 403 redirect loop — CORRIGIDO

**Arquivo:** `apps/web/src/lib/api.ts:113-117`

O redirect para `/sem-permissao` agora verifica se já está nessa página antes de redirecionar.

---

### 7. Funções instáveis no deps do PageGuard — bug real

**Arquivo:** `apps/web/src/components/auth/page-guard.tsx:69-78`

`hasPermission`, `hasAnyPermission`, `hasAllPermissions` estão no array de dependências do `useEffect`, mas são funções criadas inline no `usePermissions()` — nova referência a cada render. O efeito roda toda vez que o componente pai renderiza, chamando `router.push()` repetidamente.

**Correção:** Memoizar com `useCallback` no hook:
```ts
// apps/web/src/hooks/use-permissions.ts
const hasPermission = useCallback((permission: string): boolean => {
  if (!user) return false;
  if (user.isAdmin || user.cargo?.isAdmin) return true;
  return user.permissoes?.includes(permission) || false;
}, [user]);
```
Fazer o mesmo para `hasAnyPermission` e `hasAllPermissions`.

---

## Prioridade Baixa

### 8. Performance: 2 requests sequenciais no mount

**Arquivo:** `apps/web/src/components/layout/app-layout.tsx:34-62`

No mount, `refreshToken()` → aguarda → `getMe()`. São ~2 RTTs antes do primeiro render. Em conexões lentas, o spinner de loading dura o dobro do necessário.

**Correção:** Criar endpoint `POST /auth/sync` que recebe o refresh token e retorna `{ token, refreshToken, usuario, permissoes }` — uma só round trip. Ou, se o access token ainda é válido, rodar `refreshToken()` e `getMe()` em paralelo e usar o novo token do refresh para atualizar o store.

---

### 9. Performance: JSON.parse do localStorage a cada request

**Arquivo:** `apps/web/src/lib/api.ts:40-44`

Coberto pelo item 3. Usar `useAuthStore.getState().token` elimina o problema.

---

### 10. Double setAuth causa dois re-renders

**Arquivo:** `apps/web/src/components/layout/app-layout.tsx:39-41`

```ts
setToken(newToken);                          // re-render 1: token novo, refreshToken ANTIGO
if (newRefreshToken) useAuthStore.getState()
  .setAuth(user!, newToken, newRefreshToken); // re-render 2: tudo atualizado
```

Entre os dois renders, o invariante `token recente + refreshToken atualizado` está violado.

**Correção:** Remover o `setToken` redundante, chamar apenas `setAuth`:
```ts
const currentUser = useAuthStore.getState().user;
if (currentUser) {
  useAuthStore.getState().setAuth(currentUser, newToken, newRefreshToken ?? storedRefreshToken);
}
```

---

### 11. `user!` force unwrap sem garantia

**Arquivo:** `apps/web/src/components/layout/app-layout.tsx:41`

```ts
useAuthStore.getState().setAuth(useAuthStore.getState().user!, newToken, newRefreshToken);
```

O refresh é assíncrono. Se o usuário fizer logout enquanto o refresh está em voo, `user` será `null` e essa linha lança `TypeError` em runtime.

**Correção:** Guardar referência antes do await e checar:
```ts
const currentUser = useAuthStore.getState().user;
if (currentUser && newRefreshToken) {
  useAuthStore.getState().setAuth(currentUser, newToken, newRefreshToken);
}
```

---

### 12. Permissões stale em sessões longas

**Arquivos:** JWT payload + Zustand store

O `syncSession` no AppLayout sincroniza permissões a cada reload de página, mas em sessões longas sem reload (SPA), as permissões do JWT podem ficar desatualizadas entre reloads — se um admin alterar o cargo de um usuário, a mudança só é refletida no próximo reload.

**Correção:** Adicionar refresh periódico em background (ex: a cada 30min via `setInterval`), ou ouvir o evento `visibilitychange` para fazer refresh ao voltar para a aba.

---

## Resumo

| # | Problema | Severidade | Esforço | Status |
|---|---|---|---|---|
| 1 | Sem blacklist de refresh token | Alta | Alto | Pendente |
| 2 | Tokens no localStorage | Alta | Alto | Pendente |
| 3 | api.ts bypassa Zustand store | Média | Baixo | Pendente |
| 4 | Information disclosure no 403 | Média | Baixo | Pendente |
| 5 | reCAPTCHA opcional | Média | Baixo | Pendente |
| 6 | 403 redirect loop | Média | Baixo | ✅ Corrigido |
| 7 | Funções instáveis no PageGuard | Média | Baixo | Pendente |
| 8 | 2 requests sequenciais no mount | Baixa | Médio | Pendente |
| 9 | JSON.parse a cada request | Baixa | Baixo | Pendente (junto com #3) |
| 10 | Double setAuth | Baixa | Baixo | Pendente |
| 11 | user! force unwrap | Baixa | Baixo | Pendente |
| 12 | Permissões stale em sessões longas | Baixa | Médio | Pendente |
