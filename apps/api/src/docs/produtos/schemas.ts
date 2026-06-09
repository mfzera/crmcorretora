import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { produtos } from '@ecotech/shared/database';
import {
  createProdutoSchema,
  updateProdutoSchema,
  listProdutosQuerySchema,
} from '@ecotech/features/produtos';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
} from '../index.js';
import { wireDate } from '../wire.js';

const produtoSelect = createSelectSchema(produtos);

const produtoBase = produtoSelect.extend({
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
});

const msgSuccess = z.object({ success: z.literal(true), message: z.string() });

export const produtosDocs = {
  tiposSeguro: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.string()) }),
      ...defaultErrors,
    },
  }),

  criar: routeDoc({
    body: createProdutoSchema,
    response: {
      201: z.object({ success: z.literal(true), data: produtoBase }),
      ...defaultErrors,
    },
  }),

  listar: routeDoc({
    querystring: listProdutosQuerySchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.unknown(),
      }),
      ...defaultErrors,
    },
  }),

  buscar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: produtoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizar: routeDoc({
    params: uuidParam,
    body: updateProdutoSchema,
    response: {
      200: z.object({ success: z.literal(true), data: produtoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  excluir: routeDoc({
    params: uuidParam,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),
};
