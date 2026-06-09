-- Fix cargo unique constraint to exclude soft-deleted records
-- The previous constraint included deleted rows, causing 500 errors when
-- trying to recreate a cargo with the same name after soft-deleting it.

ALTER TABLE "cargo" DROP CONSTRAINT IF EXISTS "unq_corretora_cargo";

CREATE UNIQUE INDEX IF NOT EXISTS "unq_corretora_cargo" ON "cargo" ("corretora_id", "nome_cargo") WHERE "deleted_at" IS NULL;
