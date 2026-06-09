import { z } from 'zod';

export const uuidParam = z.object({
  id: z.string().uuid().describe('ID único do recurso (UUID v4)'),
});

export const paginationQuery = z.object({
  page: z.coerce.number().min(1).default(1).describe('Página (começa em 1)'),
  limit: z.coerce.number().min(1).max(100).optional().describe('Itens por página (padrão: 20)'),
});

export const metaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

// Resposta paginada genérica — estrutura real de createPaginatedResult
export function paginatedResponse<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: metaSchema,
  });
}
