ALTER TYPE "public"."tipo_evento_documento" ADD VALUE IF NOT EXISTS 'SOLICITACAO_CADASTRO';

INSERT INTO "permissao_global" ("nome_permissao", "descricao", "grupo") VALUES
  ('workspace:visualizar_planilha', 'Visualizar Planilha de Renovações', 'workspace')
ON CONFLICT ("nome_permissao") DO NOTHING;