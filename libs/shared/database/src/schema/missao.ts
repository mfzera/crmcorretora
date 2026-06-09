import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { equipes } from './equipe';
import { usuarios } from './usuario';
import { badgeTipos } from './badge';
import { tipoMetricaEnum, statusMissaoEnum } from './enums';

export const missoes = pgTable(
  'missao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Destinatário (exatamente um)
    equipeId: uuid('equipe_id').references(() => equipes.id, {
      onDelete: 'cascade',
    }),
    usuarioId: uuid('usuario_id').references(() => usuarios.id, {
      onDelete: 'cascade',
    }),

    criadaPorId: uuid('criada_por_id')
      .notNull()
      .references(() => usuarios.id),

    titulo: varchar('titulo', { length: 255 }).notNull(),
    descricao: text('descricao'),
    tipoMetrica: tipoMetricaEnum('tipo_metrica').notNull(),
    valorAlvo: decimal('valor_alvo', { precision: 15, scale: 2 }).notNull(),
    dataInicio: date('data_inicio').notNull(),
    prazo: date('prazo').notNull(),

    status: statusMissaoEnum('status').notNull().default('PENDENTE'),

    // Badge opcional concedido ao concluir
    badgeTipoId: uuid('badge_tipo_id').references(() => badgeTipos.id),
    badgeObservacao: text('badge_observacao'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_missao_corretora').on(table.corretoraId),
    index('idx_missao_usuario').on(table.usuarioId),
    index('idx_missao_equipe').on(table.equipeId),
    index('idx_missao_status').on(table.corretoraId, table.status),
  ],
);

export const missoesRelations = relations(missoes, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [missoes.corretoraId],
    references: [corretoras.id],
  }),
  equipe: one(equipes, {
    fields: [missoes.equipeId],
    references: [equipes.id],
  }),
  usuario: one(usuarios, {
    fields: [missoes.usuarioId],
    references: [usuarios.id],
    relationName: 'missaoUsuario',
  }),
  criadaPor: one(usuarios, {
    fields: [missoes.criadaPorId],
    references: [usuarios.id],
    relationName: 'missaoCriadaPor',
  }),
  badgeTipo: one(badgeTipos, {
    fields: [missoes.badgeTipoId],
    references: [badgeTipos.id],
  }),
}));
