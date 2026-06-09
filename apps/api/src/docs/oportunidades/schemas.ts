import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { oportunidades } from '@ecotech/shared/database';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
} from '../index.js';
import { wireDate, wireNumber } from '../wire.js';

const statusOportunidade = z.enum([
  'lead',
  'contato_inicial',
  'negociacao',
  'ganha',
  'perdida',
  'arquivada',
]);

const temperatura = z.enum(['frio', 'morno', 'quente']);

const oportunidadeSelect = createSelectSchema(oportunidades);

const oportunidadeBase = oportunidadeSelect.extend({
  premioEstimado: wireNumber.nullable(),
  valorFechado: wireNumber.nullable(),
  dataVencimento: wireDate.nullable(),
  dataFechamento: wireDate.nullable(),
  dataUltimoContato: wireDate.nullable(),
  createdAt: wireDate,
  updatedAt: wireDate,
  deletedAt: wireDate.nullable(),
});

const vendedorRef = z.object({ id: z.string().uuid(), nome: z.string(), email: z.string() });

const clienteListRef = z.object({
  id: z.string().uuid(),
  nome: z.string().nullable(),
  razaoSocial: z.string().nullable(),
  tipoPessoa: z.string(),
});

const clienteDetalheRef = clienteListRef.extend({
  email: z.string().nullable(),
  telefone: z.string().nullable(),
});

const produtoRef = z.object({ id: z.string().uuid(), nomeProduto: z.string() });

const oportunidadeListItem = oportunidadeBase.extend({
  vendedor: vendedorRef.nullable(),
  vendedorOriginal: vendedorRef.nullable(),
  cliente: clienteListRef.nullable(),
  produto: produtoRef.nullable(),
});

const oportunidadeDetalhe = oportunidadeBase.extend({
  vendedor: vendedorRef.nullable(),
  vendedorOriginal: vendedorRef.nullable(),
  cliente: clienteDetalheRef.nullable(),
});

export const oportunidadesDocs = {
  listar: routeDoc({
    querystring: z.object({
      status: statusOportunidade.optional(),
      produtoId: z.string().uuid().optional(),
      vendedorId: z.string().uuid().optional(),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(oportunidadeListItem),
      }),
      ...defaultErrors,
    },
  }),

  listarGanhasSemCliente: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(oportunidadeBase),
      }),
      ...defaultErrors,
    },
  }),

  buscar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: oportunidadeDetalhe }),
      ...defaultErrorsWithNotFound,
    },
  }),

  criar: routeDoc({
    body: z.object({
      nomeCliente: z.string().min(1),
      emailCliente: z.string().email().optional(),
      telefoneCliente: z.string().optional(),
      clienteId: z.string().uuid().optional(),
      vendedorId: z.string().uuid().optional(),
      status: statusOportunidade.optional(),
      temperatura: temperatura.optional(),
      premioEstimado: z.number().optional(),
      dataVencimento: z.string().optional(),
      produtoId: z.string().uuid().optional(),
      observacoes: z.string().optional(),
      tags: z.array(z.string()).optional(),
      origem: z.string().optional(),
    }),
    response: {
      201: z.object({ success: z.literal(true), data: oportunidadeBase }),
      ...defaultErrors,
    },
  }),

  atualizar: routeDoc({
    params: uuidParam,
    body: z.object({
      nomeCliente: z.string().optional(),
      emailCliente: z.string().email().optional(),
      telefoneCliente: z.string().optional(),
      vendedorId: z.string().uuid().optional(),
      temperatura: temperatura.optional(),
      premioEstimado: z.number().optional(),
      observacoes: z.string().optional(),
      dataVencimento: z.string().optional(),
      tags: z.array(z.string()).optional(),
      origem: z.string().optional(),
      produtoId: z.string().uuid().optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: oportunidadeBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  mover: routeDoc({
    params: uuidParam,
    body: z.object({
      novoStatus: statusOportunidade,
      novaOrdem: z.number(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: oportunidadeBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  fechar: routeDoc({
    params: uuidParam,
    body: z.object({
      valorFechado: z.number().optional(),
      observacoes: z.string().optional(),
      gerarDocumento: z.boolean().optional(),
      produtoId: z.string().uuid().optional(),
      seguradoraParceiraId: z.string().uuid().optional(),
      situacao: z.string().optional(),
      numeroProposta: z.string().optional(),
      dataVigenciaInicio: z.string().optional(),
      dataVigenciaFim: z.string().optional(),
      premioFinal: z.number().optional(),
      criarRenovacao: z.boolean().optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: z.unknown() }),
      ...defaultErrorsWithNotFound,
    },
  }),

  perder: routeDoc({
    params: uuidParam,
    body: z.object({
      motivoPerda: z.string().optional(),
      detalhesPerda: z.string().optional(),
      dataRecontato: z.string().optional(),
      observacaoRecontato: z.string().optional(),
    }),
    response: {
      200: z.object({ success: z.literal(true), data: oportunidadeBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  excluir: routeDoc({
    params: uuidParam,
    response: { 204: z.object({}) },
  }),

  historico: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }),
      ...defaultErrorsWithNotFound,
    },
  }),

  vincularCliente: routeDoc({
    params: uuidParam,
    body: z.object({ clienteId: z.string().uuid() }),
    response: {
      200: z.object({ success: z.literal(true), data: oportunidadeBase }),
      ...defaultErrorsWithNotFound,
    },
  }),

  transferir: routeDoc({
    params: uuidParam,
    body: z.object({
      vendedorDestinoId: z.string().uuid(),
      motivo: z.string().optional(),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: oportunidadeBase,
        message: z.string(),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  historicoTransferencias: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }),
      ...defaultErrorsWithNotFound,
    },
  }),

  confirmarCliente: routeDoc({
    params: uuidParam,
    body: z.object({ clienteId: z.string().uuid() }),
    response: {
      200: z.object({ success: z.literal(true), data: z.unknown() }),
      ...defaultErrorsWithNotFound,
    },
  }),
};
