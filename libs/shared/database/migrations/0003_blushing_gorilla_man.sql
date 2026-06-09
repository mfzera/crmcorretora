-- Remove premioEstimado and dataValidade from cotacao table
ALTER TABLE "cotacao" DROP COLUMN IF EXISTS "premio_estimado";--> statement-breakpoint
ALTER TABLE "cotacao" DROP COLUMN IF EXISTS "data_validade";
