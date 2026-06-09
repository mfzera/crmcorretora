# 🔐 Setup do Painel Administrativo

## Problema Comum: "Login não funciona"

Se você está tentando fazer login no painel admin (`/admin/login`) com credenciais de usuário normal do tenant, isso **NÃO VAI FUNCIONAR**.

### Por quê?

- **Login Normal** (`/login`): Para usuários de corretoras (tenants)
- **Login Admin** (`/admin/login`): Para administradores do sistema

São sistemas de autenticação **separados** e **independentes**.

## Como Criar o Primeiro Admin

### Opção 1: Via Script (Recomendado)

```bash
# Execute o script
./scripts/create-first-admin.sh

# Preencha os dados quando solicitado:
# Nome: Admin Principal
# Email: admin@example.com
# Senha: (mínimo 8 caracteres)
```

### Opção 2: Via API (cURL)

```bash
curl -X POST http://localhost:3001/api/admin/auth/create-first-admin \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Admin Principal",
    "email": "admin@example.com",
    "senha": "senha_segura_123",
    "permissoes": [
      "view_usage",
      "manage_limits",
      "view_all_tenants",
      "manage_backups",
      "manage_admins",
      "view_audit_logs",
      "cleanup_files"
    ]
  }'
```

### Opção 3: Via Código (Desenvolvimento)

```typescript
// No backend, execute uma vez:
const response = await fetch('http://localhost:3001/api/admin/auth/create-first-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nome: 'Admin Principal',
    email: 'admin@example.com',
    senha: 'senha_segura_123',
  }),
});
```

## Permissões Disponíveis

| Permissão | Descrição |
|-----------|-----------|
| `view_usage` | Visualizar métricas de uso do sistema |
| `manage_limits` | Gerenciar limites de armazenamento e usuários |
| `view_all_tenants` | Visualizar todas as corretoras |
| `manage_backups` | Criar, verificar e restaurar backups |
| `manage_admins` | Gerenciar outros administradores |
| `view_audit_logs` | Visualizar logs de auditoria |
| `cleanup_files` | Executar limpeza de arquivos |

## Como Fazer Login

1. **Acesse:** `http://localhost:3000/admin/login`
2. **Use as credenciais de ADMIN** (não de usuário tenant)
3. **Email:** admin@example.com
4. **Senha:** (a que você definiu)

## Mapeamento de Permissões vs Páginas

| Página | Rota | Permissão Necessária |
|--------|------|---------------------|
| Dashboard | `/admin/dashboard` | Autenticado |
| Corretoras | `/admin/tenants` | `manage_tenants` |
| Backups | `/admin/backups` | `manage_backups` |
| Audit Logs | `/admin/audit-logs` | `view_audit_logs` |

## Troubleshooting

### ❌ "Email ou senha inválidos"

**Possíveis causas:**
1. Você está usando credenciais de usuário tenant (não de admin)
2. A senha está incorreta
3. O admin não existe no banco de dados

**Solução:**
- Crie o primeiro admin usando um dos métodos acima
- Verifique se está usando o email/senha corretos

### ❌ "Já existem admins no sistema"

**Causa:** Você já criou um admin anteriormente

**Solução:**
- Use as credenciais do admin existente
- Ou acesse o banco de dados para resetar/criar novo admin

### ❌ "Permissão negada" após login

**Causa:** O admin não tem a permissão necessária para acessar aquela página

**Solução:**
- Verifique as permissões do admin no banco de dados
- Adicione as permissões necessárias:
```sql
UPDATE admins 
SET permissoes = ARRAY[
  'view_usage',
  'manage_limits', 
  'view_all_tenants',
  'manage_backups',
  'manage_admins',
  'view_audit_logs',
  'cleanup_files'
]
WHERE email = 'admin@example.com';
```

## Verificar Admins Existentes

```sql
-- Ver todos os admins
SELECT id, nome, email, permissoes, ativo, ultimo_login 
FROM admins;

-- Ver apenas admins ativos
SELECT id, nome, email, permissoes 
FROM admins 
WHERE ativo = true;
```

## Resetar Senha de Admin

```sql
-- Primeiro, gere o hash da nova senha no backend
-- Depois atualize:
UPDATE admins 
SET senha = 'HASH_GERADO_AQUI'
WHERE email = 'admin@example.com';
```

## Diferenças: Admin vs Tenant User

| Característica | Admin | Tenant User |
|----------------|-------|-------------|
| **Login URL** | `/admin/login` | `/login` |
| **API Base** | `/api/admin/*` | `/api/*` |
| **Escopo** | Todo o sistema | Apenas sua corretora |
| **Permissões** | Gerenciar tenants, backups, etc | CRUD de dados da corretora |
| **Tabela DB** | `admins` | `usuarios` |
| **Token Key** | `admin_token` | `auth_token` |

## Próximos Passos

Após criar o admin:

1. ✅ Faça login em `/admin/login`
2. ✅ Acesse o dashboard para ver métricas globais
3. ✅ Configure limites para as corretoras em `/admin/tenants`
4. ✅ Configure backups em `/admin/backups`
5. ✅ Monitore ações em `/admin/audit-logs`
