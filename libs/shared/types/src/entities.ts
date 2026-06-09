/**
 * Shared entity types - Enum types only
 *
 * NOTE: For full entity types (Cliente, Produto, etc.), import directly from:
 * import type { Cliente, Produto } from '@ecotech/shared/database';
 *
 * This file ONLY contains enum types to avoid circular dependency:
 * database -> types -> database (CIRCULAR!)
 *
 * Enums are defined here because Drizzle pgEnum doesn't export TypeScript types.
 */

// Enum types (inferred from Drizzle pgEnum)
// Note: Drizzle enums don't export TypeScript types, so we define them manually
export type TipoPessoa = 'PF' | 'PJ';

export type StatusCotacao =
  | 'EM_ELABORACAO'
  | 'PERDIDA'
  | 'EXPIRADA'
  | 'CONVERTIDA';

export type StatusProposta =
  | 'AGUARDANDO_ENVIO'
  | 'ENVIADA'
  | 'EM_ANALISE'
  | 'PENDENTE_DOCUMENTACAO'
  | 'APROVADA'
  | 'APROVADA_CONDICIONAL'
  | 'RECUSADA'
  | 'CANCELADA'
  | 'VENDA_CONFIRMADA';

export type TipoDocumentoVenda =
  | 'COTACAO_DIRETA'
  | 'PROPOSTA_FORMAL'
  | 'VENDA_EXPRESSA';

export type StatusDocumentoVenda =
  | 'EM_NEGOCIACAO'
  | 'AGUARDANDO_CLIENTE'
  | 'AGUARDANDO_APROVACAO'
  | 'VENDA_CONFIRMADA'
  | 'AGUARDANDO_CADASTRO'
  | 'ATIVO'
  | 'CANCELADO'
  | 'PERDIDO';

export type StatusRenovacao =
  | 'NAO_TRABALHADO'
  | 'EM_PROSPECCAO'
  | 'EM_NEGOCIACAO'
  | 'AGUARDANDO_CLIENTE'
  | 'RENOVADO'
  | 'PERDIDO'
  | 'CANCELADO';

export type TipoEndosso =
  | 'INCLUSAO_COBERTURA'
  | 'EXCLUSAO_COBERTURA'
  | 'ALTERACAO_VALOR'
  | 'INCLUSAO_ITEM'
  | 'EXCLUSAO_ITEM'
  | 'ALTERACAO_DADOS'
  | 'ALTERACAO_VIGENCIA'
  | 'TRANSFERENCIA_SEGURADO'
  | 'CANCELAMENTO'
  | 'OUTROS';

export type StatusEndosso =
  | 'SOLICITADO'
  | 'EM_VALIDACAO'
  | 'APROVADO'
  | 'RECUSADO'
  | 'EMITIDO'
  | 'CANCELADO';

export type TipoEventoDocumento =
  | 'CRIACAO'
  | 'ALTERACAO_STATUS'
  | 'ALTERACAO_DADOS'
  | 'APROVACAO_CADASTRO'
  | 'REJEICAO_CADASTRO'
  | 'CONFIRMACAO_VENDA'
  | 'CANCELAMENTO'
  | 'PERDA'
  | 'ENDOSSO_CRIADO'
  | 'ANOTACAO';

export type TipoVendedorTroca = 'principal' | 'secundario' | 'terceiro';

export type StatusSolicitacaoTrocaVendedor = 'PENDENTE' | 'APROVADA' | 'RECUSADA';
