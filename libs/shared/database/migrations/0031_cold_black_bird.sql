ALTER TABLE "cliente" DROP CONSTRAINT "check_tipo_pessoa";--> statement-breakpoint
ALTER TABLE "cotacao" ADD COLUMN "vendedor_terceiro_id" uuid;--> statement-breakpoint
ALTER TABLE "cotacao" ADD COLUMN "percentual_comissao_terceiro" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "cotacao" ADD COLUMN "valor_comissao_terceiro" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "cotacao" ADD COLUMN "atuante_id" uuid;--> statement-breakpoint
ALTER TABLE "cotacao" ADD CONSTRAINT "cotacao_vendedor_terceiro_id_usuario_id_fk" FOREIGN KEY ("vendedor_terceiro_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotacao" ADD CONSTRAINT "cotacao_atuante_id_usuario_id_fk" FOREIGN KEY ("atuante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente" ADD CONSTRAINT "check_tipo_pessoa" CHECK (("cliente"."tipo_pessoa" = 'PF' AND ("cliente"."cpf" IS NOT NULL OR "cliente"."deleted_at" IS NOT NULL)) OR ("cliente"."tipo_pessoa" = 'PJ' AND ("cliente"."cnpj" IS NOT NULL OR "cliente"."deleted_at" IS NOT NULL)));