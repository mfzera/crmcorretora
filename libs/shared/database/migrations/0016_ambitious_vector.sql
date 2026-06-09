CREATE TABLE "solicitacao_exclusao_renovacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"renovacao_id" uuid NOT NULL,
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
ALTER TABLE "solicitacao_exclusao_renovacao" ADD CONSTRAINT "solicitacao_exclusao_renovacao_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_exclusao_renovacao" ADD CONSTRAINT "solicitacao_exclusao_renovacao_renovacao_id_renovacao_comercial_id_fk" FOREIGN KEY ("renovacao_id") REFERENCES "public"."renovacao_comercial"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_exclusao_renovacao" ADD CONSTRAINT "solicitacao_exclusao_renovacao_solicitante_id_usuario_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_exclusao_renovacao" ADD CONSTRAINT "solicitacao_exclusao_renovacao_respondido_por_id_usuario_id_fk" FOREIGN KEY ("respondido_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;