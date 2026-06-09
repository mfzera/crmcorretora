/**
 * Base Repository Interface
 *
 * Defines the contract for all repositories in the application.
 * Provides common CRUD operations with tenant isolation built-in.
 */

/**
 * Pagination metadata
 * NOTE: Defined here to avoid circular dependency with @ecotech/shared/types
 */
export interface PaginationMetadata {
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

/**
 * Base query filters that all repositories support
 */
export interface BaseQueryFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result of a paginated query
 */
export interface PaginatedResult<T> {
  data: T[];
  metadata: PaginationMetadata;
}

/**
 * Base repository interface with common operations
 *
 * All repositories should extend this interface to ensure consistency.
 * The tenantId parameter is required for all operations to enforce multi-tenancy.
 */
export interface IRepository<TEntity, TInsert = Partial<TEntity>> {
  /**
   * Find a single entity by ID
   * @param id - Entity ID
   * @param tenantId - Tenant ID for isolation
   * @returns Entity or null if not found
   */
  findById(id: string, tenantId: string): Promise<TEntity | null>;

  /**
   * Find multiple entities with optional filters and pagination
   * @param filters - Query filters
   * @param tenantId - Tenant ID for isolation
   * @returns Paginated result
   */
  findMany(
    filters: BaseQueryFilters,
    tenantId: string,
  ): Promise<PaginatedResult<TEntity>>;

  /**
   * Create a new entity
   * @param data - Entity data
   * @param tenantId - Tenant ID for isolation
   * @returns Created entity
   */
  create(data: TInsert, tenantId: string): Promise<TEntity>;

  /**
   * Update an existing entity
   * @param id - Entity ID
   * @param data - Partial entity data to update
   * @param tenantId - Tenant ID for isolation
   * @returns Updated entity
   */
  update(
    id: string,
    data: Partial<TEntity>,
    tenantId: string,
  ): Promise<TEntity>;

  /**
   * Soft delete an entity (if supported) or hard delete
   * @param id - Entity ID
   * @param tenantId - Tenant ID for isolation
   */
  delete(id: string, tenantId: string): Promise<void>;

  /**
   * Count total entities matching filters
   * @param tenantId - Tenant ID for isolation
   * @returns Total count
   */
  count(tenantId: string): Promise<number>;
}

/**
 * Base repository class with common utility methods
 *
 * Concrete repositories can extend this class to reuse pagination logic.
 */
export abstract class BaseRepository {
  /**
   * Calculate pagination offset from page and limit
   */
  protected calculateOffset(page: number, limit?: number): number {
    if (!limit) return 0;
    return (page - 1) * limit;
  }

  /**
   * Create pagination metadata from count and params
   */
  protected createPaginationMetadata(
    total: number,
    page: number,
    limit?: number,
  ): PaginationMetadata {
    const effectiveLimit = limit || total || 1;
    return {
      total,
      pagina: page,
      porPagina: effectiveLimit,
      totalPaginas: limit ? Math.ceil(total / limit) : 1,
    };
  }

  /**
   * Create a paginated result object
   */
  protected createPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit?: number,
  ): PaginatedResult<T> {
    return {
      data,
      metadata: this.createPaginationMetadata(total, page, limit),
    };
  }
}
