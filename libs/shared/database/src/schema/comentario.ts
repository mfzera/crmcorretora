import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';

export const comentarios = pgTable(
  'comentario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    entidadeTipo: varchar('entidade_tipo', { length: 20 }).notNull(),
    entidadeId: uuid('entidade_id').notNull(),
    autorId: uuid('autor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    texto: text('texto').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    entidadeIdx: index('comentario_entidade_idx').on(t.entidadeTipo, t.entidadeId),
    corretoraIdx: index('comentario_corretora_idx').on(t.corretoraId),
  }),
);

export const comentariosRelations = relations(comentarios, ({ one }) => ({
  autor: one(usuarios, {
    fields: [comentarios.autorId],
    references: [usuarios.id],
  }),
  corretora: one(corretoras, {
    fields: [comentarios.corretoraId],
    references: [corretoras.id],
  }),
}));
