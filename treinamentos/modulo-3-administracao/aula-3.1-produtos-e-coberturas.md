# Aula 3.1 — Produtos e Coberturas

## Objetivo
Aprender a cadastrar e configurar produtos de seguro, coberturas e regras, além de vinculá-los a parceiros/seguradoras.

---

## O que é um produto no sistema?

Um produto representa um tipo de seguro oferecido pela corretora (ex: Seguro Auto, Seguro de Vida, Seguro Residencial). Cada produto tem:
- Coberturas associadas
- Regras de aceitação e precificação
- Vinculação a uma seguradora parceira

---

## Como cadastrar um novo produto

1. Acesse **Configurações** → **Produtos**
2. Clique em **"Novo Produto"**
3. Preencha:
   - **Nome do produto**
   - **Ramo** (ex: Auto, Vida, Residencial, Empresarial)
   - **Seguradora parceira**
   - **Descrição** (opcional, aparece para o corretor na cotação)
4. Clique em **"Salvar"**
5. O produto será criado com status **inativo** — ative-o após configurar as coberturas

---

## Como configurar coberturas

1. Acesse o produto criado
2. Clique na aba **"Coberturas"**
3. Clique em **"Adicionar Cobertura"**
4. Preencha:
   - **Nome da cobertura** (ex: Colisão, Roubo, Incêndio)
   - **Tipo:** Obrigatória ou Opcional
   - **Limite máximo de indenização**
   - **Franquia** (se aplicável)
5. Repita para cada cobertura do produto
6. Clique em **"Salvar"**

---

## Como configurar regras de preço

1. Na aba **"Regras"** do produto
2. Defina os critérios que influenciam no preço (ex: faixa etária, CEP de risco, valor do bem)
3. Configure as tabelas de precificação conforme acordado com a seguradora
4. Salve as regras

> Em caso de dúvida sobre as regras, consulte o material fornecido pela seguradora parceira.

---

## Como ativar ou desativar um produto para venda

**Para ativar:**
1. Acesse o produto
2. Alterne o campo **"Status"** para **Ativo**
3. Salve

**Para desativar:**
1. Acesse o produto
2. Alterne o campo **"Status"** para **Inativo**
3. Salve

> Produtos inativos não aparecem para os corretores durante a cotação. Propostas já abertas com esse produto não são afetadas.

---

## Como vincular um produto a um parceiro/seguradora

1. Ao criar ou editar um produto, localize o campo **"Seguradora Parceira"**
2. Selecione a seguradora na lista
3. Salve

> Para adicionar uma nova seguradora à lista de parceiros, acesse **Configurações** → **Parceiros**.

---

## Perguntas frequentes

**Um produto pode ter mais de uma seguradora?**
Não. Cada produto está vinculado a uma seguradora. Para o mesmo ramo com seguradoras diferentes, crie produtos separados.

**O corretor pode ver as regras de precificação?**
Não. As regras de precificação são configurações internas — o corretor vê apenas o preço final calculado.

**Posso clonar um produto existente para criar um similar?**
Consulte o Admin — a funcionalidade de cópia pode estar disponível conforme a versão do plano.
