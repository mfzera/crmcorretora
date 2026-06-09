import {
  pgTable,
  uuid,
  varchar,
  date,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';
import { tipoPessoaEnum } from './enums';

export const clientes = pgTable(
  'cliente',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    tipoPessoa: tipoPessoaEnum('tipo_pessoa').notNull().default('PF'),

    // Pessoa Física
    nome: varchar('nome', { length: 256 }),
    cpf: varchar('cpf', { length: 11 }),
    dataNascimento: date('data_nascimento'),

    // Pessoa Jurídica
    razaoSocial: varchar('razao_social', { length: 256 }),
    nomeFantasia: varchar('nome_fantasia', { length: 256 }),
    cnpj: varchar('cnpj', { length: 14 }),

    // Contatos (campos comuns para PF e PJ)
    email: varchar('email', { length: 256 }),
    telefone: varchar('telefone', { length: 255 }),
    celular: varchar('celular', { length: 255 }),

    // Dono da carteira
    vendedorId: uuid('vendedor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),

    // Vendedor original (quem transferiu o cliente)
    vendedorOriginalId: uuid('vendedor_original_id').references(
      () => usuarios.id,
      { onDelete: 'restrict' },
    ),

    ativo: boolean('ativo').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    anonimizadoEm: timestamp('anonimizado_em', { withTimezone: true }),
  },
  (table) => [
    index('idx_cliente_corretora').on(table.corretoraId),
    index('idx_cliente_vendedor').on(table.vendedorId),
    index('idx_cliente_vendedor_original').on(table.vendedorOriginalId),
    index('idx_cliente_cpf').on(table.corretoraId, table.cpf),
    index('idx_cliente_cnpj').on(table.corretoraId, table.cnpj),
    uniqueIndex('unq_cliente_cpf')
      .on(table.corretoraId, table.cpf)
      .where(sql`${table.cpf} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    uniqueIndex('unq_cliente_cnpj')
      .on(table.corretoraId, table.cnpj)
      .where(sql`${table.cnpj} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    // Cliente-stub (PF sem CPF, PJ sem CNPJ) é permitido no banco; o documento
    // é obrigatório apenas no fluxo de iniciar renovação (validado em camada
    // de aplicação). Assim o import pode criar o cliente a partir do nome/contato
    // da planilha e o vendedor completa depois no workspace.
  ],
);

export const clienteEnderecos = pgTable(
  'cliente_endereco',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'cascade' }),

    cep: varchar('cep', { length: 8 }),
    logradouro: varchar('logradouro', { length: 256 }),
    numero: varchar('numero', { length: 20 }),
    complemento: varchar('complemento', { length: 100 }),
    bairro: varchar('bairro', { length: 100 }),
    cidade: varchar('cidade', { length: 100 }),
    uf: varchar('uf', { length: 2 }),

    principal: boolean('principal').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('idx_cliente_endereco_cliente').on(table.clienteId)],
);

export const clienteContatos = pgTable(
  'cliente_contato',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'cascade' }),

    tipo: varchar('tipo', { length: 20 }).notNull(),
    valor: varchar('valor', { length: 256 }).notNull(),
    principal: boolean('principal').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('idx_cliente_contato_cliente').on(table.clienteId)],
);

export const clientesRelations = relations(clientes, ({ one, many }) => ({
  corretora: one(corretoras, {
    fields: [clientes.corretoraId],
    references: [corretoras.id],
  }),
  vendedor: one(usuarios, {
    fields: [clientes.vendedorId],
    references: [usuarios.id],
  }),
  vendedorOriginal: one(usuarios, {
    fields: [clientes.vendedorOriginalId],
    references: [usuarios.id],
  }),
  enderecos: many(clienteEnderecos),
  contatos: many(clienteContatos),
}));

export const clienteEnderecosRelations = relations(
  clienteEnderecos,
  ({ one }) => ({
    cliente: one(clientes, {
      fields: [clienteEnderecos.clienteId],
      references: [clientes.id],
    }),
  }),
);

export const clienteContatosRelations = relations(
  clienteContatos,
  ({ one }) => ({
    cliente: one(clientes, {
      fields: [clienteContatos.clienteId],
      references: [clientes.id],
    }),
  }),
);

export type Cliente = typeof clientes.$inferSelect;
export type NewCliente = typeof clientes.$inferInsert;
export type ClienteEndereco = typeof clienteEnderecos.$inferSelect;
export type NewClienteEndereco = typeof clienteEnderecos.$inferInsert;
export type ClienteContato = typeof clienteContatos.$inferSelect;
export type NewClienteContato = typeof clienteContatos.$inferInsert;
