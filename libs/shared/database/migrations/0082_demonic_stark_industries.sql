ALTER TABLE "usuario_subvendedor" ADD COLUMN "percentual_novo" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "usuario_subvendedor" ADD COLUMN "percentual_renovacao" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "usuario_subvendedor" DROP COLUMN "percentual";