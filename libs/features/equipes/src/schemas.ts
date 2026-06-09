import { z } from 'zod';

export const createEquipeSchema = z.object({
  nome: z.string().min(2).max(256),
  gestorId: z.string().uuid().optional().nullable(),
});

export const updateEquipeSchema = z.object({
  nome: z.string().min(2).max(256).optional(),
  gestorId: z.string().uuid().optional().nullable(),
  ativo: z.boolean().optional(),
});

export const listEquipesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  ativo: z.enum(['true', 'false']).optional(),
});

export const atribuirLiderSchema = z.object({
  gestorId: z.string().uuid().nullable(),
});

export const adicionarMembroSchema = z.object({
  usuarioId: z.string().uuid(),
});

export type CreateEquipeInput = z.infer<typeof createEquipeSchema>;
export type UpdateEquipeInput = z.infer<typeof updateEquipeSchema>;
export type ListEquipesQuery = z.infer<typeof listEquipesQuerySchema>;
export type AtribuirLiderInput = z.infer<typeof atribuirLiderSchema>;
export type AdicionarMembroInput = z.infer<typeof adicionarMembroSchema>;
