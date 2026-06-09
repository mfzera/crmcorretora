import { z } from 'zod';
import { routeDoc, defaultErrors, defaultErrorsWithNotFound, uuidParam } from '../index.js';

const clientePortal = z.object({ id: z.string().uuid(), nome: z.string().nullable(), tipoPessoa: z.enum(['PF', 'PJ']) });

const apoliceResumo = z.object({
  id: z.string().uuid(),
  numeroDocumento: z.string(),
  numeroApoliceExterna: z.string().nullable(),
  status: z.string(),
  vigenciaInicio: z.string(),
  vigenciaFim: z.string(),
  coberturas: z.unknown().nullable(),
  valorSegurado: z.string().nullable(),
  diasParaVencer: z.number(),
  produto: z.object({ id: z.string().uuid(), nomeProduto: z.string(), tipoSeguro: z.string() }),
  seguradora: z.object({
    id: z.string().uuid(), razaoSocial: z.string(), nomeFantasia: z.string().nullable(),
    telefone: z.string().nullable(), email: z.string().nullable(),
    telefone24h: z.string().nullable(), whatsapp24h: z.string().nullable(), horarioAtendimento24h: z.string().nullable(),
  }),
});

export const portalSeguradoDocs = {
  login: routeDoc({
    body: z.object({
      subdominio: z.string().describe('Subdomínio da corretora'),
      documento: z.string().describe('CPF (11 dígitos) ou CNPJ (14 dígitos)'),
      dataNascimento: z.string().describe('Formato YYYY-MM-DD'),
    }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          token: z.string(),
          cliente: clientePortal,
          corretora: z.object({ nomeFantasia: z.string() }),
        }),
      }),
      401: z.object({ success: z.literal(false), error: z.object({ code: z.string(), message: z.string() }) }),
    },
  }),

  logout: routeDoc({
    response: { 200: z.object({ success: z.literal(true) }), ...defaultErrors },
  }),

  me: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          clienteId: z.string().uuid(),
          nome: z.string().nullable(),
          tipoPessoa: z.enum(['PF', 'PJ']),
          corretoraId: z.string().uuid(),
        }),
      }),
      ...defaultErrors,
    },
  }),

  listarApolices: routeDoc({
    response: {
      200: z.object({ success: z.literal(true), data: z.array(apoliceResumo) }),
      ...defaultErrors,
    },
  }),

  vencimentosApolices: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          vencidas: z.array(z.unknown()),
          em30dias: z.array(z.unknown()),
          em60dias: z.array(z.unknown()),
          em90dias: z.array(z.unknown()),
        }),
      }),
      ...defaultErrors,
    },
  }),

  buscarApolice: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: apoliceResumo }),
      ...defaultErrorsWithNotFound,
    },
  }),

  listarProdutos: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.object({
          id: z.string().uuid(), nomeProduto: z.string(), descricao: z.string().nullable(), tipoSeguro: z.string(),
          premioMinimo: z.string().nullable(),
          seguradora: z.object({ nomeFantasia: z.string().nullable(), razaoSocial: z.string().nullable() }),
        })),
      }),
      ...defaultErrors,
    },
  }),

  perfil: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          id: z.string().uuid(),
          tipoPessoa: z.enum(['PF', 'PJ']),
          nome: z.string().nullable(),
          cpf: z.string().nullable(),
          dataNascimento: z.string().nullable(),
          razaoSocial: z.string().nullable(),
          nomeFantasia: z.string().nullable(),
          cnpj: z.string().nullable(),
          email: z.string().nullable(),
          telefone: z.string().nullable(),
          celular: z.string().nullable(),
        }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizarPerfil: routeDoc({
    body: z.object({ email: z.string().email().optional(), telefone: z.string().optional(), celular: z.string().optional() }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({ id: z.string().uuid(), email: z.string().nullable(), telefone: z.string().nullable(), celular: z.string().nullable() }),
      }),
      ...defaultErrors,
    },
  }),

  listarDocumentos: routeDoc({
    params: z.object({ apoliceId: z.string().uuid() }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.object({
          id: z.string().uuid(), nome: z.string(), tipo: z.string(), mimeType: z.string(), tamanhoBytes: z.number(), createdAt: z.string(),
        })),
      }),
      ...defaultErrors,
    },
  }),

  downloadDocumento: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: z.object({ url: z.string(), nome: z.string(), mimeType: z.string() }) }),
      ...defaultErrorsWithNotFound,
    },
  }),

  solicitarCotacao: routeDoc({
    body: z.object({ produtoId: z.string().uuid().optional(), mensagem: z.string().optional() }),
    response: {
      201: z.object({ success: z.literal(true), data: z.object({ id: z.string().uuid() }), message: z.string() }),
      ...defaultErrors,
    },
  }),
};
