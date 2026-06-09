ALTER TABLE "portal_cotacao_solicitacoes" ADD COLUMN "vendedor_id" uuid;--> statement-breakpoint
ALTER TABLE "produto" ADD COLUMN "vendedor_portal_id" uuid;--> statement-breakpoint
ALTER TABLE "portal_cotacao_solicitacoes" ADD CONSTRAINT "portal_cotacao_solicitacoes_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produto" ADD CONSTRAINT "produto_vendedor_portal_id_usuario_id_fk" FOREIGN KEY ("vendedor_portal_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_portal_cotacao_vendedor" ON "portal_cotacao_solicitacoes" USING btree ("vendedor_id");