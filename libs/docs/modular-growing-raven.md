# Plano: Sistema de Controle de Usuários

## Status: Pronto para Implementação

## Requisitos Definidos

### Funcionalidades Principais
- ✅ Página separada `/usuarios` para administradores
- ✅ Sistema de 3 tabs: Usuários, Cargos e Equipes
- ✅ CRUD completo de usuários com atribuição de cargo e equipe
- ✅ CRUD de cargos personalizados com gestão de permissões
- ✅ Admin define senha inicial (usuário pode mudar depois)
- ✅ Localização no menu: Seção "Admin"
- ✅ Funcionalidade de resetar senha
- ✅ Campos obrigatórios: Nome, Email, Senha (criação), Cargo
- ✅ Campos opcionais: Telefone, Equipe

## Arquitetura de Implementação

### Estrutura de Arquivos
```
apps/web/src/
├── app/(app)/usuarios/
│   └── page.tsx                    # Página principal com tabs
├── components/usuarios/
│   ├── usuarios-tab.tsx            # Tab gerenciamento de usuários
│   ├── cargos-tab.tsx              # Tab gerenciamento de cargos
│   ├── equipes-tab.tsx             # Tab equipes (placeholder)
│   ├── usuario-dialog.tsx          # Criar/editar usuário
│   ├── excluir-usuario-dialog.tsx  # Confirmar exclusão
│   ├── resetar-senha-dialog.tsx    # Resetar senha
│   ├── visualizar-usuario-dialog.tsx # Ver detalhes
│   ├── cargo-dialog.tsx            # Criar/editar cargo
│   ├── excluir-cargo-dialog.tsx    # Confirmar exclusão cargo
│   └── permissoes-dialog.tsx       # Gerenciar permissões
├── lib/queries/
│   ├── usuarios.ts                 # Hooks usuários
│   ├── cargos.ts                   # Hooks cargos
│   └── permissoes.ts               # Hooks permissões
└── types/
    ├── usuario.ts                  # Types usuários
    ├── cargo.ts                    # Types cargos
    └── permissao.ts                # Types permissões
```

## Arquivos Críticos para Implementação

### 1. `/apps/web/src/app/(app)/usuarios/page.tsx`
Página principal com:
- Header com título e ícone
- Sistema de tabs (Usuários, Cargos, Equipes)
- Botões de ação contextuais (mudam conforme tab ativa)
- Verificação de permissões

### 2. `/apps/web/src/components/usuarios/usuario-dialog.tsx`
Formulário de criar/editar usuário:
- Campos: nome, email, senha (só criação), telefone, cargo, equipe, status
- Validação Zod com senha forte (8+ chars, maiúscula, minúscula, número)
- Integração com API

### 3. `/apps/web/src/components/usuarios/usuarios-tab.tsx`
Tab principal:
- Filtros: busca (nome/email), cargo, equipe, status
- Tabela: Nome, Email, Cargo, Equipe, Status, Último Login, Ações
- Paginação (20 itens/página)
- Menu de ações: Visualizar, Editar, Resetar Senha, Desativar/Ativar, Excluir

### 4. `/apps/web/src/components/usuarios/cargos-tab.tsx`
Tab de cargos:
- Tabela: Nome, Descrição, Tipo (Admin/Gestor/Vendedor), Permissões (count), Usuários (count), Ações
- Menu de ações: Ver Permissões, Gerenciar Permissões, Editar, Excluir
- Proteção: não editar/excluir cargo Admin

### 5. `/apps/web/src/components/usuarios/permissoes-dialog.tsx`
Dialog complexo de permissões:
- Checkboxes agrupadas por categoria (vendas, cadastro, clientes, etc.)
- Mostra permissões atuais marcadas
- Salva array de IDs de permissões

### 6. `/apps/web/src/lib/queries/usuarios.ts`
Query hooks:
- `useUsuarios(params)` - Listar com filtros e paginação
- `useUsuario(id)` - Buscar um
- `useCriarUsuario()` - Criar
- `useAtualizarUsuario()` - Atualizar
- `useExcluirUsuario()` - Deletar
- `useResetarSenha()` - Resetar senha

### 7. `/apps/web/src/lib/queries/cargos.ts`
Query hooks:
- `useCargos()` - Listar todos
- `useCargo(id)` - Buscar com permissões
- `useCriarCargo()` - Criar
- `useAtualizarCargo()` - Atualizar
- `useExcluirCargo()` - Deletar
- `useAtribuirPermissoes()` - Atribuir permissões

### 8. `/apps/web/src/components/layout/app-sidebar.tsx`
Adicionar item na seção Admin:
```typescript
{
  title: 'Usuários',
  url: '/usuarios',
  icon: Users,
  permission: 'usuarios:visualizar',
}
```

## Fluxos Principais

