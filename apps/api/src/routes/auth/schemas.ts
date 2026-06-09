import { z } from 'zod';

export const registerSeguradoraSchema = z.object({
  planoId: z.string().uuid(),
  razaoSocial: z.string().min(3).max(256),
  cnpj: z.string().length(14).regex(/^\d+$/, 'CNPJ deve conter apenas números'),
  subdominio: z
    .string()
    .min(3)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      'Subdomínio deve conter apenas letras minúsculas, números e hífens'
    ),
  emailDono: z.string().email(),
  senhaDono: z.string().min(8),
  nomeDono: z.string().min(2).max(256),
  nomeFantasia: z.string().max(256).optional(),
  telefone: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const changePasswordSchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z.string().min(8),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export type RegisterSeguradoraInput = z.infer<typeof registerSeguradoraSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
