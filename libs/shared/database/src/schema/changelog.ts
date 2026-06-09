import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { admins } from './admin';

// Enum for change types
export const tipoMudancaEnum = pgEnum('tipo_mudanca', [
  'feature',
  'bugfix',
  'improvement',
  'breaking',
  'security',
  'documentation',
]);

// Changelogs table
export const changelogs = pgTable('changelogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: text('version').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  releaseDate: timestamp('release_date', { withTimezone: true }).notNull(),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  publishedById: uuid('published_by_id').references(() => admins.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Individual changes within a changelog
export const changelogItems = pgTable('changelog_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  changelogId: uuid('changelog_id')
    .notNull()
    .references(() => changelogs.id, { onDelete: 'cascade' }),
  type: tipoMudancaEnum('type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  metadata: jsonb('metadata'),
  order: text('order').notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Relations
export const changelogsRelations = relations(changelogs, ({ many, one }) => ({
  items: many(changelogItems),
  publishedByAdmin: one(admins, {
    fields: [changelogs.publishedById],
    references: [admins.id],
  }),
}));

export const changelogItemsRelations = relations(changelogItems, ({ one }) => ({
  changelog: one(changelogs, {
    fields: [changelogItems.changelogId],
    references: [changelogs.id],
  }),
}));

// Zod schemas for validation
export const insertChangelogSchema = z.object({
  version: z
    .string()
    .min(1, 'Versão é obrigatória')
    .regex(/^\d+\.\d+\.\d+(\.\d+){0,2}$/, 'Formato de versão inválido (use X.Y.Z)'),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  releaseDate: z.date(),
  isPublished: z.boolean().default(false),
  publishedAt: z.date().nullable().optional(),
  publishedById: z.string().uuid().nullable().optional(),
});

export const updateChangelogSchema = z
  .object({
    title: z.string().min(1, 'Título é obrigatório').optional(),
    description: z.string().optional(),
    releaseDate: z.date().optional(),
  })
  .partial();

export const insertChangelogItemSchema = z.object({
  changelogId: z.string().uuid('ID do changelog inválido'),
  type: z.enum([
    'feature',
    'bugfix',
    'improvement',
    'breaking',
    'security',
    'documentation',
  ]),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  metadata: z.any().optional(),
  order: z.string().default('0'),
});

export const updateChangelogItemSchema = z
  .object({
    type: z
      .enum([
        'feature',
        'bugfix',
        'improvement',
        'breaking',
        'security',
        'documentation',
      ])
      .optional(),
    title: z.string().min(1, 'Título é obrigatório').optional(),
    description: z.string().min(1, 'Descrição é obrigatória').optional(),
    metadata: z.any().optional(),
    order: z.string().optional(),
  })
  .partial();

// Types
export type Changelog = typeof changelogs.$inferSelect;
export type InsertChangelog = typeof changelogs.$inferInsert;
export type UpdateChangelog = Partial<InsertChangelog>;

export type ChangelogItem = typeof changelogItems.$inferSelect;
export type InsertChangelogItem = typeof changelogItems.$inferInsert;
export type UpdateChangelogItem = Partial<InsertChangelogItem>;

export type ChangelogWithItems = Changelog & {
  items: ChangelogItem[];
};
