import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { tarefas } from '@ecotech/shared/database';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
} from '../index.js';
import { wireDate } from '../wire.js';

const prioridade = z.enum(['baixa', 'media', 'alta', 'urgente']);

const tarefaSelect = createSelectSchema(tarefas);

const tarefaBase = tarefaSelect.extend({
  dataVencimento: wireDate.nullable(),
  concluidaEm: wireDate.nullable(),
  createdAt: wireDate,
  updatedAt: wireDate,
  deletedAt: wireDate.nullable(),
});

const msgSuccess = z.object({ success: z.literal(true), message: z.string() });

export const tarefasDocs = {
  listar: routeDoc({
    querystring: z.object({
      concluida: z.enum(['true', 'false']).optional(),
      prioridade: prioridade.optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: z.array(tarefaBase) }),
      ...defaultErrors,
    },
  }),

  criar: routeDoc({
    body: z.object({
      titulo: z.string().min(1).max(255),
      descricao: z.string().optional(),
      prioridade: prioridade.optional(),
      dataVencimento: z.string().datetime().optional(),
      entidadeTipo: z.string().max(50).optional(),
      entidadeId: z.string().uuid().optional(),
    }),
    response: {
      201: z.object({ success: z.literal(true), data: tarefaBase }),
      ...defaultErrors,
    },
  }),

  atualizar: routeDoc({
    params: uuidParam,
    body: z.object({
      titulo: z.string().min(1).max(255).optional(),
      descricao: z.string().nullable().optional(),
      prioridade: prioridade.optional(),
      dataVencimento: z.string().datetime().nullable().optional(),
      concluida: z.boolean().optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: tarefaBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  concluir: routeDoc({
    params: uuidParam,
    body: z.object({ concluida: z.boolean().optional() }),
    response: {
      200: z.object({ success: z.literal(true), data: tarefaBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  excluir: routeDoc({
    params: uuidParam,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),
};
