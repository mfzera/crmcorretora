# 15 - Migrations SQL

## 📋 Lista de Migrations

1. **0018_add_anexos.sql** - Tabela de anexos
2. **0019_add_admin_tables.sql** - Tabelas de admin e auditoria
3. **0020_add_storage_metrics.sql** - Métricas de storage e limites
4. **0021_add_backup_tables.sql** - Tabelas de backup

---

## 📄 Migration 0018: Anexos

**Arquivo**: `libs/shared/database/migrations/0018_add_anexos.sql`

```sql
-- ============================================
-- Migration 0018: Sistema de Anexos
-- Cria tabela para armazenar metadados de arquivos
-- ============================================

-- Enum para tipo de entidade
CREATE TYPE entidade_tipo_anexo AS ENUM (
  'cotacao',
  'documento_venda',
  'mensagem_chat'
);

-- Tabela de anexos
CREATE TABLE IF NOT EXISTS anexo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretora_id UUID NOT NULL REFERENCES corretora(id) ON DELETE CASCADE,
  
  -- Relacionamento polimórfico
  entidade_tipo entidade_tipo_anexo NOT NULL,
  entidade_id UUID NOT NULL,
  
  -- Metadados do arquivo
  nome_original VARCHAR(256) NOT NULL,
  nome_arquivo VARCHAR(256) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  tamanho BIGINT NOT NULL,
  
  -- Storage R2
  r2_key VARCHAR(512) NOT NULL,
  r2_bucket VARCHAR(100) NOT NULL,
  url_publica VARCHAR(1024),
  
  -- Versionamento
  versao INTEGER NOT NULL DEFAULT 1,
  arquivo_anterior_id UUID REFERENCES anexo(id) ON DELETE SET NULL,
  
  -- Extração de conteúdo (PDFs)
  texto_extraido TEXT,
  metadados_extracao JSONB,
  
  -- Auditoria
  upload_por_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  upload_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_por_id UUID REFERENCES usuario(id) ON DELETE RESTRICT,
  
  -- Constraints
  CONSTRAINT chk_tamanho_positivo CHECK (tamanho > 0),
  CONSTRAINT chk_versao_positiva CHECK (versao > 0)
);

-- Índices para performance
CREATE INDEX idx_anexo_entidade 
  ON anexo(corretora_id, entidade_tipo, entidade_id);

CREATE INDEX idx_anexo_r2key 
  ON anexo(r2_key);

CREATE INDEX idx_anexo_upload_por 
  ON anexo(upload_por_id);

CREATE INDEX idx_anexo_versao_anterior 
  ON anexo(arquivo_anterior_id);

CREATE INDEX idx_anexo_deleted 
  ON anexo(deleted_at) 
  WHERE deleted_at IS NULL;

-- Comentários
COMMENT ON TABLE anexo IS 'Metadados de arquivos armazenados no Cloudflare R2';
COMMENT ON COLUMN anexo.entidade_tipo IS 'Tipo de entidade (cotação, documento ou chat)';
COMMENT ON COLUMN anexo.entidade_id IS 'ID da entidade vinculada';
COMMENT ON COLUMN anexo.r2_key IS 'Chave completa no bucket R2';
COMMENT ON COLUMN anexo.versao IS 'Número da versão do arquivo (1, 2, 3...)';
COMMENT ON COLUMN anexo.arquivo_anterior_id IS 'Link para versão anterior (versionamento)';
COMMENT ON COLUMN anexo.texto_extraido IS 'Texto extraído de PDFs para busca';
```

---

## 👤 Migration 0019: Admin

**Arquivo**: `libs/shared/database/migrations/0019_add_admin_tables.sql`

