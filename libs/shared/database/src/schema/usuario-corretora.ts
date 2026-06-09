import {
  pgTable,
  uuid,
  boolean,
  timestamp,
  unique,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usuarios } from './usuario';
import { corretoras } from './corretora';
import { cargos } from './cargo';

/**
 * Junction table for many-to-many relationship between usuarios and corretoras
 * Allows a user to belong to multiple corretoras with different roles
 */
export const usuarioCorretora = pgTable(
  'usuario_corretora',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    cargoId: uuid('cargo_id').references(() => cargos.id, {
      onDelete: 'set null',
    }),

    // Permissões específicas para esta corretora (sobrescreve permissões do cargo)
    permissoes: jsonb('permissoes').$type<string[]>().default([]),

    ativo: boolean('ativo').notNull().default(true),
    dataVinculo: timestamp('data_vinculo', { withTimezone: true })
      .notNull()
      .defaultNow(),
    vinculadoPorId: uuid('vinculado_por_id').references(() => usuarios.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('unq_usuario_corretora').on(table.usuarioId, table.corretoraId),
    index('idx_usuario_corretora_usuario').on(table.usuarioId),
    index('idx_usuario_corretora_corretora').on(table.corretoraId),
    index('idx_usuario_corretora_ativo').on(table.ativo),
  ],
);

// Relations
export const usuarioCorretoraRelations = relations(
  usuarioCorretora,
  ({ one }) => ({
    usuario: one(usuarios, {
      fields: [usuarioCorretora.usuarioId],
      references: [usuarios.id],
    }),
    corretora: one(corretoras, {
      fields: [usuarioCorretora.corretoraId],
      references: [corretoras.id],
    }),
    cargo: one(cargos, {
      fields: [usuarioCorretora.cargoId],
      references: [cargos.id],
    }),
    vinculadoPor: one(usuarios, {
      fields: [usuarioCorretora.vinculadoPorId],
      references: [usuarios.id],
      relationName: 'vinculadorVinculos',
    }),
  }),
);

export type UsuarioCorretora = typeof usuarioCorretora.$inferSelect;
export type NewUsuarioCorretora = typeof usuarioCorretora.$inferInsert;
