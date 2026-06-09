import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { clientes } from './cliente';
import { produtos } from './produto';
import { usuarios } from './usuario';

export const portalCotacaoSolicitacoes = pgTable(
  'portal_cotacao_solicitacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'cascade' }),

    produtoId: uuid('produto_id').references(() => produtos.id, {
      onDelete: 'set null',
    }),

    // Vendedor para quem a solicitação foi roteada automaticamente
    vendedorId: uuid('vendedor_id').references(() => usuarios.id, {
      onDelete: 'set null',
    }),

    mensagem: text('mensagem'),

    // PENDENTE → ATENDIDO | CANCELADO
    status: varchar('status', { length: 20 }).notNull().default('PENDENTE'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_portal_cotacao_corretora').on(table.corretoraId),
    index('idx_portal_cotacao_cliente').on(table.clienteId),
    index('idx_portal_cotacao_status').on(table.status),
    index('idx_portal_cotacao_vendedor').on(table.vendedorId),
  ],
);

export const portalCotacaoSolicitacoesRelations = relations(
  portalCotacaoSolicitacoes,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [portalCotacaoSolicitacoes.corretoraId],
      references: [corretoras.id],
    }),
    cliente: one(clientes, {
      fields: [portalCotacaoSolicitacoes.clienteId],
      references: [clientes.id],
    }),
    produto: one(produtos, {
      fields: [portalCotacaoSolicitacoes.produtoId],
      references: [produtos.id],
    }),
    vendedor: one(usuarios, {
      fields: [portalCotacaoSolicitacoes.vendedorId],
      references: [usuarios.id],
    }),
  }),
);

export type PortalCotacaoSolicitacao = typeof portalCotacaoSolicitacoes.$inferSelect;
export type NewPortalCotacaoSolicitacao = typeof portalCotacaoSolicitacoes.$inferInsert;