```sql
-- ============================================
-- Migration 0019: Sistema Administrativo
-- Cria tabelas para super-admins e auditoria
-- ============================================

-- Tabela de admins (super-users)
CREATE TABLE IF NOT EXISTS admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  
  -- Permissões granulares (JSON array)
  permissoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Status
  ativo BOOLEAN DEFAULT TRUE,
  ultimo_login TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Índice para busca por email
CREATE INDEX idx_admin_email ON admin(email);

-- Tabela de auditoria de ações admin
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  
  -- Ação realizada
  acao VARCHAR(100) NOT NULL,
  
  -- Entidade afetada
  entidade_tipo VARCHAR(50),
  entidade_id UUID,
  
  -- Detalhes da ação (JSON)
  detalhes JSONB,
  
  -- Metadata de segurança
  ip VARCHAR(45),
  user_agent TEXT,
  
  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para auditoria
CREATE INDEX idx_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_timestamp ON admin_audit_log(timestamp DESC);
CREATE INDEX idx_audit_acao ON admin_audit_log(acao);
CREATE INDEX idx_audit_entidade ON admin_audit_log(entidade_tipo, entidade_id);

-- Comentários
COMMENT ON TABLE admin IS 'Usuários administrativos com acesso ao painel admin';
COMMENT ON COLUMN admin.permissoes IS 'Array de permissões: ["view_usage", "manage_backups", ...]';
COMMENT ON TABLE admin_audit_log IS 'Log de todas as ações administrativas para auditoria';
COMMENT ON COLUMN admin_audit_log.detalhes IS 'JSON com detalhes da ação (valores alterados, etc)';
```

---

## 📊 Migration 0020: Storage Metrics

**Arquivo**: `libs/shared/database/migrations/0020_add_storage_metrics.sql`

```sql
-- ============================================
-- Migration 0020: Métricas de Storage
-- Cria tabelas para monitoramento de uso
-- ============================================

-- Tabela de métricas diárias
CREATE TABLE IF NOT EXISTS storage_metric (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretora_id UUID NOT NULL REFERENCES corretora(id) ON DELETE CASCADE,
  
  -- Snapshot diário
  data DATE NOT NULL,
  
  -- Métricas gerais
  total_arquivos INTEGER NOT NULL DEFAULT 0,
  total_bytes BIGINT NOT NULL DEFAULT 0,
  
  -- Breakdown por tipo
  total_bytes_cotacoes BIGINT NOT NULL DEFAULT 0,
  total_bytes_documentos BIGINT NOT NULL DEFAULT 0,
  total_bytes_chat BIGINT NOT NULL DEFAULT 0,
  
  -- Delta (crescimento desde último snapshot)
  arquivos_adicionados INTEGER NOT NULL DEFAULT 0,
  arquivos_removidos INTEGER NOT NULL DEFAULT 0,
  bytes_adicionados BIGINT NOT NULL DEFAULT 0,
  bytes_removidos BIGINT NOT NULL DEFAULT 0,
  
  -- Custo estimado (R2 pricing)
  custo_estimado_mensal DECIMAL(10, 2),
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: 1 snapshot por dia por corretora
  CONSTRAINT unq_storage_metric_data UNIQUE (corretora_id, data)
);

-- Índices
CREATE INDEX idx_storage_metric_corretora ON storage_metric(corretora_id);
CREATE INDEX idx_storage_metric_data ON storage_metric(data DESC);

-- Tabela de limites de storage
CREATE TABLE IF NOT EXISTS storage_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretora_id UUID NOT NULL UNIQUE REFERENCES corretora(id) ON DELETE CASCADE,
  
  -- Limites configuráveis
  limite_bytes BIGINT NOT NULL DEFAULT 5368709120, -- 5GB
  limite_arquivos INTEGER NOT NULL DEFAULT 10000,
  
  -- Thresholds de alerta (percentual)
  alertar_em DECIMAL(5, 2) NOT NULL DEFAULT 80.00,
  bloquear_upload_em DECIMAL(5, 2) NOT NULL DEFAULT 95.00,
  
  -- Contatos para alertas
  emails_alerta JSONB DEFAULT '[]'::jsonb,
  
  -- Auditoria
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_por_id UUID REFERENCES admin(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT chk_limite_bytes_positivo CHECK (limite_bytes > 0),
  CONSTRAINT chk_limite_arquivos_positivo CHECK (limite_arquivos > 0),
  CONSTRAINT chk_alertar_valido CHECK (alertar_em BETWEEN 0 AND 100),
  CONSTRAINT chk_bloquear_valido CHECK (bloquear_upload_em BETWEEN 0 AND 100),
  CONSTRAINT chk_thresholds CHECK (alertar_em < bloquear_upload_em)
);

-- Índice
CREATE INDEX idx_storage_limit_corretora ON storage_limit(corretora_id);

-- Comentários
COMMENT ON TABLE storage_metric IS 'Snapshots diários de uso de storage por corretora';
COMMENT ON COLUMN storage_metric.data IS 'Data do snapshot (sem hora)';
COMMENT ON COLUMN storage_metric.custo_estimado_mensal IS 'Custo estimado em USD baseado no pricing do R2';

COMMENT ON TABLE storage_limit IS 'Limites configuráveis de storage por corretora';
COMMENT ON COLUMN storage_limit.alertar_em IS 'Percentual para enviar alerta (ex: 80%)';
COMMENT ON COLUMN storage_limit.bloquear_upload_em IS 'Percentual para bloquear novos uploads (ex: 95%)';
COMMENT ON COLUMN storage_limit.emails_alerta IS 'Array de emails para receber alertas';
```

