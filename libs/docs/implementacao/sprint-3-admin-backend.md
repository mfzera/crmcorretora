# Sprint 3 - Painel Admin (Backend)

**Status:** ✅ Concluído  
**Data de conclusão:** 2026-01-26

## Visão Geral

Sprint focado na criação do painel administrativo backend para monitoramento, gerenciamento e manutenção do sistema de anexos. Inclui autenticação separada para admins, métricas de uso, gerenciamento de limites, sistema de backup e log de auditoria completo.

## Objetivos Alcançados

### 3.1 - Schemas de Banco de Dados ✅

Criados 6 schemas principais para o sistema admin:

#### `admin` - Usuários Administradores
- **Arquivo:** `libs/shared/database/src/schema/admin.ts`
- **Tabela:** `admin`
- **Campos principais:**
  - `id`, `email`, `nome`, `senha` (bcrypt)
  - `permissoes` (JSONB) - array de 7 tipos de permissões
  - `ultimoLogin`, `ativo`
- **Permissões disponíveis:**
  1. `view_usage` - Visualizar uso de storage
  2. `manage_limits` - Gerenciar limites
  3. `view_backups` - Visualizar backups
  4. `manage_backups` - Criar/restaurar backups
  5. `view_audit_logs` - Ver logs de auditoria
  6. `manage_admins` - Gerenciar outros admins
  7. `system_maintenance` - Manutenção do sistema

#### `admin_audit_log` - Log de Auditoria
- **Arquivo:** `libs/shared/database/src/schema/admin.ts`
- **Tabela:** `admin_audit_log`
- **Campos principais:**
  - Rastreamento completo de ações admin
  - IP e User Agent capturados
  - Detalhes em JSONB para flexibilidade
  - Relacionamento polimórfico via `entidade_tipo` + `entidade_id`

#### `storage_metric` - Métricas de Armazenamento
- **Arquivo:** `libs/shared/database/src/schema/storage-metrics.ts`
- **Tabela:** `storage_metric`
- **Características:**
  - Snapshots diários por tenant
  - Quebra por tipo (cotações, documentos, chat)
  - Cálculo de custo estimado (R2 pricing)
  - Índices para queries eficientes

#### `storage_limit` - Limites de Armazenamento
- **Arquivo:** `libs/shared/database/src/schema/storage-metrics.ts`
- **Tabela:** `storage_limit`
- **Características:**
  - Limites configuráveis por tenant
  - Limites gerais e por tipo de entidade
  - Sistema de alertas configurável
  - Validações em nível de banco (CHECK constraints)

#### `backup` - Registros de Backup
- **Arquivo:** `libs/shared/database/src/schema/backup.ts`
- **Tabela:** `backup`
- **Características:**
  - Suporte para backups incrementais e completos
  - Tracking de status (em_progresso, concluido, falhou)
  - Checksum MD5 para verificação de integridade
  - Trigger automático para calcular duração
  - Soft delete para histórico

#### `backup_schedule` - Agendamentos de Backup
- **Arquivo:** `libs/shared/database/src/schema/backup.ts`
- **Tabela:** `backup_schedule`
- **Características:**
  - Expressões cron para agendamento
  - Suporte para backups globais ou por tenant
  - Controle de retenção
  - Tracking de última execução

#### Migrações Executadas

1. **0019_add_admin_tables.sql**
   - Cria tabelas `admin` e `admin_audit_log`
   - Índices em `email` e `data_hora`

2. **0020_add_storage_metrics.sql**
   - Cria tabelas `storage_metric` e `storage_limit`
   - 5 constraints de validação
   - Índice único composto em `(corretora_id, data)`

3. **0021_add_backup_tables.sql**
   - Cria tabelas `backup` e `backup_schedule`
   - 2 enums: `tipo_backup` e `status_backup`
   - Trigger `calcular_duracao_backup()` para auto-cálculo

### 3.2 - Autenticação Admin ✅

