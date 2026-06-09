import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';
import { equipes } from './equipe';
import { cotacoes } from './cotacao';

export const cotacaoTags = pgTable(
  'cotacao_tag',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    criadorId: uuid('criador_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    equipeId: uuid('equipe_id').references(() => equipes.id, {
      onDelete: 'set null',
    }),
    nome: varchar('nome', { length: 50 }).notNull(),
    cor: varchar('cor', { length: 7 }).notNull().default('#6366f1'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_cotacao_tag_corretora').on(table.corretoraId),
    index('idx_cotacao_tag_criador').on(table.criadorId),
    index('idx_cotacao_tag_equipe').on(table.equipeId),
  ],
);

export const cotacaoTagRelacoes = pgTable(
  'cotacao_tag_relacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cotacaoId: uuid('cotacao_id')
      .notNull()
      .references(() => cotacoes.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => cotacaoTags.id, { onDelete: 'cascade' }),
    criadoPorId: uuid('criado_por_id').references(() => usuarios.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('unq_cotacao_tag').on(table.cotacaoId, table.tagId),
    index('idx_cotacao_tag_relacao_cotacao').on(table.cotacaoId),
    index('idx_cotacao_tag_relacao_tag').on(table.tagId),
  ],
);

export const cotacaoTagsRelations = relations(cotacaoTags, ({ one, many }) => ({
  corretora: one(corretoras, {
    fields: [cotacaoTags.corretoraId],
    references: [corretoras.id],
  }),
  criador: one(usuarios, {
    fields: [cotacaoTags.criadorId],
    references: [usuarios.id],
  }),
  equipe: one(equipes, {
    fields: [cotacaoTags.equipeId],
    references: [equipes.id],
  }),
  relacoes: many(cotacaoTagRelacoes),
}));

export const cotacaoTagRelacoesRelations = relations(
  cotacaoTagRelacoes,
  ({ one }) => ({
    cotacao: one(cotacoes, {
      fields: [cotacaoTagRelacoes.cotacaoId],
      references: [cotacoes.id],
    }),
    tag: one(cotacaoTags, {
      fields: [cotacaoTagRelacoes.tagId],
      references: [cotacaoTags.id],
    }),
    criadoPor: one(usuarios, {
      fields: [cotacaoTagRelacoes.criadoPorId],
      references: [usuarios.id],
    }),
  }),
);

export type CotacaoTag = typeof cotacaoTags.$inferSelect;
export type NewCotacaoTag = typeof cotacaoTags.$inferInsert;
export type CotacaoTagRelacao = typeof cotacaoTagRelacoes.$inferSelect;
