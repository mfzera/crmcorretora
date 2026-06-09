import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { equipes } from './equipe';
import { usuarios } from './usuario';
import { statusMetaEnum, tipoMetricaEnum } from './enums';

export const metas = pgTable(
  'meta',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Escopo (exatamente um ou nenhum = corretora-wide)
    equipeId: uuid('equipe_id').references(() => equipes.id, {
      onDelete: 'cascade',
    }),
    usuarioId: uuid('usuario_id').references(() => usuarios.id, {
      onDelete: 'cascade',
    }),

    criadaPorId: uuid('criada_por_id')
      .notNull()
      .references(() => usuarios.id),

    titulo: varchar('titulo', { length: 255 }).notNull(),
    descricao: text('descricao'),
    tipoMetrica: tipoMetricaEnum('tipo_metrica').notNull(),
    valorAlvo: decimal('valor_alvo', { precision: 15, scale: 2 }).notNull(),

    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim').notNull(),

    status: statusMetaEnum('status').notNull().default('ATIVA'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_meta_corretora').on(table.corretoraId),
    index('idx_meta_equipe').on(table.equipeId),
    index('idx_meta_usuario').on(table.usuarioId),
    index('idx_meta_status').on(table.corretoraId, table.status),
  ],
);

export const metasRelations = relations(metas, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [metas.corretoraId],
    references: [corretoras.id],
  }),
  equipe: one(equipes, {
    fields: [metas.equipeId],
    references: [equipes.id],
  }),
  usuario: one(usuarios, {
    fields: [metas.usuarioId],
    references: [usuarios.id],
    relationName: 'metaUsuario',
  }),
  criadaPor: one(usuarios, {
    fields: [metas.criadaPorId],
    references: [usuarios.id],
    relationName: 'metaCriadaPor',
  }),
}));
