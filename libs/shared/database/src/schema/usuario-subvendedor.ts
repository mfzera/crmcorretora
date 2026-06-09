import {
  pgTable,
  uuid,
  numeric,
  date,
  boolean,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { usuarios } from './usuario';

export const usuarioSubvendedores = pgTable(
  'usuario_subvendedor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vendedorPrincipalId: uuid('vendedor_principal_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    subvendedorId: uuid('subvendedor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    percentualNovo: numeric('percentual_novo', { precision: 5, scale: 2 }),
    percentualRenovacao: numeric('percentual_renovacao', { precision: 5, scale: 2 }),
    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim'),
    ativo: boolean('ativo').notNull().default(true),
    criadoPorId: uuid('criado_por_id').references(() => usuarios.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('unq_usuario_subvendedor').on(table.vendedorPrincipalId, table.subvendedorId),
    index('idx_subvendedor_principal').on(table.vendedorPrincipalId),
    index('idx_subvendedor_sub').on(table.subvendedorId),
  ],
);

export type UsuarioSubvendedor = typeof usuarioSubvendedores.$inferSelect;
export type NewUsuarioSubvendedor = typeof usuarioSubvendedores.$inferInsert;
