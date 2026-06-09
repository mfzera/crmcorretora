import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';
import { clientes } from './cliente';
import { produtos } from './produto';
import {
  oportunidadeStatusEnum,
  oportunidadePrioridadeEnum,
  oportunidadeTemperaturaEnum,
} from './enums';

export const oportunidades = pgTable(
  'oportunidade',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Cliente
    clienteId: uuid('cliente_id').references(() => clientes.id),
    nomeCliente: varchar('nome_cliente', { length: 255 }).notNull(),
    emailCliente: varchar('email_cliente', { length: 255 }),
    telefoneCliente: varchar('telefone_cliente', { length: 50 }),

    // Vendedor
    vendedorId: uuid('vendedor_id')
      .notNull()
      .references(() => usuarios.id),
    vendedorOriginalId: uuid('vendedor_original_id')
      .notNull()
      .references(() => usuarios.id),

    // Status e Pipeline
    status: oportunidadeStatusEnum('status').notNull().default('lead'),
    prioridade: oportunidadePrioridadeEnum('prioridade')
      .notNull()
      .default('media'),
    temperatura: oportunidadeTemperaturaEnum('temperatura')
      .notNull()
      .default('morno'),
    ordem: integer('ordem').notNull().default(0),

    // Valores
    premioEstimado: decimal('premio_estimado', { precision: 15, scale: 2 }),
    valorFechado: decimal('valor_fechado', { precision: 15, scale: 2 }),

    // Proposta
    numeroProposta: varchar('numero_proposta', { length: 100 }),
    observacoesProposta: text('observacoes_proposta'),

    // Datas
    dataVencimento: timestamp('data_vencimento', { withTimezone: true }),
    dataFechamento: timestamp('data_fechamento', { withTimezone: true }),
    dataUltimoContato: timestamp('data_ultimo_contato', { withTimezone: true }),

    // Perda
    motivoPerda: varchar('motivo_perda', { length: 100 }),
    detalhesPerda: text('detalhes_perda'),

    // Produto
    produtoId: uuid('produto_id').references(() => produtos.id),

    // Kanban — posição em coluna customizada (null = usar status)
    kanbanColumnKey: varchar('kanban_column_key', { length: 100 }),

    // Geral
    observacoes: text('observacoes'),
    tags: jsonb('tags').$type<string[]>(),
    origem: varchar('origem', { length: 100 }),
    metadata: jsonb('metadata').$type<Record<string, any>>(),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_oportunidade_corretora').on(table.corretoraId),
    index('idx_oportunidade_vendedor').on(table.vendedorId),
    index('idx_oportunidade_vendedor_original').on(table.vendedorOriginalId),
    index('idx_oportunidade_status').on(table.status),
    index('idx_oportunidade_cliente').on(table.clienteId),
  ],
);

export const oportunidadesRelations = relations(
  oportunidades,
  ({ one, many }) => ({
    corretora: one(corretoras, {
      fields: [oportunidades.corretoraId],
      references: [corretoras.id],
    }),
    vendedor: one(usuarios, {
      fields: [oportunidades.vendedorId],
      references: [usuarios.id],
      relationName: 'vendedorAtual',
    }),
    vendedorOriginal: one(usuarios, {
      fields: [oportunidades.vendedorOriginalId],
      references: [usuarios.id],
      relationName: 'vendedorOriginal',
    }),
    cliente: one(clientes, {
      fields: [oportunidades.clienteId],
      references: [clientes.id],
    }),
    produto: one(produtos, {
      fields: [oportunidades.produtoId],
      references: [produtos.id],
    }),
    transferencias: many(oportunidadesTransferencias),
    historico: many(oportunidadesHistorico),
  }),
);

// Tabela de histórico de transferências
export const oportunidadesTransferencias = pgTable(
  'oportunidade_transferencia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    oportunidadeId: uuid('oportunidade_id')
      .notNull()
      .references(() => oportunidades.id, { onDelete: 'cascade' }),
    vendedorOrigemId: uuid('vendedor_origem_id')
      .notNull()
      .references(() => usuarios.id),
    vendedorDestinoId: uuid('vendedor_destino_id')
      .notNull()
      .references(() => usuarios.id),
    motivo: text('motivo'),
    transferidoPorId: uuid('transferido_por_id')
      .notNull()
      .references(() => usuarios.id),
    dataTransferencia: timestamp('data_transferencia', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_transferencia_oportunidade').on(table.oportunidadeId),
    index('idx_transferencia_vendedor_origem').on(table.vendedorOrigemId),
    index('idx_transferencia_vendedor_destino').on(table.vendedorDestinoId),
    index('idx_transferencia_data').on(table.dataTransferencia),
  ],
);

export const oportunidadesTransferenciasRelations = relations(
  oportunidadesTransferencias,
  ({ one }) => ({
    oportunidade: one(oportunidades, {
      fields: [oportunidadesTransferencias.oportunidadeId],
      references: [oportunidades.id],
    }),
    vendedorOrigem: one(usuarios, {
      fields: [oportunidadesTransferencias.vendedorOrigemId],
      references: [usuarios.id],
      relationName: 'transferenciasOrigem',
    }),
    vendedorDestino: one(usuarios, {
      fields: [oportunidadesTransferencias.vendedorDestinoId],
      references: [usuarios.id],
      relationName: 'transferenciasDestino',
    }),
    transferidoPor: one(usuarios, {
      fields: [oportunidadesTransferencias.transferidoPorId],
      references: [usuarios.id],
      relationName: 'transferenciasRealizadas',
    }),
  }),
);

// Tabela de histórico de eventos da oportunidade
export const oportunidadesHistorico = pgTable(
  'oportunidade_historico',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    oportunidadeId: uuid('oportunidade_id')
      .notNull()
      .references(() => oportunidades.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').references(() => usuarios.id),
    tipo: varchar('tipo', { length: 50 }).notNull(), // criacao | mudanca_status | fechamento | perda
    statusAnterior: varchar('status_anterior', { length: 50 }),
    statusNovo: varchar('status_novo', { length: 50 }),
    descricao: text('descricao'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_oportunidade_historico_oportunidade').on(table.oportunidadeId),
    index('idx_oportunidade_historico_created_at').on(table.createdAt),
  ],
);

export const oportunidadesHistoricoRelations = relations(
  oportunidadesHistorico,
  ({ one }) => ({
    oportunidade: one(oportunidades, {
      fields: [oportunidadesHistorico.oportunidadeId],
      references: [oportunidades.id],
    }),
    usuario: one(usuarios, {
      fields: [oportunidadesHistorico.usuarioId],
      references: [usuarios.id],
      relationName: 'historicoOportunidades',
    }),
  }),
);

export type Oportunidade = typeof oportunidades.$inferSelect;
export type NewOportunidade = typeof oportunidades.$inferInsert;
export type OportunidadeTransferencia =
  typeof oportunidadesTransferencias.$inferSelect;
export type NewOportunidadeTransferencia =
  typeof oportunidadesTransferencias.$inferInsert;
export type OportunidadeHistorico = typeof oportunidadesHistorico.$inferSelect;
export type NewOportunidadeHistorico = typeof oportunidadesHistorico.$inferInsert;
