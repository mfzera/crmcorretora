CREATE TYPE "public"."papel_cotacao_vendedor" AS ENUM('COTADOR', 'FECHADOR');--> statement-breakpoint
CREATE TABLE "corretora_comissao_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"tipo_seguro" varchar(100) NOT NULL,
	"percentual_participacao" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unq_corretora_comissao_tipo" UNIQUE("corretora_id","tipo_seguro")
);
--> statement-breakpoint
CREATE TABLE "usuario_comissao_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo_seguro" varchar(100) NOT NULL,
	"percentual_participacao" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unq_usuario_comissao_tipo" UNIQUE("corretora_id","usuario_id","tipo_seguro")
);
--> statement-breakpoint
ALTER TABLE "cotacao_vendedor" ADD COLUMN "papel" "papel_cotacao_vendedor" DEFAULT 'COTADOR' NOT NULL;--> statement-breakpoint
ALTER TABLE "corretora_comissao_config" ADD CONSTRAINT "corretora_comissao_config_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_comissao_config" ADD CONSTRAINT "usuario_comissao_config_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_comissao_config" ADD CONSTRAINT "usuario_comissao_config_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_corretora_comissao_corretora" ON "corretora_comissao_config" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_usuario_comissao_corretora" ON "usuario_comissao_config" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_usuario_comissao_usuario" ON "usuario_comissao_config" USING btree ("usuario_id");