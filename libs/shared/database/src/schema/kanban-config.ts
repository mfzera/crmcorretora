import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { corretoras } from './corretora';

// Configuração por coluna (padrão ou customizada) por tipo de board por corretora
export const kanbanBoardConfigs = pgTable(
  'kanban_board_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    boardType: varchar('board_type', { length: 50 }).notNull(),
    columnId: varchar('column_id', { length: 100 }).notNull(),
    visible: boolean('visible').notNull().default(true),
    ordem: integer('ordem').notNull().default(0),
    label: varchar('label', { length: 100 }),
    color: varchar('color', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_kanban_board_config').on(table.corretoraId, table.boardType, table.columnId),
    index('idx_kanban_board_config_lookup').on(table.corretoraId, table.boardType),
  ],
);

// Colunas adicionais criadas pelo usuário por tipo de board
export const kanbanCustomColumns = pgTable(
  'kanban_custom_column',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    boardType: varchar('board_type', { length: 50 }).notNull(),
    label: varchar('label', { length: 100 }).notNull(),
    color: varchar('color', { length: 100 }).notNull().default('bg-slate-500'),
    ordem: integer('ordem').notNull().default(999),
    isTerminal: boolean('is_terminal').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_kanban_custom_column_lookup').on(table.corretoraId, table.boardType),
  ],
);

export type KanbanBoardConfig = typeof kanbanBoardConfigs.$inferSelect;
export type NewKanbanBoardConfig = typeof kanbanBoardConfigs.$inferInsert;
export type KanbanCustomColumn = typeof kanbanCustomColumns.$inferSelect;
export type NewKanbanCustomColumn = typeof kanbanCustomColumns.$inferInsert;
