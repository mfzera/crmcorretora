# Guia de Estrutura e Copy — Site Ecosistema Seguros

>  Cada seção especifica o que deve existir, os textos exatos e os elementos visuais.

---

## Elementos Globais (todas as páginas)

### Botão Flutuante de WhatsApp

- **Posição:** fixo, canto inferior direito, sempre visível em mobile e desktop
- **Ícone:** WhatsApp (verde)
- **Comportamento ao clicar:** abre WhatsApp com número `(12) 98887-7007` e mensagem pré-preenchida: `Olá! Gostaria de fazer uma cotação.`
- **Deve aparecer:** em todas as seções, inclusive sobre o footer (z-index acima de tudo)

### Popup de Cotação (modal)

Todos os botões de ação de cotação no site (exceto o botão flutuante de WhatsApp) devem abrir este popup em vez de redirecionar diretamente.

**Título do popup:** "Receba sua cotação gratuita"

**Campos:**
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome | Texto | Sim |
| WhatsApp | Telefone | Sim |
| Interesse | Select | Sim |
| Mensagem | Textarea | Não |

**Opções do select "Interesse":** Auto · Moto · Residencial · Vida · Frotas / Empresarial · Consórcio · Benefícios Corporativos · Outro

**Botão de envio:** "Quero minha cotação gratuita"

**Comportamento pós-envio:** redirecionar para WhatsApp com os dados pré-formatados na mensagem, ou integrar com e-mail/CRM conforme stack do projeto. Número de destino: `(12) 98887-7007`.

**Labels dos botões no site que abrem este popup:**
- "Solicitar Cotação Gratuita"
- "Simular agora"
- "Fale com um corretor"
- "Falar no WhatsApp agora"
- "Quero ser franqueado" (popup de franquia, ver Seção 11)

---

## Seção 1 — Header / Navegação

**Logo:** Ecosistema Seguros (manter identidade visual atual)

**Menu de navegação:**
Seguros · Consórcios · Benefícios · Sobre · Franquias

**Telefone no header:** (12) 3621-7465

**CTA no header:** "Cotação Gratuita" → abre popup de cotação

---

## Seção 2 — Hero

**Headline (H1):** A corretora que fica do seu lado na hora que você mais precisa.

**Subtítulo:** Seguros, consórcios e benefícios corporativos com atendimento de quem conhece você pelo nome, desde 2008 no Vale do Paraíba.

**Métricas (4 elementos visuais, todos em português):**
- 18 anos de experiência
- +10 mil clientes protegidos
- +50 seguradoras parceiras
- 4 unidades no Vale do Paraíba

**CTAs:**
- "Solicitar Cotação Gratuita" → abre popup de cotação
- "Conheça a Ecosistema" → scroll para Seção 8 (Nossa História)

---

## Seção 3 — Prova Social

**Badge acima do widget:** 4,8 ★ · 84 famílias avaliaram a Ecosistema no Google

**Widget de reviews:** embed dinâmico do Google Reviews. O widget deve carregar as avaliações diretamente do Google Business da Ecosistema, exibir nota, texto e nome do cliente automaticamente, e se atualizar quando novos reviews chegarem sem manutenção manual.

