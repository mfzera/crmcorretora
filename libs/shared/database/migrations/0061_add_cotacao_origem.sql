DO $$ BEGIN
  CREATE TYPE "public"."cotacao_origem" AS ENUM('MANUAL', 'RENOVACAO_PENDENTE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "cotacao" ADD COLUMN IF NOT EXISTS "origem" "cotacao_origem" DEFAULT 'MANUAL' NOT NULL;
