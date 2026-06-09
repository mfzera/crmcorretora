# ecotech — Roadmap de Inovação: O Próximo Nível

## A Vantagem Que Nenhum Concorrente Tem

Construir software para corretoras de seguros é fácil. Construir o software **certo** exige algo que não se compra: acesso irrestrito à operação real de uma corretora experiente, com volume, com histórico, com dor documentada.

O ecotech tem isso.

**[Grupo Ecosistema Seguros](https://www.grupoecosistema.com.br/)** — 18 anos no mercado, operação ativa, carteira consolidada de clientes — é nosso parceiro estratégico, laboratório vivo e primeiro cliente de referência. Cada funcionalidade planejada no roadmap abaixo não é hipótese: é demanda real, validada por uma equipe que vive o problema todos os dias.

Isso transforma o risco de produto de "será que alguém quer isso?" para **"já sabemos exatamente o que construir, para quem e por quê."**

---

## O Problema Que o Mercado Ainda Não Resolveu

Existem sistemas de gestão para corretoras no Brasil. Mas todos eles têm o mesmo pecado original: **são sistemas de registro, não sistemas de inteligência.**

O corretor moderno opera em 5 a 8 ferramentas ao mesmo tempo:
- Planilha para renovações
- WhatsApp para comunicar com clientes
- Sistemas proprietários de cada seguradora para cotar
- Excel para comparar preços entre seguradoras
- Telefone/ramal sem histórico no CRM
- E-mail para enviar propostas
- Sistema de gestão para arquivar o que já foi fechado

Nenhum sistema do mercado **une tudo isso em um único fluxo inteligente.**

O ecotech se propõe a ser a primeira plataforma brasileira a fazer isso — com a Ecosistema Seguros como prova viva de que funciona.

---

## Roadmap de Inovação

### 1. IA Integrada ao Fluxo de Vendas

**O que é:** Inteligência artificial nativa dentro do CRM, não como um chatbot externo, mas como um copiloto dentro de cada etapa do processo de vendas.

**O que vai fazer:**

- **Assistente de cotação inteligente:** Com base no perfil do cliente (idade, histórico, produtos contratados anteriormente), a IA sugere qual produto cotar, qual seguradora tende a ter melhor aceitação e qual cobertura é mais adequada — antes mesmo de o vendedor abrir o cotador.

- **Previsão de renovação em risco:** A IA analisa o histórico de relacionamento, tempo sem interação e padrão de pagamento para sinalizar quais renovações têm maior probabilidade de cancelamento. O vendedor age antes de perder o cliente.

- **Resumo automático de atendimento:** Após uma ligação ou troca de mensagens, a IA gera um resumo e atualiza o CRM automaticamente — zero digitação manual.

- **Sugestão de próxima ação:** Com base no estágio do pipeline, a IA recomenda a próxima ação para cada oportunidade (ligar, enviar proposta, agendar visita) e agenda automaticamente na agenda do vendedor.

- **Análise de cotações perdidas:** A IA identifica padrões nas perdas — para qual concorrente, em qual produto, em qual perfil de cliente — e gera insights acionáveis para o gestor.

**Por que ninguém fez ainda:** Os sistemas legados do setor têm estrutura de dados fragmentada demais para alimentar modelos de IA. O ecotech foi construído com dados estruturados e relacionados desde o início — está pronto para receber inteligência.

---

### 2. WhatsApp Integrado ao CRM

**O que é:** Canal de comunicação com o cliente diretamente dentro da plataforma, com histórico completo vinculado ao perfil do cliente e à oportunidade em andamento.

**O que vai fazer:**

- **Envio de cotações via WhatsApp** com um clique, direto do sistema — sem copiar link, sem sair da plataforma
- **Lembretes automáticos de renovação** programados com antecedência (90, 60, 30 dias antes do vencimento)
- **Confirmação de dados** do cliente via WhatsApp antes de emitir proposta
- **Notificação de status de proposta** em tempo real para o segurado ("sua proposta foi aprovada")
- **Chatbot de triagem** para novos leads: antes de chegar ao vendedor, o cliente responde perguntas básicas via WhatsApp — produto, veículo, perfil — que já populam o CRM automaticamente
- **Histórico unificado:** toda conversa de WhatsApp fica registrada no timeline do cliente, junto com e-mails, ligações e anotações manuais

**Impacto direto:** Corretoras relatam que 60–70% da comunicação com clientes já acontece pelo WhatsApp. Hoje isso é invisível para o CRM. Com essa integração, vira dado, vira histórico, vira inteligência.

---

### 3. Ramal VoIP Integrado ao CRM

**O que é:** Sistema de telefonia integrado à plataforma — o vendedor liga e recebe chamadas diretamente pelo ecotech, sem telefone físico separado.

**O que vai fazer:**

- **Click-to-call:** O vendedor clica no número do cliente dentro do CRM e a ligação é iniciada automaticamente
- **Registro automático de chamadas:** Duração, horário e gravação vinculados ao histórico do cliente — sem anotação manual
- **Gravação de chamadas com transcrição por IA:** Após a ligação, a IA transcreve o conteúdo e extrai os pontos principais (produto discutido, objeções, próximo passo combinado)
- **Fila de ligações para gestores:** O gerente visualiza em tempo real quantas ligações cada vendedor fez no dia, tempo médio e taxa de conversão por contato
- **Discador automático para renovações:** Para carteiras grandes, o sistema liga automaticamente para os clientes com vencimento próximo — o vendedor só entra na linha quando o cliente atende

**Por que é decisivo:** O ramal hoje é uma ilha de dados. Ligações acontecem, mas o CRM não sabe. Com integração VoIP, cada contato com o cliente vira registro, vira métrica, vira treinamento de IA.

---

### 4. Gestão Direta com Seguradoras

**O que é:** Conexão em tempo real entre o ecotech e os sistemas das seguradoras parceiras, eliminando o acesso manual a múltiplos portais externos. Mas mais do que integração técnica — é a camada de inteligência que monitora a carteira ativa e aciona o vendedor antes que o problema vire perda.

---

#### 4.1 O Problema das Parcelas Não Pagas — A Hemorragia Silenciosa

Este é um dos maiores geradores de perda oculta em corretoras de seguros e, paradoxalmente, o menos monitorado.

**Como funciona o problema hoje:**

Quando um cliente deixa de pagar uma parcela do prêmio, a apólice entra em suspensão e depois em cancelamento — dependendo da seguradora, em 30 a 60 dias. O que acontece nesse intervalo é invisível para a corretora:

1. A seguradora envia notificação ao **segurado** (não ao corretor)
2. O cliente ignora ou esquece
3. A apólice é cancelada por inadimplência
4. O corretor só descobre quando o cliente liga para acionar o seguro — e não tem mais cobertura
5. O cliente culpa a corretora. A relação se desfaz. A renovação está perdida.

**O impacto financeiro é duplo:** a corretora perde a comissão da parcela não paga e perde o cliente na renovação — que vai buscar outra corretora "que avise direito".

Estimativa conservadora: uma corretora com 500 apólices ativas tem entre **15 e 30 apólices em risco de cancelamento por inadimplência a qualquer momento** — sem saber disso.

**O que o ecotech vai fazer:**

- **Monitor de inadimplência em tempo real:** Via integração com as seguradoras, o sistema recebe alertas de parcelas vencidas e em atraso assim que a seguradora as registra — antes do prazo de suspensão
- **Alerta automático para o vendedor:** Assim que uma parcela atrasa, o vendedor responsável pela conta recebe uma notificação prioritária no ecotech
- **Disparo automático de cobrança amigável:** O sistema envia uma mensagem via WhatsApp ao cliente — no tom da corretora, personalizado com nome e vencimento — lembrando do pagamento antes de qualquer penalidade
- **Régua de relacionamento de inadimplência:** Se o cliente não regularizar em X dias, o sistema escalona: primeiro WhatsApp, depois ligação automática via VoIP, depois alerta para o gerente
- **Painel de risco de cancelamento:** O gestor visualiza em tempo real quantas apólices estão em risco, qual o valor de prêmio exposto e qual vendedor tem mais inadimplência na carteira
- **Histórico de inadimplência por cliente:** Clientes com histórico de atraso recorrente são sinalizados no CRM — o vendedor sabe antes de renovar se aquele cliente é um risco operacional

**Por que ninguém faz isso hoje:** As seguradoras notificam o segurado, não o corretor. Sem integração de dados, a corretora fica cega. O ecotech transforma esse dado da seguradora em ação comercial da corretora.

---

#### 4.2 Clientes que Vendedores Não Prospectam — A Receita Esquecida

Todo gerente de corretora conhece esse problema: o vendedor tem uma carteira, fecha negócios novos com prazer, mas **não trabalha os clientes que já estão na base.**

O resultado é uma carteira cheia de oportunidades dormentes que ninguém está aproveitando.

**Os perfis de cliente abandonado mais comuns:**

**Cliente mono-produto:** Tem seguro de automóvel há 3 anos, mas ninguém nunca ofereceu seguro residencial, seguro de vida ou seguro empresarial. O corretor tem o produto. O cliente tem a necessidade. Ninguém fez a ponte.

**Cliente com apólice vencida sem retorno:** A apólice venceu há 60 dias. O vendedor não ligou. O cliente contratou com outra corretora. Isso é receita que saiu pela porta sem barulho.

**Cliente de alto valor sem contato recente:** Paga R$ 8.000/ano em prêmio, não recebe uma ligação há 8 meses. Está vulnerável a qualquer abordagem da concorrência.

**Cliente pós-sinistro sem follow-up:** Acionou o seguro, foi atendido (bem ou mal), e ninguém ligou depois para saber como foi. Uma ligação de follow-up pós-sinistro tem taxa de retenção altíssima — e quase nenhuma corretora faz sistematicamente.

**Cliente com dados desatualizados:** Mudou de carro, mudou de endereço, teve filho — mas o CRM ainda tem as informações antigas. Oportunidade de revisão de cobertura perdida.

**O que o ecotech vai fazer:**

- **Score de abandono por cliente:** A IA calcula um índice de risco de abandono baseado em tempo sem contato, histórico de interações, valor da carteira e proximidade de renovação — e ranqueia os clientes que precisam de atenção imediata
- **Alerta de cross-sell inteligente:** O sistema identifica automaticamente clientes com apenas um produto e sugere ao vendedor qual produto adicional faz sentido para aquele perfil — com script de abordagem
- **Régua de relacionamento automática:** Clientes que não tiveram contato em X dias recebem automaticamente uma mensagem de relacionamento (não comercial) — um "como está seu veículo?" que mantém o vínculo sem parecer cobrança
- **Fila de follow-up pós-sinistro:** Todo cliente que acionar o seguro entra automaticamente em uma fila de follow-up para o vendedor ligar em 7 dias — com roteiro sugerido pela IA
- **Alertas de oportunidade por evento de vida:** Integrado com os dados do CRM, o sistema detecta padrões que indicam mudanças na vida do cliente (filho entrando na carteira do seguro, veículo com mais de 3 anos sem revisão de cobertura, empresa que cresceu) e dispara oportunidade para o vendedor
- **Meta de contatos mínimos por vendedor:** O gestor configura quantos contatos por semana cada vendedor deve fazer com a carteira ativa — o sistema monitora e alerta quando o vendedor está abaixo da meta
- **Painel de carteira fria:** Visão consolidada de todos os clientes sem contato há mais de X dias, segmentados por valor de prêmio — o gerente vê em segundos onde está a receita abandonada

---

#### 4.3 Outros Problemas Críticos com Seguradoras

**Cancelamentos que a corretora não sabe que aconteceram:**
A seguradora cancela uma apólice por qualquer motivo (fraude detectada, vistoria reprovada, inadimplência) e o corretor só descobre quando o cliente reclama. Com integração direta, todo evento de cancelamento gera alerta imediato no ecotech.

**Divergência de comissão:**
A seguradora paga R$ 1.200 de comissão. O sistema da corretora registra R$ 1.350. A diferença vai para lugar nenhum. Com conferência automática via API, cada divergência é sinalizada e documentada para contestação.

**Propostas recusadas sem motivo claro:**
A seguradora recusa e o corretor não sabe por quê — às vezes é documentação, às vezes é perfil de risco, às vezes é limite de carteira na seguradora para aquele produto. Com integração, o motivo da recusa vem estruturado, e a IA sugere qual seguradora alternativa tem maior probabilidade de aceitar aquele perfil.

**Alterações de tabela sem comunicação:**
A seguradora atualiza o preço de um produto e o corretor continua cotando com a tabela antiga — o cliente fecha, a proposta vai, e a seguradora cobra diferença ou recusa. Com integração, toda alteração de tabela atualiza o multicálculo automaticamente.

**Contexto regulatório:** A SUSEP está avançando com o Open Insurance — arcabouço que obriga seguradoras a abrirem APIs padronizadas para parceiros. O ecotech estará posicionado para ser a primeira plataforma de gestão a usar essas APIs de forma nativa quando o ambiente estiver maduro. A Ecosistema Seguros, com 18 anos de relacionamento com as principais seguradoras do mercado, é o atalho para viabilizar essas integrações antes mesmo da regulação obrigar.

---

### 5. Multicálculo Integrado entre Seguradoras

**O que é:** O corretor faz uma única cotação dentro do ecotech e recebe automaticamente as propostas de múltiplas seguradoras — comparadas lado a lado, com cobertura, prêmio e condições.

**O que vai fazer:**

- **Cotação simultânea em N seguradoras** com um único formulário de entrada de dados
- **Comparativo automático de cobertura:** Não apenas preço — a IA analisa diferenças de franquia, coberturas incluídas/excluídas e pontos de atenção contratual
- **Ranking de recomendação por perfil do cliente:** Com base no histórico de sinistros e preferências do cliente, o sistema ordena as opções pela mais adequada — não apenas pela mais barata
- **Envio do comparativo ao cliente via WhatsApp/e-mail** com layout profissional e marca da corretora
- **Histórico de preços por produto/seguradora:** O sistema aprende a sazonalidade de preços e avisa o vendedor quando está em um momento de preço favorável para fechar

**O que existe hoje no mercado:** Existem multicálculadores independentes (Thinkseg, Minuto Seguros, comparadores verticais). Mas nenhum está **dentro de um CRM completo** — o corretor ainda precisa sair do sistema de gestão para usar o multicálculo, e o resultado não volta automaticamente para o CRM. O ecotech fecha esse loop.

---

## Por Que a Ecosistema Seguros Muda Tudo

Em venture capital, existe um conceito chamado **"unfair advantage"** — a vantagem estrutural que faz com que uma empresa específica seja a mais provável de vencer em um mercado. A parceria com a Ecosistema Seguros é exatamente isso para o ecotech.

| Vantagem | O que significa na prática |
|----------|---------------------------|
| **18 anos de operação** | Dados históricos reais de clientes, apólices, renovações, perdas — combustível para treinar IA com qualidade |
| **Operação ativa como laboratório** | Cada nova funcionalidade é testada em ambiente real, com usuários reais, antes de ir para o mercado |
| **Equipe com dor documentada** | Não precisamos adivinhar o que o corretor precisa — a Ecosistema nos diz exatamente o que trava a operação deles |
| **Referência de mercado** | Quando uma corretora nova avaliar o ecotech, a Ecosistema é a prova social mais forte possível: "uma corretora com 18 anos de mercado usa e recomenda" |
| **Acesso à rede** | 18 anos de relacionamento com seguradoras, associações e o setor — abre portas para integrações e parcerias que levariam anos para construir do zero |
| **Credibilidade para captação** | Um investidor que veja uma corretora estabelecida como parceira estratégica enxerga validação de produto real, não apenas tese |

---

## O Efeito Composto: Quando Tudo Se Une

O valor de cada funcionalidade individualmente é alto. O valor de todas integradas é exponencial.

**Exemplo de um dia de trabalho de um corretor no ecotech futuro:**

> 08h00 — O sistema exibiu automaticamente 12 clientes com renovação nos próximos 30 dias e classificou os 3 com maior risco de cancelamento.
>
> 08h15 — O corretor clica em "ligar" para o primeiro cliente. A chamada é registrada. A IA transcreve e detecta que o cliente mencionou um concorrente.
>
> 09h00 — O cliente perguntou pelo WhatsApp sobre o preço do seguro do filho. O chatbot respondeu, coletou os dados do veículo e abriu uma oportunidade automaticamente no CRM.
>
> 10h30 — O multicálculo rodou cotações em 6 seguradoras simultaneamente. A IA recomendou a segunda opção mais barata — porque a mais barata tem histórico de sinistro ruim para o perfil desse cliente.
>
> 11h00 — A proposta foi enviada por WhatsApp com o comparativo em PDF com a marca da corretora.
>
> 14h00 — A seguradora aprovou. O ecotech notificou o cliente e atualizou o status automaticamente.
>
> 17h00 — O gestor revisou o painel do dia: 8 ligações, 3 propostas enviadas, 1 fechamento, 2 renovações confirmadas. Sem uma linha de planilha.

**Isso não existe hoje. Em nenhum sistema. Em lugar nenhum do Brasil.**

---

## Modelo de Preço Modular

O ecotech é vendido em camadas. A corretora começa com o plano base — que já resolve o essencial — e ativa módulos conforme a necessidade e maturidade da operação. **Sem forçar um pacote completo. Sem pagar por o que não usa.**

### Plano Base (já existente)

| | |
|--|--|
| **Preço** | R$ 119,89/mês + R$ 69,89/seat adicional |
| **Inclui** | CRM, cotações, propostas, renovações, endossos, gestão de clientes, permissões, LGPD, portal do segurado, chat interno |
| **Público** | Qualquer corretora que queira sair das planilhas |

---

### Módulos Add-on

#### Módulo IA — Copiloto de Vendas
**R$ 39/mês por usuário da corretora**

> Inteligência artificial integrada ao CRM: previsão de cancelamento, sugestão de cross-sell, resumo automático de atendimento, análise de cotações perdidas e recomendação de próxima ação por oportunidade.

**Por que esse preço:** Um vendedor que recupera apenas 1 renovação a mais por mês com os alertas de IA já paga o módulo dele com sobra. Para a corretora com 8 vendedores: R$ 312/mês — e o retorno potencial é de dezenas de renovações recuperadas.

---

#### Módulo WhatsApp — Comunicação Integrada
**R$ 25/mês por usuário da corretora + variável por tipo de conversa (tabela abaixo)**

> Canal de WhatsApp Business API dentro do ecotech: envio de cotações, lembretes de renovação, régua de inadimplência, chatbot de triagem de leads, histórico de conversas vinculado ao CRM.

**Tabela de custo por conversa** *(cotação de referência: US$ 1 = R$ 5,27)*

| Tipo | Quando ocorre | Meta (USD) | Meta (BRL) | **ecotech (BRL)** |
|------|--------------|-----------|------------|-------------------|
| Serviço | Cliente manda mensagem, você responde dentro de 24h | $0,0000 | R$ 0,00 | **Grátis** |
| Utilitário dentro da janela 24h | Confirmação, aviso de status em resposta ao cliente | $0,0000 | R$ 0,00 | **Grátis** |
| Utilitário fora da janela | Lembrete de renovação, alerta de parcela vencida — iniciado pela corretora | $0,0080 | R$ 0,04 | **R$ 0,06** |
| Autenticação | Código de verificação, OTP | $0,0100 | R$ 0,05 | **R$ 0,07** |
| Marketing (Brasil) | Promoção, campanha, lançamento de produto | $0,0625 | R$ 0,33 | **R$ 0,45** |
| Click-to-WhatsApp (lead de anúncio) | Usuário clicou em anúncio — janela de 72h gratuita | $0,0000 | R$ 0,00 | **Grátis** |

> Margem ecotech sobre custo Meta: ~50% em Utilitário e Autenticação, ~36% em Marketing. A variação cambial é absorvida pelo ecotech — o cliente paga sempre em reais, sem surpresa.

**Uso típico de uma corretora média por mês:**
- 300 lembretes de renovação (Utilitário fora da janela) = R$ 18
- 100 alertas de inadimplência (Utilitário fora da janela) = R$ 6
- 50 campanhas de produto (Marketing) = R$ 22,50
- Respostas a clientes e leads de anúncio = R$ 0

**Total estimado para corretora com 8 usuários: 8 × R$ 25 = R$ 200 fixo + ~R$ 46,50 variável = R$ 246,50/mês** — menos do que qualquer ferramenta avulsa de disparo, sem integração com CRM.

---

#### Módulo Ramal VoIP — Telefonia no CRM
**R$ 35/mês por usuário da corretora + R$ 0,07/min (ligações realizadas)**

> Click-to-call diretamente do CRM, gravação e transcrição de chamadas por IA, fila de ligações para gestores, discador automático para carteiras de renovação.

**Por que esse preço:** O custo por minuto reflete o repasse de operadora. Uma equipe de 5 vendedores fazendo 30 ligações/dia de 3 minutos cada gera ~R$ 200/mês em uso variável + R$ 175 fixo = R$ 375/mês total. O retorno em produtividade (zero anotação manual, histórico automático, transcrição por IA) se paga no primeiro vendedor.

---

#### Módulo Gestão com Seguradoras — Carteira Inteligente
**R$ 45/mês por usuário da corretora**

> Monitor de inadimplência em tempo real, alerta de cancelamentos, painel de clientes abandonados com score de risco, régua de follow-up pós-sinistro, conferência automática de comissões, alertas de alteração de tabela.

**Por que esse preço:** É o módulo de maior impacto financeiro direto. Uma corretora com 8 usuários paga R$ 360/mês. Se evitar o cancelamento de 2 apólices por mês por inadimplência (média R$ 200/apólice em comissão) já recupera R$ 400/mês — mais do que o custo do módulo. É o argumento de ROI mais fácil de vender.

---

#### Módulo Multicálculo — Cotação Unificada
**R$ 49/mês por usuário da corretora**

> Cotação simultânea em múltiplas seguradoras, comparativo automático de cobertura e preço, ranking de recomendação por perfil de cliente, envio do comparativo ao segurado via WhatsApp ou e-mail com a marca da corretora.

**Por que esse preço:** É o módulo mais usado no dia a dia — cada cotação passa por ele. Ferramentas de multicálculo avulsas no mercado cobram R$ 150–300/mês por corretora inteira, sem nenhuma integração com CRM. O ecotech entrega o mesmo resultado dentro do fluxo de vendas, com histórico automático e resultado que volta para o CRM sem copiar nada. Para uma corretora com 8 vendedores: R$ 392/mês — ainda abaixo de ferramentas avulsas, com 10x mais integração.

---

### Resumo de Preços

| Módulo | Por usuário/mês | Variável |
|--------|----------------|----------|
| **Base** | R$ 119,89 (corretora) + R$ 69,89/usuário adicional | — |
| **IA — Copiloto de Vendas** | R$ 39/usuário | — |
| **WhatsApp — Comunicação** | R$ 25/usuário | + R$ 0,07–0,50/conversa (por tipo) |
| **Ramal VoIP — Telefonia** | R$ 35/usuário | + R$ 0,07/min |
| **Gestão com Seguradoras** | R$ 45/usuário | — |
| **Multicálculo** | R$ 49/usuário | — |
| **Bundle (todos os módulos)** | **R$ 149/usuário** | variáveis de uso |

> **Bundle representa ~22% de desconto** vs. contratação individual (R$ 193/usuário separados → R$ 149/usuário juntos). Incentiva adoção completa e aumenta o LTV.

---

### Impacto no ARPU

Com a modularização por usuário, a receita escala naturalmente com o crescimento da corretora:

| Perfil | Usuários | Configuração | MRR/cliente |
|--------|---------|-------------|-------------|
| Entrada | 3 | Base + 3 usuários, sem módulos | R$ 260 |
| Crescimento | 8 | Base + 8 usuários + WhatsApp + Gestão | R$ 818 |
| Consolidado | 15 | Base + 15 usuários + bundle completo | R$ 3.354 |
| Grande corretora | 30 | Base + 30 usuários + bundle + uso variável | R$ 6.600+ |

**O modelo por usuário transforma o ARPU de R$ 500 (plano base médio) para R$ 1.500–3.500** à medida que a corretora cresce e ativa módulos — sem precisar conquistar novos clientes para crescer receita. Cada novo vendedor contratado pela corretora é receita adicional automática para o ecotech.

---

| Funcionalidade | Sistemas legados (Siss, Neosecure, etc.) | Multicálculadores (Thinkseg, etc.) | **ecotech** |
|----------------|------------------------------------------|-------------------------------------|-------------|
| CRM completo | Parcial | Não | ✓ |
| Renovações com IA | Não | Não | Roadmap |
| WhatsApp no CRM | Não | Não | Roadmap |
| Ramal VoIP integrado | Não | Não | Roadmap |
| Multicálculo nativo | Não | Sim (isolado) | Roadmap |
| Gestão de seguradoras via API | Não | Parcial | Roadmap |
| LGPD nativa | Não | Não | ✓ |
| Portal do Segurado | Não | Não | ✓ |
| Multi-tenant (várias corretoras) | Não | Não | ✓ |
| Parceiro estratégico de 18 anos | — | — | **✓ Ecosistema** |

---

## Síntese para o Investidor

O ecotech não está construindo mais um sistema de gestão para corretoras. Está construindo **a plataforma de operações da corretora do futuro** — onde IA, comunicação, telefonia, cotação e gestão financeira são um único produto, com dados fluindo entre todas as camadas.

O mercado tem R$ 400M/ano de TAM endereçável. A regulação (Open Insurance + LGPD) está forçando a digitalização. O timing é perfeito.

E o ecotech tem o que nenhum concorrente tem: **uma corretora de 18 anos disposta a ser o laboratório, o caso de uso e a vitrine.**

Esse é o tipo de vantagem que não se replica com dinheiro. Se replica com tempo — e o ecotech já tem os 18 anos do lado dele.
