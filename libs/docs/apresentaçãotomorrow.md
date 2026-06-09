# Ecosistema Seguros — Guia do Usuário Final

Plataforma completa para corretoras de seguros. Este documento explica todas as funcionalidades disponíveis.

---

## 1. Dashboard

A tela inicial do sistema. Reúne tudo que é importante em um só lugar, atualizado em tempo real.

### Cards de estatísticas principais (KPIs)

| Card | O que mostra |
|------|-------------|
| **Clientes Ativos** | Total de clientes com status ativo cadastrados no sistema |
| **Renovações Pendentes** | Apólices que estão próximas do vencimento e ainda não foram renovadas |
| **Cotações Abertas** | Cotações em andamento que ainda não foram convertidas ou encerradas |
| **Proposta em Cadastro** | Propostas criadas e em processo de formalização |
| **Prêmio Líquido do Mês** | Soma dos prêmios das vendas confirmadas no mês atual |
| **Comissão do Mês** | Total de comissões geradas pela equipe no mês atual |
| **Renovações Urgentes** | Apólices com vencimento em 45 dias ou menos — requer ação imediata |

### Gráfico: Renovações x Convertidos

Exibe a relação entre as renovações que venceram e quantas foram efetivamente convertidas (cliente renovou). Serve para medir a eficiência no processo de renovação.

### Alertas de Follow-up

Lista automática de **cotações sem nenhum movimento há mais de 5 dias**. O sistema identifica essas cotações e as exibe aqui para que o vendedor não perca oportunidades por falta de acompanhamento.

### Tarefas e Lembretes

Lista das tarefas e lembretes cadastrados manualmente pelo usuário ou gerados pelo sistema, com data de vencimento próxima.

### Renovações Urgentes

Seção dedicada às apólices que vencem nos próximos 45 dias, permitindo acesso rápido para iniciar o contato com o cliente.

### Atividades Recentes

Histórico das últimas ações realizadas no sistema pela equipe.

---

## 2. Notificações

Central de alertas do sistema. Reúne todas as notificações em um único lugar.

### Tipos de notificações que aparecem

- **Renovações próximas do vencimento** — aviso automático quando uma apólice está se aproximando da data de expiração
- **Cotações paradas** — alerta quando uma cotação fica sem movimentação por mais de 5 dias
- **Documentos pendentes** — lembretes sobre documentos que precisam ser enviados ou assinados
- **Tarefas atrasadas** — notificação quando uma tarefa passa da data de vencimento sem ser concluída
- **Aniversários de clientes** — lembrete para contato no aniversário do cliente
- **Atividades da equipe** — atualizações sobre ações de outros membros da corretora

### Como usar

- Filtre por tipo de notificação ou status (lida/não lida)
- Marque notificações como lidas individualmente ou todas de uma vez
- Clique na notificação para ir diretamente ao item relacionado (cotação, cliente, apólice etc.)

---

## 3. Agenda

Calendário integrado que consolida em uma única tela todas as datas importantes da corretora.

### O que aparece na agenda

A agenda organiza os eventos em três categorias com cores diferentes:

| Cor | Categoria | O que inclui |
|-----|-----------|-------------|
| 🔵 Azul | **Tarefas** | Lembretes e tarefas criadas manualmente no Dashboard ou na própria agenda |
| 🟠 Laranja | **Renovações** | Apólices com vencimento no mês exibido — geradas automaticamente pelo sistema |
| 🟣 Roxo | **Vencimentos** | Documentos com data de expiração (CNHs, certidões, documentos de clientes) |

### Como funciona

- **Visualização mensal:** grid com todos os dias do mês. Cada dia exibe pontos coloridos indicando quantos eventos existem e de qual categoria.
- **Clique em um dia:** abre o painel lateral com a lista detalhada de todos os eventos daquele dia.
- **Filtros:** ative ou desative cada categoria individualmente para focar no que importa.
- **Mini-calendário (sidebar):** na versão desktop, aparece um calendário menor para navegação rápida entre os dias sem mover o calendário principal.
- **Navegação entre meses:** use as setas no cabeçalho para ir ao mês anterior ou ao próximo.

### Dica

Clique em um evento de renovação ou tarefa na lista do dia para ir diretamente ao registro correspondente no sistema.

---

## 4. Área de Trabalho (Workspace)

Espaço pessoal do usuário para organizar suas atividades do dia a dia, tarefas e acompanhamentos.

---

## 5. Kanban — Pipeline de Vendas

Quadro visual para acompanhar todas as oportunidades de negócio da corretora, do primeiro contato até o fechamento.

### Etapas do pipeline

