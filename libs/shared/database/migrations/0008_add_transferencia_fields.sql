-- Migration: Add transferencia fields to renovacao_comercial
-- Adds fields to track renovation transfer history

ALTER TABLE renovacao_comercial
  ADD COLUMN IF NOT EXISTS transferida_por_id UUID REFERENCES usuario(id),
  ADD COLUMN IF NOT EXISTS transferida_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS vendedor_original_id UUID REFERENCES usuario(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_renovacao_transferida_por ON renovacao_comercial(transferida_por_id);
CREATE INDEX IF NOT EXISTS idx_renovacao_vendedor_original ON renovacao_comercial(vendedor_original_id);
