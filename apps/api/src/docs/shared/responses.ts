import { z } from 'zod';

// Shape exato do error-handler plugin
const errorDetail = z.object({
  field: z.string(),
  message: z.string(),
});

export const errorBody = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.union([z.array(errorDetail), z.record(z.string(), z.unknown())]).optional(),
  }),
});

// Respostas de erro por status code
export const r400 = errorBody; // ValidationError / dados inválidos
export const r401 = errorBody; // UnauthorizedError / token inválido
export const r403 = errorBody; // ForbiddenError / OwnershipError
export const r404 = errorBody; // NotFoundError
export const r409 = errorBody; // ConflictError
export const r422 = errorBody; // UnprocessableEntityError
export const r429 = errorBody; // QuotaExceededError
export const r500 = errorBody; // erro interno

// Resposta de sucesso genérica sem payload (204-like via 200)
export const emptySuccess = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

// Helper para montar o bloco response com os erros padrão
export const defaultErrors = {
  400: r400,
  401: r401,
  403: r403,
  500: r500,
} as const;

export const defaultErrorsWithNotFound = {
  ...defaultErrors,
  404: r404,
} as const;
