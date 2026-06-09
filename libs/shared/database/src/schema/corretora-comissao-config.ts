import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { tipoNegocioComissaoEnum } from './enums';

export const corretoraComissaoConfigs = pgTable(
  'corretora_comissao_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    tipoSeguro: varchar('tipo_seguro', { length: 100 }).notNull(),
    tipoNegocio: tipoNegocioComissaoEnum('tipo_negocio'), // NULL = aplica a ambos
    percentualParticipacao: decimal('percentual_participacao', {
      precision: 5,
      scale: 2,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('unq_corretora_comissao_tipo').on(
      table.corretoraId,
      table.tipoSeguro,
      table.tipoNegocio,
    ),
    index('idx_corretora_comissao_corretora').on(table.corretoraId),
  ],
);

export const corretoraComissaoConfigsRelations = relations(
  corretoraComissaoConfigs,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [corretoraComissaoConfigs.corretoraId],
      references: [corretoras.id],
    }),
  }),
);

export type CorretoraComissaoConfig = typeof corretoraComissaoConfigs.$inferSelect;
export type NewCorretoraComissaoConfig = typeof corretoraComissaoConfigs.$inferInsert;
