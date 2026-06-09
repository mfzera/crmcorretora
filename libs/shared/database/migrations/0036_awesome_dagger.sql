CREATE TYPE "public"."status_meta" AS ENUM('ATIVA', 'CONCLUIDA', 'EXPIRADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."status_missao" AS ENUM('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'EXPIRADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."tipo_metrica" AS ENUM('novos_seguros', 'renovacoes', 'cotacoes', 'valor_premio');--> statement-breakpoint
CREATE TABLE "meta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"equipe_id" uuid,
	"usuario_id" uuid,
	"criada_por_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text,
	"tipo_metrica" "tipo_metrica" NOT NULL,
	"valor_alvo" numeric(15, 2) NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"status" "status_meta" DEFAULT 'ATIVA' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "badge_tipo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"icone" varchar(100) NOT NULL,
	"cor" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "badge_tipo_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "usuario_badge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"badge_tipo_id" uuid NOT NULL,
	"meta_id" uuid,
	"missao_id" uuid,
	"concedido_por_id" uuid,
	"observacao" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "missao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"equipe_id" uuid,
	"usuario_id" uuid,
	"criada_por_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text,
	"tipo_metrica" "tipo_metrica" NOT NULL,
	"valor_alvo" numeric(15, 2) NOT NULL,
	"data_inicio" date NOT NULL,
	"prazo" date NOT NULL,
	"status" "status_missao" DEFAULT 'PENDENTE' NOT NULL,
	"badge_tipo_id" uuid,
	"badge_observacao" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "campanha" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text NOT NULL,
	"seguradora_parceira_id" uuid,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"criada_por_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "meta" ADD CONSTRAINT "meta_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta" ADD CONSTRAINT "meta_equipe_id_equipe_id_fk" FOREIGN KEY ("equipe_id") REFERENCES "public"."equipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta" ADD CONSTRAINT "meta_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta" ADD CONSTRAINT "meta_criada_por_id_usuario_id_fk" FOREIGN KEY ("criada_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_badge" ADD CONSTRAINT "usuario_badge_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_badge" ADD CONSTRAINT "usuario_badge_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_badge" ADD CONSTRAINT "usuario_badge_badge_tipo_id_badge_tipo_id_fk" FOREIGN KEY ("badge_tipo_id") REFERENCES "public"."badge_tipo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_badge" ADD CONSTRAINT "usuario_badge_concedido_por_id_usuario_id_fk" FOREIGN KEY ("concedido_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missao" ADD CONSTRAINT "missao_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missao" ADD CONSTRAINT "missao_equipe_id_equipe_id_fk" FOREIGN KEY ("equipe_id") REFERENCES "public"."equipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missao" ADD CONSTRAINT "missao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missao" ADD CONSTRAINT "missao_criada_por_id_usuario_id_fk" FOREIGN KEY ("criada_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missao" ADD CONSTRAINT "missao_badge_tipo_id_badge_tipo_id_fk" FOREIGN KEY ("badge_tipo_id") REFERENCES "public"."badge_tipo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campanha" ADD CONSTRAINT "campanha_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campanha" ADD CONSTRAINT "campanha_seguradora_parceira_id_seguradoras_parceiras_id_fk" FOREIGN KEY ("seguradora_parceira_id") REFERENCES "public"."seguradoras_parceiras"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campanha" ADD CONSTRAINT "campanha_criada_por_id_usuario_id_fk" FOREIGN KEY ("criada_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_meta_corretora" ON "meta" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_meta_equipe" ON "meta" USING btree ("equipe_id");--> statement-breakpoint
CREATE INDEX "idx_meta_usuario" ON "meta" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "idx_meta_status" ON "meta" USING btree ("corretora_id","status");--> statement-breakpoint
CREATE INDEX "idx_usuario_badge_usuario" ON "usuario_badge" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "idx_usuario_badge_corretora" ON "usuario_badge" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_missao_corretora" ON "missao" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_missao_usuario" ON "missao" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "idx_missao_equipe" ON "missao" USING btree ("equipe_id");--> statement-breakpoint
CREATE INDEX "idx_missao_status" ON "missao" USING btree ("corretora_id","status");--> statement-breakpoint
CREATE INDEX "idx_campanha_corretora" ON "campanha" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_campanha_ativa" ON "campanha" USING btree ("corretora_id","ativa");--> statement-breakpoint
CREATE INDEX "idx_campanha_datas" ON "campanha" USING btree ("data_inicio","data_fim");