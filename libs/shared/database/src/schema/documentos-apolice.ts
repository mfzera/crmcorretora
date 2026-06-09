import { pgTable, uuid, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { documentosVenda } from './documento-venda';
import { clientes } from './cliente';

export const documentosApolice = pgTable(
  'documentos_apolice',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    documentoVendaId: uuid('documento_venda_id')
      .notNull()
      .references(() => documentosVenda.id, { onDelete: 'cascade' }),

    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'cascade' }),

    nome: varchar('nome', { length: 255 }).notNull(),
    tipo: varchar('tipo', { length: 50 }).notNull().default('OUTRO'), // APOLICE, BOLETO, ENDOSSO, OUTRO

    r2Key: varchar('r2_key', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }),
    tamanhoBytes: integer('tamanho_bytes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_doc_apolice_documento_venda').on(table.documentoVendaId),
    index('idx_doc_apolice_cliente').on(table.clienteId),
    index('idx_doc_apolice_corretora').on(table.corretoraId),
  ],
);

export const documentosApoliceRelations = relations(documentosApolice, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [documentosApolice.corretoraId],
    references: [corretoras.id],
  }),
  documentoVenda: one(documentosVenda, {
    fields: [documentosApolice.documentoVendaId],
    references: [documentosVenda.id],
  }),
  cliente: one(clientes, {
    fields: [documentosApolice.clienteId],
    references: [clientes.id],
  }),
}));

export type DocumentoApolice = typeof documentosApolice.$inferSelect;
export type NewDocumentoApolice = typeof documentosApolice.$inferInsert;
