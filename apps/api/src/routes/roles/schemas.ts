import { z } from 'zod';

export const createCargoSchema = z.object({
  nomeCargo: z.string().min(2).max(100),
  descricao: z.string().max(500).optional(),
  cor: z.string().optional(),
  isGestor: z.boolean().default(false),
  isVendedor: z.boolean().default(false),
});

export const updateCargoSchema = z.object({
  nomeCargo: z.string().min(2).max(100).optional(),
  descricao: z.string().max(500).optional().nullable(),
  cor: z.string().optional(),
  isGestor: z.boolean().optional(),
  isVendedor: z.boolean().optional(),
});

console.log(
  '🎨 Schema updateCargoSchema carregado com keys:',
  Object.keys(updateCargoSchema.shape),
);

export const atribuirPermissoesSchema = z.object({
  permissaoIds: z.array(z.string().uuid()),
});

export type CreateCargoInput = z.infer<typeof createCargoSchema>;
export type UpdateCargoInput = z.infer<typeof updateCargoSchema>;
export type AtribuirPermissoesInput = z.infer<typeof atribuirPermissoesSchema>;
