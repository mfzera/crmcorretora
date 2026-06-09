import { z } from 'zod';
import { routeDoc, defaultErrors, defaultErrorsWithNotFound, uuidParam } from '../index.js';
import { wireDate, wireNumber } from '../wire.js';

const oportunidadeBase = z.object({
  id: z.string().uuid(),
  corretoraId: z.string().uuid(),
  vendedorId: z.string().uuid().nullable(),
  nomeCliente: z.string(),
  emailCliente: z.string().nullable(),
  telefoneCliente: z.string().nullable(),
  status: z.string(),
  temperatura: z.string().nullable(),
  premioEstimado: wireNumber.nullable(),
  createdAt: wireDate,
  updatedAt: wireDate,
});

export const gestaoCrmDocs = {
  overview: routeDoc({
    querystring: z.object({ vendedorId: z.string().uuid().optional(), status: z.string().optional() }),
    response: { 200: z.object({ success: z.literal(true), data: z.array(oportunidadeBase) }), ...defaultErrors },
  }),

  vendedores: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.object({
          id: z.string().uuid(), nome: z.string(), email: z.string(),
          stats: z.object({ total: z.number(), leads: z.number(), contatoInicial: z.number(), negociacao: z.number(), ganhas: z.number(), perdidas: z.number(), valorTotal: z.number(), valorEstimado: z.number(), taxaConversao: z.number() }),
        })),
      }),
      ...defaultErrors,
    },
  }),

  criarOportunidade: routeDoc({
    body: z.object({
      vendedorId: z.string().uuid(), nomeCliente: z.string().optional(), emailCliente: z.string().email().optional(),
      telefoneCliente: z.string().optional(), clienteId: z.string().uuid().optional(), status: z.string().optional(),
      temperatura: z.string().optional(), premioEstimado: z.number().optional(), dataVencimento: z.string().optional(),
      observacoes: z.string().optional(), tags: z.array(z.string()).optional(), origem: z.string().optional(),
    }),
    response: { 201: z.object({ success: z.literal(true), data: oportunidadeBase }), ...defaultErrors },
  }),

  reatribuirOportunidade: routeDoc({
    params: uuidParam,
    body: z.object({ novoVendedorId: z.string().uuid() }),
    response: { 200: z.object({ success: z.literal(true), data: oportunidadeBase }), ...defaultErrorsWithNotFound },
  }),

  estatisticas: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          geral: z.object({ totalOportunidades: z.number(), totalLeads: z.number(), totalPropostas: z.number(), totalNegociacao: z.number(), totalGanhas: z.number(), totalPerdidas: z.number(), valorTotalGanho: z.number(), valorEmNegociacao: z.number(), taxaConversao: z.number() }),
          prioridade: z.array(z.object({ prioridade: z.string(), count: z.number() })),
          temperatura: z.array(z.object({ temperatura: z.string(), count: z.number() })),
        }),
      }),
      ...defaultErrors,
    },
  }),

  excluirOportunidade: routeDoc({
    params: uuidParam,
    response: { 204: z.object({}) },
  }),

  config: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ prioridadeAutomatica: z.object({ habilitado: z.boolean(), diasBaixa: z.number(), diasMedia: z.number(), diasAlta: z.number(), diasUrgente: z.number() }).optional() }),
      }),
      ...defaultErrors,
    },
  }),

  atualizarConfig: routeDoc({
    body: z.object({ prioridadeAutomatica: z.object({ habilitado: z.boolean(), diasBaixa: z.number(), diasMedia: z.number(), diasAlta: z.number(), diasUrgente: z.number() }) }),
    response: { 200: z.object({ success: z.literal(true), data: z.unknown() }), ...defaultErrors },
  }),

  atualizarPrioridades: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), message: z.string(), data: z.object({ updated: z.number(), total: z.number().optional(), skipped: z.boolean().optional() }) }),
      ...defaultErrors,
    },
  }),
};
