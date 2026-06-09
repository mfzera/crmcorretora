CREATE TABLE IF NOT EXISTS "solicitacao_troca_vendedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"documento_venda_id" uuid NOT NULL,
	"solicitante_id" uuid NOT NULL,
	"vendedor_atual_id" uuid NOT NULL,
	"novo_vendedor_id" uuid NOT NULL,
	"tipo_vendedor" text NOT NULL,
	"motivo" text NOT NULL,
	"status" text DEFAULT 'PENDENTE' NOT NULL,
	"aprovado_por_id" uuid,
	"motivo_recusa" text,
	"data_aprovacao" timestamp with time zone,
	"data_recusa" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'solicitacao_troca_vendedor'
      AND column_name = 'criado_em'
  ) THEN
    ALTER TABLE "solicitacao_troca_vendedor" RENAME COLUMN "criado_em" TO "created_at";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "solicitacao_troca_vendedor" ALTER COLUMN "data_aprovacao" TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "solicitacao_troca_vendedor" ALTER COLUMN "data_recusa" TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "solicitacao_troca_vendedor" ALTER COLUMN "created_at" TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "solicitacao_troca_vendedor" ALTER COLUMN "updated_at" TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "solicitacao_exclusao_venda" ALTER COLUMN "respondido_em" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "solicitacao_exclusao_venda" ALTER COLUMN "criado_em" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "solicitacao_exclusao_venda" ALTER COLUMN "criado_em" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "solicitacao_exclusao_venda" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "solicitacao_exclusao_venda" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'solicitacao_troca_vendedor_corretora_id_corretora_id_fk') THEN
    ALTER TABLE "solicitacao_troca_vendedor" ADD CONSTRAINT "solicitacao_troca_vendedor_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'solicitacao_troca_vendedor_documento_venda_id_documento_venda_id_fk') THEN
    ALTER TABLE "solicitacao_troca_vendedor" ADD CONSTRAINT "solicitacao_troca_vendedor_documento_venda_id_documento_venda_id_fk" FOREIGN KEY ("documento_venda_id") REFERENCES "public"."documento_venda"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'solicitacao_troca_vendedor_solicitante_id_usuario_id_fk') THEN
    ALTER TABLE "solicitacao_troca_vendedor" ADD CONSTRAINT "solicitacao_troca_vendedor_solicitante_id_usuario_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'solicitacao_troca_vendedor_vendedor_atual_id_usuario_id_fk') THEN
    ALTER TABLE "solicitacao_troca_vendedor" ADD CONSTRAINT "solicitacao_troca_vendedor_vendedor_atual_id_usuario_id_fk" FOREIGN KEY ("vendedor_atual_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'solicitacao_troca_vendedor_novo_vendedor_id_usuario_id_fk') THEN
    ALTER TABLE "solicitacao_troca_vendedor" ADD CONSTRAINT "solicitacao_troca_vendedor_novo_vendedor_id_usuario_id_fk" FOREIGN KEY ("novo_vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'solicitacao_troca_vendedor_aprovado_por_id_usuario_id_fk') THEN
    ALTER TABLE "solicitacao_troca_vendedor" ADD CONSTRAINT "solicitacao_troca_vendedor_aprovado_por_id_usuario_id_fk" FOREIGN KEY ("aprovado_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
