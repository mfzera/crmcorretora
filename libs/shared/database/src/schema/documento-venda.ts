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
  integer as pgInteger,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { clientes } from './cliente';
import { usuarios } from './usuario';
import { produtos } from './produto';
import { seguradorasParceiras } from './seguradora-parceira';
import {
  tipoDocumentoVendaEnum,
  statusDocumentoVendaEnum,
  tipoEventoDocumentoEnum,
  statusPagamentoComissaoEnum,
  modalidadePagamentoVendedorEnum,
} from './enums';
import { importacaoRenovacoes } from './importacao-renovacoes';

export const documentosVenda = pgTable(
  'documento_venda',
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

    numeroDocumento: varchar('numero_documento', { length: 100 }).notNull(),
    tipoDocumento: tipoDocumentoVendaEnum('tipo_documento').notNull(),
    status: statusDocumentoVendaEnum('status')
      .notNull()
      .default('EM_NEGOCIACAO'),

    // Referências externas
    numeroPropostaExterna: varchar('numero_proposta_externa', { length: 100 }),
    numeroApoliceExterna: varchar('numero_apolice_externa', { length: 100 }),
    numeroSistemaLegado: varchar('numero_sistema_legado', { length: 100 }),

    vigenciaInicio: date('vigencia_inicio').notNull(),
    vigenciaFim: date('vigencia_fim').notNull(),

    moeda: varchar('moeda', { length: 3 }).default('BRL'),
    premioLiquido: decimal('premio_liquido', { precision: 15, scale: 2 }),
    percentualComissao: decimal('percentual_comissao', {
      precision: 5,
      scale: 2,
    }),
    valorComissao: decimal('valor_comissao', { precision: 15, scale: 2 }),

    // Equipe de vendas
    vendedorSecundarioId: uuid('vendedor_secundario_id').references(
      () => usuarios.id,
      { onDelete: 'restrict' },
    ),
    vendedorTerceiroId: uuid('vendedor_terceiro_id').references(
      () => usuarios.id,
      { onDelete: 'restrict' },
    ),
    atuanteId: uuid('atuante_id').references(() => usuarios.id, {
      onDelete: 'restrict',
    }),

    // Comissão split - Negócio Corretora
    negocioCorretora: boolean('negocio_corretora').default(false),
    percentualCorretora: decimal('percentual_corretora', {
      precision: 5,
      scale: 2,
    }),
    valorComissaoCorretora: decimal('valor_comissao_corretora', {
      precision: 15,
      scale: 2,
    }),
    valorComissaoVendedor: decimal('valor_comissao_vendedor', {
      precision: 15,
      scale: 2,
    }),

    // Status do pagamento da comissão (legado — mantido para compatibilidade)
    statusPagamentoComissao: statusPagamentoComissaoEnum('status_pagamento_comissao').default('PENDENTE'),
    dataPagamentoComissao: timestamp('data_pagamento_comissao', { withTimezone: true }),
    observacaoPagamentoComissao: text('observacao_pagamento_comissao'),

    // Parcelamento da comissão
    numeroParcelas: pgInteger('numero_parcelas').default(1).notNull(),
    modalidadePagamentoVendedor: modalidadePagamentoVendedorEnum('modalidade_pagamento_vendedor').default('AVISTA'),

    coberturas: jsonb('coberturas'),
    itemDescricao: varchar('item_descricao', { length: 500 }),
    franquia: decimal('franquia', { precision: 15, scale: 2 }),
    valorSegurado: decimal('valor_segurado', { precision: 15, scale: 2 }),

    // Aprovação do cadastro
    dataSolicitacaoCadastro: timestamp('data_solicitacao_cadastro', {
      withTimezone: true,
    }),
    dataAprovacaoCadastro: timestamp('data_aprovacao_cadastro', {
      withTimezone: true,
    }),
    aprovadoPorId: uuid('aprovado_por_id').references(() => usuarios.id),
    dataRejeicaoCadastro: timestamp('data_rejeicao_cadastro', {
      withTimezone: true,
    }),
    rejeitadoPorId: uuid('rejeitado_por_id').references(() => usuarios.id),
    motivoRejeicao: text('motivo_rejeicao'),

    // Cancelamento
    dataCancelamento: timestamp('data_cancelamento', { withTimezone: true }),
    motivoCancelamento: text('motivo_cancelamento'),
    canceladoPorId: uuid('cancelado_por_id').references(() => usuarios.id),

    // Perda
    dataPerda: timestamp('data_perda', { withTimezone: true }),
    motivoPerda: varchar('motivo_perda', { length: 50 }),
    concorrenteGanhou: varchar('concorrente_ganhou', { length: 255 }),
    detalhesPerda: text('detalhes_perda'),

    // Lock para edição concorrente
    lockedById: uuid('locked_by_id').references(() => usuarios.id),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockExpiresAt: timestamp('lock_expires_at', { withTimezone: true }),

    observacoes: text('observacoes'),
    metadata: jsonb('metadata'),

    // Referência à importação que criou este documento
    importacaoId: uuid('importacao_id').references(
      () => importacaoRenovacoes.id,
      { onDelete: 'set null' },
    ),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('unq_documento_numero').on(table.corretoraId, table.numeroDocumento),
    index('idx_documento_venda_corretora').on(table.corretoraId),
    index('idx_documento_venda_cliente').on(table.clienteId),
    index('idx_documento_venda_vendedor').on(table.vendedorId),
    index('idx_documento_venda_status').on(table.corretoraId, table.status),
    // Índice composto para queries que filtram status + soft-delete (mais seletivo que o anterior)
    index('idx_documento_venda_status_active').on(table.corretoraId, table.status, table.deletedAt),
    // Índice para o dashboard de cadastro (AGUARDANDO_CADASTRO, ATIVO, PERDIDO) ordenado por data
    index('idx_documento_venda_cadastro').on(table.corretoraId, table.status, table.createdAt),
    index('idx_documento_venda_vigencia_fim').on(table.vigenciaFim),
    index('idx_documento_venda_numero_apolice').on(table.numeroApoliceExterna),
    index('idx_documentos_venda_seguradora_parceira').on(
      table.seguradoraParceiraId,
    ),
    index('idx_documento_venda_importacao').on(table.importacaoId),
  ],
);

