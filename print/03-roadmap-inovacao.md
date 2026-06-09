# ecotech — Roadmap de Inovação

*A plataforma de operações da corretora do futuro*

---

## A Vantagem Que Nenhum Concorrente Tem

Construir software para corretoras de seguros é fácil. Construir o software **certo** exige algo que não se compra: acesso irrestrito à operação real de uma corretora experiente, com volume, com histórico, com dor documentada.

O ecotech tem isso.

**Grupo Ecosistema Seguros** — 18 anos no mercado, operação ativa, carteira consolidada — é nosso parceiro estratégico, laboratório vivo e primeiro cliente de referência. Cada funcionalidade planejada neste roadmap não é hipótese: é demanda real, validada por uma equipe que vive o problema todos os dias.

| Vantagem | O que significa na prática |
|----------|---------------------------|
| **18 anos de operação** | Dados históricos reais — combustível para treinar IA com qualidade |
| **Laboratório vivo** | Cada funcionalidade testada em operação real antes de ir ao mercado |
| **Dor documentada** | Não precisamos adivinhar o que construir — a Ecosistema nos mostra |
| **Referência de mercado** | "Uma corretora com 18 anos usa e recomenda" — prova social definitiva |
| **Acesso à rede** | 18 anos de relacionamento com seguradoras — atalho para integrações |

---

## O Problema Que o Mercado Não Resolveu

Existem sistemas de gestão para corretoras. Mas todos têm o mesmo pecado: **são sistemas de registro, não de inteligência.**

O corretor hoje opera em 5 a 8 ferramentas simultaneamente:

- Planilha para renovações
- WhatsApp para comunicar com clientes
- Portal de cada seguradora para cotar
- Excel para comparar preços entre seguradoras
- Telefone sem histórico no CRM
- E-mail para enviar propostas
- Sistema de gestão para arquivar o fechado

**Nenhum sistema une tudo isso em um único fluxo inteligente. O ecotech vai ser o primeiro.**

---

## Roadmap de Inovação

### Módulo 1 — IA Integrada ao Fluxo de Vendas

Inteligência artificial nativa dentro do CRM — não como chatbot externo, mas como copiloto em cada etapa do processo de vendas.

**Funcionalidades:**

- **Assistente de cotação inteligente:** Com base no perfil do cliente, a IA sugere qual produto cotar, qual seguradora tende a ter melhor aceitação e qual cobertura é mais adequada — antes mesmo de o vendedor abrir o cotador
- **Previsão de renovação em risco:** Analisa histórico de relacionamento, tempo sem interação e padrão de pagamento — sinaliza quais renovações têm maior probabilidade de cancelamento
- **Resumo automático de atendimento:** Após ligação ou troca de mensagens, a IA gera resumo e atualiza o CRM automaticamente
- **Sugestão de próxima ação:** Baseada no estágio do pipeline, recomenda a próxima ação e agenda no calendário do vendedor
- **Análise de cotações perdidas:** Identifica padrões — para qual concorrente, em qual produto, em qual perfil de cliente — e gera insights acionáveis

**Por que ninguém fez ainda:** Os sistemas legados têm dados fragmentados demais para alimentar IA. O ecotech foi construído com dados estruturados e relacionados desde o início.

---

### Módulo 2 — WhatsApp Integrado ao CRM

Canal de comunicação com o cliente dentro da plataforma, com histórico completo vinculado ao CRM.

**Funcionalidades:**

- **Envio de cotações com um clique** — sem sair da plataforma
- **Lembretes automáticos de renovação** — 90, 60, 30 dias antes do vencimento
- **Régua de inadimplência** — alerta automático quando parcela atrasa
- **Chatbot de triagem de leads** — coleta dados do cliente via WhatsApp e já popula o CRM
- **Histórico unificado** — toda conversa fica registrada no timeline do cliente

**Impacto:** 60–70% da comunicação com clientes já acontece pelo WhatsApp. Hoje isso é invisível para o CRM. Com essa integração, vira dado, vira histórico, vira inteligência.

---

### Módulo 3 — Ramal VoIP Integrado ao CRM

Telefonia integrada à plataforma — o vendedor liga e recebe chamadas diretamente pelo ecotech.

**Funcionalidades:**

- **Click-to-call** — clica no número no CRM, ligação inicia automaticamente
- **Registro automático de chamadas** — duração, horário e gravação no histórico do cliente
- **Transcrição por IA** — após a ligação, IA extrai produto discutido, objeções e próximo passo
- **Fila de ligações para gestores** — visibilidade em tempo real do volume e conversão por vendedor
- **Discador automático** — para carteiras grandes, o vendedor só entra na linha quando o cliente atende

**Por que é decisivo:** O ramal é uma ilha de dados. Ligações acontecem, mas o CRM não sabe. Com VoIP integrado, cada contato vira registro e métrica.

---

### Módulo 4 — Gestão Direta com Seguradoras

Conexão em tempo real com as seguradoras — mais do que integração técnica, é a camada de inteligência que monitora a carteira e aciona o vendedor antes que o problema vire perda.

#### 4.1 — A Hemorragia Silenciosa: Parcelas Não Pagas

Quando um cliente deixa de pagar, a apólice entra em suspensão. O que acontece é invisível para a corretora:

