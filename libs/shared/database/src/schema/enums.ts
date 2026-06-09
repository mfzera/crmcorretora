import { pgEnum } from 'drizzle-orm/pg-core';

// Pessoa
export const tipoPessoaEnum = pgEnum('tipo_pessoa', ['PF', 'PJ']);

// Oportunidade (Kanban)
export const oportunidadeStatusEnum = pgEnum('oportunidade_status', [
  'lead',
  'contato_inicial',
  'negociacao',
  'ganha',
  'perdida',
  'arquivada',
]);

export const oportunidadePrioridadeEnum = pgEnum('oportunidade_prioridade', [
  'baixa',
  'media',
  'alta',
  'urgente',
]);

export const oportunidadeTemperaturaEnum = pgEnum('oportunidade_temperatura', [
  'frio',
  'morno',
  'quente',
]);

// Cotação
export const statusCotacaoEnum = pgEnum('status_cotacao', [
  'EM_ELABORACAO',
  'PERDIDA',
  'EXPIRADA',
  'CONVERTIDA',
]);

export const etapaCotacaoEnum = pgEnum('etapa_cotacao', [
  'LEVANTANDO_DADOS',
  'PROPOSTA_ENVIADA',
  'EM_NEGOCIACAO',
  'AGUARDANDO_RETORNO',
]);

export const cotacaoOrigemEnum = pgEnum('cotacao_origem', [
  'MANUAL',
  'RENOVACAO_PENDENTE',
]);

// Proposta
export const statusPropostaEnum = pgEnum('status_proposta', [
  'AGUARDANDO_ENVIO',
  'ENVIADA',
  'EM_ANALISE',
  'PENDENTE_DOCUMENTACAO',
  'APROVADA',
  'APROVADA_CONDICIONAL',
  'RECUSADA',
  'CANCELADA',
  'VENDA_CONFIRMADA',
]);

// Documento de Venda
export const tipoDocumentoVendaEnum = pgEnum('tipo_documento_venda', [
  'COTACAO_DIRETA',
  'PROPOSTA_FORMAL',
  'VENDA_EXPRESSA',
  'COTACAO_PERDIDA',
]);

export const statusDocumentoVendaEnum = pgEnum('status_documento_venda', [
  'EM_NEGOCIACAO',
  'AGUARDANDO_CLIENTE',
  'AGUARDANDO_APROVACAO',
  'VENDA_CONFIRMADA',
  'AGUARDANDO_CADASTRO',
  'ATIVO',
  'ARQUIVADO',
  'CANCELADO',
  'PERDIDO',
]);

// Sinistro
export const origemSinistroEnum = pgEnum('origem_sinistro', [
  'DIRETA',
  'INDICACAO',
]);

export const tipoSinistroEnum = pgEnum('tipo_sinistro', [
  'COLISAO',
  'ROUBO_FURTO',
  'INCENDIO',
  'DANOS_NATURAIS',
  'DANOS_TERCEIROS',
  'INVALIDEZ',
  'MORTE',
  'HOSPITALIZACAO',
  'OUTROS',
]);

export const statusSinistroEnum = pgEnum('status_sinistro', [
  'ABERTO',
  'EM_ANALISE',
  'AGUARDANDO_DOCUMENTOS',
  'APROVADO',
  'RECUSADO',
  'PAGO',
  'CANCELADO',
]);

export const tipoEventoSinistroEnum = pgEnum('tipo_evento_sinistro', [
  'ABERTURA',
  'MUDANCA_STATUS',
  'APROVACAO',
  'RECUSA',
  'PAGAMENTO',
  'DOCUMENTO_ADICIONADO',
  'ANOTACAO',
  'CANCELAMENTO',
]);

// Endosso
export const tipoEndossoEnum = pgEnum('tipo_endosso', [
  'INCLUSAO_COBERTURA',
  'EXCLUSAO_COBERTURA',
  'ALTERACAO_VALOR',
  'INCLUSAO_ITEM',
  'EXCLUSAO_ITEM',
  'ALTERACAO_DADOS',
  'ALTERACAO_VIGENCIA',
  'TRANSFERENCIA_SEGURADO',
  'SUBSTITUICAO_VEICULO',
  'CANCELAMENTO',
  'OUTROS',
]);

export const statusEndossoEnum = pgEnum('status_endosso', [
  'SOLICITADO',
  'APROVADO',
  'RECUSADO',
  'CANCELADO',
]);

