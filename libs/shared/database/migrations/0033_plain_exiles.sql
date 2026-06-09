CREATE TABLE "comentario_renovacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"renovacao_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comentario_renovacao" ADD CONSTRAINT "comentario_renovacao_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario_renovacao" ADD CONSTRAINT "comentario_renovacao_renovacao_id_renovacao_comercial_id_fk" FOREIGN KEY ("renovacao_id") REFERENCES "public"."renovacao_comercial"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario_renovacao" ADD CONSTRAINT "comentario_renovacao_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comentario_renovacao_renovacao_idx" ON "comentario_renovacao" USING btree ("renovacao_id");--> statement-breakpoint
CREATE INDEX "comentario_renovacao_corretora_idx" ON "comentario_renovacao" USING btree ("corretora_id");