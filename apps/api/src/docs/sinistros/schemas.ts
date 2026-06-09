import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { sinistros } from '@ecotech/shared/database';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
  metaSchema,
} from '../index.js';
import { wireDate } from '../wire.js';

const tipoSinistro = z.enum([
  'COLISAO',
  'ROUBO_FURTO',
  'INCENDIO',
  'DANOS_NATURAIS',
  'DANOS_TERCEIROS',
  'INVALIDEZ',
  'MORTE',
  'HOSPITALIZACAO',
  'OUTROS',
]);

const statusSinistro = z.enum([
  'ABERTO',
  'EM_ANALISE',
  'AGUARDANDO_DOCUMENTOS',
  'APROVADO',
  'RECUSADO',
  'PAGO',
  'CANCELADO',
]);

const sinistroSelect = createSelectSchema(sinistros);

const sinistroBase = sinistroSelect.extend({
  dataAbertura: wireDate,
  dataAnalise: wireDate.nullable(),
  dataAprovacao: wireDate.nullable(),
  dataRecusa: wireDate.nullable(),
  dataPagamento: wireDate.nullable(),
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
});

const listQueryDoc = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).optional(),
  documentoVendaId: z.string().uuid().optional(),
  solicitanteId: z.string().uuid().optional(),
  tipoSinistro: tipoSinistro.optional(),
  status: statusSinistro.optional(),
  dataAberturaInicio: z.string().optional(),
  dataAberturaFim: z.string().optional(),
});

const anotacaoBody = z.object({ texto: z.string().min(1).max(2000) });

const comentario = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  texto: z.string(),
  createdAt: wireDate,
  autor: z.object({
    id: z.string().uuid(),
    nome: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  replies: z.array(z.unknown()),
});

const usuarioRef = z.object({ id: z.string().uuid(), nome: z.string(), email: z.string() });

const sinistroListItem = sinistroBase.extend({
  documentoVenda: z.unknown().nullable(),
  solicitante: usuarioRef.nullable(),
});

const sinistroDetalhe = sinistroBase.extend({
  documentoVenda: z.unknown().nullable(),
  solicitante: usuarioRef.nullable(),
  analistaPor: usuarioRef.nullable(),
  aprovadoPor: usuarioRef.nullable(),
});

export const sinistrosDocs = {
  criar: routeDoc({
    body: z.object({
      documentoVendaId: z.string().uuid(),
      tipoSinistro,
      descricao: z.string().min(1).max(3000),
      dataOcorrencia: z.string().describe('Data ISO, não pode ser futura'),
      valorReclamado: z.number().min(0).optional(),
      numeroSinistroExterno: z.string().max(100).optional(),
      observacoes: z.string().max(2000).optional(),
    }),
    response: {
      201: z.object({ success: z.literal(true), data: sinistroBase }),
      ...defaultErrors,
    },
  }),

  listar: routeDoc({
    querystring: listQueryDoc,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(sinistroListItem),
        meta: metaSchema,
      }),
      ...defaultErrors,
    },
  }),

  buscar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: sinistroDetalhe }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizar: routeDoc({
    params: uuidParam,
    body: z.object({
      tipoSinistro: tipoSinistro.optional(),
      descricao: z.string().min(1).max(3000).optional(),
      dataOcorrencia: z.string().optional(),
      valorReclamado: z.number().min(0).optional(),
      numeroSinistroExterno: z.string().max(100).optional(),
      observacoes: z.string().max(2000).optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: sinistroBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  mover: routeDoc({
    params: uuidParam,
    body: z.object({
      novoStatus: statusSinistro,
      observacao: z.string().max(1000).optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: sinistroBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  aprovar: routeDoc({
    params: uuidParam,
    body: z.object({
      valorAprovado: z.number().min(0).optional(),
      observacao: z.string().max(1000).optional(),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: sinistroBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  recusar: routeDoc({
    params: uuidParam,
    body: z.object({ motivoRecusa: z.string().min(1).max(1000) }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: sinistroBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  pagar: routeDoc({
    params: uuidParam,
    body: z.object({ observacao: z.string().max(1000).optional() }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: sinistroBase,
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
        data: sinistroBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  anotar: routeDoc({
    params: uuidParam,
    body: anotacaoBody,
    response: {
      201: z.object({ success: z.literal(true), data: z.unknown() }),
      ...defaultErrorsWithNotFound,
    },
  }),

  listarComentarios: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: z.array(comentario) }),
      ...defaultErrorsWithNotFound,
    },
  }),

  adicionarComentario: routeDoc({
    params: uuidParam,
    body: z.object({
      texto: z.string().min(1).max(2000),
      parentId: z.string().uuid().nullable().optional(),
    }),
    response: {
      201: z.object({ success: z.literal(true), data: comentario }),
      ...defaultErrorsWithNotFound,
    },
  }),

  historico: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }),
      ...defaultErrorsWithNotFound,
    },
  }),
};