1. A seguradora notifica o **segurado** (não o corretor)
2. O cliente ignora
3. A apólice é cancelada
4. O corretor descobre quando o cliente liga para acionar — e não tem mais cobertura
5. O cliente culpa a corretora. A renovação está perdida.

Uma corretora com 500 apólices tem **15 a 30 em risco de cancelamento a qualquer momento** — sem saber.

**Solução do ecotech:**
- Monitor de inadimplência em tempo real via integração com seguradoras
- Alerta automático para o vendedor assim que a parcela atrasa
- Régua automática: WhatsApp → ligação VoIP → alerta para gerente
- Painel de risco de cancelamento por vendedor e por carteira

#### 4.2 — A Receita Esquecida: Clientes que Ninguém Prospecta

Todo gerente conhece: o vendedor fecha novos negócios com prazer, mas não trabalha a base.

**Perfis de cliente abandonado:**

- **Mono-produto:** tem auto há 3 anos, nunca recebeu oferta de residencial ou vida
- **Apólice vencida sem retorno:** venceu há 60 dias, vendedor não ligou, cliente foi para outra corretora
- **Alto valor sem contato:** paga R$ 8.000/ano, não recebe uma ligação há 8 meses
- **Pós-sinistro sem follow-up:** acionou o seguro, ninguém ligou depois — maior momento de retenção perdido
- **Dados desatualizados:** mudou de carro, teve filho — oportunidade de revisão perdida

**Solução do ecotech:**
- Score de abandono por IA — ranqueia clientes que precisam de atenção imediata
- Alertas de cross-sell por perfil com script de abordagem
- Régua de relacionamento automática para clientes sem contato
- Fila de follow-up pós-sinistro com roteiro sugerido pela IA
- Meta de contatos mínimos por vendedor com monitoramento em tempo real

#### 4.3 — Outros Problemas Críticos

- **Cancelamentos invisíveis:** seguradora cancela, corretor não sabe — integração gera alerta imediato
- **Divergência de comissão:** conferência automática entre o que a seguradora paga e o que está no CRM
- **Recusas sem motivo:** integração traz o motivo estruturado e IA sugere seguradora alternativa
- **Tabelas desatualizadas:** alteração de preço atualiza o multicálculo automaticamente

**Contexto regulatório:** O Open Insurance (SUSEP) obrigará seguradoras a abrirem APIs. O ecotech — com 18 anos de relacionamento via Ecosistema Seguros — estará posicionado para ser o primeiro a usar essas APIs de forma nativa.

---

### Módulo 5 — Multicálculo Integrado entre Seguradoras

Uma cotação no ecotech, propostas de múltiplas seguradoras comparadas automaticamente.

**Funcionalidades:**

- Cotação simultânea em N seguradoras com um formulário único
- Comparativo automático de cobertura — franquia, exclusões, condições contratuais
- Ranking de recomendação por perfil do cliente — não apenas o mais barato
- Envio do comparativo ao cliente via WhatsApp com a marca da corretora
- Histórico de preços — IA identifica sazonalidade e avisa quando é bom momento para fechar

**Diferença do mercado:** Multicálculadores existem (Thinkseg, etc.) mas são ferramentas isoladas. O corretor ainda precisa sair do CRM para usar, e o resultado não volta automaticamente. O ecotech fecha esse loop.

---

## O Efeito Composto — Um Dia de Trabalho no Ecotech Futuro

> **08h00** — O sistema listou 12 clientes com renovação nos próximos 30 dias e classificou os 3 com maior risco de cancelamento.
>
> **08h15** — O corretor clica em "ligar". A chamada é gravada. A IA transcreve e detecta que o cliente mencionou um concorrente.
>
> **09h00** — Um cliente perguntou pelo WhatsApp sobre seguro do filho. O chatbot coletou os dados e abriu uma oportunidade no CRM automaticamente.
>
> **10h30** — O multicálculo cotou em 6 seguradoras. A IA recomendou a segunda mais barata — a mais barata tem histórico ruim para esse perfil de cliente.
>
> **11h00** — A proposta foi enviada por WhatsApp com comparativo em PDF com a marca da corretora.
>
> **14h00** — A seguradora aprovou. O ecotech notificou o cliente e atualizou o status.
>
> **17h00** — O gestor revisou: 8 ligações, 3 propostas, 1 fechamento, 2 renovações confirmadas. Sem uma linha de planilha.

**Isso não existe hoje. Em nenhum sistema. Em lugar nenhum do Brasil.**

---

## Posicionamento Competitivo

| Funcionalidade | Sistemas legados | Multicálculadores | **ecotech hoje** | **ecotech roadmap** |
|----------------|-----------------|------------------|-----------------|---------------------|
| CRM completo | Parcial | Não | ✓ | ✓ |
| Renovações e endossos | Básico | Não | ✓ | ✓ |
| LGPD nativa | Não | Não | ✓ | ✓ |
| Portal do Segurado | Não | Não | ✓ | ✓ |
| IA de vendas | Não | Não | — | ✓ |
| WhatsApp no CRM | Não | Não | — | ✓ |
| Ramal VoIP | Não | Não | — | ✓ |
| Multicálculo nativo | Não | Sim (isolado) | — | ✓ |
| Gestão com seguradoras | Não | Parcial | — | ✓ |
| Parceiro estratégico 18 anos | — | — | ✓ | ✓ |
