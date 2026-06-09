import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';
import { renovacoesComerciais } from './renovacao';

export const transferenciaRenovacoes = pgTable('transferencia_renovacoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  corretoraId: uuid('corretora_id')
    .notNull()
    .references(() => corretoras.id, { onDelete: 'cascade' }),
  solicitanteId: uuid('solicitante_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  destinatarioId: uuid('destinatario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['PENDENTE', 'ACEITA', 'RECUSADA', 'CANCELADA'],
  })
    .notNull()
    .default('PENDENTE'),
  motivoRecusa: text('motivo_recusa'),
  observacoes: text('observacoes'),
  criadoEm: timestamp('criado_em', { mode: 'date' }).notNull().defaultNow(),
  respondidoEm: timestamp('respondido_em', { mode: 'date' }),
  respondidoPorId: uuid('respondido_por_id').references(() => usuarios.id),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const transferenciaRenovacaoItens = pgTable(
  'transferencia_renovacao_itens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transferenciaId: uuid('transferencia_id')
      .notNull()
      .references(() => transferenciaRenovacoes.id, { onDelete: 'cascade' }),
    renovacaoId: uuid('renovacao_id')
      .notNull()
      .references(() => renovacoesComerciais.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
);

// Relations
export const transferenciaRenovacoesRelations = relations(
  transferenciaRenovacoes,
  ({ one, many }) => ({
    corretora: one(corretoras, {
      fields: [transferenciaRenovacoes.corretoraId],
      references: [corretoras.id],
    }),
    solicitante: one(usuarios, {
      fields: [transferenciaRenovacoes.solicitanteId],
      references: [usuarios.id],
      relationName: 'transferenciasSolicitadas',
    }),
    destinatario: one(usuarios, {
      fields: [transferenciaRenovacoes.destinatarioId],
      references: [usuarios.id],
      relationName: 'transferenciasRecebidas',
    }),
    respondidoPor: one(usuarios, {
      fields: [transferenciaRenovacoes.respondidoPorId],
      references: [usuarios.id],
      relationName: 'transferenciasRespondidas',
    }),
    itens: many(transferenciaRenovacaoItens),
  }),
);

export const transferenciaRenovacaoItensRelations = relations(
  transferenciaRenovacaoItens,
  ({ one }) => ({
    transferencia: one(transferenciaRenovacoes, {
      fields: [transferenciaRenovacaoItens.transferenciaId],
      references: [transferenciaRenovacoes.id],
    }),
    renovacao: one(renovacoesComerciais, {
      fields: [transferenciaRenovacaoItens.renovacaoId],
      references: [renovacoesComerciais.id],
    }),
  }),
);
