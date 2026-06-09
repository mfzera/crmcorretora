CREATE TABLE "portal_cotacao_solicitacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"produto_id" uuid,
	"mensagem" text,
	"status" varchar(20) DEFAULT 'PENDENTE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos_apolice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"documento_venda_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"nome" varchar(255) NOT NULL,
	"tipo" varchar(50) DEFAULT 'OUTRO' NOT NULL,
	"r2_key" varchar(500) NOT NULL,
	"mime_type" varchar(100),
	"tamanho_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "seguradoras_parceiras" ADD COLUMN "telefone_24h" varchar(20);--> statement-breakpoint
ALTER TABLE "seguradoras_parceiras" ADD COLUMN "whatsapp_24h" varchar(20);--> statement-breakpoint
ALTER TABLE "seguradoras_parceiras" ADD COLUMN "horario_atendimento_24h" varchar(100);--> statement-breakpoint
ALTER TABLE "portal_cotacao_solicitacoes" ADD CONSTRAINT "portal_cotacao_solicitacoes_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_cotacao_solicitacoes" ADD CONSTRAINT "portal_cotacao_solicitacoes_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_cotacao_solicitacoes" ADD CONSTRAINT "portal_cotacao_solicitacoes_produto_id_produto_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produto"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_apolice" ADD CONSTRAINT "documentos_apolice_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_apolice" ADD CONSTRAINT "documentos_apolice_documento_venda_id_documento_venda_id_fk" FOREIGN KEY ("documento_venda_id") REFERENCES "public"."documento_venda"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_apolice" ADD CONSTRAINT "documentos_apolice_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_portal_cotacao_corretora" ON "portal_cotacao_solicitacoes" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_portal_cotacao_cliente" ON "portal_cotacao_solicitacoes" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_portal_cotacao_status" ON "portal_cotacao_solicitacoes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_doc_apolice_documento_venda" ON "documentos_apolice" USING btree ("documento_venda_id");--> statement-breakpoint
CREATE INDEX "idx_doc_apolice_cliente" ON "documentos_apolice" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_doc_apolice_corretora" ON "documentos_apolice" USING btree ("corretora_id");