import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { corretoras } from './corretora';
import { cargos } from './cargo';
import { equipes } from './equipe';

export const usuarios = pgTable(
  'usuario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Corretora ativa (para multi-tenant - qual corretora está usando no momento)
    corretoraAtivaId: uuid('corretora_ativa_id').references(
      () => corretoras.id,
      { onDelete: 'set null' },
    ),

    // Cargo e Equipe
    cargoId: uuid('cargo_id').references(() => cargos.id, {
      onDelete: 'set null',
    }),
    equipeId: uuid('equipe_id').references(() => equipes.id, {
      onDelete: 'set null',
    }),

    // Hierarquia (Vendedor → Gestor)
    gestorId: uuid('gestor_id'),

    // Dados pessoais
    nome: varchar('nome', { length: 256 }).notNull(),
    email: varchar('email', { length: 256 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),

    // Contato
    telefone: varchar('telefone', { length: 20 }),

    // Avatar
    avatarUrl: varchar('avatar_url', { length: 1024 }),
    avatarR2Key: varchar('avatar_r2_key', { length: 512 }),

    // Status
    ativo: boolean('ativo').default(true),
    primeiroAcesso: boolean('primeiro_acesso').default(true),
    ultimoLogin: timestamp('ultimo_login', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    anonimizadoEm: timestamp('anonimizado_em', { withTimezone: true }),
  },
  (table) => [
    unique('unq_usuario_email').on(table.email),
    index('idx_usuario_corretora').on(table.corretoraId),
    index('idx_usuario_cargo').on(table.cargoId),
    index('idx_usuario_equipe').on(table.equipeId),
    index('idx_usuario_gestor').on(table.gestorId),
    index('idx_usuario_email').on(table.email),
  ],
);

export type Usuario = typeof usuarios.$inferSelect;
export type NewUsuario = typeof usuarios.$inferInsert;
