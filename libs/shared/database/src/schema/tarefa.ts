import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';

export const tarefas = pgTable(
  'tarefa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Dono da tarefa
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    // Conteúdo
    titulo: varchar('titulo', { length: 255 }).notNull(),
    descricao: text('descricao'),

    // Prioridade
    prioridade: varchar('prioridade', { length: 20 }).default('media').notNull(), // 'baixa', 'media', 'alta'

    // Status
    concluida: boolean('concluida').default(false).notNull(),
    concluidaEm: timestamp('concluida_em', { withTimezone: true }),

    // Vencimento opcional
    dataVencimento: timestamp('data_vencimento', { withTimezone: true }),

    // Entidade relacionada (opcional) - ex: vincular a uma cotação ou cliente
    entidadeTipo: varchar('entidade_tipo', { length: 50 }), // 'cotacao', 'cliente', 'renovacao', etc.
    entidadeId: uuid('entidade_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_tarefa_corretora').on(table.corretoraId),
    index('idx_tarefa_usuario').on(table.usuarioId),
    index('idx_tarefa_concluida').on(table.concluida),
    index('idx_tarefa_vencimento').on(table.dataVencimento),
    index('idx_tarefa_entidade_id').on(table.entidadeId),
    index('idx_tarefa_entidade_tipo_id').on(table.entidadeTipo, table.entidadeId),
    index('idx_tarefa_usuario_concluida').on(table.usuarioId, table.concluida),
  ],
);

export const tarefasRelations = relations(tarefas, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [tarefas.corretoraId],
    references: [corretoras.id],
  }),
  usuario: one(usuarios, {
    fields: [tarefas.usuarioId],
    references: [usuarios.id],
  }),
}));

export type Tarefa = typeof tarefas.$inferSelect;
export type NewTarefa = typeof tarefas.$inferInsert;
