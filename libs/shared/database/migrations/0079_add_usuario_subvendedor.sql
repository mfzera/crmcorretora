CREATE TABLE "usuario_subvendedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendedor_principal_id" uuid NOT NULL,
	"subvendedor_id" uuid NOT NULL,
	"percentual" numeric(5, 2),
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_por_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unq_usuario_subvendedor" UNIQUE("vendedor_principal_id","subvendedor_id")
);
--> statement-breakpoint
ALTER TABLE "usuario_subvendedor" ADD CONSTRAINT "usuario_subvendedor_vendedor_principal_id_usuario_id_fk" FOREIGN KEY ("vendedor_principal_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_subvendedor" ADD CONSTRAINT "usuario_subvendedor_subvendedor_id_usuario_id_fk" FOREIGN KEY ("subvendedor_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_subvendedor" ADD CONSTRAINT "usuario_subvendedor_criado_por_id_usuario_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_subvendedor_principal" ON "usuario_subvendedor" USING btree ("vendedor_principal_id");--> statement-breakpoint
CREATE INDEX "idx_subvendedor_sub" ON "usuario_subvendedor" USING btree ("subvendedor_id");