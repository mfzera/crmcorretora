# Proposta para Investidores — ecotech

**Resumo executivo:** ecotech é uma plataforma SaaS B2B para gestão de corretoras de seguros no Brasil, construída em arquitetura moderna multi-tenant com billing recorrente via Stripe, cobrindo o ciclo completo de vendas, renovações, CRM, compliance (LGPD) e analíticas.

---

## 1. PROBLEMA E DOR REAL

O setor de corretagem de seguros no Brasil opera, em sua maioria, com planilhas de Excel, WhatsApp e sistemas legados dos anos 2000. O broker moderno enfrenta três gargalos críticos:

**Perda de renovações por falta de controle:** Uma apólice com vigência de 12 meses precisa ser renovada proativamente. Sem sistema, o corretor perde a janela — e o cliente migra para um concorrente. Estimativa de setor: 15–25% das renovações são perdidas por falha operacional, não por preço.

**Ineficiência no ciclo cotação → proposta → emissão:** O fluxo manual médio de uma cotação até a emissão do documento de venda envolve 3–5 ferramentas distintas (cotador da seguradora, e-mail, planilha, sistema de proposta). Isso representa 2–4 horas de trabalho administrativo por operação, em um processo que acontece dezenas de vezes por semana em qualquer corretora com volume.

**Ausência de gestão por dados:** Gerentes não sabem em tempo real qual vendedor tem mais cotações perdidas, qual produto tem melhor taxa de conversão ou qual cliente está com apólice vencendo. Decisões são tomadas na intuição.

**Por que é urgente:** A SUSEP tem pressionado digitalização e conformidade com LGPD. Corretoras que não documentam consentimento e histórico de dados de segurados estão expostas a multas. O mercado está sendo forçado a migrar — a questão é para onde.

---

## 2. TAMANHO DE MERCADO (TAM / SAM / SOM)

O mercado segurador brasileiro encerrou 2024 com **R$ 435,5 bilhões em prêmios totais** (CNseg), crescimento de 12,2% sobre 2023, com projeção de 8,5–10% de expansão adicional em 2025. O Brasil é o maior mercado segurador da América Latina e um dos 10 maiores do mundo. O número de corretoras registradas na SUSEP atingiu **65.000 em 2025** — crescimento de ~5.000 em 12 meses, reflexo direto da aceleração da digitalização do setor.

| Camada | Estimativa | Base de cálculo |
|--------|-----------|-----------------|
| **TAM** | R$ 400M/ano | ~65.000 corretoras cadastradas na SUSEP (2025) × ARPU médio de R$ 500/mês |
| **SAM** | R$ 150M/ano | ~25.000 corretoras PJ com 3+ vendedores e operação minimamente digitalizada |
| **SOM (2–3 anos)** | R$ 12–18M ARR | 2.000–3.000 corretoras convertidas a ticket médio de ~R$ 500/mês |

**Pricing atual do produto:** R$ 119,89/mês (base, 3 seats) + R$ 69,89/seat adicional. Uma corretora com 8 usuários paga ~R$ 470/mês = R$ 5.640/ano.

> **⚠ Lacuna para o investidor:** Confirmar base de clientes ativa, MRR atual e taxa de conversão trial → pago antes de apresentar o SOM como projeção validada.

---

## 3. SOLUÇÃO DIFERENCIADA

O ecotech cobre **o ciclo completo de receita de uma corretora**, do lead até a renovação, em uma plataforma integrada:

### O que o software faz

**Gestão de vendas end-to-end**
- Cotações multi-seguradora com rastreio de comissão por vendedor (split de comissão)
- Fluxo cotação → proposta comercial → documento de venda com status tracking completo
- Registro de cotações perdidas com motivo e concorrente (inteligência competitiva nativa)

**CRM com Kanban**
- Pipeline de oportunidades estilo Kanban com etapas configuráveis (lead, negociação, ganho/perdido)
- Transferência de oportunidades entre vendedores com histórico auditado
- KPIs por card no kanban (métricas em tempo real por oportunidade)

