CREATE TABLE IF NOT EXISTS "workspace2_planilha_prefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"corretora_id" uuid NOT NULL,
	"column_state" jsonb DEFAULT '[]',
	"column_colors" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_workspace2_planilha_prefs_usuario_corretora" UNIQUE("usuario_id","corretora_id")
);
--> statement-breakpoint
ALTER TABLE "workspace2_planilha_prefs" ADD CONSTRAINT "workspace2_planilha_prefs_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace2_planilha_prefs" ADD CONSTRAINT "workspace2_planilha_prefs_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_workspace2_planilha_prefs_lookup" ON "workspace2_planilha_prefs" USING btree ("usuario_id","corretora_id");