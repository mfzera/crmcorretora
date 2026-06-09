-- Tabela para gerenciar transferências de renovações com confirmação
CREATE TABLE IF NOT EXISTS "transferencia_renovacoes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "corretora_id" UUID NOT NULL REFERENCES "corretora"("id") ON DELETE CASCADE,
  "solicitante_id" UUID NOT NULL REFERENCES "usuario"("id") ON DELETE CASCADE,
  "destinatario_id" UUID NOT NULL REFERENCES "usuario"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'PENDENTE' CHECK ("status" IN ('PENDENTE', 'ACEITA', 'RECUSADA', 'CANCELADA')),
  "motivo_recusa" TEXT,
  "observacoes" TEXT,
  "criado_em" TIMESTAMP NOT NULL DEFAULT NOW(),
  "respondido_em" TIMESTAMP,
  "respondido_por_id" UUID REFERENCES "usuario"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de relacionamento N:N entre transferências e renovações
CREATE TABLE IF NOT EXISTS "transferencia_renovacao_itens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "transferencia_id" UUID NOT NULL REFERENCES "transferencia_renovacoes"("id") ON DELETE CASCADE,
  "renovacao_id" UUID NOT NULL REFERENCES "renovacao_comercial"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("transferencia_id", "renovacao_id")
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS "idx_transferencia_renovacoes_corretora" ON "transferencia_renovacoes"("corretora_id");
CREATE INDEX IF NOT EXISTS "idx_transferencia_renovacoes_solicitante" ON "transferencia_renovacoes"("solicitante_id");
CREATE INDEX IF NOT EXISTS "idx_transferencia_renovacoes_destinatario" ON "transferencia_renovacoes"("destinatario_id");
CREATE INDEX IF NOT EXISTS "idx_transferencia_renovacoes_status" ON "transferencia_renovacoes"("status");
CREATE INDEX IF NOT EXISTS "idx_transferencia_renovacao_itens_transferencia" ON "transferencia_renovacao_itens"("transferencia_id");
CREATE INDEX IF NOT EXISTS "idx_transferencia_renovacao_itens_renovacao" ON "transferencia_renovacao_itens"("renovacao_id");