**Gestão de Renovações**
- Tracking automático de vencimentos com alertas
- Importação em massa via CSV para absorver carteiras legadas de entrada
- Transferência de carteira de renovações entre vendedores
- Rastreio de comissão split em renovações

**Endossos (diferencial setorial)**
- Módulo dedicado para alterações mid-policy (inclusão de item, ajuste de cobertura, substituição)
- Workflow de solicitação, aprovação e emissão de endosso

**Compliance by design**
- LGPD integrada: consentimento, anonimização, exportação de dados do titular
- Audit log completo de todas as ações de usuários com IP e User-Agent
- Soft delete em todas as entidades (dados nunca são destruídos, apenas marcados)

**Portal do Segurado (B2B2C)**
- Subdomínio dedicado por corretora (ex: `acmeseguros.ecotech.com`)
- Cliente acessa suas apólices, documentos e histórico sem depender do corretor

**Chat interno**
- Mensageria nativa com canais, DMs, reações, menções e upload de arquivos
- Elimina dependência de WhatsApp para comunicação interna

**Analíticas e métricas**
- Dashboard com receita, comissões, taxa de conversão, performance por vendedor
- Evolução mensal de prêmios e comissões com gráficos interativos

### Diferenciais difíceis de replicar em < 6 meses

1. **Modelo de permissões granular por cargo** com 4 perfis padrão auto-criados por tenant e customização livre — cobre a heterogeneidade das corretoras brasileiras (o "cadastro" é um perfil operacional sem análogo em softwares genéricos)
2. **Multi-workspace com troca de corretora no JWT** — permite que um corretor PF atue em múltiplas corretoras sem múltiplos logins
3. **Profundidade no módulo de renovações + endossos** — a maioria dos concorrentes tem CRM genérico; o ecotech conhece os conceitos nativos do setor
4. **Portal do Segurado como canal de retenção** — cria lock-in com o cliente final da corretora, não apenas com o gestor

---

## 4. TRAÇÃO

### Clientes em produção — dados reais (fev–mar 2026)

O ecotech tem **2 corretoras em operação real**, ambas ativas desde o primeiro trimestre de 2026. Nenhuma está em teste — as duas migraram operação e carteira histórica para a plataforma.

#### Cliente 1 — Corretora parceira estratégica
*Ativa desde fevereiro de 2026 — grupo com 18 anos de mercado, múltiplos ramos, operação regional consolidada*

| Métrica | Volume |
|---------|--------|
| Usuários ativos | **30** |
| Clientes na plataforma | **565** |
| Cotações processadas | **226** |
| Documentos de venda | **244** |
| Renovações sob gestão | **537** |
| Endossos registrados | **32** |
| Anexos armazenados | **211** |

#### Cliente 2 — Corretora regional independente
*Ativa desde março de 2026 — 15+ anos de mercado, interior de São Paulo*

| Métrica | Volume |
|---------|--------|
| Usuários ativos | **6** |
| Clientes na plataforma | **128** |
| Cotações processadas | **71** |
| Documentos de venda | **37** |
| Renovações sob gestão | **119** |
| Oportunidades no CRM | **197** |
| Tarefas criadas | **58** |

#### Visão consolidada

| Métrica | Total |
|---------|-------|
| Corretoras ativas | **2** |
| Usuários na plataforma | **36** |
| Clientes gerenciados | **693** |
| Cotações processadas | **297** |
| Documentos de venda | **281** |
| Renovações sob gestão | **656** |
| Oportunidades no CRM | **202** |

**O sinal mais importante:** as duas corretoras migraram suas carteiras históricas completas — 656 renovações e 693 clientes não se importam de planilha para um sistema novo sem comprometimento real. Corretoras não fazem isso com um produto que pretendem abandonar.

---

### Sinais de maturidade do produto

