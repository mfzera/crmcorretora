CREATE TYPE "public"."oportunidade_prioridade" AS ENUM('baixa', 'media', 'alta', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."oportunidade_status" AS ENUM('lead', 'contato_inicial', 'negociacao', 'ganha', 'perdida');--> statement-breakpoint
CREATE TYPE "public"."oportunidade_temperatura" AS ENUM('frio', 'morno', 'quente');--> statement-breakpoint
CREATE TYPE "public"."status_cotacao" AS ENUM('EM_ELABORACAO', 'PERDIDA', 'EXPIRADA', 'CONVERTIDA');--> statement-breakpoint
CREATE TYPE "public"."status_documento_venda" AS ENUM('EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE', 'AGUARDANDO_APROVACAO', 'VENDA_CONFIRMADA', 'AGUARDANDO_CADASTRO', 'ATIVO', 'ARQUIVADO', 'CANCELADO', 'PERDIDO');--> statement-breakpoint
CREATE TYPE "public"."status_endosso" AS ENUM('SOLICITADO', 'APROVADO', 'RECUSADO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."status_proposta" AS ENUM('AGUARDANDO_ENVIO', 'ENVIADA', 'EM_ANALISE', 'PENDENTE_DOCUMENTACAO', 'APROVADA', 'APROVADA_CONDICIONAL', 'RECUSADA', 'CANCELADA', 'VENDA_CONFIRMADA');--> statement-breakpoint
CREATE TYPE "public"."status_renovacao" AS ENUM('NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE', 'RENOVADO', 'PERDIDO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento_venda" AS ENUM('COTACAO_DIRETA', 'PROPOSTA_FORMAL', 'VENDA_EXPRESSA', 'COTACAO_PERDIDA');--> statement-breakpoint
CREATE TYPE "public"."tipo_endosso" AS ENUM('INCLUSAO_COBERTURA', 'EXCLUSAO_COBERTURA', 'ALTERACAO_VALOR', 'INCLUSAO_ITEM', 'EXCLUSAO_ITEM', 'ALTERACAO_DADOS', 'ALTERACAO_VIGENCIA', 'TRANSFERENCIA_SEGURADO', 'OUTROS');--> statement-breakpoint
CREATE TYPE "public"."tipo_evento_documento" AS ENUM('CRIACAO', 'ALTERACAO_STATUS', 'ALTERACAO_DADOS', 'APROVACAO_CADASTRO', 'REJEICAO_CADASTRO', 'CONFIRMACAO_VENDA', 'CANCELAMENTO', 'PERDA', 'CONFIRMACAO_PERDA', 'REJEICAO_PERDA', 'ENDOSSO_CRIADO', 'ENDOSSO_APROVADO', 'ANOTACAO');--> statement-breakpoint
CREATE TYPE "public"."tipo_pessoa" AS ENUM('PF', 'PJ');--> statement-breakpoint
CREATE TYPE "public"."tipo_canal" AS ENUM('geral', 'direto');--> statement-breakpoint
CREATE TYPE "public"."tipo_mensagem" AS ENUM('texto', 'sistema', 'arquivo', 'oportunidade');--> statement-breakpoint
CREATE TYPE "public"."entidade_tipo_anexo" AS ENUM('cotacao', 'documento_venda', 'mensagem_chat');--> statement-breakpoint
CREATE TYPE "public"."status_backup" AS ENUM('em_progresso', 'concluido', 'falhou');--> statement-breakpoint
CREATE TYPE "public"."tipo_backup" AS ENUM('incremental', 'completo');--> statement-breakpoint
CREATE TYPE "public"."tipo_mudanca" AS ENUM('feature', 'bugfix', 'improvement', 'breaking', 'security', 'documentation');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"acao" varchar(100) NOT NULL,
	"entidade_tipo" varchar(50),
	"entidade_id" uuid,
	"detalhes" jsonb,
	"ip" varchar(45),
	"user_agent" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"senha" varchar(255) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"permissoes" jsonb DEFAULT '[]' NOT NULL,
	"ativo" boolean DEFAULT true,
	"ultimo_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "backup_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid,
	"tipo" "tipo_backup" NOT NULL,
	"cron_expression" varchar(100) NOT NULL,
	"ativo" boolean DEFAULT true,
	"proxima_execucao" timestamp with time zone,
	"ultima_execucao" timestamp with time zone,
	"ultimo_backup_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_por_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "backup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_backup" NOT NULL,
	"corretora_id" uuid,
	"status" "status_backup" DEFAULT 'em_progresso' NOT NULL,
	"total_arquivos" integer DEFAULT 0,
	"total_bytes" bigint DEFAULT 0,
	"arquivos_novos" integer DEFAULT 0,
	"arquivos_modificados" integer DEFAULT 0,
	"backup_bucket" varchar(100) DEFAULT 'ecotech-backups' NOT NULL,
	"backup_prefix" varchar(512) NOT NULL,
	"checksum_md5" varchar(32),
	"verificado" boolean DEFAULT false,
	"verificado_em" timestamp with time zone,
	"iniciado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"finalizado_em" timestamp with time zone,
	"duracao_segundos" integer,
	"iniciado_por_id" uuid,
	"logs" jsonb DEFAULT '[]',
	"erro" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "changelog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"changelog_id" uuid NOT NULL,
	"type" "tipo_mudanca" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"order" text DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "changelogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"release_date" timestamp with time zone NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"published_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "changelogs_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "storage_limit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"limite_bytes" bigint,
	"limite_arquivos" integer,
	"limite_bytes_cotacoes" bigint,
	"limite_bytes_documentos" bigint,
	"limite_bytes_chat" bigint,
	"alertas_ativos" boolean DEFAULT true NOT NULL,
	"alertar_em" numeric(5, 2) DEFAULT '80.00' NOT NULL,
	"bloquear_upload_em" numeric(5, 2) DEFAULT '95.00' NOT NULL,
	"emails_alerta" jsonb DEFAULT '[]',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_por_id" uuid,
	CONSTRAINT "storage_limit_corretora_id_unique" UNIQUE("corretora_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "storage_metric" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"data" date NOT NULL,
	"total_arquivos" integer DEFAULT 0 NOT NULL,
	"total_bytes" bigint DEFAULT 0 NOT NULL,
	"total_bytes_cotacoes" bigint DEFAULT 0 NOT NULL,
	"total_bytes_documentos" bigint DEFAULT 0 NOT NULL,
	"total_bytes_chat" bigint DEFAULT 0 NOT NULL,
	"arquivos_adicionados" integer DEFAULT 0 NOT NULL,
	"arquivos_removidos" integer DEFAULT 0 NOT NULL,
	"bytes_adicionados" bigint DEFAULT 0 NOT NULL,
	"bytes_removidos" bigint DEFAULT 0 NOT NULL,
	"custo_estimado_mensal" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unq_storage_metric_data" UNIQUE("corretora_id","data")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oportunidade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"cliente_id" uuid,
	"nome_cliente" varchar(255) NOT NULL,
	"email_cliente" varchar(255),
	"telefone_cliente" varchar(50),
	"vendedor_id" uuid NOT NULL,
	"vendedor_original_id" uuid NOT NULL,
	"status" "oportunidade_status" DEFAULT 'lead' NOT NULL,
	"prioridade" "oportunidade_prioridade" DEFAULT 'media' NOT NULL,
	"temperatura" "oportunidade_temperatura" DEFAULT 'morno' NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"premio_estimado" numeric(15, 2),
	"valor_fechado" numeric(15, 2),
	"numero_proposta" varchar(100),
	"observacoes_proposta" text,
	"data_vencimento" timestamp with time zone,
	"data_fechamento" timestamp with time zone,
	"data_ultimo_contato" timestamp with time zone,
	"motivo_perda" varchar(100),
	"detalhes_perda" text,
	"observacoes" text,
	"tags" jsonb,
	"origem" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oportunidade_transferencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oportunidade_id" uuid NOT NULL,
	"vendedor_origem_id" uuid NOT NULL,
	"vendedor_destino_id" uuid NOT NULL,
	"motivo" text,
	"transferido_por_id" uuid NOT NULL,
	"data_transferencia" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plano" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome_plano" varchar(100) NOT NULL,
	"descricao" text,
	"limite_usuarios" integer,
	"limite_vendedores" integer,
	"limite_clientes" integer,
	"limite_vendas_mes" integer,
	"valor_mensal" numeric(10, 2) NOT NULL,
	"valor_anual" numeric(10, 2),
	"modelo_precificacao" varchar(50) DEFAULT 'FIXED',
	"valor_base" numeric(10, 2),
	"seats_inclusos" integer DEFAULT 3,
	"valor_por_seat" numeric(10, 2),
	"stripe_product_id" varchar(255),
	"stripe_base_price_id" varchar(255),
	"stripe_seat_price_id" varchar(255),
	"features" jsonb,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "plano_nome_plano_unique" UNIQUE("nome_plano")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corretora" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plano_id" uuid NOT NULL,
	"razao_social" varchar(256) NOT NULL,
	"nome_fantasia" varchar(256),
	"cnpj" varchar(14) NOT NULL,
	"subdominio" varchar(100) NOT NULL,
	"email_contato" varchar(256),
	"telefone" varchar(20),
	"cep" varchar(8),
	"logradouro" varchar(256),
	"numero" varchar(20),
	"complemento" varchar(100),
	"bairro" varchar(100),
	"cidade" varchar(100),
	"uf" varchar(2),
	"status" varchar(50) DEFAULT 'ATIVO',
	"data_inicio_trial" timestamp with time zone,
	"data_fim_trial" timestamp with time zone,
	"logo_url" varchar(1024),
	"cores_tema" jsonb,
	"config_crm" jsonb,
	"usuarios_ativos" integer DEFAULT 0,
	"vendedores_ativos" integer DEFAULT 0,
	"clientes_cadastrados" integer DEFAULT 0,
	"vendas_mes_atual" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "corretora_cnpj_unique" UNIQUE("cnpj"),
	CONSTRAINT "corretora_subdominio_unique" UNIQUE("subdominio")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auditoria_permissao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"cargo_id" uuid,
	"acao" varchar(100) NOT NULL,
	"permissao_global_id" uuid,
	"metadados" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cargo_permissao" (
	"cargo_id" uuid NOT NULL,
	"permissao_global_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cargo_permissao_cargo_id_permissao_global_id_pk" PRIMARY KEY("cargo_id","permissao_global_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissao_global" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome_permissao" varchar(100) NOT NULL,
	"descricao" text,
	"grupo" varchar(50),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "permissao_global_nome_permissao_unique" UNIQUE("nome_permissao")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"plano_id" uuid NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_base_item_id" varchar(255),
	"stripe_seat_item_id" varchar(255),
	"status" varchar(50) NOT NULL,
	"seats_included" integer DEFAULT 3,
	"seats_used" integer DEFAULT 0,
	"seats_additional" integer DEFAULT 0,
	"base_price" numeric(10, 2) NOT NULL,
	"price_per_seat" numeric(10, 2) NOT NULL,
	"total_monthly" numeric(15, 2),
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"trial_start" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "subscription_corretora_id_unique" UNIQUE("corretora_id"),
	CONSTRAINT "subscription_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"subscription_id" uuid,
	"stripe_invoice_id" varchar(255),
	"stripe_payment_intent_id" varchar(255),
	"numero" varchar(50),
	"status" varchar(50) NOT NULL,
	"subtotal" numeric(15, 2),
	"desconto" numeric(15, 2) DEFAULT '0',
	"total" numeric(15, 2) NOT NULL,
	"seats_included" integer,
	"seats_additional" integer,
	"base_price" numeric(10, 2),
	"seat_price" numeric(10, 2),
	"period_start" date,
	"period_end" date,
	"due_date" date,
	"paid_at" timestamp with time zone,
	"invoice_pdf_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "invoice_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seat_usage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"subscription_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"usuario_id" uuid,
	"usuario_email" varchar(255),
	"seats_used_before" integer,
	"seats_used_after" integer,
	"monthly_cost_before" numeric(15, 2),
	"monthly_cost_after" numeric(15, 2),
	"registered_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cargo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"nome_cargo" varchar(100) NOT NULL,
	"descricao" text,
	"cor" varchar(7),
	"is_admin" boolean DEFAULT false,
	"is_gestor" boolean DEFAULT false,
	"is_vendedor" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "unq_corretora_cargo" UNIQUE("corretora_id","nome_cargo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cargo_template_permissao" (
	"template_id" uuid NOT NULL,
	"permissao_global_id" uuid NOT NULL,
	CONSTRAINT "cargo_template_permissao_template_id_permissao_global_id_pk" PRIMARY KEY("template_id","permissao_global_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cargo_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome_template" varchar(100) NOT NULL,
	"descricao" text,
	"cor" varchar(7),
	"is_admin" boolean DEFAULT false,
	"is_gestor" boolean DEFAULT false,
	"is_vendedor" boolean DEFAULT false,
	"categoria" varchar(50),
	"ordem" integer DEFAULT 0,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cargo_template_nome_template_unique" UNIQUE("nome_template")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "equipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"nome" varchar(256) NOT NULL,
	"gestor_id" uuid,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "unq_corretora_equipe" UNIQUE("corretora_id","nome")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"cargo_id" uuid,
	"equipe_id" uuid,
	"gestor_id" uuid,
	"nome" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"telefone" varchar(20),
	"avatar_url" varchar(1024),
	"avatar_r2_key" varchar(512),
	"ativo" boolean DEFAULT true,
	"primeiro_acesso" boolean DEFAULT true,
	"ultimo_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "unq_corretora_email" UNIQUE("corretora_id","email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "produto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"seguradora_parceira_id" uuid,
	"nome_produto" varchar(256) NOT NULL,
	"descricao" text,
	"tipo_seguro" varchar(100) NOT NULL,
	"premio_minimo" numeric(15, 2),
	"premio_maximo" numeric(15, 2),
	"percentual_comissao_padrao" numeric(5, 2),
	"ativo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "unq_corretora_produto" UNIQUE("corretora_id","nome_produto")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cliente_contato" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"valor" varchar(256) NOT NULL,
	"principal" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cliente_endereco" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"cep" varchar(8),
	"logradouro" varchar(256),
	"numero" varchar(20),
	"complemento" varchar(100),
	"bairro" varchar(100),
	"cidade" varchar(100),
	"uf" varchar(2),
	"principal" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"tipo_pessoa" "tipo_pessoa" DEFAULT 'PF' NOT NULL,
	"nome" varchar(256),
	"cpf" varchar(11),
	"data_nascimento" date,
	"razao_social" varchar(256),
	"nome_fantasia" varchar(256),
	"cnpj" varchar(14),
	"email" varchar(256),
	"telefone" varchar(255),
	"celular" varchar(255),
	"vendedor_id" uuid NOT NULL,
	"vendedor_original_id" uuid,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "check_tipo_pessoa" CHECK (("cliente"."tipo_pessoa" = 'PF' AND "cliente"."cpf" IS NOT NULL) OR ("cliente"."tipo_pessoa" = 'PJ' AND "cliente"."cnpj" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seguradoras_parceiras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"cnpj" varchar(18) NOT NULL,
	"razao_social" varchar(255) NOT NULL,
	"nome_fantasia" varchar(255),
	"telefone" varchar(20),
	"email" varchar(255),
	"status" varchar(20) DEFAULT 'ATIVA' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cotacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"produto_id" uuid NOT NULL,
	"seguradora_parceira_id" uuid,
	"numero_cotacao" varchar(50) NOT NULL,
	"status" "status_cotacao" DEFAULT 'EM_ELABORACAO' NOT NULL,
	"vigencia_inicio" date NOT NULL,
	"vigencia_fim" date NOT NULL,
	"premio_estimado" numeric(15, 2),
	"premio_liquido" numeric(15, 2),
	"percentual_comissao" numeric(5, 2),
	"valor_comissao" numeric(15, 2),
	"vendedor_secundario_id" uuid,
	"percentual_comissao_principal" numeric(5, 2),
	"percentual_comissao_secundario" numeric(5, 2),
	"valor_comissao_principal" numeric(15, 2),
	"valor_comissao_secundario" numeric(15, 2),
	"negocio_corretora" boolean DEFAULT false,
	"percentual_corretora" numeric(5, 2),
	"valor_comissao_corretora" numeric(15, 2),
	"situacao" varchar(20) DEFAULT 'NOVO' NOT NULL,
	"item_descricao" varchar(500),
	"coberturas" jsonb,
	"detalhes_risco" jsonb,
	"data_validade" date NOT NULL,
	"documento_venda_id" uuid,
	"motivo_perda" varchar(100),
	"detalhes_perda" text,
	"concorrente_ganhou" varchar(255),
	"data_marcada_perdida" timestamp with time zone,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "unq_cotacao_numero" UNIQUE("corretora_id","numero_cotacao")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cotacao_vendedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cotacao_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"data_atribuicao" timestamp with time zone DEFAULT now() NOT NULL,
	"atribuido_por" uuid,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposta_comercial" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"cotacao_id" uuid,
	"cliente_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"produto_id" uuid NOT NULL,
	"seguradora_parceira_id" uuid,
	"numero_proposta_interno" varchar(50) NOT NULL,
	"numero_proposta_externo" varchar(100),
	"status" "status_proposta" DEFAULT 'AGUARDANDO_ENVIO' NOT NULL,
	"vigencia_inicio" date NOT NULL,
	"vigencia_fim" date NOT NULL,
	"premio_liquido" numeric(15, 2),
	"percentual_comissao" numeric(5, 2),
	"valor_comissao" numeric(15, 2),
	"coberturas" jsonb,
	"data_envio" timestamp with time zone,
	"data_resposta" timestamp with time zone,
	"data_aprovacao" timestamp with time zone,
	"data_recusa" timestamp with time zone,
	"motivo_recusa" varchar(100),
	"detalhes_recusa" text,
	"documento_venda_id" uuid,
	"observacoes" text,
	"anexos" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "unq_proposta_numero" UNIQUE("corretora_id","numero_proposta_interno")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documento_venda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"produto_id" uuid NOT NULL,
	"seguradora_parceira_id" uuid,
	"numero_documento" varchar(100) NOT NULL,
	"tipo_documento" "tipo_documento_venda" NOT NULL,
	"status" "status_documento_venda" DEFAULT 'EM_NEGOCIACAO' NOT NULL,
	"numero_proposta_externa" varchar(100),
	"numero_apolice_externa" varchar(100),
	"numero_sistema_legado" varchar(100),
	"vigencia_inicio" date NOT NULL,
	"vigencia_fim" date NOT NULL,
	"moeda" varchar(3) DEFAULT 'BRL',
	"premio_liquido" numeric(15, 2),
	"percentual_comissao" numeric(5, 2),
	"valor_comissao" numeric(15, 2),
	"negocio_corretora" boolean DEFAULT false,
	"percentual_corretora" numeric(5, 2),
	"valor_comissao_corretora" numeric(15, 2),
	"coberturas" jsonb,
	"franquia" numeric(15, 2),
	"valor_segurado" numeric(15, 2),
	"data_solicitacao_cadastro" timestamp with time zone,
	"data_aprovacao_cadastro" timestamp with time zone,
	"aprovado_por_id" uuid,
	"data_rejeicao_cadastro" timestamp with time zone,
	"rejeitado_por_id" uuid,
	"motivo_rejeicao" text,
	"data_cancelamento" timestamp with time zone,
	"motivo_cancelamento" text,
	"cancelado_por_id" uuid,
	"data_perda" timestamp with time zone,
	"motivo_perda" varchar(50),
	"concorrente_ganhou" varchar(255),
	"detalhes_perda" text,
	"locked_by_id" uuid,
	"locked_at" timestamp with time zone,
	"lock_expires_at" timestamp with time zone,
	"observacoes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "unq_documento_numero" UNIQUE("corretora_id","numero_documento")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "historico_documento_venda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documento_venda_id" uuid NOT NULL,
	"tipo_evento" "tipo_evento_documento" NOT NULL,
	"usuario_id" uuid,
	"usuario_nome" varchar(255),
	"status_anterior" "status_documento_venda",
	"status_novo" "status_documento_venda",
	"descricao" text NOT NULL,
	"dados_alterados" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "endosso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"documento_venda_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"tipo_endosso" "tipo_endosso" NOT NULL,
	"numero_endosso" varchar(50) NOT NULL,
	"numero_endosso_externo" varchar(100),
	"status" "status_endosso" DEFAULT 'SOLICITADO' NOT NULL,
	"descricao" text NOT NULL,
	"motivo_endosso" text,
	"premio_anterior" numeric(15, 2),
	"premio_novo" numeric(15, 2),
	"diferenca_premio" numeric(15, 2),
	"percentual_comissao_anterior" numeric(5, 2),
	"percentual_comissao_novo" numeric(5, 2),
	"diferenca_comissao" numeric(15, 2),
	"alteracoes" jsonb,
	"data_vigencia_endosso" date NOT NULL,
	"data_solicitacao" timestamp with time zone DEFAULT now() NOT NULL,
	"data_validacao" timestamp with time zone,
	"data_aprovacao" timestamp with time zone,
	"data_recusa" timestamp with time zone,
	"data_emissao" timestamp with time zone,
	"validado_por_id" uuid,
	"aprovado_por_id" uuid,
	"emitido_por_id" uuid,
	"motivo_recusa" text,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "unq_endosso_numero" UNIQUE("corretora_id","numero_endosso")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "renovacao_comercial" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"documento_venda_anterior_id" uuid,
	"cliente_id" uuid,
	"item_descricao" varchar(500),
	"produto_descricao" varchar(255),
	"seguradora_anterior" varchar(255),
	"documento_venda_novo_id" uuid,
	"vendedor_id" uuid NOT NULL,
	"premio_anterior" numeric(15, 2),
	"percentual_comissao_anterior" numeric(5, 2),
	"valor_comissao_anterior" numeric(15, 2),
	"vendedor_secundario_anterior_id" uuid,
	"percentual_comissao_principal_anterior" numeric(5, 2),
	"percentual_comissao_secundario_anterior" numeric(5, 2),
	"valor_comissao_principal_anterior" numeric(15, 2),
	"valor_comissao_secundario_anterior" numeric(15, 2),
	"negocio_corretora_anterior" boolean DEFAULT false,
	"percentual_corretora_anterior" numeric(5, 2),
	"valor_comissao_corretora_anterior" numeric(15, 2),
	"premio_novo" numeric(15, 2),
	"percentual_comissao_novo" numeric(5, 2),
	"valor_comissao_novo" numeric(15, 2),
	"vendedor_secundario_novo_id" uuid,
	"percentual_comissao_principal_novo" numeric(5, 2),
	"percentual_comissao_secundario_novo" numeric(5, 2),
	"valor_comissao_principal_novo" numeric(15, 2),
	"valor_comissao_secundario_novo" numeric(15, 2),
	"negocio_corretora_novo" boolean DEFAULT false,
	"percentual_corretora_novo" numeric(5, 2),
	"valor_comissao_corretora_novo" numeric(15, 2),
	"status" "status_renovacao" DEFAULT 'NAO_TRABALHADO' NOT NULL,
	"data_vencimento" date NOT NULL,
	"nova_vigencia_inicio" date,
	"nova_vigencia_fim" date,
	"data_finalizacao" timestamp with time zone,
	"finalizado_por_id" uuid,
	"data_perda" timestamp with time zone,
	"motivo_perda" varchar(50),
	"concorrente_ganhou" varchar(255),
	"detalhes_perda" text,
	"data_cancelamento" timestamp with time zone,
	"motivo_cancelamento" text,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"usuario_id" uuid,
	"usuario_nome" varchar(255),
	"usuario_email" varchar(255),
	"acao" varchar(100) NOT NULL,
	"entidade" varchar(100),
	"entidade_id" uuid,
	"dados_anteriores" jsonb,
	"dados_novos" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notificacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"mensagem" text NOT NULL,
	"link_acao" varchar(512),
	"metadata" jsonb,
	"lida" boolean DEFAULT false NOT NULL,
	"lida_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "canal_chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"tipo" "tipo_canal" DEFAULT 'geral' NOT NULL,
	"nome" varchar(256),
	"descricao" text,
	"usuario_id_1" uuid,
	"usuario_id_2" uuid,
	"criado_por_id" uuid NOT NULL,
	"ativo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "unq_dm_usuarios" UNIQUE("usuario_id_1","usuario_id_2")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "canal_membro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canal_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"pode_enviar_mensagem" boolean DEFAULT true,
	"is_admin" boolean DEFAULT false,
	"adicionado_por_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unq_canal_usuario" UNIQUE("canal_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_digitando" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canal_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"iniciou_em" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unq_canal_usuario_digitando" UNIQUE("canal_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mensagem_chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canal_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" "tipo_mensagem" DEFAULT 'texto' NOT NULL,
	"conteudo" text NOT NULL,
	"metadata" jsonb,
	"arquivo_url" varchar(1024),
	"arquivo_nome" varchar(256),
	"arquivo_tipo" varchar(100),
	"resposta_para_id" uuid,
	"editado" boolean DEFAULT false,
	"editado_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mensagem_leitura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mensagem_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"lido_em" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unq_mensagem_usuario_leitura" UNIQUE("mensagem_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mensagem_mencao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mensagem_id" uuid NOT NULL,
	"usuario_mencionado_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unq_mensagem_usuario_mencao" UNIQUE("mensagem_id","usuario_mencionado_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mensagem_reacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mensagem_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unq_mensagem_usuario_emoji" UNIQUE("mensagem_id","usuario_id","emoji")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anexo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corretora_id" uuid NOT NULL,
	"entidade_tipo" "entidade_tipo_anexo" NOT NULL,
	"entidade_id" uuid NOT NULL,
	"nome_original" varchar(256) NOT NULL,
	"nome_arquivo" varchar(256) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"tamanho" bigint NOT NULL,
	"r2_key" varchar(512) NOT NULL,
	"r2_bucket" varchar(100) NOT NULL,
	"url_publica" varchar(1024),
	"versao" integer DEFAULT 1 NOT NULL,
	"arquivo_anterior_id" uuid,
	"texto_extraido" text,
	"metadados_extracao" jsonb,
	"upload_por_id" uuid NOT NULL,
	"upload_em" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_por_id" uuid
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "backup_schedule" ADD CONSTRAINT "backup_schedule_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "backup_schedule" ADD CONSTRAINT "backup_schedule_ultimo_backup_id_backup_id_fk" FOREIGN KEY ("ultimo_backup_id") REFERENCES "public"."backup"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "backup_schedule" ADD CONSTRAINT "backup_schedule_created_por_id_admin_id_fk" FOREIGN KEY ("created_por_id") REFERENCES "public"."admin"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "backup" ADD CONSTRAINT "backup_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "backup" ADD CONSTRAINT "backup_iniciado_por_id_admin_id_fk" FOREIGN KEY ("iniciado_por_id") REFERENCES "public"."admin"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "changelog_items" ADD CONSTRAINT "changelog_items_changelog_id_changelogs_id_fk" FOREIGN KEY ("changelog_id") REFERENCES "public"."changelogs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "storage_limit" ADD CONSTRAINT "storage_limit_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "storage_limit" ADD CONSTRAINT "storage_limit_updated_por_id_admin_id_fk" FOREIGN KEY ("updated_por_id") REFERENCES "public"."admin"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "storage_metric" ADD CONSTRAINT "storage_metric_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidade" ADD CONSTRAINT "oportunidade_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidade" ADD CONSTRAINT "oportunidade_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidade" ADD CONSTRAINT "oportunidade_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidade" ADD CONSTRAINT "oportunidade_vendedor_original_id_usuario_id_fk" FOREIGN KEY ("vendedor_original_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidade_transferencia" ADD CONSTRAINT "oportunidade_transferencia_oportunidade_id_oportunidade_id_fk" FOREIGN KEY ("oportunidade_id") REFERENCES "public"."oportunidade"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidade_transferencia" ADD CONSTRAINT "oportunidade_transferencia_vendedor_origem_id_usuario_id_fk" FOREIGN KEY ("vendedor_origem_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidade_transferencia" ADD CONSTRAINT "oportunidade_transferencia_vendedor_destino_id_usuario_id_fk" FOREIGN KEY ("vendedor_destino_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oportunidade_transferencia" ADD CONSTRAINT "oportunidade_transferencia_transferido_por_id_usuario_id_fk" FOREIGN KEY ("transferido_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "corretora" ADD CONSTRAINT "corretora_plano_id_plano_id_fk" FOREIGN KEY ("plano_id") REFERENCES "public"."plano"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auditoria_permissao" ADD CONSTRAINT "auditoria_permissao_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auditoria_permissao" ADD CONSTRAINT "auditoria_permissao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auditoria_permissao" ADD CONSTRAINT "auditoria_permissao_cargo_id_cargo_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargo"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auditoria_permissao" ADD CONSTRAINT "auditoria_permissao_permissao_global_id_permissao_global_id_fk" FOREIGN KEY ("permissao_global_id") REFERENCES "public"."permissao_global"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cargo_permissao" ADD CONSTRAINT "cargo_permissao_cargo_id_cargo_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cargo_permissao" ADD CONSTRAINT "cargo_permissao_permissao_global_id_permissao_global_id_fk" FOREIGN KEY ("permissao_global_id") REFERENCES "public"."permissao_global"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plano_id_plano_id_fk" FOREIGN KEY ("plano_id") REFERENCES "public"."plano"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice" ADD CONSTRAINT "invoice_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice" ADD CONSTRAINT "invoice_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seat_usage_history" ADD CONSTRAINT "seat_usage_history_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seat_usage_history" ADD CONSTRAINT "seat_usage_history_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seat_usage_history" ADD CONSTRAINT "seat_usage_history_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cargo" ADD CONSTRAINT "cargo_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cargo_template_permissao" ADD CONSTRAINT "cargo_template_permissao_template_id_cargo_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."cargo_template"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cargo_template_permissao" ADD CONSTRAINT "cargo_template_permissao_permissao_global_id_permissao_global_id_fk" FOREIGN KEY ("permissao_global_id") REFERENCES "public"."permissao_global"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "equipe" ADD CONSTRAINT "equipe_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usuario" ADD CONSTRAINT "usuario_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usuario" ADD CONSTRAINT "usuario_cargo_id_cargo_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargo"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usuario" ADD CONSTRAINT "usuario_equipe_id_equipe_id_fk" FOREIGN KEY ("equipe_id") REFERENCES "public"."equipe"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "produto" ADD CONSTRAINT "produto_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "produto" ADD CONSTRAINT "produto_seguradora_parceira_id_seguradoras_parceiras_id_fk" FOREIGN KEY ("seguradora_parceira_id") REFERENCES "public"."seguradoras_parceiras"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cliente_contato" ADD CONSTRAINT "cliente_contato_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cliente_endereco" ADD CONSTRAINT "cliente_endereco_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cliente" ADD CONSTRAINT "cliente_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cliente" ADD CONSTRAINT "cliente_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cliente" ADD CONSTRAINT "cliente_vendedor_original_id_usuario_id_fk" FOREIGN KEY ("vendedor_original_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seguradoras_parceiras" ADD CONSTRAINT "seguradoras_parceiras_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cotacao" ADD CONSTRAINT "cotacao_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cotacao" ADD CONSTRAINT "cotacao_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cotacao" ADD CONSTRAINT "cotacao_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cotacao" ADD CONSTRAINT "cotacao_produto_id_produto_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produto"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cotacao" ADD CONSTRAINT "cotacao_seguradora_parceira_id_seguradoras_parceiras_id_fk" FOREIGN KEY ("seguradora_parceira_id") REFERENCES "public"."seguradoras_parceiras"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cotacao" ADD CONSTRAINT "cotacao_vendedor_secundario_id_usuario_id_fk" FOREIGN KEY ("vendedor_secundario_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cotacao_vendedor" ADD CONSTRAINT "cotacao_vendedor_cotacao_id_cotacao_id_fk" FOREIGN KEY ("cotacao_id") REFERENCES "public"."cotacao"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cotacao_vendedor" ADD CONSTRAINT "cotacao_vendedor_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cotacao_vendedor" ADD CONSTRAINT "cotacao_vendedor_atribuido_por_usuario_id_fk" FOREIGN KEY ("atribuido_por") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposta_comercial" ADD CONSTRAINT "proposta_comercial_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposta_comercial" ADD CONSTRAINT "proposta_comercial_cotacao_id_cotacao_id_fk" FOREIGN KEY ("cotacao_id") REFERENCES "public"."cotacao"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposta_comercial" ADD CONSTRAINT "proposta_comercial_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposta_comercial" ADD CONSTRAINT "proposta_comercial_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposta_comercial" ADD CONSTRAINT "proposta_comercial_produto_id_produto_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produto"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposta_comercial" ADD CONSTRAINT "proposta_comercial_seguradora_parceira_id_seguradoras_parceiras_id_fk" FOREIGN KEY ("seguradora_parceira_id") REFERENCES "public"."seguradoras_parceiras"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_produto_id_produto_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produto"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_seguradora_parceira_id_seguradoras_parceiras_id_fk" FOREIGN KEY ("seguradora_parceira_id") REFERENCES "public"."seguradoras_parceiras"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_aprovado_por_id_usuario_id_fk" FOREIGN KEY ("aprovado_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_rejeitado_por_id_usuario_id_fk" FOREIGN KEY ("rejeitado_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_cancelado_por_id_usuario_id_fk" FOREIGN KEY ("cancelado_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_venda" ADD CONSTRAINT "documento_venda_locked_by_id_usuario_id_fk" FOREIGN KEY ("locked_by_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "historico_documento_venda" ADD CONSTRAINT "historico_documento_venda_documento_venda_id_documento_venda_id_fk" FOREIGN KEY ("documento_venda_id") REFERENCES "public"."documento_venda"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "historico_documento_venda" ADD CONSTRAINT "historico_documento_venda_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "endosso" ADD CONSTRAINT "endosso_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "endosso" ADD CONSTRAINT "endosso_documento_venda_id_documento_venda_id_fk" FOREIGN KEY ("documento_venda_id") REFERENCES "public"."documento_venda"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "endosso" ADD CONSTRAINT "endosso_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "endosso" ADD CONSTRAINT "endosso_validado_por_id_usuario_id_fk" FOREIGN KEY ("validado_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "endosso" ADD CONSTRAINT "endosso_aprovado_por_id_usuario_id_fk" FOREIGN KEY ("aprovado_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "endosso" ADD CONSTRAINT "endosso_emitido_por_id_usuario_id_fk" FOREIGN KEY ("emitido_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "renovacao_comercial" ADD CONSTRAINT "renovacao_comercial_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "renovacao_comercial" ADD CONSTRAINT "renovacao_comercial_documento_venda_anterior_id_documento_venda_id_fk" FOREIGN KEY ("documento_venda_anterior_id") REFERENCES "public"."documento_venda"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "renovacao_comercial" ADD CONSTRAINT "renovacao_comercial_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "renovacao_comercial" ADD CONSTRAINT "renovacao_comercial_documento_venda_novo_id_documento_venda_id_fk" FOREIGN KEY ("documento_venda_novo_id") REFERENCES "public"."documento_venda"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "renovacao_comercial" ADD CONSTRAINT "renovacao_comercial_vendedor_id_usuario_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "renovacao_comercial" ADD CONSTRAINT "renovacao_comercial_vendedor_secundario_anterior_id_usuario_id_fk" FOREIGN KEY ("vendedor_secundario_anterior_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "renovacao_comercial" ADD CONSTRAINT "renovacao_comercial_vendedor_secundario_novo_id_usuario_id_fk" FOREIGN KEY ("vendedor_secundario_novo_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "renovacao_comercial" ADD CONSTRAINT "renovacao_comercial_finalizado_por_id_usuario_id_fk" FOREIGN KEY ("finalizado_por_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "canal_chat" ADD CONSTRAINT "canal_chat_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "canal_chat" ADD CONSTRAINT "canal_chat_usuario_id_1_usuario_id_fk" FOREIGN KEY ("usuario_id_1") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "canal_chat" ADD CONSTRAINT "canal_chat_usuario_id_2_usuario_id_fk" FOREIGN KEY ("usuario_id_2") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "canal_chat" ADD CONSTRAINT "canal_chat_criado_por_id_usuario_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "canal_membro" ADD CONSTRAINT "canal_membro_canal_id_canal_chat_id_fk" FOREIGN KEY ("canal_id") REFERENCES "public"."canal_chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "canal_membro" ADD CONSTRAINT "canal_membro_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "canal_membro" ADD CONSTRAINT "canal_membro_adicionado_por_id_usuario_id_fk" FOREIGN KEY ("adicionado_por_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_digitando" ADD CONSTRAINT "chat_digitando_canal_id_canal_chat_id_fk" FOREIGN KEY ("canal_id") REFERENCES "public"."canal_chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_digitando" ADD CONSTRAINT "chat_digitando_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mensagem_chat" ADD CONSTRAINT "mensagem_chat_canal_id_canal_chat_id_fk" FOREIGN KEY ("canal_id") REFERENCES "public"."canal_chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mensagem_chat" ADD CONSTRAINT "mensagem_chat_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mensagem_leitura" ADD CONSTRAINT "mensagem_leitura_mensagem_id_mensagem_chat_id_fk" FOREIGN KEY ("mensagem_id") REFERENCES "public"."mensagem_chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mensagem_leitura" ADD CONSTRAINT "mensagem_leitura_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mensagem_mencao" ADD CONSTRAINT "mensagem_mencao_mensagem_id_mensagem_chat_id_fk" FOREIGN KEY ("mensagem_id") REFERENCES "public"."mensagem_chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mensagem_mencao" ADD CONSTRAINT "mensagem_mencao_usuario_mencionado_id_usuario_id_fk" FOREIGN KEY ("usuario_mencionado_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mensagem_reacao" ADD CONSTRAINT "mensagem_reacao_mensagem_id_mensagem_chat_id_fk" FOREIGN KEY ("mensagem_id") REFERENCES "public"."mensagem_chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mensagem_reacao" ADD CONSTRAINT "mensagem_reacao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anexo" ADD CONSTRAINT "anexo_corretora_id_corretora_id_fk" FOREIGN KEY ("corretora_id") REFERENCES "public"."corretora"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anexo" ADD CONSTRAINT "anexo_arquivo_anterior_id_anexo_id_fk" FOREIGN KEY ("arquivo_anterior_id") REFERENCES "public"."anexo"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anexo" ADD CONSTRAINT "anexo_upload_por_id_usuario_id_fk" FOREIGN KEY ("upload_por_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anexo" ADD CONSTRAINT "anexo_deleted_por_id_usuario_id_fk" FOREIGN KEY ("deleted_por_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_admin" ON "admin_audit_log" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_timestamp" ON "admin_audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_acao" ON "admin_audit_log" USING btree ("acao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_entidade" ON "admin_audit_log" USING btree ("entidade_tipo","entidade_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_email" ON "admin" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_backup_schedule_corretora" ON "backup_schedule" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_backup_schedule_proxima" ON "backup_schedule" USING btree ("proxima_execucao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_backup_schedule_ativo" ON "backup_schedule" USING btree ("ativo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_backup_corretora" ON "backup" USING btree ("corretora_id","tipo","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_backup_iniciado" ON "backup" USING btree ("iniciado_em");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_backup_status" ON "backup" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_backup_tipo" ON "backup" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_storage_limit_corretora" ON "storage_limit" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_storage_metric_corretora" ON "storage_metric" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_storage_metric_data" ON "storage_metric" USING btree ("data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oportunidade_corretora" ON "oportunidade" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oportunidade_vendedor" ON "oportunidade" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oportunidade_vendedor_original" ON "oportunidade" USING btree ("vendedor_original_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oportunidade_status" ON "oportunidade" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oportunidade_cliente" ON "oportunidade" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transferencia_oportunidade" ON "oportunidade_transferencia" USING btree ("oportunidade_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transferencia_vendedor_origem" ON "oportunidade_transferencia" USING btree ("vendedor_origem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transferencia_vendedor_destino" ON "oportunidade_transferencia" USING btree ("vendedor_destino_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transferencia_data" ON "oportunidade_transferencia" USING btree ("data_transferencia");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_corretora_cnpj" ON "corretora" USING btree ("cnpj");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_corretora_subdominio" ON "corretora" USING btree ("subdominio");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_corretora_status" ON "corretora" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auditoria_permissao_corretora" ON "auditoria_permissao" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auditoria_permissao_usuario" ON "auditoria_permissao" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auditoria_permissao_cargo" ON "auditoria_permissao" USING btree ("cargo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auditoria_permissao_acao" ON "auditoria_permissao" USING btree ("acao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auditoria_permissao_created_at" ON "auditoria_permissao" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cargo_permissao_cargo" ON "cargo_permissao" USING btree ("cargo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_corretora" ON "subscription" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_status" ON "subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_stripe_customer" ON "subscription" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscription_stripe_subscription" ON "subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoice_corretora" ON "invoice" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoice_subscription" ON "invoice" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoice_status" ON "invoice" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoice_stripe_id" ON "invoice" USING btree ("stripe_invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoice_due_date" ON "invoice" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seat_usage_corretora" ON "seat_usage_history" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seat_usage_subscription" ON "seat_usage_history" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seat_usage_event_type" ON "seat_usage_history" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seat_usage_usuario" ON "seat_usage_history" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seat_usage_created" ON "seat_usage_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cargo_corretora" ON "cargo" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cargo_template_permissao_template" ON "cargo_template_permissao" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cargo_template_categoria" ON "cargo_template" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cargo_template_ativo" ON "cargo_template" USING btree ("ativo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_equipe_corretora" ON "equipe" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_equipe_gestor" ON "equipe" USING btree ("gestor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usuario_corretora" ON "usuario" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usuario_cargo" ON "usuario" USING btree ("cargo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usuario_equipe" ON "usuario" USING btree ("equipe_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usuario_gestor" ON "usuario" USING btree ("gestor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usuario_email" ON "usuario" USING btree ("corretora_id","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_produto_corretora" ON "produto" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_produto_tipo" ON "produto" USING btree ("tipo_seguro");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_produtos_seguradora_parceira" ON "produto" USING btree ("seguradora_parceira_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cliente_contato_cliente" ON "cliente_contato" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cliente_endereco_cliente" ON "cliente_endereco" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cliente_corretora" ON "cliente" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cliente_vendedor" ON "cliente" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cliente_vendedor_original" ON "cliente" USING btree ("vendedor_original_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cliente_cpf" ON "cliente" USING btree ("corretora_id","cpf");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cliente_cnpj" ON "cliente" USING btree ("corretora_id","cnpj");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unq_cliente_cpf" ON "cliente" USING btree ("corretora_id","cpf") WHERE "cliente"."cpf" IS NOT NULL AND "cliente"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unq_cliente_cnpj" ON "cliente" USING btree ("corretora_id","cnpj") WHERE "cliente"."cnpj" IS NOT NULL AND "cliente"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seguradoras_parceiras_corretora" ON "seguradoras_parceiras" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seguradoras_parceiras_cnpj" ON "seguradoras_parceiras" USING btree ("cnpj");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seguradoras_parceiras_status" ON "seguradoras_parceiras" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cotacao_corretora" ON "cotacao" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cotacao_cliente" ON "cotacao" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cotacao_vendedor" ON "cotacao" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cotacao_status" ON "cotacao" USING btree ("corretora_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cotacao_vendedor_cotacao_ativo" ON "cotacao_vendedor" USING btree ("cotacao_id","ativo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cotacao_vendedor_historico" ON "cotacao_vendedor" USING btree ("cotacao_id","data_atribuicao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_proposta_corretora" ON "proposta_comercial" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_proposta_cliente" ON "proposta_comercial" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_proposta_vendedor" ON "proposta_comercial" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_proposta_status" ON "proposta_comercial" USING btree ("corretora_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documento_venda_corretora" ON "documento_venda" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documento_venda_cliente" ON "documento_venda" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documento_venda_vendedor" ON "documento_venda" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documento_venda_status" ON "documento_venda" USING btree ("corretora_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documento_venda_vigencia_fim" ON "documento_venda" USING btree ("vigencia_fim");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documento_venda_numero_apolice" ON "documento_venda" USING btree ("numero_apolice_externa");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documentos_venda_seguradora_parceira" ON "documento_venda" USING btree ("seguradora_parceira_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_historico_documento" ON "historico_documento_venda" USING btree ("documento_venda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_historico_created_at" ON "historico_documento_venda" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_endosso_corretora" ON "endosso" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_endosso_documento" ON "endosso" USING btree ("documento_venda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_endosso_vendedor" ON "endosso" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_endosso_status" ON "endosso" USING btree ("corretora_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_endosso_tipo" ON "endosso" USING btree ("tipo_endosso");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_renovacao_corretora" ON "renovacao_comercial" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_renovacao_vendedor" ON "renovacao_comercial" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_renovacao_vencimento" ON "renovacao_comercial" USING btree ("data_vencimento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_renovacao_status" ON "renovacao_comercial" USING btree ("corretora_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_renovacao_cliente" ON "renovacao_comercial" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_log_corretora" ON "audit_log" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_log_usuario" ON "audit_log" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_log_entidade" ON "audit_log" USING btree ("entidade","entidade_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_log_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notificacao_corretora" ON "notificacao" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notificacao_usuario" ON "notificacao" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notificacao_lida" ON "notificacao" USING btree ("lida");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notificacao_tipo" ON "notificacao" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notificacao_created" ON "notificacao" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_canal_corretora" ON "canal_chat" USING btree ("corretora_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_canal_tipo" ON "canal_chat" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_canal_usuario1" ON "canal_chat" USING btree ("usuario_id_1");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_canal_usuario2" ON "canal_chat" USING btree ("usuario_id_2");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_membro_canal" ON "canal_membro" USING btree ("canal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_membro_usuario" ON "canal_membro" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digitando_canal" ON "chat_digitando" USING btree ("canal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mensagem_canal" ON "mensagem_chat" USING btree ("canal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mensagem_usuario" ON "mensagem_chat" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mensagem_created" ON "mensagem_chat" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mensagem_resposta" ON "mensagem_chat" USING btree ("resposta_para_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_leitura_mensagem" ON "mensagem_leitura" USING btree ("mensagem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_leitura_usuario" ON "mensagem_leitura" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mencao_mensagem" ON "mensagem_mencao" USING btree ("mensagem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mencao_usuario" ON "mensagem_mencao" USING btree ("usuario_mencionado_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reacao_mensagem" ON "mensagem_reacao" USING btree ("mensagem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reacao_usuario" ON "mensagem_reacao" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_anexo_entidade" ON "anexo" USING btree ("corretora_id","entidade_tipo","entidade_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_anexo_r2key" ON "anexo" USING btree ("r2_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_anexo_upload_por" ON "anexo" USING btree ("upload_por_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_anexo_versao_anterior" ON "anexo" USING btree ("arquivo_anterior_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_anexo_deleted" ON "anexo" USING btree ("deleted_at");