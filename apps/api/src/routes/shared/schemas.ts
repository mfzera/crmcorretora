import { z } from 'zod';

/**
 * Shared response schemas for consistent API documentation
 */

// Pagination metadata
export const paginationMetaSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

// Generic paginated response wrapper
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });

// Generic success response
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// Generic data response
export const createDataResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
  });

// Error response schemas
export const errorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
});

export const validationErrorResponseSchema = z.object({
  statusCode: z.literal(400),
  error: z.literal('Bad Request'),
  message: z.string(),
  validation: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
    })
  ).optional(),
});

export const unauthorizedErrorResponseSchema = z.object({
  statusCode: z.literal(401),
  error: z.literal('Unauthorized'),
  message: z.string(),
});

export const forbiddenErrorResponseSchema = z.object({
  statusCode: z.literal(403),
  error: z.literal('Forbidden'),
  message: z.string(),
});

export const notFoundErrorResponseSchema = z.object({
  statusCode: z.literal(404),
  error: z.literal('Not Found'),
  message: z.string(),
});

export const conflictErrorResponseSchema = z.object({
  statusCode: z.literal(409),
  error: z.literal('Conflict'),
  message: z.string(),
});

export const internalErrorResponseSchema = z.object({
  statusCode: z.literal(500),
  error: z.literal('Internal Server Error'),
  message: z.string(),
});

// Standard error responses for OpenAPI documentation
export const standardErrorResponses = {
  400: {
    description: 'Erro de validação ou requisição inválida',
    content: {
      'application/json': {
        schema: validationErrorResponseSchema,
      },
    },
  },
  401: {
    description: 'Não autenticado - Token JWT ausente ou inválido',
    content: {
      'application/json': {
        schema: unauthorizedErrorResponseSchema,
      },
    },
  },
  403: {
    description: 'Sem permissão - Token válido mas sem as permissões necessárias',
    content: {
      'application/json': {
        schema: forbiddenErrorResponseSchema,
      },
    },
  },
  404: {
    description: 'Recurso não encontrado',
    content: {
      'application/json': {
        schema: notFoundErrorResponseSchema,
      },
    },
  },
  409: {
    description: 'Conflito - Recurso já existe ou operação não permitida',
    content: {
      'application/json': {
        schema: conflictErrorResponseSchema,
      },
    },
  },
  500: {
    description: 'Erro interno do servidor',
    content: {
      'application/json': {
        schema: internalErrorResponseSchema,
      },
    },
  },
};

// Common query parameters
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchQuerySchema = z.object({
  search: z.string().min(1).max(100).optional(),
});

export const dateRangeQuerySchema = z.object({
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
});

// Common parameter schemas
export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

// ID response schema (for create operations)
export const idResponseSchema = z.object({
  id: z.string().uuid(),
});

// Bulk operation response
export const bulkOperationResponseSchema = z.object({
  success: z.number().int().min(0),
  failed: z.number().int().min(0),
  total: z.number().int().min(0),
  errors: z.array(
    z.object({
      id: z.string(),
      error: z.string(),
    })
  ).optional(),
});

// Types for TypeScript
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type ValidationErrorResponse = z.infer<typeof validationErrorResponseSchema>;
export type UnauthorizedErrorResponse = z.infer<typeof unauthorizedErrorResponseSchema>;
export type ForbiddenErrorResponse = z.infer<typeof forbiddenErrorResponseSchema>;
export type NotFoundErrorResponse = z.infer<typeof notFoundErrorResponseSchema>;
export type ConflictErrorResponse = z.infer<typeof conflictErrorResponseSchema>;
export type InternalErrorResponse = z.infer<typeof internalErrorResponseSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
export type IdResponse = z.infer<typeof idResponseSchema>;
export type BulkOperationResponse = z.infer<typeof bulkOperationResponseSchema>;
