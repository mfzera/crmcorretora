import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  unique,
  index,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';
import { documentosVenda } from './documento-venda';
import { clientes } from './cliente';
import { produtos } from './produto';
import { statusRenovacaoEnum } from './enums';
import { importacaoRenovacoes } from './importacao-renovacoes';

export const renovacoesComerciais = pgTable(
  'renovacao_comercial',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Pode ser null para renovações importadas sem documento existente no sistema
    documentoVendaAnteriorId: uuid('documento_venda_anterior_id').references(
      () => documentosVenda.id,
      { onDelete: 'restrict' },
    ),

    // Dados do cliente (para renovações importadas)
    clienteId: uuid('cliente_id').references(() => clientes.id, {
      onDelete: 'restrict',
    }),

    // Dados da planilha importada (quando não há documento no sistema)
    itemDescricao: varchar('item_descricao', { length: 500 }),
    produtoDescricao: varchar('produto_descricao', { length: 255 }),
    seguradoraAnterior: varchar('seguradora_anterior', { length: 255 }),
    documentoVendaNovoId: uuid('documento_venda_novo_id').references(
      () => documentosVenda.id,
      { onDelete: 'set null' },
    ),

    // Produto resolvido ao iniciar (manual ou por match de nome).
    // Null para renovações ainda não iniciadas ou importadas sem correspondência.
    produtoId: uuid('produto_id').references(() => produtos.id, { onDelete: 'set null' }),

    vendedorId: uuid('vendedor_id')
      .notNull()
      .references(() => usuarios.id),

    premioAnterior: decimal('premio_anterior', { precision: 15, scale: 2 }),
    percentualComissaoAnterior: decimal('percentual_comissao_anterior', {
      precision: 5,
      scale: 2,
    }),
    valorComissaoAnterior: decimal('valor_comissao_anterior', {
      precision: 15,
      scale: 2,
    }),

    // Commission split fields - anterior state
    vendedorSecundarioAnteriorId: uuid(
      'vendedor_secundario_anterior_id',
    ).references(() => usuarios.id, { onDelete: 'restrict' }),
    percentualComissaoPrincipalAnterior: decimal(
      'percentual_comissao_principal_anterior',
      {
        precision: 5,
        scale: 2,
      },
    ),
    percentualComissaoSecundarioAnterior: decimal(
      'percentual_comissao_secundario_anterior',
      {
        precision: 5,
        scale: 2,
      },
    ),
    valorComissaoPrincipalAnterior: decimal(
      'valor_comissao_principal_anterior',
      {
        precision: 15,
        scale: 2,
      },
    ),
    valorComissaoSecundarioAnterior: decimal(
      'valor_comissao_secundario_anterior',
      {
        precision: 15,
        scale: 2,
      },
    ),
    negocioCorretoraAnterior: boolean('negocio_corretora_anterior').default(
      false,
    ),
    percentualCorretoraAnterior: decimal('percentual_corretora_anterior', {
      precision: 5,
      scale: 2,
    }),
    valorComissaoCorretoraAnterior: decimal(
      'valor_comissao_corretora_anterior',
      {
        precision: 15,
        scale: 2,
      },
    ),

    premioNovo: decimal('premio_novo', { precision: 15, scale: 2 }),
    percentualComissaoNovo: decimal('percentual_comissao_novo', {
      precision: 5,
      scale: 2,
    }),
    valorComissaoNovo: decimal('valor_comissao_novo', {
      precision: 15,
      scale: 2,
    }),

    // Commission split fields - novo state
    vendedorSecundarioNovoId: uuid('vendedor_secundario_novo_id').references(
      () => usuarios.id,
      { onDelete: 'restrict' },
    ),
    percentualComissaoPrincipalNovo: decimal(
      'percentual_comissao_principal_novo',
      {
        precision: 5,
        scale: 2,
      },
    ),
    percentualComissaoSecundarioNovo: decimal(
      'percentual_comissao_secundario_novo',
      {
        precision: 5,
        scale: 2,
      },
    ),
    valorComissaoPrincipalNovo: decimal('valor_comissao_principal_novo', {
      precision: 15,
      scale: 2,
    }),
    valorComissaoSecundarioNovo: decimal('valor_comissao_secundario_novo', {
      precision: 15,
      scale: 2,
    }),
    negocioCorretoraNovo: boolean('negocio_corretora_novo').default(false),
    percentualCorretoraNovo: decimal('percentual_corretora_novo', {
      precision: 5,
      scale: 2,
    }),
    valorComissaoCorretoraNovo: decimal('valor_comissao_corretora_novo', {
      precision: 15,
      scale: 2,
    }),

    status: statusRenovacaoEnum('status').notNull().default('NAO_TRABALHADO'),
    statusAntesPerda: statusRenovacaoEnum('status_antes_perda'),
    statusAntesCancelamento: statusRenovacaoEnum('status_antes_cancelamento'),

    dataVencimento: date('data_vencimento').notNull(),
    novaVigenciaInicio: date('nova_vigencia_inicio'),
    novaVigenciaFim: date('nova_vigencia_fim'),

    dataFinalizacao: timestamp('data_finalizacao', { withTimezone: true }),
    finalizadoPorId: uuid('finalizado_por_id').references(() => usuarios.id),

    dataPerda: timestamp('data_perda', { withTimezone: true }),
    motivoPerda: varchar('motivo_perda', { length: 50 }),
    concorrenteGanhou: varchar('concorrente_ganhou', { length: 255 }),
    detalhesPerda: text('detalhes_perda'),

    dataCancelamento: timestamp('data_cancelamento', { withTimezone: true }),
    motivoCancelamento: text('motivo_cancelamento'),

    observacoes: text('observacoes'),

    // Referência à importação que criou esta renovação
    importacaoId: uuid('importacao_id').references(
      () => importacaoRenovacoes.id,
      { onDelete: 'set null' },
    ),

    // Histórico de transferência
    transferidaPorId: uuid('transferida_por_id').references(() => usuarios.id),
    transferidaEm: timestamp('transferida_em', { withTimezone: true }),
    vendedorOriginalId: uuid('vendedor_original_id').references(
      () => usuarios.id,
    ),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Removida constraint unique em documentoVendaAnteriorId para permitir múltiplas renovações por cliente
    // A unicidade agora é por cliente + item + data de vencimento
    index('idx_renovacao_corretora').on(table.corretoraId),
    index('idx_renovacao_vendedor').on(table.vendedorId),
    index('idx_renovacao_vencimento').on(table.dataVencimento),
    index('idx_renovacao_status').on(table.corretoraId, table.status),
    // Índice composto para workspace (filtra por corretora + vendedor + status + vencimento)
    index('idx_renovacao_workspace').on(table.corretoraId, table.vendedorId, table.status, table.dataVencimento),
    index('idx_renovacao_cliente').on(table.clienteId),
    index('idx_renovacao_transferida_por').on(table.transferidaPorId),
    index('idx_renovacao_vendedor_original').on(table.vendedorOriginalId),
    index('idx_renovacao_importacao').on(table.importacaoId),
  ],
);