**Opções de implementação:**
1. [Trustindex.io](https://trustindex.io) — gera snippet de embed para qualquer site (não exige WordPress)
2. [EmbedSocial](https://embedsocial.com) — alternativa com plano gratuito disponível
3. Google Places API + componente próprio — para solução sem dependência de terceiros

---

## Seção 4 — Nossos Serviços: Seguros

**Título da seção (H2):** Nossos Serviços

**Subtítulo:** Encontramos a cobertura certa para o seu perfil: do seguro auto ao plano empresarial.

**8 produtos (cada um como card):**

| Produto | Descrição curta |
|---------|-----------------|
| **Seguro Auto** | Proteção completa para o seu veículo: colisão, roubo e assistência 24h. |
| **Seguro Moto** | Cobertura sob medida para motos, com carência reduzida e assistência em viagem. |
| **Frotas** | Gestão de seguros para toda a sua frota, com apólice única e desconto por volume. |
| **Empresarial** | Proteção para o seu negócio: patrimônio, responsabilidade civil e interrupção de atividades. |
| **Resp. Civil** | Cobertura para danos causados a terceiros, sejam pessoas físicas ou empresas. |
| **Seguro de Vida** | Tranquilidade para quem você ama. Coberturas flexíveis para qualquer fase da vida. |
| **Residencial** | Sua casa protegida contra incêndio, roubo, danos elétricos e muito mais. |
| **Locatício** | Substitui o fiador no aluguel e protege locador e locatário em caso de inadimplência. |

**CTA em cada card:** "Solicitar cotação" → abre popup de cotação

---

## Seção 5 — Nossos Serviços: Consórcios

**Título (H2):** Consórcios

**Subtítulo:** Planejamento inteligente sem juros para realizar seus objetivos.

**3 categorias:**

**IMOBILIÁRIO**
- Imóvel residencial
- Imóvel comercial
- Terrenos
- Reforma
- *Nota destacada:* Meia parcela até contemplação
- CTA: "Simular agora" → abre popup de cotação

**VEÍCULOS**
- Automóveis
- Motocicletas
- Caminhões
- Maquinários
- CTA: "Simular agora" → abre popup de cotação

**PATRIMONIAL**
- Equipamentos
- Energia solar
- Investimento
- Outros bens
- CTA: "Simular agora" → abre popup de cotação

---

## Seção 6 — Benefícios Corporativos

**Título (H2):** Benefícios Corporativos

**Subtítulo:** Soluções para RH: atraia, engaje e retenha talentos com os melhores benefícios do mercado.

**3 produtos:**

**CARTÃO VR / VA**
- Aceito em todo Brasil
- Gestão digital
- Sem mensalidade mínima

**PLANO ODONTOLÓGICO**
- Consultas inclusas
- Ortodontia
- Emergências 24h

**PLANO DE SAÚDE**
- Cobertura nacional
- Rede credenciada ampla
- Planos MEI a grande porte

**CTA geral da seção:** "Fale com um corretor" → abre popup de cotação

---

## Seção 7 — Nossa Equipe *(seção nova)*

**Título (H2):** Quem cuida de você

**Subtítulo:** Na Ecosistema, você não fala com a empresa. Fala com uma pessoa que conhece a sua história.

**4 cards (foto + nome + cargo + frase):**

| Nome | Cargo | Frase do card |
|------|-------|---------------|
| **Ivan** | Fundador | "18 anos dedicados a divulgar a cultura do seguro no Vale do Paraíba." |
| **Inaia** | Corretora | "Explica cada detalhe sem pressa, até você entender de verdade." |
| **Diego** | Corretor | "Não desiste até resolver. Do primeiro contato até a indenização sair." |
| **Celso** | Corretor | "Constrói relações que duram anos. Os clientes do Celso renovam sempre." |

*Cada card deve ter espaço para foto real. Solicitar fotos ao Ivan.*

---

## Seção 8 — Nossa História

**Título (H2):** Nossa História

**Headline (H1):** 18 anos protegendo famílias e empresas no Vale do Paraíba.

**Parágrafo 1:**
Fundada em 2008 em Taubaté, a Ecosistema Seguros nasceu com um propósito claro: divulgar a cultura do seguro e levar tranquilidade real para as famílias da região.

**Parágrafo 2:**
Em dezoito anos, construímos relações de confiança com mais de 10 mil famílias e empresas, sempre ao lado de cada uma na hora que mais precisou.

**3 pontos numerados:**

**01**
Começamos em Taubaté e crescemos para 4 unidades físicas e uma rede de franquias no Vale do Paraíba e região.

**02**
Mais de 10 mil clientes protegidos e 50 seguradoras parceiras. Isso nos permite encontrar sempre a cobertura certa para cada perfil.

**03**
Corretores que acompanham você do primeiro contato até a resolução do sinistro. Sem você ter que explicar tudo de novo.

**CTA:** "Fale com um corretor" → abre popup de cotação

---

## Seção 9 — Missão, Visão e Valores

**Título (H2):** Propósito, Visão e Valores

**Missão:**
Divulgar a cultura do seguro para o equilíbrio social, patrimonial e financeiro dos nossos clientes.

**Visão:**
Ser a corretora de referência no Vale do Paraíba, reconhecida por quem protegemos e por como nos importamos.

**Valores (6 itens):**
- Gratidão
- Ética
- Comprometimento
- Profissionalismo
- Parceria: *Crescemos junto com quem atendemos*
- Cuidado: *Presença real na hora que o cliente mais precisa*

---

## Seção 10 — Por que Escolher a Ecosistema

Manter o copy atual. Os 4 diferenciadores estão corretos.

**Verificar apenas:** substituir o botão/link desta seção para que abra o popup de cotação (caso exista).

---

## Seção 10A — Perguntas Frequentes *(seção nova)*

**Label acima do título:** DÚVIDAS

**Título (H2):** Perguntas frequentes

**Formato:** accordion. Cada pergunta expande ao clicar.

---

**P1: Como funciona a cotação de seguro?**

A cotação é gratuita e sem compromisso. Você fala com um corretor da Ecosistema, que analisa o seu perfil e apresenta as opções mais adequadas entre mais de 50 seguradoras parceiras.

---

**P2: Posso fazer seguro auto para carro financiado?**

Sim. O seguro para carro financiado é possível e, na maioria dos contratos, exigido pela financiadora. Você fala com um corretor, que encontra a cobertura ideal para o seu veículo e perfil.

---

**P3: O que é consórcio e como ele funciona?**

Consórcio é uma forma de adquirir bens sem pagar juros. Um grupo de pessoas contribui mensalmente e, a cada mês, um participante é contemplado por sorteio ou lance para usar o crédito na compra do bem escolhido. É uma alternativa ao financiamento para quem planeja com antecedência e quer pagar menos no total.

---

**P4: Quais empresas podem contratar benefícios corporativos?**

Empresas de qualquer tamanho, de MEI a grandes companhias. Trabalhamos com planos de saúde, odontológico e cartão de alimentação adaptados à realidade de cada negócio. Fale com um corretor para montar o pacote certo para a sua equipe.

---

*Somente Q1 tinha resposta visível no screenshot. Se o site tiver mais perguntas além dessas 4, compartilhar para revisão antes de implementar.*

---

## Seção 11 — CTA Final

**Título (H2):** Vamos cuidar do que você construiu?

**Headline (H1):** Fale com um corretor e receba uma cotação gratuita em menos de 24 horas.

**Subtítulo:**
Sem formulário longo. Sem espera. Direto com quem conhece o seu perfil.

**CTAs:**
- "Falar no WhatsApp agora" → abre popup de cotação
- "(12) 3621-7465" → link `tel:` clicável

---

## Seção 12 — Seja Franqueado

Manter copy atual. Mover esta seção para depois do CTA Final (Seção 11).

**CTA:** "Quero ser franqueado" → link para https://franquiaecosistema.com.br/

---

## Seção 13 — Parceiros

Manter exatamente como está. Nenhuma alteração necessária.

---

## Seção 14 — Footer

Manter exatamente como está, com uma correção:

**Tagline atual (manter):** "Levar segurança, tranquilidade e qualidade de vida. Esse é nosso propósito desde 2007."

**Corrigir:** trocar "desde 2007" por **"desde 2008"**

