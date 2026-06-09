# Aula 3.4 — Configurações do Tenant

## Objetivo
Entender como configurar os dados da corretora, gerenciar cotas e limites do plano, e configurar notificações automáticas.

---

## O que é o "tenant"?

No EcoTech, cada corretora é um **tenant** — um ambiente isolado com seus próprios dados, usuários e configurações. As configurações do tenant afetam toda a corretora.

---

## Como configurar os dados da corretora

1. Acesse **Configurações** → **Dados da Corretora**
2. Você pode editar:
   - **Razão Social**
   - **Nome Fantasia**
   - **CNPJ** *(somente Admin — alterações exigem validação)*
   - **Telefone e E-mail de contato**
   - **Endereço**
   - **Logo da corretora** *(aparece nos documentos gerados)*
3. Clique em **"Salvar"**

---

## Entendendo cotas e limites do plano

Cada plano contratado possui limites de uso. Os principais são:

| Recurso | Descrição |
|---|---|
| **Usuários ativos** | Quantidade máxima de usuários simultâneos |
| **Clientes cadastrados** | Limite de clientes na base |
| **Propostas por mês** | Quantidade de propostas que podem ser criadas |
| **Armazenamento de documentos** | Espaço disponível para arquivos |

**Como verificar o uso atual:**
1. Acesse **Configurações** → **Plano e Cotas**
2. Veja o consumo atual versus o limite de cada recurso
3. Uma barra de progresso indica a proximidade do limite

---

## O que acontece quando a cota é atingida?

Quando um limite é atingido, o sistema bloqueia a ação correspondente e exibe uma mensagem de aviso.

**Exemplos:**
- Ao tentar criar uma nova proposta com cota esgotada: *"Limite de propostas mensais atingido."*
- Ao tentar convidar um novo usuário com cota de usuários esgotada: *"Limite de usuários ativos atingido."*

**O que fazer:**
- Faça upgrade do plano (entre em contato com o suporte EcoTech)
- Ou libere espaço: desative usuários inativos, archive documentos antigos, etc.

---

## Como configurar notificações automáticas

O sistema envia notificações automáticas para eventos importantes. O Admin pode configurar quais eventos geram alerta e com qual antecedência.

**Notificações configuráveis:**

| Evento | Configuração disponível |
|---|---|
| Vencimento de apólice | Antecedência em dias (ex: 30, 15, 7 dias) |
| Proposta com pendência de documentação | Ativar/desativar |
| Endosso aprovado ou recusado | Ativar/desativar |
| Novo cliente cadastrado | Ativar/desativar |

**Como configurar:**
1. Acesse **Configurações** → **Notificações**
2. Para cada evento, ative ou desative o alerta
3. Configure a antecedência onde aplicável
4. Salve

---

## Perguntas frequentes

**Quem pode alterar as configurações do tenant?**
Apenas usuários com perfil **Admin**.

**Posso ter mais de um Admin?**
Sim, não há limite de usuários com perfil Admin.

**As configurações de notificação valem para todos os usuários?**
Sim, as configurações do tenant se aplicam a todos. Notificações individuais (como as de propostas do próprio corretor) não podem ser desativadas pelo usuário.

**Como saber qual plano a corretora tem contratado?**
Acesse **Configurações** → **Plano e Cotas**. O nome e detalhes do plano estão exibidos no topo da página.
