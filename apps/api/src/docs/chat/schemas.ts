import { z } from 'zod';
import { routeDoc, defaultErrors, defaultErrorsWithNotFound, uuidParam } from '../index.js';

const msgSuccess = z.object({ message: z.string() });

export const chatDocs = {
  wsTicket: routeDoc({
    response: {
      200: z.object({ ticket: z.string(), expiresIn: z.number() }),
      ...defaultErrors,
    },
  }),

  listarCanais: routeDoc({
    response: {
      200: z.object({
        canais: z.array(z.object({
          id: z.string().uuid(), tipo: z.string(), nome: z.string().nullable(), descricao: z.string().nullable(),
          ativo: z.boolean(), ultimaMensagem: z.unknown().nullable(), naoLidas: z.number(), outroUsuario: z.unknown().nullable(),
        })),
      }),
      ...defaultErrors,
    },
  }),

  criarCanal: routeDoc({
    body: z.object({ nome: z.string().min(1), descricao: z.string().optional(), membrosIds: z.array(z.string().uuid()) }),
    response: { 201: z.object({ canal: z.unknown() }), ...defaultErrors },
  }),

  criarCanalDireto: routeDoc({
    body: z.object({ usuarioDestinoId: z.string().uuid() }),
    response: { 201: z.object({ canal: z.unknown(), created: z.boolean() }), ...defaultErrors },
  }),

  listarMensagens: routeDoc({
    params: z.object({ canalId: z.string().uuid() }),
    querystring: z.object({ limit: z.coerce.number().optional(), offset: z.coerce.number().optional() }),
    response: { 200: z.object({ mensagens: z.array(z.unknown()) }), ...defaultErrorsWithNotFound },
  }),

  adicionarMembro: routeDoc({
    params: z.object({ canalId: z.string().uuid() }),
    body: z.object({ usuarioId: z.string().uuid() }),
    response: { 201: msgSuccess, ...defaultErrors },
  }),

  listarMembros: routeDoc({
    params: z.object({ canalId: z.string().uuid() }),
    response: { 200: z.object({ membros: z.array(z.unknown()) }), ...defaultErrorsWithNotFound },
  }),

  adicionarMembrosBulk: routeDoc({
    params: z.object({ canalId: z.string().uuid() }),
    body: z.object({ usuarioIds: z.array(z.string().uuid()) }),
    response: { 201: msgSuccess, ...defaultErrors },
  }),

  removerMembro: routeDoc({
    params: z.object({ canalId: z.string().uuid(), membroId: z.string().uuid() }),
    response: { 200: msgSuccess, ...defaultErrors },
  }),

  sairCanal: routeDoc({
    params: z.object({ canalId: z.string().uuid() }),
    response: { 200: msgSuccess, ...defaultErrors },
  }),

  configurarCanal: routeDoc({
    params: z.object({ canalId: z.string().uuid() }),
    body: z.object({ nome: z.string().optional(), descricao: z.string().optional() }),
    response: { 200: msgSuccess, ...defaultErrors },
  }),

  buscarUsuarios: routeDoc({
    params: z.object({ canalId: z.string().uuid() }),
    querystring: z.object({ q: z.string().optional() }),
    response: {
      200: z.object({ success: z.literal(true), data: z.array(z.object({ id: z.string().uuid(), nome: z.string(), email: z.string(), avatarUrl: z.string().nullable() })) }),
      ...defaultErrors,
    },
  }),

  marcarLido: routeDoc({
    params: z.object({ canalId: z.string().uuid() }),
    body: z.object({ mensagemId: z.string().uuid() }),
    response: { 200: z.object({ success: z.literal(true) }), ...defaultErrors },
  }),

  perfilUsuario: routeDoc({
    params: z.object({ usuarioId: z.string().uuid() }),
    response: { 200: z.object({ usuario: z.unknown() }), ...defaultErrorsWithNotFound },
  }),
};
