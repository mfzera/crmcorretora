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
import { usuarios } from './usuario';
import { tipoNegocioComissaoEnum } from './enums';

export const usuarioComissaoConfigs = pgTable(
  'usuario_comissao_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
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
    unique('unq_usuario_comissao_tipo').on(
      table.corretoraId,
      table.usuarioId,
      table.tipoSeguro,
      table.tipoNegocio,
    ),
    index('idx_usuario_comissao_corretora').on(table.corretoraId),
    index('idx_usuario_comissao_usuario').on(table.usuarioId),
  ],
);

export const usuarioComissaoConfigsRelations = relations(
  usuarioComissaoConfigs,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [usuarioComissaoConfigs.corretoraId],
      references: [corretoras.id],
    }),
    usuario: one(usuarios, {
      fields: [usuarioComissaoConfigs.usuarioId],
      references: [usuarios.id],
    }),
  }),
);

export type UsuarioComissaoConfig = typeof usuarioComissaoConfigs.$inferSelect;
export type NewUsuarioComissaoConfig = typeof usuarioComissaoConfigs.$inferInsert;
