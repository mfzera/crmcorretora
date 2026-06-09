ALTER TABLE "cliente" DROP CONSTRAINT "check_tipo_pessoa";--> statement-breakpoint
ALTER TABLE "cliente" ADD CONSTRAINT "check_tipo_pessoa" CHECK ((tipo_pessoa = 'PF' AND (cpf IS NOT NULL OR deleted_at IS NOT NULL)) OR (tipo_pessoa = 'PJ' AND (cnpj IS NOT NULL OR deleted_at IS NOT NULL)));
