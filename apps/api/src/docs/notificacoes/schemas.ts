import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { notificacoes } from '@ecotech/shared/database';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
  metaSchema,
} from '../index.js';
import { wireDate } from '../wire.js';

const notificacaoSelect = createSelectSchema(notificacoes);

/**
 * Handler renomeia `linkAcao` para `link` na resposta. Mantemos a derivação
 * para os demais campos e aplicamos pick + rename via extend.
 */
const notificacao = notificacaoSelect
  .pick({
    id: true,
    titulo: true,
    mensagem: true,
    tipo: true,
    lida: true,
  })
  .extend({
    link: z.string().nullable(),
    lidaEm: wireDate.nullable(),
    createdAt: wireDate,
  });

const msgSuccess = z.object({ success: z.literal(true), message: z.string() });

export const notificacoesDocs = {
  listar: routeDoc({
    querystring: z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      lida: z.enum(['true', 'false']).optional(),
      tipo: z.string().optional(),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.unknown()),
        meta: metaSchema,
      }),
      ...defaultErrors,
    },
  }),

  countNaoLidas: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ count: z.number() }),
      }),
      ...defaultErrors,
    },
  }),

  buscar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: z.unknown() }),
      ...defaultErrorsWithNotFound,
    },
  }),

  marcarLida: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: z.unknown() }),
      ...defaultErrorsWithNotFound,
    },
  }),

  marcarTodasLidas: routeDoc({
    response: { 200: msgSuccess, ...defaultErrors },
  }),

  excluir: routeDoc({
    params: uuidParam,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  excluirTodasLidas: routeDoc({
    response: { 200: msgSuccess, ...defaultErrors },
  }),
};
