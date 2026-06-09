import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { produtos } from './produto';

export const seguradorasParceiras = pgTable(
  'seguradoras_parceiras',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Tenant isolation - referência para a corretora (tenant)
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Dados da Seguradora Parceira
    cnpj: varchar('cnpj', { length: 18 }).notNull(),
    razaoSocial: varchar('razao_social', { length: 255 }).notNull(),
    nomeFantasia: varchar('nome_fantasia', { length: 255 }),

    // Contatos
    telefone: varchar('telefone', { length: 20 }),
    email: varchar('email', { length: 255 }),

    // Suporte 24h (exibido no portal do segurado)
    telefone24h: varchar('telefone_24h', { length: 20 }),
    whatsapp24h: varchar('whatsapp_24h', { length: 20 }),
    horarioAtendimento24h: varchar('horario_atendimento_24h', { length: 100 }),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('ATIVA'),

    // Soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_seguradoras_parceiras_corretora').on(table.corretoraId),
    index('idx_seguradoras_parceiras_cnpj').on(table.cnpj),
    index('idx_seguradoras_parceiras_status').on(table.status),
  ],
);

export const seguradorasParceiraasRelations = relations(
  seguradorasParceiras,
  ({ one, many }) => ({
    corretora: one(corretoras, {
      fields: [seguradorasParceiras.corretoraId],
      references: [corretoras.id],
    }),
    produtos: many(produtos),
  }),
);

export type SeguradoraParceira = typeof seguradorasParceiras.$inferSelect;
export type NewSeguradoraParceira = typeof seguradorasParceiras.$inferInsert;