export const historicoDocumentoVenda = pgTable(
  'historico_documento_venda',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentoVendaId: uuid('documento_venda_id')
      .notNull()
      .references(() => documentosVenda.id, { onDelete: 'cascade' }),

    tipoEvento: tipoEventoDocumentoEnum('tipo_evento').notNull(),
    usuarioId: uuid('usuario_id').references(() => usuarios.id),
    usuarioNome: varchar('usuario_nome', { length: 255 }),

    statusAnterior: statusDocumentoVendaEnum('status_anterior'),
    statusNovo: statusDocumentoVendaEnum('status_novo'),

    descricao: text('descricao').notNull(),
    dadosAlterados: jsonb('dados_alterados'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_historico_documento').on(table.documentoVendaId),
    index('idx_historico_created_at').on(table.createdAt),
  ],
);

export const documentosVendaRelations = relations(
  documentosVenda,
  ({ one, many }) => ({
    corretora: one(corretoras, {
      fields: [documentosVenda.corretoraId],
      references: [corretoras.id],
    }),
    cliente: one(clientes, {
      fields: [documentosVenda.clienteId],
      references: [clientes.id],
    }),
    vendedor: one(usuarios, {
      fields: [documentosVenda.vendedorId],
      references: [usuarios.id],
    }),
    vendedorSecundario: one(usuarios, {
      fields: [documentosVenda.vendedorSecundarioId],
      references: [usuarios.id],
      relationName: 'docVendedorSecundario',
    }),
    vendedorTerceiro: one(usuarios, {
      fields: [documentosVenda.vendedorTerceiroId],
      references: [usuarios.id],
      relationName: 'docVendedorTerceiro',
    }),
    atuante: one(usuarios, {
      fields: [documentosVenda.atuanteId],
      references: [usuarios.id],
      relationName: 'docAtuante',
    }),
    produto: one(produtos, {
      fields: [documentosVenda.produtoId],
      references: [produtos.id],
    }),
    seguradoraParceira: one(seguradorasParceiras, {
      fields: [documentosVenda.seguradoraParceiraId],
      references: [seguradorasParceiras.id],
    }),
    aprovadoPor: one(usuarios, {
      fields: [documentosVenda.aprovadoPorId],
      references: [usuarios.id],
      relationName: 'aprovadoPor',
    }),
    rejeitadoPor: one(usuarios, {
      fields: [documentosVenda.rejeitadoPorId],
      references: [usuarios.id],
      relationName: 'rejeitadoPor',
    }),
    canceladoPor: one(usuarios, {
      fields: [documentosVenda.canceladoPorId],
      references: [usuarios.id],
      relationName: 'canceladoPor',
    }),
    lockedBy: one(usuarios, {
      fields: [documentosVenda.lockedById],
      references: [usuarios.id],
      relationName: 'lockedBy',
    }),
    importacao: one(importacaoRenovacoes, {
      fields: [documentosVenda.importacaoId],
      references: [importacaoRenovacoes.id],
    }),
    historico: many(historicoDocumentoVenda),
  }),
);

export const historicoDocumentoVendaRelations = relations(
  historicoDocumentoVenda,
  ({ one }) => ({
    documentoVenda: one(documentosVenda, {
      fields: [historicoDocumentoVenda.documentoVendaId],
      references: [documentosVenda.id],
    }),
    usuario: one(usuarios, {
      fields: [historicoDocumentoVenda.usuarioId],
      references: [usuarios.id],
    }),
  }),
);

export type DocumentoVenda = typeof documentosVenda.$inferSelect;
export type NewDocumentoVenda = typeof documentosVenda.$inferInsert;
export type HistoricoDocumentoVenda =
  typeof historicoDocumentoVenda.$inferSelect;
export type NewHistoricoDocumentoVenda =
  typeof historicoDocumentoVenda.$inferInsert;
