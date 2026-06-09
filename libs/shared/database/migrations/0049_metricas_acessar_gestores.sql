-- Concede a permissão metricas:acessar a todos os cargos com isGestor = true
-- que ainda não possuem esse mapeamento em cargo_permissao.
-- Idempotente: ON CONFLICT / NOT EXISTS garante execução segura múltiplas vezes.
INSERT INTO cargo_permissao (id, cargo_id, permissao_global_id)
SELECT
  gen_random_uuid(),
  c.id,
  pg.id
FROM cargo c
CROSS JOIN permissao_global pg
WHERE c.is_gestor = true
  AND pg.nome_permissao = 'metricas:acessar'
  AND NOT EXISTS (
    SELECT 1 FROM cargo_permissao cp
    WHERE cp.cargo_id = c.id AND cp.permissao_global_id = pg.id
  );
