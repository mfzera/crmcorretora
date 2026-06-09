CREATE TABLE "consent_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"corretora_id" uuid,
	"tipo" varchar(50) NOT NULL,
	"versao" varchar(20) NOT NULL,
	"ip_address" varchar(45),
	"aceito" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "anonimizado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cliente" ADD COLUMN "anonimizado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "retencao_ate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_consent_log_usuario" ON "consent_log" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "idx_consent_log_corretora" ON "consent_log" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX "idx_consent_log_tipo" ON "consent_log" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "idx_consent_log_created_at" ON "consent_log" USING btree ("created_at");