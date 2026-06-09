# 🚀 Quick Start - Painel Admin

## ⚠️ IMPORTANTE: Primeiro Acesso

**Você NÃO pode usar credenciais de usuário tenant no painel admin!**

O painel admin usa autenticação separada. Você precisa criar um admin primeiro:

```bash
# Execute este comando ANTES de tentar fazer login
./scripts/create-first-admin.sh
```

Ou veja instruções completas em: [`docs/ADMIN_SETUP.md`](./ADMIN_SETUP.md)

---

## Acesso Rápido

```
http://localhost:3000/admin/login
```

**Credenciais:** Use as do admin que você criou (NÃO use credenciais de tenant)

## Rotas Disponíveis

| Rota | Descrição | Permissão |
|------|-----------|-----------|
| `/admin/login` | Login admin | - |
| `/admin/dashboard` | Dashboard principal | Autenticado |
| `/admin/tenants` | Gerenciar corretoras | `manage_tenants` |
| `/admin/backups` | Gerenciar backups | `manage_backups` |
| `/admin/audit-logs` | Logs de auditoria | `view_audit_logs` |

## Funcionalidades Principais

### Dashboard
- ✅ Métricas globais (corretoras, usuários, storage, backups)
- ✅ Gráfico de uso dos últimos 30 dias
- ✅ Cards com informações em tempo real

### Gerenciamento de Corretoras
- ✅ Listar todas as corretoras
- ✅ Ver uso de armazenamento e usuários
- ✅ Editar limites de storage e usuários
- ✅ Ver status (ativo/inativo)

### Gerenciamento de Backups
- ✅ Listar todos os backups
- ✅ Criar novo backup (manual, completo, incremental)
- ✅ Verificar integridade de backup
- ✅ Restaurar backup para qualquer corretora

### Logs de Auditoria
- ✅ Visualizar todas as ações do sistema
- ✅ Filtrar por corretora, usuário, ação ou período
- ✅ Ver detalhes completos em JSON
- ✅ Exportar logs (futuro)

## Componentes Criados

```
✅ AdminAuthService - Gerenciamento de autenticação
✅ AdminApiClient - Cliente API completo
✅ AdminGuard - Proteção de rotas
✅ AdminLayout - Layout com sidebar
✅ StatsCards - Cards de métricas
✅ UsageChart - Gráfico recharts
✅ Login Page - Interface de login
✅ Dashboard Page - Dashboard principal
✅ Tenants Page - Gerenciamento de corretoras
✅ Backups Page - Gerenciamento de backups
✅ Audit Logs Page - Visualização de logs
```

## Estrutura de Pastas

```
apps/web/src/
├── app/(admin)/admin/          # Rotas Next.js
├── components/admin/           # Componentes
└── lib/
    ├── admin-auth.ts          # Autenticação
    └── admin-api.ts           # API Client
```

## Diferença: Admin vs Tenant

| | Admin | Tenant User |
|---|-------|-------------|
| **URL** | `/admin/login` | `/login` |
| **Escopo** | Todo o sistema | Apenas sua corretora |
| **Tabela** | `admins` | `usuarios` |

## Setup Inicial

1. **Criar primeiro admin:**
   ```bash
   ./scripts/create-first-admin.sh
   ```

2. **Fazer login:**
   - Acesse: `http://localhost:3000/admin/login`
   - Use as credenciais que você criou

3. **Explorar o painel:**
   - Dashboard: métricas globais
   - Tenants: gerenciar corretoras
   - Backups: criar e restaurar
   - Audit Logs: monitorar ações

## Troubleshooting

### ❌ "Email ou senha inválidos"
- Você criou um admin? Execute `./scripts/create-first-admin.sh`
- Está usando credenciais de admin (não de tenant)?

### ❌ "Permissão negada"
- Verifique se o admin tem a permissão necessária
- O primeiro admin criado tem TODAS as permissões

📚 **Guia completo de troubleshooting:** [`docs/ADMIN_SETUP.md`](./ADMIN_SETUP.md)

## Próximo Passo

Para funcionalidade completa, implemente o backend:

📄 `docs/plano/10-BACKEND-ADMIN.md`

Endpoints necessários:
- `POST /api/admin/auth/login` ✅ (já implementado)
- `POST /api/admin/auth/logout` ✅ (já implementado)
- `POST /api/admin/auth/create-first-admin` ✅ (já implementado)
- `GET /api/admin/stats` ⏳
- `GET /api/admin/stats/usage` ⏳
- `GET /api/admin/tenants` ⏳
- `PATCH /api/admin/tenants/:id/limits` ⏳
- `GET /api/admin/backups` ⏳
- `POST /api/admin/backups` ⏳
- `POST /api/admin/backups/:id/verify` ⏳
- `POST /api/admin/backups/:id/restore` ⏳
- `GET /api/admin/audit-logs` ⏳

## Documentação Completa

📚 Ver `docs/FRONTEND_ADMIN_IMPLEMENTADO.md` para detalhes completos.
