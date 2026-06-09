# inaia — Inteligência Artificial da EcoTech

> IA embarcada no EcoTech Sys para corretoras de seguros.
> Powered by Claude (Anthropic) — entregue como "INAIA" para os clientes.

---

## Visão

Transformar o EcoTech em um CRM inteligente que não apenas registra dados, mas **age sobre eles** — sugerindo ações, gerando conteúdo e antecipando perdas antes que aconteçam.

---

## Stack de IA

| Camada | Tecnologia | Uso |
|---|---|---|
| LLM | Claude Haiku 4.5 | Features em tempo real (baixa latência) |
| LLM | Claude Sonnet 4.6 | Geração de propostas, análise de PDF |
| SDK | `@anthropic-ai/sdk` | Integração no backend (apps/api) |
| Infra | BullMQ (já existe) | Jobs batch de scoring e análise |
| Cache | Redis (já existe) | Cache de resumos e scores |

---

## Fase 1 — Quick Wins (alta visibilidade, baixo esforço)

### 1.1 Resumo Inteligente de Oportunidade

**O que faz:** Ao abrir uma oportunidade no kanban, a INAIA gera um resumo contextual do histórico — sem o vendedor precisar reler tudo.

**Exemplo de output:**
> "Cliente morno há 12 dias. Recebeu 3 cotações, a última da Porto Seguro foi rejeitada por preço. Concorrente mencionado: Azul Seguros. Sugestão: revisar proposta com desconto ou produto alternativo."

**Implementação:**
- Endpoint: `GET /oportunidades/:id/resumo-ia` (novo)
- Input: histórico de eventos + cotações vinculadas + dados do cliente
- Model: Claude Haiku (resposta rápida, ~200ms)
- Cache Redis: TTL 4h (invalidar ao criar novo evento)
- Frontend: badge "INAIA" colapsável no sidebar da oportunidade

---

### 1.2 Sugestão de Próxima Ação (Next-Best-Action)

**O que faz:** Card discreto no kanban indicando a ação mais provável de converter a oportunidade com base no estágio, temperatura e tempo sem interação.

**Exemplo de output:**
> "⚡ Ligue hoje. Oportunidades quentes sem contato em +48h têm 60% menos chance de fechar."

**Implementação:**
- Calculado junto com o resumo (mesmo endpoint ou campo adicional)
- Regras base + LLM para justificativa em linguagem natural
- Frontend: chip colorido no card do kanban

---

### 1.3 Geração de Rascunho de Proposta Comercial

**O que faz:** Ao criar uma proposta, o vendedor clica em "Gerar com INAIA" e recebe um rascunho profissional preenchido com os dados da cotação.

**Implementação:**
- Endpoint: `POST /propostas/gerar-rascunho` (novo)
- Input: dados da cotação (produto, coberturas, prêmio, cliente, seguradora)
- Model: Claude Sonnet (qualidade de texto profissional)
- Output: texto formatado em markdown para o campo de descrição da proposta
- Frontend: botão "✨ Gerar com INAIA" no formulário de proposta, com streaming

---

### 1.4 Assistente INAIA no Chat

**O que faz:** Bot no chat da equipe que responde perguntas sobre dados do CRM em linguagem natural. Usa o MCP Server já existente como backend de ferramentas.

**Exemplo de uso:**
> Vendedor: `@inaia quais renovações vencem essa semana?`
> INAIA: "Você tem 4 renovações vencendo: Empresa X (R$3.200 prêmio, quente), Cliente Y..."

**Implementação:**
- Canal/bot especial no chat existente (`@inaia`)
- Integração via MCP Server (já expõe: clientes, cotações, propostas, renovações, oportunidades)
- Model: Claude Haiku com tools (function calling)
- Backend: novo handler no `apps/api/src/routes/chat/`

---

## Fase 2 — Pipeline Inteligente

### 2.1 Score de Risco de Perda em Renovações

**O que faz:** Job noturno que analisa cada renovação em aberto e atribui um score de risco (0–100) de ser perdida. Reordena automaticamente a fila do vendedor por urgência real, não só por data de vencimento.

**Fatores considerados:**
- Dias até vencimento
- Histórico do cliente (renovações anteriores perdidas/ganhas)
- Temperatura atual da oportunidade vinculada
- Seguradora (algumas têm histórico maior de portabilidade)
- Valor do prêmio (clientes de alto valor perdem mais para concorrência)
- Tempo desde última interação

**Implementação:**
- Novo campo: `risco_perda_score` (int, 0–100) + `risco_perda_updated_at` na tabela `renovacao_comercial`
- Novo job: `apps/api/src/worker/jobs/score-renovacoes.job.ts` (diário às 4h)
- Model: Claude Haiku com prompt de scoring estruturado (output JSON)
- Frontend: badge colorido na lista de renovações (verde/amarelo/vermelho)
- Migration necessária: adicionar campos de score

---

### 2.2 Extração Automática de Dados de Apólice por PDF

