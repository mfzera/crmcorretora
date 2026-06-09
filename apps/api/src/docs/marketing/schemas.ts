import { z } from 'zod';
import { routeDoc, defaultErrors, uuidParam } from '../index.js';

export const marketingDocs = {
  listarSeguradorasSuporte: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.object({
          id: z.string().uuid(), razaoSocial: z.string(), nomeFantasia: z.string().nullable(),
          telefone: z.string().nullable(), email: z.string().nullable(),
          telefone24h: z.string().nullable(), whatsapp24h: z.string().nullable(), horarioAtendimento24h: z.string().nullable(),
        })),
      }),
      ...defaultErrors,
    },
  }),

  atualizarSeguradoraSuporte: routeDoc({
    params: uuidParam,
    body: z.object({ telefone24h: z.string().optional(), whatsapp24h: z.string().optional(), horarioAtendimento24h: z.string().optional() }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ id: z.string().uuid(), telefone24h: z.string().nullable(), whatsapp24h: z.string().nullable(), horarioAtendimento24h: z.string().nullable() }),
      }),
      ...defaultErrors,
    },
  }),

  listarVendedores: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.object({ id: z.string().uuid(), nome: z.string(), email: z.string() })) }),
      ...defaultErrors,
    },
  }),

  listarProdutosRouting: routeDoc({
    response: { 200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }), ...defaultErrors },
  }),

  atualizarProdutoRouting: routeDoc({
    params: uuidParam,
    body: z.object({ vendedorPortalId: z.string().uuid().optional() }),
    response: { 200: z.object({ success: z.literal(true) }), ...defaultErrors },
  }),

  listarCotacoes: routeDoc({
    querystring: z.object({ status: z.string().optional() }),
    response: { 200: z.object({ success: z.literal(true), data: z.array(z.unknown()) }), ...defaultErrors },
  }),

  atualizarCotacao: routeDoc({
    params: uuidParam,
    body: z.object({ status: z.string().optional(), vendedorId: z.string().uuid().optional() }),
    response: { 200: z.object({ success: z.literal(true) }), ...defaultErrors },
  }),
};
