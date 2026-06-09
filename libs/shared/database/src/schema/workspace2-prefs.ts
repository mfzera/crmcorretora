import { pgTable, uuid, jsonb, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { usuarios } from './usuario';
import { corretoras } from './corretora';

export const workspace2PlanilhaPrefs = pgTable(
  'workspace2_planilha_prefs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    columnState: jsonb('column_state').default('[]'),
    columnColors: jsonb('column_colors').default('{}'),
    filterState: jsonb('filter_state').default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_workspace2_planilha_prefs_usuario_corretora').on(table.usuarioId, table.corretoraId),
    index('idx_workspace2_planilha_prefs_lookup').on(table.usuarioId, table.corretoraId),
  ],
);

export type Workspace2PlanilhaPrefs = typeof workspace2PlanilhaPrefs.$inferSelect;
export type NewWorkspace2PlanilhaPrefs = typeof workspace2PlanilhaPrefs.$inferInsert;
