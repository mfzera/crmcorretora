CREATE TYPE "public"."etapa_cotacao" AS ENUM('LEVANTANDO_DADOS', 'PROPOSTA_ENVIADA', 'EM_NEGOCIACAO', 'AGUARDANDO_RETORNO');--> statement-breakpoint
CREATE TABLE "cotacao_tag_relacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cotacao_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"criado_por_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unq_cotacao_tag" UNIQUE("cotacao_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "cotacao_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"criador_id" uuid NOT NULL,
	"equipe_id" uuid,
	"nome" varchar(50) NOT NULL,
	"cor" varchar(7) DEFAULT '#6366f1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cotacao" ADD COLUMN "etapa" "etapa_cotacao" DEFAULT 'LEVANTANDO_DADOS' NOT NULL;--> statement-breakpoint
ALTER TABLE "cotacao_tag_relacao" ADD CONSTRAINT "cotacao_tag_relacao_cotacao_id_cotacao_id_fk" FOREIGN KEY ("cotacao_id") REFERENCES "public"."cotacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotacao_tag_relacao" ADD CONSTRAINT "cotacao_tag_relacao_tag_id_cotacao_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."cotacao_tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotacao_tag_relacao" ADD CONSTRAINT "cotacao_tag_relacao_criado_por_id_usuario_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotacao_tag" ADD CONSTRAINT "cotacao_tag_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotacao_tag" ADD CONSTRAINT "cotacao_tag_criador_id_usuario_id_fk" FOREIGN KEY ("criador_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotacao_tag" ADD CONSTRAINT "cotacao_tag_equipe_id_equipe_id_fk" FOREIGN KEY ("equipe_id") REFERENCES "public"."equipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cotacao_tag_relacao_cotacao" ON "cotacao_tag_relacao" USING btree ("cotacao_id");--> statement-breakpoint
CREATE INDEX "idx_cotacao_tag_relacao_tag" ON "cotacao_tag_relacao" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_cotacao_tag_corretora" ON "cotacao_tag" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_cotacao_tag_criador" ON "cotacao_tag" USING btree ("criador_id");--> statement-breakpoint
CREATE INDEX "idx_cotacao_tag_equipe" ON "cotacao_tag" USING btree ("equipe_id");