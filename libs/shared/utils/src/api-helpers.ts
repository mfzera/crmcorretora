/**
 * API Response Helpers
 *
 * Utility functions to create standardized API responses.
 * These should be used by all API endpoints to ensure consistency.
 */

import type {
  ApiResponse,
  PaginatedResponse,
  PaginationMetadata,
} from '@ecotech/shared/types';

/**
 * Create a successful API response
 */
export function success<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Create a successful paginated API response
 */
export function successPaginated<T>(
  data: T[],
  metadata: PaginationMetadata,
  message?: string,
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    metadata,
    ...(message && { message }),
  };
}

/**
 * Create an error API response
 * Note: In practice, errors should be thrown and handled by error middleware
 */
export function error(
  code: string,
  message: string,
  details?: unknown,
): ApiResponse<never> {
  return {
    success: false,
    data: null as never,
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Helper to create pagination metadata from count and params
 */
export function createPaginationMetadata(
  total: number,
  page: number,
  limit: number,
): PaginationMetadata {
  return {
    total,
    pagina: page,
    porPagina: limit,
    totalPaginas: Math.ceil(total / limit),
  };
}