// Renovação
export const statusRenovacaoEnum = pgEnum('status_renovacao', [
  'NAO_TRABALHADO',
  'EM_PROSPECCAO',
  'EM_NEGOCIACAO',
  'AGUARDANDO_CLIENTE',
  'RENOVADO',
  'PERDIDO',
  'CANCELADO',
]);

// Gamificação
export const tipoMetricaEnum = pgEnum('tipo_metrica', [
  'novos_seguros',
  'renovacoes',
  'cotacoes',
  'valor_premio',
  'taxa_renovacao',
  'premio_renovacao',
]);

export const statusMetaEnum = pgEnum('status_meta', [
  'ATIVA',
  'CONCLUIDA',
  'EXPIRADA',
  'CANCELADA',
]);

export const statusMissaoEnum = pgEnum('status_missao', [
  'PENDENTE',
  'EM_ANDAMENTO',
  'CONCLUIDA',
  'EXPIRADA',
  'CANCELADA',
]);

// Importação de Renovações
export const statusImportacaoEnum = pgEnum('status_importacao', [
  'PROCESSANDO',
  'CONCLUIDO',
  'CONCLUIDO_COM_ERROS',
  'FALHA',
  'REVERTIDO_PARCIAL',
]);

export const statusImportacaoItemEnum = pgEnum('status_importacao_item', [
  'SUCESSO',
  'ERRO',
  'PULADO',
  'PENDENTE',
  'REVERTIDO',
]);

// Cotação Vendedor
export const papelCotacaoVendedorEnum = pgEnum('papel_cotacao_vendedor', [
  'COTADOR',
  'FECHADOR',
]);

// Comissão - Tipo de Negócio
export const tipoNegocioComissaoEnum = pgEnum('tipo_negocio_comissao', [
  'NOVO',
  'RENOVACAO',
]);

// Comissão - Status de Pagamento (legado, mantido por compatibilidade)
export const statusPagamentoComissaoEnum = pgEnum('status_pagamento_comissao', [
  'PENDENTE',
  'PAGO',
  'CANCELADO',
]);

// Comissão Config - Tipo de operação no histórico
export const tipoOperacaoComissaoConfigEnum = pgEnum('tipo_operacao_comissao_config', [
  'CRIACAO',
  'ATUALIZACAO',
  'EXCLUSAO',
]);

// Lançamentos de Comissão - Tipo
export const tipoLancamentoComissaoEnum = pgEnum('tipo_lancamento_comissao', [
  'NORMAL',            // parcela normal de nova apólice
  'AJUSTE_ENDOSSO',    // diferença por alteração de prêmio via endosso
  'ESTORNO_CANCELAMENTO', // estorno proporcional por cancelamento
  'PRO_RATA',          // comissão proporcional por período fracionado
]);

// Lançamentos de Comissão - Status de recebimento da seguradora
export const statusRecebimentoSeguradoraEnum = pgEnum('status_recebimento_seguradora', [
  'AGUARDANDO',    // ainda não venceu ou não confirmado
  'RECEBIDO',      // confirmado que a seguradora pagou a corretora
  'NAO_APLICAVEL', // ajustes/estornos que não envolvem recebimento
]);

// Lançamentos de Comissão - Modalidade de pagamento ao vendedor
export const modalidadePagamentoVendedorEnum = pgEnum('modalidade_pagamento_vendedor', [
  'AVISTA',     // corretora paga o vendedor de uma vez, independente do parcelamento
  'PARCELADO',  // corretora paga o vendedor conforme recebe da seguradora
]);

// Histórico
export const tipoEventoDocumentoEnum = pgEnum('tipo_evento_documento', [
  'CRIACAO',
  'ALTERACAO_STATUS',
  'ALTERACAO_DADOS',
  'APROVACAO_CADASTRO',
  'REJEICAO_CADASTRO',
  'CONFIRMACAO_VENDA',
  'CANCELAMENTO',
  'PERDA',
  'CONFIRMACAO_PERDA',
  'REJEICAO_PERDA',
  'ENDOSSO_CRIADO',
  'ENDOSSO_APROVADO',
  'ENDOSSO_RECUSADO',
  'ANOTACAO',
  'SOLICITACAO_CADASTRO',
  'SOLICITACAO_EXCLUSAO',
  'EXCLUSAO_ACEITA',
  'EXCLUSAO_RECUSADA',
  'SOLICITACAO_TROCA_VENDEDOR',
  'TROCA_VENDEDOR_APROVADA',
  'TROCA_VENDEDOR_RECUSADA',
]);