---

## 💾 Migration 0021: Backups

**Arquivo**: `libs/shared/database/migrations/0021_add_backup_tables.sql`

```sql
-- ============================================
-- Migration 0021: Sistema de Backup
-- Cria tabelas para gerenciamento de backups
-- ============================================

-- Enums
CREATE TYPE tipo_backup AS ENUM ('incremental', 'completo');
CREATE TYPE status_backup AS ENUM ('em_progresso', 'concluido', 'falhou');

-- Tabela de backups
CREATE TABLE IF NOT EXISTS backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo e escopo
  tipo tipo_backup NOT NULL,
  corretora_id UUID REFERENCES corretora(id) ON DELETE SET NULL,
  -- NULL = backup global de todas as corretoras
  
  -- Status
  status status_backup NOT NULL DEFAULT 'em_progresso',
  
  -- Metadados
  total_arquivos INTEGER DEFAULT 0,
  total_bytes BIGINT DEFAULT 0,
  arquivos_novos INTEGER DEFAULT 0,
  arquivos_modificados INTEGER DEFAULT 0,
  
  -- Storage do backup
  backup_bucket VARCHAR(100) NOT NULL DEFAULT 'ecotech-backups',
  backup_prefix VARCHAR(512) NOT NULL,
  
  -- Verificação de integridade
  checksum_md5 VARCHAR(32),
  verificado BOOLEAN DEFAULT FALSE,
  verificado_em TIMESTAMP WITH TIME ZONE,
  
  -- Execução
  iniciado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  finalizado_em TIMESTAMP WITH TIME ZONE,
  duracao_segundos INTEGER,
  
  -- Iniciado por
  iniciado_por_id UUID REFERENCES admin(id) ON DELETE SET NULL,
  
  -- Logs e erros
  logs JSONB DEFAULT '[]'::jsonb,
  erro TEXT,
  
  -- Constraints
  CONSTRAINT chk_backup_concluido CHECK (
    (status != 'concluido') OR 
    (finalizado_em IS NOT NULL AND duracao_segundos IS NOT NULL)
  )
);

-- Índices
CREATE INDEX idx_backup_corretora ON backup(corretora_id, tipo, status);
CREATE INDEX idx_backup_iniciado ON backup(iniciado_em DESC);
CREATE INDEX idx_backup_status ON backup(status);
CREATE INDEX idx_backup_tipo ON backup(tipo);

-- Tabela de agendamentos de backup
CREATE TABLE IF NOT EXISTS backup_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Escopo
  corretora_id UUID REFERENCES corretora(id) ON DELETE CASCADE,
  -- NULL = todas as corretoras
  
  -- Tipo e configuração
  tipo tipo_backup NOT NULL,
  cron_expression VARCHAR(100) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  
  -- Tracking de execuções
  proxima_execucao TIMESTAMP WITH TIME ZONE,
  ultima_execucao TIMESTAMP WITH TIME ZONE,
  ultimo_backup_id UUID REFERENCES backup(id) ON DELETE SET NULL,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_por_id UUID REFERENCES admin(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_backup_schedule_corretora ON backup_schedule(corretora_id);
CREATE INDEX idx_backup_schedule_proxima ON backup_schedule(proxima_execucao);
CREATE INDEX idx_backup_schedule_ativo ON backup_schedule(ativo);

-- Função para calcular duração do backup
CREATE OR REPLACE FUNCTION calcular_duracao_backup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.finalizado_em IS NOT NULL AND NEW.iniciado_em IS NOT NULL THEN
    NEW.duracao_segundos := EXTRACT(EPOCH FROM (NEW.finalizado_em - NEW.iniciado_em))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular duração automaticamente
CREATE TRIGGER trg_backup_duracao
  BEFORE UPDATE OF finalizado_em ON backup
  FOR EACH ROW
  EXECUTE FUNCTION calcular_duracao_backup();

-- Comentários
COMMENT ON TABLE backup IS 'Registro de backups realizados (incrementais e completos)';
COMMENT ON COLUMN backup.corretora_id IS 'NULL = backup global de todas as corretoras';
COMMENT ON COLUMN backup.backup_prefix IS 'Prefixo no bucket de backup (ex: full/corretora/timestamp)';
COMMENT ON COLUMN backup.logs IS 'Array de logs da execução do backup';

COMMENT ON TABLE backup_schedule IS 'Agendamentos automáticos de backup';
COMMENT ON COLUMN backup_schedule.cron_expression IS 'Expressão cron (ex: "0 2 * * *" = 02:00 todo dia)';
```

