import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';

// Catálogo global de tipos de badge (compartilhado entre todas as corretoras)
export const badgeTipos = pgTable('badge_tipo', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  nome: varchar('nome', { length: 255 }).notNull(),
  descricao: text('descricao'),
  icone: varchar('icone', { length: 100 }).notNull(),
  cor: varchar('cor', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Instâncias de badges concedidos a usuários
export const usuarioBadges = pgTable(
  'usuario_badge',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    badgeTipoId: uuid('badge_tipo_id')
      .notNull()
      .references(() => badgeTipos.id),

    // Origem: como foi concedido
    metaId: uuid('meta_id'),
    missaoId: uuid('missao_id'),
    concedidoPorId: uuid('concedido_por_id').references(() => usuarios.id), // null = automático

    observacao: text('observacao'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_usuario_badge_usuario').on(table.usuarioId),
    index('idx_usuario_badge_corretora').on(table.corretoraId),
  ],
);

export const badgeTiposRelations = relations(badgeTipos, ({ many }) => ({
  instancias: many(usuarioBadges),
}));

export const usuarioBadgesRelations = relations(usuarioBadges, ({ one }) => ({
  badgeTipo: one(badgeTipos, {
    fields: [usuarioBadges.badgeTipoId],
    references: [badgeTipos.id],
  }),
  usuario: one(usuarios, {
    fields: [usuarioBadges.usuarioId],
    references: [usuarios.id],
    relationName: 'badgeUsuario',
  }),
  concedidoPor: one(usuarios, {
    fields: [usuarioBadges.concedidoPorId],
    references: [usuarios.id],
    relationName: 'badgeConcedidoPor',
  }),
}));