Cada oportunidade percorre as seguintes colunas:

| Etapa | O que significa |
|-------|----------------|
| **Lead** | Prospect identificado. Ainda não houve contato direto. |
| **Contato Inicial** | Primeiro contato realizado. Aguardando resposta ou agendamento. |
| **Negociação** | Em negociação ativa. Cotações sendo comparadas, condições discutidas. |
| **Ganha** | Negócio fechado com sucesso. Valor e data de fechamento registrados. |
| **Perdida** | Oportunidade perdida. Motivo da perda registrado para análise. |

### Temperatura do Lead

Cada oportunidade tem uma temperatura que indica o nível de interesse do cliente:

- 🔵 **Frio** — pouco interesse ou sem contato recente. Requer nutrição.
- 🟡 **Morno** — cliente demonstrou interesse. Acompanhamento regular necessário.
- 🔴 **Quente** — cliente pronto para fechar. Alta probabilidade de conversão.

### Prioridades

- **Baixa** — sem urgência, fluxo normal
- **Média** — acompanhamento semanal recomendado
- **Alta** — acompanhamento diário necessário
- **Urgente** — ação imediata, risco de perda iminente

### Como usar o Kanban

1. Clique em **"Nova Oportunidade"** e preencha: nome do cliente, vendedor, seguradora, temperatura e prêmio estimado.
2. A oportunidade começa na coluna **Lead**.
3. **Arraste o card** para a próxima coluna conforme o avanço da negociação.
4. Ao fechar, arraste para **Ganha** e registre o valor final.
5. Se perder, arraste para **Perdida** e registre o motivo.

### Gestão CRM (para Gestores e Admins)

Gestores têm acesso a um painel exclusivo com visão completa de todas as oportunidades:

- **Dashboard de vendedores:** total de oportunidades, leads, negociações, ganhas, perdidas, valor total e taxa de conversão por vendedor.
- **Reatribuição:** transfira oportunidades de um vendedor para outro.
- **Estatísticas consolidadas:** visão geral de todo o pipeline da corretora.

---

## 6. Chat da Equipe

Canal de comunicação interna em tempo real entre todos os membros da corretora.

### O que é possível fazer

- **Mensagens diretas:** conversa privada entre dois usuários
- **Canais de equipe:** grupos de discussão por assunto ou departamento
- **Compartilhamento de arquivos:** envie documentos, imagens e anexos diretamente no chat
- **Notificações em tempo real:** receba alertas quando alguém te mencionar ou enviar uma mensagem

---

## 7. Clientes

Módulo completo para cadastro e gestão da base de clientes da corretora.

### Tipos de cliente

**Pessoa Física (PF)**
- Nome Completo (obrigatório)
- CPF com validação automática (obrigatório)
- Data de Nascimento
- RG
- Telefone (obrigatório)
- Email (obrigatório)
- Endereço Completo

**Pessoa Jurídica (PJ)**
- Razão Social (obrigatório)
- Nome Fantasia
- CNPJ com validação automática (obrigatório)
- Inscrição Estadual
- Responsável
- Telefone (obrigatório)
- Email (obrigatório)
- Endereço Completo

### Como cadastrar um cliente

1. Acesse **Clientes** no menu lateral
2. Clique em **"Novo Cliente"**
3. Selecione o tipo: **PF** ou **PJ**
4. Preencha os dados do formulário
5. Atribua o **vendedor responsável**
6. Clique em **Salvar**

### Funcionalidades disponíveis

- **Importação em massa:** importe clientes de planilhas Excel (.xlsx) ou CSV. O sistema valida os dados automaticamente, detecta duplicatas e gera relatório de erros.
- **Busca avançada:** encontre clientes por nome, CPF/CNPJ, email ou tags. Resultados em tempo real.
- **Filtros:** filtre por vendedor responsável, status (ativo/inativo) ou tags.
- **Tags personalizadas:** organize clientes com etiquetas coloridas de sua escolha.
- **Transferência de clientes:** transfira clientes entre vendedores individualmente ou em lote, com histórico de transferências mantido.
- **Histórico de alterações:** todas as edições ficam registradas com data, hora e usuário responsável.
- **Inativar ao invés de excluir:** mantenha o histórico do cliente mesmo quando ele não é mais ativo.

---

## 8. Cotações

Módulo para criação, envio e acompanhamento de cotações de seguros.

### Ciclo de vida de uma cotação

| Status | O que significa |
|--------|----------------|
| **Em Elaboração** | Cotação sendo criada, ainda não foi enviada ao cliente |
| **Enviada ao Cliente** | Cotação enviada, aguardando resposta |
| **Aprovada** | Cliente aprovou. Próximo passo: criar proposta |
| **Recusada** | Cliente recusou a cotação |
| **Expirada** | Passou da data de validade sem resposta |
| **Convertida** | Cotação transformada em proposta ou venda |