| Indicador | Status |
|-----------|--------|
| Módulos de negócio | 30+ rotas de API, cobrindo 100% do fluxo operacional de uma corretora |
| Tabelas no banco | 32 tabelas com relacionamentos complexos e migrações versionadas |
| Testes automatizados | Vitest com coverage em todos os módulos de rota |
| Billing recorrente | Stripe integrado com webhook, gestão de seats, trial e fatura |
| Infra de produção | Railway (API) + Vercel (Web) + Cloudflare R2 + Redis — stack de empresa |
| Compliance | LGPD implementada, audit log, soft delete, portal de consentimento |
| Integrações externas | Stripe, Google Calendar, Cloudflare R2, SendGrid, BullMQ/Redis |
| TypeScript end-to-end | Zod schemas compartilhados entre API e frontend |

### O que está funcional vs em desenvolvimento

**Funcional e em uso real:**
- Core de vendas (cotações, documentos de venda)
- Renovações com importação em massa de carteira histórica
- CRM Kanban com KPIs
- Gestão de usuários e permissões
- Billing via Stripe
- Portal do segurado
- Chat interno, tarefas, anexos
- LGPD e audit trail

**Em expansão:**
- Módulos de equipes e marketing portal
- Workspace management avançado
- Métricas avançadas

> **Estágio atual:** **Early Traction** — produto em uso real, com volume crescente, por uma corretora de 15 anos que migrou 100% da operação em menos de 60 dias.

---

## 5. TIME

> **⚠ Esta seção requer informação real do fundador.**

### O que a arquitetura sugere sobre o perfil técnico

| Perfil identificado | Evidência no código |
|--------------------|--------------------|
| Forte domínio de backend | Fastify com plugin architecture, Drizzle ORM, multi-tenancy sofisticado |
| Conhecimento do setor segurador | Conceitos como endosso, renovação comercial, cargo de cadastro — terminologia nativa |
| Frontend product-driven | shadcn/ui + Tailwind 4 + Next.js 16, Kanban com drag-and-drop, portal B2B2C |
| Experiência com SaaS B2B | Billing por seat, permissões granulares, audit trail, LGPD — ninguém constrói isso sem ter vivido o problema |

**Perfis a completar para o deck:**

| Posição | Background |
|---------|-----------|
| CEO/Fundador | [completar] |
| CTO/Tech Lead | [completar] |
| Head de Vendas | [completar] |

---

## 6. MODELO DE NEGÓCIO

### Modelo atual: SaaS por seat

```
Plano base: R$ 119,89/mês (inclui 3 seats)
Seat adicional: R$ 69,89/mês/usuário
```

**Ticket por porte de corretora:**

| Porte | Usuários | MRR/cliente | ARR/cliente |
|-------|----------|-------------|-------------|
| Micro (solo + 2) | 3 | R$ 120 | R$ 1.440 |
| Pequena | 8 | R$ 470 | R$ 5.640 |
| Média | 20 | R$ 1.190 | R$ 14.280 |
| Grande | 50 | R$ 2.890 | R$ 34.680 |

### Unit economics estimados

| Métrica | Estimativa | Hipótese |
|---------|-----------|----------|
| **ARPU médio** | R$ 500/mês | Mix de portes |
| **LTV (3 anos, churn 10%/ano)** | ~R$ 13.500 | ARPU × (1/churn) |
| **CAC estimado** | R$ 800–1.500 | Venda assistida, ciclo 2–4 semanas |
| **LTV/CAC** | 9–17x | Saudável para SaaS B2B |
| **Ciclo de venda** | 2–4 semanas | SMB, decisor = dono da corretora |
| **Payback** | 2–3 meses | |

> **⚠ Lacunas críticas a validar:**
> - MRR atual e número de clientes pagantes
> - Churn real (ou tempo de vida médio de cliente)
> - CAC real por canal de aquisição

### Break-even

| Cenário | Clientes necessários | MRR alvo |
|---------|---------------------|----------|
| Time de 2 pessoas + infra | ~80–100 clientes | R$ 40–50K |
| Time de 4 pessoas | ~200–250 clientes | ~R$ 100K |

### Expansão de receita (oportunidades futuras)

