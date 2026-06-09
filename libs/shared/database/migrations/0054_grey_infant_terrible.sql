CREATE TYPE "public"."status_pagamento_comissao" AS ENUM('PENDENTE', 'PAGO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_operacao_comissao_config" AS ENUM('CRIACAO', 'ATUALIZACAO', 'EXCLUSAO');--> statement-breakpoint
CREATE TABLE "comissao_config_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"escopo" varchar(20) NOT NULL,
	"registro_id" uuid,
	"tipo_operacao" "tipo_operacao_comissao_config" NOT NULL,
	"dados_antes" jsonb,
	"dados_depois" jsonb,
	"usuario_id" uuid,
	"usuario_nome" varchar(255),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "documento_venda" ADD COLUMN "valor_comissao_vendedor" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "documento_venda" ADD COLUMN "status_pagamento_comissao" "status_pagamento_comissao" DEFAULT 'PENDENTE';--> statement-breakpoint
ALTER TABLE "documento_venda" ADD COLUMN "data_pagamento_comissao" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documento_venda" ADD COLUMN "observacao_pagamento_comissao" text;--> statement-breakpoint
ALTER TABLE "comissao_config_historico" ADD CONSTRAINT "comissao_config_historico_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comissao_config_historico" ADD CONSTRAINT "comissao_config_historico_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comissao_config_historico_corretora" ON "comissao_config_historico" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_comissao_config_historico_created" ON "comissao_config_historico" USING btree ("created_at");