import { z } from 'zod';
import { routeDoc, defaultErrors } from '../index.js';

const baseQuery = z.object({
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  vendedorId: z.string().uuid().optional(),
  equipeId: z.string().uuid().optional(),
  produtoId: z.string().uuid().optional(),
  seguradoraParceiraId: z.string().uuid().optional(),
  status: z.string().optional(),
});

export const metricasDocs = {
  principal: routeDoc({
    querystring: baseQuery,
    response: { 200: z.object({ success: z.literal(true), data: z.unknown() }), ...defaultErrors },
  }),

  evolucao: routeDoc({
    querystring: baseQuery.extend({ granularidade: z.enum(['dia', 'semana', 'mes']).optional() }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ evolucao: z.array(z.object({ periodo: z.string(), totalPremio: z.number(), mediaPercentualComissao: z.number() })) }),
      }),
      ...defaultErrors,
    },
  }),

  detalhes: routeDoc({
    querystring: baseQuery.extend({ categoria: z.string().describe('Categoria de detalhes (obrigatório)') }),
    response: {
      200: z.object({ success: z.literal(true), data: z.unknown() }),
      ...defaultErrors,
    },
  }),

  vendedores: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.object({ id: z.string().uuid(), nome: z.string(), email: z.string(), equipe: z.unknown().nullable() })) }),
      ...defaultErrors,
    },
  }),

  storage: routeDoc({
    response: { 200: z.object({ success: z.literal(true), data: z.unknown() }), ...defaultErrors },
  }),

  storageHistory: routeDoc({
    querystring: z.object({ days: z.coerce.number().optional() }),
    response: { 200: z.object({ success: z.literal(true), data: z.unknown() }), ...defaultErrors },
  }),

  storageCosts: routeDoc({
    response: { 200: z.object({ success: z.literal(true), data: z.unknown() }), ...defaultErrors },
  }),

  comissaoPorTipoSeguro: routeDoc({
    querystring: z.object({ vendedorId: z.string().uuid().optional(), equipeId: z.string().uuid().optional(), dataInicio: z.string().optional(), dataFim: z.string().optional() }),
    response: { 200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }), ...defaultErrors },
  }),

  papelVendedor: routeDoc({
    querystring: z.object({ vendedorId: z.string().uuid().optional(), dataInicio: z.string().optional(), dataFim: z.string().optional() }),
    response: { 200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }), ...defaultErrors },
  }),
};

export const kpisDocs = {
  principal: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          taxaConversao: z.object({ valor: z.number(), total: z.number(), ganhas: z.number(), emAndamento: z.number() }),
          valorMedioPremio: z.object({ valor: z.number(), totalVendas: z.number(), totalPremio: z.number() }),
          taxaRenovacao: z.object({ valor: z.number(), total: z.number(), concluidas: z.number(), periodo: z.string() }),
        }),
      }),
      ...defaultErrors,
    },
  }),

  kanban: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          premioMedio: z.object({ valor: z.number(), count: z.number(), total: z.number() }),
          clientesUrgencia: z.object({ count: z.number(), total: z.number() }),
          leadsFrios: z.object({ count: z.number(), total: z.number() }),
        }),
      }),
      ...defaultErrors,
    },
  }),
};
