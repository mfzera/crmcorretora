import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';
import { renovacoesComerciais } from './renovacao';
import { documentosVenda } from './documento-venda';
import { statusImportacaoEnum, statusImportacaoItemEnum } from './enums';

export const importacaoRenovacoes = pgTable(
  'importacao_renovacoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    vendedorId: uuid('vendedor_id')
      .notNull()
      .references(() => usuarios.id),
    nomeArquivo: varchar('nome_arquivo', { length: 500 }).notNull(),
    tamanhoArquivo: integer('tamanho_arquivo'),
    status: statusImportacaoEnum('status').notNull().default('PROCESSANDO'),
    totalLinhas: integer('total_linhas').notNull(),
    totalSucesso: integer('total_sucesso').notNull().default(0),
    totalErros: integer('total_erros').notNull().default(0),
    totalPulados: integer('total_pulados').notNull().default(0),
    totalPendentes: integer('total_pendentes').notNull().default(0),
    concluidoEm: timestamp('concluido_em', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_importacao_renovacoes_corretora').on(table.corretoraId),
    index('idx_importacao_renovacoes_usuario').on(table.usuarioId),
    index('idx_importacao_renovacoes_created').on(table.createdAt),
    index('idx_importacao_renovacoes_status').on(
      table.corretoraId,
      table.status,
    ),
  ],
);

export const importacaoRenovacaoItens = pgTable(
  'importacao_renovacao_itens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    importacaoId: uuid('importacao_id')
      .notNull()
      .references(() => importacaoRenovacoes.id, { onDelete: 'cascade' }),
    linhaNumero: integer('linha_numero').notNull(),
    status: statusImportacaoItemEnum('status').notNull(),
    mensagem: text('mensagem'),
    nomeCliente: varchar('nome_cliente', { length: 500 }),
    documentoCliente: varchar('documento_cliente', { length: 20 }),
    produto: varchar('produto', { length: 500 }),
    dadosLinha: jsonb('dados_linha'),
    renovacaoId: uuid('renovacao_id').references(
      () => renovacoesComerciais.id,
      { onDelete: 'set null' },
    ),
    documentoVendaId: uuid('documento_venda_id').references(
      () => documentosVenda.id,
      { onDelete: 'set null' },
    ),
    erroDetalhes: text('erro_detalhes'),
    retentativas: integer('retentativas').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_importacao_item_importacao').on(table.importacaoId),
    index('idx_importacao_item_status').on(table.importacaoId, table.status),
    index('idx_importacao_item_renovacao').on(table.renovacaoId),
    index('idx_importacao_item_documento').on(table.documentoVendaId),
  ],
);

// Relations
export const importacaoRenovacoesRelations = relations(
  importacaoRenovacoes,
  ({ one, many }) => ({
    corretora: one(corretoras, {
      fields: [importacaoRenovacoes.corretoraId],
      references: [corretoras.id],
    }),
    usuario: one(usuarios, {
      fields: [importacaoRenovacoes.usuarioId],
      references: [usuarios.id],
      relationName: 'importacoesRealizadas',
    }),
    vendedor: one(usuarios, {
      fields: [importacaoRenovacoes.vendedorId],
      references: [usuarios.id],
      relationName: 'importacoesComoVendedor',
    }),
    itens: many(importacaoRenovacaoItens),
  }),
);

export const importacaoRenovacaoItensRelations = relations(
  importacaoRenovacaoItens,
  ({ one }) => ({
    importacao: one(importacaoRenovacoes, {
      fields: [importacaoRenovacaoItens.importacaoId],
      references: [importacaoRenovacoes.id],
    }),
    renovacao: one(renovacoesComerciais, {
      fields: [importacaoRenovacaoItens.renovacaoId],
      references: [renovacoesComerciais.id],
    }),
    documentoVenda: one(documentosVenda, {
      fields: [importacaoRenovacaoItens.documentoVendaId],
      references: [documentosVenda.id],
    }),
  }),
);

export type ImportacaoRenovacao = typeof importacaoRenovacoes.$inferSelect;
export type NewImportacaoRenovacao = typeof importacaoRenovacoes.$inferInsert;
export type ImportacaoRenovacaoItem =
  typeof importacaoRenovacaoItens.$inferSelect;
export type NewImportacaoRenovacaoItem =
  typeof importacaoRenovacaoItens.$inferInsert;
