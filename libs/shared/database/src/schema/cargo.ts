import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { corretoras } from './corretora';
import { cargoPermissoes } from './permissao';

export const cargos = pgTable(
  'cargo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    nomeCargo: varchar('nome_cargo', { length: 100 }).notNull(),
    descricao: text('descricao'),
    cor: varchar('cor', { length: 7 }),

    // Flags de nível
    isAdmin: boolean('is_admin').default(false),
    isGestor: boolean('is_gestor').default(false),
    isVendedor: boolean('is_vendedor').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('unq_corretora_cargo')
      .on(table.corretoraId, table.nomeCargo)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_cargo_corretora').on(table.corretoraId),
  ],
);

export const cargosRelations = relations(cargos, ({ one, many }) => ({
  corretora: one(corretoras, {
    fields: [cargos.corretoraId],
    references: [corretoras.id],
  }),
  permissoes: many(cargoPermissoes),
}));

export type Cargo = typeof cargos.$inferSelect;
export type NewCargo = typeof cargos.$inferInsert;
