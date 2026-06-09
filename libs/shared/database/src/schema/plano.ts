import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const planos = pgTable('plano', {
  id: uuid('id').primaryKey().defaultRandom(),

  nomePlano: varchar('nome_plano', { length: 100 }).notNull().unique(),
  descricao: text('descricao'),

  // Limites
  limiteUsuarios: integer('limite_usuarios'),
  limiteVendedores: integer('limite_vendedores'),
  limiteClientes: integer('limite_clientes'),
  limiteVendasMes: integer('limite_vendas_mes'),

  // Valores (legacy fixed pricing)
  valorMensal: decimal('valor_mensal', { precision: 10, scale: 2 }).notNull(),
  valorAnual: decimal('valor_anual', { precision: 10, scale: 2 }),

  // Per-Seat Pricing Model (NEW)
  // 'FIXED' | 'PER_SEAT' | 'HYBRID'
  modeloPrecificacao: varchar('modelo_precificacao', { length: 50 }).default(
    'FIXED',
  ),

  // For hybrid model (base + per-seat)
  valorBase: decimal('valor_base', { precision: 10, scale: 2 }), // R$ 119,89
  seatsInclusos: integer('seats_inclusos').default(3), // 3 included seats
  valorPorSeat: decimal('valor_por_seat', { precision: 10, scale: 2 }), // R$ 69,89/seat

  // Features
  features: jsonb('features').$type<Record<string, boolean>>(),

  ativo: boolean('ativo').default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Plano = typeof planos.$inferSelect;
export type NewPlano = typeof planos.$inferInsert;
