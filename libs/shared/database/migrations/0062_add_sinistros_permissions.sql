INSERT INTO "permissao_global" ("nome_permissao", "descricao", "grupo") VALUES
  ('sinistros:visualizar', 'Visualizar sinistros próprios', 'sinistros'),
  ('sinistros:criar', 'Abrir e gerenciar sinistros', 'sinistros'),
  ('sinistros:visualizar_todos', 'Visualizar todos os sinistros da corretora', 'sinistros'),
  ('sinistros:analisar', 'Analisar e movimentar sinistros em análise', 'sinistros'),
  ('sinistros:aprovar', 'Aprovar, recusar e registrar pagamento de sinistros', 'sinistros')
ON CONFLICT ("nome_permissao") DO NOTHING;
