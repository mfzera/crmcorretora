import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';
import { tipoOperacaoComissaoConfigEnum } from './enums';

export const comissaoConfigHistorico = pgTable(
  'comissao_config_historico',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Qual tabela foi afetada: 'global' | 'cargo' | 'vendedor'
    escopo: varchar('escopo', { length: 20 }).notNull(),

    // ID do registro afetado (pode ser null em exclusões após o fato)
    registroId: uuid('registro_id'),

    tipoOperacao: tipoOperacaoComissaoConfigEnum('tipo_operacao').notNull(),

    // Snapshot dos dados antes e depois
    dadosAntes: jsonb('dados_antes'),
    dadosDepois: jsonb('dados_depois'),

    // Quem fez a alteração
    usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
    usuarioNome: varchar('usuario_nome', { length: 255 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_comissao_config_historico_corretora').on(table.corretoraId),
    index('idx_comissao_config_historico_created').on(table.createdAt),
  ],
);

export const comissaoConfigHistoricoRelations = relations(comissaoConfigHistorico, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [comissaoConfigHistorico.corretoraId],
    references: [corretoras.id],
  }),
  usuario: one(usuarios, {
    fields: [comissaoConfigHistorico.usuarioId],
    references: [usuarios.id],
  }),
}));

export type ComissaoConfigHistorico = typeof comissaoConfigHistorico.$inferSelect;
export type NewComissaoConfigHistorico = typeof comissaoConfigHistorico.$inferInsert;
