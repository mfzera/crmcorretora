/**
 * Standardized API response wrapper
 *
 * All API endpoints should return responses in this format to ensure
 * consistency between frontend and backend.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: ApiErrorDetails;
}

export interface ApiErrorDetails {
  code: string;
  message: string;
  details?: unknown;
  field?: string;
}

export interface PaginationMetadata {
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  metadata: PaginationMetadata;
  message?: string;
}

/**
 * Helper type for API endpoints that return a single item
 */
export type SingleItemResponse<T> = ApiResponse<T>;

/**
 * Helper type for API endpoints that return a list with pagination
 */
export type ListResponse<T> = PaginatedResponse<T>;

/**
 * Helper function to create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Helper function to create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  metadata: PaginationMetadata,
  message?: string,
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    metadata,
    message,
  };
}

/**
 * Helper function to create an error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  field?: string,
): ApiResponse<never> {
  return {
    success: false,
    data: null as never,
    error: {
      code,
      message,
      details,
      field,
    },
  };
}
