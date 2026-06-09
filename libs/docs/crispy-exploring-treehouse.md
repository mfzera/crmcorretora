# PLANO DE DIAGNÓSTICO: CICLO DE VIDA DE SEGUROS - ECOTECH SYS

## 🎯 OBJETIVO
Diagnóstico técnico do sistema de gestão de seguros com foco em identificar **pontos de falha críticos** no ciclo Venda → Renovação → Cotação → Fechamento.

---

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **RENOVAÇÕES DEPENDEM DE AÇÃO MANUAL - RISCO DE PERDA DE RECEITA**

**Problema:** Sistema NÃO cria renovações automaticamente. Sem job scheduler configurado.

**Localização do código:**
- `apps/api/src/routes/documentos-venda/index.ts:655-743` - Endpoint POST `/:id/criar-renovacao`
- `apps/api/src/routes/renovacoes/index.ts:729-789` - Endpoint POST `/criar-manual`

**Cenário de falha:**
1. Apólice ativa chega em 45 dias do vencimento
2. **Nenhum registro de renovação é criado automaticamente**
3. Renovação só aparece na "Área de Trabalho" se usuário clicar manualmente em "Criar Renovação"
4. Se ninguém criar a renovação → cliente não é contatado → apólice expira → **perda de receita**

**Regra de negócio atual:**
- Janela de renovação: 45 dias antes do vencimento (`dataInicioJanela`)
- Nova vigência: +1 ano a partir da data de término original
- Preserva: prêmio, comissão, coberturas, valor segurado

**Infraestrutura faltando:**
- ❌ Job scheduler (Bull, Agenda, node-cron)
- ❌ Cron job diário para detectar apólices entrando em janela de renovação
- ❌ Sistema de notificações automáticas
- ❌ Workers assíncronos

**Impacto:** **CRÍTICO** - Receita em risco. Renovações dependem 100% de vigilância humana.

---

### 2. **LÓGICA DE NEGÓCIO ACOPLADA A ROTAS HTTP - IMPOSSÍVEL REUTILIZAR**

**Problema:** Toda lógica de transição de status, cálculos e validações está dentro dos handlers do Fastify.

**Exemplos:**

**Cálculo de comissão inline (sem abstração):**
```typescript
// apps/api/src/routes/cotacoes/index.ts (linha ~200)
const valorComissao = (premioEstimado * percentualComissao) / 100;
```

**Transição de status hardcoded:**
```typescript
// apps/api/src/routes/documentos-venda/index.ts:612
if (documento.status !== 'AGUARDANDO_CADASTRO') {
  throw new ValidationError('Este documento não está aguardando aprovação');
}
await db.update(documentosVenda).set({ status: 'ATIVO' });
```

**Consequências:**
- Não dá para criar renovações via job scheduler (precisaria duplicar código)
- Não dá para testar lógica sem subir Fastify + banco de dados
- Não dá para rodar cálculos em CLI/scripts administrativos
- Violação do princípio Single Responsibility

**Arquivos contaminados:**
- `apps/api/src/routes/cotacoes/index.ts` (500+ linhas)
- `apps/api/src/routes/documentos-venda/index.ts` (700+ linhas)
- `apps/api/src/routes/renovacoes/index.ts` (800+ linhas)
- `apps/api/src/routes/propostas/index.ts`

**Impacto:** **CRÍTICO** - Impede automação. Aumenta custo de manutenção exponencialmente.

---

### 3. **TYPE DRIFT ENTRE FRONTEND E BACKEND - VALIDAÇÕES DIVERGENTES**

**Problema:** Tipos duplicados manualmente em 3+ locais. Nenhuma source of truth.

**Evidência #1: Validação de nome de cliente divergente**

Frontend:
```typescript
// apps/web/src/components/clientes/novo-cliente-dialog.tsx
const schemaPF = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
});
```

Backend:
```typescript
// libs/features/clientes/src/schemas.ts
export const createClientePFSchema = z.object({
  nome: z.string().min(2).max(256),
});
```

**Resultado:** Frontend aceita "Jo" mas backend rejeita. UX quebrada.

**Evidência #2: Enums desincronizados**

Frontend define `TipoSeguro` como TypeScript enum:
```typescript
// apps/web/src/types/produto.ts
export enum TipoSeguro {
  AUTO = 'AUTO',
  VIDA = 'VIDA',
  // ...
}
```

Backend define como Zod enum:
```typescript
// apps/api/src/routes/produtos/index.ts
tipoSeguro: z.enum(["AUTO", "VIDA", "RESIDENCIAL", "EMPRESARIAL", "SAUDE", "VIAGEM", "OUTROS"])
```

**Se alguém adiciona "ODONTO" no backend mas esquece frontend:**
- API aceita
- Frontend não mostra na UI
- Bug silencioso