### Como criar uma cotação

1. Acesse **Cotações** no menu e clique em **"Nova Cotação"**
2. Preencha os dados básicos: cliente, produto, seguradora
3. Insira o valor do prêmio — comissões são calculadas automaticamente
4. Complete coberturas, franquias e observações
5. Revise e **envie ao cliente** por email
6. Acompanhe a resposta e atualize o status
7. Se aprovada, converta em proposta com um clique

### Recursos principais

- **Cálculo automático de comissões** com base no produto e seguradora
- **Múltiplas versões:** compare diferentes seguradoras ou variações de cobertura para o mesmo cliente
- **Envio por email** com template profissional
- **Conversão inteligente:** dados transferidos automaticamente ao converter em proposta
- **Anexos:** adicione documentos e arquivos à cotação
- **Alertas de follow-up:** o Dashboard avisa quando uma cotação fica parada por mais de 5 dias

---

## 9. Renovações

Controle automático de apólices que estão se aproximando do vencimento.

### Como funciona

- O sistema monitora as datas de vencimento de todas as apólices cadastradas
- **45 dias antes do vencimento**, um alerta é gerado automaticamente
- As renovações urgentes aparecem no Dashboard e na Agenda
- Acompanhe o status de conversão: quais foram renovadas e quais foram perdidas

### Importação de renovações

Importe listas de renovações via planilha para atualizar o sistema em massa.

---

## 10. Métricas

Relatórios e análises detalhadas de produção da corretora.

- Gráficos de produção mensal
- Comparativo por produto e seguradora
- Performance individual por vendedor
- Exportação de relatórios em Excel ou PDF

---

## 11. Performance

Ranking e acompanhamento individual dos vendedores.

- Ranking de vendedores por volume de vendas
- Metas mensais e percentual de atingimento
- Taxa de conversão por vendedor
- Histórico de performance por período

---

## 12. Produtos

Catálogo dos produtos de seguro comercializados pela corretora.

- Cadastro de produtos por ramo (auto, vida, residencial, etc.)
- Vinculação com seguradoras parceiras
- Coberturas e valores mínimos por produto
- Ativação e desativação de produtos

---

## 13. Seguradoras Parceiras

Cadastro e gestão das seguradoras com as quais a corretora trabalha.

- Dados completos de cada seguradora (CNPJ, contatos, representantes)
- Percentuais de comissão configurados por produto
- Status ativo/inativo
- Informações de contato dos representantes comerciais

---

## 14. Usuários

Gestão da equipe da corretora.

- Cadastro de novos usuários com foto de perfil
- Atribuição de cargo e permissões
- Controle de acesso granular por funcionalidade
- Ativação e desativação de usuários

---

## 15. Configurações — Cargos e Permissões

O sistema utiliza um modelo de permissões baseado em cargos. Cada cargo tem um conjunto específico de ações que pode realizar.

### Exemplos de perfis típicos

| Perfil | O que pode fazer |
|--------|-----------------|
| **Vendedor** | Vê seus próprios clientes, cotações e oportunidades. Acesso às suas métricas individuais. |
| **Gestor** | Vê dados de toda a equipe, relatórios consolidados, pode transferir clientes e oportunidades entre vendedores. |
| **Admin** | Acesso total: configuração de cargos, permissões, cadastro de seguradoras, produtos, usuários e exportação de relatórios avançados. |

---

## 16. Perfil do Usuário

Cada usuário pode gerenciar suas próprias informações:

- Atualizar nome, email e foto de perfil
- Alterar senha
- Configurar preferências de notificação

---

## Dicas gerais de uso

1. **Acesse o Dashboard todo dia** para não perder alertas de follow-up e renovações urgentes.
2. **Mantenha o status das cotações atualizado** — isso alimenta o Dashboard e o Kanban com informações corretas.
3. **Use tags nos clientes** para segmentá-los e encontrá-los rapidamente com filtros.
4. **Inative clientes** ao invés de excluir — o histórico é mantido e pode ser útil futuramente.
5. **Registre o motivo da perda** ao fechar uma oportunidade como perdida — esses dados ajudam a identificar padrões e melhorar o processo.
6. **Defina data de validade nas cotações** para criar senso de urgência e evitar cotações desatualizadas no sistema.
7. **Use a Agenda** para ter uma visão temporal de tudo que precisa ser feito: tarefas, renovações e vencimentos de documentos num só lugar.
