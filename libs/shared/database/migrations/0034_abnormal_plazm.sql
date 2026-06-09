CREATE TABLE "comentario_cotacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"cotacao_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comentario_cotacao" ADD CONSTRAINT "comentario_cotacao_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario_cotacao" ADD CONSTRAINT "comentario_cotacao_cotacao_id_cotacao_id_fk" FOREIGN KEY ("cotacao_id") REFERENCES "public"."cotacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario_cotacao" ADD CONSTRAINT "comentario_cotacao_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comentario_cotacao_cotacao_idx" ON "comentario_cotacao" USING btree ("cotacao_id");--> statement-breakpoint
CREATE INDEX "comentario_cotacao_corretora_idx" ON "comentario_cotacao" USING btree ("corretora_id");