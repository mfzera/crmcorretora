# Sprint 3.1: Schemas Admin - Database ✅

## 📅 Data de Implementação
26 de Janeiro de 2026

## 🎯 Objetivo
Criar toda a infraestrutura de banco de dados para o painel administrativo: admins, auditoria, métricas de storage e backups.

## ✅ Schemas Criados

### 1. Admin (`admin`)

**Arquivo**: `libs/shared/database/src/schema/admin.ts`

**Tabela**: `admin`
- ✅ Usuários administrativos (super-users)
- ✅ Autenticação separada dos tenants
- ✅ Permissões granulares via JSON
- ✅ Tracking de último login
- ✅ Status ativo/inativo

**Campos:**
```typescript
{
  id: uuid,
  email: string (unique),
  senha: string (bcrypt),
  nome: string,
  permissoes: jsonb, // ['view_usage', 'manage_backups', ...]
  ativo: boolean,
  ultimoLogin: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Permissões Disponíveis:**
- `view_usage` - Ver métricas de uso
- `manage_limits` - Alterar limites de tenants
- `view_all_tenants` - Ver todos os tenants
- `manage_backups` - Criar/restaurar backups
- `manage_admins` - Gerenciar outros admins
- `view_audit_logs` - Ver logs de auditoria
- `cleanup_files` - Limpar arquivos órfãos

### 2. Admin Audit Log (`admin_audit_log`)

**Arquivo**: `libs/shared/database/src/schema/admin.ts`

**Tabela**: `admin_audit_log`
- ✅ Log completo de todas as ações admin
- ✅ Rastreabilidade total
- ✅ Metadata de segurança (IP, User Agent)
- ✅ Detalhes em JSON

**Campos:**
```typescript
{
  id: uuid,
  adminId: uuid (FK admin),
  acao: string, // 'backup_created', 'storage_limit_updated', etc
  entidadeTipo: string, // 'corretora', 'anexo', 'backup'
  entidadeId: uuid,
  detalhes: jsonb, // { limiteAnterior: 5GB, limiteNovo: 10GB }
  ip: string,
  userAgent: string,
  timestamp: timestamp
}
```

**Índices:**
- `idx_audit_admin` - Por admin
- `idx_audit_timestamp` - Por data (DESC)
- `idx_audit_acao` - Por tipo de ação
- `idx_audit_entidade` - Por entidade afetada

### 3. Storage Metrics (`storage_metric`)

**Arquivo**: `libs/shared/database/src/schema/storage-metrics.ts`

**Tabela**: `storage_metric`
- ✅ Snapshots diários de uso de storage
- ✅ Breakdown por tipo (cotações, documentos, chat)
- ✅ Delta de crescimento
- ✅ Estimativa de custos R2

**Campos:**
```typescript
{
  id: uuid,
  corretoraId: uuid (FK corretora),
  data: date, // Snapshot diário (unique por corretora)
  
  // Totais
  totalArquivos: integer,
  totalBytes: bigint,
  
  // Breakdown
  totalBytesCotacoes: bigint,
  totalBytesDocumentos: bigint,
  totalBytesChat: bigint,
  
  // Delta
  arquivosAdicionados: integer,
  arquivosRemovidos: integer,
  bytesAdicionados: bigint,
  bytesRemovidos: bigint,
  
  // Custo
  custoEstimadoMensal: decimal(10,2),
  
  createdAt: timestamp
}
```

**Constraint único:** 1 snapshot por dia por corretora

### 4. Storage Limits (`storage_limit`)

**Arquivo**: `libs/shared/database/src/schema/storage-metrics.ts`

**Tabela**: `storage_limit`
- ✅ Limites configuráveis por tenant
- ✅ Thresholds de alerta e bloqueio
- ✅ Lista de emails para notificações
- ✅ Auditoria de alterações

**Campos:**
```typescript
{
  id: uuid,
  corretoraId: uuid (FK corretora, unique),
  
  // Limites
  limiteBytes: bigint, // Default: 5GB
  limiteArquivos: integer, // Default: 10.000
  
  // Thresholds
  alertarEm: decimal(5,2), // Default: 80%
  bloquearUploadEm: decimal(5,2), // Default: 95%
  
  // Alertas
  emailsAlerta: jsonb, // ['admin@corretora.com', ...]
  
  // Auditoria
  updatedAt: timestamp,
  updatedPorId: uuid (FK admin)
}
```

**Constraints:**
- Limites positivos
- Thresholds entre 0-100%
- Threshold de alerta < bloqueio

### 5. Backups (`backup`)

**Arquivo**: `libs/shared/database/src/schema/backup.ts`

**Tabela**: `backup`
- ✅ Registro de backups realizados
- ✅ Suporte incremental e completo
- ✅ Tracking de progresso e duração
- ✅ Verificação de integridade

**Enums:**
```sql
tipo_backup: 'incremental' | 'completo'
status_backup: 'em_progresso' | 'concluido' | 'falhou'
```

**Campos:**
```typescript
{
  id: uuid,
  tipo: tipo_backup,
  corretoraId: uuid (FK corretora, nullable), // NULL = global
  status: status_backup,
  
  // Metadados
  totalArquivos: integer,
  totalBytes: bigint,
  arquivosNovos: integer,
  arquivosModificados: integer,
  
  // Storage
  backupBucket: string, // 'ecotech-backups'
  backupPrefix: string, // 'full/corretora/timestamp'
  
  // Verificação
  checksumMD5: string,
  verificado: boolean,
  verificadoEm: timestamp,
  
  // Execução
  iniciadoEm: timestamp,
  finalizadoEm: timestamp,
  duracaoSegundos: integer, // Calculado automaticamente
  iniciadoPorId: uuid (FK admin),
  
  // Logs
  logs: jsonb, // Array de mensagens
  erro: text
}
```

**Trigger automático:**
- `trg_backup_duracao` - Calcula duração ao finalizar

### 6. Backup Schedules (`backup_schedule`)

**Arquivo**: `libs/shared/database/src/schema/backup.ts`

**Tabela**: `backup_schedule`
- ✅ Agendamentos de backup
- ✅ Cron expressions
- ✅ Tracking de execuções
- ✅ Ativo/inativo

**Campos:**
```typescript
{
  id: uuid,
  corretoraId: uuid (FK corretora, nullable), // NULL = todas
  tipo: tipo_backup,
  cronExpression: string, // '0 2 * * *' = 02:00 diário
  ativo: boolean,
  
  // Tracking
  proximaExecucao: timestamp,
  ultimaExecucao: timestamp,
  ultimoBackupId: uuid (FK backup),
  
  // Auditoria
  createdAt: timestamp,
  createdPorId: uuid (FK admin)
}
```

**Exemplos de Cron:**
- `0 2 * * *` - 02:00 diário (incremental)
- `0 3 * * 0` - 03:00 domingo (completo)
- `0 */6 * * *` - A cada 6 horas

---

## 📊 Migrations Criadas

### Migration 0019: Admin Tables
**Arquivo**: `migrations/0019_add_admin_tables.sql`

```sql
✅ Criada tabela admin
✅ Criada tabela admin_audit_log
✅ 5 índices criados
✅ Constraint de email
```

### Migration 0020: Storage Metrics
**Arquivo**: `migrations/0020_add_storage_metrics.sql`

```sql
✅ Criada tabela storage_metric
✅ Criada tabela storage_limit
✅ 3 índices criados
✅ Constraint único por data/corretora
✅ 5 constraints de validação
```

### Migration 0021: Backup Tables
**Arquivo**: `migrations/0021_add_backup_tables.sql`

```sql
✅ Criados 2 enums (tipo_backup, status_backup)
✅ Criada tabela backup
✅ Criada tabela backup_schedule
✅ Criada função calcular_duracao_backup()
✅ Criado trigger trg_backup_duracao
✅ 7 índices criados
```

---

## 🗄️ Estrutura Completa do Banco

```
Database: saas_seguradoras
│
├── Tenant Layer (existente)
│   ├── corretora
│   ├── usuario
│   ├── cliente
│   ├── cotacao
│   ├── documento_venda
│   └── ...
│
├── Storage Layer (Sprints 1-2)
│   └── anexo
│
└── Admin Layer (Sprint 3) ✅ NOVO
    ├── admin
    ├── admin_audit_log
    ├── storage_metric
    ├── storage_limit
    ├── backup
    └── backup_schedule
