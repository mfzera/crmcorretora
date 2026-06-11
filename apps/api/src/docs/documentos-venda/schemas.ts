import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import {
  documentosVenda,
  historicoDocumentoVenda,
} from '@ecotech/shared/database';
import {
  createDocumentoVendaSchema,
  registrarApoliceAvulsaSchema,
  updateDocumentoVendaSchema,
  registrarApoliceSchema,
  rejeitarCadastroSchema,
  cancelarVendaSchema,
  registrarPerdaSchema,
  adicionarAnotacaoSchema,
  solicitarExclusaoVendaSchema,
  recusarExclusaoVendaSchema,
} from '@ecotech/features/documentos-venda';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
  metaSchema,
} from '../index.js';
import { wireDate } from '../wire.js';

const documentoSelect = createSelectSchema(documentosVenda);
const historicoSelect = createSelectSchema(historicoDocumentoVenda);

const documentoBase = documentoSelect.extend({
  dataPagamentoComissao: wireDate.nullable(),
  dataSolicitacaoCadastro: wireDate.nullable(),
  dataAprovacaoCadastro: wireDate.nullable(),
  dataRejeicaoCadastro: wireDate.nullable(),
  dataCancelamento: wireDate.nullable(),
  dataPerda: wireDate.nullable(),
  lockedAt: wireDate.nullable(),
  lockExpiresAt: wireDate.nullable(),
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
});

const historicoItem = historicoSelect.extend({
  createdAt: wireDate.nullable(),
});

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

const comentarioBody = z.object({
  texto: z.string().min(1).max(2000),
  parentId: z.string().uuid().nullable().optional(),
});

const msgSuccess = z.object({ success: z.literal(true), message: z.string() });

const usuarioRef = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable().optional(),
});

const seguradoraRef = z.object({
  id: z.string().uuid(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable(),
});

const aprovadorRef = z.object({ id: z.string().uuid(), nome: z.string() });

const documentoComRelacoes = documentoBase.extend({
  cliente: z.unknown().nullable(),
  vendedor: usuarioRef.nullable(),
  vendedorSecundario: usuarioRef.nullable(),
  vendedorTerceiro: usuarioRef.nullable(),
  atuante: usuarioRef.nullable(),
  produto: z.unknown().nullable(),
  seguradoraParceira: seguradoraRef.nullable(),
  aprovadoPor: aprovadorRef.nullable(),
  rejeitadoPor: aprovadorRef.nullable(),
  canceladoPor: aprovadorRef.nullable(),
});

const listQueryDoc = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).optional(),
  search: z.string().max(100).optional(),
  clienteId: z.string().uuid().optional(),
  produtoId: z.string().uuid().optional(),
  vendedorId: z.string().uuid().optional(),
  status: z
    .string()
    .optional()
    .describe('Status ou múltiplos separados por vírgula'),
  tipoDocumento: z
    .enum(['COTACAO_DIRETA', 'PROPOSTA_FORMAL', 'VENDA_EXPRESSA'])
    .optional(),
  seguradoraParceiraId: z.string().uuid().optional(),
  vigenciaFimAte: z.string().optional(),
  vigenciaFimDe: z.string().optional(),
  vigenciaInicioAte: z.string().optional(),
  vigenciaInicioDe: z.string().optional(),
  criadoApos: z.string().optional(),
  criadoAntes: z.string().optional(),
  dataAprovacaoDe: z.string().optional(),
  dataAprovacaoAte: z.string().optional(),
});

export const documentosVendaDocs = {
  criar: routeDoc({
    body: createDocumentoVendaSchema,
    response: {
      201: z.object({ success: z.literal(true), data: documentoBase }),
      ...defaultErrors,
    },
  }),

  registrarApoliceAvulsa: routeDoc({
    body: registrarApoliceAvulsaSchema,
    response: {
      201: z.object({ success: z.literal(true), data: documentoBase }),
      ...defaultErrors,
    },
  }),

  listar: routeDoc({
    querystring: listQueryDoc,
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
      200: z.object({ success: z.literal(true), data: documentoComRelacoes }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizar: routeDoc({
    params: uuidParam,
    body: updateDocumentoVendaSchema,
    response: {
      200: z.object({ success: z.literal(true), data: documentoBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  registrarApoliceExterna: routeDoc({
    params: uuidParam,
    body: registrarApoliceSchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: documentoBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  solicitarValidacaoCadastro: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: documentoBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  aprovarCadastro: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: documentoBase,
        renovacao: z.unknown().nullable(),
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  criarRenovacao: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.unknown(),
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  rejeitarCadastro: routeDoc({
    params: uuidParam,
    body: rejeitarCadastroSchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: documentoBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  cancelar: routeDoc({
    params: uuidParam,
    body: cancelarVendaSchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: documentoBase,
        message: z.string(),
        avisoComissao: z.string().nullable(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  perder: routeDoc({
    params: uuidParam,
    body: registrarPerdaSchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: documentoBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  confirmarPerda: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: documentoBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  rejeitarPerda: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: documentoBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  historico: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(historicoItem),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  adicionarAnotacao: routeDoc({
    params: uuidParam,
    body: adicionarAnotacaoSchema,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  arquivar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: documentoBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  lock: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: documentoBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  unlock: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: documentoBase.optional(),
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  lockStatus: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          isLocked: z.boolean(),
          isLockedByCurrentUser: z.boolean(),
          lockedBy: z
            .object({ id: z.string().uuid(), nome: z.string() })
            .nullable(),
          lockedAt: wireDate.nullable(),
          lockExpiresAt: wireDate.nullable(),
        }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  solicitarInclusao: routeDoc({
    params: uuidParam,
    body: z.object({
      produtoId: z.string().uuid().optional(),
      seguradoraParceiraId: z.string().uuid().optional(),
      vigenciaInicio: z.string().optional(),
      vigenciaFim: z.string().optional(),
      premioLiquido: z.number().optional(),
      itemDescricao: z.string().optional(),
      observacoes: z
        .string()
        .min(10)
        .describe('Motivo da inclusão (mínimo 10 caracteres)'),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: documentoBase,
        message: z.string(),
      }),
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
    body: comentarioBody,
    response: {
      201: z.object({ success: z.literal(true), data: comentario }),
      ...defaultErrorsWithNotFound,
    },
  }),

  solicitarExclusao: routeDoc({
    params: uuidParam,
    body: solicitarExclusaoVendaSchema,
    response: {
      201: z.object({ success: z.literal(true), data: z.unknown() }),
      ...defaultErrorsWithNotFound,
    },
  }),

  listarSolicitacoesExclusaoPendentes: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.unknown()),
      }),
      ...defaultErrors,
    },
  }),

  aceitarExclusao: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ message: z.string() }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  recusarExclusao: routeDoc({
    params: uuidParam,
    body: recusarExclusaoVendaSchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ message: z.string() }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  cadastroLogs: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          data: z.array(z.unknown()),
          total: z.number(),
          page: z.number(),
          totalPages: z.number(),
        }),
      }),
      ...defaultErrors,
    },
  }),
};
