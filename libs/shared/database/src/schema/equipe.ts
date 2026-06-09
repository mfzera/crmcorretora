import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { corretoras } from './corretora';

export const equipes = pgTable(
  'equipe',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    nome: varchar('nome', { length: 256 }).notNull(),
    gestorId: uuid('gestor_id'),

    ativo: boolean('ativo').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('unq_corretora_equipe').on(table.corretoraId, table.nome),
    index('idx_equipe_corretora').on(table.corretoraId),
    index('idx_equipe_gestor').on(table.gestorId),
  ],
);

export type Equipe = typeof equipes.$inferSelect;
export type NewEquipe = typeof equipes.$inferInsert;
