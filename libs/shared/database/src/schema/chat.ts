import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  index,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { corretoras } from './corretora';
import { usuarios } from './usuario';

// Enum para tipo de canal
export const tipoCanalEnum = pgEnum('tipo_canal', ['geral', 'direto']);

// Tabela de canais de chat
export const canaisChat = pgTable(
  'canal_chat',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    corretoraId: uuid('corretora_id')
      .notNull()
      .references(() => corretoras.id, { onDelete: 'cascade' }),

    tipo: tipoCanalEnum('tipo').notNull().default('geral'),
    nome: varchar('nome', { length: 256 }),
    descricao: text('descricao'),

    // Para canais diretos (DM), armazenamos os dois usuários
    usuarioId1: uuid('usuario_id_1').references(() => usuarios.id, {
      onDelete: 'cascade',
    }),
    usuarioId2: uuid('usuario_id_2').references(() => usuarios.id, {
      onDelete: 'cascade',
    }),

    criadoPorId: uuid('criado_por_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    ativo: boolean('ativo').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_canal_corretora').on(table.corretoraId),
    index('idx_canal_tipo').on(table.tipo),
    index('idx_canal_usuario1').on(table.usuarioId1),
    index('idx_canal_usuario2').on(table.usuarioId2),
    // Garantir que não existam canais diretos duplicados (independente da ordem)
    unique('unq_dm_usuarios').on(table.usuarioId1, table.usuarioId2),
  ],
);

