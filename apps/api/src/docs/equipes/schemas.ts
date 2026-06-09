import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { equipes } from '@ecotech/shared/database';
import {
  createEquipeSchema,
  updateEquipeSchema,
  listEquipesQuerySchema,
  atribuirLiderSchema,
  adicionarMembroSchema,
} from '@ecotech/features/equipes';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
  metaSchema,
} from '../index.js';
import { wireDate } from '../wire.js';

const equipeSelect = createSelectSchema(equipes);

const equipeBase = equipeSelect.extend({
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
});

const membroRef = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
});
const msgSuccess = z.object({ success: z.literal(true), message: z.string() });

export const equipesDocs = {
  criar: routeDoc({
    body: createEquipeSchema,
    response: {
      201: z.object({ success: z.literal(true), data: equipeBase }),
      ...defaultErrors,
    },
  }),

  listar: routeDoc({
    querystring: listEquipesQuerySchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.unknown()),
        meta: metaSchema,
      }),
      ...defaultErrors,
    },
  }),

  buscar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.unknown(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizar: routeDoc({
    params: uuidParam,
    body: updateEquipeSchema,
    response: {
      200: z.object({ success: z.literal(true), data: equipeBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  excluir: routeDoc({
    params: uuidParam,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  atribuirLider: routeDoc({
    params: uuidParam,
    body: atribuirLiderSchema,
    response: {
      200: z.object({ success: z.literal(true), data: equipeBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  adicionarMembro: routeDoc({
    params: uuidParam,
    body: adicionarMembroSchema,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  removerMembro: routeDoc({
    params: z.object({
      id: z.string().uuid(),
      usuarioId: z.string().uuid(),
    }),
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),
};
