import {
  pgTable,
  uuid,
  varchar,
  text,
  bigint,
  integer,
  timestamp,
  pgEnum,
  index,
  jsonb,
  AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';

// Enum para tipos de entidade
export const entidadeTipoAnexoEnum = pgEnum('entidade_tipo_anexo', [
  'cotacao',
  'documento_venda',
  'mensagem_chat',
  'endosso',
  'sinistro',
]);

export const anexos = pgTable(
  'anexo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    // Relacionamento polimórfico
    entidadeTipo: entidadeTipoAnexoEnum('entidade_tipo').notNull(),
    entidadeId: uuid('entidade_id').notNull(),

    // Metadados do arquivo
    nomeOriginal: varchar('nome_original', { length: 256 }).notNull(),
    nomeArquivo: varchar('nome_arquivo', { length: 256 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    tamanho: bigint('tamanho', { mode: 'number' }).notNull(),

    // Storage R2
    r2Key: varchar('r2_key', { length: 512 }).notNull(),
    r2Bucket: varchar('r2_bucket', { length: 100 }).notNull(),
    urlPublica: varchar('url_publica', { length: 1024 }),

    // Versionamento
    versao: integer('versao').notNull().default(1),
    arquivoAnteriorId: uuid('arquivo_anterior_id').references(
      (): AnyPgColumn => anexos.id,
      { onDelete: 'set null' },
    ),

    // Extração de conteúdo (PDFs)
    textoExtraido: text('texto_extraido'),
    metadadosExtracao: jsonb('metadados_extracao'),

    // Auditoria
    uploadPorId: uuid('upload_por_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),
    uploadEm: timestamp('upload_em', { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedPorId: uuid('deleted_por_id').references(() => usuarios.id, {
      onDelete: 'restrict',
    }),
  },
  (table) => [
    index('idx_anexo_entidade').on(
      table.corretoraId,
      table.entidadeTipo,
      table.entidadeId,
    ),
    index('idx_anexo_r2key').on(table.r2Key),
    index('idx_anexo_upload_por').on(table.uploadPorId),
    index('idx_anexo_versao_anterior').on(table.arquivoAnteriorId),
    index('idx_anexo_deleted').on(table.deletedAt),
  ],
);

// Relations
export const anexosRelations = relations(anexos, ({ one }) => ({
  corretora: one(corretoras, {
    fields: [anexos.corretoraId],
    references: [corretoras.id],
  }),
  uploadPor: one(usuarios, {
    fields: [anexos.uploadPorId],
    references: [usuarios.id],
  }),
  deletedPor: one(usuarios, {
    fields: [anexos.deletedPorId],
    references: [usuarios.id],
    relationName: 'anexosDeleted',
  }),
  versaoAnterior: one(anexos, {
    fields: [anexos.arquivoAnteriorId],
    references: [anexos.id],
    relationName: 'versoes',
  }),
}));

// Types
export type Anexo = typeof anexos.$inferSelect;
export type NewAnexo = typeof anexos.$inferInsert;