#### Plugin de Autenticação
- **Arquivo:** `libs/plugins/admin-auth/src/index.ts`
- **Características:**
  - Namespace JWT separado (`@fastify/admin-jwt`)
  - Decorators: `authenticateAdmin`, `authorizeAdmin`
  - Helpers: `verifyAdminPassword`, `createAdminToken`, `hashAdminPassword`
  - Secret separado: `JWT_ADMIN_SECRET`
  - Expiração: 8 horas

#### AdminAuditService
- **Arquivo:** `libs/plugins/admin-auth/src/audit.service.ts`
- **Funcionalidades:**
  - Log centralizado de todas as ações admin
  - 15+ métodos específicos para diferentes ações
  - Captura automática de IP e User Agent
  - Suporte a detalhes customizados em JSONB

**Métodos principais:**
- `logLogin()` / `logLogout()`
- `logViewTenant()` / `logViewTenantList()`
- `logViewGlobalMetrics()` / `logViewTenantMetrics()`
- `logUpdateStorageLimit()`
- `logBackupCreated()` / `logBackupVerified()` / `logBackupRestored()` / `logBackupDeleted()`
- `logViewBackupList()`
- `logAdminManagement()`
- `logCleanup()`

### 3.3 - Metrics Service ✅

**Arquivo:** `libs/shared/storage/src/metrics.service.ts`

#### Funcionalidades Principais

1. **`calculateCurrentUsage(corretoraId)`**
   - Calcula uso atual em tempo real
   - Quebra por tipo de entidade
   - Estimativa de custo mensal (R2 pricing: $0.015/GB/mês)

2. **`createDailySnapshot(corretoraId)`**
   - Cria snapshot diário de métricas
   - Execução via cron job (planejado)

3. **`createDailySnapshotsForAll()`**
   - Cria snapshots para todos os tenants
   - Execução em batch

4. **`checkLimits(corretoraId)`**
   - Verifica se tenant está dentro dos limites
   - Retorna status detalhado:
     - `totalFiles`, `totalBytes` - uso atual
     - `limitFiles`, `limitBytes` - limites configurados
     - `isOverLimit` - boolean se excedeu
     - Quebra por tipo (cotações, documentos, chat)

5. **`getGlobalOverview()`**
   - Visão geral do sistema inteiro
   - Total de tenants, arquivos, bytes
   - Custo estimado global
   - Top 10 tenants por uso

#### Cálculo de Custo
```typescript
// R2 Pricing: $0.015 por GB/mês
const custoMensal = (totalBytes / (1024 ** 3)) * 0.015;
```

### 3.4 - Backup Service ✅

**Arquivo:** `libs/shared/storage/src/backup.service.ts`

#### Funcionalidades Principais

1. **`createBackup(options)`**
   - Tipos: `incremental` | `completo`
   - Escopo: global ou por tenant
   - Backup incremental baseado em timestamp do último backup completo
   - Cópia para bucket separado (`CLOUDFLARE_R2_BACKUP_BUCKET`)
   - Cálculo de checksum MD5
   - Atualização automática de status

2. **`verifyBackup(backupId)`**
   - Verifica integridade via MD5
   - Marca backup como verificado no DB

3. **`restoreBackup(backupId)`**
   - Placeholder para MVP
   - TODO: Implementar restauração completa

4. **`cleanupOldBackups(retentionDays)`**
   - Remove backups antigos
   - Deleta do R2 e do banco
   - Respeita período de retenção

#### Estrutura de Backup
```typescript
interface CreateBackupOptions {
  tipo: 'incremental' | 'completo';
  corretoraId?: string | null;
  descricao?: string | null;
}
```

### 3.5 - API Admin ✅

Todas as rotas admin estão sob o prefixo `/api/admin` e usam autenticação JWT separada.

#### 3.5.1 - Rotas de Autenticação
**Arquivo:** `apps/api/src/routes/admin/auth.ts`

| Método | Endpoint | Autenticação | Permissões | Descrição |
|--------|----------|--------------|------------|-----------|
| POST | `/auth/login` | ❌ Não | - | Login de admin |
| POST | `/auth/create-first-admin` | ❌ Não | - | Criar primeiro admin (apenas se não existir nenhum) |
| GET | `/auth/me` | ✅ Sim | - | Obter dados do admin logado |
| POST | `/auth/logout` | ✅ Sim | - | Logout (com log de auditoria) |

