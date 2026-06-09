CREATE TYPE "public"."modalidade_pagamento_vendedor" AS ENUM('AVISTA', 'PARCELADO');--> statement-breakpoint
CREATE TYPE "public"."status_recebimento_seguradora" AS ENUM('AGUARDANDO', 'RECEBIDO', 'NAO_APLICAVEL');--> statement-breakpoint
CREATE TYPE "public"."tipo_lancamento_comissao" AS ENUM('NORMAL', 'AJUSTE_ENDOSSO', 'ESTORNO_CANCELAMENTO', 'PRO_RATA');--> statement-breakpoint
CREATE TABLE "comissao_lancamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"documento_venda_id" uuid NOT NULL,
	"endosso_id" uuid,
	"tipo" "tipo_lancamento_comissao" DEFAULT 'NORMAL' NOT NULL,
	"descricao" varchar(500),
	"numero_parcela" integer DEFAULT 1 NOT NULL,
	"total_parcelas" integer DEFAULT 1 NOT NULL,
	"valor_premio_referencia" numeric(15, 2),
	"percentual_comissao" numeric(5, 2),
	"valor_comissao_total" numeric(15, 2) NOT NULL,
	"valor_comissao_vendedor" numeric(15, 2),
	"valor_comissao_corretora" numeric(15, 2),
	"data_competencia" date,
	"data_vencimento" date,
	"status_recebimento_seguradora" "status_recebimento_seguradora" DEFAULT 'AGUARDANDO' NOT NULL,
	"data_recebimento_seguradora" date,
	"observacao_recebimento" text,
	"status_pagamento_vendedor" "status_pagamento_comissao" DEFAULT 'PENDENTE' NOT NULL,
	"data_pagamento_vendedor" timestamp with time zone,
	"observacao_pagamento" text,
	"pago_por_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "documento_venda" ADD COLUMN "numero_parcelas" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "documento_venda" ADD COLUMN "modalidade_pagamento_vendedor" "modalidade_pagamento_vendedor" DEFAULT 'AVISTA';--> statement-breakpoint
ALTER TABLE "comissao_lancamento" ADD CONSTRAINT "comissao_lancamento_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comissao_lancamento" ADD CONSTRAINT "comissao_lancamento_documento_venda_id_documento_venda_id_fk" FOREIGN KEY ("documento_venda_id") REFERENCES "public"."documento_venda"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comissao_lancamento" ADD CONSTRAINT "comissao_lancamento_endosso_id_endosso_id_fk" FOREIGN KEY ("endosso_id") REFERENCES "public"."endosso"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comissao_lancamento" ADD CONSTRAINT "comissao_lancamento_pago_por_id_usuario_id_fk" FOREIGN KEY ("pago_por_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comissao_lancamento_corretora" ON "comissao_lancamento" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_comissao_lancamento_documento" ON "comissao_lancamento" USING btree ("documento_venda_id");--> statement-breakpoint
CREATE INDEX "idx_comissao_lancamento_vencimento" ON "comissao_lancamento" USING btree ("data_vencimento");--> statement-breakpoint
CREATE INDEX "idx_comissao_lancamento_status" ON "comissao_lancamento" USING btree ("corretora_id","status_pagamento_vendedor");--> statement-breakpoint
CREATE INDEX "idx_comissao_lancamento_competencia" ON "comissao_lancamento" USING btree ("corretora_id","data_competencia");