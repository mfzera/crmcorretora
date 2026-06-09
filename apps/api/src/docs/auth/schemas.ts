import { z } from 'zod';
import {
  registerSeguradoraSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from '@ecotech/features/auth';
import { routeDoc, defaultErrors, r401 } from '../index.js';

const corretoraBasica = z.object({
  id: z.string().uuid(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable(),
  logoUrl: z.string().nullable(),
  subdominio: z.string(),
  status: z.string(),
  cargo: z.object({
    id: z.string().uuid(),
    nome: z.string(),
    isAdmin: z.boolean(),
    isGestor: z.boolean(),
    isVendedor: z.boolean(),
  }).nullable(),
  ativa: z.boolean(),
});

const msgSuccess = z.object({ success: z.literal(true), message: z.string() });

export const authDocs = {
  registerCorretora: routeDoc({
    body: registerSeguradoraSchema,
    response: {
      201: z.object({
        success: z.literal(true),
        data: z.object({
          corretora: z.object({
            id: z.string().uuid(),
            razaoSocial: z.string(),
            subdominio: z.string(),
            status: z.string(),
            dataFimTrial: z.string().nullable(),
          }),
          usuario: z.object({ id: z.string().uuid(), nome: z.string(), email: z.string() }),
          accessUrl: z.string(),
        }),
      }),
      ...defaultErrors,
      409: z.object({ success: z.literal(false), error: z.object({ code: z.string(), message: z.string() }) }),
    },
  }),

  login: routeDoc({
    body: loginSchema.extend({ recaptchaToken: z.string().optional() }),
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          token: z.string(),
          refreshToken: z.string(),
          usuario: z.object({
            id: z.string().uuid(),
            nome: z.string(),
            email: z.string(),
            avatarUrl: z.string().nullable(),
            primeiroAcesso: z.boolean(),
          }),
          permissoes: z.array(z.string()),
          corretora: z.object({
            id: z.string().uuid(),
            nomeFantasia: z.string().nullable(),
            razaoSocial: z.string(),
            subdominio: z.string(),
          }),
          corretoras: z.array(corretoraBasica),
        }),
      }),
      ...defaultErrors,
    },
  }),

  refresh: routeDoc({
    body: refreshTokenSchema,
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          token: z.string(),
          refreshToken: z.string(),
          permissoes: z.array(z.string()),
        }),
      }),
      ...defaultErrors,
    },
  }),

  me: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.object({
          usuario: z.object({
            id: z.string().uuid(),
            nome: z.string(),
            email: z.string(),
            telefone: z.string().nullable(),
            avatarUrl: z.string().nullable(),
            primeiroAcesso: z.boolean(),
            cargo: z.object({ id: z.string().uuid(), nome: z.string() }).nullable(),
            equipe: z.object({ id: z.string().uuid(), nome: z.string() }).nullable(),
          }),
          permissoes: z.array(z.string()),
          corretora: z.object({
            id: z.string().uuid(),
            nomeFantasia: z.string().nullable(),
            razaoSocial: z.string(),
            logoUrl: z.string().nullable(),
            subdominio: z.string(),
          }),
        }),
      }),
      401: r401,
    },
  }),

  changePassword: routeDoc({
    body: changePasswordSchema,
    response: { 200: msgSuccess, ...defaultErrors },
  }),

  logout: routeDoc({
    response: { 200: msgSuccess, ...defaultErrors },
  }),

  requestPasswordReset: routeDoc({
    body: resetPasswordRequestSchema,
    response: { 200: msgSuccess, ...defaultErrors },
  }),

  resetPassword: routeDoc({
    body: resetPasswordSchema,
    response: { 200: msgSuccess, ...defaultErrors },
  }),
};