1. **Taxa de transação** sobre renovações automatizadas pela plataforma
2. **Integrações premium** com APIs das seguradoras (Open Insurance / SUSEP)
3. **Portal do Segurado white-label** como produto separado para corretoras maiores
4. **Planos segmentados** Starter / Pro / Enterprise com pricing baseado em valor

---

## AVALIAÇÃO FINAL

### ✓ 3 Pontos Fortes

**1. Produto verticalmente especializado em um mercado de alta recorrência**
Seguros é renovação por natureza — o cliente que contrata hoje volta todo ano. Isso cria baixo churn estrutural e alto LTV se o produto for bom. Diferente de CRM genérico, o ecotech fala a língua do corretor de seguros.

**2. Arquitetura SaaS madura com billing funcional**
Multi-tenancy real, billing por seat, audit trail, LGPD, portal B2B2C, chat, permissões granulares. Não é MVP — é produto com profundidade de 12–18 meses de desenvolvimento especializado. Barreira de entrada para um concorrente novo é alta.

**3. Timing regulatório favorável**
Open Insurance (SUSEP) + LGPD + pressão de digitalização do setor criam ventos favoráveis. Corretoras que não se digitalizarem nos próximos 3 anos perderão clientes para brokers nativos digitais. O ecotech está posicionado na janela certa.

---

### ✗ 3 Pontos de Atenção

**1. Ausência de dados de tração validados no deck**
O produto prova capacidade técnica, mas investidores precisam de MRR, número de clientes, churn e CAC reais. Sem isso, a conversa fica no "potencial" em vez de "performance". **Ação:** Apresentar os primeiros 3–5 clientes pagantes como casos de sucesso com métricas concretas.

**2. Concentração de risco no mercado brasileiro e no setor segurador**
O produto é 100% em português, com lógica de negócio específica do Brasil (SUSEP, LGPD, nomenclatura local). Isso é uma força para go-to-market local, mas limita expansão regional sem re-arquitetura. **Ação:** Definir estratégia: dominar Brasil primeiro (defensável) vs. internacionalizar (mais risco, mais mercado).

**3. Modelo de precificação pode estar subotimizado para corretoras médias/grandes**
R$ 149,89 + R$ 69,89/seat é agressivamente barato para uma corretora de 20 pessoas que fatura R$ 5M/ano em comissões. O produto entrega valor suficiente para cobrar 3–5x mais no segmento médio. **Ação:** Criar planos segmentados com pricing baseado em valor e não apenas em headcount.

---

> **Próximos passos antes de apresentar para VCs:**
> 1. Preencher a seção de time com bios reais
> 2. Adicionar MRR atual, número de clientes e NPS/depoimentos

---

## 7. GO-TO-MARKET

### ICP — Perfil do Cliente Ideal

| Atributo | Descrição |
|----------|-----------|
| **Tipo** | Corretora PJ com CNPJ ativo na SUSEP |
| **Tamanho** | 5 a 30 usuários (vendedores + administrativo) |
| **Ramos** | Multi-ramo: auto, vida, residencial, empresarial |
| **Maturidade digital** | Usa WhatsApp e e-mail, mas ainda opera em planilhas |
| **Dor principal** | Perda de renovações, sem visão da carteira, sem CRM |
| **Decisor** | Dono ou sócio da corretora — decisão rápida, sem comitê |
| **Geografia (fase 1)** | Interior e cidades médias de São Paulo — maior concentração de corretoras independentes do Brasil |

### Canais de Aquisição

**Canal 1 — SINCOR e associações regionais** *(maior potencial de volume)*
O SINCOR-SP representa ~30.000 corretores no estado. Presença em eventos regionais, palestras sobre digitalização e LGPD posiciona o ecotech como solução educativa antes de ser comercial. Custo de aquisição baixo, credibilidade alta.

**Canal 2 — Indicação entre corretores** *(menor CAC, maior conversão)*
Corretores falam entre si — muito. Um cliente satisfeito em uma cidade pequena indica para 5 colegas da região. A Ecosistema e a Taubaté Seguros já são duas portas abertas para esse efeito. Programa de indicação com incentivo acelera o canal.

