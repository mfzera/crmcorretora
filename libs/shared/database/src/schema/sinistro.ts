import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';
import { documentosVenda } from './documento-venda';
import { tipoSinistroEnum, statusSinistroEnum, tipoEventoSinistroEnum, origemSinistroEnum } from './enums';

export const sinistros = pgTable(
  'sinistro',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    documentoVendaId: uuid('documento_venda_id')
      .notNull()
      .references(() => documentosVenda.id, { onDelete: 'restrict' }),
    solicitanteId: uuid('solicitante_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),

    numeroSinistro: varchar('numero_sinistro', { length: 50 }).notNull(),
    numeroSinistroExterno: varchar('numero_sinistro_externo', { length: 100 }),

    tipoSinistro: tipoSinistroEnum('tipo_sinistro').notNull(),
    status: statusSinistroEnum('status').notNull().default('ABERTO'),
    origem: origemSinistroEnum('origem').notNull().default('DIRETA'),

    descricao: text('descricao').notNull(),
    dataOcorrencia: date('data_ocorrencia').notNull(),

    valorReclamado: decimal('valor_reclamado', { precision: 15, scale: 2 }),
    valorAprovado: decimal('valor_aprovado', { precision: 15, scale: 2 }),

    dataAbertura: timestamp('data_abertura', { withTimezone: true })
      .notNull()
      .defaultNow(),
    dataAnalise: timestamp('data_analise', { withTimezone: true }),
    dataAprovacao: timestamp('data_aprovacao', { withTimezone: true }),
    dataRecusa: timestamp('data_recusa', { withTimezone: true }),
    dataPagamento: timestamp('data_pagamento', { withTimezone: true }),

    analistaPorId: uuid('analista_por_id').references(() => usuarios.id),
    aprovadoPorId: uuid('aprovado_por_id').references(() => usuarios.id),

    motivoRecusa: text('motivo_recusa'),
    observacoes: text('observacoes'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_sinistro_corretora').on(table.corretoraId),
    index('idx_sinistro_documento').on(table.documentoVendaId),
    index('idx_sinistro_solicitante').on(table.solicitanteId),
    index('idx_sinistro_status').on(table.corretoraId, table.status),
    index('idx_sinistro_numero').on(table.corretoraId, table.numeroSinistro),
    // cobre o filtro padrão de listagem: corretora + não deletado + ordenação por data
    index('idx_sinistro_lista').on(table.corretoraId, table.deletedAt, table.createdAt),
    // cobre listagem por solicitante sem privilege (não deletado)
    index('idx_sinistro_solicitante_ativo').on(table.corretoraId, table.solicitanteId, table.deletedAt),
  ],
);

export const historicoSinistro = pgTable(
  'historico_sinistro',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sinistroId: uuid('sinistro_id')
      .notNull()
      .references(() => sinistros.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').references(() => usuarios.id, {
      onDelete: 'set null',
    }),

    tipo: tipoEventoSinistroEnum('tipo').notNull(),
    statusAnterior: statusSinistroEnum('status_anterior'),
    statusNovo: statusSinistroEnum('status_novo'),
    descricao: text('descricao'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_historico_sinistro_sinistro').on(table.sinistroId),
    index('idx_historico_sinistro_usuario').on(table.usuarioId),
  ],
);

export const sinistrosRelations = relations(sinistros, ({ one, many }) => ({
  corretora: one(corretoras, {
    fields: [sinistros.corretoraId],
    references: [corretoras.id],
  }),
  documentoVenda: one(documentosVenda, {
    fields: [sinistros.documentoVendaId],
    references: [documentosVenda.id],
  }),
  solicitante: one(usuarios, {
    fields: [sinistros.solicitanteId],
    references: [usuarios.id],
    relationName: 'sinistrosSolicitante',
  }),
  analistaPor: one(usuarios, {
    fields: [sinistros.analistaPorId],
    references: [usuarios.id],
    relationName: 'sinistrosAnalista',
  }),
  aprovadoPor: one(usuarios, {
    fields: [sinistros.aprovadoPorId],
    references: [usuarios.id],
    relationName: 'sinistrosAprovador',
  }),
  historico: many(historicoSinistro),
}));

export const historicoSinistroRelations = relations(
  historicoSinistro,
  ({ one }) => ({
    sinistro: one(sinistros, {
      fields: [historicoSinistro.sinistroId],
      references: [sinistros.id],
    }),
    usuario: one(usuarios, {
      fields: [historicoSinistro.usuarioId],
      references: [usuarios.id],
    }),
  }),
);

export type Sinistro = typeof sinistros.$inferSelect;
export type NewSinistro = typeof sinistros.$inferInsert;
export type HistoricoSinistro = typeof historicoSinistro.$inferSelect;
export type NewHistoricoSinistro = typeof historicoSinistro.$inferInsert;
