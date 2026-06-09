import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  jsonb,
  unique,
  index,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { clientes } from './cliente';
import { usuarios } from './usuario';
import { produtos } from './produto';
import { seguradorasParceiras } from './seguradora-parceira';
import { oportunidades } from './oportunidade';
import { documentosVenda } from './documento-venda';
import { statusCotacaoEnum, cotacaoOrigemEnum, etapaCotacaoEnum } from './enums';

export const cotacoes = pgTable(
  'cotacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clientes.id, { onDelete: 'restrict' }),
    vendedorId: uuid('vendedor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),
    produtoId: uuid('produto_id')
      .notNull()
      .references(() => produtos.id, { onDelete: 'restrict' }),
    seguradoraParceiraId: uuid('seguradora_parceira_id').references(
      () => seguradorasParceiras.id,
      { onDelete: 'restrict' },
    ),

    numeroCotacao: varchar('numero_cotacao', { length: 50 }).notNull(),
    status: statusCotacaoEnum('status').notNull().default('EM_ELABORACAO'),
    etapa: etapaCotacaoEnum('etapa').notNull().default('LEVANTANDO_DADOS'),

    vigenciaInicio: date('vigencia_inicio').notNull(),
    vigenciaFim: date('vigencia_fim').notNull(),
    premioLiquido: decimal('premio_liquido', { precision: 15, scale: 2 }),
    percentualComissao: decimal('percentual_comissao', {
      precision: 5,
      scale: 2,
    }),
    valorComissao: decimal('valor_comissao', { precision: 15, scale: 2 }),

    // Commission split fields
    vendedorSecundarioId: uuid('vendedor_secundario_id').references(
      () => usuarios.id,
      { onDelete: 'restrict' },
    ),
    percentualComissaoPrincipal: decimal('percentual_comissao_principal', {
      precision: 5,
      scale: 2,
    }),
    percentualComissaoSecundario: decimal('percentual_comissao_secundario', {
      precision: 5,
      scale: 2,
    }),
    valorComissaoPrincipal: decimal('valor_comissao_principal', {
      precision: 15,
      scale: 2,
    }),
    valorComissaoSecundario: decimal('valor_comissao_secundario', {
      precision: 15,
      scale: 2,
    }),
    negocioCorretora: boolean('negocio_corretora').default(false),
    isFechado: boolean('is_fechado').notNull().default(false),
    percentualCorretora: decimal('percentual_corretora', {
      precision: 5,
      scale: 2,
    }),
    valorComissaoCorretora: decimal('valor_comissao_corretora', {
      precision: 15,
      scale: 2,
    }),

    // Third vendor commission
    vendedorTerceiroId: uuid('vendedor_terceiro_id').references(
      () => usuarios.id,
      { onDelete: 'restrict' },
    ),
    percentualComissaoTerceiro: decimal('percentual_comissao_terceiro', {
      precision: 5,
      scale: 2,
    }),
    valorComissaoTerceiro: decimal('valor_comissao_terceiro', {
      precision: 15,
      scale: 2,
    }),

    // Atuante: logged-in user who acted on the sale (audit + ownership)
    atuanteId: uuid('atuante_id').references(() => usuarios.id, {
      onDelete: 'restrict',
    }),

    situacao: varchar('situacao', { length: 20 }).notNull().default('NOVO'),
    origem: cotacaoOrigemEnum('origem').notNull().default('MANUAL'),

    // Descrição do item segurado (ex: modelo do carro, placa, endereço)
    itemDescricao: varchar('item_descricao', { length: 500 }),

    coberturas: jsonb('coberturas'),
    detalhesRisco: jsonb('detalhes_risco'),

    documentoVendaId: uuid('documento_venda_id'),

    oportunidadeId: uuid('oportunidade_id').references(() => oportunidades.id, {
      onDelete: 'set null',
    }),

    // Campos para rastreamento de perdas
    motivoPerda: varchar('motivo_perda', { length: 100 }),
    detalhesPerda: text('detalhes_perda'),
    concorrenteGanhou: varchar('concorrente_ganhou', { length: 255 }),
    dataMarcadaPerdida: timestamp('data_marcada_perdida', {
      withTimezone: true,
    }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('unq_cotacao_numero').on(table.corretoraId, table.numeroCotacao),
    index('idx_cotacao_corretora').on(table.corretoraId),
    index('idx_cotacao_cliente').on(table.clienteId),
    index('idx_cotacao_vendedor').on(table.vendedorId),
    index('idx_cotacao_status').on(table.corretoraId, table.status),
    index('idx_cotacao_negocio_corretora').on(table.corretoraId, table.negocioCorretora),
    index('idx_cotacao_status_created').on(table.corretoraId, table.status, table.createdAt),
    index('idx_cotacao_atuante').on(table.atuanteId),
  ],
);

export const cotacoesRelations = relations(cotacoes, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [cotacoes.corretoraId],
    references: [corretoras.id],
  }),
  oportunidade: one(oportunidades, {
    fields: [cotacoes.oportunidadeId],
    references: [oportunidades.id],
  }),
  cliente: one(clientes, {
    fields: [cotacoes.clienteId],
    references: [clientes.id],
  }),
  vendedor: one(usuarios, {
    fields: [cotacoes.vendedorId],
    references: [usuarios.id],
  }),
  vendedorSecundario: one(usuarios, {
    fields: [cotacoes.vendedorSecundarioId],
    references: [usuarios.id],
    relationName: 'vendedorSecundario',
  }),
  vendedorTerceiro: one(usuarios, {
    fields: [cotacoes.vendedorTerceiroId],
    references: [usuarios.id],
    relationName: 'vendedorTerceiro',
  }),
  atuante: one(usuarios, {
    fields: [cotacoes.atuanteId],
    references: [usuarios.id],
    relationName: 'atuante',
  }),
  produto: one(produtos, {
    fields: [cotacoes.produtoId],
    references: [produtos.id],
  }),
  seguradoraParceira: one(seguradorasParceiras, {
    fields: [cotacoes.seguradoraParceiraId],
    references: [seguradorasParceiras.id],
  }),
  documentoVenda: one(documentosVenda, {
    fields: [cotacoes.documentoVendaId],
    references: [documentosVenda.id],
  }),
}));

export type Cotacao = typeof cotacoes.$inferSelect;
export type NewCotacao = typeof cotacoes.$inferInsert;