```

---

## 📈 Relacionamentos

```
admin (1) ──── (N) admin_audit_log
admin (1) ──── (N) storage_limit.updatedPorId
admin (1) ──── (N) backup.iniciadoPorId
admin (1) ──── (N) backup_schedule.createdPorId

corretora (1) ──── (N) storage_metric
corretora (1) ──── (1) storage_limit
corretora (1) ──── (N) backup
corretora (1) ──── (N) backup_schedule

backup (1) ──── (N) backup_schedule.ultimoBackupId
```

---

## ✅ Validações e Constraints

### Tabela admin
- ✅ Email único
- ✅ Formato de email válido (regex)
- ✅ Permissões em JSON

### Tabela storage_metric
- ✅ Único por corretora+data
- ✅ Índice para queries por data

### Tabela storage_limit
- ✅ Único por corretora
- ✅ Limites positivos
- ✅ Thresholds válidos (0-100%)
- ✅ Threshold alerta < bloqueio

### Tabela backup
- ✅ Constraint de backup concluído
- ✅ Duração calculada automaticamente
- ✅ Logs em JSON array

---

## 🧪 Como Verificar

### Via PostgreSQL

```bash
# Conectar ao banco
docker exec -it ecotech-postgres psql -U postgres -d saas_seguradoras

