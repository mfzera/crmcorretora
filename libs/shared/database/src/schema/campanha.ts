import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { seguradorasParceiras } from './seguradora-parceira';
import { usuarios } from './usuario';

export const campanhas = pgTable(
  'campanha',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    titulo: varchar('titulo', { length: 255 }).notNull(),
    descricao: text('descricao').notNull(),
    seguradoraParceiraId: uuid('seguradora_parceira_id').references(
      () => seguradorasParceiras.id,
      { onDelete: 'set null' },
    ),

    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim').notNull(),
    ativa: boolean('ativa').notNull().default(true),

    criadaPorId: uuid('criada_por_id')
      .notNull()
      .references(() => usuarios.id),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_campanha_corretora').on(table.corretoraId),
    index('idx_campanha_ativa').on(table.corretoraId, table.ativa),
    index('idx_campanha_datas').on(table.dataInicio, table.dataFim),
  ],
);

export const campanhasRelations = relations(campanhas, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [campanhas.corretoraId],
    references: [corretoras.id],
  }),
  seguradoraParceira: one(seguradorasParceiras, {
    fields: [campanhas.seguradoraParceiraId],
    references: [seguradorasParceiras.id],
  }),
  criadaPor: one(usuarios, {
    fields: [campanhas.criadaPorId],
    references: [usuarios.id],
  }),
}));
