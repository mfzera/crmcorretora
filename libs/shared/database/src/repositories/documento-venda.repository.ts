/**
 * Documento de Venda Repository
 *
 * Encapsulates database queries for sales documents (policies).
 */

import { and, eq, gte, lte, count, desc, asc, isNull, sql } from 'drizzle-orm';
import type {
  DocumentoVenda,
  NewDocumentoVenda,
} from '../schema/documento-venda.js';

// Status type from schema enum
type StatusDocumentoVenda =
  | 'EM_NEGOCIACAO'
  | 'AGUARDANDO_CLIENTE'
  | 'AGUARDANDO_APROVACAO'
  | 'VENDA_CONFIRMADA'
  | 'AGUARDANDO_CADASTRO'
  | 'ATIVO'
  | 'CANCELADO'
  | 'PERDIDO';
import {
  BaseRepository,
  type IRepository,
  type BaseQueryFilters,
  type PaginatedResult,
} from './base-repository.js';
import type { Database } from '../connection.js';
import { documentosVenda } from '../schema/index.js';

/**
 * Filters for documento de venda queries
 */
export interface DocumentoVendaQueryFilters extends BaseQueryFilters {
  status?: StatusDocumentoVenda;
  vendedorId?: string;
  clienteId?: string;
  produtoId?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
}

/**
 * Documento Venda Repository Implementation
 */
export class DocumentoVendaRepository
  extends BaseRepository
  implements IRepository<DocumentoVenda, NewDocumentoVenda>
{
  constructor(private db: Database) {
    super();
  }

  /**
   * Find a single documento by ID
   */
  async findById(id: string, tenantId: string): Promise<DocumentoVenda | null> {
    const documento = await this.db.query.documentosVenda.findFirst({
      where: and(
        eq(documentosVenda.id, id),
        eq(documentosVenda.corretoraId, tenantId),
        isNull(documentosVenda.deletedAt),
      ),
      with: {
        produto: true,
        vendedor: {
          columns: {
            id: true,
            nome: true,
            email: true,
          },
        },
      } as any,
    });

    return documento || null;
  }

  /**
   * Find documents expiring within specified days
   * Used for automatic renewal detection
   */
  async findExpiringInDays(
    tenantId: string,
    days: number,
  ): Promise<DocumentoVenda[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.db.query.documentosVenda.findMany({
      where: and(
        eq(documentosVenda.corretoraId, tenantId),
        eq(documentosVenda.status, 'ATIVO'),
        isNull(documentosVenda.deletedAt),
        gte(documentosVenda.vigenciaFim, now.toISOString().split('T')[0]),
        lte(
          documentosVenda.vigenciaFim,
          futureDate.toISOString().split('T')[0],
        ),
      ),
      with: {
        produto: true,
        vendedor: {
          columns: {
            id: true,
            nome: true,
          },
        },
      } as any,
      orderBy: [asc(documentosVenda.vigenciaFim)],
    });
  }

  /**
   * Find many documents with filters
   */
  async findMany(
    filters: DocumentoVendaQueryFilters,
    tenantId: string,
  ): Promise<PaginatedResult<DocumentoVenda>> {
    const page = filters.page || 1;
    const limit = filters.limit;
    const offset = this.calculateOffset(page, limit);

    const conditions = [
      eq(documentosVenda.corretoraId, tenantId),
      isNull(documentosVenda.deletedAt),
    ];

    if (filters.status) {
      conditions.push(eq(documentosVenda.status, filters.status));
    }

    if (filters.vendedorId) {
      conditions.push(eq(documentosVenda.vendedorId, filters.vendedorId));
    }

    if (filters.clienteId) {
      conditions.push(eq(documentosVenda.clienteId, filters.clienteId));
    }

    if (filters.produtoId) {
      conditions.push(eq(documentosVenda.produtoId, filters.produtoId));
    }

    if (filters.vigenciaInicio) {
      conditions.push(
        gte(documentosVenda.vigenciaInicio, filters.vigenciaInicio),
      );
    }

    if (filters.vigenciaFim) {
      conditions.push(lte(documentosVenda.vigenciaFim, filters.vigenciaFim));
    }

    const [documentos, [{ value: total }]] = await Promise.all([
      this.db.query.documentosVenda.findMany({
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
        orderBy: [desc(documentosVenda.createdAt)],
      }),
      this.db
        .select({ value: count() })
        .from(documentosVenda)
        .where(and(...conditions)),
    ]);

    return this.createPaginatedResult(documentos, total, page, limit);
  }

  /**
   * Create a new documento
   */
  async create(
    data: NewDocumentoVenda,
    tenantId: string,
  ): Promise<DocumentoVenda> {
    const [documento] = await this.db
      .insert(documentosVenda)
      .values({
        ...data,
        corretoraId: tenantId,
      })
      .returning();

    return documento;
  }

  /**
   * Update documento
   */
  async update(
    id: string,
    data: Partial<DocumentoVenda>,
    tenantId: string,
  ): Promise<DocumentoVenda> {
    const [updated] = await this.db
      .update(documentosVenda)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, tenantId),
          isNull(documentosVenda.deletedAt),
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
      .update(documentosVenda)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documentosVenda.id, id),
          eq(documentosVenda.corretoraId, tenantId),
        ),
      );
  }

  /**
   * Count documents
   */
  async count(
    tenantId: string,
    filters?: DocumentoVendaQueryFilters,
  ): Promise<number> {
    const conditions = [
      eq(documentosVenda.corretoraId, tenantId),
      isNull(documentosVenda.deletedAt),
    ];

    if (filters?.status) {
      conditions.push(eq(documentosVenda.status, filters.status));
    }

    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(documentosVenda)
      .where(and(...conditions));

    return total;
  }
}
