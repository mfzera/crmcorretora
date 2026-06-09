CREATE TABLE "comentario_documento_venda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"documento_venda_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"parent_id" uuid,
	"texto" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comentario_documento_venda" ADD CONSTRAINT "comentario_documento_venda_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario_documento_venda" ADD CONSTRAINT "comentario_documento_venda_documento_venda_id_documento_venda_id_fk" FOREIGN KEY ("documento_venda_id") REFERENCES "public"."documento_venda"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario_documento_venda" ADD CONSTRAINT "comentario_documento_venda_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comentario_documento_venda_documento_idx" ON "comentario_documento_venda" USING btree ("documento_venda_id");--> statement-breakpoint
CREATE INDEX "comentario_documento_venda_corretora_idx" ON "comentario_documento_venda" USING btree ("corretora_id");