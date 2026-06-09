-- ============================================================================
-- Corrige cotações "roubadas" pelo bug de sincronização atuante↔vendedor
-- ============================================================================
-- Contexto:
-- A rota PATCH /cotacoes/:id (bloco linhas 977-983, antes da correção) trocava
-- atuanteId = data.vendedorId quando atuante era igual ao vendedor anterior.
-- Resultado: quando alguém que não era o vendedor original iniciava/editava
-- uma renovação, a cotação ficava com vendedor=atuante=usuario_atual, mesmo
-- que a renovação tivesse outro vendedor (o dono legítimo da carteira).
--
-- Este script:
--   1) Identifica cotações EM_ELABORACAO onde a renovação vinculada tem
--      vendedor diferente do vendedor atual da cotação.
--   2) Classifica em "SUSPEITA_ROUBO" (vendedor=atuante, não é o da renovação)
--      vs "transferida" (vendedor_original_id preenchido na renovação) vs
--      "outro" (split legítimo).
--   3) Para as SUSPEITAS_ROUBO, restaura o vendedor_id ao da renovação.
--      O atuanteId fica como está — preserva quem iniciou a operação.
--
-- RODE PRIMEIRO A SEÇÃO 1 (SELECT) PARA REVISAR ANTES DE APLICAR.
-- ============================================================================

-- ============================================================================
-- SEÇÃO 1 — Revisão (apenas SELECT, seguro)
-- ============================================================================

SELECT
  c.id,
  c.numero_cotacao,
  c.vendedor_id   AS cot_vendedor,
  c.atuante_id    AS cot_atuante,
  r.vendedor_id   AS renov_vendedor,
  r.vendedor_original_id,
  CASE
    WHEN r.vendedor_original_id IS NOT NULL
      THEN 'transferida'       -- renovação foi transferida; conferir manualmente
    WHEN c.atuante_id = c.vendedor_id
     AND c.atuante_id IS DISTINCT FROM r.vendedor_id
      THEN 'SUSPEITA_ROUBO'    -- elegível para correção automática abaixo
    ELSE 'outro'               -- split legítimo (vendedor != atuante por escolha)
  END AS tipo,
  c.created_at,
  c.updated_at
FROM cotacao c
JOIN renovacao_comercial r
  ON r.id::text = c.detalhes_risco->>'renovacaoId'
WHERE c.deleted_at IS NULL
  AND c.status      = 'EM_ELABORACAO'
  AND r.vendedor_id IS DISTINCT FROM c.vendedor_id
ORDER BY tipo, c.created_at DESC;

-- ============================================================================
-- SEÇÃO 2 — Correção (DESCOMENTAR para aplicar)
-- ============================================================================
-- Restaura vendedor_id ao da renovação nas cotações SUSPEITA_ROUBO.
-- atuante_id é preservado: quem iniciou a operação continua com acesso
-- (e o vendedor original volta a ter acesso via fix do requireOwnership).

-- BEGIN;
--
-- WITH alvo AS (
--   SELECT c.id, r.vendedor_id AS vendedor_correto
--   FROM cotacao c
--   JOIN renovacao_comercial r
--     ON r.id::text = c.detalhes_risco->>'renovacaoId'
--   WHERE c.deleted_at IS NULL
--     AND c.status      = 'EM_ELABORACAO'
--     AND c.atuante_id  = c.vendedor_id
--     AND c.atuante_id IS DISTINCT FROM r.vendedor_id
--     AND r.vendedor_original_id IS NULL
-- )
-- UPDATE cotacao c
-- SET vendedor_id = alvo.vendedor_correto,
--     updated_at  = now()
-- FROM alvo
-- WHERE c.id = alvo.id
-- RETURNING c.id, c.numero_cotacao, c.vendedor_id, c.atuante_id;
--
-- -- Confira o RETURNING. Se OK:
-- COMMIT;
-- -- Se NÃO OK:
-- -- ROLLBACK;

-- ============================================================================
-- SEÇÃO 3 — Cotações "transferidas" fora de sincronia (revisão manual)
-- ============================================================================
-- Quando uma renovação é transferida, a rotina de transferência atualiza as
-- cotações EM_ELABORACAO vinculadas. Se alguma ficou fora, inspecionar aqui.

SELECT
  c.id,
  c.numero_cotacao,
  c.vendedor_id,
  c.atuante_id,
  r.vendedor_id          AS renov_vendedor_atual,
  r.vendedor_original_id AS renov_vendedor_original,
  r.transferida_em,
  r.transferida_por_id
FROM cotacao c
JOIN renovacao_comercial r
  ON r.id::text = c.detalhes_risco->>'renovacaoId'
WHERE c.deleted_at IS NULL
  AND c.status      = 'EM_ELABORACAO'
  AND r.vendedor_original_id IS NOT NULL
  AND c.vendedor_id IS DISTINCT FROM r.vendedor_id;
