CREATE TABLE "oportunidade_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oportunidade_id" uuid NOT NULL,
	"usuario_id" uuid,
	"tipo" varchar(50) NOT NULL,
	"status_anterior" varchar(50),
	"status_novo" varchar(50),
	"descricao" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oportunidade_historico" ADD CONSTRAINT "oportunidade_historico_oportunidade_id_oportunidade_id_fk" FOREIGN KEY ("oportunidade_id") REFERENCES "public"."oportunidade"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oportunidade_historico" ADD CONSTRAINT "oportunidade_historico_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_oportunidade_historico_oportunidade" ON "oportunidade_historico" USING btree ("oportunidade_id");--> statement-breakpoint
CREATE INDEX "idx_oportunidade_historico_created_at" ON "oportunidade_historico" USING btree ("created_at");
