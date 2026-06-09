import type { JWTPayload } from '@ecotech/shared/types';
import { SQL, and, eq, or } from 'drizzle-orm';

/**
 * Apply hierarchy filter to queries based on user role
 *
 * - Admin: sees all data from the corretora
 * - Gestor: sees their team's data (users where gestorId = user.sub) + their own data
 * - Vendedor: sees only their own data
 *
 * @param user - JWT payload with user info
 * @param table - Drizzle table reference
 * @returns SQL condition to be used in where clause
 */
export function applyHierarchyFilter(
  user: JWTPayload,
  table: {
    corretoraId: any;
    usuarioId?: any;
    gestorId?: any;
  }
): SQL {
  // Admin vê tudo da corretora
  if (user.isAdmin) {
    return eq(table.corretoraId, user.corretoraId);
  }

  // Gestor vê sua equipe + seus dados
  if (user.isGestor) {
    if (table.gestorId && table.usuarioId) {
      // Tabela tem gestorId: mostra dados da equipe + próprios
      return and(
        eq(table.corretoraId, user.corretoraId),
        or(
          eq(table.gestorId, user.sub),
          eq(table.usuarioId, user.sub)
        )
      )!;
    } else if (table.usuarioId) {
      // Tabela não tem gestorId: mostra apenas próprios dados
      // (para gestores, isso pode ser expandido para incluir equipe se necessário)
      return and(
        eq(table.corretoraId, user.corretoraId),
        eq(table.usuarioId, user.sub)
      )!;
    }

    // Fallback: apenas corretora
    return eq(table.corretoraId, user.corretoraId);
  }

  // Vendedor vê apenas seus dados
  if (table.usuarioId) {
    return and(
      eq(table.corretoraId, user.corretoraId),
      eq(table.usuarioId, user.sub)
    )!;
  }

  // Fallback: apenas corretora
  return eq(table.corretoraId, user.corretoraId);
}

/**
 * Helper to build WHERE clause for queries with hierarchy
 *
 * Usage:
 * ```ts
 * const cotacoes = await db.query.cotacoes.findMany({
 *   where: buildHierarchyWhere(user, cotacoes)
 * });
 * ```
 */
export function buildHierarchyWhere<T extends Record<string, any>>(
  user: JWTPayload,
  table: T
) {
  return (table: any, { eq, and, or }: any) => {
    // Admin vê tudo da corretora
    if (user.isAdmin) {
      return eq(table.corretoraId, user.corretoraId);
    }

    // Gestor vê sua equipe + seus dados
    if (user.isGestor) {
      if ('gestorId' in table && 'usuarioId' in table) {
        return and(
          eq(table.corretoraId, user.corretoraId),
          or(
            eq(table.gestorId, user.sub),
            eq(table.usuarioId, user.sub)
          )
        );
      } else if ('usuarioId' in table) {
        return and(
          eq(table.corretoraId, user.corretoraId),
          eq(table.usuarioId, user.sub)
        );
      }

      return eq(table.corretoraId, user.corretoraId);
    }

    // Vendedor vê apenas seus dados
    if ('usuarioId' in table) {
      return and(
        eq(table.corretoraId, user.corretoraId),
        eq(table.usuarioId, user.sub)
      );
    }

    return eq(table.corretoraId, user.corretoraId);
  };
}
