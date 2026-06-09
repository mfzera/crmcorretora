INSERT INTO "permissao_global" ("nome_permissao", "descricao", "grupo") VALUES
  ('sinistros:indicar', 'Indicar ocorrência de sinistro em apólices vinculadas ao usuário', 'sinistros')
ON CONFLICT ("nome_permissao") DO NOTHING;
