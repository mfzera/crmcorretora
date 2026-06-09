-- Script SQL para limpar renovações bugadas
-- Execute este script no banco de dados para corrigir renovações com status incorreto

BEGIN;

-- 1. Atualizar renovações para RENOVADO quando o documento anterior está ATIVO
UPDATE renovacoes_comerciais rc
SET
  status = 'RENOVADO',
  data_finalizacao = NOW(),
  updated_at = NOW()
FROM documentos_venda dv
WHERE rc.documento_venda_anterior_id = dv.id
  AND dv.status = 'ATIVO'
  AND rc.status IN ('NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE');

-- 2. Marcar como PERDIDO renovações vencidas há mais de 30 dias
UPDATE renovacoes_comerciais
SET
  status = 'PERDIDO',
  motivo_perda = 'Renovação não trabalhada dentro do prazo',
  data_perda = NOW(),
  updated_at = NOW()
WHERE status IN ('NAO_TRABALHADO', 'EM_PROSPECCAO', 'EM_NEGOCIACAO', 'AGUARDANDO_CLIENTE')
  AND data_vencimento < (CURRENT_DATE - INTERVAL '30 days');

-- 3. Mostrar resumo das alterações
SELECT
  'Renovações marcadas como RENOVADO' as tipo,
  COUNT(*) as total
FROM renovacoes_comerciais rc
JOIN documentos_venda dv ON rc.documento_venda_anterior_id = dv.id
WHERE dv.status = 'ATIVO'
  AND rc.status = 'RENOVADO'
  AND rc.updated_at > NOW() - INTERVAL '1 minute'
UNION ALL
SELECT
  'Renovações marcadas como PERDIDO' as tipo,
  COUNT(*) as total
FROM renovacoes_comerciais
WHERE status = 'PERDIDO'
  AND motivo_perda = 'Renovação não trabalhada dentro do prazo'
  AND updated_at > NOW() - INTERVAL '1 minute';

COMMIT;
