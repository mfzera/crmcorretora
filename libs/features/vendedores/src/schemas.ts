import { z } from 'zod';

export const createVendedorSchema = z.object({
  nome: z.string().min(2).max(256),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().max(20).optional().or(z.literal('')),
  tipo: z.enum(['principal', 'secundario', 'externo']).default('principal'),
  observacoes: z.string().optional(),
});

export const updateVendedorSchema = z.object({
  nome: z.string().min(2).max(256).optional(),
  email: z.string().email().optional().nullable(),
  telefone: z.string().max(20).optional().nullable(),
  tipo: z.enum(['principal', 'secundario', 'externo']).optional(),
  observacoes: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

export const listVendedoresQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  tipo: z.enum(['principal', 'secundario', 'externo']).optional(),
  ativo: z.enum(['true', 'false']).optional(),
  select: z.coerce.boolean().optional().default(false),
});

export type CreateVendedorInput = z.infer<typeof createVendedorSchema>;
export type UpdateVendedorInput = z.infer<typeof updateVendedorSchema>;
export type ListVendedoresQuery = z.infer<typeof listVendedoresQuerySchema>;
