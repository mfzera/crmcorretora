# ecotech — Proposta para Investidores

*Março de 2026*

---

## 1. PROBLEMA E DOR REAL

O setor de corretagem de seguros no Brasil opera, em sua maioria, com planilhas de Excel, WhatsApp e sistemas legados dos anos 2000. O broker moderno enfrenta três gargalos críticos:

**Perda de renovações por falta de controle:** Uma apólice com vigência de 12 meses precisa ser renovada proativamente. Sem sistema, o corretor perde a janela — e o cliente migra para um concorrente. Estimativa de setor: 15–25% das renovações são perdidas por falha operacional, não por preço.

**Ineficiência no ciclo cotação → proposta → emissão:** O fluxo manual médio de uma cotação até a emissão do documento de venda envolve 3–5 ferramentas distintas (cotador da seguradora, e-mail, planilha, sistema de proposta). Isso representa 2–4 horas de trabalho administrativo por operação, em um processo que acontece dezenas de vezes por semana em qualquer corretora com volume.

**Ausência de gestão por dados:** Gerentes não sabem em tempo real qual vendedor tem mais cotações perdidas, qual produto tem melhor taxa de conversão ou qual cliente está com apólice vencendo. Decisões são tomadas na intuição.

**Por que é urgente:** A SUSEP tem pressionado digitalização e conformidade com LGPD. Corretoras que não documentam consentimento e histórico de dados de segurados estão expostas a multas. O mercado está sendo forçado a migrar — a questão é para onde.

---

## 2. TAMANHO DE MERCADO

O mercado segurador brasileiro encerrou 2024 com **R$ 435,5 bilhões em prêmios totais** (CNseg), crescimento de 12,2% sobre 2023, com projeção de 8,5–10% de expansão adicional em 2025. O Brasil é o maior mercado segurador da América Latina e um dos 10 maiores do mundo. O número de corretoras registradas na SUSEP atingiu **65.000 em 2025** — crescimento de 5.000 em 12 meses.

| Camada | Estimativa | Base de cálculo |
|--------|-----------|-----------------|
| **TAM** | R$ 400M/ano | ~65.000 corretoras cadastradas na SUSEP × ARPU médio de R$ 500/mês |
| **SAM** | R$ 150M/ano | ~25.000 corretoras PJ com 3+ vendedores e operação minimamente digitalizada |
| **SOM (2–3 anos)** | R$ 12–18M ARR | 2.000–3.000 corretoras convertidas a ticket médio de ~R$ 500/mês |

---

## 3. SOLUÇÃO DIFERENCIADA

O ecotech cobre **o ciclo completo de receita de uma corretora**, do lead até a renovação, em uma plataforma integrada:

**Gestão de vendas end-to-end**
- Cotações multi-seguradora com rastreio de comissão por vendedor (split de comissão)
- Fluxo cotação → proposta comercial → documento de venda com status tracking completo
- Registro de cotações perdidas com motivo e concorrente (inteligência competitiva nativa)

**CRM com Kanban**
- Pipeline de oportunidades com etapas configuráveis (lead, negociação, ganho/perdido)
- Transferência de oportunidades entre vendedores com histórico auditado
- KPIs por card no kanban em tempo real

**Gestão de Renovações**
- Tracking automático de vencimentos com alertas
- Importação em massa via CSV para absorver carteiras históricas
- Rastreio de comissão split em renovações

**Endossos**
- Módulo dedicado para alterações mid-policy (inclusão de item, ajuste de cobertura)
- Workflow de solicitação, aprovação e emissão

**Compliance by design**
- LGPD integrada: consentimento, anonimização, exportação de dados do titular
- Audit log completo de todas as ações com IP e User-Agent
- Soft delete em todas as entidades

**Portal do Segurado (B2B2C)**
- Subdomínio dedicado por corretora (ex: `acmeseguros.ecotech.com`)
- Cliente acessa apólices, documentos e histórico sem depender do corretor

