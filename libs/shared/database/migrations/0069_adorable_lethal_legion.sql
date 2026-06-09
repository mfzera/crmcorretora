CREATE TYPE "public"."origem_sinistro" AS ENUM('DIRETA', 'INDICACAO');--> statement-breakpoint
ALTER TABLE "sinistro" ADD COLUMN "origem" "origem_sinistro" DEFAULT 'DIRETA' NOT NULL;