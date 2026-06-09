import {
  pgTable,
  uuid,
  varchar,
  boolean,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { corretoras } from './corretora';

export const VENDEDOR_TIPOS = ['principal', 'secundario', 'externo'] as const;
export type VendedorTipo = (typeof VENDEDOR_TIPOS)[number];

export const vendedores = pgTable(
  'vendedor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    nome: varchar('nome', { length: 256 }).notNull(),
    email: varchar('email', { length: 256 }),
    telefone: varchar('telefone', { length: 20 }),
    tipo: varchar('tipo', { length: 20 }).notNull().default('principal'),
    observacoes: text('observacoes'),
    ativo: boolean('ativo').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_vendedor_corretora').on(table.corretoraId),
    index('idx_vendedor_ativo').on(table.ativo),
  ],
);

export type Vendedor = typeof vendedores.$inferSelect;
export type NewVendedor = typeof vendedores.$inferInsert;
