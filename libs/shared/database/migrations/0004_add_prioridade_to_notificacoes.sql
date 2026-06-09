-- Adicionar campo prioridade na tabela notificacao
ALTER TABLE notificacao
ADD COLUMN IF NOT EXISTS prioridade VARCHAR(20) DEFAULT 'media' NOT NULL;

-- Criar índice para prioridade
CREATE INDEX IF NOT EXISTS idx_notificacao_prioridade ON notificacao(prioridade);

-- Comentário explicativo
COMMENT ON COLUMN notificacao.prioridade IS 'Prioridade da notificação: baixa, media, alta, urgente';
