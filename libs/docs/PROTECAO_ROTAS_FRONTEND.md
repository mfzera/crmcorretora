# Proteção de Rotas no Frontend

## Solução Implementada

O sistema agora possui **duas camadas de proteção** para controle de acesso:

### 1. Proteção no Backend (API) ✅
- Middleware `authorize()` valida permissões antes de executar a ação
- Retorna erro `403 Forbidden` se o usuário não tiver permissão

### 2. Proteção no Frontend ✅
- Componente `PageGuard` previne acesso à página antes de carregar
- Interceptor de API redireciona automaticamente em caso de 403
- Itens da sidebar só aparecem se o usuário tiver permissão

---

## Como Proteger Páginas

### Usando PageGuard

O componente `PageGuard` deve ser usado em todas as páginas que requerem permissões específicas.

#### Exemplo 1: Permissão Única

```tsx
'use client';

import { PageGuard } from '@/components/auth/page-guard';
import { MinhaFuncionalidade } from '@/components/minha-funcionalidade';

export default function MinhaPage() {
  return (
    <PageGuard permission="usuarios:visualizar">
      <MinhaFuncionalidade />
    </PageGuard>
  );
}
```

#### Exemplo 2: Múltiplas Permissões (Qualquer Uma)

```tsx
export default function ClientesPage() {
  return (
    <PageGuard permission={['clientes:visualizar', 'clientes:visualizar_todos']}>
      <ClientesContent />
    </PageGuard>
  );
}
```

#### Exemplo 3: Múltiplas Permissões (Todas Requeridas)

```tsx
export default function RelatoriosPage() {
  return (
    <PageGuard 
      permission={['relatorios:acessar', 'relatorios:exportar']}
      requireAll={true}
    >
      <RelatoriosContent />
    </PageGuard>
  );
}
```

#### Exemplo 4: Com Fallback Customizado

```tsx
export default function ConfiguracoesPage() {
  return (
    <PageGuard 
      permission="config:editar"
      fallback={<div>Apenas visualização - sem permissão para editar</div>}
    >
      <ConfiguracoesContent />
    </PageGuard>
  );
}
```

---

## Mapeamento de Rotas e Permissões

Aqui está a lista de páginas que **devem** ser protegidas:

### Páginas Protegidas

| Rota | Permissão | Status |
|------|-----------|--------|
| `/usuarios` | `usuarios:visualizar` | ✅ Protegida |
| `/clientes` | `clientes:visualizar` | ⚠️ Proteger |
| `/produtos` | `produtos:visualizar` | ⚠️ Proteger |
| `/cadastro` | `cadastro:validar_documentacao` | ⚠️ Proteger |
| `/metricas` | `metricas:visualizar` | ⚠️ Proteger |
| `/performance` | `performance:acessar` | ⚠️ Proteger |
| `/gestao-crm` | `gestao_comercial:acessar` | ⚠️ Proteger |
| `/negocios-corretora` | `negocios_corretora:acessar` | ⚠️ Proteger |
| `/importar-renovacoes` | `importar_renovacoes:acessar` | ⚠️ Proteger |
| `/seguradoras-parceiras` | `config:gerenciar_integracoes` | ⚠️ Proteger |

### Páginas Públicas (Não Requerem Proteção)

- `/dashboard` - Todos os usuários autenticados têm acesso
- `/workspace` - Todos os usuários autenticados têm acesso
- `/chat` - Todos os usuários autenticados têm acesso
- `/perfil` - Todos os usuários autenticados têm acesso
- `/notificacoes` - Todos os usuários autenticados têm acesso

---

## Interceptor de API

O sistema possui um interceptor automático que:

1. **Detecta erro 403** da API
2. **Redireciona automaticamente** para `/sem-permissao`
3. **Exibe mensagem clara** ao usuário

### Como Funciona

```typescript
// apps/web/src/lib/api.ts
if (response.status === 403 && typeof window !== 'undefined') {
  window.location.href = '/sem-permissao';
}
```

Isso garante que mesmo se o usuário burlar o `PageGuard` (improvável), ele será redirecionado ao tentar fazer uma requisição à API.

