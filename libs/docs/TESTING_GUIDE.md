# Guia de Testes Manuais - ecotech-sys

Este documento detalha os passos para testar manualmente as diferentes páginas da aplicação web.

## Roteamento

A aplicação utiliza uma estrutura de roteamento baseada em diretórios, dividida em três seções principais:

- `(admin)`: Páginas restritas a administradores do sistema.
- `(app)`: Páginas da aplicação principal, acessíveis por usuários autenticados.
- `(auth)`: Páginas de autenticação.
- `(static)`: Páginas estáticas com informações gerais.

---

## Páginas de Autenticação `(auth)`

### 1. Login

- **Rota:** `/login`
- **Descrição:** Página de login para acesso à plataforma.
- **Passos do Teste:**
    1. Acesse a página de login.
    2. Tente fazer login com credenciais inválidas e verifique se uma mensagem de erro é exibida.
    3. Tente fazer login com credenciais válidas e verifique se o redirecionamento para o dashboard (`/dashboard`) ocorre com sucesso.
    4. Verifique se o link para redefinição de senha está funcionando (se aplicável).
    5. Verifique se o link para a página de cadastro está funcionando (se aplicável).

---

## Páginas da Aplicação Principal `(app)`

### 1. Dashboard

- **Rota:** `/dashboard`
- **Descrição:** Página inicial após o login, com um resumo das principais informações.
- **Passos do Teste:**
    1. Verifique se todos os componentes (gráficos, tabelas, etc.) são carregados corretamente.
    2. Interaja com os filtros do dashboard (se houver) e verifique se os dados são atualizados.
    3. Verifique se os links para outras seções da aplicação estão funcionando.

### 2. Kanban

- **Rota:** `/dashboard/kanban`
- **Descrição:** Quadro Kanban para gerenciamento de tarefas ou projetos.
- **Passos do Teste:**
    1. Crie um novo card.
    2. Mova um card entre as colunas.
    3. Edite o conteúdo de um card.
    4. Exclua um card.
    5. Atribua um card a um usuário (se aplicável).

### 3. Clientes

- **Rota:** `/clientes`
- **Descrição:** Página de gerenciamento de clientes.
- **Passos do Teste:**
    1. Crie um novo cliente.
    2. Edite as informações de um cliente existente.
    3. Exclua um cliente.
    4. Utilize a função de busca para encontrar um cliente específico.
    5. Verifique a paginação da lista de clientes (se houver).

### 4. Produtos

- **Rota:** `/produtos`
- **Descrição:** Página de gerenciamento de produtos.
- **Passos do Teste:**
    1. Crie um novo produto.
    2. Edite as informações de um produto existente.
    3. Exclua um produto.
    4. Utilize a função de busca para encontrar um produto específico.

### 5. Gestão CRM

- **Rota:** `/gestao-crm`
- **Descrição:** Ferramentas de CRM para gerenciamento de relacionamento com o cliente.
- **Passos do Teste:**
    1. Crie um novo lead ou oportunidade.
    2. Altere o estágio de uma oportunidade no funil de vendas.
    3. Adicione uma anotação ou tarefa a um contato.
    4. Verifique se os filtros e a busca funcionam corretamente.

### 6. Usuários

- **Rota:** `/usuarios`
- **Descrição:** Página de gerenciamento de usuários da plataforma.
- **Passos do Teste:**
    1. Crie um novo usuário.
    2. Atribua um cargo ou permissão a um usuário.
    3. Edite as informações de um usuário.
    4. Desative ou exclua um usuário.

### 7. Configurações de Cargos

- **Rota:** `/configuracoes/cargos`
- **Descrição:** Página para configurar cargos e permissões.
- **Passos do Teste:**
    1. Crie um novo cargo.
    2. Associe permissões a um cargo.
    3. Edite o nome ou as permissões de um cargo.
    4. Exclua um cargo.

### 8. Perfil do Usuário

- **Rota:** `/perfil`
- **Descrição:** Página onde o usuário pode visualizar e editar suas próprias informações.
- **Passos do Teste:**
    1. Altere o nome e as informações de contato do usuário.
    2. Faça o upload de uma nova foto de perfil.
    3. Altere a senha e verifique se a nova senha é funcional no próximo login.

### 9. Notificações

- **Rota:** `/notificacoes`
- **Descrição:** Central de notificações do usuário.
- **Passos do Teste:**
    1. Verifique se as novas notificações são exibidas corretamente.
    2. Marque uma notificação como lida e verifique se o status é atualizado.
    3. Clique em uma notificação e verifique se é redirecionado para a página correta.

---

## Páginas de Administração `(admin)`

### 1. Login de Admin

- **Rota:** `/admin/login`
- **Descrição:** Página de login para administradores do sistema.
- **Passos do Teste:**
    1. Tente fazer login com credenciais de administrador inválidas.
    2. Faça login com credenciais de administrador válidas e verifique o redirecionamento para o dashboard de admin (`/admin/dashboard`).

### 2. Dashboard de Admin

- **Rota:** `/admin/dashboard`
- **Descrição:** Painel com métricas e informações gerais do sistema.
- **Passos do Teste:**
    1. Verifique se todos os gráficos e dados são carregados corretamente.
    2. Teste os filtros disponíveis (por data, por tenant, etc.).

### 3. Gerenciamento de Tenants

- **Rota:** `/admin/tenants`
- **Descrição:** Página para gerenciar as diferentes instâncias (tenants) da aplicação.
- **Passos do Teste:**
    1. Crie um novo tenant.
    2. Edite as informações de um tenant existente.
    3. Ative ou desative um tenant.

### 4. Logs de Auditoria

- **Rota:** `/admin/audit-logs`
- **Descrição:** Registros de atividades importantes realizadas no sistema.
- **Passos do Teste:**
    1. Realize uma ação que gera log (ex: criar um usuário).
    2. Acesse a página e verifique se o log foi registrado corretamente.
    3. Utilize os filtros de busca (por usuário, por data, por tipo de ação) para encontrar logs específicos.

### 5. Backups

- **Rota:** `/admin/backups`
- **Descrição:** Página para gerenciamento de backups do sistema.
- **Passos do Teste:**
    1. Inicie um novo backup manual.
    2. Verifique o status dos backups (concluído, em andamento, falhou).
    3. Tente restaurar um backup (em ambiente de teste, se possível).

---

## Páginas Estáticas `(static)`

As páginas estáticas geralmente contêm conteúdo informativo e não possuem funcionalidades complexas.

- **/changelog**: Verifique se a lista de mudanças está sendo exibida.
- **/contato**: Teste o formulário de contato (se houver) e verifique se a mensagem é enviada.
- **/cookies**: Verifique se a política de cookies está sendo exibida.
- **/docs**: Verifique se a documentação está acessível.
- **/funcionalidades**: Verifique se a descrição das funcionalidades está correta.
- **/lgpd**: Verifique se a página sobre a LGPD está sendo exibida.
- **/privacidade**: Verifique se a política de privacidade está sendo exibida.
- **/roadmap**: Verifique se o roadmap do produto está visível.
- **/sobre**: Verifique se as informações sobre a empresa/produto estão corretas.
- **/termos**: Verifique se os termos de serviço estão sendo exibidos.

Para todas as páginas estáticas, o teste principal é garantir que elas carreguem corretamente e que todo o conteúdo seja exibido sem erros de formatação.