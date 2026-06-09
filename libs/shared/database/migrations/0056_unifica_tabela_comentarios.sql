CREATE TABLE "comentario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"entidade_tipo" varchar(20) NOT NULL,
	"entidade_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"parent_id" uuid,
	"texto" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comentario" ADD CONSTRAINT "comentario_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario" ADD CONSTRAINT "comentario_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comentario_entidade_idx" ON "comentario" USING btree ("entidade_tipo","entidade_id");--> statement-breakpoint
CREATE INDEX "comentario_corretora_idx" ON "comentario" USING btree ("corretora_id");--> statement-breakpoint

-- Migra dados das tabelas antigas para a unificada
INSERT INTO "comentario" ("id", "corretora_id", "entidade_tipo", "entidade_id", "autor_id", "parent_id", "texto", "created_at")
SELECT "id", "corretora_id", 'cotacao', "cotacao_id", "autor_id", NULL, "texto", "created_at"
FROM "comentario_cotacao";
--> statement-breakpoint
INSERT INTO "comentario" ("id", "corretora_id", "entidade_tipo", "entidade_id", "autor_id", "parent_id", "texto", "created_at")
SELECT "id", "corretora_id", 'documento_venda', "documento_venda_id", "autor_id", "parent_id", "texto", "created_at"
FROM "comentario_documento_venda";
--> statement-breakpoint
INSERT INTO "comentario" ("id", "corretora_id", "entidade_tipo", "entidade_id", "autor_id", "parent_id", "texto", "created_at")
SELECT "id", "corretora_id", 'renovacao', "renovacao_id", "autor_id", NULL, "texto", "created_at"
FROM "comentario_renovacao";
--> statement-breakpoint

-- Remove tabelas antigas
DROP TABLE "comentario_cotacao";--> statement-breakpoint
DROP TABLE "comentario_documento_venda";--> statement-breakpoint
DROP TABLE "comentario_renovacao";
