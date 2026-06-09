# Aula 2.4 — Endossos e Renovações

## Objetivo
Entender o que são endossos e renovações, como solicitá-los e o que fazer quando são recusados.

---

## O que é um endosso?

Um endosso é uma alteração em uma apólice que já está em vigor. Exemplos:
- Troca de veículo segurado
- Mudança de endereço do bem
- Inclusão ou exclusão de um beneficiário
- Alteração de cobertura ou valor segurado

---

## Fluxo completo de um endosso

```
Solicitação → Em Análise → Aprovado / Recusado
```

### 1. Solicitando um endosso

1. Acesse a apólice que deseja alterar (via **Clientes** → apólice do cliente, ou pelo menu **Endossos**)
2. Clique em **"Solicitar Endosso"**
3. Selecione o tipo de alteração desejada
4. Preencha os novos dados
5. Anexe documentos se necessário
6. Clique em **"Enviar"**

### 2. Acompanhando o endosso

- Acesse o menu **Endossos**
- Use os filtros para visualizar por status: Em Análise, Aprovados, Recusados

### 3. Endosso aprovado

- A apólice é atualizada automaticamente com as novas condições
- Você receberá uma notificação de aprovação
- O documento atualizado estará disponível para download

---

## Como ver o motivo de recusa de um endosso

Quando um endosso é recusado, o sistema registra o campo **`motivoRecusa`**.

**Como acessar:**
1. Vá ao menu **Endossos**
2. Filtre por status **"Recusado"**
3. Clique no endosso recusado
4. Localize o campo **"Motivo da Recusa"** nos detalhes

**Motivos comuns de recusa de endosso:**
- Alteração solicitada fora dos critérios da apólice vigente
- Documentação insuficiente para suportar a alteração
- A mudança requerida exige nova proposta (não é possível via endosso)
- Prazo para solicitação de endosso expirado

**O que fazer após recusa:**
- Leia o motivo com atenção
- Se for documentação, corrija e solicite novo endosso
- Se a alteração exigir nova proposta, cancele a apólice e inicie o processo de cotação/proposta

---

## O que é uma renovação?

Renovação é o processo de prolongar uma apólice que está prestes a vencer.

---

## Alertas de vencimento — como são gerados e onde ver

O sistema gera alertas automáticos quando uma apólice está próxima do vencimento.

- **Onde ver:** Menu **Renovações** ou painel de **Notificações** (sino no topo)
- **Antecedência:** Os alertas são gerados com antecedência configurada pelo Admin (ex: 30, 15 e 7 dias antes)
- **Prioridade:** Alertas de vencimento próximo aparecem como alta prioridade

---

## Como confirmar uma renovação

1. Acesse o menu **Renovações**
2. Localize a apólice com alerta de vencimento
3. Clique em **"Renovar"**
4. Revise os dados e coberturas (o sistema pré-preenche com os dados atuais)
5. Ajuste o que for necessário
6. Clique em **"Confirmar Renovação"**

> Se as condições mudaram (ex: novo endereço, novo veículo), gere um endosso ou uma nova proposta em vez de renovar.

---

## Perguntas frequentes

**Posso solicitar um endosso em uma apólice recusada ou cancelada?**
Não. Endossos só são possíveis em apólices ativas (`ATIVO`).

**A renovação muda o preço do seguro?**
Pode sim. O sistema recalcula com base nos critérios atuais. O novo preço será exibido antes da confirmação.

**O que acontece se a apólice vencer sem ser renovada?**
A cobertura é interrompida. O cliente fica sem seguro até que uma nova apólice seja emitida.

**Posso recusar uma exclusão de venda?**
Sim. Caso um pedido de exclusão seja indevido, o sistema permite recusar com registro do `motivoRecusa` — da mesma forma que um endosso.
