# Plano: Sistema de Cargos e Permissões Modular

## Objetivo
Tornar o sistema de cargos mais modular, permitindo que cada **seção/módulo** do sistema possa ser atribuída a um cargo de forma granular e flexível.

## Decisões do Usuário
- **Organização da sidebar**: Manter seções (Centro, Gestão, Admin, Cadastro), cada item controlado por permissão. Seção aparece se tiver pelo menos 1 item visível.
- **Granularidade**: Usar permissões granulares existentes + adicionar novas permissões de acesso onde faltam.

---

## Resumo das Mudanças

### 1. Novas Permissões de Acesso (seed.ts)
Adicionar permissões `:acessar` para módulos que ainda não têm:

```
workspace:acessar        - Acessar Área de Trabalho
kanban:acessar           - Acessar Kanban
chat:acessar             - Acessar Chat Equipe
performance:acessar      - Acessar Performance/Ranking
importar_renovacoes:acessar - Importar Renovações
gestao_comercial:acessar - Acessar Gestão Comercial
gestao_pessoas:acessar   - Acessar Gestão de Pessoas
negocios_corretora:acessar - Acessar Negócios Corretora
```

### 2. Refatorar Sidebar (app-sidebar.tsx)
- Cada item terá uma `permission` obrigatória
- Remover lógica `isAdmin || isGestor` para seções
- Seção só aparece se tiver pelo menos 1 item visível
- Admin continua com bypass automático

### 3. Atualizar Cargos Padrão (cargos-padrao.ts)
Adicionar as novas permissões aos cargos existentes.

### 4. Atualizar UI de Permissões (permissoes-dialog.tsx)
Adicionar configuração para novos grupos de permissão.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `libs/shared/database/src/seed.ts` | Adicionar 8 novas permissões |
| `libs/shared/utils/src/cargos-padrao.ts` | Adicionar permissões aos cargos |
| `apps/web/src/components/layout/app-sidebar.tsx` | Refatorar para usar permissões |
| `apps/web/src/components/usuarios/permissoes-dialog.tsx` | Adicionar novos grupos |

---

## Implementação Detalhada

### 1. seed.ts - Novas Permissões

```typescript
// === WORKSPACE E FERRAMENTAS ===
{ nomePermissao: 'workspace:acessar', descricao: 'Acessar Área de Trabalho', grupo: 'workspace' },
{ nomePermissao: 'kanban:acessar', descricao: 'Acessar Kanban', grupo: 'workspace' },
{ nomePermissao: 'chat:acessar', descricao: 'Acessar Chat da Equipe', grupo: 'workspace' },
{ nomePermissao: 'performance:acessar', descricao: 'Acessar Ranking de Performance', grupo: 'workspace' },

// === GESTÃO ===
{ nomePermissao: 'importar_renovacoes:acessar', descricao: 'Importar renovações', grupo: 'gestao' },
{ nomePermissao: 'gestao_comercial:acessar', descricao: 'Acessar Gestão Comercial', grupo: 'gestao' },
{ nomePermissao: 'gestao_pessoas:acessar', descricao: 'Acessar Gestão de Pessoas', grupo: 'gestao' },

// === NEGÓCIOS ===
{ nomePermissao: 'negocios_corretora:acessar', descricao: 'Acessar Negócios da Corretora', grupo: 'negocios' },
```

### 2. app-sidebar.tsx - Nova Estrutura