---

## Página "Sem Permissão"

Criada em `/sem-permissao` com:

- ✅ Ícone de alerta
- ✅ Mensagem clara
- ✅ Botões para voltar ou ir ao dashboard
- ✅ Design consistente com o sistema

---

## Checklist de Implementação

Para proteger uma nova página:

- [ ] 1. Identificar a permissão necessária
- [ ] 2. Envolver o conteúdo com `<PageGuard>`
- [ ] 3. Testar com usuário sem permissão
- [ ] 4. Verificar que API retorna 403 corretamente
- [ ] 5. Confirmar redirecionamento automático

---

## Exemplo Completo

```tsx
'use client';

import { useState } from 'react';
import { PageGuard } from '@/components/auth/page-guard';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { useProtectedAsyncAction } from '@/hooks/use-protected-action';
import { api } from '@/lib/api';

export default function ClientesPage() {
  return (
    <PageGuard permission="clientes:visualizar">
      <ClientesContent />
    </PageGuard>
  );
}

function ClientesContent() {
  const { hasPermission } = usePermissions();
  const protectedAsyncAction = useProtectedAsyncAction();
  
  const handleDelete = protectedAsyncAction(
    'clientes:excluir',
    async (id: string) => {
      await api.delete(`/clientes/${id}`);
    },
    {
      successMessage: 'Cliente excluído com sucesso!',
      errorMessage: 'Erro ao excluir cliente'
    }
  );

  return (
    <div>
      <h1>Clientes</h1>
      
      {/* Botão só aparece se tiver permissão */}
      {hasPermission('clientes:criar') && (
        <Button onClick={() => {/* criar cliente */}}>
          Novo Cliente
        </Button>
      )}
      
      {/* Lista de clientes */}
      <ClientesList onDelete={handleDelete} />
    </div>
  );
}
```

---

## Melhores Práticas

### ✅ Fazer

1. **Sempre** usar `PageGuard` em páginas com permissões
2. **Verificar permissões** no nível de componente para ações específicas
3. **Usar hooks** `useProtectedAction` para ações críticas
4. **Testar** com diferentes níveis de usuário

### ❌ Evitar

1. **Não** confiar apenas em ocultar UI - sempre validar no backend
2. **Não** duplicar verificação de permissão - usar componentes reutilizáveis
3. **Não** usar permissões hardcoded - sempre usar as definidas no seed

---

## Comandos Úteis

### Listar todas as permissões disponíveis

```sql
SELECT nome_permissao, grupo, descricao 
FROM permissao_global 
ORDER BY grupo, nome_permissao;
```

### Ver permissões de um cargo

```sql
SELECT pg.nome_permissao, pg.grupo
FROM cargo_permissao cp
JOIN permissao_global pg ON cp.permissao_global_id = pg.id
WHERE cp.cargo_id = 'UUID_DO_CARGO';
```

### Ver permissões de um usuário

```sql
SELECT DISTINCT pg.nome_permissao, pg.grupo
FROM usuario u
JOIN cargo c ON u.cargo_id = c.id
JOIN cargo_permissao cp ON cp.cargo_id = c.id
JOIN permissao_global pg ON cp.permissao_global_id = pg.id
WHERE u.id = 'UUID_DO_USUARIO';
```

---

## Suporte

Se tiver dúvidas sobre:
- **Qual permissão usar**: Consulte `libs/shared/database/src/seed.ts`
- **Como proteger uma página**: Use o exemplo acima
- **Erro 403**: Verifique se o usuário tem a permissão correta no cargo dele

---

## Arquivos Relevantes

- `apps/web/src/components/auth/page-guard.tsx` - Componente de proteção
- `apps/web/src/hooks/use-permissions.ts` - Hook de permissões
- `apps/web/src/hooks/use-protected-action.ts` - Hook para ações protegidas
- `apps/web/src/lib/api.ts` - Interceptor de API
- `apps/web/src/app/(app)/sem-permissao/page.tsx` - Página de erro
- `libs/shared/database/src/seed.ts` - Lista de permissões
