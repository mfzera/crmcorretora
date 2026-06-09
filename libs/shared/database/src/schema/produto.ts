import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { seguradorasParceiras } from './seguradora-parceira';
import { usuarios } from './usuario';

export const produtos = pgTable(
  'produto',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    seguradoraParceiraId: uuid('seguradora_parceira_id').references(
      () => seguradorasParceiras.id,
      { onDelete: 'restrict' },
    ),

    nomeProduto: varchar('nome_produto', { length: 256 }).notNull(),
    descricao: text('descricao'),
    tipoSeguro: varchar('tipo_seguro', { length: 100 }).notNull(),

    // Configurações financeiras
    premioMinimo: decimal('premio_minimo', { precision: 15, scale: 2 }),
    premioMaximo: decimal('premio_maximo', { precision: 15, scale: 2 }),
    percentualComissaoPadrao: decimal('percentual_comissao_padrao', {
      precision: 5,
      scale: 2,
    }),

    // Vendedor padrão para solicitações do portal do segurado
    vendedorPortalId: uuid('vendedor_portal_id').references(() => usuarios.id, {
      onDelete: 'set null',
    }),

    ativo: boolean('ativo').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('unq_corretora_produto').on(table.corretoraId, table.nomeProduto),
    index('idx_produto_corretora').on(table.corretoraId),
    index('idx_produto_tipo').on(table.tipoSeguro),
    index('idx_produtos_seguradora_parceira').on(table.seguradoraParceiraId),
  ],
);

export const produtosRelations = relations(produtos, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [produtos.corretoraId],
    references: [corretoras.id],
  }),
  seguradoraParceira: one(seguradorasParceiras, {
    fields: [produtos.seguradoraParceiraId],
    references: [seguradorasParceiras.id],
  }),
  vendedorPortal: one(usuarios, {
    fields: [produtos.vendedorPortalId],
    references: [usuarios.id],
  }),
}));

export type Produto = typeof produtos.$inferSelect;
export type NewProduto = typeof produtos.$inferInsert;
