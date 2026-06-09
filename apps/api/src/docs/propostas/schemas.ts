import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { propostasComerciais } from '@ecotech/shared/database';
import {
  createPropostaSchema,
  updatePropostaSchema,
  listPropostasQuerySchema,
  recusarPropostaSchema,
} from '@ecotech/features/propostas';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
  metaSchema,
} from '../index.js';
import { wireDate, wireNumber } from '../wire.js';

/**
 * Base derivada da tabela propostas_comerciais. Decimais ficam como string
 * (Drizzle não parseia decimal — handler retorna o valor cru). Timestamps
 * convertidos para wire format ISO string.
 */
const propostaSelect = createSelectSchema(propostasComerciais);

const propostaBase = propostaSelect.extend({
  premioLiquido: wireNumber.nullable(),
  percentualComissao: wireNumber.nullable(),
  valorComissao: wireNumber.nullable(),
  dataEnvio: wireDate.nullable(),
  dataResposta: wireDate.nullable(),
  dataAprovacao: wireDate.nullable(),
  dataRecusa: wireDate.nullable(),
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
});

const msgSuccess = z.object({ success: z.literal(true), message: z.string() });

const vendedorRef = z.object({ id: z.string().uuid(), nome: z.string(), email: z.string() });

const propostaComRelacoes = propostaBase.extend({
  cliente: z.unknown().nullable(),
  vendedor: vendedorRef.nullable(),
  produto: z.unknown().nullable(),
  cotacao: z.unknown().nullable(),
});

export const propostasDocs = {
  criar: routeDoc({
    body: createPropostaSchema,
    response: {
      201: z.object({ success: z.literal(true), data: propostaBase }),
      ...defaultErrors,
    },
  }),

  listar: routeDoc({
    querystring: listPropostasQuerySchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(
          propostaBase.extend({
            cliente: z.object({
              id: z.string().uuid(),
              nome: z.string().nullable(),
              razaoSocial: z.string().nullable(),
              tipoPessoa: z.string(),
            }),
            vendedor: z.object({ id: z.string().uuid(), nome: z.string() }),
            produto: z.object({
              id: z.string().uuid(),
              nomeProduto: z.string(),
              tipoSeguro: z.string(),
            }),
          }),
        ),
        meta: metaSchema,
      }),
      ...defaultErrors,
    },
  }),

  buscar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: propostaComRelacoes }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizar: routeDoc({
    params: uuidParam,
    body: updatePropostaSchema,
    response: {
      200: z.object({ success: z.literal(true), data: propostaBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  enviar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: propostaBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  aprovar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: propostaBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  recusar: routeDoc({
    params: uuidParam,
    body: recusarPropostaSchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: propostaBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  confirmarVenda: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: propostaSelect.pick({
          clienteId: true,
          produtoId: true,
          vendedorId: true,
          vigenciaInicio: true,
          vigenciaFim: true,
          premioLiquido: true,
          percentualComissao: true,
          coberturas: true,
        }).extend({
          propostaId: z.string().uuid(),
        }),
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),
};