# Listar tabelas admin
\dt *admin*
\dt *storage*
\dt *backup*

# Ver estrutura
\d admin
\d storage_metric
\d backup

# Ver enums
\dT

# Ver functions
\df calcular_duracao_backup
```

### Via Drizzle Studio

```bash
pnpm db:studio
# Abrir http://localhost:4983
# Navegar pelas tabelas criadas
```

---

## 📊 Estatísticas

| Métrica | Quantidade |
|---------|------------|
| Schemas criados | 6 |
| Migrations SQL | 3 |
| Tabelas criadas | 6 |
| Enums criados | 2 |
| Índices criados | 15 |
| Triggers criados | 1 |
| Functions criadas | 1 |
| Constraints | 10+ |

---

## 🚀 Próximos Passos (Sprint 3 continuação)

### 3.2 - Autenticação Admin
- [ ] Criar plugin de autenticação admin
- [ ] Implementar login separado
- [ ] JWT com secret diferente
- [ ] Middleware de autorização admin

### 3.3 - Metrics Service
- [ ] Criar serviço de cálculo de métricas
- [ ] Job diário para snapshots
- [ ] Verificação de limites
- [ ] Alertas por email

### 3.4 - Backup Service
- [ ] Criar serviço de backup
- [ ] Backup incremental
- [ ] Backup completo
- [ ] Restore de backup
- [ ] Verificação de integridade

### 3.5 - API Admin
- [ ] Rotas de autenticação admin
- [ ] Rotas de métricas
- [ ] Rotas de gestão de limites
- [ ] Rotas de backups
- [ ] Rotas de auditoria

---

## ⚠️ Observações Importantes

1. **Admins são independentes:** Não pertencem a nenhuma corretora
2. **Auditoria completa:** Todas as ações admin são logadas
3. **Metrics diários:** 1 snapshot por dia, não em tempo real
4. **Backups podem ser globais:** `corretoraId = NULL`
5. **Duração calculada:** Trigger automático no backup
6. **Limites padrão:** 5GB, 10k arquivos, 80% alerta, 95% bloqueio

---

## 🎉 Status

**Sprint 3.1: ✅ COMPLETO**

Toda a infraestrutura de banco de dados do painel admin está pronta:
- ✅ 6 tabelas criadas
- ✅ 3 migrations executadas
- ✅ 15 índices para performance
- ✅ Constraints de validação
- ✅ Trigger automático
- ✅ Relacionamentos definidos

**Pronto para implementar os serviços e APIs!** 🚀
