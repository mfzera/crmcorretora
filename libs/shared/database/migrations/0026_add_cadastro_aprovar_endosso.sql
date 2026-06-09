INSERT INTO "permissao_global" ("id", "nome_permissao", "descricao", "grupo")
VALUES (gen_random_uuid(), 'cadastro:aprovar_endosso', 'Aprovar e recusar endossos', 'cadastro')
ON CONFLICT ("nome_permissao") DO NOTHING;
