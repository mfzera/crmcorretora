CREATE TYPE "public"."status_sinistro" AS ENUM('ABERTO', 'EM_ANALISE', 'AGUARDANDO_DOCUMENTOS', 'APROVADO', 'RECUSADO', 'PAGO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_evento_sinistro" AS ENUM('ABERTURA', 'MUDANCA_STATUS', 'APROVACAO', 'RECUSA', 'PAGAMENTO', 'DOCUMENTO_ADICIONADO', 'ANOTACAO', 'CANCELAMENTO');--> statement-breakpoint
CREATE TYPE "public"."tipo_sinistro" AS ENUM('COLISAO', 'ROUBO_FURTO', 'INCENDIO', 'DANOS_NATURAIS', 'DANOS_TERCEIROS', 'INVALIDEZ', 'MORTE', 'HOSPITALIZACAO', 'OUTROS');--> statement-breakpoint
ALTER TYPE "public"."entidade_tipo_anexo" ADD VALUE 'sinistro';--> statement-breakpoint
CREATE TABLE "historico_sinistro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sinistro_id" uuid NOT NULL,
	"usuario_id" uuid,
	"tipo" "tipo_evento_sinistro" NOT NULL,
	"status_anterior" "status_sinistro",
	"status_novo" "status_sinistro",
	"descricao" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sinistro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"documento_venda_id" uuid NOT NULL,
	"solicitante_id" uuid NOT NULL,
	"numero_sinistro" varchar(50) NOT NULL,
	"numero_sinistro_externo" varchar(100),
	"tipo_sinistro" "tipo_sinistro" NOT NULL,
	"status" "status_sinistro" DEFAULT 'ABERTO' NOT NULL,
	"descricao" text NOT NULL,
	"data_ocorrencia" date NOT NULL,
	"valor_reclamado" numeric(15, 2),
	"valor_aprovado" numeric(15, 2),
	"data_abertura" timestamp with time zone DEFAULT now() NOT NULL,
	"data_analise" timestamp with time zone,
	"data_aprovacao" timestamp with time zone,
	"data_recusa" timestamp with time zone,
	"data_pagamento" timestamp with time zone,
	"analista_por_id" uuid,
	"aprovado_por_id" uuid,
	"motivo_recusa" text,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "historico_sinistro" ADD CONSTRAINT "historico_sinistro_sinistro_id_sinistro_id_fk" FOREIGN KEY ("sinistro_id") REFERENCES "public"."sinistro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_sinistro" ADD CONSTRAINT "historico_sinistro_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sinistro" ADD CONSTRAINT "sinistro_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sinistro" ADD CONSTRAINT "sinistro_documento_venda_id_documento_venda_id_fk" FOREIGN KEY ("documento_venda_id") REFERENCES "public"."documento_venda"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sinistro" ADD CONSTRAINT "sinistro_solicitante_id_usuario_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sinistro" ADD CONSTRAINT "sinistro_analista_por_id_usuario_id_fk" FOREIGN KEY ("analista_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sinistro" ADD CONSTRAINT "sinistro_aprovado_por_id_usuario_id_fk" FOREIGN KEY ("aprovado_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_historico_sinistro_sinistro" ON "historico_sinistro" USING btree ("sinistro_id");--> statement-breakpoint
CREATE INDEX "idx_historico_sinistro_usuario" ON "historico_sinistro" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "idx_sinistro_corretora" ON "sinistro" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_sinistro_documento" ON "sinistro" USING btree ("documento_venda_id");--> statement-breakpoint
CREATE INDEX "idx_sinistro_solicitante" ON "sinistro" USING btree ("solicitante_id");--> statement-breakpoint
CREATE INDEX "idx_sinistro_status" ON "sinistro" USING btree ("corretora_id","status");--> statement-breakpoint
CREATE INDEX "idx_sinistro_numero" ON "sinistro" USING btree ("corretora_id","numero_sinistro");