---

## 🔄 Rollback Scripts

### Rollback 0021

```sql
-- Rollback migration 0021
DROP TRIGGER IF EXISTS trg_backup_duracao ON backup;
DROP FUNCTION IF EXISTS calcular_duracao_backup();
DROP TABLE IF EXISTS backup_schedule CASCADE;
DROP TABLE IF EXISTS backup CASCADE;
DROP TYPE IF EXISTS status_backup;
DROP TYPE IF EXISTS tipo_backup;
```

### Rollback 0020

```sql
-- Rollback migration 0020
DROP TABLE IF EXISTS storage_limit CASCADE;
DROP TABLE IF EXISTS storage_metric CASCADE;
```

### Rollback 0019

```sql
-- Rollback migration 0019
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS admin CASCADE;
```

### Rollback 0018

```sql
-- Rollback migration 0018
DROP TABLE IF EXISTS anexo CASCADE;
DROP TYPE IF EXISTS entidade_tipo_anexo;
```

---

## 🏃 Como Rodar as Migrations

### Via Drizzle Kit

```bash
# Gerar migration
pnpm db:generate

# Aplicar todas as migrations pendentes
pnpm db:migrate

# Ver status
pnpm db:studio
```

### Manualmente via psql

```bash
# Conectar ao database
psql -h localhost -U ecotech_user -d ecotech

# Rodar migration
\i libs/shared/database/migrations/0018_add_anexos.sql
\i libs/shared/database/migrations/0019_add_admin_tables.sql
\i libs/shared/database/migrations/0020_add_storage_metrics.sql
\i libs/shared/database/migrations/0021_add_backup_tables.sql

# Verificar tabelas criadas
\dt

# Ver estrutura de uma tabela
\d anexo
\d admin
\d storage_metric
\d backup
```

---

## ✅ Verificação Pós-Migration

### Script: `scripts/verify-migrations.sql`

```sql
-- Verificar se todas as tabelas foram criadas
SELECT 
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'anexo',
    'admin',
    'admin_audit_log',
    'storage_metric',
    'storage_limit',
    'backup',
    'backup_schedule'
  )
ORDER BY tablename;

-- Verificar enums
SELECT 
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN (
  'entidade_tipo_anexo',
  'tipo_backup',
  'status_backup'
)
ORDER BY t.typname, e.enumsortorder;

-- Verificar índices
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'anexo',
    'admin',
    'admin_audit_log',
    'storage_metric',
    'storage_limit',
    'backup',
    'backup_schedule'
  )
ORDER BY tablename, indexname;

-- Verificar constraints
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'anexo',
    'admin',
    'storage_metric',
    'storage_limit',
    'backup'
  )
ORDER BY tc.table_name, tc.constraint_type;
```

---

## 🚨 Troubleshooting

### Erro: "relation already exists"

```sql
-- Verificar se tabela já existe
SELECT * FROM pg_tables WHERE tablename = 'anexo';

-- Se existir, pode dropar (cuidado!)
DROP TABLE IF EXISTS anexo CASCADE;

-- Rodar migration novamente
\i libs/shared/database/migrations/0018_add_anexos.sql
```

### Erro: "type already exists"

```sql
-- Verificar enums existentes
\dT+

-- Dropar enum se necessário
DROP TYPE IF EXISTS entidade_tipo_anexo CASCADE;
```

### Erro: "permission denied"

```sql
-- Conceder permissões ao usuário
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ecotech_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ecotech_user;
```

---

## 📝 Próximo Documento

Consulte o **[00-INDICE.md](./00-INDICE.md)** para navegar por todos os documentos do plano.
