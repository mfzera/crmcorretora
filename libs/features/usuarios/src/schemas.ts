import { z } from 'zod';

export const createUsuarioSchema = z.object({
  nome: z.string().min(2).max(256),
  email: z.string().email(),
  senha: z.string().min(8),
  telefone: z.string().max(20).optional(),
  cargoId: z.string().uuid().optional(),
  equipeId: z.string().uuid().optional(),
  gestorId: z.string().uuid().optional(),
});

export const updateUsuarioSchema = z.object({
  nome: z.string().min(2).max(256).optional(),
  email: z.string().email().optional(),
  telefone: z.string().max(20).optional().nullable(),
  cargoId: z.string().uuid().optional().nullable(),
  equipeId: z.string().uuid().optional().nullable(),
  gestorId: z.string().uuid().optional().nullable(),
  ativo: z.boolean().optional(),
});

export const listUsuariosQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  cargoId: z.string().uuid().optional(),
  equipeId: z.string().uuid().optional(),
  ativo: z.enum(['true', 'false']).optional(),
  select: z.coerce.boolean().optional().default(false),
});

export const atribuirCargoSchema = z.object({
  cargoId: z.string().uuid(),
});

export const resetarSenhaSchema = z.object({
  novaSenha: z.string().min(8),
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;
export type ListUsuariosQuery = z.infer<typeof listUsuariosQuerySchema>;
export type AtribuirCargoInput = z.infer<typeof atribuirCargoSchema>;
export type ResetarSenhaInput = z.infer<typeof resetarSenhaSchema>;
