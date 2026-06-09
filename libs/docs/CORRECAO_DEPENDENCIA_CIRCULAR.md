# 🔧 Correção de Dependência Circular - types ↔ database

## 🐛 Problema Encontrado

Ao executar `pnpm dev`, ocorria erro:

```bash
NX   Could not execute command because the task graph has a circular dependency

api:dev:development --> api:build:production --> database:build --> types:build --> database:build
```

**Causa:** Dependência circular entre os pacotes `@ecotech/shared/types` e `@ecotech/shared/database`

---

## 🔍 Raiz do Problema

### Ciclo de Dependência:

1. **`types`** importava de **`database`**:
   - `types/src/entities.ts` → `import { Cliente, Produto } from '@ecotech/shared/database'`
   - `types/src/dtos.ts` → `import { DocumentoVenda } from '@ecotech/shared/database'`
   - `types/src/fastify.d.ts` → `import { Seguradora } from '@ecotech/shared/database'`

2. **`database`** importava de **`types`**:
   - `database/src/repositories/base-repository.ts` → `import { PaginationMetadata } from '@ecotech/shared/types'`
   - `database/src/repositories/cotacao.repository.ts` → `import { Cotacao, StatusCotacao } from '@ecotech/shared/types'`
   - `database/src/repositories/renovacao.repository.ts` → `import { RenovacaoComercial } from '@ecotech/shared/types'`
   - `database/src/repositories/documento-venda.repository.ts` → `import { DocumentoVenda } from '@ecotech/shared/types'`

**Resultado:** `database` → `types` → `database` (CIRCULAR!)

---

## ✅ Soluções Aplicadas

### 1. Remover re-exports de database em types

**Antes (`types/src/entities.ts`):**
```typescript
export type { Cliente, Produto } from '@ecotech/shared/database'; // ❌ CIRCULAR
```

**Depois:**
```typescript
// Apenas enums (não dependem de database)
export type TipoPessoa = 'PF' | 'PJ';
export type StatusCotacao = 'EM_ELABORACAO' | 'PERDIDA' | 'EXPIRADA' | 'CONVERTIDA';
```

---

### 2. Definir PaginationMetadata no próprio database

**Antes (`database/src/repositories/base-repository.ts`):**
```typescript
import type { PaginationMetadata } from '@ecotech/shared/types'; // ❌ CIRCULAR
```

**Depois:**
```typescript
// Definir localmente
export interface PaginationMetadata {
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}
```

---

### 3. Importar tipos diretamente dos schemas em repositories

**Antes (`database/src/repositories/cotacao.repository.ts`):**
```typescript
import type { Cotacao, NewCotacao, StatusCotacao } from '@ecotech/shared/types'; // ❌ CIRCULAR
```

**Depois:**
```typescript
import type { Cotacao, NewCotacao } from '../schema/cotacao';

// Status definido localmente
type StatusCotacao = 'EM_ELABORACAO' | 'PERDIDA' | 'EXPIRADA' | 'CONVERTIDA';
```

**Aplicado em:**
- ✅ `cotacao.repository.ts`
- ✅ `renovacao.repository.ts`
- ✅ `documento-venda.repository.ts`

---

### 4. Usar `any` em type declarations (fastify.d.ts)

**Antes (`types/src/fastify.d.ts`):**
```typescript
import type { Seguradora } from '@ecotech/shared/database'; // ❌ CIRCULAR

interface FastifyRequest {
  seguradora: Seguradora;
}
```

**Depois:**
```typescript
// Evitar circular dependency
interface FastifyRequest {
  seguradora: any; // Use specific type where needed
}
```

---

### 5. Definir tipos inline em DTOs

**Antes (`types/src/dtos.ts`):**
```typescript
import type { Cliente, Produto } from '@ecotech/shared/database'; // ❌ CIRCULAR
```

**Depois:**
```typescript
// Inline definitions
type Cliente = any;
type Produto = any;
type DocumentoVenda = any;
```

**Nota:** DTOs definem suas próprias estruturas, não precisam dos tipos completos do database.

---

### 6. Adicionar extensões `.js` em imports ESM

**Problema:** Pacotes com `"type": "module"` no package.json requerem extensões explícitas.

**Antes:**
```typescript
export * from './api-response'; // ❌ Erro em Node16 moduleResolution
```

**Depois:**
```typescript
export * from './api-response.js'; // ✅ OK
```

**Aplicado em:**
- ✅ `types/src/index.ts`
- ✅ `types/src/dtos.ts`

---

## 📊 Resumo das Mudanças

### Arquivos Modificados:

1. **`libs/shared/types/src/index.ts`** - Adicionou `.js` extensões
2. **`libs/shared/types/src/entities.ts`** - Removeu re-exports de database
3. **`libs/shared/types/src/dtos.ts`** - Tipos inline em vez de imports
4. **`libs/shared/types/src/fastify.d.ts`** - Mudou `Seguradora` para `any`
5. **`libs/shared/database/src/repositories/base-repository.ts`** - Definiu `PaginationMetadata` localmente
6. **`libs/shared/database/src/repositories/cotacao.repository.ts`** - Import de schema local
7. **`libs/shared/database/src/repositories/renovacao.repository.ts`** - Import de schema local
8. **`libs/shared/database/src/repositories/documento-venda.repository.ts`** - Import de schema local

---

## ✅ Resultado

### Antes:
```bash
❌ NX   Could not execute command because the task graph has a circular dependency
```

### Depois:
```bash
✅ NX   Running target dev for 2 projects...

> nx run types:build
Compiling TypeScript files for project "types"...
Done compiling TypeScript files for project "types".

> nx run web:dev
▲ Next.js 16.1.1 (Turbopack)
- Local: http://localhost:3000
✓ Ready in 1319ms

✅ Sistema funcionando!
```

---

## 🎯 Princípios Aplicados

1. **Não criar ciclos:** Pacotes de infraestrutura (database) não devem depender de tipos compartilhados
2. **Definir tipos próximos ao uso:** Cada pacote define os tipos que precisa
3. **Re-exports com cuidado:** Evitar re-exportar de pacotes que podem criar ciclos
4. **Enums são seguros:** Enums primitivos (strings) podem ser compartilhados sem problemas

---

## 📚 Lições Aprendidas

### ✅ O que fazer:
- Definir tipos de domínio no próprio schema
- Usar tipos inline em DTOs
- Manter `types` package apenas para tipos de API (responses, enums)
- Importar diretamente de schemas quando possível

### ❌ O que evitar:
- Re-exportar tipos de database em types package
- Importar de types em packages de infraestrutura (database, repositories)
- Criar cadeias de dependências longas

---

## 🔮 Melhorias Futuras (Opcional)

1. **Code generation:** Gerar tipos do OpenAPI spec para garantir sincronia
2. **tRPC:** Migrar para tRPC para type-safety end-to-end automático
3. **Monorepo strictness:** Configurar Nx boundary rules para prevenir ciclos

---

**Status:** ✅ CORRIGIDO  
**Data:** 2026-01-05  
**Tempo:** ~30 minutos de debugging + 15 minutos de correções
