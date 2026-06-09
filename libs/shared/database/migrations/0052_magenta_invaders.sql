CREATE TABLE "cargo_comissao_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"cargo_id" uuid NOT NULL,
	"tipo_seguro" varchar(100) NOT NULL,
	"percentual_participacao" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unq_cargo_comissao_tipo" UNIQUE("corretora_id","cargo_id","tipo_seguro")
);
--> statement-breakpoint
ALTER TABLE "cargo_comissao_config" ADD CONSTRAINT "cargo_comissao_config_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargo_comissao_config" ADD CONSTRAINT "cargo_comissao_config_cargo_id_cargo_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cargo_comissao_corretora" ON "cargo_comissao_config" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_cargo_comissao_cargo" ON "cargo_comissao_config" USING btree ("cargo_id");