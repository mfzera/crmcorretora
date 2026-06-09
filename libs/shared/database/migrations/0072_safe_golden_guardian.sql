CREATE TABLE "vendedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"nome" varchar(256) NOT NULL,
	"email" varchar(256),
	"telefone" varchar(20),
	"tipo" varchar(20) DEFAULT 'principal' NOT NULL,
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "vendedor" ADD CONSTRAINT "vendedor_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_vendedor_corretora" ON "vendedor" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_vendedor_ativo" ON "vendedor" USING btree ("ativo");