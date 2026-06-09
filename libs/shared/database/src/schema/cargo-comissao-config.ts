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
import { cargos } from './cargo';
import { tipoNegocioComissaoEnum } from './enums';

export const cargoComissaoConfigs = pgTable(
  'cargo_comissao_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    cargoId: uuid('cargo_id')
      .notNull()
      .references(() => cargos.id, { onDelete: 'cascade' }),
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
    unique('unq_cargo_comissao_tipo').on(
      table.corretoraId,
      table.cargoId,
      table.tipoSeguro,
      table.tipoNegocio,
    ),
    index('idx_cargo_comissao_corretora').on(table.corretoraId),
    index('idx_cargo_comissao_cargo').on(table.cargoId),
  ],
);

export const cargoComissaoConfigsRelations = relations(
  cargoComissaoConfigs,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [cargoComissaoConfigs.corretoraId],
      references: [corretoras.id],
    }),
    cargo: one(cargos, {
      fields: [cargoComissaoConfigs.cargoId],
      references: [cargos.id],
    }),
  }),
);

export type CargoComissaoConfig = typeof cargoComissaoConfigs.$inferSelect;
export type NewCargoComissaoConfig = typeof cargoComissaoConfigs.$inferInsert;
