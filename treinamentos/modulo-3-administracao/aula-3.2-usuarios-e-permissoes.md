# Aula 3.2 — Usuários e Permissões

## Objetivo
Aprender a gerenciar usuários da corretora: convidar, definir perfis, ativar/desativar e entender os erros de cadastro.

---

## Como convidar um novo usuário

1. Acesse **Configurações** → **Usuários**
2. Clique em **"Convidar Usuário"**
3. Preencha:
   - **Nome completo**
   - **E-mail**
   - **Perfil de acesso** (Admin, Gestor ou Corretor/Vendedor)
4. Clique em **"Enviar Convite"**
5. O usuário receberá um e-mail com o link de primeiro acesso

---

## Como definir o perfil e permissões de cada usuário

| Perfil | Descrição |
|---|---|
| **Admin** | Acesso total: configurações, produtos, usuários, relatórios e operação |
| **Gestor** | Acesso à equipe, relatórios, aprovações e operação. Não altera configurações do sistema |
| **Corretor/Vendedor** | Acesso operacional: clientes, cotações, propostas, endossos e documentos |

**Para alterar o perfil de um usuário:**
1. Acesse **Configurações** → **Usuários**
2. Clique no usuário
3. Altere o campo **"Perfil"**
4. Salve

> A mudança de perfil tem efeito imediato. O usuário verá o novo menu no próximo acesso.

---

## Como ativar ou desativar um usuário

**Para desativar:**
1. Acesse **Configurações** → **Usuários**
2. Clique no usuário
3. Alterne o campo **"Ativo"** para **Inativo**
4. Salve

O usuário não conseguirá mais fazer login. Os dados e histórico dele são preservados.

**Para reativar:**
Repita o processo e alterne de volta para **Ativo**.

---

## Como saber por que um cadastro foi recusado

Erros no cadastro de corretora ou usuário geralmente têm causas específicas. Veja as mais comuns:

### CNPJ duplicado
O CNPJ informado já está cadastrado no sistema.
- **Solução:** Verifique se a corretora já existe. Se for um cadastro duplicado acidental, entre em contato com o suporte.

### Subdomínio já em uso
O subdomínio escolhido (`suacorretora.ecotechsys.com.br`) já pertence a outra corretora.
- **Solução:** Escolha um subdomínio diferente.

### E-mail já cadastrado
O e-mail informado já está vinculado a outro usuário no sistema.
- **Solução:** Use outro e-mail ou recupere o acesso do usuário existente.

### Dados inválidos
Campos obrigatórios faltando ou formato incorreto (ex: CNPJ com dígitos errados, e-mail sem `@`).
- **Solução:** Revise os campos indicados pelo sistema e corrija.

> O sistema exibe uma mensagem de erro específica para cada caso. Leia a mensagem com atenção antes de contatar o suporte.

---

## Como redefinir a senha de um colaborador

1. Acesse **Configurações** → **Usuários**
2. Clique no usuário
3. Clique em **"Redefinir Senha"**
4. O sistema enviará um e-mail de redefinição para o usuário

> Apenas Admins podem redefinir senhas de outros usuários. O usuário também pode redefinir a própria senha pela tela de login (veja Aula 1.2).

---

## Perguntas frequentes

**Posso excluir um usuário permanentemente?**
Não é recomendado. Prefira desativar o usuário para preservar o histórico de ações. Exclusão permanente exige contato com o suporte.

**O usuário desativado some da listagem?**
Não. Ele permanece na lista com indicação de inativo. Use o filtro **"Ativos"** para visualizar apenas usuários em uso.

**Um corretor pode ver os clientes de outro corretor?**
Por padrão, não. Cada corretor vê apenas seus próprios clientes. Gestores e Admins têm visibilidade total.
