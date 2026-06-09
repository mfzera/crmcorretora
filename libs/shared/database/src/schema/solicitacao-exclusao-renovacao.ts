import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';
import { renovacoesComerciais } from './renovacao';

export const solicitacoesExclusaoRenovacao = pgTable(
  'solicitacao_exclusao_renovacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    renovacaoId: uuid('renovacao_id')
      .notNull()
      .references(() => renovacoesComerciais.id, { onDelete: 'cascade' }),
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
    respondidoEm: timestamp('respondido_em', { mode: 'date' }),
    criadoEm: timestamp('criado_em', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
);

export const solicitacoesExclusaoRenovacaoRelations = relations(
  solicitacoesExclusaoRenovacao,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [solicitacoesExclusaoRenovacao.corretoraId],
      references: [corretoras.id],
    }),
    renovacao: one(renovacoesComerciais, {
      fields: [solicitacoesExclusaoRenovacao.renovacaoId],
      references: [renovacoesComerciais.id],
    }),
    solicitante: one(usuarios, {
      fields: [solicitacoesExclusaoRenovacao.solicitanteId],
      references: [usuarios.id],
      relationName: 'solicitacoesExclusaoFeitas',
    }),
    respondidoPor: one(usuarios, {
      fields: [solicitacoesExclusaoRenovacao.respondidoPorId],
      references: [usuarios.id],
      relationName: 'solicitacoesExclusaoRespondidas',
    }),
  }),
);
