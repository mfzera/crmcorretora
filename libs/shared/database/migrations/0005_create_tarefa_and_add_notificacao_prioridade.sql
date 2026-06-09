-- Create tarefa table
CREATE TABLE IF NOT EXISTS "tarefa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text,
	"prioridade" varchar(20) DEFAULT 'media' NOT NULL,
	"concluida" boolean DEFAULT false NOT NULL,
	"concluida_em" timestamp with time zone,
	"data_vencimento" timestamp with time zone,
	"entidade_tipo" varchar(50),
	"entidade_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
-- Add prioridade column to notificacao table
ALTER TABLE "notificacao" ADD COLUMN IF NOT EXISTS "prioridade" varchar(20) DEFAULT 'media' NOT NULL;
--> statement-breakpoint
-- Add foreign key constraints for tarefa
DO $$ BEGIN
 ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Create indexes for tarefa
CREATE INDEX IF NOT EXISTS "idx_tarefa_corretora" ON "tarefa" USING btree ("corretora_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tarefa_usuario" ON "tarefa" USING btree ("usuario_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tarefa_concluida" ON "tarefa" USING btree ("concluida");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tarefa_vencimento" ON "tarefa" USING btree ("data_vencimento");
--> statement-breakpoint
-- Create index for notificacao prioridade
CREATE INDEX IF NOT EXISTS "idx_notificacao_prioridade" ON "notificacao" USING btree ("prioridade");
