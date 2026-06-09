INSERT INTO "permissao_global" ("nome_permissao", "descricao", "grupo") VALUES
  ('workspace:visualizar_planilha_equipe', 'Visualizar Planilha de Renovações da Equipe', 'workspace')
ON CONFLICT ("nome_permissao") DO NOTHING;
