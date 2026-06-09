import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';

export const notificacoes = pgTable(
  'notificacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Destinatário
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    // Tipo de notificação
    tipo: varchar('tipo', { length: 50 }).notNull(), // 'cotacao', 'renovacao', 'endosso', 'sistema', etc.

    // Conteúdo
    titulo: varchar('titulo', { length: 255 }).notNull(),
    mensagem: text('mensagem').notNull(),

    // Link de ação (opcional)
    linkAcao: varchar('link_acao', { length: 512 }),

    // Prioridade da notificação
    prioridade: varchar('prioridade', { length: 20 })
      .default('media')
      .notNull(), // 'baixa', 'media', 'alta', 'urgente'

    // Metadados adicionais
    metadata: jsonb('metadata'), // JSON com dados extras, como IDs relacionados

    // Status
    lida: boolean('lida').default(false).notNull(),
    lidaEm: timestamp('lida_em', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_notificacao_corretora').on(table.corretoraId),
    index('idx_notificacao_usuario').on(table.usuarioId),
    index('idx_notificacao_lida').on(table.lida),
    index('idx_notificacao_tipo').on(table.tipo),
    index('idx_notificacao_created').on(table.createdAt),
  ],
);

export const notificacoesRelations = relations(notificacoes, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [notificacoes.corretoraId],
    references: [corretoras.id],
  }),
  usuario: one(usuarios, {
    fields: [notificacoes.usuarioId],
    references: [usuarios.id],
  }),
}));

export type Notificacao = typeof notificacoes.$inferSelect;
export type NewNotificacao = typeof notificacoes.$inferInsert;
