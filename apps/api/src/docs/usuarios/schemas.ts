import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';
import { usuarios } from '@ecotech/shared/database';
import {
  createUsuarioSchema,
  updateUsuarioSchema,
  listUsuariosQuerySchema,
  atribuirCargoSchema,
  resetarSenhaSchema,
} from '@ecotech/features/usuarios';
import {
  routeDoc,
  defaultErrors,
  defaultErrorsWithNotFound,
  uuidParam,
  metaSchema,
} from '../index.js';
import { wireDate } from '../wire.js';

/**
 * Base de usuário derivada da tabela. ⚠ Sempre omitir `passwordHash`
 * (segurança) e `avatarR2Key` (interno). Demais campos vêm do DB.
 */
const usuarioSelect = createSelectSchema(usuarios).omit({
  passwordHash: true,
  avatarR2Key: true,
});

const usuarioBase = usuarioSelect.extend({
  ultimoLogin: wireDate.nullable(),
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
  deletedAt: wireDate.nullable(),
  anonimizadoEm: wireDate.nullable(),
});

const usuarioDetalhado = usuarioBase.extend({
  cargo: z
    .object({
      id: z.string().uuid(),
      nome: z.string(),
      cor: z.string().nullable(),
    })
    .nullable(),
  equipe: z.object({ id: z.string().uuid(), nome: z.string() }).nullable(),
  gestor: z.object({ id: z.string().uuid(), nome: z.string() }).nullable(),
});

// Schema preciso para GET /:id — inclui apenas os campos retornados pelo handler
const usuarioBuscarData = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  email: z.string().nullable(),
  telefone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  ativo: z.boolean(),
  primeiroAcesso: z.boolean(),
  ultimoLogin: wireDate.nullable(),
  cargo: z.object({ id: z.string().uuid(), nome: z.string() }).nullable(),
  equipe: z.object({ id: z.string().uuid(), nome: z.string() }).nullable(),
  gestor: z.object({ id: z.string().uuid(), nome: z.string() }).nullable(),
  createdAt: wireDate.nullable(),
  updatedAt: wireDate.nullable(),
});

// Schema preciso para PATCH /:id — inclui apenas os campos retornados pelo handler
const usuarioAtualizarData = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  email: z.string().nullable(),
  telefone: z.string().nullable(),
  cargoId: z.string().uuid().nullable(),
  equipeId: z.string().uuid().nullable(),
  ativo: z.boolean(),
  updatedAt: wireDate.nullable(),
});

const msgSuccess = z.object({ success: z.literal(true), message: z.string() });

export const usuariosDocs = {
  criar: routeDoc({
    body: createUsuarioSchema,
    response: {
      201: z.object({ success: z.literal(true), data: usuarioBase }),
      ...defaultErrors,
      409: z.object({
        success: z.literal(false),
        error: z.object({ code: z.string(), message: z.string() }),
      }),
    },
  }),

  listar: routeDoc({
    querystring: listUsuariosQuerySchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(z.unknown()),
        meta: metaSchema.optional(),
      }),
      ...defaultErrors,
    },
  }),

  listarVendedores: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.array(
          z.object({
            id: z.string().uuid(),
            nome: z.string(),
            email: z.string(),
          }),
        ),
      }),
      ...defaultErrors,
    },
  }),

  buscar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({ success: z.literal(true), data: usuarioBuscarData }),
      ...defaultErrorsWithNotFound,
    },
  }),

  perfilPublico: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          id: z.string().uuid(),
          nome: z.string(),
          avatarUrl: z.string().nullable(),
          cargo: z.unknown().nullable(),
          equipe: z.unknown().nullable(),
          badges: z.array(z.unknown()),
          membroDesde: wireDate,
        }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  atualizar: routeDoc({
    params: uuidParam,
    body: updateUsuarioSchema,
    response: {
      200: z.object({ success: z.literal(true), data: usuarioAtualizarData }),
      ...defaultErrorsWithNotFound,
    },
  }),

  excluir: routeDoc({
    params: uuidParam,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  atribuirCargo: routeDoc({
    params: uuidParam,
    body: atribuirCargoSchema,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  resetarSenha: routeDoc({
    params: uuidParam,
    body: resetarSenhaSchema,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),

  uploadAvatar: routeDoc({
    params: uuidParam,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          id: z.string().uuid(),
          avatarUrl: z.string(),
        }),
      }),
      ...defaultErrorsWithNotFound,
    },
  }),

  excluirAvatar: routeDoc({
    params: uuidParam,
    response: { 200: msgSuccess, ...defaultErrorsWithNotFound },
  }),
};
