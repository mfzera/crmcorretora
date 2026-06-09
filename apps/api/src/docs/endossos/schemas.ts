import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { endossos } from '@ecotech/shared/database';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
  metaSchema,
} from '../index.js';
import { wireDate } from '../wire.js';

const tipoEndosso = z.enum([
  'INCLUSAO_COBERTURA',
  'EXCLUSAO_COBERTURA',
  'ALTERACAO_VALOR',
  'INCLUSAO_ITEM',
  'EXCLUSAO_ITEM',
  'ALTERACAO_DADOS',
  'ALTERACAO_VIGENCIA',
  'TRANSFERENCIA_SEGURADO',
  'SUBSTITUICAO_VEICULO',
  'CANCELAMENTO',
  'OUTROS',
]);

const statusEndosso = z.enum(['SOLICITADO', 'APROVADO', 'RECUSADO', 'CANCELADO']);

const endossoSelect = createSelectSchema(endossos);

const endossoBase = endossoSelect.extend({
  dataSolicitacao: wireDate,
  dataValidacao: wireDate.nullable(),
  dataAprovacao: wireDate.nullable(),
  dataRecusa: wireDate.nullable(),
  dataEmissao: wireDate.nullable(),
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
});

const createEndossoBody = z.object({
  documentoVendaId: z.string().uuid(),
  tipoEndosso,
  descricao: z.string().max(2000),
  motivoEndosso: z.string().max(1000).optional(),
  premioNovo: z.number().min(0).optional(),
  percentualComissaoNovo: z.number().min(0).max(100).optional(),
  alteracoes: z.record(z.string(), z.unknown()).optional(),
  dataVigenciaEndosso: z.string(),
  observacoes: z.string().max(2000).optional(),
});

const createEndossoExternoBody = z.object({
  clienteId: z.string().uuid(),
  vendedorId: z.string().uuid().optional(),
  produtoId: z.string().uuid(),
  seguradoraParceiraId: z.string().uuid().optional(),
  numeroPropostaExterna: z.string().min(1).max(100),
  vigenciaInicio: z.string(),
  vigenciaFim: z.string(),
  premioLiquido: z.number().min(0),
  percentualComissao: z.number().min(0).max(100).optional(),
  observacoesDocumento: z.string().max(2000).optional(),
  tipoEndosso,
  descricao: z.string().max(2000),
  motivoEndosso: z.string().max(1000).optional(),
  premioNovo: z.number().min(0).optional(),
  percentualComissaoNovo: z.number().min(0).max(100).optional(),
  dataVigenciaEndosso: z.string(),
  observacoesEndosso: z.string().max(2000).optional(),
});

const listQueryDoc = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).optional(),
  documentoVendaId: z.string().uuid().optional(),
  vendedorId: z.string().uuid().optional(),
  tipoEndosso: tipoEndosso.optional(),
  status: statusEndosso.optional(),
});

const vendedorRef = z.object({ id: z.string().uuid(), nome: z.string(), email: z.string() });
const gestorRef = z.object({ id: z.string().uuid(), nome: z.string() });

const endossoComRelacoes = endossoBase.extend({
  documentoVenda: z.unknown().nullable(),
  vendedor: vendedorRef.nullable(),
  validadoPor: gestorRef.nullable(),
  aprovadoPor: gestorRef.nullable(),
  emitidoPor: gestorRef.nullable(),
});

export const endossosDocs = {
  criar: routeDoc({
    body: createEndossoBody,
    response: {
      201: z.object({ success: z.literal(true), data: endossoBase }),
      ...defaultErrors,
    },
  }),

  criarExterno: routeDoc({
    body: createEndossoExternoBody,
    response: {
      201: z.object({
        success: z.literal(true),
        data: z.object({ documento: z.unknown(), endosso: endossoBase }),
      }),
      ...defaultErrors,
    },
  }),

  listar: routeDoc({
    querystring: listQueryDoc,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(
          endossoBase.extend({
            documentoVenda: z.object({
              id: z.string().uuid(),
              numeroDocumento: z.string(),
              numeroApoliceExterna: z.string().nullable(),
              cliente: z.object({
                id: z.string().uuid(),
                nome: z.string().nullable(),
                razaoSocial: z.string().nullable(),
              }),
            }),
            vendedor: z.object({ id: z.string().uuid(), nome: z.string() }),
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
      200: z.object({ success: z.literal(true), data: endossoComRelacoes }),
      ...defaultErrorsWithNotFound,
    },
  }),

  aprovar: routeDoc({
    params: uuidParam,
    body: z.object({
      numeroEndossoExterno: z.string().max(100).optional(),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: endossoBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  recusar: routeDoc({
    params: uuidParam,
    body: z.object({ motivoRecusa: z.string().max(1000) }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: endossoBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizar: routeDoc({
    params: uuidParam,
    body: z.object({
      descricao: z.string().min(1).optional(),
      observacoes: z.string().optional().nullable(),
      premioNovo: z.number().min(0).optional().nullable(),
      percentualComissaoNovo: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .nullable(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: endossoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  reenviar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: endossoBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  cancelar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: endossoBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),
};
