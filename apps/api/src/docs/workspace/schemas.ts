import { z } from 'zod';
import { routeDoc, defaultErrors, paginationQuery, metaSchema } from '../index.js';

export const workspaceDocs = {
  resumo: routeDoc({
    querystring: paginationQuery,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          estatisticas: z.object({
            totalRenovacoesPendentes: z.number(),
            totalCotacoesAtivas: z.number(),
            totalPropostasAtivas: z.number(),
            totalEndossosPendentes: z.number(),
            totalCanceladosMes: z.number(),
            metaMensal: z.number(),
            vendidoMes: z.number(),
          }),
          data: z.array(z.unknown()),
          meta: metaSchema,
          renovacoes: z.array(z.unknown()),
          cotacoes: z.array(z.unknown()),
          propostas: z.array(z.unknown()),
        }),
      }),
      ...defaultErrors,
    },
  }),

  endossos: routeDoc({
    querystring: paginationQuery,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.unknown()),
        meta: metaSchema,
      }),
      ...defaultErrors,
    },
  }),

  equipe: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          renovacoesPendentes: z.array(z.unknown()),
          renovacoesVencidas: z.array(z.unknown()),
          cotacoes: z.array(z.unknown()),
          membros: z.array(z.object({ id: z.string().uuid(), nome: z.string(), avatarUrl: z.string().nullable() })),
        }),
      }),
      ...defaultErrors,
    },
  }),

  planilha: routeDoc({
    querystring: z.object({
      vigenciaInicio: z.string().optional(),
      vigenciaFim: z.string().optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }),
      ...defaultErrors,
    },
  }),

  cancelados: routeDoc({
    querystring: paginationQuery,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.unknown()),
        meta: metaSchema,
      }),
      ...defaultErrors,
    },
  }),
};
