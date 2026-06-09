CREATE TYPE "public"."status_importacao" AS ENUM('PROCESSANDO', 'CONCLUIDO', 'CONCLUIDO_COM_ERROS', 'FALHA', 'REVERTIDO_PARCIAL');--> statement-breakpoint
CREATE TYPE "public"."status_importacao_item" AS ENUM('SUCESSO', 'ERRO', 'PULADO', 'PENDENTE', 'REVERTIDO');--> statement-breakpoint
CREATE TABLE "importacao_renovacao_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"importacao_id" uuid NOT NULL,
	"linha_numero" integer NOT NULL,
	"status" "status_importacao_item" NOT NULL,
	"mensagem" text,
	"nome_cliente" varchar(500),
	"documento_cliente" varchar(20),
	"produto" varchar(500),
	"dados_linha" jsonb,
	"renovacao_id" uuid,
	"documento_venda_id" uuid,
	"erro_detalhes" text,
	"retentativas" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "importacao_renovacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"nome_arquivo" varchar(500) NOT NULL,
	"tamanho_arquivo" integer,
	"status" "status_importacao" DEFAULT 'PROCESSANDO' NOT NULL,
	"total_linhas" integer NOT NULL,
	"total_sucesso" integer DEFAULT 0 NOT NULL,
	"total_erros" integer DEFAULT 0 NOT NULL,
	"total_pulados" integer DEFAULT 0 NOT NULL,
	"total_pendentes" integer DEFAULT 0 NOT NULL,
	"concluido_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "documento_venda" ADD COLUMN "importacao_id" uuid;--> statement-breakpoint
ALTER TABLE "renovacao_comercial" ADD COLUMN "importacao_id" uuid;--> statement-breakpoint
ALTER TABLE "importacao_renovacao_itens" ADD CONSTRAINT "importacao_renovacao_itens_importacao_id_importacao_renovacoes_id_fk" FOREIGN KEY ("importacao_id") REFERENCES "public"."importacao_renovacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacao_renovacao_itens" ADD CONSTRAINT "importacao_renovacao_itens_renovacao_id_renovacao_comercial_id_fk" FOREIGN KEY ("renovacao_id") REFERENCES "public"."renovacao_comercial"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacao_renovacao_itens" ADD CONSTRAINT "importacao_renovacao_itens_documento_venda_id_documento_venda_id_fk" FOREIGN KEY ("documento_venda_id") REFERENCES "public"."documento_venda"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacao_renovacoes" ADD CONSTRAINT "importacao_renovacoes_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacao_renovacoes" ADD CONSTRAINT "importacao_renovacoes_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "importacao_renovacoes" ADD CONSTRAINT "importacao_renovacoes_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_importacao_item_importacao" ON "importacao_renovacao_itens" USING btree ("importacao_id");--> statement-breakpoint
CREATE INDEX "idx_importacao_item_status" ON "importacao_renovacao_itens" USING btree ("importacao_id","status");--> statement-breakpoint
CREATE INDEX "idx_importacao_item_renovacao" ON "importacao_renovacao_itens" USING btree ("renovacao_id");--> statement-breakpoint
CREATE INDEX "idx_importacao_item_documento" ON "importacao_renovacao_itens" USING btree ("documento_venda_id");--> statement-breakpoint
CREATE INDEX "idx_importacao_renovacoes_corretora" ON "importacao_renovacoes" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_importacao_renovacoes_usuario" ON "importacao_renovacoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "idx_importacao_renovacoes_created" ON "importacao_renovacoes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_importacao_renovacoes_status" ON "importacao_renovacoes" USING btree ("corretora_id","status");--> statement-breakpoint
ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_importacao_id_importacao_renovacoes_id_fk" FOREIGN KEY ("importacao_id") REFERENCES "public"."importacao_renovacoes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renovacao_comercial" ADD CONSTRAINT "renovacao_comercial_importacao_id_importacao_renovacoes_id_fk" FOREIGN KEY ("importacao_id") REFERENCES "public"."importacao_renovacoes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_documento_venda_importacao" ON "documento_venda" USING btree ("importacao_id");--> statement-breakpoint
CREATE INDEX "idx_renovacao_importacao" ON "renovacao_comercial" USING btree ("importacao_id");