CREATE TABLE "portal_segurado_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"corretora_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "portal_segurado_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "portal_segurado_token" ADD CONSTRAINT "portal_segurado_token_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_segurado_token" ADD CONSTRAINT "portal_segurado_token_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_portal_segurado_token" ON "portal_segurado_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_portal_segurado_cliente" ON "portal_segurado_token" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_portal_segurado_corretora" ON "portal_segurado_token" USING btree ("corretora_id");