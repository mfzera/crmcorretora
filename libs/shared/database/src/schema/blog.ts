import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { z } from 'zod';
import { admins } from './admin';

export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  coverImageUrl: text('cover_image_url'),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  publishedById: uuid('published_by_id').references(() => admins.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  publishedByAdmin: one(admins, {
    fields: [blogPosts.publishedById],
    references: [admins.id],
  }),
}));

export const insertBlogPostSchema = z.object({
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  title: z.string().min(1, 'Título é obrigatório'),
  excerpt: z.string().min(1, 'Resumo é obrigatório'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  coverImageUrl: z.string().url().nullable().optional(),
});

export const updateBlogPostSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(1).optional(),
  excerpt: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  coverImageUrl: z.string().url().nullable().optional(),
}).partial();

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;
export type UpdateBlogPost = Partial<InsertBlogPost>;