// Tabela de membros de canais (apenas para canais gerais)
export const canaisMembros = pgTable(
  'canal_membro',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    canalId: uuid('canal_id')
      .notNull()
      .references(() => canaisChat.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    // Permissões
    podeEnviarMensagem: boolean('pode_enviar_mensagem').default(true),
    isAdmin: boolean('is_admin').default(false), // Admin do canal

    adicionadoPorId: uuid('adicionado_por_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('unq_canal_usuario').on(table.canalId, table.usuarioId),
    index('idx_membro_canal').on(table.canalId),
    index('idx_membro_usuario').on(table.usuarioId),
  ],
);

// Enum para tipo de mensagem
export const tipoMensagemEnum = pgEnum('tipo_mensagem', [
  'texto',
  'sistema',
  'arquivo',
  'oportunidade',
]);

// Tabela de mensagens
export const mensagensChat = pgTable(
  'mensagem_chat',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    canalId: uuid('canal_id')
      .notNull()
      .references(() => canaisChat.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    tipo: tipoMensagemEnum('tipo').notNull().default('texto'),
    conteudo: text('conteudo').notNull(),

    // Metadata para mensagens especiais (oportunidades, etc)
    metadata: jsonb('metadata'),

    // Para arquivos
    arquivoUrl: varchar('arquivo_url', { length: 1024 }),
    arquivoNome: varchar('arquivo_nome', { length: 256 }),
    arquivoTipo: varchar('arquivo_tipo', { length: 100 }),

    // Mensagem respondendo outra (FK será criada via migration SQL)
    respostaParaId: uuid('resposta_para_id'),

    editado: boolean('editado').default(false),
    editadoEm: timestamp('editado_em', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_mensagem_canal').on(table.canalId),
    index('idx_mensagem_usuario').on(table.usuarioId),
    index('idx_mensagem_created').on(table.createdAt),
    index('idx_mensagem_resposta').on(table.respostaParaId),
  ],
);

// Tabela de leituras de mensagens
export const mensagensLeituras = pgTable(
  'mensagem_leitura',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mensagemId: uuid('mensagem_id')
      .notNull()
      .references(() => mensagensChat.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    lidoEm: timestamp('lido_em', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('unq_mensagem_usuario_leitura').on(
      table.mensagemId,
      table.usuarioId,
    ),
    index('idx_leitura_mensagem').on(table.mensagemId),
    index('idx_leitura_usuario').on(table.usuarioId),
  ],
);

// Tabela para rastrear "está digitando"
export const chatDigitando = pgTable(
  'chat_digitando',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    canalId: uuid('canal_id')
      .notNull()
      .references(() => canaisChat.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    iniciouEm: timestamp('iniciou_em', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('unq_canal_usuario_digitando').on(table.canalId, table.usuarioId),
    index('idx_digitando_canal').on(table.canalId),
  ],
);

// Relations
export const canaisChatRelations = relations(canaisChat, ({ one, many }) => ({
  corretora: one(corretoras, {
    fields: [canaisChat.corretoraId],
    references: [corretoras.id],
  }),
  criadoPor: one(usuarios, {
    fields: [canaisChat.criadoPorId],
    references: [usuarios.id],
    relationName: 'canaisCriados',
  }),
  usuario1: one(usuarios, {
    fields: [canaisChat.usuarioId1],
    references: [usuarios.id],
    relationName: 'canaisDiretos1',
  }),
  usuario2: one(usuarios, {
    fields: [canaisChat.usuarioId2],
    references: [usuarios.id],
    relationName: 'canaisDiretos2',
  }),
  membros: many(canaisMembros),
  mensagens: many(mensagensChat),
}));

export const canaisMembrosRelations = relations(canaisMembros, ({ one }) => ({
  canal: one(canaisChat, {
    fields: [canaisMembros.canalId],
    references: [canaisChat.id],
  }),
  usuario: one(usuarios, {
    fields: [canaisMembros.usuarioId],
    references: [usuarios.id],
  }),
  adicionadoPor: one(usuarios, {
    fields: [canaisMembros.adicionadoPorId],
    references: [usuarios.id],
    relationName: 'membrosAdicionados',
  }),
}));

export const mensagensChatRelations = relations(
  mensagensChat,
  ({ one, many }) => ({
    canal: one(canaisChat, {
      fields: [mensagensChat.canalId],
      references: [canaisChat.id],
    }),
    usuario: one(usuarios, {
      fields: [mensagensChat.usuarioId],
      references: [usuarios.id],
    }),
    respostaPara: one(mensagensChat, {
      fields: [mensagensChat.respostaParaId],
      references: [mensagensChat.id],
      relationName: 'resposta',
    }),
    respostas: many(mensagensChat, { relationName: 'resposta' }),
    leituras: many(mensagensLeituras),
    reacoes: many(mensagensReacoes),
    mencoes: many(mensagensMencoes),
  }),
);

export const mensagensLeiturasRelations = relations(
  mensagensLeituras,
  ({ one }) => ({
    mensagem: one(mensagensChat, {
      fields: [mensagensLeituras.mensagemId],
      references: [mensagensChat.id],
    }),
    usuario: one(usuarios, {
      fields: [mensagensLeituras.usuarioId],
      references: [usuarios.id],
    }),
  }),
);

export const chatDigitandoRelations = relations(chatDigitando, ({ one }) => ({
  canal: one(canaisChat, {
    fields: [chatDigitando.canalId],
    references: [canaisChat.id],
  }),
  usuario: one(usuarios, {
    fields: [chatDigitando.usuarioId],
    references: [usuarios.id],
  }),
}));

// Tabela de reações em mensagens
export const mensagensReacoes = pgTable(
  'mensagem_reacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mensagemId: uuid('mensagem_id')
      .notNull()
      .references(() => mensagensChat.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    emoji: varchar('emoji', { length: 10 }).notNull(), // Ex: 👍, ❤️, 😂

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Um usuário só pode reagir uma vez com o mesmo emoji na mesma mensagem
    unique('unq_mensagem_usuario_emoji').on(
      table.mensagemId,
      table.usuarioId,
      table.emoji,
    ),
    index('idx_reacao_mensagem').on(table.mensagemId),
    index('idx_reacao_usuario').on(table.usuarioId),
  ],
);

// Tabela de menções em mensagens
export const mensagensMencoes = pgTable(
  'mensagem_mencao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mensagemId: uuid('mensagem_id')
      .notNull()
      .references(() => mensagensChat.id, { onDelete: 'cascade' }),
    usuarioMencionadoId: uuid('usuario_mencionado_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Evitar menções duplicadas na mesma mensagem
    unique('unq_mensagem_usuario_mencao').on(
      table.mensagemId,
      table.usuarioMencionadoId,
    ),
    index('idx_mencao_mensagem').on(table.mensagemId),
    index('idx_mencao_usuario').on(table.usuarioMencionadoId),
  ],
);

// Relations das novas tabelas
export const mensagensReacoesRelations = relations(
  mensagensReacoes,
  ({ one }) => ({
    mensagem: one(mensagensChat, {
      fields: [mensagensReacoes.mensagemId],
      references: [mensagensChat.id],
    }),
    usuario: one(usuarios, {
      fields: [mensagensReacoes.usuarioId],
      references: [usuarios.id],
    }),
  }),
);

export const mensagensMencoesRelations = relations(
  mensagensMencoes,
  ({ one }) => ({
    mensagem: one(mensagensChat, {
      fields: [mensagensMencoes.mensagemId],
      references: [mensagensChat.id],
    }),
    usuarioMencionado: one(usuarios, {
      fields: [mensagensMencoes.usuarioMencionadoId],
      references: [usuarios.id],
    }),
  }),
);

// Types
export type CanalChat = typeof canaisChat.$inferSelect;
export type NewCanalChat = typeof canaisChat.$inferInsert;

export type CanalMembro = typeof canaisMembros.$inferSelect;
export type NewCanalMembro = typeof canaisMembros.$inferInsert;

export type MensagemChat = typeof mensagensChat.$inferSelect;
export type NewMensagemChat = typeof mensagensChat.$inferInsert;

export type MensagemLeitura = typeof mensagensLeituras.$inferSelect;
export type NewMensagemLeitura = typeof mensagensLeituras.$inferInsert;

export type ChatDigitando = typeof chatDigitando.$inferSelect;
export type NewChatDigitando = typeof chatDigitando.$inferInsert;

export type MensagemReacao = typeof mensagensReacoes.$inferSelect;
export type NewMensagemReacao = typeof mensagensReacoes.$inferInsert;

export type MensagemMencao = typeof mensagensMencoes.$inferSelect;
export type NewMensagemMencao = typeof mensagensMencoes.$inferInsert;
