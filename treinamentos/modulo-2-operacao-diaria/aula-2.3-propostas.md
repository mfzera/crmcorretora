# Aula 2.3 — Propostas

## Objetivo
Entender o ciclo de vida completo de uma proposta: criação, envio, acompanhamento de status e como agir em cada situação.

---

## Como gerar uma proposta a partir de uma cotação

1. Acesse a cotação desejada (menu **Cotações**)
2. Escolha o produto/plano que o cliente aprovou
3. Clique em **"Gerar Proposta"**
4. Confirme os dados do cliente e do bem segurado
5. Clique em **"Criar Proposta"**

A proposta será criada com status inicial `AGUARDANDO_ENVIO`.

---

## Os status da proposta — o que cada um significa

### `AGUARDANDO_ENVIO`
A proposta foi criada mas ainda não foi enviada à seguradora.
- **O que fazer:** Revise os dados e clique em **"Enviar Proposta"** quando estiver pronto.

### `ENVIADA`
A proposta foi enviada e está aguardando a seguradora iniciar a análise.
- **O que fazer:** Aguardar. Acompanhe as notificações.

### `EM_ANÁLISE`
A seguradora está avaliando a proposta.
- **O que fazer:** Aguardar. Nenhuma ação necessária no momento.

### `PENDENTE_DOCUMENTAÇÃO`
A seguradora solicitou documentos adicionais antes de prosseguir.
- **O que fazer:** Acesse a proposta → aba **"Documentos"** → veja quais documentos foram solicitados → faça o upload (veja Aula 2.5).

### `APROVADA`
A seguradora aprovou a proposta integralmente.
- **O que fazer:** Confirme a venda com o cliente e avance para emissão da apólice.

### `APROVADA_CONDICIONAL`
A proposta foi aprovada, mas com condições ou ressalvas (ex: cobertura reduzida, franquia maior).
- **O que fazer:** Apresente as condições ao cliente. Se ele aceitar, confirme. Se não, a proposta pode ser cancelada ou renegociada.

> **Diferença entre APROVADA e APROVADA_CONDICIONAL:** Na aprovação condicional, a seguradora impôs restrições. Leia as observações da proposta com atenção antes de confirmar com o cliente.

### `RECUSADA` — Como saber o motivo da recusa

Quando uma proposta é recusada, o sistema registra o **motivo da recusa**.

**Como acessar:**
1. Abra a proposta com status `RECUSADA`
2. Clique na aba **"Histórico"** ou **"Detalhes"**
3. Localize o campo **"Motivo da Recusa"**
4. Leia a justificativa registrada pela seguradora ou pelo analista

**Motivos comuns de recusa:**
- Perfil de risco fora dos critérios de aceitação da seguradora
- Documentação incompleta ou inválida
- Sinistros anteriores não declarados
- Dados inconsistentes no cadastro do cliente

**O que fazer após uma recusa:**
- Se o motivo for corrigível (ex: documentação), corrija e gere uma nova proposta
- Se for por perfil de risco, tente outro produto ou seguradora disponível na plataforma
- Registre o feedback para o cliente

### `CANCELADA`
A proposta foi cancelada (pelo corretor, cliente ou seguradora).
- Propostas canceladas não podem ser reabertas. Gere uma nova se necessário.

### `VENDA_CONFIRMADA`
A proposta foi aprovada e a venda foi confirmada. A apólice será ou já foi emitida.

---

## Como reenviar uma proposta após ajuste

Se a proposta voltou por pendência de documentação ou necessidade de correção:
1. Faça os ajustes necessários (documentos, dados)
2. Acesse a proposta
3. Clique em **"Reenviar"**

---

## Como emitir e baixar o documento da proposta

1. Abra a proposta
2. Clique em **"Emitir Documento"** (disponível após aprovação)
3. O PDF será gerado e estará disponível para download na aba **"Documentos"**

---

## Perguntas frequentes

**Posso editar uma proposta já enviada?**
Não. Para editar, a proposta precisa estar em `AGUARDANDO_ENVIO`. Após enviada, é necessário cancelar e criar uma nova.

**A seguradora recusou mas o motivo não está preenchido. O que fazer?**
Entre em contato com o gestor ou Admin para verificar. O motivo pode ter sido comunicado fora do sistema.

**Quantas propostas posso ter em aberto ao mesmo tempo?**
Não há limite por padrão, mas verifique as cotas do plano da corretora com o Admin (Aula 3.4).
