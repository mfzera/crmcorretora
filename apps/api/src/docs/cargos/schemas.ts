import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { cargos } from '@ecotech/shared/database';
import {
  createCargoSchema,
  updateCargoSchema,
  atribuirPermissoesSchema,
} from '@ecotech/features/cargos';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
} from '../index.js';
import { wireDate } from '../wire.js';

const cargoSelect = createSelectSchema(cargos);

const cargoBase = cargoSelect.extend({
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
});

const msgSuccess = z.object({ success: z.literal(true), message: z.string() });

const atribuirCargoFromTemplateBody = z.object({
  nomeCargo: z.string().min(2).max(100),
  descricao: z.string().optional(),
  cor: z.string().optional(),
});

export const cargosDocs = {
  criar: routeDoc({
    body: createCargoSchema,
    response: {
      201: z.object({ success: z.literal(true), data: z.unknown() }),
      ...defaultErrors,
      409: z.object({
        success: z.literal(false),
        error: z.object({ code: z.string(), message: z.string() }),
      }),
    },
  }),

  listar: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.unknown()),
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

  atualizar: routeDoc({
    params: uuidParam,
    body: updateCargoSchema,
    response: {
      200: z.object({ success: z.literal(true), data: z.unknown() }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizarCor: routeDoc({
    params: uuidParam,
    body: z.object({
      cor: z.string().describe('Cor em formato hex (#RRGGBB)'),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          id: z.string().uuid(),
          nomeCargo: z.string(),
          cor: z.string().nullable(),
        }),
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  excluir: routeDoc({
    params: uuidParam,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  atribuirPermissoes: routeDoc({
    params: uuidParam,
    body: atribuirPermissoesSchema,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  removerPermissao: routeDoc({
    params: z.object({
      id: z.string().uuid(),
      permissaoId: z.string().uuid(),
    }),
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  listarTemplates: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }),
      ...defaultErrors,
    },
  }),

  criarDeTemplate: routeDoc({
    params: z.object({ templateId: z.string() }),
    body: atribuirCargoFromTemplateBody,
    response: {
      201: z.object({
        success: z.literal(true),
        data: z.object({
          id: z.string().uuid(),
          nomeCargo: z.string(),
          descricao: z.string().nullable(),
          cor: z.string().nullable(),
          isGestor: z.boolean().nullable(),
          isVendedor: z.boolean().nullable(),
          totalPermissoes: z.number(),
        }),
        message: z.string(),
      }),
      ...defaultErrors,
    },
  }),

  duplicar: routeDoc({
    params: uuidParam,
    body: atribuirCargoFromTemplateBody,
    response: {
      201: z.object({
        success: z.literal(true),
        data: z.object({
          id: z.string().uuid(),
          nomeCargo: z.string(),
          descricao: z.string().nullable(),
          cor: z.string().nullable(),
          isGestor: z.boolean().nullable(),
          isVendedor: z.boolean().nullable(),
          totalPermissoes: z.number(),
        }),
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  permissoesDisponiveis: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.record(z.string(), z.unknown()),
      }),
      ...defaultErrors,
    },
  }),

  minhasPermissoes: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: z.unknown() }),
      ...defaultErrors,
    },
  }),
};
