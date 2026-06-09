import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { metas, missoes, campanhas } from '@ecotech/shared/database';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
} from '../index.js';
import { wireDate, wireNumber } from '../wire.js';

const tipoMetrica = z.enum([
  'novos_seguros',
  'renovacoes',
  'cotacoes',
  'valor_premio',
  'taxa_renovacao',
  'premio_renovacao',
]);
const msgSuccess = z.object({ success: z.literal(true), message: z.string() });

// ── Metas ──────────────────────────────────────────────────────────────────

const metaSelect = createSelectSchema(metas);

const metaBase = metaSelect.extend({
  valorAlvo: wireNumber,
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
  // Campos calculados pelo handler (não estão na tabela)
  progressoAtual: z.number(),
  percentual: z.number(),
});

const createMetaBody = z.object({
  titulo: z.string().min(1).max(255),
  descricao: z.string().optional(),
  tipoMetrica,
  valorAlvo: z.number().positive(),
  dataInicio: z.string().describe('Formato YYYY-MM-DD'),
  dataFim: z.string().describe('Formato YYYY-MM-DD'),
  equipeId: z.string().uuid().optional(),
  usuarioId: z.string().uuid().optional(),
});

export const metasDocs = {
  listar: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: z.array(metaBase) }),
      ...defaultErrors,
    },
  }),
  criar: routeDoc({
    body: createMetaBody,
    response: {
      201: z.object({ success: z.literal(true), data: metaBase }),
      ...defaultErrors,
    },
  }),
  buscar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: metaBase }),
      ...defaultErrorsWithNotFound,
    },
  }),
  atualizar: routeDoc({
    params: uuidParam,
    body: z.object({
      titulo: z.string().min(1).max(255).optional(),
      descricao: z.string().nullable().optional(),
      dataFim: z.string().optional(),
      status: z.enum(['CANCELADA']).optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: metaBase }),
      ...defaultErrorsWithNotFound,
    },
  }),
  auditoria: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }),
      ...defaultErrorsWithNotFound,
    },
  }),
  excluir: routeDoc({
    params: uuidParam,
    response: { 204: z.object({}) },
  }),
};

// ── Missões ────────────────────────────────────────────────────────────────

const missaoSelect = createSelectSchema(missoes);

const missaoBase = missaoSelect.extend({
  valorAlvo: wireNumber,
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
  // Campos calculados pelo handler
  progressoAtual: z.number(),
  percentual: z.number(),
});

const createMissaoBody = z.object({
  titulo: z.string().min(1).max(255),
  descricao: z.string().optional(),
  tipoMetrica,
  valorAlvo: z.number().positive(),
  dataInicio: z.string().describe('Formato YYYY-MM-DD'),
  prazo: z.string().describe('Formato YYYY-MM-DD'),
  equipeId: z.string().uuid().optional(),
  usuarioId: z.string().uuid().optional(),
  badgeTipoId: z.string().uuid().optional(),
  badgeObservacao: z.string().optional(),
});

export const missoesDocs = {
  listar: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: z.array(missaoBase) }),
      ...defaultErrors,
    },
  }),
  criar: routeDoc({
    body: createMissaoBody,
    response: {
      201: z.object({ success: z.literal(true), data: missaoBase }),
      ...defaultErrors,
    },
  }),
  buscar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: missaoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),
  atualizar: routeDoc({
    params: uuidParam,
    body: z.object({
      titulo: z.string().min(1).max(255).optional(),
      descricao: z.string().nullable().optional(),
      prazo: z.string().optional(),
      status: z.enum(['CANCELADA', 'EM_ANDAMENTO']).optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: missaoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),
  auditoria: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }),
      ...defaultErrorsWithNotFound,
    },
  }),
  excluir: routeDoc({
    params: uuidParam,
    response: { 204: z.object({}) },
  }),
};

// ── Campanhas ──────────────────────────────────────────────────────────────

const campanhaSelect = createSelectSchema(campanhas);

const campanhaBase = campanhaSelect.extend({
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
});

export const campanhasDocs = {
  listar: routeDoc({
    querystring: z.object({ todas: z.enum(['true', 'false']).optional() }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(campanhaBase),
      }),
      ...defaultErrors,
    },
  }),
  criar: routeDoc({
    body: z.object({
      titulo: z.string().min(1).max(255),
      descricao: z.string().min(1),
      seguradoraParceiraId: z.string().uuid().optional(),
      dataInicio: z.string(),
      dataFim: z.string(),
      ativa: z.boolean().optional(),
    }),
    response: {
      201: z.object({ success: z.literal(true), data: campanhaBase }),
      ...defaultErrors,
    },
  }),
  atualizar: routeDoc({
    params: uuidParam,
    body: z.object({
      titulo: z.string().min(1).max(255).optional(),
      descricao: z.string().min(1).optional(),
      seguradoraParceiraId: z.string().uuid().nullable().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      ativa: z.boolean().optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: campanhaBase }),
      ...defaultErrorsWithNotFound,
    },
  }),
  auditoria: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }),
      ...defaultErrorsWithNotFound,
    },
  }),
  excluir: routeDoc({
    params: uuidParam,
    response: { 204: z.object({}) },
  }),
};

// ── Badges ─────────────────────────────────────────────────────────────────
const badgeItem = z.object({
  id: z.string().uuid(),
  badgeTipoId: z.string().uuid(),
  badgeTipo: z.unknown(),
  observacao: z.string().nullable(),
  createdAt: wireDate,
});

export const badgesDocs = {
  listar: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }),
      ...defaultErrors,
    },
  }),
  recente: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.unknown().nullable(),
      }),
      ...defaultErrors,
    },
  }),
  meus: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: z.array(badgeItem) }),
      ...defaultErrors,
    },
  }),
  porUsuario: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: z.array(badgeItem) }),
      ...defaultErrorsWithNotFound,
    },
  }),
  conceder: routeDoc({
    body: z.object({
      usuarioId: z.string().uuid(),
      badgeTipoId: z.string().uuid(),
      observacao: z.string().optional(),
    }),
    response: { 201: msgSuccess, ...defaultErrors },
  }),
};

// ── Ranking ────────────────────────────────────────────────────────────────
export const rankingDocs = {
  ranking: routeDoc({
    querystring: z.object({
      dataInicio: z.string().optional().describe('Formato YYYY-MM-DD'),
      dataFim: z.string().optional().describe('Formato YYYY-MM-DD'),
      equipeId: z.string().uuid().optional(),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          ranking: z.array(
            z.object({
              posicao: z.number(),
              usuarioId: z.string().uuid(),
              nome: z.string(),
              email: z.string(),
              avatarUrl: z.string().nullable(),
              equipeId: z.string().uuid().nullable(),
              equipeNome: z.string().nullable(),
              pontos: z.number(),
              badges: z.number(),
              metasBatidas: z.number(),
              missoesCumpridas: z.number(),
            }),
          ),
          rankingEquipes: z.array(
            z.object({
              posicao: z.number(),
              equipeId: z.string().uuid(),
              equipeNome: z.string(),
              pontos: z.number(),
              membros: z.number(),
            }),
          ),
          periodo: z.object({
            dataInicio: z.string(),
            dataFim: z.string(),
          }),
          regras: z.object({
            pontosBadge: z.number(),
            pontosMeta: z.number(),
            pontosMissao: z.number(),
          }),
        }),
      }),
      ...defaultErrors,
    },
  }),
};

// ── Reconhecimento ─────────────────────────────────────────────────────────
export const reconhecimentoDocs = {
  stats: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: z.unknown() }),
      ...defaultErrors,
    },
  }),
};
