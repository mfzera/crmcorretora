import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { permissoesGlobais } from './permissao';

export const cargoTemplates = pgTable(
  'cargo_template',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    nomeTemplate: varchar('nome_template', { length: 100 }).notNull().unique(),
    descricao: text('descricao'),
    cor: varchar('cor', { length: 7 }),

    // Flags de nível
    isAdmin: boolean('is_admin').default(false),
    isGestor: boolean('is_gestor').default(false),
    isVendedor: boolean('is_vendedor').default(false),

    // Template metadata
    categoria: varchar('categoria', { length: 50 }),
    ordem: integer('ordem').default(0),
    ativo: boolean('ativo').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_cargo_template_categoria').on(table.categoria),
    index('idx_cargo_template_ativo').on(table.ativo),
  ],
);

export const cargoTemplatePermissoes = pgTable(
  'cargo_template_permissao',
  {
    templateId: uuid('template_id')
      .notNull()
      .references(() => cargoTemplates.id, { onDelete: 'cascade' }),
    permissaoGlobalId: uuid('permissao_global_id')
      .notNull()
      .references(() => permissoesGlobais.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.templateId, table.permissaoGlobalId] }),
    index('idx_cargo_template_permissao_template').on(table.templateId),
  ],
);

export const cargoTemplatesRelations = relations(
  cargoTemplates,
  ({ many }) => ({
    permissoes: many(cargoTemplatePermissoes),
  }),
);

export const cargoTemplatePermissoesRelations = relations(
  cargoTemplatePermissoes,
  ({ one }) => ({
    template: one(cargoTemplates, {
      fields: [cargoTemplatePermissoes.templateId],
      references: [cargoTemplates.id],
    }),
    permissao: one(permissoesGlobais, {
      fields: [cargoTemplatePermissoes.permissaoGlobalId],
      references: [permissoesGlobais.id],
    }),
  }),
);

export type CargoTemplate = typeof cargoTemplates.$inferSelect;
export type NewCargoTemplate = typeof cargoTemplates.$inferInsert;