### Fluxo 1: Criar Usuário
1. Admin clica "Novo Usuário"
2. Dialog abre com formulário
3. Preenche: nome, email, senha inicial, telefone (opcional), cargo, equipe (opcional), status
4. Valida Zod (senha forte, email válido)
5. POST /api/usuarios
6. Toast sucesso, fecha dialog, recarrega lista

### Fluxo 2: Gerenciar Permissões de Cargo
1. Admin clica "Gerenciar Permissões" em um cargo
2. Dialog abre com checkboxes agrupadas
3. Seleciona/desseleciona permissões
4. POST /api/cargos/:id/permissoes
5. Usuários com esse cargo ganham/perdem acesso instantaneamente

### Fluxo 3: Resetar Senha
1. Admin clica "Resetar Senha" em usuário
2. Dialog simples com campo de nova senha
3. POST /api/usuarios/:id/resetar-senha
4. Marca primeiroAcesso = true
5. Usuário deve mudar senha no próximo login

## Edge Cases Tratados

1. **Não pode excluir a si mesmo**: Validação frontend e backend
2. **Não pode editar cargo Admin**: Bloqueio na UI
3. **Não pode excluir cargo com usuários**: Backend valida, frontend mostra erro claro
4. **Email duplicado**: Erro 409, mensagem específica
5. **Quota atingida**: Validação backend, alerta frontend
6. **Senha fraca**: Validação Zod com regex (8+, maiúscula, minúscula, número)
7. **Troca cargo vendedor**: Backend ajusta quotas automaticamente

## Validações Zod Principais

### Criar Usuário
```typescript
z.object({
  nome: z.string().min(2).max(256),
  email: z.string().email().toLowerCase(),
  senha: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  telefone: z.string().max(20).optional(),
  cargoId: z.string().uuid(),
  equipeId: z.string().uuid().optional(),
})
```

### Criar Cargo
```typescript
z.object({
  nomeCargo: z.string().min(2).max(100),
  descricao: z.string().max(500).optional(),
  isGestor: z.boolean().default(false),
  isVendedor: z.boolean().default(false),
})
```

## Checklist de Implementação

### Fase 1: Preparação (Dia 1)
- [ ] Criar types: `usuario.ts`, `cargo.ts`, `permissao.ts`
- [ ] Criar query hooks: `usuarios.ts`, `cargos.ts`, `permissoes.ts`
- [ ] Testar chamadas API

### Fase 2: Diálogos Base (Dia 2)
- [ ] `usuario-dialog.tsx` (criar/editar)
- [ ] `cargo-dialog.tsx` (criar/editar)
- [ ] `excluir-usuario-dialog.tsx`
- [ ] `excluir-cargo-dialog.tsx`

### Fase 3: Diálogos Avançados (Dia 3)
- [ ] `permissoes-dialog.tsx` (mais complexo)
- [ ] `resetar-senha-dialog.tsx`
- [ ] `visualizar-usuario-dialog.tsx`

### Fase 4: Tabs (Dia 4)
- [ ] `usuarios-tab.tsx` (tabela, filtros, paginação)
- [ ] `cargos-tab.tsx` (tabela, gestão)
- [ ] `equipes-tab.tsx` (placeholder)

### Fase 5: Integração (Dia 5)
- [ ] `page.tsx` principal
- [ ] Adicionar ao sidebar
- [ ] Testar navegação e permissões

### Fase 6: Refinamento (Dia 6)
- [ ] Testar todos os fluxos
- [ ] Corrigir bugs
- [ ] Adicionar loading states
- [ ] Tratar edge cases
- [ ] Testes finais

## Permissões Necessárias

### Verificações de UI
```typescript
const canCreate = user?.permissoes?.includes('usuarios:criar') || user?.isAdmin;
const canEdit = user?.permissoes?.includes('usuarios:editar') || user?.isAdmin;
const canDelete = user?.permissoes?.includes('usuarios:excluir') || user?.isAdmin;
const canManageRoles = user?.permissoes?.includes('cargos:criar') || user?.isAdmin;
const canAssignPermissions = user?.permissoes?.includes('cargos:atribuir_permissoes') || user?.isAdmin;
```

## APIs Backend Utilizadas (Já Implementadas)

### Usuários
- GET /api/usuarios
- POST /api/usuarios
- GET /api/usuarios/:id
- PATCH /api/usuarios/:id
- DELETE /api/usuarios/:id
- POST /api/usuarios/:id/resetar-senha

### Cargos
- GET /api/cargos
- POST /api/cargos
- GET /api/cargos/:id
- PATCH /api/cargos/:id
- DELETE /api/cargos/:id
- POST /api/cargos/:id/permissoes
- GET /api/cargos/permissoes/disponiveis

## Estimativa: 6 dias de implementação

---

**Plano completo e detalhado pronto para execução. Backend já implementado, foco total em UI/UX frontend seguindo padrões do projeto.**
