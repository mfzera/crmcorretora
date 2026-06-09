# Gestão CRM - Sistema de Controle para Gestores

## Visão Geral

O módulo de **Gestão CRM** foi criado para permitir que gestores (gerentes) tenham controle total sobre as oportunidades de todos os vendedores da equipe. Este módulo oferece uma visão completa do pipeline de vendas e permite gerenciar oportunidades de forma centralizada.

## Funcionalidades Principais

### 1. Dashboard de Estatísticas
- **Total de Oportunidades**: Visão geral do número total de oportunidades
- **Em Negociação**: Oportunidades ativas no pipeline
- **Valor Ganho**: Total de vendas concretizadas
- **Taxa de Conversão**: Percentual de sucesso do time

### 2. Análises por Prioridade e Temperatura
- Distribuição visual de oportunidades por prioridade (baixa, média, alta)
- Distribuição por temperatura (frio, morno, quente)
- Gráficos de barras com percentuais

### 3. Performance da Equipe
Tabela completa com estatísticas de cada vendedor:
- Total de oportunidades
- Leads ativos
- Oportunidades em andamento
- Vendas ganhas
- Taxa de conversão individual
- Valor total ganho
- Valor em negociação

### 4. Gestão de Oportunidades

#### Criar Nova Oportunidade
- Atribuir oportunidade a qualquer vendedor da equipe
- Definir status inicial (Lead, Qualificada, Proposta, Negociação)
- Configurar prioridade e temperatura
- Adicionar valor estimado e data de vencimento
- Incluir observações
- Notificação automática para o vendedor atribuído

#### Reatribuir Oportunidades
- Transferir oportunidade de um vendedor para outro
- Notificação automática para o novo responsável
- Histórico de atribuições mantido

#### Deletar Oportunidades
- Soft delete com confirmação
- Apenas gestores podem deletar qualquer oportunidade

### 5. Filtros e Visualizações
- Filtrar por vendedor específico
- Filtrar por status da oportunidade
- Visualizar todas as oportunidades ou por vendedor
- Tabs separadas para equipe e oportunidades

## Rotas Backend

### Endpoints Criados (`/api/gestao-crm`)

```typescript
GET    /overview              // Lista todas oportunidades (com filtros)
GET    /vendedores            // Lista vendedores com estatísticas
GET    /estatisticas          // Estatísticas gerais do CRM
POST   /oportunidades         // Cria oportunidade para um vendedor
PATCH  /oportunidades/:id/reatribuir  // Reatribui oportunidade
DELETE /oportunidades/:id     // Deleta oportunidade
```

Todos os endpoints exigem:
- Autenticação (`fastify.authenticate`)
- Isolamento de tenant (`fastify.tenantIsolation`)
- Permissão de gestor (`requireGestor()`)

## Componentes Frontend

### Página Principal
**Localização**: `apps/web/src/app/(app)/gestao-crm/page.tsx`

Página principal com layout responsivo contendo:
- Header com título e botão de nova oportunidade
- Estatísticas gerais em cards
- Tabs para visualização de equipe e oportunidades

### Componentes Criados

1. **EstatisticasCRM** (`estatisticas-crm.tsx`)
   - Cards de métricas principais
   - Gráficos de distribuição por prioridade
   - Gráficos de distribuição por temperatura

2. **VendedoresTable** (`vendedores-table.tsx`)
   - Tabela com performance de cada vendedor
   - Métricas individuais detalhadas
   - Botão para ver detalhes (filtra oportunidades do vendedor)

3. **NovaOportunidadeGestorDialog** (`nova-oportunidade-gestor-dialog.tsx`)
   - Formulário completo para criar oportunidade
   - Seleção de vendedor com contador de oportunidades
   - Validação de campos
   - Criação de notificação automática

4. **OportunidadesGestaoList** (`oportunidades-gestao-list.tsx`)
   - Listagem completa de oportunidades
   - Filtros por status
   - Menu de ações (reatribuir, deletar)
   - Dialogs de confirmação
   - Badges visuais para status, prioridade e temperatura

### Queries e Mutations

**Localização**: `apps/web/src/lib/queries/gestao-crm.ts`

#### Queries
- `useVendedoresStats()`: Lista vendedores com estatísticas
- `useOportunidadesGestao()`: Lista oportunidades com filtros
- `useEstatisticasCRM()`: Busca estatísticas gerais

#### Mutations
- `useCriarOportunidadeGestor()`: Cria nova oportunidade
- `useReatribuirOportunidade()`: Reatribui oportunidade
- `useDeletarOportunidadeGestor()`: Deleta oportunidade

## Permissões

### Nova Permissão Criada
- `gestao_crm:acessar`: Permissão principal para acessar o módulo