```typescript
// Definir todos os items com section e permission
const sidebarItems = [
  // Centro
  { title: 'Overview', url: '/dashboard', icon: Home, section: 'centro', permission: 'dashboard:visualizar' },
  { title: 'Area de Trabalho', url: '/workspace', icon: Briefcase, section: 'centro', permission: 'workspace:acessar' },
  { title: 'Kanban', url: '/dashboard/kanban', icon: KanbanSquare, section: 'centro', permission: 'kanban:acessar' },
  { title: 'Chat Equipe', url: '/chat', icon: MessagesSquare, section: 'centro', permission: 'chat:acessar' },
  { title: 'Performance', url: '/dashboard/ranking', icon: Trophy, section: 'centro', permission: 'performance:acessar' },
  { title: 'Clientes', url: '/clientes', icon: Users, section: 'centro', permission: 'clientes:visualizar' },
  
  // Gestão
  { title: 'Produtos', url: '/produtos', icon: Package, section: 'gestao', permission: 'produtos:visualizar' },
  { title: 'Seguradoras Parceiras', url: '/seguradoras-parceiras', icon: Shield, section: 'gestao', permission: 'seguradoras_parceiras:visualizar' },
  { title: 'Importar Renovações', url: '/dashboard/importar-renovacoes', icon: Upload, section: 'gestao', permission: 'importar_renovacoes:acessar' },
  { title: 'Gestão Comercial', url: '/dashboard/admin/gestao-comercial', icon: Briefcase, section: 'gestao', permission: 'gestao_comercial:acessar' },
  { title: 'Gestão de Pessoas', url: '/dashboard/admin/gestao-pessoas', icon: Users, section: 'gestao', permission: 'gestao_pessoas:acessar' },
  
  // Admin
  { title: 'Usuários', url: '/usuarios', icon: Users, section: 'admin', permission: 'usuarios:visualizar' },
  { title: 'Negócios Corretora', url: '/negocios-corretora', icon: Building2, section: 'admin', permission: 'negocios_corretora:acessar' },
  { title: 'Métricas', url: '/dashboard/metricas', icon: BarChart3, section: 'admin', permission: 'metricas:acessar' },
  { title: 'Configurações', url: '/dashboard/admin/seguradoras', icon: Settings, section: 'admin', permission: 'config:acessar' },
  
  // Cadastro
  { title: 'Cadastro', url: '/cadastro', icon: CheckCircle2, section: 'cadastro', permission: 'cadastro:acessar' },
];

// Função para verificar permissão
const hasPermission = (permission: string) => {
  if (user?.isAdmin) return true;
  return user?.permissoes?.includes(permission) ?? false;
};

// Filtrar items visíveis
const visibleItems = sidebarItems.filter(item => hasPermission(item.permission));

// Agrupar por seção
const sections = {
  centro: visibleItems.filter(i => i.section === 'centro'),
  gestao: visibleItems.filter(i => i.section === 'gestao'),
  admin: visibleItems.filter(i => i.section === 'admin'),
  cadastro: visibleItems.filter(i => i.section === 'cadastro'),
};
```

### 3. cargos-padrao.ts - Atualização

```typescript
GERENTE: {
  permissoes: [
    // ... existentes ...
    // Novas permissões de acesso
    'workspace:acessar',
    'kanban:acessar',
    'chat:acessar',
    'performance:acessar',
    'importar_renovacoes:acessar',
    'gestao_comercial:acessar',
    'gestao_pessoas:acessar',
    'negocios_corretora:acessar',
  ]
},

VENDEDOR: {
  permissoes: [
    // ... existentes ...
    'workspace:acessar',
    'kanban:acessar',
    'chat:acessar',
    'performance:acessar',
  ]
},

CADASTRO: {
  permissoes: [
    // ... existentes ...
    // Apenas acesso básico
  ]
}
```

### 4. permissoes-dialog.tsx - Novos Grupos

```typescript
// Adicionar ao GRUPO_CONFIG
workspace: {
  icon: LayoutGrid,
  label: 'Workspace',
  description: 'Ferramentas de trabalho',
  color: 'bg-cyan-500',
},
gestao: {
  icon: Briefcase,
  label: 'Gestão',
  description: 'Ferramentas de gestão',
  color: 'bg-amber-500',
},
negocios: {
  icon: Building2,
  label: 'Negócios',
  description: 'Negócios da corretora',
  color: 'bg-emerald-500',
},
```

---

## Ordem de Execução

1. Adicionar novas permissões no `seed.ts`
2. Atualizar `cargos-padrao.ts` com novas permissões
3. Rodar `pnpm db:seed` para criar permissões no banco
4. Refatorar `app-sidebar.tsx` para usar sistema de permissões
5. Atualizar `permissoes-dialog.tsx` com novos grupos
6. Testar com diferentes cargos

---

## Resultado Esperado

Após a implementação:
- Cada item da sidebar será controlado por uma permissão específica
- Seções só aparecem se o usuário tiver pelo menos 1 item visível
- Admin continua vendo tudo (bypass)
- Cargos personalizados podem ter acesso granular a cada módulo
- UI de permissões mostra todos os grupos organizados
