import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { documentosVenda } from './documento-venda';
import { endossos } from './endosso';
import { usuarios } from './usuario';
import {
  tipoLancamentoComissaoEnum,
  statusRecebimentoSeguradoraEnum,
  statusPagamentoComissaoEnum,
} from './enums';

/**
 * Lançamentos de comissão — cada evento financeiro de comissão gera um registro.
 *
 * Dois fluxos rastreados por lançamento:
 *   1. Corretora ← Seguradora  (statusRecebimentoSeguradora)
 *   2. Corretora → Vendedor    (statusPagamentoVendedor)
 *
 * Tipos de lançamento:
 *   - NORMAL               → parcela(s) de comissão de nova apólice ou renovação
 *   - AJUSTE_ENDOSSO       → diferença de comissão gerada por endosso que altera prêmio
 *   - ESTORNO_CANCELAMENTO → devolução proporcional por cancelamento
 *   - PRO_RATA             → comissão de período fracionado
 */
export const comissaoLancamentos = pgTable(
  'comissao_lancamento',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    documentoVendaId: uuid('documento_venda_id')
      .notNull()
      .references(() => documentosVenda.id, { onDelete: 'cascade' }),

    // Origem do ajuste (preenchido apenas em AJUSTE_ENDOSSO)
    endossoId: uuid('endosso_id').references(() => endossos.id, {
      onDelete: 'set null',
    }),

    tipo: tipoLancamentoComissaoEnum('tipo').notNull().default('NORMAL'),
    descricao: varchar('descricao', { length: 500 }),

    // Identificação da parcela
    numeroParcela: integer('numero_parcela').notNull().default(1),
    totalParcelas: integer('total_parcelas').notNull().default(1),

    // Valores financeiros
    valorPremioReferencia: decimal('valor_premio_referencia', {
      precision: 15,
      scale: 2,
    }),
    percentualComissao: decimal('percentual_comissao', {
      precision: 5,
      scale: 2,
    }),
    valorComissaoTotal: decimal('valor_comissao_total', {
      precision: 15,
      scale: 2,
    }).notNull(),
    valorComissaoVendedor: decimal('valor_comissao_vendedor', {
      precision: 15,
      scale: 2,
    }),
    valorComissaoCorretora: decimal('valor_comissao_corretora', {
      precision: 15,
      scale: 2,
    }),

    // Referência temporal
    dataCompetencia: date('data_competencia'), // mês de competência contábil
    dataVencimento: date('data_vencimento'),   // data esperada de recebimento da seguradora

    // Fluxo 1: Recebimento da seguradora
    statusRecebimentoSeguradora: statusRecebimentoSeguradoraEnum(
      'status_recebimento_seguradora',
    )
      .notNull()
      .default('AGUARDANDO'),
    dataRecebimentoSeguradora: date('data_recebimento_seguradora'),
    observacaoRecebimento: text('observacao_recebimento'),

    // Fluxo 2: Pagamento ao vendedor
    statusPagamentoVendedor: statusPagamentoComissaoEnum(
      'status_pagamento_vendedor',
    )
      .notNull()
      .default('PENDENTE'),
    dataPagamentoVendedor: timestamp('data_pagamento_vendedor', {
      withTimezone: true,
    }),
    observacaoPagamento: text('observacao_pagamento'),
    pago_por_id: uuid('pago_por_id').references(() => usuarios.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_comissao_lancamento_corretora').on(table.corretoraId),
    index('idx_comissao_lancamento_documento').on(table.documentoVendaId),
    index('idx_comissao_lancamento_vencimento').on(table.dataVencimento),
    index('idx_comissao_lancamento_status').on(
      table.corretoraId,
      table.statusPagamentoVendedor,
    ),
    index('idx_comissao_lancamento_competencia').on(
      table.corretoraId,
      table.dataCompetencia,
    ),
  ],
);

export const comissaoLancamentosRelations = relations(
  comissaoLancamentos,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [comissaoLancamentos.corretoraId],
      references: [corretoras.id],
    }),
    documentoVenda: one(documentosVenda, {
      fields: [comissaoLancamentos.documentoVendaId],
      references: [documentosVenda.id],
    }),
    endosso: one(endossos, {
      fields: [comissaoLancamentos.endossoId],
      references: [endossos.id],
    }),
    pagoPor: one(usuarios, {
      fields: [comissaoLancamentos.pago_por_id],
      references: [usuarios.id],
    }),
  }),
);

export type ComissaoLancamento = typeof comissaoLancamentos.$inferSelect;
export type NewComissaoLancamento = typeof comissaoLancamentos.$inferInsert;
