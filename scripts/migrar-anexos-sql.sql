-- Script SQL para verificar anexos que precisam ser migrados
-- Execute este script primeiro para ver quantos anexos precisam ser corrigidos

-- 1. Verificar anexos de documentos_venda que ainda estão em cotacaos/
SELECT
  id,
  nome_original,
  entidade_tipo,
  entidade_id,
  r2_key,
  upload_em,
  corretora_id
FROM anexo
WHERE entidade_tipo = 'documento_venda'
  AND r2_key LIKE 'cotacaos/%'
  AND deleted_at IS NULL
ORDER BY upload_em DESC;

-- 2. Contagem total
SELECT COUNT(*) as total_anexos_para_migrar
FROM anexo
WHERE entidade_tipo = 'documento_venda'
  AND r2_key LIKE 'cotacaos/%'
  AND deleted_at IS NULL;
