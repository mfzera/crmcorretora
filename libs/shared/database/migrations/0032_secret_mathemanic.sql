ALTER TABLE "documento_venda" ADD COLUMN "vendedor_secundario_id" uuid;--> statement-breakpoint
ALTER TABLE "documento_venda" ADD COLUMN "vendedor_terceiro_id" uuid;--> statement-breakpoint
ALTER TABLE "documento_venda" ADD COLUMN "atuante_id" uuid;--> statement-breakpoint
ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_vendedor_secundario_id_usuario_id_fk" FOREIGN KEY ("vendedor_secundario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_vendedor_terceiro_id_usuario_id_fk" FOREIGN KEY ("vendedor_terceiro_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_atuante_id_usuario_id_fk" FOREIGN KEY ("atuante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;