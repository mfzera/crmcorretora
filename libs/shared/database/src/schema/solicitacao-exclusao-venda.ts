import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';
import { documentosVenda } from './documento-venda';

export const solicitacoesExclusaoVenda = pgTable(
  'solicitacao_exclusao_venda',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    documentoVendaId: uuid('documento_venda_id')
      .notNull()
      .references(() => documentosVenda.id, { onDelete: 'cascade' }),
    solicitanteId: uuid('solicitante_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    motivo: text('motivo'),
    status: text('status', {
      enum: ['PENDENTE', 'ACEITA', 'RECUSADA'],
    })
      .notNull()
      .default('PENDENTE'),
    motivoRecusa: text('motivo_recusa'),
    respondidoPorId: uuid('respondido_por_id').references(() => usuarios.id),
    respondidoEm: timestamp('respondido_em', { withTimezone: true }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

export const solicitacoesExclusaoVendaRelations = relations(
  solicitacoesExclusaoVenda,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [solicitacoesExclusaoVenda.corretoraId],
      references: [corretoras.id],
    }),
    documentoVenda: one(documentosVenda, {
      fields: [solicitacoesExclusaoVenda.documentoVendaId],
      references: [documentosVenda.id],
    }),
    solicitante: one(usuarios, {
      fields: [solicitacoesExclusaoVenda.solicitanteId],
      references: [usuarios.id],
      relationName: 'solicitacoesExclusaoVendaFeitas',
    }),
    respondidoPor: one(usuarios, {
      fields: [solicitacoesExclusaoVenda.respondidoPorId],
      references: [usuarios.id],
      relationName: 'solicitacoesExclusaoVendaRespondidas',
    }),
  }),
);
