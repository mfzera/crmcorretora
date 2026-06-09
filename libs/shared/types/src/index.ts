/**
 * @ecotech/shared/types
 *
 * Shared TypeScript types for the entire monorepo.
 * This package provides a single source of truth for types used by both
 * frontend and backend applications.
 */

// API Response types
export * from './api-response.js';

// Entity types (manually defined to avoid circular dependency)
export * from './entities.js';

// DTOs (Data Transfer Objects)
export * from './dtos.js';

// Fastify types (JWT Payload, etc.)
export type { JWTPayload } from './fastify.js';

// Permission constants — source of truth for backend routes and frontend hooks
export * from './permissions.js';

// NOTE: If you need database entity types, import directly from @ecotech/shared/database
// This package only exports API-level types to avoid circular dependencies
