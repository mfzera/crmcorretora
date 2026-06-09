-- Migration: Add usuario_corretora relation table for many-to-many relationship
-- Created: 2026-02-12
-- Description: Allows users to belong to multiple corretoras

-- Create usuario_corretora junction table
CREATE TABLE IF NOT EXISTS "usuario_corretora" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuario"("id") ON DELETE CASCADE,
  "corretora_id" uuid NOT NULL REFERENCES "corretora"("id") ON DELETE CASCADE,
  "cargo_id" uuid REFERENCES "cargo"("id") ON DELETE SET NULL,
  "permissoes" jsonb DEFAULT '[]'::jsonb,
  "ativo" boolean DEFAULT true NOT NULL,
  "data_vinculo" timestamp with time zone DEFAULT now() NOT NULL,
  "vinculado_por_id" uuid REFERENCES "usuario"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "unq_usuario_corretora" UNIQUE("usuario_id", "corretora_id")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_usuario_corretora_usuario" ON "usuario_corretora"("usuario_id");
CREATE INDEX IF NOT EXISTS "idx_usuario_corretora_corretora" ON "usuario_corretora"("corretora_id");
CREATE INDEX IF NOT EXISTS "idx_usuario_corretora_ativo" ON "usuario_corretora"("ativo");

-- Migrate existing usuarios to usuario_corretora
INSERT INTO "usuario_corretora" (
  "usuario_id",
  "corretora_id",
  "cargo_id",
  "permissoes",
  "ativo",
  "data_vinculo",
  "created_at"
)
SELECT
  u."id" as "usuario_id",
  u."corretora_id",
  u."cargo_id",
  '[]'::jsonb as "permissoes",
  u."ativo",
  u."created_at" as "data_vinculo",
  u."created_at"
FROM "usuario" u
WHERE u."corretora_id" IS NOT NULL
ON CONFLICT ("usuario_id", "corretora_id") DO NOTHING;

-- Add corretora_ativa_id to usuario table (tracks which corretora user is currently using)
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "corretora_ativa_id" uuid REFERENCES "corretora"("id") ON DELETE SET NULL;

-- Set corretora_ativa_id to current corretora_id
UPDATE "usuario" SET "corretora_ativa_id" = "corretora_id" WHERE "corretora_id" IS NOT NULL;

-- Don't drop corretora_id yet - we'll keep it for backward compatibility
-- ALTER TABLE "usuario" DROP COLUMN IF EXISTS "corretora_id";

-- Add comment
COMMENT ON TABLE "usuario_corretora" IS 'Junction table for many-to-many relationship between usuarios and corretoras';