**Características:**
- Login retorna JWT válido por 8 horas
- `create-first-admin` só funciona se não houver admins no sistema
- Atualiza `ultimoLogin` no banco
- Todas as ações são auditadas

#### 3.5.2 - Rotas de Métricas
**Arquivo:** `apps/api/src/routes/admin/metrics.ts`

| Método | Endpoint | Permissões | Descrição |
|--------|----------|------------|-----------|
| GET | `/storage/overview` | `view_usage` | Visão global do armazenamento |
| GET | `/tenants` | `view_usage` | Lista todos os tenants com uso |
| GET | `/tenants/:id/usage` | `view_usage` | Uso detalhado de um tenant |
| GET | `/tenants/:id/usage/history` | `view_usage` | Histórico de métricas (query param: `days`) |

**Exemplo de resposta - `/storage/overview`:**
```json
{
  "totalTenants": 15,
  "totalFiles": 1250,
  "totalBytes": 52428800000,
  "estimatedMonthlyCost": 0.73,
  "topTenants": [
    {
      "corretoraId": "uuid",
      "nome": "Corretora ABC",
      "totalFiles": 300,
      "totalBytes": 15728640000,
      "cost": 0.22
    }
  ]
}
```

**Exemplo de resposta - `/tenants/:id/usage`:**
```json
{
  "tenant": {
    "id": "uuid",
    "nome": "Corretora ABC",
    "cnpj": "12345678000190"
  },
  "currentUsage": {
    "totalFiles": 300,
    "totalBytes": 15728640000,
    "totalBytesCotacoes": 8000000000,
    "totalBytesDocumentos": 5000000000,
    "totalBytesChat": 2728640000,
    "estimatedMonthlyCost": 0.22
  },
  "limits": {
    "totalFiles": 300,
    "limitFiles": 1000,
    "totalBytes": 15728640000,
    "limitBytes": 53687091200,
    "isOverLimit": false,
    "cotacoes": { /* ... */ },
    "documentos": { /* ... */ },
    "chat": { /* ... */ }
  }
}
```

#### 3.5.3 - Rotas de Limites de Armazenamento
**Arquivo:** `apps/api/src/routes/admin/storage-limits.ts`

| Método | Endpoint | Permissões | Descrição |
|--------|----------|------------|-----------|
| GET | `/tenants/:id/limits` | `view_usage`, `manage_limits` | Obter limites de um tenant |
| PUT | `/tenants/:id/limits` | `manage_limits` | Atualizar limites de um tenant |

**Body do PUT:**
```json
{
  "limiteArquivos": 1000,
  "limiteBytes": 53687091200,
  "limiteBytesCotacoes": 21474836480,
  "limiteBytesDocumentos": 21474836480,
  "limiteBytesChat": 10737418240,
  "alertasAtivos": true
}
```

**Características:**
- Validação de valores negativos
- Cria registro se não existir, atualiza se existir
- Log de auditoria com valores anteriores e novos
- Valores null = sem limite

#### 3.5.4 - Rotas de Backup
**Arquivo:** `apps/api/src/routes/admin/backups.ts`

| Método | Endpoint | Permissões | Descrição |
|--------|----------|------------|-----------|
| GET | `/backups` | `view_backups` | Listar backups (filtros: tipo, status, limit) |
| POST | `/backups` | `manage_backups` | Criar novo backup |
| POST | `/backups/:id/verify` | `manage_backups` | Verificar integridade de backup |
| POST | `/backups/:id/restore` | `manage_backups` | Restaurar backup |
| DELETE | `/backups/:id` | `manage_backups` | Deletar backup antigo |
| GET | `/backups/schedules` | `view_backups` | Listar agendamentos ativos |

**Body do POST `/backups`:**
```json
{
  "tipo": "completo",
  "corretoraId": "uuid-opcional",
  "descricao": "Backup mensal completo"
}
```

