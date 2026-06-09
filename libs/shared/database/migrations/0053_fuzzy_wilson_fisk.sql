CREATE TYPE "public"."tipo_negocio_comissao" AS ENUM('NOVO', 'RENOVACAO');--> statement-breakpoint
ALTER TABLE "corretora_comissao_config" DROP CONSTRAINT "unq_corretora_comissao_tipo";--> statement-breakpoint
ALTER TABLE "cargo_comissao_config" DROP CONSTRAINT "unq_cargo_comissao_tipo";--> statement-breakpoint
ALTER TABLE "usuario_comissao_config" DROP CONSTRAINT "unq_usuario_comissao_tipo";--> statement-breakpoint
ALTER TABLE "corretora_comissao_config" ADD COLUMN "tipo_negocio" "tipo_negocio_comissao";--> statement-breakpoint
ALTER TABLE "cargo_comissao_config" ADD COLUMN "tipo_negocio" "tipo_negocio_comissao";--> statement-breakpoint
ALTER TABLE "usuario_comissao_config" ADD COLUMN "tipo_negocio" "tipo_negocio_comissao";--> statement-breakpoint
ALTER TABLE "corretora_comissao_config" ADD CONSTRAINT "unq_corretora_comissao_tipo" UNIQUE("corretora_id","tipo_seguro","tipo_negocio");--> statement-breakpoint
ALTER TABLE "cargo_comissao_config" ADD CONSTRAINT "unq_cargo_comissao_tipo" UNIQUE("corretora_id","cargo_id","tipo_seguro","tipo_negocio");--> statement-breakpoint
ALTER TABLE "usuario_comissao_config" ADD CONSTRAINT "unq_usuario_comissao_tipo" UNIQUE("corretora_id","usuario_id","tipo_seguro","tipo_negocio");