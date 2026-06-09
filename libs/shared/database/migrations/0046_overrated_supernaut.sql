ALTER TYPE "public"."tipo_evento_documento" ADD VALUE 'SOLICITACAO_EXCLUSAO';--> statement-breakpoint
ALTER TYPE "public"."tipo_evento_documento" ADD VALUE 'EXCLUSAO_ACEITA';--> statement-breakpoint
ALTER TYPE "public"."tipo_evento_documento" ADD VALUE 'EXCLUSAO_RECUSADA';--> statement-breakpoint
CREATE TABLE "solicitacao_exclusao_venda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"documento_venda_id" uuid NOT NULL,
	"solicitante_id" uuid NOT NULL,
	"motivo" text,
	"status" text DEFAULT 'PENDENTE' NOT NULL,
	"motivo_recusa" text,
	"respondido_por_id" uuid,
	"respondido_em" timestamp,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solicitacao_exclusao_venda" ADD CONSTRAINT "solicitacao_exclusao_venda_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_exclusao_venda" ADD CONSTRAINT "solicitacao_exclusao_venda_documento_venda_id_documento_venda_id_fk" FOREIGN KEY ("documento_venda_id") REFERENCES "public"."documento_venda"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_exclusao_venda" ADD CONSTRAINT "solicitacao_exclusao_venda_solicitante_id_usuario_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_exclusao_venda" ADD CONSTRAINT "solicitacao_exclusao_venda_respondido_por_id_usuario_id_fk" FOREIGN KEY ("respondido_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;