**Arquivos com duplicação:**
- `apps/web/src/types/cliente.ts` (tipos manuais)
- `apps/web/src/types/produto.ts` (tipos manuais)
- `apps/web/src/types/documento-venda.ts` (tipos manuais)
- `libs/features/*/src/schemas.ts` (Zod schemas backend)
- `libs/shared/database/src/schema/*.ts` (Drizzle schemas)

**Impacto:** **ALTO** - Bugs silenciosos. Tempo perdido sincronizando manualmente.

---

### 4. **MODELO DE DOMÍNIO ANÊMICO - LIBS/FEATURES SÓ TÊM SCHEMAS**

**Problema:** Pacotes `libs/features/*` só exportam validações Zod. Zero lógica de negócio.

**Estrutura atual:**
```
libs/features/cotacoes/
├── src/
│   ├── index.ts          # export * from './schemas'
│   └── schemas.ts        # só Zod schemas
└── package.json
```

**O que deveria ter:**
- ❌ Entidades de domínio (Cotacao, DocumentoVenda, Renovacao)
- ❌ Value Objects (Status, Premium, Commission)
- ❌ Serviços de domínio (CommissionCalculator, RenewalEngine)
- ❌ Use cases (CreateCotacao, IniciarRenovacao)
- ❌ Repositories (abstrações de acesso a dados)

**Impacto:** **ALTO** - Arquitetura não escala. Impossível isolar lógica para testes.

---

### 5. **TRANSIÇÕES DE STATUS SEM MÁQUINA DE ESTADOS - RISCO DE ESTADOS INVÁLIDOS**

**Problema:** Status são strings soltas. Nenhuma validação de transições permitidas.

**Fluxo atual (Documento de Venda):**
```
EM_NEGOCIACAO → AGUARDANDO_CLIENTE → VENDA_CONFIRMADA → 
AGUARDANDO_CADASTRO → ATIVO → (renovação)
```

**Problema identificado:**
```typescript
// Nada impede isso no código:
await db.update(documentosVenda)
  .set({ status: 'ATIVO' })  // Deveria passar por AGUARDANDO_CADASTRO primeiro!
  .where(eq(documentosVenda.id, id));
```

**Validações manuais espalhadas:**
```typescript
// apps/api/src/routes/documentos-venda/index.ts:612
if (documento.status !== 'AGUARDANDO_CADASTRO') {
  throw new ValidationError('...');
}
```

**Se alguém adiciona endpoint novo e esquece validação → estado corrompido.**

**Solução ideal:** State Machine com transições explícitas:
```typescript
const DocumentoVendaStateMachine = {
  EM_NEGOCIACAO: ['AGUARDANDO_CLIENTE', 'PERDIDO', 'CANCELADO'],
  AGUARDANDO_CLIENTE: ['VENDA_CONFIRMADA', 'PERDIDO'],
  VENDA_CONFIRMADA: ['AGUARDANDO_CADASTRO'],
  AGUARDANDO_CADASTRO: ['ATIVO', 'CANCELADO'],
  ATIVO: [], // terminal
};
```

**Impacto:** **MÉDIO** - Risco baixo hoje (validações manuais existem), mas frágil.

---

### 6. **ACESSO DIRETO AO DATABASE EM TODOS OS ENDPOINTS - SEM REPOSITORY PATTERN**

**Problema:** Todos os 14 arquivos de rotas importam e usam Drizzle diretamente.

**Exemplo:**
```typescript
// apps/api/src/routes/cotacoes/index.ts
import { db } from '@ecotech/shared/database';
import { cotacoes, eq, and } from 'drizzle-orm';

fastify.get('/:id', async (request) => {
  const cotacao = await db.query.cotacoes.findFirst({
    where: and(
      eq(cotacoes.id, request.params.id),
      eq(cotacoes.seguradoraId, request.seguradoraId)
    )
  });
});
```

**Repetido em 14 arquivos diferentes.**

**Consequências:**
- Query lógic duplicada (filtro por seguradoraId em todo lugar)
- Impossível mockar em testes unitários
- Não dá para trocar Drizzle por outro ORM sem refactor massivo
- Violação da inversão de dependência

**Impacto:** **MÉDIO** - Aumenta dívida técnica. Dificulta testes.

---

## 🟡 GARGALOS DE INTEGRAÇÃO FRONTEND-BACKEND

### 7. **FORMATO DE RESPOSTA DA API INCONSISTENTE**

**Problema:** Algumas rotas retornam `{ data: [...] }`, outras retornam `{ success: true, data: {...} }`.

**Frontend espera:**
```typescript
// apps/web/src/lib/api.ts linha ~30
return await response.json() as T;
```

