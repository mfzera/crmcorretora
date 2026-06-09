import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// Enum for item status
export const statusRoadmapEnum = pgEnum('status_roadmap', [
  'done',
  'in_progress',
  'planned',
]);

// Roadmap phases table
export const roadmapPhases = pgTable('roadmap_phases', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  estimatedDate: text('estimated_date').notNull(), // format: "YYYY-MM" (year-month)
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  publishedBy: text('published_by'),
  order: text('order').notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// Roadmap items within a phase
export const roadmapItems = pgTable('roadmap_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  phaseId: uuid('phase_id')
    .notNull()
    .references(() => roadmapPhases.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: statusRoadmapEnum('status').notNull().default('planned'),
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
export const roadmapPhasesRelations = relations(roadmapPhases, ({ many }) => ({
  items: many(roadmapItems),
}));

export const roadmapItemsRelations = relations(roadmapItems, ({ one }) => ({
  phase: one(roadmapPhases, {
    fields: [roadmapItems.phaseId],
    references: [roadmapPhases.id],
  }),
}));

// Zod schemas
export const insertRoadmapPhaseSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  estimatedDate: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Formato inválido (use YYYY-MM)'),
  isPublished: z.boolean().default(false),
  publishedAt: z.date().nullable().optional(),
  publishedBy: z.string().nullable().optional(),
  order: z.string().default('0'),
});

export const updateRoadmapPhaseSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
    estimatedDate: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Formato inválido (use YYYY-MM)')
      .optional(),
    order: z.string().optional(),
  })
  .partial();

export const insertRoadmapItemSchema = z.object({
  phaseId: z.string().uuid('ID da fase inválido'),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  status: z.enum(['done', 'in_progress', 'planned']).default('planned'),
  order: z.string().default('0'),
});

export const updateRoadmapItemSchema = z
  .object({
    title: z.string().min(1, 'Título é obrigatório').optional(),
    description: z.string().optional(),
    status: z.enum(['done', 'in_progress', 'planned']).optional(),
    order: z.string().optional(),
  })
  .partial();

// Types
export type RoadmapPhase = typeof roadmapPhases.$inferSelect;
export type InsertRoadmapPhase = typeof roadmapPhases.$inferInsert;

export type RoadmapItem = typeof roadmapItems.$inferSelect;
export type InsertRoadmapItem = typeof roadmapItems.$inferInsert;

export type RoadmapPhaseWithItems = RoadmapPhase & {
  items: RoadmapItem[];
};
