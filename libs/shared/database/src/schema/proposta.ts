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
import { clientes } from './cliente';
import { usuarios } from './usuario';
import { produtos } from './produto';
import { cotacoes } from './cotacao';
import { seguradorasParceiras } from './seguradora-parceira';
import { statusPropostaEnum } from './enums';

export const propostasComerciais = pgTable(
  'proposta_comercial',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    cotacaoId: uuid('cotacao_id').references(() => cotacoes.id, {
      onDelete: 'set null',
    }),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'restrict' }),
    vendedorId: uuid('vendedor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),
    produtoId: uuid('produto_id')
      .notNull()
      .references(() => produtos.id, { onDelete: 'restrict' }),
    seguradoraParceiraId: uuid('seguradora_parceira_id').references(
      () => seguradorasParceiras.id,
      { onDelete: 'restrict' },
    ),

    numeroPropostaInterno: varchar('numero_proposta_interno', {
      length: 50,
    }).notNull(),
    numeroPropostaExterno: varchar('numero_proposta_externo', { length: 100 }),
    status: statusPropostaEnum('status').notNull().default('AGUARDANDO_ENVIO'),

    vigenciaInicio: date('vigencia_inicio').notNull(),
    vigenciaFim: date('vigencia_fim').notNull(),
    premioLiquido: decimal('premio_liquido', { precision: 15, scale: 2 }),
    percentualComissao: decimal('percentual_comissao', {
      precision: 5,
      scale: 2,
    }),
    valorComissao: decimal('valor_comissao', { precision: 15, scale: 2 }),

    coberturas: jsonb('coberturas'),

    dataEnvio: timestamp('data_envio', { withTimezone: true }),
    dataResposta: timestamp('data_resposta', { withTimezone: true }),
    dataAprovacao: timestamp('data_aprovacao', { withTimezone: true }),
    dataRecusa: timestamp('data_recusa', { withTimezone: true }),

    motivoRecusa: varchar('motivo_recusa', { length: 100 }),
    detalhesRecusa: text('detalhes_recusa'),

    documentoVendaId: uuid('documento_venda_id'),

    observacoes: text('observacoes'),
    anexos: jsonb('anexos'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('unq_proposta_numero').on(
      table.corretoraId,
      table.numeroPropostaInterno,
    ),
    index('idx_proposta_corretora').on(table.corretoraId),
    index('idx_proposta_cliente').on(table.clienteId),
    index('idx_proposta_vendedor').on(table.vendedorId),
    index('idx_proposta_status').on(table.corretoraId, table.status),
  ],
);

export const propostasComerciaisRelations = relations(
  propostasComerciais,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [propostasComerciais.corretoraId],
      references: [corretoras.id],
    }),
    cotacao: one(cotacoes, {
      fields: [propostasComerciais.cotacaoId],
      references: [cotacoes.id],
    }),
    cliente: one(clientes, {
      fields: [propostasComerciais.clienteId],
      references: [clientes.id],
    }),
    vendedor: one(usuarios, {
      fields: [propostasComerciais.vendedorId],
      references: [usuarios.id],
    }),
    produto: one(produtos, {
      fields: [propostasComerciais.produtoId],
      references: [produtos.id],
    }),
    seguradoraParceira: one(seguradorasParceiras, {
      fields: [propostasComerciais.seguradoraParceiraId],
      references: [seguradorasParceiras.id],
    }),
  }),
);

export type PropostaComercial = typeof propostasComerciais.$inferSelect;
export type NewPropostaComercial = typeof propostasComerciais.$inferInsert;