export const renovacoesComerciaisRelations = relations(
  renovacoesComerciais,
  ({ one }) => ({
    corretora: one(corretoras, {
      fields: [renovacoesComerciais.corretoraId],
      references: [corretoras.id],
    }),
    documentoVendaAnterior: one(documentosVenda, {
      fields: [renovacoesComerciais.documentoVendaAnteriorId],
      references: [documentosVenda.id],
      relationName: 'documentoAnterior',
    }),
    documentoVendaNovo: one(documentosVenda, {
      fields: [renovacoesComerciais.documentoVendaNovoId],
      references: [documentosVenda.id],
      relationName: 'documentoNovo',
    }),
    cliente: one(clientes, {
      fields: [renovacoesComerciais.clienteId],
      references: [clientes.id],
    }),
    produto: one(produtos, {
      fields: [renovacoesComerciais.produtoId],
      references: [produtos.id],
    }),
    vendedor: one(usuarios, {
      fields: [renovacoesComerciais.vendedorId],
      references: [usuarios.id],
    }),
    vendedorSecundarioAnterior: one(usuarios, {
      fields: [renovacoesComerciais.vendedorSecundarioAnteriorId],
      references: [usuarios.id],
      relationName: 'vendedorSecundarioAnterior',
    }),
    vendedorSecundarioNovo: one(usuarios, {
      fields: [renovacoesComerciais.vendedorSecundarioNovoId],
      references: [usuarios.id],
      relationName: 'vendedorSecundarioNovo',
    }),
    finalizadoPor: one(usuarios, {
      fields: [renovacoesComerciais.finalizadoPorId],
      references: [usuarios.id],
      relationName: 'finalizadoPor',
    }),
    transferidaPor: one(usuarios, {
      fields: [renovacoesComerciais.transferidaPorId],
      references: [usuarios.id],
      relationName: 'transferidaPor',
    }),
    vendedorOriginal: one(usuarios, {
      fields: [renovacoesComerciais.vendedorOriginalId],
      references: [usuarios.id],
      relationName: 'vendedorOriginal',
    }),
    importacao: one(importacaoRenovacoes, {
      fields: [renovacoesComerciais.importacaoId],
      references: [importacaoRenovacoes.id],
    }),
  }),
);

export type RenovacaoComercial = typeof renovacoesComerciais.$inferSelect;
export type NewRenovacaoComercial = typeof renovacoesComerciais.$inferInsert;