**Backend retorna formatos diferentes:**
- `GET /cotacoes` → `{ data: Cotacao[], total: number, pagina: number }`
- `POST /cotacoes` → `{ success: true, data: Cotacao }`
- `GET /renovacoes/pendentes` → `RenovacaoPendente[]` (array direto!)

**Risco:** Frontend quebra silenciosamente se API mudar formato.

**Impacto:** **MÉDIO** - Aumenta bugs de integração.

---

### 8. **PRIORIDADE DE RENOVAÇÃO CALCULADA NO FRONTEND - INCONSISTÊNCIA COM BACKEND**

**Problema:** Lógica de prioridade (ALTA/MEDIA/BAIXA) está no componente React.

**Frontend:**
```typescript
// apps/web/src/components/area-trabalho/renovacao-detalhes-dialog.tsx
const prioridade = diasParaVencimento <= 7 ? 'ALTA' 
  : diasParaVencimento <= 30 ? 'MEDIA' : 'BAIXA';
```

**Backend:** Não calcula prioridade. Só retorna `diasParaVencimento`.

**Problema:** Se API começar a calcular prioridade diferente → frontend e backend divergem.

**Impacto:** **BAIXO** - Estético, mas revela falta de contrato claro.

---

## 📋 CHECKLIST DE AJUSTES (POR PRIORIDADE)

### 🔴 CRÍTICO (Bloqueia automação e crescimento)

1. **[ ] Implementar Job Scheduler para Renovações Automáticas**
   - Adicionar Bull ou Agenda
   - Cron job diário: detectar apólices entrando em janela de 45 dias
   - Auto-criar registro em `renovacao_comercial` com status `NAO_TRABALHADO`
   - Notificar vendedor via email/webhook
   - **Arquivos:** Criar `apps/api/src/jobs/renovacao-auto-creator.job.ts`

2. **[ ] Extrair Lógica de Negócio para Domain Layer**
   - Criar `libs/features/cotacoes/src/domain/cotacao.entity.ts`
   - Criar `libs/features/cotacoes/src/application/create-cotacao.usecase.ts`
   - Criar `libs/features/renovacoes/src/domain/renewal-engine.service.ts`
   - Mover cálculos (comissão, prêmio) para domain services
   - **Arquivos:** Refatorar 3 pacotes principais (cotacoes, documentos-venda, renovacoes)

3. **[ ] Implementar Shared Types ou Code Generation**
   - **Opção A (recomendada):** Migrar para tRPC (type-safety end-to-end)
   - **Opção B:** Gerar tipos do OpenAPI spec
   - **Opção C:** Mover Zod schemas para `libs/shared/contracts` e importar no frontend
   - **Arquivos:** Criar `libs/shared/contracts/src/index.ts`

### 🟠 IMPORTANTE (Reduz débito técnico)

4. **[ ] Adicionar Repository Pattern**
   - Criar `CotacaoRepository`, `DocumentoVendaRepository`, `RenovacaoRepository`
   - Encapsular queries Drizzle
   - Injetar repositories nos use cases
   - **Arquivos:** Criar `libs/shared/database/src/repositories/`

5. **[ ] Implementar State Machine para Status**
   - Criar `DocumentoVendaStateMachine` com transições válidas
   - Validar transições antes de salvar no banco
   - Adicionar constraint check no Postgres (opcional)
   - **Arquivos:** Criar `libs/features/documentos-venda/src/domain/state-machine.ts`

6. **[ ] Padronizar Formato de Respostas API**
   - Definir `ApiResponse<T>` type
   - Wrapper global no Fastify
   - Documentar contrato
   - **Arquivos:** Criar `libs/shared/types/src/api-response.ts`

### 🟢 MELHORIA (Nice-to-have)

7. **[ ] Adicionar Sistema de Eventos de Domínio**
   - Event emitter para transições de status
   - Subscribers para notificações, audit log, integrações
   - **Arquivos:** Criar `libs/shared/events/`

8. **[ ] Adicionar Testes de Integração para Ciclo Completo**
   - Testar: Cotação → Proposta → Venda → Renovação
   - Validar transições de status end-to-end
   - **Arquivos:** Criar `apps/api/tests/integration/lifecycle.test.ts`

9. **[ ] Dashboard de Renovações Vencendo**
   - Widget mostrando apólices sem renovação criada (< 30 dias)
   - Alerta vermelho para risco de perda
   - **Arquivos:** Modificar `apps/web/src/app/(app)/workspace/page.tsx`

---

## 🏗️ ESTRUTURA DE PASTAS IDEAL (MODO PLANEJAMENTO)

### Proposta: Domain-Driven Design no Monorepo

