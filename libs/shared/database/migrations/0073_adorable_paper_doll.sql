CREATE TABLE "kanban_board_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"board_type" varchar(50) NOT NULL,
	"column_id" varchar(100) NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"label" varchar(100),
	"color" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_kanban_board_config" UNIQUE("corretora_id","board_type","column_id")
);
--> statement-breakpoint
CREATE TABLE "kanban_custom_column" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"board_type" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"color" varchar(100) DEFAULT 'bg-slate-500' NOT NULL,
	"ordem" integer DEFAULT 999 NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "oportunidade" ADD COLUMN "kanban_column_key" varchar(100);--> statement-breakpoint
ALTER TABLE "kanban_board_config" ADD CONSTRAINT "kanban_board_config_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_custom_column" ADD CONSTRAINT "kanban_custom_column_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_kanban_board_config_lookup" ON "kanban_board_config" USING btree ("corretora_id","board_type");--> statement-breakpoint
CREATE INDEX "idx_kanban_custom_column_lookup" ON "kanban_custom_column" USING btree ("corretora_id","board_type");