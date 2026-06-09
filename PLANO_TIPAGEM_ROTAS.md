# Plano: Blindagem de Tipagem nas Rotas Fastify + Zod

## Contexto

Rotas da API estavam retornando 500 em produção por falha de serialização Zod (`FST_ERR_RESPONSE_SERIALIZATION`). Os schemas de resposta exigiam `{ success: true, data: ... }` mas os handlers retornavam dados crus. O build não capturava isso em tempo de compilação.

---

## Diagnóstico raiz

### Por que o build passava silenciosamente?

**Camada 1 — `routeDoc` apagava os tipos (causa principal)**

```typescript
// apps/api/src/docs/utils.ts (antes do fix)
response: Record<number, z.ZodTypeAny>
//                         ^^^^^^^^^^
//  ZodTypeAny = ZodType<any, any>
//  input<ZodTypeAny> = any → handler pode retornar qualquer coisa
```

Com `Record<number, z.ZodTypeAny>`, o TypeScript resolvia o tipo de retorno do handler como `any`. O compilador não reclamava de nada.

**Camada 2 — `fastify-type-provider-zod@6.1.0` usa `input<Schema>` no serializer** (bug de versão)

```typescript
// node_modules/fastify-type-provider-zod/dist/esm/core.d.ts
serializer: this["schema"] extends $ZodType ? input<this["schema"]> : unknown;
//                                            ^^^^^
//  deveria ser output<this["schema"]>
```

Para `z.literal(true)` e `z.unknown()`, `input = output`, então o impacto é mínimo. Para campos com coerção (`z.coerce.number()`), a diferença pode gerar falsos-positivos futuros.

**Camada 3 — `success: true` sem `as const`**

285 handlers retornavam `{ success: true, ... }` sem `as const`. TypeScript infere `success: boolean` em vez do literal `true`, que não satisfaz `z.literal(true)`. Com a checagem ativa, esses podem gerar erros de compilação.

**Camada 4 — `reply.send()` direto (90 handlers)**

Handlers que usam `reply.send(payload)` em vez de `return payload` **bypassam completamente** a checagem de tipo de retorno do handler, mesmo com o `routeDoc` corrigido.

---

## Resposta: "remover os `any` do Zod muda alguma coisa?"

**Sim, muda tudo.** O problema é `ZodTypeAny = ZodType<any, any>`. A cadeia:

```
// ANTES (routeDoc com Record<number, ZodTypeAny>)
response[200] = z.ZodTypeAny
input<z.ZodTypeAny> = any
→ handler pode retornar qualquer coisa, zero erro

// DEPOIS (routeDoc preservando TResponse)
response[200] = z.ZodObject<{ success: z.ZodLiteral<true>; data: z.ZodUnknown }>
input<...>   = { success: true; data: unknown }
→ handler DEVE retornar esse shape, erro de compilação se não
```

A cadeia de tipos é real e confirmada no código-fonte do Fastify v5.8.5:

```
RouteHandlerMethod
  → ResolveFastifyReplyReturnType
    → ResolveFastifyReplyType
      → ResolveReplyFromSchemaCompiler
        → CallSerializerTypeProvider<TypeProvider, schema.response[200]>
          → ZodTypeProvider.serializer = input<schema>
            → { success: true; data: unknown }
```

---

## O que já foi feito

- [x] `routeDoc` corrigido para preservar `TResponse` generic (`apps/api/src/docs/utils.ts`)
- [x] Helper `ok<T>(data)` criado e exportado de `apps/api/src/docs/index.ts`
- [x] 9 handlers de `/metrics` corrigidos (eram os que geravam 500 em produção)
- [x] `porPagina` em produtos: limite aumentado de 100 → 500

---

## Plano de execução

### Passo 1 — Verificar que a inferência realmente funciona

Criar um arquivo temporário dentro do projeto (com acesso ao módulo `zod`) e confirmar que o compilador rejeita um handler que retorna shape errado:

```typescript
// apps/api/src/routes/_type-test.ts (deletar após validar)
import { routeDoc, ok } from '../../docs/index.js';
import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const test: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/', {
    schema: {
      ...routeDoc({ response: { 200: z.object({ success: z.literal(true), data: z.unknown() }) } }),
    },
  }, async () => {
    // @ts-expect-error — deve falhar: falta success: true
    return { someData: 123 };
  });
};
```

Se `@ts-expect-error` for aceito sem erro → inferência funcionando.
Se `@ts-expect-error` for "unused" → inferência NÃO está chegando ao handler return, precisa de abordagem alternativa (ver Passo 1b).

