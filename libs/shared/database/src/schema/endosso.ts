import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';
import { documentosVenda } from './documento-venda';
import { tipoEndossoEnum, statusEndossoEnum } from './enums';

export const endossos = pgTable(
  'endosso',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    documentoVendaId: uuid('documento_venda_id')
      .notNull()
      .references(() => documentosVenda.id, { onDelete: 'restrict' }),
    vendedorId: uuid('vendedor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),

    tipoEndosso: tipoEndossoEnum('tipo_endosso').notNull(),
    numeroEndosso: varchar('numero_endosso', { length: 50 }).notNull(),
    numeroEndossoExterno: varchar('numero_endosso_externo', { length: 100 }),
    status: statusEndossoEnum('status').notNull().default('SOLICITADO'),

    descricao: text('descricao').notNull(),
    motivoEndosso: text('motivo_endosso'),

    premioAnterior: decimal('premio_anterior', { precision: 15, scale: 2 }),
    premioNovo: decimal('premio_novo', { precision: 15, scale: 2 }),
    diferencaPremio: decimal('diferenca_premio', { precision: 15, scale: 2 }),

    percentualComissaoAnterior: decimal('percentual_comissao_anterior', {
      precision: 5,
      scale: 2,
    }),
    percentualComissaoNovo: decimal('percentual_comissao_novo', {
      precision: 5,
      scale: 2,
    }),
    diferencaComissao: decimal('diferenca_comissao', {
      precision: 15,
      scale: 2,
    }),

    alteracoes: jsonb('alteracoes'),
    dataVigenciaEndosso: date('data_vigencia_endosso').notNull(),

    dataSolicitacao: timestamp('data_solicitacao', { withTimezone: true })
      .notNull()
      .defaultNow(),
    dataValidacao: timestamp('data_validacao', { withTimezone: true }),
    dataAprovacao: timestamp('data_aprovacao', { withTimezone: true }),
    dataRecusa: timestamp('data_recusa', { withTimezone: true }),
    dataEmissao: timestamp('data_emissao', { withTimezone: true }),

    validadoPorId: uuid('validado_por_id').references(() => usuarios.id),
    aprovadoPorId: uuid('aprovado_por_id').references(() => usuarios.id),
    emitidoPorId: uuid('emitido_por_id').references(() => usuarios.id),

    motivoRecusa: text('motivo_recusa'),
    observacoes: text('observacoes'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('unq_endosso_numero').on(table.corretoraId, table.numeroEndosso),
    index('idx_endosso_corretora').on(table.corretoraId),
    index('idx_endosso_documento').on(table.documentoVendaId),
    index('idx_endosso_vendedor').on(table.vendedorId),
    index('idx_endosso_status').on(table.corretoraId, table.status),
    index('idx_endosso_tipo').on(table.tipoEndosso),
  ],
);

export const endossosRelations = relations(endossos, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [endossos.corretoraId],
    references: [corretoras.id],
  }),
  documentoVenda: one(documentosVenda, {
    fields: [endossos.documentoVendaId],
    references: [documentosVenda.id],
  }),
  vendedor: one(usuarios, {
    fields: [endossos.vendedorId],
    references: [usuarios.id],
  }),
  validadoPor: one(usuarios, {
    fields: [endossos.validadoPorId],
    references: [usuarios.id],
    relationName: 'validadoPor',
  }),
  aprovadoPor: one(usuarios, {
    fields: [endossos.aprovadoPorId],
    references: [usuarios.id],
    relationName: 'aprovadoPor',
  }),
  emitidoPor: one(usuarios, {
    fields: [endossos.emitidoPorId],
    references: [usuarios.id],
    relationName: 'emitidoPor',
  }),
}));

export type Endosso = typeof endossos.$inferSelect;
export type NewEndosso = typeof endossos.$inferInsert;
