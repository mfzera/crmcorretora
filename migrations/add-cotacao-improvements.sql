-- Migration: Adicionar melhorias ao processo de cotação
-- Data: 2025-12-29
-- Descrição: Adiciona campos premioLiquido e situacao, cria tabela de histórico de vendedores

-- Adicionar campos à tabela cotacao
ALTER TABLE cotacao
  ADD COLUMN IF NOT EXISTS premio_liquido DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS situacao VARCHAR(20) NOT NULL DEFAULT 'NOVO';

-- Criar tabela de histórico de vendedores
CREATE TABLE IF NOT EXISTS cotacao_vendedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id UUID NOT NULL REFERENCES cotacao(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  data_atribuicao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  atribuido_por UUID REFERENCES usuario(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_cotacao_vendedor_cotacao_ativo
  ON cotacao_vendedor(cotacao_id, ativo);

CREATE INDEX IF NOT EXISTS idx_cotacao_vendedor_historico
  ON cotacao_vendedor(cotacao_id, data_atribuicao DESC);

-- Migrar vendedores existentes para a nova tabela
INSERT INTO cotacao_vendedor (cotacao_id, vendedor_id, data_atribuicao, ativo)
SELECT id, vendedor_id, created_at, true
FROM cotacao
WHERE vendedor_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Comentários para documentação
COMMENT ON COLUMN cotacao.premio_liquido IS 'Prêmio líquido real da cotação (preenchido posteriormente pelo vendedor)';
COMMENT ON COLUMN cotacao.situacao IS 'Situação da cotação: NOVO ou RENOVACAO';
COMMENT ON TABLE cotacao_vendedor IS 'Histórico de vendedores atribuídos a cada cotação';
COMMENT ON COLUMN cotacao_vendedor.ativo IS 'Indica se este é o vendedor ativo atual da cotação';
