import {
  pgTable,
  uuid,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cotacoes } from "./cotacao";
import { usuarios } from "./usuario";
import { papelCotacaoVendedorEnum } from "./enums";

export const cotacaoVendedores = pgTable(
  "cotacao_vendedor",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cotacaoId: uuid("cotacao_id")
      .notNull()
      .references(() => cotacoes.id, { onDelete: "cascade" }),
    vendedorId: uuid("vendedor_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    dataAtribuicao: timestamp("data_atribuicao", { withTimezone: true })
      .notNull()
      .defaultNow(),
    atribuidoPor: uuid("atribuido_por").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    ativo: boolean("ativo").notNull().default(true),
    papel: papelCotacaoVendedorEnum("papel").notNull().default("COTADOR"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_cotacao_vendedor_cotacao_ativo").on(table.cotacaoId, table.ativo),
    index("idx_cotacao_vendedor_historico").on(
      table.cotacaoId,
      table.dataAtribuicao,
    ),
  ],
);

export const cotacaoVendedoresRelations = relations(
  cotacaoVendedores,
  ({ one }) => ({
    cotacao: one(cotacoes, {
      fields: [cotacaoVendedores.cotacaoId],
      references: [cotacoes.id],
    }),
    vendedor: one(usuarios, {
      fields: [cotacaoVendedores.vendedorId],
      references: [usuarios.id],
    }),
    atribuidoPorUsuario: one(usuarios, {
      fields: [cotacaoVendedores.atribuidoPor],
      references: [usuarios.id],
    }),
  }),
);

export type CotacaoVendedor = typeof cotacaoVendedores.$inferSelect;
export type NewCotacaoVendedor = typeof cotacaoVendedores.$inferInsert;
