import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { planos } from './plano';

export const corretoras = pgTable(
  'corretora',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Plano
    planoId: uuid('plano_id')
      .notNull()
      .references(() => planos.id, { onDelete: 'restrict' }),

    // Dados da Empresa
    razaoSocial: varchar('razao_social', { length: 256 }).notNull(),
    nomeFantasia: varchar('nome_fantasia', { length: 256 }),
    cnpj: varchar('cnpj', { length: 14 }).notNull().unique(),

    // Subdomínio único (multi-tenant)
    subdominio: varchar('subdominio', { length: 100 }).notNull().unique(),

    // Contato
    emailContato: varchar('email_contato', { length: 256 }),
    telefone: varchar('telefone', { length: 20 }),

    // Endereço
    cep: varchar('cep', { length: 8 }),
    logradouro: varchar('logradouro', { length: 256 }),
    numero: varchar('numero', { length: 20 }),
    complemento: varchar('complemento', { length: 100 }),
    bairro: varchar('bairro', { length: 100 }),
    cidade: varchar('cidade', { length: 100 }),
    uf: varchar('uf', { length: 2 }),

    // Status da conta
    status: varchar('status', { length: 50 }).default('ATIVO'),
    dataInicioTrial: timestamp('data_inicio_trial', { withTimezone: true }),
    dataFimTrial: timestamp('data_fim_trial', { withTimezone: true }),

    // Configurações
    // Pode armazenar uma URL externa (https://...) ou uma chave R2 (sem scheme).
    // O backend resolve para URL assinada antes de devolver ao cliente.
    logoUrl: varchar('logo_url', { length: 1024 }),
    coresTema: jsonb('cores_tema').$type<{
      primary?: string;
      secondary?: string;
    }>(),
    configCrm: jsonb('config_crm').$type<{
      prioridadeAutomatica?: {
        habilitado: boolean;
        diasBaixa: number;
        diasMedia: number;
        diasAlta: number;
        diasUrgente: number;
      };
    }>(),

    // Uso/Cotas
    usuariosAtivos: integer('usuarios_ativos').default(0),
    vendedoresAtivos: integer('vendedores_ativos').default(0),
    clientesCadastrados: integer('clientes_cadastrados').default(0),
    vendasMesAtual: integer('vendas_mes_atual').default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_corretora_cnpj').on(table.cnpj),
    index('idx_corretora_subdominio').on(table.subdominio),
    index('idx_corretora_status').on(table.status),
  ],
);

export type Corretora = typeof corretoras.$inferSelect;
export type NewCorretora = typeof corretoras.$inferInsert;

// Aliases para compatibilidade durante a migração (pode ser removido depois)
export const seguradoras = corretoras;
export type Seguradora = Corretora;
export type NewSeguradora = NewCorretora;