**Analíticas e métricas**
- Dashboard com receita, comissões, taxa de conversão, performance por vendedor
- Evolução mensal de prêmios e comissões com gráficos interativos

### Diferenciais difíceis de replicar em menos de 6 meses

1. **Permissões granulares por cargo** com 4 perfis padrão por tenant e customização livre — cobre a heterogeneidade das corretoras brasileiras
2. **Multi-workspace com troca de corretora no JWT** — corretor PF atua em múltiplas corretoras sem múltiplos logins
3. **Profundidade em renovações e endossos** — conceitos nativos do setor ausentes em CRMs genéricos
4. **Portal do Segurado como canal de retenção** — lock-in com o cliente final da corretora

---

## 4. TRAÇÃO

### Clientes em produção — dados reais (fev–mar 2026)

O ecotech tem **2 corretoras em operação real**, ambas com carteiras históricas migradas para a plataforma.

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

#### Cliente 2 — Corretora regional independente
*Ativa desde março de 2026 — 15+ anos de mercado, interior de São Paulo*

| Métrica | Volume |
|---------|--------|
| Usuários ativos | **6** |
| Clientes na plataforma | **128** |
| Cotações processadas | **71** |
| Renovações sob gestão | **119** |
| Oportunidades no CRM | **197** |

#### Consolidado

| Corretoras ativas | Usuários | Clientes | Renovações | Cotações |
|------------------|---------|---------|-----------|---------|
| **2** | **36** | **693** | **656** | **297** |

**O sinal mais importante:** as duas corretoras migraram carteiras históricas completas em menos de 60 dias. Corretoras não migram anos de operação para um sistema que pretendem abandonar.

### Case de ROI — Cliente 1 (45 dias de uso)

**Antes:** planilhas Excel + WhatsApp. Sem visibilidade de renovações, sem rastreio de perdas, sem histórico centralizado.

**Depois:** 537 renovações sob gestão com alertas automáticos. Estimativa conservadora de recuperação de 10% das renovações antes perdidas = ~54 renovações/ano. A comissão média de renovação no setor varia entre R$ 150–400.

**54 renovações × R$ 200 = R$ 10.800/ano em receita recuperada** — para uma plataforma que custa ~R$ 2.200/mês.

### Maturidade técnica do produto

| Indicador | Status |
|-----------|--------|
| Módulos de negócio | 30+ rotas de API cobrindo 100% do fluxo operacional |
| Banco de dados | 32 tabelas com migrações versionadas |
| Billing recorrente | Stripe integrado com webhook, seats, trial e fatura |
| Infra de produção | Railway + Vercel + Cloudflare R2 + Redis |
| Compliance | LGPD, audit log, soft delete, consentimento |
| TypeScript end-to-end | Schemas Zod compartilhados entre API e frontend |

---

## 5. TIME

| Posição | Nome | Background |
|---------|------|-----------|
| CEO/Fundador | [completar] | [completar] |
| CTO/Tech Lead | [completar] | [completar] |
| Head de Vendas | [completar] | [completar] |

---

## 6. MODELO DE NEGÓCIO

### Plano base

```
R$ 119,89/mês (inclui 3 usuários) + R$ 69,89/mês por usuário adicional
```

### Módulos add-on (ver documento de pricing)

Cinco módulos opcionais — IA, WhatsApp, VoIP, Gestão com Seguradoras, Multicálculo — precificados por usuário/mês. Bundle completo: **R$ 149/usuário/mês**.

### Ticket por porte

| Porte | Usuários | MRR base | MRR com bundle |
|-------|----------|----------|----------------|
| Micro | 3 | R$ 260 | R$ 706 |
| Pequena | 8 | R$ 610 | R$ 1.902 |
| Média | 20 | R$ 1.470 | R$ 4.250 |
| Grande | 30 | R$ 2.200 | R$ 6.600 |