```
libs/features/cotacoes/
├── src/
│   ├── domain/                    # Lógica de negócio pura
│   │   ├── cotacao.entity.ts      # Entidade com métodos de negócio
│   │   ├── status.value-object.ts # Value object com validações
│   │   └── commission.calculator.ts # Serviço de domínio
│   ├── application/               # Casos de uso (orquestração)
│   │   ├── create-cotacao.usecase.ts
│   │   ├── update-cotacao.usecase.ts
│   │   └── mark-as-lost.usecase.ts
│   ├── infrastructure/            # Acesso a dados
│   │   └── cotacao.repository.ts  # Implementação concreta
│   ├── schemas/                   # DTOs e validações (atual)
│   │   └── cotacao.schemas.ts
│   └── index.ts                   # Exports públicos
└── package.json

libs/shared/
├── contracts/                     # NOVO: Tipos compartilhados
│   ├── src/
│   │   ├── entities/              # Types de entidades
│   │   ├── enums/                 # Enums compartilhados
│   │   └── api-responses/         # Contratos de API
│   └── package.json
├── domain/                        # NOVO: Primitivas de domínio
│   ├── src/
│   │   ├── entity.base.ts
│   │   ├── value-object.base.ts
│   │   ├── result.ts              # Result type para error handling
│   │   └── domain-event.ts
│   └── package.json
├── events/                        # NOVO: Sistema de eventos
│   └── src/
│       ├── event-emitter.ts
│       └── subscribers/
└── database/
    ├── src/
    │   ├── schema/                # Schemas Drizzle (atual)
    │   ├── repositories/          # NOVO: Interfaces de repositories
    │   │   ├── cotacao.repository.interface.ts
    │   │   └── documento-venda.repository.interface.ts
    │   └── migrations/
    └── package.json

apps/api/
├── src/
│   ├── routes/                    # REFATORAR: Só HTTP handling
│   │   └── cotacoes/
│   │       └── index.ts           # Recebe request, chama use case, retorna response
│   ├── jobs/                      # NOVO: Background jobs
│   │   ├── renovacao-auto-creator.job.ts
│   │   └── notificacoes.job.ts
│   └── main.ts
└── package.json
```

### Benefícios da Estrutura Proposta:

1. **Isolamento de domínio:** Lógica testável sem HTTP/DB
2. **Reusabilidade:** Use cases podem ser chamados de rotas, jobs, CLI
3. **Type safety:** `libs/shared/contracts` importado por frontend e backend
4. **Injeção de dependência:** Repositories como interfaces
5. **Escalabilidade:** Fácil adicionar novos casos de uso sem inchar rotas

---

## 🎯 PONTOS FRACOS - RESUMO EXECUTIVO

| # | Problema | Impacto | Onde Quebra |
|---|----------|---------|-------------|
| 1 | Renovações manuais | 🔴 Perda receita | Cliente não renovado por esquecimento |
| 2 | Lógica em HTTP handlers | 🔴 Impossível automatizar | Jobs não conseguem criar renovações |
| 3 | Type drift frontend/backend | 🟠 Bugs silenciosos | Validações divergentes causam UX quebrada |
| 4 | Modelo anêmico | 🟠 Débito técnico | Lógica espalhada, não testável |
| 5 | Status sem state machine | 🟡 Estados inválidos | Transição proibida não validada |
| 6 | Acesso direto a DB | 🟡 Acoplamento | Impossível mockar em testes |
| 7 | Formato API inconsistente | 🟡 Integração frágil | Frontend quebra em mudanças |

---

## 📦 PACOTES A CRIAR/REFATORAR

### Novos Pacotes:
1. `libs/shared/contracts` - Tipos compartilhados
2. `libs/shared/domain` - Base classes DDD
3. `libs/shared/events` - Event system
4. `apps/api/src/jobs` - Background jobs

### Refatorar:
1. `libs/features/cotacoes` - Adicionar domain/application/infrastructure
2. `libs/features/documentos-venda` - Adicionar domain layer
3. `libs/features/renovacoes` - Adicionar RenewalEngine
4. `apps/api/src/routes/*` - Reduzir para thin controllers

---

## 🚨 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

1. **Semana 1:** Implementar job scheduler + auto-criação de renovações (crítico para receita)
2. **Semana 2:** Extrair domain layer para renovações (permite jobs reutilizarem lógica)
3. **Semana 3:** Implementar shared contracts + migrar types (elimina drift)
4. **Semana 4:** Adicionar repository pattern (melhora testabilidade)
5. **Semana 5:** Refatorar cotações e propostas para DDD (completa ciclo)

---

## 📊 MÉTRICAS DE SUCESSO

- ✅ 100% renovações criadas automaticamente (45 dias antes)
- ✅ 0 discrepâncias de tipos entre frontend/backend
- ✅ Cobertura de testes unitários > 80% em domain layer
- ✅ Tempo de onboarding de novos devs reduzido em 50% (arquitetura clara)
- ✅ Zero estados inválidos em produção (state machine)

---

**Última atualização:** 2026-01-05