**O que faz:** Ao fazer upload de uma apólice em PDF na renovação, a INAIA extrai automaticamente: número da apólice, seguradora, vigência, prêmio, coberturas principais — e preenche os campos do formulário.

**Implementação:**
- Hook no upload de anexo do tipo "apolice" em renovações/endossos
- Endpoint: `POST /renovacoes/:id/extrair-apolice` (novo)
- Model: Claude Sonnet com visão (PDF → texto → extração estruturada JSON)
- Output: objeto com campos mapeados para o schema de `renovacao_comercial`
- Frontend: modal de confirmação "INAIA encontrou estes dados — confirmar?"

---

## Fase 3 — Analytics com IA

### 3.1 Análise de Motivos de Perda

**O que faz:** No dashboard do gestor, painel que agrega e interpreta os motivos de perda de oportunidades, identificando padrões: concorrentes frequentes, objeções recorrentes, produtos problemáticos.

**Exemplo de output:**
> "Este mês: 43% das perdas mencionaram preço. Porto Seguro foi citada em 12 perdas. Produto mais perdido: Auto PCD. Recomendação: revisar tabela de comissões com Porto."

**Implementação:**
- Endpoint: `GET /gestao-crm/analise-perdas-ia` (novo)
- Roda sob demanda (não em tempo real)
- Model: Claude Sonnet
- Cache Redis: TTL 24h

---

### 3.2 Segmentação Inteligente de Clientes

**O que faz:** Identifica grupos de clientes com perfil similar para ações comerciais direcionadas.

**Exemplos de segmentos gerados:**
- "12 clientes PJ com apólice de frota vencendo + nunca contrataram responsabilidade civil"
- "8 clientes com histórico de sinistro que não renovaram — possível churn"

**Implementação:**
- Endpoint: `GET /clientes/segmentos-ia` (novo)
- Roda em job semanal
- Model: Claude Sonnet com análise do portfolio da corretora

---

## Custos Estimados (Anthropic API)

| Feature | Model | Tokens/chamada (est.) | Custo/chamada |
|---|---|---|---|
| Resumo de oportunidade | Haiku | ~2.000 | ~$0,003 |
| Next-best-action | Haiku | ~1.000 | ~$0,002 |
| Geração de proposta | Sonnet | ~3.000 | ~$0,045 |
| Chat @inaia | Haiku | ~1.500/msg | ~$0,002 |
| Score renovações (batch) | Haiku | ~500/renovação | ~$0,001 |
| Extração de PDF | Sonnet | ~4.000 | ~$0,060 |

> Com Redis cacheando resumos e scores, o custo real por usuário/dia fica em torno de **$0,10–$0,30**.

---

## Modelo de Preço para o Cliente

| Plano | INAIA incluso | Observação |
|---|---|---|
| Starter | Não | Pode ser usado como upsell |
| Pro | Sim (básico) | Resumos + next-best-action |
| Business | Sim (completo) | Todas as features + chat bot |

---

## Implementação Técnica — Padrões

```typescript
// Todas as chamadas de IA ficam em:
// apps/api/src/lib/inaia/

// Estrutura:
apps/api/src/lib/inaia/
├── client.ts          // instância do @anthropic-ai/sdk
├── prompts/
│   ├── resumo-oportunidade.ts
│   ├── next-best-action.ts
│   ├── gerar-proposta.ts
│   ├── score-renovacao.ts
│   └── extrair-apolice.ts
└── index.ts           // exports públicos
```

```typescript
// Padrão de chamada com cache Redis:
async function getResumoOportunidade(oportunidadeId: string) {
  const cacheKey = `inaia:resumo:${oportunidadeId}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const result = await anthropic.messages.create({ ... })
  await redis.setex(cacheKey, 14400, JSON.stringify(result)) // 4h
  return result
}
```

---

## Variáveis de Ambiente Necessárias

```env
# apps/api/.env
ANTHROPIC_API_KEY=sk-ant-...
INAIA_ENABLED=true                  # feature flag global
INAIA_RESUMO_ENABLED=true
INAIA_PROPOSTA_ENABLED=true
INAIA_CHAT_ENABLED=true
INAIA_SCORE_ENABLED=true
```

---

## Identidade Visual (Frontend)

- Nome: **INAIA**
- Badge: `✨ INAIA` com gradiente roxo-azul
- Tom de voz: direto, profissional, sem enrolação
- Erros: sempre silenciosos para o usuário (nunca quebrar fluxo por falha de IA)
- Loading: skeleton específico com "INAIA está analisando..."

---

## Ordem de Implementação

- [ ] **1.1** Resumo de oportunidade (valor imediato, baixo risco)
- [ ] **1.2** Next-best-action (junto com 1.1, mesmo endpoint)
- [ ] **1.3** Geração de proposta (alto impacto em vendas)
- [ ] **1.4** Bot no chat (reuso do MCP Server existente)
- [ ] **2.1** Score de renovações (diferencial competitivo)
- [ ] **2.2** Extração de PDF de apólice (elimina trabalho manual)
- [ ] **3.1** Análise de motivos de perda
- [ ] **3.2** Segmentação de clientes