### Unit economics

| Métrica | Estimativa |
|---------|-----------|
| **ARPU médio (base)** | R$ 500/mês |
| **ARPU médio (com módulos)** | R$ 1.500–3.500/mês |
| **LTV (3 anos, churn 10%)** | R$ 13.500–95.000 |
| **CAC estimado** | R$ 800–1.500 |
| **LTV/CAC** | 9–17x |
| **Payback** | 2–3 meses |
| **Ciclo de venda** | 2–4 semanas |

### Break-even

| Cenário | Clientes | MRR |
|---------|---------|-----|
| Time enxuto (2 pessoas) | ~80–100 | R$ 40–50K |
| Time em crescimento (4 pessoas) | ~200–250 | ~R$ 100K |

---

## 7. GO-TO-MARKET

### Perfil do cliente ideal (ICP)

| Atributo | Descrição |
|----------|-----------|
| **Tipo** | Corretora PJ com CNPJ ativo na SUSEP |
| **Tamanho** | 5 a 30 usuários |
| **Ramos** | Multi-ramo: auto, vida, residencial, empresarial |
| **Dor principal** | Perda de renovações, sem CRM, sem visão de carteira |
| **Decisor** | Dono ou sócio — sem comitê de compras |
| **Geografia fase 1** | Interior e cidades médias de São Paulo |

### Canais de aquisição

**SINCOR e associações regionais** — 30.000 corretores no SINCOR-SP. Palestras sobre LGPD e digitalização posicionam o ecotech antes de vender. Custo baixo, credibilidade alta.

**Indicação entre corretores** — menor CAC, maior conversão. Os dois clientes atuais já são portas abertas para suas redes.

**Parceria com seguradoras** — seguradoras têm interesse em corretoras digitalizadas. Uma seguradora que indica o ecotech para sua rede é canal com custo marginal zero.

**Outbound direto** — lista SUSEP filtrada por cidade e porte, abordagem via WhatsApp com o dono. Decisor imediato.

### Ciclo de venda

```
Dia 1   → Contato (WhatsApp / indicação / evento)
Dia 3   → Demo ao vivo de 30 min com o dono
Dia 7   → Trial com importação da carteira histórica
Dia 14  → Follow-up: renovações visíveis no sistema
Dia 21  → Proposta comercial
Dia 30  → Fechamento
```

O "efeito âncora" do trial: o corretor vê suas próprias renovações organizadas e não quer voltar para a planilha.

### Metas de aquisição

| Fase | Período | Clientes | MRR |
|------|---------|---------|-----|
| Validação | Abr–Jun 2026 | 10 | R$ 5K |
| Tração | Jul–Dez 2026 | 50 | R$ 25K |
| Escala | 2027 | 200 | R$ 100K |
| Crescimento | 2028 | 600 | R$ 300K |

---

## 8. AVALIAÇÃO

### Pontos fortes

**Produto verticalmente especializado em mercado de alta recorrência**
Seguros é renovação por natureza. Churn estruturalmente baixo, LTV alto, linguagem nativa do setor.

**Arquitetura SaaS madura com billing funcional**
Multi-tenancy, LGPD, portal B2B2C, permissões granulares, Stripe integrado. Não é MVP — é produto de 12–18 meses de desenvolvimento especializado.

**Timing regulatório favorável**
Open Insurance + LGPD + digitalização forçada criam vento favorável. O ecotech está posicionado na janela certa.

### Pontos de atenção

**Concentração no mercado brasileiro**
Produto 100% em português com lógica SUSEP/LGPD nativa. Força para go-to-market local, limitação para expansão regional sem re-arquitetura.

**Precificação pode ser subotimizada no segmento médio/grande**
Uma corretora de 20 pessoas que fatura R$ 5M/ano em comissões suporta ticket muito maior. Planos Enterprise são oportunidade de expansão de receita.