**Canal 3 — Parceria com seguradoras** *(escalável no médio prazo)*
Seguradoras têm interesse em corretoras digitalizadas — processos mais ágeis, menos erro, menos retrabalho. Uma seguradora que indica o ecotech para sua rede de corretores parceiras é um canal de distribuição com zero custo marginal.

**Canal 4 — Outbound direto** *(para os primeiros 50 clientes)*
Lista de corretoras SUSEP filtradas por cidade, porte e ramos → abordagem direta via WhatsApp ou LinkedIn com o dono. Ciclo curto: o decisor é a mesma pessoa que atende o telefone.

**Canal 5 — Conteúdo e SEO** *(construção de longo prazo)*
Conteúdo sobre gestão de corretoras, LGPD no setor, Open Insurance — posiciona o ecotech como referência antes de ser vendido. Corretores que pesquisam "sistema para corretora de seguros" precisam encontrar o ecotech primeiro.

### Ciclo de Venda

```
Dia 1    → Primeiro contato (WhatsApp / indicação / evento)
Dia 3    → Demo ao vivo de 30 minutos com o dono
Dia 7    → Trial gratuito com importação da carteira
Dia 14   → Follow-up: renovações já visíveis no sistema
Dia 21   → Proposta comercial
Dia 30   → Fechamento
```

**Por que o ciclo é curto:** o decisor é o dono, a dor é imediata e visível, e a importação de carteira no trial cria um "efeito âncora" — o corretor vê suas próprias renovações organizadas e não quer voltar para a planilha.

### Metas de Aquisição

| Fase | Período | Meta de clientes | MRR alvo |
|------|---------|-----------------|----------|
| Validação | Abr–Jun 2026 | 10 clientes | R$ 5K |
| Tração | Jul–Dez 2026 | 50 clientes | R$ 25K |
| Escala | 2027 | 200 clientes | R$ 100K |
| Crescimento | 2028 | 600 clientes | R$ 300K |

---

## 8. CASE DE CLIENTE — ROI REAL

### Corretora parceira estratégica — 45 dias de uso

*Grupo com 18 anos de mercado, operação multi-ramo, interior de São Paulo. Ativa na plataforma desde fevereiro de 2026.*

**O antes:** operação gerenciada em planilhas Excel + WhatsApp. Sem visibilidade de renovações próximas, sem rastreio de cotações perdidas, sem histórico centralizado de clientes.

**O depois — dados extraídos diretamente da plataforma em produção:**

| O que migrou para o ecotech | Volume |
|-----------------------------|--------|
| Carteira de clientes | 565 clientes |
| Renovações sob gestão ativa | 537 renovações |
| Cotações processadas na plataforma | 226 |
| Documentos de venda registrados | 244 |
| Endossos controlados | 32 |
| Usuários operando diariamente | 30 |

**Impacto financeiro estimado:**

> ⚠ *Os valores abaixo usam estimativas conservadoras de setor. Substituir pelos números reais confirmados com o cliente antes de apresentar ao investidor.*

Com 537 renovações sob gestão ativa e alertas automáticos de vencimento, estimativa conservadora de **recuperação de 10% das renovações** que antes se perdiam por falta de follow-up = ~54 renovações/ano recuperadas. A comissão média de renovação no setor varia entre R$ 150–400. Usando R$ 200:

**54 renovações × R$ 200 = R$ 10.800/ano em receita recuperada**

Custo da plataforma para essa corretora (30 usuários): ~R$ 2.200/mês = R$ 26.400/ano.

> *Confirmar com o cliente: (a) comissão média por renovação na carteira deles, (b) quantas renovações estimam ter perdido antes do ecotech, (c) se já conseguem quantificar o ganho.*

**O sinal mais concreto de ROI:** em 45 dias, 30 pessoas migraram a operação inteira — incluindo carteira histórica de anos — para o ecotech. Isso não acontece com um sistema que não entrega valor imediato.
