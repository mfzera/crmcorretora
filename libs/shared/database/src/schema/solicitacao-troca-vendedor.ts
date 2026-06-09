import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';
import { documentosVenda } from './documento-venda';

export const solicitacoesTrocaVendedor = pgTable('solicitacao_troca_vendedor', {
  id: uuid('id').primaryKey().defaultRandom(),
  corretoraId: uuid('corretora_id')
    .notNull()
    .references(() => corretoras.id, { onDelete: 'cascade' }),
  documentoVendaId: uuid('documento_venda_id')
    .notNull()
    .references(() => documentosVenda.id, { onDelete: 'cascade' }),
  solicitanteId: uuid('solicitante_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'restrict' }),
  vendedorAtualId: uuid('vendedor_atual_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'restrict' }),
  novoVendedorId: uuid('novo_vendedor_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'restrict' }),
  tipoVendedor: text('tipo_vendedor', {
    enum: ['principal', 'secundario', 'terceiro'],
  }).notNull(),
  motivo: text('motivo').notNull(),
  status: text('status', {
    enum: ['PENDENTE', 'APROVADA', 'RECUSADA'],
  })
    .notNull()
    .default('PENDENTE'),
  aprovadoPorId: uuid('aprovado_por_id').references(() => usuarios.id),
  motivoRecusa: text('motivo_recusa'),
  dataAprovacao: timestamp('data_aprovacao', { withTimezone: true }),
  dataRecusa: timestamp('data_recusa', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const solicitacoesTrocaVendedorRelations = relations(
  solicitacoesTrocaVendedor,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [solicitacoesTrocaVendedor.corretoraId],
      references: [corretoras.id],
    }),
    documentoVenda: one(documentosVenda, {
      fields: [solicitacoesTrocaVendedor.documentoVendaId],
      references: [documentosVenda.id],
    }),
    solicitante: one(usuarios, {
      fields: [solicitacoesTrocaVendedor.solicitanteId],
      references: [usuarios.id],
      relationName: 'solicitacoesTrocaVendedorFeitas',
    }),
    vendedorAtual: one(usuarios, {
      fields: [solicitacoesTrocaVendedor.vendedorAtualId],
      references: [usuarios.id],
      relationName: 'solicitacoesTrocaVendedorAtual',
    }),
    novoVendedor: one(usuarios, {
      fields: [solicitacoesTrocaVendedor.novoVendedorId],
      references: [usuarios.id],
      relationName: 'solicitacoesTrocaVendedorNovo',
    }),
    aprovadoPor: one(usuarios, {
      fields: [solicitacoesTrocaVendedor.aprovadoPorId],
      references: [usuarios.id],
      relationName: 'solicitacoesTrocaVendedorAprovadas',
    }),
  }),
);

export type SolicitacaoTrocaVendedor =
  typeof solicitacoesTrocaVendedor.$inferSelect;
export type NewSolicitacaoTrocaVendedor =
  typeof solicitacoesTrocaVendedor.$inferInsert;
