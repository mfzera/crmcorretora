/**
 * Cotacao Repository
 *
 * Encapsulates database queries for quotations.
 */

import { and, eq, count, desc, isNull } from 'drizzle-orm';
import {
  BaseRepository,
  type IRepository,
  type BaseQueryFilters,
  type PaginatedResult,
} from './base-repository.js';
import type { Database } from '../connection.js';
import { cotacoes } from '../schema/index.js';
import type { Cotacao, NewCotacao } from '../schema/cotacao.js';

// Status type from schema enum
type StatusCotacao = 'EM_ELABORACAO' | 'PERDIDA' | 'EXPIRADA' | 'CONVERTIDA';

/**
 * Filters for cotacao queries
 */
export interface CotacaoQueryFilters extends BaseQueryFilters {
  status?: StatusCotacao;
  vendedorId?: string;
  clienteId?: string;
  produtoId?: string;
}

/**
 * Cotacao Repository Implementation
 */
export class CotacaoRepository
  extends BaseRepository
  implements IRepository<Cotacao, NewCotacao>
{
  constructor(private db: Database) {
    super();
  }

  /**
   * Find a single cotacao by ID
   */
  async findById(id: string, tenantId: string): Promise<Cotacao | null> {
    const cotacao = await this.db.query.cotacoes.findFirst({
      where: and(
        eq(cotacoes.id, id),
        eq(cotacoes.corretoraId, tenantId),
        isNull(cotacoes.deletedAt),
      ),
      with: {
        produto: {
          columns: {
            id: true,
            nomeProduto: true,
            tipoSeguro: true,
          },
        },
        vendedor: {
          columns: {
            id: true,
            nome: true,
          },
        },
      } as any,
    });

    return cotacao || null;
  }

  /**
   * Find active quotations (EM_ELABORACAO)
   */
  async findActive(tenantId: string, vendedorId?: string): Promise<Cotacao[]> {
    const conditions = [
      eq(cotacoes.corretoraId, tenantId),
      eq(cotacoes.status, 'EM_ELABORACAO'),
      isNull(cotacoes.deletedAt),
    ];

    if (vendedorId) {
      conditions.push(eq(cotacoes.vendedorId, vendedorId));
    }

    return this.db.query.cotacoes.findMany({
      where: and(...conditions),
      with: {
        produto: {
          columns: {
            id: true,
            nomeProduto: true,
            tipoSeguro: true,
          },
        },
      } as any,
      limit: 50,
      orderBy: [desc(cotacoes.createdAt)],
    });
  }

  /**
   * Find many cotacoes with filters
   */
  async findMany(
    filters: CotacaoQueryFilters,
    tenantId: string,
  ): Promise<PaginatedResult<Cotacao>> {
    const page = filters.page || 1;
    const limit = filters.limit;
    const offset = this.calculateOffset(page, limit);

    const conditions = [
      eq(cotacoes.corretoraId, tenantId),
      isNull(cotacoes.deletedAt),
    ];

    if (filters.status) {
      conditions.push(eq(cotacoes.status, filters.status));
    }

    if (filters.vendedorId) {
      conditions.push(eq(cotacoes.vendedorId, filters.vendedorId));
    }

    if (filters.clienteId) {
      conditions.push(eq(cotacoes.clienteId, filters.clienteId));
    }

    if (filters.produtoId) {
      conditions.push(eq(cotacoes.produtoId, filters.produtoId));
    }

    const [cotacoesResult, [{ value: total }]] = await Promise.all([
      this.db.query.cotacoes.findMany({
        where: and(...conditions),
        with: {
          produto: {
            columns: {
              id: true,
              nomeProduto: true,
              tipoSeguro: true,
            },
          },
        } as any,
        limit,
        offset,
        orderBy: [desc(cotacoes.createdAt)],
      }),
      this.db
        .select({ value: count() })
        .from(cotacoes)
        .where(and(...conditions)),
    ]);

    return this.createPaginatedResult(cotacoesResult, total, page, limit);
  }

  /**
   * Get last cotacao number for generating new numbers
   */
  async getLastCotacaoNumber(tenantId: string): Promise<string | null> {
    const lastCotacao = await this.db.query.cotacoes.findFirst({
      where: eq(cotacoes.corretoraId, tenantId),
      orderBy: [desc(cotacoes.createdAt)],
      columns: {
        numeroCotacao: true,
      },
    });

    return lastCotacao?.numeroCotacao || null;
  }

  /**
   * Create a new cotacao
   */
  async create(data: NewCotacao, tenantId: string): Promise<Cotacao> {
    const [cotacao] = await this.db
      .insert(cotacoes)
      .values({
        ...data,
        corretoraId: tenantId,
      })
      .returning();

    return cotacao;
  }

  /**
   * Update cotacao
   */
  async update(
    id: string,
    data: Partial<Cotacao>,
    tenantId: string,
  ): Promise<Cotacao> {
    const [updated] = await this.db
      .update(cotacoes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cotacoes.id, id),
          eq(cotacoes.corretoraId, tenantId),
          isNull(cotacoes.deletedAt),
        ),
      )
      .returning();

    return updated;
  }

  /**
   * Soft delete
   */
  async delete(id: string, tenantId: string): Promise<void> {
    await this.db
      .update(cotacoes)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(cotacoes.id, id), eq(cotacoes.corretoraId, tenantId)));
  }

  /**
   * Count cotacoes
   */
  async count(
    tenantId: string,
    filters?: CotacaoQueryFilters,
  ): Promise<number> {
    const conditions = [
      eq(cotacoes.corretoraId, tenantId),
      isNull(cotacoes.deletedAt),
    ];

    if (filters?.status) {
      conditions.push(eq(cotacoes.status, filters.status));
    }

    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(cotacoes)
      .where(and(...conditions));

    return total;
  }
}