### Permissões de Kanban Adicionadas ao Gerente
- `kanban:visualizar_todas`: Ver oportunidades de todos
- `kanban:criar`: Criar oportunidades
- `kanban:editar`: Editar oportunidades
- `kanban:deletar`: Deletar oportunidades
- `kanban:fechar`: Marcar como ganha
- `kanban:perder`: Marcar como perdida

### Cargos com Acesso
Por padrão, apenas o cargo de **Gerente** tem acesso à Gestão CRM.

## Menu de Navegação

O item "Gestão CRM" foi adicionado na seção **Gestão** do sidebar, visível apenas para usuários com a permissão `gestao_crm:acessar`.

**Localização**: `apps/web/src/components/layout/app-sidebar.tsx`

## Notificações

O sistema cria notificações automáticas nos seguintes cenários:

1. **Nova Oportunidade Atribuída**
   - Quando um gestor cria uma oportunidade para um vendedor
   - Mensagem: "Nova oportunidade [Nome] foi atribuída a você pelo gestor [Nome]"
   - Link direto para o Kanban

2. **Oportunidade Reatribuída**
   - Quando um gestor transfere uma oportunidade para outro vendedor
   - Mensagem: "A oportunidade [Nome] foi reatribuída a você pelo gestor [Nome]"
   - Informações sobre vendedor anterior
   - Link direto para o Kanban

## Fluxo de Uso

### Cenário 1: Criar Nova Oportunidade
1. Gestor acessa "Gestão CRM" no menu
2. Clica em "Nova Oportunidade"
3. Preenche dados do cliente e da oportunidade
4. Seleciona o vendedor responsável
5. Define status, prioridade e temperatura
6. Confirma criação
7. Vendedor recebe notificação

### Cenário 2: Acompanhar Performance
1. Gestor acessa "Gestão CRM"
2. Visualiza cards de estatísticas gerais
3. Analisa gráficos de distribuição
4. Consulta tabela de performance da equipe
5. Identifica vendedores com baixa taxa de conversão
6. Toma decisões baseadas em dados

### Cenário 3: Reatribuir Oportunidade
1. Gestor visualiza lista de oportunidades
2. Identifica oportunidade para reatribuir
3. Clica em "..." > "Reatribuir"
4. Seleciona novo vendedor
5. Confirma reatribuição
6. Novo vendedor recebe notificação

### Cenário 4: Visualizar Oportunidades de um Vendedor
1. Na aba "Equipe", clica em "Ver Detalhes" de um vendedor
2. Sistema filtra e exibe apenas oportunidades daquele vendedor
3. Gestor pode analisar detalhadamente o pipeline individual
4. Pode reatribuir ou deletar oportunidades conforme necessário

## Arquivos Modificados/Criados

### Backend
- ✅ `apps/api/src/routes/gestao-crm/index.ts` (novo)
- ✅ `apps/api/src/app.ts` (modificado - registro de rota)

### Frontend - Componentes
- ✅ `apps/web/src/components/gestao-crm/estatisticas-crm.tsx` (novo)
- ✅ `apps/web/src/components/gestao-crm/vendedores-table.tsx` (novo)
- ✅ `apps/web/src/components/gestao-crm/nova-oportunidade-gestor-dialog.tsx` (novo)
- ✅ `apps/web/src/components/gestao-crm/oportunidades-gestao-list.tsx` (novo)

### Frontend - Páginas e Queries
- ✅ `apps/web/src/app/(app)/gestao-crm/page.tsx` (novo)
- ✅ `apps/web/src/lib/queries/gestao-crm.ts` (novo)

### Layout
- ✅ `apps/web/src/components/layout/app-sidebar.tsx` (modificado - novo item de menu)

### Permissões
- ✅ `libs/shared/utils/src/cargos-padrao.ts` (modificado - novas permissões)

## Próximos Passos Recomendados

1. **Migração de Permissões**: Executar migration para criar a permissão `gestao_crm:acessar` no banco
2. **Atualizar Cargos Existentes**: Adicionar a nova permissão aos gerentes já cadastrados
3. **Testes**: Testar todas as funcionalidades com usuário gerente
4. **Melhorias Futuras**:
   - Adicionar relatórios exportáveis
   - Implementar drag-and-drop de oportunidades
   - Adicionar histórico de ações
   - Criar metas por vendedor
   - Implementar análise de funil de vendas

## Tecnologias Utilizadas

- **Backend**: Fastify, Drizzle ORM
- **Frontend**: Next.js 14, React Query, React Hook Form
- **UI**: shadcn/ui, Tailwind CSS
- **Validação**: Zod
- **Notificações**: Sistema interno de notificações + Sonner (toast)