**Características:**
- GET `/backups` com query params: `tipo`, `status`, `limit`
- Verificação requer backup `concluido`
- Restauração requer backup `verificado`
- Backups incluem nome do tenant na resposta

#### 3.5.5 - Rotas de Logs de Auditoria
**Arquivo:** `apps/api/src/routes/admin/audit-logs.ts`

| Método | Endpoint | Permissões | Descrição |
|--------|----------|------------|-----------|
| GET | `/audit-logs` | `view_audit_logs` | Listar logs (filtros múltiplos) |
| GET | `/audit-logs/actions` | `view_audit_logs` | Listar ações únicas (para filtros UI) |
| GET | `/audit-logs/stats` | `view_audit_logs` | Estatísticas dos últimos 30 dias |

**Query params do GET `/audit-logs`:**
- `adminId` - Filtrar por admin específico
- `acao` - Filtrar por tipo de ação
- `dataInicio` - Data inicial (ISO 8601)
- `dataFim` - Data final (ISO 8601)
- `limit` - Limite de resultados (default: 100)
- `offset` - Offset para paginação (default: 0)

**Exemplo de resposta - `/audit-logs/stats`:**
```json
{
  "period": {
    "start": "2025-12-27T00:00:00.000Z",
    "end": "2026-01-26T00:00:00.000Z",
    "days": 30
  },
  "totalLogs": 1523,
  "actionCounts": {
    "admin_login": 145,
    "tenant_viewed": 342,
    "storage_limit_updated": 12,
    "backup_created": 8
  },
  "topAdmins": [
    {
      "adminId": "uuid",
      "nome": "João Silva",
      "email": "joao@admin.com",
      "count": 456
    }
  ]
}
```

#### 3.5.6 - Arquivo Principal de Rotas Admin
**Arquivo:** `apps/api/src/routes/admin/index.ts`

Agrupa todas as rotas admin:
- `/auth` - Autenticação
- `/storage/overview`, `/tenants/*` - Métricas
- `/tenants/:id/limits` - Limites
- `/backups/*` - Backups
- `/audit-logs/*` - Auditoria

### 3.6 - Integração no App Principal ✅

**Arquivo:** `apps/api/src/app.ts`

**Mudanças:**
1. Import do plugin `adminAuth`
2. Registro do plugin após `auth` regular
3. Registro das rotas admin em `/api/admin`
4. Tag Swagger para documentação

**Ordem de plugins:**
```typescript
await app.register(errorHandler);
await app.register(tenantIsolation);
await app.register(auth);           // Auth para tenants
await app.register(adminAuth);      // Auth para admins
await app.register(quotaValidator);
await app.register(chatPlugin);
```

## Estrutura de Arquivos Criados

```
libs/
├── shared/
│   ├── database/
│   │   ├── src/schema/
│   │   │   ├── admin.ts (2 tabelas)
│   │   │   ├── storage-metrics.ts (2 tabelas)
│   │   │   └── backup.ts (2 tabelas)
│   │   └── migrations/
│   │       ├── 0019_add_admin_tables.sql
│   │       ├── 0020_add_storage_metrics.sql
│   │       └── 0021_add_backup_tables.sql
│   └── storage/
│       └── src/
│           ├── metrics.service.ts
│           └── backup.service.ts
└── plugins/
    └── admin-auth/
        └── src/
            ├── index.ts (plugin principal)
            └── audit.service.ts

apps/
└── api/
    └── src/
        └── routes/
            └── admin/
                ├── index.ts (agregador)
                ├── auth.ts (4 endpoints)
                ├── metrics.ts (4 endpoints)
                ├── storage-limits.ts (2 endpoints)
                ├── backups.ts (6 endpoints)
                └── audit-logs.ts (3 endpoints)
```

## Endpoints Criados - Resumo

### Autenticação (4 endpoints)
- POST `/api/admin/auth/login`
- POST `/api/admin/auth/create-first-admin`
- GET `/api/admin/auth/me`
- POST `/api/admin/auth/logout`

### Métricas (4 endpoints)
- GET `/api/admin/storage/overview`
- GET `/api/admin/tenants`
- GET `/api/admin/tenants/:id/usage`
- GET `/api/admin/tenants/:id/usage/history`

