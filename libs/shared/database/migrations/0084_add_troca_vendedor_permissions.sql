INSERT INTO "permissao_global" ("nome_permissao", "descricao", "grupo") VALUES
  ('vendas:solicitar_troca_vendedor', 'Solicitar troca de vendedor em documento de venda', 'vendas'),
  ('vendas:aprovar_troca_vendedor', 'Aprovar ou recusar solicitação de troca de vendedor', 'vendas')
ON CONFLICT ("nome_permissao") DO NOTHING;
