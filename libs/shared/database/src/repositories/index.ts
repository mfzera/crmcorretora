/**
 * Repository Index
 *
 * Central export point for all repositories.
 */

// Base repository
export * from './base-repository.js';

// Concrete repositories
export * from './renovacao.repository.js';
export * from './documento-venda.repository.js';
export * from './cotacao.repository.js';

// Re-export database connection type for convenience
export type { Database } from '../connection.js';