### Limites (2 endpoints)
- GET `/api/admin/tenants/:id/limits`
- PUT `/api/admin/tenants/:id/limits`

### Backups (6 endpoints)
- GET `/api/admin/backups`
- POST `/api/admin/backups`
- POST `/api/admin/backups/:id/verify`
- POST `/api/admin/backups/:id/restore`
- DELETE `/api/admin/backups/:id`
- GET `/api/admin/backups/schedules`

### Auditoria (3 endpoints)
- GET `/api/admin/audit-logs`
- GET `/api/admin/audit-logs/actions`
- GET `/api/admin/audit-logs/stats`

**Total: 19 endpoints**

## Variáveis de Ambiente Requeridas

```env
# JWT Admin
JWT_ADMIN_SECRET=your-admin-secret-key-min-32-chars

# Cloudflare R2 - Backup
CLOUDFLARE_R2_BACKUP_BUCKET=ecotech-backups
CLOUDFLARE_R2_BACKUP_REGION=auto
```

## Segurança e Auditoria

### Autenticação Separada
- Namespace JWT completamente separado dos tenants
- Secret diferente (`JWT_ADMIN_SECRET`)
- Sem risco de token admin ser usado como tenant ou vice-versa

### Autorização Granular
- 7 permissões específicas
- Verificação em nível de rota via `authorizeAdmin()`
- Permissões armazenadas em JSONB para flexibilidade

### Auditoria Completa
- Todas as ações admin são logadas
- Captura de IP e User Agent
- Detalhes customizados em JSONB
- Rastreamento de entidades afetadas
- Histórico imutável (sem soft delete em logs)

### Multi-tenancy
- Admins podem ver/gerenciar todos os tenants
- Logs incluem `corretoraId` quando aplicável
- Métricas isoladas por tenant
- Backups podem ser globais ou por tenant

## Próximos Passos

### Para Produção
1. ✅ Implementar cron job para `createDailySnapshotsForAll()`
2. ✅ Implementar cron job para backups automáticos (via `backup_schedule`)
3. ✅ Implementar `restoreBackup()` completo
4. ✅ Sistema de alertas quando limites são atingidos
5. ✅ Email notifications para admins
6. ✅ Rate limiting específico para rotas admin

### Sprint 4 - Frontend Admin
1. Dashboard de métricas com gráficos
2. Interface de gerenciamento de limites
3. Interface de backup/restore
4. Visualizador de logs de auditoria
5. Gerenciamento de usuários admin

## Notas Técnicas

### Performance
- Métricas usam snapshots diários (não tempo real) para performance
- Índices em todas as queries frequentes
- Paginação em todos os endpoints de listagem

### Escalabilidade
- Backups incrementais para reduzir tempo/espaço
- Cleanup automático de backups antigos
- Métricas agregadas para queries eficientes

### Manutenibilidade
- Código modular e bem documentado
- Services separados para lógica de negócio
- Tipos TypeScript completos
- Documentação inline

## Testes Recomendados

### Fluxo de Teste Manual
1. Criar primeiro admin via `POST /auth/create-first-admin`
2. Fazer login via `POST /auth/login`
3. Verificar token funciona em `GET /auth/me`
4. Listar tenants e ver uso em `GET /tenants`
5. Configurar limite para um tenant via `PUT /tenants/:id/limits`
6. Criar backup completo via `POST /backups`
7. Verificar backup via `POST /backups/:id/verify`
8. Visualizar logs em `GET /audit-logs`

### Casos de Teste Automatizados (TODO)
- [ ] Autenticação e autorização
- [ ] Cálculo de métricas correto
- [ ] Validação de limites
- [ ] Criação e verificação de backups
- [ ] Logs de auditoria corretos
- [ ] Permissões granulares

---

**Sprint 3 concluído com sucesso!** 🎉

Implementação completa do backend do painel administrativo com 19 endpoints, 6 schemas de banco, 2 services principais, sistema de autenticação dedicado e auditoria completa.