**Passo 1b (fallback)** — Se a inferência não funcionar via return type:
- Opção A: lint rule customizado via `eslint-plugin-local` que detecta handlers sem `ok()` ou `as const`
- Opção B: runtime guard — função wrapper `registerRoute` que bate o retorno contra o schema antes de serializar
- Opção C: teste de integração leve que bate todos os endpoints 200 e valida o envelope

---

### Passo 2 — Migrar 285 handlers para `ok()`

**Escopo:** Handlers com `return { success: true, data: ... }` (sem `as const`).

**Padrão de migração:**

```typescript
// antes
return { success: true, data: resultado };

// depois
return ok(resultado);
```

Para paginação:
```typescript
// antes
return { success: true, ...createPaginatedResult(items, total, page, limit) };

// depois — createPaginatedResult já retorna { data, meta }, ok() só wraps
return ok(createPaginatedResult(items, total, page, limit));
// ou manter o spread se o schema espera { success, data, meta } flat
```

**Arquivos por prioridade (maiores primeiro):**

| Arquivo | Handlers sem `as const` | Prioridade |
|---------|------------------------|-----------|
| `routes/sales-documents/index.ts` | 30 | Alta |
| `routes/renewals/index.ts` | 18 | Alta |
| `routes/clients/index.ts` | 14 | Alta |
| `routes/roles/index.ts` | 14 | Alta |
| `routes/users/index.ts` | 14 | Alta |
| `routes/opportunities/index.ts` | 13 | Alta |
| `routes/claims/index.ts` | 13 | Alta |
| `routes/quotes/index.ts` | 11 | Média |
| `routes/auth/index.ts` | 10 | Média |
| `routes/crm-management/index.ts` | 9 | Média |
| Demais arquivos | ~139 | Normal |

**Atenção ao problema Drizzle:** Em handlers onde o Drizzle retorna `Date` mas o schema tem `z.string()`, o TypeScript vai reclamar após a migração. Nesses casos, cast pontual:

```typescript
return ok(result as z.infer<typeof dataSchema>);
```

---

### Passo 3 — Auditar 90 handlers com `reply.send()`

Esses bypassam a checagem de retorno e precisam de revisão manual por categoria:

| Categoria | Ação |
|-----------|------|
| `reply.send({ success: true, data: ... })` | Converter para `return ok(...)` |
| Streaming / WebSocket (chat) | Manter `reply.send()`, envelope diferente — não aplicar `ok()` |
| Redirect (`reply.redirect(...)`) | Manter, retorna void |
| Erro explícito (`reply.status(4xx).send(...)`) | Manter, já tem `success: false` via error handler |

**Arquivos com mais `reply.send()` para revisar:**

| Arquivo | Usos |
|---------|------|
| `routes/opportunities/index.ts` | 12 |
| `routes/renewal-imports/index.ts` | 10 |
| `routes/claims/index.ts` | 9 |
| `routes/crm-management/index.ts` | 8 |
| `routes/admin/auth.ts` | 7 |
| `routes/chat/index.ts` | 6 |
| `routes/broker-config/index.ts` | 6 |
| `routes/attachments/index.ts` | 5 |
| `routes/admin/auth-2fa.ts` | 5 |

---

### Passo 4 — Avaliar upgrade de `fastify-type-provider-zod`

Verificar se versão > 6.1.0 corrigiu o `serializer: input<Schema>` → `serializer: output<Schema>`.

```bash
npm info fastify-type-provider-zod versions
```

Se corrigido: atualizar e rodar `tsc --noEmit` para capturar qualquer diferença.
Se não corrigido: impacto atual é baixo (só afeta schemas com coerção/transforms no response, que são raros).

---

### Passo 5 — Proteger contra regressão futura

Com `routeDoc` corrigido e `strict: true` já no `tsconfig`, o CI já deve pegar regressões — desde que o `routeDoc` não seja revertido.

Documentar no `CLAUDE.md` (ou em comentário no `routeDoc`):
- Nunca usar `Record<number, z.ZodTypeAny>` no response
- Sempre usar `ok()` para respostas de sucesso
- Para conflitos com tipos Drizzle, usar cast pontual com `as z.infer<typeof schema>`

---

## Resumo de escopo

| Item | Quantidade | Complexidade | Status |
|------|-----------|--------------|--------|
| `routeDoc` corrigido | 1 arquivo | — | ✅ Feito |
| Helper `ok()` criado | 1 função | — | ✅ Feito |
| Handlers `/metrics` corrigidos | 9 | — | ✅ Feito |
| Verificar inferência (Passo 1) | teste temporário | Baixa | Pendente |
| Migrar handlers para `ok()` | ~285 | Mecânica | Pendente |
| Auditar `reply.send()` | ~90 | Manual | Pendente |
| Upgrade `fastify-type-provider-zod` | 1 | Baixo risco | Pendente |
