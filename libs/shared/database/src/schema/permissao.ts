import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { cargos } from './cargo';
import { corretoras } from './corretora';
import { usuarios } from './usuario';

export const permissoesGlobais = pgTable('permissao_global', {
  id: uuid('id').primaryKey().defaultRandom(),

  nomePermissao: varchar('nome_permissao', { length: 100 }).notNull().unique(),
  descricao: text('descricao'),
  grupo: varchar('grupo', { length: 50 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const cargoPermissoes = pgTable(
  'cargo_permissao',
  {
    cargoId: uuid('cargo_id')
      .notNull()
      .references(() => cargos.id, { onDelete: 'cascade' }),
    permissaoGlobalId: uuid('permissao_global_id')
      .notNull()
      .references(() => permissoesGlobais.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.cargoId, table.permissaoGlobalId] }),
    index('idx_cargo_permissao_cargo').on(table.cargoId),
  ],
);

export const cargoPermissoesRelations = relations(
  cargoPermissoes,
  ({ one }) => ({
    cargo: one(cargos, {
      fields: [cargoPermissoes.cargoId],
      references: [cargos.id],
    }),
    permissao: one(permissoesGlobais, {
      fields: [cargoPermissoes.permissaoGlobalId],
      references: [permissoesGlobais.id],
    }),
  }),
);

// Tabela de auditoria de permissões
export const auditoriaPermissoes = pgTable(
  'auditoria_permissao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    cargoId: uuid('cargo_id').references(() => cargos.id, {
      onDelete: 'set null',
    }),
    acao: varchar('acao', { length: 100 }).notNull(),
    permissaoGlobalId: uuid('permissao_global_id').references(
      () => permissoesGlobais.id,
      { onDelete: 'set null' },
    ),
    metadados: text('metadados').$type<Record<string, any>>(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_auditoria_permissao_corretora').on(table.corretoraId),
    index('idx_auditoria_permissao_usuario').on(table.usuarioId),
    index('idx_auditoria_permissao_cargo').on(table.cargoId),
    index('idx_auditoria_permissao_acao').on(table.acao),
    index('idx_auditoria_permissao_created_at').on(table.createdAt),
  ],
);

export const auditoriaPermissoesRelations = relations(
  auditoriaPermissoes,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [auditoriaPermissoes.corretoraId],
      references: [corretoras.id],
    }),
    usuario: one(usuarios, {
      fields: [auditoriaPermissoes.usuarioId],
      references: [usuarios.id],
    }),
    cargo: one(cargos, {
      fields: [auditoriaPermissoes.cargoId],
      references: [cargos.id],
    }),
    permissao: one(permissoesGlobais, {
      fields: [auditoriaPermissoes.permissaoGlobalId],
      references: [permissoesGlobais.id],
    }),
  }),
);

export type PermissaoGlobal = typeof permissoesGlobais.$inferSelect;
export type NewPermissaoGlobal = typeof permissoesGlobais.$inferInsert;
export type CargoPermissao = typeof cargoPermissoes.$inferSelect;
export type NewCargoPermissao = typeof cargoPermissoes.$inferInsert;
export type AuditoriaPermissao = typeof auditoriaPermissoes.$inferSelect;
export type NewAuditoriaPermissao = typeof auditoriaPermissoes.$inferInsert;
